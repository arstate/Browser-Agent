#!/bin/bash
set -e

EXPORT_DIR="/home/arya/Downloads"
CONV_ID="7a60fcd3-8146-43e4-bc2a-fa745d9d5241"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUT_FILE="$EXPORT_DIR/antigravity_conversation_${CONV_ID}_${TIMESTAMP}.tar.gz"

echo "============================================================"
echo "  📦 EXPORT CONVERSATION & PROJECT KE LAPTOP"
echo "============================================================"

TEMP_EXPORT="/tmp/export_antigravity_${TIMESTAMP}"
mkdir -p "$TEMP_EXPORT/brain"
mkdir -p "$TEMP_EXPORT/browser_agent_db"
mkdir -p "$TEMP_EXPORT/skills_plugins"

# 1. Copy Conversation Brain / Transcript
if [ -d "$HOME/.gemini/antigravity-cli/brain/$CONV_ID" ]; then
  echo "[+] Menyalin riwayat percakapan Antigravity..."
  cp -r "$HOME/.gemini/antigravity-cli/brain/$CONV_ID" "$TEMP_EXPORT/brain/"
fi

# 2. Copy Browser Agent Local DB (Chat history SQLite)
if [ -d "$HOME/.browser-agent" ]; then
  echo "[+] Menyalin database riwayat chat Browser Agent..."
  cp -r "$HOME/.browser-agent" "$TEMP_EXPORT/browser_agent_db/"
fi

# 3. Copy Plugins / Skills
if [ -d "$HOME/.gemini/config/plugins" ]; then
  echo "[+] Menyalin plugins & skills Antigravity..."
  cp -r "$HOME/.gemini/config/plugins" "$TEMP_EXPORT/skills_plugins/"
fi

# 4. Buat Script Auto-Restore untuk dijalankan di Laptop
cat << 'RESTORE_SCRIPT' > "$TEMP_EXPORT/restore_in_laptop.sh"
#!/bin/bash
set -e

CONV_ID="7a60fcd3-8146-43e4-bc2a-fa745d9d5241"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo "  📥 MEMASANG CONVERSATION DI LAPTOP BARU"
echo "============================================================"

# 1. Restore Antigravity Brain
mkdir -p "$HOME/.gemini/antigravity-cli/brain"
if [ -d "$DIR/brain/$CONV_ID" ]; then
  cp -r "$DIR/brain/$CONV_ID" "$HOME/.gemini/antigravity-cli/brain/"
  echo "[✔] Riwayat Antigravity berhasil dipasang: $HOME/.gemini/antigravity-cli/brain/$CONV_ID"
fi

# 2. Restore Browser Agent Local DB
if [ -d "$DIR/browser_agent_db/.browser-agent" ]; then
  cp -r "$DIR/browser_agent_db/.browser-agent" "$HOME/"
  echo "[✔] Database Browser Agent berhasil dipasang: $HOME/.browser-agent"
fi

# 3. Restore Plugins / Skills
if [ -d "$DIR/skills_plugins/plugins" ]; then
  mkdir -p "$HOME/.gemini/config"
  cp -r "$DIR/skills_plugins/plugins" "$HOME/.gemini/config/"
  echo "[✔] Plugins/Skills berhasil dipasang: $HOME/.gemini/config/plugins"
fi

echo "============================================================"
echo "  🎉 SELESAI! Anda bisa membuka kembali percakapan ini di Antigravity"
echo "     atau melanjutkan project Browser Agent di laptop."
echo "============================================================"
RESTORE_SCRIPT

chmod +x "$TEMP_EXPORT/restore_in_laptop.sh"

# Archive everything into .tar.gz
echo "[+] Mengompres arsip ke: $OUT_FILE"
tar -czf "$OUT_FILE" -C "$TEMP_EXPORT" .

# Cleanup temp
rm -rf "$TEMP_EXPORT"

echo "============================================================"
echo "[✔] BERHASIL DIEKSPORT!"
echo "    File: $OUT_FILE"
echo "    Ukuran: $(du -sh "$OUT_FILE" | cut -f1)"
echo "============================================================"
