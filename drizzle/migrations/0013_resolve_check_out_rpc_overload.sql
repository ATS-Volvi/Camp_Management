-- 0002 added a date-aware perform_check_out next to the original 11-argument one; with both present every call fails as "function is not unique".
-- Keep the date-aware entry point, whose trailing default also serves existing 11-argument callers.
DROP FUNCTION IF EXISTS public.perform_check_out(uuid, uuid, uuid, uuid, boolean, text, text, boolean, text, text, integer);
COMMENT ON FUNCTION public.perform_check_out(uuid, uuid, uuid, uuid, boolean, text, text, boolean, text, text, integer, timestamptz) IS 'Canonical check-out RPC. Optional check-out date supports both legacy and date-aware callers; do not add overlapping default-argument overloads.';
