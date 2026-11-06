CREATE OR REPLACE FUNCTION public.delete_camp(p_camp_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE
  v_name text;
  v_blocks text := '';
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can delete a camp';
  END IF;
  SELECT name INTO v_name FROM public.camps WHERE id = p_camp_id FOR UPDATE;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Camp not found'; END IF;

  SELECT count(*) INTO v_count FROM public.employees e
  WHERE (e.camp_id = p_camp_id OR e.room_id IN (SELECT id FROM public.rooms WHERE camp_id = p_camp_id))
    AND NOT (e.employee_type = 'camp_staff' AND e.room_id IS NULL);
  IF v_count > 0 THEN v_blocks := v_blocks || 'employees with accommodation or workforce assignments (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.visitors WHERE camp_id = p_camp_id OR room_id IN (SELECT id FROM public.rooms WHERE camp_id = p_camp_id);
  IF v_count > 0 THEN v_blocks := v_blocks || 'visitors (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.cook_requests WHERE camp_id = p_camp_id;
  IF v_count > 0 THEN v_blocks := v_blocks || 'cook requests (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.purchase_orders WHERE camp_id = p_camp_id;
  IF v_count > 0 THEN v_blocks := v_blocks || 'purchase orders (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.food_safety_audits WHERE camp_id = p_camp_id;
  IF v_count > 0 THEN v_blocks := v_blocks || 'food safety audits (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.ncr_records WHERE camp_id = p_camp_id;
  IF v_count > 0 THEN v_blocks := v_blocks || 'NCR records (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.checkout_reports WHERE camp_id = p_camp_id;
  IF v_count > 0 THEN v_blocks := v_blocks || 'checkout reports (' || v_count || '), '; END IF;
  SELECT count(*) INTO v_count FROM public.check_ins ci WHERE ci.camp_id = p_camp_id
    AND NOT EXISTS (SELECT 1 FROM public.check_outs co WHERE co.employee_id = ci.employee_id AND co.check_out_date >= ci.check_in_date);
  IF v_count > 0 THEN v_blocks := v_blocks || 'active residents (' || v_count || '), '; END IF;
  IF v_blocks <> '' THEN
    RAISE EXCEPTION 'Cannot delete "%": it still has %', v_name, rtrim(v_blocks, ', ');
  END IF;

  -- These are work-site assignments, not stays. Preserve each staff profile.
  UPDATE public.employees SET camp_id = NULL, updated_at = now()
  WHERE camp_id = p_camp_id AND employee_type = 'camp_staff' AND room_id IS NULL;
  DELETE FROM public.camps WHERE id = p_camp_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.delete_camp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_camp(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_camp(uuid) TO service_role;