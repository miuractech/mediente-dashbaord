-- =====================================================
-- FIX PROJECT TASKS CONSTRAINT VIOLATIONS
-- =====================================================
-- This script fixes any existing data that violates the check constraints
-- and ensures the trigger function handles all edge cases properly

-- =====================================================
-- 1. FIX EXISTING DATA VIOLATIONS
-- =====================================================

-- Fix tasks that have completed_at but no started_at (violates constraint)
UPDATE project_tasks 
SET started_at = completed_at
WHERE completed_at IS NOT NULL 
  AND started_at IS NULL;

-- Fix tasks that have escalated_at but status is not 'escalated'
UPDATE project_tasks 
SET escalated_at = NULL
WHERE escalated_at IS NOT NULL 
  AND task_status != 'escalated';

-- Fix tasks that are escalated but have no escalated_at
UPDATE project_tasks 
SET escalated_at = updated_at
WHERE task_status = 'escalated' 
  AND escalated_at IS NULL;

-- Ensure all JSONB fields are properly formatted arrays
UPDATE project_tasks 
SET checklist_items = '[]'::jsonb
WHERE checklist_items IS NULL 
   OR jsonb_typeof(checklist_items) != 'array';

UPDATE project_tasks 
SET file_attachments = '[]'::jsonb
WHERE file_attachments IS NULL 
   OR jsonb_typeof(file_attachments) != 'array';

UPDATE project_tasks 
SET comments = '[]'::jsonb
WHERE comments IS NULL 
   OR jsonb_typeof(comments) != 'array';

-- =====================================================
-- 2. UPDATE THE TRIGGER FUNCTION (Already done in main schema)
-- =====================================================

-- The trigger function has been updated in the main project.sql file
-- to handle the constraints properly

-- =====================================================
-- 3. VERIFICATION QUERIES
-- =====================================================

-- Check for any remaining constraint violations
SELECT 'Constraint Violations Check' as check_type;

-- Check completed_at without started_at
SELECT COUNT(*) as violations_completed_without_started
FROM project_tasks 
WHERE completed_at IS NOT NULL 
  AND started_at IS NULL;

-- Check escalated_at without escalated status
SELECT COUNT(*) as violations_escalated_at_wrong_status
FROM project_tasks 
WHERE escalated_at IS NOT NULL 
  AND task_status != 'escalated';

-- Check escalated status without escalated_at
SELECT COUNT(*) as violations_escalated_status_no_timestamp
FROM project_tasks 
WHERE task_status = 'escalated' 
  AND escalated_at IS NULL;

-- Check JSONB array constraints
SELECT COUNT(*) as violations_checklist_not_array
FROM project_tasks 
WHERE jsonb_typeof(checklist_items) != 'array';

SELECT COUNT(*) as violations_attachments_not_array
FROM project_tasks 
WHERE jsonb_typeof(file_attachments) != 'array';

SELECT COUNT(*) as violations_comments_not_array
FROM project_tasks 
WHERE jsonb_typeof(comments) != 'array';

-- =====================================================
-- 4. SUCCESS MESSAGE
-- =====================================================

SELECT 'Project tasks constraint violations have been fixed!' as status;
