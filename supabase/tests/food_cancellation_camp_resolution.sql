-- Read-only regressions for Noor's missing camp and invalid pre-arrival request.
SELECT 1 / (bool_and(actual IS NOT DISTINCT FROM expected)::integer) AS passed
FROM (VALUES
  (public.food_cancellation_stay_camp('3c973df4-a0c6-45dc-b4e8-257a6e22243b', '2026-10-12', '2026-11-01'), 'a1000000-0000-0000-0000-000000000001'::uuid),
  (public.food_cancellation_stay_camp('3c973df4-a0c6-45dc-b4e8-257a6e22243b', '2026-10-03', '2026-10-08'), NULL::uuid),
  (public.food_cancellation_stay_camp('3c973df4-a0c6-45dc-b4e8-257a6e22243b', '2026-08-02', '2026-08-31'), 'a1000000-0000-0000-0000-000000000001'::uuid)
) AS cases(actual, expected);