-- =====================================================
-- SIMPLIFIED CREW MODULE SETUP FOR SUPABASE
-- =====================================================
-- This script sets up a simplified crew management system
-- without department/role relationships (those will be project-specific)

-- =====================================================
-- 1. CREATE CREW TABLE
-- =====================================================

-- Main crew table (simplified)
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

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read crew" ON public.crew;
DROP POLICY IF EXISTS "Allow authenticated users to insert crew" ON public.crew;
DROP POLICY IF EXISTS "Allow authenticated users to update crew" ON public.crew;
DROP POLICY IF EXISTS "Allow authenticated users to delete crew" ON public.crew;

-- Crew table policies
CREATE POLICY "Allow authenticated users to read crew" ON public.crew
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew" ON public.crew
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew" ON public.crew
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew" ON public.crew
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 6. CREATE HELPFUL VIEWS
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.active_crew;
DROP VIEW IF EXISTS public.crew_with_details;

-- Simple crew view (same as table for now, but ready for future joins)
CREATE OR REPLACE VIEW public.crew_with_details AS
SELECT 
    c.*,
    ARRAY[]::jsonb[] as roles,  -- Empty array for compatibility
    NULL::jsonb as reporting_manager  -- Null for compatibility
FROM public.crew c;

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
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.crew_with_details TO authenticated;
GRANT SELECT ON public.active_crew TO authenticated;

-- =====================================================
-- 9. ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON TABLE public.crew IS 'Stores crew member information for film production (roles assigned per project)';

COMMENT ON COLUMN public.crew.id IS 'Unique identifier for the crew member';
COMMENT ON COLUMN public.crew.name IS 'Full name of the crew member';
COMMENT ON COLUMN public.crew.email IS 'Unique email address for the crew member';
COMMENT ON COLUMN public.crew.user_id IS 'Reference to auth.users table if crew member has login access';
COMMENT ON COLUMN public.crew.photo_url IS 'URL to profile picture stored in crew-photos bucket';
COMMENT ON COLUMN public.crew.is_archived IS 'Soft delete flag - archived crew members are not displayed in active lists';
COMMENT ON COLUMN public.crew.employment_status IS 'Current employment status of the crew member';
COMMENT ON COLUMN public.crew.dietary_preference IS 'Dietary restrictions for catering purposes';

COMMENT ON VIEW public.crew_with_details IS 'Crew members with compatibility fields for roles (to be assigned per project)';
COMMENT ON VIEW public.active_crew IS 'View of active (non-archived) crew members only';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify tables were created successfully
DO $$
BEGIN
    RAISE NOTICE 'Simplified crew module setup completed successfully!';
    RAISE NOTICE 'Table created: crew';
    RAISE NOTICE 'Views created: crew_with_details, active_crew';
    RAISE NOTICE 'Storage bucket created: crew-photos';
    RAISE NOTICE 'All RLS policies and permissions configured';
    RAISE NOTICE 'Note: Roles and departments will be assigned per project';
END $$;
