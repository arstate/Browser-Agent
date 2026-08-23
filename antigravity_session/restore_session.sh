#!/bin/bash
set -e

CONV_ID="7a60fcd3-8146-43e4-bc2a-fa745d9d5241"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE="$DIR/session_${CONV_ID}.tar.gz"

echo "============================================================"
echo "  📥 MEMASANG SESI PERCAKAPAN ANTIGRAVITY DARI TAR.GZ"
echo "  Conversation ID: $CONV_ID"
echo "============================================================"

TARGET_DIR="$HOME/.gemini/antigravity-cli/brain"
mkdir -p "$TARGET_DIR"

if [ -f "$ARCHIVE" ]; then
  echo "[+] Mengekstrak arsip percakapan..."
  tar -xzf "$ARCHIVE" -C "$TARGET_DIR/" --strip-components=1
  echo "[✔] Berhasil memulihkan histori percakapan Antigravity ke:"
  echo "    $TARGET_DIR/$CONV_ID"
elif [ -d "$DIR/brain/$CONV_ID" ]; then
  mkdir -p "$TARGET_DIR/$CONV_ID"
  cp -r "$DIR/brain/$CONV_ID/"* "$TARGET_DIR/$CONV_ID/"
  echo "[✔] Berhasil memulihkan histori percakapan Antigravity ke:"
  echo "    $TARGET_DIR/$CONV_ID"
else
  echo "[!] File arsip $ARCHIVE tidak ditemukan."
  exit 1
fi

echo "============================================================"
echo "  🎉 Sesi percakapan Antigravity siap dilanjutkan!"
echo "============================================================"
