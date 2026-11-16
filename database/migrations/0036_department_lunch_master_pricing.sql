CREATE TABLE public.department_lunch_rates (
 camp_id uuid PRIMARY KEY REFERENCES public.camps(id), unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.department_lunch_rates TO authenticated;
GRANT ALL ON public.department_lunch_rates TO service_role;
ALTER TABLE public.department_lunch_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY department_lunch_rate_read ON public.department_lunch_rates FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE POLICY department_lunch_rate_admin ON public.department_lunch_rates FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
REVOKE ALL ON public.department_lunch_rates FROM anon;
INSERT INTO public.department_lunch_rates(camp_id,unit_price) SELECT camp_id,lunch_rate FROM public.camp_meal_rates WHERE lunch_rate IS NOT NULL;
COMMENT ON TABLE public.department_lunch_managers IS 'Manager approval temporarily bypassed for new department lunch submissions; existing decisions preserved.';
CREATE FUNCTION public.request_department_lunch(p_department uuid,p_camp uuid,p_date date,p_quantity integer,p_remarks text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_price numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) OR EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND is_disabled) THEN RAISE EXCEPTION 'Active staff access required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.departments WHERE id=p_department AND is_active) THEN RAISE EXCEPTION 'Choose an active department'; END IF;
 IF p_date IS NULL OR p_quantity IS NULL OR p_quantity<=0 THEN RAISE EXCEPTION 'Enter a date and positive lunch count'; END IF;
 SELECT unit_price INTO v_price FROM public.department_lunch_rates WHERE camp_id=p_camp FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Configure a department lunch price in Masters for this camp first'; END IF;
 INSERT INTO public.department_lunch_requests(department_id,camp_id,meal_date,quantity,unit_price,status,requested_by,decision_note) VALUES(p_department,p_camp,p_date,p_quantity,v_price,'approved',auth.uid(),'Approval skipped for current workflow') RETURNING id INTO v_id;
 UPDATE public.department_lunch_requests SET remarks=coalesce(p_remarks,'') WHERE id=v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.request_department_lunch(uuid,uuid,date,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_department_lunch(uuid,uuid,date,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_department_lunch(p_department uuid,p_camp uuid,p_date date,p_quantity integer,p_price numeric,p_remarks text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RETURN public.request_department_lunch(p_department,p_camp,p_date,p_quantity,p_remarks); END $$;
COMMENT ON FUNCTION public.submit_department_lunch(uuid,uuid,date,integer,numeric,text) IS 'Compatibility wrapper: requester price ignored; always snapshots the master rate.';
