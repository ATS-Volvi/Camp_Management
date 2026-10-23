-- Feature 7: Asset Handover History
CREATE TABLE IF NOT EXISTS public.asset_handover_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    from_camp_id UUID REFERENCES public.camps(id),
    to_camp_id UUID REFERENCES public.camps(id),
    from_room_id UUID REFERENCES public.rooms(id),
    to_room_id UUID REFERENCES public.rooms(id),
    handed_over_by UUID REFERENCES public.employees(id),
    handed_over_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_asset_handover_asset ON public.asset_handover_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_handover_camp ON public.asset_handover_history(to_camp_id);
