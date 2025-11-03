#!/usr/bin/env python3
"""
Rola Mini コントローラ

ADB 経由で BlueStacks 上の Rola Mini アプリをタップ／スワイプして移動操作します。
"""

import subprocess
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ControlAction:
    """タップまたはスワイプ操作を表す"""
    kind: str  # "tap" or "swipe"
    x1: int
    y1: int
    x2: int = 0
    y2: int = 0
    duration: int = 0  # swipe 時のみ有効


class RolaMiniController:
    """BlueStacks 内の Rola Mini を操作"""

    DEFAULT_ACTIONS: Dict[str, Sequence[ControlAction]] = {
        "forward_backward": (
            ControlAction("swipe", 720, 1720, 720, 1720, 200),
            ControlAction("swipe", 720, 2100, 720, 2100, 200),
        ),
        "right_turn": (
            ControlAction("tap", 900, 1920),
            ControlAction("tap", 900, 1920),
            ControlAction("tap", 900, 1920),
            ControlAction("tap", 900, 1920),
        ),
    }

    def __init__(self, device_id: str = "emulator-5554", points: Optional[Dict[str, object]] = None) -> None:
        self.device_id = device_id
        self.actions: Dict[str, Sequence[ControlAction]] = self.DEFAULT_ACTIONS.copy()
        if points:
            for key, value in points.items():
                acts = self._parse_actions(value)
                if acts:
                    self.actions[key] = acts

    def _parse_actions(self, value: object) -> Optional[Sequence[ControlAction]]:
        """設定値を ControlAction のリストに変換"""
        try:
            actions: List[ControlAction] = []
            if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
                if value and not isinstance(value[0], (dict, list, tuple, ControlAction)):
                    single = self._coerce_single(value)
                    return [single] if single else None
                for item in value:
                    action = self._coerce_single(item)
                    if action is None:
                        return None
                    actions.append(action)
                return actions
            single = self._coerce_single(value)
            return [single] if single else None
        except Exception as parse_error:  # pylint: disable=broad-except
            logger.warning("制御ポイントの解析に失敗しました: %s (%s)", value, parse_error)
            return None

    def _coerce_single(self, value: object) -> Optional[ControlAction]:
        if isinstance(value, ControlAction):
            return value
        if isinstance(value, dict):
            kind = str(value.get("type", "tap")).lower()
            if kind == "swipe":
                start = value.get("start") or value.get("from") or value.get("begin")
                end = value.get("end") or value.get("to") or start
                duration = int(value.get("duration", 200))
                if not start:
                    return None
                x1, y1 = int(start[0]), int(start[1])
                if end:
                    x2, y2 = int(end[0]), int(end[1])
                else:
                    x2, y2 = x1, y1
                return ControlAction("swipe", x1, y1, x2, y2, duration)
            pos = value.get("position") or value.get("point") or value.get("start") or value.get("end")
            if pos is None:
                return None
            x, y = int(pos[0]), int(pos[1])
            return ControlAction("tap", x, y)
        if isinstance(value, Sequence) and not isinstance(value, (str, bytes)) and len(value) == 2:
            x, y = value
            return ControlAction("tap", int(x), int(y))
        return None

    def _execute(self, action: ControlAction) -> bool:
        """ControlAction を ADB に送る"""
        if action.kind == "swipe":
            command = [
                "adb",
                "-s",
                self.device_id,
                "shell",
                "input",
                "swipe",
                str(action.x1),
                str(action.y1),
                str(action.x2),
                str(action.y2),
                str(action.duration if action.duration > 0 else 200),
            ]
        else:
            command = [
                "adb",
                "-s",
                self.device_id,
                "shell",
                "input",
                "tap",
                str(action.x1),
                str(action.y1),
            ]

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode != 0:
                logger.error("ADBコマンド失敗 (%s): %s", " ".join(command), result.stderr.strip())
                return False
            logger.info("ADBコマンド実行: %s", " ".join(command))
            return True
        except FileNotFoundError:
            logger.error("adb コマンドが見つかりません。Android Platform Tools をインストールしてください。")
            return False
        except subprocess.TimeoutExpired:
            logger.error("ADB コマンドがタイムアウトしました: %s", " ".join(command))
            return False

    def move(self, direction: str) -> bool:
        """指定方向のアクションを実行"""
        actions = self.actions.get(direction)
        if not actions:
            logger.warning("未定義の方向コマンド: %s", direction)
            return False
        success = True
        for action in actions:
            if not self._execute(action):
                success = False
                break
        return success

    def move_forward(self) -> bool:
        return self.move("forward")

    def move_backward(self) -> bool:
        return self.move("backward")

    def move_left(self) -> bool:
        return self.move("left")

    def move_right(self) -> bool:
        return self.move("right")

    def stop(self) -> bool:
        return self.move("stop")
