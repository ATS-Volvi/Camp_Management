CREATE OR REPLACE FUNCTION public.perform_check_out(p_employee_id uuid, p_room_id uuid, p_camp_id uuid, p_performed_by uuid, p_assets_returned boolean DEFAULT true, p_damage_remarks text DEFAULT NULL::text, p_clearance_notes text DEFAULT NULL::text, p_is_blacklisted boolean DEFAULT false, p_blacklist_reason text DEFAULT NULL::text, p_feedback text DEFAULT NULL::text, p_feedback_rating integer DEFAULT NULL::integer, p_check_out_date timestamptz DEFAULT NULL::timestamptz)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check_out_id uuid;
BEGIN
  INSERT INTO check_outs (employee_id, room_id, camp_id, performed_by, assets_returned, damage_remarks, clearance_notes, is_blacklisted, blacklist_reason, feedback, feedback_rating, check_out_date)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_assets_returned, p_damage_remarks, p_clearance_notes, p_is_blacklisted, p_blacklist_reason, p_feedback, p_feedback_rating, COALESCE(p_check_out_date, now()))
  RETURNING id INTO v_check_out_id;

  -- Update employee blacklist status
  IF p_is_blacklisted THEN
    UPDATE employees SET is_blacklisted = true WHERE id = p_employee_id;
  END IF;

  UPDATE rooms
  SET current_occupancy = GREATEST(current_occupancy - 1, 0),
      status = CASE
        WHEN GREATEST(current_occupancy - 1, 0) = 0 THEN 'vacant'::room_status
        ELSE 'partially_occupied'::room_status
      END
  WHERE id = p_room_id;

  RETURN v_check_out_id;
END;
$function$