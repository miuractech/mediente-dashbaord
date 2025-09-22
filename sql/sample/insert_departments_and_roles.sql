-- Insert Departments and Roles Data
-- This script populates the departments and department_roles tables with production roles
-- Run this after setting up the departments and department_roles tables

-- Ensure uniqueness and deduplicate existing data to avoid multi-row subqueries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_departments_name'
    ) THEN
        CREATE UNIQUE INDEX uq_departments_name ON public.departments(department_name);
    END IF;
END $$;

-- Consolidate duplicate departments by name, re-pointing roles to a single canonical department_id
WITH dedup AS (
  SELECT department_name, MIN(department_id::text)::uuid AS keep_id
  FROM public.departments
  GROUP BY department_name
), to_fix AS (
  SELECT d.department_id AS old_id, dedup.keep_id
  FROM public.departments d
  JOIN dedup ON dedup.department_name = d.department_name
  WHERE d.department_id <> dedup.keep_id
)
UPDATE public.department_roles r
SET department_id = tf.keep_id
FROM to_fix tf
WHERE r.department_id = tf.old_id;

WITH dedup AS (
  SELECT department_name, MIN(department_id::text)::uuid AS keep_id
  FROM public.departments
  GROUP BY department_name
), to_fix AS (
  SELECT d.department_id AS old_id, dedup.keep_id
  FROM public.departments d
  JOIN dedup ON dedup.department_name = d.department_name
  WHERE d.department_id <> dedup.keep_id
)
DELETE FROM public.departments d
USING to_fix tf
WHERE d.department_id = tf.old_id;

-- Ensure department_roles uniqueness per department and role_name (active roles)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'department_roles_role_name_unique'
    ) THEN
        ALTER TABLE public.department_roles
        ADD CONSTRAINT department_roles_role_name_unique UNIQUE (department_id, role_name, is_archived);
    END IF;
END $$;

-- Deduplicate any existing duplicate active roles within the same department
WITH dup AS (
  SELECT department_id, role_name, MIN(role_id::text)::uuid AS keep_id
  FROM public.department_roles
  WHERE is_archived = false
  GROUP BY department_id, role_name
  HAVING COUNT(*) > 1
), to_fix_roles AS (
  SELECT dr.role_id AS old_id, dup.keep_id
  FROM public.department_roles dr
  JOIN dup ON dup.department_id = dr.department_id AND dup.role_name = dr.role_name
  WHERE dr.role_id <> dup.keep_id AND dr.is_archived = false
)
UPDATE public.department_roles r
SET reports_to = tfr.keep_id
FROM to_fix_roles tfr
WHERE r.reports_to = tfr.old_id;

WITH dup AS (
  SELECT department_id, role_name, MIN(role_id::text)::uuid AS keep_id
  FROM public.department_roles
  WHERE is_archived = false
  GROUP BY department_id, role_name
  HAVING COUNT(*) > 1
), to_fix_roles AS (
  SELECT dr.role_id AS old_id, dup.keep_id
  FROM public.department_roles dr
  JOIN dup ON dup.department_id = dr.department_id AND dup.role_name = dr.role_name
  WHERE dr.role_id <> dup.keep_id AND dr.is_archived = false
)
DELETE FROM public.department_roles d
USING to_fix_roles tfr
WHERE d.role_id = tfr.old_id;

