
-- Fix 1: cast enum to text in the checkout report trigger
CREATE OR REPLACE FUNCTION public.generate_checkout_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_emp RECORD;
  v_room RECORD;
  v_camp RECORD;
  v_check_in_date timestamptz;
  v_stay_days integer;
  v_daily_rate numeric;
  v_total_cost numeric;
BEGIN
  SELECT name, employee_id INTO v_emp FROM employees WHERE id = NEW.employee_id;
  SELECT room_number, category INTO v_room FROM rooms WHERE id = NEW.room_id;
  SELECT name INTO v_camp FROM camps WHERE id = NEW.camp_id;

  SELECT check_in_date INTO v_check_in_date
  FROM check_ins
  WHERE employee_id = NEW.employee_id AND room_id = NEW.room_id
  ORDER BY check_in_date DESC
  LIMIT 1;

  v_stay_days := GREATEST(1, EXTRACT(DAY FROM (NEW.check_out_date - COALESCE(v_check_in_date, NEW.check_out_date)))::integer);

  SELECT COALESCE(daily_rate, 0) INTO v_daily_rate
  FROM camp_room_rates
  WHERE camp_id = NEW.camp_id AND room_category = v_room.category::text
  LIMIT 1;

  IF v_daily_rate IS NULL THEN v_daily_rate := 0; END IF;
  v_total_cost := v_stay_days * v_daily_rate;

  INSERT INTO checkout_reports (
    check_out_id, employee_id, employee_name, employee_id_code,
    room_number, room_category, camp_name, camp_id,
    check_in_date, check_out_date, stay_days, daily_rate, total_cost,
    assets_returned, clearance_notes, damage_remarks,
    feedback, feedback_rating, is_blacklisted, blacklist_reason,
    report_data
  ) VALUES (
    NEW.id, NEW.employee_id, COALESCE(v_emp.name, 'Unknown'), COALESCE(v_emp.employee_id, '—'),
    COALESCE(v_room.room_number, '—'), v_room.category::text, COALESCE(v_camp.name, '—'), NEW.camp_id,
    v_check_in_date, NEW.check_out_date, v_stay_days, v_daily_rate, v_total_cost,
    NEW.assets_returned, NEW.clearance_notes, NEW.damage_remarks,
    NEW.feedback, NEW.feedback_rating, NEW.is_blacklisted, NEW.blacklist_reason,
    jsonb_build_object('performed_by', NEW.performed_by, 'generated_at', now())
  );

  RETURN NEW;
END;
$function$;

-- Fix 2: synthesize check_outs for duplicate active check-ins
WITH ranked AS (
  SELECT
    ci.id, ci.employee_id, ci.room_id, ci.camp_id, ci.check_in_date,
    ROW_NUMBER() OVER (PARTITION BY ci.employee_id ORDER BY ci.check_in_date DESC) AS rn,
    (SELECT MAX(co.check_out_date) FROM check_outs co WHERE co.employee_id = ci.employee_id) AS last_out
  FROM check_ins ci
),
active_dupes AS (
  SELECT * FROM ranked
  WHERE (last_out IS NULL OR check_in_date > last_out) AND rn > 1
)
INSERT INTO check_outs (employee_id, room_id, camp_id, check_out_date, clearance_notes)
SELECT employee_id, room_id, camp_id, now(), 'Auto-closed: duplicate active check-in cleanup'
FROM active_dupes;

-- Fix 3: resync room occupancy
UPDATE rooms r
SET current_occupancy = COALESCE(apr.cnt, 0),
    status = CASE
      WHEN COALESCE(apr.cnt, 0) = 0 THEN 'vacant'::room_status
      WHEN COALESCE(apr.cnt, 0) >= r.max_capacity THEN 'occupied'::room_status
      ELSE 'partially_occupied'::room_status
    END
FROM (
  SELECT r2.id AS room_id,
    (SELECT COUNT(DISTINCT ci.employee_id)
     FROM check_ins ci
     WHERE ci.room_id = r2.id
       AND NOT EXISTS (
         SELECT 1 FROM check_outs co
         WHERE co.employee_id = ci.employee_id
           AND co.room_id = ci.room_id
           AND co.check_out_date > ci.check_in_date
       )
    ) AS cnt
  FROM rooms r2
) apr
WHERE r.id = apr.room_id;
