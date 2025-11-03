# Gemma3 プロンプト・応答ログ機能

## 概要

Gemma3に送信したプロンプトと受信した応答を自動的にJSONファイルとして保存する機能です。
プロンプト改善やデバッグに役立ちます。

## ログ保存場所

### 画像解析ログ（Gemma マルチモーダル）
- **ディレクトリ**: `data/gemma_logs/`
- **ファイル形式**: `interaction_YYYYMMDD_HHMMSS_microseconds.json`
- **画像ファイル**: `image_YYYYMMDD_HHMMSS_microseconds.jpg`

### 音声会話ログ
- **ディレクトリ**: `data/voice_chat_logs/`
- **ファイル形式**: `interaction_YYYYMMDD_HHMMSS_microseconds.json`

## ログファイルの構造

### 画像解析ログの例
```json
{
  "timestamp": "2025-10-29T14:30:45.123456",
  "model": "gemma3:4b",
  "prompt": "システム: あなたは好奇心旺盛なロボット「たこまる君」の目です...",
  "response": "人が映っている。青いペプシコーラのボトルが置いてある。白い箱も見える。",
  "image_path": "data/gemma_logs/image_20251029_143045_123456.jpg"
}
```

### 音声会話ログの例
```json
{
  "timestamp": "2025-10-29T14:35:12.654321",
  "model": "gemma3:4b",
  "user_input": "今日の天気は？",
  "prompt": "あなたは親切で自然な会話ができるアシスタントです...",
  "response": "申し訳ありませんが、私は現在の天気情報にアクセスできません..."
}
```

## ログ機能の有効化・無効化

### GemmaMultiModalAnalyzer
```python
# ログを有効にする（デフォルト）
analyzer = GemmaMultiModalAnalyzer(model_name="gemma3:4b", enable_logging=True)

# ログを無効にする
analyzer = GemmaMultiModalAnalyzer(model_name="gemma3:4b", enable_logging=False)
```

### VoiceChatSystem
```python
# ログを有効にする（デフォルト）
chat_system = VoiceChatSystem(enable_logging=True)

# ログを無効にする
chat_system = VoiceChatSystem(enable_logging=False)
```

### TakomaruBrain（たこまる君）
デフォルトでログが有効になっています。起動時に以下のメッセージが表示されます：
```
📝 プロンプト・応答ログ: data/gemma_logs/interaction_*.json
```

## ログの確認方法

### 最新のログを確認
```bash
# 最新の画像解析ログ
cat data/gemma_logs/interaction_*.json | tail -n 1 | jq .

# 最新の音声会話ログ
cat data/voice_chat_logs/interaction_*.json | tail -n 1 | jq .
```

### すべてのログをリスト表示
```bash
# 画像解析ログ
ls -lt data/gemma_logs/interaction_*.json

# 音声会話ログ
ls -lt data/voice_chat_logs/interaction_*.json
```

### ログから特定の情報を抽出
```bash
# すべての応答を表示
jq '.response' data/gemma_logs/interaction_*.json

# プロンプトの長さを確認
jq '.prompt | length' data/gemma_logs/interaction_*.json

# エラー応答のみを抽出
jq 'select(.response | contains("エラー"))' data/gemma_logs/interaction_*.json
```

## ログのクリーンアップ

### 古いログを削除
```bash
# 7日以上前のログを削除
find data/gemma_logs -name "*.json" -mtime +7 -delete
find data/gemma_logs -name "*.jpg" -mtime +7 -delete

# すべてのログを削除
rm -rf data/gemma_logs/*
rm -rf data/voice_chat_logs/*
```

## プロンプト改善のヒント

ログを分析して、以下の点を確認します：

1. **応答の質**: 期待した情報が得られているか？
2. **プロンプトの明確さ**: 指示が明確で具体的か？
3. **コンテキストの適切さ**: システムプロンプトが適切か？
4. **エラーパターン**: 特定のケースでエラーが発生していないか？

### 改善例
```python
# 改善前
prompt = "この画像について説明してください"

# 改善後（具体的な観察ポイントを追加）
prompt = """この画像を観察して、以下を報告してください：
1. 人がいるか？
2. 目立つ物は何か？（商品名、色、特徴）
3. 書かれている文字"""
```

## 注意事項

- ログファイルには個人情報や機密情報が含まれる可能性があります
- 本番環境では適切なアクセス制御を設定してください
- ディスク容量を定期的に確認し、古いログを削除してください
- 画像ファイルは容量が大きいため、特に注意が必要です

## トラブルシューティング

### ログが保存されない
1. ディレクトリの書き込み権限を確認
2. `enable_logging=True` が設定されているか確認
3. ログレベルを `DEBUG` に設定してエラーメッセージを確認

### ログファイルが大きくなりすぎる
```bash
# ログファイルのサイズを確認
du -sh data/gemma_logs/
du -sh data/voice_chat_logs/

# 定期的なクリーンアップのcronジョブを設定
# 例: 毎日午前3時に7日以上前のログを削除
0 3 * * * find /path/to/data/gemma_logs -name "*.json" -mtime +7 -delete
```
