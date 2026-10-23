-- 1. Delete duplicate meal_orders headers (keep oldest per employee+cycle)
-- Items will cascade-delete via FK
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id, cycle_id ORDER BY created_at ASC, id ASC) rn
  FROM meal_orders
)
DELETE FROM meal_orders WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE meal_orders DROP CONSTRAINT IF EXISTS meal_orders_employee_cycle_unique;
ALTER TABLE meal_orders ADD CONSTRAINT meal_orders_employee_cycle_unique UNIQUE (employee_id, cycle_id);

-- 3. Dedupe meal_scans (keep earliest scan per employee/date/meal_type)
WITH ranked_scans AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id, meal_date, meal_type ORDER BY scanned_at ASC, id ASC) rn
  FROM meal_scans
)
DELETE FROM meal_scans WHERE id IN (SELECT id FROM ranked_scans WHERE rn > 1);

-- 4. Add unique constraint on scans
ALTER TABLE meal_scans DROP CONSTRAINT IF EXISTS meal_scans_emp_date_type_unique;
ALTER TABLE meal_scans ADD CONSTRAINT meal_scans_emp_date_type_unique UNIQUE (employee_id, meal_date, meal_type);

-- 5. Update seed function to ON CONFLICT DO NOTHING on the new constraint
CREATE OR REPLACE FUNCTION public.seed_meal_orders_window(p_start date DEFAULT (CURRENT_DATE - INTERVAL '14 days')::date, p_end date DEFAULT (CURRENT_DATE + INTERVAL '7 days')::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id uuid;
BEGIN
  SELECT id INTO v_cycle_id FROM meal_order_cycles WHERE name = 'Auto Seed Cycle' LIMIT 1;
  IF v_cycle_id IS NULL THEN
    INSERT INTO meal_order_cycles (name, start_date, end_date, cutoff_time, status)
    VALUES ('Auto Seed Cycle', p_start, p_end, '20:00', 'active')
    RETURNING id INTO v_cycle_id;
  ELSE
    UPDATE meal_order_cycles SET start_date = LEAST(start_date, p_start), end_date = GREATEST(end_date, p_end) WHERE id = v_cycle_id;
  END IF;

  INSERT INTO meal_orders (employee_id, cycle_id, order_date, status)
  SELECT e.id, v_cycle_id, CURRENT_DATE, 'submitted'
  FROM employees e
  WHERE e.status = 'active' AND e.camp_id IS NOT NULL
  ON CONFLICT (employee_id, cycle_id) DO NOTHING;

  INSERT INTO meal_order_items (meal_order_id, meal_date, meal_type, preference)
  SELECT mo.id, d::date, mt,
    CASE WHEN (abs(hashtext(mo.employee_id::text || d::text || mt)) % 100) < 30 THEN 'veg' ELSE 'non_veg' END
  FROM meal_orders mo
  CROSS JOIN generate_series(p_start, p_end, INTERVAL '1 day') d
  CROSS JOIN unnest(ARRAY['breakfast','lunch','dinner']) mt
  WHERE mo.cycle_id = v_cycle_id
  ON CONFLICT (meal_order_id, meal_date, meal_type) DO NOTHING;

  INSERT INTO meal_scans (employee_id, camp_id, meal_date, meal_type, preference, scanned_at, is_ordered, notes)
  SELECT mo.employee_id, e.camp_id, moi.meal_date, moi.meal_type, moi.preference,
    (moi.meal_date::timestamp + 
      CASE moi.meal_type WHEN 'breakfast' THEN INTERVAL '7 hours' WHEN 'lunch' THEN INTERVAL '13 hours' ELSE INTERVAL '20 hours' END
      + (random() * INTERVAL '90 minutes')),
    true, 'Auto-realistic scan'
  FROM meal_order_items moi
  JOIN meal_orders mo ON mo.id = moi.meal_order_id
  JOIN employees e ON e.id = mo.employee_id
  WHERE moi.meal_date BETWEEN p_start AND LEAST(p_end, CURRENT_DATE)
    AND mo.cycle_id = v_cycle_id
    AND (abs(hashtext(mo.employee_id::text || moi.meal_date::text || moi.meal_type)) % 100) >= 10
  ON CONFLICT (employee_id, meal_date, meal_type) DO NOTHING;
END;
$$;