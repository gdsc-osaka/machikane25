# Data Model — AI Photo Booth Experience

## VisitorSession
- **Purpose**: トラッキングする各来場者の体験フロー。
- **Key Fields**:
  - `id` (string, Firestore doc id)
  - `anonymousUid` (string, Firebase Auth UID)
  - `status` (enum: `capturing`, `selecting-theme`, `generating`, `completed`, `failed`, `expired`)
  - `themeId` (string | null)
  - `originalImageRef` (string Storage path | null)
  - `generatedImageRef` (string Storage path | null)
  - `publicTokenId` (string | null)
  - `aquariumEventId` (string | null)
  - `createdAt` / `updatedAt` (Timestamp)
  - `expiresAt` (Timestamp; 48時間後)
- **State Transitions**:
  - `capturing` → `selecting-theme` → `generating` → `completed`
  - 失敗時は `generating` → `failed`
  - タイムアウトで `capturing`/`selecting-theme` → `expired`

## GeneratedImageAsset
- **Purpose**: 生成済み画像のメタデータと配布状態を管理。
- **Key Fields**:
  - `id` (string)
  - `sessionId` (string, FK: VisitorSession)
  - `storagePath` (string)
  - `previewUrl` (string)
  - `createdAt` (Timestamp)
  - `expiresAt` (Timestamp; download有効期限)
  - `aquariumSyncStatus` (enum: `pending`, `sent`, `failed`)
  - `lastError` (string | null)

## PublicAccessToken
- **Purpose**: QR/URLアクセスを制御するワンタイムトークン。
- **Key Fields**:
  - `id` (string; token)
  - `sessionId` (string, FK)
  - `isConsumed` (boolean)
  - `expiresAt` (Timestamp)
  - `createdAt` (Timestamp)
- **Rules**:
  - `isConsumed` true でも `expiresAt` まではダウンロード履歴表示に利用する。

## GenerationOption
- **Purpose**: テンプレートの選択肢（Location/Outfit/Person/Style/Pose）。
- **Key Fields**:
  - `id` (string)
  - `type` (enum: `location`, `outfit`, `person`, `style`, `pose`)
  - `displayNameJa` / `displayNameEn` (string)
  - `imagePath` (string | null)
  - `createdAt` / `updatedAt` (Timestamp)
  - `isActive` (boolean; Remote Config連携で切替)

## AquariumSyncEvent
- **Purpose**: 水族館展示との連携状況ログ。
- **Key Fields**:
  - `id` (string)
  - `sessionId` (string, FK)
  - `status` (enum: `pending`, `sent`, `failed`, `retrying`)
  - `attempts` (number)
  - `lastAttemptAt` (Timestamp | null)
  - `errorMessage` (string | null)

## CleanupJobAudit
- **Purpose**: 原本削除バッチの実行証跡。
- **Key Fields**:
  - `id` (string; job timestamp)
  - `deletedOriginalCount` (number)
  - `skippedCount` (number)
  - `runAt` (Timestamp)
  - `notes` (string | null)

## Validation Rules
- すべての `sessionId` は `VisitorSession` に存在しなければならない。
- `PublicAccessToken.expiresAt` ≤ `VisitorSession.expiresAt`。
- `GeneratedImageAsset.expiresAt` = `VisitorSession.createdAt + 48h` を基準に計算。
- `VisitorSession.originalImageRef` は `status` が `capturing`/`selecting-theme` 以外なら null。
- `AquariumSyncEvent.attempts` は整数かつ `status` が `failed` のときのみ `errorMessage` 必須。
