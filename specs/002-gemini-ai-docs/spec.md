# Feature Specification: AI Photo Booth Experience

**Feature Branch**: [002-gemini-ai-docs]
**Created**: 2025-10-21
**Status**: Draft
**Input**: User description: "geminiの画像生成機能を用いた大学祭用のAIフォトブースの機能を作成したい。詳細はdocs/spec/Photo_PRD.mdを参照してください。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Festival Visitor Generates AI Portrait (Priority: P1)

来場者として、ブース端末の案内に従い、匿名認証されたうえでブースのWebカメラで写真を撮るか、または指定されたQRコード経由でスマートフォンから写真をアップロードし、好みのテーマを選んでAI生成画像をその場で確認したい。

**Why this priority**: 生成体験の提供が企画の核となるため、これが成立しなければブース価値が失われる。

**Independent Test**: Firebase EmulatorとAI生成APIモックで撮影・アップロード→テーマ選択→生成→結果表示までの一連フローを再現し、端末1台のみでも完結する。

**Acceptance Scenarios**:

1. **Given** 匿名認証済みの来場者が撮影・選択画面にいる, **When** カウントダウン後に撮影を確定するか、またはアップロード画像を選択すると, **Then** 写真が保存されテーマ選択画面へ遷移する。
2. **Given** 来場者がテーマを選び規約に同意した, **When** 生成リクエストを送信すると, **Then** 60秒以内に生成画像が表示され成功メッセージが示される。

### User Story 2 - Visitor Retrieves Image Later (Priority: P2)

来場者として、生成が終わったあとに提示されたQRコードやURLから自分の画像に24時間以内でアクセスし、データをダウンロードしたい。

**Why this priority**: 体験の余韻と共有価値を高め、後日でも満足度を維持するための重要機能だが、当日体験より優先度は下がる。

**Independent Test**: QRコード生成→Dynamic Link経由アクセス→匿名トークン検証→画像表示の流れを単独の統合テストで検証できる。

**Acceptance Scenarios**:

1. **Given** 来場者が結果画面でQRコードを受け取った, **When** 別端末で24時間以内にアクセスすると, **Then** 一回限りの匿名トークン検証後に生成画像が閲覧・保存できる。

### User Story 3 - Staff Monitors Sync to Aquarium Display (Priority: P3)

運営スタッフとして、生成結果がインタラクティブアート水族館に正しく送られているかをダッシュボードで把握し、失敗時はリトライ操作をしたい。

**Why this priority**: 展示間連携で全体演出を支える要素であり、来場者体験を間接的に守るために必要。

**Independent Test**: 管理UIモックを使い、生成済みセッションに対する成功/失敗イベントを注入し、可視化とリトライが動作することを確認可能。

**Acceptance Scenarios**:

1. **Give** 管理者がUUIDトークンでダッシュボードに入った, **When** 水族館連携失敗イベントが発生すると, **Then** 対象セッションに失敗ステータスと再送ボタンが表示され再送信できる。

### Edge Cases

撮影または選択後に来場者が端末操作を放置した場合、一定時間後にセッションをタイムアウトさせ初期画面（idle）へ戻す。

AI生成APIがタイムアウトまたはレート制限になった場合、来場者にリトライ案内を表示し、管理UIで失敗理由を記録する。

QRコード発行後に有効期限（24時間）を過ぎてアクセスされた場合、失効メッセージを提示する。

## Quality & Coverage Plan *(mandatory)*

- **Suites**: `pnpm test:photo` でユースケース・ドメイン層のユニットテスト (Vitest) とReactコンポーネントの統合テスト (@testing-library/react) を実行し、必要に応じてPlaywrightベースのE2Eテストを追加する。

- **Coverage Strategy**: 生成フロー関連のアプリケーション層／UIコンポーネント／Firebase連携のスタブを網羅し、非同期分岐（成功・失敗・タイムアウト）をVitestで明示的に検証して100%ステートメント・分岐カバレッジを確保する。

- **Environments**: Firebase Emulator SuiteでAuth・Firestore・Functions・Storageを再現し、AI生成APIおよび水族館連携WebhookはHTTPモックサーバー (msw) で疑似レスポンスを返す。

