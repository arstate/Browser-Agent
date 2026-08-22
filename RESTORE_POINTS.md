# 🛡️ RESTORE POINTS & VERSION LOG — BROWSER AGENT

Dokumen ini adalah buku catatan resmi untuk seluruh **Nomor Versi (Semantic Versioning)**, **Restore Points**, dan **Snapshot Checkpoint** pada proyek **Browser Agent**.

---

## 📌 Status Versi Saat Ini
- **Versi Terkini:** `v2.18.0`
- **Iterasi:** `Iterasi 218`
- **Tanggal Rilis:** 22 Agustus 2026 (23:45 WIB)
- **Status Stabilitas:** 🟢 **STABLE (100% Verified & Tested)**
- **CRX Package:** `/home/arya/Downloads/browser-agent/extension.crx` (350.8 KB)

---

## 📋 Tabel Riwayat Versi & Restore Points

| Versi | Iterasi | Tanggal & Waktu | Tag / Hash | Deskripsi Ringkas Update | Status | Perintah Restore |
| :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **v2.18.0** | 218 | 22-08-2026 23:45 | `v2.18.0` | **Clean Settings Overlay:** Menghapus top header bar ganda (`.settings-overlay-header`) dari overlay New Tab sehingga halaman pengaturan langsung tampil 100% full-height dengan tombol Back bawaan sidebar. | 🟢 STABLE | `./restore.sh v2.18.0` |
| **v2.17.0** | 217 | 22-08-2026 23:44 | `v2.17.0` | **Fix UI Memory, Skills & Multi-Agent:** Menata ulang seluruh kartu item Dark Luxury (`.item-card`, `.boss-hero-card`), preview kode SOP/memory, tag pill, dan mengunci ukuran SVG icon agar tidak raksasa. | 🟢 STABLE | `./restore.sh v2.17.0` |
| **v2.16.0** | 216 | 22-08-2026 23:42 | `v2.16.0` | **Clean Settings Sidebar:** Menghapus sub-menu redundant "SYSTEM & INTEGRATION" dan "HELP & INFO" dari sidebar kiri Pengaturan untuk menyederhanakan navigasi. | 🟢 STABLE | `./restore.sh v2.16.0` |
| **v2.15.0** | 215 | 22-08-2026 23:40 | `v2.15.0` | **Major Overhaul Settings Layout:** 2-Column Dark Luxury SaaS, Left Settings Sidebar Navigation, 12 Quick Provider Templates, Model Priority #1/#2, Test AI Connection live latency, Newtab Settings Overlay. | 🟢 STABLE | `./restore.sh v2.15.0` |
| **v2.14.0** | 214 | 22-08-2026 23:25 | `v2.14.0` | **Sidebar Menu Cleaning:** Menghapus item "Terminal Shell" dari sidebar New Tab, menyisakan 3 menu inti (Home, Riwayat Chat, Settings). | 🟢 STABLE | `./restore.sh v2.14.0` |
| **v2.13.0** | 213 | 22-08-2026 23:10 | `v2.13.0` | **Collapsible Hover Mini-Rail Sidebar:** Sidebar New Tab hover-expandable (58px ke 220px) dengan profil pengguna dan navigasi cepat. | 🟢 STABLE | `./restore.sh v2.13.0` |
| **v2.12.0** | 212 | 22-08-2026 22:50 | `v2.12.0` | **In-Tab Fullscreen Settings Overlay:** Pengaturan terbuka langsung di dalam New Tab tanpa membuka browser tab baru. | 🟢 STABLE | `./restore.sh v2.12.0` |
| **v2.11.0** | 211 | 22-08-2026 22:30 | `v2.11.0` | **Clean Prompt Input:** Menghilangkan teks hint shortcut di input prompt chat New Tab. | 🟢 STABLE | `./restore.sh v2.11.0` |
| **v2.10.0** | 210 | 22-08-2026 22:00 | `v2.10.0` | **Dedicated File Architecture:** Isolasi total CSS antara fullscreen New Tab dan Sidepanel, perbaikan kurung kurawal CSS. | 🟢 STABLE | `./restore.sh v2.10.0` |

---

## ⚡ Panduan 1-Klik Rollback / Restore Point

Jika terjadi bug setelah update atau ingin kembali ke kondisi stabil sebelumnya:

### 1. Lihat Daftar Versi yang Tersedia
Jalankan perintah ini di terminal:
```bash
cd ~/browser-agent
./restore.sh list
```

### 2. Kembalikan Codebase ke Versi Pilihan (Contoh: `v2.15.0`)
```bash
cd ~/browser-agent
./restore.sh v2.15.0
```
> Script akan otomatis me-restore seluruh source code, mem-build ulang file `extension.crx`, dan menyinkronkan folder ekstensi ke `/home/arya/Downloads/browser-agent/`.

### 3. Buat Restore Point Baru Setelah Setiap Update
```bash
cd ~/browser-agent
./create_restore_point.sh v2.16.0 "Deskripsi update fitur baru..."
```

---

## 📜 SOP Mandat Versioning & Restore Point untuk AI Agent
Setiap kali AI Agent melakukan perubahan, penambahan fitur, atau perbaikan bug:
1. **Tentukan Nomor Versi Semantik:** Naikkan Minor (`v2.16.0`) untuk fitur baru atau Patch (`v2.15.1`) untuk perbaikan bug.
2. **Update Manifest:** Perbarui versi pada `extension/manifest.json`.
3. **Eksekusi Pembuatan Restore Point:** Jalankan `./create_restore_point.sh <VERSION> "<DESKRIPSI>"`.
4. **Catat di Dokumentasi:** Perbarui `RESTORE_POINTS.md` dan `agent_histori_chat.md`.
5. **Wajib Sebutkan Versi:** Pada akhir setiap jawaban/respons ke pengguna, **WAJIB** menyebutkan versi terbaru yang aktif saat ini dan status restore point-nya.
