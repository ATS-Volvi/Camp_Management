-- Migration: Catering Cost Control & Budget Monitor + Meal Consumption & Waste Intelligence
-- Tables: catering_budgets, meal_dispositions

CREATE TABLE IF NOT EXISTS public.catering_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID REFERENCES public.camps(id) ON DELETE CASCADE,
    department TEXT NOT NULL DEFAULT 'All',
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    allocated_budget NUMERIC NOT NULL DEFAULT 0,
    warning_threshold_pct NUMERIC NOT NULL DEFAULT 85,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_catering_budgets UNIQUE (camp_id, department, month_year)
);

CREATE INDEX IF NOT EXISTS idx_catering_budgets_lookup ON public.catering_budgets(camp_id, month_year, department);

CREATE TABLE IF NOT EXISTS public.meal_dispositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID REFERENCES public.camps(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner'
    department TEXT NOT NULL DEFAULT 'All',
    scheduled_count INTEGER NOT NULL DEFAULT 0,
    prepared_count INTEGER NOT NULL DEFAULT 0,
    collected_count INTEGER NOT NULL DEFAULT 0,
    uncollected_count INTEGER NOT NULL DEFAULT 0,
    disposition_status TEXT NOT NULL DEFAULT 'pending', -- 'retained', 'reused', 'discarded', 'pending'
    discarded_qty INTEGER NOT NULL DEFAULT 0,
    retained_qty INTEGER NOT NULL DEFAULT 0,
    unit_meal_cost NUMERIC NOT NULL DEFAULT 6.5,
    reason TEXT,
    notes TEXT,
    recorded_by TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_dispositions_lookup ON public.meal_dispositions(camp_id, meal_date, meal_type);
