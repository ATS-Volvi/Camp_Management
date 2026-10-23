
-- Add new fields to camps
ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS camp_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS camp_type text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS notes text;

-- Auto-generate camp_code for existing camps
UPDATE public.camps SET camp_code = 'CAMP-' || LPAD(ROW_NUMBER::text, 3, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) FROM public.camps) sub
WHERE camps.id = sub.id AND camps.camp_code IS NULL;

-- Create sequence for camp codes
CREATE SEQUENCE IF NOT EXISTS camp_code_seq START WITH 100;

-- Add new fields to buildings (blocks)
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS block_code text,
  ADD COLUMN IF NOT EXISTS block_type text NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS supervisor_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add new fields to rooms
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS ac boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attached_bathroom boolean NOT NULL DEFAULT false;

-- Add 'partially_occupied' to room_status enum
ALTER TYPE public.room_status ADD VALUE IF NOT EXISTS 'partially_occupied';
