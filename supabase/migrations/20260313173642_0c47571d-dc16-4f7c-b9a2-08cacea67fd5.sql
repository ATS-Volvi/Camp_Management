
ALTER TABLE public.cook_request_items ADD COLUMN meal_type text DEFAULT 'lunch';
ALTER TABLE public.cook_requests ADD COLUMN bf_head_count integer DEFAULT 0;
ALTER TABLE public.cook_requests ADD COLUMN lunch_head_count integer DEFAULT 0;
ALTER TABLE public.cook_requests ADD COLUMN dinner_head_count integer DEFAULT 0;
