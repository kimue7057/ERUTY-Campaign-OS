# ERUTY Campaign OS — Codex Implementation Specification

Version: 1.0 | Date: 2026-10-12 | Status: implementation handoff

## 0. Scope and governing decisions

Build an internal web platform for ERUTY. This iteration focuses on **(A) campaign/activity scheduling** and **(B) hierarchical budgets, commitments, expenses, payments and evidence**. Implement the minimum campaign/strategy/activity/subtask scaffolding these features require. Do NOT build a separate "My work" or employee workload dashboard, payroll system, automatic sales-channel API integration, AI recommendations, or blockchain settlement in this iteration.

The approved hierarchy is **Brand > Country > Campaign > Strategy > Activity > optional Subtask**. Activities are the default operating unit. Subtasks are optional and never mandatory for a simple activity. A campaign may contain multiple strategies; each strategy multiple activities; each activity 0..N subtasks. Campaigns have a planned timeframe, an approved budget ceiling, target gross/net sales, and target ERUTY revenue. Distinguish sales from ERUTY revenue. Do not infer accounting revenue automatically without a contract rule. This iteration need not implement full sales operations; support campaign target fields and read-only/manual summary stubs if the existing app has no sales module. NEVER label mock numbers as actual business data.

Use Korean UI labels. If starting from an empty repository, default to Next.js (App Router) + TypeScript, accessible React components, a maintainable Gantt/calendar library or custom timeline, PostgreSQL + an ORM/migrations layer, and a small service layer for aggregation. If the repository already exists, inspect and preserve its existing stack, conventions and authentication. Request clarification for irreversible architecture choices. Do not overwrite or destroy existing data.

## 1. Navigation and screen contracts

### 1.1 Campaign detail shell
- Breadcrumb: Brand / Country / Campaign.
- Header: campaign name, country, owner, baseline dates/current plan dates, campaign state; target sales and target ERUTY revenue shown separately (if actuals unavailable, show '-' or 'not connected').
- Primary tabs for this implementation only: **Overview**, **Schedule**, **Budget & Costs**. Do not create an employee-specific view.
- Overview cards: budget ceiling, planned allocation, approved incurred costs, cash paid, plan vs baseline delivery status, scheduled activity count and overdue activity count. Campaign date spans do not add up overlapping activity durations.
- A drilldown from any aggregate to its underlying strategy/activity, budget line, expense, or payment must be available.

### 1.2 Schedule screen
Desktop layout: filter bar (strategy, activity status, date range), week/month zoom, baseline toggle, add activity, then split view with collapsible strategy/activity/subtask tree at left and aligned Gantt timeline at right. On smaller screens, fall back to horizontal scrolling; never truncate dates silently.

Interactions:
1. Click a bar: right-hand detail drawer shows name, status, owner, current start/end, original baseline start/end, actual dates, optional subtasks, dependency list, and change history.
2. Drag a bar horizontally: shift current planned start and end by identical calendar-day delta.
3. Resize either bar edge: change exactly that endpoint and validate start <= end.
4. Expand activity: show optional subtasks with their own dates and budget allocations.
5. Create/edit Finish-to-Start (FS) predecessor link with configurable nonnegative calendar-day lag. Reject cycles, self-dependencies, and ancestor/descendant edges. Show connector lines visually.
6. If a date change violates FS dependencies or campaign limits, display a modal preview of affected successors (before/after); choose either 'shift affected successors' or 'keep and mark conflict' where permitted, or cancel. Never silently shift multiple activities.
7. Baseline: snapshot current schedule when plan is approved. Later changes modify current plan, never rewrite prior approved baseline. Record who changed what and when.
8. Flags: overdue (current date > scheduled end and not complete), started later than planned, successor dependency conflict, outside campaign window. Use local date comparison in Asia/Seoul. Status 'complete' does not automatically assert achievement of the activity KPI.
9. Plans and actuals are distinct: actual_start, actual_end are manual verified facts. Dragging the plan must not change actual dates.
10. Completing a subtask need not automatically mark its parent activity completed.

Date model uses YYYY-MM-DD date-only columns; intervals are inclusive in the UI. Calendar day is default; business-day scheduling is out of scope. Dependencies apply between activities and/or subtasks with validation; MVP can support activity-to-activity links first, but should keep data model extensible and include subtask-to-subtask within the same activity before final acceptance if feasible.

