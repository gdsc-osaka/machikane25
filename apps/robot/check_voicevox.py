#!/usr/bin/env python3
"""VoiceVox接続確認スクリプト"""

import requests

try:
    response = requests.get("http://localhost:50021/version", timeout=3)
    if response.status_code == 200:
        version = response.text.strip('"')
        print(f"✅ VoiceVox接続成功！")
        print(f"   バージョン: {version}")
        print(f"   URL: http://localhost:50021")
        print("\n🎤 VoiceVoxが正常に動作しています！")
    else:
        print(f"❌ 接続エラー: HTTP {response.status_code}")
except requests.exceptions.ConnectionError:
    print("❌ VoiceVoxに接続できません")
    print("\n以下を確認してください：")
    print("1. VoiceVoxが起動しているか")
    print("2. ポート50021が使用されていないか")
    print("3. ファイアウォールでブロックされていないか")
except Exception as e:
    print(f"❌ エラー: {e}")