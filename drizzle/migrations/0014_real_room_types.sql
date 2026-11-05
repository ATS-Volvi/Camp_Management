-- Real camp room types: "Nx1" = N beds, as used in the camp master workbooks.
-- Rates (SAR/day) from the occupancy summary for 26-Aug-2026 to 25-Sep-2026: accommodation per day; on-site/vacation per day = holding charge.

-- Room numbers repeat across blocks in real camps; 20260422175723 replaced this key with (camp_id, building_id, room_number) but some databases still carry it.
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_camp_id_room_number_unique;

ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS '1x1';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS '2x1';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS '3x1';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS '4x1';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS '5x1';
ALTER TYPE public.room_category ADD VALUE IF NOT EXISTS '6x1';

INSERT INTO public.room_categories (code, name, beds, daily_rate, holding_charge, category_key) VALUES
  ('RT1X1', '1x1 - 1 Bed', 1, 17, 17, '1x1'),
  ('RT2X1', '2x1 - 2 Beds', 2, 12, 12, '2x1'),
  ('RT3X1', '3x1 - 3 Beds', 3, 11, 11, '3x1'),
  ('RT4X1', '4x1 - 4 Beds', 4, 10, 10, '4x1'),
  ('RT5X1', '5x1 - 5 Beds', 5, 9, 9, '5x1'),
  ('RT6X1', '6x1 - 6 Beds', 6, 9, 9, '6x1')
ON CONFLICT (code) DO NOTHING;
