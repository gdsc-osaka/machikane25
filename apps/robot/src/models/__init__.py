"""
データモデル

たこまる君の思考、記憶、経験を表現するデータクラス
"""

from .thought import Thought
from .memory import Memory, MemoryType, EmotionType

__all__ = ["Thought", "Memory", "MemoryType", "EmotionType"]