# Goal G-20260730-01 — Produce the required Ads account reports

## Intake wording

`relatórios contas ads`

## Useful outcome

Produce the required account reports from verified evidence in a dedicated
`dg5i-ads-agent` thread, with each account, period, source, audience, and
decision identified.

## Status and route

- Status: `verified_done`
- Owner workspace: `C:\Users\Guilherme Silveira\Projects\dg5i-ads-agent`
- Owner skill when activated: `dg5i-inteligencia-performance`
- Owner task: `019fb2d0-3af2-7461-9348-99d4a850066c`
- Pauta scope: priority, status, blocker, and return point only.

## Success criteria

1. Exact clients, platforms, and account identities are named.
2. Main period and comparison period are defined.
3. Audience, supported decision, deadline, commercial source, and artifact
   format are defined.
4. Missing evidence is marked `not confirmed`, never converted to zero.
5. The final artifact is verified in the owning workspace before any delivery.

## Current gaps

- Accounts and clients: unavailable.
- Period and comparison: unavailable.
- Delivery deadline and audience: unavailable.
- Commercial source of truth: unavailable.

## First task

### AR-01 — Confirm report scope

- Status: `verified_done`
- Action: name the exact accounts, reporting period, and delivery deadline.
- Done condition: every requested report has an account identity, period, and
  required delivery time.
- Result: the existing owner task and report run were identified. Detailed
  scope and evidence remain in the owner task.
- Timebox: 5 minutes.

### AR-02 — Continue the report revision in the owner task

- Status: `verified_done`
- Parent: AR-01
- Action: continue the current report revision in the dedicated
  `dg5i-ads-agent` task.
- Done condition: the owner task returns verified updated artifacts, an exact
  blocker, or an approval requirement.
- Timebox: 25 minutes.
- Started at: `2026-07-30 10:35 America/Sao_Paulo`.
- Completed at: `2026-07-30 12:04 America/Sao_Paulo`.
- Result: after the initial return at 11:10, the owner task completed a later
  visual revision and returned the final 16-page vertical 9:16 PDF, Markdown,
  HTML, and page mosaic. The rendered PDF passed structural and visual QA with
  zero overflow, footer collision, or text below 8 px; the workspace validated
  without issues or warnings.
- Limitation: billing for Sicredi Gerações and Sicredi Sementes remains `N/D`
  because 2FA blocked the current financial evidence.
- Release state: no commit or push was performed in the report task; release
  0.8.1 remained intact and Git stayed clean.
- Timebox correction: this was task metadata only. The heartbeat created by
  mistake was deleted at `2026-07-30 11:12 America/Sao_Paulo`.

## Approval gates and stop conditions

- Client-facing delivery requires explicit approval.
- Stop before account collection when identity, contract scope, or period is
  ambiguous.
- No advertising mutation is included.

## Return point

Report task `019fb2d0-3af2-7461-9348-99d4a850066c` is verified complete with
the 16-page 9:16 revision. Resume `G-20260730-00 — Triage the 2026-07-30
agenda`.
