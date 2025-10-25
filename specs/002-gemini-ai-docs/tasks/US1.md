# **Tasks: AI Photo Booth Experience (User Story 1 Detailed)**

Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: US1

## **Phase 3: User Story 1 ↁEVisitor Generates AI Portrait (Priority: P1) 🎯 MVP**

Goal: Anonymous visitor can use Control Page and Display Page, capture via Webcam OR upload via Image Upload Page, pick theme, and view result.  
Independent Test: Firebase Emulator \+ msw (Gemini API mock) scenario covering Booth state sync, Capture/Upload ↁEGenerate ↁEResult render.

### **Tests for User Story 1 (Detailed) ⚠EE**

* \[ \] T301 \[P\] \[US1\] **Integration Test (boothSessionFlow)**: apps/photo/test/integration/boothSessionFlow.test.ts  
  * **Setup**: msw (Gemini API mock) と Firebase Emulator (Auth, Firestore, Storage) を起動。匿名認証でサインイン。  
  * **Upload Flow**: 1\. Image Upload Page (/upload/\[boothId\]) からテスト画像をアップロードするServer Actionをコール。 2\. EmulatorのStorageにファイルが保存され、uploadedPhotos Cにドキュメントが追加されることをアサート。  
  * **Capture Flow**: 1\. Control Page から startCapture (Server Action) をコール。 2\. booths/\[boothId\] の state が capturing に、lastTakePhotoAt が更新されることをアサート。 3\. Display Page 側のロジック（uploadCapturedPhoto Action）をコール。 4\. uploadedPhotos Cに撮影画像が追加され、booths/\[boothId\] の state が menu に戻ることをアサート。  
  * **Generation Flow**: 1\. Control Page から startGeneration (Server Action) を（uploadedPhotoIdとoptionsを引数に）コール。 2\. booths/\[boothId\] の state が generating になることをアサート。 3\. mswがGemini APIコールをインターセプト。 4\. GenerationServiceが（コールバック/Webhook経由で）completeGenerationをコール。 5\. generatedPhotos Cにドキュメントが作成され、booths/\[boothId\] の state が completed に、latestPhotoId がセットされることをアサート。  
  * **Cleanup**: 6\. startGenerationで使用された uploadedPhotos のドキュメントとStorageファイルが削除されていることをアサート (FR-006)。  
* \[ \] T302 \[P\] \[US1\] **RTL Spec (Control Page)**: apps/photo/test/unit/app/control/\[boothId\]/page.test.tsx  
  * useBoothState (T307) フックをモックし、指定したBooth状態（idle, menu, capturing, generating, completed）を返すよう設定。  
  * useUploadedPhotos (T307) と useGenerationOptions (T307) も同様にモックデータを返す。  
  * state='idle': 「フォトブースを始める」ボタン表示。クリックでstartSession (Server Action) がコールされることを検証。  
  * state='menu': 「撮影開始」ボタン、useUploadedPhotosの画像一覧、useGenerationOptionsのオプション一覧が表示される。  
  * state='capturing': 「撮影中...」のカウントダウンUIが表示される (Design Doc)。  
  * state='generating': 「AIが写真を生成中...」メッセージ表示。  
  * state='completed': latestPhotoId に基づくDownload Page (US2) へのQRコードが表示される (Design Doc)。  
* \[ \] T303 \[P\] \[US1\] **RTL Spec (Display Page)**: apps/photo/test/unit/app/display/\[boothId\]/page.test.tsx  
  * useBoothState (T307) フックをモックし、状態を注入。  
  * state='idle': 「タッチパネルをタップしてね」メッセージ表示。  
  * state='menu': Image Upload Page (/upload/\[boothId\]) へのQRコードコンポーネントが表示される (Design Doc)。  
  * state='capturing': Webカメラコンポーネント（react-webcamをモックしたもの）が表示される (Design Doc)。  
  * state='generating': 「AIが写真を生成中...」メッセージ表示。  
  * state='completed': Booth.latestPhotoId のIDを持つ生成画像 (\<img\>) が表示される。  
* \[ \] T304 \[P\] \[US1\] **RTL Spec (Image Upload Page)**: apps/photo/test/unit/app/upload/\[boothId\]/page.test.tsx  
  * Fileオブジェクトをモックし、ファイル入力（input\[type=file\]）にセット。  
  * 許可されないMIMEタイプやサイズ（FR-002: 20MB超）の場合にエラーメッセージが表示されることを検証。  
  * 「アップロード」ボタン押下で uploadUserPhoto (Server Action) がコールされることを検証。  
  * Server Actionが成功/失敗レスポンスを返した際のUI（成功メッセージ、エラーToast）を検証 (Design Doc)。

### **Implementation for User Story 1 (Detailed)**