### 1.3 Budget & Costs screen
Header cards: budget ceiling; allocated plan; unallocated plan; approved incurred costs; total cleared cash paid; unspent plan; approved commitments outstanding. Show contracts/commitments separately from expenses to prevent double counting.

Main budget tree: Strategy > Activity > optional Subtask allocation drilldown. Columns: Plan, Committed, Incurred, Paid, Plan variance, Status. Activity plan is sourced only from its own budget lines; subtask allocations are partitions of activity budget lines and must NOT add to activity plan or campaign plan a second time.

Right drawer or detail pages:
- Budget line editor: campaign, strategy/activity, category, description, planned KRW amount, version/change reason.
- Subtask allocation: choose existing activity budget line and allocate part of it; show remaining unallocated parent amount; prevent over-allocation unless change is explicitly confirmed/revised.
- Commitment editor: vendor/creator, linked budget line, linked work item, agreement/invoice reference, commitment date, local currency/amount, locked FX rate, KRW converted amount, agreement evidence, approval state.
- Expense editor: activity or campaign common-cost budget line, optional subtask, vendor, item description, incurred date, invoice number, local amount/currency, FX rate and KRW, category, commitment link (optional), evidence attachment, state draft/approved/reversed.
- Payments: multiple partial payments per approved expense; payment date, KRW amount, currency, external reference, evidence, state cleared/reversed; total effective cleared payments must not exceed effective approved expense amount unless explicitly modeled as advance/prepayment (out of scope for MVP).
- Expense ledger: filter by activity, category, incurred month, vendor, state, payment state. Sort/export CSV (UTF-8 BOM for Korean Excel).
- Common campaign costs: budget lines without an activity; show separately and include once in campaign totals. Optional cost allocation across activities only if allocation math is explicitly modeled; otherwise leave under common costs.

Costs are not equivalent to payments: budget is planned spending; commitment is an approved purchase/contract obligation; expense is verified incurred cost; paid amount is cash disbursement. These are separate dimensions and must not be summed together as if they were four cost types. Use immutable audit events for approved financial records; correct approved records via reversal/adjustment, not deletion.

Budget conventions:
- Base reporting currency is KRW, stored as integer won (bigint-safe). Allow original currencies with decimal values plus stored exchange rate, rate date and converted KRW value. Never recalculate historical converted KRW from a current FX quote.
- Choose an explicit VAT inclusion policy at campaign setup and display it on all reports; no automatic assumption about tax treatment.
- Budget ceiling = campaign-level approved cap, not the automatically added plan total.
- Allocated plan = sum(activity budget lines) + sum(common campaign budget lines).
- Unallocated plan = ceiling - allocated plan; if negative show over-cap warning.
- Activity plan = sum(activity budget lines), regardless of its subtask allocations.
- Strategy plan = sum(plans of its activities).
- Approved incurred = sum(effective approved expense amounts), excluding draft and reversed entries.
- Paid = sum(effective cleared payment amounts), with reversed payments netted out.
- Unpaid accrued = max(0, approved incurred - cleared payments), scoped to applicable invoices.
- Outstanding commitment = amount of an approved commitment not yet satisfied by approved expenses linked to it (never add the full approved commitment AND its matched expenses into a combined cost metric).
- Plan remaining = allocated plan - approved incurred, which may be negative. Do not use it as a cash balance.
- Where commitments are linked, derive expected open obligation without double-counting linked incurred costs.

## 2. Example (DEMO ONLY)
Campaign 'Vietnam Beauty Q4 Launch': campaign budget ceiling = KRW 15,000,000. Strategy Viral: Comments 1,000,000 + Boost 2,500,000 + Seeding 1,500,000 = 5,000,000. Strategy Influencer: List 500,000 + Outreach 1,000,000 + Contracts/Content 3,500,000 = 5,000,000. Strategy Conversion: Product Page 1,500,000 + Promotion 3,500,000 = 5,000,000. Total allocated = 15,000,000. Demo effective approved expenses: KRW 9,000,000. Demo cleared payments: KRW 7,000,000. Remaining approved expenses unpaid = KRW 2,000,000 (assuming no other special payment adjustments).

