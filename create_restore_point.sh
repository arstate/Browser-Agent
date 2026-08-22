#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

VERSION="$1"
DESC="$2"

if [ -z "$VERSION" ]; then
  echo "Usage: ./create_restore_point.sh <version_tag> [description]"
  echo "Example: ./create_restore_point.sh v2.15.0 'Dark Luxury SaaS Settings Layout'"
  exit 1
fi

if [[ "$VERSION" != v* ]]; then
  VERSION="v$VERSION"
fi

if [ -z "$DESC" ]; then
  DESC="Update Checkpoint $VERSION"
fi

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S WIB")
DATE_KEY=$(date "+%Y%m%d_%H%M%S")
mkdir -p "$DIR/.restore_points"

echo "============================================================"
echo "  🛡️ MEMBUAT RESTORE POINT: $VERSION"
echo "  Waktu: $TIMESTAMP"
echo "  Deskripsi: $DESC"
echo "============================================================"

# Update manifest version
RAW_VER="${VERSION#v}"
python3 -c "
import json
path = '$DIR/extension/manifest.json'
with open(path, 'r') as f:
    data = json.load(f)
data['version'] = '$RAW_VER'
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
"

# Build CRX and sync
python3 "$DIR/build_crx.py"
rsync -av --delete "$DIR/" "/home/arya/Downloads/browser-agent/" --exclude=".git" --exclude=".restore_points"

# Git stage & commit
git config user.name "Antigravity AI" 2>/dev/null || true
git config user.email "agent@antigravity.local" 2>/dev/null || true

git add -A
git commit -m "chore(release): $VERSION - $DESC" || true

# Tag
git tag -fa "$VERSION" -m "$DESC" 2>/dev/null || git tag -f "$VERSION"

COMMIT_HASH=$(git rev-parse --short HEAD)

# Physical Tar Snapshot
ARCHIVE_FILE="$DIR/.restore_points/snapshot_${VERSION}_${DATE_KEY}.tar.gz"
tar --exclude='.git' --exclude='.restore_points' -czf "$ARCHIVE_FILE" -C "$DIR" .

echo "[✔] Git Commit: $COMMIT_HASH | Tag: $VERSION"
echo "[✔] Snapshot Archive: $ARCHIVE_FILE"
echo "============================================================"
echo "Restore Point $VERSION Berhasil Dibuat!"
