CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

DO $$
DECLARE
  t text[]; p record; pred text; bucket text;
  targets text[][] := ARRAY[
    ['asset_maintenance_logs','Authenticated add asset logs'],['asset_maintenance_logs','Authenticated view asset logs'],
    ['meal_order_items','auth_read_meal_items'],['employee_shift_assignments','auth_read_shifts'],['role_permissions','auth_read_role_permissions'],
    ['lockers','locker_read'],['catering_issues','auth_read_issues'],['accommodation_absences','absences_read'],
    ['camp_supplier_costs','auth_read_supplier_costs'],['food_cancellation_request_meals','auth_insert_food_cancel_meals'],
    ['checkout_reports','Authenticated users can read checkout_reports'],['check_ins','Authenticated users can read check_ins'],
    ['daily_meal_plans','auth_read_meal_plans'],['client_room_rates','Authenticated can view client room rates'],
    ['camp_meal_rates','Authenticated can view camp meal rates'],['camp_food_cancellation_settings','auth_read_food_cancel_settings'],
    ['audit_responses','auth_read_responses'],['clients','Authenticated can view clients'],['camp_room_rates','Authenticated users can read camp_room_rates'],
    ['pm_logs','auth_read_pm_logs'],['menu_dishes','auth_read_menu_dishes'],['buildings','Authenticated users can read buildings'],
    ['pm_tasks','auth_read_pm_tasks'],['catering_issue_items','auth_read_issue_items'],['inventory','Authenticated users can read inventory'],
    ['catering_consumption_logs','auth_read_consumption'],['ingredients','Full access to ingredients for authenticated users'],
    ['food_cancellation_requests','auth_insert_food_cancel'],['meal_menu_templates','auth_read_templates'],
    ['mess_facilities','auth_read_mess_facilities'],['audit_templates','auth_read_audit_templates'],['permissions','auth_read_permissions'],
    ['assets','Authenticated users can read assets'],['designations','Authenticated users can read designations'],
    ['employees','Authenticated users can read employees'],['menu_dish_ingredients','Full access to menu_dish_ingredients for authenticated users'],
    ['visitors','Authenticated users can read visitors'],['block_floors','Authenticated read floors'],
    ['camp_room_meal_rates','Authenticated view room meal rates'],['catering_invoices','auth_read_invoices'],
    ['locker_configuration','config_read'],['locker_events','event_read'],['check_outs','Authenticated users can read check_outs'],
    ['transfer_requests','auth_insert_transfer_requests'],['purchase_order_items','auth_read_po_items'],['meal_orders','auth_read_meal_orders'],
    ['ncr_records','auth_read_ncr'],['ingredient_price_history','auth_read_price_history'],['food_safety_audits','auth_read_audits'],
    ['departments','Authenticated users can read departments'],['room_allocation_overrides','auth_read_overrides'],
    ['cook_requests','auth_read_cook_requests'],['cook_request_items','auth_read_cook_request_items'],
    ['room_transfers','Authenticated users can read room_transfers'],['maintenance_assignment_history','Authenticated users can read assignment history'],
    ['locker_allocations','allocation_read'],['grocery_request_items','auth_read_request_items'],['food_wastage','auth_read_wastage'],
    ['catering_stock','auth_read_stock'],['purchase_orders','auth_read_purchase_orders'],['designation_room_mapping','auth_read_designation_mapping'],
    ['meal_scans','auth_read_meal_scans'],['meal_order_cycles','auth_read_meal_cycles'],['maintenance_tickets','Authenticated users can read tickets'],
    ['catering_grn','auth_read_grn'],['locker_charge_transactions','charge_read'],['item_assignments','Authenticated users can read item_assignments'],
    ['rooms','Authenticated users can read rooms'],['camp_utilities','auth_read_utilities'],['grocery_requests','auth_read_requests'],
    ['catering_grn_items','auth_read_grn_items'],['pm_equipment','auth_read_pm_equipment'],['camps','Authenticated users can read camps'],
    ['employee_status_log','auth_read_status_log'],['audit_template_items','auth_read_template_items'],
    ['profiles','Users can read all profiles'],['notifications','Users can read own notifications']];
BEGIN
  FOREACH t SLICE 1 IN ARRAY targets LOOP
    SELECT cmd INTO p FROM pg_policies WHERE schemaname='public' AND tablename=t[1] AND policyname=t[2];
    IF NOT FOUND THEN CONTINUE; END IF;
    pred := 'public.is_staff(auth.uid())';
    IF t[1] = 'profiles' THEN pred := '(id = auth.uid() OR user_id = auth.uid() OR public.is_staff(auth.uid()))';
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN pred := '(id = auth.uid() OR public.is_staff(auth.uid()))'; END IF;
    ELSIF t[1] = 'notifications' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
      pred := '(user_id = auth.uid())';
    END IF;
    IF p.cmd IN ('SELECT','DELETE') THEN EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', t[2], t[1], pred);
    ELSIF p.cmd = 'INSERT' THEN EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', t[2], t[1], pred);
    ELSE EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', t[2], t[1], pred, pred); END IF;
  END LOOP;

  FOR p IN SELECT policyname, cmd, coalesce(qual, with_check) AS expr FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('Signed-in users view camp photos','Authenticated users can read invoice files','Signed-in users update camp photos',
      'Authenticated users can upload invoice files','Authenticated users can update invoice files','Signed-in users upload camp photos','Authenticated users can delete invoice files') LOOP
    bucket := CASE WHEN p.expr LIKE '%camp-photos%' THEN 'camp-photos' ELSE 'invoices' END;
    pred := format('(bucket_id = %L AND public.is_staff(auth.uid()))', bucket);
    IF p.cmd IN ('SELECT','DELETE') THEN EXECUTE format('ALTER POLICY %I ON storage.objects USING (%s)', p.policyname, pred);
    ELSIF p.cmd = 'INSERT' THEN EXECUTE format('ALTER POLICY %I ON storage.objects WITH CHECK (%s)', p.policyname, pred);
    ELSE EXECUTE format('ALTER POLICY %I ON storage.objects USING (%s) WITH CHECK (%s)', p.policyname, pred, pred); END IF;
  END LOOP;
END $$;