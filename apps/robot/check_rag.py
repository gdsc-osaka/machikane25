#!/usr/bin/env python3
"""
RAG記憶システムの動作確認スクリプト
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from rag.memory import MemorySystem
from models.memory import Memory


async def test_rag_memory():
    """RAGメモリシステムのテスト"""
    print("=== RAGメモリシステム動作確認 ===\n")

    # メモリシステム初期化
    print("1. メモリシステムを初期化中...")
    memory_system = MemorySystem()
    await memory_system.initialize()
    print("✅ 初期化完了\n")

    # テスト用の記憶を保存
    print("2. テスト用の記憶を保存中...")
    test_memories = [
        Memory(
            content="思考: ペンが机の上にある | 発話: わあ！ペンを見つけたよ！",
            memory_type="interaction",
            emotion="excited",
            metadata={"observation": "机の上にペンがある"}
        ),
        Memory(
            content="思考: また本を見つけた | 発話: 本がたくさんあるね",
            memory_type="interaction",
            emotion="curious",
            metadata={"observation": "本棚に本が並んでいる"}
        ),
        Memory(
            content="思考: 人が来た！ | 発話: こんにちは！",
            memory_type="interaction",
            emotion="happy",
            metadata={"observation": "人が映っている"}
        ),
    ]

    for mem in test_memories:
        await memory_system.store_memory(mem)
        print(f"  保存: {mem.content[:30]}...")

    print(f"✅ {len(test_memories)}件の記憶を保存\n")

    # 記憶を検索
    print("3. 記憶を検索中...")
    test_queries = [
        "机の上にペンがある",
        "本が見える",
        "人がいる",
        "まったく関係ないクエリ"
    ]

    for query in test_queries:
        print(f"\n  クエリ: 「{query}」")
        memories = await memory_system.search_memories(query, k=2)

        if memories:
            print(f"  → {len(memories)}件の関連記憶を発見:")
            for i, mem in enumerate(memories, 1):
                print(f"     {i}. {mem.content[:50]}...")
        else:
            print("  → 関連する記憶が見つかりませんでした")

    # クリーンアップ
    await memory_system.close()
    print("\n\n✅ テスト完了")

    # 実際のプロンプトに含まれる形式を表示
    print("\n=== 実際のプロンプトでの表示例 ===\n")
    print("【過去の記憶（関連する経験）】")
    if memories:
        memory_str = "\n".join([f"- {mem.content}" for mem in memories])
        print(memory_str)
    else:
        print("まだ何も覚えていません。")


if __name__ == "__main__":
    asyncio.run(test_rag_memory())
