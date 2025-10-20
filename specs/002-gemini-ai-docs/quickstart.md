# Quickstart — AI Photo Booth Experience

## Prerequisites
- `pnpm install`
- Firebase CLI (`firebase-tools`) logged in with festival project access
- Local `.env.local` populated from `apps/photobooth/.env.example`
- Gemini互換APIキーを`.specify/memory`の手順どおりにFirebase Functionsの環境変数へ投入

## 1. Emulators & Services
```bash
pnpm dev:photobooth          # TurbopackでNext.jsアプリを起動 (port 4002想定)
pnpm firebase:emulators      # Auth / Firestore / Functions / Storage を起動
```
- `apps/photobooth/src/firebase.ts` が Emulator Suite を自動認識する設定になっていることを確認する。

## 2. Testing
```bash
pnpm test:stamp --filter photobooth   # Vitest + Testing Library
pnpm coverage --filter photobooth     # 100% statement/branch を確認
pnpm test:e2e:photobooth              # Playwrightで撮影→生成→QRダウンロードを再現
```
- Gemini APIはmswでスタブ。水族館Webhookは`apps/photobooth/test/mocks/webhookServer.ts`でローカルHTTPサーバーを起動。

## 3. Lint & Formatting
```bash
pnpm lint:fix
pnpm format:photobooth
```
- shadcnコンポーネント追加時は `pnpm shadcn:add` を使用し、スタイルはTailwind 4 tokensに揃える。

## 4. Deploy (dress rehearsal / production)
1. Remote Configにフォトブース設定（メンテモード、プロンプトテンプレート）を同期。
2. `pnpm build:photobooth && pnpm test:stamp --filter photobooth` を実行し成果物を検証。
3. `firebase deploy --only hosting:photobooth,functions:photoCleanup,generationQueue` を実行。
4. デプロイ後にSentryリリースを発行し、管理UIの計測パネルでsync状態を確認。

## 5. Operations Checklist
- 会場セットアップ時に撮影端末A/表示端末B/スタッフ端末Cをサインイン。
- Remote Configで営業時間に合わせてメンテモード解除。
- 水族館連携のWebhook疎通を管理UIからテスト発火。
- 1日終了時にCleanupジョブの監査ログをダウンロードし、`docs/spec/change-log.md`へ記録。
