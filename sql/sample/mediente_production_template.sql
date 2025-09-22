-- =====================================================
-- MEDIENTE PRODUCTION SERVICES TEMPLATE
-- =====================================================
-- This script creates a comprehensive film production template
-- Based on the CSV data with additional tasks and enhancements
-- Run this script after the project_template.sql schema is in place

-- =====================================================
-- 1. INSERT PROJECT TEMPLATE
-- =====================================================

-- Delete existing template if it exists
DELETE FROM project_templates WHERE template_name = 'Mediente Production Services Complete';

INSERT INTO project_templates (
    template_name, 
    description, 
    created_by
) VALUES (
    'Mediente Production Services Complete',
    'Comprehensive film production template covering all phases from conditions precedent through post-production, including location scouting, crew management, and compliance requirements.',
    'c62fdbeb-ee8d-4f24-847f-47a4203e575a'
);

-- Get the template ID for reference
DO $$
DECLARE
    template_uuid UUID;
    phase_uuid UUID;
    step_uuid UUID;
BEGIN
    -- Get template ID
    SELECT template_id INTO template_uuid 
    FROM project_templates 
    WHERE template_name = 'Mediente Production Services Complete';

    -- Delete existing data to prevent conflicts
    DELETE FROM step_tasks WHERE step_id IN (
        SELECT ps.step_id FROM phase_steps ps 
        JOIN template_phases tp ON ps.phase_id = tp.phase_id 
        WHERE tp.template_id = template_uuid
    );
    DELETE FROM phase_steps WHERE phase_id IN (
        SELECT phase_id FROM template_phases WHERE template_id = template_uuid
    );
    DELETE FROM template_phases WHERE template_id = template_uuid;

    -- =====================================================
    -- 2. INSERT PHASES
    -- =====================================================

    -- Phase 1: Conditions Precedent
    INSERT INTO template_phases (
        template_id, phase_name, description, phase_order, created_by
    ) VALUES (
        template_uuid, 
        'Conditions Precedent',
        'Initial setup and prerequisite tasks before production begins, including script coordination, location references, and preliminary scheduling.',
        1,
        'c62fdbeb-ee8d-4f24-847f-47a4203e575a'
    ) RETURNING phase_id INTO phase_uuid;

    -- Steps for Conditions Precedent
    INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by) VALUES
    (phase_uuid, 'Script & Creative Coordination', 'Coordinate all script-related and creative elements', 1, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Legal & Documentation Setup', 'Handle production agreements and legal requirements', 2, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Preliminary Planning', 'Initial budget, schedule, and location planning', 3, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Script & Creative Coordination
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 1;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Script Review and Analysis', 'Complete review of script for production requirements', 1, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Director and Creative Elements Coordination', 'Coordinate with director on creative vision and requirements', 2, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Script Breakdown for Production', 'Detailed breakdown of script for all departments', 3, 16, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Creative References Compilation', 'Gather and organize all creative reference materials', 4, 6, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Legal & Documentation Setup
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 2;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Production Services Agreement', 'Draft and finalize production services agreement', 1, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Chain of Title Documentation', 'Ensure all rights and title documentation is in order', 2, 8, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Legal Compliance Review', 'Review all legal requirements for production location', 3, 6, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Preliminary Planning
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 3;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Tentative Schedule Creation', 'Create preliminary production schedule', 1, 10, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Tentative Budget Preparation', 'Prepare initial budget estimates', 2, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Location Analysis', 'Analyze ideal shooting locations vs rebate scenarios vs logistical convenience', 3, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Desired Location Reference', 'Compile reference materials for desired locations', 4, 4, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- =====================================================
    -- Phase 2: Setting up Film
    -- =====================================================

    -- Phase 2: Setting up Film
    INSERT INTO template_phases (
        template_id, phase_name, description, phase_order, created_by
    ) VALUES (
        template_uuid, 
        'Setting up Film',
        'Establish local production infrastructure, legal framework, and key personnel appointments.',
        2,
        'c62fdbeb-ee8d-4f24-847f-47a4203e575a'
    ) RETURNING phase_id INTO phase_uuid;

    -- Steps for Setting up Film
    INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by) VALUES
    (phase_uuid, 'Legal & Financial Setup', 'Establish legal entity and financial infrastructure', 1, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Key Personnel Appointments', 'Hire and coordinate key production personnel', 2, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Location & Logistics Setup', 'Establish location permissions and logistics infrastructure', 3, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Tax Incentives & Compliance', 'Handle tax credits and regulatory compliance', 4, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Legal & Financial Setup
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 1;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Setup SPV Banking', 'Establish Special Purpose Vehicle banking arrangements', 1, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Local Lawyer Appointment', 'Identify and appoint local legal counsel', 2, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Local Accountant Appointment', 'Identify and appoint local accounting services', 3, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Agreements under Local Law', 'Prepare all agreements compliant with local legislation', 4, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Key Personnel Appointments
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 2;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'HOD Appointments', 'Coordinate appointments of Heads of Department', 1, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Local Production Liaison Appointment', 'Identify and appoint local production liaison', 2, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Location Scout Appointment', 'Identify and appoint professional location scout', 3, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Script Translation Services', 'Arrange for script translation if required', 4, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Location & Logistics Setup
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 3;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Preliminary Scout Scheduling', 'Schedule preliminary scout with Director, DP, and Production Designer', 1, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Location Permissions Initiation', 'Begin process for all required location permissions', 2, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Hotel Options Identification', 'Research and identify suitable accommodation options', 3, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Catering Options Research', 'Identify and evaluate catering service providers', 4, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Transport Options Planning', 'Plan transportation logistics and identify providers', 5, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Tax Incentives & Compliance
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 4;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Tax Credit Application Preparation', 'Prepare comprehensive tax credit application', 1, 16, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Necessary Fees Payment', 'Pay all required application and processing fees', 2, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Tax Credit Application Filing', 'Submit completed tax credit application', 3, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Cultural Test Compliance', 'Ensure compliance with cultural content requirements', 4, 8, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- =====================================================
    -- Phase 3: Pre-Production
    -- =====================================================

    -- Phase 3: Pre-Production
    INSERT INTO template_phases (
        template_id, phase_name, description, phase_order, created_by
    ) VALUES (
        template_uuid, 
        'Pre-Production',
        'Comprehensive pre-production phase covering crew hire, departmental breakdowns, equipment planning, and rehearsals.',
        3,
        'c62fdbeb-ee8d-4f24-847f-47a4203e575a'
    ) RETURNING phase_id INTO phase_uuid;

    -- Steps for Pre-Production
    INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by) VALUES
    (phase_uuid, 'Crew & Casting', 'Hire crew and manage casting processes', 1, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Departmental Planning', 'Coordinate planning across all production departments', 2, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Technical Preparation', 'Handle all technical equipment and testing requirements', 3, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Rehearsals & Workshops', 'Conduct rehearsals and talent preparation', 4, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Vendor & Contract Management', 'Finalize all vendor relationships and contracts', 5, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Financial & Administrative Setup', 'Complete financial planning and administrative setup', 6, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Crew & Casting
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 1;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Crew Hire Coordination', 'Coordinate hiring of all crew members', 1, 24, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'ADS (Assistant Director) Team Assembly', 'Assemble and brief assistant director team', 2, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Secondary Characters Casting', 'Cast all secondary and supporting characters', 3, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Junior Artist Requirements', 'Determine and fulfill junior artist requirements', 4, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Casting Reference Preparation', 'Prepare comprehensive casting references and materials', 5, 6, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Departmental Planning
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 2;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Director Schedule Planning', 'Plan and coordinate director availability and schedule', 1, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Requirement Breakdown Creation', 'Create detailed breakdown of all production requirements', 2, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Storyboard Development', 'Develop comprehensive storyboards', 3, 24, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Location Breakdown Analysis', 'Detailed analysis and breakdown of all locations', 4, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Picture Vehicle Requirements', 'Determine and plan for all picture vehicle needs', 5, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'VFX Breakdown Planning', 'Create detailed VFX breakdown and planning', 6, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Action & SFX Breakdown', 'Plan all action sequences and special effects', 7, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Costume References & Breakdown', 'Develop costume references and detailed breakdown', 8, 10, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Art Department Breakdown', 'Comprehensive art department planning and breakdown', 9, 14, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'HMU References Development', 'Create hair, makeup, and prosthetics references', 10, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Technical Preparation
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 3;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Camera Equipment Planning', 'Plan all camera, lighting, and grip equipment needs', 1, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Special Equipment Testing', 'Test all specialized equipment and create backup plans', 2, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Camera Testing', 'Conduct comprehensive camera tests', 3, 6, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Editing Timeline Planning', 'Plan post-production editing timeline and workflow', 4, 6, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Sound Equipment Planning', 'Plan all on-location sound equipment needs', 5, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'VFX Vendor Identification', 'Identify and evaluate VFX vendors and capabilities', 6, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Rehearsals & Workshops
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 4;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Actor Workshop Planning', 'Plan and coordinate actor workshops and preparation', 1, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Dialect Coach Coordination', 'Arrange dialect coaching if required', 2, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Action Rehearsal Planning', 'Plan and coordinate action sequence rehearsals', 3, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Dance Rehearsal Coordination', 'Coordinate dance and choreography rehearsals', 4, 10, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Specific Talent Rehearsal', 'Arrange specialized talent rehearsals as needed', 5, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Technical Recce with HODs', 'Conduct technical recce with all Heads of Department', 6, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'HOD Script Reading', 'Organize comprehensive script reading with all HODs', 7, 4, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Vendor & Contract Management
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 5;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Vendor Identification & Appointment', 'Identify and appoint all required vendors', 1, 20, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Equipment Vendor Contracts', 'Finalize contracts with camera, lighting, and grip vendors', 2, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Service Vendor Contracts', 'Complete contracts with vanity, sanitation, and craft services', 3, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Vehicle Rental Agreements', 'Finalize all vehicle rental agreements', 4, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Storage Facility Contracts', 'Secure storage room and godown facilities', 5, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Catering Service Agreements', 'Finalize catering service contracts', 6, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Financial & Administrative Setup
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 6;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Final Budget Completion', 'Complete and approve final production budget', 1, 16, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Final Schedule Completion', 'Finalize and distribute production schedule', 2, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Crew Date Blocking', 'Block and confirm all crew availability dates', 3, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Visa Applications', 'Apply for all required visas for cast and crew', 4, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Travel Arrangements', 'Complete all ticketing and travel arrangements', 5, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Local Production Office Setup', 'Establish and equip local production office', 6, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Crew Payment Systems', 'Establish crew payment and payroll systems', 7, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Weekly Accounting Setup', 'Set up weekly accounting and reporting systems', 8, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Production Insurance', 'Secure comprehensive production insurance coverage', 9, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Key Person Insurance', 'Arrange key person insurance for critical personnel', 10, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'E&O Insurance', 'Secure Errors and Omissions insurance coverage', 11, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- =====================================================
    -- Phase 4: Film Production
    -- =====================================================

    -- Phase 4: Film Production
    INSERT INTO template_phases (
        template_id, phase_name, description, phase_order, created_by
    ) VALUES (
        template_uuid, 
        'Film Production',
        'Active production phase covering daily operations, crew coordination, technical execution, and production monitoring.',
        4,
        'c62fdbeb-ee8d-4f24-847f-47a4203e575a'
    ) RETURNING phase_id INTO phase_uuid;

    -- Steps for Film Production
    INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by) VALUES
    (phase_uuid, 'Daily Production Operations', 'Manage day-to-day production activities and crew coordination', 1, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Technical & Creative Coordination', 'Handle technical requirements and creative coordination', 2, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Production Monitoring & Quality Control', 'Monitor production progress and maintain quality standards', 3, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Logistics & Support Services', 'Manage logistics, catering, transport, and support services', 4, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Financial & Administrative Management', 'Handle daily financial operations and administrative tasks', 5, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Safety & Compliance', 'Ensure safety protocols and regulatory compliance', 6, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Daily Production Operations
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 1;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Daily Crew Huddle & Meetings', 'Conduct daily crew meetings and briefings', 1, 2, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Call Sheet Delivery', 'Distribute daily call sheets to all crew members', 2, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Advance Setup & Scheduling', 'Ensure advance setup and maintain production schedule', 3, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Daily Pre-call Meetings', 'Conduct pre-call meetings with department heads', 4, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Daily Post Pack-up Meetings', 'Hold post pack-up meetings to review day and plan ahead', 5, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Advance Scheduling & Planning', 'Continuously update and plan upcoming production days', 6, 3, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Technical & Creative Coordination
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 2;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Camera & Special Equipment Management', 'Coordinate camera and specialized equipment operations', 1, 6, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'On-set VFX Coordination', 'Manage on-set VFX requirements and liaison', 2, 4, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'BTS & Still Photography', 'Coordinate behind-the-scenes and still photography', 3, 2, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Crew & HOD Requirements Fulfillment', 'Ensure all department head and crew requirements are met', 4, 4, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Creative Coordination Between Departments', 'Facilitate creative coordination and communication between departments', 5, 3, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Technical Dry Runs', 'Conduct technical rehearsals and dry runs for complex sequences', 6, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Production Monitoring & Quality Control
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 3;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'On-set Editor Coordination', 'Coordinate with on-set editor for daily footage review', 1, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'DT (Data Transfer) Management', 'Manage data transfer and digital workflow', 2, 3, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'DPR & WPR Reporting', 'Prepare Daily Production Reports and Weekly Production Reports', 3, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Continuity & Junior Supervision', 'Supervise continuity and junior crew members', 4, 4, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, '2nd Unit Schedule Coordination', 'Coordinate and monitor second unit shooting schedule', 5, 3, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Footage Safety & Masters Backup', 'Ensure footage safety and maintain master backups', 6, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Lab Delivery Coordination', 'Coordinate daily footage delivery to processing lab', 7, 1, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Dailies & Workflow Transportation', 'Manage transportation of dailies and workflow materials', 8, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Inventory Management', 'Track and manage all equipment and asset inventory', 9, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Schedule & Budget Compliance', 'Monitor adherence to schedule and budget parameters', 10, 3, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Logistics & Support Services
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 4;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'On-set Visits & Base Identification', 'Coordinate on-set visits and identify base locations', 1, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Vanities & Generators Management', 'Ensure vanities and generators are operational', 2, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Daily Catering & Dietary Management', 'Manage daily catering and accommodate dietary preferences', 3, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Crew Sustenance', 'Ensure adequate crew sustenance throughout shooting days', 4, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Daily Transport Planning', 'Plan and coordinate daily transportation for cast and crew', 5, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Talent Security & Bouncers', 'Provide security services for talent as required', 6, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, '2nd Unit Setup & Planning', 'Set up and coordinate second unit shooting operations', 7, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Location Strike Operations', 'Manage location strike and restoration activities', 8, 3, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Financial & Administrative Management
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 5;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Daily Payroll Management', 'Process daily payrolls for crew and talent', 1, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'On-location Bills & Vendor Payments', 'Handle on-location billing and vendor payments', 2, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Waiver Contract Management', 'Manage waiver contracts for locations and extras', 3, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Budget Tracking', 'Continuously track and monitor budget expenditure', 4, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'On-set Audit', 'Conduct regular on-set financial and operational audits', 5, 1, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Marketing Coordination', 'Coordinate any marketing activities during production', 6, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Safety & Compliance
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 6;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'On-set Health & Safety', 'Maintain health and safety standards on set', 1, 2, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Female Crew Safety', 'Ensure specific safety measures for female crew members', 2, 1, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Cultural Test Compliance', 'Maintain compliance with cultural content requirements', 3, 1, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Action & Rehearsal Safety', 'Coordinate safety for action sequences and rehearsals with Action Director', 4, 3, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Set Construction Monitoring', 'Monitor set construction for safety and compliance', 5, 2, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- =====================================================
    -- Phase 5: Post-Production
    -- =====================================================

    -- Phase 5: Post-Production
    INSERT INTO template_phases (
        template_id, phase_name, description, phase_order, created_by
    ) VALUES (
        template_uuid, 
        'Post-Production',
        'Comprehensive post-production phase covering editing, sound, VFX, color correction, and delivery.',
        5,
        'c62fdbeb-ee8d-4f24-847f-47a4203e575a'
    ) RETURNING phase_id INTO phase_uuid;

    -- Steps for Post-Production
    INSERT INTO phase_steps (phase_id, step_name, description, step_order, created_by) VALUES
    (phase_uuid, 'Editorial & Assembly', 'Initial editing and assembly of footage', 1, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Post-Production Planning', 'Plan and coordinate all post-production activities', 2, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Sound Design & Mixing', 'Complete sound design, recording, and mixing', 3, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Visual Effects & Graphics', 'Handle all VFX, CGI, and graphic elements', 4, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Color & Finishing', 'Color correction, grading, and final finishing', 5, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (phase_uuid, 'Delivery & Distribution', 'Prepare and deliver final materials', 6, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Editorial & Assembly
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 1;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Footage Organization & Logging', 'Organize and log all production footage', 1, 24, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Rough Cut Assembly', 'Create initial rough cut assembly', 2, 40, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Director Cut Review', 'Review and refine director cut', 3, 32, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Fine Cut Editing', 'Create fine cut with detailed editing', 4, 48, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Picture Lock', 'Achieve final picture lock', 5, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Post-Production Planning
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 2;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Post-Production Schedule Creation', 'Create detailed post-production schedule', 1, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Vendor Selection & Coordination', 'Select and coordinate post-production vendors', 2, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Budget Allocation & Tracking', 'Allocate and track post-production budget', 3, 6, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Quality Control Standards Setup', 'Establish quality control standards and procedures', 4, 4, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Sound Design & Mixing
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 3;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Sound Design Creation', 'Create comprehensive sound design', 1, 32, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'ADR (Automated Dialogue Replacement)', 'Record and integrate ADR sessions', 2, 16, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Foley Recording', 'Record all foley sound effects', 3, 24, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Music Integration', 'Integrate music score and soundtrack', 4, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Final Mix', 'Create final sound mix', 5, 20, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Sound Mastering', 'Master final sound for delivery formats', 6, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Visual Effects & Graphics
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 4;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'VFX Shot Breakdown', 'Create detailed breakdown of all VFX shots', 1, 16, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'CGI Asset Creation', 'Create all required CGI assets and models', 2, 60, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Compositing', 'Composite VFX elements with live action footage', 3, 48, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Motion Graphics', 'Create titles, credits, and motion graphics', 4, 20, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'VFX Review & Approval', 'Review and approve all VFX shots', 5, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Final VFX Renders', 'Create final high-resolution VFX renders', 6, 24, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Color & Finishing
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 5;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Color Correction', 'Perform primary color correction', 1, 16, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Color Grading', 'Apply creative color grading', 2, 24, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Look Development', 'Develop and refine visual look', 3, 12, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Final Color Review', 'Final review and approval of color work', 4, 8, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Conform & Finishing', 'Final conform and technical finishing', 5, 12, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    -- Tasks for Delivery & Distribution
    SELECT step_id INTO step_uuid FROM phase_steps WHERE phase_id = phase_uuid AND step_order = 6;
    INSERT INTO step_tasks (step_id, task_name, description, task_order, estimated_hours, category, assigned_role_id, created_by) VALUES
    (step_uuid, 'Master Creation', 'Create digital cinema and broadcast masters', 1, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Quality Control Check', 'Perform comprehensive quality control checks', 2, 6, 'monitor', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Deliverables Package', 'Prepare complete deliverables package', 3, 8, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Archive & Backup', 'Create archive and backup copies', 4, 4, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Distribution Preparation', 'Prepare materials for distribution channels', 5, 6, 'execute', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a'),
    (step_uuid, 'Final Delivery', 'Complete final delivery to client/distributor', 6, 4, 'coordinate', NULL, 'c62fdbeb-ee8d-4f24-847f-47a4203e575a');

    RAISE NOTICE 'Mediente Production Services Template created successfully with % phases, comprehensive steps, and detailed tasks', 5;
END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Verify the template was created successfully
SELECT 
    pt.template_name,
    COUNT(DISTINCT tp.phase_id) as phases,
    COUNT(DISTINCT ps.step_id) as steps,
    COUNT(DISTINCT st.task_id) as tasks,
    SUM(st.estimated_hours) as total_estimated_hours
FROM project_templates pt
LEFT JOIN template_phases tp ON pt.template_id = tp.template_id
LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id
LEFT JOIN step_tasks st ON ps.step_id = st.step_id
WHERE pt.template_name = 'Mediente Production Services Complete'
GROUP BY pt.template_id, pt.template_name;

-- Show template hierarchy summary
SELECT 
    pt.template_name,
    tp.phase_name,
    tp.phase_order,
    COUNT(ps.step_id) as step_count,
    COUNT(st.task_id) as task_count
FROM project_templates pt
JOIN template_phases tp ON pt.template_id = tp.template_id
LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id
LEFT JOIN step_tasks st ON ps.step_id = st.step_id
WHERE pt.template_name = 'Mediente Production Services Complete'
GROUP BY pt.template_id, pt.template_name, tp.phase_id, tp.phase_name, tp.phase_order
ORDER BY tp.phase_order;
