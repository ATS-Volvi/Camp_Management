CREATE OR REPLACE FUNCTION public.food_cancellation_dates_within_stay(p_from date, p_to date, p_arrival date, p_departure date)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT COALESCE(p_from <= p_to AND p_from >= p_arrival AND (p_departure IS NULL OR p_to <= p_departure), false);
$$;

CREATE OR REPLACE FUNCTION public.validate_food_cancellation_stay_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_stay record;
 v_valid boolean := false;
BEGIN
 IF NEW.from_date IS NULL OR NEW.to_date IS NULL OR NEW.from_date > NEW.to_date THEN
   RAISE EXCEPTION 'Please enter a valid food cancellation date range.' USING ERRCODE = '22023';
 END IF;
 -- Preserve application-owned checkout/leave triggers, not user-supplied source or force flags.
 IF pg_trigger_depth() > 1 AND NEW.source IN ('auto_checkout', 'auto_leave') THEN
   RETURN NEW;
 END IF;
 -- Reject invalid requests on creation, date/employee/camp changes, and approval.
 IF TG_OP = 'UPDATE' THEN
   IF NEW.employee_id IS NOT DISTINCT FROM OLD.employee_id
      AND NEW.camp_id IS NOT DISTINCT FROM OLD.camp_id
      AND NEW.from_date IS NOT DISTINCT FROM OLD.from_date
      AND NEW.to_date IS NOT DISTINCT FROM OLD.to_date
      AND NEW.status <> 'approved' THEN
     RETURN NEW;
   END IF;
 END IF;
 FOR v_stay IN
   SELECT ci.check_in_date::date AS arrival,
     (SELECT min(event_time)::date FROM (
       SELECT co.check_out_date AS event_time FROM public.check_outs co
       WHERE co.employee_id = ci.employee_id AND co.check_out_date >= ci.check_in_date
       UNION ALL
       SELECT subsequent.check_in_date FROM public.check_ins subsequent
       WHERE subsequent.employee_id = ci.employee_id
         AND subsequent.camp_id <> ci.camp_id
         AND subsequent.check_in_date > ci.check_in_date
     ) departures) AS departure
   FROM public.check_ins ci
   WHERE ci.employee_id = NEW.employee_id AND ci.camp_id = NEW.camp_id
 LOOP
   IF public.food_cancellation_dates_within_stay(NEW.from_date, NEW.to_date, v_stay.arrival, v_stay.departure) THEN
     v_valid := true;
     EXIT;
   END IF;
 END LOOP;
 IF NOT v_valid THEN
   RAISE EXCEPTION 'Food cancellation not allowed: the employee was not staying there for the entire selected period (% to %). Choose dates within their check-in and check-out dates.', to_char(NEW.from_date, 'DD/MM/YYYY'), to_char(NEW.to_date, 'DD/MM/YYYY') USING ERRCODE = '22023';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER food_cancellation_stay_window
BEFORE INSERT OR UPDATE ON public.food_cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_food_cancellation_stay_window();