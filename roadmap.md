# Check-in reporting

- [x] Correct October Operations food costs by excluding legacy checkout cancellation credits while retaining genuine approvals; verified signed-in October statement: food SAR 3,780, room SAR 9,450, total SAR 13,230, with 31 regression tests passing.

- [x] Restore Noor’s cancellation visibility: All Requests includes unlinked history; new submissions resolve camps from saved stays. Verified four Noor records while signed in and stay-camp regression tests; historical approved records remain unchanged and require billing review.

- [x] Keep future food cancellations for ongoing stays, cap active cancellations at checkout, and stop costing on checkout day; verified temporary stay and checkout, then removed test records.

- [x] Add lowest-level record drill-downs to charts across all dashboards, including rooms → residents and audits → inspection responses; preserve active filters and costing calculations.

- [x] Add the reference Board Dashboard as another Dashboard menu entry, with occupancy gauge, camp revenue cards, room status and real monthly revenue heat map, using the shared themes and fonts.
- [x] Place Operations-style KPI cards at the top of the first four dashboards, above charts.

- [x] Add Board Overview, Camp Utilization, Monthly Snapshot and Contract dashboards from the references, grouped with Operations Dashboard. Uses saved data; missing age/faith and commercial contract data explicitly marked unavailable.

- [x] Fix conflicting check-in RPC versions; verified AI check-in and resident read-back with a temporary employee, then removed the test records.

- [x] Add check-in PDF receipts for successful individual, bulk, AI, and camp check-ins.
- [x] Add daily and monthly check-in report periods and PDF export.
- [x] Run reporting tests and verify real-data downloads. Receipt download verified from an existing saved check-in; a new check-in transaction was not submitted.
- [ ] Department invoice screen: record department payment, send costing statement as invoice (blocked: email sender domain setup)
- [ ] Email costing statement to each department from Department Monthly report (blocked: email sender domain setup)
- [x] Link employees to a client and bill with client meal/room rates (awaiting user go-ahead) (replaced by Supplier Master)
- [x] Asset details page (purchase date, cost, warranty, last maintenance)
- [x] Asset maintenance log (repairs/replacements, dates) feeding Needs Attention
- [x] Client link on employees + Breakfast/Lunch/Dinner/Ramadan food split in Department Monthly + statement (now via Supplier Master instead of clients)
- [x] Replace Client Master with Supplier Master (supplier food/room rates applied to supplier employees)
- [x] Reports: Supplier Costing tab (choose supplier, monthly statement PDF/CSV)
- [x] Departmental report: food cancellation details section at bottom (on-screen + PDF); cleared Ad-Dilam test camp food rates
