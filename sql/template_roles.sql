-- =====================================================
-- TEMPLATE ROLES TRACKING SYSTEM
-- =====================================================
-- This script creates a system to track unique roles used in each template
-- Maintains efficiency by storing only distinct role-template relationships

-- =====================================================
-- 1. TEMPLATE ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS template_roles (
  template_role_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES project_templates(template_id) ON DELETE CASCADE,
  role_id UUID NOT NULL,
  role_usage_count INTEGER DEFAULT 1 NOT NULL CHECK (role_usage_count >= 0),
  first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(template_id, role_id)
);

-- Add foreign key constraint for role_id if department_roles table exists
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'template_roles' 
        AND kcu.column_name = 'role_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Check if department_roles table exists before adding the constraint
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_roles') THEN
            ALTER TABLE template_roles 
            ADD CONSTRAINT fk_template_roles_role 
            FOREIGN KEY (role_id) REFERENCES department_roles(role_id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraint for role_id';
        ELSE
            RAISE NOTICE 'department_roles table not found. Skipping foreign key constraint.';
        END IF;
    END IF;
END $$;

-- Create indexes for template_roles
CREATE INDEX IF NOT EXISTS idx_template_roles_template_id ON template_roles(template_id);
CREATE INDEX IF NOT EXISTS idx_template_roles_role_id ON template_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_template_roles_usage_count ON template_roles(role_usage_count);
CREATE INDEX IF NOT EXISTS idx_template_roles_last_used ON template_roles(last_used_at);

-- Create trigger for template_roles
DROP TRIGGER IF EXISTS update_template_roles_updated_at ON template_roles;
CREATE TRIGGER update_template_roles_updated_at 
    BEFORE UPDATE ON template_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TEMPLATE ROLES MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to add or increment role usage in template
CREATE OR REPLACE FUNCTION add_template_role_usage(
    p_template_id UUID,
    p_role_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Skip if role_id is NULL
    IF p_role_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO template_roles (template_id, role_id, role_usage_count, last_used_at)
    VALUES (p_template_id, p_role_id, 1, NOW())
    ON CONFLICT (template_id, role_id)
    DO UPDATE SET
        role_usage_count = template_roles.role_usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to remove or decrement role usage in template
CREATE OR REPLACE FUNCTION remove_template_role_usage(
    p_template_id UUID,
    p_role_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Skip if role_id is NULL
    IF p_role_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE template_roles 
    SET 
        role_usage_count = role_usage_count - 1,
        updated_at = NOW()
    WHERE template_id = p_template_id AND role_id = p_role_id;

    -- Remove the record if usage count reaches 0
    DELETE FROM template_roles 
    WHERE template_id = p_template_id 
    AND role_id = p_role_id 
    AND role_usage_count <= 0;
END;
$$ LANGUAGE plpgsql;

-- Function to update role usage when task role changes
CREATE OR REPLACE FUNCTION update_template_role_usage(
    p_template_id UUID,
    p_old_role_id UUID,
    p_new_role_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Remove old role usage if it exists
    IF p_old_role_id IS NOT NULL THEN
        PERFORM remove_template_role_usage(p_template_id, p_old_role_id);
    END IF;

    -- Add new role usage if it exists
    IF p_new_role_id IS NOT NULL THEN
        PERFORM add_template_role_usage(p_template_id, p_new_role_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get template roles with details
CREATE OR REPLACE FUNCTION get_template_roles_with_details(p_template_id UUID)
RETURNS TABLE (
    template_role_id UUID,
    role_id UUID,
    role_name VARCHAR,
    department_name VARCHAR,
    role_usage_count INTEGER,
    first_used_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if department_roles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_roles') THEN
        RETURN QUERY
        SELECT 
            tr.template_role_id,
            tr.role_id,
            dr.role_name,
            d.department_name,
            tr.role_usage_count,
            tr.first_used_at,
            tr.last_used_at
        FROM template_roles tr
        LEFT JOIN department_roles dr ON tr.role_id = dr.role_id
        LEFT JOIN departments d ON dr.department_id = d.department_id
        WHERE tr.template_id = p_template_id
        ORDER BY tr.role_usage_count DESC, dr.role_name;
    ELSE
        -- Return basic info if department_roles doesn't exist
        RETURN QUERY
        SELECT 
            tr.template_role_id,
            tr.role_id,
            CAST('Unknown Role' AS VARCHAR) as role_name,
            CAST('Unknown Department' AS VARCHAR) as department_name,
            tr.role_usage_count,
            tr.first_used_at,
            tr.last_used_at
        FROM template_roles tr
        WHERE tr.template_id = p_template_id
        ORDER BY tr.role_usage_count DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild template roles from existing tasks (for migration/repair)
CREATE OR REPLACE FUNCTION rebuild_template_roles(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
    role_count INTEGER := 0;
    task_record RECORD;
BEGIN
    -- Clear existing template roles for this template
    DELETE FROM template_roles WHERE template_id = p_template_id;

    -- Rebuild from existing tasks
    FOR task_record IN
        SELECT 
            st.assigned_role_id,
            COUNT(*) as usage_count,
            MIN(st.created_at) as first_used,
            MAX(st.updated_at) as last_used
        FROM step_tasks st
        INNER JOIN phase_steps ps ON st.step_id = ps.step_id
        INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
        WHERE tp.template_id = p_template_id 
        AND st.assigned_role_id IS NOT NULL
        AND st.is_archived = false
        GROUP BY st.assigned_role_id
    LOOP
        INSERT INTO template_roles (
            template_id, 
            role_id, 
            role_usage_count, 
            first_used_at, 
            last_used_at
        ) VALUES (
            p_template_id,
            task_record.assigned_role_id,
            task_record.usage_count,
            task_record.first_used,
            task_record.last_used
        );
        
        role_count := role_count + 1;
    END LOOP;

    RETURN role_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. TRIGGERS FOR AUTOMATIC ROLE TRACKING
-- =====================================================

-- Function to handle task role changes
CREATE OR REPLACE FUNCTION handle_task_role_change()
RETURNS TRIGGER AS $$
DECLARE
    template_id_var UUID;
BEGIN
    -- Get template_id for the task
    SELECT tp.template_id INTO template_id_var
    FROM phase_steps ps
    INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
    WHERE ps.step_id = COALESCE(NEW.step_id, OLD.step_id);

    IF template_id_var IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Add role usage for new task
        PERFORM add_template_role_usage(template_id_var, NEW.assigned_role_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update role usage if role changed
        IF OLD.assigned_role_id IS DISTINCT FROM NEW.assigned_role_id THEN
            PERFORM update_template_role_usage(template_id_var, OLD.assigned_role_id, NEW.assigned_role_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove role usage for deleted task (only if not archived)
        IF OLD.is_archived = false THEN
            PERFORM remove_template_role_usage(template_id_var, OLD.assigned_role_id);
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for step_tasks
DROP TRIGGER IF EXISTS track_template_role_usage ON step_tasks;
CREATE TRIGGER track_template_role_usage
    AFTER INSERT OR UPDATE OR DELETE ON step_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_role_change();

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on template_roles
ALTER TABLE template_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read template_roles" ON template_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert template_roles" ON template_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update template_roles" ON template_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete template_roles" ON template_roles;

-- Template Roles policies
CREATE POLICY "Allow authenticated users to read template_roles" ON template_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert template_roles" ON template_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update template_roles" ON template_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete template_roles" ON template_roles
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 5. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE template_roles IS 'Tracks unique roles used in each template with usage counts';
COMMENT ON COLUMN template_roles.role_usage_count IS 'Number of tasks in the template assigned to this role';
COMMENT ON COLUMN template_roles.first_used_at IS 'When this role was first assigned to a task in this template';
COMMENT ON COLUMN template_roles.last_used_at IS 'When this role was last assigned or updated in this template';

COMMENT ON FUNCTION add_template_role_usage(UUID, UUID) IS 'Add or increment role usage count in a template';
COMMENT ON FUNCTION remove_template_role_usage(UUID, UUID) IS 'Remove or decrement role usage count in a template';
COMMENT ON FUNCTION update_template_role_usage(UUID, UUID, UUID) IS 'Update role usage when a task role changes';
COMMENT ON FUNCTION get_template_roles_with_details(UUID) IS 'Get all roles used in a template with department details';
COMMENT ON FUNCTION rebuild_template_roles(UUID) IS 'Rebuild template roles from existing tasks (for migration)';

-- =====================================================
-- 6. INITIAL DATA POPULATION
-- =====================================================

-- Populate template_roles for existing templates
DO $$
DECLARE
    template_record RECORD;
    roles_added INTEGER;
    total_roles INTEGER := 0;
BEGIN
    FOR template_record IN 
        SELECT template_id, template_name 
        FROM project_templates 
        WHERE is_archived = false
    LOOP
        SELECT rebuild_template_roles(template_record.template_id) INTO roles_added;
        total_roles := total_roles + roles_added;
        
        RAISE NOTICE 'Template "%" - added % unique roles', 
            template_record.template_name, roles_added;
    END LOOP;
    
    RAISE NOTICE 'Total unique template-role relationships created: %', total_roles;
END $$;

-- =====================================================
-- 7. VERIFICATION AND SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_roles') THEN
        RAISE NOTICE 'Template roles tracking system created successfully!';
    ELSE
        RAISE NOTICE 'Template roles table may not have been created properly.';
    END IF;
END $$;

-- Show template roles statistics
SELECT 
    COUNT(DISTINCT template_id) as templates_with_roles,
    COUNT(*) as total_template_role_relationships,
    COUNT(DISTINCT role_id) as unique_roles_used,
    SUM(role_usage_count) as total_role_assignments
FROM template_roles;

SELECT 'Template Roles Tracking System created successfully!' as status,
       'Includes: Role usage tracking, automatic maintenance via triggers, and utility functions' as features;
