# **Tasks: AI Photo Booth Experience (User Story 3 Detailed)**


Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: US3 (Includes Staff Auth, Photos Page, and Admin Monitoring)

## **Phase 5: User Story 3 ↁEStaff Monitors Sync & Manages Printing (Priority: P3)**

**Goal**: スタッフがトークン認証で管理画面（Login, Admin, Photos）にアクセスし、水族館連携（art）の失敗を監視・リトライでき、チェキ印刷用に最新の生成画像を閲覧できる (FR-005, FR-007, FR-009)。

### **Tests for User Story 3 (Detailed) ⚠EE**

* \[ \] T501 \[P\] \[US3\] **Integration Test (Auth Flow)**: apps/photo/test/integration/authFlow.test.ts  
  * loginWithAdminTokenAction (T505) を正しいトークン（process.envのハッシュ元）でコール。成功し、Firebase Custom Tokenが返ることをアサート。  
  * 不正なトークンでコール。AuthErrorが返ることをアサート。  
  * middleware.ts (T506) のテスト:  
    * Cookieに有効なトークン（T505で取得したトークン）を設定し、/adminにアクセス。200 OKをアサート。  
    * Cookieがない、または無効なトークンで/adminにアクセス。/loginへのリダイレクト（307）をアサート (Design Doc)。  
* \[ \] T502 \[P\] \[US3\] **RTL Spec (Login Page)**: apps/photo/test/unit/app/login/page.test.tsx  
  * トークン入力（input\[type=password\]）と送信ボタンを表示。  
  * loginWithAdminTokenAction (T505) が成功（Custom Token）を返すようモック。signInWithCustomTokenがコールされ、/adminへrouter.pushされることを検証 (Design Doc)。  
  * loginWithAdminTokenAction (T505) がエラーを返すようモック。エラーメッセージがUIに表示されることを検証。  
* \[ \] T503 \[P\] \[US3\] **RTL Spec (Photos Page)**: apps/photo/test/unit/app/photos/page.test.tsx  
  * useBoothsWithLatestPhoto (T508) フックをモックし、複数のブースとそれぞれの最新画像データ（GeneratedPhoto）を返すよう設定。  
  * 各ブースID（例: Booth 1）と対応する\<image\>タグ（latestPhotoIdのimageUrl）が表示されることを検証 (FR-009)。  
  * 「印刷用（ダウンロード）」ボタンが各画像に付随していることを検証。  
* \[ \] T504 \[P\] \[US3\] **RTL Spec (Admin Page - Monitoring)**: apps/photo/test/unit/app/admin/page.test.tsx  
  * Design Doc.mdに基づき、boothId入力欄とControl/Display/Photosへのリンクが表示されることを検証。  
  * useAquariumSyncErrors (T512) hook is mocked to return Sentry aquarium-sync issues as {photoId, error, timestamp}.
  * 失敗イベント（photoId, error, timestamp）がテーブル表示されることを検証 (FR-007)。  
  * 「リトライ」ボタン押下でretryAquariumSyncAction (T511) がコールされることを検証 (US3)。  
* \[ \] T505 \[P\] \[US3\] **Integration Test (Aquarium Sync Flow)**: apps/photo/test/integration/aquariumFlow.test.ts  
  * **Setup**: mswで水族館API（art）をモック。最初は500エラー、2回目は200 OKを返すよう設定。  
  * **Flow**: 1. stub @sentry/nextjs captureException and call GenerationService.sendToAquarium (T507); 2. msw returns 500 and the call throws; 3. assert captureException receives the error with photoId context (FR-005); 4. call retryAquariumSyncAction (T511); 5. msw returns 200 OK; 6. assert the action resolves with a success payload and captureException is not invoked again.

### **Implementation for User Story 3 (Detailed)**

* \[ \] T506 \[US3\] **Infrastructure: AuthService & Server Actions**: src/application/authService.ts, src/app/actions/authActions.ts (TDD)  
  * authService.verifyAdminToken(token): tokenをsha256でハッシュ化し、process.env.ADMIN\_TOKEN\_HASHと比較 (Design Doc)。  
  * authService.createCustomToken(): firebase-adminのcreateCustomTokenを呼び出し、管理者権限（例: role: 'admin'）を持つCustom Claimを付与 (Design Doc)。  
  * loginWithAdminTokenAction(token) (Server Action): verifyAdminTokenを呼び出し、成功すればcreateCustomTokenを呼び出してクライアントに返す。失敗すればエラーをスロー。  
