#!/usr/bin/env python3
"""
音声録音デーモン

BlackHole 2ch から音声を録音し、その場で文字起こししてログに追記します。
たこまる君のメインプロセスとは別に、ユーザーが直接ターミナルから実行してください。
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import scipy.io.wavfile as wav

sys.path.insert(0, str(Path(__file__).parent / "src"))

from audio.recorder import AudioRecorder

try:
    from faster_whisper import WhisperModel
except ImportError as import_error:  # pragma: no cover
    raise SystemExit("faster-whisper が見つかりません。`pip install faster-whisper` を実行してください。") from import_error


# 設定
SHARED_AUDIO_DIR = Path("data/shared_audio")
TRANSCRIPTION_LOG = SHARED_AUDIO_DIR / "transcriptions.log"
RECORDING_DURATION = 10  # 秒
DEVICE_ID = 1  # BlackHole 2ch (デフォルト)
WHISPER_MODEL_SIZE = "medium"


def initialize_whisper() -> WhisperModel:
    """Whisper モデルを初期化して返す。"""
    device = "cpu"
    compute_type = "int8"

    try:
        import torch

        if torch.cuda.is_available():
            device = "cuda"
            compute_type = "float16"
            print("🚀 GPU検出: Whisper を CUDA で実行します")
    except ImportError:
        pass

    print(f"🔄 Whisperモデル ({WHISPER_MODEL_SIZE}) をロード中...")
    model = WhisperModel(
        WHISPER_MODEL_SIZE,
        device=device,
        compute_type=compute_type,
        num_workers=2,
    )
    print("✅ Whisperモデルロード完了")
    return model


def transcribe_audio(model: WhisperModel, wav_path: Path) -> Optional[str]:
    """録音済みの WAV ファイルを文字起こししてテキストを返す。"""
    try:
        segments, _ = model.transcribe(
            str(wav_path),
            beam_size=10,
            best_of=5,
            language="ja",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500, threshold=0.5),
            temperature=0.0,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
        )
        text = " ".join(segment.text for segment in segments).strip()
        return text or None
    except Exception as exc:  # pragma: no cover - ログ出力にフォールバック
        print(f"⚠️ 文字起こしエラー: {exc}")
        return None


def append_transcription_log(cycle: int, timestamp: datetime, text: str, rms: float) -> None:
    """文字起こし結果をログファイルに追記する。"""
    entry = {
        "timestamp": timestamp.isoformat(),
        "cycle": cycle,
        "transcript": text,
        "rms": rms,
    }
    TRANSCRIPTION_LOG.parent.mkdir(parents=True, exist_ok=True)
    with TRANSCRIPTION_LOG.open("a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(entry, ensure_ascii=False))
        log_file.write("\n")


def main():
    """メイン関数"""
    print("=" * 70)
    print("🎙️ 音声録音・文字起こしデーモン")
    print("=" * 70)
    print(f"\n設定:")
    print(f"  録音時間: {RECORDING_DURATION}秒")
    print(f"  デバイスID: {DEVICE_ID}")
    print(f"  保存先: {SHARED_AUDIO_DIR}")
    print(f"  文字起こしログ: {TRANSCRIPTION_LOG}")
    # ディレクトリ準備
    SHARED_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n✅ 共有ディレクトリ作成: {SHARED_AUDIO_DIR.absolute()}")

    # 古い録音ファイルのみ削除（ログは保持）
    for old_file in SHARED_AUDIO_DIR.glob("audio_*.wav"):
        old_file.unlink()
    print("✅ 古い録音ファイルをクリア")

    TRANSCRIPTION_LOG.touch(exist_ok=True)

    recorder = AudioRecorder(sample_rate=48000, channels=2)
    print("✅ AudioRecorder初期化完了")

    whisper_model = initialize_whisper()

    print("\n" + "=" * 70)
    print("🚀 録音 + 文字起こし開始")
    print("=" * 70)
    print("\n💡 このウィンドウを開いたまま、別ターミナルでたこまる君を起動してください")
    print("💡 終了するには Ctrl+C を押してください\n")

    cycle = 0

    try:
        while True:
            cycle += 1
            timestamp = datetime.now()
            print(f"\n{'=' * 70}")
            print(f"🎤 録音サイクル {cycle} ({timestamp.strftime('%H:%M:%S')})")
            print(f"{'=' * 70}")

            print(f"⏺️  {RECORDING_DURATION}秒間録音中...")
            recording = recorder.record(duration=RECORDING_DURATION, device=DEVICE_ID)

            if recording is None or len(recording) == 0:
                print("⚠️ 録音失敗 - スキップ")
                continue

            rms = float(np.sqrt(np.mean(recording**2)))
            print(f"📊 RMS音量: {rms:.6f}")

            filename = f"audio_{timestamp.strftime('%Y%m%d_%H%M%S_%f')}.wav"
            wav_path = SHARED_AUDIO_DIR / filename

            wav.write(str(wav_path), recorder.sample_rate, (recording * 32767).astype(np.int16))
            print(f"💾 録音保存: {filename}")

            text = transcribe_audio(whisper_model, wav_path)
            if text:
                append_transcription_log(cycle, timestamp, text, rms)
                print(f"✅ 文字起こし: 「{text}」")
            else:
                print("⚠️ 文字起こし結果が空でした")

            # WAVファイルはログに残した後で削除
            try:
                wav_path.unlink()
                print(f"🗑️ 録音ファイル削除: {filename}")
            except FileNotFoundError:
                pass

            time.sleep(0.2)

    except KeyboardInterrupt:
        print("\n\n" + "=" * 70)
        print("🛑 録音デーモン停止")
        print("=" * 70)
        print(f"総録音サイクル数: {cycle}")
        print("✅ 正常終了")


if __name__ == "__main__":
    main()
