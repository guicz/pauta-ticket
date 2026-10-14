# Goal G-20260803-00 — Capture and triage the 2026-08-03 agenda

## Current status

- Status: `verified_done`
- Completed at: `2026-08-03 09:21 America/Sao_Paulo`
- Started at: `2026-08-03 09:00 America/Sao_Paulo`
- Owner: principal daily Pauta hub

## Useful outcome

Convert the user's unstructured agenda into at most three valid priorities
without inventing deadlines, consequences, dependencies, or commitments.

## Success criteria

1. The raw agenda is preserved in `prontuario/2026-08-03.md` before it is reorganized.
2. Each intended outcome receives a goal contract before tasks are derived.
3. The first priority is selected from a real deadline, consequence, unblock
   effect, or explicit user choice.
4. `PAINEL.md` shows at most three priorities and exactly one current task.
5. Substantive domain work is routed to its owner project and dedicated thread.

## Current evidence

- The user supplied five agenda items at 09:13.
- No deadline or cutoff was supplied for invoice sending.
- Ads credentials may unblock three other items, but the failure and exact
  credential target are not confirmed.
- The 31/07 paid-media close has a preserved blocked return point; it has not
  been selected as today's priority.

## Scope

- Included: intake, clarification, ranking, routing, timeboxing, and return points.
- Excluded: substantive client, campaign, reporting, legal, financial,
  research, writing, design, code, debugging, system, or credential work.

## Task plan

### PT-01 — Receive today's raw agenda

- Status: `verified_done`
- Action: receive the agenda exactly as it comes from the user.
- Done condition: the raw input is appended to the dated record without losing
  wording or prematurely assigning priorities.
- Result: the five-line input was appended verbatim to
  `prontuario/2026-08-03.md` before triage.
- Timebox: 5 minutes for user input.

### PT-02 — Confirm the invoice deadline

- Status: `deferred_by_user`
- Parent: PT-01
- Action: ask whether the invoices must be sent today and obtain the cutoff.
- Done condition: the date and cutoff are confirmed, or the user states that
  no deadline applies today.
- Result: the user explicitly selected Ads credentials as the first priority;
  the invoice deadline remains unavailable.
- Timebox: 5 minutes.

### PT-03 — Select the first valid priority

- Status: `verified_done`
- Parent: PT-02
- Action: rank invoice sending against the Ads credential dependency chain.
- Done condition: one goal has an owner, status, next action, visible done
  condition, timebox, and exact return point.
- Result: `G-20260803-01` was selected because the user chose it and it may
  unblock the account review, dashboard, and monitor chain.
- Timebox: 5 minutes after the deadline answer.

## Approval gates and stop conditions

- Do not perform substantive domain work in the daily hub.
- Do not rank work by guessed urgency.
- Stop before external, financial, legal, client-facing, advertising,
  credential, production, destructive, commit, push, or deployment actions.

## Return point

Open or continue the dedicated technical thread for `G-20260803-01`, then
return its compact result to Pauta.
