"""
Rola Mini Robot Control System

音声認識とBlueStacksエミュレータを使用したロボット制御システム
"""

__version__ = "1.0.0"
__author__ = "Robot Team"

from . import audio
from . import vision
from . import common

__all__ = ["audio", "vision", "common"]
