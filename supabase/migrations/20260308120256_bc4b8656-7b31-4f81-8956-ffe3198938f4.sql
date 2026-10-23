-- Add user_id to employees to link camp staff to auth users
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_camp_staff ON public.employees(employee_type, camp_id) WHERE employee_type = 'camp_staff';