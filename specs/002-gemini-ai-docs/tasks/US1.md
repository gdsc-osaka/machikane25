# **Tasks: AI Photo Booth Experience (User Story 1 Detailed)**

Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: US1

## **Phase 3: User Story 1 ↁEVisitor Generates AI Portrait (Priority: P1) 🎯 MVP**

Goal: Token-authenticated Staff operates the Control Page and Display Page. Anonymous visitors capture photos via Webcam (triggered by Control Page, shown on Display Page) OR upload via Image Upload Page (accessed via QR on Display Page), select themes (on Control Page), and view the result (on Display Page).  
Independent Test: Firebase Emulator \+ msw (Gemini API mock) scenario covering Booth state sync, Capture/Upload ↁEGenerate ↁEResult render.

### **Tests for User Story 1 (Detailed) ⚠EE**

* \[ \] T301 \[P\] \[US1\] **Integration Test (boothSessionFlow)**: apps/photo/test/integration/boothSessionFlow.test.ts  
  * **Setup**: msw (Gemini API mock) と Firebase Emulator (Auth, Firestore, Storage) を起動、E*Test 1 (Upload Flow) では匿名認証でサインイン。Test 2-3 (Capture/Generation Flow) では管琁E��E��証�E�トークン認証�E�でサインインする (spec.md FR-011, FR-012)、E* \* **Upload Flow**: 1\. Image Upload Page (/upload/\[boothId\]) からチE��ト画像をアチE�EロードするServer Actionをコール、E2\. EmulatorのStorageにファイルが保存され、uploadedPhotos Cにドキュメントが追加されることをアサート、E 
  * **Capture Flow**: 1\. **(管琁E��E��証で)** Control Page から startCapture (Server Action) をコール、E2\. booths/\[boothId\] の state ぁEcapturing に、lastTakePhotoAt が更新されることをアサート、E3\. Display Page 側のロジチE���E�EploadCapturedPhoto Action�E�をコール、E4\. uploadedPhotos Cに撮影画像が追加され、booths/\[boothId\] の state ぁEmenu に戻ることをアサート、E 
  * **Generation Flow**: 1\. **(管琁E��E��証で)** Control Page から startGeneration (Server Action) を！EploadedPhotoIdとoptionsを引数に�E�コール、E2\. booths/\[boothId\] の state ぁEgenerating になることをアサート、E3\. mswがGemini APIコールをインターセプト、E4\. GenerationServiceが（コールバック/Webhook経由で�E�completeGenerationをコール、E5\. generatedPhotos Cにドキュメントが作�Eされ、booths/\[boothId\] の state ぁEcompleted に、latestPhotoId がセチE��されることをアサート、E 
  * **Cleanup**: 6\. startGenerationで使用されぁEuploadedPhotos のドキュメントとStorageファイルが削除されてぁE��ことをアサーチE(FR-006)、E 
* \[ \] T302 \[P\] \[US1\] **RTL Spec (Control Page)**: apps/photo/test/unit/app/control/\[boothId\]/page.test.tsx  
  * **前提**: **管琁E��E��証�E�トークン認証�E�済みでペ�Eジにアクセスする (spec.md FR-011, FR-012)、E*  
  * useBoothState (T307) フックをモチE��し、指定したBooth状態！Edle, menu, capturing, generating, completed�E�を返すよう設定、E 
  * useUploadedPhotos (T307) と useGenerationOptions (T307) も同様にモチE��チE�Eタを返す、E 
  * state='idle': 「フォトブースを始める」�Eタン表示。クリチE��でstartSession (Server Action) がコールされることを検証、E 
  * state='menu': 「撮影開始」�Eタン、useUploadedPhotosの画像一覧、useGenerationOptionsのオプション一覧が表示される、E 
  * state='capturing': 「撮影中...」�EカウントダウンUIが表示されめE(Design Doc)、E 
  * state='generating': 「AIが�E真を生�E中...」メチE��ージ表示、E 
  * state='completed': latestPhotoId に基づくDownload Page (US2) へのQRコードが表示されめE(Design Doc)、E 
