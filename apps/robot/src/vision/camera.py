#!/usr/bin/env python3
"""
Rola Mini カメラモジュール

ADB経由でBluestacksの画面をキャプチャし、
OpenCVで画像処理して返す
"""

import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional, Tuple
import numpy as np

try:
    import cv2
except ImportError:
    print("❌ OpenCVがインストールされていません")
    print("インストール: pip3 install opencv-python")
    exit(1)


class RolaMiniCamera:
    """Rola Miniのカメラを制御するクラス"""

    def __init__(self, device_id: str = '127.0.0.1:5555', debug: bool = False,
                 crop_top: float = 0.10, crop_bottom: float = 0.37,
                 crop_left: float = 0.05, crop_right: float = 0.95):
        """
        Args:
            device_id: ADBデバイスID (デフォルト: 127.0.0.1:5555)
            debug: デバッグモード (キャプチャ画像を保存)
            crop_top: 上部から切り取る割合（0.0-1.0、デフォルト: 0.10 = 上部10%除去）
            crop_bottom: 下部まで切り取る割合（0.0-1.0、デフォルト: 0.37 = 上部37%まで）
            crop_left: 左から切り取る割合（0.0-1.0、デフォルト: 0.05 = 左5%除去）
            crop_right: 右まで切り取る割合（0.0-1.0、デフォルト: 0.95 = 右5%除去）
        """
        self.device_id = device_id
        self.debug = debug
        self.crop_top = crop_top
        self.crop_bottom = crop_bottom
        self.crop_left = crop_left
        self.crop_right = crop_right
        self.temp_dir = Path(tempfile.gettempdir()) / "takomaru_camera"
        self.temp_dir.mkdir(exist_ok=True)

        # ADB接続確認
        if not self._check_connection():
            raise ConnectionError(f"デバイス {device_id} に接続できません")

        print(f"✓ カメラ初期化完了 (デバイス: {device_id})")

    def _crop_camera_view(self, image: np.ndarray) -> np.ndarray:
        """
        Rola Miniアプリのカメラビュー部分だけを切り取る

        Args:
            image: フルスクリーンショット

        Returns:
            カメラビュー部分のみの画像
        """
        try:
            height, width = image.shape[:2]

            # Rola Miniアプリのレイアウト（縦長の画面想定）:
            # - 上部に余白
            # - カメラビュー（中央部分）
            # - 下部にUI（Remote/Photo/Skills等のボタン）

            # カメラビューの範囲を計算
            start_y = int(height * self.crop_top)      # 上部から切り取り開始位置
            end_y = int(height * self.crop_bottom)     # 下部まで切り取り終了位置
            start_x = int(width * self.crop_left)      # 左から切り取り開始位置
            end_x = int(width * self.crop_right)       # 右まで切り取り終了位置

            # カメラビュー部分を切り取る（上下左右）
            cropped = image[start_y:end_y, start_x:end_x]

            if self.debug:
                print(f"  ✂️  画像切り取り: {width}x{height} → {cropped.shape[1]}x{cropped.shape[0]} (上{int(self.crop_top*100)}%除去、下{int(self.crop_bottom*100)}%まで、左右{int(self.crop_left*100)}%除去)")

            return cropped

        except Exception as e:
            print(f"⚠️ 画像切り取りエラー: {e}")
            # エラーの場合は元の画像を返す
            return image

    def _check_connection(self) -> bool:
        """ADB接続を確認"""
        try:
            result = subprocess.run(
                ['adb', 'devices'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode != 0:
                print(f"❌ ADBコマンドエラー: {result.stderr}")
                return False
            return self.device_id in result.stdout
        except subprocess.TimeoutExpired:
            print("❌ ADB接続チェックがタイムアウトしました")
            return False
        except FileNotFoundError:
            print("❌ ADBコマンドが見つかりません。Android Platform Toolsをインストールしてください")
            return False
        except Exception as e:
            print(f"❌ ADB接続チェックエラー: {e}")
            return False

    def capture(self, crop_to_camera: bool = True) -> Optional[np.ndarray]:
        """
        画面をキャプチャして、OpenCVのndarrayで返す

        Args:
            crop_to_camera: Rola Miniのカメラビュー部分だけを切り取る（デフォルト: True）

        Returns:
            np.ndarray: BGR形式の画像 (OpenCV形式)
            None: キャプチャ失敗時
        """
        try:
            # 一時ファイルパス
            temp_file = self.temp_dir / f"capture_{int(time.time() * 1000)}.png"

            # ADB経由でスクリーンショット
            try:
                with open(temp_file, 'wb') as f:
                    result = subprocess.run(
                        ['adb', '-s', self.device_id, 'exec-out', 'screencap', '-p'],
                        stdout=f,
                        stderr=subprocess.PIPE,
                        timeout=30
                    )
            except subprocess.TimeoutExpired:
                print("❌ スクリーンショットがタイムアウトしました")
                return None
            except FileNotFoundError:
                print("❌ ADBコマンドが見つかりません")
                return None

            if result.returncode != 0:
                error_msg = result.stderr.decode('utf-8', errors='ignore')
                print(f"❌ キャプチャ失敗: {error_msg}")
                # 一時ファイルをクリーンアップ
                if temp_file.exists():
                    temp_file.unlink()
                return None

            # ファイルサイズをチェック
            if not temp_file.exists() or temp_file.stat().st_size == 0:
                print("❌ キャプチャファイルが空です")
                return None

            # OpenCVで読み込み
            try:
                image = cv2.imread(str(temp_file))
            except Exception as e:
                print(f"❌ OpenCV画像読み込みエラー: {e}")
                return None

            if image is None:
                print(f"❌ 画像読み込み失敗: {temp_file}")
                return None

            # デバッグモードの場合、オリジナル画像も保存
            original_image = image.copy() if self.debug else None

            # カメラビュー部分だけを切り取る
            if crop_to_camera:
                image = self._crop_camera_view(image)

                # デバッグモードの場合、切り取り前と切り取り後の両方を保存
                if self.debug and original_image is not None:
                    debug_dir = self.temp_dir.parent / "takomaru_camera_debug"
                    debug_dir.mkdir(exist_ok=True)
                    timestamp = int(time.time() * 1000)

                    # オリジナル画像を保存
                    original_path = debug_dir / f"full_{timestamp}.jpg"
                    cv2.imwrite(str(original_path), original_image)

                    # 切り取り後の画像を保存
                    cropped_path = debug_dir / f"cropped_{timestamp}.jpg"
                    cv2.imwrite(str(cropped_path), image)

            # デバッグモードでない場合は一時ファイル削除
            if not self.debug:
                try:
                    temp_file.unlink()
                except Exception as e:
                    print(f"⚠️ 一時ファイル削除エラー: {e}")

            return image

        except PermissionError:
            print("❌ ファイル書き込み権限エラー")
            return None
        except OSError as e:
            print(f"❌ OS エラー: {e}")
            return None
        except Exception as e:
            print(f"❌ 予期しないキャプチャエラー: {e}")
            return None

    def capture_and_save(self, output_path: Path) -> bool:
        """
        画面をキャプチャしてファイルに保存

        Args:
            output_path: 保存先パス

        Returns:
            bool: 成功/失敗
        """
        try:
            image = self.capture()
            if image is None:
                return False

            cv2.imwrite(str(output_path), image)
            return True
        except Exception as e:
            print(f"❌ 保存エラー: {e}")
            return False

    def get_image_size(self) -> Tuple[int, int]:
        """
        画像サイズを取得

        Returns:
            (width, height)
        """
        try:
            image = self.capture()
            if image is None:
                return (0, 0)

            height, width = image.shape[:2]
            return (width, height)
        except Exception as e:
            print(f"❌ サイズ取得エラー: {e}")
            return (0, 0)

    def cleanup(self) -> None:
        """一時ファイルをクリーンアップ"""
        try:
            if self.temp_dir.exists():
                for file in self.temp_dir.glob("*.png"):
                    try:
                        file.unlink()
                    except Exception as e:
                        print(f"⚠️ ファイル削除警告: {e}")
        except Exception as e:
            print(f"❌ クリーンアップエラー: {e}")


def main() -> None:
    """テスト用のメイン関数"""
    print("=" * 60)
    print("Rola Mini カメラテスト")
    print("=" * 60)
    print()

    # カメラ初期化
    camera = RolaMiniCamera(debug=True)

    # 画像サイズ確認
    width, height = camera.get_image_size()
    print(f"画像サイズ: {width}x{height}")
    print()

    # 連続キャプチャテスト
    print("連続キャプチャテスト (5回、1秒間隔)")
    print("Ctrl+C で停止")
    print()

    output_dir = Path(__file__).parent.parent / "data" / "screenshots" / "camera_test"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        for i in range(5):
            print(f"[{i+1}/5] キャプチャ中...", end=" ", flush=True)

            start_time = time.time()
            image = camera.capture()
            elapsed = time.time() - start_time

            if image is not None:
                output_path = output_dir / f"frame_{i:03d}.png"
                cv2.imwrite(str(output_path), image)
                print(f"✓ ({elapsed:.2f}秒) → {output_path.name}")
            else:
                print("❌ 失敗")

            if i < 4:  # 最後はsleepしない
                time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n中断しました")

    print()
    print("=" * 60)
    print("テスト完了")
    print("=" * 60)
    print(f"保存先: {output_dir}")
    print()

    # クリーンアップ
    camera.cleanup()


if __name__ == "__main__":
    main()
