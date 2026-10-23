
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.food_cancel_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.food_cancel_reason AS ENUM (
    'leave','site_transfer','official_duty','off_camp_stay','absent',
    'medical','shift_change','ramadan','resignation','opt_out',
    'suspension','client_meals','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.food_meal_type AS ENUM ('breakfast','lunch','dinner','iftar','suhoor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.food_cancel_source AS ENUM ('manual','auto_checkout','auto_leave','auto_ramadan','auto_shift','bulk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SETTINGS PER CAMP
CREATE TABLE IF NOT EXISTS public.camp_food_cancellation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL UNIQUE,
  approval_levels integer NOT NULL DEFAULT 2 CHECK (approval_levels BETWEEN 1 AND 3),
  cutoff_time time NOT NULL DEFAULT '18:00',
  cutoff_strict boolean NOT NULL DEFAULT false,
  ramadan_mode boolean NOT NULL DEFAULT false,
  ramadan_start date,
  ramadan_end date,
  night_shift_auto_breakfast boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_food_cancellation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_food_cancel_settings" ON public.camp_food_cancellation_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_food_cancel_settings_ins" ON public.camp_food_cancellation_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_manage_food_cancel_settings_upd" ON public.camp_food_cancellation_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE TRIGGER trg_food_cancel_settings_updated
  BEFORE UPDATE ON public.camp_food_cancellation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHIFT ASSIGNMENTS (night-shift tracking)
CREATE TABLE IF NOT EXISTS public.employee_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  shift_type text NOT NULL DEFAULT 'day' CHECK (shift_type IN ('day','night','rotating')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_shifts" ON public.employee_shift_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_manage_shifts_ins" ON public.employee_shift_assignments
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "hr_manage_shifts_upd" ON public.employee_shift_assignments
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE INDEX IF NOT EXISTS idx_shift_employee ON public.employee_shift_assignments(employee_id, effective_from DESC);

-- CANCELLATION REQUESTS
CREATE TABLE IF NOT EXISTS public.food_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  camp_id uuid,
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason food_cancel_reason NOT NULL,
  remarks text,
  status food_cancel_status NOT NULL DEFAULT 'pending',
  source food_cancel_source NOT NULL DEFAULT 'manual',
  approval_levels_required integer NOT NULL DEFAULT 1,
  current_level integer NOT NULL DEFAULT 1,
  level1_approver uuid,
  level1_approved_at timestamptz,
  level2_approver uuid,
  level2_approved_at timestamptz,
  level3_approver uuid,
  level3_approved_at timestamptz,
  rejection_reason text,
  rejected_by uuid,
  rejected_at timestamptz,
  is_late boolean NOT NULL DEFAULT false,
  submitted_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_date >= from_date)
);

ALTER TABLE public.food_cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_food_cancel" ON public.food_cancellation_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_food_cancel" ON public.food_cancellation_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "approver_update_food_cancel" ON public.food_cancellation_requests
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
    OR has_role(auth.uid(), 'hr_admin'::app_role)
    OR submitted_by = auth.uid()
  );

CREATE TRIGGER trg_food_cancel_updated
  BEFORE UPDATE ON public.food_cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_food_cancel_emp_date
  ON public.food_cancellation_requests(employee_id, from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_food_cancel_camp_status
  ON public.food_cancellation_requests(camp_id, status);

-- REQUEST MEAL TYPES
CREATE TABLE IF NOT EXISTS public.food_cancellation_request_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.food_cancellation_requests(id) ON DELETE CASCADE,
  meal_type food_meal_type NOT NULL,
  UNIQUE (request_id, meal_type)
);

ALTER TABLE public.food_cancellation_request_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_food_cancel_meals" ON public.food_cancellation_request_meals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_food_cancel_meals" ON public.food_cancellation_request_meals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "approver_delete_food_cancel_meals" ON public.food_cancellation_request_meals
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

