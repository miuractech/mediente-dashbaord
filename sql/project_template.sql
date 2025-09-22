-- =====================================================
-- CONSOLIDATED PROJECT TEMPLATES SCHEMA
-- =====================================================
-- This script creates a complete project templates system with all features
-- Combines all migration files into a single comprehensive schema
-- Run this script in your Supabase SQL editor

-- =====================================================
-- 1. PREREQUISITE FUNCTIONS AND TYPES
-- =====================================================

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create task category enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_category_type') THEN
        CREATE TYPE task_category_type AS ENUM ('monitor', 'coordinate', 'execute');
        RAISE NOTICE 'Created task_category_type enum';
    ELSE
        RAISE NOTICE 'task_category_type enum already exists';
    END IF;
END $$;

-- =====================================================
-- 2. PROJECT TEMPLATES TABLE (Level 1)
-- =====================================================

CREATE TABLE IF NOT EXISTS project_templates (
  template_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for project_templates
CREATE INDEX IF NOT EXISTS idx_project_templates_name ON project_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_project_templates_archived ON project_templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_at ON project_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON project_templates(created_by);
-- Full-text search index for template names and descriptions
CREATE INDEX IF NOT EXISTS idx_project_templates_search ON project_templates USING gin(to_tsvector('english', template_name || ' ' || COALESCE(description, '')));

-- Create trigger for project_templates
DROP TRIGGER IF EXISTS update_project_templates_updated_at ON project_templates;
CREATE TRIGGER update_project_templates_updated_at 
    BEFORE UPDATE ON project_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. TEMPLATE PHASES TABLE (Level 2)
-- =====================================================

CREATE TABLE IF NOT EXISTS template_phases (
  phase_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES project_templates(template_id) ON DELETE CASCADE,
  phase_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  phase_order INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(template_id, phase_order)
);

-- Create indexes for template_phases
CREATE INDEX IF NOT EXISTS idx_template_phases_template_id ON template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_phases_order ON template_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_template_phases_archived ON template_phases(is_archived);
CREATE INDEX IF NOT EXISTS idx_template_phases_name ON template_phases(phase_name);
CREATE INDEX IF NOT EXISTS idx_template_phases_template_archived ON template_phases(template_id, is_archived);
-- Full-text search index for phases
CREATE INDEX IF NOT EXISTS idx_template_phases_search ON template_phases USING gin(to_tsvector('english', phase_name || ' ' || COALESCE(description, '')));

-- Create trigger for template_phases
DROP TRIGGER IF EXISTS update_template_phases_updated_at ON template_phases;
CREATE TRIGGER update_template_phases_updated_at 
    BEFORE UPDATE ON template_phases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. PHASE STEPS TABLE (Level 3)
-- =====================================================

CREATE TABLE IF NOT EXISTS phase_steps (
  step_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES template_phases(phase_id) ON DELETE CASCADE,
  step_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  step_order INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(phase_id, step_order)
);

-- Create indexes for phase_steps
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_id ON phase_steps(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_steps_order ON phase_steps(step_order);
CREATE INDEX IF NOT EXISTS idx_phase_steps_archived ON phase_steps(is_archived);
CREATE INDEX IF NOT EXISTS idx_phase_steps_name ON phase_steps(step_name);
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_archived ON phase_steps(phase_id, is_archived);
-- Full-text search index for steps
CREATE INDEX IF NOT EXISTS idx_phase_steps_search ON phase_steps USING gin(to_tsvector('english', step_name || ' ' || COALESCE(description, '')));

-- Create trigger for phase_steps
DROP TRIGGER IF EXISTS update_phase_steps_updated_at ON phase_steps;
CREATE TRIGGER update_phase_steps_updated_at 
    BEFORE UPDATE ON phase_steps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. STEP TASKS TABLE (Level 4) - WITH ALL FEATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS step_tasks (
  task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES phase_steps(step_id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  description TEXT CHECK (char_length(description) <= 1000),
  task_order INTEGER NOT NULL DEFAULT 1,
  estimated_hours INTEGER CHECK (estimated_hours >= 0),
  assigned_role_id UUID,
  parent_task_id UUID REFERENCES step_tasks(task_id) ON DELETE CASCADE,
  category task_category_type,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(step_id, task_order),
  -- Constraint to ensure checklist_items is a valid JSON array
  CONSTRAINT step_tasks_checklist_items_is_array CHECK (jsonb_typeof(checklist_items) = 'array')
);

-- Add foreign key constraint for assigned_role_id if department_roles table exists
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'step_tasks' 
        AND kcu.column_name = 'assigned_role_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Check if department_roles table exists before adding the constraint
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_roles') THEN
            ALTER TABLE step_tasks 
            ADD CONSTRAINT fk_step_tasks_assigned_role 
            FOREIGN KEY (assigned_role_id) REFERENCES department_roles(role_id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for assigned_role_id';
        ELSE
            RAISE NOTICE 'department_roles table not found. Skipping foreign key constraint.';
        END IF;
    END IF;
END $$;

-- Create indexes for step_tasks
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_id ON step_tasks(step_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_order ON step_tasks(task_order);
CREATE INDEX IF NOT EXISTS idx_step_tasks_archived ON step_tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_step_tasks_name ON step_tasks(task_name);
CREATE INDEX IF NOT EXISTS idx_step_tasks_estimated_hours ON step_tasks(estimated_hours);
CREATE INDEX IF NOT EXISTS idx_step_tasks_assigned_role ON step_tasks(assigned_role_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_parent_task_id ON step_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_category ON step_tasks(category);
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_archived ON step_tasks(step_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_step_tasks_role_archived ON step_tasks(assigned_role_id, is_archived) WHERE assigned_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_parent ON step_tasks(step_id, parent_task_id);
CREATE INDEX IF NOT EXISTS idx_step_tasks_step_category ON step_tasks(step_id, category);
-- Full-text search index for tasks
CREATE INDEX IF NOT EXISTS idx_step_tasks_search ON step_tasks USING gin(to_tsvector('english', task_name || ' ' || COALESCE(description, '')));
-- GIN index for JSONB operations on checklist_items
CREATE INDEX IF NOT EXISTS idx_step_tasks_checklist_items ON step_tasks USING GIN (checklist_items);

-- Create trigger for step_tasks
DROP TRIGGER IF EXISTS update_step_tasks_updated_at ON step_tasks;
CREATE TRIGGER update_step_tasks_updated_at 
    BEFORE UPDATE ON step_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CHECKLIST VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate checklist item structure
CREATE OR REPLACE FUNCTION validate_checklist_item(item JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if item has required fields with correct types
    RETURN (
        item ? 'id' AND 
        item ? 'text' AND 
        item ? 'order' AND
        jsonb_typeof(item->'id') = 'string' AND
        jsonb_typeof(item->'text') = 'string' AND
        jsonb_typeof(item->'order') = 'number'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to validate entire checklist_items array
CREATE OR REPLACE FUNCTION validate_checklist_items_array(items JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    item JSONB;
BEGIN
    -- Check if it's an array
    IF jsonb_typeof(items) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Validate each item in the array
    FOR item IN SELECT jsonb_array_elements(items) LOOP
        IF NOT validate_checklist_item(item) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate checklist items structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'step_tasks_checklist_items_valid_structure'
    ) THEN
        ALTER TABLE step_tasks 
        ADD CONSTRAINT step_tasks_checklist_items_valid_structure 
        CHECK (validate_checklist_items_array(checklist_items));
        
        RAISE NOTICE 'Added constraint to validate checklist_items structure';
    ELSE
        RAISE NOTICE 'checklist_items structure validation constraint already exists';
    END IF;
END $$;

-- =====================================================
-- 7. TASK HIERARCHY VALIDATION FUNCTIONS
-- =====================================================

-- Function to prevent circular parent-child relationships
CREATE OR REPLACE FUNCTION check_task_circular_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    current_task UUID;
    max_depth INTEGER := 10;
    depth INTEGER := 0;
    current_template_id UUID;
    parent_template_id UUID;
BEGIN
    -- Only check if parent_task_id is being set
    IF NEW.parent_task_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if task is trying to be its own parent
    IF NEW.task_id = NEW.parent_task_id THEN
        RAISE EXCEPTION 'Task cannot be its own parent';
    END IF;
    
    -- Get the template ID for the current task's step
    SELECT tp.template_id INTO current_template_id
    FROM phase_steps ps
    INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
    WHERE ps.step_id = NEW.step_id;
    
    -- Get the template ID for the parent task's step
    SELECT tp.template_id INTO parent_template_id
    FROM step_tasks st
    INNER JOIN phase_steps ps ON st.step_id = ps.step_id
    INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
    WHERE st.task_id = NEW.parent_task_id;
    
    -- Check that parent task exists and belongs to the same template
    IF parent_template_id IS NULL THEN
        RAISE EXCEPTION 'Parent task does not exist';
    END IF;
    
    IF current_template_id != parent_template_id THEN
        RAISE EXCEPTION 'Parent task must belong to the same template';
    END IF;
    
    -- Check for circular hierarchy
    current_task := NEW.parent_task_id;
    WHILE current_task IS NOT NULL AND depth < max_depth LOOP
        -- If we find our task in the parent chain, it's circular
        IF current_task = NEW.task_id THEN
            RAISE EXCEPTION 'Circular parent-child relationship detected';
        END IF;
        
        -- Move up the parent chain
        SELECT parent_task_id INTO current_task 
        FROM step_tasks 
        WHERE task_id = current_task;
        
        depth := depth + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check circular hierarchy
DROP TRIGGER IF EXISTS check_task_circular_hierarchy_trigger ON step_tasks;
CREATE TRIGGER check_task_circular_hierarchy_trigger
    BEFORE INSERT OR UPDATE ON step_tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_circular_hierarchy();

-- Function to get task hierarchy (all descendants of a task)
CREATE OR REPLACE FUNCTION get_task_descendants(task_uuid UUID)
RETURNS TABLE (
    task_id UUID,
    task_name VARCHAR(255),
    parent_task_id UUID,
    level INTEGER
) AS $$
WITH RECURSIVE task_tree AS (
    -- Base case: start with the given task
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        0 as level
    FROM step_tasks t
    WHERE t.task_id = task_uuid
    
    UNION ALL
    
    -- Recursive case: get all children
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        tt.level + 1
    FROM step_tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.task_id
)
SELECT * FROM task_tree WHERE task_id != task_uuid
ORDER BY level, task_name;
$$ LANGUAGE sql;

-- Function to get task ancestors (all parents of a task)
CREATE OR REPLACE FUNCTION get_task_ancestors(task_uuid UUID)
RETURNS TABLE (
    task_id UUID,
    task_name VARCHAR(255),
    parent_task_id UUID,
    level INTEGER
) AS $$
WITH RECURSIVE task_tree AS (
    -- Base case: start with the given task
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        0 as level
    FROM step_tasks t
    WHERE t.task_id = task_uuid
    
    UNION ALL
    
    -- Recursive case: get all parents
    SELECT 
        t.task_id,
        t.task_name,
        t.parent_task_id,
        tt.level + 1
    FROM step_tasks t
    INNER JOIN task_tree tt ON t.task_id = tt.parent_task_id
)
SELECT * FROM task_tree WHERE task_id != task_uuid
ORDER BY level DESC, task_name;
$$ LANGUAGE sql;

-- =====================================================
-- 8. TEMPLATE UTILITY FUNCTIONS
-- =====================================================

-- Function to get template hierarchy with counts and role assignments
CREATE OR REPLACE FUNCTION get_template_hierarchy(template_uuid UUID)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    phase_count BIGINT,
    step_count BIGINT,
    task_count BIGINT,
    total_estimated_hours BIGINT,
    roles_involved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.template_id,
        pt.template_name,
        COALESCE(phase_counts.phase_count, 0) as phase_count,
        COALESCE(step_counts.step_count, 0) as step_count,
        COALESCE(task_counts.task_count, 0) as task_count,
        COALESCE(task_hours.total_hours, 0) as total_estimated_hours,
        COALESCE(role_counts.roles_involved, 0) as roles_involved
    FROM project_templates pt
    LEFT JOIN (
        SELECT template_id, COUNT(*) as phase_count
        FROM template_phases
        WHERE is_archived = false
        GROUP BY template_id
    ) phase_counts ON pt.template_id = phase_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(ps.*) as step_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) step_counts ON pt.template_id = step_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(st.*) as task_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) task_counts ON pt.template_id = task_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, SUM(st.estimated_hours) as total_hours
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false AND st.estimated_hours IS NOT NULL
        GROUP BY tp.template_id
    ) task_hours ON pt.template_id = task_hours.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(DISTINCT st.assigned_role_id) as roles_involved
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false AND st.assigned_role_id IS NOT NULL
        GROUP BY tp.template_id
    ) role_counts ON pt.template_id = role_counts.template_id
    WHERE pt.template_id = template_uuid AND pt.is_archived = false;
END;
$$ LANGUAGE plpgsql;

-- Function to duplicate a template with all its children
CREATE OR REPLACE FUNCTION duplicate_template(
    source_template_id UUID,
    new_template_name VARCHAR,
    created_by_user VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_template_id UUID;
    phase_record RECORD;
    step_record RECORD;
    task_record RECORD;
    new_phase_id UUID;
    new_step_id UUID;
BEGIN
    -- Create new template
    INSERT INTO project_templates (template_name, description, created_by)
    SELECT new_template_name, description, created_by_user
    FROM project_templates
    WHERE template_id = source_template_id
    RETURNING template_id INTO new_template_id;

    -- Copy phases
    FOR phase_record IN
        SELECT * FROM template_phases
        WHERE template_id = source_template_id AND is_archived = false
        ORDER BY phase_order
    LOOP
        INSERT INTO template_phases (template_id, phase_name, description, phase_order, created_by)
        VALUES (new_template_id, phase_record.phase_name, phase_record.description, phase_record.phase_order, created_by_user)
        RETURNING phase_id INTO new_phase_id;

        -- Copy steps for this phase
        FOR step_record IN
            SELECT * FROM phase_steps
            WHERE phase_id = phase_record.phase_id AND is_archived = false
            ORDER BY step_order
        LOOP
            INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by)
            VALUES (new_phase_id, step_record.step_name, step_record.description, step_record.step_order, created_by_user)
            RETURNING step_id INTO new_step_id;

            -- Copy tasks for this step (with role assignments and all new fields)
            FOR task_record IN
                SELECT * FROM step_tasks
                WHERE step_id = step_record.step_id AND is_archived = false
                ORDER BY task_order
            LOOP
                INSERT INTO step_tasks (
                    step_id, task_name, description, task_order, estimated_hours, 
                    assigned_role_id, category, checklist_items, created_by
                )
                VALUES (
                    new_step_id, task_record.task_name, task_record.description, 
                    task_record.task_order, task_record.estimated_hours, 
                    task_record.assigned_role_id, task_record.category, 
                    task_record.checklist_items, created_by_user
                );
            END LOOP;
        END LOOP;
    END LOOP;

    RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder items within a parent
CREATE OR REPLACE FUNCTION reorder_template_items(
    parent_id UUID,
    item_type VARCHAR,
    item_orders JSON
)
RETURNS BOOLEAN AS $$
DECLARE
    item RECORD;
BEGIN
    -- Loop through the JSON array of item orders
    FOR item IN SELECT * FROM json_array_elements(item_orders)
    LOOP
        CASE item_type
            WHEN 'phases' THEN
                UPDATE template_phases
                SET phase_order = (item.value->>'order')::INTEGER,
                    updated_at = NOW()
                WHERE phase_id = (item.value->>'id')::UUID
                AND template_id = parent_id;
                
            WHEN 'steps' THEN
                UPDATE phase_steps
                SET step_order = (item.value->>'order')::INTEGER,
                    updated_at = NOW()
                WHERE step_id = (item.value->>'id')::UUID
                AND phase_id = parent_id;
                
            WHEN 'tasks' THEN
                UPDATE step_tasks
                SET task_order = (item.value->>'order')::INTEGER,
                    updated_at = NOW()
                WHERE task_id = (item.value->>'id')::UUID
                AND step_id = parent_id;
        END CASE;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update project_templates" ON project_templates;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_templates" ON project_templates;

DROP POLICY IF EXISTS "Allow authenticated users to read template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to insert template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to update template_phases" ON template_phases;
DROP POLICY IF EXISTS "Allow authenticated users to delete template_phases" ON template_phases;

DROP POLICY IF EXISTS "Allow authenticated users to read phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to insert phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to update phase_steps" ON phase_steps;
DROP POLICY IF EXISTS "Allow authenticated users to delete phase_steps" ON phase_steps;

DROP POLICY IF EXISTS "Allow authenticated users to read step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update step_tasks" ON step_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete step_tasks" ON step_tasks;

-- Project Templates policies
CREATE POLICY "Allow authenticated users to read project_templates" ON project_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert project_templates" ON project_templates
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project_templates" ON project_templates
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete project_templates" ON project_templates
    FOR DELETE TO authenticated USING (true);

-- Template Phases policies
CREATE POLICY "Allow authenticated users to read template_phases" ON template_phases
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert template_phases" ON template_phases
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update template_phases" ON template_phases
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete template_phases" ON template_phases
    FOR DELETE TO authenticated USING (true);

-- Phase Steps policies
CREATE POLICY "Allow authenticated users to read phase_steps" ON phase_steps
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert phase_steps" ON phase_steps
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update phase_steps" ON phase_steps
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete phase_steps" ON phase_steps
    FOR DELETE TO authenticated USING (true);

-- Step Tasks policies
CREATE POLICY "Allow authenticated users to read step_tasks" ON step_tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert step_tasks" ON step_tasks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update step_tasks" ON step_tasks
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete step_tasks" ON step_tasks
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 10. COMMENTS AND DOCUMENTATION
-- =====================================================

-- Add comments to document the schema
COMMENT ON TABLE project_templates IS 'Top-level project templates containing phases, steps, and tasks';
COMMENT ON TABLE template_phases IS 'Phases within a project template, ordered hierarchically';
COMMENT ON TABLE phase_steps IS 'Steps within a template phase, ordered hierarchically';
COMMENT ON TABLE step_tasks IS 'Tasks within a step, with full feature support including hierarchy, categories, and checklists';

COMMENT ON COLUMN step_tasks.assigned_role_id IS 'Foreign key to department_roles table (if exists)';
COMMENT ON COLUMN step_tasks.parent_task_id IS 'Self-referencing foreign key for task hierarchy';
COMMENT ON COLUMN step_tasks.category IS 'Task category: monitor (oversight), coordinate (management), execute (implementation)';
COMMENT ON COLUMN step_tasks.checklist_items IS 'JSONB array of checklist items with structure: [{"id": "uuid", "text": "string", "order": number}]';

COMMENT ON FUNCTION check_task_circular_hierarchy() IS 'Trigger function to prevent circular parent-child relationships and ensure parent tasks belong to the same template';
COMMENT ON FUNCTION get_task_descendants(UUID) IS 'Get all descendants (children, grandchildren, etc.) of a given task';
COMMENT ON FUNCTION get_task_ancestors(UUID) IS 'Get all ancestors (parents, grandparents, etc.) of a given task';
COMMENT ON FUNCTION get_template_hierarchy(UUID) IS 'Get comprehensive statistics for a template including counts and role assignments';
COMMENT ON FUNCTION duplicate_template(UUID, VARCHAR, VARCHAR) IS 'Duplicate a template with all its phases, steps, and tasks';
COMMENT ON FUNCTION reorder_template_items(UUID, VARCHAR, JSON) IS 'Reorder phases, steps, or tasks within their parent container';

-- =====================================================
-- 11. COPY/CLONE FUNCTIONS FOR TASKS AND STEPS
-- =====================================================

-- Function to copy tasks from one step to another with proper parent-child mapping
CREATE OR REPLACE FUNCTION copy_tasks_to_step(
    source_step_id UUID,
    target_step_id UUID,
    created_by_user VARCHAR,
    name_suffix VARCHAR DEFAULT 'Copy'
)
RETURNS JSON AS $$
DECLARE
    task_record RECORD;
    old_to_new_id_map JSONB := '{}';
    new_task_id UUID;
    mapped_parent_id UUID;
    copied_count INTEGER := 0;
BEGIN
    -- First pass: Copy all tasks and build ID mapping
    FOR task_record IN
        SELECT * FROM step_tasks
        WHERE step_id = source_step_id AND is_archived = false
        ORDER BY task_order
    LOOP
        -- Generate new task ID
        new_task_id := gen_random_uuid();
        
        -- Store mapping
        old_to_new_id_map := jsonb_set(
            old_to_new_id_map, 
            ARRAY[task_record.task_id::text], 
            to_jsonb(new_task_id::text)
        );
        
        -- Insert new task (without parent_task_id for now)
        INSERT INTO step_tasks (
            task_id, step_id, task_name, description, task_order,
            estimated_hours, assigned_role_id, category, checklist_items,
            created_by, parent_task_id
        ) VALUES (
            new_task_id, target_step_id, task_record.task_name || ' (' || name_suffix || ')',
            task_record.description, task_record.task_order,
            task_record.estimated_hours, task_record.assigned_role_id,
            task_record.category, task_record.checklist_items,
            created_by_user, NULL -- Will be updated in second pass
        );
        
        copied_count := copied_count + 1;
    END LOOP;
    
    -- Second pass: Update parent_task_id relationships using the mapping
    FOR task_record IN
        SELECT * FROM step_tasks
        WHERE step_id = source_step_id AND is_archived = false
        AND parent_task_id IS NOT NULL
    LOOP
        -- Get the new task ID for this task
        new_task_id := (old_to_new_id_map->>(task_record.task_id::text))::UUID;
        
        -- Get the new parent ID from mapping
        IF old_to_new_id_map ? task_record.parent_task_id::text THEN
            mapped_parent_id := (old_to_new_id_map->>(task_record.parent_task_id::text))::UUID;
            
            -- Update the parent_task_id
            UPDATE step_tasks
            SET parent_task_id = mapped_parent_id
            WHERE task_id = new_task_id;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'copied_tasks_count', copied_count,
        'id_mapping', old_to_new_id_map
    );
END;
$$ LANGUAGE plpgsql;

-- Function to copy an entire step with all its tasks to another phase
CREATE OR REPLACE FUNCTION copy_step_to_phase(
    source_step_id UUID,
    target_phase_id UUID,
    new_step_name VARCHAR,
    created_by_user VARCHAR,
    task_name_suffix VARCHAR DEFAULT 'Copy'
)
RETURNS JSON AS $$
DECLARE
    step_record RECORD;
    new_step_id UUID;
    copy_result JSON;
    next_order INTEGER;
BEGIN
    -- Get the source step details
    SELECT * INTO step_record
    FROM phase_steps
    WHERE step_id = source_step_id AND is_archived = false;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Source step not found');
    END IF;
    
    -- Get next order number for the target phase
    SELECT COALESCE(MAX(step_order), 0) + 1 INTO next_order
    FROM phase_steps
    WHERE phase_id = target_phase_id AND is_archived = false;
    
    -- Create the new step
    INSERT INTO phase_steps (
        phase_id, step_name, description, step_order, created_by
    ) VALUES (
        target_phase_id, 
        COALESCE(new_step_name, step_record.step_name || ' (Copy)'),
        step_record.description,
        next_order,
        created_by_user
    ) RETURNING step_id INTO new_step_id;
    
    -- Copy all tasks from source step to new step
    SELECT copy_tasks_to_step(source_step_id, new_step_id, created_by_user, task_name_suffix) INTO copy_result;
    
    RETURN json_build_object(
        'success', true,
        'new_step_id', new_step_id,
        'new_step_name', COALESCE(new_step_name, step_record.step_name || ' (Copy)'),
        'tasks_result', copy_result
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get template complexity for copy operations
-- Drop existing function first to handle return type changes
DROP FUNCTION IF EXISTS get_template_complexity(UUID);

CREATE OR REPLACE FUNCTION get_template_complexity(template_uuid UUID)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    phase_count BIGINT,
    step_count BIGINT,
    task_count BIGINT,
    parent_task_count BIGINT,
    estimated_duration_seconds BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.template_id,
        pt.template_name,
        COALESCE(phase_counts.phase_count, 0) as phase_count,
        COALESCE(step_counts.step_count, 0) as step_count,
        COALESCE(task_counts.task_count, 0) as task_count,
        COALESCE(parent_task_counts.parent_task_count, 0) as parent_task_count,
        COALESCE(task_hours.total_seconds, 0) as estimated_duration_seconds
    FROM project_templates pt
    LEFT JOIN (
        SELECT template_id, COUNT(*) as phase_count
        FROM template_phases
        WHERE is_archived = false
        GROUP BY template_id
    ) phase_counts ON pt.template_id = phase_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(ps.*) as step_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) step_counts ON pt.template_id = step_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(st.*) as task_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) task_counts ON pt.template_id = task_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, COUNT(st.*) as parent_task_count
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false AND st.parent_task_id IS NOT NULL
        WHERE tp.is_archived = false
        GROUP BY tp.template_id
    ) parent_task_counts ON pt.template_id = parent_task_counts.template_id
    LEFT JOIN (
        SELECT tp.template_id, SUM(st.estimated_hours * 3600) as total_seconds
        FROM template_phases tp
        LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id AND ps.is_archived = false
        LEFT JOIN step_tasks st ON ps.step_id = st.step_id AND st.is_archived = false
        WHERE tp.is_archived = false AND st.estimated_hours IS NOT NULL
        GROUP BY tp.template_id
    ) task_hours ON pt.template_id = task_hours.template_id
    WHERE pt.template_id = template_uuid AND pt.is_archived = false;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. VERIFICATION AND SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    -- Check if all tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_templates') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_phases') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phase_steps') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'step_tasks') THEN
        RAISE NOTICE 'All project template tables created successfully!';
    ELSE
        RAISE NOTICE 'Some tables may not have been created properly.';
    END IF;
    
    -- Check if all new columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'step_tasks' AND column_name = 'parent_task_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'step_tasks' AND column_name = 'category'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'step_tasks' AND column_name = 'checklist_items'
    ) THEN
        RAISE NOTICE 'All enhanced features (hierarchy, categories, checklists) are available.';
    ELSE
        RAISE NOTICE 'Some enhanced features may not be available.';
    END IF;
END $$;

-- Final success message
SELECT 'Consolidated Project Templates System created successfully!' as status,
       'Includes: Basic templates, task hierarchy, categories, checklists, role assignments, full-text search, and utility functions' as features;

-- Show table information for verification
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('project_templates', 'template_phases', 'phase_steps', 'step_tasks')
ORDER BY tablename;