* \[ \] T305 \[US1\] **Application: BoothService**: src/application/boothService.ts (TDD)  
  * updateBoothState(boothId, data): Firestoreの booths/\[boothId\] を updateDoc する内部関数。  
  * startSession(boothId): updateBoothState(boothId, { state: 'menu' }) をコール。  
  * startCapture(boothId): updateBoothState(boothId, { state: 'capturing', lastTakePhotoAt: serverTimestamp() }) をコール (Design Docのトリガー)。  
  * completeCapture(boothId): updateBoothState(boothId, { state: 'menu' }) をコール (data-model.md: 撮影完了・プレビュー)。  
  * startGeneration(boothId, uploadedPhotoId, options): 1\. updateBoothState(boothId, { state: 'generating' }) をコール。 2\. *非同期で* GenerationService.generateImage(boothId, uploadedPhotoId, options) を呼び出す (クライアントは待たない)。  
  * completeGeneration(boothId, generatedPhotoId, usedUploadedPhotoId): 1\. updateBoothState(boothId, { state: 'completed', latestPhotoId: generatedPhotoId }) をコール。 2\. *非同期で* PhotoService.deleteUsedPhoto(usedUploadedPhotoId) をコール (FR-006)。  
* \[ \] T306 \[US1\] **Application: PhotoService**: src/application/photoService.ts (TDD)  
  * uploadUserPhoto(boothId, file): Image Upload Page 用。storage().ref(photos/${boothId}/${ulid()}).put(file) でStorageに保存。addDoc(collection(db, 'uploadedPhotos'), { boothId, imagePath, imageUrl, createdAt: serverTimestamp() }) でFirestoreにメタデータを追加。  
  * uploadCapturedPhoto(boothId, file): Display Page (Webcam) 用。uploadUserPhoto と同じロジックで uploadedPhotos に追加。  
  * getUploadedPhotos(boothId): query(collection(db, 'uploadedPhotos'), where('boothId', '==', boothId)) でFirestoreから取得。  
  * deleteUsedPhoto(photoId): uploadedPhotos ドキュメントと関連Storageファイル (imagePathから参照) を削除する (FR-006)。  
* \[ \] T307 \[P\] \[US1\] **Hooks (Data Fetching)**: src/hooks/  
  * useBoothState(boothId): firebase/firestoreのonSnapshotをラップし、booths/\[boothId\]ドキュメントをリアルタイムで購読・React Stateにセットするフック (useSWRやjotaiは使わず、useEffect内でonSnapshotをセットアップ)。  
  * useGenerationOptions(): options Cをフェッチするフック (Phase 2 (T208) GenerationService をクライアントから呼び出す)。  
  * useUploadedPhotos(boothId): uploadedPhotos Cを where('boothId', '==', boothId) でクエリし、onSnapshotでリアルタイム購読するフック。  
* \[ \] T308 \[US1\] **Presentation: Display Page**: src/app/display/\[boothId\]/page.tsx  
  * boothId を useParams で取得。useBoothState(boothId) でリアルタイムな Booth 状態を取得。  
  * WebcamCapture コンポーネント (Internal): react-webcam をラップ。useRef で webcamRef を保持。onCapture (撮影実行) propを受け取る。  
  * DisplayPage (Main): useBoothState の state に応じてUIを切り替え (switch/case)。  
  * state='capturing'のロジック:  
    * WebcamCapture コンポーネントを表示。  
    * useEffect で \[booth.state, booth.lastTakePhotoAt\] を監視。  
    * state \=== 'capturing' に変化した瞬間に webcamRef.current.getScreenshot() を呼び出し、base64画像を取得。  
    * base64をBlobに変換し、uploadCapturedPhoto (Server Action T311) に渡す。  
    * 成功後、completeCapture (Server Action T311) を呼び出す。  
* \[ \] T309 \[US1\] **Presentation: Control Page**: src/app/control/\[boothId\]/page.tsx  
  * boothId を useParams で取得。useBoothState, useGenerationOptions, useUploadedPhotos フックを使用。  
  * useState で selectedPhotoId: string | null と selectedOptions: object を管理。  
  * state='menu'の時:  
    * useUploadedPhotos の結果を shadcn/ui の Card グリッドで表示。クリックで setSelectedPhotoId。  
    * useGenerationOptions の結果を shadcn/ui の Tabs（Location, Outfit等）で表示。選択で setSelectedOptions。  
* 「撮影開始」ボタン: onClick で startCapture (Server Action T311) を呼び出す。  
* 「生成開始」ボタン: disabled={\!selectedPhotoId || \!selectedOptions}。onClick で startGeneration (Server Action T311) を呼び出す。  
  * state='completed'の時: react-qr-code を使い /download/\[boothId\]/\[booth.latestPhotoId\] へのQRを表示 (Design Doc)。  
* \[ \] T310 \[US1\] **Presentation: Image Upload Page**: src/app/upload/\[boothId\]/page.tsx  
  * boothId を useParams で取得。  
  * ファイル入力とアップロードロジックを実装。uploadUserPhoto (Server Action T311) を呼び出す。useFormState (React 19\) や react-hook-form でローディングとエラー状態を管理。  
* \[ \] T311 \[US1\] **Infrastructure: Server Actions**: src/app/actions/  
  * apps/photo/src/app/actions/boothActions.ts: startSession, startCapture, completeCapture, startGeneration (T305) をラップするServer Actionsを作成。boothId や options のバリデーションに zod を使用。  
  * apps/photo/src/app/actions/photoActions.ts: uploadUserPhoto, uploadCapturedPhoto (T306) をラップするServer Actionsを作成。ファイルサイズやMIMEタイプのバリデーション (FR-002) を zod または手動で実装。

**Checkpoint**: US1 flow (Capture/Upload, Generate, View) complete.