-- Insert all departments
INSERT INTO departments (department_name, description, created_by) VALUES
('Camera Department', 'Handles all camera operations, cinematography, and visual capture equipment', 'system'),
('Video Department', 'Manages video playback, coordination, and technical video operations', 'system'),
('Sound Department', 'Responsible for audio recording, mixing, and sound equipment management', 'system'),
('Wardrobe', 'Manages costumes, wardrobe styling, and clothing for productions', 'system'),
('Make-Up & Hair', 'Handles makeup application, hairstyling, and character appearance', 'system'),
('Art Department', 'Manages set design, art direction, and visual aesthetics', 'system'),
('Property Department', 'Handles props, set pieces, and on-set property management', 'system'),
('Post Production', 'Manages editing, post-production workflows, and final content preparation', 'system'),
('Craft Services', 'Provides food and beverage services for cast and crew', 'system'),
('Production', 'Oversees overall production management and coordination', 'system'),
('Grip Department', 'Handles camera support equipment, dollies, and rigging', 'system'),
('Construction', 'Builds and maintains sets, stages, and production infrastructure', 'system'),
('Special Effects', 'Creates practical special effects and coordinated stunts', 'system'),
('Wrangling Labor', 'Manages animal wrangling and specialized labor coordination', 'system'),
('Production Office', 'Handles administrative tasks and production coordination', 'system'),
('Accounting', 'Manages financial aspects, payroll, and production accounting', 'system'),
('Miscellaneous', 'Various specialized roles that don''t fit other departments', 'system'),
('Visual Effects', 'Creates digital effects, CGI, and post-production visual elements', 'system'),
('Music', 'Handles music composition, supervision, and audio production', 'system'),
('Locations', 'Manages filming locations, permits, and location logistics', 'system'),
('Catering', 'Provides meal services and catering for productions', 'system'),
('Transportation', 'Manages vehicles, drivers, and transportation logistics', 'system'),
('Agency', 'Handles marketing, business development, and agency operations', 'system'),
('Casting', 'Manages talent casting and actor selection processes', 'system'),
('Electric', 'Handles lighting equipment, electrical systems, and power management', 'system'),
('Stunts', 'Coordinates stunt work, safety, and action sequences', 'system'),
('Studio Operations', 'Manages studio facilities and operational logistics', 'system')
ON CONFLICT (department_name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_by = 'system',
  updated_at = NOW();

-- Insert Camera Department roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Director of Photography', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Cinematographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('1st Assistant Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"A" Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"A" 1st Assistant Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"A" 2nd Assistant Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"B" Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"B" 1st Assistant Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"B" 2nd Assistant Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('2nd Assistant Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('1st Photo Assistant', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Additional Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"C" 1st Operator Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"C" 2nd Operator Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Hi-Def Technician', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Drone Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Camera Loader', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('"C" Camera Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Jib/Crane Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Digital Imaging Technician', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Trainee', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Special Equipment Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Crane Technician', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Steadicam Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Ronin Operator', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Still Photographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Drone Assistant', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Additional 1st Assistant Cameraperson', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Additional 2nd Assistant Cameraperson', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('2nd Photo Assistant', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Portrait Photographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Photo Assistant', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('BTS Photographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('2nd Shooter', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('3rd Shooter', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Aerial Photographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Other Camera Labor', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Videographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('Digital Imaging Technician Utility', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('BTS Videographer', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system'),
('3rd Photo Assistant', (SELECT department_id FROM departments WHERE department_name = 'Camera Department'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Video Department roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Video Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Video Department'), 'system'),
('Video Playback Operator', (SELECT department_id FROM departments WHERE department_name = 'Video Department'), 'system'),
('Video Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Video Department'), 'system'),
('Video Engineer', (SELECT department_id FROM departments WHERE department_name = 'Video Department'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Sound Department roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Sound Mixer', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Boom Operator', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Utility Sound Technician', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Cable Person', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Playback Operator', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Public Address Operator', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Additional Sound Mixer', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Walkie-Talkies', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Recording Engineer', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system'),
('Other Sound Labor', (SELECT department_id FROM departments WHERE department_name = 'Sound Department'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Wardrobe roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Costume Designer', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Costume Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Head Wardrobe', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Wardrobe Stylist', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Wardrobe Assistant', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Wardrobe Production Assistant', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Set Costumer', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Seamstress / Tailor', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Costume Manager', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Key Costumer', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Assistant Costume Designer', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Shopper', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Truck Costumer', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Additional Costumer', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system'),
('Other Wardrobe Labor', (SELECT department_id FROM departments WHERE department_name = 'Wardrobe'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Make-Up & Hair roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Department Head Make-Up', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Department Head Hairstylist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Key Make-Up Artist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Key Hairstylist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Assistant Makeup Artist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Assistant Hairstylist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Hairstylist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Hair & Make-Up Artist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Groomer', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Manicurist', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Special Effects Makeup / Hair', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Wig Maker', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Wigs / Hairpieces Labor', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Swing Person', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Makeup / Hair Labor PA', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system'),
('Other Makeup / Hair Labor', (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Art Department roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Production Designer', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Art Director', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Set Designer', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('1st Assistant Art Director', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('2nd Assistant Art Director', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Set Decorator', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Art Department Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Art Department PA', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Leadperson', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Set Dressing Buyer', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('On Set Dresser', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Storyboard Artist', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Gang Boss', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Swing Gang', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Drafting', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Illustrator', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Graphic Artist', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Food Stylist', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Other Design Labor', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Model Maker', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system'),
('Other Set Dressing Labor', (SELECT department_id FROM departments WHERE department_name = 'Art Department'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Property Department roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Property Master', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Co-Property Master', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Asst. Prop Master', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Prop Stylist', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('On-Set Props', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Prop Maker', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Assistant Property', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Prop Buyer', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Weapon Master', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Gun Handler', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system'),
('Other Property Labor', (SELECT department_id FROM departments WHERE department_name = 'Property Department'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Post Production roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Post Production Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Post Production Manager', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Assistant Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Apprentice Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Associate Producer', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Supervising / Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Post Production Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Post Production PA', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Colorist', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Photo Assignment Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Music Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Photo Retoucher', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Music Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Assistant Sound Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Sound Effects Editor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('ADR Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Foley Labor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system'),
('Other Editorial Labor', (SELECT department_id FROM departments WHERE department_name = 'Post Production'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Craft Services roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Key Craft Service', (SELECT department_id FROM departments WHERE department_name = 'Craft Services'), 'system'),
('Craft Service', (SELECT department_id FROM departments WHERE department_name = 'Craft Services'), 'system'),
('Craft Service Assistant', (SELECT department_id FROM departments WHERE department_name = 'Craft Services'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Production roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Executive Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Line Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Co-Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Associate Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Assistant Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Unit Production Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Production Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Production Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Production Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('1st Assistant Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('2nd Assistant Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('2nd 2nd Assistant Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Additional 2nd AD', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Script Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Production Assistant', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Photographer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Director / Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Writer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Screenwriter', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Director (Current Ep.)', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Executive Producer / Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Senior Photo Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('2nd Unit Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('DGA Trainee', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Dialogue Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Director''s Assistant', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Floor Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Producer''s Assistant', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Unit Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Set Production Assistant', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Series Producer', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Stage Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Assistant Stage Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Runner', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Researcher', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Assistant Production Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Office Production', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Local Contact Person', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Technical Advisor Interpreter', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Junior Floor Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Assistant Floor Manager', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Script Consultant', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Script Editor', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Secretary', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Other Production Staff', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system'),
('Writer / Director', (SELECT department_id FROM departments WHERE department_name = 'Production'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Grip Department roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Key Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Best Boy Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Dolly Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Crane Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Key Rigging Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Teleprompter Operator', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Grip & Electric Swing', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Additional Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Rigging Best Boy', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Rigging Grip', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Laborer', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system'),
('Rigging / Striking', (SELECT department_id FROM departments WHERE department_name = 'Grip Department'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Construction roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Director of Construction', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Construction Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('General Foreman', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Construction Foreman', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Gang Boss', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Construction Buyer', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Construction Labor', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Propmaker', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Head Carpenter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Carpenter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Scenic Painter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Paint Foreman', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Paint Gang Boss', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Painter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Sign Painter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Labor Foreman', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Tool Man', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Stage Labor', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Greensperson', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Stand-by Carpenter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Stand-by Painter', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Strike Crew', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system'),
('Other Construction Labor', (SELECT department_id FROM departments WHERE department_name = 'Construction'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Special Effects roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Special Effects Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('Special Effects Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('Special Effects Office Manager', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('Special Effects Assistant', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('Creature Effects', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('Key Aerial Rigger', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('2nd Aerial Rigger', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system'),
('Other Special Effects Labor', (SELECT department_id FROM departments WHERE department_name = 'Special Effects'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Wrangling Labor roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Head Wrangler', (SELECT department_id FROM departments WHERE department_name = 'Wrangling Labor'), 'system'),
('Trainer', (SELECT department_id FROM departments WHERE department_name = 'Wrangling Labor'), 'system'),
('Other Wrangling Labor', (SELECT department_id FROM departments WHERE department_name = 'Wrangling Labor'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Production Office roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Production Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Assistant Production Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Travel Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Production Secretary', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Office P.A.', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Script Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Writer''s Assistant', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Staff Writer', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system'),
('Additional Assistant', (SELECT department_id FROM departments WHERE department_name = 'Production Office'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Accounting roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Supervising Production Accountant', (SELECT department_id FROM departments WHERE department_name = 'Accounting'), 'system'),
('Production Accountant', (SELECT department_id FROM departments WHERE department_name = 'Accounting'), 'system'),
('1st Assistant Accountant', (SELECT department_id FROM departments WHERE department_name = 'Accounting'), 'system'),
('2nd Assistant Accountant', (SELECT department_id FROM departments WHERE department_name = 'Accounting'), 'system'),
('Payroll Accountant', (SELECT department_id FROM departments WHERE department_name = 'Accounting'), 'system'),
('Accounting Clerk', (SELECT department_id FROM departments WHERE department_name = 'Accounting'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Miscellaneous roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Model Agent', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Unit Publicist', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Choreographer', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Social Media Manager', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Technical Director', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Social Media Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Publishing Manager', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('ACTRA Steward', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Talent Agent', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Dialect Coach', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Studio Teacher', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Lighting Consultant', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Set Medic', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Technical Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Floor Manager', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Lighting Director', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Boardman', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Audio', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Tongue Operator', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Video Tape Recorder Operator', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Maintenance', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Stagehands', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Utility Person', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Television Assistant', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system'),
('Other', (SELECT department_id FROM departments WHERE department_name = 'Miscellaneous'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Visual Effects roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Visual Effects Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('Visual Effects Producer', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('Visual Effects Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('Visual Effects Assistant', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('Visual Effects Wrangler', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('Computer Graphics Artist', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('Pre-vis Computer Artist', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system'),
('On Set Visual Effects', (SELECT department_id FROM departments WHERE department_name = 'Visual Effects'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Music roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Music Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Music'), 'system'),
('Composer', (SELECT department_id FROM departments WHERE department_name = 'Music'), 'system'),
('Arranger', (SELECT department_id FROM departments WHERE department_name = 'Music'), 'system'),
('Conductor', (SELECT department_id FROM departments WHERE department_name = 'Music'), 'system'),
('Musician', (SELECT department_id FROM departments WHERE department_name = 'Music'), 'system'),
('Spotting Session', (SELECT department_id FROM departments WHERE department_name = 'Music'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Locations roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Location Manager', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Key Assistant Location Manager', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Location Assistant', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Location Scout', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Location PA', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Location Owner', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Police', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Fireman', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system'),
('Security', (SELECT department_id FROM departments WHERE department_name = 'Locations'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Catering roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Catering Company', (SELECT department_id FROM departments WHERE department_name = 'Catering'), 'system'),
('Catering Assistant', (SELECT department_id FROM departments WHERE department_name = 'Catering'), 'system'),
('Catering Runner', (SELECT department_id FROM departments WHERE department_name = 'Catering'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Transportation roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Transportation Captain', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Transportation Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Transportation Co-Captain / Head Driver', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Dispatcher', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Driver', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Additional Driver', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Picture Car Captain', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Picture Car Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Car Prep', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Camera 1 Ton', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Camera 5 Ton', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Grip 10 Ton', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Stakebeds', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Craft Service Trailer', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Set Dec 1 Ton', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Set Dec 5 Ton', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Set Dec Crew Cab', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Wardrobe Trailer', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Make-Up & Hair Trailer', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('2 Room Trailers', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('3 Room Trailers', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Single Room Trailers', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Construction Forklift', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Fueler', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Additional Generator', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Construction', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Shuttle Vans', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('2-Axle Tractor', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Honeywagon', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Water Truck', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system'),
('Other Transportation Labor', (SELECT department_id FROM departments WHERE department_name = 'Transportation'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Agency roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Chief Executive Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Creative Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Financial Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Operations Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Marketing Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Strategic Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Information (or Interactive) Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Digital Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Chief Technology Officer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Managing Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('General Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Studio Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Creative Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Art Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Art Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director Brand Marketing', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director of Marketing', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Studio Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Marketing Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Founder', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Partner', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Board Member', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director of New Business', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director of Business Development', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Marketing Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('New Business Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Brand Development Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Public Relations Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Publicist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Public Relations Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Corporate Communications Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Intern', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Corporate Communications Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Communication Specialist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('New Business Project Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director Account Planning', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Planning Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Account Planner', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Product Marketing Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('SEO Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('SEO Strategist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('SEM Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Database Marketing Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('CRM Marketing Manager / Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director of Brand Partnerships', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Managing Director, Production', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Group Director, Production', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Producer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Scrum Master', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Product Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Project Management Office Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Director of Project Management', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Project Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Project Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Ad Traffic', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Traffic Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Traffic Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Proofreading', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Client Services Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Group Account Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Account Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Management Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Account Supervisor', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Account Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Account Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Account Executive', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Account Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Executive Creative Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Group Creative Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Creative Producer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Field Producer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Associate Creative Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Copywriter', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Junior Copywriter', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Associate Art Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Junior Art Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Creative Resource Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Creative Resource Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Creative Services Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Creative Services Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Head of Studio Services', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Studio Producer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Group Studio Manager', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Studio Art Director', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Studio Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Production Artist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Production Artist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Senior Retoucher', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Retoucher', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Prepress Artist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Proofreader', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Studio Scheduler', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Illustrator', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Story Board Artist', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system'),
('Presentation Designer', (SELECT department_id FROM departments WHERE department_name = 'Agency'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Casting roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Casting Director', (SELECT department_id FROM departments WHERE department_name = 'Casting'), 'system'),
('Casting Agent', (SELECT department_id FROM departments WHERE department_name = 'Casting'), 'system'),
('Casting Associate', (SELECT department_id FROM departments WHERE department_name = 'Casting'), 'system'),
('Casting Assistant', (SELECT department_id FROM departments WHERE department_name = 'Casting'), 'system'),
('Casting PA', (SELECT department_id FROM departments WHERE department_name = 'Casting'), 'system'),
('Extras Casting', (SELECT department_id FROM departments WHERE department_name = 'Casting'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Electric roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Gaffer', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Chief Lighting Technician', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Assistant Chief Lighting Technician', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Best Boy Electric', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Electrician', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Lighting Designer', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Rigging / Striking', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Dailies', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Dimmer Operator', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Lamp Operator', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Additional Lamp Operator', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Generator Operator', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Condor Operator', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Chief Rigging Technician', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Other Electrical Labor', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Rigging Electric', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system'),
('Grip & Electric Swing', (SELECT department_id FROM departments WHERE department_name = 'Electric'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Stunts roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Stunt Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Stunts'), 'system'),
('Assistant Stunt Coordinator', (SELECT department_id FROM departments WHERE department_name = 'Stunts'), 'system'),
('Stunt Rigger', (SELECT department_id FROM departments WHERE department_name = 'Stunts'), 'system'),
('Stunt Safety', (SELECT department_id FROM departments WHERE department_name = 'Stunts'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Insert Studio Operations roles
INSERT INTO department_roles (role_name, department_id, created_by) VALUES
('Chairs on Stage', (SELECT department_id FROM departments WHERE department_name = 'Studio Operations'), 'system'),
('Studio Trailers Changing', (SELECT department_id FROM departments WHERE department_name = 'Studio Operations'), 'system'),
('Production Guest', (SELECT department_id FROM departments WHERE department_name = 'Studio Operations'), 'system'),
('Actor Guest', (SELECT department_id FROM departments WHERE department_name = 'Studio Operations'), 'system'),
('Other Guest', (SELECT department_id FROM departments WHERE department_name = 'Studio Operations'), 'system')
ON CONFLICT (department_id, role_name, is_archived) DO NOTHING;

-- Update some roles with hierarchy (reports_to relationships)
-- Camera Department hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Director of Photography' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Camera Department')
) WHERE role_name IN ('1st Assistant Camera Operator', 'Camera Operator', '"A" Camera Operator', '"B" Camera Operator', '"C" Camera Operator', 'Steadicam Operator')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Camera Department');

-- Wardrobe hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Costume Designer' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Wardrobe')
) WHERE role_name IN ('Costume Supervisor', 'Head Wardrobe')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Wardrobe');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Costume Supervisor' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Wardrobe')
) WHERE role_name IN ('Key Costumer', 'Set Costumer', 'Assistant Costume Designer')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Wardrobe');

-- Art Department hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Production Designer' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Art Department')
) WHERE role_name IN ('Set Designer')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Art Department');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Production Designer' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Art Department')
) WHERE role_name = 'Art Director'
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Art Department');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Art Director' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Art Department')
) WHERE role_name IN ('1st Assistant Art Director', 'Set Decorator')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Art Department');

-- Production hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Producer' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Production')
) WHERE role_name IN ('Line Producer', 'Unit Production Manager')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Production');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = '1st Assistant Director' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Production')
) WHERE role_name IN ('2nd Assistant Director', '2nd 2nd Assistant Director')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Production');

-- Electric Department hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Gaffer' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Electric')
) WHERE role_name IN ('Best Boy Electric', 'Chief Lighting Technician')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Electric');

-- Grip Department hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Key Grip' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Grip Department')
) WHERE role_name IN ('Best Boy Grip', 'Dolly Grip')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Grip Department');

-- Sound Department hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Sound Mixer' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Sound Department')
) WHERE role_name IN ('Boom Operator', 'Utility Sound Technician')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Sound Department');

-- Make-Up & Hair hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Department Head Make-Up' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair')
) WHERE role_name IN ('Key Make-Up Artist', 'Assistant Makeup Artist')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Department Head Hairstylist' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair')
) WHERE role_name IN ('Key Hairstylist', 'Assistant Hairstylist')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Make-Up & Hair');

-- Construction hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Director of Construction' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Construction')
) WHERE role_name IN ('Construction Coordinator', 'General Foreman')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Construction');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'General Foreman' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Construction')
) WHERE role_name IN ('Construction Foreman', 'Head Carpenter', 'Paint Foreman')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Construction');

-- Property Department hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Property Master' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Property Department')
) WHERE role_name IN ('Asst. Prop Master', 'On-Set Props')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Property Department');

-- Post Production hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Post Production Supervisor' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Post Production')
) WHERE role_name IN ('Post Production Manager')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Post Production');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Post Production Supervisor' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Post Production')
) WHERE role_name = 'Editor'
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Post Production');

UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Editor' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Post Production')
) WHERE role_name IN ('Assistant Editor', 'Apprentice Editor')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Post Production');

-- Transportation hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Transportation Captain' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Transportation')
) WHERE role_name IN ('Transportation Coordinator', 'Transportation Co-Captain / Head Driver')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Transportation');

-- Locations hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Location Manager' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Locations')
) WHERE role_name IN ('Key Assistant Location Manager', 'Location Assistant')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Locations');

-- Visual Effects hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Visual Effects Supervisor' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Visual Effects')
) WHERE role_name IN ('Visual Effects Producer', 'Visual Effects Coordinator')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Visual Effects');

-- Special Effects hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Special Effects Supervisor' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Special Effects')
) WHERE role_name IN ('Special Effects Coordinator', 'Special Effects Assistant')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Special Effects');

-- Accounting hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Supervising Production Accountant' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Accounting')
) WHERE role_name IN ('Production Accountant', '1st Assistant Accountant')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Accounting');

-- Stunts hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Stunt Coordinator' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Stunts')
) WHERE role_name IN ('Assistant Stunt Coordinator', 'Stunt Rigger')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Stunts');

-- Casting hierarchy
UPDATE department_roles SET reports_to = (
  SELECT role_id FROM department_roles WHERE role_name = 'Casting Director' 
  AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Casting')
) WHERE role_name IN ('Casting Agent', 'Casting Associate')
AND department_id = (SELECT department_id FROM departments WHERE department_name = 'Casting');

COMMIT;
