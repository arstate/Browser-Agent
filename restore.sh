#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

TARGET="$1"

if [ -z "$TARGET" ] || [ "$TARGET" = "list" ] || [ "$TARGET" = "--list" ]; then
  echo "============================================================"
  echo "  📋 DAFTAR RESTORE POINTS TERSEDIA (GIT TAGS & SNAPSHOTS)"
  echo "============================================================"
  git tag -n9 --sort=-creatordate
  echo ""
  echo "Untuk me-restore ke versi tertentu, jalankan:"
  echo "  ./restore.sh <VERSION_TAG>"
  echo "Contoh:"
  echo "  ./restore.sh v2.15.0"
  echo "============================================================"
  exit 0
fi

if [[ "$TARGET" != v* ]] && git rev-parse "v$TARGET" >/dev/null 2>&1; then
  TARGET="v$TARGET"
fi

echo "============================================================"
echo "  ⚠️ MEMULAI PROSES RESTORE / ROLLBACK KE: $TARGET"
echo "============================================================"

# Check if tag exists
if git rev-parse "$TARGET" >/dev/null 2>&1; then
  echo "[1/3] Melakukan checkout ke Git Tag: $TARGET..."
  git checkout -f "$TARGET"
  
  echo "[2/3] Membangun ulang paket CRX ekstensi..."
  python3 "$DIR/build_crx.py"
  
  echo "[3/3] Sinkronisasi ke folder Downloads..."
  rsync -av --delete "$DIR/" "/home/arya/Downloads/browser-agent/" --exclude=".git" --exclude=".restore_points" --exclude="release" --exclude="archives" --exclude="backups" --exclude="misc"
  
  echo "============================================================"
  echo "  ✅ BERHASIL RESTORE KE VERSI: $TARGET"
  echo "  Codebase telah dikembalikan ke kondisi stabil tersebut."
  echo "============================================================"
else
  echo "❌ Error: Tag atau Restore Point '$TARGET' tidak ditemukan."
  echo "Jalankan './restore.sh list' untuk melihat daftar versi yang tersedia."
  exit 1
fi
