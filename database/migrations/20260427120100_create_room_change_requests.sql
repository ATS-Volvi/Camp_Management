
-- Room Change Requests
-- Employees can raise room change requests.
-- Approval rules configurable. Camp Office allocates new room.
-- Old room automatically released. System logs request history.

CREATE TABLE public.room_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  current_room_id UUID NOT NULL REFERENCES public.rooms(id),
  requested_room_id UUID REFERENCES public.rooms(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  new_room_id UUID REFERENCES public.rooms(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_change_camp ON public.room_change_requests(camp_id);
CREATE INDEX idx_room_change_status ON public.room_change_requests(status);
CREATE INDEX idx_room_change_employee ON public.room_change_requests(employee_id);

-- Updated_at trigger
CREATE TRIGGER update_room_change_requests_updated_at
  BEFORE UPDATE ON public.room_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
