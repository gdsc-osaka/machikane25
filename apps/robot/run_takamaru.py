#!/usr/bin/env python3
"""
たこまる君起動スクリプト（統合版）

歴史的にこのファイルで直接起動していた処理を、src.app.bootstrap に集約した。
"""

import sys
from pathlib import Path

# プロジェクトのsrcディレクトリをPythonパスに追加
sys.path.insert(0, str(Path(__file__).parent / "src"))

from app import run_takomaru_runtime


def main() -> None:
    """Takomaru のフルランタイムを起動する。"""
    run_takomaru_runtime()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 中断されました")
