
-- Create camp_room_rates table for per-day pricing per room category per camp
CREATE TABLE public.camp_room_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  room_category TEXT NOT NULL,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(camp_id, room_category)
);

-- Enable RLS
ALTER TABLE public.camp_room_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read camp_room_rates"
  ON public.camp_room_rates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert camp_room_rates"
  ON public.camp_room_rates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));

CREATE POLICY "Admins can update camp_room_rates"
  ON public.camp_room_rates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));

CREATE POLICY "Admins can delete camp_room_rates"
  ON public.camp_room_rates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));

-- Add project column to check_ins
ALTER TABLE public.check_ins ADD COLUMN project TEXT;
