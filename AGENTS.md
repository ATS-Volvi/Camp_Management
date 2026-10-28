# Project rules

- Validate food cancellation stay windows in a database write trigger using saved occupancy events, so direct writes and forced requests cannot bypass date checks; checkout caps active requests instead of creating post-stay cancellations.
- Billing windows include arrival and exclude checkout day, matched to the first departure per stay through the shared stay-billing helper, so future cancellations and later stays cannot extend charges.
- Food cancellation calendars use stay dates from the current-resident hook and shared date validation; ongoing stays have no fabricated departure limit.
- Food cancellation request filters derive departments from the selected camp's current residents and clear employee selection when either filter changes, so stale selections cannot be submitted.
- Food cancellation submissions resolve their camp from saved stays covering the full requested dates, not the employee master; All Requests defaults to all camps and retains unlinked historical records for visibility without altering billing or approval status.
- Invoice and shared revenue calculations enforce approved-only cancellation credits at calculation time as well as query time; approval changes invalidate both report caches so totals refresh without a reload.
- Billing cancellation inputs include source and exclude legacy auto_checkout requests through the shared approval helper; saved departures already end billing, so old checkout requests cannot credit later stays.

- Dashboard theme preferences are scoped to the command dashboard container and persisted across its views, keeping application-wide branding and themes unchanged.
- Dashboard charts use the shared ChartDrilldown record viewer with filtered source records and stable identifiers; room records expose their resident leaves, and audit records load saved inspection responses, so drill-downs stay traceable without changing reporting calculations.

- Command dashboards share a paginated read-only data hook, reconstruct dated resident snapshots from occupancy events, and reuse report revenue calculations; unavailable demographics and commercial contracts must not be fabricated.
- The Expertise board is a shared command dashboard view; its calendar-year heat map groups the same saved stay revenue calculations by camp and month, leaving future months empty.

- Keep one date-aware `perform_check_in` RPC with optional trailing arguments; overlapping default-argument overloads make legacy and AI check-in calls ambiguous.

- Department monthly costing statements reuse the revenue report's stay and food-cost calculations, with a dedicated statement export module, so displayed and exported amounts stay consistent.
- Check-in receipts and period reports share a PDF export module and read saved check-in records after successful transactions, so failures never appear as confirmed check-ins.- Supplier rates live in the supplier master and are matched to supplier employees by supplier name inside the shared revenue calculation, so department and supplier statements always charge the same per-meal and room amounts.
- Camp Food Rates master (`public.camp_meal_rates`, one row per camp) sets standard per-meal prices (BF/Lunch/Dinner/Ramadan) for non-supplier staff; the shared revenue calculation and Cost Invoicing use it when present and fall back to the room's daily food rate split evenly, while supplier employees always bill at Supplier Master rates.
