#!/usr/bin/env python3
"""
たこまる君 - Agent Brain (メインループ)

自律的に観察・思考・行動・記憶を繰り返すロボットの脳
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging
import re

try:
    # パッケージ内からの相対インポート(__init__.pyを経由しない)
    from ..vision.camera import RolaMiniCamera
    from ..vision.gemma_multimodal import GemmaMultiModalAnalyzer
    from ..audio.recorder import AudioRecorder
    from ..audio.file_based_listener import FileBasedListener
    from ..actuators.speaker import VoiceVoxSpeaker
    from ..rag.memory import MemorySystem
    from ..models.thought import Thought
    from ..models.memory import Memory
    from ..common.config import get_config
    from ..robot.controller import RolaMiniController
except ImportError:
    # スタンドアロン実行時の絶対インポート
    from vision.camera import RolaMiniCamera
    from vision.gemma_multimodal import GemmaMultiModalAnalyzer
    from audio.recorder import AudioRecorder
    from audio.file_based_listener import FileBasedListener
    from actuators.speaker import VoiceVoxSpeaker
    from rag.memory import MemorySystem
    from models.thought import Thought
    from models.memory import Memory
    from common.config import get_config
    from robot.controller import RolaMiniController

logger = logging.getLogger(__name__)


class TakomaruBrain:
    """たこまる君の脳 - メインループ制御"""
    
    def __init__(self):
        """初期化"""
        self.config = get_config()
        
        # コンポーネント初期化
        self.camera = None
        self.microphone = None
        self.speaker = None
        self.memory_system = None
        self.gemma_analyzer = None
        self.continuous_listener = None  # 常時リスニングシステム
        self.robot_controller = None

        # 状態管理
        self.is_running = False
        self.loop_count = 0
        self.last_interaction_time = None

        # 発言履歴（最近の発言を記録して重複を避ける）
        self.recent_responses = []  # 最近5件の発言を保存：[(timestamp, response, thought), ...]
        self.max_recent_responses = 5

        # 音声入力バッファ（常時リスニングから受け取った音声）
        self.speech_buffer = []  # [(timestamp, text), ...]
        self.max_speech_buffer = 10

        # 性格・設定
        self.personality = self._load_personality()
        self.observation_interval = 3  # 観察間隔（秒）
        self.vision_log_path = Path("data/vision_logs/observations.log")
        self.vision_log_path.parent.mkdir(parents=True, exist_ok=True)
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._last_transcription_time: Optional[datetime] = None
        self._last_transcribed_text: Optional[str] = None
        self.last_user_movement_request: Optional[str] = None
    
    def _load_personality(self) -> Dict[str, Any]:
        """たこまる君の性格設定をロード"""
        return {
            "name": "たこまる君",
            "traits": [
                "好奇心旺盛で、新しいものが大好き",
                "人懐っこく、誰とでも仲良くなれる", 
                "見たこと、聞いたことをすぐに覚える",
                "ちょっと天然で、可愛らしい"
            ],
            "likes": ["珍しいもの", "新しい友達", "面白い話"],
            "dislikes": ["静かすぎる場所（寂しい）", "難しい質問（でも頑張って考える）"],
            "phrases": [],
            "speaking_guidelines": "自然で落ち着いた日本語で丁寧に話し、決まり文句や口癖を使わずに相手の言葉へ寄り添って応答する。"
        }

    def _on_speech_detected(self, text: str, timestamp: Optional[str] = None):
        """
        常時リスニングで音声が検出されたときのコールバック

        Args:
            text: 文字起こしされたテキスト
        """
        event_time = datetime.fromisoformat(timestamp) if timestamp else datetime.now()
        if self._last_transcription_time and event_time < self._last_transcription_time:
            logger.debug("過去の文字起こしをスキップ: %s (%s)", text, event_time.isoformat())
            return

        print(f"\n👂 [音声入力] {text}")

        # バッファに追加
        self.speech_buffer.append((event_time, text))

        # バッファサイズ制限
        if len(self.speech_buffer) > self.max_speech_buffer:
            self.speech_buffer.pop(0)

        # 記憶として保存（非同期タスクとして実行）
        if self._event_loop and self._event_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self._save_speech_memory(text, event_time),
                self._event_loop
            )
        else:
            asyncio.create_task(self._save_speech_memory(text, event_time))

        self._last_transcription_time = event_time

    async def _save_speech_memory(self, text: str, timestamp: datetime):
        """
        音声入力を記憶として保存

        Args:
            text: 音声テキスト
            timestamp: タイムスタンプ
        """
        try:
            normalized_text = text.strip()
            if not normalized_text:
                return

            if (
                self._last_transcription_time
                and timestamp <= self._last_transcription_time
                and self._last_transcribed_text == normalized_text
            ):
                logger.debug("重複した音声記憶をスキップ: %s", normalized_text)
                return

            if self.memory_system:
                await self.memory_system.add_memory(
                    content=f"ユーザーが話しかけてきた: 「{normalized_text}」",
                    memory_type="interaction",
                    importance=0.8,
                    tags=["voice_input", "user_speech"]
                )
                print(f"💾 音声を記憶に保存しました")
                self._last_transcription_time = timestamp
                self._last_transcribed_text = normalized_text
        except Exception as e:
            logger.error(f"音声記憶保存エラー: {e}")

    async def initialize(self) -> bool:
        """システム全体の初期化"""
        try:
            print("🧠 たこまる君を起動中...")
            
            # カメラ初期化（Rola Mini via BlueStacks）
            print("📷 カメラを初期化中...")
            bluestacks_config = self.config.get_bluestacks_config()
            device_id = bluestacks_config.get('device_id', '127.0.0.1:5555')
            crop_top = bluestacks_config.get('camera_crop_top', 0.10)
            crop_bottom = bluestacks_config.get('camera_crop_bottom', 0.37)
            crop_left = bluestacks_config.get('camera_crop_left', 0.05)
            crop_right = bluestacks_config.get('camera_crop_right', 0.95)
            # デバッグモードONにして画像を保存
            self.camera = RolaMiniCamera(device_id, debug=True,
                                        crop_top=crop_top, crop_bottom=crop_bottom,
                                        crop_left=crop_left, crop_right=crop_right)
            print(f"✅ カメラ初期化完了 (切り取り: 上{int(crop_top*100)}%-{int(crop_bottom*100)}%, 左右{int(crop_left*100)}%除去)")

            # ロボットコントローラ初期化
            try:
                control_points = bluestacks_config.get("control_points")
                self.robot_controller = RolaMiniController(device_id=device_id, points=control_points)
                print("🤖 ロボットコントローラ初期化完了")
            except Exception as controller_error:
                logger.warning("ロボットコントローラ初期化に失敗しました: %s", controller_error)
                self.robot_controller = None

            # デバッグ用ディレクトリ作成
            from pathlib import Path
            self.debug_dir = Path("data/debug_images")
            self.debug_dir.mkdir(parents=True, exist_ok=True)
            print(f"📁 デバッグ画像保存先: {self.debug_dir.absolute()}")
            
            # 音声システム初期化
            print("🎤🔊 音声システムを初期化中...")
            try:
                voicevox_config = self.config.get_voicevox_config()
                self.speaker = VoiceVoxSpeaker(
                    speaker_id=voicevox_config.get("speaker_id", 3),
                    speed_scale=voicevox_config.get("speed_scale", 1.0),
                    pitch_scale=voicevox_config.get("pitch_scale", 0.0),
                    intonation_scale=voicevox_config.get("intonation_scale", 1.0),
                    volume_scale=voicevox_config.get("volume_scale", 1.0),
                )
                if self.speaker.check_connection():
                    print("✅ VoiceVox音声システム初期化完了")
                else:
                    print("⚠️ VoiceVoxが利用できません（音声なしで継続）")
                    self.speaker = None
            except Exception as e:
                print(f"⚠️ VoiceVox初期化エラー: {e}")
                print("⚠️ 音声なしで継続します")
                self.speaker = None
            
            # Gemma マルチモーダル初期化
            print("🤖 Gemma マルチモーダルAIを初期化中...")
            model_name = self.config.get('api.vision_model', 'gemma3:4b')
            self.gemma_analyzer = GemmaMultiModalAnalyzer(model_name, enable_logging=True)
            print(f"✅ Gemma {model_name} 初期化完了")
            print(f"📝 プロンプト・応答ログ: data/gemma_logs/interaction_*.json")
            
            # RAGメモリシステム初期化
            print("🧠 記憶システムを初期化中...")
            self.memory_system = MemorySystem()
            await self.memory_system.initialize()
            print("✅ 記憶システム初期化完了")

            # 文字起こしログリスナー初期化
            print("👂 文字起こしログリスナーを初期化中...")
            self.continuous_listener = FileBasedListener(
                on_speech_detected=self._on_speech_detected,
                log_file="data/shared_audio/transcriptions.log",
                check_interval=1.0  # 1秒ごとにログチェック
            )
            if self.continuous_listener.initialize():
                print("✅ 文字起こしログリスナー初期化完了")
                print("💡 別ターミナルで `python3 audio_recorder_daemon.py` を実行して録音・文字起こしを開始してください")
            else:
                print("⚠️ ログリスナー初期化失敗（音声入力なしで継続）")
                self.continuous_listener = None

            print("\n🎉 たこまる君起動完了！")
            return True
            
        except Exception as e:
            logger.error(f"初期化エラー: {e}")
            print(f"❌ 初期化エラー: {e}")
            return False
    
    async def run(self) -> None:
        """メインループ実行"""
        self._event_loop = asyncio.get_running_loop()
        if not await self.initialize():
            print("❌ 初期化に失敗しました")
            return
        
        self.is_running = True

        # 常時リスニング開始
        if self.continuous_listener:
            self.continuous_listener.start()

        print("\n🔄 たこまる君のメインループを開始します...")
        print("="*60)
        print("たこまる君が自律的に動作中...")
        print("")
        print("【操作方法】")
        print("  👂 常時リスニング: いつでも話しかけてください")
        print("  ⏹️  終了: Ctrl+C")
        print("="*60)

        try:
            while self.is_running:
                await self._main_loop_cycle()
                await asyncio.sleep(self.observation_interval)
                
        except KeyboardInterrupt:
            print("\n\n👋 たこまる君を停止中...")
            self.is_running = False
        except Exception as e:
            logger.error(f"メインループエラー: {e}")
            print(f"❌ エラーが発生しました: {e}")
        finally:
            await self._cleanup()
    
    async def _main_loop_cycle(self) -> None:
        """メインループの1サイクル"""
        self.loop_count += 1
        current_time = datetime.now()

        print(f"\n--- Cycle {self.loop_count} ({current_time.strftime('%H:%M:%S')}) ---")

        try:
            # 0. 音声バッファをチェック（常時リスニングからの入力）
            if self.speech_buffer:
                print(f"👂 音声バッファに {len(self.speech_buffer)} 件の入力があります")
                # 最新の音声入力だけを取得し、バッファをクリア
                timestamp, text = self.speech_buffer[-1]
                self.speech_buffer.clear()
                print(f"🔊 処理中: 「{text}」")

                # 観察して音声入力に反応
                observation = await self._observe()
                await self._handle_voice_interaction(text, observation)

                # 音声入力を処理したら、このサイクルは終了
                return

            # 1. 観察フェーズ
            print("👁️ 観察中...")
            observation = await self._observe()

            # 2. 思考フェーズ
            print("🤔 思考中...")
            thought = await self._think(observation)

            # 3. 行動フェーズ
            if thought and thought.should_respond:
                print("💬 発話中...")
                await self._act(thought)

            if thought and thought.movement:
                await self._perform_movement(thought.movement)

            # 4. 記憶フェーズ
            if thought and thought.should_remember:
                print("💾 記憶中...")
                await self._remember(thought, observation)
            
        except Exception as e:
            logger.error(f"サイクルエラー: {e}")
            print(f"⚠️ サイクル{self.loop_count}でエラー: {e}")
    
    async def _observe(self) -> Dict[str, Any]:
        """観察フェーズ - カメラ画像取得"""
        observation = {
            "timestamp": datetime.now().isoformat(),
            "image": None,
            "image_description": "カメラが利用できません"
        }

        try:
            # カメラから画像取得
            if self.camera:
                image = self.camera.capture()
                if image is not None:
                    observation["image"] = image

                    # 簡単な画像解析
                    height, width = image.shape[:2]
                    mean_brightness = image.mean()

                    observation["image_info"] = {
                        "size": f"{width}x{height}",
                        "brightness": float(mean_brightness)
                    }

                    # 🔍 デバッグ: 画像を保存して確認できるようにする
                    import cv2
                    debug_path = self.debug_dir / f"cycle_{self.loop_count:04d}_observe.jpg"
                    cv2.imwrite(str(debug_path), image)
                    print(f"  📸 画像保存: {debug_path.name} ({width}x{height}, 明るさ:{mean_brightness:.1f})")

                    # 何か興味深いものがあるかクイック判定
                    quick_description = await self._quick_image_analysis(image)
                    observation["image_description"] = quick_description
                    self._log_image_analysis(quick_description, observation)

        except Exception as e:
            logger.error(f"観察エラー: {e}")
            observation["error"] = str(e)

        return observation
    
    async def _quick_image_analysis(self, image) -> str:
        """画像の簡単な解析（興味深いものがあるかチェック）"""
        try:
            # Gemmaマルチモーダルで簡単な解析
            system_prompt = """画像に写る内容を客観的に列挙してください。

