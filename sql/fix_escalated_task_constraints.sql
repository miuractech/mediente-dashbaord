-- =====================================================
-- FIX ESCALATED TASK CONSTRAINT VIOLATIONS
-- =====================================================
-- This script fixes tasks that have escalated_at but are not in 'escalated' status
-- which violates the constraint: CHECK (escalated_at IS NULL OR task_status = 'escalated')

-- =====================================================
-- 1. IDENTIFY PROBLEMATIC TASKS
-- =====================================================

-- Check for tasks that violate the escalation constraint
SELECT 
    project_task_id,
    task_name,
    task_status,
    escalated_at,
    escalation_reason,
    is_manually_escalated
FROM project_tasks 
WHERE escalated_at IS NOT NULL 
  AND task_status != 'escalated'
  AND is_archived = false;

-- =====================================================
-- 2. FIX CONSTRAINT VIOLATIONS
-- =====================================================

-- Option 1: Clear escalation fields for non-escalated tasks
-- This is the safer approach as it preserves the current status
UPDATE project_tasks 
SET 
    escalated_at = NULL,
    escalation_reason = NULL,
    is_manually_escalated = false,
    updated_at = NOW()
WHERE escalated_at IS NOT NULL 
  AND task_status != 'escalated'
  AND is_archived = false;

-- =====================================================
-- 3. ENSURE COMPLETED TASKS HAVE PROPER TIMESTAMPS
-- =====================================================

-- Fix completed tasks that don't have started_at
UPDATE project_tasks 
SET 
    started_at = COALESCE(started_at, completed_at, created_at),
    updated_at = NOW()
WHERE task_status = 'completed' 
  AND started_at IS NULL
  AND is_archived = false;

-- Fix completed tasks that don't have completed_at
UPDATE project_tasks 
SET 
    completed_at = COALESCE(completed_at, updated_at),
    updated_at = NOW()
WHERE task_status = 'completed' 
  AND completed_at IS NULL
  AND is_archived = false;

-- =====================================================
-- 4. ENSURE ESCALATED TASKS HAVE PROPER TIMESTAMPS
-- =====================================================

-- Fix escalated tasks that don't have escalated_at
UPDATE project_tasks 
SET 
    escalated_at = COALESCE(escalated_at, updated_at),
    started_at = COALESCE(started_at, escalated_at, updated_at),
    updated_at = NOW()
WHERE task_status = 'escalated' 
  AND escalated_at IS NULL
  AND is_archived = false;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Verify no constraint violations remain
SELECT 
    'Constraint Violations Check' as check_type,
    COUNT(*) as violation_count
FROM project_tasks 
WHERE (
    (escalated_at IS NOT NULL AND task_status != 'escalated') OR
    (completed_at IS NOT NULL AND started_at IS NULL)
) AND is_archived = false;

-- Show task status distribution
SELECT 
    task_status,
    COUNT(*) as count,
    COUNT(CASE WHEN escalated_at IS NOT NULL THEN 1 END) as with_escalated_at,
    COUNT(CASE WHEN started_at IS NOT NULL THEN 1 END) as with_started_at,
    COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as with_completed_at
FROM project_tasks 
WHERE is_archived = false
GROUP BY task_status
ORDER BY task_status;
