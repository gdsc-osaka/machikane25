# Implementation Plan: Stamp Rally Guest Experience

**Branch**: `001-product-requirement-document` | **Date**: 2025-10-16 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-product-requirement-document/spec.md`

## Summary

Deliver the Machikane Festival stamp rally flow in `apps/stamp` so guests can collect NFC-driven
stamps, complete the bilingual survey, and redeem prizes while staff manage redemptions securely.
Implementation leans on Next.js App Router with Firebase Auth, Firestore, and Remote Config, keeps
all data mutations on the client via Firebase SDK + security rules, and uses Next.js server actions
solely for secret-bound integrations such as the Google Form submission.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js App Router (React 18)  
**Primary Dependencies**: Next.js 14, Firebase Web SDK (Auth, Firestore, Remote Config), SWR, shadcn/ui, neverthrow/obj-err/ts-pattern, Zod, Sentry SDK  
**Storage**: Firestore (attendee, stamp, voucher collections), Firebase Remote Config (survey + outage toggles)  
**Testing**: Vitest + @testing-library/react, Testing Library DOM matchers, Firebase Emulator Suite (Auth/Firestore)  
**Target Platform**: Mobile-first web experience served via Firebase App Hosting (`apps/stamp`)  
**Project Type**: Web application (Next.js monorepo workspace)  
**Performance Goals**: 300 ms server-side processing for critical actions, ≤1 s perceived response per page, ≤2 s kiosk render with degraded-mode messaging ready  
**Constraints**: No custom backend APIs (per design doc); Firebase SDK calls run client-side under security rules; secrets handled via Next.js server actions (e.g., Google Form POST)  
**Scale/Scope**: Weekend festival load (~3k unique attendees, <150 concurrent sessions), staff console for ~20 operators

## Constitution Check

- **Code Quality Stewardship**: Feature touches `apps/stamp/src/app`, `apps/stamp/src/application`, `apps/stamp/src/domain`, and `apps/stamp/src/infra`. Specs in `docs/spec/stamp/Design Doc.md` and `specs/001-product-requirement-document/spec.md` stay aligned; reuse `src/packages/logger` and existing Firebase clients; enforce Biome/ESLint via `pnpm lint` / `pnpm lint:fix`.
- **Exhaustive Testing Mandate**: Plan to extend Vitest suites in `apps/stamp` with emulator-backed integration tests covering anonymous auth, stamp claims, survey gating, and QR redemption. Maintain 100% statement/branch coverage validated by `pnpm coverage --filter stamp`.
- **Unified Festival Experience**: All flows ship Japanese/English copy per design doc; gather screenshots for Home, Stamp, Survey, Gift, and Scan pages; document copy updates in `docs/spec/stamp/Design Doc.md` before merge.
- **Performance & Resilience Envelope**: Remote Config drives outage messaging; SWR caches stamp progress to keep UI sub-second; Sentry instrumentation extends to new flows; verify cleanup tasks and redemption telemetry stay within 300 ms server budget.

*Post-design review*: Research and data modelling confirm all gates stay green with no exceptions requested.

## Project Structure

### Documentation (this feature)

```
specs/001-product-requirement-document/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```
apps/stamp/
├── src/
│   ├── app/
│   │   ├── (guest)/
│   │   │   ├── page.tsx                # Home dashboard
│   │   │   ├── stamp/[token]/page.tsx  # Token-specific stamp claim
│   │   │   ├── form/page.tsx           # Survey entry
│   │   │   └── gift/page.tsx           # Reward presentation
│   │   ├── scan/page.tsx               # Staff console
│   │   ├── maintenance/page.tsx        # Outage messaging
│   │   └── actions/                    # Server actions for survey + admin flows
│   ├── application/
│   │   ├── auth/
│   │   ├── stamps/
│   │   ├── survey/
│   │   └── rewards/
│   ├── domain/
│   ├── infra/
│   │   ├── firebase/
│   │   └── remote-config/
│   ├── packages/logger/
│   └── test/
├── public/
└── scripts/
    └── seeds/                          # Optional seed scripts for emulator data
```

**Structure Decision**: Single Next.js workspace (`apps/stamp`) with stamp flows implemented in App Router routes, shared application/domain layers, and server actions collocated with route components; no additional backend services required.

### Page Responsibilities & UI Requirements

- **Home Page (`/`)**
  - Entry points: navigated from Stamp Page or dedicated NFC tag at reception.
  - UI: large five-slot stamp board; completed slots render red stamp art; bilingual headings.
  - Actions: “アンケートに回答 / Take Survey” and “景品を受け取る / Claim Reward” buttons initially disabled.
  - Enablement rules: survey button activates when four exhibition stamps acquired; reward button requires survey completion.
  - Logic: refreshes stamp state on each visit to reflect latest Firestore data.

- **Stamp Page (`/stamp?token=...`)**
  - Entry points: NFC tags encode unique token parameters per exhibit stored in env/Remote Config.
  - UI: displays targeted stamp name, central stamp frame, success animation, bilingual status copy.
  - Behavior: validates token, writes timestamp into `users/{id}.stamps`, and blocks duplicates.
  - Post-action: shows “スタンプ一覧を見る” button to link back to Home Page.

- **Form Page (`/form`)**
  - Entry point: Home Page survey CTA.
  - UI: bilingual form built with shadcn Form + React Hook Form; includes back button and submit action.
  - Behavior: server action posts responses to Google Forms, records survey timestamp, then navigates to Gift Page; inline errors on failure.

- **Gift Page (`/gift`)**
  - Entry points: Home navigation once survey completed or redirect after form submission.
  - UI: thank-you messaging plus QR code when reward not yet redeemed; alternate message when already redeemed.
  - Behavior: provides direct navigation back to Home Page.

- **Scan Page (`/scan`)**
  - Entry point: direct URL access for staff.
  - UI: login form for email/password until staff authenticate; once signed in, shows `jsqr`-powered scanner view.
  - Behavior: scanning displays dialogs for “賞品を渡してください”, “既に受け渡し済み”, or “不正な QR コード” and offers manual ID entry fallback.

- **Maintenance Page (`/maintenance`)**
  - Trigger: Remote Config `stamp_app_status` set to `degraded` or `maintenance`; all guest routes except Scan redirect here.
  - UI: localized outage message, expected resolution time, and festival social links.

- **404 Page (`/404`)**
  - Trigger: unauthorized access (e.g., guest hitting staff pages) or unknown routes.
  - UI: 404 copy plus button returning to Home Page.

## Complexity Tracking

None identified; all constitution gates satisfied without exception.
