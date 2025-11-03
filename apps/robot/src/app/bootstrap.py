"""
アプリケーション起動時の共通処理をまとめたモジュール。

ロギング設定や依存チェック、Takomaru の実行フローをここで一元管理する。
"""

from __future__ import annotations

import asyncio
import logging
from typing import Callable

from agent.brain import TakomaruBrain


def setup_logging(level: int | None = None) -> None:
    """
    ログ設定を初期化する。

    Args:
        level: logging モジュールのログレベル。未指定の場合は INFO。
    """
    logging.basicConfig(
        level=level or logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("takomaru.log"),
            logging.StreamHandler(),
        ],
    )


def print_banner() -> None:
    """Takomaru 起動時に表示するバナーを出力する。"""
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

【操作】
  - 起動: このスクリプトを実行
  - 停止: Ctrl+C

"""
    print(banner)


def _check_import(module_name: str, success_msg: str, failure_msg: str) -> tuple[str, str, str]:
    """
    指定したモジュールのインポートを試みて結果を返す。

    Args:
        module_name: import したいモジュール名。
        success_msg: 成功時の説明。
        failure_msg: 失敗時の説明。

    Returns:
        (アイコン, 表示名, メッセージ) のタプル。
    """
    try:
        __import__(module_name)
        return "✅", module_name, success_msg
    except ImportError:
        return "❌", module_name, failure_msg


def check_prerequisites(print_fn: Callable[[str], None] | None = None) -> bool:
    """
    実行に必要なライブラリの存在を確認する。

    Args:
        print_fn: 出力に使用する関数（テスト時の差し替え用）。

    Returns:
        すべての必須モジュールが揃っていれば True。
    """
    printer = print_fn or print

    printer("🔍 前提条件をチェック中...\n")

    checks = [
        _check_import("chromadb", "インストール済み", "未インストール (pip install chromadb)"),
        _check_import("pyaudio", "インストール済み", "未インストール (音声機能が制限されます)"),
        _check_import("cv2", "インストール済み", "未インストール (pip install opencv-python)"),
        _check_import("requests", "インストール済み", "未インストール (pip install requests)"),
    ]

    for status, name, message in checks:
        printer(f"  {status} {name:15s} : {message}")

    missing = [
        name
        for status, name, _ in checks
        if status == "❌" and name in {"chromadb", "cv2", "requests"}
    ]

    if missing:
        joined = ", ".join(missing)
        printer(f"\n❌ 必須ライブラリが不足しています: {joined}")
        printer("\n以下のコマンドでインストールしてください:")
        printer("  pip install -r requirements.txt")
        return False

    printer("\n✅ 前提条件チェック完了\n")
    return True


async def _run_brain(brain: TakomaruBrain) -> None:
    """TakomaruBrain のメインループを実行するヘルパー。"""
    try:
        await brain.run()
    except KeyboardInterrupt:
        print("\n\n👋 たこまる君を終了します...")
    except Exception as exc:
        logging.getLogger(__name__).error("予期しないエラー: %s", exc)
        print(f"\n❌ エラーが発生しました: {exc}")
        import traceback

        traceback.print_exc()
    finally:
        print("\n✨ お疲れ様でした！")


def run_takomaru_runtime() -> None:
    """
    Takomaru のランタイムを起動する。

    前提チェックやログ設定も含めたエントリポイント。
    """
    print_banner()

    if not check_prerequisites():
        print("\n終了します...")
        return

    setup_logging()

    print("=" * 60)
    print("🚀 たこまる君を起動します...")
    print("=" * 60)
    print()
    print("💡 注意: VoiceVoxが起動していることを確認してください")
    print("   VoiceVoxがない場合は https://voicevox.hiroshiba.jp/ からダウンロード")
    print()

    brain = TakomaruBrain()
    asyncio.run(_run_brain(brain))