* \[ \] T303 \[P\] \[US1\] **RTL Spec (Display Page)**: apps/photo/test/unit/app/display/\[boothId\]/page.test.tsx  
  * **前提**: **管琁E��E��証�E�トークン認証�E�済みでペ�Eジにアクセスする (spec.md FR-011, FR-012)、E*  
  * useBoothState (T307) フックをモチE��し、状態を注入、E 
  * state='idle': 「タチE��パネルをタチE�Eしてね」メチE��ージ表示、E 
  * state='menu': Image Upload Page (/upload/\[boothId\]) へのQRコードコンポ�Eネントが表示されめE(Design Doc)、E 
  * state='capturing': Webカメラコンポ�Eネント！Eeact-webcamをモチE��したも�E�E�が表示されめE(Design Doc)、E 
  * state='generating': 「AIが�E真を生�E中...」メチE��ージ表示、E 
  * state='completed': Booth.latestPhotoId のIDを持つ生�E画僁E(\<img\>) が表示される、E 
* \[ \] T304 \[P\] \[US1\] **RTL Spec (Image Upload Page)**: apps/photo/test/unit/app/upload/\[boothId\]/page.test.tsx  
  * **前提**: **匿名認証�E�EignInAnonymously�E�済みでペ�Eジにアクセスする (spec.md FR-001, Security 3)、E*  
  * FileオブジェクトをモチE��し、ファイル入力！Enput\[type=file\]�E�にセチE��、E 
  * 許可されないMIMEタイプやサイズ�E�ER-002: 20MB趁E���E場合にエラーメチE��ージが表示されることを検証、E 
  * 「アチE�Eロード」�Eタン押下で uploadUserPhoto (Server Action) がコールされることを検証、E 
  * Server Actionが�E劁E失敗レスポンスを返した際のUI�E��E功メチE��ージ、エラーToast�E�を検証 (Design Doc)、E
### **Implementation for User Story 1 (Detailed)**

* \[x] T305 \[US1\] **Application: BoothService**: src/application/boothService.ts (TDD)  
  * updateBoothState(boothId, data): Firestoreの booths/\[boothId\] めEupdateDoc する冁E��関数、E 
  * startSession(boothId): updateBoothState(boothId, { state: 'menu' }) をコール、E 
  * startCapture(boothId): updateBoothState(boothId, { state: 'capturing', lastTakePhotoAt: serverTimestamp() }) をコール (Design Docのトリガー)、E 
  * completeCapture(boothId): updateBoothState(boothId, { state: 'menu' }) をコール (data-model.md: 撮影完亁E�Eプレビュー)、E 
  * startGeneration(boothId, uploadedPhotoId, options): 1\. updateBoothState(boothId, { state: 'generating' }) をコール、E2\. *非同期で* GenerationService.generateImage(boothId, uploadedPhotoId, options) を呼び出ぁE(クライアント�E征E��なぁE、E 
  * completeGeneration(boothId, generatedPhotoId, usedUploadedPhotoId): 1\. updateBoothState(boothId, { state: 'completed', latestPhotoId: generatedPhotoId }) をコール、E2\. *非同期で* PhotoService.deleteUsedPhoto(usedUploadedPhotoId) をコール (FR-006)、E 
* \[x] T306 \[US1\] **Application: PhotoService**: src/application/photoService.ts (TDD)  
  * uploadUserPhoto(boothId, file): Image Upload Page 用。storage().ref(photos/${ulid()}/photo.png).put(file) でStorageに保存。addDoc(collection(db, booths/${boothId}/uploadedPhotos), { imagePath: photos/${photoId}/photo.png, imageUrl, createdAt: serverTimestamp() }) でFirestoreにメタチE�Eタを追加、EDesign Doc, FR-002準拠)  
  * uploadCapturedPhoto(boothId, file): Display Page (Webcam) 用。uploadUserPhoto と同じロジチE��で booths/${boothId}/uploadedPhotos に追加、EDesign Doc, FR-002準拠)  
  * getUploadedPhotos(boothId): query(collection(db, booths/${boothId}/uploadedPhotos)) でFirestoreから取得、E 
  * deleteUsedPhoto(photoId): uploadedPhotos ドキュメントと関連Storageファイル (imagePathから参�E) を削除する (FR-006)、E 
* \[x] T307 \[P\] \[US1\] **Hooks (Data Fetching)**: src/hooks/  
  * useBoothState(boothId): firebase/firestoreのonSnapshotをラチE�Eし、booths/\[boothId\]ドキュメントをリアルタイムで購読・React StateにセチE��するフック (useSWRめEotaiは使わず、useEffect冁E��onSnapshotをセチE��アチE�E)、E 
  * useGenerationOptions(): options CをフェチE��するフック (クライアントから直接Firestoreを購読、また�EServer Action経S)、E 
  * useUploadedPhotos(boothId): booths/${boothId}/uploadedPhotos CをonSnapshotでリアルタイム購読するフック、E 
