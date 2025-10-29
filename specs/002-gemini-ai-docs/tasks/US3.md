# **Tasks: AI Photo Booth Experience (User Story 3 Detailed)**


Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: US3 (Includes Staff Auth, Photos Page, and Admin Monitoring)

## **Phase 5: User Story 3 竊・Staff Monitors Sync & Manages Printing (Priority: P3)**

**Goal**: 繧ｹ繧ｿ繝・ヵ縺後ヨ繝ｼ繧ｯ繝ｳ隱崎ｨｼ縺ｧ邂｡逅・判髱｢・・ogin, Admin, Photos・峨↓繧｢繧ｯ繧ｻ繧ｹ縺励∵ｰｴ譌城､ｨ騾｣謳ｺ・・rt・峨・螟ｱ謨励ｒ逶｣隕悶・繝ｪ繝医Λ繧､縺ｧ縺阪√メ繧ｧ繧ｭ蜊ｰ蛻ｷ逕ｨ縺ｫ譛譁ｰ縺ｮ逕滓・逕ｻ蜒上ｒ髢ｲ隕ｧ縺ｧ縺阪ｋ (FR-005, FR-007, FR-009)縲・

### **Tests for User Story 3 (Detailed) 笞EE**

* [x] T501 \[P\] \[US3\] **Integration Test (Auth Flow)**: apps/photo/test/integration/authFlow.test.ts  
  * loginWithAdminTokenAction (T505) 繧呈ｭ｣縺励＞繝医・繧ｯ繝ｳ・・rocess.env縺ｮ繝上ャ繧ｷ繝･蜈・ｼ峨〒繧ｳ繝ｼ繝ｫ縲よ・蜉溘＠縲：irebase Custom Token縺瑚ｿ斐ｋ縺薙→繧偵い繧ｵ繝ｼ繝医・ 
  * 荳肴ｭ｣縺ｪ繝医・繧ｯ繝ｳ縺ｧ繧ｳ繝ｼ繝ｫ縲・uthError縺瑚ｿ斐ｋ縺薙→繧偵い繧ｵ繝ｼ繝医・ 
  * middleware.ts (T506) 縺ｮ繝・せ繝・  
    * Cookie縺ｫ譛牙柑縺ｪ繝医・繧ｯ繝ｳ・・505縺ｧ蜿門ｾ励＠縺溘ヨ繝ｼ繧ｯ繝ｳ・峨ｒ險ｭ螳壹＠縲・admin縺ｫ繧｢繧ｯ繧ｻ繧ｹ縲・00 OK繧偵い繧ｵ繝ｼ繝医・ 
    * Cookie縺後↑縺・√∪縺溘・辟｡蜉ｹ縺ｪ繝医・繧ｯ繝ｳ縺ｧ/admin縺ｫ繧｢繧ｯ繧ｻ繧ｹ縲・login縺ｸ縺ｮ繝ｪ繝繧､繝ｬ繧ｯ繝茨ｼ・07・峨ｒ繧｢繧ｵ繝ｼ繝・(Design Doc)縲・ 
* [x] T502 \[P\] \[US3\] **RTL Spec (Login Page)**: apps/photo/test/unit/app/login/page.test.tsx  
  * 繝医・繧ｯ繝ｳ蜈･蜉幢ｼ・nput\[type=password\]・峨→騾∽ｿ｡繝懊ち繝ｳ繧定｡ｨ遉ｺ縲・ 
  * loginWithAdminTokenAction (T505) 縺梧・蜉滂ｼ・ustom Token・峨ｒ霑斐☆繧医≧繝｢繝・け縲ＴignInWithCustomToken縺後さ繝ｼ繝ｫ縺輔ｌ縲・admin縺ｸrouter.push縺輔ｌ繧九％縺ｨ繧呈､懆ｨｼ (Design Doc)縲・ 
  * loginWithAdminTokenAction (T505) 縺後お繝ｩ繝ｼ繧定ｿ斐☆繧医≧繝｢繝・け縲ゅお繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺袈I縺ｫ陦ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧呈､懆ｨｼ縲・ 
* [x] T503 \[P\] \[US3\] **RTL Spec (Photos Page)**: apps/photo/test/unit/app/photos/page.test.tsx  
  * useBoothsWithLatestPhoto (T508) 繝輔ャ繧ｯ繧偵Δ繝・け縺励∬､・焚縺ｮ繝悶・繧ｹ縺ｨ縺昴ｌ縺槭ｌ縺ｮ譛譁ｰ逕ｻ蜒上ョ繝ｼ繧ｿ・・eneratedPhoto・峨ｒ霑斐☆繧医≧險ｭ螳壹・ 
  * 蜷・ヶ繝ｼ繧ｹID・井ｾ・ Booth 1・峨→蟇ｾ蠢懊☆繧欺<image\>繧ｿ繧ｰ・・atestPhotoId縺ｮimageUrl・峨′陦ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧呈､懆ｨｼ (FR-009)縲・ 
  * 縲悟魂蛻ｷ逕ｨ・医ム繧ｦ繝ｳ繝ｭ繝ｼ繝会ｼ峨阪・繧ｿ繝ｳ縺悟推逕ｻ蜒上↓莉倬囂縺励※縺・ｋ縺薙→繧呈､懆ｨｼ縲・ 
