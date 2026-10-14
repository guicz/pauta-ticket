# Goal G-20260803-04 — Review all in-scope advertising accounts

## Current status

- Status: `superseded`
- Superseded on: `2026-08-11`
- Replacement: `.codex/goals/active/G-20260811-01-review-all-accounts.md`
- Owner workspace: `C:\Users\Guilherme Silveira\Projects\dg5i-ads-agent`
- Owner skill: `ads-diagnostics`
- Owner thread: not created
- Cadence: manual, either first morning hour or late afternoon; no automation.

## Mandatory review order

1. Real Park — Google Ads, Meta Ads.
2. Assertiva — Google Ads, Meta Ads.
3. Empório do Frango — Meta Ads.
4. Hotdog — Meta Ads.
5. Pelanda — Google Ads, Meta Ads.
6. JE — Google Ads, Meta Ads.

## STATUS contract

For each platform, record:

1. enabled ads/campaign objects and rolling seven-day metrics ending on the
   current local date;
2. latest confirmed funding contribution, confirmed consumption since it, and
   the resulting financial balance;
3. highest-spend and lowest positive-spend objects, with zero-spend objects
   separated when relevant;
4. discrepancies or anomalies against identity, strategy, objective, delivery,
   budget, policy, destination, tracking, or evidence freshness;
5. source, exact account identity, period, timezone, collection timestamp, and
   limitations;
6. classification: `normal`, `attention`, `blocked`, or `not_confirmed`.

Planned budget, billing/account limits, invoice value, platform credit, and
technical caps are not financial balance. If the latest contribution or
consumption cannot be confirmed, report `not_confirmed`, never zero.

## Useful outcome

Produce a current client/account inventory table and a read-only diagnosis of
every confirmed in-scope Meta Ads and Google Ads account before any campaign,
budget, or ad change.

## Success criteria

1. The contracted roster and current authenticated platform inventories are
   reconciled without treating an older list as current.
2. One table separates Meta Ads and Google Ads and records client, platform,
   exact account name and ID, contract scope, access status, and limitation.
3. Period, sources, timezone, and evidence freshness are explicit.
4. Each account is classified as normal, attention needed, partial, or blocked.
5. Platform conversions are not represented as sales or qualified leads without
   a confirmed commercial source.
6. Recommendations are debated before any mutation is proposed or executed.

## First task

### RA-01 — Confirm access and the account roster

- Status: `ready`
- Action: in a dedicated owner thread, verify current authentication and
  reconcile the in-scope account roster across Meta Ads and Google Ads in the
  mandatory order above, then collect the STATUS packet for each platform.
- Done condition: each expected client/account has an exact identity, platform,
  contract state, access state, source timestamp, and limitation.
- Timebox: 15 minutes.

## Readiness evidence

- Credential gate completed and synchronized in package release `0.8.4`.
- Manual Meta/Google checklist exists in Markdown and PDF.
- The dashboard portfolio collection confirmed current access, but the user's
  independent checklist pass and discrepancy comparison were not performed.

## Approval gates

- Diagnosis is read-only.
- Campaign, ad, budget, bid, billing, tracking, or publication changes require a
  separate exact approval envelope and post-state verification.

## Return point

Bring back only risk, business impact, approval needed, and next step.
