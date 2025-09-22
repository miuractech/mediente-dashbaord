-- =====================================================
-- AUTO LOAD TASKS WHEN ALL CREW ROLES ARE FILLED
-- =====================================================
-- This script adds automatic task loading when all project roles are filled

-- =====================================================
-- 1. CREATE FUNCTION TO CHECK AND AUTO-START PROJECT
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
    
    -- Load first step tasks
    IF load_next_phase_tasks(p_project_id) THEN
        -- Update project status to active if not already
        IF project_status_var != 'active' THEN
            UPDATE projects 
            SET project_status = 'active', updated_at = NOW()
            WHERE project_id = p_project_id;
            
            RAISE NOTICE 'Project % status updated to active and tasks loaded', p_project_id;
        ELSE
            RAISE NOTICE 'Project % tasks loaded successfully', p_project_id;
        END IF;
        
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Failed to load tasks for project %', p_project_id;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE TRIGGER FUNCTION FOR PROJECT ROLES
-- =====================================================

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

-- =====================================================
-- 3. CREATE TRIGGER FOR PROJECT CREW ASSIGNMENTS
-- =====================================================

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

-- =====================================================
-- 4. CREATE THE TRIGGERS
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
-- 5. UPDATE ASSIGN_CREW_TO_PROJECT_ROLE FUNCTION
-- =====================================================

-- Enhanced version that triggers auto-start check
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
-- 6. CREATE MANUAL TRIGGER FUNCTION FOR EXISTING PROJECTS
-- =====================================================

-- Function to manually check and start projects that might be ready
CREATE OR REPLACE FUNCTION check_and_start_ready_projects()
RETURNS TABLE(
    project_id UUID,
    project_name VARCHAR,
    action_taken TEXT,
    success BOOLEAN
) AS $$
DECLARE
    project_record RECORD;
    start_result BOOLEAN;
BEGIN
    -- Find projects that are ready to start but haven't been started
    FOR project_record IN
        SELECT p.project_id, p.project_name, p.project_status
        FROM projects p
        WHERE p.is_archived = false
        AND p.project_status = 'active'  -- Only check active projects
        AND NOT EXISTS (
            -- No loaded tasks yet
            SELECT 1 FROM project_tasks pt 
            WHERE pt.project_id = p.project_id 
            AND pt.is_loaded = true 
            AND pt.is_archived = false
        )
        AND NOT EXISTS (
            -- All roles are filled
            SELECT 1 FROM project_roles pr
            WHERE pr.project_id = p.project_id
            AND pr.is_filled = false
        )
    LOOP
        -- Try to auto-start this project
        SELECT auto_start_project_when_ready(project_record.project_id) INTO start_result;
        
        RETURN QUERY SELECT 
            project_record.project_id,
            project_record.project_name,
            CASE 
                WHEN start_result THEN 'Tasks loaded and project started'
                ELSE 'Failed to start project'
            END,
            start_result;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SUCCESS MESSAGE AND USAGE INSTRUCTIONS
-- =====================================================

SELECT 'Auto task loading system created successfully!' as status,
       'Projects will now automatically load tasks when all roles are filled' as description;

-- Usage instructions:
/*
-- To manually check and start any ready projects:
SELECT * FROM check_and_start_ready_projects();

-- To check a specific project:
SELECT auto_start_project_when_ready('YOUR_PROJECT_ID');

-- To see which projects are ready:
SELECT 
    p.project_id,
    p.project_name,
    COUNT(pr.*) as total_roles,
    COUNT(*) FILTER (WHERE pr.is_filled = true) as filled_roles,
    COUNT(*) FILTER (WHERE pr.is_filled = false) as unfilled_roles,
    EXISTS (
        SELECT 1 FROM project_tasks pt 
        WHERE pt.project_id = p.project_id 
        AND pt.is_loaded = true
    ) as has_loaded_tasks
FROM projects p
LEFT JOIN project_roles pr ON p.project_id = pr.project_id
WHERE p.is_archived = false
GROUP BY p.project_id, p.project_name
ORDER BY p.created_at DESC;
*/
