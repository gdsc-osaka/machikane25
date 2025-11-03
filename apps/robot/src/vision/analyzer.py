#!/usr/bin/env python3
"""
画像解析モジュール

画像認識・解析機能を提供
"""

import cv2
import numpy as np
import base64
import requests
import json
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path
import logging

try:
    from ..common.config import get_config
    from ..common.exceptions import VisionError, APIError
except ImportError:
    # スタンドアロン実行時
    from common.config import get_config
    from common.exceptions import VisionError, APIError

logger = logging.getLogger(__name__)


class ImageAnalyzer:
    """画像解析クラス"""
    
    def __init__(self):
        """初期化"""
        self.config = get_config()
    
    def encode_image_to_base64(self, image: np.ndarray) -> str:
        """
        OpenCV画像をBase64エンコード
        
        Args:
            image: OpenCV画像（BGR形式）
            
        Returns:
            Base64エンコード済み画像データ
        """
        try:
            # JPEGエンコード
            _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            # Base64エンコード
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            return img_base64
            
        except Exception as e:
            logger.error(f"画像エンコードエラー: {e}")
            raise VisionError(f"画像エンコードに失敗: {e}")
    
    def analyze_with_llava(self, image: np.ndarray, prompt: str = "この画像を詳しく説明してください") -> str:
        """
        LlaVa（Ollama）を使用した画像解析
        
        Args:
            image: 解析する画像
            prompt: 解析用プロンプト
            
        Returns:
            解析結果テキスト
        """
        try:
            # 画像をBase64エンコード
            img_base64 = self.encode_image_to_base64(image)
            
            # LlaVa API呼び出し
            api_config = self.config.get_api_config()
            url = api_config.get('llava_url', 'http://localhost:11434/api/generate')
            
            data = {
                "model": "llava:latest",
                "prompt": prompt,
                "images": [img_base64],
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "max_tokens": 300
                }
            }
            
            response = requests.post(url, json=data, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "画像解析に失敗しました")
            else:
                error_msg = f"LlaVa API エラー (HTTP {response.status_code})"
                logger.error(error_msg)
                return error_msg
                
        except requests.exceptions.ConnectionError:
            return "LlaVaモデルが利用できません。'ollama pull llava'を実行してください。"
        except requests.exceptions.Timeout:
            return "画像解析がタイムアウトしました。"
        except Exception as e:
            logger.error(f"LlaVa解析エラー: {e}")
            return f"画像解析エラー: {e}"
    
    def analyze_with_gpt4v(self, image: np.ndarray, prompt: str = "この画像を詳しく説明してください") -> str:
        """
        GPT-4 Visionを使用した画像解析（要APIキー）
        
        Args:
            image: 解析する画像
            prompt: 解析用プロンプト
            
        Returns:
            解析結果テキスト
        """
        try:
            # APIキーの確認
            api_key = self.config.get('openai.api_key')
            if not api_key:
                return "OpenAI APIキーが設定されていません"
            
            # 画像をBase64エンコード
            img_base64 = self.encode_image_to_base64(image)
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            
            payload = {
                "model": "gpt-4-vision-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_base64}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 300
            }
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return f"GPT-4V API エラー (HTTP {response.status_code})"
                
        except Exception as e:
            logger.error(f"GPT-4V解析エラー: {e}")
            return f"GPT-4V解析エラー: {e}"
    
    def detect_objects_opencv(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        OpenCVを使用した基本的な物体検出
        
        Args:
            image: 解析する画像
            
        Returns:
            検出された物体のリスト
        """
        try:
            # グレースケール変換
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 輪郭検出
            contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            objects = []
            for i, contour in enumerate(contours):
                # 面積フィルタ
                area = cv2.contourArea(contour)
                if area < 1000:  # 小さい輪郭は無視
                    continue
                
                # バウンディングボックス
                x, y, w, h = cv2.boundingRect(contour)
                
                objects.append({
                    "id": i,
                    "type": "object",
                    "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "area": int(area),
                    "confidence": 0.5  # 仮の信頼度
                })
            
            return objects
            
        except Exception as e:
            logger.error(f"OpenCV物体検出エラー: {e}")
            return []
    
    def analyze_image_basic(self, image: np.ndarray) -> Dict[str, Any]:
        """
        基本的な画像解析（色・明度・サイズなど）
        
        Args:
            image: 解析する画像
            
        Returns:
            解析結果辞書
        """
        try:
            height, width, channels = image.shape
            
            # 色解析
            mean_color = np.mean(image, axis=(0, 1))
            dominant_color = self._get_dominant_color(image)
            
            # 明度解析
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            
            # エッジ解析
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (width * height)
            
            return {
                "size": {"width": width, "height": height, "channels": channels},
                "colors": {
                    "mean_bgr": mean_color.tolist(),
                    "dominant_bgr": dominant_color.tolist()
                },
                "brightness": float(brightness),
                "edge_density": float(edge_density),
                "objects": self.detect_objects_opencv(image)
            }
            
        except Exception as e:
            logger.error(f"基本画像解析エラー: {e}")
            return {"error": str(e)}
    
    def _get_dominant_color(self, image: np.ndarray, k: int = 5) -> np.ndarray:
        """
        画像の主要色を取得（K-means）
        
        Args:
            image: 入力画像
            k: クラスター数
            
        Returns:
            主要色（BGR）
        """
        try:
            # 画像を1次元配列に変換
            pixels = image.reshape(-1, 3).astype(np.float32)
            
            # K-meansクラスタリング
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
            _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
            
            # 最も多いクラスターの中心を主要色とする
            unique, counts = np.unique(labels, return_counts=True)
            dominant_cluster = unique[np.argmax(counts)]
            dominant_color = centers[dominant_cluster]
            
            return dominant_color.astype(np.uint8)
            
        except Exception as e:
            logger.error(f"主要色抽出エラー: {e}")
            return np.array([128, 128, 128], dtype=np.uint8)  # グレー


class MultiModalAnalyzer:
    """マルチモーダル解析クラス（音声+画像）"""
    
    def __init__(self):
        """初期化"""
        self.image_analyzer = ImageAnalyzer()
        self.config = get_config()
    
    def analyze_with_context(self, image: np.ndarray, voice_text: str = "") -> str:
        """
        音声コンテキストを含む画像解析
        
        Args:
            image: 解析する画像
            voice_text: 音声から変換されたテキスト
            
        Returns:
            解析結果
        """
        # プロンプトの構築
        if voice_text:
            prompt = f"""
ユーザーが「{voice_text}」と言いながらこの画像を見せています。
画像の内容とユーザーの発言を関連付けて、適切に応答してください。
画像に写っているものを具体的に説明し、ユーザーの質問や要求に答えてください。
"""
        else:
            prompt = "この画像を詳しく説明してください。何が写っているか、どのような状況かを教えてください。"
        
        # LlaVaで解析（優先）
        result = self.image_analyzer.analyze_with_llava(image, prompt)
        
        # LlaVaが利用できない場合は基本解析にフォールバック
        if "利用できません" in result or "エラー" in result:
            basic_analysis = self.image_analyzer.analyze_image_basic(image)
            
            objects_count = len(basic_analysis.get("objects", []))
            brightness = basic_analysis.get("brightness", 0)
            
            brightness_desc = "明るい" if brightness > 128 else "暗い"
            
            fallback_result = f"""
画像の基本解析結果：
- 画像サイズ: {basic_analysis['size']['width']}x{basic_analysis['size']['height']}
- 明るさ: {brightness_desc}（{brightness:.1f}/255）
- 検出された物体数: {objects_count}個

※ 詳細な画像認識にはLlaVaモデルが必要です。
  'ollama pull llava'でインストールしてください。
"""
            
            if voice_text:
                fallback_result += f"\n\nユーザーの発言「{voice_text}」に対して、画像の詳細分析ができませんでした。"
            
            return fallback_result
        
        return result


def main() -> None:
    """テスト用のメイン関数"""
    import sys
    
    if len(sys.argv) < 2:
        print("使用方法: python analyzer.py <画像ファイル>")
        return
    
    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(f"画像ファイルが見つかりません: {image_path}")
        return
    
    # 画像読み込み
    image = cv2.imread(str(image_path))
    if image is None:
        print("画像の読み込みに失敗しました")
        return
    
    print("=== 画像解析テスト ===")
    
    analyzer = ImageAnalyzer()
    
    # 基本解析
    print("\n--- 基本解析 ---")
    basic_result = analyzer.analyze_image_basic(image)
    print(json.dumps(basic_result, indent=2, ensure_ascii=False))
    
    # LlaVa解析
    print("\n--- LlaVa解析 ---")
    llava_result = analyzer.analyze_with_llava(image)
    print(llava_result)


if __name__ == "__main__":
    main()