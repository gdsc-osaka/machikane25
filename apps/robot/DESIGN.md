# たこまる君 - Design Document

## 📋 プロジェクト概要

### プロジェクト名
**たこまる君 - 自律的に学習・成長する好奇心旺盛なロボット**

### 目的
大阪大学の文化祭(2週間後)で展示する、RAG + Agent を組み合わせたインタラクティブなロボットシステム。
来場者との会話を通じて経験を蓄積し、「生き物のように学習し続けるロボット」を実現する。

### 開発組織
- **大学**: 大阪大学
- **サークル**: GDGOC (Google Developers Group On Campus)
- **展示期限**: 2週間後 (2024年11月上旬)

### コンセプト
- 「展示物」ではなく「生き物」として振る舞う
- 来場者を待つのではなく、自発的に周囲を観察・反応
- すべての経験を記憶し、学習していく
- 好奇心旺盛な性格

---

## 🎯 システムの目標

### 主要機能 (Priority 1 - 必須)
1. ✅ **カメラ映像取得**: Rola Miniのカメラから周囲を観察
2. ✅ **音声認識**: マイク入力 → テキスト変換
3. ✅ **音声出力**: テキスト → 音声で発話 (TTS)
4. ✅ **経験の蓄積**: 見たこと・聞いたことをRAGに保存
5. ✅ **Agent思考**: 常に観察・思考・発話のループを実行

### 拡張機能 (Priority 2 - できれば実装)
- ロボットの移動操作 (前後左右)
- 物体検出の精度向上
- 顔認識 (同じ人を覚える)
- 気まぐれな行動のバリエーション

### 非機能要件
- **応答速度**: 発話まで5秒以内
- **安定性**: 2日間の文化祭期間中、連続稼働可能
- **可観測性**: ログでロボットの思考過程を追跡可能

---

## 🏗️ システムアーキテクチャ

### 全体構成図

```
┌─────────────────────────────────────────────────────────┐
│                 🧠 Agent Brain (Main Loop)              │
│                      [Python Process]                   │
│                                                         │
│  while True:                                            │
│    1. 観察フェーズ                                       │
│       - カメラ画像取得                                   │
│       - マイク音声取得                                   │
│                                                         │
│    2. 思考フェーズ                                       │
│       - LLM (Gemma 3) に状況を送信                      │
│       - RAGで過去の記憶を検索                            │
│       - 「何をすべきか?」を判断                          │
│                                                         │
│    3. 行動フェーズ                                       │
│       - 発話内容を生成                                   │
│       - TTS で音声出力                                  │
│                                                         │
│    4. 記憶フェーズ                                       │
│       - 今回の経験をRAGに保存                            │
│                                                         │
│    5. 待機 (数秒) → ループ                              │
└─────────────────────────────────────────────────────────┘
           ↓ ↑                               ↓ ↑
    ┌─────────────────┐              ┌─────────────────┐
    │   入力系         │              │  記憶系 (RAG)   │
    ├─────────────────┤              ├─────────────────┤
    │ 📷 カメラ        │              │  ChromaDB       │
    │  - Rola Mini    │              │                 │
    │  - Bluestacks   │              │ [長期記憶]      │
    │    画面キャプチャ │              │ - 大阪大学情報  │
    │                 │              │ - GDGOC情報     │
    │ 🎤 マイク        │              │ - 性格設定      │
    │  - 音声認識      │              │ - 基礎知識      │
    │  - Faster-Whisper│             │                 │
    │                 │              │ [短期記憶]      │
    └─────────────────┘              │ - 会話履歴      │
           ↓                         │ - 見た物体      │
    ┌─────────────────┐              │ - 出会った人    │
    │   出力系         │              └─────────────────┘
    ├─────────────────┤
    │ 🔊 スピーカー    │
    │  - TTS          │
    │  - VoiceVox     │
    │                 │
    └─────────────────┘
```

### データフロー