Activity 'Influencer contracts/content' plan = KRW 3,500,000. Subtask allocations: terms KRW 300,000, contract signing KRW 200,000, creator content reward KRW 2,500,000. Unallocated under parent = KRW 500,000. Campaign total must still be KRW 15,000,000, NOT KRW 18,000,000.

## 3. Data model guidance (adapt to the existing app)

Tables/relations (indicative, use database FK, indexed IDs, created_at, updated_at, soft delete or revision policy):
- brands(id, name)
- brand_country_operations(id, brand_id, country_code)
- campaigns(id, brand_country_operation_id, name, plan_start, plan_end, budget_ceiling_krw, vat_policy, target_sales_krw, target_eruty_revenue_krw, status, schedule_baseline_version)
- strategies(id, campaign_id, name, sort_order)
- work_items(id, campaign_id, strategy_id, parent_id NULL for activity, kind ACTIVITY|SUBTASK, name, owner_id nullable, status, planned_start, planned_end, actual_start nullable, actual_end nullable, goal_description, goal_progress_pct, sort_order). CHECK depth <= 2 and parent belongs to same strategy/campaign.
- schedule_dependencies(id, predecessor_work_item_id, successor_work_item_id, kind FS, lag_calendar_days). CHECK acyclic, no self, no ancestor/descendant relation.
- schedule_baselines(id, campaign_id, revision_number, approved_at, approved_by); schedule_baseline_items(baseline_id, work_item_id, start, end, status_snapshot).
- budget_lines(id, campaign_id, activity_work_item_id NULL for COMMON, category, planned_amount_krw, description, version). If activity_work_item_id not null, must be ACTIVITY, not SUBTASK.
- subtask_budget_allocations(id, budget_line_id, subtask_work_item_id, amount_krw). Sum per budget_line <= budget_line planned amount; subtask must belong to the same parent activity as that budget line.
- commitments(id, campaign_id, budget_line_id, work_item_id nullable, vendor, reference, committed_amount_original, currency, fx_rate_locked, committed_amount_krw, committed_date, status, evidence_ref)
- expenses(id, campaign_id, budget_line_id, work_item_id nullable, commitment_id nullable, vendor, invoice_number nullable, description, incurred_on, amount_original, currency, fx_rate_locked, approved_amount_krw, state DRAFT|APPROVED|REVERSED, evidence_ref, reverses_expense_id nullable)
- payments(id, expense_id, paid_on, original_amount, currency, fx_rate_locked, paid_amount_krw, external_reference, state CLEARED|REVERSED, evidence_ref)
- attachments(id, uploaded_by, storage_key, filename, mime, size_bytes, created_at); use restricted object storage and signed downloads
- audit_events(id, actor_id, entity_type, entity_id, action, before_json, after_json, created_at)

Financial writes use transactional DB operations, authorization checks, idempotency keys on bulk operations/imports, and validations to prevent duplicate entries. Do not allow deleting approved expense/payment evidence without authorized reversible correction.

## 4. API/service contracts (illustrative names)
- GET/POST /api/campaigns; GET/PATCH /api/campaigns/:campaignId
- GET/POST /api/campaigns/:campaignId/strategies
- GET/POST/PATCH /api/campaigns/:campaignId/work-items
- POST /api/campaigns/:campaignId/schedule/preview-change => proposed dates, successor impacts, conflicts, budget-unaffected disclaimer
- POST /api/campaigns/:campaignId/schedule/commit-change => confirmed changes, optimistic revision check, audit events
- GET/POST /api/campaigns/:campaignId/schedule/dependencies
- POST /api/campaigns/:campaignId/schedule/baselines
- GET/POST/PATCH /api/campaigns/:campaignId/budget-lines
- POST/PATCH /api/campaigns/:campaignId/subtask-budget-allocations
- GET/POST /api/campaigns/:campaignId/commitments
- GET/POST /api/campaigns/:campaignId/expenses; POST /api/expenses/:id/approve; POST /api/expenses/:id/reverse
- POST /api/expenses/:id/payments; POST /api/payments/:id/reverse
- GET /api/campaigns/:campaignId/summary -> date ranges, budget sums, open commitments, incurred, paid, and traceable drilldowns.

