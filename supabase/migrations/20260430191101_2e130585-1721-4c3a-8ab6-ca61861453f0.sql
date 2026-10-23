ALTER TABLE public.meal_orders
  ADD CONSTRAINT meal_orders_employee_id_fkey
  FOREIGN KEY (employee_id)
  REFERENCES public.employees(id)
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';