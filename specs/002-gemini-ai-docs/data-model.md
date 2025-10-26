# Data Model — AI Photo Booth Experience

## Booth
- **Purpose**: 各フォトブース端末の状態と最新情報を管理する。
- **Key Fields:**
  - `boothId` (string, Firestore doc id)
  - `state` (enum: `idle`, `menu`, `capturing`, `generating`, `completed`)
  - `latestPhotoId` (string, FK: GeneratedPhoto | null)
  - `lastTakePhotoAt` (Timestamp | null)
  - `createdAt` (Timestamp)
- **State Transitions**:
  - `idle` → `menu` (Control Pageで開始)
  - `menu` → `capturing` (撮影開始)
  - `capturing` → `menu` (撮影完了・プレビュー)
  - `menu` → `generating` (オプション決定・生成開始)
  - `generating` → `completed` (生成完了)
  - `completed` → `idle` (タイムアウトまたはリセット)

## GeneratedPhoto
- **Purpose**: 生成済み画像のメタデータを管理。
- **Key Fields**:
  - `photoId` (string, Firestore doc id)
  - `boothId` (string, FK: Booth)
  - `imageUrl` (string, Storage URL)
  - `imagePath` (string, Storage path)
  - `createdAt` (Timestamp)

## UploadedPhoto
- **Purpose**: 来場者がスマートフォンからアップロードした一時的な写真。
- **Key Fields**:
  - `photoId` (string, Firestore doc id)
  - `boothId` (string, FK: Booth)
  - `imageUrl` (string, Storage URL)
  - `imagePath` (string, Storage path)

## GenerationOption
- **Purpose**: テンプレートの選択肢（Location/Outfit/Person/Style/Pose）。
- **Key Fields**:
  - `id` (string, Firestore doc id)
  - `typeId` (string; `location`, `outfit`, `person`, `style`, `pose`)
  - `value` (string; プロンプト用の値)
  - `displayName` (string; 表示名)
  - `imageUrl?` (string | null)
  - `imagePath?` (string | null)
  - `createdAt` (Timestamp)
  - `updatedAt` (Timestamp)

## Validation Rules
- `GeneratedPhoto.boothId` および `UploadedPhoto.boothId` は Booth コレクションに存在する id でなければならない。
- `Booth.latestPhotoId` は `GeneratedPhoto` コレクションに存在する id でなければならない（nullを除く）。
