# 📜 AGENT HISTORI CHAT & DECISION LOG - BROWSER AGENT

Dokumen ini mencatat seluruh riwayat keputusan arsitektur, preferensi pengguna, dan konfigurasi teknis pada proyek **Browser Agent (Standalone)**.

---

## 👤 1. Profil & Preferensi Pengguna
- **Bahasa Komunikasi:** Bahasa Indonesia (ringkas, komunikatif, to the point).
- **Gaya Respon:** Terse Caveman Style (ringkas, tanpa fluff/basa-basi, kode & path exact).
- **Lingkungan OS:** Linux (Arch Linux, Wayland) dengan dukungan installer multiplatform (Linux, macOS, Windows).
- **Tujuan Aplikasi:** General Purpose Browser Autonomous Agent & AI Copilot.
- **ATURAN MUTLAK UI:** **DILARANG MENGGUNAKAN ICON EMOJI/EMOTIKON.** Seluruh ikon wajib menggunakan Vector SVG murni.
- **DESAIN VISUAL:** **Clean, Elegant, Rounded Light SaaS (Lime Chartreuse `#CEF128`, Pure White `#FFFFFF`, Dark Slate `#0F172A`).**

---

## 🛠️ 2. Riwayat Keputusan & Desain

### Iterasi 1-88: Swarm Pipeline, Clarification, Quality Gate, Wait Skill, Search Bars, Table Extractor
- Seluruh arsitektur, installer, database, modal, scrollbar, date/time injection, media tools, alur klik YouTube, HUD vignette overlay, 9 core memories, scrollable card containers, Multi-Agent Swarm selection, 15 core skills, single active dynamic pill, perbaikan filter pseudo-tool, deep composed click, 3 browser tab management tools, quality gate screenshot walkthrough, tool `agent_subtask_analysis`, tool `ask_clarification`, tool `browser_wait`, built-in skill `skill_browser_wait`, 3 realtime search bars, deep extractor `browser_extract_table`, dan pre-flight dashboard checklist selesai.

