REVOKE EXECUTE ON FUNCTION public.seed_meal_orders_window(date, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_meal_orders_window(date, date) TO authenticated;