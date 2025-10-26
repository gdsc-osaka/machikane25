# **Feature Specification: AI Photo Booth Experience**

Feature Branch: \[002-gemini-ai-docs\]  
Created: 2025-10-21  
Last Updated: 2025-10-26  
Status: Revised  
Input: User description: "geminiの画像生成機能を用いた大学祭用のAIフォトブースの機能を作成したい。詳細はdocs/spec/Photo\_PRD.mdを参照してください。"  
Source Docs: data-model.md, Design Doc.md, spec.md

## **User Scenarios & Testing *(mandatory)***

### **User Story 1 \- Festival Visitor Generates AI Portrait (Priority: P1)**

来場者として、ブース端末の案内に従い、匿名認証されたうえでブースのWebカメラで写真を撮るか、または指定されたQRコード(Display Page に表示)経由でスマートフォンから写真をアップロードし、好みのテーマを選んでAI生成画像をその場で確認したい。

**Why this priority**: 生成体験の提供が企画の核となるため、これが成立しなければブース価値が失われる。

**Independent Test**: Firebase EmulatorとAI生成APIモックで撮影・アップロード→テーマ選択→生成→結果表示までの一連フローを再現し、端末1台のみでも完結する。

**Acceptance Scenarios**:

1. **Given** 匿名認証済みの来場者が撮影・選択画面(Control Page)にいる, **When** カウントダウン後に撮影を確定するか、またはアップロード画像を選択すると, **Then** 写真が UploadedPhoto として保存されテーマ選択画面へ遷移する。  
2. **Given** 来場者がテーマを選び規約に同意した, **When** 生成リクエストを送信すると, **Then** 60秒以内に生成画像が Display Page に表示され、Control Page にダウンロード用QRコードが表示される。

### **User Story 2 \- Visitor Retrieves Image Later (Priority: P2)**

来場者として、生成が終わったあとに Control Page に提示されたQRコードやURLから自分の画像に24時間以内でアクセスし、データをダウンロードしたい。

**Why this priority**: 体験の余韻と共有価値を高め、後日でも満足度を維持するための重要機能だが、当日体験より優先度は下がる。

**Independent Test**: QRコード生成→QRコード経由でDownloadページにアクセス ( /download?boothId=(boothId)\&photoId=(photoId) ) → 画像とダウンロードボタンを表示の流れを単独の統合テストで検証できる。

**Acceptance Scenarios**:

1. **Given** 来場者が結果画面でQRコードを受け取った, **When** 別端末で24時間以内にアクセスすると, **Then** 生成画像が閲覧・保存できる (Download Page は匿名アクセス可)。

### **User Story 3 \- Staff Monitors and Prints (Priority: P3)**

運営スタッフとして、管理者認証を経て Photos Page にアクセスし、各ブースで最新の生成結果が正しく生成されているかを確認したい。また、来場者の希望に応じて、画像をダウンロードし、フォトフレームを追加してチェキプリンターで手動印刷したい。

**Why this priority**: 来場者への付加価値（チェキ印刷）を提供し、システムの状態を監視するために必要。

**Independent Test**: 管理UI (Photos Page) にて、複数ブースの generatedPhotos サブコレクションから最新の画像が正しく表示されることを確認する。

**Acceptance Scenarios**:

1. **Given** 管理者が認証済みで Photos Page を開いた, **When** いずれかのブースで新しい画像が生成されると, **Then** 該当ブースの最新画像が Photos Page にリアルタイムで反映され、ダウンロード操作が可能である。

### **Edge Cases**

撮影または選択後に来場者が端末操作を放置した場合、一定時間（例: 3分）後にセッションをタイムアウトさせ初期画面（idle）へ戻す。

AI生成APIがタイムアウトまたはエラーになった場合、来場者にリトライ案内を表示し、管理UIで失敗理由を記録する。

QRコード発行後に有効期限（24時間）を過ぎてアクセスされた場合、Download Page にて失効メッセージを提示する。

## **Quality & Coverage Plan *(mandatory)***