Endpoints can be implemented as server actions if that is the existing pattern. Normalize response errors and validation feedback in Korean. Server must recompute aggregates; client-submitted aggregate totals cannot be trusted.

## 5. Acceptance tests — must pass before saying it is done

Schedule:
S1. Shift a five-day activity three days using drag; exact duration is preserved, database and Gantt both update.
S2. Resize end date; only end moves, start unchanged; invalid reverse range blocked.
S3. A -> B FS dependency: moving A past B opens preview and does not silently alter B.
S4. Confirm successor shift applies atomically to the full impacted chain; cancel leaves all dates intact.
S5. A -> B -> C -> A cyclic link is rejected.
S6. Current plan changes never mutate frozen original baseline or manually entered actual dates; baseline variance shown.
S7. Overlapping activities are not summed to derive campaign calendar span; items outside campaign dates are clearly flagged.
S8. Expanded optional subtasks display and may have their own schedule; simple activities without subtasks work normally.

Budgets and costs:
B1. Activity allocation 3.5m KRW, subtasks 0.3m/0.2m/2.5m -> parent remains 3.5m; remaining parent 0.5m.
B2. Increase a subtask allocation beyond remaining parent budget -> block or explicit revision flow with warning; no silent overflow.
B3. Sum the eight demo activity budgets -> exactly 15m KRW; common budget line included once if present.
B4. Register a 2m KRW commitment; approve 0.8m incurred against it -> outstanding commitment = 1.2m, not 2.8m combined cost.
B5. Approve 9m total expenses; clear 7m payments -> incurred 9m, paid 7m, unpaid 2m.
B6. Two partial payments sum correctly; reversed payment removes effect without deleting audit history.
B7. Draft/reversed expenses do not inflate approved incurred totals.
B8. Foreign currency expense retains original amount, locked FX rate, converted KRW even if reference FX later changes.
B9. Evidence is access-restricted; an unauthorised user cannot fetch another campaign's evidence.
B10. Editing one activity planned budget updates activity, strategy, campaign aggregates consistently and without subtask double-counting.
B11. Expense without a subtask, or without any activity but linked to a campaign-common budget line, is supported.

Quality:
Q1. Desktop 1440px and narrow-width scrolling usable in Korean; accessibility for keyboard + pointer interactions; keyboard alternative for drag/resize date edits.
Q2. Financial values stored/aggregated without floating-point KRW rounding error.
Q3. DB constraints + server validations enforce relationships; role-based access consistent with existing internal authentication.
Q4. Tests: unit aggregation/validation, integration CRUD and revision/audit, E2E drag-and-drop/financial CRUD. Provide reproducible commands.
Q5. Seed data is clearly labelled DEMO and never confused with real company sales/cost data.

## 6. Implementation sequence and Codex handoff

Work in separate reviewable changes/PRs, not a giant one-off patch:
1. Inspect repository; report stack, existing tables, deployment, auth and migration approach. Draft file-by-file plan and exact dependencies. If repository is empty, scaffold documented baseline.
2. Core entities and navigation for Brand/Country/Campaign/Strategy/Activity/optional Subtask; prepare demo seed.
3. Schedule: timeline, CRUD, drag & resize, dependency previews, conflict handling, baseline and audit.
4. Budget & Costs: budget lines, subtask allocation, commitments, incurred expenses, partial payments, evidence, reversals, aggregation.
5. Integrate summaries, authorization and tests; run lint/build/test; create PR with screenshots, migration notes, acceptance-test results and remaining limitations.

Before writing migrations, ask only about existing schema conflicts or critical blockers. Do NOT implement employee personal task view. Do NOT invent a target GitHub repository. Await the user's repository selection to initiate coding.

## 7. Suggested first Codex instruction

Read `ERUTY_Campaign_Codex_Implementation_Spec.md` fully. Implement only the approved internal Campaign OS scheduling and budget/cost capabilities. First inspect this repository and propose a short plan based on its actual structure; then implement incrementally with migrations, Korean UI, backend validations, tests, and demonstrable Gantt/budget screens. Prioritize avoiding budget double counting and preventing silent automatic shifts of dependent tasks. Exclude employee-specific task screens, AI, and sales-channel integrations. Treat the example seed as demo only. Provide a PR and evidence that tests S1-S8, B1-B11 and Q1-Q5 pass, and explicitly list unfinished items.
