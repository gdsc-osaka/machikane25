#!/usr/bin/env python3
"""
たこまる君 - 自律的に学習・成長する好奇心旺盛なロボット

GDGOC 大阪大学文化祭展示用システム
完全統合版: RAG + Agent + VoiceVox + カメラ + Gemma
"""

import sys
import os
import asyncio
import logging
from pathlib import Path

# カレントディレクトリを設定
os.chdir(Path(__file__).parent)

# srcディレクトリをPythonパスの先頭に追加
src_path = str(Path(__file__).parent / "src")
if src_path in sys.path:
    sys.path.remove(src_path)
sys.path.insert(0, src_path)

def setup_logging():
    """ログ設定"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('takamaru.log'),
            logging.StreamHandler()
        ]
    )

def print_banner():
    """起動バナー表示"""
    banner = """
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🤖 たこまる君 - 自律的に学習・成長するロボット          ║
║                                                               ║
║        GDGOC 大阪大学 文化祭展示システム                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

【システム構成】
  📷 カメラ     : Rola Mini (via BlueStacks)
  🎤 音声認識   : Faster-Whisper
  🔊 音声合成   : VoiceVox (ずんだもん)
  🧠 AI推論     : Gemma (Ollama)
  💾 記憶       : ChromaDB (RAG)

【機能】
  ✓ 周囲を観察して自律的に反応
  ✓ 会話内容を記憶
  ✓ 過去の経験から学習
  ✓ 好奇心旺盛な性格

【モード】
  --demo      : シンプルなVoiceVoxデモ（カメラ・RAGなし）
  --test-rag  : RAGシステムのテスト
  --full      : 完全版（デフォルト）

【操作】
  起動: python3 main.py [--demo|--test-rag|--full]
  停止: Ctrl+C
