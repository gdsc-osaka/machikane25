#!/bin/bash
# VoiceVoxセットアップスクリプト

echo "=== VoiceVoxセットアップ ==="
echo

# OSの判定
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    echo "❌ サポートされていないOS: $OSTYPE"
    exit 1
fi

echo "📍 OS: $OS"
echo

# 1. VoiceVoxがインストールされているか確認
echo "🔍 VoiceVoxの状態を確認中..."

# Dockerで起動しているか確認
if command -v docker &> /dev/null; then
    if docker ps | grep -q voicevox; then
        echo "✅ VoiceVox (Docker) が既に起動しています"
        exit 0
    fi
fi

# macOSの場合、アプリケーションを確認
if [[ "$OS" == "mac" ]]; then
    if [ -d "/Applications/VoiceVox.app" ] || [ -d "$HOME/Applications/VoiceVox.app" ]; then
        echo "✅ VoiceVox.app が見つかりました"
        echo
        echo "📝 VoiceVoxを起動するには:"
        echo "  1. Finderで VoiceVox.app を開く"
        echo "  2. またはターミナルで: open -a VoiceVox"
        echo
        echo "⚠️  初回起動時の注意:"
        echo "  - セキュリティ警告が出る場合は「開く」を選択"
        echo "  - ポート 50021 でHTTPサーバーが起動します"
        exit 0
    fi
fi

# 2. インストール方法の選択
echo "VoiceVoxがインストールされていません。"
echo
echo "インストール方法を選択してください:"
echo "  1) 公式サイトからダウンロード（推奨）"
echo "  2) Dockerで実行"
echo "  3) キャンセル"
echo

read -p "選択 (1/2/3): " choice

case $choice in
    1)
        echo
        echo "🌐 VoiceVox公式サイト:"
        echo "   https://voicevox.hiroshiba.jp/"
        echo
        echo "📥 ダウンロード手順:"
        echo "  1. 上記URLにアクセス"
        echo "  2. お使いのOSに合ったバージョンをダウンロード"
        echo "  3. ダウンロードしたファイルを実行してインストール"
        echo
        if [[ "$OS" == "mac" ]]; then
            echo "📝 macOSの場合:"
            echo "  - VoiceVox.dmgをダウンロード"
            echo "  - dmgファイルを開いてアプリケーションフォルダにドラッグ"
            echo "  - 初回起動時はFinderから右クリック→「開く」"
        fi
        echo
        read -p "ブラウザを開きますか？ (y/n): " open_browser
        if [[ "$open_browser" == "y" ]]; then
            if [[ "$OS" == "mac" ]]; then
                open "https://voicevox.hiroshiba.jp/"
            else
                xdg-open "https://voicevox.hiroshiba.jp/" 2>/dev/null || echo "ブラウザを手動で開いてください"
            fi
        fi
        ;;
    
    2)
        echo
        echo "🐳 Dockerでの実行:"
        
        # Dockerがインストールされているか確認
        if ! command -v docker &> /dev/null; then
            echo "❌ Dockerがインストールされていません"
            echo "   https://docs.docker.com/get-docker/ からインストールしてください"
            exit 1
        fi
        
        echo "VoiceVoxエンジンをDockerで起動します..."
        echo
        
        # CPU版を使用（GPU版も選択可能）
        echo "docker run --rm -d -p 50021:50021 --name voicevox voicevox/voicevox_engine:cpu-ubuntu20.04-latest"
        docker run --rm -d -p 50021:50021 --name voicevox voicevox/voicevox_engine:cpu-ubuntu20.04-latest
        
        if [ $? -eq 0 ]; then
            echo
            echo "✅ VoiceVoxエンジンが起動しました"
            echo "   URL: http://localhost:50021"
            echo
            echo "📝 停止方法: docker stop voicevox"
        else
            echo "❌ 起動に失敗しました"
            exit 1
        fi
        ;;
    
    3)
        echo "キャンセルしました"
        exit 0
        ;;
    
    *)
        echo "無効な選択です"
        exit 1
        ;;
esac

# 3. 接続テスト
echo
echo "🔍 VoiceVox接続テスト中..."
sleep 2

if curl -s http://localhost:50021/version > /dev/null 2>&1; then
    VERSION=$(curl -s http://localhost:50021/version | tr -d '"')
    echo "✅ VoiceVoxエンジンに接続できました (Version: $VERSION)"
    echo
    echo "🎉 セットアップ完了！"
    echo
    echo "📝 使い方:"
    echo "  python src/actuators/speaker.py  # テスト実行"
    echo "  python src/main.py takomaru      # たこまる君を起動"
else
    echo "⚠️  VoiceVoxエンジンに接続できません"
    echo "   VoiceVoxが起動していることを確認してください"
fi