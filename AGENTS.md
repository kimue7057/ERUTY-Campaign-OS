# Codex repository instructions — ERUTY Campaign OS

## Read first
- Read `docs/ERUTY_Campaign_Codex_Implementation_Spec.md` fully before designing schema or writing production code.
- Read `docs/IMPLEMENTATION_PHASES.md` and `docs/ARCHITECTURE_DECISIONS.md`.
- This repository starts as an intentionally minimal Next.js UI shell; it is NOT a functioning operations platform.

## Scope constraints
- Implement **only** campaign/activity scheduling and granular budgets/costs, plus minimum entities/navigation/auth needed for those two functions.
- Hierarchy: Brand > Country > Campaign > Strategy > Activity > optional Subtask. Do not create a third nested work-item level.
- No individual employee "My Work" dashboard, no sales-channel API sync, no AI, no blockchain settlement, no payroll.
- Track target net sales and target ERUTY recognized revenue separately; do not claim mock targets/figures are real business data.
- All user-facing UI text/errors should be in Korean.

## Business invariants (high priority)
1. Campaign approved budget ceiling is independent from the sum of approved/activity budget lines.
2. Activity plan is sum of activity budget lines. Subtask budget allocations **partition** their parent lines and never increase campaign plan or strategy plan.
3. Campaign plan = sum of activity budget lines + campaign-common budget lines once, never summing subtask allocations again.
4. Commitment, approved incurred expense, and cleared payment are separate amounts. Never sum them as a single 'spent' total.
5. Approved financial entries require reversal/adjustment with an audit trail, not destructive delete. Do not allow paid total to exceed net approved expense unless an explicit advance-payment feature is built (not in scope).
6. Schedule changes must preview downstream impact; **never silently auto-shift successors**. Freeze baseline snapshots separately from current plan; actual dates are immutable facts absent explicit correction.
7. Date-only schedule uses Asia/Seoul and inclusive calendar dates. Concurrent activities do not have additive campaign durations.
8. Validate FK/cross-campaign relationships, prevent dependency cycles, and enforce authorization on the server, including attachment downloads.
9. KRW is stored as precise integer won (BigInt/Decimal as needed), FX rates locked with original currency, and VAT treatment explicitly recorded.
10. Prohibit financial double counting and duplicates from retries/imports. Use database transactions and idempotency where relevant.

## Engineering process
- First produce a concrete repository assessment (what exists vs missing), planned schema, library selections with licenses, and implementation order.
- Implement in small reviewable PRs matching `docs/IMPLEMENTATION_PHASES.md`. Do not implement the entire spec as one unreviewable patch.
- Check dependency versions/security and upgrade to supported patched versions before production work.
- Add migrations, validation, unit/integration/E2E tests, and audit events with sensitive finance changes.
- Demonstrate run commands and visible UI screenshots for each completed major screen.
- Do not silently replace external services or fabricate credentials. Ask only when blocked by a decision requiring user involvement.
- Use `.env.example` as a template; never commit `.env`, real tokens, financial invoices, or private evidence files.
- Before reporting 'done', show tests run, test results, known limitations and PR links. Never claim untested features are finished.

## First task
See `docs/CODEX_TASK_01.md` — bootstrap inspection and core domain foundation. Do not start the advanced drag/drop feature until foundation data model is validated.
