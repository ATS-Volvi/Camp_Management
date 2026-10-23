
CREATE OR REPLACE FUNCTION public.perform_check_in(
  p_employee_id uuid,
  p_room_id uuid,
  p_camp_id uuid,
  p_performed_by uuid
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
BEGIN
  SELECT current_occupancy, max_capacity INTO v_current_occupancy, v_max_capacity
  FROM rooms WHERE id = p_room_id;

  IF v_current_occupancy >= v_max_capacity THEN
    RAISE EXCEPTION 'Room is at full capacity';
  END IF;

  INSERT INTO check_ins (employee_id, room_id, camp_id, performed_by)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by)
  RETURNING id INTO v_check_in_id;

  UPDATE rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE
        WHEN current_occupancy + 1 >= max_capacity THEN 'occupied'::room_status
        ELSE 'occupied'::room_status
      END
  WHERE id = p_room_id;

  RETURN v_check_in_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_check_out(
  p_employee_id uuid,
  p_room_id uuid,
  p_camp_id uuid,
  p_performed_by uuid,
  p_assets_returned boolean DEFAULT true,
  p_damage_remarks text DEFAULT null,
  p_clearance_notes text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_out_id uuid;
BEGIN
  INSERT INTO check_outs (employee_id, room_id, camp_id, performed_by, assets_returned, damage_remarks, clearance_notes)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_assets_returned, p_damage_remarks, p_clearance_notes)
  RETURNING id INTO v_check_out_id;

  UPDATE rooms
  SET current_occupancy = GREATEST(current_occupancy - 1, 0),
      status = CASE
        WHEN GREATEST(current_occupancy - 1, 0) = 0 THEN 'vacant'::room_status
        ELSE 'occupied'::room_status
      END
  WHERE id = p_room_id;

  RETURN v_check_out_id;
END;
$$;
