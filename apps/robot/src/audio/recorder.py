#!/usr/bin/env python3
"""
音声録音モジュール

基本的な音声録音機能を提供
"""

import sounddevice as sd
import scipy.io.wavfile as wav
import numpy as np
import sys
from typing import Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class AudioRecorder:
    """音声録音クラス"""
    
    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        """
        Args:
            sample_rate: サンプリングレート
            channels: チャンネル数
        """
        self.sample_rate = sample_rate
        self.channels = channels
    
    def record(self, duration: int, device: Optional[int] = None) -> Optional[np.ndarray]:
        """
        音声を録音
        
        Args:
            duration: 録音時間（秒）
            device: 使用するデバイスID
            
        Returns:
            録音データ、エラー時はNone
        """
        try:
            print(f"🎤 {duration}秒間の録音を開始します...")
            
            # オーディオデバイスの確認
            devices = sd.query_devices()
            if not devices:
                logger.error("オーディオデバイスが見つかりません")
                return None
            
            recording = sd.rec(
                int(duration * self.sample_rate),
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype='float32',
                device=device
            )
            sd.wait()
            print("✅ 録音完了")
            
            # データの検証
            if recording is None or len(recording) == 0:
                logger.error("録音データが無効です")
                return None
                
            return recording
            
        except sd.PortAudioError as e:
            logger.error(f"PortAudio エラー: {e}")
            print("オーディオデバイスの設定を確認してください")
            return None
        except Exception as e:
            logger.error(f"録音エラー: {e}")
            return None
    
    def save_recording(self, recording: np.ndarray, output_path: Path) -> bool:
        """
        録音データをファイルに保存
        
        Args:
            recording: 録音データ
            output_path: 出力ファイルパス
            
        Returns:
            成功時True
        """
        try:
            # 出力ディレクトリの確認
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # WAVファイルとして保存
            wav.write(str(output_path), self.sample_rate, 
                     (recording * 32767).astype(np.int16))
            print(f"✅ '{output_path}' に保存しました")
            return True
            
        except Exception as e:
            logger.error(f"保存エラー: {e}")
            return False
    
    def record_and_save(self, duration: int, output_path: Path, 
                       device: Optional[int] = None) -> bool:
        """
        録音してファイルに保存
        
        Args:
            duration: 録音時間（秒）
            output_path: 出力ファイルパス
            device: 使用するデバイスID
            
        Returns:
            成功時True
        """
        recording = self.record(duration, device)
        if recording is None:
            return False
        
        return self.save_recording(recording, output_path)


def main() -> None:
    """テスト用のメイン関数"""
    try:
        # デフォルト設定で録音
        recorder = AudioRecorder(sample_rate=48000, channels=2)
        output_path = Path("output.wav")
        
        success = recorder.record_and_save(
            duration=10,
            output_path=output_path
        )
        
        if not success:
            print("❌ 録音に失敗しました")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  録音を中断しました")
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()