- **Process Reference**: 開発フェーズは docs/TDD.md のRed-Green-Refactor-Commitサイクルに厳密に従い、実装前に必ず失敗するテストを用意する。レビューチェックリストにもTDD順守を含める。

- **Type Safety**: TypeScriptの実装ではany型の宣言やアサーションを禁止し、ドメイン型・ジェネリクス・型ガードで表現力を維持してCIの型検証をパスする。

## Requirements (mandatory)

## Functional Requirements

- **FR-001**: System MUST 匿名認証を自動で実施し、来場者が追加入力なしで撮影フローに入れるようにする。
- **FR-002**: System MUST 来場者に対して、ブース端末のWebカメラによる撮影、またはDisplay Pageに表示されるQRコード経由での画像アップロードを提供し、JPEG/PNGかつ20MB以下のみ受け付ける。
- **FR-003**: System MUST 来場者が選んだテーマと撮影・アップロード画像をAI生成サービスへ送信し、平均60秒以内に生成結果を提示する。
- **FR-004**: System MUST 生成結果とメタデータを来場者用ストレージ領域に保存し、24時間有効なQRコードとURLを即時に発行する。
- **FR-005**: System MUST 生成結果を水族館展示バックエンドへイベント連携し、成功/失敗ステータスを管理UIで確認できるよう記録する。
- **FR-006**: System MUST 使用されなかった元画像データ（アップロード分）を15分後に自動削除し、使用された元画像データ（撮影・アップロード分）は生成完了後速やかに削除する。生成画像はアクセス制御された状態で保持する。
- **FR-007**: System MUST 管理UIでAI生成APIエラー・Webhook失敗・待機中件数をリアルタイム表示し、運営者が手動再送とメンテナンス切替を行えるようにする。
- **FR-008**: System MUST 設計・実装ともに docs/DDD.md のレイヤリング規約（Presentation→Application→Domain→Infrastructure）を遵守し、層を跨ぐ直接依存やクラス利用を禁止する。
- **FR-009**: System MUST 運営スタッフが管理UI (Photos Page) にて、ブースごとに最新の生成画像一覧を閲覧し、チェキプリンターへの手動印刷操作を行えるようにする。

### Key Entities *(include if feature involves data)*

- **Booth**: 各フォトブース端末の状態（idle, menu, capturing, generating, completed）、最新の生成写真ID（latestPhotoId）を管理する。
- **GeneratedPhoto**: 生成済み画像のメタデータ（boothId, Storage imageUrl, Storage imagePath）を管理する。
- **UploadedPhoto**: 来場者がスマートフォンからアップロードした一時的な写真（boothId, Storage imageUrl, Storage imagePath）を管理する。
- **GenerationOption**: AI生成に使用する選択肢（typeId として location, outfit, person, style, pose）のマスターデータ。
- **PhotoCleanerAudit**: UploadedPhoto の自動削除バッチ（15分タイマー）の実行証跡。

### Dependencies & Assumptions

- **ネットワーク前提**: 祭り会場の有線または専用Wi-Fiが安定しており、AI生成APIとFirebaseに常時接続できる。

- **サービス依存**: AI生成API（Gemini互換）とFirebaseサービスの利用枠が祭り期間中のピーク需要（1req/秒/端末）を満たすよう事前に割り当て済みである。

- **運用前提**: ブースには常時スタッフが配置され、端末リセットやメンテナンスモード切替、チェキ印刷対応を実施できる。

- **プライバシー前提**: 事前掲示物と口頭案内により、来場者が撮影・生成・データ保持ポリシーへ同意したうえで参加する。

- **開発プロセス前提**: 実装チームは機能追加毎に docs/DDD.md と docs/TDD.md を参照し、コードレビューで遵守事項を確認する。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 来場者体験の90%が撮影開始から生成結果表示までを平均60秒以内で完了できる。
- **SC-002**: 生成リクエストの95%以上が初回実行で成功し、残りはリトライ後に成功率98%以上を維持する。
- **SC-003**: QR/URLアクセスの85%以上が24時間以内に生成画像の閲覧またはダウンロード完了まで到達する。
- **SC-004**: 水族館展示への連携イベント成功率が98%以上を維持し、障害発生時は15分以内に運営者がステータスを確認できる。