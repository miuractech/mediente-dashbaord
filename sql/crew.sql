-- Create crew table
CREATE TABLE IF NOT EXISTS crew (
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

-- Create crew_roles junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS crew_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES department_roles(role_id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(crew_id, department_id, role_id)
);

-- Create crew_reporting table for reporting manager relationship
CREATE TABLE IF NOT EXISTS crew_reporting (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  manager_crew_id UUID NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  role_id UUID REFERENCES department_roles(role_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(crew_id, department_id),
  CHECK(crew_id != manager_crew_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crew_email ON crew(email);
CREATE INDEX IF NOT EXISTS idx_crew_user_id ON crew(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_is_archived ON crew(is_archived);
CREATE INDEX IF NOT EXISTS idx_crew_status ON crew(status);
CREATE INDEX IF NOT EXISTS idx_crew_employment_status ON crew(employment_status);
CREATE INDEX IF NOT EXISTS idx_crew_roles_crew_id ON crew_roles(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_roles_department_id ON crew_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_crew_roles_role_id ON crew_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_crew_reporting_crew_id ON crew_reporting(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_reporting_manager_id ON crew_reporting(manager_crew_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crew_updated_at 
    BEFORE UPDATE ON crew 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_reporting ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read crew" ON crew
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew" ON crew
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew" ON crew
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew" ON crew
    FOR DELETE TO authenticated USING (true);

-- Policies for crew_roles
CREATE POLICY "Allow authenticated users to read crew_roles" ON crew_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew_roles" ON crew_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew_roles" ON crew_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew_roles" ON crew_roles
    FOR DELETE TO authenticated USING (true);

-- Policies for crew_reporting
CREATE POLICY "Allow authenticated users to read crew_reporting" ON crew_reporting
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert crew_reporting" ON crew_reporting
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update crew_reporting" ON crew_reporting
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete crew_reporting" ON crew_reporting
    FOR DELETE TO authenticated USING (true);

-- Create helpful views
CREATE OR REPLACE VIEW crew_with_details AS
SELECT 
    c.*,
    array_agg(
        DISTINCT jsonb_build_object(
            'department_id', cr.department_id,
            'department_name', d.department_name,
            'role_id', cr.role_id,
            'role_name', dr.role_name,
            'is_primary', cr.is_primary
        )
    ) FILTER (WHERE cr.crew_id IS NOT NULL) as roles,
    jsonb_build_object(
        'manager_id', crep.manager_crew_id,
        'manager_name', manager.name,
        'department_id', crep.department_id,
        'role_id', crep.role_id
    ) as reporting_manager
FROM crew c
LEFT JOIN crew_roles cr ON c.id = cr.crew_id
LEFT JOIN departments d ON cr.department_id = d.department_id
LEFT JOIN department_roles dr ON cr.role_id = dr.role_id
LEFT JOIN crew_reporting crep ON c.id = crep.crew_id
LEFT JOIN crew manager ON crep.manager_crew_id = manager.id
GROUP BY c.id, crep.manager_crew_id, manager.name, crep.department_id, crep.role_id;

-- Create view for active crew only
CREATE OR REPLACE VIEW active_crew AS
SELECT * FROM crew_with_details
WHERE is_archived = false AND status = true;

-- Grant necessary permissions
GRANT ALL ON crew TO authenticated;
GRANT ALL ON crew_roles TO authenticated;
GRANT ALL ON crew_reporting TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE crew IS 'Stores crew member information for film production';
COMMENT ON TABLE crew_roles IS 'Junction table for crew member roles in departments';
COMMENT ON TABLE crew_reporting IS 'Stores reporting manager relationships for crew members';
