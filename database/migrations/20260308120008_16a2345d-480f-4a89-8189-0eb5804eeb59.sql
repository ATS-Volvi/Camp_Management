-- Add staff_role column for camp staff employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS staff_role text;

-- Add comment for clarity
COMMENT ON COLUMN public.employees.staff_role IS 'Role for camp_staff type employees: Warden, Electrician, Plumber, Cleaner, Security Guard, Cook, Driver, Supervisor';