
-- Transfer requests workflow: employee-initiated, Camp Manager approval, then performed via Transfer panel
CREATE TABLE public.transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  current_room_id uuid,
  current_camp_id uuid,
  requested_camp_id uuid,
  requested_room_id uuid,
  request_type text NOT NULL DEFAULT 'intra_camp', -- intra_camp | inter_camp
  reason text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | fulfilled | cancelled
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  fulfilled_transfer_id uuid,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfer_requests_status ON public.transfer_requests(status);
CREATE INDEX idx_transfer_requests_employee ON public.transfer_requests(employee_id);

ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user
CREATE POLICY "auth_read_transfer_requests" ON public.transfer_requests
  FOR SELECT TO authenticated USING (true);

-- Insert: any authenticated staff can submit a request (on behalf of employee)
CREATE POLICY "auth_insert_transfer_requests" ON public.transfer_requests
  FOR INSERT TO authenticated WITH CHECK (true);

-- Update: only camp_manager / hr_admin / super_admin can approve/reject
CREATE POLICY "managers_update_transfer_requests" ON public.transfer_requests
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'camp_manager'::app_role) OR
    has_role(auth.uid(), 'hr_admin'::app_role)
  );

-- Auto-update updated_at
CREATE TRIGGER trg_transfer_requests_updated_at
BEFORE UPDATE ON public.transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
