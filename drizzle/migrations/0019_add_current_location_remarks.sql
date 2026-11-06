ALTER TABLE public.employees ADD COLUMN current_location TEXT;
ALTER TABLE public.employees ADD COLUMN remarks TEXT;

COMMENT ON COLUMN public.employees.current_location IS 'Where the employee is currently located';
COMMENT ON COLUMN public.employees.remarks IS 'Free-form remarks about the employee';