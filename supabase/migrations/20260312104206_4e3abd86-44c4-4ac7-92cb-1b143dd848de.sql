
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS daily_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS daily_food_rate numeric NOT NULL DEFAULT 0;
