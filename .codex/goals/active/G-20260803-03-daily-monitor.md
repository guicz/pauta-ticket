# Goal G-20260803-03 — Create the personal parallel Ads review checklist

## Current status

- Status: `verified_done`
- Completed at: `2026-08-03 15:11 America/Sao_Paulo`
- Activated at: `2026-08-03 14:59 America/Sao_Paulo`
- Owner workspace: `C:\Users\Guilherme Silveira\Projects\dg5i-ads-agent`
- Owner skill: `dg5i-loop-engineer`
- Owner thread: `019fc8c9-81ce-7912-b049-0040235e53fa`

## Useful outcome

Give the user a repeatable 15-to-25-minute manual checklist for independently
reviewing current Meta Ads and Google Ads accounts, then comparing observations
with the agent without authorizing platform mutations.

## Success criteria

1. The current contracted roster and authenticated account inventory are
   reconciled from canonical sources.
2. The checklist separates Meta Ads and Google Ads.
3. Every check states where to look, what to record, the
   normal/attention/blocked rule, and the next decision.
4. The user records an independent observation before seeing the agent result.
5. A short discrepancy protocol defines how to reconcile human and agent
   findings without silently overwriting either.
6. A daily record template preserves date, account, source, finding, decision,
   approval need, and return point.
7. The artifact is delivered as editable Markdown and a validated PDF.
8. One read-only manual test confirms that the checklist is executable within
   the intended timebox.

## First task

### PC-01 — Produce the manual operator checklist

- Status: `verified_done`
- Action: open a dedicated owner thread and create the manual checklist from
  the current roster and evidence contract.
- Done condition: Markdown and PDF artifacts exist, the structure passes review,
  and the first read-only use is defined.
- Timebox: 25 minutes in the owner thread.
- Result: Markdown and PDF delivered, visual QA completed, and the read-only
  manual flow validated against the current roster available to the owner
  thread.

## Approved retirement envelope

- Approval confirmed: `2026-08-03 15:05 America/Sao_Paulo`.
- Delete only: `agn-dg5i-controle-de-verbas-di-rio` (`[AGN] DG5I Abertura Operacional 08h15`), verified paused before handoff.
- Preserve without changes: `agn-dg5i-status-ads-di-rio-08h` (`[AGN] DG5I Status Ads dias úteis 08h`), verified active before handoff.
- Historical checklist thread: `019fbffc-a75d-7ac3-b036-1228693eec13`, archived with content preserved and post-state confirmed.
- Required proof: exact-target precheck, deletion result, missing-target postcheck, and preserved 08h automation state.
- Excluded: every other automation, campaign, ad, budget, bid, billing, tracking, credential, publication, pause, deletion, or client communication.

## Approval gates and stop conditions

- Do not create or alter an automation for this request.
- Read-only account access and local artifact preparation are allowed.
- Stop before any campaign, ad, budget, bid, billing, tracking, publication,
  pause, deletion, credential, or client-communication change.
- Missing, stale, partial, or conflicting data must be labeled, never converted
  to zero or silently reconciled.

## Return point

Use the checklist in a new read-only account-review run. Preserve the user's
observation before comparing it with the agent result.

## Completion evidence

- Markdown: `C:\Users\Guilherme Silveira\Projects\dg5i-ads-agent\workspaces\dg5i-budget-control\reports\manual-review-2026-08-03\roteiro-revisao-manual-meta-google-ads.md`.
- PDF: `C:\Users\Guilherme Silveira\Projects\dg5i-ads-agent\workspaces\dg5i-budget-control\reports\manual-review-2026-08-03\roteiro-revisao-manual-meta-google-ads.pdf`.
- PDF QA: 5 pages, A4 landscape, visually reviewed.
- Deleted automation: `agn-dg5i-controle-de-verbas-di-rio`; TOML absent after deletion.
- Preserved automation: `agn-dg5i-status-ads-di-rio-08h`; TOML present and status `ACTIVE` at day close.
- Historical checklist thread archived with content preserved.
