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
  * uploadUserPhoto(boothId, file): Image Upload Page 用。storage().ref(photos/${ulid()}/photo.png).put(file) でStorageに保存。addDoc(collection(db, booths/${boothId}/uploadedPhotos), { imagePath: photos/${photoId}/photo.png, imageUrl, createdAt: serverTimestamp() }) でFirestoreにメタデータを追加。(Design Doc, FR-002準拠)  
  * uploadCapturedPhoto(boothId, file): Display Page (Webcam) 用。uploadUserPhoto と同じロジックで booths/${boothId}/uploadedPhotos に追加。(Design Doc, FR-002準拠)  
  * getUploadedPhotos(boothId): query(collection(db, booths/${boothId}/uploadedPhotos)) でFirestoreから取得。  
  * deleteUsedPhoto(photoId): uploadedPhotos ドキュメントと関連Storageファイル (imagePathから参照) を削除する (FR-006)。  
* \[ \] T307 \[P\] \[US1\] **Hooks (Data Fetching)**: src/hooks/  
  * useBoothState(boothId): firebase/firestoreのonSnapshotをラップし、booths/\[boothId\]ドキュメントをリアルタイムで購読・React Stateにセットするフック (useSWRやjotaiは使わず、useEffect内でonSnapshotをセットアップ)。  
  * useGenerationOptions(): options Cをフェッチするフック (クライアントから直接Firestoreを購読、またはServer Action経由)。  
  * useUploadedPhotos(boothId): booths/${boothId}/uploadedPhotos CをonSnapshotでリアルタイム購読するフック。  
* \[ \] T308 \[US1\] **Presentation: Display Page (Detailed)**: src/app/display/\[boothId\]/page.tsx  
  * **Hooks**: boothId を useParams で取得。useBoothState(boothId) (T307) でリアルタイムな Booth 状態（booth.state, booth.lastTakePhotoAt, booth.latestPhotoId）を取得。  
  * **Animation**: 状態遷移は framer-motion の AnimatePresence を使用し、各状態のコンテナ（motion.div）をフェードイン/フェードアウト（opacity: 0 から opacity: 1）で切り替える。  
  * **Webcam**: WebcamCapture コンポーネント (Internal) を作成。react-webcam をラップし、useRef で webcamRef を保持。  
  * **State Logic (switch/case on booth.state)**:  
    * **state='idle'**: (Design Doc)  
      * **UI**: 「タッチパネルをタップしてね」のメッセージを画面中央にフェードイン表示。  
    * **state='menu'**: (Design Doc)  
      * **UI**: idle からフェードアウト。「Control Page の操作ガイド」（例: 「隣のタブレットで操作してください」）と、Image Upload Page (/upload?boothId=\[boothId\]) への react-qr-code コンポーネントをフェードイン表示 (T303)。  
    * **state='capturing'**: (Design Doc)  
      * **UI**: menu からフェードアウトし、WebcamCapture コンポーネントの映像を全画面表示。画面オーバーレイでカウントダウン（例: 「5... 4... 3...」）を大きくフェードイン表示。  
      * **Logic (T308)**:  
        1. useEffect で \[booth.state, booth.lastTakePhotoAt\] を監視。  
        2. state \=== 'capturing' に変化した瞬間にカウントダウン（例: 5秒）を開始 (spec.md US1 AC1)。  
        3. カウントダウン終了時に webcamRef.current.getScreenshot() を呼び出し、base64画像を取得。  
        4. base64をBlobに変換し、uploadCapturedPhoto (Server Action T311) を呼び出す。  
        5. uploadCapturedPhoto 成功後、completeCapture (Server Action T311) を呼び出す。（これによりFirestoreの state が menu に戻る）。  
    * **state='generating'**: (Design Doc)  
      * **UI**: menu または capturing からフェードアウト。「AIが写真を生成中...」のメッセージとローディングアニメーション（例: shadcn/ui の Spinner）をフェードイン表示。  
    * **state='completed'**: (Design Doc, spec.md US1 AC2)  
      * **UI**: generating からフェードアウト。booth.latestPhotoId に基づき、GeneratedPhoto.imageUrl をソースとする \<img /\> タグで生成画像をフェードイン表示 (T303)。  
      * **Logic**: latestPhotoId が変更された場合、\<img\> の onLoad イベントを利用して画像プリロードを行い、ロード完了後にフェードインさせる。  
