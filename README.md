# Pauta Fluxo

Task planning for Pati, focused execution for Guilherme, and individual requests for attendance accounts. React, TypeScript, Vite, Firebase Authentication and Firestore.

All accounts share the mobile-first visual system, DM Sans and a light default with an optional dark mode. Each role retains its own views and actions.

## Development

```powershell
npm ci
npm run dev
```

Without Firebase configuration, development uses the local demo. Copy `.env.example` into `.env.local` for authenticated development or `.env.production` for production. Production builds require complete Firebase configuration and cannot silently publish demo mode.

## Checks

```powershell
npm test
npm ci --prefix functions
npm run test:services
npm run build
```

## Hosting

`npm run deploy` builds and publishes to Firebase Hosting using `.firebaserc`. Version 0.2.0 includes the installable PWA and an offline reconnect screen.

Background notifications and Google Calendar synchronization are gated by `VITE_SERVICES_ENABLED`. Keep it false until billing, OAuth and backend deployment are configured and validated. Read [activation and limitations](docs/INTEGRATIONS.md) before `npm run deploy:services`.
