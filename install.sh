#!/usr/bin/env bash
# ==============================================================================
# Browser Agent - Linux 1-Click Installer
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================"
echo "  🚀 BROWSER AGENT - LINUX 1-CLICK INSTALLER"
echo "================================================================"

# 1. Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[-] Python 3 belum terinstall."
    echo "[*] Mencoba menginstall Python 3..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y python3 python3-pip
    elif command -v pacman &> /dev/null; then
        sudo pacman -Sy --noconfirm python python-pip
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y python3 python3-pip
    else
        echo "[!] Silakan install Python 3 manual dari https://python.org"
        exit 1
    fi
fi

# 2. Set Permissions
chmod +x "$SCRIPT_DIR/host/native_host.py" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/setup.py" 2>/dev/null || true

# 3. Run Universal Setup
python3 "$SCRIPT_DIR/setup.py"

echo ""
echo "================================================================"
echo "  ✅ SELESAI! Langkah Pasang di Chrome:"
echo "  1. Buka URL: chrome://extensions di browser Anda."
echo "  2. Nyalakan switch 'Developer mode' di pojok kanan atas."
echo "  3. Klik tombol 'Load unpacked' lalu pilih folder 'extension' ini."
echo "================================================================"
