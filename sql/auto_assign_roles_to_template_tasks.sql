-- =====================================================
-- AUTO ASSIGN ROLES TO TEMPLATE TASKS
-- =====================================================
-- This script automatically assigns appropriate roles to template tasks
-- based on task names, descriptions, and categories using intelligent matching

-- =====================================================
-- 1. ROLE ASSIGNMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_roles_to_template_tasks(p_template_id UUID DEFAULT NULL)
RETURNS TABLE (
    tasks_updated INTEGER,
    assignments_made INTEGER,
    template_name VARCHAR
) AS $$
DECLARE
    template_record RECORD;
    task_record RECORD;
    matched_role_id UUID;
    total_tasks_updated INTEGER := 0;
    total_assignments INTEGER := 0;
    template_tasks_updated INTEGER;
    template_assignments INTEGER;
BEGIN
    -- If specific template provided, process only that template
    -- Otherwise, process all templates
    FOR template_record IN
        SELECT pt.template_id, pt.template_name
        FROM project_templates pt
        WHERE (p_template_id IS NULL OR pt.template_id = p_template_id)
        AND pt.is_archived = false
    LOOP
        template_tasks_updated := 0;
        template_assignments := 0;
        
        RAISE NOTICE 'Processing template: %', template_record.template_name;
        
        -- Process each task in the template that doesn't have a role assigned
        FOR task_record IN
            SELECT 
                st.task_id,
                st.task_name,
                st.description,
                st.category,
                st.step_id,
                ps.step_name,
                tp.phase_name
            FROM step_tasks st
            INNER JOIN phase_steps ps ON st.step_id = ps.step_id
            INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
            WHERE tp.template_id = template_record.template_id
            AND st.assigned_role_id IS NULL
            AND st.is_archived = false
            ORDER BY tp.phase_order, ps.step_order, st.task_order
        LOOP
            -- Find the best matching role for this task
            SELECT role_id INTO matched_role_id
            FROM (
                -- Production management roles
                SELECT dr.role_id, 100 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE d.department_name = 'Production'
                AND (
                    (task_record.task_name ILIKE '%coordination%' AND dr.role_name ILIKE '%coordinator%') OR
                    (task_record.task_name ILIKE '%schedule%' AND dr.role_name ILIKE '%manager%') OR
                    (task_record.task_name ILIKE '%budget%' AND dr.role_name ILIKE '%producer%') OR
                    (task_record.task_name ILIKE '%director%' AND dr.role_name ILIKE '%director%') OR
                    (task_record.task_name ILIKE '%producer%' AND dr.role_name ILIKE '%producer%') OR
                    (task_record.task_name ILIKE '%assistant director%' AND dr.role_name ILIKE '%assistant director%') OR
                    (task_record.task_name ILIKE '%script%' AND dr.role_name ILIKE '%script%')
                )
                
                UNION ALL
                
                -- Legal and accounting roles
                SELECT dr.role_id, 95 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%legal%' OR task_record.task_name ILIKE '%lawyer%' OR task_record.task_name ILIKE '%agreement%' OR task_record.task_name ILIKE '%contract%') AND
                    (d.department_name = 'Production' AND dr.role_name ILIKE '%producer%')
                ) OR (
                    (task_record.task_name ILIKE '%account%' OR task_record.task_name ILIKE '%budget%' OR task_record.task_name ILIKE '%payment%' OR task_record.task_name ILIKE '%payroll%') AND
                    d.department_name = 'Accounting'
                )
                
                UNION ALL
                
                -- Location management roles
                SELECT dr.role_id, 90 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE d.department_name = 'Locations'
                AND (
                    task_record.task_name ILIKE '%location%' OR
                    task_record.task_name ILIKE '%scout%' OR
                    task_record.task_name ILIKE '%permission%' OR
                    task_record.description ILIKE '%location%'
                )
                
                UNION ALL
                
                -- Crew hiring and casting roles
                SELECT dr.role_id, 85 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%crew%' OR task_record.task_name ILIKE '%hire%' OR task_record.task_name ILIKE '%hod%') AND
                    d.department_name = 'Production' AND dr.role_name ILIKE '%manager%'
                ) OR (
                    (task_record.task_name ILIKE '%cast%' OR task_record.task_name ILIKE '%actor%' OR task_record.task_name ILIKE '%character%') AND
                    d.department_name = 'Casting'
                )
                
                UNION ALL
                
                -- Technical department roles
                SELECT dr.role_id, 80 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%camera%' OR task_record.task_name ILIKE '%cinematographer%' OR task_record.task_name ILIKE '%dp%') AND
                    d.department_name = 'Camera Department'
                ) OR (
                    (task_record.task_name ILIKE '%sound%' OR task_record.task_name ILIKE '%audio%' OR task_record.task_name ILIKE '%boom%') AND
                    d.department_name = 'Sound Department'
                ) OR (
                    (task_record.task_name ILIKE '%lighting%' OR task_record.task_name ILIKE '%gaffer%' OR task_record.task_name ILIKE '%electric%') AND
                    d.department_name = 'Electric'
                ) OR (
                    (task_record.task_name ILIKE '%grip%' OR task_record.task_name ILIKE '%dolly%' OR task_record.task_name ILIKE '%rigging%') AND
                    d.department_name = 'Grip Department'
                )
                
                UNION ALL
                
                -- Art department roles
                SELECT dr.role_id, 75 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE d.department_name = 'Art Department'
                AND (
                    task_record.task_name ILIKE '%art%' OR
                    task_record.task_name ILIKE '%design%' OR
                    task_record.task_name ILIKE '%set%' OR
                    task_record.task_name ILIKE '%production designer%' OR
                    task_record.task_name ILIKE '%storyboard%'
                )
                
                UNION ALL
                
                -- Wardrobe and makeup roles
                SELECT dr.role_id, 70 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%costume%' OR task_record.task_name ILIKE '%wardrobe%' OR task_record.task_name ILIKE '%clothing%') AND
                    d.department_name = 'Wardrobe'
                ) OR (
                    (task_record.task_name ILIKE '%makeup%' OR task_record.task_name ILIKE '%hair%' OR task_record.task_name ILIKE '%hmu%') AND
                    d.department_name = 'Make-Up & Hair'
                )
                
                UNION ALL
                
                -- Transportation and logistics roles
                SELECT dr.role_id, 65 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%transport%' OR task_record.task_name ILIKE '%vehicle%' OR task_record.task_name ILIKE '%driver%') AND
                    d.department_name = 'Transportation'
                ) OR (
                    (task_record.task_name ILIKE '%hotel%' OR task_record.task_name ILIKE '%accommodation%') AND
                    d.department_name = 'Production'
                ) OR (
                    (task_record.task_name ILIKE '%catering%' OR task_record.task_name ILIKE '%food%' OR task_record.task_name ILIKE '%meal%') AND
                    d.department_name = 'Catering'
                )
                
                UNION ALL
                
                -- Post-production roles
                SELECT dr.role_id, 60 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%edit%' OR task_record.task_name ILIKE '%post%' OR task_record.task_name ILIKE '%footage%') AND
                    d.department_name = 'Post Production'
                ) OR (
                    (task_record.task_name ILIKE '%vfx%' OR task_record.task_name ILIKE '%visual effect%' OR task_record.task_name ILIKE '%cgi%') AND
                    d.department_name = 'Visual Effects'
                ) OR (
                    (task_record.task_name ILIKE '%color%' OR task_record.task_name ILIKE '%grade%' OR task_record.task_name ILIKE '%master%') AND
                    d.department_name = 'Post Production'
                )
                
                UNION ALL
                
                -- Special effects and stunts
                SELECT dr.role_id, 55 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE (
                    (task_record.task_name ILIKE '%special effect%' OR task_record.task_name ILIKE '%sfx%' OR task_record.task_name ILIKE '%practical%') AND
                    d.department_name = 'Special Effects'
                ) OR (
                    (task_record.task_name ILIKE '%stunt%' OR task_record.task_name ILIKE '%action%' OR task_record.task_name ILIKE '%safety%') AND
                    d.department_name = 'Stunts'
                )
                
                UNION ALL
                
                -- Generic production roles based on category
                SELECT dr.role_id, 
                    CASE 
                        WHEN task_record.category = 'coordinate' THEN 50
                        WHEN task_record.category = 'execute' THEN 45
                        WHEN task_record.category = 'monitor' THEN 40
                        ELSE 35
                    END as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE d.department_name = 'Production'
                AND (
                    (task_record.category = 'coordinate' AND dr.role_name ILIKE '%coordinator%') OR
                    (task_record.category = 'execute' AND dr.role_name ILIKE '%manager%') OR
                    (task_record.category = 'monitor' AND dr.role_name ILIKE '%supervisor%') OR
                    dr.role_name = 'Production Assistant'
                )
                
                UNION ALL
                
                -- Default fallback roles
                SELECT dr.role_id, 10 as priority
                FROM department_roles dr
                INNER JOIN departments d ON dr.department_id = d.department_id
                WHERE d.department_name = 'Production'
                AND dr.role_name IN ('Production Manager', 'Production Coordinator', 'Production Assistant')
                
            ) role_matches
            ORDER BY priority DESC, role_id
            LIMIT 1;
            
            -- If we found a matching role, assign it
            IF matched_role_id IS NOT NULL THEN
                UPDATE step_tasks 
                SET 
                    assigned_role_id = matched_role_id,
                    updated_by = 'auto_assign_system',
                    updated_at = NOW()
                WHERE task_id = task_record.task_id;
                
                template_assignments := template_assignments + 1;
                
                -- Log the assignment
                RAISE NOTICE 'Assigned role to task: % -> %', 
                    task_record.task_name, 
                    (SELECT dr.role_name FROM department_roles dr WHERE dr.role_id = matched_role_id);
            END IF;
            
            template_tasks_updated := template_tasks_updated + 1;
        END LOOP;
        
        total_tasks_updated := total_tasks_updated + template_tasks_updated;
        total_assignments := total_assignments + template_assignments;
        
        -- Return results for this template
        RETURN QUERY SELECT 
            template_assignments,
            template_tasks_updated, 
            template_record.template_name;
            
        RAISE NOTICE 'Template "%" completed: % assignments made out of % tasks processed', 
            template_record.template_name, template_assignments, template_tasks_updated;
            
    END LOOP;
    
    RAISE NOTICE 'Auto-assignment completed: % total assignments made across % tasks', 
        total_assignments, total_tasks_updated;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. EXECUTE AUTO ASSIGNMENT
