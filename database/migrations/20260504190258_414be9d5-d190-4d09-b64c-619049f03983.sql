-- 1. Add food_required to check_ins
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS food_required boolean NOT NULL DEFAULT true;

-- 2. Add presence_status to employees
DO $$ BEGIN
  CREATE TYPE public.presence_status AS ENUM ('active','on_site','vacation','away');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS presence_status public.presence_status NOT NULL DEFAULT 'active';

-- 3. Status change log
CREATE TABLE IF NOT EXISTS public.employee_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  from_status public.presence_status,
  to_status public.presence_status NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_status_log_emp ON public.employee_status_log(employee_id, effective_from DESC);

ALTER TABLE public.employee_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_status_log" ON public.employee_status_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hr_insert_status_log" ON public.employee_status_log
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
    OR has_role(auth.uid(), 'hr_admin'::app_role)
  );

CREATE POLICY "hr_update_status_log" ON public.employee_status_log
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
    OR has_role(auth.uid(), 'hr_admin'::app_role)
  );

-- 4. Helper: count food-billable days in a date range for an employee
CREATE OR REPLACE FUNCTION public.get_food_billable_days(
  p_employee_id uuid,
  p_from date,
  p_to date
) RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_days integer := 0;
  v_food_required boolean;
  d date;
  v_status public.presence_status;
BEGIN
  -- Check if active stay has food_required
  SELECT food_required INTO v_food_required
  FROM check_ins
  WHERE employee_id = p_employee_id
  ORDER BY check_in_date DESC
  LIMIT 1;

  IF NOT COALESCE(v_food_required, false) THEN
    RETURN 0;
  END IF;

  FOR d IN SELECT generate_series(p_from, p_to, '1 day'::interval)::date LOOP
    SELECT to_status INTO v_status
    FROM employee_status_log
    WHERE employee_id = p_employee_id
      AND effective_from <= d
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_status IS NULL THEN v_status := 'active'; END IF;

    IF v_status IN ('active','on_site') THEN
      v_days := v_days + 1;
    END IF;
  END LOOP;

  RETURN v_days;
END $$;

-- 5. Update perform_check_in to accept food_required
CREATE OR REPLACE FUNCTION public.perform_check_in(
  p_employee_id uuid, p_room_id uuid, p_camp_id uuid, p_performed_by uuid,
  p_iqama_number text DEFAULT NULL, p_passport_number text DEFAULT NULL,
  p_food_required boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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

  INSERT INTO check_ins (employee_id, room_id, camp_id, performed_by, iqama_number, passport_number, food_required)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_iqama_number, p_passport_number, p_food_required)
  RETURNING id INTO v_check_in_id;

  IF p_iqama_number IS NOT NULL THEN UPDATE employees SET iqama_number = p_iqama_number WHERE id = p_employee_id; END IF;
  IF p_passport_number IS NOT NULL THEN UPDATE employees SET passport_number = p_passport_number WHERE id = p_employee_id; END IF;

  -- seed status log entry on check-in
  INSERT INTO employee_status_log (employee_id, from_status, to_status, effective_from, reason, changed_by)
  VALUES (p_employee_id, NULL, 'active', CURRENT_DATE, 'Check-in', p_performed_by);

  UPDATE rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE WHEN current_occupancy + 1 >= max_capacity THEN 'occupied'::room_status ELSE 'partially_occupied'::room_status END
  WHERE id = p_room_id;

  RETURN v_check_in_id;
END $$;

-- 6. RPC to change presence status
CREATE OR REPLACE FUNCTION public.change_presence_status(
  p_employee_id uuid,
  p_new_status public.presence_status,
  p_reason text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old public.presence_status;
  v_log_id uuid;
BEGIN
  SELECT presence_status INTO v_old FROM employees WHERE id = p_employee_id;

  -- close previous open log
  UPDATE employee_status_log
  SET effective_to = CURRENT_DATE - 1
  WHERE employee_id = p_employee_id AND effective_to IS NULL;

  INSERT INTO employee_status_log (employee_id, from_status, to_status, effective_from, reason, changed_by)
  VALUES (p_employee_id, v_old, p_new_status, CURRENT_DATE, p_reason, p_changed_by)
  RETURNING id INTO v_log_id;

  UPDATE employees SET presence_status = p_new_status WHERE id = p_employee_id;

  RETURN v_log_id;
END $$;