-- Migration: Auto-assign lockers on check-in with overlap prevention
CREATE OR REPLACE FUNCTION public.perform_check_in(
  p_employee_id uuid,
  p_room_id uuid,
  p_camp_id uuid,
  p_performed_by uuid,
  p_iqama_number text DEFAULT NULL::text,
  p_passport_number text DEFAULT NULL::text,
  p_food_required boolean DEFAULT true,
  p_check_in_date timestamptz DEFAULT NULL::timestamptz
)
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
  -- Locker auto-assignment variables
  v_locker_id uuid;
  v_room_num text;
  v_bld_id uuid;
  v_cap integer;
  i integer;
BEGIN
  -- 1. Validate room capacity
  SELECT current_occupancy, max_capacity INTO v_current_occupancy, v_max_capacity
  FROM public.rooms WHERE id = p_room_id;
  IF v_current_occupancy >= v_max_capacity THEN
    RAISE EXCEPTION 'Room is at full capacity';
  END IF;

  -- 2. Validate employee is not already checked in
  SELECT MAX(ci.check_in_date) INTO v_latest_checkin FROM public.check_ins ci WHERE ci.employee_id = p_employee_id;
  SELECT MAX(co.check_out_date) INTO v_latest_checkout FROM public.check_outs co WHERE co.employee_id = p_employee_id;
  IF v_latest_checkin IS NOT NULL AND (v_latest_checkout IS NULL OR v_latest_checkin > v_latest_checkout) THEN
    RAISE EXCEPTION 'Employee is already checked in to another room. Check out first.';
  END IF;

  -- 3. Record check-in
  INSERT INTO public.check_ins (employee_id, room_id, camp_id, performed_by, iqama_number, passport_number, food_required, check_in_date)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_iqama_number, p_passport_number, p_food_required, COALESCE(p_check_in_date, now()))
  RETURNING id INTO v_check_in_id;

  -- 4. Update employee documents if provided
  IF p_iqama_number IS NOT NULL THEN UPDATE public.employees SET iqama_number = p_iqama_number WHERE id = p_employee_id; END IF;
  IF p_passport_number IS NOT NULL THEN UPDATE public.employees SET passport_number = p_passport_number WHERE id = p_employee_id; END IF;

  -- 5. Status log entry
  INSERT INTO public.employee_status_log (employee_id, from_status, to_status, effective_from, reason, changed_by)
  VALUES (p_employee_id, NULL, 'active', COALESCE(p_check_in_date::date, CURRENT_DATE), 'Check-in', p_performed_by);

  -- 6. Update room occupancy
  UPDATE public.rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE WHEN current_occupancy + 1 >= max_capacity THEN 'occupied'::room_status ELSE 'partially_occupied'::room_status END
  WHERE id = p_room_id;

  -- 7. Auto-allocate an available locker in this room (concurrency and overlap safe)
  BEGIN
    -- Only assign if employee does not already hold an active locker
    IF NOT EXISTS (
      SELECT 1 FROM public.inmate_locker_assignments
      WHERE employee_id = p_employee_id AND status = 'active'
    ) THEN
      -- If room has 0 lockers created yet, auto-provision lockers up to room capacity
      IF NOT EXISTS (SELECT 1 FROM public.camp_lockers WHERE room_id = p_room_id) THEN
        SELECT room_number, building_id, COALESCE(max_capacity, 4)
        INTO v_room_num, v_bld_id, v_cap
        FROM public.rooms WHERE id = p_room_id;

        v_cap := LEAST(GREATEST(COALESCE(v_cap, 4), 1), 8);
        FOR i IN 1..v_cap LOOP
          INSERT INTO public.camp_lockers (camp_id, building_id, room_id, locker_number, key_number, status, condition)
          VALUES (p_camp_id, v_bld_id, p_room_id, 'LCK-' || v_room_num || '-' || i, 'K-' || v_room_num || '-' || i, 'available', 'good')
          ON CONFLICT (camp_id, locker_number) DO NOTHING;
        END LOOP;
      END IF;

      -- Select an available locker in this room with row lock, skipping any concurrently locked lockers
      SELECT id INTO v_locker_id
      FROM public.camp_lockers
      WHERE room_id = p_room_id AND status = 'available'
      ORDER BY locker_number ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      -- If room lockers are full, fallback to available common lockers in the camp
      IF v_locker_id IS NULL THEN
        SELECT id INTO v_locker_id
        FROM public.camp_lockers
        WHERE camp_id = p_camp_id AND status = 'available'
        ORDER BY locker_number ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      END IF;

      -- If an available locker was found, mark it assigned and record assignment
      IF v_locker_id IS NOT NULL THEN
        UPDATE public.camp_lockers
        SET status = 'assigned', updated_at = now()
        WHERE id = v_locker_id;

        INSERT INTO public.inmate_locker_assignments (
          locker_id, employee_id, camp_id, room_id, assigned_date, status, key_issued, key_returned, notes
        ) VALUES (
          v_locker_id, p_employee_id, p_camp_id, p_room_id, COALESCE(p_check_in_date::date, CURRENT_DATE), 'active', true, false, 'Auto-assigned on check-in'
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If locker assignment encounters an edge case, log notice and let check-in succeed safely
    RAISE NOTICE 'Auto locker assignment error: %', SQLERRM;
  END;

  RETURN v_check_in_id;
END $function$;

-- Update permissions
GRANT EXECUTE ON FUNCTION public.perform_check_in(uuid, uuid, uuid, uuid, text, text, boolean, timestamptz) TO PUBLIC;

