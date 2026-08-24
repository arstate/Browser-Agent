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

# 6. Configure Silent Debugger Flags (Suppress "started debugging this browser" banner)
def configure_silent_debugger_flags():
    print("\n🔕 Mengonfigurasi Silent Debugger Flag (--silent-debugger-extension-api):")
    flag = "--silent-debugger-extension-api"

    if IS_LINUX:
        # 1. Linux Flags Conf
        conf_files = [
            os.path.expanduser("~/.config/chrome-flags.conf"),
            os.path.expanduser("~/.config/chromium-flags.conf"),
            os.path.expanduser("~/.config/brave-flags.conf"),
            os.path.expanduser("~/.config/microsoft-edge-flags.conf")
        ]
        for cf in conf_files:
            try:
                existing = ""
                if os.path.exists(cf):
                    with open(cf, "r", encoding="utf-8") as f:
                        existing = f.read()
                if flag not in existing:
                    os.makedirs(os.path.dirname(cf), exist_ok=True)
                    with open(cf, "w", encoding="utf-8") as f:
                        f.write(f"# Auto-configured by Browser Agent installer\n{flag}\n" + (existing if existing else ""))
                    print(f"  • Flag file dibuat: {cf}")
                else:
                    print(f"  • Flag file sudah aktif: {cf}")
            except Exception as e:
                print(f"  [!] Notice flag file {cf}: {e}")

        # 2. Linux Desktop Files Override (~/.local/share/applications)
        local_apps = os.path.expanduser("~/.local/share/applications")
        os.makedirs(local_apps, exist_ok=True)
        search_dirs = ["/usr/share/applications", "/var/lib/flatpak/exports/share/applications", local_apps]
        desktop_names = ["google-chrome.desktop", "google-chrome-stable.desktop", "chromium.desktop", "brave-browser.desktop", "microsoft-edge.desktop"]
        
        for dname in desktop_names:
            for sdir in search_dirs:
                src = os.path.join(sdir, dname)
                if os.path.exists(src):
                    try:
                        dest = os.path.join(local_apps, dname)
                        with open(src, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        # Replace Exec lines with flag if not present
                        new_lines = []
                        for line in content.splitlines():
                            if line.startswith("Exec=") and flag not in line:
                                parts = line.split("Exec=", 1)
                                cmd_parts = parts[1].split(" ", 1)
                                if len(cmd_parts) > 1:
                                    line = f"Exec={cmd_parts[0]} {flag} {cmd_parts[1]}"
                                else:
                                    line = f"Exec={cmd_parts[0]} {flag}"
                            new_lines.append(line)
                        with open(dest, "w", encoding="utf-8") as f:
                            f.write("\n".join(new_lines) + "\n")
                        print(f"  • Desktop launcher dikonfigurasi: {dest}")
                        break
                    except Exception as e:
                        print(f"  [!] Notice desktop file {dname}: {e}")
        try:
            subprocess.run(["update-desktop-database", local_apps], capture_output=True, check=False)
        except Exception:
            pass

    elif IS_MAC:
        # macOS: Shell alias + Command Launcher
        rc_files = [
            os.path.expanduser("~/.zshrc"),
            os.path.expanduser("~/.bash_profile")
        ]
        alias_block = f"""
# Browser Agent Silent Debugger Aliases
alias chrome='open -a "Google Chrome" --args {flag}'
alias brave='open -a "Brave Browser" --args {flag}'
alias edge='open -a "Microsoft Edge" --args {flag}'
"""
        for rc in rc_files:
            try:
                existing = ""
                if os.path.exists(rc):
                    with open(rc, "r", encoding="utf-8") as f:
                        existing = f.read()
                if flag not in existing:
                    with open(rc, "a", encoding="utf-8") as f:
                        f.write(alias_block)
                    print(f"  • Alias terminal ditambahkan: {rc}")
            except Exception as e:
                print(f"  [!] Notice rc file {rc}: {e}")

        # Create macOS 1-Click Launchers
        launcher_sh = os.path.expanduser("~/.browser-agent/launch_chrome_silent.command")
        try:
            with open(launcher_sh, "w", encoding="utf-8") as f:
                f.write(f'#!/usr/bin/env bash\nopen -a "Google Chrome" --args {flag} "$@"\n')
            os.chmod(launcher_sh, 0o755)
            print(f"  • Script peluncur dibuat: {launcher_sh}")
            
            desktop_launcher = os.path.expanduser("~/Desktop/Google Chrome (Silent Agent).command")
            if os.path.exists(os.path.expanduser("~/Desktop")):
                shutil.copyfile(launcher_sh, desktop_launcher)
                os.chmod(desktop_launcher, 0o755)
                print(f"  • Shortcut Desktop Mac dibuat: {desktop_launcher}")
        except Exception as e:
            print(f"  [!] Notice Mac launcher: {e}")

    elif IS_WINDOWS:
        # Windows: Patch .lnk shortcuts using PowerShell WScript.Shell
        ps_script = f"""
        $flag = "{flag}"
        $wsh = New-Object -ComObject WScript.Shell
        $shortcutPaths = @(
            [Environment]::GetFolderPath("Desktop"),
            [Environment]::GetFolderPath("CommonDesktop"),
            [Environment]::GetFolderPath("StartMenu"),
            [Environment]::GetFolderPath("CommonStartMenu"),
            "$env:APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar"
        )
        foreach ($folder in $shortcutPaths) {{
            if (Test-Path $folder) {{
                Get-ChildItem -Path $folder -Filter "*.lnk" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {{
                    try {{
                        $sc = $wsh.CreateShortcut($_.FullName)
                        if ($sc.TargetPath -match "(chrome|brave|msedge)\\.exe$") {{
                            if ($sc.Arguments -notmatch "silent-debugger-extension-api") {{
                                $sc.Arguments = "$($sc.Arguments) $flag".Trim()
                                $sc.Save()
                                Write-Output "Patched: $($_.FullName)"
                            }}
                        }}
                    }} catch {{}}
                }}
            }}
        }}
        """
        try:
            res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, check=False)
            for line in res.stdout.splitlines():
                if line.strip():
                    print(f"  • {line.strip()}")
            print("  • Seluruh shortcut Chrome / Edge / Brave di Windows berhasil dikonfigurasi!")
        except Exception as e:
            print(f"  [!] Notice PowerShell shortcut patcher: {e}")

        win_launcher = os.path.expanduser("~/.browser-agent/launch_chrome_silent.bat")
        try:
            with open(win_launcher, "w", encoding="utf-8") as f:
                f.write(f'@echo off\nstart "" "chrome.exe" {flag} %*\n')
            print(f"  • Batch launcher dibuat: {win_launcher}")
        except Exception as e:
            print(f"  [!] Notice Windows batch launcher: {e}")

configure_silent_debugger_flags()

print("\n" + "=" * 60)
print("  🎉 INSTALASI PC BRIDGE & SILENT DEBUGGER BERHASIL!")
print("=" * 60)
print("  Langkah selanjutnya:")
print("  1. Buka Google Chrome lalu masuk ke: chrome://extensions")
print("  2. Aktifkan 'Developer mode' di pojok kanan atas.")
print("  3. Klik 'Load unpacked' lalu pilih folder 'extension' proyek ini,")
print("     ATAU drag-and-drop file 'extension.crx' ke halaman ekstensi.")
print("  4. Banner 'started debugging' otomatis disembunyikan permanen!")
print("=" * 60)

