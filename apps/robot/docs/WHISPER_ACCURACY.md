# Whisper文字起こし精度改善ガイド

## 概要

Faster-Whisperを使用した音声認識の精度を向上させるための設定と最適化手法をまとめたドキュメントです。

## 改善内容

### 1. モデルサイズのアップグレード

**変更前**: `base` モデル（デフォルト）
**変更後**: `medium` モデル

```python
# 精度とサイズのトレードオフ
# base:   小さい、高速、精度低い（74MB）
# small:  中サイズ、やや高速、精度中（244MB）
# medium: 大きい、やや遅い、精度高い（769MB）
# large:  最大、遅い、精度最高（1.5GB）
```

**推奨設定**:
- CPU環境: `medium`（精度と速度のバランス）
- GPU環境: `large`（最高精度）
- リアルタイム性重視: `small`（高速処理）

### 2. GPU対応と計算精度の最適化

```python
import torch

if torch.cuda.is_available():
    device = "cuda"
    compute_type = "float16"  # GPU: 高精度
else:
    device = "cpu"
    compute_type = "int8"     # CPU: 量子化で高速化
```

**compute_typeの選択**:
- `float32`: 最高精度、遅い
- `float16`: GPU推奨、高精度で高速
- `int8`: CPU推奨、精度と速度のバランス
- `int8_float16`: ハイブリッド型

### 3. 並列処理の有効化

```python
WhisperModel(
    model_size,
    device=device,
    compute_type=compute_type,
    num_workers=2  # 並列ワーカー数
)
```

**num_workersの設定**:
- `1`: シングルスレッド（デフォルト）
- `2-4`: マルチコアCPUで高速化
- CPU数を超える値は非推奨

### 4. 文字起こしパラメータの最適化

```python
segments, info = whisper_model.transcribe(
    audio_file,
    beam_size=10,           # ビームサーチ幅（5→10で精度向上）
    best_of=5,              # 候補数を増やす
    language="ja",          # 日本語に特化
    vad_filter=True,        # 音声区間検出を有効化
    vad_parameters=dict(
        min_silence_duration_ms=500,  # 無音検出の調整
        threshold=0.5
    ),
    temperature=0.0,        # 確定的な出力（ランダム性を排除）
    compression_ratio_threshold=2.4,
    log_prob_threshold=-1.0,
    no_speech_threshold=0.6
)
```

### パラメータ解説

#### beam_size
- **デフォルト**: 5
- **推奨**: 10（精度重視）
- **説明**: ビームサーチの幅。大きいほど精度が上がるが処理時間も増える

#### best_of
- **デフォルト**: 5
- **説明**: 候補を複数生成して最良のものを選択

#### temperature
- **デフォルト**: 0.0
- **範囲**: 0.0 - 1.0
- **説明**: 0.0で確定的な出力、1.0でランダム性が高い

#### vad_filter
- **デフォルト**: False
- **推奨**: True
- **説明**: 音声区間のみを処理して精度向上

#### vad_parameters
- `min_silence_duration_ms`: 無音と判定する最小時間（ミリ秒）
- `threshold`: 音声と判定する閾値（0.0-1.0）

## 実装場所

### 1. brain.py (メインロボット制御)
- [brain.py:492-519](../src/agent/brain.py#L492-L519)
- たこまる君の音声認識部分

### 2. voice_chat.py (音声会話システム)
- [voice_chat.py:85-107](../src/audio/voice_chat.py#L85-L107) - 初期化部分
- [voice_chat.py:158-174](../src/audio/voice_chat.py#L158-L174) - 文字起こし部分

## テスト方法

### 1. 精度テストスクリプトの実行

```bash
cd /Users/litchi/Documents/machikane25/apps/robot
python3 test_whisper_accuracy.py
```

このスクリプトでは:
1. 音声を録音（5秒）
2. 文字起こしを実行
3. 結果を評価（1-5段階）
4. 繰り返しテスト可能

### 2. 実際の会話システムでテスト

```bash
# 音声会話システムを起動
python3 src/audio/voice_chat.py
```

### 3. たこまる君全体でテスト

```bash
# ロボットシステム全体を起動
python3 src/main.py
```

## パフォーマンスと精度のトレードオフ

| 設定 | モデル | compute_type | beam_size | 処理時間 | 精度 |
|------|--------|--------------|-----------|---------|------|
| 最速 | base | int8 | 5 | ~1秒 | ★★☆☆☆ |
| バランス | medium | int8 | 10 | ~3秒 | ★★★★☆ |
| 高精度 | large | float16 | 10 | ~5秒 | ★★★★★ |

## トラブルシューティング

### 問題1: 文字起こしが空になる

**原因**:
- 音声が小さすぎる
- マイク設定が間違っている
- 環境ノイズが大きい

**解決策**:
1. マイク音量を上げる
2. `no_speech_threshold`を下げる（0.6→0.4）
3. 静かな環境でテスト

### 問題2: 精度が低い

**原因**:
- モデルサイズが小さい
- beam_sizeが小さい
- 滑舌が不明瞭

**解決策**:
1. モデルを`medium`または`large`に変更
2. `beam_size`を増やす（10→15）
3. はっきりと話す

### 問題3: 処理が遅い

**原因**:
- モデルサイズが大きすぎる
- beam_sizeが大きすぎる
- CPU性能が低い

**解決策**:
1. モデルを`small`または`base`に変更
2. `beam_size`を減らす（10→5）
3. GPU環境を使用

### 問題4: GPUが使われない

**確認方法**:
```python
import torch
print(f"CUDA利用可能: {torch.cuda.is_available()}")
print(f"GPUデバイス数: {torch.cuda.device_count()}")
```

**解決策**:
1. PyTorch GPU版をインストール
```bash
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## さらなる改善案

### 1. ポストプロセッシング

```python
def clean_transcription(text: str) -> str:
    """文字起こし結果のクリーニング"""
    # よくある誤変換を修正
    replacements = {
        "じいでぃーしー": "GDGOC",
        "じぇみに": "Gemini",
        # 必要に応じて追加
    }
    for wrong, correct in replacements.items():
        text = text.replace(wrong, correct)
    return text
```

### 2. 言語モデルでの修正

文字起こし結果をGemini等のLLMに渡して、文法や文脈を考慮した修正を行う。

### 3. カスタム辞書の追加

Whisperは固有名詞が苦手なため、専門用語や固有名詞の辞書を作成して後処理で修正。

## ログ確認

文字起こしの精度を継続的に監視するため、ログを確認:

```bash
# 最新の音声会話ログを確認
cat data/voice_chat_logs/interaction_*.json | tail -n 1 | jq .

# user_inputフィールドに文字起こし結果が記録される
jq '.user_input' data/voice_chat_logs/interaction_*.json
```

## 参考リンク

- [Faster-Whisper公式ドキュメント](https://github.com/SYSTRAN/faster-whisper)
- [OpenAI Whisper公式](https://github.com/openai/whisper)
- [日本語音声認識のベストプラクティス](https://github.com/openai/whisper/discussions/categories/q-a)

## まとめ

文字起こし精度を向上させるための主な変更:

1. ✅ モデルサイズ: `base` → `medium`
2. ✅ GPU対応: `device="cuda"` + `compute_type="float16"`
3. ✅ 並列処理: `num_workers=2`
4. ✅ ビームサーチ: `beam_size=10`
5. ✅ VADフィルタ: `vad_filter=True`
6. ✅ 確定的出力: `temperature=0.0`

これらの設定により、日本語音声認識の精度が大幅に向上します。
