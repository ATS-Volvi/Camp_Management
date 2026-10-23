-- ENUMS
CREATE TYPE public.pm_frequency AS ENUM ('daily','weekly','fortnightly','monthly','bi_monthly','quarterly','four_monthly','half_yearly','yearly','custom');
CREATE TYPE public.pm_task_status AS ENUM ('pending','in_progress','completed','overdue','skipped');
CREATE TYPE public.pm_equipment_status AS ENUM ('active','inactive','retired');

-- EQUIPMENT MASTER
CREATE TABLE public.pm_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  machine_code text NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'kitchen',
  location text,
  frequency public.pm_frequency NOT NULL DEFAULT 'monthly',
  frequency_days integer NOT NULL DEFAULT 30 CHECK (frequency_days > 0),
  last_maintenance_date date,
  next_due_date date,
  status public.pm_equipment_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (camp_id, machine_code)
);
CREATE INDEX idx_pm_equipment_camp ON public.pm_equipment(camp_id);
CREATE INDEX idx_pm_equipment_due ON public.pm_equipment(next_due_date);

-- TASKS
CREATE TABLE public.pm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.pm_equipment(id) ON DELETE CASCADE,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  due_date date NOT NULL,
  status public.pm_task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_to_name text,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  completed_by_name text,
  issues_identified text,
  action_taken text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pm_tasks_equipment ON public.pm_tasks(equipment_id);
CREATE INDEX idx_pm_tasks_camp ON public.pm_tasks(camp_id);
CREATE INDEX idx_pm_tasks_status ON public.pm_tasks(status);
CREATE INDEX idx_pm_tasks_due ON public.pm_tasks(due_date);

-- LOGS (immutable history)
CREATE TABLE public.pm_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.pm_equipment(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.pm_tasks(id) ON DELETE SET NULL,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  performed_on date NOT NULL DEFAULT CURRENT_DATE,
  performed_by uuid,
  performed_by_name text,
  scheduled_due_date date,
  status public.pm_task_status NOT NULL DEFAULT 'completed',
  issues_identified text,
  action_taken text,
  remarks text,
  next_due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pm_logs_equipment ON public.pm_logs(equipment_id);
CREATE INDEX idx_pm_logs_camp ON public.pm_logs(camp_id);
CREATE INDEX idx_pm_logs_date ON public.pm_logs(performed_on);

-- updated_at triggers
CREATE TRIGGER trg_pm_equipment_updated BEFORE UPDATE ON public.pm_equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pm_tasks_updated BEFORE UPDATE ON public.pm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO-CREATE FIRST TASK when equipment is added
CREATE OR REPLACE FUNCTION public.pm_create_initial_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_due date;
BEGIN
  v_due := COALESCE(NEW.next_due_date, CURRENT_DATE + (NEW.frequency_days || ' days')::interval);
  UPDATE public.pm_equipment SET next_due_date = v_due WHERE id = NEW.id AND next_due_date IS NULL;
  INSERT INTO public.pm_tasks (equipment_id, camp_id, scheduled_date, due_date, status)
  VALUES (NEW.id, NEW.camp_id, v_due, v_due, 'pending');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pm_initial_task AFTER INSERT ON public.pm_equipment
  FOR EACH ROW EXECUTE FUNCTION public.pm_create_initial_task();

-- AUTO-SCHEDULE NEXT TASK + WRITE LOG on completion
CREATE OR REPLACE FUNCTION public.pm_on_task_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eq RECORD;
  v_next date;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT * INTO v_eq FROM public.pm_equipment WHERE id = NEW.equipment_id;
    v_next := COALESCE(NEW.completed_at::date, CURRENT_DATE) + (v_eq.frequency_days || ' days')::interval;

    -- write log
    INSERT INTO public.pm_logs (equipment_id, task_id, camp_id, performed_on, performed_by, performed_by_name,
      scheduled_due_date, status, issues_identified, action_taken, remarks, next_due_date)
    VALUES (NEW.equipment_id, NEW.id, NEW.camp_id, COALESCE(NEW.completed_at::date, CURRENT_DATE),
      NEW.completed_by, NEW.completed_by_name, NEW.due_date, 'completed',
      NEW.issues_identified, NEW.action_taken, NEW.remarks, v_next);

    -- update equipment
    UPDATE public.pm_equipment
    SET last_maintenance_date = COALESCE(NEW.completed_at::date, CURRENT_DATE),
        next_due_date = v_next
    WHERE id = NEW.equipment_id;

    -- create next pending task (only if none exists already)
    IF NOT EXISTS (SELECT 1 FROM public.pm_tasks WHERE equipment_id = NEW.equipment_id AND status IN ('pending','in_progress')) THEN
      INSERT INTO public.pm_tasks (equipment_id, camp_id, scheduled_date, due_date, status)
      VALUES (NEW.equipment_id, NEW.camp_id, v_next, v_next, 'pending');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pm_task_completed AFTER UPDATE ON public.pm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.pm_on_task_completed();

-- RLS
ALTER TABLE public.pm_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_pm_equipment" ON public.pm_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_pm_equipment" ON public.pm_equipment FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager'));
CREATE POLICY "admin_update_pm_equipment" ON public.pm_equipment FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager'));
CREATE POLICY "admin_delete_pm_equipment" ON public.pm_equipment FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager'));

CREATE POLICY "auth_read_pm_tasks" ON public.pm_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_pm_tasks" ON public.pm_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_pm_tasks" ON public.pm_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete_pm_tasks" ON public.pm_tasks FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'camp_manager'));

CREATE POLICY "auth_read_pm_logs" ON public.pm_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_insert_pm_logs" ON public.pm_logs FOR INSERT TO authenticated WITH CHECK (true);

-- SEED default catalog for every existing camp
INSERT INTO public.pm_equipment (camp_id, machine_code, name, category, frequency, frequency_days)
SELECT c.id, m.code, m.name, 'kitchen', m.freq::pm_frequency, m.days
FROM public.camps c
CROSS JOIN (VALUES
  ('RM-1001','Coffee Machine','daily',1),
  ('RM-1002','Refrigerator','weekly',7),
  ('RM-1003','Deep Fryer','fortnightly',14),
  ('RM-1004','Microwave Oven','monthly',30),
  ('RM-1005','Dishwashing Machine','bi_monthly',60),
  ('RM-1006','Ice Maker','quarterly',90),
  ('RM-1007','Juicer/Blender','four_monthly',120),
  ('RM-1008','Grill Machine','half_yearly',180),
  ('RM-1009','Water Purifier','yearly',365)
) AS m(code,name,freq,days)
ON CONFLICT (camp_id, machine_code) DO NOTHING;