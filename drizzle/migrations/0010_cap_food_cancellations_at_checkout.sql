CREATE OR REPLACE FUNCTION public.auto_cancel_on_checkout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_arrival date;
BEGIN
 SELECT ci.check_in_date::date INTO v_arrival FROM public.check_ins ci
 WHERE ci.employee_id = NEW.employee_id AND ci.camp_id = NEW.camp_id AND ci.check_in_date <= NEW.check_out_date
 ORDER BY ci.check_in_date DESC LIMIT 1;
 IF v_arrival IS NULL THEN RETURN NEW; END IF;
 UPDATE public.food_cancellation_requests SET status = 'cancelled'
 WHERE employee_id = NEW.employee_id AND camp_id = NEW.camp_id
 AND status IN ('pending','approved') AND to_date > NEW.check_out_date::date
 AND from_date > NEW.check_out_date::date;
 UPDATE public.food_cancellation_requests SET to_date = NEW.check_out_date::date
 WHERE employee_id = NEW.employee_id AND camp_id = NEW.camp_id
 AND status IN ('pending','approved') AND from_date >= v_arrival
 AND from_date <= NEW.check_out_date::date AND to_date > NEW.check_out_date::date;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_food_billable_days(p_employee_id uuid, p_from date, p_to date)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d date; v_stay record; v_status public.presence_status; v_days integer := 0;
BEGIN
 FOR d IN SELECT generate_series(p_from, p_to, interval '1 day')::date LOOP
   SELECT ci.* INTO v_stay FROM public.check_ins ci
   WHERE ci.employee_id = p_employee_id AND ci.check_in_date::date <= d
   ORDER BY ci.check_in_date DESC LIMIT 1;
   IF v_stay.id IS NULL OR NOT COALESCE(v_stay.food_required,false) THEN CONTINUE; END IF;
   IF EXISTS (SELECT 1 FROM public.check_outs co WHERE co.employee_id = p_employee_id
      AND co.check_out_date >= v_stay.check_in_date AND co.check_out_date::date <= d) THEN CONTINUE; END IF;
   SELECT sl.to_status INTO v_status FROM public.employee_status_log sl
   WHERE sl.employee_id = p_employee_id AND sl.effective_from <= d
     AND (sl.effective_to IS NULL OR sl.effective_to >= d)
   ORDER BY sl.effective_from DESC LIMIT 1;
   IF COALESCE(v_status,'active'::public.presence_status) = 'active' THEN v_days := v_days + 1; END IF;
 END LOOP;
 RETURN v_days;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_checkout_report()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_emp RECORD; v_room RECORD; v_camp RECORD; v_check_in_date timestamptz; v_stay_days integer; v_daily_rate numeric; v_total_cost numeric;
BEGIN
 SELECT name, employee_id INTO v_emp FROM employees WHERE id = NEW.employee_id;
 SELECT room_number, category INTO v_room FROM rooms WHERE id = NEW.room_id;
 SELECT name INTO v_camp FROM camps WHERE id = NEW.camp_id;
 SELECT check_in_date INTO v_check_in_date FROM check_ins
 WHERE employee_id = NEW.employee_id AND room_id = NEW.room_id AND check_in_date <= NEW.check_out_date
 ORDER BY check_in_date DESC LIMIT 1;
 v_stay_days := GREATEST(0, NEW.check_out_date::date - COALESCE(v_check_in_date::date, NEW.check_out_date::date));
 SELECT COALESCE(daily_rate,0) INTO v_daily_rate FROM camp_room_rates
 WHERE camp_id = NEW.camp_id AND room_category = v_room.category::text LIMIT 1;
 v_daily_rate := COALESCE(v_daily_rate,0);
 v_total_cost := v_stay_days * v_daily_rate;
 INSERT INTO checkout_reports (check_out_id,employee_id,employee_name,employee_id_code,room_number,room_category,camp_name,camp_id,check_in_date,check_out_date,stay_days,daily_rate,total_cost,assets_returned,clearance_notes,damage_remarks,feedback,feedback_rating,is_blacklisted,blacklist_reason,report_data)
 VALUES (NEW.id,NEW.employee_id,COALESCE(v_emp.name,'Unknown'),COALESCE(v_emp.employee_id,'—'),COALESCE(v_room.room_number,'—'),v_room.category::text,COALESCE(v_camp.name,'—'),NEW.camp_id,v_check_in_date,NEW.check_out_date,v_stay_days,v_daily_rate,v_total_cost,NEW.assets_returned,NEW.clearance_notes,NEW.damage_remarks,NEW.feedback,NEW.feedback_rating,NEW.is_blacklisted,NEW.blacklist_reason,jsonb_build_object('performed_by',NEW.performed_by,'generated_at',now()));
 RETURN NEW;
END;
$$;