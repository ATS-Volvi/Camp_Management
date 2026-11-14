CREATE OR REPLACE FUNCTION public.validate_permanent_departure() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE ci record; BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager') OR public.has_role(auth.uid(),'hr_admin')) THEN RAISE EXCEPTION 'Not authorized to check out'; END IF;
 PERFORM 1 FROM public.employees WHERE id=NEW.employee_id FOR UPDATE;
 SELECT * INTO ci FROM public.check_ins WHERE employee_id=NEW.employee_id ORDER BY check_in_date DESC,id DESC LIMIT 1;
 IF ci.id IS NULL OR ci.room_id<>NEW.room_id OR ci.camp_id<>NEW.camp_id OR NEW.check_out_date<ci.check_in_date OR EXISTS(SELECT 1 FROM public.check_outs WHERE employee_id=NEW.employee_id AND check_out_date>=ci.check_in_date) THEN RAISE EXCEPTION 'Invalid or duplicate permanent checkout'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER validate_permanent_departure BEFORE INSERT ON public.check_outs FOR EACH ROW EXECUTE FUNCTION public.validate_permanent_departure();
CREATE OR REPLACE FUNCTION public.return_from_temporary_absence(p_absence_id uuid,p_date date,p_room_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; ci record; r record;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'hr_admin') OR public.has_role(auth.uid(),'camp_manager')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO a FROM public.accommodation_absences WHERE id=p_absence_id;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Absence not found'; END IF;
 PERFORM 1 FROM public.employees WHERE id=a.employee_id FOR UPDATE;
 SELECT * INTO a FROM public.accommodation_absences WHERE id=p_absence_id FOR UPDATE;
 IF a.actual_return_date IS NOT NULL THEN RAISE EXCEPTION 'Absence already closed'; END IF;
 IF p_date IS NULL OR p_date<a.temporary_out_date OR p_date>CURRENT_DATE THEN RAISE EXCEPTION 'Invalid return date'; END IF;
 SELECT * INTO ci FROM public.check_ins WHERE id=a.check_in_id;
 IF EXISTS(SELECT 1 FROM public.check_outs WHERE employee_id=a.employee_id AND check_out_date>=ci.check_in_date) THEN RAISE EXCEPTION 'Employee has permanently checked out'; END IF;
 UPDATE public.accommodation_absences SET actual_return_date=p_date,returned_by=auth.uid(),returned_at=now() WHERE id=a.id;
 IF p_room_id IS NOT NULL AND p_room_id<>a.room_id THEN
 SELECT * INTO r FROM public.rooms WHERE id=p_room_id FOR UPDATE;
 IF r.id IS NULL OR r.camp_id<>a.camp_id OR r.status IN ('under_maintenance','reserved') OR r.current_occupancy>=r.max_capacity THEN RAISE EXCEPTION 'Return room unavailable'; END IF;
 -- An explicit relocation creates an auditable departure/arrival at the return boundary, not a duplicate simultaneous stay.
 INSERT INTO public.check_outs(employee_id,room_id,camp_id,performed_by,check_out_date,assets_returned,clearance_notes) VALUES(a.employee_id,a.room_id,a.camp_id,auth.uid(),p_date::timestamptz,true,'Room change on return');
 UPDATE public.rooms SET current_occupancy=GREATEST(current_occupancy-1,0),status=CASE WHEN current_occupancy<=1 THEN 'vacant'::public.room_status ELSE 'partially_occupied'::public.room_status END WHERE id=a.room_id;
 PERFORM public.perform_check_in(a.employee_id,p_room_id,a.camp_id,auth.uid(),NULL,NULL,ci.food_required,p_date::timestamptz);
 UPDATE public.employees SET room_id=p_room_id,camp_id=a.camp_id WHERE id=a.employee_id;
 END IF;
 UPDATE public.employees SET presence_status='active' WHERE id=a.employee_id;
 RETURN a.id;
END $$;
CREATE OR REPLACE FUNCTION public.get_kitchen_meal_count(p_camp_id uuid,p_date date) RETURNS TABLE(meal_type text,total_active integer,cancelled integer,net_count integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH residents AS (SELECT DISTINCT ON(ci.employee_id) ci.* FROM public.check_ins ci WHERE ci.check_in_date::date<=p_date ORDER BY ci.employee_id,ci.check_in_date DESC,ci.id DESC), eligible AS (
 SELECT r.employee_id FROM residents r WHERE r.camp_id=p_camp_id AND r.food_required AND NOT EXISTS(SELECT 1 FROM public.check_outs co WHERE co.employee_id=r.employee_id AND co.check_out_date>=r.check_in_date AND co.check_out_date::date<=p_date) AND NOT EXISTS(SELECT 1 FROM public.accommodation_absences a WHERE a.employee_id=r.employee_id AND a.temporary_out_date<=p_date AND (a.actual_return_date IS NULL OR p_date<a.actual_return_date)))
 SELECT m.meal_type,(SELECT count(*)::int FROM eligible),count(DISTINCT e.employee_id)::int,GREATEST((SELECT count(*)::int FROM eligible)-count(DISTINCT e.employee_id)::int,0)
 FROM (VALUES('breakfast'),('lunch'),('dinner'),('iftar'),('suhoor')) m(meal_type)
 LEFT JOIN eligible e ON public.is_meal_cancelled(e.employee_id,p_date,m.meal_type::public.food_meal_type)
 GROUP BY m.meal_type;
$$;