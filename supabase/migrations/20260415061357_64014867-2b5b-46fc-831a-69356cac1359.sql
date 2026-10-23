
-- Add new columns to audit_template_items
ALTER TABLE public.audit_template_items
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_remarks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ncr_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS severity_applicable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'General';

-- Seed a sample Food Safety Inspection template
DO $$
DECLARE
  v_template_id uuid;
BEGIN
  INSERT INTO public.audit_templates (name, audit_type, description, is_active)
  VALUES ('Food Safety Inspection', 'daily', 'Standard daily food safety and hygiene inspection covering personal hygiene, kitchen cleanliness, food storage, preparation, serving, pest control, water quality, and documentation compliance.', true)
  RETURNING id INTO v_template_id;

  INSERT INTO public.audit_template_items (template_id, category, question, response_type, is_critical, photo_required, sort_order, weight, allow_remarks, ncr_enabled, severity_applicable, category_type) VALUES
  (v_template_id, 'Personal Hygiene', 'Are food handlers wearing clean uniforms?', 'rating', true, true, 1, 2, true, true, true, 'Safety'),
  (v_template_id, 'Personal Hygiene', 'Are hairnets and gloves used properly?', 'rating', true, true, 2, 2, true, true, true, 'Safety'),
  (v_template_id, 'Personal Hygiene', 'Are hands washed before food handling?', 'rating', true, true, 3, 2, true, true, true, 'Safety'),
  (v_template_id, 'Kitchen Hygiene', 'Is kitchen floor clean and dry?', 'rating', true, true, 4, 2, true, true, true, 'Hygiene'),
  (v_template_id, 'Kitchen Hygiene', 'Are utensils cleaned and sanitized?', 'rating', true, true, 5, 2, true, true, true, 'Hygiene'),
  (v_template_id, 'Kitchen Hygiene', 'Are waste bins covered?', 'rating', false, true, 6, 1, true, true, true, 'Hygiene'),
  (v_template_id, 'Food Storage', 'Are raw and cooked foods stored separately?', 'rating', true, true, 7, 2, true, true, true, 'Storage'),
  (v_template_id, 'Food Storage', 'Is FIFO followed?', 'rating', true, true, 8, 2, true, true, true, 'Storage'),
  (v_template_id, 'Food Storage', 'Are expiry dates checked?', 'rating', true, true, 9, 2, true, true, true, 'Storage'),
  (v_template_id, 'Food Preparation', 'Is food cooked properly?', 'rating', true, true, 10, 2, true, true, true, 'Cooking'),
  (v_template_id, 'Food Preparation', 'Is cross-contamination avoided?', 'rating', true, true, 11, 2, true, true, true, 'Cooking'),
  (v_template_id, 'Food Serving', 'Is food covered before serving?', 'rating', true, true, 12, 2, true, true, true, 'Serving'),
  (v_template_id, 'Food Serving', 'Are serving utensils clean?', 'rating', true, true, 13, 2, true, true, true, 'Serving'),
  (v_template_id, 'Pest Control', 'Are there any signs of pests?', 'rating', true, true, 14, 2, true, true, true, 'Safety'),
  (v_template_id, 'Water & Sanitation', 'Is drinking water clean?', 'rating', true, true, 15, 2, true, true, true, 'Utility'),
  (v_template_id, 'Water & Sanitation', 'Are handwash stations available?', 'rating', true, true, 16, 2, true, true, true, 'Utility'),
  (v_template_id, 'Documentation', 'Are food safety records maintained?', 'rating', false, true, 17, 1, true, true, false, 'Compliance'),
  (v_template_id, 'Documentation', 'Are licenses valid and updated?', 'rating', false, true, 18, 1, true, true, false, 'Compliance');
END $$;
