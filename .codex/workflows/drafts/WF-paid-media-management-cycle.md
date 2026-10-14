# Workflow draft — Paid-media management cycle

Status: `draft`
Automation mode: `manual`
Owner: Pauta for priority and continuity; dedicated client tasks/workspaces for execution and evidence.

## Trigger

Start when one of these occurs:

- a client or internal request arrives;
- a real deadline or contractual cadence is due;
- a balance, spend, tracking, lead-quality, or performance signal needs review;
- an approval, asset, access, or external dependency changes;
- a report or financial follow-up is due.

## Intake minimum

Capture only:

1. client/account or portfolio scope;
2. useful outcome and consequence;
3. real deadline, if confirmed;
4. source of truth and freshest evidence time;
5. next action, done condition, and approval boundary.

## Operating lanes

Every item belongs to one lane:

1. Strategy and decision.
2. Tracking, access, assets, or readiness.
3. Campaign/account operation.
4. Funding, collection, or approval follow-up.
5. Reporting, client communication, and next cadence.

## State flow

`captured -> clarifying -> ready -> active -> verifying -> verified_done`

Side states:

- `waiting_approval`
- `waiting_external`
- `blocked`
- `stopped`

Every side state must preserve one return point.

## Manual cycle

1. **Capture** — attach the item to a client or portfolio goal.
2. **Validate** — confirm contract, identity, account, evidence date, measurement, and permissions.
3. **Prioritize** — use consequence, unblock effect, useful effect, then time/energy fit.
4. **Prepare** — define the smallest action, expected evidence, stop rule, and approval requirement.
5. **Execute** — work in the dedicated client task/workspace; one block at a time.
6. **Verify** — inspect final object state and commercial/source-of-truth evidence.
7. **Close or wait** — record result, blocker, approval/external dependency, and exact return point.
8. **Report and learn** — update the client record, required financial/reporting output, and next cadence.

## Daily rhythm

- Opening: reconcile deadlines, funding/balance risk, access blockers, and waiting approvals.
- Main block: run one client/account item through the manual cycle.
- Communication block: batch approved client follow-ups and financial requests.
- Close: record verified work, waiting states, blockers, and tomorrow's first action.

Do not create a background-monitoring claim unless a real automation exists and its latest run is verified.

### Managed-account STATUS pass

This is a manual Pauta task, performed either in the first hour of the morning
or in the late afternoon. It is not an automation.

Review order:

1. Real Park — Google Ads, Meta Ads.
2. Assertiva — Google Ads, Meta Ads.
3. Empório do Frango — Meta Ads.
4. Hotdog — Meta Ads.
5. Pelanda — Google Ads, Meta Ads.
6. JE — Google Ads, Meta Ads.

For every platform, return a compact packet with:

- enabled campaign/ad objects and rolling seven-day metrics through the current
  local date;
- confirmed financial balance calculated as latest confirmed contribution less
  confirmed consumption since that contribution;
- highest-spend object, lowest positive-spend object, and materially relevant
  zero-spend objects listed separately;
- discrepancies and anomalies against identity, strategy, objective, delivery,
  budget, policy, destination, tracking, or evidence freshness;
- source, exact account identity, period, timezone, collection timestamp, and
  limitations;
- one classification: `normal`, `attention`, `blocked`, or `not_confirmed`.

Do not infer balance from planned budget, billing/account limits, invoice value,
credit, or technical caps. Missing current evidence is `not_confirmed`, never
zero. Live collection and evidence stay in the dedicated `dg5i-ads-agent`
thread; Pauta receives only the compact status, impact, blocker/approval, and
return point.

## Source-of-truth split

| Information | Source |
| --- | --- |
| Current priority and return point | `PAINEL.md` |
| Chronological activity | `prontuario/YYYY-MM-DD.md` |
| Client scope, strategy, approvals, evidence, reports | dedicated client workspace |
| Current platform state | fresh platform/account read |
| Commercial result | CRM, Firestore, sales feedback, or named commercial source |
| Detailed execution conversation | dedicated Codex task |

## Proof

The cycle passes when one real item completes a manual run and:

- the result has direct evidence;
- Pauta and the client task agree on status;
- the next action is visible;
- no approval boundary was crossed;
- the user can resume without reconstructing the history.

## Stop conditions

- missing client/account identity;
- missing or conflicting contract scope;
- stale or unavailable current data;
- authentication or permission failure;
- unknown asset origin or missing required preview;
- approval-gated action reached;
- weak commercial evidence;
- repeated failure without a new diagnostic hypothesis.

## Promotion rule

Keep this workflow as a draft until one full manual run is verified. Promote only after the user establishes it as the standard and the first run confirms the done condition.
