#!/usr/bin/env python3
"""
オーディオデバイスの確認スクリプト

利用可能なマイクデバイスを一覧表示します。
"""

import sounddevice as sd


def main():
    print("=" * 70)
    print("オーディオデバイス一覧")
    print("=" * 70)

    devices = sd.query_devices()

    print("\n【すべてのデバイス】\n")
    for i, device in enumerate(devices):
        device_type = []
        if device['max_input_channels'] > 0:
            device_type.append(f"入力{device['max_input_channels']}ch")
        if device['max_output_channels'] > 0:
            device_type.append(f"出力{device['max_output_channels']}ch")

        marker = ""
        if device == sd.query_devices(kind='input'):
            marker = " ← デフォルト入力"

        print(f"[{i}] {device['name']}")
        print(f"    種類: {', '.join(device_type)}{marker}")
        print(f"    サンプルレート: {device['default_samplerate']} Hz")
        print()

    print("=" * 70)
    print("【デフォルト設定】")
    print("=" * 70)

    try:
        default_input = sd.query_devices(kind='input')
        print(f"\n入力デバイス: [{default_input['index']}] {default_input['name']}")
        print(f"  チャンネル数: {default_input['max_input_channels']}")
        print(f"  サンプルレート: {default_input['default_samplerate']} Hz")
    except Exception as e:
        print(f"\n⚠️ デフォルト入力デバイスが見つかりません: {e}")

    try:
        default_output = sd.query_devices(kind='output')
        print(f"\n出力デバイス: [{default_output['index']}] {default_output['name']}")
        print(f"  チャンネル数: {default_output['max_output_channels']}")
        print(f"  サンプルレート: {default_output['default_samplerate']} Hz")
    except Exception as e:
        print(f"\n⚠️ デフォルト出力デバイスが見つかりません: {e}")

    print("\n" + "=" * 70)
    print("💡 使い方")
    print("=" * 70)
    print("\nマイクを使って録音する場合、デバイスIDを指定してください:")
    print("  recorder = AudioRecorder()")
    print("  recording = recorder.record(duration=5, device=<デバイスID>)")
    print("\n例: デバイス ID 2 を使う場合")
    print("  recording = recorder.record(duration=5, device=2)")
    print()


if __name__ == "__main__":
    main()
