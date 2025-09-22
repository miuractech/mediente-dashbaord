-- =====================================================
-- FIX TASK COMPLETION ERROR
-- =====================================================
-- This script fixes the issue where users cannot complete the first task
-- Error: "Cannot start task: parent task must be completed first"

-- The problem occurs because:
-- 1. Tasks might have incorrect parent_task_id relationships
-- 2. The trigger validation is too strict for direct completion
-- 3. Task initialization might not be setting up dependencies correctly

-- =====================================================
-- 1. IMPROVED TASK STATUS CHANGE TRIGGER
-- =====================================================

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
    -- IMPORTANT: Allow direct completion from pending status for first tasks
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
-- 2. IMPROVED TASK INITIALIZATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_task_execution_order(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
    step_record RECORD;
BEGIN
    -- Reset all loaded tasks to pending first
    UPDATE project_tasks 
    SET task_status = 'pending', updated_at = NOW()
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    AND task_status != 'completed';
    
    -- Start the first task in each step that has no parent dependencies
    FOR step_record IN
        SELECT DISTINCT phase_order, step_order
        FROM project_tasks
        WHERE project_id = p_project_id
        AND is_loaded = true
        ORDER BY phase_order, step_order
    LOOP
        -- Find the first task in this step that has no parent or whose parent is already completed
        FOR task_record IN
            SELECT project_task_id, phase_order, step_order, task_order, parent_task_id
            FROM project_tasks
            WHERE project_id = p_project_id
            AND is_loaded = true
            AND task_status = 'pending'
            AND phase_order = step_record.phase_order
            AND step_order = step_record.step_order
            AND (
                parent_task_id IS NULL 
                OR EXISTS (
                    SELECT 1 FROM project_tasks parent_task 
                    WHERE parent_task.project_task_id = project_tasks.parent_task_id 
                    AND parent_task.task_status = 'completed'
                )
            )
            ORDER BY task_order
            LIMIT 1
        LOOP
            -- Start this task
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
            
            RAISE NOTICE 'Task % started as first available in step (phase %, step %)', 
                task_record.project_task_id, task_record.phase_order, task_record.step_order;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNCTION TO CLEAN UP INVALID PARENT RELATIONSHIPS
-- =====================================================

CREATE OR REPLACE FUNCTION fix_invalid_parent_task_relationships(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Find tasks that have invalid parent relationships
    -- (parent tasks that don't exist or are in different projects)
    FOR task_record IN
        SELECT pt.project_task_id, pt.task_name, pt.parent_task_id
        FROM project_tasks pt
        LEFT JOIN project_tasks parent ON parent.project_task_id = pt.parent_task_id
        WHERE pt.project_id = p_project_id
        AND pt.parent_task_id IS NOT NULL
        AND (
            parent.project_task_id IS NULL 
            OR parent.project_id != pt.project_id
            OR parent.is_archived = true
        )
    LOOP
        -- Remove invalid parent relationship
        UPDATE project_tasks 
        SET parent_task_id = NULL,
            updated_at = NOW()
        WHERE project_task_id = task_record.project_task_id;
        
        RAISE NOTICE 'Removed invalid parent relationship for task % (%)', 
            task_record.project_task_id, task_record.task_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. APPLY FIXES TO EXISTING PROJECTS
-- =====================================================

DO $$
DECLARE
    project_record RECORD;
BEGIN
    -- Fix invalid parent relationships for all active projects
    FOR project_record IN
        SELECT DISTINCT project_id
        FROM project_tasks
        WHERE is_loaded = true
        AND is_archived = false
    LOOP
        -- Clean up invalid parent relationships
        PERFORM fix_invalid_parent_task_relationships(project_record.project_id);
        
        -- Re-initialize task execution order
        PERFORM initialize_task_execution_order(project_record.project_id);
        
        RAISE NOTICE 'Fixed task relationships and re-initialized project %', project_record.project_id;
    END LOOP;
END;
$$;

-- =====================================================
-- 5. CREATE TRIGGER (Replace existing one)
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS project_tasks_status_change_trigger ON project_tasks;

-- Create new trigger
CREATE TRIGGER project_tasks_status_change_trigger
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_status_change();

RAISE NOTICE 'Task completion error fixes applied successfully!';
RAISE NOTICE 'Users should now be able to complete first tasks without parent dependency errors.';
