-- =====================================================
-- OPTIMIZED TEMPLATE DUPLICATION FUNCTION
-- =====================================================
-- This replaces the slow nested loop approach with efficient batch operations
-- Handles thousands of phases, steps, and tasks efficiently

-- Drop the old inefficient function
DROP FUNCTION IF EXISTS duplicate_template(UUID, VARCHAR, VARCHAR);

-- Create optimized duplicate template function
CREATE OR REPLACE FUNCTION duplicate_template(
    source_template_id UUID,
    new_template_name VARCHAR,
    created_by_user VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_template_id UUID;
    phase_mapping JSONB := '{}';
    step_mapping JSONB := '{}';
BEGIN
    -- Create new template
    INSERT INTO project_templates (template_name, description, created_by)
    SELECT new_template_name, description, created_by_user
    FROM project_templates
    WHERE template_id = source_template_id
    RETURNING template_id INTO new_template_id;

    -- Batch copy phases and build mapping
    WITH new_phases AS (
        INSERT INTO template_phases (
            template_id, phase_name, description, phase_order, created_by
        )
        SELECT 
            new_template_id, 
            phase_name, 
            description, 
            phase_order, 
            created_by_user
        FROM template_phases
        WHERE template_id = source_template_id AND is_archived = false
        ORDER BY phase_order
        RETURNING phase_id, phase_order
    ),
    old_phases AS (
        SELECT phase_id, phase_order
        FROM template_phases
        WHERE template_id = source_template_id AND is_archived = false
    )
    SELECT jsonb_object_agg(op.phase_id::text, np.phase_id::text)
    INTO phase_mapping
    FROM old_phases op
    JOIN new_phases np ON op.phase_order = np.phase_order;

    -- Batch copy steps and build mapping
    WITH new_steps AS (
        INSERT INTO phase_steps (
            phase_id, step_name, description, step_order, created_by
        )
        SELECT 
            (phase_mapping->>(ps.phase_id::text))::UUID,
            ps.step_name,
            ps.description,
            ps.step_order,
            created_by_user
        FROM phase_steps ps
        WHERE ps.phase_id = ANY(
            SELECT phase_id 
            FROM template_phases 
            WHERE template_id = source_template_id AND is_archived = false
        )
        AND ps.is_archived = false
        ORDER BY ps.phase_id, ps.step_order
        RETURNING step_id, step_order, phase_id
    ),
    old_steps AS (
        SELECT ps.step_id, ps.step_order, ps.phase_id
        FROM phase_steps ps
        WHERE ps.phase_id = ANY(
            SELECT phase_id 
            FROM template_phases 
            WHERE template_id = source_template_id AND is_archived = false
        )
        AND ps.is_archived = false
    )
    SELECT jsonb_object_agg(os.step_id::text, ns.step_id::text)
    INTO step_mapping
    FROM old_steps os
    JOIN new_steps ns ON os.step_order = ns.step_order 
        AND (phase_mapping->>(os.phase_id::text))::UUID = ns.phase_id;

    -- Batch copy tasks (most efficient part)
    INSERT INTO step_tasks (
        step_id, task_name, description, task_order, estimated_hours,
        assigned_role_id, category, checklist_items, created_by
    )
    SELECT 
        (step_mapping->>(st.step_id::text))::UUID,
        st.task_name,
        st.description,
        st.task_order,
        st.estimated_hours,
        st.assigned_role_id,
        st.category,
        st.checklist_items,
        created_by_user
    FROM step_tasks st
    WHERE st.step_id = ANY(
        SELECT ps.step_id 
        FROM phase_steps ps
        WHERE ps.phase_id = ANY(
            SELECT phase_id 
            FROM template_phases 
            WHERE template_id = source_template_id AND is_archived = false
        )
        AND ps.is_archived = false
    )
    AND st.is_archived = false
    ORDER BY st.step_id, st.task_order;

    -- Handle parent-child task relationships in a second pass
    -- Update parent_task_id for tasks that have parents
    WITH task_mapping AS (
        SELECT 
            old_task.task_id as old_task_id,
            new_task.task_id as new_task_id
        FROM step_tasks old_task
        JOIN step_tasks new_task ON 
            old_task.task_order = new_task.task_order AND
            (step_mapping->>(old_task.step_id::text))::UUID = new_task.step_id
        WHERE old_task.step_id = ANY(
            SELECT ps.step_id 
            FROM phase_steps ps
            WHERE ps.phase_id = ANY(
                SELECT phase_id 
                FROM template_phases 
                WHERE template_id = source_template_id AND is_archived = false
            )
            AND ps.is_archived = false
        )
        AND old_task.is_archived = false
    )
    UPDATE step_tasks
    SET parent_task_id = (
        SELECT tm_parent.new_task_id
        FROM task_mapping tm_parent
        JOIN step_tasks old_parent ON tm_parent.old_task_id = old_parent.task_id
        JOIN task_mapping tm_child ON tm_child.new_task_id = step_tasks.task_id
        JOIN step_tasks old_child ON tm_child.old_task_id = old_child.task_id
        WHERE old_child.parent_task_id = old_parent.task_id
    )
    WHERE task_id IN (
        SELECT tm.new_task_id
        FROM task_mapping tm
        JOIN step_tasks old_task ON tm.old_task_id = old_task.task_id
        WHERE old_task.parent_task_id IS NOT NULL
    );

    RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get template complexity before duplication
CREATE OR REPLACE FUNCTION get_template_complexity(template_uuid UUID)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    phase_count BIGINT,
    step_count BIGINT,
    task_count BIGINT,
    parent_task_count BIGINT,
    estimated_duration_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.template_id,
        pt.template_name,
        COALESCE(counts.phase_count, 0) as phase_count,
        COALESCE(counts.step_count, 0) as step_count,
        COALESCE(counts.task_count, 0) as task_count,
        COALESCE(counts.parent_task_count, 0) as parent_task_count,
        -- Rough estimation: 1ms per task, 5ms per step, 10ms per phase
        (COALESCE(counts.task_count, 0) + 
         COALESCE(counts.step_count, 0) * 5 + 
         COALESCE(counts.phase_count, 0) * 10)::INTEGER as estimated_duration_seconds
    FROM project_templates pt
    LEFT JOIN (
        SELECT 
            tp.template_id,
            COUNT(DISTINCT tp.phase_id) as phase_count,
            COUNT(DISTINCT ps.step_id) as step_count,
            COUNT(DISTINCT st.task_id) as task_count,
            COUNT(DISTINCT st.task_id) FILTER (WHERE st.parent_task_id IS NOT NULL) as parent_task_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) counts ON pt.template_id = counts.template_id
    WHERE pt.template_id = template_uuid AND pt.is_archived = false;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION duplicate_template(UUID, VARCHAR, VARCHAR) IS 'Optimized template duplication using batch operations instead of loops. Handles thousands of items efficiently.';
COMMENT ON FUNCTION get_template_complexity(UUID) IS 'Get template complexity metrics to warn users about large duplication operations.';