* \[ \] T309 \[US1\] **Presentation: Control Page (Detailed)**: src/app/control/\[boothId\]/page.tsx  
  * **Hooks**: boothId を useParams で取得。useBoothState (T307), useGenerationOptions (T307), useUploadedPhotos (T307) フックを使用。  
  * **Local State**: useState で selectedPhotoId: string | null と selectedOptions: object を管理 (T309)。  
  * **Animation**: 状態遷移は framer-motion の AnimatePresence を使用し、各状態のコンテナ（motion.div）をフェードイン/フェードアウト（opacity）で切り替える。  
  * **State Logic (switch/case on booth.state)**:  
    * **state='idle'**: (Design Doc)  
      * **UI**: 「フォトブースを始める」ボタンを画面中央にフェードイン表示。  
      * **Logic**: onClick で startSession (Server Action T311) を呼び出す。  
    * **state='menu'**: (Design Doc)  
      * **UI**: idle または capturing からフェードアウトし、操作UI（shadcn/ui の Tabs, Card, Button）をフェードイン表示。  
        1. **写真撮影**: 「撮影開始」ボタン。  
        2. **画像選択**: useUploadedPhotos の結果を shadcn/ui の Card グリッドで表示 (T309)。クリックで setSelectedPhotoId。選択された Card はハイライト（例: border-primary）。  
        3. **選択肢**: useGenerationOptions の結果を shadcn/ui の Tabs（Location, Outfit等）で表示 (T309)。選択で setSelectedOptions。  
        4. **生成実行**: 「生成開始」ボタン。  
      * **Logic**:  
        * 「撮影開始」ボタン: onClick で startCapture (Server Action T311) を呼び出す (T309)。  
        * 「生成開始」ボタン: disabled={\!selectedPhotoId || \!selectedOptions} (T309)。onClick で startGeneration (Server Action T311) を呼び出す。  
    * **state='capturing'**: (Design Doc)  
      * **UI**: menu からフェードアウト。「ディスプレイ（大画面）を見てください」という案内と、Display Page (T308) と同期したカウントダウン（例: 「5... 4... 3...」）をフェードイン表示。  
      * **Logic**: この状態は Display Page 側 (T308) の処理が完了し、state が menu に戻るまで維持される。  
    * **state='generating'**: (Design Doc, spec.md SC-001)  
      * **UI**: menu からフェードアウト。「AIが写真を生成中...」（平均60秒）のメッセージと、shadcn/ui の Progress バーまたはスピナーをフェードイン表示。(Design Docの「QRコードを表示」は completed の誤りと判断し、ここでは表示しない。Open Issues にて「QRはタブレットにしましょう」とあり、completed での表示が適切)  
    * **state='completed'**: (Design Doc, spec.md US1 AC2)  
      * **UI**: generating からフェードアウトし、以下の要素をフェードイン表示。  
        1. 「生成が完了しました！」メッセージ。  
        2. react-qr-code を使用し、booth.latestPhotoId に基づく Download Page (US2) へのQRコード (/download?boothId=\[boothId\]\&photoId=\[booth.latestPhotoId\]) を表示 (T309, Design Doc)。  
      * **Logic**: 一定時間経過（例: 3分）またはユーザー操作（例: QR読み取り完了後のボタン）で startSession (T311) を呼び出し menu に戻す（spec.md Edge Cases のタイムアウト考慮）。  
* \[ \] T310 \[US1\] **Presentation: Image Upload Page**: src/app/upload/\[boothId\]/page.tsx  
  * boothId を useParams で取得。  
  * ファイル入力とアップロードロジックを実装。uploadUserPhoto (Server Action T311) を呼び出す。useFormState (React 19\) や react-hook-form でローディングとエラー状態を管理。  
* \[ \] T311 \[US1\] **Infrastructure: Server Actions**: src/app/actions/  
  * apps/photo/src/app/actions/boothActions.ts: startSession, startCapture, completeCapture, startGeneration (T305) をラップするServer Actionsを作成。boothId や options のバリデーションに zod を使用。  
  * apps/photo/src/app/actions/photoActions.ts: uploadUserPhoto, uploadCapturedPhoto (T306) をラップするServer Actionsを作成。ファイルサイズやMIMEタイプのバリデーション (FR-002) を zod または手動で実装。

**Checkpoint**: US1 flow (Capture/Upload, Generate, View) complete.