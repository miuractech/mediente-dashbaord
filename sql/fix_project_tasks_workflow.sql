-- =====================================================
-- PROJECT TASK WORKFLOW FIXES
-- =====================================================
-- This script fixes the auto-loading of tasks in the project workflow:
-- 1. Skipping Empty Steps
-- 2. Task Execution Order (Index-based)
-- 3. Parent-Child Task Dependencies

-- =====================================================
-- 1. UPDATED LOAD_NEXT_STEP_TASKS FUNCTION
-- =====================================================
-- Function to load next step tasks with empty step skipping
CREATE OR REPLACE FUNCTION load_next_step_tasks(p_project_id UUID)
RETURNS BOOLEAN AS $$
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
    parent_task_id UUID;
    template_parent_id UUID;
BEGIN
    -- Get current project state
    SELECT current_phase_id, current_step_id, template_snapshot INTO project_record
    FROM projects WHERE project_id = p_project_id;

    IF project_record.template_snapshot IS NULL THEN
        RAISE NOTICE 'No template snapshot found for project %', p_project_id;
        RETURN FALSE;
    END IF;

    -- Check if there are any loaded tasks
    SELECT phase_order, step_order INTO current_phase_order, current_step_order
    FROM project_tasks 
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    ORDER BY phase_order DESC, step_order DESC 
    LIMIT 1;

    -- If no loaded tasks, start with first phase, first step
    IF current_phase_order IS NULL OR current_step_order IS NULL THEN
        RAISE NOTICE 'No loaded tasks found, starting with phase 1, step 1 for project %', p_project_id;
        next_phase_order := 1;
        next_step_order := 1;
    ELSE
        RAISE NOTICE 'Current loaded step: phase %, step % for project %', current_phase_order, current_step_order, p_project_id;
        -- Check if all tasks in current step are completed
        IF EXISTS (
            SELECT 1 FROM project_tasks 
            WHERE project_id = p_project_id 
            AND phase_order = current_phase_order 
            AND step_order = current_step_order 
            AND task_status != 'completed'
            AND is_loaded = true
        ) THEN
            RAISE NOTICE 'Current step not completed yet for project %', p_project_id;
            RETURN FALSE; -- Current step not completed yet
        END IF;

        -- Find next step (could be empty, we'll handle that)
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

        IF next_phase_order IS NULL THEN
            -- Project completed
            RAISE NOTICE 'Project completed, no more steps to load for project %', p_project_id;
            UPDATE projects 
            SET project_status = 'completed', updated_at = NOW()
            WHERE project_id = p_project_id;
            RETURN FALSE;
        END IF;
        
        RAISE NOTICE 'Loading next step: phase %, step % for project %', next_phase_order, next_step_order, p_project_id;
    END IF;

    -- Load tasks for the next step (with empty step handling)
    <<step_loop>>
    LOOP
        tasks_loaded := 0;
        
        FOR phase_data IN 
            SELECT value as phase FROM jsonb_array_elements(project_record.template_snapshot->'phases')
            WHERE (value->'phase'->>'phase_order')::INTEGER = next_phase_order
        LOOP
            FOR step_data IN 
                SELECT value as step FROM jsonb_array_elements(phase_data->'steps')
                WHERE (value->'step'->>'step_order')::INTEGER = next_step_order
            LOOP
                -- Load tasks in order, respecting parent-child relationships
                FOR task_data IN 
                    SELECT value as task FROM jsonb_array_elements(step_data->'tasks')
                    ORDER BY (value->>'task_order')::INTEGER
                LOOP
                    -- Handle parent task relationship
                    parent_task_id := NULL;
                    template_parent_id := (task_data->>'parent_task_id')::UUID;
                    
                    IF template_parent_id IS NOT NULL THEN
                        -- Find the corresponding parent task in project_tasks
                        SELECT project_task_id INTO parent_task_id
                        FROM project_tasks
                        WHERE project_id = p_project_id 
                        AND template_task_id = template_parent_id;
                    END IF;

                    INSERT INTO project_tasks (
                        project_id, template_task_id, task_name, task_description,
                        phase_name, phase_order, step_name, step_order, task_order,
                        estimated_hours, parent_task_id, category, checklist_items,
                        is_loaded, created_by
                    ) VALUES (
                        p_project_id,
                        (task_data->>'task_id')::UUID,
                        task_data->>'task_name',
                        task_data->>'description',
                        phase_data->'phase'->>'phase_name',
                        next_phase_order,
                        step_data->'step'->>'step_name',
                        next_step_order,
                        (task_data->>'task_order')::INTEGER,
                        (task_data->>'estimated_hours')::INTEGER,
                        parent_task_id,
                        (task_data->>'category')::task_category_type,
                        COALESCE(task_data->'checklist_items', '[]'::jsonb),
                        TRUE,
                        'system'
                    );
                    
                    tasks_loaded := tasks_loaded + 1;
                END LOOP;
            END LOOP;
        END LOOP;

        -- If no tasks were loaded for this step, skip to next step
        IF tasks_loaded = 0 THEN
            RAISE NOTICE 'Step % in phase % is empty, skipping to next step', next_step_order, next_phase_order;
            
            -- Find next step after the empty one
            SELECT phase_order, step_order INTO next_phase_order, next_step_order
            FROM (
                SELECT 
                    (phase->'phase'->>'phase_order')::INTEGER as phase_order,
                    (step->'step'->>'step_order')::INTEGER as step_order
                FROM jsonb_array_elements(project_record.template_snapshot->'phases') as phase,
                     jsonb_array_elements(phase->'steps') as step
                WHERE (phase->'phase'->>'phase_order')::INTEGER > next_phase_order
                   OR ((phase->'phase'->>'phase_order')::INTEGER = next_phase_order 
                       AND (step->'step'->>'step_order')::INTEGER > next_step_order)
                ORDER BY phase_order, step_order
                LIMIT 1
            ) next_step;

            -- If no more steps, project is completed
            IF next_phase_order IS NULL THEN
                RAISE NOTICE 'No more steps found, project completed for project %', p_project_id;
                UPDATE projects 
                SET project_status = 'completed', updated_at = NOW()
                WHERE project_id = p_project_id;
                RETURN FALSE;
            END IF;
            
            -- Continue loop with next step
            CONTINUE step_loop;
        ELSE
            -- Tasks were loaded, exit loop
            EXIT step_loop;
        END IF;
    END LOOP step_loop;

    -- Update project current phase/step
    UPDATE projects 
    SET current_phase_id = gen_random_uuid(), -- Placeholder, could be improved
        current_step_id = gen_random_uuid(),   -- Placeholder, could be improved
        updated_at = NOW()
    WHERE project_id = p_project_id;

    -- Initialize task execution order for the newly loaded tasks
    PERFORM initialize_task_execution_order(p_project_id);
    
    -- Auto-assign crew to tasks based on template role assignments
    PERFORM auto_assign_crew_to_loaded_tasks(p_project_id);

    RAISE NOTICE 'Successfully loaded % tasks for phase %, step % in project %', tasks_loaded, next_phase_order, next_step_order, p_project_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. TASK EXECUTION ORDER INITIALIZATION FUNCTION
-- =====================================================
-- Function to initialize task statuses based on execution order and dependencies
CREATE OR REPLACE FUNCTION initialize_task_execution_order(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Reset all loaded tasks to pending first
    UPDATE project_tasks 
    SET task_status = 'pending', updated_at = NOW()
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    AND task_status != 'completed';
    
    -- Start tasks that have no parent and are first in order (task_order = 1)
    -- or are the first task in their step
    FOR task_record IN
        SELECT project_task_id, phase_order, step_order, task_order
        FROM project_tasks
        WHERE project_id = p_project_id
        AND is_loaded = true
        AND task_status = 'pending'
        AND parent_task_id IS NULL
        ORDER BY phase_order, step_order, task_order
    LOOP
        -- Check if this is the first task in its step
        IF NOT EXISTS (
            SELECT 1 FROM project_tasks
            WHERE project_id = p_project_id
            AND phase_order = task_record.phase_order
            AND step_order = task_record.step_order
            AND task_order < task_record.task_order
            AND is_loaded = true
        ) THEN
            -- This is the first task in the step, make it ongoing
            UPDATE project_tasks 
            SET task_status = 'ongoing',
                started_at = NOW(),
                deadline = CASE 
                    WHEN estimated_hours IS NOT NULL 
                    THEN NOW() + (estimated_hours || ' hours')::INTERVAL 
                    ELSE NULL 
                END,
                updated_at = NOW()
            WHERE project_task_id = task_record.project_task_id;
            
            RAISE NOTICE 'Task % started as first in step', task_record.project_task_id;
            -- Only start one task per step initially
            EXIT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. AUTO-ASSIGN CREW TO TASKS FUNCTION
-- =====================================================
-- Function to auto-assign crew to newly loaded tasks based on template role assignments
CREATE OR REPLACE FUNCTION auto_assign_crew_to_loaded_tasks(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
    template_role_id UUID;
    project_role_record RECORD;
    crew_assignment_record RECORD;
BEGIN
    -- Loop through newly loaded tasks that don't have assignments yet
    FOR task_record IN
        SELECT pt.project_task_id, pt.template_task_id
        FROM project_tasks pt
        WHERE pt.project_id = p_project_id 
        AND pt.is_loaded = true
        AND pt.template_task_id IS NOT NULL
        -- Only process tasks that don't have any assignments yet
        AND NOT EXISTS (
            SELECT 1 FROM project_task_assignments pta 
            WHERE pta.project_task_id = pt.project_task_id
        )
    LOOP
        -- Get the assigned role from the template task
        SELECT assigned_role_id INTO template_role_id
        FROM step_tasks
        WHERE task_id = task_record.template_task_id;
        
        -- If template task has an assigned role, find corresponding project role
        IF template_role_id IS NOT NULL THEN
            SELECT project_role_id INTO project_role_record
            FROM project_roles pr
            WHERE pr.project_id = p_project_id 
            AND pr.role_id = template_role_id;
            
            -- If project role exists and has crew assigned, assign them to the task
            IF project_role_record.project_role_id IS NOT NULL THEN
                -- Get all crew members assigned to this project role
                FOR crew_assignment_record IN
                    SELECT pca.crew_id
                    FROM project_crew_assignments pca
                    WHERE pca.project_id = p_project_id
                    AND pca.project_role_id = project_role_record.project_role_id
                LOOP
                    -- Assign crew to task
                    INSERT INTO project_task_assignments (
                        project_task_id, 
                        project_role_id, 
                        crew_id, 
                        assigned_by
                    ) VALUES (
                        task_record.project_task_id,
                        project_role_record.project_role_id,
                        crew_assignment_record.crew_id,
                        'system'
                    )
                    ON CONFLICT (project_task_id, project_role_id, crew_id) DO NOTHING;
                    
                    RAISE NOTICE 'Auto-assigned crew % to task % via role', 
                        crew_assignment_record.crew_id, task_record.project_task_id;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. UPDATED TASK STATUS CHANGE TRIGGER FUNCTION
-- =====================================================
-- Function to handle task status changes and automatic progression
CREATE OR REPLACE FUNCTION handle_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
    child_task RECORD;
BEGIN
    -- Validate parent-child dependencies when changing to ongoing
    IF OLD.task_status != 'ongoing' AND NEW.task_status = 'ongoing' THEN
        -- Check if parent task is completed (if this task has a parent)
        IF NEW.parent_task_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM project_tasks 
                WHERE project_task_id = NEW.parent_task_id 
                AND task_status = 'completed'
            ) THEN
                RAISE EXCEPTION 'Cannot start task: parent task must be completed first';
            END IF;
        END IF;
        
        NEW.started_at = NOW();
        -- Calculate deadline based on estimated hours
        IF NEW.estimated_hours IS NOT NULL THEN
            NEW.deadline = NOW() + (NEW.estimated_hours || ' hours')::INTERVAL;
        END IF;
    END IF;

    -- Set completed_at when task is completed
    IF OLD.task_status != 'completed' AND NEW.task_status = 'completed' THEN
        NEW.completed_at = NOW();
        -- Ensure started_at is set to satisfy the constraint
        IF NEW.started_at IS NULL THEN
            NEW.started_at = NOW();
        END IF;
        
        -- When a parent task is completed, automatically make child tasks available (ongoing)
        -- But only if they are the next in sequence (lowest task_order among pending children)
        FOR child_task IN 
            SELECT project_task_id, task_order
            FROM project_tasks 
            WHERE parent_task_id = NEW.project_task_id 
            AND task_status = 'pending'
            AND is_loaded = true
            ORDER BY task_order
        LOOP
            -- Check if this is the next child task in sequence
            IF NOT EXISTS (
                SELECT 1 FROM project_tasks
                WHERE parent_task_id = NEW.project_task_id
                AND task_status IN ('pending', 'ongoing')
                AND task_order < child_task.task_order
                AND is_loaded = true
            ) THEN
                -- This is the next child task, make it ongoing
                UPDATE project_tasks 
                SET task_status = 'ongoing',
                    started_at = NOW(),
                    deadline = CASE 
                        WHEN estimated_hours IS NOT NULL 
                        THEN NOW() + (estimated_hours || ' hours')::INTERVAL 
                        ELSE NULL 
                    END,
                    updated_at = NOW()
                WHERE project_task_id = child_task.project_task_id;
                
                RAISE NOTICE 'Child task % automatically started after parent completion', child_task.project_task_id;
            END IF;
        END LOOP;
        
        -- Also check for next sequential task in the same step (if no parent-child relationship)
        IF NEW.parent_task_id IS NULL THEN
            -- Find the next task in sequence within the same step
            UPDATE project_tasks 
            SET task_status = 'ongoing',
                started_at = NOW(),
                deadline = CASE 
                    WHEN estimated_hours IS NOT NULL 
                    THEN NOW() + (estimated_hours || ' hours')::INTERVAL 
                    ELSE NULL 
                END,
                updated_at = NOW()
            WHERE project_id = NEW.project_id
            AND phase_order = NEW.phase_order
            AND step_order = NEW.step_order
            AND task_order = NEW.task_order + 1
            AND task_status = 'pending'
            AND parent_task_id IS NULL
            AND is_loaded = true;
        END IF;
    END IF;

    -- Set started_at when task moves to escalated (if not already set)
    IF OLD.task_status != 'escalated' AND NEW.task_status = 'escalated' THEN
        IF NEW.started_at IS NULL THEN
            NEW.started_at = NOW();
        END IF;
        NEW.escalated_at = NOW();
    END IF;

    -- Try to load next step when current step is completed
    IF NEW.task_status = 'completed' THEN
        -- Check if all tasks in current step are completed and load next step
        IF NOT EXISTS (
            SELECT 1 FROM project_tasks 
            WHERE project_id = NEW.project_id 
            AND phase_order = NEW.phase_order 
            AND step_order = NEW.step_order 
            AND task_status != 'completed'
            AND is_loaded = true
            AND project_task_id != NEW.project_task_id
        ) THEN
            -- All tasks in current step are completed, load next step
            RAISE NOTICE 'All tasks in step completed for project %, loading next step', NEW.project_id;
            PERFORM load_next_step_tasks(NEW.project_id);
        ELSE
            RAISE NOTICE 'Some tasks still incomplete in step for project %', NEW.project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. RECREATE TRIGGER
-- =====================================================
-- Create trigger for task status changes
DROP TRIGGER IF EXISTS handle_task_status_change_trigger ON project_tasks;
CREATE TRIGGER handle_task_status_change_trigger
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_status_change();

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================
SELECT 'Project Task Workflow Fixes Applied Successfully!' as status,
       'Features: Empty step skipping, index-based execution, parent-child dependencies, auto-crew assignment' as features;
