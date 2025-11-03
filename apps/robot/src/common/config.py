#!/usr/bin/env python3
"""
設定管理モジュール

アプリケーション全体の設定を管理
"""

import os
from pathlib import Path
from typing import Dict, Any
import json


class Config:
    """設定管理クラス"""
    
    # デフォルト設定
    DEFAULT_SETTINGS = {
        # 音声設定
        "audio": {
            "sample_rate": 16000,
            "channels": 1,
            "recording_duration": 5,
            "whisper_model": "base"
        },

        # VoiceVox設定
        "voicevox": {
            "speaker_id": 3,
            "volume_scale": 1.0,
            "speed_scale": 1.0,
            "pitch_scale": 0.0,
            "intonation_scale": 1.0
        },
        
        # API設定
        "api": {
            "ollama_url": "http://localhost:11434/api/generate",
            "llava_url": "http://localhost:11434/api/generate",
            "model": "gemma3:4b",
            "vision_model": "gemma3:4b",
            "timeout": 30
        },
        
        # OpenAI API設定（オプション）
        "openai": {
            "api_key": "",  # 環境変数 OPENAI_API_KEY からも読み取り可能
            "model": "gpt-4-vision-preview"
        },
        
        # BlueStacks設定
        "bluestacks": {
            "device_id": "127.0.0.1:5555",
            "adb_timeout": 10,
            "crop_camera_view": True,  # カメラビュー部分だけを切り取る
            "camera_crop_top": 0.10,   # 上部から切り取る割合（上部10%除去）
            "camera_crop_bottom": 0.37,  # 下部まで切り取る割合（上部37%まで）
            "camera_crop_left": 0.05,  # 左から切り取る割合（左5%除去）
            "camera_crop_right": 0.95  # 右まで切り取る割合（右5%除去）
        },
        
        # ファイルパス設定
        "paths": {
            "data_dir": "data",
            "audio_dir": "data/audio",
            "screenshots_dir": "data/screenshots",
            "temp_dir": "temp"
        }
    }
    
    def __init__(self, config_file: str = "config.json"):
        """
        Args:
            config_file: 設定ファイルのパス
        """
        self.config_file = Path(config_file)
        self.settings = self.DEFAULT_SETTINGS.copy()
        self.load_config()
    
    def load_config(self) -> None:
        """設定ファイルから設定を読み込み"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    loaded_settings = json.load(f)
                    self._merge_settings(loaded_settings)
            except Exception as e:
                print(f"設定ファイル読み込みエラー: {e}")
    
    def save_config(self) -> None:
        """設定をファイルに保存"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.settings, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"設定ファイル保存エラー: {e}")
    
    def _merge_settings(self, new_settings: Dict[str, Any]) -> None:
        """設定をマージ"""
        def merge_dict(base: Dict, new: Dict) -> Dict:
            result = base.copy()
            for key, value in new.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = merge_dict(result[key], value)
                else:
                    result[key] = value
            return result
        
        self.settings = merge_dict(self.settings, new_settings)
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        設定値を取得
        
        Args:
            key_path: ドット区切りのキーパス (例: "audio.sample_rate")
            default: デフォルト値
            
        Returns:
            設定値
        """
        # 特別な処理: OpenAI APIキーは環境変数からも取得
        if key_path == "openai.api_key":
            env_key = os.getenv("OPENAI_API_KEY")
            if env_key:
                return env_key
        
        keys = key_path.split('.')
        value = self.settings
        
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key_path: str, value: Any) -> None:
        """
        設定値を変更
        
        Args:
            key_path: ドット区切りのキーパス
            value: 設定値
        """
        keys = key_path.split('.')
        current = self.settings
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    def get_audio_config(self) -> Dict[str, Any]:
        """音声設定を取得"""
        return self.settings["audio"]
    
    def get_api_config(self) -> Dict[str, Any]:
        """API設定を取得"""
        return self.settings["api"]
    
    def get_bluestacks_config(self) -> Dict[str, Any]:
        """BlueStacks設定を取得"""
        return self.settings["bluestacks"]
    
    def get_paths_config(self) -> Dict[str, Any]:
        """パス設定を取得"""
        return self.settings["paths"]

    def get_voicevox_config(self) -> Dict[str, Any]:
        """VoiceVox設定を取得"""
        return self.settings.get("voicevox", {})
    
    def ensure_directories(self) -> None:
        """必要なディレクトリを作成"""
        paths = self.get_paths_config()
        for path_key, path_value in paths.items():
            path = Path(path_value)
            path.mkdir(parents=True, exist_ok=True)


# グローバル設定インスタンス
_config = None

def get_config() -> Config:
    """グローバル設定インスタンスを取得"""
    global _config
    if _config is None:
        _config = Config()
    return _config
