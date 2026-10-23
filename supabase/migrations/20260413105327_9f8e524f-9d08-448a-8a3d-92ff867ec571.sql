
-- Drop existing policies on menu_dish_ingredients
DROP POLICY IF EXISTS "Allow authenticated users to insert dish ingredients" ON public.menu_dish_ingredients;
DROP POLICY IF EXISTS "Allow authenticated users to update dish ingredients" ON public.menu_dish_ingredients;
DROP POLICY IF EXISTS "Allow authenticated users to delete dish ingredients" ON public.menu_dish_ingredients;
DROP POLICY IF EXISTS "Allow authenticated users to select dish ingredients" ON public.menu_dish_ingredients;

-- Ensure RLS is enabled
ALTER TABLE public.menu_dish_ingredients ENABLE ROW LEVEL SECURITY;

-- Create a single permissive policy for ALL operations
CREATE POLICY "Full access to menu_dish_ingredients for authenticated users"
ON public.menu_dish_ingredients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure the ingredients master table has the same broad access
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Drop old granular policies that may conflict
DROP POLICY IF EXISTS "admin_delete_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "auth_read_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "authenticated_insert_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "authenticated_update_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Full access to ingredients for authenticated users" ON public.ingredients;

CREATE POLICY "Full access to ingredients for authenticated users"
ON public.ingredients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