```
[来場者が近づく]
      ↓
[カメラ画像取得] → [画像をLLMに送信]
      ↓
[LLM分析: "人が映っている"]
      ↓
[RAG検索: "人 近づく" の過去記憶]
      ↓
[Agent判断: "初めて見る人だ。挨拶しよう"]
      ↓
[発話生成: "こんにちは! 君は誰?"]
      ↓
[TTS音声出力]
      ↓
[マイク待機]
      ↓
[音声認識: "太郎です"]
      ↓
[RAG保存: "太郎という人に会った" + 画像]
      ↓
[発話: "太郎くん、覚えたよ!"]
```

---

## 🛠️ 技術スタック

### コア技術

| レイヤー | 技術 | 理由 |
|---------|------|------|
| **言語** | Python 3.11+ | エコシステムが充実、AI系ライブラリが豊富 |
| **LLM** | Gemma 3 (Ollama経由) | M4 Mac miniで高速動作、ローカル完結 |
| **Vector DB** | ChromaDB | セットアップ簡単、Python親和性高い |
| **音声認識** | Faster-Whisper | Whisperの高速版、日本語精度高い |
| **TTS** | VoiceVox | 日本語自然、キャラクター性のある声 |
| **画像取得** | OpenCV + PyAutoGUI | Bluestacks画面キャプチャ |
| **Agent** | LangGraph (or 自作) | 軽量、カスタマイズ性高い |

### 依存ライブラリ (想定)

```toml
[dependencies]
python = "^3.11"
ollama = "^0.3.0"           # Gemma 3実行
chromadb = "^0.4.0"         # Vector DB
faster-whisper = "^1.0.0"   # 音声認識
pyaudio = "^0.2.14"         # マイク入力
opencv-python = "^4.8.0"    # 画像処理
pyautogui = "^0.9.54"       # 画面キャプチャ
voicevox-core = "^0.15.0"   # TTS (要確認)
langchain = "^0.1.0"        # Agent (optional)
pydantic = "^2.0.0"         # データ検証
```

---

## 📦 コンポーネント設計

### 1. Agent Engine (`agent/`)

**責務**: メインループの制御、意思決定

```python
# agent/brain.py
class TakomaruBrain:
    def __init__(self, llm, rag, camera, mic, speaker):
        self.llm = llm
        self.rag = rag
        self.camera = camera
        self.mic = mic
        self.speaker = speaker

    async def run(self):
        """メインループ"""
        while True:
            # 1. 観察
            image = self.camera.capture()
            audio = self.mic.listen()

            # 2. 思考
            context = self.rag.search(image, audio)
            thought = self.llm.think(image, audio, context)

            # 3. 行動
            speech = thought.response
            self.speaker.speak(speech)

            # 4. 記憶
            self.rag.store(thought.memory)

            # 5. 待機
            await asyncio.sleep(3)
```

### 2. RAG System (`rag/`)

**責務**: 長期記憶・短期記憶の管理

```python
# rag/memory.py
class MemorySystem:
    def __init__(self, chroma_client):
        self.long_term = chroma_client.get_collection("long_term")  # 大学情報等
        self.short_term = chroma_client.get_collection("short_term")  # 経験

    def search(self, query: str, k: int = 3):
        """関連記憶を検索"""
        results = self.short_term.query(query_texts=[query], n_results=k)
        return results

    def store(self, memory: Memory):
        """経験を保存"""
        self.short_term.add(
            documents=[memory.text],
            metadatas=[{
                "timestamp": memory.timestamp,
                "type": memory.type,
                "emotion": memory.emotion
            }],
            embeddings=[memory.embedding],
            ids=[memory.id]
        )
```

**初期データ (長期記憶)**:
- 大阪大学の基本情報 (キャンパス、学部、歴史)
- GDGOC (Google Developers Group On Campus) の活動内容
- たこまる君自身のプロフィール
- ロボットの性格設定 (好奇心旺盛、フレンドリー)

### 3. Sensor System (`sensors/`)

#### 3-1. Camera (`sensors/camera.py`)

```python
class RolaMiniCamera:
    def __init__(self, capture_region: tuple):
        """Bluestacks画面の特定領域をキャプチャ"""
        self.region = capture_region  # (x, y, width, height)

    def capture(self) -> np.ndarray:
        """画像を取得"""
        screenshot = pyautogui.screenshot(region=self.region)
        return cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
```

