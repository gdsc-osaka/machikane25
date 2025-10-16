# Research Log — Stamp Rally Web Experience

## Decision: Use Firebase Anonymous Auth for attendees with Firestore-backed profiles
- **Rationale**: Aligns with design doc guidance while keeping onboarding frictionless. Anonymous auth supplies stable UIDs for tracking stamps, surveys, and rewards without collecting personal data, satisfying privacy expectations.
- **Alternatives considered**: Cookie-based guest IDs (rejected—difficult to share across devices and fragile under kiosk resets); Email/SNS login (rejected—adds friction and contradicts anonymous requirement).

## Decision: Model attendee progress under `attendees/{uid}` with subcollections for logs
- **Rationale**: A single document per attendee containing stamp completion status, survey flag, and QR metadata allows efficient reads for the home page, while subcollections (`stampEvents`, `redemptions`) capture audit trails without bloating the main document.
- **Alternatives considered**: Storing each stamp as its own document (rejected—requires fan-out queries); Splitting survey data into a separate collection (rejected—needs frequent joins for eligibility checks).

## Decision: Validate NFC tokens via server actions using env-stored secrets and Remote Config flags
- **Rationale**: Server-side validation prevents token tampering, keeps secrets out of the client bundle, and lets Remote Config disable specific kiosks quickly during incidents.
- **Alternatives considered**: Client-side validation only (rejected—tokens could be replayed), Hardcoding token values (rejected—redeploy needed for revocation).

## Decision: Layer SWR over Firestore listeners with deterministic cache keys
- **Rationale**: SWR provides revalidation and optimistic UI patterns already mandated, while Firestore listeners push real-time updates. Wrapping listeners inside SWR hooks ensures consistent cache management across pages.
- **Alternatives considered**: Direct Firestore SDK hooks per component (rejected—risks duplicated logic and inconsistent cache), Custom Redux store (rejected—extra complexity vs. SWR standard).

## Decision: Proxy Google Form submissions through a Next.js route handler
- **Rationale**: Browser direct posts to Google Forms face CORS and expose form field IDs. A server route can attach attendee metadata, handle retries, and log errors before handing back survey completion status.
- **Alternatives considered**: Client-side fetch directly to Google Form (rejected—CORS + lack of observability), Building a bespoke Firestore-backed survey (rejected—longer timeline, diverges from spec).

## Decision: Generate QR codes client-side using Canvas with a lightweight QR matrix implementation
- **Rationale**: Keeps reward content offline-capable, avoids new dependencies, and allows styling flexibility. Canvas output can be cached as data URLs for printing or display.
- **Alternatives considered**: External QR service (rejected—dependent on external uptime/network), Adding a new npm QR library (rejected per repository guideline to rely on installed packages).

## Decision: Use the Web BarcodeDetector API with a manual fallback form for admin scanning
- **Rationale**: BarcodeDetector is supported on Chromium-based kiosk tablets, enabling low-latency scanning without third-party packages. Fallback ensures older devices can key in attendee IDs if detection is unavailable.
- **Alternatives considered**: Bundling ZXing/QR libraries (rejected—adds heavy dependencies), Building a native mobile scanner (rejected—out of scope).

## Decision: Orchestrate maintenance states via Remote Config flags mirrored in UI
- **Rationale**: Remote Config empowers operators to toggle maintenance banners instantly across attendee routes while keeping admin tools available, matching constitution resilience requirements.
- **Alternatives considered**: Feature flag via environment variables (rejected—requires redeploy), Separate maintenance-only deployment (rejected—more operational overhead).
