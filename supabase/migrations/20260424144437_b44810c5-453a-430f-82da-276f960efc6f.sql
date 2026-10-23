DROP POLICY IF EXISTS "staff_insert_pm_tasks" ON public.pm_tasks;
DROP POLICY IF EXISTS "staff_update_pm_tasks" ON public.pm_tasks;
DROP POLICY IF EXISTS "system_insert_pm_logs" ON public.pm_logs;

CREATE POLICY "staff_insert_pm_tasks" ON public.pm_tasks FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager')
    OR has_role(auth.uid(),'hr_admin') OR has_role(auth.uid(),'store_keeper')
    OR has_role(auth.uid(),'security')
  );

CREATE POLICY "staff_update_pm_tasks" ON public.pm_tasks FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager')
    OR has_role(auth.uid(),'hr_admin') OR has_role(auth.uid(),'store_keeper')
    OR has_role(auth.uid(),'security')
  );

CREATE POLICY "staff_insert_pm_logs" ON public.pm_logs FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager')
    OR has_role(auth.uid(),'hr_admin') OR has_role(auth.uid(),'store_keeper')
    OR has_role(auth.uid(),'security')
  );