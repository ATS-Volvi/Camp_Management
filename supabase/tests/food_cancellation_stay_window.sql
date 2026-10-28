-- Run as a read-only query after applying the stay-window migration.
-- A failed rule raises division by zero rather than silently returning false.
SELECT 1 / (bool_and(actual = expected)::integer) AS passed
FROM (VALUES
  (public.food_cancellation_dates_within_stay('2026-10-05','2026-10-15','2026-10-10','2026-10-20'), false),
  (public.food_cancellation_dates_within_stay('2026-10-15','2026-10-21','2026-10-10','2026-10-20'), false),
  (public.food_cancellation_dates_within_stay('2026-10-10','2026-10-20','2026-10-10','2026-10-20'), true),
  (public.food_cancellation_dates_within_stay('2026-10-12','2026-10-15','2026-10-10','2026-10-20'), true),
  (public.food_cancellation_dates_within_stay('2026-10-20','2026-10-10','2026-10-10','2026-10-20'), false),
  (public.food_cancellation_dates_within_stay('2026-10-10','2026-11-01','2026-10-10',NULL), true),
  (public.food_cancellation_dates_within_stay(NULL,'2026-10-20','2026-10-10','2026-10-20'), false)
) AS cases(actual, expected);