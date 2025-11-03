#!/usr/bin/env python3
"""
Gemma マルチモーダル画像解析モジュール

Gemma マルチモーダルモデルを使用した統合画像・テキスト処理
"""

import cv2
import numpy as np
import base64
import requests
import json
from typing import Optional, Dict, Any
from pathlib import Path
import logging
from datetime import datetime

try:
    from ..common.config import get_config
    from ..common.exceptions import VisionError, APIError
except ImportError:
    # スタンドアロン実行時
    from common.config import get_config
    from common.exceptions import VisionError, APIError

logger = logging.getLogger(__name__)


class GemmaMultiModalAnalyzer:
    """Gemma マルチモーダル解析クラス"""
    
    def __init__(self, model_name: str = "gemma2:27b-instruct", enable_logging: bool = True):
        """
        Args:
            model_name: 使用するGemmaモデル名
                - gemma2:27b-instruct (推奨)
                - gemma2:9b-instruct
                - gemma2:2b-instruct
            enable_logging: プロンプト・応答のログを保存するか
        """
        self.config = get_config()
        self.model_name = model_name
        self.enable_logging = enable_logging

        # API設定
        api_config = self.config.get_api_config()
        self.api_url = api_config.get('ollama_url', 'http://localhost:11434/api/generate')
        self.timeout = api_config.get('timeout', 60)

        # ログディレクトリの作成
        if self.enable_logging:
            self.log_dir = Path("data/gemma_logs")
            self.log_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Gemmaログ保存先: {self.log_dir.absolute()}")
    
    def encode_image_to_base64(self, image: np.ndarray) -> str:
        """
        OpenCV画像をBase64エンコード
        
        Args:
            image: OpenCV画像（BGR形式）
            
        Returns:
            Base64エンコード済み画像データ
        """
        try:
            # JPEGエンコード（圧縮率調整でサイズ最適化）
            _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 90])
            
            # Base64エンコード
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            return img_base64
            
        except Exception as e:
            logger.error(f"画像エンコードエラー: {e}")
            raise VisionError(f"画像エンコードに失敗: {e}")

    def _save_interaction_log(self, prompt: str, response: str, image_saved_path: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        プロンプトと応答をログファイルに保存

        Args:
            prompt: 送信したプロンプト
            response: 受信した応答
            image_saved_path: 保存した画像のパス（オプション）
            metadata: 追加のメタデータ（RAG記憶など）
        """
        if not self.enable_logging:
            return

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            log_file = self.log_dir / f"interaction_{timestamp}.json"

            log_data = {
                "timestamp": datetime.now().isoformat(),
                "model": self.model_name,
                "prompt": prompt,
                "response": response,
                "image_path": str(image_saved_path) if image_saved_path else None
            }

            # メタデータがあれば追加
            if metadata:
                log_data["metadata"] = metadata

            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, ensure_ascii=False, indent=2)

            logger.debug(f"インタラクションログ保存: {log_file.name}")

        except Exception as e:
            logger.error(f"ログ保存エラー: {e}")

    def analyze_with_context(self, image: np.ndarray, user_message: str = "",
                           system_prompt: str = "", metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        画像とテキストを組み合わせた解析

        Args:
            image: 解析する画像
            user_message: ユーザーメッセージ（音声から変換されたテキスト）
            system_prompt: システムプロンプト
            metadata: ログに追加するメタデータ（RAG記憶の有無など）

        Returns:
            解析結果テキスト
        """
        try:
            # 画像をBase64エンコード
            img_base64 = self.encode_image_to_base64(image)

            # デバッグ用に画像を保存（ログ有効時）
            image_saved_path = None
            if self.enable_logging:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                image_saved_path = self.log_dir / f"image_{timestamp}.jpg"
                cv2.imwrite(str(image_saved_path), image)

            # プロンプトの構築
            # system_promptとuser_messageの役割を正しく分離
            if system_prompt:
                # システムプロンプトが指定されている場合
                if user_message:
                    # ユーザーメッセージもある場合
                    prompt = f"""{system_prompt}

{user_message}"""
                else:
                    # システムプロンプトのみ
                    prompt = system_prompt
            else:
                # デフォルトプロンプト（システムプロンプトなし）
                if user_message:
                    prompt = user_message
                else:
                    prompt = "この画像について詳しく説明してください。"
            
            # Gemma マルチモーダル API呼び出し
            data = {
                "model": self.model_name,
                "prompt": prompt,
                "images": [img_base64],
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "max_tokens": 500,
                    "top_p": 0.9,
                    "top_k": 40
                }
            }
            
            logger.info(f"Gemma {self.model_name} で画像解析中...")
            response = requests.post(self.api_url, json=data, timeout=self.timeout)

            # レスポンス処理
            response_text = ""
            if response.status_code == 200:
                result = response.json()
                response_text = result.get("response", "画像解析に失敗しました")
            elif response.status_code == 404:
                response_text = f"Gemmaモデル '{self.model_name}' が見つかりません。'ollama pull {self.model_name}'を実行してください。"
            else:
                error_msg = f"Gemma API エラー (HTTP {response.status_code})"
                logger.error(error_msg)
                response_text = error_msg

            # ログ保存
            self._save_interaction_log(prompt, response_text, image_saved_path, metadata)

            return response_text
                
        except requests.exceptions.ConnectionError:
            error_msg = "Gemmaサーバーに接続できません。'ollama serve'を実行してください。"
            self._save_interaction_log(prompt if 'prompt' in locals() else "プロンプト生成前にエラー", error_msg, image_saved_path if 'image_saved_path' in locals() else None, metadata)
            return error_msg
        except requests.exceptions.Timeout:
            error_msg = f"画像解析がタイムアウトしました（{self.timeout}秒）。画像サイズが大きすぎる可能性があります。"
            self._save_interaction_log(prompt if 'prompt' in locals() else "プロンプト生成前にエラー", error_msg, image_saved_path if 'image_saved_path' in locals() else None, metadata)
            return error_msg
        except Exception as e:
            logger.error(f"Gemma解析エラー: {e}")
            error_msg = f"画像解析エラー: {e}"
            self._save_interaction_log(prompt if 'prompt' in locals() else "プロンプト生成前にエラー", error_msg, image_saved_path if 'image_saved_path' in locals() else None, metadata)
            return error_msg
    
    def analyze_game_screen(self, image: np.ndarray, user_question: str = "") -> str:
        """
        ゲーム画面専用の解析
        
        Args:
            image: ゲーム画面の画像
            user_question: ユーザーの質問
            
        Returns:
            ゲーム画面の解析結果
        """
        system_prompt = """あなたはゲーム攻略のエキスパートアシスタントです。
ゲーム画面を詳しく分析し、以下の観点で説明してください：

1. 現在の画面の状況（メニュー、ゲーム中、設定画面など）
2. 表示されているUI要素（ボタン、アイコン、テキスト）
3. キャラクターやアイテムの状態
4. 次に取るべき行動の提案
5. 操作方法のアドバイス

ユーザーが質問した場合は、その質問に重点を置いて回答してください。
日本語で分かりやすく説明してください。"""
        
        return self.analyze_with_context(image, user_question, system_prompt)
    
    def analyze_ui_elements(self, image: np.ndarray) -> Dict[str, Any]:
        """
        UI要素の詳細解析
        
        Args:
            image: 解析する画像
            
        Returns:
            UI要素の詳細情報
        """
        system_prompt = """画像内のユーザーインターフェース要素を詳細に分析してください。
以下の形式でJSONとして回答してください：

{
  "screen_type": "メニュー画面/ゲーム画面/設定画面など",
  "buttons": [
    {
      "text": "ボタンのテキスト",
      "color": "ボタンの色",
      "position": "位置（左上、右下など）",
      "function": "推測される機能"
    }
  ],
  "text_elements": ["画面に表示されているテキスト"],
  "characters": ["キャラクター情報"],
  "items": ["アイテム情報"],
  "overall_status": "画面全体の状況説明"
}"""
        
        result = self.analyze_with_context(image, "", system_prompt)
        
        # JSON形式での応答を試みる
        try:
            # JSONパースを試行
            import re
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        # JSON解析に失敗した場合はテキストとして返す
        return {"analysis": result}
    
    def suggest_next_action(self, image: np.ndarray, current_goal: str = "") -> str:
        """
        次の行動を提案
        
        Args:
            image: 現在の画面
            current_goal: 現在の目標（オプション）
            
        Returns:
            行動提案
        """
        goal_text = f"現在の目標: {current_goal}\n\n" if current_goal else ""
        
        system_prompt = f"""{goal_text}この画面を見て、次に取るべき最適な行動を提案してください。

提案する際は以下を考慮してください：
1. 画面の現在の状況
2. 利用可能な操作（タップ、スワイプ、キー入力）
3. 効率的な進め方
4. リスクの回避

具体的で実行可能な行動を日本語で提案してください。"""
        
        return self.analyze_with_context(image, "", system_prompt)


def main() -> None:
    """テスト用のメイン関数"""
    import sys
    
    if len(sys.argv) < 2:
        print("使用方法: python gemma_multimodal.py <画像ファイル> [質問]")
        return
    
    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(f"画像ファイルが見つかりません: {image_path}")
        return
    
    question = sys.argv[2] if len(sys.argv) > 2 else ""
    
    # 画像読み込み
    image = cv2.imread(str(image_path))
    if image is None:
        print("画像の読み込みに失敗しました")
        return
    
    print("=== Gemma マルチモーダル画像解析テスト ===")
    print(f"画像: {image_path}")
    print(f"質問: {question if question else '(なし)'}")
    print()
    
    analyzer = GemmaMultiModalAnalyzer()
    
    # 基本解析
    print("--- 基本解析 ---")
    if question:
        result = analyzer.analyze_with_context(image, question)
    else:
        result = analyzer.analyze_with_context(image)
    print(result)
    
    # ゲーム画面解析（ゲーム関連の画像の場合）
    if not question:
        print("\n--- ゲーム画面解析 ---")
        game_result = analyzer.analyze_game_screen(image)
        print(game_result)


if __name__ == "__main__":
    main()