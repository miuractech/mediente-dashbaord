CREATE TABLE IF NOT EXISTS public.call_sheets (
  id uuid not null default gen_random_uuid (),
  project_name text not null,
  date date not null,
  time time without time zone not null,
  description text null,
  status text not null default 'draft'::text,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint call_sheets_pkey primary key (id),
  constraint call_sheets_created_by_fkey foreign KEY (created_by) references crew (id),
  constraint call_sheets_status_check check (
    (
      status = any (
        array[
          'draft'::text,
          'active'::text,
          'upcoming'::text,
          'expired'::text,
          'archived'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_sheets_date ON public.call_sheets USING btree (date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_sheets_status ON public.call_sheets USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_sheets_project_name ON public.call_sheets USING btree (project_name) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_sheets_created_by ON public.call_sheets USING btree (created_by) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_call_sheets_updated_at ON call_sheets;
CREATE TRIGGER update_call_sheets_updated_at BEFORE
UPDATE ON call_sheets FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE IF NOT EXISTS public.call_sheet_time_table (
  id uuid not null default gen_random_uuid (),
  call_sheet_id uuid not null,
  item text not null,
  time time without time zone not null,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint call_sheet_time_table_pkey primary key (id),
  constraint call_sheet_time_table_call_sheet_id_fkey foreign KEY (call_sheet_id) references call_sheets (id) on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_time_table_call_sheet_id ON public.call_sheet_time_table USING btree (call_sheet_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_time_table_sort_order ON public.call_sheet_time_table USING btree (call_sheet_id, sort_order) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_time_table_updated_at ON call_sheet_time_table;
CREATE TRIGGER update_time_table_updated_at BEFORE
UPDATE ON call_sheet_time_table FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE IF NOT EXISTS public.call_sheet_schedule (
  id uuid not null default gen_random_uuid (),
  call_sheet_id uuid not null,
  time time without time zone not null,
  scene text not null,
  description text not null,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint call_sheet_schedule_pkey primary key (id),
  constraint call_sheet_schedule_call_sheet_id_fkey foreign KEY (call_sheet_id) references call_sheets (id) on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_schedule_call_sheet_id ON public.call_sheet_schedule USING btree (call_sheet_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_schedule_sort_order ON public.call_sheet_schedule USING btree (call_sheet_id, sort_order) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_schedule_time ON public.call_sheet_schedule USING btree (call_sheet_id, "time") TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_schedule_updated_at ON call_sheet_schedule;
CREATE TRIGGER update_schedule_updated_at BEFORE
UPDATE ON call_sheet_schedule FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE IF NOT EXISTS public.call_sheet_locations (
  id uuid not null default gen_random_uuid (),
  call_sheet_id uuid not null,
  location_title text not null,
  address text not null,
  link text null,
  contact_number text not null,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint call_sheet_locations_pkey primary key (id),
  constraint call_sheet_locations_call_sheet_id_fkey foreign KEY (call_sheet_id) references call_sheets (id) on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_locations_call_sheet_id ON public.call_sheet_locations USING btree (call_sheet_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_locations_sort_order ON public.call_sheet_locations USING btree (call_sheet_id, sort_order) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_locations_updated_at ON call_sheet_locations;
CREATE TRIGGER update_locations_updated_at BEFORE
UPDATE ON call_sheet_locations FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

-- Junction table for call sheet crew assignments (many-to-many)
CREATE TABLE IF NOT EXISTS public.call_sheet_crew (
  id uuid not null default gen_random_uuid (),
  call_sheet_id uuid not null,
  crew_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint call_sheet_crew_pkey primary key (id),
  constraint call_sheet_crew_call_sheet_id_fkey foreign KEY (call_sheet_id) references call_sheets (id) on delete CASCADE,
  constraint call_sheet_crew_crew_id_fkey foreign KEY (crew_id) references crew (id) on delete CASCADE,
  constraint call_sheet_crew_unique unique (call_sheet_id, crew_id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_sheet_crew_call_sheet_id ON public.call_sheet_crew USING btree (call_sheet_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_sheet_crew_crew_id ON public.call_sheet_crew USING btree (crew_id) TABLESPACE pg_default;

-- Handle foreign key constraint updates for existing tables
DO $$
BEGIN
    -- Remove call_to column if it exists (migration from old schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_sheets' 
        AND column_name = 'call_to'
        AND table_schema = 'public'
    ) THEN
        -- Drop the view first if it exists (it depends on call_to column)
        DROP VIEW IF EXISTS call_sheets_complete;
        
        -- Now we can safely drop the column
        ALTER TABLE public.call_sheets DROP COLUMN call_to;
    END IF;

    -- Update call_sheets foreign key if it exists and references admin_users
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'call_sheets_created_by_fkey' 
        AND table_name = 'call_sheets'
    ) THEN
        ALTER TABLE call_sheets DROP CONSTRAINT IF EXISTS call_sheets_created_by_fkey;
    END IF;
    
    -- Add the new foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'call_sheets_created_by_fkey' 
        AND table_name = 'call_sheets'
    ) THEN
        ALTER TABLE call_sheets ADD CONSTRAINT call_sheets_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES crew (id);
    END IF;
END $$;

-- Enable RLS for all call sheet tables
DO $$
BEGIN
    -- Enable RLS for call_sheets if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'call_sheets' AND rowsecurity = true
    ) THEN
        ALTER TABLE call_sheets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS for other tables
    ALTER TABLE call_sheet_time_table ENABLE ROW LEVEL SECURITY;
    ALTER TABLE call_sheet_schedule ENABLE ROW LEVEL SECURITY;
    ALTER TABLE call_sheet_locations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE call_sheet_crew ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read call_sheets" ON call_sheets;
DROP POLICY IF EXISTS "Allow authenticated users to insert call_sheets" ON call_sheets;
DROP POLICY IF EXISTS "Allow authenticated users to update call_sheets" ON call_sheets;
DROP POLICY IF EXISTS "Allow authenticated users to delete call_sheets" ON call_sheets;

CREATE POLICY "Allow authenticated users to read call_sheets" ON call_sheets
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert call_sheets" ON call_sheets
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update call_sheets" ON call_sheets
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete call_sheets" ON call_sheets
    FOR DELETE TO authenticated USING (true);

-- Policies for call_sheet_crew
DROP POLICY IF EXISTS "Allow authenticated users to read call_sheet_crew" ON call_sheet_crew;
DROP POLICY IF EXISTS "Allow authenticated users to insert call_sheet_crew" ON call_sheet_crew;
DROP POLICY IF EXISTS "Allow authenticated users to update call_sheet_crew" ON call_sheet_crew;
DROP POLICY IF EXISTS "Allow authenticated users to delete call_sheet_crew" ON call_sheet_crew;

CREATE POLICY "Allow authenticated users to read call_sheet_crew" ON call_sheet_crew
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert call_sheet_crew" ON call_sheet_crew
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update call_sheet_crew" ON call_sheet_crew
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete call_sheet_crew" ON call_sheet_crew
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON call_sheets TO authenticated;
GRANT ALL ON call_sheet_time_table TO authenticated;
GRANT ALL ON call_sheet_schedule TO authenticated;
GRANT ALL ON call_sheet_locations TO authenticated;
GRANT ALL ON call_sheet_crew TO authenticated;

-- Create policies for other tables
DROP POLICY IF EXISTS "Allow authenticated users to read call_sheet_time_table" ON call_sheet_time_table;
DROP POLICY IF EXISTS "Allow authenticated users to insert call_sheet_time_table" ON call_sheet_time_table;
DROP POLICY IF EXISTS "Allow authenticated users to update call_sheet_time_table" ON call_sheet_time_table;
DROP POLICY IF EXISTS "Allow authenticated users to delete call_sheet_time_table" ON call_sheet_time_table;

CREATE POLICY "Allow authenticated users to read call_sheet_time_table" ON call_sheet_time_table
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert call_sheet_time_table" ON call_sheet_time_table
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update call_sheet_time_table" ON call_sheet_time_table
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete call_sheet_time_table" ON call_sheet_time_table
    FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read call_sheet_schedule" ON call_sheet_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to insert call_sheet_schedule" ON call_sheet_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to update call_sheet_schedule" ON call_sheet_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to delete call_sheet_schedule" ON call_sheet_schedule;

CREATE POLICY "Allow authenticated users to read call_sheet_schedule" ON call_sheet_schedule
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert call_sheet_schedule" ON call_sheet_schedule
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update call_sheet_schedule" ON call_sheet_schedule
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete call_sheet_schedule" ON call_sheet_schedule
    FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read call_sheet_locations" ON call_sheet_locations;
DROP POLICY IF EXISTS "Allow authenticated users to insert call_sheet_locations" ON call_sheet_locations;
DROP POLICY IF EXISTS "Allow authenticated users to update call_sheet_locations" ON call_sheet_locations;
DROP POLICY IF EXISTS "Allow authenticated users to delete call_sheet_locations" ON call_sheet_locations;

CREATE POLICY "Allow authenticated users to read call_sheet_locations" ON call_sheet_locations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert call_sheet_locations" ON call_sheet_locations
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update call_sheet_locations" ON call_sheet_locations
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete call_sheet_locations" ON call_sheet_locations
    FOR DELETE TO authenticated USING (true);

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the call_sheets_complete view for joining all related data
DROP VIEW IF EXISTS call_sheets_complete;
CREATE VIEW call_sheets_complete AS
SELECT 
    cs.*,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', tt.id,
                'call_sheet_id', tt.call_sheet_id,
                'item', tt.item,
                'time', tt.time,
                'sort_order', tt.sort_order,
                'created_at', tt.created_at,
                'updated_at', tt.updated_at
            )
        ) FILTER (WHERE tt.id IS NOT NULL), 
        '[]'::json
    ) AS time_table,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', loc.id,
                'call_sheet_id', loc.call_sheet_id,
                'location_title', loc.location_title,
                'address', loc.address,
                'link', loc.link,
                'contact_number', loc.contact_number,
                'sort_order', loc.sort_order,
                'created_at', loc.created_at,
                'updated_at', loc.updated_at
            )
        ) FILTER (WHERE loc.id IS NOT NULL), 
        '[]'::json
    ) AS locations,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', sch.id,
                'call_sheet_id', sch.call_sheet_id,
                'time', sch.time,
                'scene', sch.scene,
                'description', sch.description,
                'sort_order', sch.sort_order,
                'created_at', sch.created_at,
                'updated_at', sch.updated_at
            )
        ) FILTER (WHERE sch.id IS NOT NULL), 
        '[]'::json
    ) AS schedule,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', crew_rel.id,
                'call_sheet_id', crew_rel.call_sheet_id,
                'crew_id', crew_rel.crew_id,
                'created_at', crew_rel.created_at
            )
        ) FILTER (WHERE crew_rel.id IS NOT NULL), 
        '[]'::json
    ) AS crew
FROM call_sheets cs
LEFT JOIN call_sheet_time_table tt ON cs.id = tt.call_sheet_id
LEFT JOIN call_sheet_locations loc ON cs.id = loc.call_sheet_id
LEFT JOIN call_sheet_schedule sch ON cs.id = sch.call_sheet_id
LEFT JOIN call_sheet_crew crew_rel ON cs.id = crew_rel.call_sheet_id
GROUP BY cs.id, cs.project_name, cs.date, cs.time, cs.description, cs.status, cs.created_by, cs.created_at, cs.updated_at;

-- Grant permissions on the view
GRANT SELECT ON call_sheets_complete TO authenticated;

-- Create RLS policy for the view (inherits from base tables)
ALTER VIEW call_sheets_complete OWNER TO postgres;