-- Fix for task reordering issues
-- This migration updates the reorder_template_items function to properly handle JSONB and fixes negative task orders

-- Drop old function if it exists with JSON parameter
DROP FUNCTION IF EXISTS reorder_template_items(UUID, VARCHAR, JSON);

-- Updated function to reorder items within a parent
CREATE OR REPLACE FUNCTION reorder_template_items(
    parent_id UUID,
    item_type VARCHAR,
    item_orders JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    item RECORD;
    max_safe_order INTEGER := 999999;
BEGIN
    -- Create a temporary mapping table to avoid unique constraint issues
    CREATE TEMP TABLE IF NOT EXISTS temp_reorder_map (
        item_id UUID,
        old_order INTEGER,
        new_order INTEGER,
        temp_order INTEGER
    ) ON COMMIT DROP;
    
    -- Clear any previous data
    DELETE FROM temp_reorder_map WHERE TRUE;

    IF item_type = 'tasks' THEN
        -- Check if parent_id is a template_id or step_id
        DECLARE
            is_template_level BOOLEAN;
        BEGIN
            -- Check if parent_id exists in project_templates
            SELECT EXISTS(SELECT 1 FROM project_templates WHERE template_id = parent_id) INTO is_template_level;
            
            -- Populate mapping table with current data
            FOR item IN SELECT * FROM jsonb_array_elements(item_orders) LOOP
                INSERT INTO temp_reorder_map (item_id, new_order)
                VALUES (
                    (item.value->>'id')::UUID,
                    (item.value->>'order')::INTEGER
                );
            END LOOP;

            -- Generate safe temporary orders using a separate query
            WITH numbered_rows AS (
                SELECT item_id, max_safe_order + row_number() OVER (ORDER BY item_id) AS temp_order_val
                FROM temp_reorder_map
            )
            UPDATE temp_reorder_map 
            SET temp_order = numbered_rows.temp_order_val
            FROM numbered_rows
            WHERE temp_reorder_map.item_id = numbered_rows.item_id;

            -- Step 1: Set temporary orders to avoid conflicts
            FOR item IN SELECT item_id, temp_order FROM temp_reorder_map LOOP
                IF is_template_level THEN
                    UPDATE step_tasks
                    SET task_order = item.temp_order,
                        updated_at = NOW()
                    WHERE task_id = item.item_id
                    AND template_id = parent_id;
                ELSE
                    UPDATE step_tasks
                    SET task_order = item.temp_order,
                        updated_at = NOW()
                    WHERE task_id = item.item_id
                    AND step_id = parent_id;
                END IF;
            END LOOP;

            -- Step 2: Set final orders
            FOR item IN SELECT item_id, new_order FROM temp_reorder_map LOOP
                IF is_template_level THEN
                    UPDATE step_tasks
                    SET task_order = item.new_order,
                        updated_at = NOW()
                    WHERE task_id = item.item_id
                    AND template_id = parent_id;
                ELSE
                    UPDATE step_tasks
                    SET task_order = item.new_order,
                        updated_at = NOW()
                    WHERE task_id = item.item_id
                    AND step_id = parent_id;
                END IF;
            END LOOP;
        END;
    ELSE
        -- Handle phases and steps with safer approach
        FOR item IN SELECT * FROM jsonb_array_elements(item_orders) LOOP
            CASE item_type
                WHEN 'phases' THEN
                    UPDATE template_phases
                    SET phase_order = (item.value->>'order')::INTEGER,
                        updated_at = NOW()
                    WHERE phase_id = (item.value->>'id')::UUID
                    AND template_id = parent_id;
                    
                WHEN 'steps' THEN
                    UPDATE phase_steps
                    SET step_order = (item.value->>'order')::INTEGER,
                        updated_at = NOW()
                    WHERE step_id = (item.value->>'id')::UUID
                    AND phase_id = parent_id;
            END CASE;
        END LOOP;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to fix any negative task orders in the database
CREATE OR REPLACE FUNCTION fix_negative_task_orders()
RETURNS INTEGER AS $$
DECLARE
    template_record RECORD;
    task_record RECORD;
    fixed_count INTEGER := 0;
    new_order INTEGER;
BEGIN
    -- Loop through each template to fix negative orders
    FOR template_record IN 
        SELECT DISTINCT template_id 
        FROM step_tasks 
        WHERE task_order < 0 AND template_id IS NOT NULL
    LOOP
        new_order := 1;
        
        -- Get all tasks for this template ordered by current order (ignoring negatives)
        -- and reassign positive sequential orders
        FOR task_record IN
            SELECT task_id, task_order
            FROM step_tasks
            WHERE template_id = template_record.template_id
            ORDER BY 
                CASE WHEN task_order < 0 THEN 999999 + task_order ELSE task_order END,
                created_at,
                task_id
        LOOP
            IF task_record.task_order < 0 THEN
                UPDATE step_tasks
                SET task_order = new_order
                WHERE task_id = task_record.task_id;
                
                fixed_count := fixed_count + 1;
            END IF;
            
            new_order := new_order + 1;
        END LOOP;
    END LOOP;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- Run the cleanup function to fix any existing negative orders
SELECT fix_negative_task_orders();
