#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

GITHUB_REPO="https://arstate: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@github.com/arstate/Browser-Agent.git"
CONV_ID="7a60fcd3-8146-43e4-bc2a-fa745d9d5241"

echo "============================================================"
echo "  🚀 SINKRONISASI & BACKUP BROWSER AGENT KE GITHUB"
echo "  Repository: https://github.com/arstate/Browser-Agent.git"
echo "  Waktu: $(date +"%Y-%m-%d %H:%M:%S WIB")"
echo "============================================================"

# 1. Pastikan Git Remote Terhubung
if git remote | grep -q "origin"; then
  git remote set-url origin "$GITHUB_REPO"
else
  git remote add origin "$GITHUB_REPO"
fi

# 2. Update Antigravity Conversation Transcripts
echo "[+] Menyinkronkan riwayat percakapan Antigravity..."
mkdir -p "$DIR/antigravity_session/brain/$CONV_ID/.system_generated/logs"
if [ -f "$HOME/.gemini/antigravity-cli/brain/$CONV_ID/.system_generated/logs/transcript.jsonl" ]; then
  cp "$HOME/.gemini/antigravity-cli/brain/$CONV_ID/.system_generated/logs/transcript.jsonl" "$DIR/antigravity_session/brain/$CONV_ID/.system_generated/logs/"
fi
if [ -f "$HOME/.gemini/antigravity-cli/brain/$CONV_ID/.system_generated/logs/transcript_full.jsonl" ]; then
  cp "$HOME/.gemini/antigravity-cli/brain/$CONV_ID/.system_generated/logs/transcript_full.jsonl" "$DIR/antigravity_session/brain/$CONV_ID/.system_generated/logs/"
fi
if [ -d "$HOME/.gemini/antigravity-cli/brain/$CONV_ID/scratch" ]; then
  cp -r "$HOME/.gemini/antigravity-cli/brain/$CONV_ID/scratch" "$DIR/antigravity_session/brain/$CONV_ID/"
fi

# 3. Stage All Project Code, Extensions, Skills, Agents, Transcripts
echo "[+] Menyiapkan file untuk commit..."
git add -A

# 4. Commit jika ada perubahan
COMMIT_MSG="chore(backup): auto-sync backup with antigravity conversation $(date +'%Y-%m-%d %H:%M:%S')"
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
  echo "[✔] Commit baru berhasil dibuat: $COMMIT_MSG"
else
  echo "[i] Tidak ada perubahan baru untuk di-commit."
fi

# 5. Push ke GitHub (Master branch & Tags)
echo "[+] Mengunggah (push) ke GitHub..."
git push -u origin master --force
git push origin --tags --force

echo "============================================================"
echo "  🎉 BACKUP KE GITHUB BERHASIL 100%!"
echo "  URL: https://github.com/arstate/Browser-Agent"
echo "============================================================"
