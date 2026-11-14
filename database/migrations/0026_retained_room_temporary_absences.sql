CREATE TABLE public.accommodation_absence_reasons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, absence_status public.presence_status NOT NULL DEFAULT 'away', is_active boolean NOT NULL DEFAULT true);
GRANT SELECT ON public.accommodation_absence_reasons TO authenticated;
GRANT ALL ON public.accommodation_absence_reasons TO service_role;
GRANT INSERT,UPDATE,DELETE ON public.accommodation_absence_reasons TO authenticated;
ALTER TABLE public.accommodation_absence_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY reasons_read ON public.accommodation_absence_reasons FOR SELECT TO authenticated USING(true);
CREATE POLICY reasons_admin ON public.accommodation_absence_reasons FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'hr_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'hr_admin'));
CREATE TABLE public.accommodation_absences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), check_in_id uuid NOT NULL REFERENCES public.check_ins(id) ON DELETE CASCADE, employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE, camp_id uuid NOT NULL REFERENCES public.camps(id), room_id uuid NOT NULL REFERENCES public.rooms(id), reason text NOT NULL, absence_status public.presence_status NOT NULL DEFAULT 'away', temporary_out_date date NOT NULL, expected_return_date date, actual_return_date date, ended_by_checkout boolean NOT NULL DEFAULT false, created_by uuid NOT NULL, returned_by uuid, created_at timestamptz NOT NULL DEFAULT now(), returned_at timestamptz);
GRANT SELECT ON public.accommodation_absences TO authenticated;
GRANT ALL ON public.accommodation_absences TO service_role;
ALTER TABLE public.accommodation_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY absences_read ON public.accommodation_absences FOR SELECT TO authenticated USING(true);
CREATE UNIQUE INDEX one_open_absence ON public.accommodation_absences(employee_id) WHERE actual_return_date IS NULL;
CREATE OR REPLACE FUNCTION public.temporary_check_out(p_employee_id uuid,p_date date,p_reason text,p_expected_return date DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ci record; v_status public.presence_status; v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'hr_admin') OR public.has_role(auth.uid(),'camp_manager')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 PERFORM 1 FROM public.employees WHERE id=p_employee_id FOR UPDATE;
 SELECT * INTO ci FROM public.check_ins WHERE employee_id=p_employee_id ORDER BY check_in_date DESC,id DESC LIMIT 1;
 IF ci.id IS NULL OR EXISTS(SELECT 1 FROM public.check_outs WHERE employee_id=p_employee_id AND check_out_date>=ci.check_in_date) THEN RAISE EXCEPTION 'Employee is not currently checked in'; END IF;
 IF p_date IS NULL OR p_date<ci.check_in_date::date OR p_date>CURRENT_DATE OR (p_expected_return IS NOT NULL AND p_expected_return<p_date) THEN RAISE EXCEPTION 'Invalid temporary departure or expected return date'; END IF;
 IF EXISTS(SELECT 1 FROM public.accommodation_absences WHERE employee_id=p_employee_id AND (actual_return_date IS NULL OR actual_return_date>p_date)) THEN RAISE EXCEPTION 'Overlapping temporary absence'; END IF;
 SELECT absence_status INTO v_status FROM public.accommodation_absence_reasons WHERE name=p_reason AND is_active;
 IF v_status IS NULL OR v_status NOT IN ('vacation','on_site','away') THEN RAISE EXCEPTION 'Choose an active temporary absence reason'; END IF;
 INSERT INTO public.accommodation_absences(check_in_id,employee_id,camp_id,room_id,reason,absence_status,temporary_out_date,expected_return_date,created_by) VALUES(ci.id,p_employee_id,ci.camp_id,ci.room_id,p_reason,v_status,p_date,p_expected_return,auth.uid()) RETURNING id INTO v_id;
 UPDATE public.employees SET presence_status=v_status WHERE id=p_employee_id;
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.return_from_temporary_absence(p_absence_id uuid,p_date date,p_room_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; r record; ci record;
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
 IF p_room_id IS NOT NULL AND p_room_id<>a.room_id THEN RAISE EXCEPTION 'Return to the retained room first, then use the authorized room transfer process'; END IF;
 UPDATE public.accommodation_absences SET actual_return_date=p_date,returned_by=auth.uid(),returned_at=now() WHERE id=a.id;
 UPDATE public.employees SET presence_status='active' WHERE id=a.employee_id;
 RETURN a.id;
END $$;
REVOKE ALL ON FUNCTION public.temporary_check_out(uuid,date,text,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.return_from_temporary_absence(uuid,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.temporary_check_out(uuid,date,text,date),public.return_from_temporary_absence(uuid,date,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.close_absence_on_permanent_checkout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.accommodation_absences WHERE employee_id=NEW.employee_id AND actual_return_date IS NULL AND temporary_out_date>NEW.check_out_date::date) THEN RAISE EXCEPTION 'Permanent checkout cannot precede temporary departure'; END IF;
 UPDATE public.accommodation_absences SET actual_return_date=NEW.check_out_date::date,ended_by_checkout=true,returned_by=NEW.performed_by,returned_at=now() WHERE employee_id=NEW.employee_id AND actual_return_date IS NULL;
 UPDATE public.employees SET presence_status='away' WHERE id=NEW.employee_id;
 RETURN NEW; END $$;
CREATE TRIGGER close_absence_permanent_checkout AFTER INSERT ON public.check_outs FOR EACH ROW EXECUTE FUNCTION public.close_absence_on_permanent_checkout();