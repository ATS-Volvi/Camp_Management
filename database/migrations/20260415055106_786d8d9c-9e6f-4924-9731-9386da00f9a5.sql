
-- 1. Create checkout_reports table
CREATE TABLE public.checkout_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_out_id uuid NOT NULL REFERENCES public.check_outs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  employee_name text NOT NULL,
  employee_id_code text NOT NULL,
  room_number text NOT NULL,
  room_category text,
  camp_name text NOT NULL,
  camp_id uuid NOT NULL REFERENCES public.camps(id),
  check_in_date timestamptz,
  check_out_date timestamptz NOT NULL DEFAULT now(),
  stay_days integer DEFAULT 0,
  daily_rate numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  assets_returned boolean DEFAULT true,
  clearance_notes text,
  damage_remarks text,
  feedback text,
  feedback_rating integer,
  is_blacklisted boolean DEFAULT false,
  blacklist_reason text,
  report_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read checkout_reports"
ON public.checkout_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert checkout_reports"
ON public.checkout_reports FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Create trigger function for auto-generating checkout reports
CREATE OR REPLACE FUNCTION public.generate_checkout_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD;
  v_room RECORD;
  v_camp RECORD;
  v_check_in_date timestamptz;
  v_stay_days integer;
  v_daily_rate numeric;
  v_total_cost numeric;
BEGIN
  -- Get employee details
  SELECT name, employee_id INTO v_emp FROM employees WHERE id = NEW.employee_id;

  -- Get room details
  SELECT room_number, category INTO v_room FROM rooms WHERE id = NEW.room_id;

  -- Get camp details
  SELECT name INTO v_camp FROM camps WHERE id = NEW.camp_id;

  -- Get latest check-in date for this employee in this room
  SELECT check_in_date INTO v_check_in_date
  FROM check_ins
  WHERE employee_id = NEW.employee_id AND room_id = NEW.room_id
  ORDER BY check_in_date DESC
  LIMIT 1;

  -- Calculate stay duration
  v_stay_days := GREATEST(1, EXTRACT(DAY FROM (NEW.check_out_date - COALESCE(v_check_in_date, NEW.check_out_date)))::integer);

  -- Get daily rate
  SELECT COALESCE(daily_rate, 0) INTO v_daily_rate
  FROM camp_room_rates
  WHERE camp_id = NEW.camp_id AND room_category = v_room.category
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
    COALESCE(v_room.room_number, '—'), v_room.category, COALESCE(v_camp.name, '—'), NEW.camp_id,
    v_check_in_date, NEW.check_out_date, v_stay_days, v_daily_rate, v_total_cost,
    NEW.assets_returned, NEW.clearance_notes, NEW.damage_remarks,
    NEW.feedback, NEW.feedback_rating, NEW.is_blacklisted, NEW.blacklist_reason,
    jsonb_build_object(
      'performed_by', NEW.performed_by,
      'generated_at', now()
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checkout_generate_report
AFTER INSERT ON public.check_outs
FOR EACH ROW
EXECUTE FUNCTION public.generate_checkout_report();

-- 3. Fix perform_check_in to prevent duplicate active check-ins
CREATE OR REPLACE FUNCTION public.perform_check_in(
  p_employee_id uuid, p_room_id uuid, p_camp_id uuid, p_performed_by uuid,
  p_iqama_number text DEFAULT NULL, p_passport_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_in_id uuid;
  v_current_occupancy integer;
  v_max_capacity integer;
  v_latest_checkin timestamptz;
  v_latest_checkout timestamptz;
BEGIN
  -- Check room capacity
  SELECT current_occupancy, max_capacity INTO v_current_occupancy, v_max_capacity
  FROM rooms WHERE id = p_room_id;

  IF v_current_occupancy >= v_max_capacity THEN
    RAISE EXCEPTION 'Room is at full capacity';
  END IF;

  -- Prevent duplicate: check if employee is already actively checked in to this room
  SELECT MAX(check_in_date) INTO v_latest_checkin
  FROM check_ins WHERE employee_id = p_employee_id AND room_id = p_room_id;

  SELECT MAX(check_out_date) INTO v_latest_checkout
  FROM check_outs WHERE employee_id = p_employee_id AND room_id = p_room_id;

  IF v_latest_checkin IS NOT NULL AND (v_latest_checkout IS NULL OR v_latest_checkin > v_latest_checkout) THEN
    RAISE EXCEPTION 'Employee is already checked in to this room';
  END IF;

  -- Also prevent check-in if employee is actively in ANY room
  SELECT MAX(ci.check_in_date) INTO v_latest_checkin
  FROM check_ins ci WHERE ci.employee_id = p_employee_id;

  SELECT MAX(co.check_out_date) INTO v_latest_checkout
  FROM check_outs co WHERE co.employee_id = p_employee_id;

  IF v_latest_checkin IS NOT NULL AND (v_latest_checkout IS NULL OR v_latest_checkin > v_latest_checkout) THEN
    RAISE EXCEPTION 'Employee is already checked in to another room. Check out first.';
  END IF;

  INSERT INTO check_ins (employee_id, room_id, camp_id, performed_by, iqama_number, passport_number)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_iqama_number, p_passport_number)
  RETURNING id INTO v_check_in_id;

  -- Update employee iqama/passport if provided
  IF p_iqama_number IS NOT NULL THEN
    UPDATE employees SET iqama_number = p_iqama_number WHERE id = p_employee_id;
  END IF;
  IF p_passport_number IS NOT NULL THEN
    UPDATE employees SET passport_number = p_passport_number WHERE id = p_employee_id;
  END IF;

  UPDATE rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE
        WHEN current_occupancy + 1 >= max_capacity THEN 'occupied'::room_status
        ELSE 'partially_occupied'::room_status
      END
  WHERE id = p_room_id;

  RETURN v_check_in_id;
END;
$$;

-- 4. Fix room A-101 occupancy to correct value (3 actual occupants)
UPDATE rooms SET current_occupancy = 3, status = 'partially_occupied'::room_status
WHERE id = '8aef725a-7851-44d0-8523-7edce5f39e8f';
