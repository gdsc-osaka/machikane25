# **タスク指示書: Gemini API (Nano Banana)による画像生成と保存**

## **1\. 目的**

GoogleのGemini API (Nano Banana / gemini-2.5-flash-image) を使用し、複数の参照画像に基づいて合成画像を生成する。その後、生成された画像をデコードしてCloud Storageに保存し、指定された GeneratedPhoto データモデルに従ってメタデータをFirestoreに登録する。

## **2\. APIエンドポイント**

POSTリクエストを送信するエンドポイントURLは以下とする。

\[https://generativelace.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent\](https://generativelace.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent)

## **3\. 認証**

リクエストヘッダーに、環境変数 (process.env.GEMINI\_API\_KEY) から取得したAPIキーを含める。

{  
  "Content-Type": "application/json",  
  "X-Goog-Api-Key": "YOUR\_API\_KEY\_HERE"  
}

## **4\. 必須ロジック: インターリーブ形式のParts配列**

本タスクの核心は、**APIがどの画像がどの役割を持つかを正確に理解できるリクエストボディを構築すること**である。

単純に全画像を配列で渡すのではなく、「テキストラベル」と「画像データ」を交互に配置する **インターリーブ（Interleaved）形式** で parts 配列を構築する必要がある。

### **リクエストボディの構造**

{  
  "contents": \[  
    {  
      "parts": \[  
        // \--- 1\. ベース画像の定義 \---  
        { "text": "This is the base 'reference\_image' person:" },  
        { "inlineData": {  
            "mimeType": "image/jpeg",  
            "data": "..." // (baseImageIdから取得したBase64データ)  
          }  
        },

        // \--- 2\. オプション画像 (person) の定義 \---  
        { "text": "This image is for the 'person':" },  
        { "inlineData": {  
            "mimeType": "image/jpeg",  
            "data": "..." // (options.person のIDから取得したBase64データ)  
          }  
        },

        // \--- 3\. オプション画像 (outfit) の定義 \---  
        { "text": "This image is for the 'outfit':" },  
        { "inlineData": {  
            "mimeType": "image/png",  
            "data": "..." // (options.outfit のIDから取得したBase64データ)  
          }  
        },

        // \--- (location, pose, style も同様に続ける) \---  
        // ...

        // \--- 最終指示 \---  
        // 最後に、上記で定義したラベル('reference\_image', 'person'等)を使って  
        // 総合的な指示を与えるテキストパートを追加する。  
        { "text": "Generate an image using the 'reference\_image' person. Beside the 'reference\_image' person, add the 'person' to create a two-shot scene. The 'reference\_image' person should be wearing the 'outfit'. Both persons should be in the 'pose', at the 'location'. The overall image style should be the 'style'." }  
      \]  
    }  
  \]  
}

## **5\. 実装タスク: API呼び出し**

以下の仕様で、generateImage 関数（または同等の機能）を実装すること。

### **5.1. 関数の入力**

* uploadedPhotoId (string): ベースとなる人物画像のFirestore ID (例: 01k8p096tpxnmzg7eya0pnv6h5)  
* options (Record\<string, string\>): 役割（キー）と画像のFirestore ID（値）のマッピング。  
* boothId (string): (保存時に必要なため、入力に追加)

### **5.2. 必須となるヘルパー関数 (入力)**

* getImageDataFromId(id: string): Promise\<{ mimeType: string, data: string }\>  
  * この関数は、入力されたFirestore IDをもとに、Cloud Storageなどから該当する画像ファイルを取得し、**Base64エンコードされた文字列**と**MIMEタイプ**をオブジェクトとして返す非同期関数である。

### **5.3. 実装ロジックの擬似コード (API呼び出し)**

1. 空の parts 配列を初期化する。  
2. uploadedPhotoId を使って getImageDataFromId を await で呼び出し、ベース画像データを取得する。  
3. parts に { "text": "This is the base 'reference\_image' person:" } を追加する。  
4. parts にベース画像の inlineData オブジェクトを追加する。  
5. options オブジェクトのキー (location, outfit, ...) を配列として取得する。  
6. Promise.all と .map を使い、**すべてのオプション画像を並列で** getImageDataFromId を呼び出して取得・エンコードする。  
7. 並列取得した結果（キーと画像データのペア配列）をループ処理する。  
8. ループ内で、各オプションについて parts にテキストラベル（例: {"text": "This image is for the 'location':"}）を追加する。  
9. 続けて、parts にそのオプション画像の inlineData オブジェクトを追加する。  
10. parts の最後に、**4\. リクエストボディの構造** に記載されている「最終指示」のテキストオブジェクトを追加する。  
11. parts 配列を {"contents": \[{"parts": parts}\]} の形式でラップし、apiRequestBody を作成する。  
12. fetch を使用して、指定のエンドポイントに apiRequestBody と認証ヘッダーを送信する。  
13. レスポンスが \!response.ok の場合はエラーをスローする。  
14. response.json() をパースし、**この結果（APIレスポンス）と boothId をセクション6の保存ロジックに渡す。**

## **6\. 実装タスク: レスポンス処理と保存**

generateImage 関数内、またはそれが呼び出す後続の関数で、APIレスポンスを処理し、GeneratedPhoto データモデルに従って保存する。

### **6.1. APIレスポンスの構造（期待値）**

APIからの成功レスポンス（result）には、以下の構造で生成された画像データが含まれる。

```typescript
// result の期待される構造  
{  
  "candidates": \[  
    {  
      "content": {  
        "parts": \[  
          {  
            "inlineData": {  
              "mimeType": "image/png", // (または jpeg)  
              "data": "iVBORw0KGgoAAA..." // (生成された画像のBase64文字列)  
            }  
          }  
        \],  
        "role": "model"  
      }  
      // ... 他のメタデータ  
    }  
  \]  
}
```

### **6.2. 必須となるヘルパー関数 (出力)**

* handleGeminiResponse(imageBuffer: Buffer, boothId: string, mimeType: string): Promise\<{ imagePath: string, imageUrl: string }\>  
  * この関数は、デコードされた画像データ（Buffer）を受け取り、Cloud Storageにアップロードする。  
  * アップロード後、Storageのパス (imagePath) と公開URL (imageUrl) を含むオブジェクトを返す。

### **6.3. 実装ロジックの擬似コード (保存処理)**

1. (セクション5.3から result と boothId を受け取る)  
2. result.candidates\[0\].content.parts\[0\].inlineData から、data (Base64文字列) と mimeType を抽出する。  
   * *（注意: result.candidates や parts が存在しない場合に備え、nullチェック/オプショナルチェーン (?.) を行うこと）*  
3. Base64データが存在しない場合、エラーをスローする。  
4. 抽出した data (Base64文字列) を **Buffer** オブジェクトにデコードする。  
   * const imageBuffer \= Buffer.from(base64Data, 'base64');  
5. handleGeminiResponse(imageBuffer, boothId, mimeType) を await で呼び出し、imagePath と imageUrl を取得する。  
6. Firestoreの generatedPhotos コレクション（または適切なパス）への参照を取得する。  
7. 保存する GeneratedPhoto オブジェクトを構築する。  
   const newPhotoData \= {  
    photoId: firestore doc id
     imageUrl: imageUrl,       // Storageから取得  
     imagePath: imagePath,     // Storageから取得  
     createdAt: serverTimestamp() // Firestoreのサーバータイムスタンプ  
   };

8. Firestoreの addDoc を使用して newPhotoData をコレクションに保存する。  
9. 生成されたFirestoreドキュメントのID (photoId) または参照を呼び出し元に返す。