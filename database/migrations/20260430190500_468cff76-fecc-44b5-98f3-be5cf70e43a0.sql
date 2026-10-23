
-- Function to ensure meal orders exist for all active employees in a date window
CREATE OR REPLACE FUNCTION public.seed_meal_orders_window(
  p_start date DEFAULT (CURRENT_DATE - INTERVAL '14 days')::date,
  p_end   date DEFAULT (CURRENT_DATE + INTERVAL '7 days')::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id uuid;
  v_inserted integer := 0;
BEGIN
  -- Reuse or create a perpetual seeding cycle
  SELECT id INTO v_cycle_id FROM meal_order_cycles WHERE name = 'Auto Seed Cycle' LIMIT 1;
  IF v_cycle_id IS NULL THEN
    INSERT INTO meal_order_cycles (name, start_date, end_date, cutoff_datetime, is_active, camp_id)
    VALUES ('Auto Seed Cycle', p_start, p_end, (p_start::timestamptz - INTERVAL '12 hours'), true, NULL)
    RETURNING id INTO v_cycle_id;
  ELSE
    UPDATE meal_order_cycles
       SET start_date = LEAST(start_date, p_start),
           end_date   = GREATEST(end_date, p_end),
           is_active  = true
     WHERE id = v_cycle_id;
  END IF;

  -- Ensure each active employee has a meal_orders header for this cycle
  INSERT INTO meal_orders (employee_id, cycle_id, status)
  SELECT e.id, v_cycle_id, 'submitted'
    FROM employees e
   WHERE e.status = 'active'
     AND e.camp_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM meal_orders mo
        WHERE mo.employee_id = e.id AND mo.cycle_id = v_cycle_id
     );

  -- Insert missing breakfast/lunch/dinner items for every day in the window
  WITH days AS (
    SELECT generate_series(p_start, p_end, '1 day')::date AS d
  ), meals AS (
    SELECT unnest(ARRAY['breakfast','lunch','dinner']) AS m
  ), to_insert AS (
    SELECT mo.id AS meal_order_id,
           d.d   AS meal_date,
           m.m   AS meal_type,
           CASE WHEN (abs(hashtext(mo.employee_id::text || d.d::text || m.m)) % 10) < 3
                THEN 'veg' ELSE 'non_veg' END AS preference
      FROM meal_orders mo
      CROSS JOIN days d
      CROSS JOIN meals m
     WHERE mo.cycle_id = v_cycle_id
  )
  INSERT INTO meal_order_items (meal_order_id, meal_date, meal_type, preference)
  SELECT ti.meal_order_id, ti.meal_date, ti.meal_type, ti.preference
    FROM to_insert ti
   WHERE NOT EXISTS (
     SELECT 1 FROM meal_order_items moi
      WHERE moi.meal_order_id = ti.meal_order_id
        AND moi.meal_date     = ti.meal_date
        AND moi.meal_type     = ti.meal_type
   );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- Allow authenticated users to invoke
GRANT EXECUTE ON FUNCTION public.seed_meal_orders_window(date, date) TO authenticated, anon;

-- Run it now to backfill the rolling window
SELECT public.seed_meal_orders_window();
