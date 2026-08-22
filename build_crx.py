#!/usr/bin/env python3
"""
Browser Agent - Build & Pack .CRX Extension Script
"""
import os
import sys
import shutil
import subprocess

base_dir = os.path.dirname(os.path.abspath(__file__))
ext_dir = os.path.join(base_dir, "extension")
key_file = os.path.join(base_dir, "key.pem")
output_crx = os.path.join(base_dir, "extension.crx")

print("=" * 60)
print("  📦 PACKING BROWSER AGENT CHROME EXTENSION (.CRX)")
print("=" * 60)

# Find Chrome / Chromium binary
chrome_bins = [
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "brave",
    "brave-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
]

chrome_path = None
for b in chrome_bins:
    p = shutil.which(b) or (b if os.path.exists(b) else None)
    if p:
        chrome_path = p
        break

if not chrome_path:
    print("[-] Browser Chrome / Chromium binary tidak ditemukan di PATH.")
    print("    Anda dapat menggunakan mode 'Load unpacked' di chrome://extensions.")
    sys.exit(1)

print(f"[+] Menggunakan binary browser: {chrome_path}")

cmd = [
    chrome_path,
    f"--pack-extension={ext_dir}",
    f"--pack-extension-key={key_file}"
]

try:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(output_crx):
        size_kb = os.path.getsize(output_crx) / 1024
        print(f"[✔] Berhasil mem-pack ekstensi menjadi CRX:")
        print(f"    File: {output_crx} ({size_kb:.1f} KB)")
        
        # Copy to Downloads if directory exists
        dl_target = os.path.expanduser("~/Downloads/browser-agent/extension.crx")
        if os.path.exists(os.path.dirname(dl_target)):
            shutil.copy2(output_crx, dl_target)
            print(f"[✔] Di-copy ke folder Downloads: {dl_target}")
    else:
        print(f"[-] Gagal membuat file CRX: {res.stderr}")
except Exception as e:
    print(f"[-] Error packing CRX: {e}")

print("=" * 60)
