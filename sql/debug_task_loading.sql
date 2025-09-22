-- =====================================================
-- DEBUG TASK LOADING ISSUES
-- =====================================================
-- This script helps debug why tasks are not autoloading after project start

-- =====================================================
-- 1. CHECK PROJECT TEMPLATE SNAPSHOT STRUCTURE
-- =====================================================

-- Check if project has template_snapshot data
SELECT 
    project_id,
    project_name,
    template_id,
    project_status,
    CASE 
        WHEN template_snapshot IS NULL THEN 'NULL'
        WHEN template_snapshot = '{}'::jsonb THEN 'EMPTY_OBJECT'
        WHEN jsonb_typeof(template_snapshot) = 'object' THEN 'OBJECT'
        ELSE 'OTHER'
    END as snapshot_status,
    jsonb_pretty(template_snapshot->'template'->'template_name') as template_name,
    jsonb_array_length(COALESCE(template_snapshot->'phases', '[]'::jsonb)) as phase_count
FROM projects 
WHERE is_archived = false
ORDER BY created_at DESC;

-- =====================================================
-- 2. CHECK TEMPLATE SNAPSHOT PHASES STRUCTURE
-- =====================================================

-- Examine phases structure in template_snapshot
SELECT 
    p.project_id,
    p.project_name,
    phase_data->'phase'->>'phase_name' as phase_name,
    (phase_data->'phase'->>'phase_order')::INTEGER as phase_order,
    jsonb_array_length(COALESCE(phase_data->'steps', '[]'::jsonb)) as step_count
FROM projects p,
LATERAL jsonb_array_elements(p.template_snapshot->'phases') as phase_data
WHERE p.is_archived = false
AND p.template_snapshot IS NOT NULL
AND jsonb_typeof(p.template_snapshot->'phases') = 'array'
ORDER BY p.project_id, phase_order;

-- =====================================================
-- 3. CHECK TEMPLATE SNAPSHOT TASKS STRUCTURE
-- =====================================================

-- Examine tasks structure in template_snapshot
SELECT 
    p.project_id,
    p.project_name,
    phase_data->'phase'->>'phase_name' as phase_name,
    (phase_data->'phase'->>'phase_order')::INTEGER as phase_order,
    step_data->'step'->>'step_name' as step_name,
    (step_data->'step'->>'step_order')::INTEGER as step_order,
    jsonb_array_length(COALESCE(step_data->'tasks', '[]'::jsonb)) as task_count
FROM projects p,
LATERAL jsonb_array_elements(p.template_snapshot->'phases') as phase_data,
LATERAL jsonb_array_elements(phase_data->'steps') as step_data
WHERE p.is_archived = false
AND p.template_snapshot IS NOT NULL
AND jsonb_typeof(p.template_snapshot->'phases') = 'array'
ORDER BY p.project_id, phase_order, step_order;

-- =====================================================
-- 4. CHECK PROJECT ROLES STATUS
-- =====================================================

-- Check if all project roles are filled
SELECT 
    p.project_id,
    p.project_name,
    COUNT(*) as total_roles,
    COUNT(*) FILTER (WHERE pr.is_filled = true) as filled_roles,
    COUNT(*) FILTER (WHERE pr.is_filled = false) as unfilled_roles,
    CASE 
        WHEN COUNT(*) FILTER (WHERE pr.is_filled = false) = 0 THEN 'CAN_START'
        ELSE 'CANNOT_START'
    END as start_status
FROM projects p
LEFT JOIN project_roles pr ON p.project_id = pr.project_id
WHERE p.is_archived = false
GROUP BY p.project_id, p.project_name
ORDER BY p.created_at DESC;

-- =====================================================
-- 5. CHECK EXISTING LOADED TASKS
-- =====================================================

-- Check if there are any loaded tasks for projects
SELECT 
    p.project_id,
    p.project_name,
    p.project_status,
    COUNT(pt.*) as total_tasks,
    COUNT(*) FILTER (WHERE pt.is_loaded = true) as loaded_tasks,
    COUNT(*) FILTER (WHERE pt.is_custom = true) as custom_tasks
FROM projects p
LEFT JOIN project_tasks pt ON p.project_id = pt.project_id AND pt.is_archived = false
WHERE p.is_archived = false
GROUP BY p.project_id, p.project_name, p.project_status
ORDER BY p.created_at DESC;

-- =====================================================
-- 6. TEST LOAD_NEXT_STEP_TASKS FUNCTION MANUALLY
-- =====================================================

-- Create a test function to debug load_next_step_tasks
CREATE OR REPLACE FUNCTION debug_load_next_step_tasks(p_project_id UUID)
RETURNS TABLE(
    debug_step VARCHAR,
    debug_message TEXT,
    debug_data JSONB
) AS $$
DECLARE
    project_record RECORD;
    phase_data JSONB;
    step_data JSONB;
    task_data JSONB;
    next_phase_order INTEGER;
    next_step_order INTEGER;
    current_phase_order INTEGER;
    current_step_order INTEGER;
    tasks_loaded INTEGER := 0;
