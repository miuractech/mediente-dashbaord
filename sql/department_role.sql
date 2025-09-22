-- Consolidated Department Roles Table
-- This file combines all department_roles schema definitions and migrations
-- Run this after setting up the departments table

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing table and dependencies if they exist (use with caution in production)
-- DROP TRIGGER IF EXISTS check_circular_reporting_trigger ON department_roles;
-- DROP TRIGGER IF EXISTS update_department_roles_updated_at ON department_roles;
-- DROP TABLE IF EXISTS department_roles CASCADE;

-- Create department_roles table
CREATE TABLE IF NOT EXISTS public.department_roles (
  role_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name VARCHAR(150) NOT NULL,
  description TEXT CHECK (char_length(description) <= 500),
  department_id UUID NOT NULL REFERENCES public.departments(department_id) ON DELETE CASCADE,
  reports_to UUID REFERENCES public.department_roles(role_id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Additional constraints
  CONSTRAINT department_roles_role_name_unique UNIQUE (department_id, role_name, is_archived),
  CONSTRAINT department_roles_created_by_check CHECK (char_length(created_by) > 0),
  CONSTRAINT department_roles_role_name_check CHECK (char_length(role_name) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_department_roles_department_id ON public.department_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_department_roles_reports_to ON public.department_roles(reports_to);
CREATE INDEX IF NOT EXISTS idx_department_roles_is_archived ON public.department_roles(is_archived);
CREATE INDEX IF NOT EXISTS idx_department_roles_name ON public.department_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_department_roles_dept_active ON public.department_roles(department_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_department_roles_hierarchy ON public.department_roles(reports_to, department_id) WHERE reports_to IS NOT NULL;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_department_roles_updated_at ON public.department_roles;
CREATE TRIGGER update_department_roles_updated_at 
    BEFORE UPDATE ON public.department_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create or replace function to check circular reporting relationships
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
    current_role_id UUID;
    max_depth INTEGER := 10;
    depth INTEGER := 0;
BEGIN
    -- Only check if reports_to is being set
    IF NEW.reports_to IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if role is trying to report to itself
    IF NEW.role_id = NEW.reports_to THEN
        RAISE EXCEPTION 'Role cannot report to itself';
    END IF;
    
    -- Check if the reporting role exists and is in the same department
    IF NOT EXISTS (
        SELECT 1 FROM public.department_roles 
        WHERE role_id = NEW.reports_to 
        AND department_id = NEW.department_id
        AND is_archived = false
    ) THEN
        RAISE EXCEPTION 'Cannot report to a role that does not exist, is archived, or is in a different department';
    END IF;
    
    -- Check for circular reporting chain
    current_role_id := NEW.reports_to;
    WHILE current_role_id IS NOT NULL AND depth < max_depth LOOP
        -- If we find our role in the chain, it's circular
        IF current_role_id = NEW.role_id THEN
            RAISE EXCEPTION 'Circular reporting relationship detected';
        END IF;
        
        -- Move up the chain
        SELECT reports_to INTO current_role_id 
        FROM public.department_roles 
        WHERE role_id = current_role_id;
        
        depth := depth + 1;
    END LOOP;
    
    -- Check if we hit max depth (potential infinite loop)
    IF depth >= max_depth THEN
        RAISE EXCEPTION 'Reporting chain too deep - possible circular reference';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_circular_reporting_trigger ON public.department_roles;

-- Create trigger to prevent circular reporting relationships
CREATE TRIGGER check_circular_reporting_trigger
    BEFORE INSERT OR UPDATE ON public.department_roles
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_reporting();

-- Enable Row Level Security (RLS)
ALTER TABLE public.department_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read department_roles" ON public.department_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert department_roles" ON public.department_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update department_roles" ON public.department_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete department_roles" ON public.department_roles;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read department_roles" ON public.department_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert department_roles" ON public.department_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update department_roles" ON public.department_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete department_roles" ON public.department_roles
    FOR DELETE TO authenticated USING (true);

-- Grant necessary permissions
GRANT ALL ON public.department_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create helpful views for common queries
CREATE OR REPLACE VIEW department_roles_with_hierarchy AS
SELECT 
    dr.role_id,
    dr.role_name,
    dr.description,
    dr.department_id,
    d.department_name,
    dr.reports_to,
    parent.role_name as reports_to_name,
    dr.is_archived,
    dr.created_by,
    dr.updated_by,
    dr.created_at,
    dr.updated_at,
    -- Calculate hierarchy level (0 = top level)
    CASE 
        WHEN dr.reports_to IS NULL THEN 0
        ELSE 1
    END as hierarchy_level
FROM public.department_roles dr
LEFT JOIN public.departments d ON dr.department_id = d.department_id
LEFT JOIN public.department_roles parent ON dr.reports_to = parent.role_id;

-- Create view for active roles only
CREATE OR REPLACE VIEW active_department_roles AS
SELECT * FROM department_roles_with_hierarchy
WHERE is_archived = false;

-- Add comments for documentation
COMMENT ON TABLE public.department_roles IS 'Stores hierarchical roles within departments for film production';
COMMENT ON COLUMN public.department_roles.role_id IS 'Unique identifier for the role';
COMMENT ON COLUMN public.department_roles.role_name IS 'Name of the role (e.g., Director of Photography)';
COMMENT ON COLUMN public.department_roles.description IS 'Detailed description of role responsibilities';
COMMENT ON COLUMN public.department_roles.department_id IS 'References the department this role belongs to';
COMMENT ON COLUMN public.department_roles.reports_to IS 'Self-referencing foreign key for hierarchical reporting structure';
COMMENT ON COLUMN public.department_roles.is_archived IS 'Soft delete flag - archived roles are not displayed in active lists';
COMMENT ON COLUMN public.department_roles.created_by IS 'Email or identifier of user who created this role';
COMMENT ON COLUMN public.department_roles.updated_by IS 'Email or identifier of user who last updated this role';
