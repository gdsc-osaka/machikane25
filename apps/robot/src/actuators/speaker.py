import json
import logging
import time
from pathlib import Path
from typing import Optional

import numpy as np
import requests
import sounddevice as sd
import wave

logger = logging.getLogger(__name__)

class VoiceVoxSpeaker:
    """たこまる君の音声出力システム"""
    
    def __init__(
        self,
        speaker_id: int = 3,  # デフォルトはずんだもんのノーマル
        base_url: str = "http://localhost:50021",
        speed_scale: float = 1.0,  # 通常の速度
        pitch_scale: float = 0.0,  # 標準の高さ
        intonation_scale: float = 1.0,  # 標準の抑揚
        volume_scale: float = 1.0,  # 音量倍率
        output_device: Optional[int] = 2
    ):
        self.speaker_id = speaker_id
        self.base_url = base_url
        self.speed_scale = speed_scale
        self.pitch_scale = pitch_scale
        self.intonation_scale = intonation_scale
        self.volume_scale = volume_scale
        self.output_device = output_device
        self.output_dir = Path(__file__).resolve().parents[2] / "temp"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # VoiceVox接続確認
        self._check_connection()
    
    def _check_connection(self):
        """VoiceVoxサーバーへの接続確認"""
        try:
            response = requests.get(f"{self.base_url}/speakers", timeout=3)
            response.raise_for_status()
            logger.info("VoiceVoxサーバーに接続しました")
        except Exception as e:
            logger.error(f"VoiceVoxサーバーへの接続に失敗: {e}")
            raise ConnectionError("VoiceVoxサーバーが起動していません")

    def check_connection(self) -> bool:
        """VoiceVoxサーバーへの接続確認（公開メソッド）"""
        try:
            response = requests.get(f"{self.base_url}/speakers", timeout=3)
            response.raise_for_status()
            return True
        except Exception:
            return False
    
    def speak(self, text: str, emotion: Optional[str] = None) -> bool:
        """テキストを音声で出力"""
        try:
            # 感情に応じてパラメータを調整
            speed_scale = self.speed_scale
            pitch_scale = self.pitch_scale
            
            if emotion == "excited":
                speed_scale = 1.1  # 少し早めに
                pitch_scale = 0.05  # わずかに高め
            elif emotion == "sad":
                speed_scale = 0.9  # ゆっくり
                pitch_scale = -0.1  # 低めの声
            elif emotion == "thinking":
                speed_scale = 0.95  # 少しゆっくり
            
            # 音声合成用クエリを作成
            query_response = requests.post(
                f"{self.base_url}/audio_query",
                params={"text": text, "speaker": self.speaker_id}
            )
            query_response.raise_for_status()
            query_data = query_response.json()
            
            # パラメータを調整
            query_data["speedScale"] = speed_scale
            query_data["pitchScale"] = pitch_scale
            query_data["intonationScale"] = self.intonation_scale
            query_data["volumeScale"] = self.volume_scale
            
            # 音声合成
            synthesis_response = requests.post(
                f"{self.base_url}/synthesis",
                headers={"Content-Type": "application/json"},
                params={"speaker": self.speaker_id},
                data=json.dumps(query_data)
            )
            synthesis_response.raise_for_status()
            
            # 音声データを再生
            audio_data = synthesis_response.content
            audio_file = self._save_audio(audio_data)
            self._play_audio(audio_file)
            
            logger.info(f"発話完了: {text}")
            return True
            
        except Exception as e:
            logger.error(f"音声合成エラー: {e}")
            return False
    
    def _save_audio(self, audio_data: bytes) -> Path:
        """音声データをファイルに保存"""
        timestamp = int(time.time() * 1000)
        file_path = self.output_dir / f"voicevox_{timestamp}.wav"
        with file_path.open("wb") as file:
            file.write(audio_data)
        logger.info("音声データを保存しました: %s", file_path)
        return file_path

    def _play_audio(self, file_path: Path):
        """音声データを再生"""
        try:
            with wave.open(str(file_path), 'rb') as wf:
                frames = wf.readframes(wf.getnframes())
                sample_width = wf.getsampwidth()
                dtype_map = {1: np.int8, 2: np.int16, 4: np.int32}
                dtype = dtype_map.get(sample_width)
                if dtype is None:
                    logger.error("サポートされないサンプル幅: %s", sample_width)
                    return

                audio_array = np.frombuffer(frames, dtype=dtype)
                channels = wf.getnchannels()
                if channels > 1:
                    audio_array = audio_array.reshape(-1, channels)

                sd.play(audio_array, samplerate=wf.getframerate(), device=self.output_device)
                sd.wait()
        except Exception as exc:
            logger.error("音声再生中にエラーが発生しました: %s", exc)
    
    def get_speakers(self):
        """利用可能なスピーカー一覧を取得"""
        response = requests.get(f"{self.base_url}/speakers")
        return response.json()
    
    def change_speaker(self, speaker_id: int):
        """スピーカーを変更"""
        self.speaker_id = speaker_id
        logger.info(f"スピーカーをID {speaker_id} に変更しました")

    def set_volume_scale(self, scale: float) -> None:
        """音量倍率を更新"""
        self.volume_scale = scale
        logger.info("VoiceVox volumeScale を %.2f に設定しました", scale)

    def speak_with_emotion(self, text: str, emotion: str = "normal") -> bool:
        """感情を込めて発話（brain.pyとの互換性のため）"""
        return self.speak(text, emotion)

    def speak_text(self, text: str) -> bool:
        """テキストを発話（brain.pyとの互換性のため）"""
        return self.speak(text, None)

if __name__ == "__main__":
    # 動作テスト
    logging.basicConfig(level=logging.INFO)
    
    speaker = VoiceVoxSpeaker()
    
    # 異なる感情での発話テスト
    test_phrases = [
        ("こんにちは！僕はたこまる君だよ！", "excited"),
        ("君は誰？名前を教えて！", None),
        ("えーっと、それはなんだろう...", "thinking"),
        ("また会えて嬉しいよ！", "excited"),
    ]
    
    for text, emotion in test_phrases:
        print(f"\n発話: {text} (感情: {emotion or 'normal'})")
        speaker.speak(text, emotion)
        time.sleep(0.5)
