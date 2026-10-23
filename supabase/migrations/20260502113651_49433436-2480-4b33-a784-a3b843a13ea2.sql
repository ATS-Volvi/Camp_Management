
ALTER TABLE public.pm_equipment ADD COLUMN IF NOT EXISTS default_assignee_name text;

-- Update the initial-task trigger to copy default assignee
CREATE OR REPLACE FUNCTION public.pm_create_initial_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_due date;
BEGIN
  v_due := COALESCE(NEW.next_due_date, CURRENT_DATE + (NEW.frequency_days || ' days')::interval);
  UPDATE public.pm_equipment SET next_due_date = v_due WHERE id = NEW.id AND next_due_date IS NULL;
  INSERT INTO public.pm_tasks (equipment_id, camp_id, scheduled_date, due_date, status, assigned_to_name)
  VALUES (NEW.id, NEW.camp_id, v_due, v_due, 'pending', NEW.default_assignee_name);
  RETURN NEW;
END $function$;

-- Update the recurring-task trigger to copy default assignee onto next task
CREATE OR REPLACE FUNCTION public.pm_on_task_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eq RECORD;
  v_next date;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT * INTO v_eq FROM public.pm_equipment WHERE id = NEW.equipment_id;
    v_next := COALESCE(NEW.completed_at::date, CURRENT_DATE) + (v_eq.frequency_days || ' days')::interval;

    INSERT INTO public.pm_logs (equipment_id, task_id, camp_id, performed_on, performed_by, performed_by_name,
      scheduled_due_date, status, issues_identified, action_taken, remarks, next_due_date)
    VALUES (NEW.equipment_id, NEW.id, NEW.camp_id, COALESCE(NEW.completed_at::date, CURRENT_DATE),
      NEW.completed_by, NEW.completed_by_name, NEW.due_date, 'completed',
      NEW.issues_identified, NEW.action_taken, NEW.remarks, v_next);

    UPDATE public.pm_equipment
    SET last_maintenance_date = COALESCE(NEW.completed_at::date, CURRENT_DATE),
        next_due_date = v_next
    WHERE id = NEW.equipment_id;

    IF NOT EXISTS (SELECT 1 FROM public.pm_tasks WHERE equipment_id = NEW.equipment_id AND status IN ('pending','in_progress')) THEN
      INSERT INTO public.pm_tasks (equipment_id, camp_id, scheduled_date, due_date, status, assigned_to_name)
      VALUES (NEW.equipment_id, NEW.camp_id, v_next, v_next, 'pending', v_eq.default_assignee_name);
    END IF;
  END IF;
  RETURN NEW;
END $function$;
