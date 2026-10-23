
-- Drop the old 4-param perform_check_in (keep the 6-param version with defaults)
DROP FUNCTION IF EXISTS public.perform_check_in(uuid, uuid, uuid, uuid);

-- Drop the old 7-param perform_check_out (keep the 11-param version with defaults)
DROP FUNCTION IF EXISTS public.perform_check_out(uuid, uuid, uuid, uuid, boolean, text, text);
