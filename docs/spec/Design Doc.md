Status: in-review
Authors: ゆにねこ
Reviewers: nagomu
Updated: 2025/10/11

---
* スタンプラリー: [[./stamp/Design Doc]]
* AIフォトブース: [[./photobooth/Design Doc]]
* インタラクティブアート水族館: [[./interactive/Design Doc]]
---
# Objective
2025年まちかね祭展示を開発する。
# Background
まちかね祭とは、大阪大学で年に一度開催される大学祭である.
当プロジェクトは 2025年に GDG on Campus Osaka が出展する展示を開発することを目的とする.
# Goals / Non-goals
## Goals
* AIフォトブースを開発する
* インタラクティブアートを開発する
* スタンプラリーシステムを開発する
* 多言語対応 (日本語, 英語)
## Non-goals
* 喋るロボットを開発する
# Architecture
* 各展示ごとの簡易的なマイクロサービスで実装する.
  Next.js や Backend API を分割し、URLでアクセスするサービスを分ける.
## Diagram
### Context Diagram
```mermaid
C4Context
  title Context Diagram

  Person(user, "来場者", "まちかね祭の来場者")
  System(system, "まちかね祭展示システム", "まちかね祭の展示を管理するシステム")

  System_Ext(projector, "プロジェクター", "映像出力デバイス")
  System_Ext(webcam_a, "Webカメラ", "フォトブース用")
  System_Ext(webcam_b, "Webカメラ", "インタラクティブアート用")

  Rel(user, system, "スタンプラリー参加, 写真アップロード")
  Rel(system, projector, "映像出力")
  Rel(webcam_a, system, "フォトブース画像入力")
  Rel(webcam_b, system, "インタラクティブアート鑑賞者の映像入力")
```
### Container Diagram
```mermaid
C4Container
title Container Diagram for まちかね祭展示システム

Person(user, "来場者", "まちかね祭の来場者")
System_Ext(projector, "プロジェクター", "映像出力デバイス")
System_Ext(webcam_b, "Webカメラ", "インタラクティブアート用")
System_Ext(webcam_a, "Webカメラ", "フォトブース用")
System_Ext(gemini, "Gemini API", "画像生成API")
System_Ext(sentry, "Sentry", "Logging & Monitoring")

Container_Boundary(c1, "まちかね祭展示システム") {
	Container(config, "Config", "Firebase Remote Config", "障害レベルなどの設定を保存")
	
    Container_Boundary(c12, "AIフォトブース") {
		Container(photo_web_app, "Web Application", "Next.js", "UI + Backend")
        ContainerDb(photo_db, "Database", "Firestore", "選択肢,生成結果,ブース情報を保存")
        ContainerDb(photo_storage, "Storage", "Firebase Storage", "生成された写真の画像ファイルを保存")
        Container(photo_functions, "Firebase Functions", "Node.js", "アップロードされた画像を定期削除")
        Rel(photo_functions, photo_db, "画像削除")
        Rel(photo_functions, photo_storage, "画像削除")
    }
    Container_Boundary(c13, "インタラクティブアート水族館") {
        Container(art_renderer, "Renderer", "Unity", "魚を描画した映像をレンダリング")
        Container(art_be, "Backend API", "Node.js", "フォトブースからデータ受け取り")
        ContainerDb(art_db, "Database", "Firestore", "魚データを保存")
        Container(art_functions, "Firebase Functions", "Node.js", "魚データを定期的に削除")
        Rel(art_renderer, art_be, "魚データをポーリング")
        Rel(art_functions, art_db, "魚データを定期的に削除")
    }
    Container_Boundary(c11, "スタンプラリー") {
		Container(stamp_web_app, "Web Application", "Next.js", "UI + Backend")
		ContainerDb(stamp_db, "Database", "Firestore", "Save user data and stamp data")
		Container(stamp_auth, "Authentication", "Firebase Auth", "Annonymous authentication")
    }

    Rel(stamp_web_app, config, "障害レベルを取得")
}

Rel(user, stamp_web_app, "スタンプラリー参加")
Rel(stamp_web_app, stamp_auth, "認証")
Rel(stamp_web_app, stamp_db, "ユーザーデータ, スタンプデータ保存")
Rel(stamp_web_app, sentry, "ログ送信")
Rel(user, photo_web_app, "写真アップロード")
Rel(webcam_a, photo_web_app, "写真撮影")
Rel(photo_web_app, photo_db, "生成結果保存")
Rel(photo_web_app, photo_storage, "生成結果画像保存")
Rel(photo_web_app, gemini, "画像生成API呼び出し")
Rel(photo_web_app, art_be, "生成結果を送信")
Rel(photo_web_app, sentry, "ログ送信")
Rel(art_be, art_db, "魚データ保存")
Rel(webcam_b, art_renderer, "来場者映像を入力")
Rel(art_renderer, projector, "映像出力")
```
## Coding Conventions
### Next.js
#### Data fetching and rendering
* Firebase SDK に依存する部分は全て Client Side Rendering (CSR) とする.
  例えば、認証が必要な部分, Firestore からデータを取得・送信する部分, Remote Config から設定を取得する部分など.