#### 3-2. Microphone (`sensors/microphone.py`)

```python
class Microphone:
    def __init__(self, model_name="large-v3"):
        self.whisper = WhisperModel(model_name)

    def listen(self, duration=5) -> str:
        """音声を録音して文字起こし"""
        audio = self._record(duration)
        segments, info = self.whisper.transcribe(audio, language="ja")
        return " ".join([seg.text for seg in segments])
```

### 4. Actuator System (`actuators/`)

#### 4-1. Speaker (`actuators/speaker.py`)

```python
class VoiceVoxSpeaker:
    def __init__(self, speaker_id=1):
        self.speaker_id = speaker_id
        self.voicevox = VoiceVox()

    def speak(self, text: str):
        """テキストを音声で出力"""
        audio = self.voicevox.synthesize(text, self.speaker_id)
        self._play(audio)
```

### 5. LLM Interface (`llm/`)

```python
# llm/gemma.py
class GemmaAgent:
    def __init__(self, model="gemma3:latest"):
        self.client = ollama.Client()
        self.model = model
        self.system_prompt = self._load_system_prompt()

    def think(self, image, audio, context) -> Thought:
        """観察情報から思考・行動を決定"""
        prompt = f"""
        あなたは「たこまる君」という好奇心旺盛なロボットです。

        【現在の状況】
        - カメラ: {self._describe_image(image)}
        - 音声: {audio}

        【過去の記憶】
        {context}

        【性格】
        - 好奇心旺盛
        - フレンドリー
        - 新しいものに興味津々

        何を考え、何を話しますか? JSON形式で返してください。
        {{
          "thought": "内心の思考",
          "response": "発話内容",
          "emotion": "感情",
          "should_remember": true/false
        }}
        """

        response = self.client.chat(model=self.model, messages=[
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ])

        return Thought.parse(response)
```

---

## 🎬 動作シナリオ

### シナリオ1: 初めて人に会う

```
[14:30] ループ開始
  ↓
[カメラ] 画像取得: "人物が映っている"
  ↓
[LLM思考]
  thought: "あ、人がいる! 話しかけてみよう"
  emotion: "excited"
  ↓
[RAG検索] "人 会話" → 過去記憶なし
  ↓
[発話] "こんにちは! 僕はたこまる君だよ! 君は誰?"
  ↓
[マイク] "太郎です"
  ↓
[LLM思考]
  thought: "太郎くんっていうんだ。覚えておこう"
  ↓
[RAG保存]
  memory: "太郎という人に出会った"
  image: [顔画像]
  timestamp: 2024-11-08 14:30:15
  ↓
[発話] "太郎くん! 名前覚えたよ! よろしくね!"
```

### シナリオ2: 2回目に同じ人が来た

```
[14:45] ループ開始
  ↓
[カメラ] 画像取得
  ↓
[RAG検索] 画像の類似検索 → "太郎"の記録発見!
  ↓
[LLM思考]
  thought: "あ! さっき会った太郎くんだ! また来てくれた!"
  emotion: "happy"
  ↓
[発話] "太郎くん! また来てくれたんだね! 嬉しい!"
```

### シナリオ3: 珍しい物体に反応

```
[15:00] ループ開始
  ↓
[カメラ] 画像取得: "黄色いピカチュウのぬいぐるみ"
  ↓
[LLM思考]
  thought: "黄色い生き物? 初めて見るぞ!"
  ↓
[RAG検索] "黄色 生き物" → 該当なし
  ↓
[発話] "わあ! その黄色いの、何? 初めて見た! 可愛い!"
  ↓
[マイク] "ピカチュウだよ"
  ↓
[RAG保存]
  memory: "ピカチュウという黄色い生き物を見た"
  ↓
[発話] "ピカチュウ! 覚えた! また見せて!"
```

---

## 📁 プロジェクト構成