* \[x] T308 \[US1\] **Presentation: Display Page (Detailed)**: src/app/display/\[boothId\]/page.tsx  
  * **Hooks**: boothId めEuseParams で取得。useBoothState(boothId) (T307) でリアルタイムな Booth 状態！Eooth.state, booth.lastTakePhotoAt, booth.latestPhotoId�E�を取得、E 
  * **Auth**: **こ�Eペ�Eジは管琁E��E��証�E�トークン認証�E�が忁E��E(spec.md FR-011)、E*  
  * **Animation**: 状態�E移は framer-motion の AnimatePresence を使用し、各状態�EコンチE���E�Eotion.div�E�をフェードイン/フェードアウト！Epacity: 0 から opacity: 1�E�で刁E��替える、E 
  * **Webcam**: WebcamCapture コンポ�EネンチE(Internal) を作�E。react-webcam をラチE�Eし、useRef で webcamRef を保持、E 
  * **State Logic (switch/case on booth.state)**:  
    * **state='idle'**: (Design Doc)  
      * **UI**: 「タチE��パネルをタチE�Eしてね」�EメチE��ージを画面中央にフェードイン表示、E 
    * **state='menu'**: (Design Doc)  
      * **UI**: idle からフェードアウト。「Control Page の操作ガイド」（侁E 「隣のタブレチE��で操作してください」）と、Image Upload Page (/upload?boothId=\[boothId\]) への react-qr-code コンポ�Eネントをフェードイン表示 (T303)、E 
    * **state='capturing'**: (Design Doc)  
      * **UI**: menu からフェードアウトし、WebcamCapture コンポ�Eネント�E映像を全画面表示。画面オーバ�Eレイでカウントダウン�E�侁E 、E... 4... 3...」）を大きくフェードイン表示、E 
      * **Logic (T308)**:  
        1. useEffect で \[booth.state, booth.lastTakePhotoAt\] を監視、E 
        2. state \=== 'capturing' に変化した瞬間にカウントダウン�E�侁E 5秒）を開姁E(spec.md US1 AC1)、E 
        3. カウントダウン終亁E��に webcamRef.current.getScreenshot() を呼び出し、base64画像を取得、E 
        4. base64をBlobに変換し、uploadCapturedPhoto (Server Action T311) を呼び出す、E 
        5. uploadCapturedPhoto 成功後、completeCapture (Server Action T311) を呼び出す。（これによりFirestoreの state ぁEmenu に戻る）、E 
    * **state='generating'**: (Design Doc)  
      * **UI**: menu また�E capturing からフェードアウト。「AIが�E真を生�E中...」�EメチE��ージとローチE��ングアニメーション�E�侁E shadcn/ui の Spinner�E�をフェードイン表示、E 
    * **state='completed'**: (Design Doc, spec.md US1 AC2)  
      * **UI**: generating からフェードアウト。booth.latestPhotoId に基づき、GeneratedPhoto.imageUrl をソースとする \<img /\> タグで生�E画像をフェードイン表示 (T303)、E 
      * **Logic**: latestPhotoId が変更された場合、\<img\> の onLoad イベントを利用して画像�Eリロードを行い、ロード完亁E��にフェードインさせる、E 
