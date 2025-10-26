# Phase 0 Research — AI Photo Booth Experience

## Decision: Server-side generation orchestration via Next.js Route Handler + Cloud Tasks
- **Rationale**: Keeps kiosk UI responsive by delegating long-running Gemini互換API呼び出しをサーバー側に隔離し、失敗時の指数バックオフや再送を統一管理できる。Firebase Functions単独よりもApp Routerとの統合が容易で、会場PCからの直接API呼び出しによる秘密漏洩を防ぐ。
- **Alternatives considered**:
  - *Client-side direct call*: 却下。APIキーを露出し、ネットワーク断でリトライ制御が難しい。
  - *純Functions実装*: 実装可能だが、Next.jsアプリとのセッション連携を二重管理する必要があり冗長。

## Decision: Anonymous Firebase Auth + session documents for visitor flows
- **Rationale**: 追加入力なしで来場者を識別でき、FirestoreセッションとStorage ACLを自動で紐付け可能。既存スタンプラリーと同じセキュリティルールが流用できる。
- **Alternatives considered**:
  - *独自UUID生成のみ*: Firestoreルールでのアクセス制御が複雑化し、クロスデバイスアクセスの保証が困難。
  - *メールアドレス登録*: 体験時間が増えUX低下。

## Decision: 48時間有効のDynamic Link + one-time public tokens
- **Rationale**: QRからスマホへ安全に共有し、有効期限明示。Dynamic Linkで多端末互換を確保し、tokenドキュメントでアクセス失効を即時反映できる。
- **Alternatives considered**:
  - *直接Storage署名URL*: 即期公開だが失効管理が難しく、再発行時にURL差替えが面倒。
  - *メール配信*: 匿名体験と矛盾し即時性に欠ける。

## Decision: Five-option preset prompt templates stored in Firestore + Remote Config override
- **Rationale**: オペレーションチームが祭り直前でもテーマを調整できる。Remote Configで一時的な生成停止やプロンプト調整が可能。
- **Alternatives considered**:
  - *コード内ハードコード*: ビルドし直しが必要になりリードタイムが長い。
  - *完全自由入力*: モデレーション負荷が増し運営リスクが高い。

## Decision: Cloud Function cron to purge originals after 5 minutes
- **Rationale**: プライバシーポリシーを遵守しつつ、生成失敗時の検証猶予を確保。Firebase Schedulerで制御するだけで済む。
- **Alternatives considered**:
  - *同期削除*: 生成完了直後に削除すると、失敗調査が難しく再生成が不可能になる。
  - *手動削除*: 運営負荷が高く、削除漏れリスクが大きい。
