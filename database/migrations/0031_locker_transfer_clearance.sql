CREATE OR REPLACE FUNCTION public.locker_transfer_confirmed(p_allocation uuid,p_target uuid,p_date date,p_condition text,p_key boolean,p_remarks text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a record;n uuid;BEGIN
IF NOT(public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager') OR public.has_role(auth.uid(),'hr_admin')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
SELECT * INTO a FROM public.locker_allocations WHERE id=p_allocation;
IF a.id IS NULL OR a.employee_id IS NULL OR a.locker_id=p_target THEN RAISE EXCEPTION 'Select another available locker';END IF;
PERFORM 1 FROM public.employees WHERE id=a.employee_id FOR UPDATE;
PERFORM 1 FROM public.lockers WHERE id IN(a.locker_id,p_target) ORDER BY id FOR UPDATE;
PERFORM public.locker_release(a.id,p_date,p_condition,p_key,p_remarks);
n:=public.locker_allocate(p_target,a.employee_id,p_date,p_remarks,false,a.id);
INSERT INTO public.locker_events(locker_id,allocation_id,kind,effective_date,actor,previous_value,new_value,remarks) VALUES(p_target,n,'Transfer',p_date,auth.uid(),jsonb_build_object('locker',a.locker_id),jsonb_build_object('locker',p_target),COALESCE(p_remarks,''));RETURN n;END $$;
REVOKE ALL ON FUNCTION public.locker_transfer(uuid,uuid,date,text) FROM authenticated,PUBLIC,anon;
REVOKE ALL ON FUNCTION public.locker_transfer_confirmed(uuid,uuid,date,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.locker_transfer_confirmed(uuid,uuid,date,text,boolean,text) TO authenticated;