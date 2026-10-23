
-- Feature 5: Maintenance Workflow Enhancements
-- Adds external vendors, parts cost tracking, and escalation.

CREATE TABLE IF NOT EXISTS public.external_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_external_vendors_updated_at 
  BEFORE UPDATE ON public.external_vendors 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.maintenance_tickets 
ADD COLUMN IF NOT EXISTS parts_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_escalated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.external_vendors(id),
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_vendor ON public.maintenance_tickets(vendor_id);
