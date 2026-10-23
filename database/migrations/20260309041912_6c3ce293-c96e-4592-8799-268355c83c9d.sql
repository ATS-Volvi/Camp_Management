-- Tighten INSERT policy so inmates can only create tickets as themselves
DROP POLICY IF EXISTS "Any authenticated user can raise tickets" ON public.maintenance_tickets;

CREATE POLICY "Any authenticated user can raise tickets"
ON public.maintenance_tickets
FOR INSERT
TO authenticated
WITH CHECK (reported_by = auth.uid());
