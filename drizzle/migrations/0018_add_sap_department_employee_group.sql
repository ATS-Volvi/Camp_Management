ALTER TABLE public.employees ADD COLUMN sap_department TEXT;
ALTER TABLE public.employees ADD COLUMN employee_group TEXT;

COMMENT ON COLUMN public.employees.sap_department IS 'Department code as per SAP HR';
COMMENT ON COLUMN public.employees.employee_group IS 'Employee group classification (e.g. staff/skilled/labour)';