# RAGメモリ管理ガイド

## 概要

たこまる君のRAG（Retrieval-Augmented Generation）メモリシステムの管理方法を説明します。

## RAGメモリとは

たこまる君は、過去の経験や背景知識をChromaDBに保存し、会話時に関連する記憶を検索して活用します。

### 記憶の種類

- **interaction**: 人との会話
- **observation**: 観察した内容
- **thought**: 内心の思考
- **learning**: 学習した知識（**背景知識の保存に最適**）
- **experience**: 体験・経験
- **system**: システム情報

## 管理ツール: `manage_rag_memory.py`

### 基本的な使い方

```bash
# 全記憶を一覧表示
python3 manage_rag_memory.py list

# 特定タイプのみ表示
python3 manage_rag_memory.py list --type learning

# 記憶を検索
python3 manage_rag_memory.py search --query "あなたは誰ですか"

# GDGOC阪大の背景知識を追加
python3 manage_rag_memory.py add-gdsc

# 記憶をJSONにエクスポート
python3 manage_rag_memory.py export --output backup.json
```

## 登録されている背景知識

現在、以下の背景知識が登録されています：

### GDGOC阪大関連（5件）

1. **自己紹介**: たこまる君の名前とプロジェクト概要
2. **GDGOC概要**: Google Developer Groups On Campusの説明
3. **GDGOC阪大支部**: 活動内容と目的
4. **グローバル展開**: 世界での活動規模
5. **チーム構成**: DX TeamとEngineering Team

### Google I/O 2025 最新技術（8件）

1. **Gemini 2.5モデル**: 高速な2.5 FlashとDeep Think推論モードを持つ2.5 Pro
2. **利用統計**: 月間480兆トークン処理、4億人以上のユーザー
3. **Project Mariner**: ウェブエージェント、teach and repeat機能
4. **Project Astra/Gemini Live**: カメラ・画面共有機能を持つ汎用AIアシスタント
5. **インフラ**: 第7世代TPU Ironwood、42.5エクサフロップス
6. **メディア生成**: Veo 3（ビデオ）、Imagen 4（画像）、Flow（映画制作）
7. **Google検索**: AI Mode、15億人以上がAI Overviewを利用
8. **技術統合**: VoiceVox音声合成、音声認識、画像認識の組み合わせ

### 追加された記憶の例

```json
{
  "content": "私の名前は「たこまる君」です。VoiceVox音声合成、音声認識、画像認識を組み合わせた自律的なロボットシステムで、GDGOC阪大の文化祭展示プロジェクトとして作られました。",
  "memory_type": "learning",
  "importance": 1.0,
  "tags": ["background", "identity", "project"]
}
```

## 会話での活用

背景知識は、以下のような質問に対して自動的に検索・活用されます：

- 「あなたは誰ですか？」
- 「GDGOCって何？」
- 「どこで作られたの？」
- 「何ができるの？」

### プロンプトへの組み込み

[brain.py](../src/agent/brain.py)の思考生成プロンプトで以下のように使用されます：

```python
【過去の記憶（関連する経験）】
- 私の名前は「たこまる君」です。VoiceVox音声合成、音声認識...
- 私はGDGOC（Google Developer Groups On Campus）大阪大学支部の展示プロジェクト...
```

## カスタム背景知識の追加

新しい背景知識を追加する場合は、`manage_rag_memory.py`を編集して以下のように追加できます：

```python
async def add_custom_knowledge(memory_system: MemorySystem):
    """カスタム背景知識を追加"""

    custom_info = [
        {
            "content": "ここに背景知識の内容を記述",
            "tags": ["background", "custom"],
            "importance": 0.9
        }
    ]

    for info in custom_info:
        memory = Memory(
            content=info["content"],
            memory_type=MemoryType.LEARNING,
            emotion="neutral",
            importance=info["importance"],
            tags=info["tags"]
        )

        await memory_system.store_memory(memory)
```

## メモリのクリア

全記憶を削除してやり直す場合：

```bash
python3 clear_rag_memory.py --force
```

**注意**: この操作により、すべての記憶が削除されます（バックアップは作成されます）。

## トラブルシューティング

### 記憶が検索されない

1. ChromaDBが正しく初期化されているか確認：
   ```bash
   ls -la data/chroma_db/
   ```

2. 記憶が保存されているか確認：
   ```bash
   python3 manage_rag_memory.py list
   ```

3. 検索クエリを変えてみる：
   ```bash
   python3 manage_rag_memory.py search --query "GDGOC"
   python3 manage_rag_memory.py search --query "たこまる"
   ```

### 古い記憶が残っている

```bash
# バックアップを作成してクリア
python3 clear_rag_memory.py --force

# GDGOC情報を再登録
python3 manage_rag_memory.py add-gdsc
```

## ログでの確認

プロンプトと応答のログ（[LOGGING.md](LOGGING.md)参照）には、RAG記憶の情報がメタデータとして含まれます：

```json
{
  "metadata": {
    "has_memories": true,
    "memory_count": 3,
    "memory_content": "- 私の名前は「たこまる君」です...",
    "recent_responses_count": 5
  }
}
```

## ベストプラクティス

1. **背景知識は重要度を高めに設定** (0.8-1.0)
2. **適切なタグを付ける** (`background`, `identity`, `GDGOC`など)
3. **定期的にバックアップを取る** (`export`コマンド)
4. **不要な記憶は削除する** （現状は手動、将来的に自動化予定）
5. **検索でテストする** 追加後は必ず検索して確認

## 今後の改善予定

- [ ] 記憶の自動減衰・削除機能
- [ ] 重複記憶の自動検出・マージ
- [ ] 記憶のインポート機能
- [ ] Web UIでの記憶管理
- [ ] 記憶の重要度自動調整

## 参考

- [Memory Model](../src/models/memory.py) - 記憶データモデル
- [Memory System](../src/rag/memory.py) - RAGメモリシステム
- [Brain](../src/agent/brain.py) - 記憶の検索・活用ロジック
- [Logging](LOGGING.md) - ログとRAG情報の確認方法
