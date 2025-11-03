#!/usr/bin/env python3
"""
RAGシステムのテストスクリプト
"""

import sys
import os
from pathlib import Path

# カレントディレクトリをプロジェクトルートに設定
os.chdir(Path(__file__).parent)

# srcディレクトリをPythonパスに追加
sys.path.insert(0, str(Path(__file__).parent / "src"))

import asyncio
import logging
from datetime import datetime

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# ChromaDBチェック
try:
    import chromadb
    print("✅ ChromaDB is available")
except ImportError:
    print("❌ ChromaDB not found. Install with: pip install chromadb")
    sys.exit(1)

# モジュールインポート
try:
    from models.memory import Memory, MemoryType, EmotionType
    from common.config import get_config
    print("✅ Models imported successfully")
except ImportError as e:
    print(f"❌ Failed to import models: {e}")
    sys.exit(1)

# RAGメモリシステムを直接実装
class SimpleMemoryTest:
    """シンプルなメモリシステムテスト"""

    def __init__(self):
        """初期化"""
        self.client = None
        self.collection = None

    async def test_chromadb(self):
        """ChromaDBの基本テスト"""
        print("\n" + "="*60)
        print("🧪 ChromaDB 基本テスト")
        print("="*60)

        try:
            # データディレクトリ作成
            data_dir = Path("data/chroma_db_test")
            data_dir.mkdir(parents=True, exist_ok=True)

            # ChromaDBクライアント作成
            print("\n1️⃣ ChromaDBクライアントを初期化中...")
            self.client = chromadb.PersistentClient(
                path=str(data_dir),
                settings=chromadb.config.Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            print("   ✅ クライアント初期化成功")

            # コレクション作成
            print("\n2️⃣ テストコレクションを作成中...")
            try:
                self.client.delete_collection("test_memory")
            except:
                pass

            self.collection = self.client.create_collection(
                name="test_memory",
                metadata={"description": "テスト用記憶"}
            )
            print("   ✅ コレクション作成成功")

            # データ追加
            print("\n3️⃣ テストデータを追加中...")
            test_data = [
                {
                    "id": "mem_1",
                    "text": "大阪大学は大阪府吹田市にある国立大学です。",
                    "tags": ["大阪大学", "基本情報"]
                },
                {
                    "id": "mem_2",
                    "text": "GDGOCは学生開発者コミュニティです。",
                    "tags": ["GDGOC", "活動"]
                },
                {
                    "id": "mem_3",
                    "text": "たこまる君は好奇心旺盛なロボットです。",
                    "tags": ["たこまる君", "性格"]
                }
            ]

            self.collection.add(
                documents=[d["text"] for d in test_data],
                metadatas=[{"tags": ",".join(d["tags"])} for d in test_data],
                ids=[d["id"] for d in test_data]
            )
            print(f"   ✅ {len(test_data)}件のデータを追加")

            # データ検索
            print("\n4️⃣ データ検索テスト...")
            queries = [
                "大阪大学について教えて",
                "GDGOCって何？",
                "たこまる君の性格は？"
            ]

            for query in queries:
                print(f"\n   🔍 クエリ: {query}")
                results = self.collection.query(
                    query_texts=[query],
                    n_results=1
                )

                if results["documents"] and results["documents"][0]:
                    doc = results["documents"][0][0]
                    print(f"   ✅ 検索結果: {doc[:60]}...")
                else:
                    print("   ⚠️ 結果なし")

            # 統計情報
            print("\n5️⃣ コレクション統計...")
            count = self.collection.count()
            print(f"   ✅ 保存されているデータ: {count}件")

            print("\n" + "="*60)
            print("✨ ChromaDB基本テスト完了！")
            print("="*60)
            return True

        except Exception as e:
            print(f"\n❌ テスト失敗: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def test_memory_model(self):
        """Memoryモデルのテスト"""
        print("\n" + "="*60)
        print("🧪 Memory モデルテスト")
        print("="*60)

        try:
            # Memoryオブジェクト作成
            print("\n1️⃣ Memoryオブジェクトを作成中...")
            memory1 = Memory(
                content="太郎さんに初めて会った。",
                memory_type=MemoryType.INTERACTION,
                emotion=EmotionType.HAPPY,
                tags=["太郎", "初対面"],
                importance=0.8
            )
            print(f"   ✅ Memory作成: {memory1}")

            # 辞書変換
            print("\n2️⃣ 辞書変換テスト...")
            memory_dict = memory1.to_dict()
            print(f"   ✅ 変換成功:")
            print(f"      - ID: {memory_dict['id'][:16]}...")
            print(f"      - タイプ: {memory_dict['memory_type']}")
            print(f"      - 感情: {memory_dict['emotion']}")
            print(f"      - 重要度: {memory_dict['importance']}")

            # アクセステスト
            print("\n3️⃣ アクセスカウントテスト...")
            print(f"   初期アクセス数: {memory1.access_count}")
            memory1.access()
            print(f"   アクセス後: {memory1.access_count}")
            print(f"   重要度変化: {memory1.importance}")

            # 最近の記憶チェック
            print("\n4️⃣ 時間チェックテスト...")
            is_recent = memory1.is_recent(hours=24)
            print(f"   ✅ 24時間以内: {is_recent}")

            print("\n" + "="*60)
            print("✨ Memoryモデルテスト完了！")
            print("="*60)
            return True

        except Exception as e:
            print(f"\n❌ テスト失敗: {e}")
            import traceback
            traceback.print_exc()
            return False

async def main():
    """メイン関数"""
    print("\n🤖 たこまる君 RAGシステムテスト\n")

    tester = SimpleMemoryTest()

    # ChromaDB基本テスト
    result1 = await tester.test_chromadb()

    # Memoryモデルテスト
    result2 = await tester.test_memory_model()

    # 結果サマリー
    print("\n" + "="*60)
    print("📊 テスト結果サマリー")
    print("="*60)
    print(f"  ChromaDB基本テスト: {'✅ PASS' if result1 else '❌ FAIL'}")
    print(f"  Memoryモデルテスト: {'✅ PASS' if result2 else '❌ FAIL'}")
    print("="*60)

    if result1 and result2:
        print("\n🎉 すべてのテストに合格しました！")
        print("\n次のステップ:")
        print("  1. VoiceVoxを起動")
        print("  2. python3 run_takamaru.py で完全版を実行")
    else:
        print("\n⚠️ 一部のテストが失敗しました")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 テストを中断しました")
    except Exception as e:
        print(f"\n\n❌ エラー発生: {e}")
        import traceback
        traceback.print_exc()
