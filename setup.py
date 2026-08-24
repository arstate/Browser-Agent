#!/usr/bin/env python3
"""
Browser Agent - Universal Native Host Setup & Installer
Supports: Windows, macOS, Linux
Browsers: Google Chrome, Chromium, Brave, Microsoft Edge, Vivaldi, Opera, Arc
"""

import sys
import os
import shutil
import subprocess
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
ext_dir = os.path.join(base_dir, "extension")
host_dir = os.path.join(base_dir, "host")
host_script = os.path.join(host_dir, "native_host.py")
host_bat = os.path.join(host_dir, "native_host.bat")

DEFAULT_EXT_ID = "lifodpllfgehiendpgpomfjbejhfffik"

IS_WINDOWS = sys.platform == "win32"
IS_MAC = sys.platform == "darwin"
IS_LINUX = sys.platform.startswith("linux")

def get_platform_name():
    if IS_WINDOWS: return "Windows"
    if IS_MAC: return "macOS"
    if IS_LINUX: return "Linux"
    return sys.platform

print("=" * 60)
print(f"   🚀 BROWSER AGENT - NATIVE BRIDGE SETUP ({get_platform_name()})")
print("=" * 60)

# 1. Ensure directories exist
for sub in ["agents", "skills", "memories", "generated_images"]:
    dpath = os.path.expanduser(f"~/.browser-agent/{sub}")
    os.makedirs(dpath, exist_ok=True)
print("[✔] Direktori lokal ~/.browser-agent/ siap.")

# 2. Prepare Host Executable & Wrapper
if IS_WINDOWS:
    # On Windows, Chrome invokes a .bat wrapper that runs python with the script
    python_exe = sys.executable
    bat_content = f'@echo off\n"{python_exe}" "{host_script}" %*\n'
    try:
        with open(host_bat, "w", encoding="utf-8") as f:
            f.write(bat_content)
        print(f"[✔] Dibuat batch launcher: {host_bat}")
    except Exception as e:
        print(f"[!] Warning writing host.bat: {e}")
    target_path = host_bat
else:
    try:
        os.chmod(host_script, 0o755)
        print(f"[✔] Set izin eksekusi chmod +x: {host_script}")
    except Exception as e:
        print(f"[!] Warning setting chmod permissions: {e}")
    target_path = host_script

# 3. Check Dependencies (Python, Node.js/npx)
print("\n🔍 Memeriksa Dependensi Sistem:")
print(f"  • Python 3: {sys.version.split()[0]} (OK)")

npx_cmd = "npx.cmd" if IS_WINDOWS else "npx"
if shutil.which(npx_cmd):
    print("  • Node.js / npx: Terdeteksi (OK)")
else:
    print("  • Node.js / npx: Belum terdeteksi di PATH (Opsional, untuk MCP Toolset)")

# 4. Generate Native Messaging Host Manifest
manifest_data = {
    "name": "com.antigravity.chrome.agent",
    "description": "Browser Agent Native Messaging Host (Local PC, Terminal & SQLite Bridge)",
    "path": target_path,
    "type": "stdio",
    "allowed_origins": [
        f"chrome-extension://{DEFAULT_EXT_ID}/",
        "chrome-extension://bflpfmnmnokmjhmgnolecpppdbdophmk/"
    ]
}

local_manifest_path = os.path.join(host_dir, "com.antigravity.chrome.agent.json")
with open(local_manifest_path, "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, indent=2)
print(f"\n[✔] Manifest native host dibuat di:\n    {local_manifest_path}")

# 5. Register Native Messaging Host to Browsers
print("\n🔗 Mendaftarkan Native Host ke Browser:")

if IS_LINUX:
    target_dirs = [
        os.path.expanduser("~/.config/google-chrome/NativeMessagingHosts"),
        os.path.expanduser("~/.config/google-chrome-beta/NativeMessagingHosts"),
        os.path.expanduser("~/.config/google-chrome-unstable/NativeMessagingHosts"),
        os.path.expanduser("~/.config/chromium/NativeMessagingHosts"),
        os.path.expanduser("~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
        os.path.expanduser("~/.config/microsoft-edge/NativeMessagingHosts"),
        os.path.expanduser("~/.config/microsoft-edge-dev/NativeMessagingHosts"),
        os.path.expanduser("~/.config/vivaldi/NativeMessagingHosts")
    ]
    for d in target_dirs:
        try:
            os.makedirs(d, exist_ok=True)
            dest = os.path.join(d, "com.antigravity.chrome.agent.json")
            with open(dest, "w", encoding="utf-8") as f:
                json.dump(manifest_data, f, indent=2)
            print(f"  • Terdaftar: {dest}")
        except Exception:
            pass

elif IS_MAC:
    target_dirs = [
        os.path.expanduser("~/Library/Application Support/Google/Chrome/NativeMessagingHosts"),
        os.path.expanduser("~/Library/Application Support/Google/Chrome Beta/NativeMessagingHosts"),
        os.path.expanduser("~/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"),
        os.path.expanduser("~/Library/Application Support/Chromium/NativeMessagingHosts"),
        os.path.expanduser("~/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"),
        os.path.expanduser("~/Library/Application Support/Microsoft Edge/NativeMessagingHosts"),
        os.path.expanduser("~/Library/Application Support/Arc/User Data/NativeMessagingHosts")
    ]
    for d in target_dirs:
        try:
            os.makedirs(d, exist_ok=True)
            dest = os.path.join(d, "com.antigravity.chrome.agent.json")
            with open(dest, "w", encoding="utf-8") as f:
                json.dump(manifest_data, f, indent=2)
            print(f"  • Terdaftar: {dest}")
        except Exception:
            pass

elif IS_WINDOWS:
    try:
        import winreg
        reg_targets = [
            (r"Software\Google\Chrome\NativeMessagingHosts\com.antigravity.chrome.agent", "Google Chrome"),
            (r"Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.antigravity.chrome.agent", "Brave Browser"),
            (r"Software\Microsoft\Edge\NativeMessagingHosts\com.antigravity.chrome.agent", "Microsoft Edge")
        ]
        for reg_key, b_name in reg_targets:
            try:
                key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, reg_key)
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, local_manifest_path)
                winreg.CloseKey(key)
                print(f"  • Terdaftar di Windows Registry ({b_name}): HKCU\\{reg_key}")
            except Exception as re:
                print(f"  • Registry notice ({b_name}): {re}")
    except Exception as e:
        print(f"[-] Registry error: {e}")

print("\n" + "=" * 60)
print("  🎉 INSTALASI PC BRIDGE SELESAI & BERHASIL!")
print("=" * 60)
print("  Langkah selanjutnya:")
print("  1. Buka Google Chrome lalu masuk ke: chrome://extensions")
print("  2. Aktifkan 'Developer mode' di pojok kanan atas.")
print("  3. Klik 'Load unpacked' lalu pilih folder 'extension' proyek ini,")
print("     ATAU drag-and-drop file 'extension.crx' ke halaman ekstensi.")
print("=" * 60)

