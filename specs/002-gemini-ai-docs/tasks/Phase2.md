# **Tasks: AI Photo Booth Experience (Phase 2 Foundational Detailed)**

Input: Design docs from /specs/002-gemini-ai-docs/  
Prerequisites: plan.md, spec.md, data-model.md, Design Doc.md  
**Organization**: Tasks follow TDD and DDD layering.

## **Format: \[ID\] \[P?\] \[Story\] Description**

* **\[P\]**: Can progress in parallel  
* **\[Story\]**: FOUND (Foundational)

## **Phase 2: Foundational (Blocking Prerequisites)**

**Goal**: ユーザーストーリー（US1-US3）の実装に必要な、Firebase接続、匿名認証、セキュリティルール、およびDDDレイヤーの基盤を構築する。

### **Tests for Foundational (Detailed) ⚠EE**

* \[x\] T201 \[P\] \[FOUND\] **Integration Test (Firebase Client Init)**: apps/photo/test/integration/firebaseClient.test.ts  
  * Firebase Emulator Suite（Auth, Firestore, Storage）が動作していることを前提とする。  
  * initializeFirebaseClient() (T205) を呼び出す。  
  * getAuth() がEmulator（http://localhost:9099）を向いていることをアサート。  
  * getFirestore() がEmulator（http://localhost:8080）を向いていることをアサート。  
  * getStorage() がEmulator（http://localhost:9199）を向いていることをアサート。  
* \[x\] T202 \[P\] \[FOUND\] **Integration Test (Anonymous Auth)**: apps/photo/test/integration/authClient.test.ts  
  * ensureAnonymousSignIn() (T205) を呼び出す。  
  * onAuthStateChangedが発火し、user.isAnonymousがtrueのユーザーオブジェクトが取得できることをwaitForで検証 (FR-001)。  
  * 2回呼び出しても、サインインは1回しか実行されないこと（既存ユーザーが返る）を検証。  
* \[x\] T203 \[P\] \[FOUND\] **Integration Test (Security Rules)**: apps/photo/test/integration/firestoreRules.test.ts  
  * Firebase Test SDK（@firebase/rules-unit-testing）を使用。  
  * **Setup**: EmulatorのFirestoreをクリアし、options Cにマスターデータを投入。  
  * **options C**: 匿名ユーザー（auth \= { uid: 'anon-user' }）でoptions Cのget()が成功することをアサート。  
  * **booths C**: 匿名ユーザーでbooths Cのget()が成功。update()（state変更など）も成功することをアサート。  
  * **uploadedPhotos C**: 匿名ユーザーでuploadedPhotos Cへのadd()が成功。  
  * **generatedPhotos C**: 匿名ユーザー（未認証でも可）でgeneratedPhotos Cのget()が成功。  
  * **Admin (US3)**: 管理者ユーザー（auth \= { uid: 'admin-user', token: { role: 'admin' } }）で全コレクションへのread/writeが成功することをアサート (Design Doc)。  
* \[x\] T204 \[P\] \[FOUND\] **Unit Test (Generation Options)**: apps/photo/test/unit/application/generationService.test.ts  
  * GenerationServiceのテスト。Firestoreリポジトリをモック。  
  * generationService.getOptions() (T207) を呼び出す。  
  * モックが返したGenerationOptionの配列が、typeId（location, outfit...）ごとにグループ化されたオブジェクトとして返ることをアサート。  
* \[x\] ~~T205 \[P\] \[FOUND\] **Integration Test (Photo Cleaner)**: apps/photo/test/integration/photoCleaner.test.ts~~ **[EXCLUDED from apps/photo - PhotoCleaner is separate app (apps/photo-cleaner). See exclusions.md]**

### **Implementation for Foundational (Detailed)**

* \[x\] T206 \[FOUND\] **Infrastructure: Firebase Client Setup**: apps/photo/src/lib/firebase/client.ts  
  * firebase/app, firebase/auth, firebase/firestore, firebase/storageをインポート。  
  * firebaseConfigを環境変数（NEXT\_PUBLIC\_FIREBASE\_CONFIG）から読み込む。  
  * initializeFirebaseClient(): getApps().length \=== 0の場合のみinitializeAppを実行。connectAuthEmulator等をprocess.env.NODE\_ENV \=== 'development'の場合に呼び出す。  
  * ensureAnonymousSignIn(): getAuth()を使い、onAuthStateChangedでuserがいない場合のみsignInAnonymously()を呼び出すPromiseベースのラッパー (FR-001)。  
* \[x\] T207 \[FOUND\] **Infrastructure: Firebase Admin Setup**: apps/photo/src/lib/firebase/admin.ts  
  * firebase-adminをインポート。  
  * serviceAccountを環境変数（FIREBASE\_SERVICE\_ACCOUNT\_JSON）から読み込み、admin.initializeAppを実行（シングルトン化）。  
  * admin.auth(), admin.firestore(), admin.storage()をエクスポート。  
* \[x\] T208 \[FOUND\] **Infrastructure: Firestore Security Rules**: apps/photo/firestore.rules  
  * data-model.mdに基づきルールを記述。  
  * request.auth \!= null（匿名認証含む）を基本ルールとする。  
  * function isAdmin(): request.auth.token.role \== 'admin' (Design Doc) を定義。  
  * match /booths/{boothId}: allow read, update: if request.auth \!= null; allow create: if isAdmin();  
  * match /uploadedPhotos/{photoId}: allow read, create: if request.auth \!= null; allow delete: if isAdmin();
  * match /generatedPhotos/{photoId}: allow read: if true; allow create, delete: if isAdmin(); (US1/T305のGenerationServiceはAdmin権限で動作)
  * match /options/{optionId}: allow read: if true; allow write: if isAdmin();  
* \[x\] T210 \[FOUND\] **Application: GenerationService (Options)**: src/application/generationService.ts  
  * getOptions(): admin.firestore().collection('options').get()を呼び出す（Server ActionまたはAPI Route経由でのみ使用）。  
  * 取得したQuerySnapshotをGenerationOption\[\]型にマップ。  
  * plan.md (T207) に従い、typeIdでグループ化（reduceを使用）したオブジェクト（{ location: \[...\], outfit: \[...\] }）を返す。  
* \[x\] T211 \[P\] \[FOUND\] **Presentation: Shared UI Setup**: apps/photo/src/components/ui/  
  * plan.mdのshadcn/uiに基づき、pnpm dlx shadcn-ui@latest initを実行。  
  * Button, Card, Tabs, Dialog, Toastをaddコマンドでインストール。  
  * アプリ全体のレイアウトコンポーネント（src/app/layout.tsx）でTailwind CSSとフォントをセットアップ。  
* \[x\] T212 \[FOUND\] **Application: Service Interfaces**: src/application/interfaces.ts  
  * Design Doc.mdのC4図に基づき、各サービスのTypeScriptインターフェース（IAuthService, IPhotoService, IBoothService, IGenerationService）を定義し、DI（依存性逆転）の基盤を準備。

**Checkpoint**: Foundational (Firebase/Auth/Rules/Cleaner) complete.