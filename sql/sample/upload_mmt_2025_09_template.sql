-- =====================================================
-- UPLOAD MMT_2025_09 TEMPLATE FROM CSV DATA
-- =====================================================
-- This script uploads the Tasks Line Prod template.csv data
-- to create a new template named MMT_2025_09

-- Start transaction to ensure data consistency
BEGIN;

-- Insert the main template
INSERT INTO project_templates (
    template_name, 
    description, 
    created_by
) VALUES (
    'MMT_2025_09',
    'Film Production Template for 2025 - Line Producer Tasks',
    'system'
) RETURNING template_id;

-- Store the template_id for reference
DO $$
DECLARE
    v_template_id UUID;
    v_phase_id UUID;
    v_step_id UUID;
    v_task_id UUID;
    v_phase_order INTEGER := 1;
    v_step_order INTEGER := 1;
    v_task_order INTEGER := 1;
    v_current_phase VARCHAR := '';
    v_current_step VARCHAR := '';
BEGIN
    -- Get the template_id we just created
    SELECT template_id INTO v_template_id 
    FROM project_templates 
    WHERE template_name = 'MMT_2025_09' 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Phase: Pitch
    IF v_current_phase != 'Pitch' THEN
        INSERT INTO template_phases (template_id, phase_name, phase_order, created_by)
        VALUES (v_template_id, 'Pitch', v_phase_order, 'system')
        RETURNING phase_id INTO v_phase_id;
        v_current_phase := 'Pitch';
        v_phase_order := v_phase_order + 1;
        v_step_order := 1;
    END IF;

    -- Step: Pitch
    IF v_current_step != 'Pitch' THEN
        INSERT INTO phase_steps (phase_id, step_name, step_order, created_by)
        VALUES (v_phase_id, 'Pitch', v_step_order, 'system')
        RETURNING step_id INTO v_step_id;
        v_current_step := 'Pitch';
        v_step_order := v_step_order + 1;
    END IF;

    -- Task: Read Script/Review Breakdowns
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Read Script/Review Breakdowns', '', v_task_order,
        1, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Location Pitch Deck for Prod Co
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Location Pitch Deck for Prod Co', 'Use AI in research but double check', v_task_order,
        3, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Phase: Milestone
    IF v_current_phase != 'Milestone' THEN
        INSERT INTO template_phases (template_id, phase_name, phase_order, created_by)
        VALUES (v_template_id, 'Milestone', v_phase_order, 'system')
        RETURNING phase_id INTO v_phase_id;
        v_current_phase := 'Milestone';
        v_phase_order := v_phase_order + 1;
        v_step_order := 1;
    END IF;

    -- Step: Milestone
    IF v_current_step != 'Milestone' THEN
        INSERT INTO phase_steps (phase_id, step_name, step_order, created_by)
        VALUES (v_phase_id, 'Milestone', v_step_order, 'system')
        RETURNING step_id INTO v_step_id;
        v_current_step := 'Milestone';
        v_step_order := v_step_order + 1;
    END IF;

    -- Task: Sign Production Services Agreement
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Sign Production Services Agreement', '', v_task_order,
        7, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Phase: Film Setup
    IF v_current_phase != 'Film Setup' THEN
        INSERT INTO template_phases (template_id, phase_name, phase_order, created_by)
        VALUES (v_template_id, 'Film Setup', v_phase_order, 'system')
        RETURNING phase_id INTO v_phase_id;
        v_current_phase := 'Film Setup';
        v_phase_order := v_phase_order + 1;
        v_step_order := 1;
    END IF;

    -- Step: Film Setup
    IF v_current_step != 'Film Setup' THEN
        INSERT INTO phase_steps (phase_id, step_name, step_order, created_by)
        VALUES (v_phase_id, 'Film Setup', v_step_order, 'system')
        RETURNING step_id INTO v_step_id;
        v_current_step := 'Film Setup';
        v_step_order := v_step_order + 1;
    END IF;

    -- Task: Review Script: Ensure it is production ready
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Review Script: Ensure it is production ready', '', v_task_order,
        4, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Review Script: Cultural Test
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Review Script: Cultural Test', '', v_task_order,
        NULL, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Review Breakdown: Focus on production elements/costs
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Review Breakdown: Focus on production elements/costs', 'Location deck most important', v_task_order,
        3, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Workflow Meeting: Prod Co + Mediente
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Workflow Meeting: Prod Co + Mediente', '', v_task_order,
        1, 'coordinate', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Create Tentative Schedule
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Create Tentative Schedule', '', v_task_order,
        3, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Create Tentative Budget
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Create Tentative Budget', '', v_task_order,
        3, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Hire local fixer
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, checklist_items, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Hire local fixer', 'Checklist: contract/onboard form', v_task_order,
        6, 'execute', '[{"id": "1", "text": "contract/onboard form", "order": 1}]'::jsonb, 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Circulate Location Deck to fixer, get prelim location ref
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Circulate Location Deck to fixer, get prelim location ref', '+ any other specific requirement', v_task_order,
        14, 'coordinate', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Circulate Onboarding Form to recce team
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Circulate Onboarding Form to recce team', '', v_task_order,
        2, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Task: Start Visa process: Collect data, apply
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Start Visa process: Collect data, apply', '', v_task_order,
        7, 'execute', 'system'
    );
    v_task_order := v_task_order + 1;

    -- Phase: Prelim Recce
    IF v_current_phase != 'Prelim Recce' THEN
        INSERT INTO template_phases (template_id, phase_name, phase_order, created_by)
        VALUES (v_template_id, 'Prelim Recce', v_phase_order, 'system')
        RETURNING phase_id INTO v_phase_id;
        v_current_phase := 'Prelim Recce';
        v_phase_order := v_phase_order + 1;
        v_step_order := 1;
    END IF;

    -- Step: Prelim Recce
    IF v_current_step != 'Prelim Recce' THEN
        INSERT INTO phase_steps (phase_id, step_name, step_order, created_by)
        VALUES (v_phase_id, 'Prelim Recce', v_step_order, 'system')
        RETURNING step_id INTO v_step_id;
        v_current_step := 'Prelim Recce';
        v_step_order := v_step_order + 1;
    END IF;

    -- Continue with Prelim Recce tasks...
    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Review prelim locations', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Finalise recce plan - itinerary', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Lock Recce Execution Plan: travel, hotel, meals, local transport', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Book tickets and hotels', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Load forex card', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Mail location recce itinerary to the team', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Check Recce gear - camera, lighting compass etc', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Create One Drive folder to store recce reports/ref. Give access to the team', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    -- Task with comprehensive checklist
    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, checklist_items, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Circulate location evaluation checklist/template', 
        'Checklist should capture: location photos, floorplans, access maps',
        v_task_order, NULL, 'execute', 
        '[
            {"id": "1", "text": "location photos", "order": 1},
            {"id": "2", "text": "floorplans", "order": 2},
            {"id": "3", "text": "access maps", "order": 3},
            {"id": "4", "text": "Assess key issues: noise, permits, electricity, power needs, water", "order": 4},
            {"id": "5", "text": "Safety and Risk Assessment", "order": 5},
            {"id": "6", "text": "Document all restrictions: hours, rules, local sensitivities", "order": 6},
            {"id": "7", "text": "Record access routes, basecamp feasibility, and crew movement options", "order": 7},
            {"id": "8", "text": "Collect per-location cost estimates or permit fees", "order": 8}
        ]'::jsonb, 'system'
    );
    v_task_order := v_task_order + 1;

    -- Milestone task
    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Prelim Recce', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    -- Continue with remaining Prelim Recce tasks...
    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Make note of HOD-Specific Technical Surveys on Shortlisted Locations', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Prepare post-recce Location Report', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'File Recce Expense Report', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Location Review Meeting: Prod Co + Mediente. Lock locations.', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    -- Phase: SPV
    IF v_current_phase != 'SPV' THEN
        INSERT INTO template_phases (template_id, phase_name, phase_order, created_by)
        VALUES (v_template_id, 'SPV', v_phase_order, 'system')
        RETURNING phase_id INTO v_phase_id;
        v_current_phase := 'SPV';
        v_phase_order := v_phase_order + 1;
        v_step_order := 1;
    END IF;

    -- Step: SPV
    IF v_current_step != 'SPV' THEN
        INSERT INTO phase_steps (phase_id, step_name, step_order, created_by)
        VALUES (v_phase_id, 'SPV', v_step_order, 'system')
        RETURNING step_id INTO v_step_id;
        v_current_step := 'SPV';
        v_step_order := v_step_order + 1;
    END IF;

    -- SPV tasks
    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Get chain of Title', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Script Translation', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Set up SPV and incorporate company', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Confirm signatory protocol for SPV bank account', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Open SPV bank account', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Appoint rebate consultant', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Hire Legal and Account team', '', v_task_order, NULL, 'execute', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Submit preliminary rebate application or letter of intent', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'Register SPV/project with rebate authority', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (
        step_id, template_id, task_name, description, task_order, 
        estimated_days, category, created_by
    ) VALUES (
        v_step_id, v_template_id, 'Vet final script to ensure it qualifies for rebate requirements', 
        'Flag and track key scenes essential for rebate eligibility', v_task_order, NULL, 'coordinate', 'system'
    );
    v_task_order := v_task_order + 1;

    INSERT INTO step_tasks (step_id, template_id, task_name, description, task_order, estimated_days, category, created_by)
    VALUES (v_step_id, v_template_id, 'File tax rebate application', '', v_task_order, NULL, 'coordinate', 'system');
    v_task_order := v_task_order + 1;

    RAISE NOTICE 'Successfully created template MMT_2025_09 with % tasks', v_task_order - 1;
END $$;

-- Commit the transaction
COMMIT;

-- Verify the template was created successfully
SELECT 
    pt.template_name,
    pt.description,
    COUNT(DISTINCT tp.phase_id) as phase_count,
    COUNT(DISTINCT ps.step_id) as step_count,
    COUNT(st.task_id) as task_count
FROM project_templates pt
LEFT JOIN template_phases tp ON pt.template_id = tp.template_id
LEFT JOIN phase_steps ps ON tp.phase_id = ps.phase_id
LEFT JOIN step_tasks st ON ps.step_id = st.step_id
WHERE pt.template_name = 'MMT_2025_09'
GROUP BY pt.template_id, pt.template_name, pt.description;

-- Show the template hierarchy
SELECT 
    tp.phase_name,
    ps.step_name,
    st.task_name,
    st.category,
    st.estimated_days,
    st.description
FROM project_templates pt
JOIN template_phases tp ON pt.template_id = tp.template_id
JOIN phase_steps ps ON tp.phase_id = ps.phase_id
JOIN step_tasks st ON ps.step_id = st.step_id
WHERE pt.template_name = 'MMT_2025_09'
ORDER BY tp.phase_order, ps.step_order, st.task_order;