-- SUBMIT FUNCTION
CREATE OR REPLACE FUNCTION public.submit_food_cancellation(
  p_employee_id uuid,
  p_from_date date,
  p_to_date date,
  p_meals food_meal_type[],
  p_reason food_cancel_reason,
  p_remarks text DEFAULT NULL,
  p_source food_cancel_source DEFAULT 'manual',
  p_submitted_by uuid DEFAULT NULL,
  p_force boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_camp_id uuid;
  v_settings RECORD;
  v_levels integer := 1;
  v_late boolean := false;
  v_request_id uuid;
  v_meal food_meal_type;
  v_now timestamptz := now();
  v_cutoff_today timestamptz;
BEGIN
  SELECT camp_id INTO v_camp_id FROM employees WHERE id = p_employee_id;

  SELECT * INTO v_settings FROM camp_food_cancellation_settings WHERE camp_id = v_camp_id;
  IF v_settings.id IS NOT NULL THEN
    v_levels := v_settings.approval_levels;
    v_cutoff_today := (CURRENT_DATE::timestamp + v_settings.cutoff_time)::timestamptz;
    IF p_from_date <= CURRENT_DATE + 1 AND v_now > v_cutoff_today THEN
      v_late := true;
      IF v_settings.cutoff_strict AND NOT p_force AND p_source = 'manual' THEN
        RAISE EXCEPTION 'Cut-off time passed (%). Late requests not allowed for this camp.', v_settings.cutoff_time;
      END IF;
    END IF;
  END IF;

  -- Auto-sources skip approval entirely
  INSERT INTO food_cancellation_requests (
    employee_id, camp_id, from_date, to_date, reason, remarks, source,
    approval_levels_required, current_level, status, is_late, submitted_by,
    level1_approver, level1_approved_at,
    level2_approver, level2_approved_at,
    level3_approver, level3_approved_at
  ) VALUES (
    p_employee_id, v_camp_id, p_from_date, p_to_date, p_reason, p_remarks, p_source,
    v_levels, 1,
    CASE WHEN p_source <> 'manual' THEN 'approved'::food_cancel_status ELSE 'pending'::food_cancel_status END,
    v_late, p_submitted_by,
    CASE WHEN p_source <> 'manual' THEN p_submitted_by END,
    CASE WHEN p_source <> 'manual' THEN v_now END,
    CASE WHEN p_source <> 'manual' THEN p_submitted_by END,
    CASE WHEN p_source <> 'manual' THEN v_now END,
    CASE WHEN p_source <> 'manual' THEN p_submitted_by END,
    CASE WHEN p_source <> 'manual' THEN v_now END
  ) RETURNING id INTO v_request_id;

  FOREACH v_meal IN ARRAY p_meals LOOP
    INSERT INTO food_cancellation_request_meals (request_id, meal_type)
    VALUES (v_request_id, v_meal) ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_request_id;
END $$;

-- APPROVE FUNCTION
CREATE OR REPLACE FUNCTION public.approve_food_cancellation(
  p_request_id uuid,
  p_approver uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_next integer;
BEGIN
  SELECT * INTO v_req FROM food_cancellation_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  v_next := v_req.current_level + 1;

  IF v_req.current_level = 1 THEN
    UPDATE food_cancellation_requests
      SET level1_approver = p_approver, level1_approved_at = now(),
          current_level = v_next,
          status = CASE WHEN v_req.approval_levels_required <= 1 THEN 'approved'::food_cancel_status ELSE 'pending'::food_cancel_status END
      WHERE id = p_request_id;
  ELSIF v_req.current_level = 2 THEN
    UPDATE food_cancellation_requests
      SET level2_approver = p_approver, level2_approved_at = now(),
          current_level = v_next,
          status = CASE WHEN v_req.approval_levels_required <= 2 THEN 'approved'::food_cancel_status ELSE 'pending'::food_cancel_status END
      WHERE id = p_request_id;
  ELSIF v_req.current_level = 3 THEN
    UPDATE food_cancellation_requests
      SET level3_approver = p_approver, level3_approved_at = now(),
          status = 'approved'::food_cancel_status
      WHERE id = p_request_id;
  END IF;
END $$;

-- REJECT FUNCTION
CREATE OR REPLACE FUNCTION public.reject_food_cancellation(
  p_request_id uuid, p_approver uuid, p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE food_cancellation_requests
    SET status = 'rejected', rejected_by = p_approver, rejected_at = now(), rejection_reason = p_reason
    WHERE id = p_request_id AND status = 'pending';
END $$;

-- IS-CANCELLED HELPER
CREATE OR REPLACE FUNCTION public.is_meal_cancelled(
  p_employee_id uuid, p_date date, p_meal food_meal_type
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM food_cancellation_requests r
    JOIN food_cancellation_request_meals m ON m.request_id = r.id
    WHERE r.employee_id = p_employee_id
      AND r.status = 'approved'
      AND p_date BETWEEN r.from_date AND r.to_date
      AND m.meal_type = p_meal
  );
$$;

-- KITCHEN COUNT
CREATE OR REPLACE FUNCTION public.get_kitchen_meal_count(
  p_camp_id uuid, p_date date
) RETURNS TABLE(meal_type text, total_active integer, cancelled integer, net_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(DISTINCT e.id) INTO v_total
  FROM employees e
  JOIN check_ins ci ON ci.employee_id = e.id
  LEFT JOIN check_outs co ON co.employee_id = e.id AND co.check_out_date > ci.check_in_date
  WHERE e.camp_id = p_camp_id
    AND ci.food_required = true
    AND co.id IS NULL
    AND e.presence_status IN ('active','on_site');

  RETURN QUERY
  SELECT m.meal_type::text,
         v_total AS total_active,
         (SELECT COUNT(DISTINCT r.employee_id)::integer
            FROM food_cancellation_requests r
            JOIN food_cancellation_request_meals fm ON fm.request_id = r.id
            WHERE r.camp_id = p_camp_id
              AND r.status = 'approved'
              AND p_date BETWEEN r.from_date AND r.to_date
              AND fm.meal_type = m.meal_type) AS cancelled,
         GREATEST(v_total - (SELECT COUNT(DISTINCT r.employee_id)::integer
            FROM food_cancellation_requests r
            JOIN food_cancellation_request_meals fm ON fm.request_id = r.id
            WHERE r.camp_id = p_camp_id
              AND r.status = 'approved'
              AND p_date BETWEEN r.from_date AND r.to_date
              AND fm.meal_type = m.meal_type), 0) AS net_count
  FROM (VALUES ('breakfast'::food_meal_type),('lunch'),('dinner'),('iftar'),('suhoor')) AS m(meal_type);
END $$;

-- AUTO-CANCEL ON CHECKOUT
CREATE OR REPLACE FUNCTION public.auto_cancel_on_checkout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.submit_food_cancellation(
    NEW.employee_id, NEW.check_out_date::date, (NEW.check_out_date::date + INTERVAL '365 days')::date,
    ARRAY['breakfast','lunch','dinner','iftar','suhoor']::food_meal_type[],
    'resignation'::food_cancel_reason,
    'Auto-cancelled: employee checked out',
    'auto_checkout'::food_cancel_source,
    NEW.performed_by, true
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_cancel_on_checkout ON public.check_outs;
CREATE TRIGGER trg_auto_cancel_on_checkout
  AFTER INSERT ON public.check_outs
  FOR EACH ROW EXECUTE FUNCTION public.auto_cancel_on_checkout();

-- AUTO-CANCEL ON LEAVE STATUS CHANGE
CREATE OR REPLACE FUNCTION public.auto_cancel_on_leave()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.to_status IN ('vacation','away') THEN
    PERFORM public.submit_food_cancellation(
      NEW.employee_id,
      NEW.effective_from,
      COALESCE(NEW.effective_to, NEW.effective_from + INTERVAL '30 days')::date,
      ARRAY['breakfast','lunch','dinner','iftar','suhoor']::food_meal_type[],
      'leave'::food_cancel_reason,
      'Auto-cancelled: status changed to ' || NEW.to_status,
      'auto_leave'::food_cancel_source,
      NEW.changed_by, true
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_cancel_on_leave ON public.employee_status_log;
CREATE TRIGGER trg_auto_cancel_on_leave
  AFTER INSERT ON public.employee_status_log
  FOR EACH ROW EXECUTE FUNCTION public.auto_cancel_on_leave();