* **Suites**: pnpm test:photo でユースケース・ドメイン層のユニットテスト (Vitest) とReactコンポーネントの統合テスト (@testing-library/react) を実行する。  
* **Coverage Strategy**: 生成フロー、認証Middleware、Server Action（Gemini API呼び出し含む）関連のロジックを網羅し、非同期分岐（成功・失敗・タイムアウト）をVitestで明示的に検証する。  
* **Environments**: Firebase Emulator Suite (Auth, Firestore, Storage, Functions) でバックエンドを再現し、AI生成APIおよび水族館連携WebhookはHTTPモックサーバー (msw) で疑似レスポンスを返す。  
* **Process Reference**: 開発フェーズは docs/TDD.md のRed-Green-Refactor-Commitサイクルに従う。  
* **Type Safety**: TypeScriptの any 型を禁止し、strict オプションを有効にする。

## **Requirements (mandatory)**

## **Functional Requirements**

* **FR-001**: System MUST 来場者（Download Page, Image Upload Page 利用者）に対して、Firebase 匿名認証を自動で実施する。  
* FR-002: System MUST 来場者に対して、Control Page でのWebカメラによる撮影、または Display Page に表示されるQRコード経由での Image Upload Page (/upload?boothId=...) での画像アップロードを提供し、JPEG/PNGかつ20MB以下のみ受け付ける。  
  いずれの場合も、(Design Doc.md 準拠):  
  1\. 新しい photoId を発行する。  
  2\. 画像データを Storage (photos/{photoId}/photo.png) にアップロードする。  
  3\. 取得した imageUrl と imagePath (photos/{photoId}/photo.png) を含むドキュメントを、Firestore の booths/{boothId}/uploadedPhotos/{photoId} サブコレクションに保存する。  
* **FR-003**: System MUST Control Page からの生成リクエストに基づき、選択されたテーマと UploadedPhoto を使用して、平均60秒以内に生成結果を提示する。  
* **FR-004**: System MUST 生成結果とメタデータを GeneratedPhoto として保存し、24時間有効なQRコードを Control Page に即時に発行する。  
* **FR-005**: System MUST 生成結果を水族館展示バックエンドへイベント連携し、成功/失敗ステータスを管理UIで確認できるよう記録する。  
* **FR-006**: System MUST UploadedPhoto データについて、生成に使用された場合は生成完了後速やかに削除し（Firestoreドキュメントと photos/{photoId}/photo.png の両方）、使用されなかった場合は createdAt から15分後に自動削除する（PhotoCleaner Firebase Functionによる）。  
* **FR-007**: System MUST 管理UI (Admin Page または Photos Page) でAI生成APIエラー・Webhook失敗・待機中件数をリアルタイム表示し、運営者が手動再送とメンテナンス切替を行えるようにする。  
* **FR-008**: System MUST 設計・実装ともに docs/DDD.md のレイヤリング規約（Presentation→Application→Domain→Infrastructure）を遵守する。  
* **FR-009**: System MUST 運営スタッフが管理UI (Photos Page) にて、全ブースの generatedPhotos サブコレクションを横断検索（Collection Group Query）し、ブースごとに最新の生成画像一覧を閲覧・ダウンロードし、チェキプリンターへの手動印刷操作を行えるようにする。  
* **FR-010**: (Gemini API Call Logic) System MUST AI画像生成（Gemini API呼び出し）を、管理者認証（FR-011）で保護された Control Page からトリガーされる Next.js Server Action ('use server') 内でのみ実行する。  
  * **1\. トリガー**: Control Page が、クライアントサイドで選択された入力（boothId, **sourcePhotoId** (uploadedPhotos サブコレクション内のドキュメントID), generationOptionIds）を引数として Server Action を呼び出す。(※ sourcePhotoId は、FR-002 に基づき uploadedPhotos に保存された写真のIDを指す)  
  * **2\. サーバーサイド認証**: Server Action は、Firebase Admin SDK を使用して呼び出し元の認証状態（Custom Claim）を検証し、管理者であることを確認する。  
  * **3\. データ取得**:  
    * a. **sourcePhotoId** を使用し、booths/{boothId}/uploadedPhotos/{sourcePhotoId} から imagePath（**photos/{sourcePhotoId}/photo.png**）を取得する。  
    * b. generationOptionIds を使用し、options コレクションから各 value（プロンプトの一部）を取得する。  
    * c. (3a) の imagePath を使用し、Firebase Storage から対象の画像ファイル（Buffer）をダウンロードする。  
  * **4\. プロンプト構築**: 取得した value とベースプロンプトを結合し、Gemini API に送信するテキストプロンプトを構築する。  
  * **5\. Gemini API 実行**:  
    * a. 環境変数 (GEMINI\_API\_KEY) を使用して Gemini API クライアントを初期化する。  
    * b. 使用モデル（例: gemini-2.5-flash-image-preview）に対し、(4) のテキストプロンプトと、(3-c) の画像Buffer（Base64エンコード）をペイロードとして送信する。  
  * **6\. 成功時 (Response Handling)**:  
    * a. APIから返却された画像データ（Base64）をデコードし、Buffer（generatedImageBuffer）に変換する。  
    * b. 新しい photoId（generatedPhotoId）を生成する。  
    * c. generatedImageBuffer を Storage (Design Doc.md 準拠: **generated\_photos/{generatedPhotoId}/photo.png**) にアップロードする。  
    * d. Storage から (6c) の imageUrl と imagePath を取得する。  
    * e. Firestore (booths/{boothId}/generatedPhotos/{generatedPhotoId}) にメタデータ（imageUrl, imagePath (generated\_photos/...), createdAt）を保存する。  
    * f. Firestore (booths/{boothId}) の latestPhotoId を (6-b) の generatedPhotoId に更新する。  
    * g. FR-005（水族館連携）および FR-006（**sourcePhotoId に該当する**元画像削除）のロジックを非同期でトリガーする。  
    * h. クライアントに対し、生成された generatedPhotoId および imageUrl を返す。  
  * **7\. 失敗時 (Error Handling)**:  
    * a. Gemini API または Firebase のエラーをキャッチし、Sentry等にログを送信する。  
    * b. クライアントに対し、エラーメッセージを含む失敗レスポンスを返す。  
