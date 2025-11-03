#!/usr/bin/env python3
"""
Google I/O 2025の最新情報をRAGに追加
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from rag.memory import MemorySystem
from models.memory import Memory, MemoryType


async def add_google_io_knowledge(memory_system: MemorySystem):
    """Google I/O 2025の最新情報を追加"""
    print("\n=== Google I/O 2025の最新情報を追加 ===\n")

    google_io_info = [
        {
            "content": "私はGemini 2.5モデルを使用しています。Gemini 2.5には、高速な2.5 Flashと、高性能な2.5 Proがあります。2.5 Proには「Deep Think」という強化推論モードがあり、並列思考技術を用いてより高度な推論を行います。",
            "tags": ["background", "technology", "gemini", "ai-model"],
            "importance": 0.9
        },
        {
            "content": "Geminiは月間480兆トークン以上を処理し、月間アクティブユーザー数は4億人以上に達しています。700万人以上の開発者がGeminiを使って開発を進めています。",
            "tags": ["background", "technology", "gemini", "statistics"],
            "importance": 0.7
        },
        {
            "content": "GoogleのProject Marinerは、コンピュータを使ってウェブと対話し、ユーザーの代わりに作業をこなすエージェントです。マルチタスク機能や「teach and repeat」という学習方法を持ち、一度タスクを見せると将来的に同様のタスクの計画を学習します。",
            "tags": ["background", "technology", "agent", "project-mariner"],
            "importance": 0.8
        },
        {
            "content": "GoogleのProject Astraの研究成果は、Gemini Liveに組み込まれました。カメラと画面共有機能を持ち、周囲の状況を把握できる汎用AIアシスタントとして動作します。面接の準備からマラソンのトレーニングまで、様々な用途で活用されています。",
            "tags": ["background", "technology", "gemini-live", "project-astra"],
            "importance": 0.8
        },
        {
            "content": "Googleの第7世代TPUであるIronwoodは、思考型・推論型AIワークロードの大規模処理に特化して設計されています。前世代と比較して10倍のパフォーマンスを実現し、ポッドあたり42.5エクサフロップスという驚異的な演算能力を誇ります。",
            "tags": ["background", "technology", "infrastructure", "tpu"],
            "importance": 0.7
        },
        {
            "content": "Veo 3は、ネイティブオーディオ生成機能を備えた最先端ビデオモデルです。Imagen 4は最新かつ最も高性能な画像生成モデルで、両方ともGeminiアプリで利用可能です。また、Flowという映画制作用の新しいツールも発表されました。",
            "tags": ["background", "technology", "media-generation", "veo", "imagen"],
            "importance": 0.6
        },
        {
            "content": "Google検索のAIモードは、Gemini 2.5により業界最速の応答を実現しています。AI Overviewは15億人以上のユーザーに活用されており、200の国と地域で提供されています。",
            "tags": ["background", "technology", "search", "ai-overview"],
            "importance": 0.7
        },
        {
            "content": "私のようなAIシステムは、VoiceVox音声合成や音声認識、画像認識などの技術を組み合わせています。これらはGoogleの最新AI技術の応用例として、実際のプロジェクトで活用されています。",
            "tags": ["background", "technology", "self-reference"],
            "importance": 0.9
        }
    ]

    for info in google_io_info:
        memory = Memory(
            content=info["content"],
            memory_type=MemoryType.LEARNING,
            emotion="neutral",
            importance=info["importance"],
            tags=info["tags"]
        )

        await memory_system.store_memory(memory)
        print(f"✅ 追加: {info['content'][:60]}...")

    print(f"\n✅ {len(google_io_info)}件の最新技術情報を追加しました\n")


async def main():
    """メイン関数"""
    print("="*60)
    print("Google I/O 2025 最新情報をRAGに追加")
    print("="*60)

    # メモリシステム初期化
    print("\n🧠 メモリシステムを初期化中...")
    memory_system = MemorySystem()
    await memory_system.initialize()
    print("✅ 初期化完了\n")

    try:
        await add_google_io_knowledge(memory_system)

        # 確認のため検索
        print("\n確認のため、追加した記憶を検索:")
        print("\n--- Geminiについて ---")
        memories = await memory_system.search_memories("Gemini", k=3)
        for i, mem in enumerate(memories, 1):
            print(f"{i}. {mem.content[:80]}...")

        print("\n--- AIエージェントについて ---")
        memories = await memory_system.search_memories("エージェント", k=3)
        for i, mem in enumerate(memories, 1):
            print(f"{i}. {mem.content[:80]}...")

    finally:
        await memory_system.close()
        print("\n✅ 完了")


if __name__ == "__main__":
    asyncio.run(main())
