
CREATE TABLE public.item_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'Bedding',
  quantity integer NOT NULL DEFAULT 1,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  returned_date date,
  condition text NOT NULL DEFAULT 'good',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.item_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read item_assignments"
  ON public.item_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert item_assignments"
  ON public.item_assignments FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
  );

CREATE POLICY "Admins can update item_assignments"
  ON public.item_assignments FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
  );

CREATE POLICY "Admins can delete item_assignments"
  ON public.item_assignments FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
  );
