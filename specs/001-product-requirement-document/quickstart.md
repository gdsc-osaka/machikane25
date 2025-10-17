# Quickstart — Stamp Rally Guest Experience

## 1. Prerequisites
- Node.js 20.x with `pnpm` installed
- Firebase CLI authenticated against the Machikane 2025 project
- Access to Remote Config and Google Forms tokens stored in 1Password

## 2. Environment Setup
1. Check out the feature branch:
   ```bash
   git checkout 001-product-requirement-document
   ```
2. Install workspace dependencies:
   ```bash
   pnpm install
   ```
3. Copy secrets:
   ```bash
   cp apps/stamp/.env.local.example apps/stamp/.env.local
   ```
   Populate values for:
   - `NEXT_PUBLIC_FIREBASE_*` credentials
   - `NEXT_PUBLIC_SURVEY_FORM_ID` (fallback if Remote Config unavailable)
   - `NEXT_PUBLIC_SENTRY_DSN` (optional for local testing)
4. Sync Remote Config templates with the latest tokens and messaging:
   ```bash
   firebase remoteconfig:versions:list
   # apply desired template before local run
   ```

## 3. Local Development
1. Start the Firebase emulators (Auth, Firestore, Functions, Hosting):
   ```bash
   pnpm emulator
   ```
2. In a second terminal, launch the stamp app:
   ```bash
   pnpm dev:stamp
   ```
3. Use `http://localhost:4001` to simulate guest flows; emulator UI exposes seeded NFC tokens and reward states under `attendees` and `rewards` collections.

## 4. Testing & Coverage
1. Run unit and integration suites with coverage gates:
   ```bash
   pnpm test:stamp
   pnpm coverage --filter stamp
   ```
2. Capture evidence (screenshots, recordings) of bilingual flows for QA archives.

## 5. Pre-Deploy Checklist
- Lint and format:
  ```bash
  pnpm lint
  pnpm lint:fix
  ```
- Promote Remote Config template containing production survey form and maintenance copy.
- Confirm Sentry project releases exist and DSN is configured for the new routes.
- Validate manual redemption backup flow (manual UID entry) before festival day.
