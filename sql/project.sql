-- =====================================================
-- PROJECT MODULE SCHEMA
-- =====================================================
-- This script creates the complete project management system with
-- progressive task loading, crew assignment, and role-based access

-- =====================================================
-- 1. ENUMS AND TYPES
-- =====================================================

-- Project status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status_type') THEN
        CREATE TYPE project_status_type AS ENUM ('active', 'completed', 'archived');
        RAISE NOTICE 'Created project_status_type enum';
    END IF;
END $$;

-- Task status enum  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_type') THEN
        CREATE TYPE task_status_type AS ENUM ('pending', 'ongoing', 'completed', 'escalated');
        RAISE NOTICE 'Created task_status_type enum';
    END IF;
END $$;

-- =====================================================
-- 2. PROJECTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS projects (
  project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name VARCHAR(200) NOT NULL,
  project_description TEXT CHECK (char_length(project_description) <= 2000),
  image_url TEXT,
  project_status project_status_type DEFAULT 'active' NOT NULL,
  project_start_date DATE,
  project_end_date DATE,
  template_id UUID NOT NULL REFERENCES project_templates(template_id) ON DELETE RESTRICT,
  template_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_phase_id UUID,
  current_step_id UUID,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CHECK (project_end_date IS NULL OR project_end_date >= project_start_date)
);

