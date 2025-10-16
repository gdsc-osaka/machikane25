# Research

## Scale & Admin Concurrency
- Decision: Architect for 2,500 participant sessions per festival day with headroom for 5 concurrent admin scanners.
- Rationale: Recent Osaka university festivals report 10k+ daily visitors; assuming 25% engage with the rally gives ~2.5k active users. Firestore and Firebase Auth easily cover this load, and sizing admin tooling for five concurrent operators matches the staffing levels described in festival briefs.
- Alternatives considered: Designing for only 1k participants risked under-provisioning if marketing succeeds; scaling to 10k would demand heavier queuing and caching strategies that the spec does not justify today.

## SWR in Stamp Rally
- Decision: Use SWR for all client reads with key patterns scoped per participant (`/participants/{uid}`) and call `mutate` after server actions to ensure sub-second progress refresh.
- Rationale: Aligns with the constitution mandate and keeps checkpoint pages reactive while relying on SWR's cache revalidation and deduplication.
- Alternatives considered: React Query offers richer features but would conflict with the repository standard; plain `useEffect` + `fetch` would reimplement caching manually.

## Firebase JS SDK 12.x
- Decision: Initialize a single Firebase app inside `apps/stamp/src/firebase.ts`, export modular helpers (`getAuth`, `getFirestore`, `getRemoteConfig`, `getFunctions`) and guard for `getApps().length`.
- Rationale: The modular API keeps bundle size small and prevents duplicate initialization when the Next.js app hydrates on both server and client.
- Alternatives considered: Using compat APIs would simplify migration but bloats bundle size; per-component initialization risks runtime warnings and failed unit tests.

## Jotai 2.x
- Decision: Reserve Jotai atoms for local UI state (e.g., transient upload progress, QR scanner dialogs) while keeping remote data in SWR.
- Rationale: Jotai's primitive atoms stay lightweight and SSR-friendly, and segregating remote data avoids conflicting cache layers.
- Alternatives considered: Global atoms for participant data would duplicate SWR cache; Zustand or Redux would add heavier tooling without benefits.

## shadcn UI + Radix
- Decision: Consume shadcn component generators inside `apps/stamp/components` and compose them with Radix primitives, extending tokens through Tailwind config rather than component-local overrides.
- Rationale: shadcn ensures accessible defaults and keeps styling consistent with other experiences that already follow this pattern.
- Alternatives considered: Writing bespoke components would slow delivery and risk accessibility regressions; importing third-party theme packs could conflict with Tailwind 4 defaults.

## Tailwind CSS 4
- Decision: Use the new `@tailwind` entrypoint with the preset-based config, leverage design tokens via CSS variables, and generate utility classes through `tailwind.config.ts` shared across stamp pages.
- Rationale: Tailwind 4's zero-config approach pairs well with shadcn tokens and reduces the need for manual plugin wiring.
- Alternatives considered: Keeping Tailwind 3 fallback config would forgo newer features; CSS Modules alone would duplicate style logic already standardized in the repo.

## react-hook-form 7.x
- Decision: Define form schemas with zod and wire them using `@hookform/resolvers/zod`, encapsulating form UI in reusable components under `apps/stamp/src/components/form`.
- Rationale: RHF offers performant uncontrolled inputs, and zod integration satisfies validation requirements without duplicating rules.
- Alternatives considered: Formik was rejected due to bundle size; manual `useState` forms are harder to validate and test thoroughly.

## zod 4.x
- Decision: Centralize validation schemas (survey responses, NFC token payloads, upload inputs) in `apps/stamp/src/lib/validators` and reuse them across client and API routes.
- Rationale: zod's inference keeps TypeScript models in sync with runtime validation, aiding both SWR fetchers and Firestore writes.
- Alternatives considered: Yup lacks TypeScript inference; manual validation would increase risk of divergent schemas.

## Sentry 10.x
- Decision: Enable Sentry for both edge and server runtimes using the existing `sentry.edge.config.ts`/`sentry.server.config.ts`, tagging events with `experience: "stamp"` for triage.
- Rationale: Reuses configured DSN, provides visibility into festival incidents, and keeps logging aligned with other experiences.
- Alternatives considered: Disabling Sentry would violate the shared logging strategy; writing custom logging would add maintenance overhead.

## Firestore Modeling
- Decision: Store participants in `participants/{uid}` with sub-objects for `stamps`, `survey`, and `redemption`, coupled with security rules enforcing user-level read/write and admin-only redemption writes.
- Rationale: Keeps participant data localized, simplifies atomic updates per user, and matches the design doc's stamp service contract.
- Alternatives considered: Separate collections per stamp increase join complexity; Realtime Database lacks granular rules needed for anonymous auth.

## Firebase Remote Config
- Decision: Fetch maintenance and Google Form endpoints via Remote Config in a server action, cache results for 5 minutes, and expose them to clients via SWR.
- Rationale: Server-side fetch avoids shipping RC secrets client-side while respecting config TTL; 5-minute cache meets responsiveness needs without overloading RC.
- Alternatives considered: Hardcoding URLs in env vars complicates runtime swaps; fetching from the client risks exposing admin-only flags.

## Google Forms Submission
- Decision: Post survey responses from a Next.js server action to the form's `formResponse` endpoint using `application/x-www-form-urlencoded`, storing entry IDs in env vars and retrying once on non-2xx responses.
- Rationale: Server-side submission bypasses CORS issues and keeps entry IDs secret while ensuring Google receives canonical responses.
- Alternatives considered: Client-side form POST is blocked by CORS; Google Apps Script adds another deployable service administrators must maintain.

## Firebase Auth (Anonymous + Admin)
- Decision: Use anonymous auth on public routes, upgrade tokens to persistent sessions, and gate admin functions behind email/password sign-in with role claims checked in Firestore rules.
- Rationale: Matches the spec's security requirements and prevents anonymous users from calling redemption mutations.
- Alternatives considered: Magic links would complicate on-site flows; sharing admin credentials across staff without claims is brittle.

## Photobooth API Integration
- Decision: Invoke the photobooth REST API from a Next.js server action/upload route that accepts signed URLs, streams files via FormData, and records upload status in Firestore.
- Rationale: Server-side uploads protect API secrets and allow retries while keeping participant progress intact.
- Alternatives considered: Direct client upload leaks API credentials; delegating to the photobooth app introduces cross-repo coupling and latency.
