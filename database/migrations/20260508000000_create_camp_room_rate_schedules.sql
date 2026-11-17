-- Migration: Create camp_room_rate_schedules for date-effective room rate changes
CREATE TABLE IF NOT EXISTS public.camp_room_rate_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
    room_category TEXT NOT NULL,
    daily_rate NUMERIC NOT NULL DEFAULT 0,
    holding_rate NUMERIC NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_rate_schedules_camp ON public.camp_room_rate_schedules(camp_id);
CREATE INDEX IF NOT EXISTS idx_room_rate_schedules_category ON public.camp_room_rate_schedules(room_category);
CREATE INDEX IF NOT EXISTS idx_room_rate_schedules_dates ON public.camp_room_rate_schedules(effective_from, effective_to);

-- Grants
GRANT ALL ON public.camp_room_rate_schedules TO PUBLIC;
