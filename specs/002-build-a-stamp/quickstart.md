# Quickstart

## Prerequisites
- Node 20.x + pnpm 10 (workspace uses `packageManager=pnpm@10.12.4`)
- Firebase CLI (`firebase-tools`) authenticated against the festival project
- Access to 1Password vault containing NFC tokens, Google Form entry IDs, and admin credentials

## Environment Setup
1. `pnpm install`
2. Copy `apps/stamp/.env.example` to `.env.local` and populate:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.
   - `STAMP_TOKEN_<CHECKPOINT>` for each NFC token (reception, photobooth, art, robot, survey)
   - `GOOGLE_FORM_ID` and `GOOGLE_FORM_ENTRY_*` identifiers
   - `PHOTOSERVICE_BASE_URL` and `PHOTOSERVICE_API_KEY`
   - `SENTRY_DSN` (optional in local)
3. Ensure Firebase Remote Config contains:
   - `surveyFormUrl` (Google Form canonical URL)
   - `maintenanceMode` flag (`off`, `readonly`, `down`)

## Running Locally
```bash
pnpm dev:stamp
```
Access http://localhost:4001 on a mobile viewport. Anonymous auth will provision a participant document on first load.

## Emulator & Fixtures
- Start Firestore emulator with local rules:
  ```bash
  firebase emulators:start --only firestore
  ```
- Seed checkpoint tokens by writing to a local config file or using the admin script `apps/stamp/scripts/seed-tokens.ts` (to be implemented).
- Use the fake photobooth endpoint defined in `apps/stamp/test/mocks/photobooth.ts` for upload flows.

## Testing
- Unit & component tests: `pnpm test:stamp`
- Coverage gate: `pnpm coverage --filter stamp`
- Lint: `pnpm lint:fix && pnpm --filter stamp lint`

## Deployment
```bash
pnpm build:stamp
firebase deploy --only hosting:stamp
```
Confirm Remote Config keys are in place before promoting production builds.
