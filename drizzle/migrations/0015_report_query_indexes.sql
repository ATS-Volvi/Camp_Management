-- Indexes for the filters reports, dashboards and the kitchen meal-count poll use.
-- check_outs had no index besides its primary key; check_ins had none on camp or date.
CREATE INDEX IF NOT EXISTS idx_check_outs_employee_date ON public.check_outs (employee_id, check_out_date);
CREATE INDEX IF NOT EXISTS idx_check_outs_camp ON public.check_outs (camp_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_camp_date ON public.check_ins (camp_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON public.check_ins (check_in_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