* [x] T504 \[P\] \[US3\] **RTL Spec (Admin Page - Monitoring)**: apps/photo/test/unit/app/admin/page.test.tsx  
  * Design Doc.md縺ｫ蝓ｺ縺･縺阪｜oothId蜈･蜉帶ｬ・→Control/Display/Photos縺ｸ縺ｮ繝ｪ繝ｳ繧ｯ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧呈､懆ｨｼ縲・ 
  * useAquariumSyncErrors (T512) hook is mocked to return Sentry aquarium-sync issues as {photoId, error, timestamp}.
  * 螟ｱ謨励う繝吶Φ繝茨ｼ・hotoId, error, timestamp・峨′繝・・繝悶Ν陦ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧呈､懆ｨｼ (FR-007)縲・ 
  * 縲後Μ繝医Λ繧､縲阪・繧ｿ繝ｳ謚ｼ荳九〒retryAquariumSyncAction (T511) 縺後さ繝ｼ繝ｫ縺輔ｌ繧九％縺ｨ繧呈､懆ｨｼ (US3)縲・ 
* [x] T505 \[P\] \[US3\] **Integration Test (Aquarium Sync Flow)**: apps/photo/test/integration/aquariumFlow.test.ts  
  * **Setup**: msw縺ｧ豌ｴ譌城､ｨAPI・・rt・峨ｒ繝｢繝・け縲よ怙蛻昴・500繧ｨ繝ｩ繝ｼ縲・蝗樒岼縺ｯ200 OK繧定ｿ斐☆繧医≧險ｭ螳壹・ 
  * **Flow**: 1. stub @sentry/nextjs captureException and call GenerationService.sendToAquarium (T507); 2. msw returns 500 and the call throws; 3. assert captureException receives the error with photoId context (FR-005); 4. call retryAquariumSyncAction (T511); 5. msw returns 200 OK; 6. assert the action resolves with a success payload and captureException is not invoked again.

### **Implementation for User Story 3 (Detailed)**

* [x] T506 \[US3\] **Infrastructure: AuthService & Server Actions**: src/application/authService.ts, src/app/actions/authActions.ts (TDD)  
  * authService.verifyAdminToken(token): token繧痴ha256縺ｧ繝上ャ繧ｷ繝･蛹悶＠縲｝rocess.env.ADMIN\_TOKEN\_HASH縺ｨ豈碑ｼ・(Design Doc)縲・ 
  * authService.createCustomToken(): firebase-admin縺ｮcreateCustomToken繧貞他縺ｳ蜃ｺ縺励∫ｮ｡逅・・ｨｩ髯撰ｼ井ｾ・ role: 'admin'・峨ｒ謖√▽Custom Claim繧剃ｻ倅ｸ・(Design Doc)縲・ 
  * loginWithAdminTokenAction(token) (Server Action): verifyAdminToken繧貞他縺ｳ蜃ｺ縺励∵・蜉溘☆繧後・createCustomToken繧貞他縺ｳ蜃ｺ縺励※繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓霑斐☆縲ょ､ｱ謨励☆繧後・繧ｨ繝ｩ繝ｼ繧偵せ繝ｭ繝ｼ縲・ 
* [x] T507 \[US3\] **Infrastructure: Middleware**: src/middleware.ts  
  * matcher: \['/admin/:path\*', '/photos/:path\*'\] 繧定ｨｭ螳壹・ 
  * request.cookies.get('adminToken') 縺ｧ繝医・繧ｯ繝ｳ繧貞叙蠕励・ 
  * authService.verifyAdminToken・・506・峨ｒ・医ワ繝・す繝･豈碑ｼ・・縺溘ａ・峨し繝ｼ繝舌・繧ｵ繧､繝峨〒逶ｴ謗･蜻ｼ縺ｳ蜃ｺ縺励※讀懆ｨｼ縲・ 
  * 讀懆ｨｼ螟ｱ謨玲凾縺ｯNextResponse.redirect(new URL('/login', request.url))繧定ｿ斐☆ (Design Doc)縲・ 
