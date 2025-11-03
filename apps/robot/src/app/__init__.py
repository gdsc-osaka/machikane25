"""
アプリケーションレベルのユーティリティをまとめたパッケージ。

共通の起動処理や初期化フローをここで提供する。
"""

from .bootstrap import (
    print_banner,
    check_prerequisites,
    setup_logging,
    run_takomaru_runtime,
)

__all__ = [
    "print_banner",
    "check_prerequisites",
    "setup_logging",
    "run_takomaru_runtime",
]
