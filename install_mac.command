#!/usr/bin/env bash
# ==============================================================================
# Browser Agent - macOS 1-Click Double-Clickable Installer (.command)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================"
echo "  🍏 BROWSER AGENT - macOS 1-CLICK INSTALLER"
echo "================================================================"

# Check Python 3 on macOS
if ! command -v python3 &> /dev/null; then
    echo "[-] Python 3 belum terinstall di Mac Anda."
    echo "[*] Anda dapat menginstallnya melalui Homebrew atau dari https://python.org"
    if command -v brew &> /dev/null; then
        echo "[*] Menginstall Python 3 via Homebrew..."
        brew install python3
    else
        echo "[!] Silakan install Python 3 terlebih dahulu."
        read -p "Tekan Enter untuk keluar..."
        exit 1
    fi
fi

# Set executable permissions
chmod +x "$SCRIPT_DIR/host/native_host.py" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/setup.py" 2>/dev/null || true

# Run setup
python3 "$SCRIPT_DIR/setup.py"

echo ""
echo "================================================================"
echo "  ✅ INSTALASI BERHASIL!"
echo "  Buka Chrome -> chrome://extensions -> Aktifkan Developer Mode"
echo "  -> Klik 'Load unpacked' dan pilih folder 'extension'."
echo "================================================================"
echo ""
read -p "Tekan [Enter] untuk menutup jendela ini..."