* \[x] T309 \[US1\] **Presentation: Control Page (Detailed)**: src/app/control/\[boothId\]/page.tsx  
  * **Hooks**: boothId めEuseParams で取得。useBoothState (T307), useGenerationOptions (T307), useUploadedPhotos (T307) フックを使用、E 
  * **Auth**: **こ�Eペ�Eジは管琁E��E��証�E�トークン認証�E�が忁E��E(spec.md FR-011)、E*  
  * **Local State**: useState で selectedPhotoId: string | null と selectedOptions: object を管琁E(T309)、E 
  * **Animation**: 状態�E移は framer-motion の AnimatePresence を使用し、各状態�EコンチE���E�Eotion.div�E�をフェードイン/フェードアウト！Epacity�E�で刁E��替える、E 
  * **State Logic (switch/case on booth.state)**:  
    * **state='idle'**: (Design Doc)  
      * **UI**: 「フォトブースを始める」�Eタンを画面中央にフェードイン表示、E 
      * **Logic**: onClick で startSession (Server Action T311) を呼び出す、E 
    * **state='menu'**: (Design Doc)  
      * **UI**: idle また�E capturing からフェードアウトし、操作UI�E�Ehadcn/ui の Tabs, Card, Button�E�をフェードイン表示、E 
        1. **写真撮影**: 「撮影開始」�Eタン、E 
        2. **画像選抁E*: useUploadedPhotos の結果めEshadcn/ui の Card グリチE��で表示 (T309)。クリチE��で setSelectedPhotoId。選択された Card はハイライト（侁E border-primary�E�、E 
        3. **選択肢**: useGenerationOptions の結果めEshadcn/ui の Tabs�E�Eocation, Outfit等）で表示 (T309)。選択で setSelectedOptions、E 
        4. **生�E実衁E*: 「生成開始」�Eタン、E 
      * **Logic**:  
        * 「撮影開始」�Eタン: onClick で startCapture (Server Action T311) を呼び出ぁE(T309)、E 
        * 「生成開始」�Eタン: disabled={\!selectedPhotoId || \!selectedOptions} (T309)。onClick で startGeneration (Server Action T311) を呼び出す、E 
    * **state='capturing'**: (Design Doc)  
      * **UI**: menu からフェードアウト。「ディスプレイ�E�大画面�E�を見てください」とぁE��案�Eと、Display Page (T308) と同期したカウントダウン�E�侁E 、E... 4... 3...」）をフェードイン表示、E 
      * **Logic**: こ�E状態�E Display Page 側 (T308) の処琁E��完亁E��、state ぁEmenu に戻るまで維持される、E 
    * **state='generating'**: (Design Doc, spec.md SC-001)  
      * **UI**: menu からフェードアウト。「AIが�E真を生�E中...」（平坁E0秒）�EメチE��ージと、shadcn/ui の Progress バ�Eまた�Eスピナーをフェードイン表示、EDesign Docの「QRコードを表示」�E completed の誤りと判断し、ここでは表示しなぁE��Open Issues にて「QRはタブレチE��にしましょぁE��とあり、completed での表示が適刁E  
    * **state='completed'**: (Design Doc, spec.md US1 AC2)  
      * **UI**: generating からフェードアウトし、以下�E要素をフェードイン表示、E 
        1. 「生成が完亁E��ました�E�」メチE��ージ、E 
        2. react-qr-code を使用し、booth.latestPhotoId に基づぁEDownload Page (US2) へのQRコーチE(/download?boothId=\[boothId\]\&photoId=\[booth.latestPhotoId\]) を表示 (T309, Design Doc)、E 
      * **Logic**: 一定時間経過�E�侁E 3刁E��また�Eユーザー操作（侁E QR読み取り完亁E���Eボタン�E�で startSession (T311) を呼び出ぁEmenu に戻す！Epec.md Edge Cases のタイムアウト老E�E�E�、E 
* \[x] T310 \[US1\] **Presentation: Image Upload Page**: src/app/upload/\[boothId\]/page.tsx  
  * **Auth**: **こ�Eペ�Eジは匿名認証�E�EignInAnonymously�E�が忁E��E(spec.md FR-001)、E*  
  * boothId めEuseParams で取得、E 
  * ファイル入力とアチE�EロードロジチE��を実裁E��uploadUserPhoto (Server Action T311) を呼び出す。useFormState (React 19\) めEreact-hook-form でローチE��ングとエラー状態を管琁E��E 
* \[x] T311 \[US1\] **Infrastructure: Server Actions**: src/app/actions/  
  * apps/photo/src/app/actions/boothActions.ts: startSession, startCapture, completeCapture, startGeneration (T305) をラチE�EするServer Actionsを作�E。boothId めEoptions のバリチE�Eションに zod を使用、E*これら�E管琁E��E��証�E�ER-011のMiddleware�E�で保護される、E* \* apps/photo/src/app/actions/photoActions.ts: uploadUserPhoto, uploadCapturedPhoto (T306) をラチE�EするServer Actionsを作�E。ファイルサイズやMIMEタイプ�EバリチE�Eション (FR-002) めEzod また�E手動で実裁E��E*uploadUserPhoto は匿名認証ユーザーに許可される忁E��がある (Security 3)。uploadCapturedPhoto は管琁E��E��証で保護されめE(T308から呼び出されるためE、E*

**Checkpoint**: US1 flow (Capture/Upload, Generate, View) complete.

