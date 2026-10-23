
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_type text NOT NULL DEFAULT 'own',
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS join_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS camp_id uuid REFERENCES public.camps(id),
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id),
  ADD COLUMN IF NOT EXISTS supplier_name text;
