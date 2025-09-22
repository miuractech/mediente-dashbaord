-- Create departments table
CREATE TABLE departments (
  department_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name VARCHAR(150) NOT NULL,
  description TEXT CHECK (char_length(description) <= 500),
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for performance on common queries
CREATE INDEX idx_departments_is_archived ON departments(is_archived);
CREATE INDEX idx_departments_name ON departments(department_name);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON departments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read departments" ON departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert departments" ON departments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update departments" ON departments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete departments" ON departments
    FOR DELETE TO authenticated USING (true);

