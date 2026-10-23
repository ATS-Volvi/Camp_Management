
-- Feature 6: Asset Maintenance Linking
ALTER TABLE public.maintenance_tickets 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id);

CREATE INDEX IF NOT EXISTS idx_tickets_asset ON public.maintenance_tickets(asset_id);
