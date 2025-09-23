-- =====================================================
-- LOAD ALL TASKS ON CREW COMPLETION MIGRATION
-- =====================================================
-- This migration updates the project system to load all tasks 
-- from all phases when crew assignment is completed, instead of 
-- just loading the first phase tasks.

-- =====================================================
-- 1. CREATE LOAD_ALL_PROJECT_TASKS FUNCTION
-- =====================================================

-- Function to load all tasks from all phases at once (for initial project start)
CREATE OR REPLACE FUNCTION load_all_project_tasks(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
    phase_data JSONB;
    step_data JSONB;
    task_data JSONB;
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

    -- Check if tasks are already loaded
    IF EXISTS (
        SELECT 1 FROM project_tasks 
        WHERE project_id = p_project_id 
        AND is_loaded = true 
        AND is_archived = false
    ) THEN
        RAISE NOTICE 'Project % already has loaded tasks', p_project_id;
        RETURN FALSE;
    END IF;

    RAISE NOTICE 'Loading all tasks for project %', p_project_id;

    -- Load all tasks from all phases and steps
    FOR phase_data IN 
        SELECT value as phase FROM jsonb_array_elements(project_record.template_snapshot->'phases')
        ORDER BY (value->'phase'->>'phase_order')::INTEGER
    LOOP
        -- Loop through all steps in this phase
        FOR step_data IN 
            SELECT value as step FROM jsonb_array_elements(phase_data->'steps')
            ORDER BY (value->'step'->>'step_order')::INTEGER
        LOOP
            -- Load all tasks in this step, respecting parent-child relationships
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
                    estimated_days, parent_task_id, category, checklist_items,
                    is_loaded, created_by
                ) VALUES (
                    p_project_id,
                    (task_data->>'task_id')::UUID,
                    task_data->>'task_name',
                    task_data->>'description',
                    phase_data->'phase'->>'phase_name',
                    (phase_data->'phase'->>'phase_order')::INTEGER,
                    step_data->'step'->>'step_name',
                    (step_data->'step'->>'step_order')::INTEGER,
                    (task_data->>'task_order')::INTEGER,
                    (task_data->>'estimated_days')::INTEGER,
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

    -- Update project current phase to first phase
    UPDATE projects 
    SET current_phase_id = gen_random_uuid(), -- Placeholder, could be improved
        updated_at = NOW()
    WHERE project_id = p_project_id;

    -- Initialize task execution order for all loaded tasks
    PERFORM initialize_task_execution_order_all_phases(p_project_id);
    
    -- Auto-assign crew to tasks based on template role assignments
    PERFORM auto_assign_crew_to_loaded_tasks(p_project_id);

    RAISE NOTICE 'Successfully loaded % tasks from all phases in project %', tasks_loaded, p_project_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE INITIALIZE_TASK_EXECUTION_ORDER_ALL_PHASES
-- =====================================================

-- Function to initialize task statuses for all phases
CREATE OR REPLACE FUNCTION initialize_task_execution_order_all_phases(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
    first_phase_order INTEGER;
BEGIN
    -- Reset all loaded tasks to pending first
    UPDATE project_tasks 
    SET task_status = 'pending', updated_at = NOW()
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    AND task_status != 'completed';
    
    -- Get the first phase order
    SELECT MIN(phase_order) INTO first_phase_order
    FROM project_tasks
    WHERE project_id = p_project_id
    AND is_loaded = true;
    
    -- Only start tasks from the first phase, first step
    -- Start tasks that have no parent and are first in order in the first phase
    FOR task_record IN
        SELECT project_task_id, phase_order, step_order, task_order
        FROM project_tasks
        WHERE project_id = p_project_id
        AND is_loaded = true
        AND task_status = 'pending'
        AND parent_task_id IS NULL
        AND phase_order = first_phase_order
        ORDER BY step_order, task_order
        LIMIT 1 -- Only start the very first task
    LOOP
        -- This is the first task in the first step of the first phase, make it ongoing
        UPDATE project_tasks 
        SET task_status = 'ongoing',
            started_at = NOW(),
            deadline = CASE 
                WHEN estimated_days IS NOT NULL 
                THEN NOW() + (estimated_days || ' days')::INTERVAL 
                ELSE NULL 
            END,
            updated_at = NOW()
        WHERE project_task_id = task_record.project_task_id;
        
        RAISE NOTICE 'Task % started as first task in project', task_record.project_task_id;
        EXIT; -- Only start one task initially
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. UPDATE AUTO_START_PROJECT_WHEN_READY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_start_project_when_ready(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_can_start BOOLEAN;
    has_loaded_tasks BOOLEAN;
    project_status_var project_status_type;
BEGIN
    -- Get current project status
    SELECT project_status INTO project_status_var
    FROM projects 
    WHERE project_id = p_project_id AND is_archived = false;
    
    IF project_status_var IS NULL THEN
        RAISE NOTICE 'Project % not found or archived', p_project_id;
        RETURN FALSE;
    END IF;
    
    -- Check if project can start (all roles filled)
    SELECT can_project_start(p_project_id) INTO project_can_start;
    
    IF NOT project_can_start THEN
        RAISE NOTICE 'Project % cannot start yet - roles not filled', p_project_id;
        RETURN FALSE;
    END IF;
    
    -- Check if project already has loaded tasks
    SELECT EXISTS (
        SELECT 1 FROM project_tasks 
        WHERE project_id = p_project_id 
        AND is_loaded = true 
        AND is_archived = false
    ) INTO has_loaded_tasks;
    
    IF has_loaded_tasks THEN
        RAISE NOTICE 'Project % already has loaded tasks', p_project_id;
        RETURN FALSE;
    END IF;
    
    -- All conditions met - auto start the project
    RAISE NOTICE 'Auto-starting project % - all roles filled', p_project_id;
    
    -- Load all tasks from all phases
    IF load_all_project_tasks(p_project_id) THEN
        -- Update project status to active if not already
        IF project_status_var != 'active' THEN
            UPDATE projects 
            SET project_status = 'active', updated_at = NOW()
            WHERE project_id = p_project_id;
            
            RAISE NOTICE 'Project % status updated to active and all tasks loaded', p_project_id;
        ELSE
            RAISE NOTICE 'Project % all tasks loaded successfully', p_project_id;
        END IF;
        
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Failed to load tasks for project %', p_project_id;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. UPDATE EXISTING TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to handle project role filled
CREATE OR REPLACE FUNCTION handle_project_role_filled()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when a role becomes filled
    IF OLD.is_filled = FALSE AND NEW.is_filled = TRUE THEN
        RAISE NOTICE 'Role filled for project %, checking if all roles are complete', NEW.project_id;
        
        -- Check if this was the last role to be filled and auto-start if ready
        PERFORM auto_start_project_when_ready(NEW.project_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle crew assignment
CREATE OR REPLACE FUNCTION handle_crew_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- When crew is assigned, check if all roles are now filled
    RAISE NOTICE 'Crew assigned to project %, checking if ready to auto-start', NEW.project_id;
    
    -- Check if project is ready to auto-start
    PERFORM auto_start_project_when_ready(NEW.project_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced assign_crew_to_project_role function
CREATE OR REPLACE FUNCTION assign_crew_to_project_role(
    p_project_id UUID,
    p_role_id UUID,
    p_crew_id UUID,
    p_assigned_by VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    project_role_id_var UUID;
    assignment_exists BOOLEAN;
BEGIN
    -- Get project role ID
    SELECT project_role_id INTO project_role_id_var
    FROM project_roles 
    WHERE project_id = p_project_id AND role_id = p_role_id;

    IF project_role_id_var IS NULL THEN
        RAISE EXCEPTION 'Project role not found';
    END IF;

    -- Check if assignment already exists
    SELECT EXISTS (
        SELECT 1 FROM project_crew_assignments
        WHERE project_id = p_project_id 
        AND project_role_id = project_role_id_var 
        AND crew_id = p_crew_id
    ) INTO assignment_exists;

    -- Insert assignment (will be ignored if already exists due to UNIQUE constraint)
    INSERT INTO project_crew_assignments (project_id, project_role_id, crew_id, assigned_by)
    VALUES (p_project_id, project_role_id_var, p_crew_id, p_assigned_by)
    ON CONFLICT (project_id, project_role_id, crew_id) DO NOTHING;

    -- Update role as filled (this will trigger the auto-start check)
    UPDATE project_roles 
    SET is_filled = TRUE, updated_at = NOW()
    WHERE project_role_id = project_role_id_var;

    -- The trigger will automatically check if project is ready to start
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE/UPDATE TRIGGERS
-- =====================================================

-- Trigger on project_roles when is_filled changes to TRUE
DROP TRIGGER IF EXISTS auto_start_on_role_filled ON project_roles;
CREATE TRIGGER auto_start_on_role_filled
    AFTER UPDATE ON project_roles
    FOR EACH ROW
    WHEN (OLD.is_filled = FALSE AND NEW.is_filled = TRUE)
    EXECUTE FUNCTION handle_project_role_filled();

-- Trigger on project_crew_assignments when crew is assigned
DROP TRIGGER IF EXISTS auto_start_on_crew_assigned ON project_crew_assignments;
CREATE TRIGGER auto_start_on_crew_assigned
    AFTER INSERT ON project_crew_assignments
    FOR EACH ROW
    EXECUTE FUNCTION handle_crew_assignment();

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================

SELECT 'Load all tasks on crew completion migration completed!' as status,
       'Projects will now load all tasks from all phases when crew assignment is complete' as description;
