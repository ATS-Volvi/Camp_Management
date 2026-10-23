CREATE OR REPLACE FUNCTION public.perform_check_in(p_employee_id uuid, p_room_id uuid, p_camp_id uuid, p_performed_by uuid, p_iqama_number text DEFAULT NULL::text, p_passport_number text DEFAULT NULL::text, p_food_required boolean DEFAULT true, p_check_in_date timestamptz DEFAULT NULL::timestamptz)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check_in_id uuid;
  v_current_occupancy integer;
  v_max_capacity integer;
  v_latest_checkin timestamptz;
  v_latest_checkout timestamptz;
BEGIN
  SELECT current_occupancy, max_capacity INTO v_current_occupancy, v_max_capacity
  FROM rooms WHERE id = p_room_id;
  IF v_current_occupancy >= v_max_capacity THEN
    RAISE EXCEPTION 'Room is at full capacity';
  END IF;

  SELECT MAX(ci.check_in_date) INTO v_latest_checkin FROM check_ins ci WHERE ci.employee_id = p_employee_id;
  SELECT MAX(co.check_out_date) INTO v_latest_checkout FROM check_outs co WHERE co.employee_id = p_employee_id;
  IF v_latest_checkin IS NOT NULL AND (v_latest_checkout IS NULL OR v_latest_checkin > v_latest_checkout) THEN
    RAISE EXCEPTION 'Employee is already checked in to another room. Check out first.';
  END IF;

  INSERT INTO check_ins (employee_id, room_id, camp_id, performed_by, iqama_number, passport_number, food_required, check_in_date)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_iqama_number, p_passport_number, p_food_required, COALESCE(p_check_in_date, now()))
  RETURNING id INTO v_check_in_id;

  IF p_iqama_number IS NOT NULL THEN UPDATE employees SET iqama_number = p_iqama_number WHERE id = p_employee_id; END IF;
  IF p_passport_number IS NOT NULL THEN UPDATE employees SET passport_number = p_passport_number WHERE id = p_employee_id; END IF;

  -- seed status log entry on check-in
  INSERT INTO employee_status_log (employee_id, from_status, to_status, effective_from, reason, changed_by)
  VALUES (p_employee_id, NULL, 'active', COALESCE(p_check_in_date::date, CURRENT_DATE), 'Check-in', p_performed_by);

  UPDATE rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE WHEN current_occupancy + 1 >= max_capacity THEN 'occupied'::room_status ELSE 'partially_occupied'::room_status END
  WHERE id = p_room_id;

  RETURN v_check_in_id;
END $function$