-- Keep the date-aware entry point, whose defaults also support existing callers.
DROP FUNCTION IF EXISTS public.perform_check_in(uuid, uuid, uuid, uuid, text, text, boolean);
COMMENT ON FUNCTION public.perform_check_in(uuid, uuid, uuid, uuid, text, text, boolean, timestamptz) IS 'Canonical check-in RPC. Optional food and check-in date arguments support both legacy and date-aware callers; do not add overlapping default-argument overloads.';
NOTIFY pgrst, 'reload schema';