* 逆に、ヘッダーやフッターなどデータ取得に依存しない部分は Server Side Rendering (SSR) とする.
* Firestore のデータ取得は SWR を用いる. StampService などのサービス層を参照するフックを作成し、コンポーネントからはそのフックを呼び出す.
* よって、 API Routes はデータ取得・送信には使用しない.
  ただし, Web アプリ外からリクエストを受け付けたい場合は API Routes を使用する.
* データベース等のデータ書き込みは Service 層に neverthrow の Result 型を返す関数として実装し, それを useSWRMutation で呼び出す.
#### Domain Driven Development
* `domain/`, `infra/`, `application` の3層に分ける.
	* `domain/`: ビジネスロジック, 型定義, infra層のインターフェース定義
	* `infra/`: Firebase SDK など外部サービスの実装
	* `application/`: React コンポーネントから呼び出すサービス層
* DDD では neverthrow, ts-pattern, obj-err を使用する.
	* neverthrow: Result 型を用いたエラーハンドリング
	* ts-pattern: パターンマッチング
	* obj-err: classではなくobjectでエラーを定義できる自作ライブラリ. npm に公開している. 使い方は後述
* class の代わりに interface と object で実装する.
	* domain 層は interface + type で型定義し, 関数を持つ object で実装する.
	* infra 層は domain 層で定義した interface の型の object を実装する.
	* application 層は一つの機能ごとに関数を分けて実装する. 高階関数を用いる.
	  e.g.
```typescript
// application/fooService.ts
const createFoo = (fooRepository: UserRepository) => (bar: string, baz: number) => fooRepository.create(Foo.create(bar, baz));

// infra/fooRepository.ts
const fooRepository: FooRepository = {
	create: (foo: Foo) => { ... }
};

// domain/foo.ts
interface Foo {
	bar: string;
	baz: number;
}

const Foo = {
	create: (bar: string, baz: number): Foo => ({ bar, baz })
};

interface FooRepository {
	create(foo: Foo): ResultAsync<void, FooError>;
}
// Define error with obj-err
import { errorBuilder, InferError } from 'obj-err';
export const FooError = errorBuidler('FooError');
export type FooError = InferError<typeof FooError>;
// define error for each error type
export const NotFounderror = errorBuidler('NotFoundError');
export type NotFounderror = InferError<typeof NotFounderror>;
// You can use zod schema for extra properties
import { z } from 'zod';
export const AnotherError = errorBuilder(
  'AnotherError',
  z.object({
    reason: z.string(),
    code: z.number(),
  })
);
export type AnotherError = InferError<typeof AnotherError>;
```
# Security Considerations
* AIフォトブースのDBは匿名認証したユーザーのみそのユーザーのデータだけ読み書き可能にする。
* AIフォトブースのUIは運営のみがアクセスできるようにする。事前にFirebase Authでメールアドレス&パスワードでユーザーを作成し、そのユーザーのみがログインできるようにする。
* スタンプラリーページから正規のユーザーがインタラクティブアートに画像をアップロードしたことをどう保証するか？
## Threat Model
## Authentication & Authorization
## Data Protection
## Secure Coding
### Input Validation
* NFCタグIDは事前に登録されたもののみ受け付ける
* AIフォトブースにアップロードする画像は JPEG/PNG 形式のみ、サイズは20MB以下に制限する
### Logging and Monitoring
* クライアントサイドのロギングは Sentry の無料プランで行う.
  無料プランは管理画面が1ユーザーしか使えないため、共有アカウント gdsc.osaka@gmail.com を使用する.
  https://sentry.io/pricing/
* Firebase Analytics でアクセス解析を行う.
## Incident Response
* まちかね祭運営日には必ず開発者が一人以上常駐し、障害対応できるようにする
* 開発者以外が障害を確認した場合、全ての開発者をメンションして Discord で報告する
* 障害対応手順:
	* Sentry と Google Cloud Logging を確認
	* データベースを確認
	* データの不具合の場合は手動でデータベースを書き換え
	* コードの不具合の場合はコードを修正してデプロイ
* 障害時は Twitter で障害発生と復旧を報告する
* 障害のレベルごとにアプリの表示を変える. 障害レベルは FIrebaes Remote Config で設定する
	* 軽微な障害 (特定機能の一時的な障害): 発生している障害をスタンプラリーページの目立つところに表示する
	* 重大な障害 (アプリを使用できないレベル): 障害対応中ページを表示する
# Privacy Considerations
* フォトブースにアップロードした画像は、画像生成時または一定時間経過後に自動で削除する。
* 生成された画像は一定時間経過後に非公開にする。データは削除しない。
## Data Minimization & Purpose Limitation
## Transparency and User Control
## Data Handling and Processing
* 認証情報とロギング情報は紐付けない
## Data Sharing and Third Parties
## Compliance
# Open issues
* 認証情報とロギング情報は紐付けないのはなぜですか。
	* ==紐づけた方がいいですね。ドキュメントを書いている途中に logging の方法を変えたので、ドキュメントが古いままになっていました。==
* スタンプラリーページ、画像ダウンロードページは別ページで作成だと思いますが、ページ間移動のタブは無しで大丈夫ですよね。
	* ==大丈夫です。詳細は [[./stamp/Design Doc]] 参照==