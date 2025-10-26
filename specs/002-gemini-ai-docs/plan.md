# Implementation Plan: AI Photo Booth Experience

**Branch**: `[002-gemini-ai-docs]` | **Date**: 2025-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-gemini-ai-docs/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/scripts/powershell/setup-plan.ps1` for the execution workflow.
## Summary

AIフォトブースでは、匿名認証で撮影からテーマ選択・AI生成・水族館連携までを60秒以内に完結させ、生成画像をQR/URL配布・48時間閲覧可能とする体験が求められる。Next.js＋Firebase（Auth/Firestore/Storage/Functions）構成を基盤に、Gemini互換のAI生成APIをモックで外部化しつつ、デバイス別UI（表示用スクリーン・コントロールパネル・スマホアップロード・管理ダッシュボード）をDDD層構造で実装する。開発は `docs/DDD.md` のレイヤリング規約と `docs/TDD.md` のRed-Green-Refactor-Commitを必須参照として進行する。

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js App Router (Node 20)  
**Primary Dependencies**: Next.js, shadcn/Radix UI, Tailwind CSS v4 tokens, Jotai, Firebase JS SDK (Auth/Firestore/Storage), Firebase Admin SDK, SWR  
**Storage**: Firebase Firestore (document DB) + Firebase Storage (images)  
**Testing**: Vitest + @testing-library/react + testing-library/jest-dom + Playwright (E2E) + Firebase Emulator Suite  
**Target Platform**: Web (festival kiosk on Windows PC + attendee smartphones via browsers)  
**Project Type**: Multi-surface web workspace under `apps/photo` (Next.js app)  
**Performance Goals**: 90秒以内に生成結果表示、UI応答2秒以内、Webhook99%成功、管理ダッシュボード10秒内更新  
**Constraints**: 匿名認証のみ、Gemini互換APIレート制限1req/秒/端末、48時間URL有効期限、撮影原本5分以内削除  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Stewardship**: 影響範囲はAIフォトブース体験と水族館連携。参照仕様は `docs/spec/Photo_PRD.md` と `docs/spec/photobooth/Design Doc.md`、新規仕様は `specs/002-gemini-ai-docs/spec.md`。追加コードは `apps/photo` 以下にDDD層で配置し、`docs/DDD.md` に従ってPresentation→Application→Domain→Infrastructure依存を守り、既存のlogger・i18nパッケージを再利用。`pnpm lint` / `pnpm lint:fix` とBiomをCI前に必ず通す。全てのTypeScriptは`any`型の使用を禁じ、適切な型合成と `try/catch` ベースのエラーハンドリングで表現する。
- **Exhaustive Testing Mandate**: 単体・結合テストは `pnpm test:photo` でVitest実行、Firebase Emulator Suiteで匿名Auth・Firestore・Functions・Storageを再現し、AI生成API・水族館Webhookはmsw/ローカルHTTPでスタブ。すべてのユースケースで100%ステートメント/分岐達成をcoverageレポートにて確認。
- **Unified Festival Experience**: Kiosk UI、QRページ、管理ダッシュボードで日英切替を実装し、文言はi18n辞書 (`apps/photo/src/libs/i18n`) に登録。shadcnコンポーネントとTailwind tokensでスタイル統一し、デザイン差分は `docs/spec/photobooth/Design Doc.md` とFigmaリンクで証憑取得、PRでスクリーンショットと動画を添付。
- **Performance & Resilience Envelope**: 生成要求はバックオフ＋キュー管理でレート制御。Remote Configでメンテ表示・遅延モード切替を用意し、Sentryで生成失敗/水族館送信エラーを監視。Storage原本削除はCloud Functionsの定期ジョブで5分以内実施。管理UIは5秒ごとSWR再検証、全フローで2秒以内にフィードバック表示。
- **Post-Phase 1 Re-check**: 追加設計により新たな違反は発生せず、全原則への対応方針が確定。

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
apps/
├── photo/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (booth)/
│   │   │   │   ├── control/[boothId]/
│   │   │   │   ├── display/[boothId]/
│   │   │   │   └── layout.tsx
│   │   │   ├── (user)/
│   │   │   │   ├── download/[boothId]/[photoId]/
│   │   │   │   ├── upload/[boothId]/
│   │   │   │   └── layout.tsx
│   │   │   ├── 404/
│   │   │   ├── admin/
│   │   │   ├── login/
│   │   │   ├── photos/
│   │   │   ├── favicon.ico
│   │   │   ├── global-error.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infra/
│   │   ├── hooks/
│   │   └── libs/
│   ├── public/
│   └── test/
│       ├── unit/
│       └── integration/
packages/
├── logger/
├── shared-types/
└── i18n/
```

**Structure Decision**: Next.jsベースの`apps/photo`を基盤に、DDD層 (`domain`/`application`/`infra`) とApp Router配下の各体験ページを分離する。テストは `apps/photo/test` に集約し、既存`packages/logger`・`packages/i18n`を再利用する。

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
