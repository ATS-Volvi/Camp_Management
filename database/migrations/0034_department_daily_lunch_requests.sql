CREATE TABLE public.department_lunch_managers (
 department_id uuid PRIMARY KEY REFERENCES public.departments(id),
 user_id uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_lunch_managers TO authenticated;
GRANT ALL ON public.department_lunch_managers TO service_role;
ALTER TABLE public.department_lunch_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY lunch_manager_read ON public.department_lunch_managers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY lunch_manager_admin ON public.department_lunch_managers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TABLE public.department_lunch_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES public.departments(id),
 camp_id uuid NOT NULL REFERENCES public.camps(id), meal_date date NOT NULL,
 quantity integer NOT NULL CHECK (quantity > 0), unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
 total_cost numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
 requested_by uuid NOT NULL DEFAULT auth.uid(), approved_by uuid, decided_at timestamptz,
 remarks text NOT NULL DEFAULT '', decision_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.department_lunch_requests TO authenticated;
GRANT ALL ON public.department_lunch_requests TO service_role;
ALTER TABLE public.department_lunch_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY lunch_request_read ON public.department_lunch_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX department_lunch_month ON public.department_lunch_requests(meal_date,department_id,status);
CREATE FUNCTION public.validate_department_lunch_manager() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_staff(NEW.user_id) OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=NEW.user_id AND NOT coalesce(is_disabled,false)) THEN RAISE EXCEPTION 'Choose an active staff account as department manager'; END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER department_lunch_manager_guard BEFORE INSERT OR UPDATE ON public.department_lunch_managers FOR EACH ROW EXECUTE FUNCTION public.validate_department_lunch_manager();
CREATE FUNCTION public.submit_department_lunch(p_department uuid,p_camp uuid,p_date date,p_quantity integer,p_price numeric,p_remarks text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND is_disabled) THEN RAISE EXCEPTION 'Active staff access required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.department_lunch_managers WHERE department_id=p_department) THEN RAISE EXCEPTION 'Assign a department manager before requesting lunch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.departments WHERE id=p_department AND is_active) THEN RAISE EXCEPTION 'Choose an active department'; END IF;
 IF p_date IS NULL OR p_quantity IS NULL OR p_quantity <= 0 OR p_price IS NULL OR p_price < 0 OR p_price <> round(p_price,2) THEN RAISE EXCEPTION 'Enter a date, positive meal count and valid price with up to two decimals'; END IF;
 INSERT INTO public.department_lunch_requests(department_id,camp_id,meal_date,quantity,unit_price,requested_by,remarks) VALUES(p_department,p_camp,p_date,p_quantity,p_price,auth.uid(),coalesce(p_remarks,'')) RETURNING id INTO v_id;
 RETURN v_id;
END $$;
CREATE FUNCTION public.decide_department_lunch(p_request uuid,p_status text,p_note text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.department_lunch_requests;
BEGIN
 SELECT * INTO r FROM public.department_lunch_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND is_disabled) THEN RAISE EXCEPTION 'Active staff access required'; END IF;
 IF r.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be changed'; END IF;
 IF p_status='cancelled' THEN
  IF r.requested_by <> auth.uid() THEN RAISE EXCEPTION 'Only the requester can cancel'; END IF;
 ELSIF p_status IN ('approved','rejected') THEN
  IF NOT EXISTS (SELECT 1 FROM public.department_lunch_managers WHERE department_id=r.department_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Only the assigned department manager can decide'; END IF;
  IF r.requested_by=auth.uid() THEN RAISE EXCEPTION 'A manager cannot approve their own request'; END IF;
  IF p_status='rejected' AND length(trim(coalesce(p_note,'')))=0 THEN RAISE EXCEPTION 'Enter a rejection reason'; END IF;
 ELSE RAISE EXCEPTION 'Invalid decision'; END IF;
 UPDATE public.department_lunch_requests SET status=p_status,approved_by=auth.uid(),decided_at=now(),decision_note=coalesce(p_note,'') WHERE id=p_request;
END $$;
REVOKE ALL ON FUNCTION public.submit_department_lunch(uuid,uuid,date,integer,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.decide_department_lunch(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_department_lunch(uuid,uuid,date,integer,numeric,text), public.decide_department_lunch(uuid,text,text) TO authenticated;
