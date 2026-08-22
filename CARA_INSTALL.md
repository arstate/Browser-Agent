# 📖 PANDUAN LENGKAP CARA INSTALASI BROWSER AGENT

Panduan praktis instalasi 1-klik untuk **Windows**, **macOS**, dan **Linux**.

---

## ⚡ 1. Instalasi 1-Klik Sesuai Sistem Operasi Anda

### 🪟 Untuk Pengguna Windows:
1. Ekstrak file zip hasil unduhan.
2. **Double-click** (klik 2x) pada file:
   ```
   install_windows.bat
   ```
   *(Script otomatis memeriksa Python, mengonfigurasi Windows Registry Chrome/Brave/Edge, dan menyiapkan bridge lokal)*.
3. Setelah muncul pesan **"SELESAI"**, tekan tombol apa saja untuk menutup terminal.

---

### 🍏 Untuk Pengguna macOS (Mac):
1. Ekstrak file zip hasil unduhan.
2. **Double-click** pada file:
   ```
   install_mac.command
   ```
   *(Atau buka Terminal di folder ini dan jalankan `./install_mac.sh`)*.
3. Script otomatis mendaftarkan manifest Native Host ke direktori Chrome Mac.

---

### 🐧 Untuk Pengguna Linux (Ubuntu/Debian, Arch, Fedora):
1. Buka terminal di folder project ini.
2. Jalankan perintah:
   ```bash
   ./install_linux.sh
   ```
   *(Atau `python3 setup.py`)*.

---

## 🌐 2. Memasang Ekstensi di Google Chrome / Chromium

Setelah menjalankan script installer di atas:

1. Buka browser **Google Chrome** (atau Brave / Edge).
2. Di address bar / URL, ketik:
   ```
   chrome://extensions
   ```
   lalu tekan **Enter**.
3. **Nyalakan switch "Developer mode"** (Mode Pengembang) di pojok kanan atas.
4. Klik tombol **"Load unpacked"** (Muat yang belum dibongkar) di pojok kiri atas.
5. Pilih folder **`extension`** dari dalam folder proyek ini.
6. 🎉 Ekstensi **Browser Agent** akan langsung muncul di browser Anda!
7. *Opsional:* Anda juga bisa langsung **drag-and-drop** file **`extension.crx`** ke halaman `chrome://extensions`.

---

## ⚙️ 3. Konfigurasi AI & Mulai Menggunakan

1. Klik ikon puzzle / ekstensi di pojok kanan atas Chrome, lalu pilih **Browser Agent** untuk membuka Sidepanel.
2. Klik tombol **Pengaturan** (ikon gear di pojok atas Sidepanel).
3. Di tab **AI & Provider**:
   - Masukkan **Endpoint URL** (contoh: `https://api.openai.com/v1` atau `http://localhost:20128/v1` atau `https://openrouter.ai/api/v1`).
   - Masukkan **API Key** Anda.
   - Pilih / tambahkan Model AI yang ingin digunakan (seperti `gemini-2.5-flash`, `gpt-4o`, `claude-3.5-sonnet`).
4. Periksa indikator **PC Bridge (Native Host)** di bawah: Pastikan statusnya **Online (Hijau)**.
5. Klik **Simpan Pengaturan**.

---

## 🛠️ 4. Struktur Fitur & Penggunaan

- **Multi-Agent Persona**: Anda dapat membuat dan berpindah Agent spesialis langsung dari dropdown sidepanel (General Assistant, Deep Web Researcher, Coding Engineer).
- **Skills System**: Standar operasional prosedur (SOP) otomatis yang dapat dipasangkan ke masing-masing agent.
- **Memories**: Aturan permanen (misal: gaya komunikasi, bahasa respon) yang selalu dipatuhi oleh seluruh agent.
- **Local Storage & Database**: Seluruh riwayat percakapan tersimpan aman di database SQLite lokal PC Anda (`~/.browser-agent/chat_history.db`).
- **AI Image Generation**: Hasil gambar AI tersimpan langsung sebagai file `.png` lokal di `~/.browser-agent/generated_images/`.

---

## ❓ 5. Troubleshooting & Bantuan

- **Indikator PC Bridge Offline?**
  Pastikan Anda telah menjalankan file installer (`install_windows.bat` di Windows atau `./install_linux.sh` di Linux/Mac), lalu reload halaman ekstensi.
- **Ingin Menambah Skill / Agent Baru dengan AI?**
  Buka menu Pengaturan -> Masuk ke tab **Multi-Agent** atau **Skills** -> Klik **Tambah Baru** -> Pilih tab **✨ Buat dengan AI** -> Pilih model generator dan ketik kebutuhan Anda!
