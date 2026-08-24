# 🤖 Browser Agent - Standalone AI Copilot & Autonomous Web Agent

Browser Agent adalah ekstensi Chrome dan asisten AI autonomous berbasis local native bridge yang dirancang untuk otomasi browser, web crawling, inspeksi DOM, manipulasi berkas lokal, eksekusi terminal, dan manajemen multi-agent persona mandiri.

---

## ✨ Fitur Utama
- **Autonomous Browser Automation**: Kontrol browser real-time via Chrome DevTools Protocol (`click`, `type`, `navigate`, `scroll`, `snapshot`, `hover`, `screenshot`, `get_console_logs`).
- **Local PC Bridge & Native Messaging**: Akses filesystem lokal, pembacaan berkas, penulisan berkas, dan eksekusi terminal lokal berkecepatan tinggi.
- **Multi-Agent Persona Engine**: Buat persona agent kustom (General Assistant, Deep Web Researcher, Coding Engineer) dengan model default dan keahlian masing-masing.
- **Skills & Memories Ecosystem**: Standar operasional prosedur (SOP) dan preferensi permanen berbasis Markdown fisik di `~/.browser-agent/`.
- **AI Generator Modals**: Buat Agent, Skill, dan Memory baru secara instan cukup dengan prompt bahasa alami via model pilihan.
- **High-Performance SQLite Chat History & Image Cache**: Riwayat chat tersimpan di SQLite lokal dan gambar AI tersimpan langsung sebagai berkas fisik `.png` di disk (`~/.browser-agent/generated_images/`).
- **Clean Elegant SaaS UI**: Palet Bento Modern (Lime Chartreuse `#CEF128`, Pure White `#FFFFFF`, Dark Slate `#0F172A`) dengan Zero Emoji Protocol (SVG vector murni).

---

## 🚀 Panduan Cepat Instalasi 1-Klik

1. **Windows**: Double-click `install_windows.bat` (atau `install_windows.ps1`)
2. **macOS**: Double-click `install_mac.command` (atau jalankan `./install_mac.sh`)
3. **Linux**: Jalankan `./install_linux.sh` (atau `python3 setup.py`)

Setelah itu, buka `chrome://extensions` di Google Chrome -> Aktifkan **Developer mode** -> Klik **Load unpacked** dan pilih folder `extension`, atau pasang `extension.crx`.

*Untuk panduan langkah demi langkah yang lebih mendalam, baca [CARA_INSTALL.md](file:///home/arya/browser-agent/CARA_INSTALL.md).*

---

## 📂 Struktur Direktori Proyek
```
browser-agent/
├── extension/                 # Ekstensi Chrome Manifest V3
│   ├── manifest.json
│   ├── sidepanel.html / .js / .css
│   ├── options.html / .js / .css
│   └── icons/
├── host/                      # Native Messaging Host
│   ├── native_host.py         # Local Python Bridge (SQLite, File I/O, Terminal)
│   └── com.antigravity.chrome.agent.json
├── extension.crx              # Packed Chrome Extension CRX
├── key.pem                    # Private key CRX
├── setup.py                   # Universal Python setup script
├── install_linux.sh           # 1-Click Linux Installer
├── install_mac.command        # 1-Click macOS Finder Installer
├── install_windows.bat        # 1-Click Windows Batch Installer
├── install_windows.ps1        # 1-Click Windows PowerShell Installer
├── CARA_INSTALL.md            # Tutorial instalasi lengkap (Bahasa Indonesia)
└── README.md
```
