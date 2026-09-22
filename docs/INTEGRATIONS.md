# PWA and integrations: release 0.2.0

All roles share the light/dark visual system. Light is the first-use default; each UID has its own device preference. Navigation remains role-specific.

The PWA includes a manifest, 192/512 icons and a versioned service worker. Offline navigation displays a reconnect screen. Authenticated pages, tasks and OAuth callbacks are not cached. Task controls are disabled while offline; this release does not provide offline task editing.

## Activation gates

On 2026-09-22, the project reported `billingEnabled: false`. Hosting therefore uses `VITE_SERVICES_ENABLED=false`. Background push and Calendar synchronization have source code and deterministic tests, but are not active or verified end-to-end in production.

1. Obtain owner approval for billing required by Cloud Functions and Cloud Scheduler.
2. Enable Calendar API and configure a Web OAuth client and consent screen. Authorized redirect: `https://ticket-pauta-gui.web.app/api/calendar/callback`.
3. Set `APP_ORIGIN` and `GOOGLE_CALENDAR_CLIENT_ID` in `functions/.env.ticket-pauta-gui`. Store the secret with `npx firebase functions:secrets:set GOOGLE_CALENDAR_CLIENT_SECRET --project ticket-pauta-gui`. Never put secrets or refresh tokens in Vite variables.
4. Run `npm ci --prefix functions`, `npm test`, `npm run test:services`, and validate Firestore rules with two distinct attendance UIDs plus Pati/Gui before backend activation.
5. Deploy Functions and Firestore rules using `firebase.services.json`. After success, set `VITE_SERVICES_ENABLED=true`, rebuild and deploy Hosting with that same configuration. Do not enable the callback rewrite before the function exists. Standard `firebase.json` is the Hosting-only configuration.
6. Guilherme consents through “Aplicativo e integrações”. Each user enables notifications on their own device. iOS requires Home Screen installation first.

## Ownership and delivery

Authenticated callable functions determine subscriber UID and role from the verified auth token. Team recipients resolve via Firebase Auth. Attendance updates target the original `requesterUid` on the submitted request, never an attendance-wide group.

Clients can read only `userInboxes/{uid}/items` belonging to their UID and change only `read`. Push subscriptions and OAuth credentials are server-only. The worker checks UID before displaying or opening push, and logout clears identity and unsubscribes the device.

Inbox creation is idempotent. Push receipts prevent repeat sends after success; a crash between provider acceptance and receipt persistence can redeliver, with notification tags collapsing duplicates. Scheduled reminders run every five minutes. Browser delivery remains dependent on permissions and OS support.

## Calendar contract

One-way synchronization from Pauta Fluxo into an app-created “Pauta Fluxo” calendar owned by Guilherme. Only scheduled Gui tasks are included. Untimed tasks are all-day; timed events use America/Sao_Paulo. Completed tasks retain history. Removed, unscheduled or reassigned tasks remove their managed event.

Stable event IDs derive from task IDs; fingerprints avoid redundant updates. A lease serializes synchronization and each invocation reads the latest workspace. OAuth uses expiring single-use state and verifies the Google account. Requested scopes: `calendar.app.created` and `calendar.calendarlist.readonly` to recover the app-created calendar. Refresh tokens stay server-side. Disconnect revokes the token and preserves events.

Google Calendar edits do not update Pauta. Validate create, reschedule, completion, reassignment, reconnect and retries against the real consented account before declaring delivery complete.

## Evidence and rollback

Tests cover existing task behavior, profile menus, Calendar IDs/dates, push endpoint validation, reminders, worker UID isolation and callback exclusion. Browser checks cover 320, 390, 768, 1024 and 1440 pixels. These tests do not prove real background delivery or Calendar writes. Firestore emulator validation is pending because Java is unavailable in this environment.

Chrome reported zero installability errors and zero manifest errors. The service worker reached `activated`; stopping the local server and reloading showed the offline reconnect screen. Executor smoke testing advanced a demo task from ready to active and one completed step (33%), with the estimate dialog fitting the 320px viewport.

Frontend rollback: redeploy the preceding Hosting release. Keep services disabled until the backend passes validation. Stop scheduled functions separately when rolling back an activated backend; preserve task and integration data.

References: [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth), [calendar list authorization](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list), [OAuth offline access](https://developers.google.com/identity/protocols/oauth2/web-server).
