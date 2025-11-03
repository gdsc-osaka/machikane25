#!/usr/bin/env python3
"""
RAGメモリ管理ツール

RAGに保存されている記憶の確認、追加、削除を行うツール
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / "src"))

from rag.memory import MemorySystem
from models.memory import Memory, MemoryType


async def list_all_memories(memory_system: MemorySystem, memory_type: str = None):
    """全記憶を一覧表示"""
    print("\n=== RAG記憶一覧 ===\n")

    # 全記憶を取得（空クエリで全件取得を試みる）
    # ChromaDBの制限により、実際にはsearch_memoriesを使う
    test_queries = ["", "記憶", "思考", "観察", "背景", "知識", "GDSC"]

    all_memories = []
    seen_ids = set()

    for query in test_queries:
        memories = await memory_system.search_memories(query, k=100)
        for mem in memories:
            if mem.id not in seen_ids:
                all_memories.append(mem)
                seen_ids.add(mem.id)

    if not all_memories:
        print("記憶が見つかりませんでした")
        return []

    # タイプでフィルタ
    if memory_type:
        all_memories = [m for m in all_memories if m.memory_type == memory_type]

    # タイムスタンプでソート
    all_memories.sort(key=lambda m: m.timestamp, reverse=True)

    print(f"全{len(all_memories)}件の記憶\n")

    # タイプ別に集計
    type_counts = {}
    for mem in all_memories:
        type_counts[mem.memory_type] = type_counts.get(mem.memory_type, 0) + 1

    print("【タイプ別】")
    for mtype, count in sorted(type_counts.items()):
        print(f"  {mtype}: {count}件")
    print()

    # 記憶を表示
    for i, mem in enumerate(all_memories, 1):
        timestamp = datetime.fromisoformat(mem.timestamp).strftime("%Y-%m-%d %H:%M:%S")
        content_preview = mem.content[:60] + "..." if len(mem.content) > 60 else mem.content

        print(f"{i}. [{mem.memory_type}] {timestamp}")
        print(f"   感情: {mem.emotion} | 重要度: {mem.importance:.2f} | アクセス: {mem.access_count}回")
        print(f"   内容: {content_preview}")
        if mem.tags:
            print(f"   タグ: {', '.join(mem.tags)}")
        print()

    return all_memories


async def add_background_knowledge(memory_system: MemorySystem, content: str, tags: list = None, importance: float = 1.0):
    """背景知識を追加"""
    print("\n=== 背景知識を追加 ===\n")

    memory = Memory(
        content=content,
        memory_type=MemoryType.LEARNING,  # または SYSTEM
        emotion="neutral",
        importance=importance,
        tags=tags or ["background", "knowledge"]
    )

    await memory_system.store_memory(memory)

    print(f"✅ 背景知識を追加しました")
    print(f"   内容: {content[:100]}...")
    print(f"   タグ: {', '.join(memory.tags)}")
    print(f"   重要度: {importance}")
    print()


async def search_memories(memory_system: MemorySystem, query: str, k: int = 5):
    """記憶を検索"""
    print(f"\n=== 記憶検索: 「{query}」 ===\n")

    memories = await memory_system.search_memories(query, k=k)

    if not memories:
        print("関連する記憶が見つかりませんでした")
        return

    print(f"{len(memories)}件の関連記憶を発見:\n")

    for i, mem in enumerate(memories, 1):
        timestamp = datetime.fromisoformat(mem.timestamp).strftime("%Y-%m-%d %H:%M:%S")
        print(f"{i}. [{mem.memory_type}] {timestamp}")
        print(f"   感情: {mem.emotion} | 重要度: {mem.importance:.2f}")
        print(f"   内容: {mem.content}")
        if mem.tags:
            print(f"   タグ: {', '.join(mem.tags)}")
        print()


async def add_gdsc_knowledge(memory_system: MemorySystem):
    """GDGOC阪大の背景知識を追加"""
    print("\n=== GDGOC阪大の背景知識を追加 ===\n")

    gdsc_info = [
        {
            "content": "私はGDGOC（Google Developer Groups On Campus）大阪大学支部の展示プロジェクトの一員です。GDGOCは、Googleのテクノロジーに関心のある学生向けのコミュニティです。",
            "tags": ["background", "GDGOC", "identity"],
            "importance": 1.0
        },
        {
            "content": "GDGOC阪大支部は、身近な課題をテクノロジーで解決する阪大生限定のテック系サークルです。学内DXプロジェクトや講演会、ハンズオンワークショップなどを行っています。",
            "tags": ["background", "GDGOC", "activities"],
            "importance": 0.9
        },
        {
            "content": "私の名前は「たこまる君」です。VoiceVox音声合成、音声認識、画像認識を組み合わせた自律的なロボットシステムで、GDGOC阪大の文化祭展示プロジェクトとして作られました。",
            "tags": ["background", "identity", "project"],
            "importance": 1.0
        },
        {
            "content": "GDGOCは世界中の大学で活動しているグローバルなプログラムです。日本では複数の大学に支部があり、大阪大学もその一つです。Google Developer Groupsのキャンパス版として、学生が中心となって運営しています。",
            "tags": ["background", "GDGOC", "global"],
            "importance": 0.7
        },
        {
            "content": "GDGOC阪大支部では、DX Teamとエンジニアリングチームがあり、メンバーの技術向上やネットワーキングの活性化のために活動しています。プロジェクトベースで活動し、決まった活動場所・活動時間はありません。",
            "tags": ["background", "GDGOC", "teams"],
            "importance": 0.8
        }
    ]

    for info in gdsc_info:
        memory = Memory(
            content=info["content"],
            memory_type=MemoryType.LEARNING,
            emotion="neutral",
            importance=info["importance"],
            tags=info["tags"]
        )

        await memory_system.store_memory(memory)
        print(f"✅ 追加: {info['content'][:50]}...")

    print(f"\n✅ {len(gdsc_info)}件の背景知識を追加しました\n")


async def export_memories(memory_system: MemorySystem, output_file: str = "memory_export.json"):
    """記憶をJSONファイルにエクスポート"""
    import json

    print(f"\n=== 記憶をエクスポート: {output_file} ===\n")

    # 全記憶を取得
    test_queries = ["", "記憶", "思考", "観察", "背景", "知識", "GDSC"]
    all_memories = []
    seen_ids = set()

    for query in test_queries:
        memories = await memory_system.search_memories(query, k=100)
        for mem in memories:
            if mem.id not in seen_ids:
                all_memories.append(mem)
                seen_ids.add(mem.id)

    # 辞書形式に変換
    memories_data = [mem.to_dict() for mem in all_memories]

    # ファイルに保存
    output_path = Path("data") / output_file
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(memories_data, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(memories_data)}件の記憶をエクスポートしました: {output_path}")


async def main():
    """メイン関数"""
    import argparse

    parser = argparse.ArgumentParser(description="RAGメモリ管理ツール")
    parser.add_argument("command", choices=["list", "search", "add-gdsc", "export"],
                       help="実行するコマンド")
    parser.add_argument("--query", "-q", help="検索クエリ (searchコマンド用)")
    parser.add_argument("--type", "-t", help="メモリタイプでフィルタ (listコマンド用)")
    parser.add_argument("--output", "-o", default="memory_export.json", help="出力ファイル名 (exportコマンド用)")

    args = parser.parse_args()

    # メモリシステム初期化
    print("🧠 メモリシステムを初期化中...")
    memory_system = MemorySystem()
    await memory_system.initialize()
    print("✅ 初期化完了\n")

    try:
        if args.command == "list":
            await list_all_memories(memory_system, args.type)

        elif args.command == "search":
            if not args.query:
                print("❌ エラー: --query オプションが必要です")
                return
            await search_memories(memory_system, args.query)

        elif args.command == "add-gdsc":
            await add_gdsc_knowledge(memory_system)
            print("\n確認のため、追加した記憶を検索:")
            await search_memories(memory_system, "GDGOC", k=10)

        elif args.command == "export":
            await export_memories(memory_system, args.output)

    finally:
        await memory_system.close()


if __name__ == "__main__":
    print("="*60)
    print("RAGメモリ管理ツール")
    print("="*60)

    asyncio.run(main())
