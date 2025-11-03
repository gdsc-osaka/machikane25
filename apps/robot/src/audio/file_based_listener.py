"""
ファイルベースの音声リスナー

録音デーモンが生成する文字起こしログを監視し、新しいテキストが出現したら通知します。
"""

import json
import threading
import time
from pathlib import Path
from typing import Callable, Optional


class FileBasedListener:
    """
    文字起こしログを監視するシンプルなリスナー。

    新しいログ行が追加されるたびに `on_speech_detected` を呼び出します。
    """

    def __init__(
        self,
        on_speech_detected: Callable[[str, Optional[str]], None],
        log_file: str = "data/shared_audio/transcriptions.log",
        check_interval: float = 1.0,
    ):
        self.on_speech_detected = on_speech_detected
        self.log_file = Path(log_file)
        self.check_interval = check_interval

        self.is_running = False
        self.watch_thread: Optional[threading.Thread] = None
        self.last_position = 0
        self._initialized = False

        print("📂 ファイルベースリスナー初期化")
        print(f"   監視ログ: {self.log_file}")
        print(f"   チェック間隔: {check_interval}秒")

    def initialize(self) -> bool:
        """ログファイルの初期化"""
        try:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
            self.log_file.touch(exist_ok=True)
            # 既存ログはスキップし、末尾から監視開始
            self.last_position = self.log_file.stat().st_size
            self._initialized = True
            return True
        except Exception as exc:
            print(f"❌ ログファイル初期化エラー: {exc}")
            return False

    def start(self):
        """ログ監視を開始"""
        if self.is_running:
            print("⚠️ すでに実行中です")
            return

        if not self._initialized:
            if not self.initialize():
                print("❌ ログ監視の初期化に失敗しました")
                return

        self.is_running = True
        self.watch_thread = threading.Thread(target=self._watch_loop, daemon=True)
        self.watch_thread.start()

        print("👁️ ログ監視開始")

    def stop(self):
        """ログ監視を停止"""
        if not self.is_running:
            return

        print("🛑 ログ監視停止中...")
        self.is_running = False

        if self.watch_thread:
            self.watch_thread.join(timeout=2.0)

        print("✅ ログ監視停止完了")

    def _watch_loop(self):
        """ログ監視ループ（バックグラウンドスレッド）"""
        print("🔍 ログ監視ループ開始")

        while self.is_running:
            try:
                if not self.log_file.exists():
                    time.sleep(self.check_interval)
                    continue

                with self.log_file.open("r", encoding="utf-8") as log_fp:
                    log_fp.seek(self.last_position)
                    new_lines = log_fp.readlines()
                    self.last_position = log_fp.tell()

                for line in new_lines:
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        payload = json.loads(line)
                        timestamp = payload.get("timestamp")
                        text = payload.get("transcript")
                        if text:
                            print(f"✅ 文字起こしログ検出: 「{text}」")
                            if timestamp:
                                self.on_speech_detected(text, timestamp)
                            else:
                                self.on_speech_detected(text)
                    except json.JSONDecodeError as json_error:
                        print(f"⚠️ ログ解析エラー: {json_error} | line={line}")

                time.sleep(self.check_interval)

            except Exception as exc:
                print(f"⚠️ 監視ループエラー: {exc}")
                time.sleep(1.0)


# テスト用
if __name__ == "__main__":
    def on_speech(text: str):
        """音声が検出されたときのコールバック"""
        print(f"\n💬 検出された音声: 「{text}」\n")

    listener = FileBasedListener(on_speech_detected=on_speech)
    listener.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        listener.stop()
        print("✅ 終了しました")
