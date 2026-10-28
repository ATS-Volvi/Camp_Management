CREATE OR REPLACE FUNCTION public.food_cancellation_stay_camp(p_employee_id uuid, p_from date, p_to date)
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT ci.camp_id
 FROM public.check_ins ci
 WHERE ci.employee_id = p_employee_id
 AND public.food_cancellation_dates_within_stay(p_from, p_to, ci.check_in_date::date,
   (SELECT min(event_time)::date FROM (
     SELECT co.check_out_date AS event_time FROM public.check_outs co
     WHERE co.employee_id = ci.employee_id AND co.check_out_date >= ci.check_in_date
     UNION ALL
     SELECT subsequent.check_in_date FROM public.check_ins subsequent
     WHERE subsequent.employee_id = ci.employee_id AND subsequent.camp_id <> ci.camp_id
       AND subsequent.check_in_date > ci.check_in_date
   ) departures))
 ORDER BY ci.check_in_date DESC LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.submit_food_cancellation(p_employee_id uuid, p_from_date date, p_to_date date, p_meals public.food_meal_type[], p_reason public.food_cancel_reason, p_remarks text DEFAULT NULL, p_source public.food_cancel_source DEFAULT 'manual', p_submitted_by uuid DEFAULT NULL, p_force boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_camp_id uuid;
 v_settings RECORD;
 v_levels integer := 1;
 v_late boolean := false;
 v_request_id uuid;
 v_meal public.food_meal_type;
 v_now timestamptz := now();
 v_cutoff_today timestamptz;
BEGIN
 SELECT public.food_cancellation_stay_camp(p_employee_id, p_from_date, p_to_date) INTO v_camp_id;
 IF v_camp_id IS NULL THEN
   RAISE EXCEPTION 'Food cancellation not allowed: the employee was not staying there for the entire selected period (% to %). Choose dates within their check-in and check-out dates.', to_char(p_from_date, 'DD/MM/YYYY'), to_char(p_to_date, 'DD/MM/YYYY') USING ERRCODE = '22023';
 END IF;
 SELECT * INTO v_settings FROM public.camp_food_cancellation_settings WHERE camp_id = v_camp_id;
 IF v_settings.id IS NOT NULL THEN
   v_levels := v_settings.approval_levels;
   v_cutoff_today := (CURRENT_DATE::timestamp + v_settings.cutoff_time)::timestamptz;
   IF p_from_date <= CURRENT_DATE + 1 AND v_now > v_cutoff_today THEN
     v_late := true;
     IF v_settings.cutoff_strict AND NOT p_force AND p_source = 'manual' THEN
       RAISE EXCEPTION 'Cut-off time passed (%). Late requests not allowed for this camp.', v_settings.cutoff_time;
     END IF;
   END IF;
 END IF;
 INSERT INTO public.food_cancellation_requests (
   employee_id, camp_id, from_date, to_date, reason, remarks, source,
   approval_levels_required, current_level, status, is_late, submitted_by,
   level1_approver, level1_approved_at, level2_approver, level2_approved_at, level3_approver, level3_approved_at
 ) VALUES (
   p_employee_id, v_camp_id, p_from_date, p_to_date, p_reason, p_remarks, p_source,
   v_levels, 1,
   CASE WHEN p_source <> 'manual' THEN 'approved'::public.food_cancel_status ELSE 'pending'::public.food_cancel_status END,
   v_late, p_submitted_by,
   CASE WHEN p_source <> 'manual' THEN p_submitted_by END, CASE WHEN p_source <> 'manual' THEN v_now END,
   CASE WHEN p_source <> 'manual' THEN p_submitted_by END, CASE WHEN p_source <> 'manual' THEN v_now END,
   CASE WHEN p_source <> 'manual' THEN p_submitted_by END, CASE WHEN p_source <> 'manual' THEN v_now END
 ) RETURNING id INTO v_request_id;
 FOREACH v_meal IN ARRAY p_meals LOOP
   INSERT INTO public.food_cancellation_request_meals (request_id, meal_type)
   VALUES (v_request_id, v_meal) ON CONFLICT DO NOTHING;
 END LOOP;
 RETURN v_request_id;
END;
$$;