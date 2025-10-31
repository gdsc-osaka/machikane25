# **Tasks: AI Photo Booth Experience (User Story 3 Detailed)**


Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: US3 (Includes Staff Auth, Photos Page, and Admin Monitoring)

## **Phase 5: User Story 3 ↁEStaff Monitors Sync & Manages Printing (Priority: P3)**

**Goal**: スタチE��がトークン認証で管琁E��面�E�Eogin, Admin, Photos�E�にアクセスし、水族館連携�E�Ert�E��E失敗を監視�Eリトライでき、チェキ印刷用に最新の生�E画像を閲覧できる (FR-005, FR-007, FR-009)、E

### **Tests for User Story 3 (Detailed) ⚠EE**

* [x] T501 \[P\] \[US3\] **Integration Test (Auth Flow)**: apps/photo/test/integration/authFlow.test.ts  
  * loginWithAdminTokenAction (T505) を正しいト�Eクン�E�Erocess.envのハッシュ允E��でコール。�E功し、Firebase Custom Tokenが返ることをアサート、E 
  * 不正なト�Eクンでコール、EuthErrorが返ることをアサート、E 
  * middleware.ts (T506) のチE��チE  
    * Cookieに有効なト�Eクン�E�E505で取得したトークン�E�を設定し、Eadminにアクセス、E00 OKをアサート、E 
    * CookieがなぁE��また�E無効なト�Eクンで/adminにアクセス、Eloginへのリダイレクト！E07�E�をアサーチE(Design Doc)、E 
* [x] T502 \[P\] \[US3\] **RTL Spec (Login Page)**: apps/photo/test/unit/app/login/page.test.tsx  
  * ト�Eクン入力！Enput\[type=password\]�E�と送信ボタンを表示、E 
  * loginWithAdminTokenAction (T505) が�E功！Eustom Token�E�を返すようモチE��。signInWithCustomTokenがコールされ、Eadminへrouter.pushされることを検証 (Design Doc)、E 
  * loginWithAdminTokenAction (T505) がエラーを返すようモチE��。エラーメチE��ージがUIに表示されることを検証、E 
* [x] T503 \[P\] \[US3\] **RTL Spec (Photos Page)**: apps/photo/test/unit/app/photos/page.test.tsx  
  * useBoothsWithLatestPhoto (T508) フックをモチE��し、褁E��のブ�Eスとそれぞれの最新画像データ�E�EeneratedPhoto�E�を返すよう設定、E 
  * 吁E��ースID�E�侁E Booth 1�E�と対応する\<image\>タグ�E�EatestPhotoIdのimageUrl�E�が表示されることを検証 (FR-009)、E 
  * 「印刷用�E�ダウンロード）」�Eタンが各画像に付随してぁE��ことを検証、E 
* [x] T504 \[P\] \[US3\] **RTL Spec (Admin Page - Monitoring)**: apps/photo/test/unit/app/admin/page.test.tsx  
  * Design Doc.mdに基づき、boothId入力欁E��Control/Display/Photosへのリンクが表示されることを検証、E 
  * useAquariumSyncErrors (T512) hook is mocked to return Sentry aquarium-sync issues as {photoId, error, timestamp}.
  * 失敗イベント！EhotoId, error, timestamp�E�がチE�Eブル表示されることを検証 (FR-007)、E 
  * 「リトライ」�Eタン押下でretryAquariumSyncAction (T511) がコールされることを検証 (US3)、E 
* [x] T505 \[P\] \[US3\] **Integration Test (Aquarium Sync Flow)**: apps/photo/test/integration/aquariumFlow.test.ts  
  * **Setup**: mswで水族館API�E�Ert�E�をモチE��。最初�E500エラー、E回目は200 OKを返すよう設定、E 
  * **Flow**: 1. stub @sentry/nextjs captureException and call GenerationService.sendToAquarium (T507); 2. msw returns 500 and the call throws; 3. assert captureException receives the error with photoId context (FR-005); 4. call retryAquariumSyncAction (T511); 5. msw returns 200 OK; 6. assert the action resolves with a success payload and captureException is not invoked again.

### **Implementation for User Story 3 (Detailed)**

* [x] T506 \[US3\] **Infrastructure: AuthService & Server Actions**: src/application/authService.ts, src/app/actions/authActions.ts (TDD)  
  * authService.verifyAdminToken(token): tokenをsha256でハッシュ化し、process.env.ADMIN\_TOKEN\_HASHと比輁E(Design Doc)、E 
  * authService.createCustomToken(): firebase-adminのcreateCustomTokenを呼び出し、管琁E��E��限（侁E role: 'admin'�E�を持つCustom Claimを付丁E(Design Doc)、E 
  * loginWithAdminTokenAction(token) (Server Action): verifyAdminTokenを呼び出し、�E功すれ�EcreateCustomTokenを呼び出してクライアントに返す。失敗すれ�Eエラーをスロー、E 
