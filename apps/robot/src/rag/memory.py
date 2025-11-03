#!/usr/bin/env python3
"""
RAGメモリシステム

ChromaDBを使用した長期・短期記憶の管理
"""

import asyncio
import os
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("⚠️ ChromaDBがインストールされていません。pip install chromadb")

try:
    from ..models import Memory, MemoryType
    from ..common.config import get_config
except ImportError:
    # スタンドアロン実行の場合
    from models.memory import Memory, MemoryType, EmotionType
    from common.config import get_config

logger = logging.getLogger(__name__)


class MemorySystem:
    """たこまる君の記憶システム"""
    
    def __init__(self):
        """初期化"""
        self.config = get_config()
        self.client = None
        self.long_term_collection = None   # 長期記憶（大学情報、性格など）
        self.short_term_collection = None  # 短期記憶（経験、会話）
        
        # メモリ内キャッシュ
        self.recent_memories: List[Memory] = []
        self.max_cache_size = 100
    
    async def initialize(self) -> bool:
        """ChromaDBの初期化"""
        if not CHROMADB_AVAILABLE:
            print("❌ ChromaDBが利用できません。メモリ内記憶のみで動作します")
            return True  # メモリ内のみで継続
        
        try:
            # データディレクトリの確保
            data_dir = Path("data/chroma_db")
            data_dir.mkdir(parents=True, exist_ok=True)
            
            # ChromaDBクライアント初期化
            self.client = chromadb.PersistentClient(
                path=str(data_dir),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # コレクション取得または作成
            self.long_term_collection = self._get_or_create_collection(
                "long_term_memory", 
                "大阪大学、GDGOC、たこまる君の基本情報"
            )
            
            self.short_term_collection = self._get_or_create_collection(
                "short_term_memory",
                "日々の経験、会話、観察記録"
            )
            
            # 初期データの投入（長期記憶）
            await self._initialize_long_term_memory()
            
            print("✅ 記憶システム（ChromaDB）初期化完了")
            return True
            
        except Exception as e:
            logger.error(f"ChromaDB初期化エラー: {e}")
            print(f"⚠️ ChromaDB初期化失敗: {e}")
            print("   メモリ内記憶のみで動作します")
            return True  # フォールバック
    
    def _get_or_create_collection(self, name: str, description: str):
        """コレクションを取得または作成"""
        try:
            # 既存コレクションを取得
            return self.client.get_collection(name)
        except Exception:
            # 新規作成
            return self.client.create_collection(
                name=name,
                metadata={"description": description}
            )
    
    async def _initialize_long_term_memory(self) -> None:
        """長期記憶の初期データ投入"""
        try:
            # 既存データがある場合はスキップ
            if self.long_term_collection.count() > 0:
                print("📚 既存の長期記憶データを発見しました")
                return
            
            print("📚 長期記憶を初期化中...")
            
            # 大阪大学情報
            osaka_univ_info = """
大阪大学は、大阪府吹田市に本部を置く国立大学です。
1931年に大阪帝国大学として設立されました。

キャンパス:
- 吹田キャンパス
- 豊中キャンパス  
- 箕面キャンパス

学部: 文学部、人間科学部、外国語学部、法学部、経済学部、
      理学部、医学部、歯学部、薬学部、工学部、基礎工学部
"""
            
            # GDGOC情報
            gdgoc_info = """
GDGOC (Google Developers Group On Campus) は、
Google が支援する大学内の学生開発者コミュニティです。

活動内容:
- ハッカソン
- 勉強会
- プロジェクト開発
- Google技術の学習

大阪大学のGDGOCでは、この「たこまる君」プロジェクトを
文化祭で展示しています。
"""
            
            # たこまる君のプロフィール
            personality_info = """
名前: たこまる君

性格:
- 好奇心旺盛で、新しいものが大好き
- 人懐っこく、誰とでも仲良くなれる
- 見たこと、聞いたことをすぐに覚える
- ちょっと天然で、可愛らしい

好きなもの:
- 珍しいもの
- 新しい友達
- 面白い話

苦手なもの:
- 静かすぎる場所 (寂しい)
- 難しい質問 (でも頑張って考える)

口癖:
- "わあ!"
- "初めて見た!"
- "覚えたよ!"
"""
            
            # データ投入
            initial_memories = [
                {
                    "id": "osaka_univ",
                    "content": osaka_univ_info,
                    "type": "knowledge",
                    "tags": ["大阪大学", "基本情報"]
                },
                {
                    "id": "gdgoc",
                    "content": gdgoc_info,
                    "type": "knowledge", 
                    "tags": ["GDGOC", "活動"]
                },
                {
                    "id": "personality",
                    "content": personality_info,
                    "type": "self_knowledge",
                    "tags": ["自分", "性格", "プロフィール"]
                }
            ]
            
            # ChromaDBに投入
            self.long_term_collection.add(
                documents=[mem["content"] for mem in initial_memories],
                metadatas=[{
                    "type": mem["type"],
                    "tags": ",".join(mem["tags"])
                } for mem in initial_memories],
                ids=[mem["id"] for mem in initial_memories]
            )
            
            print("✅ 長期記憶の初期化完了")
            
        except Exception as e:
            logger.error(f"長期記憶初期化エラー: {e}")
    
    async def add_memory(
        self,
        content: str,
        memory_type: str = "observation",
        importance: float = 0.5,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """互換用ラッパ: シンプルなパラメータで記憶を保存"""
        memory = Memory(
            content=content,
            memory_type=memory_type,
            importance=importance,
            tags=tags or [],
            metadata=metadata or {},
        )
        return await self.store_memory(memory)

    async def store_memory(self, memory: Memory) -> bool:
        """記憶を保存"""
        try:
            # メモリ内キャッシュに追加
            self.recent_memories.append(memory)
            
            # キャッシュサイズ制限
            if len(self.recent_memories) > self.max_cache_size:
                self.recent_memories.pop(0)
            
            # ChromaDBに保存（利用可能な場合）
            if self.short_term_collection:
                await self._store_to_chromadb(memory)
            
            return True
            
        except Exception as e:
            logger.error(f"記憶保存エラー: {e}")
            return False
    
    async def _store_to_chromadb(self, memory: Memory) -> None:
        """ChromaDBに記憶を保存"""
        try:
            # メタデータ準備
            metadata = memory.metadata.copy()
            metadata.update({
                "memory_type": memory.memory_type,
                "emotion": memory.emotion,
                "timestamp": memory.timestamp,
                "importance": memory.importance,
                "tags": ",".join(memory.tags)
            })
            
            # 保存
            self.short_term_collection.add(
                documents=[memory.content],
                metadatas=[metadata],
                ids=[memory.id]
            )
            
        except Exception as e:
            logger.error(f"ChromaDB保存エラー: {e}")
    
    async def search_memories(self, query: str, k: int = 5, 
                            memory_type: Optional[str] = None) -> List[Memory]:
        """記憶を検索"""
        try:
            memories = []
            
            # メモリ内キャッシュから検索
            cache_memories = self._search_cache(query, memory_type)
            memories.extend(cache_memories)
            
            # ChromaDBから検索（利用可能な場合）
            if self.short_term_collection:
                db_memories = await self._search_chromadb(query, k, memory_type)
                memories.extend(db_memories)
            
            # 重複除去・ソート
            unique_memories = {}
            for mem in memories:
                if mem.id not in unique_memories:
                    unique_memories[mem.id] = mem
            
            # 重要度と新しさでソート
            sorted_memories = sorted(
                unique_memories.values(),
                key=lambda m: (m.importance, m.timestamp),
                reverse=True
            )
            
            return sorted_memories[:k]
            
        except Exception as e:
            logger.error(f"記憶検索エラー: {e}")
            return []
    
    def _search_cache(self, query: str, memory_type: Optional[str] = None) -> List[Memory]:
        """メモリ内キャッシュから検索（簡易）"""
        results = []
        query_lower = query.lower()
        
        for memory in self.recent_memories:
            # タイプフィルタ
            if memory_type and memory.memory_type != memory_type:
                continue
            
            # キーワード検索（簡易）
            if (query_lower in memory.content.lower() or
                any(query_lower in tag.lower() for tag in memory.tags)):
                memory.access()  # アクセス記録
                results.append(memory)
        
        return results
    
    async def _search_chromadb(self, query: str, k: int = 5,
                              memory_type: Optional[str] = None) -> List[Memory]:
        """ChromaDBから検索"""
        try:
            # WHERE条件構築
            where_condition = {}
            if memory_type:
                where_condition["memory_type"] = memory_type
            
            # 検索実行
            results = self.short_term_collection.query(
                query_texts=[query],
                n_results=k,
                where=where_condition if where_condition else None
            )
            
            # Memory オブジェクトに変換
            memories = []
            if results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    metadata = results["metadatas"][0][i]
                    
                    memory = Memory(
                        content=doc,
                        memory_type=metadata.get("memory_type", "general"),
                        emotion=metadata.get("emotion", "neutral"),
                        timestamp=metadata.get("timestamp"),
                        importance=float(metadata.get("importance", 1.0)),
                        id=results["ids"][0][i],
                        tags=metadata.get("tags", "").split(",") if metadata.get("tags") else [],
                        metadata={k: v for k, v in metadata.items() 
                                if k not in ["memory_type", "emotion", "timestamp", "importance", "tags"]}
                    )
                    memory.access()  # アクセス記録
                    memories.append(memory)
            
            return memories
            
        except Exception as e:
            logger.error(f"ChromaDB検索エラー: {e}")
            return []
    
    async def search_long_term_knowledge(self, query: str, k: int = 3) -> str:
        """長期記憶（知識）から検索"""
        try:
            if not self.long_term_collection:
                return ""
            
            results = self.long_term_collection.query(
                query_texts=[query],
                n_results=k
            )
            
            if results["documents"]:
                knowledge = []
                for doc in results["documents"][0]:
                    knowledge.append(doc.strip())
                
                return "\n\n".join(knowledge)
            
            return ""
            
        except Exception as e:
            logger.error(f"長期記憶検索エラー: {e}")
            return ""
    
    async def get_recent_memories(self, hours: int = 24, limit: int = 10) -> List[Memory]:
        """最近の記憶を取得"""
        recent = []
        
        # メモリ内キャッシュから
        for memory in self.recent_memories:
            if memory.is_recent(hours):
                recent.append(memory)
        
        # 新しい順にソート
        recent.sort(key=lambda m: m.timestamp, reverse=True)
        
        return recent[:limit]
    
    async def get_memories_by_emotion(self, emotions: List[str], limit: int = 10) -> List[Memory]:
        """感情別に記憶を取得"""
        emotion_memories = []
        
        for memory in self.recent_memories:
            if memory.has_emotion(emotions):
                emotion_memories.append(memory)
        
        # 重要度順にソート
        emotion_memories.sort(key=lambda m: m.importance, reverse=True)
        
        return emotion_memories[:limit]
    
    async def cleanup_old_memories(self, days: int = 30) -> int:
        """古い記憶のクリーンアップ"""
        try:
            cleaned_count = 0
            
            # メモリ内キャッシュから古い記憶を削除
            new_cache = []
            for memory in self.recent_memories:
                if memory.is_recent(days * 24):  # 時間単位に変換
                    new_cache.append(memory)
                else:
                    cleaned_count += 1
            
            self.recent_memories = new_cache
            
            print(f"🧹 {cleaned_count}個の古い記憶をクリーンアップしました")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"記憶クリーンアップエラー: {e}")
            return 0
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """記憶統計を取得"""
        stats = {
            "cache_size": len(self.recent_memories),
            "memory_types": {},
            "emotions": {},
            "recent_count": 0,
            "important_count": 0
        }
        
        for memory in self.recent_memories:
            # タイプ別カウント
            stats["memory_types"][memory.memory_type] = \
                stats["memory_types"].get(memory.memory_type, 0) + 1
            
            # 感情別カウント
            stats["emotions"][memory.emotion] = \
                stats["emotions"].get(memory.emotion, 0) + 1
            
            # 最近の記憶カウント
            if memory.is_recent():
                stats["recent_count"] += 1
            
            # 重要な記憶カウント
            if memory.is_important():
                stats["important_count"] += 1
        
        return stats
    
    async def close(self) -> None:
        """リソースのクリーンアップ"""
        try:
            if self.client:
                # ChromaDBは自動でpersistされる
                pass
            
            print("📚 記憶システムを終了しました")
            
        except Exception as e:
            logger.error(f"記憶システム終了エラー: {e}")


def main():
    """テスト用のメイン関数"""
    async def test_memory_system():
        memory_system = MemorySystem()
        
        if await memory_system.initialize():
            print("✅ 記憶システム初期化成功")
            
            # テスト記憶を追加
            test_memory = Memory(
                content="テスト用の記憶です",
                memory_type=MemoryType.INTERACTION,
                emotion="happy",
                tags=["テスト", "初期化"]
            )
            
            await memory_system.store_memory(test_memory)
            print("✅ 記憶保存成功")
            
            # 検索テスト
            results = await memory_system.search_memories("テスト")
            print(f"✅ 検索結果: {len(results)}件")
            
            # 統計表示
            stats = await memory_system.get_memory_stats()
            print(f"📊 記憶統計: {stats}")
            
            await memory_system.close()
        else:
            print("❌ 記憶システム初期化失敗")
    
    asyncio.run(test_memory_system())


if __name__ == "__main__":
    main()
