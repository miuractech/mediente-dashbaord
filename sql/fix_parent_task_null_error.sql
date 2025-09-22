-- =====================================================
-- FIX PARENT TASK NULL ERROR
-- =====================================================
-- This script fixes the issue where tasks with parent_task_id = NULL
-- still get "Cannot start task: parent task must be completed first" error

-- The issue occurs because there might be a bug in the trigger logic
-- or multiple triggers conflicting with each other.

-- =====================================================
-- 1. CORRECTED TASK STATUS CHANGE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION handle_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
    child_task RECORD;
BEGIN
    -- Debug: Log the task being updated
    RAISE NOTICE 'Updating task %: % -> %, parent_task_id: %', 
        NEW.project_task_id, OLD.task_status, NEW.task_status, NEW.parent_task_id;

    -- Validate parent-child dependencies when changing to ongoing
    IF OLD.task_status != 'ongoing' AND NEW.task_status = 'ongoing' THEN
        -- Check if parent task is completed (ONLY if this task has a parent)
        IF NEW.parent_task_id IS NOT NULL THEN
            RAISE NOTICE 'Task % has parent %, checking if completed', 
                NEW.project_task_id, NEW.parent_task_id;
            
            IF NOT EXISTS (
                SELECT 1 FROM project_tasks 
                WHERE project_task_id = NEW.parent_task_id 
                AND task_status = 'completed'
            ) THEN
                RAISE EXCEPTION 'Cannot start task: parent task must be completed first';
            END IF;
        ELSE
            RAISE NOTICE 'Task % has no parent, allowing start', NEW.project_task_id;
        END IF;
        
        -- Set started_at if not already set
        IF NEW.started_at IS NULL THEN
            NEW.started_at = NOW();
        END IF;
        
        -- Calculate deadline based on estimated hours
        IF NEW.estimated_hours IS NOT NULL THEN
            NEW.deadline = NOW() + (NEW.estimated_hours || ' hours')::INTERVAL;
        END IF;
    END IF;

    -- Set completed_at when task is completed
    -- Allow direct completion from any status (pending, ongoing, escalated)
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
-- 2. RECREATE TRIGGER (ensure only one exists)
-- =====================================================

-- Drop any existing triggers with different names
DROP TRIGGER IF EXISTS handle_task_status_change_trigger ON project_tasks;
DROP TRIGGER IF EXISTS project_tasks_status_change_trigger ON project_tasks;
DROP TRIGGER IF EXISTS task_status_change_trigger ON project_tasks;

-- Create the trigger
CREATE TRIGGER handle_task_status_change_trigger
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_status_change();

-- =====================================================
-- 3. VERIFY AND CLEAN UP NULL PARENT TASKS
-- =====================================================

-- Function to check for tasks that might have invalid parent_task_id values
CREATE OR REPLACE FUNCTION debug_parent_task_issues(p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
    task_id UUID,
    task_name TEXT,
    task_status TEXT,
    parent_task_id UUID,
    parent_exists BOOLEAN,
    parent_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.project_task_id,
        pt.task_name,
        pt.task_status::TEXT,
        pt.parent_task_id,
        (parent_pt.project_task_id IS NOT NULL) as parent_exists,
        parent_pt.task_status::TEXT as parent_status
    FROM project_tasks pt
    LEFT JOIN project_tasks parent_pt ON pt.parent_task_id = parent_pt.project_task_id
    WHERE (p_project_id IS NULL OR pt.project_id = p_project_id)
    AND pt.is_archived = false
    AND pt.is_loaded = true
    ORDER BY pt.phase_order, pt.step_order, pt.task_order;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. SUCCESS MESSAGE
-- =====================================================

SELECT 'Parent task null error fix applied successfully!' as status,
       'Added debug logging and ensured proper null checking in trigger' as details;
