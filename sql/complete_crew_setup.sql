-- =====================================================
-- COMPLETE CREW MODULE SETUP FOR SUPABASE
-- =====================================================
-- This script sets up the complete crew management system
-- Run this in Supabase SQL Editor after departments and roles are set up

-- =====================================================
-- 1. CREATE CREW TABLES
-- =====================================================

-- Main crew table
CREATE TABLE IF NOT EXISTS public.crew (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  photo_url TEXT,
  
  -- Emergency contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  address TEXT,
  
  -- Personal information
  dob DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  nationality VARCHAR(100),
  religion VARCHAR(100),
  
  -- Professional information
  hire_date DATE,
  employment_status VARCHAR(20) DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave')),
  education TEXT,
  experience TEXT,
  skills TEXT,
  certifications TEXT,
  languages TEXT,
  
  -- Additional information
  interests TEXT,
  hobbies TEXT,
  achievements TEXT,
  awards TEXT,
  dietary_preference VARCHAR(20) CHECK (dietary_preference IN ('vegan', 'vegetarian', 'non-vegetarian')),
  medical_conditions TEXT,
  allergies TEXT,
  disabilities TEXT,
  other_info TEXT,
  notes TEXT,
  
  -- Status and archiving
  status BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Crew roles junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.crew_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(department_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.department_roles(role_id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(crew_id, department_id, role_id)
);

-- Crew reporting table (manager relationships)
CREATE TABLE IF NOT EXISTS public.crew_reporting (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  manager_crew_id UUID NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(department_id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.department_roles(role_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(crew_id, department_id),
  CHECK(crew_id != manager_crew_id)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_crew_email ON public.crew(email);
CREATE INDEX IF NOT EXISTS idx_crew_user_id ON public.crew(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_is_archived ON public.crew(is_archived);
CREATE INDEX IF NOT EXISTS idx_crew_status ON public.crew(status);
CREATE INDEX IF NOT EXISTS idx_crew_employment_status ON public.crew(employment_status);
CREATE INDEX IF NOT EXISTS idx_crew_name ON public.crew(name);
CREATE INDEX IF NOT EXISTS idx_crew_phone ON public.crew(phone);

CREATE INDEX IF NOT EXISTS idx_crew_roles_crew_id ON public.crew_roles(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_roles_department_id ON public.crew_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_crew_roles_role_id ON public.crew_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_crew_roles_is_primary ON public.crew_roles(is_primary);

CREATE INDEX IF NOT EXISTS idx_crew_reporting_crew_id ON public.crew_reporting(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_reporting_manager_id ON public.crew_reporting(manager_crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_reporting_department ON public.crew_reporting(department_id);

-- =====================================================
-- 3. CREATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Create or replace the update timestamp function (if not exists from other modules)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for crew table
DROP TRIGGER IF EXISTS update_crew_updated_at ON public.crew;
CREATE TRIGGER update_crew_updated_at 
    BEFORE UPDATE ON public.crew 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_reporting ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read crew" ON public.crew;
DROP POLICY IF EXISTS "Allow authenticated users to insert crew" ON public.crew;
DROP POLICY IF EXISTS "Allow authenticated users to update crew" ON public.crew;
DROP POLICY IF EXISTS "Allow authenticated users to delete crew" ON public.crew;

DROP POLICY IF EXISTS "Allow authenticated users to read crew_roles" ON public.crew_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert crew_roles" ON public.crew_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update crew_roles" ON public.crew_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete crew_roles" ON public.crew_roles;

DROP POLICY IF EXISTS "Allow authenticated users to read crew_reporting" ON public.crew_reporting;
DROP POLICY IF EXISTS "Allow authenticated users to insert crew_reporting" ON public.crew_reporting;
DROP POLICY IF EXISTS "Allow authenticated users to update crew_reporting" ON public.crew_reporting;
DROP POLICY IF EXISTS "Allow authenticated users to delete crew_reporting" ON public.crew_reporting;

-- Crew table policies
CREATE POLICY "Allow authenticated users to read crew" ON public.crew
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew" ON public.crew
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew" ON public.crew
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew" ON public.crew
    FOR DELETE TO authenticated USING (true);

-- Crew roles policies
CREATE POLICY "Allow authenticated users to read crew_roles" ON public.crew_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew_roles" ON public.crew_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew_roles" ON public.crew_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew_roles" ON public.crew_roles
    FOR DELETE TO authenticated USING (true);

-- Crew reporting policies
CREATE POLICY "Allow authenticated users to read crew_reporting" ON public.crew_reporting
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew_reporting" ON public.crew_reporting
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew_reporting" ON public.crew_reporting
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew_reporting" ON public.crew_reporting
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 6. CREATE HELPFUL VIEWS
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.active_crew;
DROP VIEW IF EXISTS public.crew_with_details;

-- Comprehensive crew view with all related data
CREATE OR REPLACE VIEW public.crew_with_details AS
SELECT 
    c.*,
    COALESCE(
        array_agg(
            DISTINCT jsonb_build_object(
                'department_id', cr.department_id,
                'department_name', d.department_name,
                'role_id', cr.role_id,
                'role_name', dr.role_name,
                'is_primary', cr.is_primary
            )
        ) FILTER (WHERE cr.crew_id IS NOT NULL), 
        ARRAY[]::jsonb[]
    ) as roles,
    CASE 
        WHEN crep.manager_crew_id IS NOT NULL THEN
            jsonb_build_object(
                'manager_id', crep.manager_crew_id,
                'manager_name', manager.name,
                'department_id', crep.department_id,
                'role_id', crep.role_id
            )
        ELSE NULL
    END as reporting_manager
FROM public.crew c
LEFT JOIN public.crew_roles cr ON c.id = cr.crew_id
LEFT JOIN public.departments d ON cr.department_id = d.department_id
LEFT JOIN public.department_roles dr ON cr.role_id = dr.role_id
LEFT JOIN public.crew_reporting crep ON c.id = crep.crew_id
LEFT JOIN public.crew manager ON crep.manager_crew_id = manager.id
GROUP BY c.id, crep.manager_crew_id, manager.name, crep.department_id, crep.role_id;

-- View for active crew only
CREATE OR REPLACE VIEW public.active_crew AS
SELECT * FROM public.crew_with_details
WHERE is_archived = false AND status = true;

-- =====================================================
-- 7. SETUP STORAGE BUCKET FOR PROFILE PHOTOS
-- =====================================================

-- Create storage bucket for crew profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'crew-photos', 
    'crew-photos', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload crew photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view crew photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update crew photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete crew photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view crew photos" ON storage.objects;

-- Create storage policies for crew photos
CREATE POLICY "Allow authenticated users to upload crew photos" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'crew-photos');

CREATE POLICY "Allow authenticated users to update crew photos" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (bucket_id = 'crew-photos')
    WITH CHECK (bucket_id = 'crew-photos');

CREATE POLICY "Allow authenticated users to delete crew photos" ON storage.objects
    FOR DELETE TO authenticated 
    USING (bucket_id = 'crew-photos');

-- Allow public access to view crew photos (for displaying profile pictures)
CREATE POLICY "Allow public to view crew photos" ON storage.objects
    FOR SELECT TO public 
    USING (bucket_id = 'crew-photos');

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.crew TO authenticated;
GRANT ALL ON public.crew_roles TO authenticated;
GRANT ALL ON public.crew_reporting TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.crew_with_details TO authenticated;
GRANT SELECT ON public.active_crew TO authenticated;

-- =====================================================
-- 9. ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON TABLE public.crew IS 'Stores comprehensive crew member information for film production';
COMMENT ON TABLE public.crew_roles IS 'Junction table for crew member roles in departments (many-to-many)';
COMMENT ON TABLE public.crew_reporting IS 'Stores reporting manager relationships for crew members';

COMMENT ON COLUMN public.crew.id IS 'Unique identifier for the crew member';
COMMENT ON COLUMN public.crew.name IS 'Full name of the crew member';
COMMENT ON COLUMN public.crew.email IS 'Unique email address for the crew member';
COMMENT ON COLUMN public.crew.user_id IS 'Reference to auth.users table if crew member has login access';
COMMENT ON COLUMN public.crew.photo_url IS 'URL to profile picture stored in crew-photos bucket';
COMMENT ON COLUMN public.crew.is_archived IS 'Soft delete flag - archived crew members are not displayed in active lists';
COMMENT ON COLUMN public.crew.employment_status IS 'Current employment status of the crew member';
COMMENT ON COLUMN public.crew.dietary_preference IS 'Dietary restrictions for catering purposes';

COMMENT ON VIEW public.crew_with_details IS 'Comprehensive view of crew members with their roles and reporting relationships';
COMMENT ON VIEW public.active_crew IS 'View of active (non-archived) crew members only';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify tables were created successfully
DO $$
BEGIN
    RAISE NOTICE 'Crew module setup completed successfully!';
    RAISE NOTICE 'Tables created: crew, crew_roles, crew_reporting';
    RAISE NOTICE 'Views created: crew_with_details, active_crew';
    RAISE NOTICE 'Storage bucket created: crew-photos';
    RAISE NOTICE 'All RLS policies and permissions configured';
END $$;