-- =====================================================

-- Run the auto assignment for the Mediente Production Services template
DO $$
DECLARE
    result_record RECORD;
    template_uuid UUID;
BEGIN
    -- Get the Mediente template ID
    SELECT template_id INTO template_uuid
    FROM project_templates 
    WHERE template_name = 'Mediente Production Services Complete'
    AND is_archived = false;
    
    IF template_uuid IS NOT NULL THEN
        RAISE NOTICE 'Starting auto role assignment for Mediente Production Services template...';
        
        -- Execute the auto assignment
        FOR result_record IN 
            SELECT * FROM auto_assign_roles_to_template_tasks(template_uuid)
        LOOP
            RAISE NOTICE 'Results: % assignments made for template "%"', 
                result_record.assignments_made, result_record.template_name;
        END LOOP;
    ELSE
        RAISE NOTICE 'Mediente Production Services template not found';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFICATION QUERIES
-- =====================================================

-- Show assignment statistics
SELECT 
    'Assignment Statistics' as report_type,
    COUNT(*) as total_tasks,
    COUNT(assigned_role_id) as assigned_tasks,
    COUNT(*) - COUNT(assigned_role_id) as unassigned_tasks,
    ROUND(COUNT(assigned_role_id)::numeric / COUNT(*)::numeric * 100, 2) as assignment_percentage
