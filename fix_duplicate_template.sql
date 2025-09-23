-- Quick fix for the duplicate_template function ambiguous column reference error
-- Run this SQL script in your Supabase SQL editor to fix the template duplication issue

-- Drop the existing function first to allow parameter name changes
DROP FUNCTION IF EXISTS duplicate_template(UUID, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION duplicate_template(
    p_source_template_id UUID,
    p_new_template_name VARCHAR,
    p_created_by_user VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_new_template_id UUID;
    phase_record RECORD;
    step_record RECORD;
    task_record RECORD;
    v_new_phase_id UUID;
    v_new_step_id UUID;
    v_next_task_order INTEGER := 1;
BEGIN
    -- Create new template
    INSERT INTO project_templates (template_name, description, created_by)
    SELECT p_new_template_name, pt.description, p_created_by_user
    FROM project_templates pt
    WHERE pt.template_id = p_source_template_id
    RETURNING project_templates.template_id INTO v_new_template_id;

    -- Initialize next task order for the new template (starts from 1 since it's a new template)
    v_next_task_order := 1;

    -- Copy phases
    FOR phase_record IN
        SELECT * FROM template_phases tp
        WHERE tp.template_id = p_source_template_id AND tp.is_archived = false
        ORDER BY tp.phase_order
    LOOP
        INSERT INTO template_phases (template_id, phase_name, description, phase_order, created_by)
        VALUES (v_new_template_id, phase_record.phase_name, phase_record.description, phase_record.phase_order, p_created_by_user)
        RETURNING template_phases.phase_id INTO v_new_phase_id;

        -- Copy steps for this phase
        FOR step_record IN
            SELECT * FROM phase_steps ps
            WHERE ps.phase_id = phase_record.phase_id AND ps.is_archived = false
            ORDER BY ps.step_order
        LOOP
            INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
            VALUES (v_new_phase_id, step_record.step_name, step_record.description, step_record.step_order, p_created_by_user)
            RETURNING phase_steps.step_id INTO v_new_step_id;

            -- Copy tasks for this step (with role assignments and all new fields)
            FOR task_record IN
                SELECT * FROM step_tasks st
                WHERE st.step_id = step_record.step_id AND st.is_archived = false
                ORDER BY st.task_order
            LOOP
                INSERT INTO step_tasks (
                    step_id, template_id, task_name, description, task_order, estimated_days, 
                    assigned_role_id, category, checklist_items, created_by
                )
                VALUES (
                    v_new_step_id, v_new_template_id, task_record.task_name, task_record.description, 
                    v_next_task_order, task_record.estimated_days, 
                    task_record.assigned_role_id, task_record.category, 
                    task_record.checklist_items, p_created_by_user
                );
                v_next_task_order := v_next_task_order + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql;
