#!/usr/bin/env python3
"""
RAGメモリシステムのクリア
古い記憶や問題のある記憶を削除します
"""

import shutil
from pathlib import Path

def clear_rag_memory():
    """RAGメモリをクリア"""
    print("=== RAGメモリのクリア ===\n")

    chroma_db_path = Path("data/chroma_db")

    if chroma_db_path.exists():
        print(f"ChromaDBを削除: {chroma_db_path}")

        # バックアップを作成
        backup_path = Path("data/chroma_db_backup")
        if backup_path.exists():
            print(f"  古いバックアップを削除: {backup_path}")
            shutil.rmtree(backup_path)

        print(f"  バックアップを作成: {backup_path}")
        shutil.copytree(chroma_db_path, backup_path)

        # ChromaDBを削除
        shutil.rmtree(chroma_db_path)
        print(f"  ✅ ChromaDB削除完了")

        print("\n次回起動時に新しいRAGデータベースが作成されます")
        print("\nバックアップから復元する場合:")
        print(f"  mv {backup_path} {chroma_db_path}")
    else:
        print("ChromaDBが見つかりません（すでにクリア済み）")

    print("\n✅ 完了")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--force":
        clear_rag_memory()
    else:
        print("RAGメモリをクリアしようとしています。")
        print("これにより、たこまる君のすべての記憶が失われます。")
        print("")
        print("続行する場合は --force オプションを指定してください:")
        print("  python3 clear_rag_memory.py --force")