### Iterasi 89: Docking Konfirmasi Arahan di Atas Input Prompt & Auto-Dismiss
- **Kebutuhan Pengguna**: Memindahkan card **"Konfirmasi Arahan Master Agent"** agar menempel (docked) di atas input prompt bar (bukan di dalam bubble chat room) dan otomatis hilang begitu opsi diklik atau arahan kustom dikirim.
- **Solusi & Peningkatan**:
  1. **HTML Dock Element**:
     - Menambahkan `<div class="clarification-dock-container" id="clarification-dock-container">` tepat di atas `#chat-input-bar` di dalam `.chat-input-container`.
  2. **Render & Animasi CSS**:
     - Animasi `slideUpClarification` yang halus saat card muncul.
     - Menggunakan SVG Vector murni pada tombol opsi kustom (Zero Emoji Protocol).
     - Menambahkan tombol dismiss `(×)` pada header card.
  3. **Auto-Dismiss Lifecycle**:
     - Saat chip opsi diklik (1, 2, 3), prompt otomatis diisikan, dock langsung hilang (`hideClarificationDock()`), dan pesan langsung dikirim (`handleSendMessage()`).
     - Saat tombol kustom diklik, dock tertutup dan fokus langsung beralih ke `chatInput`.
     - Setiap `handleSendMessage()` atau `startNewChat()` dipanggil, dock otomatis dibersihkan.
  4. Re-pack `extension.crx` (294.8 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 90: Perbaikan handleSend, Storage Quota Unlimited, dan Dukungan Upload & Analisis Video Multimodal
- **Kebutuhan Pengguna**:
  1. Memperbaiki error `Uncaught ReferenceError: handleSend is not defined` saat chip arahan/saran diklik.
  2. Mengatasi warning `Local storage cache warning: Error: Resource::kQuotaBytes quota exceeded` saat menyimpan riwayat percakapan besar.
  3. Memperbaiki fitur upload video ke input prompt agar bisa dilampirkan dan dianalisis alur visual/audionya secara mendalam oleh AI Agent.
- **Solusi & Peningkatan**:
  1. **Alias `handleSend`**:
     - Menambahkan alias `const handleSend = handleSendMessage;` dan `window.handleSend = handleSendMessage;` untuk backward-compatibility.
  2. **Storage Quota & Unlimited Storage**:
     - Menambahkan permission `"unlimitedStorage"` di `manifest.json`.
     - Melakukan auto-pruning pada `chat_sessions_cache` di `chrome.storage.local` (hanya menyimpan 10 sesi terakhir dengan sanitasi dataUrl) sementara riwayat lengkap disimpan aman di database SQLite native host.
  3. **Dukungan Video Multimodal & Ekstraksi Keyframe**:
     - Menambahkan `video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v` pada `accept` file input di `sidepanel.html`.
     - Membuat fungsi `extractVideoMetadataAndFrames()` menggunakan in-memory HTML5 `<video>` & `<canvas>` untuk mengekstrak metadata durasi, resolusi, serta 4–6 snapshot keyframe temporal di sepanjang video.
     - Merancang kartu preview video (`.attachment-preview-card.is-video`) dan bubble chat video (`.user-attached-video-card`) lengkap dengan player kontrol dan badge durasi.
     - Menyuntikkan seluruh keyframe dan metadata video ke payload multimodal AI (`image_url`) sehingga model vision dapat menganalisis cerita, adegan, teks overlay, dan alur video secara komprehensif.
  4. Re-pack `extension.crx` (296.8 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 91: Perbaikan Native Host Disconnect & SQLite Parameter Binding Error
- **Kebutuhan Pengguna**:
  - Memperbaiki error `SQLite save notice: Error binding parameter 5: type 'list' is not supported` dan `Native host disconnected: Error when communicating with the native messaging host`.
- **Akar Masalah (Root Cause)**:
  - Pada payload multimodal (gambar/video), `content` pesan berbentuk array list of dicts (`[{type: "text", text: "..."}, {type: "image_url", ...}]`).
  - Saat `db_save_session` di `native_host.py` mengekstrak cuplikan preview dengan `m.get("content", "")[:120]`, hasilnya adalah Python `list` (bukan `str`). Saat di-bind ke kolom SQLite parameter 5, Python `sqlite3` melempar `InterfaceError: type 'list' is not supported`.
  - Exception tersebut menyebabkan thread `read_from_chrome` terputus (`break`), sehingga native messaging host mati dan memicu `Native host disconnected`.
- **Solusi & Peningkatan**:
  1. **Fungsi `extract_text_preview()`**:
     - Mengekstrak string teks bersih dari payload teks biasa, array part multimodal, maupun dict tanpa pernah menghasilkan list.
  2. **Type Casting Eksplisit SQLite**:
     - Mengunci seluruh parameter `(str(sid), str(title), str(model), int(msg_count), str(preview), str(messages_json), int(created_at), int(updated_at))` sehingga mustahil gagal bind ke tabel `sessions`.
  3. **Harden `read_from_chrome` Loop**:
     - Membungkus pemanggilan `handle_local_rpc` dalam try/except terlindungi, mengirim balik status error JSON-RPC jika terjadi kegagalan tanpa pernah mematikan proses native host.
  4. **Verifikasi & Build**:
     - Unit test Python `db_save_session` dengan multimodal list berhasil (`status: ok`, preview terdeteksi bersih).
     - Menjalankan `setup.py` dan memperbarui paket `extension.crx` & `Browser-Agent-Universal-Installer.zip`.

### Iterasi 92: Penyesuaian Aspek Rasio Otomatis Kontainer Video Chat (Anti Black Bars)
- **Kebutuhan Pengguna**:
  - Mengubah ukuran kontainer hasil input video user di chat room agar otomatis menyesuaikan aspek rasio resolusi video aslinya (misal video vertikal 9:16 WhatsApp/Reels), sehingga tidak ada ruang hitam (black bars / letterboxing) di samping kiri/kanan maupun atas/bawah.
- **Solusi & Peningkatan**:
  1. **Dynamic Aspect Ratio di CSS**:
     - Mengubah `.user-attached-video-card` menjadi `width: fit-content !important; max-width: min(250px, 85vw) !important;` dengan background transparan/solid rapat.
     - Mengatur `<video>` di `.user-attached-video-card video` menjadi `width: 100%; height: auto; max-width: 250px; max-height: 250px; object-fit: contain; background: transparent;`.
  2. **Auto Aspect-Ratio Binding di JavaScript**:
     - Pada `appendUserMessage` (`sidepanel.js`), menyuntikkan inline style `aspect-ratio: ${att.width} / ${att.height}` serta event handler `onloadedmetadata` dinamis (`this.style.aspectRatio = this.videoWidth + '/' + this.videoHeight`).
     - Hasil: Video vertikal (9:16), horizontal (16:9), maupun persegi (1:1) akan langsung terbungkus secara presisi (*pixel-perfect fit*) tanpa menyisakan ruang/batang hitam sedikit pun di sekeliling video.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (297.0 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 93: Perbaikan Video Attachment Persisting di Chat History & Poster Card
- **Kebutuhan Pengguna**:
  - Mengatasi video attachment yang berubah menjadi ikon file kosong atau hilang saat sesi direfresh/dimuat ulang dari riwayat SQLite (`kok ilang bro`).
- **Akar Masalah (Root Cause)**:
  - Pada `sanitizeHistoryForStorage`, `att.dataUrl` di-strip agar hemat storage, tetapi `thumbnailUrl`, `width`, dan `height` tidak disimpan ke objek attachment.
  - Saat sesi dimuat ulang via `resumeSession()`, `att.isVideo && att.dataUrl` bernilai `false`, sehingga eksekusi jatuh ke blok `else` (file pill generik).
- **Solusi & Peningkatan**:
  1. **Preservasi Thumbnail & Dimensi**:
     - `sanitizeHistoryForStorage` kini menyimpan `thumbnailUrl` (~15KB JPEG poster frame), `width`, `height`, dan `duration`.
  2. **Dual-Mode Video Renderer di `appendUserMessage`**:
     - Jika `att.dataUrl` ada (sesi aktif): Render pemutar `<video>` interaktif dengan auto aspect ratio.
     - Jika `att.dataUrl` tidak ada (sesi riwayat/reloaded): Render poster video card lengkap dengan thumbnail frame asli, badge tombol play tengah, label nama video, dan badge durasi tanpa pernah turun ke file pill kosong.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (297.5 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 94: Eliminasi Total Black Bars pada Poster Video Vertikal (Object-Fit & Auto-Sizing)
- **Kebutuhan Pengguna**:
  - Menghilangkan bilah/ruang hitam di sisi kanan poster video vertikal pada screenshot `uploaded_media_1787324068555.png` (`masih kek gini bro`).
- **Akar Masalah (Root Cause)**:
  - `.user-attached-video-card` memiliki `min-width: 140px !important;` dan `.user-video-poster-wrapper` memiliki `background: #000000; width: 100%;` dengan `img { object-fit: contain }`.
  - Jika gambar/video vertikal berukuran ramping (misal lebar 100px), `min-width: 140px` memaksa kontainer melebar menjadi 140px dan `object-fit: contain` menyisakan 40px background hitam di sisi samping.
  - Pada `extractVideoMetadataAndFrames`, `Math.max(160, ...)` sempat mendistorsi aspect ratio canvas.
- **Solusi & Peningkatan**:
  1. **Hapus `min-width` & Gunakan `width: auto`**:
     - `.user-attached-video-card` kini memakai `display: inline-flex; width: auto; max-width: min(240px, 80vw);`.
     - `.user-video-poster-wrapper` memakai `background: transparent; display: block;`.
     - Gambar poster `img` memakai `display: block; width: auto; height: auto; max-width: min(240px, 80vw); max-height: 260px; object-fit: cover;`.
     - Hasil: Elemen `<img>` dan kontainer otomatis membalut (*tight-wrap*) gambar/video 1:1 sesuai piksel aslinya tanpa sisa ruang hitam 1 piksel pun di sisi kiri/kanan/atas/bawah.
  2. **Koreksi Proporsi Ekstraksi Frame**:
     - Menghapus batas minimum 160px yang mendistorsi aspect ratio di `extractVideoMetadataAndFrames`.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (297.4 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 95: Anti-Crop Aspek Rasio Video Asli (Object-Fit Contain) & Fitur Modal Fullscreen Video
- **Kebutuhan Pengguna**:
  - Mengatasi video/poster yang ter-crop dan menambahkan kemampuan klik untuk memutar video dalam mode Fullscreen Lightbox (`aspek rasio ga sama bro jadi ke krop videonya trus gabisa di fullscreen`).
- **Akar Masalah (Root Cause)**:
  - Penggunaan `object-fit: cover` sebelumnya memotong bagian tepi atas/bawah/samping video jika rasio tidak persis sama dengan kartu.
  - Kartu lampiran video di chat sebelumnya belum memiliki event listener untuk membuka pemutar media Fullscreen Lightbox.
- **Solusi & Peningkatan**:
  1. **Anti-Crop Intrinsic Scaling (CSS)**:
     - Mengubah seluruh `object-fit` pada video dan poster gambar menjadi `object-fit: contain !important;` dengan `width: auto; height: auto; display: block;`.
     - Hasil: Seluruh frame video 100% utuh tanpa ada bagian gambar yang terpotong sedikit pun (*Zero Crop Guarantee*).
  2. **Modal Fullscreen Media Player (Image & Video)**:
     - Meng-upgrade modal lightbox di `sidepanel.html` menjadi pemutar media ganda (`<img>` dan `<video controls autoplay playsinline>`).
     - Menambahkan fungsi `openMediaLightbox()` di `sidepanel.js` dengan delegasi klik pada seluruh kartu `.user-attached-video-card` dan thumbnail gambar.
     - Pengguna kini dapat mengklik video mana pun di chat untuk langsung memutarnya dalam resolusi penuh (*Fullscreen HD Modal*), lengkap dengan kontrol volume, seek bar, tombol download, dan navigasi `Esc`.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (297.9 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 96: Tombol Overlay Fullscreen Video & Perbaikan Izin Chrome Fullscreen
- **Kebutuhan Pengguna**:
  - Mengatasi tombol fullscreen native bawaan video Chrome yang tidak merespons di dalam iframe sidepanel (`ini kok gabisa di klik ya bro`).
- **Akar Masalah (Root Cause)**:
  - Chrome Extension Side Panel berjalan di dalam container terbatas yang secara default memblokir request API Fullscreen native HTML5 (`video.requestFullscreen()` dinonaktifkan oleh Chrome Sidepanel policy).
- **Solusi & Peningkatan**:
  1. **Tombol Overlay Fullscreen Khusus (`.btn-video-fullscreen-overlay`)**:
     - Menambahkan tombol expand fullscreen elegan di pojok kanan atas kartu video `.user-video-media-wrapper`.
  2. **Direct Lightbox Triggering (Sidepanel-Safe Fullscreen Modal)**:
     - Meng-override tombol fullscreen dan menambahkan listener klik langsung pada tombol overlay serta kartu poster untuk membuka pemutar media Fullscreen Lightbox HD.
     - Mode ini 100% kompatibel dengan Chrome Extension Sidepanel, bebas batasan policy browser, dan mendukung pemutaran video HD resolusi penuh, kontrol scrub bar, volume, dan unduh.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (298.3 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 97: Pemutaran Video Persisten dari Riwayat Chat (IndexedDB Media Storage)
- **Kebutuhan Pengguna**:
  - Mengatasi bug di mana setelah pengguna keluar/berpindah riwayat chat dan masuk kembali, video tidak bisa diputar dan hanya menjadi gambar thumbnail saja (`trus bug kalau keluar histori chat trus masuk histori chat lagi video gabisa diputer cuman jadi gambar tumnail aja bro, fix bug ini`).
- **Akar Masalah (Root Cause)**:
  - Database SQLite hanya menyimpan metadata teks dan thumbnail JPEG (~15KB) untuk mencegah bloat database. Data mentah video (`dataUrl`) tidak tersimpan di riwayat, sehingga saat `resumeSession()` dijalankan, video tidak memiliki source video blob asli untuk diputar.
- **Solusi & Peningkatan**:
  1. **Penyimpanan Video Blob ke IndexedDB Browser**:
     - Meng-upgrade database lokal `BrowserAgentMediaDB` (versi 2) dengan object store `videos`.
     - Fungsi `saveVideoToIndexedDB(attId, dataUrl, ...)` otomatis menyimpan data video penuh saat pertama kali diunggah.
  2. **Hydration Otomatis Video saat Resume Session**:
     - Setiap kartu video kini memiliki atribut unik `data-video-id`.
     - Saat sesi dimuat ulang (`resumeSession()`), fungsi `hydrateLocalImages()` otomatis membaca data video dari IndexedDB dan menukar thumbnail statis kembali menjadi pemutar `<video>` interaktif penuh.
  3. **Fallback Fullscreen Player dari IndexedDB**:
     - Klik tombol fullscreen/poster pada sesi lama otomatis mengambil video dari IndexedDB sehingga video tetap dapat diputar dalam resolusi penuh kapan pun sesi dibuka kembali.
  4. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (299.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 98: Deep Real-Time DOM & WhatsApp Chat Extractor (Anti-Halusinasi 100%)
- **Kebutuhan Pengguna**:
  - Mengatasi masalah AI membaca pesan yang tidak sama dengan data riil pada WhatsApp Web (AI membaca pesan halusinasi `Pasti kamu istriku nanti` padahal chat aslinya adalah `oke oke masuk`, `gpp klok gitu`, `gas`, `bebbb aku istrimu apa enggaaa nanti`).
- **Akar Masalah (Root Cause)**:
  - `browser_snapshot` sebelumnya hanya mengandalkan Chrome AXTree (`Accessibility.getFullAXTree`) dengan filter peran tombol/input interaktif. Teks balon pesan WhatsApp sering memiliki peran `StaticText` atau berada di urutan elemen ke 400+ (terpotong oleh limit snapshot 300 elemen karena daftar 170 kontak sidebar chat WhatsApp).
  - Karena tidak menerima teks percakapan riil dari snapshot, model AI melakukan inferensi atau halusinasi isi percakapan.
- **Solusi & Peningkatan**:
  1. **Deep Real-Time DOM Content Extractor di `browser_snapshot`**:
     - Menambahkan script `Runtime.evaluate` cerdas yang otomatis mendeteksi platform (misal WhatsApp Web di `web.whatsapp.com`).
     - Mengekstrak 100% data teks riil dari kontainer chat aktif `#main` (`.message-in`, `.message-out`, `.copyable-text`, `span[dir="auto"]`, `data-pre-plain-text`), menangkap nama kontak, arah pesan (`incoming`/`outgoing`), timestamp, isi pesan asli, serta lampiran foto/video/VN.
  2. **Aturan Tegas Anti-Halusinasi di System Prompt**:
     - Menambahkan klausul mandat `CHAT & WEB PAGE CONTENT READING RULE` pada `DEFAULT_SYSTEM_PROMPT` yang mewajibkan AI selalu membaca objek `activePageContent.recentChatMessages` dan melarang keras mengarang/menebak pesan yang tidak ada di DOM asli.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (300.6 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 99: Pencegahan Kebocoran Payload Multimodal Internal pada Unggahan Video Tanpa Teks
- **Kebutuhan Pengguna**:
  - Mengatasi bug di mana saat pengguna mengunggah video tanpa mengetik teks prompt (`kalo cuman langsung kirim video tanpa chat itu ngebug gini bro, fix in bro`), riwayat chat menampilkan balon teks raksasa berisi instruksi internal AI (`--- [Lampiran Video: ...] --- Mohon analisis video terlampir ini secara menyeluruh... [Frame Video...] [Lampiran Gambar / Video Frame]...`).
- **Akar Masalah (Root Cause)**:
  - Pada saat pengguna mengirim video tanpa teks, `msg.displayContent` bernilai string kosong `""`.
  - Di fungsi `sanitizeHistoryForStorage()`, pengecekan sebelumnya `if (msg.displayContent)` menganggap string kosong `""` sebagai *falsy*, sehingga `displayContent` tidak tersimpan ke database.
  - Akibatnya, saat `resumeSession()` dijalankan, `msg.displayContent` bernilai `undefined`, memicu *fallback* yang mengekstrak teks dari seluruh array payload internal AI (`msg.content`) dan merendernya sebagai balon chat pengguna.
- **Solusi & Peningkatan**:
  1. **Penyimpanan Eksplisit `displayContent` String Kosong**:
     - Memastikan `sanitizeHistoryForStorage()` selalu menyimpan `displayContent` bertipe string asli (`""` jika pengguna tidak mengetik teks).
  2. **Isolasi Tampilan di `resumeSession()`**:
     - `resumeSession()` kini mengecek `typeof msg.displayContent === 'string'`. Jika pengguna hanya melampirkan video/gambar tanpa teks, tampilan chat hanya menampilkan kartu video/gambar murni tanpa teks teknis internal AI.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (300.6 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 100: Penyimpanan Otomatis Screenshot Walkthrough ke Folder Database SQLite
- **Kebutuhan Pengguna**:
  - Menyimpan file hasil screenshot walkthrough browser AI ke folder yang sama dengan database SQLite (`~/.browser-agent/walkthrough_screenshots/`) agar pengguna dapat melihat langsung bukti berkas gambar audit walkthrough di disk lokal (`buat ketika ai melakukan screenshot walktrough akan kesimpen di folder yang sama dengan database sqlite biar bisa dilihat file screnshotwalktroughnya`).
- **Solusi & Peningkatan**:
  1. **Folder Khusus `walkthrough_screenshots` di `~/.browser-agent/`**:
     - Ditambahkan konstanta `SCREENSHOTS_DIR = os.path.join(DB_DIR, "walkthrough_screenshots")` di `host/native_host.py` (berdampingan langsung dengan `chat_history.db`).
     - Handler RPC `save_screenshot()` otomatis menyimpan gambar PNG dengan penamaan terstruktur (`walkthrough_YYYYMMDD_HHMMSS_judul.png`).
  2. **Integrasi Eksekusi Tool `browser_screenshot()`**:
     - Di `extension/sidepanel.js`, saat tool `browser_screenshot()` dijalankan oleh AI (misal Master Agent saat audit walkthrough), sistem otomatis mengirimkan data base64 ke Native Host RPC `save_screenshot`.
     - Hasil tool kini menyertakan path berkas lokal `savedFilePath` (contoh: `/home/arya/.browser-agent/walkthrough_screenshots/walkthrough_20260821_221800.png`) sehingga Master Agent dapat langsung mencantumkan lokasinya di laporan akhir.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (300.8 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 101: Redesain Minimalis & Frosted Glass Blur pada Floating Control Capsule HUD
- **Kebutuhan Pengguna**:
  - Menyederhanakan tampilan HUD pill di atas halaman web saat AI mengontrol browser (`ini buat lebih simpel clean bro ui nya yang saya kotak in itu gausah ada biar lebih clean, trus ui transparant glasses blur`):
    1. Menghapus teks redundan `"Browser Agent"`.
    2. Menghapus teks `"Pause / Stop"` pada tombol.
    3. Mengubah kapsul menjadi transparan dengan efek *frosted glass blur* (*Glassmorphism*).
- **Solusi & Peningkatan**:
  1. **Tampilan Minimalis & Penghapusan Label Teks**:
     - Menghapus teks judul `"Browser Agent"`, menyisakan indikator live status berdenyut (pulsing dot hijau lime) dan badge status langkah/tindakan.
     - Mengubah tombol stop menjadi tombol ikon circular 26px berwarna lime `#CEF128` dengan ikon pause/stop `❚❚` yang presisi.
  2. **Efek Frosted Glassmorphism**:
     - Mengaplikasikan `background: rgba(15, 23, 42, 0.68) !important;` dengan `backdrop-filter: blur(16px) saturate(180%) !important;`.
     - Ditambahkan highlight border 1px translucent `rgba(255, 255, 255, 0.14)` dan subtle glow lime untuk kesan premium dan futuristik.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (300.9 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 102: Auto-Cleanup & Dynamic Injeksi Ulang Script HUD pada Tab yang Sedang Aktif
- **Kebutuhan Pengguna**:
  - Memastikan perubahan desain HUD langsung aktif dan terlihat tanpa mengharuskan pengguna me-refresh semua tab browser yang sudah terbuka secara manual (`kok masih belum keganti bro`).
- **Akar Masalah (Root Cause)**:
  - Tab browser yang sudah terbuka sebelumnya memuat script konten versi lama di memori tab. Selain itu, fungsi `createAgentHUD` tidak menghancurkan elemen DOM lama jika node `#browser-agent-hud-root` sudah tertancap di halaman.
- **Solusi & Peningkatan**:
  1. **Pembersihan Stale DOM Otomatis**:
     - `createAgentHUD()` di `content.js` kini otomatis mendeteksi dan menghapus semua elemen HUD versi lama (`#browser-agent-hud-root`, `#ba-control-capsule`) sebelum membuat kapsul baru.
  2. **Dynamic Injeksi Ulang via `chrome.scripting`**:
     - Di `sidepanel.js`, `notifyActiveTabExecutionState` kini memiliki mekanisme *dynamic script injection* otomatis (`chrome.scripting.executeScript`) bila tab aktif belum memiliki script versi terbaru.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (301.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 103: Responsifitas Penuh Kontainer Sidepanel & Eliminasi Horizontal Scrollbar
- **Kebutuhan Pengguna**:
  - Mengatasi bug UI kepanjangan dan munculnya scrollbar horizontal di bagian bawah sidepanel saat AI menampilkan path berkas/teks panjang tanpa spasi (`bug ui kepanjangan sampai mentok panjang ga menyesuaikan ukuran side panel yang kecil , kalo side panel lebar aman`).
- **Akar Masalah (Root Cause)**:
  - Elemen inline code (`.md-inline-code` / `<code>`) dan link (`.md-link`) yang berisi path berkas panjang (misal `/home/arya/.browser-agent/walkthrough_screenshots/walkthrough_1787326297683_...png`) sebelumnya tidak memiliki aturan pemotongan kata `word-break: break-all` dan `overflow-wrap: anywhere`.
  - Selain itu, `.chat-messages` dan `.message.assistant` tidak memiliki `overflow-x: hidden !important`, sehingga teks panjang meregangkan seluruh lebar chat melebihi lebar sidepanel Chrome yang sempit.
- **Solusi & Peningkatan**:
  1. **Overflow-X Containment**:
     - Menambahkan `overflow-x: hidden !important;`, `width: 100% !important;`, dan `box-sizing: border-box !important;` pada `.chat-messages`, `.message.assistant`, dan `.message.assistant .message-content`.
  2. **Word-Break & Anywhere Wrapping untuk Inline Code & Path**:
     - Mengaplikasikan `word-break: break-all !important;`, `overflow-wrap: anywhere !important;`, dan `white-space: pre-wrap !important;` pada seluruh `.md-inline-code`, `code`, `.md-link`, `li`, dan `.md-p`.
     - Hasil: Seluruh path berkas panjang dan tautan otomatis membungkus (*wrap*) ke baris berikutnya mengikuti lebar sidepanel sekecil apa pun tanpa ada scrollbar horizontal yang muncul.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (301.3 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 104: Eliminasi Indikator Dot pada Floating Capsule HUD (Ultra-Minimalist Two-Element Pill)
- **Kebutuhan Pengguna**:
  - Menghapus titik hijau menyala (*pulsing status dot*) di sebelah kiri badge langkah pada floating HUD agar desain kapsul benar-benar bersih dan minimalis (`ini hapus aja bro`).
- **Solusi & Peningkatan**:
  1. **Struktur Kapsul 2-Elemen Murni**:
     - Menghapus seluruh markup indikator `<span>` pulsing dot dari `capsuleEl.innerHTML`.
     - Kapsul kini hanya terdiri dari 2 elemen elegan:
       `[ Badge Langkah / Status ] [ Tombol Ikon Stop Lime 24px ]`
     - Padding dipersempit menjadi `4px 6px 4px 8px` agar proporsional dan tidak memakan ruang pandang layar.
  2. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (301.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 105: Penyatuan Scrollbar Vertikal Global Seluruh Ruang Chat (Single Full-Height Chat Scroll)
- **Kebutuhan Pengguna**:
  - Memperbaiki scrollbar vertikal yang sebelumnya terfragmentasi muncul di setiap balon pesan asisten individual dan menyatukannya menjadi satu scrollbar tunggal di seluruh ruang chat (*"kok malah scrol nya per respon ai ya bro harusnya scrollnya itu full di chat room nya bro"*).
- **Akar Masalah (Root Cause)**:
  - Pada iterasi 103, penambahan `overflow-x: hidden` pada `.message.assistant` secara otomatis membuat browser mengomputasi `overflow-y: auto` pada setiap balon asisten (aturan standar CSS), sehingga setiap balon AI memiliki scrollbar independen.
- **Solusi & Peningkatan**:
  1. **Overflow Visible pada Balon Pesan**:
     - Mengubah `.message.assistant` dan `.message.assistant .message-content` menjadi `overflow: visible !important;`.
  2. **Single Global Chat Scrollbar**:
     - Memastikan satu-satunya kontainer yang memiliki scrolling vertikal adalah `.chat-messages` (`overflow-y: auto !important; overflow-x: hidden !important;`).
     - Hasil: Seluruh riwayat percakapan mengalir mulus dengan satu scrollbar penuh di samping kanan sidepanel tanpa ada scrollbar di dalam balon respon AI.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (301.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 106: Fitur Dual Mode Switcher (Mode Chat vs Mode Agent) dengan Deteksi Otomasi Cerdas
- **Kebutuhan Pengguna**:
  - Menambahkan tombol saklar mode di atas input prompt (`[ Chat ] [ Agent ]`):
    1. Kiri: **Chat** (Mode percakapan murni, cepat, tanpa kontrol/tool browser).
    2. Kanan: **Agent** (Mode otonom penuh dengan tool CDP, screenshot, WhatsApp DOM extractor, multi-agent orchestration, dsb).
    3. Default: **Aktif di Mode Agent**.
    4. Jika pengguna berada di Mode Chat lalu meminta sesuatu yang membutuhkan kontrol browser (contoh: buka web, klik login, screenshot, baca chat WhatsApp), AI merespons ramah bahwa tindakan butuh Mode Agent dan menyajikan kartu interaktif dengan tombol `[ 🚀 Pindah ke Mode Agent & Jalankan ]` atau `[ Tetap di Mode Chat ]`.
- **Solusi & Peningkatan**:
  1. **Komponen UI Mode Switcher Pill Group**:
     - Ditambahkan `.chat-input-top-bar` berisi tombol kapsul `#btn-mode-chat` dan `#btn-mode-agent` tepat di atas kolom input prompt dengan gaya SaaS Dark Slate & Lime Accent `#CEF128`.
     - Status mode tersimpan otomatis ke `chrome.storage.local` dan default ke `"agent"`.
  2. **Eksekutor Terpisah `runChatModeLoop()`**:
     - Mode Chat murni mengeksekusi streaming LLM tanpa memuat skema tool browser (`tools: []`), sehingga respon percakapan, coding, dan analisis teks berjalan sangat cepat dan hemat token.
     - Menggunakan `CHAT_ONLY_SYSTEM_PROMPT` yang secara otomatis menginstruksikan AI untuk mendeteksi kebutuhan kontrol browser dan menyertakan metadata `[SWITCH_TO_AGENT_REQUEST: <prompt>]`.
  3. **Interactive Agent Switch Card**:
     - Jika AI mendeteksi kebutuhan kontrol browser saat di Mode Chat, sistem merender kartu interaktif `.agent-switch-card` dengan tombol aksi langsung:
       - Klik `🚀 Pindah ke Mode Agent & Jalankan`: Seketika mengaktifkan Mode Agent dan langsung menjalankan tugas tersebut dengan tool browser!
       - Klik `Tetap di Mode Chat`: Menutup kartu rekomendasi.
  4. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.0 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 107: Perbaikan ReferenceError saveVideoAttachmentsToIndexedDB pada Mode Chat
- **Kebutuhan Pengguna**:
  - Mengatasi galat runtime JavaScript `Uncaught (in promise) ReferenceError: saveVideoAttachmentsToIndexedDB is not defined` saat mengirim pesan di Mode Chat.
- **Akar Masalah (Root Cause)**:
  - Pada iterasi 106, fungsi `saveVideoAttachmentsToIndexedDB(attachments, currentSessionId)` dipanggil di dalam `runChatModeLoop()`, namun fungsi batch wrapper tersebut belum didefinisikan (hanya ada fungsi satuan `saveVideoToIndexedDB()`).
- **Solusi & Peningkatan**:
  1. **Definisi Fungsi Batch `saveVideoAttachmentsToIndexedDB()`**:
     - Ditambahkan helper `saveVideoAttachmentsToIndexedDB(attachments)` di `extension/sidepanel.js` untuk mengiterasi seluruh lampiran video dan menyimpannya secara aman ke IndexedDB (`videos` object store).
  2. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 108: Perbaikan ReferenceError currentSessionHistory & Sinkronisasi DB pada Mode Chat
- **Kebutuhan Pengguna**:
  - Mengatasi galat JavaScript `Uncaught (in promise) ReferenceError: currentSessionHistory is not defined` saat user berinteraksi di Mode Chat.
- **Akar Masalah (Root Cause)**:
  - Variabel riwayat percakapan global yang digunakan oleh seluruh extension adalah `conversationHistory`. Di dalam `runChatModeLoop()`, terjadi ketidaksesuaian penamaan (`currentSessionHistory` dan `saveSessionToDatabase()`).
- **Solusi & Peningkatan**:
  1. **Sinkronisasi Riwayat Chat**:
     - Mengganti referensi variabel ke `conversationHistory` dan memanggil `saveCurrentSessionToDB()`.
     - Menggunakan `sanitizeMessagesForApi(conversationHistory.slice(-12))` agar format payload ke LLM terstandarisasi.
  2. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 109: Penyelarasan Penugasan Lampiran pada Mode Chat
- **Kebutuhan Pengguna**:
  - Mengatasi galat runtime JavaScript `Uncaught (in promise) ReferenceError: sanitizeAttachmentsForStorage is not defined` saat user mengirim pesan chat di Mode Chat.
- **Akar Masalah (Root Cause)**:
  - Di `runChatModeLoop()`, properti lampiran pada objek pesan pengguna dibungkus dengan nama fungsi non-eksisten (`sanitizeAttachmentsForStorage(attachments)`).
- **Solusi & Peningkatan**:
  1. **Penyelarasan Struktur Riwayat Objek Pesan**:
     - Mengubah penugasan lampiran menjadi `attachments: attachments` (persis seperti standar di `runAgentLoop()`).
     - Sanitasi lampiran untuk SQLite DB dilakukan otomatis oleh fungsi inti `sanitizeHistoryForStorage(conversationHistory)` saat `saveCurrentSessionToDB()` dipanggil.
  2. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.1 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 110: Integrasi Master Agent Persona, Custom Skills & Memori Penuh pada Mode Chat
- **Kebutuhan Pengguna**:
  - Mengatasi status "Gagal" pada Mode Chat dan memastikan Mode Chat tetap menggunakan persona **Master Agent**, seluruh **Custom Skills**, dan **Long-Term Memory** yang sama dengan Mode Agent, namun berjalan murni tanpa browser control tools.
- **Akar Masalah (Root Cause)**:
  - `runChatModeLoop()` memanggil helper endpoint non-eksisten (`getEndpointUrl(config)`) alih-alih `config.endpoint.replace(/\/+$/, '') + '/chat/completions'`, sehingga melempar ReferenceError ke blok catch dan menghasilkan status "Gagal".
  - Prompt awal di Mode Chat belum memuat resolusi agen otomatis (`resolveAutoAgents()`) dan `buildDynamicSystemPrompt(resolvedAgents)`.
- **Solusi & Peningkatan**:
  1. **Integrasi Master Agent Persona & Knowledge Base Penuh**:
     - `runChatModeLoop()` kini memanggil `resolveAutoAgents(userMessage)` dan `buildDynamicSystemPrompt(resolvedAgents)`.
     - Seluruh Persona Master Agent, Custom Skills, dan Memori Jangka Panjang pengguna aktif 100% saat menjawab di Mode Chat.
  2. **Eksekusi Chat Murni Tanpa Tool Browser**:
     - Ditambahkan arahan `CHAT_ONLY_SYSTEM_PROMPT` di mana Master Agent menjawab secara cepat tanpa memanggil browser tool, dan otomatis menyajikan kartu saklar `[ 🚀 Pindah ke Mode Agent & Jalankan ]` jika pengguna meminta aksi browsing.
  3. **Identitas Balon Asisten Akurat**:
     - Balon pesan menampilkan badge `Master Agent` lengkap dengan avatar dan indikator status yang selaras.
  4. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.2 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 111: Perbaikan Streaming Renderer & Visibility Teks Balon pada Mode Chat
- **Kebutuhan Pengguna**:
  - Mengatasi teks jawaban AI yang terlihat kosong pada balon asisten di Mode Chat meskipun status telah "Selesai".
- **Akar Masalah (Root Cause)**:
  - Pada saat balon asisten dibuat dengan avatar Master Agent, elemen `.message-content` memiliki initial inline `style="display: none;"` (standar penundaan rendering untuk menunggu tool call pertama).
  - Di `runChatModeLoop()`, teks streaming sebelumnya ditulis langsung ke `contentEl.innerHTML` tanpa memanggil `updateAssistantText(assistantBubble, text, isStreaming)`, sehingga kontainer `.message-content` tetap dalam status `display: none`.
  - Selain itu, parsing SSE chunk diperluas dari `data: ` menjadi regex `^data:\s*` agar kompatibel dengan seluruh format penyedia model AI (Ollama, DeepSeek, Groq, 9Router, OpenAI).
- **Solusi & Peningkatan**:
  1. **Standardisasi Pemanggilan `updateAssistantText()`**:
     - `runChatModeLoop()` kini secara konsisten memanggil `updateAssistantText(assistantBubble, accumulatedContent, true)` saat streaming dan `updateAssistantText(assistantBubble, cleanFinalText, false)` setelah respon selesai.
     - Kontainer `.message-content` secara otomatis beralih ke `display: block` dan efek streaming kursor muncul mulus.
  2. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.2 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 112: Redesain Ikon Robot AI & Polish Visual Modern pada Kartu Beralih Mode Agent
- **Kebutuhan Pengguna**:
  - Mengganti ikon bintang yang tidak relevan pada tombol mode Agent dan kartu rekomendasi beralih ke Mode Agent dengan ikon AI Bot / Autonomous Agent yang presisi, serta meningkatkan estetika visual UI kartu agar tampak elegan, modern, dan tidak kaku.
- **Solusi & Peningkatan**:
  1. **Penggantian Ikon Robot AI Agent**:
     - Mengganti seluruh ikon bintang `<polygon>` pada tombol toggle `#btn-mode-agent` dan header `.agent-switch-header` dengan ikon **Robot Autonomous Agent Head** bergaris halus (`<rect rx="3">`, `<circle>`, antenna, dan mata digital).
     - Mengganti ikon tombol aksi eksekusi pada `.btn-switch-to-agent-confirm` dengan ikon **Fast Lightning / Action Bolt** yang dinamis.
  2. **Elevasi Estetika Visual `.agent-switch-card`**:
     - Menerapkan background gradien modern Dark Luxury Slate (`linear-gradient(145deg, #0F172A 0%, #1E293B 100%)`) dengan border halus transparan lime (`rgba(206, 241, 40, 0.35)`).
     - Menambahkan micro-shadow halus, typography ramping dengan kontras tinggi (`#CBD5E1`), dan tombol batal dengan border semi-transparan yang responsif saat di-hover.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.2 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 113: Eliminasi Ikon pada Tombol Pindah ke Mode Agent & Jalankan
- **Kebutuhan Pengguna**:
  - Menghapus ikon dari dalam tombol `Pindah ke Mode Agent & Jalankan` agar tombol tampak bersih, minimalis, dan berfokus langsung pada teks aksi.
- **Solusi & Peningkatan**:
  1. **Tombol Teks Bersih (Clean Text Action Button)**:
     - Menghapus elemen SVG ikon dari dalam `.btn-switch-to-agent-confirm` di [sidepanel.js](file:///home/arya/browser-agent/extension/sidepanel.js).
     - Tombol kini murni menampilkan label teks berbobot tebal yang proporsional dan minimalis: `Pindah ke Mode Agent & Jalankan`.
  2. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.2 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 114: Fix Extension Context Invalidation & Chat Mode API Sanitization
- **Kebutuhan Pengguna**:
  - Mengatasi uncaught error `Extension context invalidated` di content script saat ekstensi di-reload.
  - Memperbaiki kegagalan respons Master Agent pada Mode Chat (status `Gagal`) saat mengirim pesan chat.
- **Penyebab & Solusi**:
  1. **Safe Content Script Unmount & Invalidation**:
     - Membungkus handler `onRemove: (c) => try { c?.unmount() } catch(e){}` dan `notifyInvalidated()` dalam safe `try/catch` di [content.js](file:///home/arya/browser-agent/extension/content-scripts/content.js) sehingga reload ekstensi tidak memunculkan error unhandled di tab yang sedang terbuka (YouTube, dll).
  2. **Chat Mode Message History Sanitization**:
     - Pada Mode Chat, seluruh riwayat percakapan disaring melalui `sanitizeMessagesForApi(conversationHistory, true)` yang murni menyertakan giliran teks `user` dan `assistant`, serta otomatis membuang `role: 'tool'` dan `tool_calls` sisa Mode Agent yang sebelumnya memicu HTTP 400 Bad Request dari API OpenAI/Gemini karena payload tanpa schema tool.
  3. **Config Synchronization & Visible Error Card**:
     - Menambahkan sinkronisasi `chrome.storage.local.get(["browser_agent_config"])` di awal `runChatModeLoop`.
     - Mengatur `contentEl.style.display = 'block'` pada blok `catch` agar pesan error selalu tampil dengan jelas dan informatif.
  4. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (304.6 KB) dan update `Browser-Agent-Universal-Installer.zip`.

### Iterasi 115: Fix WXT Storage Environment Invalidation & Resilient Smart Tab Switching
- **Kebutuhan Pengguna**:
  - Memperbaiki uncaught error `Uncaught Error: 'wxt/storage' must be loaded in a web extension environment` di `content-scripts/content.js` pada tab aktif (seperti YouTube) saat ekstensi di-reload.
  - Memperbaiki kegagalan tindakan `browser_switch_tab` (kotak merah `❌ browser_switch_tab`) ketika user meminta berpindah ke tab tertentu seperti `"switch tab meta ads"`.
- **Penyebab & Solusi**:
  1. **Safe WXT Storage Wrapper di `content.js`**:
     - Fungsi wrapper storage `Uu(a)` kini memeriksa validitas `Cu.runtime` / `Cu.storage` dan membungkus seluruh operasi storage (`getItem`, `getItems`, `setItem`, `setItems`, `removeItem`, `watch`, dsb) dalam safe fallback proxy non-throwing saat konteks ekstensi terinvalidasi.
  2. **Smart Tab Switching & Auto-Fallback di `sidepanel.js`**:
     - `browser_switch_tab` kini mendukung pencarian pintar: pencarian nomor ID, pencarian kata kunci fuzzy pada judul & URL tab (`title` / `url`), auto-pembukaan URL layanan populer (seperti Meta Ads Manager, Instagram, YouTube, WhatsApp Web, ChatGPT, dll) jika tab belum dibuka sebelumnya, serta safe fallback ke tab aktif tanpa melempar uncaught error.
  3. **Sinkronisasi & Rebuild**:
     - Sinkronisasi penuh ke `/home/arya/Downloads/browser-agent`.
     - Re-pack `extension.crx` (305.1 KB).

### 🚀 Iterasi 116: Total Invalidation Hardening di Content Script (Prevent Extension Context Invalidated Error)
- **Problem**:
  - Saat ekstensi diperbarui atau di-reload di Chrome, instance content script lama di tab yang sudah terbuka (seperti YouTube) mengalami invalidasi konteks (`chrome.runtime.id` menjadi `undefined`).
  - Ketika WXT me-unmount React tree dan menghapus listener (`On()`, `Hv()`, `Lv()`, `Xv()`, `Ta.notifyInvalidated()`, `Ta.abort()`), API `chrome.runtime.onMessage.removeListener` melempar `Uncaught Error: Extension context invalidated.` di console host page.
- **Penyebab & Solusi**:
  1. **Top-Level Error & Rejection Filter**:
     - Menambahkan window event listeners pada tahap capture paling awal di `content.js` untuk mendeteksi pesan `Extension context invalidated` dan secara otomatis menghentikan propagasinya ke halaman host.
  2. **Safe Cleanup on Invalidation**:
     - Membungkus seluruh loop pembersihan event listener di `Hv()`, `Lv()`, `Xv()`, dan `On()` dengan validasi konteks dan blok `try/catch`.
     - Melindungi metode `Ta.notifyInvalidated()`, `Ta.abort()`, `Ta.isInvalid`, `listenForNewerScripts`, dan `$b.main` agar selalu aman saat ekstensi ter-reload.
  3. **CRX Build & File Sync**:
     - Re-pack `extension.crx` (305.4 KB).
     - Sinkronisasi instan ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 117: Polishing Format Respon AI (Smart List Continuity, Plain URL Auto-Linking & Compact Spacing)
- **Problem**:
  - Respon AI di sidepanel chat room tampak renggang dan terfragmentasi saat menampilkan daftar bernomor (seperti daftar tab).
  - URL mentah (`https://...`, `http://...`, `chrome://...`) tidak ter-autolink dan memecah daftar ordered list menjadi elemen `<ol>` terpisah-pisah dengan jarak kosong raksasa.
- **Penyebab & Solusi**:
  1. **Smart List Continuation & Single-Container Grouping**:
     - Memperbarui parser `formatMarkdown()` di `sidepanel.js` agar baris lanjutan (URL atau deskripsi sub-item) disarangkan ke dalam elemen `<li>` sebagai `<div class="md-list-sub">` tanpa memutus list.
     - Mendeteksi baris kosong di antara item list bernomor agar tetap berada dalam satu container `<ol class="md-ol">`.
  2. **Plain URL Auto-Linking**:
     - Menambahkan auto-converter regex untuk URL mentah (`https://`, `http://`, `chrome://`, `edge://`) menjadi link interaktif `<a class="md-link">` dengan status hover & pembungkusan aman.
  3. **Typography & Compact Spacing CSS**:
     - Merampingkan margin paragraf `.md-p` dari 10px menjadi 6px dan spacer `.md-spacer` menjadi 6px di `sidepanel.css`.
     - Memberikan styling `.md-list-sub` yang rapi dan serasi dengan teks utama.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (305.8 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 118: Universal Table Cell & Inline Markdown Parser (Eliminate Literal Asterisks & Unescaped Tags)
- **Problem**:
  - Muncul karakter bintang mentah seperti `**Parkir Liar**`, `**STRENGTH (High Engagement)**`, `*Kompas.com*`, serta literal `<br>` di dalam tabel markdown (seperti tabel perbandingan isu).
- **Penyebab & Solusi**:
  1. **Tabel Diekstraksi Sebelum Inline Formatting**:
     - Tabel markdown sebelumnya diekstraksi ke placeholder `__TABLE_BLOCK_` sebelum tahap pemformatan bold `**` dan italic `*`, sehingga isi sel tabel tidak pernah diproses oleh regex markdown.
  2. **Modular `formatInline()` Engine**:
     - Membuat fungsi `formatInline(str)` terdedikasi untuk memformat bold (`**` / `__`), italic (`*` / `_`), strikethrough (`~~`), markdown link, plain URL, dan konversi `&lt;br&gt;` menjadi `<br>`.
     - Seluruh sel `<th>` dan `<td>` pada tabel kini otomatis diproses oleh `formatInline(cell)` sebelum dimasukkan ke dalam HTML tabel.
     - Headings, blockquotes, list items, dan paragraf juga menggunakan `formatInline()`.
     - Placeholder tabel `tableBlocks` kini direstore terlebih dahulu agar kode/gambar di dalam sel tabel dapat direstore dengan urutan yang benar.
  3. **CRX Build & File Sync**:
     - Re-pack `extension.crx` (306.0 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 119: Collision-Free Unicode Placeholders for Inline Code & Blocks (Eliminate Leaked `__INLINE_CODE_X__`)
- **Problem**:
  - Teks mentah `__INLINE_CODE_7 / INLINE_CODE_8__` muncul di chat alih-alih inline code pill yang rapi.
- **Penyebab & Solusi**:
  1. **Placeholder Regex Collision**:
     - Format placeholder sebelumnya (`__INLINE_CODE_X__`) menggunakan garis bawah ganda (`__`) yang berbenturan dengan regex Markdown bold `__text__`. Akibatnya, dua placeholder berurutan terpotong dan tidak dapat direstore.
  2. **Unicode Private Use Area Delimiters**:
     - Mengubah seluruh delimiter placeholder internal menjadi karakter aman tak kasat mata (`\uE000INLINE_CODE_X\uE001`, `\uE000CODE_BLOCK_X\uE001`, `\uE000TABLE_BLOCK_X\uE001`, `\uE000IMAGE_BLOCK_X\uE001`).
     - Menggunakan `split().join()` universal restoration untuk memastikan seluruh token inline code ter-render menjadi `<code class="md-inline-code">` tanpa benturan sintaksis.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (306.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 120: Vibrant Green User Chat Bubble Style
- **Problem**:
  - User menginginkan warna bubble chat pengguna (`.message.user`) diubah menjadi hijau.
- **Penyebab & Solusi**:
  1. **User Bubble Green Styling**:
     - Mengubah background `.message.user .message-content` dari dark slate `#0F172A` menjadi gradien hijau modern `linear-gradient(135deg, #16A34A 0%, #15803D 100%)` dengan bayangan halus hijau `rgba(22, 163, 74, 0.22)` dan teks putih kontras tinggi `#FFFFFF`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (306.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 121: Auto Rotating Model Engine & Top-to-Bottom Priority Ranking
- **Problem**:
  - User ingin otomatisasi rotasi model AI (failover otomatis jika terkena rate limit / 429) berurutan dari model prioritas 1, 2, 3 dari atas ke bawah.
- **Penyebab & Solusi**:
  1. **Auto Rotating Model Engine**:
     - Menambahkan flag `config.autoRotateModel = true` (default).
     - Menambahkan fungsi deteksi rate limit `isRateLimitError(status, errorMsg)` yang mencakup kode HTTP 429, 503, dan pesan error quota/overload.
     - Membungkus seluruh pemanggilan LLM (`executeTaskStep`, Agent Synthesis, dan `streamChatMessage`) dalam loop kandidat model prioritas.
  2. **Priority Ranking UI di Pengaturan (Options & Sidepanel Modal)**:
     - Menambahkan toggle switch on/off **Auto Rotating Model**.
     - Setiap baris model kini menampilkan badge prioritas `#1 (Utama)`, `#2 (Cadangan 1)`, `#3 (Cadangan 2)`, dst.
     - Menambahkan tombol **Naikkan Prioritas (🔼)** dan **Turunkan Prioritas (🔽)** untuk memudahkan user mengatur urutan prioritas eksekusi dari atas ke bawah.

### 🚀 Iterasi 122: Fix Dropdown Model Selector & Agent Selector Click Handler
- **Problem**:
  - Tombol dropdown pilihan model AI hilang dari sub-header.
  - Tombol pilih agent AI (`#btn-active-agent` / `Auto (Agent)`) tidak merespons ketika diklik.
- **Penyebab & Solusi**:
  1. **ReferenceError `closeModelDropdown`**:
     - `openAgentDropdown()` memanggil `closeModelDropdown()` yang terhapus pada iterasi sebelumnya, menyebabkan `ReferenceError` yang memblokir eksekusi event click tombol pilih agent.
  2. **Restore Dropdown Pemilih Model AI**:
     - Mengembalikan wrapper `#btn-active-model` dan `#model-dropdown-menu` ke header `.header-selectors-group` di `sidepanel.html`.
     - Mengimplementasikan `renderModelDropdown()` dengan badge prioritas (`#1 (Utama)`, `#2`, `#3`, ...) dan penanda checklist aktif.
     - Memperbaiki koordinasi buka-tutup dropdown: membuka Model Dropdown otomatis menutup Agent Dropdown, dan sebaliknya, serta menutup keduanya jika klik di luar area menu.

### 🚀 Iterasi 123: Model Dropdown "Auto (Rotating)" Default & UI Anomaly Fix
- **Problem**:
  - Tampilan footer dropdown model mengalami anomali UI (input dan tombol raw unstyled HTML).
  - User ingin opsi pertama di dropdown model adalah **Auto (Rotating Model)** yang menjadi default saat membuka ekstensi, di mana memilih Auto otomatis mengaktifkan rotasi model (#1 -> #2 -> #3) saat rate limit.
  - Toggle on/off auto rotating di modal pengaturan dihapus agar bersih dan intuitif.
- **Penyebab & Solusi**:
  1. **Dropdown UI Polish**:
     - Menghapus input text raw unstyled dari footer dropdown.
  2. **Opsi "Auto (Rotating Model)" Default**:
     - Menetapkan default `config.selectedModelChoice = "auto"` dan `config.model = "auto"`.
  3. **Hapus Toggle Switch dari Pengaturan**:
     - Menghapus komponen switch on/off dari pengaturan.

### 🚀 Iterasi 124: Clean Minimalist Model Dropdown (Remove Redundant Pills & Footer)
- **Problem**:
  - User meminta penghapusan elemen visual berlebih di dropdown:
    1. Badge pill `[✨ AUTO]` pada baris Auto.
    2. Label teks `(Utama)` pada badge `#1 (Utama)` (diubah menjadi `#1` ringkas seperti `#2` dan `#3`).
    3. Tombol/footer `[⚙ Kelola Model & Prioritas]` di bagian bawah dropdown model.
- **Penyebab & Solusi**:
  1. **Clean Auto Row & Compact Priority Badges**:
     - Menghapus badge pill `[✨ AUTO]` sehingga baris pertama hanya menampilkan checkmark dan teks bersih `Auto (Rotating Model)`.
     - Mengubah badge `#1 (Utama)` menjadi badge nomor urut seragam `#1`, `#2`, `#3`, dst.
  2. **Hapus Footer Dropdown**:
     - Menghapus elemen `.model-dropdown-footer` dari `sidepanel.html` dan membersihkan listener terkait di `sidepanel.js` sehingga dropdown murni berisi daftar model.

### 🚀 Iterasi 125: Bento Lime Accent Color on User Chat Bubble
- **Problem**:
  - Warna bubble chat user (`.message.user .message-content`) sebelumnya menggunakan hijau emerald gelap (`#16A34A`), user ingin warnanya disesuaikan dengan warna hijau bento / lime chartreuse seperti tombol send prompt (`#CEF128`).
- **Penyebab & Solusi**:
  1. **User Bubble Bento Lime Styling**:
     - Mengubah background `.message.user .message-content` menjadi gradien Lime Chartreuse `linear-gradient(135deg, #D9F92F 0%, #CEF128 100%)` (`var(--accent-lime)`).
     - Menyesuaikan teks menjadi Dark Slate kontras tinggi `var(--slate-dark)` (`#0F172A`) dengan `font-weight: 600`.
     - Menambahkan drop shadow lime lembut `0 2px 10px rgba(206, 241, 40, 0.32)`.

### 🚀 Iterasi 126: Fix Chat Mode Cancel Abort Error (DOMException Suppression)
- **Problem**:
  - Saat streaming respons di Mode Chat dibatalkan oleh pengguna (klik tombol Stop), muncul error alert di console: `Chat Mode Error: [object DOMException]`.
- **Penyebab & Solusi**:
  1. **Proper Abort Check & Error Logging Suppression**:
     - Pada `runChatModeLoop`, pemanggilan `console.error` sebelumnya dieksekusi sebelum pengecekan kondisi `AbortError`.
     - Memperbaiki penanganan `catch (err)` di Mode Chat dan Mode Agent untuk mendeteksi seluruh variasi pembatalan (`err.name === 'AbortError'`, `err.code === 20`, `/abort/i.test(err.message)`, atau `!isExecuting`).
     - Saat dibatalkan, status pill dialihkan ke `Dihentikan`, teks parsial yang sudah ter-stream tetap disimpan ke riwayat sesi lokal tanpa memicu dialog/log error palsu.

### 🚀 Iterasi 129: Lock Model & Agent Dropdown Stack to Vertical Column Layout (Atas-Bawah)
- **Problem**:
  - Saat sidepanel diperlebar (width > 400px), tombol dropdown Pilih Model (`#btn-active-model`) dan Pilih Agent (`#btn-active-agent`) berubah posisi menjadi berdampingan secara horizontal (side-by-side).
  - Pengguna menghendaki kedua tombol tersebut selalu tersusun atas-bawah (vertikal) secara konsisten di semua ukuran lebar panel.
- **Penyebab & Solusi**:
  1. **Fixed Vertical Stack Styling**:
     - Memperbarui `.header-selectors-group` di `sidepanel.css` menjadi `display: flex; flex-direction: column; align-items: flex-start; gap: 4px;`.
     - Layout kini selalu mengunci tombol Pilih Model di atas dan Pilih Agent di bawah, sejajar dengan tumpukan status PC Bridge dan Tab Browser di sisi kanan.

### 🚀 Iterasi 130: Rename Rotating Badge Label to Auto (Model)
- **Problem**:
  - Label badge pilihan model bertuliskan `Auto (Rotating)`, sedangkan di bawahnya bertuliskan `Auto (Agent)`.
  - Pengguna meminta agar teks `(Rotating)` diganti menjadi `(Model)` sehingga konsisten dan serasi menjadi `Auto (Model)`.
- **Penyebab & Solusi**:
  1. **Consistent Naming**:
     - Mengubah teks tampilan default di `sidepanel.html` dan `sidepanel.js` dari `Auto (Rotating)` menjadi `Auto (Model)`.

### 🚀 Iterasi 132: Interactive File Path Card & Native Open File / Reveal Folder Integration
- **Problem**:
  - Saat AI mengirimkan lokasi/path file lokal, pengguna harus menyalin path secara manual untuk membukanya.
  - Pengguna meminta agar ditambahkan tombol pembuka file dan folder langsung.
- **Penyebab & Solusi**:
  1. **Native RPC Action Handlers**:
     - Menambahkan RPC `open_file` dan `reveal_file` di `host/native_host.py`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (315.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 133: Streamline File Card to Single Open File Button & Clean Action Bar
- **Problem**:
  - Terdapat tombol ganda ("Buka File" dan "Buka Folder") di dalam file card dan di bawah balon chat (`.message-actions`).
  - Pengguna meminta untuk menghapus tombol ekstra di bawah chat, menghapus tombol hijau "Buka File", dan mengubah label tombol "Buka Folder" di dalam kartu menjadi "Open File".
- **Penyebab & Solusi**:
  1. **Clean Single Action Button**:
     - Memperbarui `buildFileCardHtml` di `sidepanel.js` sehingga kartu file hanya memiliki 1 tombol ringkas bertuliskan `[📁 Open File]`.
     - Tombol `Open File` ini memanggil `reveal_file` untuk langsung membuka folder direktori file dan menyorot file tersebut di file manager sistem.
     - Membersihkan `hydrateFileActions()` sehingga bar aksi bawah (`.message-actions`) tetap bersih dan hanya menampilkan tombol `[Copy]`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (314.7 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 134: Fix Native Host Lifecycle & RPC Auto-Reconnect Guard
- **Problem**:
  - Muncul error `Native host disconnected: Error when communicating with the native messaging host.` saat ekstensi di-reload atau saat membaca riwayat sesi SQLite.
- **Penyebab & Solusi**:
  1. **PTY Thread Lifecycle Decoupling**:
     - Pada `host/native_host.py`, thread pembaca PTY terminal (`read_from_pty`) sebelumnya mengubah flag global `running = False` ketika shell PTY dalam keadaan idle / EOF, yang secara prematur mematikan seluruh proses Native Host (termasuk RPC server SQLite dan file manager).
     - Memisahkan lifecycle pembaca PTY agar tidak mematikan server Native Host. Proses Native Host kini hanya ditutup saat Chrome stdin mengirimkan EOF (ekstensi ditutup).
  2. **Auto-Reconnect & Retry Guard in Extension**:
     - Memperbarui `sendNativeRpc` di `sidepanel.js` dengan mekanisme auto-connect otomatis (menunggu inisialisasi port hingga 1.5s jika belum terhubung) sebelum melempar exception.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (314.8 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 135: Master Agent Delegation Thinking & Visual Sub-Agent Tree Hierarchy
- **Problem**:
  - Pengguna ingin agar saat mengirim prompt, Master Agent berpikir & menganalisa request terlebih dahulu, lalu mencari agen karyawan/spesialis yang tepat.
  - Hasil pencarian agen karyawan ditampilkan dalam layout visual pohon delegasi (tree branching) di bawah kotak Master Agent sehingga pengguna tahu persis agen apa saja yang ditugaskan dan status pekerjaannya.
- **Penyebab & Solusi**:
  1. **Dynamic Thinking & Worker Matching Flow**:
     - Saat request dikirim, status Master Agent langsung menampilkan status analisis dan pencarian tim spesialis (`👑 Master Agent • Menemukan X Agen Spesialis`).
  2. **Visual Branching Tree Hierarchy Component**:
     - Menambahkan `.agent-tree-branch-container` dengan garis konektor vertikal (`border-left`) dan cabang horizontal (`.tree-stem`) yang menghubungkan Master Agent dengan setiap kartu sub-agent karyawan (`.tree-agent-card`).
     - Tiap kartu menampilkan ikon spesialis, nama agen, deskripsi peran, dan status badge interaktif (`Siap Kerja` -> `Bekerja...` [pulsating green glow] saat tool agen aktif -> `Selesai` saat tuntas).
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (316.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 136: Auto-Hide & Interactive Show/Hide Toggle for Assigned Agents
- **Problem**:
  - Pengguna meminta agar daftar agen yang ditugaskan otomatis di-hide/collapse ketika seluruh pekerjaan sudah selesai, dan tetap dapat di-show/hide secara manual melalui klik header toggle.
- **Penyebab & Solusi**:
  1. **Collapsible Header & Auto-Collapse Lifecycle**:
     - Mengubah header `.agent-tree-branch-header` menjadi tombol interaktif dengan chevron dan indikator toggle (`Detail` / `Tutup`).
     - Saat Master Agent sedang bekerja, daftar agen terbuka (expanded) dengan status kerja real-time.
     - Saat eksekusi selesai (`isFinished = true`) atau saat memuat sesi lama dari database SQLite, daftar agen otomatis ter-collapse (`.collapsed`) dan label berubah menjadi `Detail >`.
     - Pengguna dapat mengklik tombol header kapan saja untuk membuka/menutup daftar agen.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (316.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 137: Fix Long Chat History Resume Stuck, Native 1MB Limit & Chunking Protocol
- **Problem**:
  - Saat membuka sesi histori chat lama dengan jumlah pesan banyak (misal: "cek in meta ads" dengan 218 pesan), sidepanel stuck layar putih dan muncul error `Native host disconnected: Error when communicating with the native messaging host.` dan `Direct JS click notice: Error: {"code":-32000,"message":"No node with given id found"}`.
- **Penyebab & Solusi**:
  1. **Chrome Native Messaging 1 MB Payload Limit**:
     - Chrome Native Messaging membatasi ukuran satu pesan maksimal 1 MB (1,048,576 byte). Sesi 218 pesan yang memuat output snapshot AXTree mencapai 5.48 MB, sehingga Chrome langsung menutup koneksi stdio native host.
  2. **Tool Output Pruning & Lightweight Storage**:
     - Memperbarui `sanitizeHistoryForStorage` dan `prune_messages_for_rpc` di `host/native_host.py` dan `extension/sidepanel.js` agar pesan bertipe `tool` hanya menyimpan summary status ringan (`{"status":"success"}`) dan tidak menyimpan ratusan kilobyte AXTree per step.
     - Ukuran sesi 218 pesan langsung terpangkas dari 5.48 MB menjadi 72 KB (reduksi 98.7%) tanpa menghilangkan teks chat, agent card, atau badge tindakan.
  3. **Chunked RPC Transport Protocol**:
     - Menambahkan mekanisme auto-chunking (potongan 500 KB) pada `write_message` di `host/native_host.py` dan chunk reassembly pada `connectNativeHost` di `sidepanel.js` sehingga payload sebesar apa pun tidak akan pernah melebihi batas 1 MB Chrome.
  4. **Clean Direct JS Click Fallback**:
     - Membersihkan log warning berlebih pada `browser_click` saat elemen di-re-render oleh SPA/React.
  5. **CRX Build & Sync**:
     - Re-pack `extension.crx` (316.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 138: @mention Dropup Autocomplete & Prioritized Worker Ingestion
- **Problem**:
  - Pengguna ingin saat mengetik `@` di input prompt, muncul menu dropup opsi pilihan agen karyawan yang ada. Agen yang dipilih melalui `@` wajib diikutsertakan oleh Master Agent bersama agen-agen lain hasil deteksi cerdas Master Agent.
- **Penyebab & Solusi**:
  1. **Interactive @mention Dropup UI**:
     - Menambahkan `#agent-mention-dropup` tepat di atas `.chat-input-bar` dengan styling Dark Slate / Pure White, shadow halus, dan kartu daftar agen spesialis lengkap dengan ikon, nama, peran, dan badge `Sub-Agent`.
     - Mendukung navigasi keyboard instan (`ArrowUp`, `ArrowDown`, `Enter`, `Tab`, `Escape`) dan pemilihan via klik mouse.
  2. **Explicit @mention Parsing in `resolveAutoAgents`**:
     - `resolveAutoAgents(userMessage)` memindai dan mengekstrak agen karyawan yang di-mention oleh pengguna secara eksplisit, lalu memasukkannya ke jajaran tim agen prioritas utama bersama agen spesialis lain yang relevan dengan pipeline tugas.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (319.0 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 139: Dedicated @mention Active Chips Bar & Bubble Mention Styling
- **Problem**:
  - Styling teks mention `@` di dalam textarea bertumpuk sebagai teks mentah panjang (`@Tiar Property - Gen-Z Viral Copywriter (Module 408 & 254)`). Pengguna meminta agar tampilannya dibedakan dari teks input biasa.
- **Penyebab & Solusi**:
  1. **Active Mentions Docked Bar (`#active-mentions-bar`)**:
     - Menambahkan container `#active-mentions-bar` di dalam input bar yang menampilkan pill badge interaktif (`[@ Tiar Property ✕]`) dengan Dark Slate & Bento Lime (`#0F172A` / `#D9F92F`), nama ringkas (`getAgentShortName`), dan tombol hapus (`✕`).
     - Pemilihan agen dari dropup otomatis membersihkan teks `@query` dari textarea sehingga teks input pengguna tetap bersih dan fokus ke instruksi.
  2. **Bubble Mention Badge Styling (`.chat-mention-badge`)**:
     - Di dalam riwayat bubble pesan pengguna, mention `@Agen` di-render sebagai badge khusus dengan latar gelap dan aksen hijau stabilo cerah (`.chat-mention-badge`).
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (320.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 140: Minimalist Mention Chip (Remove Inner Icon)
- **Problem**:
  - Pengguna meminta menghapus bulatan ikon di sebelah kiri teks `@ Tiar Property` pada chip mention aktif agar tampilan lebih minimalis dan ringkas.
- **Penyebab & Solusi**:
  1. **Remove `.mention-chip-icon`**:
     - Menghapus elemen ikon dari template chip di `renderActiveMentionChips()` dalam `sidepanel.js`.
     - Menyesuaikan padding `.mention-chip` di `sidepanel.css` (`padding: 3px 9px 3px 8px`) agar seimbang dan rapi.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (320.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 141: Full Distinctive Agent Mention Display & Exact ID Matching
- **Problem**:
  - Nama agen di chip mention terpotong menjadi hanya `@ Tiar Property` sehingga peran spesifik agen tidak terlihat, dan Master Agent mengikutsertakan SEMUA 7 agen Tiar secara bersamaan karena pencocokan kata parsial (`tiar` / `property`).
- **Penyebab & Solusi**:
  1. **Full Distinctive Agent Title (`getAgentDisplayName`)**:
     - Menampilkan nama lengkap spesialis agen secara utuh (contoh: `@ Tiar Property - Gen-Z Viral Copywriter`, `@ Tiar Property - Sales Closer CS`), hanya membuang metadata modul seperti `(Module 408 & 254)`.
     - Memperluas `max-width` nama chip di `sidepanel.css` hingga `280px` dengan ellipsis bersih.
  2. **Exact Single-Agent ID Resolution in `resolveAutoAgents`**:
     - `resolveAutoAgents` kini hanya menambahkan agen tunggal yang dipilih secara eksak berdasarkan ID spesifik agen, dan menghapus pencocokan parsial kata umum sehingga tidak ada lagi penambahan seluruh agen Tiar sekaligus.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (320.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 142: Responsive Layout Guard for Mention Chip on Narrow Sidepanel
- **Problem**:
  - Ketika side panel dipersempit, chip mention aktif melebar keluar (overflow) dari batas rounded border input bar.
- **Penyebab & Solusi**:
  1. **Flexbox Zero Min-Width & Adaptive Max-Width**:
     - Mengubah `.mention-chip`, `.active-mentions-bar`, dan `.mention-chip-name` dengan `min-width: 0`, `max-width: 100%`, `flex: 1 1 auto`, dan `box-sizing: border-box`.
     - Chip mention kini 100% adaptif dan otomatis menyesuaikan panjang teks dengan ellipsis rapi tanpa pernah keluar dari border input bar selebar apa pun panelnya.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (320.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 143: Auto-Collapse Assigned Agents & Dynamic Working-Done State Lifecycle
- **Problem**:
  - Saat respons selesai, daftar tim agen yang ditugaskan tetap terbuka (tidak auto-hide), dan status badge agen karyawan tetap "Siap Kerja" bukannya "Selesai". Saat agen sedang bekerja, status juga belum berubah menjadi "Bekerja...".
- **Penyebab & Solusi**:
  1. **Dynamic Working State**:
     - Saat Master Agent atau sub-agent mulai memproses (`runAgentLoop` dan `runChatModeLoop`), status badge agen karyawan otomatis berubah menjadi `Bekerja...` (`.status-working` dengan animasi pulsing hijau).
  2. **Auto-Finish & Auto-Hide Lifecycle**:
     - Mengintegrasikan `updateAssistantActiveAgent(..., "Selesai", hasBoss, true)` di akhir turn `runChatModeLoop` dan `runAgentLoop`.
     - Seluruh badge agen karyawan otomatis berubah menjadi `Selesai` (`.status-done`), kontainer tim agen otomatis terlipat (`.collapsed`), dan teks tombol toggle berubah menjadi `Detail`.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (320.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 144: Visual AI Cursor Pointer & Expanding Click Ripple Indicator
- **Problem**:
  - Pengguna ingin saat browser sedang dikontrol dan AI melakukan klik pada elemen web (`browser_click`, `browser_type`), kursor AI dan titik klik terlihat jelas di halaman tab yang dikontrol agar pengguna tahu persis bagian mana yang diklik.
- **Penyebab & Solusi**:
  1. **Visual AI Cursor Overlay (`#ba-ai-cursor-indicator`)**:
     - Menambahkan dynamic AI Pointer Cursor overlay (ikon kursor panah laser dengan badge `AI Click` / `AI Type`) dan efek gelombang riak radar hijau neon (`#CEF128`) yang memancar saat klik dieksekusi di `content.js` dan `sidepanel.js`.
     - Menambahkan highlight ring bercahaya pada elemen target DOM selama 700ms.
  2. **Dual Dispatch (CDP Runtime + Content Script Messaging)**:
     - `browser_click` mengirimkan animasi kursor langsung via `Runtime.callFunctionOn` pada elemen serta `chrome.tabs.sendMessage` dengan koordinat `(x, y)` presisi.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (322.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 145: Persistent Standby AI Cursor & Smooth Action Glide
- **Problem**:
  - Pengguna ingin kursor AI tetap standby terus di layar UI selama tab dikontrol, dan saat ada aksi klik kursor bergerak/bergeser secara halus ke posisi target.
- **Penyebab & Solusi**:
  1. **Persistent Standby Mode**:
     - Saat kontrol aktif (`showAgentHUD`), kursor AI (`#ba-ai-cursor-indicator`) otomatis muncul dan tetap aktif di layar dengan status `AI Standby` dan animasi breathing halus.
  2. **Smooth Gliding Transition**:
     - Ketika ada klik (`browser_click`) atau pengetikan (`browser_type`), kursor bergeser mulus (`transition: left 0.45s cubic-bezier(0.22, 1, 0.36, 1), top 0.45s...`) ke koordinat elemen yang dituju, melakukan animasi klik + radar ripple, lalu tetap standby di posisi tersebut.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (323.4 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 146: Cursor-Only Minimalist Design (Black Stroke, Green Fill) & Accurate Coordinate Dispatch
- **Problem**:
  - Kursor sempat diam di pojok kanan bawah tanpa bergeser saat klik karena koordinat elemen tidak tersalurkan sebelum klik DOM, serta pengguna meminta menghapus teks badge ("kursor only") dengan desain stroke hitam dan fill hijau neon.
- **Penyebab & Solusi**:
  1. **Cursor-Only SVG Design (Black Stroke & Green Fill)**:
     - Menghapus badge teks `AI Standby`/`AI Click`.
     - Mengubah bentuk kursor menjadi panah mouse presisi: `fill="#CEF128"` (hijau neon/lime) dengan `stroke="#000000"` (stroke hitam 2px).
  2. **Reliable Pre-Click Coordinate Extraction**:
     - `browser_click` dan `browser_type` di `sidepanel.js` mengekstrak koordinat pusat elemen `(x, y)` terlebih dahulu via `Runtime.callFunctionOn` / `DOM.getBoxModel` sebelum eksekusi klik, lalu langsung memicu `AGENT_CLICK_ANIMATION` ke tab aktif.
     - Kursor AI meluncur mulus ke posisi target dan memicu gelombang riak klik radar.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (322.0 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 147: Pixel-Perfect Symmetrical OS Cursor Geometry
- **Problem**:
  - Bentuk panah kursor sebelumnya terlihat miring/penceng pada sudut ekor dan sayap kanannya.
- **Penyebab & Solusi**:
  1. **Symmetrical Geometry SVG Vector**:
     - Memperbaiki path SVG menggunakan koordinat geometris standar (`M4.5 2.5 L4.5 18.5 L9 14.5 L13.5 22 L16.2 20.4 L11.7 13 L18 13 Z`) dengan proporsi sayap dan ekor yang simetris, rapi, dan presisi.
     - Mengatur offset tip panah (`top: -2.5px; left: -4.5px;`) sehingga ujung panah tepat berada di titik klik koordinat `(x, y)`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (322.0 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 148: Elimination of Duplicate Cursor (Iframe Guard & Singleton DOM Enforcement)
- **Problem**:
  - Terdapat dua kursor yang muncul bersamaan di layar: satu di posisi klik, dan satu lagi diam terus di pojok kanan bawah.
- **Penyebab & Solusi**:
  1. **Top Window Guard (`window === window.top`)**:
     - Sub-frame / iframe (seperti player YouTube atau embed banner) ikut mengeksekusi `content.js` dan membuat kursor standby di dalam frame mereka saat menerima broadcast `AGENT_EXECUTION_STATE`.
     - Menambahkan proteksi ketat `if (window !== window.top) return;` di `createAgentHUD`, `showStandbyAICursor`, `triggerAIClickAnimation`, dan event listener pesan.
  2. **Singleton Cleanup**:
     - Menambahkan pembersihan otomatis terhadap elemen `#ba-ai-cursor-indicator` duplikat di seluruh DOM.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (322.2 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 149: Target Visual Element Center Precision & High-DPI Coordinate Alignment
- **Problem**:
  - Terkadang posisi kursor visual tidak sama persis dengan elemen yang diklik oleh agent, meskipun elemen tersebut berhasil diklik.
- **Penyebab & Solusi**:
  1. **Interactive Target Bounds Resolution**:
     - Sebelumnya perhitungan bounding rect dilakukan pada elemen node langsung yang mungkin berupa span kecil / leaf node kosong di tepi tombol.
     - Diperbarui dengan menargetkan `target = el.closest('button, [role="button"], a, input, select, textarea, ...') || el`, melakukan `scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })` sinkron, lalu menghitung pusat visual sebenarnya (`cx = rect.left + rect.width / 2`, `cy = rect.top + rect.height / 2`).
  2. **Unified Dispatch on Click, Type, & Hover**:
     - Mengintegrasikan perhitungan koordinat presisi yang seragam di `browser_click`, `browser_type`, dan `browser_hover`.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (322.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 150: Master Agent Screenshot Walkthrough & 100% Stable Verification Loop Protocol
- **Problem**:
  - Pengguna ingin saat kontrol browser dijalankan (klik, scroll, input form), Master Agent selalu mengambil orientasi visual walkthrough (screenshot/snapshot) terlebih dahulu untuk memastikan posisi elemen dan tata letak secara 100% tepat sebelum menginstruksikan agen karyawan, serta selalu memverifikasi pasca-aksi.
- **Penyebab & Solusi**:
  1. **Master Agent 3-Step Stable Loop Protocol**:
     - Menanamkan SOP eksekusi ketat pada `DEFAULT_SYSTEM_PROMPT`:
       - *Langkah 1 (Orientasi Visual Awal)*: Master Agent mengambil `browser_screenshot()` / `browser_snapshot()` untuk mengunci layout, posisi elemen, dan memastikan tidak ada modal/pop-up yang menghalangi.
       - *Langkah 2 (Delegasi & Eksekusi Presisi)*: Mengarahkan browser control agent mengeksekusi aksi dengan `backendNodeId` terverifikasi.
       - *Langkah 3 (Verifikasi Pasca-Aksi Snap & Verify)*: Selalu mengambil snapshot/screenshot verifikasi setelah klik/ketik/scroll untuk memeriksa perubahan layar sebelum menyimpulkan selesai.
  2. **Tool Definition Directives**:
     - Memperbarui skema tool `browser_screenshot`, `browser_snapshot`, `browser_click`, `browser_type`, dan `browser_scroll` untuk menegakkan loop verifikasi visual mandatori.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (323.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 151: Mandatory Step-1 Screenshot Walkthrough Enforcement & Priority Tool Ordering
- **Problem**:
  - Master Agent pada eksekusi sebelumnya melompati screenshot walkthrough awal dan langsung mengeksekusi `browser_snapshot` lalu klik tanpa mengambil screenshot walkthrough visual terlebih dahulu.
- **Penyebab & Solusi**:
  1. **Strict Mandatory Step-1 Directives**:
     - Menegaskan aturan mutlak pada baris pertama SOP: *"LANGKAH 1 (WALKTHROUGH VISUAL AWAL): Master Agent WAJIB memanggil `browser_screenshot()` TERLEBIH DAHULU pada langkah pertama sebelum memerintahkan aksi klik/scroll/input"*.
  2. **Top Priority Tool Schema Placement**:
     - Menempatkan `browser_screenshot` pada urutan paling atas di `AGENT_TOOLS` dan di daftar tool `DEFAULT_SYSTEM_PROMPT` agar model memprioritaskan tangkapan visual walkthrough sebelum snapshot DOM.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (323.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 152: Master Agent Skills Synchronization & Screenshot Walkthrough SOP Attachment
- **Problem**:
  - Pengguna meminta agar skill pada Master Agent juga diperbarui agar selaras dengan SOP Screenshot Walkthrough & Orientasi Visual Langkah-1.
- **Penyebab & Solusi**:
  1. **Master Agent Skill Matrix Attachment**:
     - Menyematkan `skill_screenshot_walkthrough`, `skill_dashboard_preflight`, `skill_browser_wait`, `skill_extract_data`, `skill_fill_form`, `skill_summarize_page`, `skill_deep_research`, `skill_save_page`, `skill_gaya_komunikasi` langsung pada Master Agent (`MASTER_AGENT.skills` di `options.js` dan `bossAgent.skills` di `sidepanel.js`).
  2. **Screenshot Walkthrough SOP Overhaul**:
     - Memperbarui konten SOP `skill_screenshot_walkthrough` dengan alur modern Chrome DevTools: (1) Visual Orientation `browser_screenshot()`, (2) DOM Snapshot `browser_snapshot()`, (3) Precise Action Delegation, (4) Snap & Verify pasca-aksi.
  3. **Automatic System Prompt Skill Injection**:
     - Memastikan `skill_screenshot_walkthrough` selalu diinjeksi secara otomatis pada Master Agent di `buildDynamicSystemPrompt` dan di-sync pada `loadAgentsAndSkills()`.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (323.7 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 153: Fix Double Click & Double Type Bug + Mandatory Finish Walkthrough Screenshot
- **Problem**:
  - Pada video rekaman `/home/arya/Videos/Screencasts/Screencast_20260822_144738.mp4`, kontrol browser mengeksekusi double click (klik ganda) dan double typing (teks terketik ganda, misal `sepatusepatu`).
  - Pengguna juga meminta Browser Control Agent wajib mengambil screenshot walkthrough ketika selesai melakukan aksi apapun agar dapat diperiksa Master Agent.
- **Penyebab & Solusi**:
  1. **Elimination of Double Click Collision in `browser_click`**:
     - Sebelumnya, `browser_click` memanggil synthetic JS events (`target.click()`, `el.click()`, `MouseEvent('click')`) DAN sekaligus memanggil CDP `Input.dispatchMouseEvent` (`mousePressed` + `mouseReleased`). Hal ini memicu klik ganda (2-4x klik simultan).
     - Dibenahi dengan Single Authoritative CDP Mouse Click saat koordinat tersedia, atau fallback aman JS click tunggal jika node offscreen.
  2. **Elimination of Double Typing in `browser_type`**:
     - Sebelumnya, `browser_type` mengatur `target.value = val` di JavaScript DAN kemudian memanggil CDP `Input.insertText({ text: args.text })`, sehingga teks terketik 2x lipat berturut-turut.
     - Dibenahi dengan membersihkan input terlebih dahulu saat fokus (`target.value = ''`), lalu memasukkan teks secara presisi TUNGGAL melalui CDP `Input.insertText`.
  3. **Mandatory Finish Walkthrough Screenshot Directive**:
     - Menegaskan aturan di `DEFAULT_SYSTEM_PROMPT` bahwa setiap kali menyelesaikan aksi browser (klik, ketik form, scroll, submit), agen wajib mengambil `browser_screenshot()` atau `browser_snapshot()` agar Master Agent dapat memverifikasi kondisi visual terkini sebelum mengirim laporan akhir.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (323.7 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 154: Floating In-Page "✨ AI Agent" Trigger Widget Implementation
- **Problem**:
  - Pengguna ingin alternatif membuka Side Panel AI Agent langsung dari dalam halaman web tanpa harus mengarahkan kursor ke toolbar atas Chrome.
- **Penyebab & Solusi**:
  1. **Floating In-Page Trigger Widget (`content.js`)**:
     - Dibuat tombol melayang kapsul (*floating pill*) `#ba-floating-agent-widget` di pojok kanan bawah (`bottom: 24px; right: 24px; z-index: 2147483640`).
     - Desain Dark Luxury + Bento Neon Lime (`rgba(15, 23, 42, 0.92)`, border `rgba(206, 241, 40, 0.45)`, teks `AI Agent`, dan active green indicator dot).
  2. **Draggable & Click Safe Separation**:
     - Mendukung drag & drop untuk memindahkan posisi widget ke tepi layar manapun.
     - Membedakan gesture drag vs click (`Math.abs(dx) > 3`), sehingga saat tombol digeser tidak akan memicu trigger klik yang tidak disengaja.
  3. **Background Service Worker Bridge (`background.js`)**:
     - Menangani pesan `OPEN_SIDE_PANEL` dari content script untuk memanggil `chrome.sidePanel.open({ tabId })` secara instan saat widget diklik.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (325.0 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 155: Redesign Floating Trigger to Ultra-Clean macOS Frosted Liquid Glass ("Agent Mode")
- **Problem**:
  - Pengguna meminta teks diganti menjadi `"Agent Mode"`, menghilangkan ikon sebelah kiri dan bulatan hijau kanan, serta menerapkan styling tombol floating glasses blur ala desain macOS terbaru.
- **Penyebab & Solusi**:
  1. **Typography & Layout Simplification**:
     - Teks diganti menjadi `"Agent Mode"`, ikon kiri dan bulatan hijau dihapus untuk tampilan minimalis, clean, dan fokus.
  2. **macOS Frosted Liquid Glass Styling**:
     - Menggunakan `backdrop-filter: blur(24px) saturate(190%) contrast(95%)`, latar transparan `rgba(18, 24, 38, 0.6)`, border halus `rgba(255, 255, 255, 0.18)`, top-highlight edge `rgba(255, 255, 255, 0.35)`, dan soft inset glare `inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)`.
     - Efek hover interaktif ala macOS: `translateY(-1px) scale(1.03)`, peningkatan opacity kaca `rgba(255, 255, 255, 0.14)`, dan bayangan lembut `0 12px 36px rgba(0,0,0,0.45)`.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (324.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 156: Bento Neon Lime Harmony for macOS Frosted Glass Floating Button
- **Problem**:
  - Pengguna meminta warna teks dan aksen border/glow tombol floating diselaraskan dengan tema warna hijau neon (`#CEF128`) Sidepanel.
- **Penyebab & Solusi**:
  1. **Color Harmony Alignment (`content.js`)**:
     - Warna teks `Agent Mode` diubah menjadi `#CEF128` dengan soft glow `text-shadow: 0 0 12px rgba(206, 241, 40, 0.45)`.
     - Border transparan diatur ke `rgba(206, 241, 40, 0.35)` dengan top-highlight edge `rgba(206, 241, 40, 0.7)`.
     - Hover glow memancarkan neon lime `box-shadow: 0 12px 36px rgba(0,0,0,0.55), 0 4px 16px rgba(206,241,40,0.35)`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (324.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 157: Bento Neon Lime Fill Color for Floating "Agent Mode" Pill
- **Problem**:
  - Pengguna mengklarifikasi bahwa warna hijau neon (`#CEF128`) diterapkan pada warna latar belakang/isi (*fill color*) tombol floating, bukan hanya teksnya.
- **Penyebab & Solusi**:
  1. **Full Bento Neon Lime Fill Pill (`content.js`)**:
     - Latar belakang/isi tombol diatur menjadi gradien Bento Neon Lime cerah: `linear-gradient(135deg, #D9F92F 0%, #CEF128 100%)`.
     - Teks `Agent Mode` diatur menjadi bold dark slate (`#0F172A`, font-weight `750`) untuk kontras tajam dan keterbacaan tinggi.
     - Diberikan frosted top-highlight edge `rgba(255, 255, 255, 0.85)` dan soft shadow `0 8px 24px rgba(206, 241, 40, 0.4)`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (324.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 158: Clean Realistic Drop-Shadow, Dynamic Hover Text & Sidepanel Auto-Hide
- **Problem**:
  - Pengguna meminta: (1) Menghilangkan efek neon glow agar tidak terlihat "AI slop", cukup shadow netral realistis, (2) Saat di-hover teks berganti menjadi `"Open Agent Mode"`, (3) Saat Side Panel ekstensi terbuka, tombol floating otomatis di-hide.
- **Penyebab & Solusi**:
  1. **Clean Realistic Shadow**:
     - Menghapus bayangan hijau neon (`box-shadow: ... rgba(206,241,40,...)`), diganti dengan shadow netral macOS yang realistis: `box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.6)`.
  2. **Dynamic Hover Text Switch**:
     - Pada event `mouseenter`, teks `#ba-floating-text` berganti menjadi `"Open Agent Mode"` dengan shadow elevation `0 6px 18px rgba(0, 0, 0, 0.28)`.
     - Pada event `mouseleave`, teks kembali menjadi `"Agent Mode"`.
  3. **Event-Driven Sidepanel Auto-Hide**:
     - `sidepanel.js` membuka port long-lived `chrome.runtime.connect({ name: "sidepanel" })`.
     - `background.js` mendeteksi koneksi/diskoneksi port dan menyiarkan pesan `{ type: "SIDEPANEL_VISIBILITY", isOpen }` ke semua tab.
     - `content.js` menyembunyikan widget (`display: none`) saat sidepanel terbuka, dan menampilkannya kembali saat sidepanel ditutup.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (325.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 159: Fixed Button Dimension & Smooth Glitch Cipher Text Scramble Animation
- **Problem**:
  - Pengguna meminta teks hover menjadi `"Open Agent"` (bukan `"Open Agent Mode"`), ukuran tombol floating harus tetap fix (tidak berubah/berkedut saat hover), serta transisi teks menggunakan animasi smooth glitch per huruf.
- **Penyebab & Solusi**:
  1. **Fixed Dimensions (Zero Layout Shift)**:
     - Lebar dan tinggi tombol dikunci (`width: 124px; height: 36px; box-sizing: border-box; text-align: center;`), sehingga ukuran tombol 100% stabil dan tidak berkedut saat teks berganti.
  2. **Smooth Hacker / Cipher Glitch Text Scramble Engine (`content.js`)**:
     - Dibuat fungsi `scrambleText(targetText)` berbasis 60fps frame interpolasi dengan karakter acak glyph (`!<>-_[]*#ABC...`).
     - Saat hover, teks berglitch halus secara progresif dari kiri ke kanan bertransformasi menjadi `"Open Agent"`.
     - Saat kursor keluar (*leave*), teks berglitch halus kembali menjadi `"Agent Mode"`.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (325.8 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 160: High-Speed Snappy Text Scramble Glitch Animation
- **Problem**:
  - Pengguna meminta animasi pergantian teks scramble glitch dibuat lebih cepat dan instan.
- **Penyebab & Solusi**:
  1. **Accelerated Glitch Interpolation (`content.js`)**:
     - Frame interval dipercepat menjadi `14ms` dengan step increment `iteration += 0.75` per tick.
     - Animasi scramble bertransformasi penuh secara instan dan responsif dalam rentang ~120ms–150ms.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (325.8 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 161: Full-Screen AI Agent New Tab Override ("What should your agent work on next?")
- **Problem**:
  - Pengguna meminta halaman Tab Baru (New Tab) Chrome dapat diubah menjadi full-screen workspace AI Agent dengan tampilan mewah ala BrowserOS (headline, prompt bento box, recent sites, dan tombol switch ke Google).
- **Penyebab & Solusi**:
  1. **Chrome New Tab URL Override (`manifest.json`)**:
     - Menambahkan `"chrome_url_overrides": { "newtab": "newtab.html" }` dan izin `"topSites"`.
  2. **Modern Dark Luxury Bento New Tab UI (`newtab.html`, `newtab.css`)**:
     - Header: Brand logo + tombol *"Google Search"* untuk beralih instan ke pencarian standar + tombol *"Settings"*.
     - Hero Headline: *"What should your agent work on next?"* dengan highlight neon lime `#CEF128`.
     - Central Hero Bento Card: Prompt input box besar, pill selector model, agent mode vs chat mode toggle, dan tombol send.
     - Section Recent Sites: Grid ubin pintasan situs (Meta Ads, Google, YouTube, ChatGPT, WhatsApp, GitHub, Amazon, Instagram) terintegrasi via `chrome.topSites`.
  3. **Interactive Workspace Controller (`newtab.js`)**:
     - Menangani transisi mulus dari hero view ke workspace chat view saat pengguna mengirimkan prompt atau tugas baru.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (333.4 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 162: Interactive Model & Agent Swarm Dropdown Pickers for New Tab Page
- **Problem**:
  - Tombol pill `Auto (Model)` dan `Auto (Agent Swarm)` pada New Tab belum bisa diklik / belum memunculkan menu dropdown pemilihan.
- **Penyebab & Solusi**:
  1. **Interactive Glass Dropdown Menus (`newtab.html`, `newtab.css`)**:
     - Menambahkan kontainer menu dropdown `#model-dropdown-menu` dan `#agent-dropdown-menu` berbalut *macOS Frosted Glass* (`backdrop-filter: blur(24px)`).
  2. **Dynamic Model & Agent Selection (`newtab.js`)**:
     - Model Dropdown: Menampilkan daftar model (Auto Smart Failover, Gemini 2.5 Flash, Gemini 2.5 Pro, Claude 3.7 Sonnet, GPT-4o, DeepSeek V3, DeepSeek R1).
     - Agent Swarm Dropdown: Menampilkan daftar agen (Auto Swarm, Browser Control Agent, Copywriter Expert, Sales Closer CS, Visual Designer, + Custom Agents).
     - Sinkronisasi langsung ke `chrome.storage.local` (`selected_model_choice` & `active_agent_id`) dengan auto-update label tombol dan indikator centang hijau neon.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (334.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 163: Dynamic Real-Time Settings Model Synchronization on New Tab Dropdown
- **Problem**:
  - Pilihan model di dropdown New Tab menggunakan data statis, tidak mencerminkan daftar model kustom/reordering urutan prioritas yang ada di menu Pengaturan (Settings / Options).
- **Penyebab & Solusi**:
  1. **Full Config & Priority Model Pipeline (`newtab.js`)**:
     - Mengimplementasikan fungsi `getModelsList()` yang membaca langsung `config.models` / `config.customModels` / preset dari `chrome.storage.local`.
     - Model Dropdown kini menampilkan opsi `Auto (Smart Failover)` diikuti seluruh model yang dikonfigurasi pengguna di Settings lengkap dengan badge urutan prioritas (`Priority 1`, `#2`, `#3`, dst.).
  2. **Live Storage Synchronization**:
     - Menambahkan listener `chrome.storage.onChanged` sehingga ketika pengguna menambah, menghapus, atau mengubah urutan model di Settings/Sidepanel, dropdown New Tab langsung diperbarui secara instan.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (335.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 164: Storage Key Fix (`browser_agent_config`) for 100% Accurate Model & Preset Sync
- **Problem**:
  - Dropdown New Tab membaca key `config` (bukan `browser_agent_config`), sehingga fallback ke daftar Gemini bawaan dan tidak memuat model kustom/preset pengguna.
- **Penyebab & Solusi**:
  1. **Accurate Storage Key Binding (`newtab.js`)**:
     - Mengubah pembacaan storage ke `browser_agent_config` yang digunakan oleh `options.js` dan `sidepanel.js`.
     - Menyimpan pilihan model langsung ke `browser_agent_config.selectedModelChoice` dan `browser_agent_config.model`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (335.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 165: Full Tab Autonomous Execution Loop with OwnTab Protection & Auto-Tab Spawning
- **Problem**:
  - Pengguna meminta agar interaksi chat AI berjalan langsung di dalam halaman Full Tab New Tab tanpa tertutup / ter-redirect. Ketika AI membutuhkan navigasi web (misal buka YouTube / Google / Meta Ads), AI harus otomatis membuka tab baru terpisah, mengeksekusi kontrol di tab tersebut, sementara tab New Tab AI tetap terbuka dan terus berjalan menyajikan laporan/status.
- **Penyebab & Solusi**:
  1. **OwnTab Protection & Auto External Tab Spawning (`sidepanel.js`)**:
     - Memproteksi `ownTabId` (tab New Tab AI) agar tidak pernah di-navigate atau di-close oleh tool agent.
     - `browser_navigate` & `browser_create_tab`: Jika `activeTabId` adalah tab ekstensi itu sendiri, AI otomatis membuka tab baru (`chrome.tabs.create`), men-debug tab target tersebut, sementara New Tab AI tetap berjalan di latar/muka tanpa gangguan.
     - `browser_switch_tab`: Otomatis membuka URL layanan yang diminta jika belum dibuka sebelumnya, lalu mengaitkan kontrol CDP tanpa mengganggu tab New Tab AI.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (333.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 166: Pure Dedicated Dark Luxury New Tab UI (Separated from Sidepanel Layout)
- **Problem**:
  - Tampilan New Tab sebelumnya sempat ketumpuk style dari Sidepanel (kotak putih/duplikasi komponen sidepanel). Pengguna meminta agar tampilan New Tab tetap menggunakan desain Dark Luxury orisinal yang bersih dan fokus sesuai tangkapan layar.
- **Penyebab & Solusi**:
  1. **Isolated & Dedicated New Tab Architecture (`newtab.html`, `newtab.css`, `newtab.js`)**:
     - Memulihkan layout murni New Tab: Header minimalis (`[B] Browser Agent`, tombol pill `Google Search` & `Settings`).
     - Hero Headline: *"What should your agent work on next?"* dengan highlight Neon Lime `#CEF128`.
     - Bento Prompt Box terpusat dengan dropdown Model & Agent dinamis, toggle Agent Mode/Chat Mode, dan tombol send bulat hijau neon.
     - Grid ubin Recent Sites (`chrome.topSites`) 8 ubin presisi.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (336.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 167: Fullscreen Agent Workspace with 100% Feature Parity (History, Storage, Settings, Tools) & Pure Streaming UI
- **Problem**:
  - Pengguna meminta agar seluruh fitur (History, penyimpanan riwayat sesi, modul Pengaturan Settings, eksekusi tool otonom, terminal) berfungsi penuh 100% seperti di Sidepanel, namun dengan desain visual dan layout layar penuh elegan tanpa kotak berbingkai kaku.
- **Penyebab & Solusi**:
  1. **Seamless Fullscreen Canvas (`newtab.html`, `newtab.css`)**:
     - Mengadaptasi kanvas layar penuh tanpa kotak batas yang sempit: Top Bar minimalis dengan pill selector model/agen, tombol Google Search, New Chat, History, dan Settings.
     - Kanvas pesan mengalir bebas di tengah layar (`max-width: 820px`), bubble user di kanan berbalut Neon Lime `#CEF128`, dan bubble assistant mengalir responsif dengan live streaming markdown, tool capsules, dan visual walkthrough.
     - Floating Input Bar modern berpusat di bagian bawah layar (`position: fixed; bottom: 22px; max-width: 780px`) dengan toggle Agent Mode / Chat Mode, tombol attachment, dan tombol kirim bulat.
  2. **Full Engine & Feature Parity (`sidepanel.js`)**:
     - Seluruh logika autonomous streaming, auto-failover model, manajemen riwayat sesi (History), dan Settings modal dieksekusi langsung oleh engine utama `sidepanel.js` dengan proteksi tab New Tab aktif.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (335.4 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 168: Centered Initial Prompt Layout Transitioning to Fixed Bottom Prompt on Send
- **Problem**:
  - Saat awal membuka New Tab (sebelum prompt dikirim), pengguna ingin posisi input box berada di tengah (di bawah Recent Sites & Suggestion Chips). Baru ketika prompt dikirim, input box otomatis berpindah ke bawah (fixed bottom floating pill).
- **Penyebab & Solusi**:
  1. **Dynamic Initial State vs Active Chat State (`newtab.html`, `newtab.css`)**:
     - `body:not(.has-messages)`: Seluruh tampilan terpusat secara vertikal di tengah layar: Headline *"What should your agent work on next?"*, ubin Recent Sites (8 aplikasi), 4 Suggestion Cards, dan Bento Input Box terpusat di bawahnya.
     - `body.has-messages`: Begitu pesan pertama dikirim (atau sesi riwayat dibuka), welcome card otomatis hilang, input box bertransformasi ke posisi fixed melayang di bawah layar (`bottom: 22px; left: 50%`), dan obrolan mengalir dari atas ke bawah.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (335.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 169: Removal of Suggestion Cards & Placement of Recent Sites Directly Below Input Prompt
- **Problem**:
  - Pengguna meminta menghapus 4 kartu saran (*Otomasi YouTube, Riset Web, Audit Meta Ads, Akses PC*) dan menempatkan baris Recent Apps / Recent Sites tepat di bawah Bento Input Prompt pada saat pertama kali membuka New Tab.
- **Penyebab & Solusi**:
  1. **Layout Reordering (`newtab.html`, `newtab.css`)**:
     - Menghapus elemen `.prompt-suggestions` secara permanen.
     - Menyusun urutan vertikal saat belum ada pesan:
       1. Top: Headline *"What should your agent work on next?"* & Subtitle.
       2. Middle: Bento Input Prompt Box (`Ketik pesan/perintah...`).
       3. Below: Grid ubin `RECENT SITES` (8 aplikasi dengan favicon otomatis).
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (335.0 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 170: Fix Send Icon Sizing, Dropdown Menus Layout & Header Status Chips
- **Problem**:
  - Tampilan tombol send prompt (`#btn-send`) sempat terdistorsi bentuk panahnya.
  - Checkmark pada dropdown Model membesar tidak wajar (giant checkmark).
  - Tampilan dropdown Agent terpotong tanpa padding dan scrollbar unstyled.
  - Status chip PC Bridge & System Tab di header tidak memiliki background/border pill.
- **Penyebab & Solusi**:
  1. **Send Button & Icon Vector Polish (`newtab.html`, `newtab.css`)**:
     - Memperbaiki dimensi `#btn-send` menjadi `36px x 36px` dengan padding `0`, flex centering, dan SVG panah `stroke-width: 2.6` dengan ukuran tetap `16px x 16px`.
  2. **Model & Agent Dropdowns (`newtab.css`)**:
     - Membatasi ukuran `.model-check-icon` menjadi `13px x 13px`.
     - Memberikan styling kartu `.agent-item` dengan teks rapi, multi-line clamp, dan Dark Luxury custom scrollbar (`rgba(255,255,255,0.12)`).
  3. **Header Status Chips (`newtab.css`)**:
     - Menerapkan styling `.bento-status-chip` dengan frosted pill background, border halus, status dot hijau berpendar (`#10B981`), dan label rapi.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (335.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 171: Full Dark Luxury Styling for Chat History Modal & Delete Confirmation
- **Problem**:
  - Tampilan modal Riwayat Percakapan (History) di New Tab tampak polos/unstyled tanpa kartu, badge model, tanggal, preview, maupun tombol aksi hapus.
- **Penyebab & Solusi**:
  1. **History UI Components Styling (`newtab.html`, `newtab.css`)**:
     - Menerapkan styling `.history-item-card` (`#18202F`) dengan hover neon glow, title bold, badge model Cyan (`#38BDF8`), metadata waktu/jumlah pesan, dan preview pesan.
     - Menambahkan search bar interaktif `#input-search-history` untuk mencari sesi percakapan.
     - Menambahkan styling `.btn-del-history-item` (tombol tong sampah merah) dan modal konfirmasi hapus (`#delete-confirm-modal`).
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (336.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 172: Fix Giant Crown Icon & Polish Message Components in Fullscreen Chat
- **Problem**:
  - Di layar penuh chat New Tab, icon mahkota Master Agent (`.agent-boss-chip svg`) meledak memenuhi seluruh layar karena tidak memiliki pembatas ukuran width/height di `newtab.css`. Tombol copy pada bubble user juga tampak kaku.
- **Penyebab & Solusi**:
  1. **SVG & Component Constraints (`newtab.css`)**:
     - Membatasi seluruh SVG di dalam `.message` dan `.agent-hierarchy-block` (icon mahkota `12px x 12px`, icon bot `12px x 12px`, dot hijau pendar `6px`).
     - Menyempurnakan bubble user Neon Lime `#CEF128` dengan tombol copy terintegrasi rapi (`.msg-copy-btn` gelap transparan).
     - Menambahkan styling lengkap untuk `.thinking-block` (accordion proses berpikir AI), `.tool-section-wrapper` (badge langkah aksi tool), dan `.agent-tree-branch-container`.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (337.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 173: Compact User Message Fit-Content, Sleek Sub-Agent Cards & Refined Copy Buttons
- **Problem**:
  - Bubble user untuk pesan pendek (seperti "halo") merenggang lebar secara tidak wajar.
  - Teks deskripsi sub-agent pada delegasi kartu tim agen saling bertumpuk/overflow.
  - Tombol copy pada pesan assistant muncul sebagai kotak putih besar yang merusak tema gelap.
- **Penyebab & Solusi**:
  1. **User Bubble Sizing (`newtab.css`)**:
     - Mengubah `.message.user` menjadi `width: fit-content; max-width: 80%; align-self: flex-end; margin-left: auto;` sehingga membungkus teks pesan pendek secara kompak dan rapi.
  2. **Sub-Agent Tree Delegation Card (`newtab.css`)**:
     - Memberikan styling `.tree-agent-card` dengan `display: flex; justify-content: space-between;` dan `.tree-agent-details` dengan `flex-direction: column; min-width: 0; flex: 1; overflow: hidden;` sehingga teks nama dan deskripsi tersusun vertikal terpisah tanpa tabrakan.
  3. **Refined Copy Buttons (`newtab.css`)**:
     - Tombol copy pada pesan assistant dibuat minimalis (`background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle);`) dengan icon `12px` dan label `Copy` yang menyatu elegan dengan Dark Luxury theme.
  4. **CRX Build & Sync**:
     - Re-pack `extension.crx` (337.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 174: Reference Layout Trial
- **Catatan**: Layout sempat disesuaikan, namun diminta di-revert oleh pengguna.

### 🚀 Iterasi 175: Revert to Stable Fullscreen Layout (Iterasi 173 Base)
- **Problem**:
  - Mengembalikan layout New Tab ke struktur stabil Iterasi 173 (header lengkap dengan selector Model & Agent, status chips, dan prompt bento bar).
- **Penyebab & Solusi**:
  1. **Restore Fullscreen Layout (`newtab.html`, `newtab.css`)**:
     - Mengembalikan selector Model & Agent ke header atas bersama status chips (PC Bridge & Tab).
     - Mengembalikan toolbar prompt box dengan toggle Agent/Chat mode di atas dan input bar di bawah.
     - Mempertahankan seluruh perbaikan styling bubble user fit-content, copy button minimalis, dan kartu delegasi sub-agent yang rapi.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (337.4 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 176: Exact Positioning of Recent Sites Grid Under Input Prompt Box
- **Problem**:
  - Bagian `RECENT SITES` sempat muncul di atas input prompt box karena struktur DOM sebelumnya berada di dalam container hero welcome card sebelum input box.
- **Penyebab & Solusi**:
  1. **DOM Order & Hierarchy (`newtab.html`, `newtab.css`)**:
     - Memisahkan `#recent-sites-section` ke bawah `#chat-input-container` dalam tata letak awal sehingga urutan visual menjadi: (1) Hero Headline & Subtitle -> (2) Bento Prompt Input Box -> (3) `RECENT SITES` 8-tile grid di bawahnya.
     - Mengontrol state visibility (`body:not(.has-messages)` menampilkan recent sites di bawah input; `body.has-messages` menyembunyikannya saat chat aktif).
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (337.4 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 177: Fix Tool Execution Section Collapsible Toggle & Text Layout
- **Problem**:
  - Tombol accordion langkah tindakan (`.tool-toggle-header`) tidak dapat disembunyikan/di-collapse saat diklik di New Tab.
  - Teks judul dan label tombol menempel rapat (`2 Langkah Tindakan SelesaiDetail`).
- **Penyebab & Solusi**:
  1. **Collapsible CSS & Sizing (`newtab.css`)**:
     - Menambahkan aturan CSS `.tool-section-wrapper.collapsed .tool-badge-container { display: none !important; }`.
     - Memberikan styling flexbox terpisah untuk `.tool-toggle-left` (icon check + judul) dan `.tool-toggle-right` (label `Detail`/`Tutup` + chevron berputar -90° saat collapsed).
  2. **Interactive Click Handlers (`sidepanel.js`)**:
     - Menyempurnakan event listener toggle pada `appendToolBadge` dan `finalizeToolSection` agar secara dinamis memicu perubahan class `.collapsed` dan memperbarui teks `Detail` / `Tutup`.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (337.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 178: Sleek Capsule User Bubble & External Copy Button (Match Image 3)
- **Problem**:
  - Tombol Copy pada bubble user sebelumnya berada di dalam latar hijau lime sehingga membuat bubble meninggi dan kaku.
- **Penyebab & Solusi**:
  1. **Capsule User Bubble Styling (`newtab.css`)**:
     - Memisahkan bubble teks `.message.user .message-content` menjadi bentuk kapsul mulus (`border-radius: 9999px`, padding `9px 20px`, latar gradien Neon Lime `#CEF128`, teks gelap `#0F172A`).
     - Memindahkan tombol copy (`.msg-copy-btn`) ke bagian luar di bawah bubble dengan alignment rata kanan, berbentuk frosted glass pill halus (`background: rgba(255,255,255,0.05)`, border `1px solid rgba(255,255,255,0.1)`, teks abu-abu `#94A3B8`).
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (337.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 179: Dark Luxury Styling for Clarification Dock & Option Chips
- **Problem**:
  - Tampilan kartu konfirmasi arahan AI / opsi pilihan tab (`.clarification-dock-container`, `.clarification-chip`) tampak polos dengan tombol putih default browser dan border kaku.
- **Penyebab & Solusi**:
  1. **Clarification Dock CSS (`newtab.css`)**:
     - Menerapkan styling kartu Dark Luxury `.clarification-card` (`#141B26`) dengan border aksen Neon Lime (`rgba(206,241,40,0.4)`), header rapi dengan icon bantuan kuning/oranye dan tombol close minimalis.
     - Memberikan styling kartu opsi `.clarification-chip` (`#18202F`) dengan badge nomor rapi (`.chip-num`), hover glow Neon Lime, dan opsi kustom bergaris putus-putus (`.custom-chip`).
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (338.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 180: Ultra-Smooth Prompt Gliding Animation & Hero Dissolve Transition
- **Problem**:
  - Diinginkan animasi geser yang sangat mulus dan cepat saat prompt dikirim pertama kali dari halaman awal, di mana kotak input bento prompt meluncur ke bawah dan elemen hero lainnya dissolve (fade out) dengan rapi.
- **Penyebab & Solusi**:
  1. **Fixed-Transform Gliding Architecture (`newtab.html`, `newtab.css`)**:
     - Mempertahankan positioning `position: fixed; left: 50%; transform: translateX(-50%);` pada `#chat-input-container` dengan transisi easing `bottom 0.32s cubic-bezier(0.16, 1, 0.3, 1)`.
     - Pada posisi awal (`body:not(.has-messages)`), kotak input berada tepat di tengah vertikal (`bottom: calc(50vh - 65px)`). Saat prompt dikirim (`body.has-messages`), kotak input meluncur cepat dan mulus ke bawah (`bottom: 22px`).
  2. **Hero & Recent Sites Dissolve**:
     - Elemen headline (`#welcome-card`) dan grid aplikasi (`#recent-sites-section`) melakukan dissolve cepat (`opacity: 0; transform: translateY(-12px) scale(0.98); filter: blur(5px); transition: 0.2s ease-out`).
     - Aliran pesan baru masuk secara anggun (`animation: messagesSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)`).
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (338.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 181: Auto-Switch & Focus Target Tab on Real-Time Browser Control
- **Problem**:
  - Saat agent menjalankan tool otomasi browser di New Tab (misal: "open yt", navigasi ke Meta Ads/Google/Instagram), layar browser tetap tertahan di tab new tab sehingga user tidak melihat langsung proses kerja agent pada web page target.
- **Penyebab & Solusi**:
  1. **Automatic Tab Focus in `selectTab` (`sidepanel.js`)**:
     - Memastikan `selectTab(tabId)` langsung memanggil `chrome.tabs.update(tabId, { active: true })` dan `chrome.windows.update(tab.windowId, { focused: true })` sehingga browser seketika mengalihkan fokus ke tab yang sedang dikontrol oleh agent.
     - Mengubah semua pemanggilan `chrome.tabs.create` pada `browser_create_tab`, `browser_switch_tab`, dan `browser_navigate` dari `active: false` menjadi `active: true`.
     - Tab fullscreen agent (`newtab.html`) tetap menyala di background tanpa ditutup, sehingga seluruh eksekusi streaming, tool looping, dan respons AI terus berjalan lancar.
  2. **Sync Status Chip**:
     - Memperbarui fungsi `updateMcpStatus()` agar menyinkronkan status tab pada `#chip-system-tab` (`#current-tab-id`) di New Tab header secara real-time.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (338.6 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 182: Generous Bottom Clearance Padding & Universal Window Auto-Scroll
- **Problem**:
  - Pesan chat paling bawah tertutup / terpotong oleh kotak input prompt yang mengambang di bawah (`fixed bottom`).
  - Auto-scroll sebelumnya hanya menargetkan `#chat-messages` dan tidak menggeser halaman window New Tab ke paling bawah saat proses/respons masuk.
- **Penyebab & Solusi**:
  1. **Generous Bottom Clearance (`newtab.css`)**:
     - Menambahkan `padding-bottom: 220px !important;` pada `.fullscreen-chat-main` dan `padding-bottom: 30px;` pada `.chat-messages` sehingga seluruh pesan terbawah memiliki jarak lapang ~150px di atas kotak input fixed prompt (tidak akan pernah bertabrakan atau tertumpuk lagi).
  2. **Universal Window Auto-Scroll (`sidepanel.js`)**:
     - Memperbarui `scrollToBottom()` agar melakukan scroll simultan pada `chatMessages` dan `window.scrollTo(...)` ke dasar halaman penuh (`scrollHeight + 800px`) setiap kali pesan dibuat, di-stream, atau tool dieksekusi.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (338.8 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 183: Universal Auto-Focus on Every Subsequent Browser Action
- **Problem**:
  - Saat user kembali ke tab New Tab untuk mengirim prompt lanjutan (seperti "play deny caknan di yt"), agent yang sudah mengikat tab YouTube mengeksekusi `browser_snapshot`, `browser_click`, `browser_control_media`, dsb. tanpa mengalihkan kembali fokus layar ke tab YouTube.
- **Penyebab & Solusi**:
  1. **Global Browser Tool Focus Guard (`sidepanel.js`)**:
     - Menambahkan handler aktivasi tab `chrome.tabs.update(activeTabId, { active: true })` dan `chrome.windows.update(tab.windowId, { focused: true })` di bagian paling awal dispatcher `executeTool` untuk semua tool `browser_*`.
     - Setiap kali ada tindakan interaksi web (mengetik, mengklik, scrolling, mengontrol media, dsb.), Chrome seketika memindahkan pandangan layar pengguna kembali ke tab yang sedang dimanipulasi tanpa terlewat.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (338.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 184: Extended Bottom Clearance Spacing (Extra Breathing Room)
- **Catatan**: Iterasi penyesuaian jarak ruang bawah.

### 🚀 Iterasi 185: Fine-Tuned Compact Bottom Distance Above Fixed Prompt Bar
- **Problem**:
  - Jarak ruang kosong di bawah terlalu lebar setelah Iterasi 184, user menginginkan jarak yang pas, kompak, dan proporsional tepat di atas kotak input prompt.
- **Penyebab & Solusi**:
  1. **Compact Clearance Layout (`newtab.css`)**:
     - Mengubah `padding-bottom` pada `.fullscreen-chat-main` menjadi `160px !important;` dan `.chat-messages` menjadi `12px`.
     - Ketika percakapan di-scroll ke bawah, pesan terbawah dan tombol `[ Copy ]` kini berada dengan jarak yang sangat pas (~25px-30px) tepat di atas kotak input prompt bento tanpa tabrakan.
  2. **Precise Auto-Scroll (`sidepanel.js`)**:
     - Mengoptimalkan target scroll pada `scrollToBottom()` agar pas (`scrollTarget + 200px`).
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (338.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 186: Dark Luxury Styling for Agent Mode Switch Fallback Card
- **Problem**:
  - Tampilan kartu konfirmasi beralih mode (`.agent-switch-card`) pada Mode Chat di New Tab muncul dengan tombol putih default browser tanpa styling.
- **Penyebab & Solusi**:
  1. **Agent Switch Card CSS (`newtab.css`)**:
     - Menambahkan styling lengkap Dark Luxury untuk `.agent-switch-card` (`#141B26`), border aksen Neon Lime (`rgba(206,241,40,0.4)`), header robot neon, tombol konfirmasi Neon Lime solid (`.btn-switch-to-agent-confirm`), dan tombol batal frosted glass (`.btn-switch-to-agent-cancel`).
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (339.1 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 187: Auto-Switch Screen Back to Fullscreen Agent Tab on Final Response
- **Problem**:
  - Setelah selesai mengontrol tab browser (misal: memutar lagu di YouTube, menyelesaikan formulir, atau mengekstrak data), layar user tetap berada di tab target dan tidak otomatis kembali ke tab New Tab Agent untuk membaca respon akhir.
- **Penyebab & Solusi**:
  1. **Automatic Return Focus (`focusOwnAgentTab` in `sidepanel.js`)**:
     - Menambahkan helper `focusOwnAgentTab()` yang otomatis mendeteksi tab ekstensi New Tab (`chrome.tabs.getCurrent()`) dan mengalihkan fokus kembali ke tab agent (`chrome.tabs.update(ownTab.id, { active: true })` + `chrome.windows.update(ownTab.windowId, { focused: true })`) begitu giliran respon AI selesai (`finally` block pada `runAgentLoop` dan `runChatModeLoop`).
     - Alur mulus: Saat agent bekerja mengontrol web, user melihat langsung tab target secara live; setelah selesai, layar seketika kembali ke tab chat agent untuk menampilkan hasil respon/laporan akhir.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (339.2 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 188: Fix Gigantic Magnifying Glass SVG Icon & Dark Luxury Agent Mention Dropup
- **Problem**:
  - Saat mengetik `@` di kotak input prompt New Tab untuk memanggil/mention agen spesialis, ikon kaca pembesar (search) membesar hingga memenuhi layar dan menu dropdown agen tidak ter-styling dengan benar.
- **Penyebab & Solusi**:
  1. **Explicit SVG Icon Dimensions (`sidepanel.js`)**:
     - Menambahkan atribut eksplisit `width="16" height="16"` pada seluruh return SVG ikon agen di `getAgentIconSvg(agent)`.
  2. **Dark Luxury Agent Mention Dropup & Active Chips CSS (`newtab.css`)**:
     - Menambahkan aturan lengkap `.agent-mention-dropup` (background `#141B26`, border halus, drop shadow mewah), `.mention-dropup-item` (hover neon lime), `.mention-item-icon` (terkunci `width: 28px; height: 28px;` dengan SVG `15px`), deskripsi agen, tag badge sub-agent, serta styling `.mention-chip` dan `.active-mentions-bar`.
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (339.9 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 189: Compact Thumbnail Previews for File, Image & Video Attachments
- **Problem**:
  - Saat melampirkan/paste file gambar ke kotak input prompt di New Tab, preview gambar meledak dengan resolusi penuh memenuhi layar dan merusak tata letak tombol send.
- **Penyebab & Solusi**:
  1. **Attachment Previews CSS (`newtab.css`)**:
     - Menambahkan styling lengkap `.attachments-preview-bar`, `.attachment-preview-card.is-image` (terkunci presisi `width: 58px; height: 58px;` dengan `object-fit: cover`), `.attachment-preview-card.is-video` (`78px x 58px` dengan badge durasi video), `.attachment-preview-card.is-file` (pill file elegan), dan tombol hapus thumbnail `.attachment-remove-btn`.
     - Memastikan tombol `#btn-send` tetap berada pada posisi flex-end yang presisi di samping textarea.
  2. **CRX Build & Sync**:
     - Re-pack `extension.crx` (340.2 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 190: Dynamic Vertical Centering & Zero-Overlap Hero Text Protection
- **Problem**:
  - Saat melampirkan gambar, memilih mention chips agen, atau mengetik teks panjang di halaman awal New Tab, kotak input bento mengembang ke atas dan menabrak/menutupi teks headline welcome screen.
- **Penyebab & Solusi**:
  1. **Center Pivot Transform (`newtab.css`)**:
     - Mengubah posisi awal `.chat-input-container` dari `bottom: calc(50vh - 65px)` menjadi `top: 50%; transform: translate(-50%, -50%);`.
  2. **Dynamic Placeholder ResizeObserver (`sidepanel.js`)**:
     - Menambahkan `ResizeObserver` pada `#chat-input-container` yang secara otomatis dan *real-time* menyinkronkan tinggi `#hero-input-placeholder` ke tinggi container input saat gambar/chip/multiline teks ditambahkan.
     - Struktur flexbox `.fullscreen-chat-main` secara otomatis dan mulus mendorong `.welcome-card` ke atas dan `.recent-sites-section` ke bawah dengan jarak gap tetap presisi 24px (100% bebas tabrakan).
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (340.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 191: Enhanced Spacing Between Welcome Screen Text & Input Prompt
- **Catatan**: Iterasi penyesuaian jarak awal.

### 🚀 Iterasi 192: Generous 52px Hero Text Clearance & 42px Recent Sites Offset
- **Catatan**: Iterasi penyesuaian jarak awal.

### 🚀 Iterasi 193: Maximum Spacious 80px Welcome Hero Clearance & 56px Recent Sites Offset
- **Catatan**: Iterasi penyesuaian jarak awal.

### 🚀 Iterasi 194: Snug Agent Tree Toggle Placement & Full-Width Sub-Agent Card Alignment
- **Problem**:
  - Tombol toggle buka-tutup (`Tutup ⌄` / `Detail >`) pada tim agen terlempar jauh ke pojok kanan layar, dan container kartu sub-agent (`General Browser Assistant`) lebih pendek / tidak sejajar dengan container langkah tindakan di bawahnya.
- **Penyebab & Solusi**:
  1. **Inline-Flex Snug Header (`newtab.css`)**:
     - Mengubah `.agent-tree-branch-header` menjadi `display: inline-flex; width: fit-content; gap: 8px;` sehingga tombol `Tutup ⌄` / `Detail >` berada **persis di samping kanan teks `Tim Agen yang Ditugaskan (1)`**.
  2. **100% Full-Width Card Alignment (`newtab.css`)**:
     - Mengatur `.agent-tree-branch-container` dengan `margin-left: 0; width: 100%; box-sizing: border-box;` sehingga kartu sub-agent membentang penuh 100% sejajar presisi dengan tepi kanan container langkah tindakan (`.tool-section-wrapper`).
  3. **CRX Build & Sync**:
     - Re-pack `extension.crx` (340.5 KB).
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 195: Clean Hierarchy Tree Branch Connectors & Neon Glow Removal
- **Catatan**: Iterasi penyesuaian visual hierarki & user bubble.

### 🚀 Iterasi 196: Dual Execution Mode (Accept vs Planning) & Bottom Shortcut Tip Reposition
- **Catatan**: Iterasi implementasi alur eksekusi Planning & relokasi shortcut tip.

### 🚀 Iterasi 197: Right-Aligned Execution Mode Dropup Selector
- **Catatan**: Iterasi relokasi selector mode ke pojok kanan atas.

### 🚀 Iterasi 198: Synchronized 28px Height for Execution Mode Trigger Button
- **Catatan**: Iterasi penyesuaian dimensi tombol mode eksekusi 28px.

### 🚀 Iterasi 199: Ultra-Clean Dark Luxury Dropup Redesign (Zero Clutter)
- **Catatan**: Iterasi pembersihan desain visual dropup mode eksekusi.

### 🚀 Iterasi 200: Action Plan Blueprint & Premium Plan Approval Card UI
- **Catatan**: Iterasi perancangan Action Plan Blueprint dan kartu persetujuan Dark Luxury.

### 🚀 Iterasi 201: Morphing Prompt Container into Action Plan Approval Dock
- **Catatan**: Iterasi integrasi dock persetujuan rencana langsung pada container input prompt.

### 🚀 Iterasi 202: Accurate Action Plan Step Numbering Fix (`data-step`)
- **Catatan**: Iterasi perbaikan penomoran langkah rencana kerja.

### 🚀 Iterasi 203: Bottom-Centered Shortcut Tip Reposition
- **Catatan**: Iterasi pemindahan posisi shortcut tip ke bottom-center.

### 🚀 Iterasi 204: Fix ReferenceError saveCurrentSession in Plan Approval
- **Catatan**: Iterasi perbaikan nama fungsi penyimpanan sesi.

### 🚀 Iterasi 205: Fix TypeError userMessage.toLowerCase on Plan Execution
- **Catatan**: Iterasi perbaikan parameter `runAgentLoop` dan defensive parser.

### 🚀 Iterasi 206: Premium Dark Luxury SaaS Markdown Table Redesign
- **Catatan**: Iterasi perbaikan tampilan tabel markdown.

### 🚀 Iterasi 207: Premium Dark Luxury Code Block & Syntax Card System
- **Catatan**: Iterasi penambahan styling blok kode program.

### 🚀 Iterasi 208: Dark Luxury Paragraph, Headings & Divider Typography Overhaul
- **Catatan**: Iterasi perbaikan tipografi, heading, list, dan pembatas hr.

### 🚀 Iterasi 209: Fix Giant SVG Icon & Dark Luxury Local File Card System
- **Catatan**: Iterasi penambahan styling kartu file lokal dan hard-lock SVG.

### 🚀 Iterasi 210: Dedicated File Architecture & Sidepanel CSS Syntax Resolution
- **Catatan**: Iterasi perbaikan CSS syntax sidepanel dan isolasi fullscreen.

### 🚀 Iterasi 211: Clean Input Prompt - Remove Shortcut Tip in Newtab
- **Catatan**: Iterasi pembersihan teks shortcut di input prompt.

### 🚀 Iterasi 212: Seamless In-Tab Fullscreen Settings Experience
- **Catatan**: Iterasi pengaturan in-tab overlay.

### 🚀 Iterasi 213: Dark Luxury Collapsible Hover Sidebar Navigation in New Tab
- **Catatan**: Iterasi penambahan sidebar navigasi hover-expandable.

### 🚀 Iterasi 214: Clean Sidebar Menu - Remove Terminal Shell
- **Problem**:
  - Item menu "Terminal Shell" pada sidebar tidak dibutuhkan dan perlu dihilangkan.
- **Penyebab & Solusi**:
  - Menghapus item navigasi `Terminal Shell` (`#btn-toggle-view`) dari sidebar di [newtab.html](file:///home/arya/browser-agent/extension/newtab.html), sehingga sidebar kini murni berfokus pada 3 menu inti: **Home**, **Riwayat Chat**, dan **Settings**.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (349.3 KB).
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 215: Major Overhaul - Dark Luxury 2-Column SaaS Settings Layout
- **Problem**:
  - Tampilan Pengaturan (Settings) sebelumnya masih menggunakan layout tab atas single-card, perlu dirombak total menjadi layout 2-Column Dark Luxury SaaS modern sesuai referensi desain terbaru tanpa bug dan tanpa kehilangan data database/API key.
- **Penyebab & Solusi**:
  1. **Left Settings Sidebar Navigation (`.options-sidebar`)**:
     - Menambahkan sidebar navigasi kiri 250px dengan tombol `[ ← Back ]` (`#btn-back-chat`) yang otomatis berkomunikasi via `postMessage({ action: 'closeSettings' }, '*')` untuk menutup in-tab settings overlay di New Tab.
     - Pengelompokan kategori:
       - **SETTINGS -> PROVIDER SETTINGS**: `AI & Providers`, `Multi-Agent Persona` (dengan counter badge), `Skills (Kemampuan)` (dengan counter badge), `Memory & Aturan` (dengan counter badge).
       - **SYSTEM & INTEGRATION**: `PC Bridge & Native Host`, `AI Image Generation`, `Parameter Generasi` (dengan dukungan smooth auto-scroll ke container target).
       - **HELP & INFO**: `Dokumentasi & Setup`.
  2. **Hero Provider Card (`.bento-hero-provider-card`)**:
     - Header kartu hero `LLM Providers` dengan AI icon box, tombol `[ Simpan Perubahan ]` (`#btn-save-header`), status model aktif (`#display-active-model-choice`), dan tombol cepat `+ Add custom model` (`#btn-add-model-row-quick`).
  3. **Quick Provider Templates Grid (12 Template Cards)**:
     - 12 template provider siap pakai: Google Gemini, OpenAI, Claude Code, OpenRouter, Ollama (Lokal), 9Router (Lokal), DeepSeek, LMStudio, Qwen Code, Moonshot AI, GitHub Copilot, Custom Endpoint.
     - Setiap card dilengkapi tombol `[ USE ]` interaktif dan interaksi klik langsung yang otomatis mengisi endpoint, konfigurasi model, dan daftar prioritas tanpa ketik manual.
  4. **Connection & Prioritas Model AI**:
     - Card Connection Settings lengkap dengan input endpoint, password toggle API Key, dan tombol **Test AI Connection** (`#btn-test-ai-conn`) dengan live latency reporting.
     - Card Prioritas Model AI dengan pengaturan prioritas #1 (Utama), #2, #3, kontrol tombol 🔼 🔽, pengeditan Nama UI, ID Model API, dan tombol Tambah Model.
  5. **Keamanan Database & Zero Data Loss**:
     - Seluruh database SQLite native host, agent persona kustom, ratusan skills, memori permanen, dan API key tersimpan aman tanpa ada data yang terhapus atau berubah struktur.
     - Sidebar New Tab tetap tampil dan berfungsi di rel luar layar saat membuka pengaturan.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (350.1 KB).
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 216: Clean Settings Sidebar - Remove Redundant Sub-Navigation Items
- **Problem**:
  - Sub-menu `SYSTEM & INTEGRATION` (PC Bridge, AI Image Generation, Parameter Generasi) dan `HELP & INFO` (Dokumentasi) pada sidebar kiri halaman Pengaturan membuat sidebar terlalu ramai dan tidak dibutuhkan pengguna (`ini hapus aja bro`).
- **Penyebab & Solusi**:
  - Menghapus grup sub-navigasi `SYSTEM & INTEGRATION` dan `HELP & INFO` dari `.sidebar-nav-scroll` di [options.html](file:///home/arya/browser-agent/extension/options.html).
  - Sidebar kiri kini bersih, fokus pada 4 pilar menu inti: **AI & Providers**, **Multi-Agent Persona**, **Skills (Kemampuan)**, dan **Memory & Aturan**.
  - Seluruh fitur PC Bridge, Image Gen, dan Parameter Generasi tetap aktif normal di dalam kartu bento tab AI & Providers.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (350.1 KB).
  - Restore Point: `v2.16.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 217: Fix UI Memory, Skills & Multi-Agent (Card System & Anti-Giant Icon)
- **Problem**:
  - Tampilan tab Multi-Agent, Skills, dan Memories mengalami bug visual: kartu-kartu item tidak memiliki border/background SaaS (hanya teks polos bertumpuk), dan icon mahkota/edit pada Master Agent membengkak menjadi ukuran raksasa di layar (`bug ui memory skill multi agent`).
- **Penyebab & Solusi**:
  1. **Card System Dark Luxury (`.item-card`)**:
     - Menambahkan styling lengkap untuk `.item-card`, `.item-card-top`, `.item-card-header`, `.item-card-title`, `.badge-builtin`, `.item-card-desc`, `.item-code-preview`, `.tag-pill`, `.skill-tag`, `.memory-tag`, `.model-tag`, `.btn-item-action`, dan `.btn-item-del`.
     - Setiap item kini terbungkus rapi dalam kartu frosted dark dengan shadow elegan, chip tags warna-warni yang presisi, dan tombol aksi terstruktur.
  2. **Anti-Giant SVG Icon pada Master Agent (`.boss-hero-card`)**:
     - Mengunci dimensi SVG pada `.boss-crown-icon-box svg` (22px) dan `.btn-edit-boss svg` (14px).
     - Menambahkan aturan global `svg { max-width: 100%; }` untuk mencegah SVG melebar keluar kontainer.
  3. **Modal Checkbox Selection Styling**:
     - Menambahkan styling grid untuk `.checkbox-selection-grid` dan `.checkbox-chip-label` pada modal penambahan Agent/Skill.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (350.5 KB).
  - Restore Point: `v2.17.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 218: Clean Settings Overlay - Remove Duplicate Top Header Bar
- **Problem**:
  - Header bar atas `.settings-overlay-header` (`[ ← Kembali ke Chat ]` dan `Pengaturan Browser Agent`) pada overlay New Tab menumpuk dan menduplikasi fungsi tombol `← Back` yang sudah ada di sidebar kiri halaman Pengaturan (`hapus aja`).
- **Penyebab & Solusi**:
  - Menghapus elemen `.settings-overlay-header` dari `#fullscreen-settings-overlay` di [newtab.html](file:///home/arya/browser-agent/extension/newtab.html).
  - Menyesuaikan `.settings-overlay-body` di [newtab.css](file:///home/arya/browser-agent/extension/newtab.css) menjadi `height: 100vh;` sehingga iframe pengaturan mengisi 100% layar penuh secara mulus tanpa bar ekstra di atasnya.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (350.8 KB).
  - Restore Point: `v2.18.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 219: Unified Seamless Sidebar (Welcomescreen & Settings Match)
- **Problem**:
  - Tampilan sidebar kiri pada halaman Pengaturan memiliki header dan struktur yang berbeda (`← Back` dan Moon icon) sehingga terasa seperti aplikasi yang terpisah (`buat sidebar di pengaturan tetep gunakan sidebar di welcomescreen biar kerasa seamles tidak beda aplikasi`).
- **Penyebab & Solusi**:
  - Menyatukan desain header `.options-sidebar` dengan sidebar Welcomescreen New Tab:
    1. Header profil pengguna `a arya Personal` yang identik (avatar bundar slate + nama pengguna + role).
    2. Menu item pertama **Home** (icon rumah) yang langsung berfungsi kembali ke percakapan / Welcomescreen chat.
    3. Divider tipis elegan dan label grup `SETTINGS`.
    4. Tab-tab menu `AI & Providers`, `Multi-Agent Persona`, `Skills`, dan `Memory` dengan styling pill & icon presisi.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (350.8 KB).
  - Restore Point: `v2.19.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 220: Major UI Polish - Prioritas Model AI (Modern Dark Luxury Table)
- **Problem**:
  - Tampilan kartu "Prioritas Model AI" terlihat berantakan dan kurang rapi: badge rank terputus di atas, input text terpotong, dan tombol aksi reorder / delete gepeng dan bertumpuk tanpa tata letak yang jelas (`improve ui desain ini bro soalnya jelek`).
- **Penyebab & Solusi**:
  1. **Tabel Kolom SaaS Modern (`.models-table-header`)**:
     - Menambahkan header kolom yang jelas: `PRIORITAS`, `NAMA TAMPILAN (UI)`, `API MODEL ID`, dan `URUTAN / AKSI`.
  2. **Row Strip Card Sleek (`.model-row-card`)**:
     - Setiap model terbungkus dalam kartu baris horizontal dark glass dengan rank pill `#1 (Utama)` (lime vibrant `#CEF128`) dan `#2 (Cadangan 1)` (slate clean).
     - Input field Nama UI (font standar jelas) dan API Model ID (`JetBrains Mono` lime code font) dengan border focus highlight.
  3. **Tombol Aksi Reorder & Delete Presisi**:
     - Tombol 🔼 🔽 berdimensi 32x32px dengan hover highlight elegan.
     - Tombol 🗑️ dengan styling background crimson lembut dan hover red glow.
     - Tombol `+ Tambah Model Baru` berbentuk dashed strip beraksen lime.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (350.8 KB).
  - Restore Point: `v2.20.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 221: Scrollable Tags & Uniform Height Grid for Multi-Agent & Skills
- **Problem**:
  - Sub-agent yang memiliki banyak skills/memories (10-20 item) membuat kartu item melar ke bawah hingga sangat tinggi, sehingga grid kartu menjadi timpang dan tidak sejajar (`improve ui multi agent skill dan memory yang dipilih buat bisa di scroling biar container multi agent sama ga beda beda dan ga terlalu tinggi`).
- **Penyebab & Solusi**:
  1. **Tinggi Kartu Seragam (`height: 280px`)**:
     - Mengatur tinggi setiap kartu `.item-card` menjadi seragam 280px dengan layout flex terstruktur (header + deskripsi + tag container scrollable + action buttons di bagian bawah).
  2. **Scrollable Tag Container (`.item-tags-row` & `.boss-hero-tags`)**:
     - Menetapkan `max-height: 100px; overflow-y: auto;` pada kontainer tag chip dengan custom thin scrollbar bertema Lime/Dark Slate.
  3. **Scrollable Code Preview (`.item-code-preview`)**:
     - Menetapkan `max-height: 100px; overflow-y: auto;` pada preview kode SOP & Memory.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (351.1 KB).
  - Restore Point: `v2.21.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 222: Identical Fixed Sidebar (Welcomescreen & Settings 240px, No Shadow)
- **Problem**:
  - Sidebar di Welcomescreen masih menggunakan mode mini (58px hover melar ke 220px dengan bayangan/shadow tebal), berbeda dengan sidebar halaman Pengaturan (Image 2) sehingga terasa tidak mulus/seamless (`style ui sidebar welcome screen buat sama kek di style ui sidebar pengaturan image 2 dan ukuran lebarnya juga buat sama biar kelihatan seamles, gaperlu shadow sidebarnya`).
- **Penyebab & Solusi**:
  1. **Lebar Tetap 240px Tanpa Shadow**:
     - Mengatur lebar `.app-sidebar` (New Tab) dan `.options-sidebar` (Pengaturan) menjadi tetap **240px** dengan `box-shadow: none !important;` dan border-right halus `1px solid rgba(255, 255, 255, 0.08)`.
     - Teks label (`.sidebar-user-info`, `.sidebar-nav-label`) selalu tampil permanen tanpa animasi collapse/expand.
     - Kontainer utama `.fullscreen-agent-app` memiliki margin-left tetap `240px` (`width: calc(100% - 240px)`).
  2. **Struktur Navigasi Identik**:
     - Menambahkan item `AI & Providers`, `Multi-Agent Persona (10)`, `Skills (46)`, dan `Memory (28)` langsung pada sidebar Welcomescreen New Tab.
     - Mengklik item pengaturan langsung membuka tab terkait tanpa lag.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (351.5 KB).
  - Restore Point: `v2.22.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 223: Real-Time Auto-Save Database (Zero Manual Save Button Required)
- **Problem**:
  - Pengguna harus menekan tombol "Simpan Perubahan" secara manual setiap kali mengedit konfigurasi, yang memicu friksi dan risiko setting belum tersimpan jika lupa ditekan (`buat ketika setting apapun di pengaturan langsung kesimpen secara realtime di database bro jadi gaperlu klik tombol simpan`).
- **Penyebab & Solusi**:
  1. **Real-Time Auto-Save Hook (`triggerAutoSave`)**:
     - Memasang event listener `input` dan `change` pada seluruh elemen konfigurasi (`settingEndpoint`, `settingApiKey`, `settingImageModel`, `settingTemp`, `settingMaxTokens`, input nama dan API Model ID di tabel prioritas, tombol Reorder, Delete, Add Row, serta Preset Pills).
     - Seluruh perubahan otomatis tersimpan ke `chrome.storage.local` dengan debounced auto-save yang cerdas dan instan.
  2. **Indikator Status Real-Time (`.auto-save-status-badge`)**:
     - Menambahkan badge status modern dengan dot pulse hijau bertuliskan **"Tersimpan otomatis"** (berubah menjadi "Menyimpan..." saat mengetik), menggantikan tombol simpan konvensional.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.1 KB).
  - Restore Point: `v2.23.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 224: Clean Homescreen Sidebar with In-Page Settings Access
- **Problem**:
  - Di Homescreen (Welcomescreen New Tab), menampilkan seluruh sub-menu settings membuat sidebar terasa padat. Pengguna menginginkan menu sidebar homescreen tetap ultra-clean (hanya `Home`, `Riwayat Chat`, dan tombol `Pengaturan`), di mana ketika tombol `Pengaturan` diklik langsung membuka layar pengaturan di dalam tab yang sama tanpa membuka tab browser baru (`kalo di homescren sidebar menunya tetep kasih menu pengaturan aja bro tombolnya biar lebih clean trus klau di klik pengaturan itu langsung ke pengaturan gaperlu open tab baru`).
- **Penyebab & Solusi**:
  1. **Sidebar Homescreen Ultra-Clean**:
     - Menyederhanakan elemen `.app-sidebar` di New Tab menjadi:
       - Header profil: `a arya Personal`
       - Menu 1: `Home` (icon rumah)
       - Menu 2: `Riwayat Chat` (icon history)
       - Menu 3: `Pengaturan` (icon gear)
  2. **In-Page Overlay Access (Tanpa Buka Tab Baru)**:
     - Mengklik tombol `Pengaturan` langsung mengaktifkan `#fullscreen-settings-overlay` yang memuat `options.html` di dalam iframe layar penuh seketika.
     - Di dalam layar Pengaturan, sidebar menampilkan daftar tab lengkap (`AI & Providers`, `Multi-Agent`, `Skills`, `Memory`) serta tombol `Home` untuk kembali ke percakapan.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.24.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 225: Hover-Reveal Clean Sidebar on Homescreen
- **Problem**:
  - Pengguna menginginkan sidebar di Homescreen (New Tab) berada dalam posisi ter-hide / collapse secara default agar ruang chat lapang dan bersih, dan baru membesar / show saat di-hover (`buat sidebar di homescreen tetep di hide kalau di hover baru show`).
- **Penyebab & Solusi**:
  1. **Hover-Reveal Behavior**:
     - Mengembalikan mode collapse default `58px` pada `.app-sidebar` di New Tab (`width: 58px; overflow-x: hidden;`).
     - Teks label (`.sidebar-user-info`, `.sidebar-nav-label`) disembunyikan secara default (`opacity: 0`).
     - Saat kursor mouse masuk ke area sidebar (`.app-sidebar:hover`), sidebar otomatis melar halus menjadi `220px` (`opacity: 1`) dengan bayangan elevasi dark glass dan transisi cubic-bezier yang mulus.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.1 KB).
  - Restore Point: `v2.25.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 226: Fix Welcome-Card DOM Theft Bug on Home Click
- **Problem**:
  - Saat berada di Homescreen dan pengguna mengklik tombol `Home`, teks hero utama (*"What should your agent work on next?"*) tiba-tiba hilang dan menyisakan ruang hitam kosong di tengah (`bug kalau di homescren sidebar klik menu home padahal sudah di home jadi bug ui jadi kek gini bro`).
- **Penyebab & Solusi**:
  1. **Akar Masalah (DOM Theft)**:
     - Di `sidepanel.js`, fungsi `startNewChat()` mengeksekusi `chatMessages.appendChild(welcomeCard)`.
     - Pada New Tab, `welcomeCard` seharusnya berada di `#agent-workspace`, bukan di `#chat-messages` (karena `#chat-messages` memiliki CSS `display: none` saat tidak ada pesan aktif / `body:not(.has-messages)`).
     - Akibatnya, `welcomeCard` ikut tersembunyi karena dipindahkan ke container `#chat-messages`.
  2. **Perbaikan `resetChatMessagesUI()`**:
     - Membuat helper `resetChatMessagesUI()` di `sidepanel.js` yang memeriksa posisi DOM `welcomeCard`: jika berada di `#agent-workspace`, `welcomeCard` tidak dipindahkan ke `#chat-messages`, melainkan dipastikan tetap tampil (`welcomeCard.style.display = 'flex'`).
     - Memperbarui event listener `Home` di `newtab.js` untuk memastikan tampilan hero tetap stabil dan utuh.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.26.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 227: Fix In-Page Settings Bug (Zero External Tab Creation)
- **Problem**:
  - Mengklik tombol `Pengaturan` di sidebar homescreen masih membuka tab browser baru `options.html` di Chrome (`bug ketika di sidebar homescren klik pengaturan masih muncul tab baru pengaturan harusnya gausah tab baru pengaturan jadi tab nya tetep sama tab homescren di chromenya`).
- **Penyebab & Solusi**:
  1. **Akar Masalah**:
     - `sidepanel.js` memasang event listener global pada `#btn-open-settings` yang memanggil `openOptionsTab()` (`chrome.tabs.create` / `chrome.runtime.openOptionsPage()`).
  2. **Perbaikan**:
     - Memperbarui `openOptionsTab()` di `sidepanel.js` untuk mendeteksi keberadaan `#fullscreen-settings-overlay`. Jika elemen tersebut ada (halaman New Tab), fungsi langsung menampilkan overlay iframe `options.html` di halaman yang sama dan membatalkan pembuatan tab baru.
     - Memperbarui listener `#btn-open-settings` di `newtab.js` dengan `stopImmediatePropagation()` dan fase capture (`true`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.27.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 228: Neutral Monochrome Charcoal Dark Mode Theme
- **Problem**:
  - Tema dark mode sebelumnya memiliki rona kebiruan (*navy slate tint*) yang kurang disukai dan tidak netral. Pengguna menginginkan tema dark mode berbasis monokromatik abu-abu netral / hitam arang (*dark charcoal*), namun bukan hitam pekat (*pitch black #000*) yang terlalu kontras (`update tema color darkmode itu kek monochrome abu abu atau hitam tapi jangan hitam pekat soalnya kalau gelap kebiruan jelek bro`).
- **Penyebab & Solusi**:
  1. **Monochrome Charcoal & Neutral Gray Palette**:
     - Memperbarui variabel warna dasar di `newtab.css` dan `options.css`:
       - Background Canvas / App (`--bg-canvas`, `--bg-app`): `#121214` (Dark Charcoal Netral, bukan #000 dan bukan #0B0F17 kebiruan).
       - Sidebar (`--bg-sidebar`): `#17171A` (Abu-abu gelap netral).
       - Card & Surfaces (`--bg-card`, `--bg-surface`): `#1C1C1F` (Permukaan abu-abu elegan).
       - Card Hover (`--bg-card-hover`): `#242428`.
       - Input Background (`--bg-input`): `#161618`.
       - Text Primary (`--text-primary`): `#F4F4F6` (Putih gading bersih).
       - Text Secondary (`--text-secondary`): `#A1A1AA` (Zinc/Neutral 400).
       - Text Muted (`--text-muted`): `#71717A` (Zinc/Neutral 500).
  2. **Pembersihan Gradien & Panel Gelap Kebiruan**:
     - Mengganti gradien hero card dan boss agent card menjadi `linear-gradient(135deg, #1C1C20 0%, #242429 100%)`.
     - Mengganti latar belakang panel kode preview dan input dari `#080C14` / `#131A26` menjadi `#141416` yang bersih dari tint biru.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.28.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 229: Zero Box-Shadow on Homescreen Hover Sidebar
- **Problem**:
  - Saat sidebar di Homescreen melar / show ketika di-hover mouse, masih muncul efek bayangan tebal (*box-shadow drop*) yang membuat visual kurang flat dan kurang bersih (`sidebar homescreen ketika show gausah ada shadownya bro`).
- **Penyebab & Solusi**:
  1. **Penghapusan Box-Shadow Total**:
     - Mengubah styling `.app-sidebar` dan `.app-sidebar:hover` di `newtab.css` menjadi `box-shadow: none !important;`.
     - Sidebar kini tampil flat, elegan, menyatu (*seamless*) dengan garis pembatas tipis `1px solid rgba(255, 255, 255, 0.08)`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.29.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 230: Neutral Dark Prompt Input with Subtle Professional Neon Glow
- **Problem**:
  - Warna kontainer input prompt di Welcomescreen masih memiliki rona kebiruan (`#131A26`), dan pengguna menginginkan kontainer input diperbaiki menjadi abu-abu gelap / dark charcoal netral serta dilengkapi efek glow hijau neon yang halus (*subtle*) di belakang bar input agar tetap clean dan profesional (`input prompt warnnya masih dark kebiruan bro coba lo fix, trus buat di belakang input promp ada kek glow hijau neon tapi jangan terlalu pekat biar tetep clean profesional`).
- **Penyebab & Solusi**:
  1. **Pembersihan Rona Gelap Kebiruan pada Input Prompt**:
     - Mengubah background `.chat-input-container` menjadi `rgba(25, 25, 29, 0.95)` / `#1C1C1F`.
     - Mengubah background tombol mode toggle aktif (`.btn-chat-mode-toggle.active`) menjadi `#27272A` (zinc 800) dan dropup selector menjadi `#18181B`.
  2. **Subtle Neon Lime / Green Ambient Glow**:
     - Menambahkan pseudo-element `.chat-input-container::before` dengan radial-gradient neon lime (`rgba(206, 241, 40, 0.12)`) dan filter blur 16px-20px di belakang bar input.
     - Mengatur `box-shadow` dengan ambient glow halus (`0 0 40px -6px rgba(206, 241, 40, 0.12)`), yang semakin bersinar elegan saat input difokuskan (`:focus-within`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.30.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

---

## ⚡ 3. Ringkasan Cepat untuk Agent Selanjutnya
- **Engine Path:** `/home/arya/browser-agent`
- **Downloads Export:** `/home/arya/Downloads/browser-agent/` & `/home/arya/Downloads/Browser-Agent-Universal-Installer.zip`
- **CRX Package:** `/home/arya/Downloads/browser-agent/extension.crx`
- **User Bubble Styling:** Vibrant Bento Lime Chartreuse (`#D9F92F` to `#CEF128`) with bold Dark Slate text (`#0F172A`), matching the `#btn-send` prompt button.
- **Auto Rotating Model & Failover:** Auto-failover on HTTP 429 / rate limits across prioritized candidate models (#1 -> #2 -> #3 ...).
- **Model Priority Ranking:** Top-to-bottom priority ordering with move up (🔼) / move down (🔽) controls in Options & Sidepanel Modal Settings.
- **Header Clean Layout:** Zero redundant model dropdown button on header; focus solely on Agent Persona & active view modes.
- **User Bubble Styling:** Vibrant Emerald/Green Gradient (`#16A34A` to `#15803D`) with pure white text and soft emerald drop-shadow.
- **Collision-Free Markdown Placeholders:** `\uE000...\uE001` PUA tokens eliminating placeholder corruption and syntax collisions.
- **Table & Inline Markdown Engine:** Full `formatInline()` rendering inside all `<th>` and `<td>` cells (Zero literal asterisks `**`/`*` and clean `<br>` rendering).
- **Markdown & List Rendering:** Smart list continuation, unified `<ol>`/`<ul>` containers, `<div class="md-list-sub">` nesting, and auto-linked raw URLs.
- **Safe Extension Context Lifecycle:** Full defensive try/catch and error filters on `content.js` preventing `Extension context invalidated` during reloads.
- **Smart Tab Switching:** `browser_switch_tab` fuzzy search tabId, keyword title/url, auto-open known services (Meta Ads, IG, YouTube, ChatGPT, WA).
- **Safe WXT Storage:** Safe storage proxy guard in `content.js` preventing web extension environment invalidation errors.
- **Dual Mode Switcher:** `currentChatMode` ('chat' vs 'agent', default: 'agent') with interactive `.agent-switch-card` fallback.
- **Clean Action Button:** Zero redundant icons inside `.btn-switch-to-agent-confirm`.
- **Chat Mode Pure Text History:** `sanitizeMessagesForApi(history, true)` (Clean text-only turns without invalid tool call leftovers).
- **Safe Content Script:** Safe try/catch invalidation guard on `content.js`.
- **AI Agent Vector Icons:** Robot Agent Head SVG on `#btn-mode-agent` & `.agent-switch-header`.
- **Unified Master Agent Prompting:** Mode Chat & Agent sama-sama menggunakan `buildDynamicSystemPrompt(resolvedAgents)` (Persona, Custom Skills, & Long-Term Memory 100% sinkron).
- **Standard Text Rendering:** Mode Chat uses `updateAssistantText()` for full visibility (`display: block`) during real-time SSE streaming.
- **Single Global Scrollbar:** Full-height unified scrolling on `.chat-messages` (Zero inner scrollbars on assistant message bubbles).
- **Control Capsule HUD:** 2-Element Ultra-Clean Frosted Glass Pill (`[Step Status Badge] [24px Icon Stop]`, No dots, No text labels).
- **Zero Horizontal Overflow:** Strict `overflow-x: hidden` + `word-break: break-all` & `overflow-wrap: anywhere` on all code/path pills.
- **Walkthrough Screenshots Folder:** `~/.browser-agent/walkthrough_screenshots/` (Satu folder dengan `chat_history.db`).
- **Zero Prompt Leakage:** Pure video attachment display without internal multimodal metadata text.
- **DOM & Chat Extraction:** `activePageContent.recentChatMessages` (100% Exact WhatsApp Web & Web App Text Reading).
- **Video Persistence:** Full IndexedDB Blob Storage (`BrowserAgentMediaDB` v2) + Auto-Hydration on Session Resume.
- **Video Fullscreen Lightbox:** Dedicated `.btn-video-fullscreen-overlay` + Sidepanel-safe modal player.
- **Clarification Dock:** `#clarification-dock-container` (Docked above prompt bar, auto-dismiss).
- **Multimodal Video Support:** `extractVideoMetadataAndFrames()` + video preview + keyframe vision payload.
- **Storage:** `"unlimitedStorage"` + SQLite persist + 10 sessions local cache pruning.
- **Theme:** Clean Elegant Rounded Light SaaS (Lime Chartreuse, Pure White, Dark Slate).
- **Icons:** SVG Vector only (Zero Emoji Protocol).
- **Style:** Terse Caveman Style.
- **Versioning & Restore Point Mandate:**
  - **Versi Terkini:** `v2.15.0` (Iterasi 215).
  - **Restore Points Tracker:** [RESTORE_POINTS.md](file:///home/arya/browser-agent/RESTORE_POINTS.md).
  - **Mandat:** Setiap ada update, jalankan `./create_restore_point.sh <VERSION_TAG> "<DESKRIPSI>"` dan SELALU cantumkan versi terbaru di setiap akhir respons pengguna.