* **FR-011**: (Middleware Access Control) System MUST Next.js Middleware を使用し、管理者用ページ（/admin, /control, /display, /photos）へのアクセスを制限する。リクエストCookie内の管理者トークンのハッシュ値が環境変数のハッシュ値と一致しない場合、/login ページへリダイレクトする。  
* **FR-012**: (Admin Authentication) System MUST Login Page (/login) にて、運営スタッフが入力したトークン（平文）を Server Action で検証（ソルトを使用したハッシュ化と比較）する。検証成功時、Firebase Admin SDK を用いて Custom Token を発行し、クライアントは signInWithCustomToken でFirebase認証を行う。

### **Key Entities *(data-model.md, Design Doc.md 準拠)***

* **Booth**: (Collection: booths) 各フォトブース端末の状態とメタデータ。  
  * state: (string) idle, menu, capturing, generating, completed  
  * latestPhotoId: (string | null) generatedPhotos サブコレクションの最新ドキュメントID  
  * lastTakePhotoAt: (Timestamp | null)  
  * createdAt: (Timestamp)  
* **GeneratedPhoto**: (Sub-collection: booths/{boothId}/generatedPhotos) 生成済み画像のメタデータ。  
  * imageUrl: (string) Storage URL  
  * imagePath: (string) Storage path (e.g., **generated\_photos/{photoId}/photo.png**)  
  * createdAt: (Timestamp)  
* **UploadedPhoto**: (Sub-collection: booths/{boothId}/uploadedPhotos) 来場者がアップロードした一時的な写真。  
  * imageUrl: (string) Storage URL  
  * imagePath: (string) Storage path (e.g., **photos/{photoId}/photo.png**)  
  * createdAt: (Timestamp)  
* **GenerationOption**: (Collection: options) AI生成に使用する選択肢のマスターデータ。  
  * typeId: (string) location, outfit, person, style, pose  
  * value: (string) プロンプト用の値  
  * displayName: (string) 表示名  
  * imageUrl: (string | null)  
  * imagePath: (string | null)  
  * createdAt: (Timestamp)  
  * updatedAt: (Timestamp)  
* **PhotoCleanerAudit**: （*変更なし。ただし、UploadedPhoto がサブコレクションであるため、Functionは collectionGroup('uploadedPhotos') を監視する*）

### **Dependencies & Assumptions**

