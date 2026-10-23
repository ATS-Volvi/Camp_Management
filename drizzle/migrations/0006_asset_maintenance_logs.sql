CREATE TABLE public.asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type TEXT NOT NULL DEFAULT 'repair',
  description TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  performed_by TEXT,
  resulting_condition public.asset_condition NOT NULL DEFAULT 'good',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_maintenance_logs TO authenticated;
GRANT ALL ON public.asset_maintenance_logs TO service_role;
ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view asset logs" ON public.asset_maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated add asset logs" ON public.asset_maintenance_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins edit asset logs" ON public.asset_maintenance_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));
CREATE POLICY "Admins delete asset logs" ON public.asset_maintenance_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));

CREATE OR REPLACE FUNCTION public.apply_asset_maintenance_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.assets
     SET condition = NEW.resulting_condition,
         last_maintenance_date = GREATEST(COALESCE(last_maintenance_date, NEW.log_date), NEW.log_date),
         last_updated = now()
   WHERE id = NEW.asset_id
     AND NOT EXISTS (SELECT 1 FROM public.asset_maintenance_logs l WHERE l.asset_id = NEW.asset_id AND l.id <> NEW.id AND l.log_date > NEW.log_date);
  RETURN NEW;
END $$;
CREATE TRIGGER asset_maintenance_log_apply AFTER INSERT ON public.asset_maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.apply_asset_maintenance_log();