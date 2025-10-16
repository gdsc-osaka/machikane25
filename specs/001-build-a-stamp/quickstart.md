# Quickstart — Stamp Rally Web Experience

## Prerequisites
- Node.js 20+ with pnpm 10.12.4 (workspace default)
- Firebase CLI authenticated to the GDGoC project
- `.env.local` for `apps/stamp` containing Firebase config, NFC token secrets, Google Form mapping, and Sentry DSN
- Remote Config template seeded with maintenance flags (`stamp_app_status`, `stamp_app_message_ja`, `stamp_app_message_en`)

## 1. Install & Bootstrap
```bash
pnpm install
```

## 2. Start Local Services
```bash
# Terminal A — Firebase emulator suite (Auth, Firestore, Functions, Hosting)
pnpm emulator

# Terminal B — Stamp rally Next.js app
pnpm dev:stamp
```

## 3. Seed Development Data
1. With emulators running, visit `http://localhost:4001/dev-tools` (temporary admin tool) to:
   - Create sample attendee profiles
   - Toggle Remote Config maintenance states
   - Issue test QR payloads
2. Import NFC token fixtures stored in `apps/stamp/fixtures/nfc-tokens.json` into Firestore or environment.

## 4. Run Quality Gates
```bash
pnpm lint
pnpm test:stamp
pnpm coverage
```

## 5. Performance & UX Validation
- Launch the kiosk device, open the local tunnel (e.g., `npm exec localtunnel`) to access `localhost:4001`
- Record Lighthouse report ensuring FMP < 2s and stamp award interactions < 300 ms p95
- Capture bilingual screenshots (JA/EN) for home, stamp, survey, gift, and maintenance pages

## 6. Admin Flow Verification
1. Create an admin Firebase Auth user via emulator UI or helper script (`apps/stamp/scripts/create-admin.ts`).
2. Log into `/scan`, test BarcodeDetector scanning, and exercise fallback manual entry.
3. Confirm redemption logs appear under `rewardRedemptions` collection and attendee profile updates to `rewardRedeemed = true`.

## 7. Deployment Checklist
- Update `docs/spec/stamp/Design Doc.md` change log with behavior adjustments
- Ensure `.env.example` reflects new config keys
- Run `pnpm build:stamp` to confirm production build passes
- Coordinate Remote Config rollout plan with on-site ops before deploy
