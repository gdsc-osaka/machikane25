#!/usr/bin/env python3
"""
思考データモデル

たこまる君の思考プロセスを表現
"""

from dataclasses import dataclass
from typing import Optional
import uuid


@dataclass
class Thought:
    """たこまる君の思考を表すデータクラス"""
    
    thought: str                    # 内心の思考
    should_respond: bool           # 発話すべきか
    response: str                  # 発話内容
    emotion: str                   # 感情
    should_remember: bool          # 記憶すべきか
    reason: str                    # 行動の理由
    movement: Optional[str] = None # ロボットの移動指示（forward/backward/left/right/stop など）
    
    # メタデータ
    id: str = None
    timestamp: Optional[str] = None
    confidence: float = 1.0        # 判断の確信度
    
    def __post_init__(self):
        """初期化後処理"""
        if self.id is None:
            self.id = str(uuid.uuid4())
        
        if self.timestamp is None:
            from datetime import datetime
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> dict:
        """辞書形式に変換"""
        return {
            "id": self.id,
            "thought": self.thought,
            "should_respond": self.should_respond,
            "response": self.response,
            "emotion": self.emotion,
            "should_remember": self.should_remember,
            "reason": self.reason,
            "movement": self.movement,
            "timestamp": self.timestamp,
            "confidence": self.confidence
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Thought':
        """辞書から作成"""
        return cls(
            thought=data.get("thought", ""),
            should_respond=data.get("should_respond", False),
            response=data.get("response", ""),
            emotion=data.get("emotion", "neutral"),
            should_remember=data.get("should_remember", False),
            reason=data.get("reason", ""),
            movement=data.get("movement"),
            id=data.get("id"),
            timestamp=data.get("timestamp"),
            confidence=data.get("confidence", 1.0)
        )
    
    def is_interactive(self) -> bool:
        """インタラクティブな思考か（人との会話など）"""
        interactive_emotions = ["excited", "happy", "curious", "surprised"]
        return self.emotion in interactive_emotions
    
    def is_autonomous(self) -> bool:
        """自律的な思考か（独り言など）"""
        return not self.is_interactive()
    
    def __str__(self) -> str:
        """文字列表現"""
        return f"Thought(emotion={self.emotion}, response='{self.response[:50]}...', should_respond={self.should_respond})"
