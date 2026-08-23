#!/bin/bash
set -e

CONV_ID="7a60fcd3-8146-43e4-bc2a-fa745d9d5241"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo "  📥 MEMASANG SESI PERCAKAPAN ANTIGRAVITY"
echo "  Conversation ID: $CONV_ID"
echo "============================================================"

TARGET_DIR="$HOME/.gemini/antigravity-cli/brain/$CONV_ID"
mkdir -p "$HOME/.gemini/antigravity-cli/brain"

if [ -d "$DIR/brain/$CONV_ID" ]; then
  mkdir -p "$TARGET_DIR"
  cp -r "$DIR/brain/$CONV_ID/"* "$TARGET_DIR/"
  echo "[✔] Berhasil memulihkan histori percakapan Antigravity ke:"
  echo "    $TARGET_DIR"
else
  echo "[!] Folder backup percakapan tidak ditemukan di $DIR/brain/$CONV_ID"
  exit 1
fi

echo "============================================================"
echo "  🎉 Sesi percakapan Antigravity siap dilanjutkan!"
echo "============================================================"
