# たこまる君 – シンプル統合版

VoiceVox を使った発話、Faster-Whisper での文字起こし、Gemma による画像理解を組み合わせた自律ロボットです。  
現在は「録音デーモン」と「自律本体」の 2 プロセスだけに整理されています。

---

## 📦 構成

```
apps/robot/
├── audio_recorder_daemon.py   # 録音デーモン（BlackHole 2ch から10秒ごとに録音して共有フォルダへ）
├── run_takamaru.py            # バナー付きラッパー（任意）
└── src/
    ├── main.py                # 自律モードのエントリーポイント
    ├── agent/brain.py         # たこまる君のメインループ
    ├── audio/
    │   ├── recorder.py        # 単発録音ヘルパー
    │   └── file_based_listener.py  # 文字起こしログ監視
    ├── vision/camera.py       # Rola Mini（BlueStacks）キャプチャ
    ├── vision/gemma_multimodal.py  # Gemma3:4b による画像解析
    ├── actuators/speaker.py   # VoiceVox 発話
    ├── rag/memory.py          # ChromaDB ベースの記憶
    ├── models/*.py            # 思考・記憶モデル
    └── common/*.py            # 設定・例外
```

不要だった旧モジュール（voice_chat、multimodal_chat、devices、legacy など）は削除済みです。

---

## 🔧 セットアップ

1. 依存ライブラリ
   ```bash
   pip install -r requirements.txt
   ```

2. 外部アプリ
   - VoiceVox（ポート `50021`）
   - Ollama + Gemma3 モデル（`ollama serve` → `ollama pull gemma3:4b`）
   - BlueStacks 上で Rola Mini を起動（ADB デバッグ有効）
   - BlackHole 2ch（macOS 仮想オーディオデバイス）
   - Android Platform Tools（`adb`）

---

## 🚀 起動手順

1. **録音デーモンを起動**
   ```bash
   python audio_recorder_daemon.py
   ```
   - 10 秒ごとに `data/shared_audio/` へ `audio_*.wav` を出力します。
   - 無音（RMS < 0.01）のファイルは破棄されます。

2. **たこまる君本体を起動**
   ```bash
   python -m src.main
   ```
   もしくはバナー付きラッパー:
   ```bash
   python run_takamaru.py
   ```

3. **起動チェック**
   - `adb devices` に `emulator-5554`（または設定した ID）が表示される
   - ターミナルに「📸 画像保存」や「✅ ファイルベースリスニングシステム初期化完了」が出力される
   - `audio_recorder_daemon` のログに `💾 保存完了` が出ている

---

## 🧩 設定

- `config.json`  
  ```json
{
  "bluestacks": {
    "device_id": "emulator-5554"
  },
  "voicevox": {
    "volume_scale": 0.8
  }
}
  ```
  必要に応じて ADB のデバイス ID を変更してください。
  VoiceVox の音量を下げたい場合は `voicevox.volume_scale` を 0〜1 の範囲で調整します（1 が標準）。速度やピッチも同様に設定できます。

- 共有ディレクトリは `data/shared_audio/`（自動作成）。  
  録音デーモンが `transcriptions.log` に文字起こしを追記し、本体は最新ログを取り込みます。

---

## 🛠️ トラブルシュート

- **ADB 接続エラー**  
  `adb connect emulator-5554` → `adb devices` で確認。  
  `config.json` の `device_id` と一致させる。

- **VoiceVox が応答しない**  
  `curl http://localhost:50021/version` で確認。起動していない場合は VoiceVox を再起動。

- **Gemma の警告**  
  `huggingface/tokenizers` の並列化警告は `TOKENIZERS_PARALLELISM=false`（`src/main.py` で既定）で抑止済み。

- **音声が拾えない**  
  `audio_recorder_daemon` の RMS 値を確認し、BlackHole 2ch をデフォルト出力に設定する。

---

## 📚 関連スクリプト

- `manage_rag_memory.py` – 記憶の追加・検索ツール
- `check_voicevox.py`, `check_audio_devices.py` – 動作確認用ユーティリティ

必要に応じて利用してください。コア運用は上記 2 プロセスのみです。