FROM step_tasks st
INNER JOIN phase_steps ps ON st.step_id = ps.step_id
INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
INNER JOIN project_templates pt ON tp.template_id = pt.template_id
WHERE pt.template_name = 'Mediente Production Services Complete'
AND st.is_archived = false;

-- Show role distribution
SELECT 
    d.department_name,
    dr.role_name,
    COUNT(*) as task_count,
    ROUND(COUNT(*)::numeric / (
        SELECT COUNT(*) 
        FROM step_tasks st2
        INNER JOIN phase_steps ps2 ON st2.step_id = ps2.step_id
        INNER JOIN template_phases tp2 ON ps2.phase_id = tp2.phase_id
        INNER JOIN project_templates pt2 ON tp2.template_id = pt2.template_id
        WHERE pt2.template_name = 'Mediente Production Services Complete'
        AND st2.assigned_role_id IS NOT NULL
        AND st2.is_archived = false
    )::numeric * 100, 2) as percentage
FROM step_tasks st
INNER JOIN phase_steps ps ON st.step_id = ps.step_id
INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
INNER JOIN project_templates pt ON tp.template_id = pt.template_id
INNER JOIN department_roles dr ON st.assigned_role_id = dr.role_id
INNER JOIN departments d ON dr.department_id = d.department_id
WHERE pt.template_name = 'Mediente Production Services Complete'
AND st.is_archived = false
GROUP BY d.department_name, dr.role_name
ORDER BY task_count DESC, d.department_name, dr.role_name;

-- Show tasks by phase with role assignments
SELECT 
    tp.phase_name,
    ps.step_name,
    st.task_name,
    st.category,
    COALESCE(d.department_name, 'Unassigned') as department,
    COALESCE(dr.role_name, 'No Role Assigned') as role_name
FROM step_tasks st
INNER JOIN phase_steps ps ON st.step_id = ps.step_id
INNER JOIN template_phases tp ON ps.phase_id = tp.phase_id
INNER JOIN project_templates pt ON tp.template_id = pt.template_id
LEFT JOIN department_roles dr ON st.assigned_role_id = dr.role_id
LEFT JOIN departments d ON dr.department_id = d.department_id
WHERE pt.template_name = 'Mediente Production Services Complete'
AND st.is_archived = false
ORDER BY tp.phase_order, ps.step_order, st.task_order;

-- =====================================================
-- 4. SUCCESS MESSAGE
-- =====================================================

SELECT 
    'Auto Role Assignment Completed!' as status,
    'Roles have been automatically assigned to template tasks based on intelligent matching' as message,
    'Use the verification queries above to review the assignments' as next_steps;
