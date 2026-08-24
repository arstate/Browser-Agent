#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

GITHUB_REPO="https://github.com/arstate/Browser-Agent.git"
CONV_ID="24d0de2c-f931-4ce9-b771-b1b1db6dc311"
PREV_CONV_ID="7a60fcd3-8146-43e4-bc2a-fa745d9d5241"

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

# 2. Update Antigravity Conversation Transcripts into .zip (Full Brain, Logs, & Media Assets)
echo "[+] Mengompres seluruh riwayat percakapan Antigravity (Brain & Media) ke .zip..."
mkdir -p "$DIR/antigravity_session"
if [ -d "$HOME/.gemini/antigravity-cli/brain/$CONV_ID" ]; then
  cd "$HOME/.gemini/antigravity-cli/brain"
  zip -r "$DIR/antigravity_session/session_${CONV_ID}.zip" "$CONV_ID/" -x "*/.system_generated/tasks/*" > /dev/null 2>&1 || true
  cd "$DIR"
fi

if [ -d "$HOME/.gemini/antigravity-cli/brain/$PREV_CONV_ID" ]; then
  cd "$HOME/.gemini/antigravity-cli/brain"
  zip -r "$DIR/antigravity_session/session_${PREV_CONV_ID}.zip" "$PREV_CONV_ID/" -x "*/.system_generated/tasks/*" > /dev/null 2>&1 || true
  cd "$DIR"
fi

rm -f "$DIR/antigravity_session/"*.tar.gz
rm -rf "$DIR/antigravity_session/brain"

# 3. Buat ZIP Distribusi Siap Pakai untuk Teman / Share (Clean Distribution ZIP)
echo "[+] Membuat berkas ZIP distribusi siap pakai (browser-agent-v2.5.0.zip)..."
rm -f "$DIR/browser-agent-v2.5.0.zip" "$HOME/Downloads/browser-agent-v2.5.0.zip"
zip -r "$DIR/browser-agent-v2.5.0.zip" \
  extension/ host/ extension.crx key.pem setup.py install*.sh install*.bat install*.ps1 install*.command \
  CARA_INSTALL.md README.md CHROMEWEBSTORE.md dokumentasi.md \
  "CORE AGENTS" "CORE SKILLS" "CORE MEMORIES" "PERSISTENT MEMORY" \
  -x "*.git*" "*.pyc" "*__pycache__*" "*.DS_Store" > /dev/null 2>&1 || true

cp -f "$DIR/browser-agent-v2.5.0.zip" "$HOME/Downloads/browser-agent-v2.5.0.zip" 2>/dev/null || true
echo "[✔] Berkas ZIP siap share disimpan di:"
echo "    - $DIR/browser-agent-v2.5.0.zip"
echo "    - $HOME/Downloads/browser-agent-v2.5.0.zip"

# 4. Stage All Project Code, Extensions, Skills, Agents, Transcripts
echo "[+] Menyiapkan file untuk commit..."
git add -A

# 5. Commit jika ada perubahan
COMMIT_MSG="feat(v2.5.0): neural brain graph dual-hemisphere, full rounded ui, clean prompt & conversation backup $(date +'%Y-%m-%d %H:%M:%S')"
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
  echo "[✔] Commit baru berhasil dibuat: $COMMIT_MSG"
else
  echo "[i] Tidak ada perubahan baru untuk di-commit."
fi

# 6. Push ke GitHub (Master branch & Tags)
echo "[+] Mengunggah (push) ke GitHub..."
git push -u origin master --force
git push origin --tags --force 2>/dev/null || true

echo "============================================================"
echo "  🎉 BACKUP KE GITHUB & DISTRIBUSI ZIP BERHASIL 100%!"
echo "  URL: https://github.com/arstate/Browser-Agent"
echo "============================================================"