* [x] T508 \[US3\] **Presentation: Login Page**: src/app/login/page.tsx  
  * useState縺ｧ繝医・繧ｯ繝ｳ繧堤ｮ｡逅・☆繧気lient Component縲・ 
  * 繝輔か繝ｼ繝騾∽ｿ｡譎ゅ〕oginWithAdminTokenAction (T506) 繧貞他縺ｳ蜃ｺ縺吶・ 
  * 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ・・ustom Token・峨ｒ蜿励￠蜿悶▲縺溘ｉ縲：irebase Client SDK縺ｮsignInWithCustomToken(auth, customToken)繧貞ｮ溯｡後・ 
  * 謌仙粥蠕後，ookie縺ｫ逕溘・繝医・繧ｯ繝ｳ繧偵そ繝・ヨ・・iddleware讀懆ｨｼ逕ｨ・峨＠縲「seRouter().push('/admin')縺ｧ繝ｪ繝繧､繝ｬ繧ｯ繝・(Design Doc)縲・ 
* [x] T509 \[US3\] **Application: AquariumService**: src/application/aquariumService.ts (TDD)  
  * spec.md (FR-005) reflects that aquariumSyncEvents collection is not created; failures are sourced from Sentry issues instead.
  * getSyncErrors(): call the Sentry REST API filtered by the aquarium-sync tag and embedded photoId, returning normalized data for the UI.
  * mapSentryIssueToSyncError(issue): expose {eventId, photoId, errorMessage, timestamp, issueUrl} helpers for consumers.
* [x] T510 \[US3\] **Application: GenerationService (Enhancement)**: src/application/generationService.ts (TDD)  
  * sendToAquarium(generatedPhoto): fetch縺ｧ豌ｴ譌城､ｨAPI・・rt・峨↓POST縲・ 
  * completeGeneration (US1/T305) 繧剃ｿｮ豁｣: GeneratedPhoto菴懈・蠕後《endToAquarium繧貞他縺ｳ蜃ｺ縺吶・ 
  * try/catch wraps sendToAquarium, calls Sentry.captureException with the photoId context on failure, rethrows the error, and never persists Firestore logs (FR-005).
* [x] T511 \[US3\] **Application: AdminService & Server Actions**: src/application/adminService.ts, src/app/actions/adminActions.ts (TDD)  
  * retryAquariumSync(eventId, photoId): load generatedPhotos metadata, reuse GenerationService.sendToAquarium (T510), return {status, retriedAt} on success, and rethrow errors so Sentry records the failure.
  * retryAquariumSyncAction(eventId, photoId): server action wrapper (FR-007) that returns the retry result together with the Sentry issue URL for operators.
* [x] T512 \[P\] \[US3\] **Hooks (Admin Data)**: src/hooks/  
  * useBoothsWithLatestPhoto(): onSnapshot縺ｧbooths C繧定ｳｼ隱ｭ縲ょ推booth縺ｮlatestPhotoId繧剃ｽｿ縺・“eneratedPhotos C縺九ｉ逕ｻ蜒上ョ繝ｼ繧ｿ繧帝撼蜷梧悄縺ｫ蜿門ｾ励・邨仙粋縺励※霑斐☆繝輔ャ繧ｯ・・hotos Page逕ｨ・峨・ 
  * useAquariumSyncErrors(): use SWR to poll a server action for AquariumService.getSyncErrors (T509) and expose Sentry issue derived failures for the Admin page.
* [x] T513 \[US3\] **Presentation: Admin Page**: src/app/admin/page.tsx  
  * Client Component縲りｪ崎ｨｼ縺ｯmiddleware (T507) 縺梧球蠖薙・ 
  * Design Doc.md縺ｮ隕∽ｻｶ・・oothId蜈･蜉帙∝推繝壹・繧ｸ縺ｸ縺ｮ繝ｪ繝ｳ繧ｯ・峨ｒ螳溯｣・・ 
  * useAquariumSyncErrors (T512) renders the Sentry issue data inside a shadcn/ui Table and includes the issueUrl and tag details.
  * Each row includes a Retry button wired to retryAquariumSyncAction (T511); on success emit a toast and refresh the Sentry issue link state (FR-007).
* [x] T514 \[P\] \[US3\] **Presentation: Photos Page**: src/app/photos/page.tsx  
  * Client Component縲りｪ崎ｨｼ縺ｯmiddleware (T507) 縺梧球蠖薙・ 
  * useBoothsWithLatestPhoto (T512) 繧貞他縺ｳ蜃ｺ縺励∫ｵ先棡繧偵げ繝ｪ繝・ラ陦ｨ遉ｺ縲・ 
  * 蜷・判蜒上↓\<a\>繧ｿ繧ｰ・医ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨・繧ｿ繝ｳ・峨ｒ險ｭ鄂ｮ・医メ繧ｧ繧ｭ蜊ｰ蛻ｷ謫堺ｽ懃畑・・FR-009, Design Doc)縲・

**Checkpoint**: US3 flow (Admin Auth, Photos Page View, Error Monitoring, Retry) complete.
