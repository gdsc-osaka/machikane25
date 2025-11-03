#!/usr/bin/env python3
"""
例外定義モジュール

アプリケーション固有の例外クラスを定義
"""


class RobotError(Exception):
    """ロボット制御システムの基底例外クラス"""
    pass


class AudioError(RobotError):
    """音声処理関連のエラー"""
    pass


class VisionError(RobotError):
    """画像処理・カメラ関連のエラー"""
    pass


class DeviceError(RobotError):
    """デバイス制御関連のエラー"""
    pass


class ConfigError(RobotError):
    """設定関連のエラー"""
    pass


class APIError(RobotError):
    """API通信関連のエラー"""
    pass


class InitializationError(RobotError):
    """初期化関連のエラー"""
    pass