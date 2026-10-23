
-- Add iqama_number to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS iqama_number text;

-- Add blacklist and feedback fields to check_outs
ALTER TABLE public.check_outs ADD COLUMN IF NOT EXISTS is_blacklisted boolean DEFAULT false;
ALTER TABLE public.check_outs ADD COLUMN IF NOT EXISTS blacklist_reason text;
ALTER TABLE public.check_outs ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE public.check_outs ADD COLUMN IF NOT EXISTS feedback_rating integer;

-- Add iqama_number and passport_number recording on check_ins
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS iqama_number text;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS passport_number text;

-- Add is_blacklisted flag to employees for quick filtering
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_blacklisted boolean DEFAULT false;

-- Update perform_check_in to accept iqama and passport
CREATE OR REPLACE FUNCTION public.perform_check_in(
  p_employee_id uuid, 
  p_room_id uuid, 
  p_camp_id uuid, 
  p_performed_by uuid,
  p_iqama_number text DEFAULT NULL,
  p_passport_number text DEFAULT NULL
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
BEGIN
  SELECT current_occupancy, max_capacity INTO v_current_occupancy, v_max_capacity
  FROM rooms WHERE id = p_room_id;

  IF v_current_occupancy >= v_max_capacity THEN
    RAISE EXCEPTION 'Room is at full capacity';
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
$function$;

-- Update perform_check_out to accept blacklist/feedback
CREATE OR REPLACE FUNCTION public.perform_check_out(
  p_employee_id uuid, 
  p_room_id uuid, 
  p_camp_id uuid, 
  p_performed_by uuid, 
  p_assets_returned boolean DEFAULT true, 
  p_damage_remarks text DEFAULT NULL, 
  p_clearance_notes text DEFAULT NULL,
  p_is_blacklisted boolean DEFAULT false,
  p_blacklist_reason text DEFAULT NULL,
  p_feedback text DEFAULT NULL,
  p_feedback_rating integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_check_out_id uuid;
BEGIN
  INSERT INTO check_outs (employee_id, room_id, camp_id, performed_by, assets_returned, damage_remarks, clearance_notes, is_blacklisted, blacklist_reason, feedback, feedback_rating)
  VALUES (p_employee_id, p_room_id, p_camp_id, p_performed_by, p_assets_returned, p_damage_remarks, p_clearance_notes, p_is_blacklisted, p_blacklist_reason, p_feedback, p_feedback_rating)
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
$function$;