BEGIN
    -- Step 1: Check project exists and has template_snapshot
    SELECT current_phase_id, current_step_id, template_snapshot INTO project_record
    FROM projects WHERE project_id = p_project_id;
    
    IF project_record IS NULL THEN
        RETURN QUERY SELECT 'ERROR'::VARCHAR, 'Project not found'::TEXT, '{}'::JSONB;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 'INFO'::VARCHAR, 'Project found'::TEXT, to_jsonb(project_record);
    
    IF project_record.template_snapshot IS NULL THEN
        RETURN QUERY SELECT 'ERROR'::VARCHAR, 'No template snapshot found'::TEXT, '{}'::JSONB;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 'INFO'::VARCHAR, 'Template snapshot exists'::TEXT, 
        jsonb_build_object(
            'phases_count', jsonb_array_length(COALESCE(project_record.template_snapshot->'phases', '[]'::jsonb)),
            'snapshot_type', jsonb_typeof(project_record.template_snapshot)
        );

    -- Step 2: Check current loaded tasks
    SELECT phase_order, step_order INTO current_phase_order, current_step_order
    FROM project_tasks 
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    ORDER BY phase_order DESC, step_order DESC 
    LIMIT 1;

    RETURN QUERY SELECT 'INFO'::VARCHAR, 'Current loaded step'::TEXT, 
        jsonb_build_object(
            'current_phase_order', current_phase_order,
            'current_step_order', current_step_order
        );

    -- Step 3: Determine next step to load
    IF current_phase_order IS NULL OR current_step_order IS NULL THEN
        next_phase_order := 1;
        next_step_order := 1;
        RETURN QUERY SELECT 'INFO'::VARCHAR, 'Starting with first step'::TEXT, 
            jsonb_build_object('next_phase_order', next_phase_order, 'next_step_order', next_step_order);
    ELSE
        -- Find next step
        SELECT phase_order, step_order INTO next_phase_order, next_step_order
        FROM (
            SELECT 
                (phase->'phase'->>'phase_order')::INTEGER as phase_order,
                (step->'step'->>'step_order')::INTEGER as step_order
            FROM jsonb_array_elements(project_record.template_snapshot->'phases') as phase,
                 jsonb_array_elements(phase->'steps') as step
            WHERE (phase->'phase'->>'phase_order')::INTEGER > current_phase_order
               OR ((phase->'phase'->>'phase_order')::INTEGER = current_phase_order 
                   AND (step->'step'->>'step_order')::INTEGER > current_step_order)
            ORDER BY phase_order, step_order
            LIMIT 1
        ) next_step;
        
        RETURN QUERY SELECT 'INFO'::VARCHAR, 'Next step found'::TEXT, 
            jsonb_build_object('next_phase_order', next_phase_order, 'next_step_order', next_step_order);
    END IF;

    -- Step 4: Check tasks in next step
    FOR phase_data IN 
        SELECT value as phase FROM jsonb_array_elements(project_record.template_snapshot->'phases')
        WHERE (value->'phase'->>'phase_order')::INTEGER = next_phase_order
    LOOP
        FOR step_data IN 
            SELECT value as step FROM jsonb_array_elements(phase_data->'steps')
            WHERE (value->'step'->>'step_order')::INTEGER = next_step_order
        LOOP
            RETURN QUERY SELECT 'INFO'::VARCHAR, 'Found step data'::TEXT, 
                jsonb_build_object(
                    'phase_name', phase_data->'phase'->>'phase_name',
                    'step_name', step_data->'step'->>'step_name',
                    'task_count', jsonb_array_length(COALESCE(step_data->'tasks', '[]'::jsonb))
                );
                
            -- Count tasks
            FOR task_data IN 
                SELECT value as task FROM jsonb_array_elements(step_data->'tasks')
                ORDER BY (value->>'task_order')::INTEGER
            LOOP
                tasks_loaded := tasks_loaded + 1;
                RETURN QUERY SELECT 'TASK'::VARCHAR, 'Found task'::TEXT, 
                    jsonb_build_object(
                        'task_name', task_data->>'task_name',
                        'task_order', (task_data->>'task_order')::INTEGER,
                        'task_id', task_data->>'task_id'
                    );
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT 'RESULT'::VARCHAR, 'Tasks to load'::TEXT, 
        jsonb_build_object('tasks_count', tasks_loaded);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. USAGE INSTRUCTIONS
-- =====================================================


To debug a specific project, run:

1. First check the project data:
   SELECT * FROM projects WHERE project_name = 'YOUR_PROJECT_NAME';

2. Then run the debug function:
   SELECT * FROM debug_load_next_step_tasks('YOUR_PROJECT_ID');

3. Check template structure:
   SELECT jsonb_pretty(template_snapshot) FROM projects WHERE project_id = 'YOUR_PROJECT_ID';

4. Check roles status:
   SELECT * FROM project_roles WHERE project_id = 'YOUR_PROJECT_ID';

5. Manually test the function:
   SELECT load_next_step_tasks('YOUR_PROJECT_ID');
*/

SELECT 'Debug script created successfully!' as status,
       'Run the queries above to diagnose task loading issues' as instructions;
