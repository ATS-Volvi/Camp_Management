
-- Make audit log insert more restrictive - only authenticated users with a valid user_id
DROP POLICY "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