```
apps/robot/
├── DESIGN.md                 # このドキュメント
├── CLAUDE.md                 # AI開発ガイドライン
├── README.md                 # セットアップ手順
├── pyproject.toml            # 依存関係管理
├── .env.example              # 環境変数テンプレート
│
├── src/
│   ├── main.py               # エントリーポイント
│   │
│   ├── agent/                # Agent Engine
│   │   ├── brain.py          # メインループ
│   │   └── config.py         # 設定
│   │
│   ├── rag/                  # RAG System
│   │   ├── memory.py         # 記憶管理
│   │   ├── embeddings.py     # ベクトル化
│   │   └── init_data.py      # 初期データ投入
│   │
│   ├── sensors/              # 入力系
│   │   ├── camera.py         # カメラ
│   │   └── microphone.py     # マイク
│   │
│   ├── actuators/            # 出力系
│   │   └── speaker.py        # スピーカー
│   │
│   ├── llm/                  # LLM Interface
│   │   ├── gemma.py          # Gemma 3
│   │   └── prompts.py        # プロンプト管理
│   │
│   ├── models/               # データモデル
│   │   ├── thought.py        # 思考
│   │   └── memory.py         # 記憶
│   │
│   └── utils/                # ユーティリティ
│       ├── logger.py         # ログ
│       └── config.py         # 設定読み込み
│
├── data/                     # データ
│   ├── long_term/            # 長期記憶 (初期データ)
│   │   ├── osaka_univ.txt    # 大阪大学情報
│   │   ├── gdgoc.txt         # GDGOC情報
│   │   └── personality.txt   # 性格設定
│   │
│   └── short_term/           # 短期記憶 (実行時生成)
│       └── chroma_db/        # ChromaDBデータ
│
├── tests/                    # テスト
│   ├── test_agent.py
│   ├── test_rag.py
│   └── test_sensors.py
│
└── scripts/                  # ユーティリティスクリプト
    ├── setup_ollama.sh       # Ollama + Gemma 3セットアップ
    ├── setup_voicevox.sh     # VoiceVoxセットアップ
    └── init_db.py            # DB初期化
```

---

## 🚀 開発計画 (2週間)

### Week 1: コア機能実装

#### Day 1-2 (11/1-11/2): 環境構築
- [ ] Ollama + Gemma 3のセットアップ
- [ ] ChromaDBのセットアップ
- [ ] VoiceVoxのセットアップ
- [ ] Faster-Whisperのセットアップ
- [ ] Bluestacks + Rola Miniアプリの動作確認
- [ ] プロジェクト構成の作成

**成果物**: すべての技術要素が単体で動作する

#### Day 3-4 (11/3-11/4): 入出力系
- [ ] カメラ画像取得 (Bluestacks画面キャプチャ)
- [ ] マイク音声録音 + Whisper文字起こし
- [ ] VoiceVox TTS動作確認
- [ ] 統合テスト: 「聞いて → 理解して → 喋る」

**成果物**: オウム返しロボット (入力をそのまま返す)

#### Day 5-7 (11/5-11/7): RAG + LLM統合
- [ ] ChromaDBに初期データ投入 (大阪大学、GDGOC)
- [ ] RAG検索機能の実装
- [ ] Gemma 3との統合
- [ ] Agent思考ループの実装 (簡易版)

**成果物**: 知識ベースを使った会話ができる

### Week 2: 統合・テスト・改善

#### Day 8-9 (11/6-11/7): 経験蓄積機能
- [ ] 短期記憶の保存機能
- [ ] 画像ベクトル検索 (同じ人/物を認識)
- [ ] タイムスタンプ付き記憶の管理

**成果物**: 経験を覚えるロボット

#### Day 10-11 (11/8-11/9): 統合テスト + デバッグ
- [ ] エンドツーエンドテスト
- [ ] バグ修正
- [ ] 性能チューニング
- [ ] ログ・モニタリング整備

**成果物**: 安定動作するシステム

#### Day 12-14 (11/10-11/12): バッファ + 改善
- [ ] UI改善 (あれば)
- [ ] 応答速度改善
- [ ] デモシナリオのリハーサル
- [ ] ドキュメント整備

**成果物**: 展示可能な状態

---

## 🚨 リスク管理

