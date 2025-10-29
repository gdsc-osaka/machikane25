# **Tasks: AI Photo Booth Experience (User Story 2 Detailed)**

Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: US2

## **Phase 4: User Story 2 ↁEVisitor Retrieves Image Later (Priority: P2)**

Goal: US1で発行されたQR/URL (/download/\[boothId\]/\[photoId\]) にアクセスし、24時間以内であれば画像をダウンロードできる。  
Independent Test: Firebase Emulatorを使用し、24時間経過の有無でDownload Pageのアクセス制御（成功/失効）が機能することを確認する。

### **Tests for User Story 2 (Detailed) ⚠EE**

* \[ \] T401 \[P\] \[US2\] **Integration Test (DownloadFlow)**: apps/photo/test/integration/downloadFlow.test.ts  
  * **Setup**: EmulatorのFirestore (generatedPhotos) に2つのドキュメントを準備。  
    * photo\_valid: createdAt が1時間前。  
    * photo\_expired: createdAt が25時間前。  
  * **Valid Case**: getGeneratedPhotoAction (T404) を photo\_valid のIDでコール。成功し、画像URLを含むデータが返ることをアサート。  
  * **Expired Case**: getGeneratedPhotoAction (T404) を photo\_expired のIDでコール。PhotoExpiredErrorに対応するエラーオブジェクトが返ることをアサート (FR-004)。  
  * **NotFound Case**: getGeneratedPhotoAction (T404) を存在しないIDでコール。PhotoNotFoundErrorに対応するエラーオブジェクトが返ることをアサート。  
* \[ \] T402 \[P\] \[US2\] **RTL Spec (Download Page)**: apps/photo/test/unit/app/download.test.tsx  
  * getGeneratedPhotoAction (T404) が成功データ（画像URL）を返すようモック。\<img\>タグと\<a\>タグ（ダウンロードボタン）が表示されることを検証 (Design Doc)。  
  * getGeneratedPhotoAction (T404) がPhotoExpiredErrorを返すようモック。「有効期限が切れました」というメッセージが表示されることを検証 (spec.md: Edge Cases)。  
  * getGeneratedPhotoAction (T404) がPhotoNotFoundErrorを返すようモック。「写真が見つかりません」というメッセージ（またはnotFound()による404ページ）が表示されることを検証。

### **Implementation for User Story 2 (Detailed)**

* \[ \] T403 \[US2\] **Application: GenerationService (Enhancement)**: src/application/generationService.ts (TDD)  
  * getGeneratedPhoto(photoId):  
    * getDoc(doc(db, 'generatedPhotos', photoId)) でFirestoreドキュメントを取得。  
    * ドキュメントが存在しない場合、PhotoNotFoundErrorをスロー。  
    * docData.createdAt (Timestamp) を取得。  
    * 現在時刻（サーバー時刻）と比較し、Date.now() \- docData.createdAt.toMillis() \> 24 \* 60 \* 60 \* 1000 の場合、PhotoExpiredErrorをスロー (FR-004: 24時間有効)。  
    * 有効期限内の場合、docData（imageUrlを含む）を返す。  
* \[ \] T404 \[US2\] **Infrastructure: Server Actions**: src/app/actions/generationActions.ts  
  * getGeneratedPhotoAction(photoId):  
    * T403のgetGeneratedPhoto(photoId)を呼び出すServer Action。  
    * try/catchブロックを使用し、PhotoExpiredErrorやPhotoNotFoundErrorを捕捉。  
    * クライアント（T405）がハンドリングできるよう、{ data: null, error: 'EXPIRED' } や { data: null, error: 'NOT\_FOUND' } といったシリアライズ可能なオブジェクトを返す。  
    * 成功時は { data: photoData, error: null } を返す。  
* \[ \] T405 \[US2\] **Presentation: Download Page**: src/app/download/\[boothId\]/\[photoId\]/page.tsx  
  * Next.jsのServer Componentとして実装 (plan.mdのApp Router構造)。  
  * params から photoId を取得。  
  * await getGeneratedPhotoAction(params.photoId) を呼び出し、結果（dataまたはerror）を取得。  
  * if (result.error \=== 'EXPIRED'): 「有効期限が切れました」というUIをレンダリング (spec.md)。  
  * if (result.error \=== 'NOT\_FOUND'): Next.jsのnotFound()関数を呼び出し、404ページを表示 (plan.md: 404)。  
  * if (result.data):  
    * 生成画像を表示: \<img src={result.data.imageUrl} alt="Generated Photo" /\>  
    * ダウンロードボタンを表示: \<a href={result.data.imageUrl} download="ai\_photo.png"\>ダウンロード\</a\> (Design Doc)。

**Checkpoint**: US2 flow (QR Access, 24h Expiry Check, Download) complete.