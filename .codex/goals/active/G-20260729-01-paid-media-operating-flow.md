# Goal G-20260729-01 — Establish a single paid-media operating flow

## Useful outcome

The user can see what to do now, complete one client/account block at a time, and resume after interruptions without reconstructing strategy, financial follow-up, execution, and reporting from scattered tasks.

## Success criteria

1. Every incoming item is attached to a client or portfolio goal before tasks are created.
2. Every active item has one state, one next action, one done condition, and one evidence location.
3. `PAINEL.md` shows at most three priorities and exactly one in-progress task.
4. Client/account details stay in the dedicated task/workspace; Pauta keeps only status and return points.
5. Strategy, financial follow-up, advertising mutations, and client-facing delivery retain explicit approval gates.

## Scope

- Included: capture, triage, state model, daily focus, client-thread routing, approval points, verification, reporting handoff, and return points.
- Excluded: changing campaigns, budgets, billing, tracking, credentials, calendars, automations, or sending client communications.

## Fundamentals

- Real deadlines and consequences outrank perceived urgency.
- Current platform/account truth requires a fresh read from the named source.
- Platform attribution is not commercial truth.
- Missing evidence is `not confirmed`, not zero or complete.
- A draft, automation configuration, or publication toast is not completion evidence.

## Assumptions

- The immediate bottleneck is scattered state and unclear sequencing.
- The existing dedicated client tasks should be preserved instead of merged into one large execution task.
- The first run should remain manual until the flow is proven.

## Approval gates

Explicit approval remains required before:

- campaign, ad, budget, bid, billing, tracking, conversion, pause, publish, or delete actions;
- client-facing messages, collections, report delivery, or commitments;
- calendar, automation, credential, permission, production, commit, push, or deploy changes.

## Task plan

### T-01 — Reconcile visible intake candidates

- Status: `partial`
- Action: classify each visible paid-media candidate by client, consequence, real deadline, state, source of truth, blocker, and next action.
- Done condition: no candidate remains only as an ambiguous thread title.
- Timebox: 25 minutes.
- Progress: Real Park was selected and completed for its approved 2026-07-29
  scope. The 2026-07-30 Ads-report candidate is captured as
  `G-20260730-01`, with exact accounts, period, and deadline still unavailable.

### T-02 — Select today's maximum three priorities

- Status: `not_started`
- Parent: T-01
- Action: rank confirmed items by consequence, unblock effect, useful effect, and available capacity.
- Done condition: `PAINEL.md` contains no more than three priorities and one in progress.
- Timebox: 15 minutes.

### T-03 — Run one client block through the full cycle

- Status: `not_started`
- Parent: T-02
- Action: execute one confirmed item from intake through evidence, approval check, verification, and next cadence.
- Done condition: one item reaches `verified_done`, `waiting_approval`, `waiting_external`, or a documented blocker.
- Timebox: 25 minutes.

### T-04 — Validate the operating cycle

- Status: `not_started`
- Parent: T-03
- Action: compare the first run with the workflow draft and remove or adjust only steps that caused real friction.
- Done condition: the workflow has one verified manual run and a recorded correction or `no_change_needed`.
- Timebox: 15 minutes.

## Risks and stop conditions

- Stop if client identity, contract scope, account identity, authentication, data window, or source of truth is missing.
- Stop before any approval-gated action.
- Stop after repeated failed access attempts and record the exact blocker.
- Do not automate until one manual run is verified and the source, verifier, limits, and rollback are defined.

## Current task

Paused while `G-20260730-00 — Triage the 2026-07-30 agenda` confirms the first
real deadline or consequence.

## Return point

If Ads reports become active, continue in a dedicated `dg5i-ads-agent` thread
only after the exact accounts, period, audience, and deadline are confirmed.
