-- 1. Clean duplicate active check-ins: for any employee with multiple "active" check-ins
-- (per the room-level definition), close all but the most recent one.
WITH active_per_room AS (
  SELECT ci.id, ci.employee_id, ci.room_id, ci.camp_id, ci.check_in_date,
         ROW_NUMBER() OVER (PARTITION BY ci.employee_id ORDER BY ci.check_in_date DESC) AS rn
  FROM check_ins ci
  WHERE NOT EXISTS (
    SELECT 1 FROM check_outs co
    WHERE co.employee_id = ci.employee_id
      AND co.room_id = ci.room_id
      AND co.check_out_date > ci.check_in_date
  )
),
to_close AS (
  SELECT * FROM active_per_room WHERE rn > 1
)
INSERT INTO check_outs (employee_id, room_id, camp_id, check_out_date, clearance_notes)
SELECT employee_id, room_id, camp_id, check_in_date + interval '1 second',
       'Auto-closed: duplicate active check-in (kept most recent)'
FROM to_close;

-- 2. Resync room occupancy from the canonical room-level definition
UPDATE rooms r
SET current_occupancy = COALESCE(apr.cnt, 0),
    status = CASE
      WHEN COALESCE(apr.cnt, 0) = 0 THEN 'vacant'::room_status
      WHEN COALESCE(apr.cnt, 0) >= r.max_capacity THEN 'occupied'::room_status
      ELSE 'partially_occupied'::room_status
    END
FROM (
  SELECT r2.id AS room_id,
    (SELECT COUNT(DISTINCT ci.employee_id)
     FROM check_ins ci
     WHERE ci.room_id = r2.id
       AND NOT EXISTS (
         SELECT 1 FROM check_outs co
         WHERE co.employee_id = ci.employee_id
           AND co.room_id = ci.room_id
           AND co.check_out_date > ci.check_in_date
       )
    ) AS cnt
  FROM rooms r2
) apr
WHERE r.id = apr.room_id;

-- 3. Replace room uniqueness: per (camp, block, room_number) instead of (camp, room_number)
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_camp_id_room_number_unique;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_camp_block_room_number_unique
  UNIQUE (camp_id, building_id, room_number);