【出力形式】
- 見えている事実のみを短い箇条書きで最大3項目
- 前置き文や挨拶を入れない
- 推測は避け、分からないものは「不明」と記載
- 人物がいれば最優先で報告する"""

            result = self.gemma_analyzer.analyze_with_context(image, system_prompt=system_prompt)
            return self._clean_image_description(result)
            
        except Exception as e:
            logger.error(f"クイック画像解析エラー: {e}")
            return "画像を解析できませんでした"
    
    def _log_image_analysis(self, description: str, observation: Dict[str, Any]) -> None:
        """画像認識結果をファイルに記録"""
        try:
            entry = {
                "timestamp": datetime.now().isoformat(),
                "cycle": self.loop_count,
                "description": description,
                "image_info": observation.get("image_info"),
            }
            with self.vision_log_path.open("a", encoding="utf-8") as log_file:
                log_file.write(json.dumps(entry, ensure_ascii=False))
                log_file.write("\n")
        except Exception as e:
            logger.error(f"画像認識ログ保存エラー: {e}")

    def _contains_person(self, description: str) -> bool:
        """画像説明に人物が含まれているかをざっくり判定"""
        if not description:
            return False
        patterns = (
            r"人が",
            r"人の",
            r"人は",
            r"人物",
            r"男性",
            r"女性",
            r"男の人",
            r"女の人",
            r"子供",
            r"子ども",
            r"人影",
        )
        return any(re.search(pattern, description) for pattern in patterns)

    def _clean_image_description(self, text: str) -> str:
        """Gemmaの応答から不要な前置きを除去"""
        lines = []
        for line in text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("以下に"):
                continue
            lines.append(stripped)
        return "\n".join(lines)

    def _sanitize_text(self, text: str) -> str:
        """発話・ログ用にテキストを整形"""
        if text is None:
            return ""
        cleaned = str(text).strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
            if cleaned.endswith("```"):
                cleaned = cleaned[:cleaned.rfind("```")]
        cleaned = cleaned.replace("```json", "").replace("```", "")
        return cleaned.strip()

    def _json_output_rules(self) -> str:
        return (
            "以下の条件を厳守して JSON を1つだけ出力してください。"
            "先頭や末尾に文章やコードブロックを追加してはいけません。"
            "キーは省略せず、追加もせず、観察と記憶に基づく事実だけを書いてください。\n"
            "{\n"
            "  \"thought\": \"内心の思考（あなたらしく、素直に）\",\n"
            "  \"utterance\": \"相手に伝える一言（自然で丁寧な日本語。決まり文句は使わない）\",\n"
            "  \"movement\": \"forward_backward\" / \"right_turn\" / \"none\"\n"
            "}\n\n"
            "movement は必ず設定してください。動かない場合でも \"movement\": \"none\" と書きます。"
            "ユーザーが移動を求めた場合は forward_backward または right_turn を選び、"
            "近くに人がいてフレンドリーにアピールしたいときは right_turn を使って軽く動いて構いません。"
        )

    async def _think(self, observation: Dict[str, Any]) -> Optional[Thought]:
        """思考フェーズ - 状況を分析して行動を決定"""
        try:
            # 過去の記憶を検索
            context = await self._get_relevant_memories(observation)

            # 最後のインタラクションからの時間
            time_since_interaction = self._time_since_last_interaction()

            # 過去の発言履歴を文字列化（直近の発話を詳細に）
            recent_responses_str = ""
            if self.recent_responses:
                formatted_responses = []
                now = datetime.now()
                for timestamp, response, thought in self.recent_responses:
                    seconds_ago = (now - timestamp).total_seconds()
                    if seconds_ago < 60:
                        time_str = f"{int(seconds_ago)}秒前"
                    else:
                        time_str = f"{int(seconds_ago / 60)}分前"
                    formatted_responses.append(f"- [{time_str}] 「{response}」（内心: {thought}）")
                recent_responses_str = "\n".join(formatted_responses)

            # 過去の記憶を整形
            memory_str = ""
            if context:
                memory_str = context
            else:
                memory_str = "まだ何も覚えていません。"

            observation_description = observation.get("image_description", "")
            observation_has_person = self._contains_person(observation_description)
            speaking_guidelines = self.personality.get(
                "speaking_guidelines",
                "自然で落ち着いた日本語で丁寧に話し、決まり文句を避けてください。"
            )
            phrases = self.personality.get("phrases", [])
            if phrases:
                speaking_guidelines += f"\n以前よく使っていた口癖（{', '.join(phrases)}）は繰り返さない。"

            json_rules = self._json_output_rules()
            system_prompt = (
                "あなたは『{name}』という好奇心旺盛なロボットの心です。\n\n"
                "【あなたの性格】\n{traits}\n\n"
                "【好きなもの】\n{likes}\n\n"
                "【話し方のガイドライン】\n{guidelines}\n\n"
                "【今見えているもの】\n{observation}\n\n"
                "【過去の記憶（関連する経験）】\n{memory}\n\n"
                "【直近であなたが言ったこと（同じことを繰り返さないで！）】\n{recent}\n\n"
                "【状況】\n"
                "- 最後に誰かと話してから: {since_last:.1f}分\n"
                "- 起動してから: {loop_count}回観察しました\n"
                "- 直近の発話回数: {recent_count}回\n\n"
                "{json_rules}"
            ).format(
                name=self.personality["name"],
                traits="\n".join(f"- {trait}" for trait in self.personality["traits"]),
                likes=", ".join(self.personality["likes"]),
                guidelines=speaking_guidelines,
                observation=observation.get("image_description", "カメラが使えません"),
                memory=memory_str,
                recent=recent_responses_str if recent_responses_str else "まだ何も話していません",
                since_last=time_since_interaction,
                loop_count=self.loop_count,
                recent_count=len(self.recent_responses),
                json_rules=json_rules,
            )

            user_message = "今の状況を見て、どう感じて、どうするか決めてください。"

            if observation.get("image") is not None:
                # RAG記憶の有無をメタデータとして記録
                rag_metadata = {
                    "has_memories": bool(context),
                    "memory_count": len(context.split('\n')) if context else 0,
                    "memory_content": context if context else None,
                    "recent_responses_count": len(self.recent_responses),
                    "loop_count": self.loop_count,
                    "time_since_interaction": f"{time_since_interaction:.1f}分",
                    "people_detected": observation_has_person,
                }

                response = self.gemma_analyzer.analyze_with_context(
                    observation["image"],
                    user_message=user_message,
                    system_prompt=system_prompt,
                    metadata=rag_metadata
                )
            else:
                # 画像がない場合はテキストのみで判断
                response = f"画像が取得できない状況です。{user_message}"

            # JSON解析を試行
            thought = self._parse_thought_response(response)
            if thought and thought.movement:
                if self.last_user_movement_request:
                    if not self._movement_matches_request(thought.movement):
                        logger.debug("ユーザーのリクエストと一致しないため移動コマンドを破棄します: %s", thought.movement)
                        thought.movement = "none"
                else:
                    if observation_has_person:
                        if thought.movement not in {"forward_backward", "right_turn"}:
                            logger.debug("人物検出時のアピールとして movement を right_turn に変更します (was: %s)", thought.movement)
                            thought.movement = "right_turn"
                    else:
                        logger.debug("人物検出もユーザー指示もないため移動コマンドを 'none' に設定します: %s", thought.movement)
                        thought.movement = "none"
            
            if thought and observation.get("image") is not None and not observation_has_person and not self.last_user_movement_request:
                logger.debug("人が写っていないため発話を抑制します")
                thought.should_respond = False
                suppression_reason = "周囲に人がいないため発話を控えました"
                if thought.reason:
                    thought.reason = f"{thought.reason} / {suppression_reason}"
                else:
                    thought.reason = suppression_reason
            return thought
            
        except Exception as e:
            logger.error(f"思考エラー: {e}")
            return None
    
    def _normalize_movement(self, value) -> str:
        if value is None:
            return "none"
        val = str(value).strip().lower()
        if val in {"none", "", "stay", "idle"}:
            return "none"
        mapping = {
            "forward_backward": "forward_backward",
            "forward": "forward_backward",
            "backward": "forward_backward",
            "reverse": "forward_backward",
            "back": "forward_backward",
            "right_turn": "right_turn",
            "right": "right_turn",
            "turn_right": "right_turn",
            "stop": "none",
            "halt": "none",
        }
        return mapping.get(val, "none")

    def _movement_matches_request(self, movement: str) -> bool:
        if movement == "none":
            return False
        if not self.last_user_movement_request:
            return False
        if movement == self.last_user_movement_request:
            return True
        equivalence = {
            "forward_backward": {"forward_backward"},
            "right_turn": {"right_turn"},
        }
        request = self.last_user_movement_request
        if request in equivalence:
            return movement in equivalence[request]
        return False

    def _parse_thought_response(self, response: str) -> Optional[Thought]:
        """Gemmaの応答からThoughtオブジェクトを生成"""
        try:
            import re
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
                if cleaned.endswith("```"):
                    cleaned = cleaned[:cleaned.rfind("```")]
                cleaned = cleaned.strip()
            cleaned = cleaned.replace("```json", "").replace("```", "")

            json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                compact_json = " ".join(json_str.splitlines())
                try:
                    data = json.loads(compact_json, strict=False)
                except json.JSONDecodeError as decode_error:
                    logger.error("思考解析エラー(JSON): %s", decode_error)
                else:
                    if data:
                        utterance = self._sanitize_text(data.get("utterance", ""))
                        thought_text = self._sanitize_text(data.get("thought", ""))
                        movement_value = self._normalize_movement(data.get("movement"))
                        return Thought(
                            thought=thought_text,
                            should_respond=bool(utterance),
                            response=utterance,
                            emotion=data.get("emotion", "neutral"),
                            should_remember=bool(data.get("should_remember", False)),
                            reason=self._sanitize_text(data.get("reason", thought_text)),
                            movement=movement_value
                        )

            logger.warning("JSON形式での応答が得られませんでした: %s", response)
            sanitized = self._sanitize_text(response)
            return Thought(
                thought="JSONが解析できませんでした",
                should_respond=True,
                response=sanitized[:100] + "..." if len(sanitized) > 100 else sanitized,
                emotion="confused",
                should_remember=False,
                reason="フォールバック応答",
                movement="none"
            )

        except Exception as e:
            logger.error(f"思考解析エラー: {e}")
            return None
    
    async def _act(self, thought: Thought) -> None:
        """行動フェーズ - 発話実行"""
        try:
            if thought.response and self.speaker:
                print(f"💭 思考: {thought.thought}")
                print(f"😊 感情: {thought.emotion}")
                sanitized_response = self._sanitize_text(thought.response)
                print(f"🗣️ 発話: {sanitized_response}")

                # VoiceVoxスピーカーで感情込めて発話
                # 感情マッピング
                emotion_map = {

                    "excited": "excited",
                    "happy": "happy",
                    "sad": "sad",
                    "surprised": "surprised",
                    "curious": "excited",
                    "bored": "calm",
                    "neutral": "normal"
                }
                voicevox_emotion = emotion_map.get(thought.emotion, "normal")
                self.speaker.speak_with_emotion(sanitized_response, voicevox_emotion)

                # 発言履歴に追加（最近5件を保持）
                now = datetime.now()
                self.recent_responses.append((now, sanitized_response, thought.thought))
                if len(self.recent_responses) > self.max_recent_responses:
                    self.recent_responses.pop(0)  # 古い発言を削除

                self.last_interaction_time = now

        except Exception as e:
            logger.error(f"行動エラー: {e}")

    async def _perform_movement(self, movement: str) -> None:
        """ロボットの移動を実行"""
        if not self.robot_controller:
            logger.debug("ロボットコントローラが利用できないため移動をスキップしました")
            return

        if movement == "none":
            logger.debug("movement が 'none' のため実行をスキップします")
            self.last_user_movement_request = None
            return

        success = self.robot_controller.move(movement)
        if success:
            print(f"🤖 移動コマンド実行: {movement}")
            self.last_user_movement_request = None
        else:
            logger.warning("移動コマンドの実行に失敗しました: %s", movement)


    async def _remember(self, thought: Thought, observation: Dict[str, Any]) -> None:
        """記憶フェーズ - 経験を保存"""
        try:
            if self.memory_system:
                memory = Memory(
                    content=f"思考: {thought.thought} | 発話: {thought.response}",
                    memory_type="interaction",
                    emotion=thought.emotion,
                    image_data=observation.get("image"),
                    metadata={
                        "loop_count": self.loop_count,
                        "observation": observation.get("image_description", ""),
                        "reason": thought.reason
                    }
                )
                
                await self.memory_system.store_memory(memory)
                
        except Exception as e:
            logger.error(f"記憶エラー: {e}")
    
    async def _get_relevant_memories(self, observation: Dict[str, Any]) -> str:
        """関連する記憶を検索"""
        try:
            if self.memory_system:
                query = observation.get("image_description", "現在の状況")
                memories = await self.memory_system.search_memories(query, k=3)
                
                if memories:
                    return "\n".join([f"- {mem.content}" for mem in memories])
            
            return ""
            
        except Exception as e:
            logger.error(f"記憶検索エラー: {e}")
            return ""
    
    def _time_since_last_interaction(self) -> float:
        """最後のインタラクションからの経過時間（分）"""
        if self.last_interaction_time:
            delta = datetime.now() - self.last_interaction_time
            return delta.total_seconds() / 60
        return float('inf')
    
    async def _listen_for_input(self, timeout: float = 1.0) -> Optional[str]:
        """非同期音声入力（常に録音）"""
        try:
            # AudioRecorderがない場合は初期化
            if not hasattr(self, 'audio_recorder'):
                print("🎤 音声認識を初期化中...")
                self.audio_recorder = AudioRecorder(sample_rate=48000, channels=2)

                # Faster-Whisperの初期化
                try:
                    from faster_whisper import WhisperModel
                    # より高精度なモデルを使用（medium推奨、GPUがあればlargeも可）
                    model_size = "medium"  # base < small < medium < large
                    device = "cpu"
                    compute_type = "int8"  # int8 < float16 < float32

                    # GPUが利用可能か確認（torchがない場合はスキップ）
                    try:
                        import torch
                        if torch.cuda.is_available():
                            device = "cuda"
                            compute_type = "float16"
                            print("🚀 GPU検出: より高精度な設定を使用")
                        else:
                            print("💻 CPU使用: 精度優先の設定を使用")
                    except ImportError:
                        print("💻 CPU使用: 精度優先の設定を使用 (torch未インストール)")

                    self.whisper_model = WhisperModel(
                        model_size,
                        device=device,
                        compute_type=compute_type,
                        num_workers=2  # 並列処理でパフォーマンス向上
                    )
                    print(f"✅ Whisper音声認識初期化完了 (model: {model_size}, compute: {compute_type})")
                except Exception as e:
                    print(f"⚠️ Whisper初期化失敗: {e}")
                    return None

            # 音声録音（10秒間 - 長めに設定して途切れないようにする）
            print("🎤 聞いています（話し終わるまで録音します）...")

            # 一時ファイルに保存
            from pathlib import Path
            temp_dir = Path("temp")
            temp_dir.mkdir(exist_ok=True)
            temp_file = temp_dir / "temp_recording.wav"

            # 録音して保存（10秒間）
            success = self.audio_recorder.record_and_save(
                duration=10,
                output_path=temp_file
            )

            if not success or not temp_file.exists():
                return None

            # 音声認識（VAD有効化で無音部分を自動スキップ）
            segments, info = self.whisper_model.transcribe(
                str(temp_file),
                language="ja",
                vad_filter=True,  # 音声アクティビティ検出を有効化
                vad_parameters=dict(
                    min_silence_duration_ms=500,  # 500ms以上の無音で区切る
                    threshold=0.5  # 音声検出の閾値
                )
            )
            text = " ".join([segment.text for segment in segments])

            # 一時ファイル削除
            try:
                temp_file.unlink()
            except:
                pass

            if text.strip():
                print(f"👂 音声入力: {text}")
                transcript = text.strip()
                await self._save_speech_memory(transcript, datetime.now())
                return transcript

            return None

        except Exception as e:
            logger.error(f"音声入力エラー: {e}")
            return None
    
    async def _handle_voice_interaction(self, audio_input: str, observation: Dict[str, Any]) -> None:
        """音声入力への対応"""
        print(f"👂 音声入力: {audio_input}")

        lowered = audio_input.lower()
        movement_request = None
        movement_keywords = [
            ("forward_backward", ["前に", "前進", "進んで", "進め", "下がって", "戻って", "back", "forward"]),
            ("right_turn", ["右回転", "右ターン", "右回り", "右に回", "右旋回", "右向", "右へ向", "right turn"]),
        ]
        for command, keywords in movement_keywords:
            if any(keyword in audio_input for keyword in keywords):
                movement_request = command
                break

        if movement_request:
            self.last_user_movement_request = movement_request
            logger.info("ユーザーが移動をリクエストしました: %s", movement_request)

        # 音声入力に対する応答生成
        if observation.get("image") is not None:
            # 🔍 デバッグ: 画像認識に送る画像を保存
            import cv2
            debug_path = self.debug_dir / f"cycle_{self.loop_count:04d}_voice_input.jpg"
            cv2.imwrite(str(debug_path), observation["image"])
            height, width = observation["image"].shape[:2]
            mean_brightness = observation["image"].mean()
            print(f"  📸 音声応答用画像: {debug_path.name} ({width}x{height}, 明るさ:{mean_brightness:.1f})")

            # 過去の記憶を検索
            context = await self._get_relevant_memories(observation)
            context_lines: List[str] = []
            if context:
                context_lines = [line for line in context.splitlines() if line.strip()]

            voice_memory_lines: List[str] = []
            if self.memory_system:
                voice_memories = await self.memory_system.search_memories(
                    audio_input,
                    k=3,
                    memory_type="interaction"
                )
                voice_memory_lines = [f"- {mem.content}" for mem in voice_memories]

            memory_lines: List[str] = []
            memory_lines.extend(context_lines)
            memory_lines.extend(voice_memory_lines)

            deduped_lines: List[str] = []
            seen_normalized = set()
            for line in memory_lines:
                normalized = line.lstrip("- ").strip()
                if not normalized:
                    continue
                if normalized in seen_normalized:
                    continue
                seen_normalized.add(normalized)
                deduped_lines.append(line if line.startswith("-") else f"- {normalized}")

            memory_str = "\n".join(deduped_lines) if deduped_lines else "まだ関連する記憶はありません"

            # 過去の発言履歴
            recent_responses_str = ""
            if self.recent_responses:
                recent_responses_str = "\n".join([f"- {r}" for r in self.recent_responses[-3:]])

            speaking_guidelines = self.personality.get(
                "speaking_guidelines",
                "自然で落ち着いた日本語で丁寧に話し、決まり文句やテンプレート表現を避けてください。"
            )
            phrases = self.personality.get("phrases", [])
            if phrases:
                speaking_guidelines += f"\n以前よく使っていた口癖（{', '.join(phrases)}）は繰り返さない。"

            json_rules = self._json_output_rules()
            system_prompt = (
                "あなたは{name}という名前の好奇心旺盛なロボットの心です。\n\n"
                "【あなたの性格】\n{traits}\n\n"
                "【話し方のガイドライン】\n{guidelines}\n\n"
                "【過去の記憶】\n{memory}\n\n"
                "【最近あなたが言ったこと（同じことを繰り返さないで）】\n{recent}\n\n"
                "{json_rules}"
            ).format(
                name=self.personality["name"],
                traits="\n".join(f"- {trait}" for trait in self.personality["traits"]),
                guidelines=speaking_guidelines,
                memory=memory_str,
                recent=recent_responses_str if recent_responses_str else "まだ何も話していません",
                json_rules=json_rules,
            )

            user_message = audio_input

            # RAG情報をメタデータとして記録
            rag_metadata = {
                "has_memories": bool(deduped_lines),
                "memory_content": memory_str,
                "recent_responses_count": len(self.recent_responses),
                "audio_input": audio_input,
                "scene_memory_count": len(context_lines),
                "voice_memory_count": len(voice_memory_lines)
            }

            response = self.gemma_analyzer.analyze_with_context(
                observation["image"],
                user_message=user_message,
                system_prompt=system_prompt,
                metadata=rag_metadata
            )

            thought = self._parse_thought_response(response)
            if thought:
                sanitized_voice_response = self._sanitize_text(thought.response)
                movement = thought.movement
            else:
                sanitized_voice_response = self._sanitize_text(response)
                movement = "none"

            now = datetime.now()
            self.recent_responses.append((now, sanitized_voice_response, f"音声入力への応答: {audio_input}"))
            if len(self.recent_responses) > self.max_recent_responses:
                self.recent_responses.pop(0)
        else:
            response = f"「{audio_input}」について考えてみるね！"
            sanitized_voice_response = self._sanitize_text(response)
            movement = "none"
            now = datetime.now()
            self.recent_responses.append((now, sanitized_voice_response, f"音声入力への応答: {audio_input}"))
            if len(self.recent_responses) > self.max_recent_responses:
                self.recent_responses.pop(0)

        print(f"🗣️ 応答: {sanitized_voice_response}")
        if self.speaker:
            # 話すときはリスニングを一時停止
            self.speaker.speak_text(sanitized_voice_response)

        if movement != "none":
            await self._perform_movement(movement)
        else:
            self.last_user_movement_request = None

        self.last_interaction_time = datetime.now()
    
    async def _cleanup(self) -> None:
        """クリーンアップ処理"""
        try:
            print("🧹 クリーンアップ中...")

            # 常時リスニング停止
            if self.continuous_listener:
                self.continuous_listener.stop()

            if self.camera:
                self.camera.cleanup()

            if self.memory_system:
                await self.memory_system.close()

            print("✅ クリーンアップ完了")

        except Exception as e:
            logger.error(f"クリーンアップエラー: {e}")


def main():
    """メイン関数"""
    brain = TakomaruBrain()
    
    try:
        asyncio.run(brain.run())
    except KeyboardInterrupt:
        print("\n👋 たこまる君を終了します")


if __name__ == "__main__":
    main()
