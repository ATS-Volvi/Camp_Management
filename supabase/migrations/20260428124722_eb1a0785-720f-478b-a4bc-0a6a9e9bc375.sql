-- Room transfers audit table
CREATE TABLE public.room_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  from_room_id uuid NOT NULL,
  to_room_id uuid NOT NULL,
  from_camp_id uuid NOT NULL,
  to_camp_id uuid NOT NULL,
  transfer_type text NOT NULL DEFAULT 'intra_camp', -- 'intra_camp' or 'inter_camp'
  reason text NOT NULL,
  notes text,
  performed_by uuid,
  transfer_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read room_transfers"
ON public.room_transfers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert room_transfers"
ON public.room_transfers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr_admin'::app_role));

CREATE INDEX idx_room_transfers_employee ON public.room_transfers(employee_id);
CREATE INDEX idx_room_transfers_date ON public.room_transfers(transfer_date DESC);

-- Atomic transfer function
CREATE OR REPLACE FUNCTION public.perform_room_transfer(
  p_employee_id uuid,
  p_from_room_id uuid,
  p_to_room_id uuid,
  p_from_camp_id uuid,
  p_to_camp_id uuid,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transfer_id uuid;
  v_to_occupancy integer;
  v_to_capacity integer;
  v_transfer_type text;
BEGIN
  IF p_from_room_id = p_to_room_id THEN
    RAISE EXCEPTION 'Source and destination rooms cannot be the same';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Transfer reason is required';
  END IF;

  -- Capacity check
  SELECT current_occupancy, max_capacity INTO v_to_occupancy, v_to_capacity
  FROM rooms WHERE id = p_to_room_id;

  IF v_to_occupancy >= v_to_capacity THEN
    RAISE EXCEPTION 'Destination room is at full capacity';
  END IF;

  v_transfer_type := CASE WHEN p_from_camp_id = p_to_camp_id THEN 'intra_camp' ELSE 'inter_camp' END;

  -- Check-out from old room
  INSERT INTO check_outs (employee_id, room_id, camp_id, performed_by, assets_returned, clearance_notes)
  VALUES (p_employee_id, p_from_room_id, p_from_camp_id, p_performed_by, true, 'Room transfer: ' || p_reason);

  UPDATE rooms
  SET current_occupancy = GREATEST(current_occupancy - 1, 0),
      status = CASE
        WHEN GREATEST(current_occupancy - 1, 0) = 0 THEN 'vacant'::room_status
        ELSE 'partially_occupied'::room_status
      END
  WHERE id = p_from_room_id;

  -- Check-in to new room
  INSERT INTO check_ins (employee_id, room_id, camp_id, performed_by)
  VALUES (p_employee_id, p_to_room_id, p_to_camp_id, p_performed_by);

  UPDATE rooms
  SET current_occupancy = current_occupancy + 1,
      status = CASE
        WHEN current_occupancy + 1 >= max_capacity THEN 'occupied'::room_status
        ELSE 'partially_occupied'::room_status
      END
  WHERE id = p_to_room_id;

  -- Update employee record
  UPDATE employees SET room_id = p_to_room_id, camp_id = p_to_camp_id WHERE id = p_employee_id;

  -- Log transfer
  INSERT INTO room_transfers (employee_id, from_room_id, to_room_id, from_camp_id, to_camp_id, transfer_type, reason, notes, performed_by)
  VALUES (p_employee_id, p_from_room_id, p_to_room_id, p_from_camp_id, p_to_camp_id, v_transfer_type, p_reason, p_notes, p_performed_by)
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;