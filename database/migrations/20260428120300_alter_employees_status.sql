
-- Feature 4: Employee Status Management
-- Allows tracking employee status (active, inactive, vacation) and vacation dates.

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation')),
ADD COLUMN IF NOT EXISTS vacation_start DATE,
ADD COLUMN IF NOT EXISTS vacation_end DATE;

CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
