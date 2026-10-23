-- Fix ingredients RLS to allow all authenticated users to manage the ingredient master.
-- The previous policy restricted inserts to super_admin and camp_manager roles,
-- which blocked the "Auto-Populate" feature and manual ingredient additions for regular users.

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "admin_manage_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "admin_update_ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "admin_delete_ingredients" ON public.ingredients;

-- Allow all authenticated users to INSERT, UPDATE ingredients
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

-- Only super_admin can delete (keep data safe)
CREATE POLICY "admin_delete_ingredients"
  ON public.ingredients
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'camp_manager'::app_role)
  );