* \[ \] T507 \[US3\] **Infrastructure: Middleware**: src/middleware.ts  
  * matcher: \['/admin/:path\*', '/photos/:path\*'\] を設定。  
  * request.cookies.get('adminToken') でトークンを取得。  
  * authService.verifyAdminToken（T506）を（ハッシュ比較のため）サーバーサイドで直接呼び出して検証。  
  * 検証失敗時はNextResponse.redirect(new URL('/login', request.url))を返す (Design Doc)。  
* \[ \] T508 \[US3\] **Presentation: Login Page**: src/app/login/page.tsx  
  * useStateでトークンを管理するClient Component。  
  * フォーム送信時、loginWithAdminTokenAction (T506) を呼び出す。  
  * 成功レスポンス（Custom Token）を受け取ったら、Firebase Client SDKのsignInWithCustomToken(auth, customToken)を実行。  
  * 成功後、Cookieに生のトークンをセット（middleware検証用）し、useRouter().push('/admin')でリダイレクト (Design Doc)。  
* \[ \] T509 \[US3\] **Application: AquariumService**: src/application/aquariumService.ts (TDD)  
  * spec.md (FR-005) reflects that aquariumSyncEvents collection is not created; failures are sourced from Sentry issues instead.
  * getSyncErrors(): call the Sentry REST API filtered by the aquarium-sync tag and embedded photoId, returning normalized data for the UI.
  * mapSentryIssueToSyncError(issue): expose {eventId, photoId, errorMessage, timestamp, issueUrl} helpers for consumers.
* \[ \] T510 \[US3\] **Application: GenerationService (Enhancement)**: src/application/generationService.ts (TDD)  
  * sendToAquarium(generatedPhoto): fetchで水族館API（art）にPOST。  
  * completeGeneration (US1/T305) を修正: GeneratedPhoto作成後、sendToAquariumを呼び出す。  
  * try/catch wraps sendToAquarium, calls Sentry.captureException with the photoId context on failure, rethrows the error, and never persists Firestore logs (FR-005).
* \[ \] T511 \[US3\] **Application: AdminService & Server Actions**: src/application/adminService.ts, src/app/actions/adminActions.ts (TDD)  
  * retryAquariumSync(eventId, photoId): load generatedPhotos metadata, reuse GenerationService.sendToAquarium (T510), return {status, retriedAt} on success, and rethrow errors so Sentry records the failure.
  * retryAquariumSyncAction(eventId, photoId): server action wrapper (FR-007) that returns the retry result together with the Sentry issue URL for operators.
* \[ \] T512 \[P\] \[US3\] **Hooks (Admin Data)**: src/hooks/  
  * useBoothsWithLatestPhoto(): onSnapshotでbooths Cを購読。各boothのlatestPhotoIdを使い、generatedPhotos Cから画像データを非同期に取得・結合して返すフック（Photos Page用）。  
  * useAquariumSyncErrors(): use SWR to poll a server action for AquariumService.getSyncErrors (T509) and expose Sentry issue derived failures for the Admin page.
* \[ \] T513 \[US3\] **Presentation: Admin Page**: src/app/admin/page.tsx  
  * Client Component。認証はmiddleware (T507) が担当。  
  * Design Doc.mdの要件（boothId入力、各ページへのリンク）を実装。  
  * useAquariumSyncErrors (T512) renders the Sentry issue data inside a shadcn/ui Table and includes the issueUrl and tag details.
  * Each row includes a Retry button wired to retryAquariumSyncAction (T511); on success emit a toast and refresh the Sentry issue link state (FR-007).
* \[ \] T514 \[P\] \[US3\] **Presentation: Photos Page**: src/app/photos/page.tsx  
  * Client Component。認証はmiddleware (T507) が担当。  
  * useBoothsWithLatestPhoto (T512) を呼び出し、結果をグリッド表示。  
  * 各画像に\<a\>タグ（ダウンロードボタン）を設置（チェキ印刷操作用）(FR-009, Design Doc)。

**Checkpoint**: US3 flow (Admin Auth, Photos Page View, Error Monitoring, Retry) complete.