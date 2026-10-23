
-- Violation Management
-- Employees can raise violation complaints against other employees.
-- Camp Team verifies, takes action, and maintains disciplinary history.

CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  complainant_employee_id UUID NOT NULL REFERENCES public.employees(id),
  accused_employee_id UUID NOT NULL REFERENCES public.employees(id),
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'action_taken', 'closed', 'dismissed')),
  action_taken TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_violations_camp ON public.violations(camp_id);
CREATE INDEX idx_violations_status ON public.violations(status);
CREATE INDEX idx_violations_accused ON public.violations(accused_employee_id);
CREATE INDEX idx_violations_complainant ON public.violations(complainant_employee_id);

-- Updated_at trigger
CREATE TRIGGER update_violations_updated_at
  BEFORE UPDATE ON public.violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
