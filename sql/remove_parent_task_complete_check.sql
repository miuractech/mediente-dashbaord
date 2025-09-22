-- =====================================================
-- MIGRATION: Remove Parent Task Complete Check
-- =====================================================
-- This migration removes the parent task completion check
-- that prevents child tasks from starting before parent completion
-- 
-- Date: 2025-09-16
-- =====================================================

-- =====================================================
-- FORWARD MIGRATION: Remove Parent Task Complete Check
-- =====================================================

-- Drop the existing trigger that enforces parent task completion
DROP TRIGGER IF EXISTS handle_task_status_change_trigger ON project_tasks;

-- Create new function without parent task completion check
CREATE OR REPLACE FUNCTION handle_task_status_change_no_parent_check()
RETURNS TRIGGER AS $$
DECLARE
    child_task RECORD;
BEGIN
    -- Allow task to start regardless of parent status (REMOVED PARENT CHECK)
    IF OLD.task_status != 'ongoing' AND NEW.task_status = 'ongoing' THEN
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
            PERFORM load_next_phase_tasks(NEW.project_id);
        ELSE
            RAISE NOTICE 'Some tasks still incomplete in step for project %', NEW.project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger with the modified function
CREATE TRIGGER handle_task_status_change_trigger
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_status_change_no_parent_check();

-- Add comment to track migration
COMMENT ON FUNCTION handle_task_status_change_no_parent_check() IS 'Modified trigger function without parent task completion check - allows child tasks to start independently';

-- =====================================================
-- REVERT MIGRATION: Restore Parent Task Complete Check
-- =====================================================

-- To revert this migration, run the following commands:
/*

-- Drop the modified trigger
DROP TRIGGER IF EXISTS handle_task_status_change_trigger ON project_tasks;

-- Drop the modified function
DROP FUNCTION IF EXISTS handle_task_status_change_no_parent_check();

-- Recreate the original function with parent task completion check
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
            PERFORM load_next_phase_tasks(NEW.project_id);
        ELSE
            RAISE NOTICE 'Some tasks still incomplete in step for project %', NEW.project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the original trigger
CREATE TRIGGER handle_task_status_change_trigger
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_status_change();

*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration completed successfully!' as status,
       'Parent task completion check has been removed' as change,
       'Child tasks can now start independently of parent task status' as effect;
