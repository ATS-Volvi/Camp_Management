
-- Add new room category enum values
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'executive_single';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'executive_twin';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'supervisor_twin';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'staff_4bed';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'skilled_6bed';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'general_8bed';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'guest_single';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS 'transit_4bed';
