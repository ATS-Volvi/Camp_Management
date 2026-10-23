DROP FUNCTION IF EXISTS public.seed_meal_orders_window(date, date);

INSERT INTO public.meal_scans (employee_id, camp_id, meal_date, meal_type, preference, scanned_at, is_ordered, notes)
SELECT 
  mo.employee_id, e.camp_id, moi.meal_date, moi.meal_type, moi.preference,
  (moi.meal_date::timestamp + 
    CASE moi.meal_type WHEN 'breakfast' THEN INTERVAL '7 hours' WHEN 'lunch' THEN INTERVAL '13 hours' ELSE INTERVAL '20 hours' END
    + (random() * INTERVAL '90 minutes')),
  true, 'Auto-realistic scan'
FROM public.meal_order_items moi
JOIN public.meal_orders mo ON mo.id = moi.meal_order_id
JOIN public.employees e ON e.id = mo.employee_id
WHERE moi.meal_date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE
  AND (abs(hashtext(mo.employee_id::text || moi.meal_date::text || moi.meal_type)) % 100) >= 10
  AND NOT EXISTS (
    SELECT 1 FROM public.meal_scans ms 
    WHERE ms.employee_id = mo.employee_id AND ms.meal_date = moi.meal_date AND ms.meal_type = moi.meal_type
  );

CREATE FUNCTION public.seed_meal_orders_window(p_start date DEFAULT (CURRENT_DATE - INTERVAL '14 days')::date, p_end date DEFAULT (CURRENT_DATE + INTERVAL '7 days')::date)
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
    AND NOT EXISTS (SELECT 1 FROM meal_orders mo WHERE mo.employee_id = e.id AND mo.cycle_id = v_cycle_id);

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
    AND NOT EXISTS (
      SELECT 1 FROM meal_scans ms 
      WHERE ms.employee_id = mo.employee_id AND ms.meal_date = moi.meal_date AND ms.meal_type = moi.meal_type
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_meal_orders_window(date, date) TO authenticated;