-- Create indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(project_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id);
CREATE INDEX IF NOT EXISTS idx_projects_current_phase ON projects(current_phase_id);
CREATE INDEX IF NOT EXISTS idx_projects_current_step ON projects(current_step_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(project_start_date);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING gin(to_tsvector('english', project_name || ' ' || COALESCE(project_description, '')));
-- JSONB index for template snapshot
CREATE INDEX IF NOT EXISTS idx_projects_template_snapshot ON projects USING GIN (template_snapshot);

-- Create trigger for projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. PROJECT ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS project_roles (
  project_role_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES department_roles(role_id) ON DELETE CASCADE,
  role_name VARCHAR(200) NOT NULL, -- Cached for performance
  department_name VARCHAR(200) NOT NULL, -- Cached for performance
  is_filled BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(project_id, role_id)
);

-- Create indexes for project_roles
CREATE INDEX IF NOT EXISTS idx_project_roles_project_id ON project_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_roles_role_id ON project_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_project_roles_is_filled ON project_roles(is_filled);

-- Create trigger for project_roles
DROP TRIGGER IF EXISTS update_project_roles_updated_at ON project_roles;
CREATE TRIGGER update_project_roles_updated_at 
    BEFORE UPDATE ON project_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. PROJECT CREW ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS project_crew_assignments (
  assignment_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  project_role_id UUID NOT NULL REFERENCES project_roles(project_role_id) ON DELETE CASCADE,
  crew_id UUID NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  assigned_by VARCHAR(255) NOT NULL,
  
  UNIQUE(project_id, project_role_id, crew_id)
);

-- Create indexes for project_crew_assignments
CREATE INDEX IF NOT EXISTS idx_project_crew_project_id ON project_crew_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_crew_role_id ON project_crew_assignments(project_role_id);
CREATE INDEX IF NOT EXISTS idx_project_crew_crew_id ON project_crew_assignments(crew_id);
CREATE INDEX IF NOT EXISTS idx_project_crew_assigned_at ON project_crew_assignments(assigned_at);

-- =====================================================
-- 5. PROJECT TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS project_tasks (
  project_task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  template_task_id UUID, -- Reference to original template task
  task_name VARCHAR(200) NOT NULL,
  task_description TEXT CHECK (char_length(task_description) <= 1000),
  phase_name VARCHAR(200) NOT NULL,
  phase_order INTEGER NOT NULL,
  step_name VARCHAR(200) NOT NULL,
  step_order INTEGER NOT NULL,
  task_order INTEGER NOT NULL,
  estimated_hours INTEGER CHECK (estimated_hours >= 0),
  actual_hours INTEGER DEFAULT 0 CHECK (actual_hours >= 0),
  parent_task_id UUID REFERENCES project_tasks(project_task_id) ON DELETE CASCADE,
  task_status task_status_type DEFAULT 'pending' NOT NULL,
  category task_category_type,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  escalation_reason TEXT,
  escalated_at TIMESTAMP WITH TIME ZONE,
  is_manually_escalated BOOLEAN DEFAULT FALSE NOT NULL,
  file_attachments JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,
  is_loaded BOOLEAN DEFAULT FALSE NOT NULL, -- For progressive loading
  is_custom BOOLEAN DEFAULT FALSE NOT NULL, -- User-added tasks
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT project_tasks_checklist_items_is_array CHECK (jsonb_typeof(checklist_items) = 'array'),
  CONSTRAINT project_tasks_file_attachments_is_array CHECK (jsonb_typeof(file_attachments) = 'array'),
  CONSTRAINT project_tasks_comments_is_array CHECK (jsonb_typeof(comments) = 'array'),
  CHECK (completed_at IS NULL OR started_at IS NOT NULL),
  CHECK (escalated_at IS NULL OR task_status = 'escalated')
);

-- Create indexes for project_tasks
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_template_task_id ON project_tasks(template_task_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent_task_id ON project_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_phase_step ON project_tasks(project_id, phase_order, step_order);
CREATE INDEX IF NOT EXISTS idx_project_tasks_is_loaded ON project_tasks(is_loaded);
CREATE INDEX IF NOT EXISTS idx_project_tasks_is_custom ON project_tasks(is_custom);
CREATE INDEX IF NOT EXISTS idx_project_tasks_deadline ON project_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_project_tasks_category ON project_tasks(category);
CREATE INDEX IF NOT EXISTS idx_project_tasks_archived ON project_tasks(is_archived);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_project_tasks_search ON project_tasks USING gin(to_tsvector('english', task_name || ' ' || COALESCE(task_description, '')));
-- JSONB indexes
CREATE INDEX IF NOT EXISTS idx_project_tasks_checklist_items ON project_tasks USING GIN (checklist_items);
CREATE INDEX IF NOT EXISTS idx_project_tasks_file_attachments ON project_tasks USING GIN (file_attachments);
CREATE INDEX IF NOT EXISTS idx_project_tasks_comments ON project_tasks USING GIN (comments);

-- Create trigger for project_tasks
DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER update_project_tasks_updated_at 
    BEFORE UPDATE ON project_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. PROJECT TASK ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS project_task_assignments (
  assignment_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_task_id UUID NOT NULL REFERENCES project_tasks(project_task_id) ON DELETE CASCADE,
  project_role_id UUID NOT NULL REFERENCES project_roles(project_role_id) ON DELETE CASCADE,
  crew_id UUID NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  assigned_by VARCHAR(255) NOT NULL,
  
  UNIQUE(project_task_id, project_role_id, crew_id)
);

-- Create indexes for project_task_assignments
CREATE INDEX IF NOT EXISTS idx_project_task_assignments_task_id ON project_task_assignments(project_task_id);
CREATE INDEX IF NOT EXISTS idx_project_task_assignments_role_id ON project_task_assignments(project_role_id);
CREATE INDEX IF NOT EXISTS idx_project_task_assignments_crew_id ON project_task_assignments(crew_id);

-- =====================================================
-- 7. PROJECT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create project from template
CREATE OR REPLACE FUNCTION create_project_from_template(
    p_project_name VARCHAR,
    p_description TEXT,
    p_image_url TEXT,
    p_start_date DATE,
    p_template_id UUID,
    p_created_by VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_project_id UUID;
    template_data JSONB;
    role_record RECORD;
    phase_record RECORD;
    step_record RECORD;
    task_record RECORD;
    phases_array JSONB := '[]'::jsonb;
    steps_array JSONB;
    tasks_array JSONB;
    phase_obj JSONB;
    step_obj JSONB;
BEGIN
    -- Get template basic info
    SELECT to_jsonb(pt.*) INTO template_data
    FROM project_templates pt
    WHERE pt.template_id = p_template_id AND pt.is_archived = false;

    IF template_data IS NULL THEN
        RAISE EXCEPTION 'Template not found or is archived';
    END IF;

    -- Build phases array
    FOR phase_record IN
        SELECT * FROM template_phases tp
        WHERE tp.template_id = p_template_id AND tp.is_archived = false
        ORDER BY tp.phase_order
    LOOP
        steps_array := '[]'::jsonb;
        
        -- Build steps array for this phase
        FOR step_record IN
            SELECT * FROM phase_steps ps
            WHERE ps.phase_id = phase_record.phase_id AND ps.is_archived = false
            ORDER BY ps.step_order
        LOOP
            tasks_array := '[]'::jsonb;
            
            -- Build tasks array for this step
            FOR task_record IN
                SELECT * FROM step_tasks st
                WHERE st.step_id = step_record.step_id AND st.is_archived = false
                ORDER BY st.task_order
            LOOP
                tasks_array := tasks_array || to_jsonb(task_record);
            END LOOP;
            
            step_obj := jsonb_build_object(
                'step', to_jsonb(step_record),
                'tasks', tasks_array
            );
            steps_array := steps_array || step_obj;
        END LOOP;
        
        phase_obj := jsonb_build_object(
            'phase', to_jsonb(phase_record),
            'steps', steps_array
        );
        phases_array := phases_array || phase_obj;
    END LOOP;

    -- Combine template data with phases
    template_data := jsonb_build_object(
        'template', template_data,
        'phases', phases_array
    );

    -- Create project
    INSERT INTO projects (
        project_name, project_description, image_url, project_start_date,
        template_id, template_snapshot, created_by
    ) VALUES (
        p_project_name, p_description, p_image_url, p_start_date,
        p_template_id, template_data, p_created_by
    ) RETURNING project_id INTO new_project_id;

    -- Create project roles from template roles
    FOR role_record IN
        SELECT DISTINCT tr.role_id, dr.role_name, d.department_name
        FROM template_roles tr
        JOIN department_roles dr ON tr.role_id = dr.role_id
        JOIN departments d ON dr.department_id = d.department_id
        WHERE tr.template_id = p_template_id
    LOOP
        INSERT INTO project_roles (project_id, role_id, role_name, department_name)
        VALUES (new_project_id, role_record.role_id, role_record.role_name, role_record.department_name);
    END LOOP;

    RETURN new_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to load next step tasks with empty step skipping
CREATE OR REPLACE FUNCTION load_next_step_tasks(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
    phase_data JSONB;
    step_data JSONB;
    task_data JSONB;
    next_phase_order INTEGER;
    next_step_order INTEGER;
    current_phase_order INTEGER;
    current_step_order INTEGER;
    tasks_loaded INTEGER := 0;
    parent_task_id UUID;
    template_parent_id UUID;
BEGIN
    -- Get current project state
    SELECT current_phase_id, current_step_id, template_snapshot INTO project_record
    FROM projects WHERE project_id = p_project_id;

    IF project_record.template_snapshot IS NULL THEN
        RAISE NOTICE 'No template snapshot found for project %', p_project_id;
        RETURN FALSE;
    END IF;

    -- Check if there are any loaded tasks
    SELECT phase_order, step_order INTO current_phase_order, current_step_order
    FROM project_tasks 
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    ORDER BY phase_order DESC, step_order DESC 
    LIMIT 1;

    -- If no loaded tasks, start with first phase, first step
    IF current_phase_order IS NULL OR current_step_order IS NULL THEN
        RAISE NOTICE 'No loaded tasks found, starting with phase 1, step 1 for project %', p_project_id;
        next_phase_order := 1;
        next_step_order := 1;
    ELSE
        RAISE NOTICE 'Current loaded step: phase %, step % for project %', current_phase_order, current_step_order, p_project_id;
        -- Check if all tasks in current step are completed
        IF EXISTS (
            SELECT 1 FROM project_tasks 
            WHERE project_id = p_project_id 
            AND phase_order = current_phase_order 
            AND step_order = current_step_order 
            AND task_status != 'completed'
            AND is_loaded = true
        ) THEN
            RAISE NOTICE 'Current step not completed yet for project %', p_project_id;
            RETURN FALSE; -- Current step not completed yet
        END IF;

        -- Find next step (could be empty, we'll handle that)
        SELECT phase_order, step_order INTO next_phase_order, next_step_order
        FROM (
            SELECT 
                (phase->'phase'->>'phase_order')::INTEGER as phase_order,
                (step->'step'->>'step_order')::INTEGER as step_order
            FROM jsonb_array_elements(project_record.template_snapshot->'phases') as phase,
                 jsonb_array_elements(phase->'steps') as step
            WHERE (phase->'phase'->>'phase_order')::INTEGER > current_phase_order
               OR ((phase->'phase'->>'phase_order')::INTEGER = current_phase_order 
                   AND (step->'step'->>'step_order')::INTEGER > current_step_order)
            ORDER BY phase_order, step_order
            LIMIT 1
        ) next_step;

        IF next_phase_order IS NULL THEN
            -- Project completed
            RAISE NOTICE 'Project completed, no more steps to load for project %', p_project_id;
            UPDATE projects 
            SET project_status = 'completed', updated_at = NOW()
            WHERE project_id = p_project_id;
            RETURN FALSE;
        END IF;
        
        RAISE NOTICE 'Loading next step: phase %, step % for project %', next_phase_order, next_step_order, p_project_id;
    END IF;

    -- Load tasks for the next step (with empty step handling)
    <<step_loop>>
    LOOP
        tasks_loaded := 0;
        
        FOR phase_data IN 
            SELECT value as phase FROM jsonb_array_elements(project_record.template_snapshot->'phases')
            WHERE (value->'phase'->>'phase_order')::INTEGER = next_phase_order
        LOOP
            FOR step_data IN 
                SELECT value as step FROM jsonb_array_elements(phase_data->'steps')
                WHERE (value->'step'->>'step_order')::INTEGER = next_step_order
            LOOP
                -- Load tasks in order, respecting parent-child relationships
                FOR task_data IN 
                    SELECT value as task FROM jsonb_array_elements(step_data->'tasks')
                    ORDER BY (value->>'task_order')::INTEGER
                LOOP
                    -- Handle parent task relationship
                    parent_task_id := NULL;
                    template_parent_id := (task_data->>'parent_task_id')::UUID;
                    
                    IF template_parent_id IS NOT NULL THEN
                        -- Find the corresponding parent task in project_tasks
                        SELECT project_task_id INTO parent_task_id
                        FROM project_tasks
                        WHERE project_id = p_project_id 
                        AND template_task_id = template_parent_id;
                    END IF;

                    INSERT INTO project_tasks (
                        project_id, template_task_id, task_name, task_description,
                        phase_name, phase_order, step_name, step_order, task_order,
                        estimated_hours, parent_task_id, category, checklist_items,
                        is_loaded, created_by
                    ) VALUES (
                        p_project_id,
                        (task_data->>'task_id')::UUID,
                        task_data->>'task_name',
                        task_data->>'description',
                        phase_data->'phase'->>'phase_name',
                        next_phase_order,
                        step_data->'step'->>'step_name',
                        next_step_order,
                        (task_data->>'task_order')::INTEGER,
                        (task_data->>'estimated_hours')::INTEGER,
                        parent_task_id,
                        (task_data->>'category')::task_category_type,
                        COALESCE(task_data->'checklist_items', '[]'::jsonb),
                        TRUE,
                        'system'
                    );
                    
                    tasks_loaded := tasks_loaded + 1;
                END LOOP;
            END LOOP;
        END LOOP;

        -- If no tasks were loaded for this step, skip to next step
        IF tasks_loaded = 0 THEN
            RAISE NOTICE 'Step % in phase % is empty, skipping to next step', next_step_order, next_phase_order;
            
            -- Find next step after the empty one
            SELECT phase_order, step_order INTO next_phase_order, next_step_order
            FROM (
                SELECT 
                    (phase->'phase'->>'phase_order')::INTEGER as phase_order,
                    (step->'step'->>'step_order')::INTEGER as step_order
                FROM jsonb_array_elements(project_record.template_snapshot->'phases') as phase,
                     jsonb_array_elements(phase->'steps') as step
                WHERE (phase->'phase'->>'phase_order')::INTEGER > next_phase_order
                   OR ((phase->'phase'->>'phase_order')::INTEGER = next_phase_order 
                       AND (step->'step'->>'step_order')::INTEGER > next_step_order)
                ORDER BY phase_order, step_order
                LIMIT 1
            ) next_step;

            -- If no more steps, project is completed
            IF next_phase_order IS NULL THEN
                RAISE NOTICE 'No more steps found, project completed for project %', p_project_id;
                UPDATE projects 
                SET project_status = 'completed', updated_at = NOW()
                WHERE project_id = p_project_id;
                RETURN FALSE;
            END IF;
            
            -- Continue loop with next step
            CONTINUE step_loop;
        ELSE
            -- Tasks were loaded, exit loop
            EXIT step_loop;
        END IF;
    END LOOP step_loop;

    -- Update project current phase/step
    UPDATE projects 
    SET current_phase_id = gen_random_uuid(), -- Placeholder, could be improved
        current_step_id = gen_random_uuid(),   -- Placeholder, could be improved
        updated_at = NOW()
    WHERE project_id = p_project_id;

    -- Initialize task execution order for the newly loaded tasks
    PERFORM initialize_task_execution_order(p_project_id);
    
    -- Auto-assign crew to tasks based on template role assignments
    PERFORM auto_assign_crew_to_loaded_tasks(p_project_id);

    RAISE NOTICE 'Successfully loaded % tasks for phase %, step % in project %', tasks_loaded, next_phase_order, next_step_order, p_project_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check and escalate overdue tasks
CREATE OR REPLACE FUNCTION escalate_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
    escalated_count INTEGER := 0;
BEGIN
    UPDATE project_tasks 
    SET 
        task_status = 'escalated',
        escalation_reason = 'Task deadline exceeded',
        escalated_at = NOW(),
        updated_at = NOW()
    WHERE task_status IN ('pending', 'ongoing')
    AND deadline < NOW()
    AND is_archived = false;

    GET DIAGNOSTICS escalated_count = ROW_COUNT;
    RETURN escalated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to assign crew to project role
CREATE OR REPLACE FUNCTION assign_crew_to_project_role(
    p_project_id UUID,
    p_role_id UUID,
    p_crew_id UUID,
    p_assigned_by VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    project_role_id_var UUID;
BEGIN
    -- Get project role ID
    SELECT project_role_id INTO project_role_id_var
    FROM project_roles 
    WHERE project_id = p_project_id AND role_id = p_role_id;

    IF project_role_id_var IS NULL THEN
        RAISE EXCEPTION 'Project role not found';
    END IF;

    -- Insert assignment
    INSERT INTO project_crew_assignments (project_id, project_role_id, crew_id, assigned_by)
    VALUES (p_project_id, project_role_id_var, p_crew_id, p_assigned_by)
    ON CONFLICT (project_id, project_role_id, crew_id) DO NOTHING;

    -- Update role as filled
    UPDATE project_roles 
    SET is_filled = TRUE, updated_at = NOW()
    WHERE project_role_id = project_role_id_var;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize task statuses based on execution order and dependencies
CREATE OR REPLACE FUNCTION initialize_task_execution_order(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Reset all loaded tasks to pending first
    UPDATE project_tasks 
    SET task_status = 'pending', updated_at = NOW()
    WHERE project_id = p_project_id 
    AND is_loaded = true 
    AND task_status != 'completed';
    
    -- Start tasks that have no parent and are first in order (task_order = 1)
    -- or are the first task in their step
    FOR task_record IN
        SELECT project_task_id, phase_order, step_order, task_order
        FROM project_tasks
        WHERE project_id = p_project_id
        AND is_loaded = true
        AND task_status = 'pending'
        AND parent_task_id IS NULL
        ORDER BY phase_order, step_order, task_order
    LOOP
        -- Check if this is the first task in its step
        IF NOT EXISTS (
            SELECT 1 FROM project_tasks
            WHERE project_id = p_project_id
            AND phase_order = task_record.phase_order
            AND step_order = task_record.step_order
            AND task_order < task_record.task_order
            AND is_loaded = true
        ) THEN
            -- This is the first task in the step, make it ongoing
            UPDATE project_tasks 
            SET task_status = 'ongoing',
                started_at = NOW(),
                deadline = CASE 
                    WHEN estimated_hours IS NOT NULL 
                    THEN NOW() + (estimated_hours || ' hours')::INTERVAL 
                    ELSE NULL 
                END,
                updated_at = NOW()
            WHERE project_task_id = task_record.project_task_id;
            
            RAISE NOTICE 'Task % started as first in step', task_record.project_task_id;
            -- Only start one task per step initially
            EXIT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign crew to newly loaded tasks based on template role assignments
CREATE OR REPLACE FUNCTION auto_assign_crew_to_loaded_tasks(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
    template_role_id UUID;
    project_role_record RECORD;
    crew_assignment_record RECORD;
BEGIN
    -- Loop through newly loaded tasks that don't have assignments yet
    FOR task_record IN
        SELECT pt.project_task_id, pt.template_task_id
        FROM project_tasks pt
        WHERE pt.project_id = p_project_id 
        AND pt.is_loaded = true
        AND pt.template_task_id IS NOT NULL
        -- Only process tasks that don't have any assignments yet
        AND NOT EXISTS (
            SELECT 1 FROM project_task_assignments pta 
            WHERE pta.project_task_id = pt.project_task_id
        )
    LOOP
        -- Get the assigned role from the template task
        SELECT assigned_role_id INTO template_role_id
        FROM step_tasks
        WHERE task_id = task_record.template_task_id;
        
        -- If template task has an assigned role, find corresponding project role
        IF template_role_id IS NOT NULL THEN
            SELECT project_role_id INTO project_role_record
            FROM project_roles pr
            WHERE pr.project_id = p_project_id 
            AND pr.role_id = template_role_id;
            
            -- If project role exists and has crew assigned, assign them to the task
            IF project_role_record.project_role_id IS NOT NULL THEN
                -- Get all crew members assigned to this project role
                FOR crew_assignment_record IN
                    SELECT pca.crew_id
                    FROM project_crew_assignments pca
                    WHERE pca.project_id = p_project_id
                    AND pca.project_role_id = project_role_record.project_role_id
                LOOP
                    -- Assign crew to task
                    INSERT INTO project_task_assignments (
                        project_task_id, 
                        project_role_id, 
                        crew_id, 
                        assigned_by
                    ) VALUES (
                        task_record.project_task_id,
                        project_role_record.project_role_id,
                        crew_assignment_record.crew_id,
                        'system'
                    )
                    ON CONFLICT (project_task_id, project_role_id, crew_id) DO NOTHING;
                    
                    RAISE NOTICE 'Auto-assigned crew % to task % via role', 
                        crew_assignment_record.crew_id, task_record.project_task_id;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if project can start (all roles filled)
CREATE OR REPLACE FUNCTION can_project_start(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    unfilled_roles INTEGER;
BEGIN
    SELECT COUNT(*) INTO unfilled_roles
    FROM project_roles 
    WHERE project_id = p_project_id AND is_filled = FALSE;

    RETURN unfilled_roles = 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS FOR TASK MANAGEMENT
-- =====================================================

-- Function to handle task status changes and automatic progression
CREATE OR REPLACE FUNCTION handle_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
    child_task RECORD;
BEGIN
    -- Validate parent-child dependencies when changing to ongoing
    IF OLD.task_status != 'ongoing' AND NEW.task_status = 'ongoing' THEN
        -- Check if parent task is completed (if this task has a parent)
        IF NEW.parent_task_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM project_tasks 
                WHERE project_task_id = NEW.parent_task_id 
                AND task_status = 'completed'
            ) THEN
                RAISE EXCEPTION 'Cannot start task: parent task must be completed first';
            END IF;
        END IF;
        
        NEW.started_at = NOW();
        -- Calculate deadline based on estimated hours
        IF NEW.estimated_hours IS NOT NULL THEN
            NEW.deadline = NOW() + (NEW.estimated_hours || ' hours')::INTERVAL;
        END IF;
    END IF;

    -- Set completed_at when task is completed
    IF OLD.task_status != 'completed' AND NEW.task_status = 'completed' THEN
        NEW.completed_at = NOW();
        -- Ensure started_at is set to satisfy the constraint
        IF NEW.started_at IS NULL THEN
            NEW.started_at = NOW();
        END IF;
        
        -- When a parent task is completed, automatically make child tasks available (ongoing)
        -- But only if they are the next in sequence (lowest task_order among pending children)
        FOR child_task IN 
            SELECT project_task_id, task_order
            FROM project_tasks 
            WHERE parent_task_id = NEW.project_task_id 
            AND task_status = 'pending'
            AND is_loaded = true
            ORDER BY task_order
        LOOP
            -- Check if this is the next child task in sequence
            IF NOT EXISTS (
                SELECT 1 FROM project_tasks
                WHERE parent_task_id = NEW.project_task_id
                AND task_status IN ('pending', 'ongoing')
                AND task_order < child_task.task_order
                AND is_loaded = true
            ) THEN
                -- This is the next child task, make it ongoing
                UPDATE project_tasks 
                SET task_status = 'ongoing',
                    started_at = NOW(),
                    deadline = CASE 
                        WHEN estimated_hours IS NOT NULL 
                        THEN NOW() + (estimated_hours || ' hours')::INTERVAL 
                        ELSE NULL 
                    END,
                    updated_at = NOW()
                WHERE project_task_id = child_task.project_task_id;
                
                RAISE NOTICE 'Child task % automatically started after parent completion', child_task.project_task_id;
            END IF;
        END LOOP;
        
        -- Also check for next sequential task in the same step (if no parent-child relationship)
        IF NEW.parent_task_id IS NULL THEN
            -- Find the next task in sequence within the same step
            UPDATE project_tasks 
            SET task_status = 'ongoing',
                started_at = NOW(),
                deadline = CASE 
                    WHEN estimated_hours IS NOT NULL 
                    THEN NOW() + (estimated_hours || ' hours')::INTERVAL 
                    ELSE NULL 
                END,
                updated_at = NOW()
            WHERE project_id = NEW.project_id
            AND phase_order = NEW.phase_order
            AND step_order = NEW.step_order
            AND task_order = NEW.task_order + 1
            AND task_status = 'pending'
            AND parent_task_id IS NULL
            AND is_loaded = true;
        END IF;
    END IF;

    -- Set started_at when task moves to escalated (if not already set)
    IF OLD.task_status != 'escalated' AND NEW.task_status = 'escalated' THEN
        IF NEW.started_at IS NULL THEN
            NEW.started_at = NOW();
        END IF;
        NEW.escalated_at = NOW();
    END IF;

    -- Try to load next step when current step is completed
    IF NEW.task_status = 'completed' THEN
        -- Check if all tasks in current step are completed and load next step
        IF NOT EXISTS (
            SELECT 1 FROM project_tasks 
            WHERE project_id = NEW.project_id 
            AND phase_order = NEW.phase_order 
            AND step_order = NEW.step_order 
            AND task_status != 'completed'
            AND is_loaded = true
            AND project_task_id != NEW.project_task_id
        ) THEN
            -- All tasks in current step are completed, load next step
            RAISE NOTICE 'All tasks in step completed for project %, loading next step', NEW.project_id;
            PERFORM load_next_step_tasks(NEW.project_id);
        ELSE
            RAISE NOTICE 'Some tasks still incomplete in step for project %', NEW.project_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task status changes
DROP TRIGGER IF EXISTS handle_task_status_change_trigger ON project_tasks;
CREATE TRIGGER handle_task_status_change_trigger
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION handle_task_status_change();

-- =====================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_task_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON projects;

DROP POLICY IF EXISTS "Allow authenticated users to read project_roles" ON project_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_roles" ON project_roles;
DROP POLICY IF EXISTS "Allow authenticated users to update project_roles" ON project_roles;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_roles" ON project_roles;

DROP POLICY IF EXISTS "Allow authenticated users to read project_crew_assignments" ON project_crew_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_crew_assignments" ON project_crew_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to update project_crew_assignments" ON project_crew_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_crew_assignments" ON project_crew_assignments;

DROP POLICY IF EXISTS "Allow authenticated users to read project_tasks" ON project_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_tasks" ON project_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update project_tasks" ON project_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_tasks" ON project_tasks;

DROP POLICY IF EXISTS "Allow authenticated users to read project_task_assignments" ON project_task_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to insert project_task_assignments" ON project_task_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to update project_task_assignments" ON project_task_assignments;
DROP POLICY IF EXISTS "Allow authenticated users to delete project_task_assignments" ON project_task_assignments;

-- Create policies for projects
CREATE POLICY "Allow authenticated users to read projects" ON projects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert projects" ON projects
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update projects" ON projects
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete projects" ON projects
    FOR DELETE TO authenticated USING (true);

-- Create policies for project_roles
CREATE POLICY "Allow authenticated users to read project_roles" ON project_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert project_roles" ON project_roles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project_roles" ON project_roles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete project_roles" ON project_roles
    FOR DELETE TO authenticated USING (true);

-- Create policies for project_crew_assignments
CREATE POLICY "Allow authenticated users to read project_crew_assignments" ON project_crew_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert project_crew_assignments" ON project_crew_assignments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project_crew_assignments" ON project_crew_assignments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete project_crew_assignments" ON project_crew_assignments
    FOR DELETE TO authenticated USING (true);

-- Create policies for project_tasks
CREATE POLICY "Allow authenticated users to read project_tasks" ON project_tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert project_tasks" ON project_tasks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project_tasks" ON project_tasks
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete project_tasks" ON project_tasks
    FOR DELETE TO authenticated USING (true);

-- Create policies for project_task_assignments
CREATE POLICY "Allow authenticated users to read project_task_assignments" ON project_task_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert project_task_assignments" ON project_task_assignments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project_task_assignments" ON project_task_assignments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete project_task_assignments" ON project_task_assignments
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 10. VIEWS FOR EASY QUERYING
-- =====================================================

-- View for projects with statistics
CREATE OR REPLACE VIEW projects_with_stats AS
SELECT 
    p.*,
    COALESCE(task_stats.total_tasks, 0) as total_tasks,
    COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
    COALESCE(task_stats.ongoing_tasks, 0) as ongoing_tasks,
    COALESCE(task_stats.pending_tasks, 0) as pending_tasks,
    COALESCE(task_stats.escalated_tasks, 0) as escalated_tasks,
    COALESCE(role_stats.total_roles, 0) as total_roles,
    COALESCE(role_stats.filled_roles, 0) as filled_roles,
    COALESCE(role_stats.unfilled_roles, 0) as unfilled_roles
FROM projects p
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE task_status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE task_status = 'ongoing') as ongoing_tasks,
        COUNT(*) FILTER (WHERE task_status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE task_status = 'escalated') as escalated_tasks
    FROM project_tasks
    WHERE is_archived = false
    GROUP BY project_id
) task_stats ON p.project_id = task_stats.project_id
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) as total_roles,
        COUNT(*) FILTER (WHERE is_filled = true) as filled_roles,
        COUNT(*) FILTER (WHERE is_filled = false) as unfilled_roles
    FROM project_roles
    GROUP BY project_id
) role_stats ON p.project_id = role_stats.project_id;

-- View for project tasks with assignments
CREATE OR REPLACE VIEW project_tasks_with_assignments AS
SELECT 
    pt.*,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'crew_id', c.id,
                'crew_name', c.name,
                'crew_email', c.email,
                'role_name', pr.role_name,
                'department_name', pr.department_name
            )
        ) FILTER (WHERE c.id IS NOT NULL), 
        '[]'::jsonb
    ) as assigned_crew
FROM project_tasks pt
LEFT JOIN project_task_assignments pta ON pt.project_task_id = pta.project_task_id
LEFT JOIN project_roles pr ON pta.project_role_id = pr.project_role_id
LEFT JOIN crew c ON pta.crew_id = c.id
GROUP BY pt.project_task_id;

-- =====================================================
-- 11. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE projects IS 'Main projects table with template-based structure and progressive loading';
COMMENT ON TABLE project_roles IS 'Roles required for each project, derived from template';
COMMENT ON TABLE project_crew_assignments IS 'Assignment of crew members to project roles';
COMMENT ON TABLE project_tasks IS 'Project tasks with progressive loading and status tracking';
COMMENT ON TABLE project_task_assignments IS 'Assignment of crew members to specific tasks';

COMMENT ON COLUMN projects.template_snapshot IS 'JSONB snapshot of template structure at project creation';
COMMENT ON COLUMN projects.current_phase_id IS 'Current active phase for progressive loading';
COMMENT ON COLUMN projects.current_step_id IS 'Current active step for progressive loading';
COMMENT ON COLUMN project_tasks.is_loaded IS 'Whether this task has been loaded for the project';
COMMENT ON COLUMN project_tasks.is_custom IS 'Whether this is a user-added custom task';
COMMENT ON COLUMN project_tasks.deadline IS 'Calculated deadline based on start time and estimated hours';

COMMENT ON FUNCTION create_project_from_template(VARCHAR, TEXT, TEXT, DATE, UUID, VARCHAR) IS 'Create a new project from a template with role setup';
COMMENT ON FUNCTION load_next_step_tasks(UUID) IS 'Load tasks for the next step in progressive workflow';
COMMENT ON FUNCTION escalate_overdue_tasks() IS 'Escalate tasks that have passed their deadlines';
COMMENT ON FUNCTION can_project_start(UUID) IS 'Check if all required roles are filled to start project';

-- =====================================================
-- 12. ENHANCED PROJECTS VIEW WITH TEMPLATE STATISTICS
-- =====================================================

-- Enhanced projects view with template-based statistics
-- This view provides accurate task counts based on template data instead of just loaded tasks
CREATE OR REPLACE VIEW projects_with_template_stats AS
SELECT 
    p.*,
    -- Current loaded task statistics (actual progress)
    COALESCE(loaded_task_stats.loaded_tasks, 0) as loaded_tasks,
    COALESCE(loaded_task_stats.completed_tasks, 0) as completed_tasks,
    COALESCE(loaded_task_stats.ongoing_tasks, 0) as ongoing_tasks,
    COALESCE(loaded_task_stats.pending_tasks, 0) as pending_tasks,
    COALESCE(loaded_task_stats.escalated_tasks, 0) as escalated_tasks,
    
    -- Template-based total statistics (complete project scope)
    COALESCE(template_stats.template_total_tasks, 0) as total_tasks,
    COALESCE(template_stats.template_total_hours, 0) as total_estimated_hours,
    
    -- Role statistics
    COALESCE(role_stats.total_roles, 0) as total_roles,
    COALESCE(role_stats.filled_roles, 0) as filled_roles,
    COALESCE(role_stats.unfilled_roles, 0) as unfilled_roles,
    
    -- Progress calculation based on template
    CASE 
        WHEN COALESCE(template_stats.template_total_tasks, 0) > 0 
        THEN ROUND((COALESCE(loaded_task_stats.completed_tasks, 0)::DECIMAL / template_stats.template_total_tasks) * 100, 2)
        ELSE 0 
    END as completion_percentage
FROM projects p
LEFT JOIN (
    -- Current loaded task statistics
    SELECT 
        project_id,
        COUNT(*) as loaded_tasks,
        COUNT(*) FILTER (WHERE task_status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE task_status = 'ongoing') as ongoing_tasks,
        COUNT(*) FILTER (WHERE task_status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE task_status = 'escalated') as escalated_tasks
    FROM project_tasks
    WHERE is_archived = false
    GROUP BY project_id
) loaded_task_stats ON p.project_id = loaded_task_stats.project_id
LEFT JOIN (
    -- Template-based total task count using template_snapshot
    SELECT 
        p.project_id,
        COUNT(task_data.*) as template_total_tasks,
        SUM((task_data->'task'->>'estimated_hours')::INTEGER) as template_total_hours
    FROM projects p,
    LATERAL (
        SELECT value as phase_data
        FROM jsonb_array_elements(p.template_snapshot->'phases')
    ) phases,
    LATERAL (
        SELECT value as step_data  
        FROM jsonb_array_elements(phases.phase_data->'steps')
    ) steps,
    LATERAL (
        SELECT value as task_data
        FROM jsonb_array_elements(steps.step_data->'tasks')
    ) task_data
    WHERE p.template_snapshot IS NOT NULL
    GROUP BY p.project_id
) template_stats ON p.project_id = template_stats.project_id
LEFT JOIN (
    -- Role statistics
    SELECT 
        project_id,
        COUNT(*) as total_roles,
        COUNT(*) FILTER (WHERE is_filled = true) as filled_roles,
        COUNT(*) FILTER (WHERE is_filled = false) as unfilled_roles
    FROM project_roles
    GROUP BY project_id
) role_stats ON p.project_id = role_stats.project_id;

-- Create an index to improve performance
CREATE INDEX IF NOT EXISTS idx_projects_template_snapshot ON projects USING gin(template_snapshot);

-- =====================================================
-- 13. SUCCESS MESSAGE
-- =====================================================

SELECT 'Project Module Schema created successfully!' as status,
       'Includes: Projects, progressive task loading, crew assignments, role management, template-based statistics, and automation' as features;
