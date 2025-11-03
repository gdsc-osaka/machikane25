"""
共通ユーティリティモジュール

設定管理、例外定義、その他の共通機能を提供
"""

from .config import Config, get_config
from .exceptions import RobotError, AudioError, VisionError, DeviceError

__all__ = ["Config", "get_config", "RobotError", "AudioError", "VisionError", "DeviceError"]