"""
    print(banner)

def check_prerequisites():
    """前提条件チェック"""
    print("🔍 システムチェック中...\n")

    checks = []

    # ChromaDBチェック
    try:
        import chromadb
        checks.append(("✅", "ChromaDB", "インストール済み"))
    except ImportError:
        checks.append(("❌", "ChromaDB", "未インストール"))

    # PyAudioチェック
    try:
        import pyaudio
        checks.append(("✅", "PyAudio", "インストール済み"))
    except ImportError:
        checks.append(("⚠️", "PyAudio", "未インストール（音声機能制限）"))

    # OpenCVチェック
    try:
        import cv2
        checks.append(("✅", "OpenCV", "インストール済み"))
    except ImportError:
        checks.append(("❌", "OpenCV", "未インストール"))

    # Requestsチェック
    try:
        import requests
        checks.append(("✅", "Requests", "インストール済み"))
    except ImportError:
        checks.append(("❌", "Requests", "未インストール"))

    # 結果表示
    for status, name, message in checks:
        print(f"  {status} {name:15s} : {message}")

    # 必須チェック
    critical_missing = [name for status, name, _ in checks
                        if status == "❌" and name in ["Requests"]]

    if critical_missing:
        print(f"\n❌ 必須ライブラリが不足: {', '.join(critical_missing)}")
        print("  pip install -r requirements.txt")
        return False

    print("\n✅ システムチェック完了\n")
    return True

async def run_simple_demo():
    """シンプルなVoiceVoxデモ"""
    print("\n" + "="*60)
    print("🎤 VoiceVoxシンプルデモモード")
    print("="*60)

    try:
        # 直接インポート
        from actuators.speaker import VoiceVoxSpeaker

        print("\n📢 VoiceVox接続確認中...")
        speaker = VoiceVoxSpeaker()

        if not speaker.check_connection():
            print("❌ VoiceVoxが起動していません")
            print("\n💡 VoiceVoxを起動してください:")
            print("   https://voicevox.hiroshiba.jp/")
            return

        print("✅ VoiceVox接続成功\n")

        # デモメッセージ
        messages = [
            ("こんにちは！僕はたこまる君だよ！", "excited"),
            ("大阪大学のGDGOCが作ったロボットなんだ！", None),
            ("君は誰？お名前を教えて！", "excited"),
            ("わあ！初めて見た！なにそれ？", "excited"),
            ("覚えたよ！また来てね！", "excited")
        ]

        for i, (text, emotion) in enumerate(messages, 1):
            print(f"[{i}/{len(messages)}] {text}")
            speaker.speak(text, emotion)
            await asyncio.sleep(1.5)

        print("\n✨ デモ完了！")

    except ImportError as e:
        print(f"❌ インポートエラー: {e}")
        import traceback
        traceback.print_exc()
    except KeyboardInterrupt:
        print("\n\n👋 デモを停止しました")
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

async def run_rag_test():
    """RAGシステムテスト"""
    print("\n" + "="*60)
    print("🧪 RAGシステムテスト")
    print("="*60)

    try:
        import chromadb
        from models.memory import Memory, MemoryType, EmotionType

        print("\n1️⃣ ChromaDB初期化中...")
        data_dir = Path("data/chroma_db_test")
        data_dir.mkdir(parents=True, exist_ok=True)

        client = chromadb.PersistentClient(
            path=str(data_dir),
            settings=chromadb.config.Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        print("   ✅ ChromaDB初期化完了")

        print("\n2️⃣ テストデータ追加中...")
        try:
            client.delete_collection("test_memory")
        except:
            pass

        collection = client.create_collection("test_memory")
        collection.add(
            documents=[
                "大阪大学は大阪府吹田市にある国立大学です。",
                "GDGOCは学生開発者コミュニティです。",
                "たこまる君は好奇心旺盛なロボットです。"
            ],
            ids=["mem_1", "mem_2", "mem_3"]
        )
        print("   ✅ テストデータ追加完了")

        print("\n3️⃣ 検索テスト...")
        queries = ["大阪大学について", "たこまる君の性格は？"]
        for query in queries:
            results = collection.query(query_texts=[query], n_results=1)
            if results["documents"]:
                print(f"   🔍 {query}")
                print(f"   ✅ {results['documents'][0][0][:50]}...")

        print("\n✨ RAGテスト完了！")

    except ImportError as e:
        print(f"❌ ChromaDBがインストールされていません")
        print("   pip install chromadb")
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

async def run_full_system():
    """完全版システム起動"""
    print("\n" + "="*60)
    print("🚀 たこまる君完全版を起動します")
    print("="*60)

    try:
        # 直接インポート
        from agent.brain import TakomaruBrain

        print("\n💡 注意:")
        print("  - VoiceVoxが起動していることを確認してください")
        print("  - BlueStacksでRola Miniが起動していることを確認してください")
        print("  - Ollamaが起動していることを確認してください")
        print()

        brain = TakomaruBrain()
        await brain.run()

    except ImportError as e:
        print(f"❌ モジュールのインポートに失敗: {e}")
        print("\n必要なモジュール:")
        print("  - agent.brain (Agentシステム)")
        print("  - rag.memory (RAGシステム)")
        print("  - vision, audio, actuators (各種デバイス)")
        print(f"\n詳細エラー:")
        import traceback
        traceback.print_exc()
    except KeyboardInterrupt:
        print("\n\n👋 たこまる君を終了します")
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """メイン関数"""
    import argparse

    parser = argparse.ArgumentParser(description="たこまる君 - 自律的に学習・成長するロボット")
    parser.add_argument('--demo', action='store_true', help='シンプルなVoiceVoxデモ')
    parser.add_argument('--test-rag', action='store_true', help='RAGシステムのテスト')
    parser.add_argument('--full', action='store_true', help='完全版システム起動（デフォルト）')

    args = parser.parse_args()

    # バナー表示
    print_banner()

    # システムチェック
    if not check_prerequisites():
        return

    # ログ設定
    setup_logging()

    # モード選択
    if args.demo:
        await run_simple_demo()
    elif args.test_rag:
        await run_rag_test()
    else:
        # デフォルトは完全版
        await run_full_system()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 終了します")
    except Exception as e:
        print(f"\n❌ エラー: {e}")
        import traceback
        traceback.print_exc()
