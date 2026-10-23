-- Create clients (Supplier Master) table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  vat_number text,
  breakfast_rate numeric NOT NULL DEFAULT 0,
  lunch_rate numeric NOT NULL DEFAULT 0,
  dinner_rate numeric NOT NULL DEFAULT 0,
  ramadan_rate numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create client room rates table
CREATE TABLE IF NOT EXISTS public.client_room_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  room_category_code text NOT NULL,
  daily_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, room_category_code)
);
