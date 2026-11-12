-- Migration: Create camp_lockers and inmate_locker_assignments tables
CREATE TABLE IF NOT EXISTS public.camp_lockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    locker_number TEXT NOT NULL,
    key_number TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'damaged')),
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'repair', 'damaged')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (camp_id, locker_number)
);

CREATE INDEX IF NOT EXISTS idx_camp_lockers_camp ON public.camp_lockers(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_lockers_room ON public.camp_lockers(room_id);
CREATE INDEX IF NOT EXISTS idx_camp_lockers_status ON public.camp_lockers(status);

CREATE TABLE IF NOT EXISTS public.inmate_locker_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_id UUID NOT NULL REFERENCES public.camp_lockers(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'lost_key', 'damaged')),
    key_issued BOOLEAN NOT NULL DEFAULT true,
    key_returned BOOLEAN NOT NULL DEFAULT false,
    condition_on_return TEXT DEFAULT 'good' CHECK (condition_on_return IN ('good', 'repair', 'damaged')),
    damage_remarks TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locker_assignments_employee ON public.inmate_locker_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_locker_assignments_locker ON public.inmate_locker_assignments(locker_id);
CREATE INDEX IF NOT EXISTS idx_locker_assignments_status ON public.inmate_locker_assignments(status);

-- Grants
GRANT ALL ON public.camp_lockers TO PUBLIC;
GRANT ALL ON public.inmate_locker_assignments TO PUBLIC;
