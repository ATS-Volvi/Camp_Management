-- Migration to seed additional Food Safety Audits from Word Document

DO $$
DECLARE
  daily_kitchen_id uuid := gen_random_uuid();
  weekly_hygiene_id uuid := gen_random_uuid();
  storage_audit_id uuid := gen_random_uuid();
  monthly_comp_id uuid := gen_random_uuid();
  food_prep_id uuid := gen_random_uuid();
BEGIN
  -- 1. Daily Kitchen Inspection
  INSERT INTO public.audit_templates (id, name, audit_type, description, is_active)
  VALUES (daily_kitchen_id, 'Daily Kitchen Inspection', 'daily', 'Routine daily check for overall kitchen hygiene.', true);
  
  INSERT INTO public.audit_template_items (template_id, category, question, response_type, is_critical, photo_required, sort_order) VALUES
  (daily_kitchen_id, 'Personal Hygiene', 'Are food handlers wearing clean uniforms?', 'yes_no', true, true, 1),
  (daily_kitchen_id, 'Personal Hygiene', 'Are hairnets and gloves used?', 'yes_no', true, true, 2),
  (daily_kitchen_id, 'Kitchen Hygiene', 'Is kitchen floor clean and dry?', 'yes_no', true, true, 3),
  (daily_kitchen_id, 'Kitchen Hygiene', 'Are utensils cleaned properly?', 'yes_no', true, false, 4),
  (daily_kitchen_id, 'Food Serving', 'Is food covered before serving?', 'yes_no', true, true, 5),
  (daily_kitchen_id, 'Pest Control', 'Any visible pests in kitchen area?', 'yes_no', true, true, 6);

  -- 2. Weekly Hygiene Audit
  INSERT INTO public.audit_templates (id, name, audit_type, description, is_active)
  VALUES (weekly_hygiene_id, 'Weekly Hygiene Audit', 'weekly', 'Comprehensive weekly review of deep cleaning and equipment.', true);

  INSERT INTO public.audit_template_items (template_id, category, question, response_type, is_critical, photo_required, sort_order) VALUES
  (weekly_hygiene_id, 'Kitchen Hygiene', 'Is deep cleaning completed this week?', 'yes_no', true, true, 1),
  (weekly_hygiene_id, 'Kitchen Hygiene', 'Are drains and exhaust cleaned?', 'yes_no', true, true, 2),
  (weekly_hygiene_id, 'Equipment', 'Are all kitchen equipments functioning?', 'yes_no', true, false, 3),
  (weekly_hygiene_id, 'Pest Control', 'Are pest control logs updated?', 'yes_no', true, true, 4),
  (weekly_hygiene_id, 'Storage', 'Is FIFO followed for all items?', 'yes_no', true, false, 5),
  (weekly_hygiene_id, 'Documentation', 'Are cleaning records maintained?', 'yes_no', false, false, 6);

  -- 3. Food Storage & Inventory Audit
  INSERT INTO public.audit_templates (id, name, audit_type, description, is_active)
  VALUES (storage_audit_id, 'Food Storage & Inventory Audit', 'weekly', 'Verification of storage procedures and inventory levels.', true);

  INSERT INTO public.audit_template_items (template_id, category, question, response_type, is_critical, photo_required, sort_order) VALUES
  (storage_audit_id, 'Food Storage', 'Are raw and cooked foods stored separately?', 'yes_no', true, true, 1),
  (storage_audit_id, 'Food Storage', 'Are expiry dates checked?', 'yes_no', true, true, 2),
  (storage_audit_id, 'Inventory', 'Are stock levels updated correctly?', 'yes_no', false, false, 3),
  (storage_audit_id, 'Inventory', 'Are items properly labeled?', 'yes_no', true, true, 4),
  (storage_audit_id, 'Storage', 'Are refrigerators at correct temperature?', 'yes_no', true, true, 5);

  -- 4. Monthly Compliance Audit
  INSERT INTO public.audit_templates (id, name, audit_type, description, is_active)
  VALUES (monthly_comp_id, 'Monthly Compliance Audit', 'monthly', 'Evaluation of licenses, tests, and procedural compliance.', true);

  INSERT INTO public.audit_template_items (template_id, category, question, response_type, is_critical, photo_required, sort_order) VALUES
  (monthly_comp_id, 'Documentation', 'Are all licenses valid?', 'yes_no', true, true, 1),
  (monthly_comp_id, 'Documentation', 'Are staff training records updated?', 'yes_no', false, false, 2),
  (monthly_comp_id, 'Compliance', 'Are previous NCRs closed?', 'yes_no', true, true, 3),
  (monthly_comp_id, 'Water', 'Is water test report available?', 'yes_no', true, true, 4),
  (monthly_comp_id, 'Safety', 'Are safety protocols followed?', 'yes_no', true, true, 5);

  -- 5. Food Preparation Audit
  INSERT INTO public.audit_templates (id, name, audit_type, description, is_active)
  VALUES (food_prep_id, 'Food Preparation Audit', 'daily', 'Daily spot check of food handling and prep processes.', true);

  INSERT INTO public.audit_template_items (template_id, category, question, response_type, is_critical, photo_required, sort_order) VALUES
  (food_prep_id, 'Food Preparation', 'Is food cooked at proper temperature?', 'yes_no', true, false, 1),
  (food_prep_id, 'Food Preparation', 'Is cross-contamination avoided?', 'yes_no', true, true, 2),
  (food_prep_id, 'Food Preparation', 'Are fresh ingredients used?', 'yes_no', true, true, 3),
  (food_prep_id, 'Water', 'Is water used for cooking clean?', 'yes_no', true, false, 4);

END $$;
