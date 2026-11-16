REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.department_lunch_requests FROM authenticated, anon;
REVOKE ALL ON public.department_lunch_managers FROM anon;
REVOKE ALL ON FUNCTION public.validate_department_lunch_manager() FROM PUBLIC,anon,authenticated;
