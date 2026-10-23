
DROP POLICY IF EXISTS "admin_manage_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "admin_update_ingredients" ON public.ingredients;

CREATE POLICY "authenticated_insert_ingredients"
ON public.ingredients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_ingredients"
ON public.ingredients
FOR UPDATE
TO authenticated
USING (true);