* **ネットワーク前提**: 祭り会場の有線または専用Wi-Fiが安定しており、FirebaseとGemini APIエンドポイントに常時接続できる。  
* **サービス依存**: AI生成API（Gemini）は Next.js サーバー（Server Action）からのみ呼び出され、クライアントからは直接アクセスされない。Firebaseサービスの利用枠が祭り期間中のピーク需要を満たすよう事前に割り当て済みである。  
* **運用前提**: ブースには常時スタッフが配置され、管理者認証済みのPC（Control Page 用）と、チェキ印刷用のPC（Photos Page 用）を操作できる。  
* **プライバシー前提**: 事前掲示物と口頭案内により、来場者が撮影・生成・データ保持ポリシーへ同意したうえで参加する。  
* **開発プロセス前提**: 実装チームは機能追加毎に docs/DDD.md と docs/TDD.md を参照する。

## **Security *(Design Doc.md 準拠)***

### **Authentication & Authorization**

1. **管理者認証 (Token-based)**  
   * **トークン発行**: 運営者向けに事前に安全な方法でUUID等のトークン（平文）を共有する。  
   * **トークン検証**: 環境変数にソルト (ADMIN\_TOKEN\_SALT) と、トークン（平文）＋ソルトでSHA256ハッシュ化した値 (ADMIN\_TOKEN\_HASH) を保持する。  
   * **ログインフロー (/login)**:  
     1. 運営者が Login Page でトークン（平文）を入力。  
     2. Server Action がリクエストを受け取り、(1) のトークンと環境変数の ADMIN\_TOKEN\_SALT を用いてハッシュ値を計算。  
     3. 計算したハッシュ値と環境変数の ADMIN\_TOKEN\_HASH を厳密に比較。  
     4. 一致した場合: Firebase Admin SDK で createCustomToken を実行し、クライアント（ブラウザ）にCustom Tokenを返す。  
     5. クライアントは signInWithCustomToken を実行し、Firebase認証セッションを確立する。同時に、後続のMiddleware検証のため、トークン（平文）を HttpOnly かつ Secure なCookieに保存する。  
     6. Admin Page (/admin) へリダイレクトする。  
   * **Firebase Rules**: FirestoreおよびStorageのSecurity Rulesでは、request.auth.token.admin \=== true のようなCustom Claim（Custom Token発行時に付与）を検証し、管理者のみが booths コレクション等に書き込めるよう制御する。  
2. **Middlewareによるアクセス制限 (Route Protection)**  
   * **対象パス**: /admin, /control, /display, /photos およびそれ以下の全パス。  
   * **除外パス**: /login, /download, /upload, /404, /api/ (public API), /\_next/。  
   * **ロジック (middleware.ts)**:  
     1. リクエストされたパスが対象パスか判定する。  
     2. 対象パスの場合、リクエストCookieからトークン（平文）を読み取る。  
     3. Server Actionと同様に、環境変数のソルトを用いてハッシュ値を計算し、ADMIN\_TOKEN\_HASH と比較する。  
     4. 一致しない（またはCookieが存在しない）場合、/login ページへリダイレクトする。  
     5. 一致した場合、リクエストの続行を許可する。  
3. **来場者認証 (Anonymous)**  
   * Download Page (/download) および Image Upload Page (/upload) にアクセスする来場者は、クライアントサイドで Firebase signInAnonymously を実行し、匿名認証セッションを確立する。  
   * Storage Rulesにより、匿名認証ユーザーは UploadedPhoto の書き込み（アップロード）のみ許可され（photos/{photoId}/photo.png）、他人の GeneratedPhoto へのアクセスは（Security Rulesで）拒否される（Download Page はサーバー側で署名付きURL等を介して画像アクセスを仲介することを推奨）。

## **Success Criteria *(mandatory)***

* **SC-001**: 来場者体験の90%が Control Page での操作開始から Display Page での生成結果表示までを平均60秒以内で完了できる。  
* **SC-002**: Server Action経由でのGemini APIリクエストの95%以上が初回実行で成功する。  
* **SC-003**: Download Page へのアクセスの85%以上が24時間以内に生成画像の閲覧またはダウンロード完了まで到達する。  
* **SC-004**: Photos Page がブースの最新状態をリアルタイム（5秒以内）に反映できる。