* [x] T507 \[US3\] **Infrastructure: Middleware**: src/middleware.ts  
  * matcher: \['/admin/:path\*', '/photos/:path\*'\] を設定、E 
  * request.cookies.get('adminToken') でト�Eクンを取得、E 
  * authService.verifyAdminToken�E�E506�E�を�E�ハチE��ュ比輁E�Eため�E�サーバ�Eサイドで直接呼び出して検証、E 
  * 検証失敗時はNextResponse.redirect(new URL('/login', request.url))を返す (Design Doc)、E 
* [x] T508 \[US3\] **Presentation: Login Page**: src/app/login/page.tsx  
  * useStateでト�Eクンを管琁E��るClient Component、E 
  * フォーム送信時、loginWithAdminTokenAction (T506) を呼び出す、E 
  * 成功レスポンス�E�Eustom Token�E�を受け取ったら、Firebase Client SDKのsignInWithCustomToken(auth, customToken)を実行、E 
  * 成功後、Cookieに生�Eト�EクンをセチE���E�Eiddleware検証用�E�し、useRouter().push('/admin')でリダイレクチE(Design Doc)、E 
* [x] T509 \[US3\] **Application: AquariumService**: src/application/aquariumService.ts (TDD)  
  * spec.md (FR-005) reflects that aquariumSyncEvents collection is not created; failures are sourced from Sentry issues instead.
  * getSyncErrors(): call the Sentry REST API filtered by the aquarium-sync tag and embedded photoId, returning normalized data for the UI.
  * mapSentryIssueToSyncError(issue): expose {eventId, photoId, errorMessage, timestamp, issueUrl} helpers for consumers.
* [x] T510 \[US3\] **Application: GenerationService (Enhancement)**: src/application/generationService.ts (TDD)  
  * sendToAquarium(generatedPhoto): fetchで水族館API�E�Ert�E�にPOST、E 
  * completeGeneration (US1/T305) を修正: GeneratedPhoto作�E後、sendToAquariumを呼び出す、E 
  * try/catch wraps sendToAquarium, calls Sentry.captureException with the photoId context on failure, rethrows the error, and never persists Firestore logs (FR-005).
* [x] T511 \[US3\] **Application: AdminService & Server Actions**: src/application/adminService.ts, src/app/actions/adminActions.ts (TDD)  
  * retryAquariumSync(eventId, photoId): load generatedPhotos metadata, reuse GenerationService.sendToAquarium (T510), return {status, retriedAt} on success, and rethrow errors so Sentry records the failure.
  * retryAquariumSyncAction(eventId, photoId): server action wrapper (FR-007) that returns the retry result together with the Sentry issue URL for operators.
* [x] T512 \[P\] \[US3\] **Hooks (Admin Data)**: src/hooks/  
  * useBoothsWithLatestPhoto(): onSnapshotでbooths Cを購読。各boothのlatestPhotoIdを使ぁE��generatedPhotos Cから画像データを非同期に取得�E結合して返すフック�E�Ehotos Page用�E�、E 
  * useAquariumSyncErrors(): use SWR to poll a server action for AquariumService.getSyncErrors (T509) and expose Sentry issue derived failures for the Admin page.
* [x] T513 \[US3\] **Presentation: Admin Page**: src/app/admin/page.tsx  
  * Client Component。認証はmiddleware (T507) が担当、E 
  * Design Doc.mdの要件�E�EoothId入力、各ペ�Eジへのリンク�E�を実裁E��E 
  * useAquariumSyncErrors (T512) renders the Sentry issue data inside a shadcn/ui Table and includes the issueUrl and tag details.
  * Each row includes a Retry button wired to retryAquariumSyncAction (T511); on success emit a toast and refresh the Sentry issue link state (FR-007).
* [x] T514 \[P\] \[US3\] **Presentation: Photos Page**: src/app/photos/page.tsx  
  * Client Component。認証はmiddleware (T507) が担当、E 
  * useBoothsWithLatestPhoto (T512) を呼び出し、結果をグリチE��表示、E 
  * 吁E��像に\<a\>タグ�E�ダウンロード�Eタン�E�を設置�E�チェキ印刷操作用�E�EFR-009, Design Doc)、E

**Checkpoint**: US3 flow (Admin Auth, Photos Page View, Error Monitoring, Retry) complete.
