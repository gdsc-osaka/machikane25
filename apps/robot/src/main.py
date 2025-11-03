#!/usr/bin/env python3
"""
たこまる君 - シンプル起動スクリプト

録音デーモンと組み合わせて自律モードだけを実行します。
"""

import asyncio
import logging
import os

from .agent.brain import TakomaruBrain
from .common.config import get_config


def _configure_logging() -> None:
    """最低限のログ設定を適用"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )


def main() -> None:
    """たこまる君を起動"""
    # tokenizersの並列警告を抑止
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    _configure_logging()

    config = get_config()
    config.ensure_directories()

    brain = TakomaruBrain()

    try:
        asyncio.run(brain.run())
    except KeyboardInterrupt:
        print("\n👋 たこまる君を停止しました")


if __name__ == "__main__":
    main()
