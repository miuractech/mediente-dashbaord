-- =====================================================
-- ROLLBACK PROJECT TASK WORKFLOW FIXES
-- =====================================================
-- This script undoes the changes made by fix_project_tasks_workflow.sql
-- by dropping the functions and trigger that were created/modified

-- =====================================================
-- 1. DROP TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS handle_task_status_change_trigger ON project_tasks;

-- =====================================================
-- 2. DROP FUNCTIONS
-- =====================================================
-- Drop the functions created/replaced by the workflow script
DROP FUNCTION IF EXISTS load_next_phase_tasks(p_project_id UUID);
DROP FUNCTION IF EXISTS initialize_task_execution_order(p_project_id UUID);
DROP FUNCTION IF EXISTS auto_assign_crew_to_loaded_tasks(p_project_id UUID);
DROP FUNCTION IF EXISTS handle_task_status_change();

-- =====================================================
-- 3. SUCCESS MESSAGE
-- =====================================================
SELECT 'Project Task Workflow Fixes Rolled Back Successfully!' as status,
       'All functions and triggers from fix_project_tasks_workflow.sql have been removed' as details;
