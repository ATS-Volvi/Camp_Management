
-- Assignment history table to track all assignment/reassignment events
CREATE TABLE public.maintenance_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  assigned_to text,
  assigned_from text,
  assigned_by uuid REFERENCES auth.users(id),
  action text NOT NULL DEFAULT 'assigned',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assignment history"
  ON public.maintenance_assignment_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert assignment history"
  ON public.maintenance_assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maintenance_supervisor'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
  );

-- Notifications table for assignment alerts
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name text,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  reference_id uuid,
  reference_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maintenance_supervisor'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
  );

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