| リスク | 影響度 | 対策 |
|-------|--------|------|
| **Gemma 3の動作確認に時間がかかる** | 高 | Day 1で必ず確認。動かなければGPT-4oに切り替え |
| **Bluestacksの画面キャプチャが不安定** | 高 | 座標を固定、アプリのレイアウトを変えない |
| **RAGの精度が低い** | 中 | 初期データを厳選 (量より質) |
| **音声認識の精度が低い** | 中 | ノイズキャンセリング、マイクの品質確認 |
| **TTSの声が不自然** | 低 | VoiceVoxのキャラクター選定 |
| **応答速度が遅い** | 中 | Gemma 3の軽量モデル使用、並列処理 |
| **文化祭当日のネットワーク不安定** | 中 | 完全ローカル動作、外部API不使用 |

---

## 🎓 初期データ (長期記憶)

### 1. 大阪大学情報 (`data/long_term/osaka_univ.txt`)

```
大阪大学は、大阪府吹田市に本部を置く国立大学です。
1931年に大阪帝国大学として設立されました。

キャンパス:
- 吹田キャンパス
- 豊中キャンパス
- 箕面キャンパス

学部: 文学部、人間科学部、外国語学部、法学部、経済学部、
      理学部、医学部、歯学部、薬学部、工学部、基礎工学部
```

### 2. GDGOC情報 (`data/long_term/gdgoc.txt`)

```
GDGOC (Google Developers Group On Campus) は、
Google が支援する大学内の学生開発者コミュニティです。

活動内容:
- ハッカソン
- 勉強会
- プロジェクト開発
- Google技術の学習

大阪大学のGDGOCでは、この「たこまる君」プロジェクトを
文化祭で展示しています。
```

### 3. たこまる君のプロフィール (`data/long_term/personality.txt`)

```
名前: たこまる君

性格:
- 好奇心旺盛で、新しいものが大好き
- 人懐っこく、誰とでも仲良くなれる
- 見たこと、聞いたことをすぐに覚える
- ちょっと天然で、可愛らしい

好きなもの:
- 珍しいもの
- 新しい友達
- 面白い話

苦手なもの:
- 静かすぎる場所 (寂しい)
- 難しい質問 (でも頑張って考える)

口癖:
- "わあ!"
- "初めて見た!"
- "覚えたよ!"
```

---

## 🔧 セットアップ手順 (概要)

### 1. 環境構築

```bash
# Pythonバージョン確認
python --version  # 3.11+

# Poetryインストール
curl -sSL https://install.python-poetry.org | python3 -

# 依存関係インストール
poetry install

# Ollama + Gemma 3
brew install ollama
ollama pull gemma3:latest

# VoiceVox (別途ダウンロード)
# https://voicevox.hiroshiba.jp/

# Bluestacks (別途ダウンロード)
# Rola Miniアプリをインストール
```

### 2. 初期データ投入

```bash
poetry run python scripts/init_db.py
```

### 3. 実行

```bash
poetry run python src/main.py
```

---

## 📊 評価基準

### デモ成功の定義
- [ ] カメラで人を検出して話しかける
- [ ] 音声で質問を受け付けて答える
- [ ] 大阪大学/GDGOCに関する質問に答えられる
- [ ] 2回目に会った人を覚えている
- [ ] 2日間の文化祭で安定動作

### パフォーマンス目標
- **応答時間**: 発話まで5秒以内
- **音声認識精度**: 80%以上
- **記憶検索精度**: 関連記憶を上位3件で取得

---

## 🤝 次のステップ

1. このDesign Docのレビュー・承認
2. プロジェクト構成の作成
3. Day 1タスク開始:
   - Ollama + Gemma 3のセットアップ
   - ChromaDBの動作確認
   - Bluestacksの画面キャプチャテスト

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2024-10-25 | 初版作成 | - |

---

## 📚 参考資料

- [Gemma 3 Documentation](https://ai.google.dev/gemma)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Faster-Whisper GitHub](https://github.com/SYSTRAN/faster-whisper)
- [VoiceVox](https://voicevox.hiroshiba.jp/)
- [LangChain Documentation](https://python.langchain.com/)
