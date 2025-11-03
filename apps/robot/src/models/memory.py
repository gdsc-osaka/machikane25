#!/usr/bin/env python3
"""
記憶データモデル

たこまる君の記憶・経験を表現
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid
import numpy as np


@dataclass
class Memory:
    """たこまる君の記憶を表すデータクラス"""
    
    content: str                           # 記憶の内容
    memory_type: str                       # 記憶の種類
    emotion: str = "neutral"               # その時の感情
    timestamp: Optional[str] = None        # 記憶した時刻
    
    # 関連データ
    image_data: Optional[np.ndarray] = None    # 画像データ
    audio_data: Optional[str] = None           # 音声データ
    metadata: Dict[str, Any] = field(default_factory=dict)  # メタデータ
    
    # 記憶の重要度・アクセス情報
    importance: float = 1.0                # 重要度 (0.0-1.0)
    access_count: int = 0                  # アクセス回数
    last_accessed: Optional[str] = None    # 最後にアクセスした時刻
    
    # 識別子
    id: str = None
    tags: List[str] = field(default_factory=list)  # タグ
    
    def __post_init__(self):
        """初期化後処理"""
        if self.id is None:
            self.id = str(uuid.uuid4())
        
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
        
        # 画像データがある場合はタグに追加
        if self.image_data is not None:
            if "image" not in self.tags:
                self.tags.append("image")
        
        # 音声データがある場合はタグに追加
        if self.audio_data:
            if "audio" not in self.tags:
                self.tags.append("audio")
    
    def to_dict(self, include_image: bool = False) -> Dict[str, Any]:
        """辞書形式に変換"""
        data = {
            "id": self.id,
            "content": self.content,
            "memory_type": self.memory_type,
            "emotion": self.emotion,
            "timestamp": self.timestamp,
            "importance": self.importance,
            "access_count": self.access_count,
            "last_accessed": self.last_accessed,
            "tags": self.tags,
            "metadata": self.metadata
        }
        
        # 画像データは大きいので、明示的に要求された場合のみ含める
        if include_image and self.image_data is not None:
            data["has_image"] = True
            # 実際の実装では、画像は別途保存し、ファイルパスのみ記録
        else:
            data["has_image"] = self.image_data is not None
        
        if self.audio_data:
            data["audio_data"] = self.audio_data
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Memory':
        """辞書から作成"""
        return cls(
            content=data.get("content", ""),
            memory_type=data.get("memory_type", "general"),
            emotion=data.get("emotion", "neutral"),
            timestamp=data.get("timestamp"),
            audio_data=data.get("audio_data"),
            metadata=data.get("metadata", {}),
            importance=data.get("importance", 1.0),
            access_count=data.get("access_count", 0),
            last_accessed=data.get("last_accessed"),
            id=data.get("id"),
            tags=data.get("tags", [])
            # image_dataは別途処理が必要
        )
    
    def access(self) -> None:
        """記憶にアクセスした際の処理"""
        self.access_count += 1
        self.last_accessed = datetime.now().isoformat()
        
        # アクセス回数に応じて重要度を微調整
        if self.access_count > 1:
            self.importance = min(1.0, self.importance + 0.1)
    
    def decay(self, decay_rate: float = 0.01) -> None:
        """記憶の減衰処理"""
        if self.access_count == 0:  # アクセスされていない記憶は減衰
            self.importance = max(0.0, self.importance - decay_rate)
    
    def is_important(self) -> bool:
        """重要な記憶かどうか"""
        return self.importance > 0.7
    
    def is_recent(self, hours: int = 24) -> bool:
        """最近の記憶かどうか"""
        if not self.timestamp:
            return False
        
        try:
            memory_time = datetime.fromisoformat(self.timestamp)
            current_time = datetime.now()
            delta = current_time - memory_time
            return delta.total_seconds() < (hours * 3600)
        except:
            return False
    
    def has_emotion(self, emotions: List[str]) -> bool:
        """指定した感情を含むか"""
        return self.emotion in emotions
    
    def add_tag(self, tag: str) -> None:
        """タグを追加"""
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str) -> None:
        """タグを削除"""
        if tag in self.tags:
            self.tags.remove(tag)
    
    def has_tag(self, tag: str) -> bool:
        """タグを持つか"""
        return tag in self.tags
    
    def similarity_score(self, other: 'Memory') -> float:
        """他の記憶との類似度を計算（簡易版）"""
        score = 0.0
        
        # タグの類似度
        common_tags = set(self.tags) & set(other.tags)
        if self.tags and other.tags:
            tag_similarity = len(common_tags) / max(len(self.tags), len(other.tags))
            score += tag_similarity * 0.3
        
        # 感情の類似度
        if self.emotion == other.emotion:
            score += 0.2
        
        # 記憶タイプの類似度
        if self.memory_type == other.memory_type:
            score += 0.2
        
        # 時間の近さ（24時間以内なら加点）
        if self.is_recent() and other.is_recent():
            score += 0.3
        
        return min(1.0, score)
    
    def __str__(self) -> str:
        """文字列表現"""
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"Memory(type={self.memory_type}, emotion={self.emotion}, content='{content_preview}')"
    
    def __repr__(self) -> str:
        """詳細文字列表現"""
        return (f"Memory(id={self.id[:8]}, type={self.memory_type}, "
               f"emotion={self.emotion}, importance={self.importance:.2f}, "
               f"access_count={self.access_count})")


class MemoryType:
    """記憶タイプの定数"""
    
    INTERACTION = "interaction"     # 人との会話
    OBSERVATION = "observation"     # 観察した内容
    THOUGHT = "thought"            # 内心の思考
    LEARNING = "learning"          # 学習した知識
    EXPERIENCE = "experience"      # 体験・経験
    SYSTEM = "system"             # システム情報
    
    @classmethod
    def all_types(cls) -> List[str]:
        """全ての記憶タイプを取得"""
        return [cls.INTERACTION, cls.OBSERVATION, cls.THOUGHT, 
                cls.LEARNING, cls.EXPERIENCE, cls.SYSTEM]


class EmotionType:
    """感情タイプの定数"""
    
    EXCITED = "excited"       # 興奮
    HAPPY = "happy"          # 幸せ
    CURIOUS = "curious"      # 好奇心
    SURPRISED = "surprised"  # 驚き
    BORED = "bored"         # 退屈
    CONFUSED = "confused"    # 困惑
    LONELY = "lonely"       # 寂しい
    NEUTRAL = "neutral"     # 中性
    
    @classmethod
    def positive_emotions(cls) -> List[str]:
        """ポジティブな感情"""
        return [cls.EXCITED, cls.HAPPY, cls.CURIOUS, cls.SURPRISED]
    
    @classmethod
    def negative_emotions(cls) -> List[str]:
        """ネガティブな感情"""
        return [cls.BORED, cls.CONFUSED, cls.LONELY]