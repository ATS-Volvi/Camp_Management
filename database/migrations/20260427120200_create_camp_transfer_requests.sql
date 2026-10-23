
-- Camp Transfer Requests
-- Department raises camp transfer request in system.
-- Respective camp reviews request.
-- Approval granted once employee reports physically to Camp Office.
-- System updates camp allocation.

CREATE TABLE public.camp_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  from_camp_id UUID NOT NULL REFERENCES public.camps(id),
  to_camp_id UUID NOT NULL REFERENCES public.camps(id),
  reason TEXT NOT NULL,
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  physically_reported BOOLEAN DEFAULT false,
  reported_at TIMESTAMPTZ,
  new_room_id UUID REFERENCES public.rooms(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camp_transfer_employee ON public.camp_transfer_requests(employee_id);
CREATE INDEX idx_camp_transfer_status ON public.camp_transfer_requests(status);
CREATE INDEX idx_camp_transfer_from ON public.camp_transfer_requests(from_camp_id);
CREATE INDEX idx_camp_transfer_to ON public.camp_transfer_requests(to_camp_id);

-- Updated_at trigger
CREATE TRIGGER update_camp_transfer_requests_updated_at
  BEFORE UPDATE ON public.camp_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
