# Product Loop

## Grower review — 2026-09-07

- Phase: `grower`; state: `validation-mode`.
- Confirmed sources: current source code, local demo, and the user's workflow description in this task. No real usage baseline or interviews measured yet. Demo data is not business evidence.
- Segment: Pati planning agency work and Gui executing one task at a time.
- Value event: a released task advances to a concrete completed step, then to a verified delivery.
- Main constraint hypothesis: activation, because the next concrete step was hidden before starting the task.
- Primary metric for a future consented trial: proportion of started tasks with at least one completed step in the same workday. Baseline: unavailable. Guardrails: blocked tasks, involuntary context switches, and Gui's reported distraction; no employee scoring.
- Experiment 1 (recommended): expose one next step before starting and offer a direct completion action. Local implementation authorized by the user. Expected impact high, confidence medium, effort low, risk low. Trial proposal: five working days, at least ten starts, compared with five baseline days; no external spend. Continue if the proportion improves by at least 10 percentage points without increased distraction or forced switching; discard/revise if distraction increases; insufficient samples mean inconclusive.
- Experiment 2: make weekly reports respect Monday–Sunday date boundaries and distinguish accumulated partial progress. Impact high for trust, confidence high from source inspection, effort low. Implemented locally. Success: prior/next-week deliveries excluded and dated current-week deliveries included; discard the implementation if boundary tests fail.
- Learning: the previous weekly report counted all completed tasks despite displaying a weekly heading. Corrected. No productivity improvement claimed.
- Next gate: user review of the local changes; agree on baseline collection and a real-user trial before running it. No new campaign, external analytics or messages activated. Publication remains pending the Firebase authentication from the earlier deployment request.
- Historical notes below describe the original build; authentication and cloud sync now exist in source, but this review does not establish a successful production deployment.

## Chosen hypothesis

A protected queue with one active task, capacity-aware daily planning, explicit
return points, and evidence-based progress will reduce lost task switches and
make both execution and management work visible.

## Users

- Pati: captures, clarifies, prioritizes, schedules, and reviews work.
- Guilherme: executes one clear action at a time, updates estimates, records
  progress, blockers, evidence, and return points.

## Primary journey

1. Pati captures a demand and defines its outcome, priority, estimate, and done
   condition.
2. The system helps fit ready work into morning and afternoon capacity.
3. Guilherme sees one task in `Agora`, with no forced interruption from new
   demands.
4. Estimate changes and blockers remain non-blocking and notify management.
5. Weekly reporting separates completed deliveries, partial progress, and
   management activity.

## Acceptance criteria

- Only one task can be active for Guilherme.
- New routine demands never replace the active task automatically.
- Daily planning respects effective capacity and leaves a buffer.
- Estimates can be revised without locking execution.
- An interruption records a return point before another task becomes active.
- Weekly delivery totals include only verified completed tasks.
- Partial progress and management work remain visible in separate sections.
- Data survives a browser refresh on the same device.

## Deliberate non-scope

- Real authentication or multi-device synchronization.
- WhatsApp, email, or third-party system integrations.
- Background push notifications when the app is closed.
- Production deployment, billing, analytics, or employee scoring.

## Stage

- Phase: `builder`
- State: `built-local`
- Target environment: `local-mvp`
- Next gate: user workflow validation

## Built artifacts

- React and TypeScript single-page application.
- Local browser persistence with seeded demonstration data.
- Pati management view with capacity, queue, priority, shifts, and validation.
- Guilherme focus view with one current task, quiet notifications, editable
  estimates, progress, blockers, evidence, and return memory.
- Weekly report separating verified deliveries, partial progress, and management
  activity.
- Pure domain functions and six automated tests.

## Verification executed

- `npm test`: 6 tests passed.
- `npm run build`: production bundle generated successfully.
- Browser walkthrough: task creation, protected active task, role switch,
  estimate revision, management notification, and weekly report.
- Accessibility tree: named controls and consistent heading hierarchy observed.

## Deliberate debt

- Data is local to one browser and one device.
- Notifications only exist while the application is open.
- Weekly date filtering is represented in the interface but currently uses the
  local demonstration data set.
- Authentication, server persistence, integrations, and deployment require a
  separate production gate.
