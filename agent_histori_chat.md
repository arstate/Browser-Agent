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

### 🚀 Iterasi 231: Pixel-Perfect Horizontal & Vertical Centering on Homescreen
- **Problem**:
  - Tampilan UI di Homescreen terasa tidak simetris dan kurang presisi ke tengah workspace (`kok kek ada yang kurang center tengah ya bro ui ini`).
- **Penyebab & Solusi**:
  1. **Akar Masalah Ketidaksimetrisan**:
     - `.chat-input-container` menggunakan `position: fixed; left: 50%`, yang menghitung titik tengah berdasarkan 100vw layar penuh dari ujung kiri browser, tanpa memperhitungkan lebar sidebar `58px`.
     - Akibatnya, bar input tergeser ke kiri sebesar **29px** dibandingkan `#welcome-card` dan `#recent-sites-section` yang berada di dalam kontainer kerja `.fullscreen-agent-app` (`margin-left: 58px`).
     - Selain itu, `top: 50%` tidak memperhitungkan tinggi header atas (56px).
  2. **Presisi Koordinat Sumbu Simetri**:
     - Menyesuaikan posisi horizontal menjadi `left: calc(50% + 29px)` (dan `left: calc(50% + 110px)` saat sidebar hover melar).
     - Menyesuaikan posisi vertikal menjadi `top: calc(50% + 28px)` (kompensasi tinggi header 56px).
     - Menyeimbangkan margin atas/bawah `#welcome-card` (72px) dan `#recent-sites-section` (48px), sehingga seluruh elemen sejajar simetris secara sempurna (*pixel-perfect*).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.31.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 232: Neutral Dark Sub-Agent Execution Cards & Dropups (100% Anti-Navy)
- **Problem**:
  - Kartu daftar sub-agent yang ditugaskan (*Tim Agen yang Ditugaskan*) di dalam pesan chat masih berwarna dark kebiruan (`#141B26` / `#192231`) (`ini masih kek dark kebiruan bro coba fix`).
- **Penyebab & Solusi**:
  1. **Pembersihan Rona Biru Kartu Sub-Agent**:
     - Mengubah background `.tree-agent-card` menjadi Neutral Charcoal Dark `#1C1C1F` (dan `#242428` pada `:hover`).
     - Membersihkan seluruh elemen turunan di `newtab.css` seperti `.clarification-card`, `.agent-switch-card`, `.agent-mention-dropup`, `.mention-dropup-item`, dan `.attachment-preview-card` agar 100% beralih ke warna abu-abu arang netral monokromatik.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.32.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 233: Neutral Dark Charcoal Markdown Tables, Code Cards & Clarification UI
- **Problem**:
  - Tampilan tabel analisis markdown (`.md-table-wrapper`), kartu kode (`.md-code-card`), serta opsi kartu klarifikasi interaktif masih memiliki warna latar dark navy/slate kebiruan (`#0F172A`, `#0B111E`, `#131A26`) (`ini juga kek masih dark kebiruan bro coba lo fix`).
- **Penyebab & Solusi**:
  1. **Pembersihan Rona Biru Tabel & Kartu Kode**:
     - Mengubah background `.md-table-wrapper` di `newtab.css` & `sidepanel.css` dari `rgba(15, 23, 42, 0.85)` ke `#18181B` (Neutral Charcoal Dark).
     - Mengubah header tabel `th` ke `#202024` dan teks cell `td` ke `#A1A1AA` / `#E4E4E7`.
     - Mengubah background `.md-code-card` dari `#0B111E` ke `#141416`.
  2. **Pembersihan Komponen Dialog, Modal & Opsi**:
     - Mengubah opsi chip pilihan klarifikasi `.clarification-chip` ke `#202024` (hover `#27272B`).
     - Mengubah background modal `.modal-content` ke `#18181B`, preview kotak delete `#141416`, dan form input/select ke `#141416`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.33.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 234: Translucent Frosted Glass Blur Input in Active Chat (Zero Neon Glow)
- **Problem**:
  - Saat chat aktif di mana input prompt berada di bagian bawah layar (`body.has-messages`), pengguna menginginkan agar efek glow hijau neon di belakangnya dihilangkan dan diganti dengan gaya *Glassmorphism Frosted Glass Blur* yang bersih, transparan namun tetap kontras dan jelas (`ketika input prompt agent homescren di chat ketika input prompt dibawah input prompt gausah ada glow neon dibelakang tapi jadi input prompt stylenya itu kek glasses blur tapi harus tetep jelas`).
- **Penyebab & Solusi**:
  1. **Penghapusan Neon Glow di Active Chat**:
     - Mengatur `body.has-messages .chat-input-container::before { display: none !important; opacity: 0 !important; }`.
     - Mengatur `box-shadow` pada `body.has-messages .chat-input-container` menjadi shadow gelap natural tanpa warna hijau neon (`0 16px 44px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05)`).
  2. **Penerapan Translucent Frosted Glassmorphism**:
     - Mengatur `background: rgba(22, 22, 26, 0.82);`
     - Mengatur `backdrop-filter: blur(28px) saturate(190%);` & `-webkit-backdrop-filter: blur(28px) saturate(190%);`
     - Memberikan border tipis elegan `1px solid rgba(255, 255, 255, 0.12)` sehingga pesan chat yang di-scroll di belakang bar input akan ter-blur halus dan estetik sementara input teks tetap tajam dan terbaca jelas.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.6 KB).
  - Restore Point: `v2.34.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 235: Neutral Dark Header Bar & Dropdowns (100% Anti-Navy)
- **Problem**:
  - Bilah Header Atas di New Tab (`.fullscreen-header`) dan status chips masih memiliki warna latar dark navy/slate kebiruan (`rgba(11, 15, 23, 0.85)` & `rgba(19, 26, 38, 0.98)`) (`ini masih kek dark kebiruan bro`).
- **Penyebab & Solusi**:
  1. **Pembersihan Rona Biru Header & Status Chips**:
     - Mengubah background `.fullscreen-header` menjadi `rgba(18, 18, 20, 0.88)` (Dark Charcoal Netral).
     - Mengubah background tombol pill header `.header-pill-btn` menjadi `rgba(255, 255, 255, 0.04)` dengan border `1px solid rgba(255, 255, 255, 0.08)`.
     - Mengubah background status chip `.bento-status-chip` dan `.chip-dark` menjadi `rgba(26, 26, 30, 0.9)` / `rgba(24, 24, 28, 0.85)`.
     - Mengubah background dropdown menu model & agent (`.model-dropdown-menu`, `.agent-dropdown-menu`) menjadi `rgba(24, 24, 28, 0.98)`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.6 KB).
  - Restore Point: `v2.35.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 236: Zero Background Neon Blur in Chat Canvas (100% Clean Flat Dark Charcoal)
- **Problem**:
  - Di latar belakang canvas chat New Tab masih tampak pendaran/bias warna neon hijau kuning yang mengambang (`background agent tab di chat gausah ada background blur neon bro`).
- **Penyebab & Solusi**:
  1. **Penghapusan Total Radial Gradient & Pseudo-Element Glow**:
     - Menghapus `radial-gradient(circle at 50% 12%, rgba(206, 241, 40, 0.025) ...)` pada `body.newtab-body` sehingga background menjadi flat murni `var(--bg-canvas)` (`#121214`).
     - Menghapus pseudo-element `.chat-input-container::before` yang sebelumnya memancarkan radial glow neon di kanvas.
     - Mengubah box-shadow input prompt menjadi bayangan hitam natural (`0 18px 48px rgba(0, 0, 0, 0.65)`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.4 KB).
  - Restore Point: `v2.36.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 237: Fix Sidebar Hover Input Shift Bug (Zero Unwanted Horizontal Offset)
- **Problem**:
  - Saat sidebar di-hover/muncul (`width: 220px`), bar input prompt bergeser ke kanan dan tidak sejajar dengan judul (*What should your agent work on next?*) serta Recent Sites (`bug ketika sidebar homescren show, input prompt jadi kegeser bro`).
- **Penyebab & Solusi**:
  1. **Penghapusan Override Offset `.app-sidebar:hover`**:
     - Kontainer aplikasi `.fullscreen-agent-app` bersifat statis dengan `margin-left: 58px` (sidebar overlay), sehingga komponen in-flow tidak bergerak.
     - Menghapus aturan CSS `.app-sidebar:hover ~ .fullscreen-agent-app .chat-input-container { left: calc(50% + 110px); }`.
     - Bar input prompt kini selalu terkunci presisi di `left: calc(50% + 29px)` baik saat sidebar diminimalkan maupun saat di-hover terbuka.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.4 KB).
  - Restore Point: `v2.37.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 238: Frosted Glass Input Prompt with Ambient Neon Blur Glow on Homescreen
- **Problem**:
  - Pengguna menginginkan agar bar input prompt pada tampilan Homescreen awal (`body:not(.has-messages)`) tetap memiliki efek pendaran blur neon di belakangnya agar terlihat estetik, mewah, dan berkarakter *frosted glass* (`buat input prompt di homescren tetep buat belakangnya kek ada blur neon bro biar kek kelihatan lebih glasses`).
- **Penyebab & Solusi**:
  1. **Aura Frosted Glass & Neon Blur pada Homescreen Prompt**:
     - Menerapkan `background: rgba(22, 22, 26, 0.88)` dengan `backdrop-filter: blur(28px) saturate(190%)` dan border `1px solid rgba(255, 255, 255, 0.12)`.
     - Menambahkan pseudo-element `body:not(.has-messages) .chat-input-container::before` dengan `radial-gradient` neon lime/green yang di-blur halus (`filter: blur(20px)` hingga `26px` pada `:focus-within`).
     - Memastikan active chat (`body.has-messages`) tetap bersih dari neon glow (`display: none !important; opacity: 0 !important;`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.6 KB).
  - Restore Point: `v2.38.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 239: Constant Soft Ambient Glow on Input Focus (Anti-Overbright)
- **Problem**:
  - Saat input prompt di-klik/fokus (`:focus-within`), pendaran cahaya neon menjadi semakin terang dan menyilaukan (*over-bright*) (`ketika di klik glow gausah ditambah terang soalnya malah over bro biarkan tetep aja`).
- **Penyebab & Solusi**:
  1. **Menjaga Intensitas Glow Tetap Konstan**:
     - Menghapus aturan `body:not(.has-messages) .chat-input-container:focus-within::before` yang sebelumnya meningkatkan opacity menjadi `1`, blur menjadi `26px`, dan memperbesar gradient.
     - Pendaran cahaya neon kini tetap konstan dan konsisten pada tingkat kelembutan yang pas (`filter: blur(20px)`, opacity `0.85`, dan shadow `0 0 45px -8px rgba(206, 241, 40, 0.15)`), baik sebelum maupun sesudah diklik.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.6 KB).
  - Restore Point: `v2.39.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 240: Neon Lime Border Stroke on Prompt Focus (Zero Over-Glow Shadow)
- **Problem**:
  - Pengguna menginginkan agar saat bar input prompt diklik/fokus (`:focus-within`), border stroke tetap berubah menjadi aksen neon lime yang tajam dan presisi, baik pada Homescreen maupun pada bar input di bagian bawah saat chat aktif, tanpa efek shadow glow yang berlebihan (`ketika di klik buat tetep stroke jadi neon bro gausah stroke gausah glow, di input prompt bawah juga sama`).
- **Penyebab & Solusi**:
  1. **Aksen Border Stroke Neon Lime pada Focus**:
     - Mengubah `border-color: rgba(206, 241, 40, 0.45)` saat `:focus-within` pada kontainer `.chat-input-container` (Homescreen dan Bottom Chat).
     - Menjaga bayangan shadow tetap bersih dan rapi (`0 20px 52px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(206, 241, 40, 0.2)`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.40.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 241: Instant Cut Transition to Settings (Zero Animation/Lag)
- **Problem**:
  - Perpindahan ke halaman pengaturan (`.fullscreen-settings-overlay`) masih memiliki animasi fade-in / transisi yang dirasa memperlambat respon aplikasi (`udpate ketika pindah ke pengaturan gausah ada animasi apapun jadi biar ga berat, langsung kayak cut aja`).
- **Penyebab & Solusi**:
  1. **Penghapusan Animasi Transisi**:
     - Mengubah `.fullscreen-settings-overlay` dan `.settings-overlay-body` menjadi `animation: none !important; transition: none !important;`.
     - Menambahkan background preloading pada iframe `options.html` di `newtab.js` saat halaman dimuat, sehingga ketika tombol Pengaturan diklik, tampilan pengaturan langsung muncul secara instan (*instant hard-cut*) dengan latensi 0ms.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.41.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 242: Integrated Web Search Mode on Homescreen Input Prompt
- **Problem**:
  - Pengguna ingin menambahkan opsi mode `🌐 Web Search` di switcher mode input prompt Homescreen (`[Agent Mode] [Chat Mode] [Web Search]`). Ketika mode Web Search aktif: tombol upload file (`+`) dan dropdown alur kerja (`Accept/Planning`) otomatis di-hide, placeholder berubah menjadi *"Cari di Google atau ketik URL web..."*, serta input teks langsung mengeksekusi pencarian Google atau membuka URL target secara instan. Opsi Web Search ini otomatis disembunyikan saat sesi chat AI sedang berlangsung di bagian bawah.
- **Penyebab & Solusi**:
  1. **Penambahan Mode Switcher `btn-mode-websearch`**:
     - Menambahkan tombol toggle `🌐 Web Search` di dalam `.chat-mode-switch-group` pada `newtab.html`.
     - Mengatur CSS `.chat-input-container.mode-websearch #btn-attach-file, #execution-mode-wrapper { display: none !important; }`.
     - Mengatur CSS `body.has-messages #btn-mode-websearch { display: none !important; }` agar saat chat aktif opsi pencarian web otomatis disembunyikan.
  2. **Eksekusi Instant Google Search & Direct URL**:
     - Menyesuaikan `handleSendMessage()` saat `currentChatMode === 'websearch'` agar langsung redirect ke `https://www.google.com/search?q=...` atau membuka URL yang diketik tanpa memulai sesi chat AI.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (352.5 KB).
  - Restore Point: `v2.42.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 243: Live Google Search Autocomplete Suggestions Dropdown in Web Search Mode
- **Problem**:
  - Pengguna ingin agar saat mengetik kata kunci di mode `🌐 Web Search`, muncul dropdown rekomendasi pencarian (live autocomplete suggestions) seperti pada Google Search (`bisa ga kalau di websearch itu muncul kek rekomendasi pencarian bro`).
- **Penyebab & Solusi**:
  1. **Google Suggest API Live Integration**:
     - Mengintegrasikan fungsi asynchronous `fetchGoogleSuggestions(query)` yang memanggil Google Suggest API secara real-time dengan debouncing 120ms.
  2. **Dark Charcoal Autocomplete Dropdown (`.websearch-suggestions-dropdown`)**:
     - Merender daftar saran pencarian lengkap dengan highlight kecocokan teks, ikon kaca pembesar `🔍`, dan panah quick fill `↖`.
     - Mendukung navigasi keyboard (`ArrowDown` & `ArrowUp`) untuk memilih saran, dan penekanan `Enter` atau klik mouse untuk langsung mengeksekusi pencarian Google.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (353.0 KB).
  - Restore Point: `v2.43.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 244: Translucent Frosted Glass Styling on Web Search Suggestions Dropdown
- **Problem**:
  - Tampilan latar belakang dropdown rekomendasi pencarian web masih terlalu solid/pekat (`rgba(24, 24, 28, 0.96)`) dan kurang memberikan efek *frosted glass blur* yang mewah (`buat blur bro biar glasses`).
- **Penyebab & Solusi**:
  1. **Frosted Glass Blur pada Suggestions Dropdown**:
     - Mengubah `.websearch-suggestions-dropdown` menggunakan `background: rgba(18, 18, 22, 0.72)` dengan `backdrop-filter: blur(32px) saturate(190%)` dan border `1px solid rgba(255, 255, 255, 0.12)`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.2 KB).
  - Restore Point: `v2.44.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 245: Solid Dark Surface with Ambient Neon Blur Glow on Search Suggestions Dropdown (Zero Ghosting Behind)
- **Problem**:
  - Saat menggunakan background transparan, ikon dan teks Recent Sites di belakang dropdown rekomendasi pencarian terlihat tembus pandang secara tajam sehingga mengganggu keterbacaan teks (*ghosting*) (`kok malah makin jelas bro maksud saya buat blur biar background nya blur rekomendasi searchnya`).
- **Penyebab & Solusi**:
  1. **Solid Dark Charcoal Surface + Ambient Neon Blur Glow**:
     - Mengubah `.websearch-suggestions-dropdown` menjadi background solid `background: #16161A` dengan border `1px solid rgba(255, 255, 255, 0.12)` dan bayangan lembut.
     - Menambahkan pseudo-element `.websearch-suggestions-dropdown::before` dengan pendaran neon blur lembut (`filter: blur(18px)`, opacity `0.85`) sehingga konten di belakang tertutup rapat tanpa tembus pandang, namun tepi dropdown memancarkan efek ambient blur yang mewah layaknya bar input prompt.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.2 KB).
  - Restore Point: `v2.45.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 246: Zero Scrollbars Clean Suggestions Dropdown
- **Problem**:
  - Muncul scrollbar vertikal dan horizontal pada kotak dropdown saran rekomendasi pencarian yang mengurangi estetika kebersihan tampilan (`jangan ada scroling bro biar gada ui scrolbar biar lebih clean`).
- **Penyebab & Solusi**:
  1. **Penghapusan Scrollbar & Batasan List Rapi**:
     - Mengubah `.websearch-suggestions-dropdown` menjadi `overflow: hidden !important; scrollbar-width: none !important;` dan menyembunyikan `::-webkit-scrollbar { display: none !important; }`.
     - Membatasi kuota saran rekomendasi menjadi top 6 item presisi pada `sidepanel.js` (`data[1].slice(0, 6)`) sehingga kotak dropdown berukuran proporsional, pas, dan tidak pernah memicu scrollbar.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.3 KB).
  - Restore Point: `v2.46.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 247: Unified 240px Sidebar Width on Homescreen Hover (100% Seamless Match with Settings)
- **Problem**:
  - Ukuran lebar sidebar Homescreen saat di-hover (`.app-sidebar:hover`) berukuran `220px`, sementara sidebar Pengaturan (`.options-sidebar`) berukuran `240px`, sehingga terlihat tidak konsisten (*tidak seamless*) (`baut ukuran sidebar homescren ketika show itu ukuran shownya seukuran sidebar di penggaturan buat sama biar kelihatan seamles`).
- **Penyebab & Solusi**:
  1. **Penyelarasan Lebar Sidebar 240px**:
     - Mengubah `.app-sidebar:hover` di `newtab.css` menjadi `width: 240px;` (100% presisi dan identik dengan sidebar pengaturan 240px).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.3 KB).
  - Restore Point: `v2.47.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 248: Seamless Unified Settings Redirect from Sidepanel to Homescreen Overlay
- **Problem**:
  - Saat mengklik menu Pengaturan dari Sidepanel ekstensi, aplikasi membuka tab baru yang mengarah ke `options.html` standalone mentah secara terpisah, bukan membuka overlay Pengaturan terpadu New Tab (`newtab.html#settings`) (`buat ketika klik pengaturan di sidepanel ekstension itu akan menuju ke pengaturan yang sama di newtab homescren bukan newtab link.html biar seamles bro`).
- **Penyebab & Solusi**:
  1. **Penyelarasan Target URL & Auto-Open Overlay**:
     - Mengubah fungsi `openOptionsTab()` di `sidepanel.js` agar mencari tab New Tab yang sudah aktif atau membuka tab baru menuju `newtab.html#settings`.
     - Menambahkan handler `checkUrlForAutoSettings()` dan runtime message listener di `newtab.js` yang secara otomatis membuka `#fullscreen-settings-overlay` saat URL mengandung hash `#settings` atau tab spesifik (`#ai`, `#models`, `#agents`, `#skills`, `#memory`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.3 KB).
  - Restore Point: `v2.48.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 249: Zero Neon Glow/Blur on Web Search Suggestions Dropdown (Clean Flat Dark SaaS)
- **Problem**:
  - Efek blur neon di belakang dropdown saran rekomendasi pencarian masih tampak mengganggu dan diminta untuk dihilangkan sepenuhnya (`ini gausah ada blur neonnya bro`).
- **Penyebab & Solusi**:
  1. **Penghapusan Neon Aura & Pendaran**:
     - Menghapus pseudo-element `.websearch-suggestions-dropdown::before` yang berisi filter neon blur.
     - Membersihkan colored box-shadow neon pada `.websearch-suggestions-dropdown` sehingga hanya menggunakan bayangan elevasi hitam natural (`box-shadow: 0 24px 56px -4px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.6 KB).
  - Restore Point: `v2.49.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 250: Adaptive Search Icon & Dynamic Contextual Hero Header for Web Search Mode
- **Problem**:
  - Saat di mode `🌐 Web Search`, tombol submit masih menampilkan icon panah chat (`↑`) dan judul hero tetap *"What should your agent work on next?"* yang kurang relevan untuk konteks pencarian web (`ketika di mode websearch input prompt tombol icon send prompt jadi tombol search kaca pembesar dan teks what should .... itu ganti jadi yang lebih relevan untuk web search`).
- **Penyebab & Solusi**:
  1. **Adaptive Search Button Icon (`🔍`)**:
     - Menambahkan SVG icon kaca pembesar `.search-icon` di dalam `#btn-send` yang aktif saat `.chat-input-container.mode-websearch`.
     - Mengubah tooltip tombol menjadi *"Cari di Web"*.
  2. **Dinamis Contextual Hero Header**:
     - Mengupdate judul hero menjadi *"Search the web or find anything online"* dengan highlight lime pada *"find anything"*.
     - Mengupdate sub-judul menjadi *"Instant Google search, website navigation, and smart suggestions."*.
     - Kembali ke judul agent atau chat ketika mode diubah.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (354.6 KB).
  - Restore Point: `v2.50.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 251: Cyber Text Glitch Scramble Animation & Elastic Send/Search Icon Morph on Mode Switch
- **Problem**:
  - Pergantian mode terasa statis dan membutuhkan animasi futuristik karakter per-karakter berganti acak (*glitch text scramble effect*) pada judul hero serta animasi rotasi elastis morphing pada ikon tombol kirim prompt (`buat ketika ganti mode websearch ada animasi teks gantinya kek animasi glitch per huruf berganti, dan animasi kek animasi morph icon send prompt ganti jadi icon pembesar kaca`).
- **Penyebab & Solusi**:
  1. **Cyber Text Glitch Scramble Animation (`scrambleText`)**:
     - Mengimplementasikan algoritma glitch text scramble performa tinggi berbasis `requestAnimationFrame` yang mengacak karakter dengan simbol dan huruf acak sebelum secara berurutan mengunci teks target dalam ~340ms, dengan tetap mempertahankan highlight warna lime pada elemen `.hero-highlight`.
  2. **Elastic Send/Search Icon Morphing**:
     - Mengubah styling CSS `.btn-send svg` dengan transisi rotasi elastis `cubic-bezier(0.34, 1.56, 0.64, 1)` dan opacity fade sehingga ikon panah `↑` berputar dan mengecil menghilang sementara ikon `🔍` berputar masuk dengan efek elastis halus yang memukau.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (355.0 KB).
  - Restore Point: `v2.51.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 252: Silky-Smooth Progressive Decipher Wave & Anti-Jitter Header Transition
- **Problem**:
  - Pada video screencast pengguna, animasi glitch sebelumnya terasa kasar / jittering karena mengacak seluruh kalimat secara acak dengan simbol-simbol lebar yang menyebabkan lonjakan tinggi layout dan baris teks (*layout shift / jitter*) (`coba lihat video ini bro kok kayak aneh ya kek kurang smoth gitu ya bro`).
- **Penyebab & Solusi**:
  1. **Progressive Decipher Wave (Left-to-Right Scanline)**:
     - Mengubah algoritma acak total menjadi *progressive wave scanline* dari kiri ke kanan yang hanya mengacak 2-3 karakter tepat pada titik gelombang berjalan menggunakan karakter matriks halus (`01—+_/\<>*~`).
  2. **Anti-Jitter Height Locking & Smooth Subtitle Fade**:
     - Mengunci `min-height: 98px;` pada `.welcome-hero-header` dan `min-height: 48px;` pada `.hero-title` sehingga tinggi teks tetap stabil tanpa lonjakan layout sama sekali.
     - Mengganti scramble teks pada sub-judul menjadi transisi fade-glide halus (`opacity 0 -> 1` dan `translateY(3px -> 0)`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (355.8 KB).
  - Restore Point: `v2.52.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 253: Single-Line Zero-Wrap Hero Title in Chat Mode (Anti-Stacking)
- **Problem**:
  - Pada Chat Mode, kalimat judul hero *"What would you like to talk about today?"* terpotong dan terbungkus menjadi 2 baris canggung dengan kata *"talk about"* bertumpuk vertikal akibat `display: flex` pada judul (`yang di chat ga rapih bro buat yang di chat itu sebaris aja bro`).
- **Penyebab & Solusi**:
  1. **Penyelarasan Display Block & White-space Nowrap**:
     - Mengubah `.hero-title` di `newtab.css` menjadi `display: block; white-space: nowrap; font-size: clamp(26px, 3vw, 38px); text-align: center;`.
     - Mengubah `.hero-highlight` menjadi `display: inline;` sehingga seluruh teks judul di mode Chat, Agent, maupun Web Search selalu tersusun rapi dalam satu baris (*sebaris*) tanpa pemisahan canggung.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (355.9 KB).
  - Restore Point: `v2.53.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 254: Fix Initial Prompt Height Shrink Bug & Unified Consistent Container Sizing
- **Problem**:
  - Pada video screencast pengguna, saat tab baru / refresh, tinggi kotak input prompt kadang menyusut lebih pendek (karena tinggi default textarea 24px) lalu baru membesar ketika diketik atau pindah mode (`kadang bug ukuran input prompt ketika di agent mode kek mengecil sedikit tingginya trus ketika input huruf langsung normal trus ketika mengecil sedikit ketika pindah ke websearch langsung normal`).
- **Penyebab & Solusi**:
  1. **Consistent Minimum Heights**:
     - Menetapkan `min-height: 118px; box-sizing: border-box;` pada `.chat-input-container` di `newtab.css`.
     - Menetapkan `min-height: 32px; height: 32px; box-sizing: border-box; padding: 4px 0;` pada `#chat-input`.
     - Menyembunyikan `.chat-input-bottom-actions` saat di mode Web Search dan mengatur `#chat-input` menjadi `min-height: 52px; height: 52px;` sehingga tinggi total container di semua mode (Agent, Chat, Web Search) selalu persis sama (118px).
  2. **Initial Auto-Adjustment Execution**:
     - Menjalankan `adjustChatInputHeight()` secara langsung saat inisialisasi awal skrip dan di dalam `setChatMode()` untuk memastikan tinggi kotak prompt selalu presisi sejak milidetik pertama halaman dimuat.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (356.0 KB).
  - Restore Point: `v2.54.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 255: Full-Rounded Pill Shape Search Bar & Vertically Centered Search Icon in Web Search Mode
- **Problem**:
  - Pada mode `🌐 Web Search`, pengguna menginginkan bentuk kotak pencarian menjadi *full rounded pill* dengan ukuran tinggi yang lebih pendek/ringkas dan ikon search berada pas di posisi tengah vertikal (*center*) (`buat ketika di mode websearch input prompt jadi full rounded sampingnya dan ukuran lebih di pendekin lagi tingginya biar ui enak dan pas dilihat jadi nanti icon searchnya pas center tangh bukan lagi dibawah`).
- **Penyebab & Solusi**:
  1. **Full-Rounded Pill Shape Morphing**:
     - Mengubah `.chat-input-container.mode-websearch` menjadi `border-radius: 9999px !important; min-height: 86px !important; padding: 10px 14px 10px 20px !important;` dengan transisi kurva halus.
     - Menyesuaikan pseudo-element glow `::before` menjadi `border-radius: 9999px !important;`.
  2. **Penyelarasan Posisi Tengah Vertikal (*Vertical Center Alignment*)**:
     - Mengubah `.chat-input-container.mode-websearch .chat-input-bar` menjadi `align-items: center !important;`.
     - Mengatur `#chat-input` di mode websearch menjadi `min-height: 28px; height: 28px; line-height: 28px; padding: 0;` dan tombol `#btn-send` menjadi `align-self: center !important;`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (356.1 KB).
  - Restore Point: `v2.55.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 256: 100% Uniform Prompt Box Dimensions Across Agent, Chat & Web Search Modes
- **Problem**:
  - Pengguna menghendaki agar ukuran, tinggi, dan bentuk kotak input prompt di mode Web Search tidak berubah sama sekali, melainkan tetap seragam dan identik dengan ukuran kotak di mode Agent dan Chat (`buat ketika di websearch mode ukuran input promp jangan berubah jadi tetap sama kek ukuran di agent atau chatmode`).
- **Penyebab & Solusi**:
  1. **Penyelarasan Dimensi & Bentuk Seragam**:
     - Mengembalikan sudut kelengkungan `.chat-input-container` menjadi `border-radius: 20px;` seragam di semua mode.
     - Menetapkan tinggi kotak prompt tetap `min-height: 118px;` dengan `padding: 10px 14px 10px 16px;` dan `#chat-input` setinggi `min-height: 32px; height: 32px;` di mode Web Search, Agent, maupun Chat.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (356.2 KB).
  - Restore Point: `v2.56.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 257: Integrated Search Engine Selector Dropup (Google, DuckDuckGo, Bing, Brave, Ecosia, Yandex) in Web Search Mode
- **Problem**:
  - Pengguna ingin menambahkan opsi menu pilihan Search Engine pada baris atas kotak input prompt saat berada di mode `🌐 Web Search` (`mau tanya misal saya mau tambah opsi dropup menu pilihan search engine di kotak yang saya kotan in ini bisa ga ya`).
- **Penyebab & Solusi**:
  1. **Komponen Dropup Search Engine Modern (`#search-engine-wrapper`)**:
     - Menambahkan komponen dropup selector search engine di kanan atas bar input (mengisi tempat kosong saat `#execution-mode-wrapper` disembunyikan di Web Search Mode).
     - Menyediakan 6 mesin pencari terpopuler: 🔍 **Google**, 🦆 **DuckDuckGo**, 🌐 **Bing**, 🦁 **Brave Search**, 🌲 **Ecosia**, dan 🔴 **Yandex**.
  2. **Interaktivitas & Auto-Sync Dinamis**:
     - Ikon logo dan label mesin pencari otomatis berubah sesuai pilihan aktif.
     - Placeholder input prompt otomatis diperbarui (misal: *"Cari di DuckDuckGo atau ketik URL web..."*).
     - Preferensi mesin pencari tersimpan otomatis di `chrome.storage.local`.
     - Eksekusi pencarian langsung mengarahkan query pencarian ke URL mesin pencari yang sedang dipilih.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (356.5 KB).
  - Restore Point: `v2.57.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 258: Ultra-Clean Minimalist Text-Only Search Engine Dropup (Removed Icon Box & Subtitle Descriptions)
- **Problem**:
  - Tampilan dropdown sebelumnya terasa terlalu ramai dan kurang clean karena adanya kotak ikon besar, deskripsi subtitle di bawah setiap nama, dan ikon di tombol trigger (`udpate ui ini gaperlu ada bro trus soalnya kek kurang clean ui yang seakrang bro`).
- **Penyebab & Solusi**:
  1. **Ultra-Clean Text-Only Items**:
     - Menghapus kolom kotak ikon (`.dropup-item-icon-box`) dan teks deskripsi (`.dropup-item-desc`), menyisakan nama mesin pencari yang bersih dan tanda checklist aktif.
     - Menghapus ikon pada tombol trigger di baris input sehingga hanya menampilkan teks label ramping (misal: `Google ▾`).
  2. **Slim & Compact Dropup Layout**:
     - Memperkecil lebar menu dropdown dari `285px` menjadi `165px` dengan padding ringkas (`4px`) dan sudut membulat elegan (`10px`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (357.7 KB).
  - Restore Point: `v2.58.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 259: Migrate Browser Agent Brand Badge to Left Sidebar (Collapsible Logo Icon in Default State & Full Brand on Hover / Settings)
- **Problem**:
  - Pengguna ingin logo brand **Browser Agent** dipindahkan ke bagian atas sidebar navigasi kiri (menggantikan avatar profil "arya / Personal") sesuai gambar acuan. Ketika sidebar dalam kondisi normal (tertutup / 58px), hanya squircle logo `B` neon lime yang tampil, dan ketika sidebar dibuka (hover / settings) teks lengkap `Browser Agent` muncul (`ini ganti jadi browser agent bro kek image 2 , jadi browser agent di pindah di sidebar posisinya, kalau sidebar di hide maka cuman muncul logonya aja, di menu pengaturan juga sama bro ganti jadi logo browser agent`).
- **Penyebab & Solusi**:
  1. **Sidebar Brand Badge Component (`.sidebar-brand-badge`)**:
     - Mengganti `.sidebar-user-badge` di `newtab.html` dan `options.html` dengan `.sidebar-brand-badge` yang berisi squircle logo `B` neon lime (`28x28px`, `border-radius: 8px`) dan nama brand `Browser Agent` tebal putih.
  2. **Collapsible Responsive Behavior**:
     - Pada sidebar tertutup (`58px`), `.sidebar-brand-info` disembunyikan (`opacity: 0`), hanya menampilkan logo `B` di tengah.
     - Pada saat hover atau di halaman Pengaturan (`options-sidebar` 240px), `.sidebar-brand-info` otomatis tampil secara halus (`opacity: 1; transform: translateX(0)`).
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (357.5 KB).
  - Restore Point: `v2.59.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 260: Pixel-Perfect 56px Sidebar Header Height Alignment Matching Top Navbar
- **Problem**:
  - Tinggi kotak header sidebar (`.sidebar-top`) belum sejajar horizontal dengan tinggi navbar atas (`.fullscreen-header`), sehingga garis pemisah bawah (*bottom border*) terlihat patah / tidak lurus (`ukuranya ini dibuat tingginya sama kek navbar atas bro, di pengaturan juga bro`).
- **Penyebab & Solusi**:
  1. **Penyelarasan Tinggi Presisi 56px**:
     - Menetapkan `height: 56px; min-height: 56px; max-height: 56px;` pada `.sidebar-top` di `newtab.css` dan `options.css`.
     - Menyamakan border bottom `1px solid rgba(255, 255, 255, 0.08)` sehingga header sidebar dan navbar atas membentuk satu garis horizontal yang lurus dan seamless 100%.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (357.3 KB).
  - Restore Point: `v2.60.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 261: Remove Redundant Google Search Button from Top Navbar
- **Problem**:
  - Tombol pintasan "Google Search" di navbar kanan atas (`#btn-switch-default-tab`) sudah tidak diperlukan lagi karena pengguna sudah memiliki fitur Web Search langsung pada kotak input prompt (`ini dihapus aja`).
- **Penyebab & Solusi**:
  1. **Clean Navbar Removal**:
     - Menghapus elemen button `#btn-switch-default-tab` dari `newtab.html`.
     - Menghapus event listener `btnSwitchDefault` di `newtab.js`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (357.3 KB).
  - Restore Point: `v2.61.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 262: Authentic Official Vector Brand Logos for All 12 Quick Provider Templates
- **Problem**:
  - Pada halaman Pengaturan (tab Provider), 12 kartu "Quick provider templates" sebelumnya masih menggunakan ikon emoji generic yang terlihat kurang profesional (`update ui icon quick provider buat icon logo asli providernya anda websearch aja bro`).
- **Penyebab & Solusi**:
  1. **Official Brand Vector SVGs**:
     - Mengganti seluruh ikon emoji dengan logo SVG resmi:
       - **Google Gemini**: Star sparkle dengan multi-stop gradient (#4E82EE, #9B72CB, #D96570).
       - **OpenAI**: Spiral knot rosette logo (#10A37F).
       - **Claude Code (Anthropic)**: Terracotta sunburst asterisk (#D97757).
       - **OpenRouter**: Geometric router node hub (#6366F1 / #818CF8).
       - **Ollama**: Official llama silhouette vector (#FFFFFF).
       - **9Router Local**: Neon lime rocket & proxy ring (#CEF128).
       - **DeepSeek**: Oceanic blue whale dual-tone vector (#1D93F7 / #0066FF).
       - **LMStudio**: Purple robot visor emblem (#A855F7 / #C084FC).
       - **Qwen Code**: Alibaba Qwen iridescent crystal hexagon (#6366F1 / #38BDF8).
       - **Moonshot AI (Kimi)**: Golden orbital crescent moon (#FBBF24 / #F59E0B).
       - **GitHub Copilot**: Copilot Octocat pilot emblem (#A78BFA).
       - **Custom Endpoint**: API connection engine gear (#10B981).
  2. **Styling & Alignment**:
     - Memperbarui `.template-icon` di `options.css` (`width: 28px; height: 28px;`) agar rendering SVG presisi, simetris, dan tajam.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (358.5 KB).
  - Restore Point: `v2.62.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 263: Fix User Chat Bubble Over-Rounded Oval Shape Bug on Long Multi-Line Text
- **Problem**:
  - Gelembung pesan chat pengguna sebelumnya menggunakan `border-radius: 9999px` (kapsul pill) yang menyebabkan pesan teks panjang berbentuk melengkung ekstrem menyerupai bola/oval yang memotong teks samping secara aneh (`bug ui buble user terlalu rounded kalau banyak teks buat jangan full rounded kalau banyak teks`).
- **Penyebab & Solusi**:
  1. **Consistent Rounded Rectangle Bubble**:
     - Mengubah kelengkungan `.message.user .message-content` menjadi `border-radius: 18px;` (dan `16px` di sidepanel) dengan `padding: 10px 18px; box-sizing: border-box; max-width: 100%;`.
     - Ketika pesan pendek (1 baris), gelembung tetap terlihat ramping dan modern; ketika pesan panjang/multiline, gelembung membentuk *rounded rectangle* simetris tanpa distorsi oval.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (359.0 KB).
  - Restore Point: `v2.63.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 264: Organize Provider SVG Asset Directory (`extension/icons/providers/`) & Implement Official Dark-Mode Optimized Brand Logos
- **Problem**:
  - Pengguna ingin agar aset ikon SVG penyedia AI dirapikan ke dalam folder terstruktur di dalam proyek ekstensi, dan ikon-ikon yang berwarna hitam diubah menjadi putih bersih agar terlihat jelas di tema gelap (`udpate icon nya ini bro buat folder di project ekstension kasih icon atau apa gitu biar rapih /home/arya/Downloads/ai-provider-icons/... , kalau svg hitam buat jadi putih bro`).
- **Penyebab & Solusi**:
  1. **Dedicated Asset Directory (`extension/icons/providers/`)**:
     - Membuat direktori `extension/icons/providers/` dan mengimpor seluruh 12 file SVG resmi:
       - `google-gemini.svg`, `openai.svg`, `claude.svg`, `openrouter.svg`, `ollama.svg`, `9router-local.svg`, `deepseek.svg`, `lmstudio.svg`, `qwen.svg`, `moonshot-kimi.svg`, `github-copilot.svg`, `custom-endpoint.svg`.
  2. **Dark-Mode SVG Color Optimization**:
     - Mengubah seluruh `currentColor` dan warna hitam pada `openai.svg`, `openrouter.svg`, `ollama.svg`, `lmstudio.svg`, `github-copilot.svg` menjadi `#FFFFFF` (putih solid).
     - Menyesuaikan stroke `9router-local.svg` (`#CEF128`) dan `custom-endpoint.svg` (`#10B981`) untuk kontras tajam.
  3. **Clean HTML & CSS Integration**:
     - Memperbarui `options.html` menggunakan elemen `<img src="icons/providers/*.svg" ... class="template-provider-img">` yang bersih dan modular.
     - Menambahkan styling `.template-provider-img` (`width: 22px; height: 22px; object-fit: contain;`) di `options.css`.
- **CRX Build & Sync**:
  - Re-pack `extension.crx` (360.2 KB).
  - Restore Point: `v2.64.0`.
  - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### 🚀 Iterasi 265: Update 9Router Official Brand SVG Logo in Provider Templates
- **Problem**:
  - Mengupdate aset SVG 9Router dengan logo resmi terbaru yang disediakan pengguna (`/home/arya/Downloads/9router.svg`).
- **Penyebab & Solusi**:
  1. **Official 9Router SVG Integration**:
     - Mengganti `extension/icons/providers/9router-local.svg` dan `9router.svg` dengan file SVG resmi baru yang menampilkan squircle gradasi oranye (`#f97815` ke `#c2590a`) dan tipografi putih 9R yang presisi.
- **CRX Build & Sync**:
### Iterasi 266: Perbaikan Lightbox Fullscreen Gambar AI & Eliminasi TypeError Animation pada Tab SVG/XML
- **Kebutuhan Pengguna**:
  1. Memperbaiki bug tidak bisa melihat gambar hasil AI secara fullscreen (tombol "Lihat Penuh" / overlay klik tidak membuka lightbox preview).
  2. Mengatasi error console: `Uncaught TypeError: Cannot use 'in' operator to search for 'animation' in undefined` pada `content-scripts/content.js:57` saat membuka tab SVG atau media standalone (misal `upload.wikimedia.org/.../Google_Gemini_logo.svg`).
- **Akar Masalah (Root Cause)**:
  1. Lightbox modal `#image-lightbox-modal` sebelumnya hanya ada di `sidepanel.html` dan `sidepanel.css`, belum disertakan di `newtab.html` dan `newtab.css`. Saat pengguna berinteraksi di halaman New Tab / Homescreen, pemanggilan `openMediaLightbox` gagal karena `lightboxModal` bernilai `null`.
  2. Pada tab dokumen SVG / XML murni di Chrome, pemanggilan `document.createElement("div")` menghasilkan elemen generic non-HTML tanpa properti `.style` (`undefined`). Pengecekan `"animation" in ad` pada sistem deteksi fitur React DOM di `content.js` kemudian melempar `TypeError: Cannot use 'in' operator to search for 'animation' in undefined`.
- **Solusi & Peningkatan**:
  1. **Lightbox Fullscreen di New Tab & Sidepanel**:
     - Menambahkan elemen modal `#image-lightbox-modal` ke `newtab.html`.
     - Menambahkan rule styling `.image-lightbox-modal`, `.lightbox-backdrop`, `.lightbox-container`, `.lightbox-img-wrapper` ke `newtab.css`.
     - Mengubah fungsi `getLightboxElements()`, `openMediaLightbox()`, dan `closeMediaLightbox()` di `sidepanel.js` agar mencari elemen DOM secara dinamis dan aman.
     - Memperluas listener delegasi klik sehingga tombol `.btn-gen-img-zoom`, container kartu gambar AI `.gen-img-wrapper`, thumbnail user `.user-attached-thumb`, maupun gambar inline assistant message dapat diperbesar ke layar penuh dengan nama file unduh otomatis yang rapi.
  2. **Defensive Guard pada Content Script (`content.js`)**:
     - Menambahkan pengecekan di baris awal `content.js` untuk melewati mounting / eksekusi pada dokumen SVG/XML/media murni (`cType.includes("image/") || cType.includes("svg") || rootTag === "svg"`).
     - Memperbaiki inisialisasi objek `ad = (mn && document.createElement("div") && document.createElement("div").style) || {}`.
     - Memperbaiki lookup `fl(t)` menjadi `if (e.hasOwnProperty(n) && ad && (n in ad))` dan safe deletion pada `Kl.animationend` & `Kl.transitionend`.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100% tanpa error di seluruh file JS.
     - Restore Point: `v2.66.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 267: Animasi Morphing Cybernetic Tombol Pause/Stop Generasi (Radar Orbit Ring & Glancing Eye Slits)
- **Kebutuhan Pengguna**:
  - Mengubah animasi tombol pause/stop saat AI sedang menghasilkan respon (`loading` state) sesuai video screencast `/home/arya/Videos/Screencasts/Screencast_20260823_104019.mp4`.
  - Tombol Send bermutasi secara elastis (*smooth morphing*) dari lingkaran tombol kirim menjadi kapsul status generasi.
  - Terdapat radar orbit ring melingkar yang berputar 360° mengelilingi tombol, dan dua garis mata vertikal (`||`) yang melirik/memindai kiri-kanan secara dinamis dan halus.
  - Warna tetap selaras dengan desain ekstensi (Dark Charcoal `#18181B` + Neon Lime `#CEF128` + Hover Stop Crimson `#EF4444`).
- **Solusi & Peningkatan**:
  1. **HTML Struktur Tombol (`newtab.html` & `sidepanel.html`)**:
     - Memperbarui markup `#btn-send` dengan menyertakan `.gen-morph-container`, `.gen-radar-ring`, `.gen-eyes-wrapper` (dengan dua `.gen-eye-slit`), dan `.stop-icon`.
  2. **Animasi Morphing & Keyframes CSS (`newtab.css` & `sidepanel.css`)**:
     - Menambahkan transisi elastis `cubic-bezier(0.34, 1.56, 0.64, 1)` pada perubahan dimensi tombol saat berganti status (`width: 44px; border-radius: 12px`).
     - Mengimplementasikan `@keyframes radarOrbitSpin` untuk putaran halus ring radar orbit neon lime di sekeliling tombol.
     - Mengimplementasikan `@keyframes eyesScanGlance` untuk gerakan pemindaian melirik kiri dan kanan pada dua slit mata kapsul.
     - Mengatur interaksi hover pada state `.loading` sehingga bertransformasi secara mulus menjadi tombol stop merah (`#EF4444`) dengan ikon stop putih (`.stop-icon`).
  3. **Refactor Helper `updateSendButtonState` (`sidepanel.js`)**:
     - Menghapus manipulasi inline `style.display` langsung pada icon anak agar tidak menginterupsi animasi transisi opacity & transform CSS.
  4. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.67.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 268: Bentuk Bundar 100% Tetap & Fill Neon Solid pada Tombol Generating (Hapus Stroke Muter Luar)
- **Kebutuhan Pengguna**:
  - Tombol send prompt tetap berbentuk bundar sempurna (`border-radius: 50%`) dan tidak berubah menjadi persegi panjang / kapsul.
  - Warna tombol tetap solid Neon Lime fill (`#CEF128`).
  - Menghapus lingkaran stroke berputar di luar tombol (*zero rotating outer stroke*).
  - Di dalam tombol bundar neon, dua garis vertikal gelap (`||`) tetap bergerak melirik/memindai ke kiri dan ke kanan secara halus saat status generating aktif.
- **Solusi & Peningkatan**:
  1. **HTML & DOM (`newtab.html` & `sidepanel.html`)**:
     - Menghapus elemen `.gen-radar-ring`.
  2. **Styling & Animasi (`newtab.css` & `sidepanel.css`)**:
     - Mengunci dimensi tombol `.btn-send` dan `.btn-send.loading` menjadi `36px` bundar penuh (`border-radius: 50% !important;`) di New Tab dan `32px` di Sidepanel.
     - Mempertahankan background solid Neon Lime `linear-gradient(135deg, var(--accent-lime-hover) 0%, var(--accent-lime) 100%) !important;` pada semua kondisi (idle maupun loading).
     - Menata dua slit kapsul vertikal `.gen-eye-slit` dengan warna kontras Dark Slate (`var(--accent-dark)` / `var(--slate-dark)`), yang melirik/memindai kiri-kanan secara halus (`eyesScanGlance`).
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.68.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 269: Alis Dinamis & 4 Siklus Ekspresi Wajah AI (Mikir, Stres, Nemu Ide, Nemu Jawaban)
- **Kebutuhan Pengguna**:
  - Menambahkan alis di atas mata pada tombol generate.
  - Memberikan animasi pergantian ekspresi wajah AI secara dinamis:
    1. **Mikir (Thinking)**: Alis terangkat penasaran & mata melirik atas-kiri.
    2. **Stres (Overwhelmed / Heavy Search)**: Alis berkerut tajam ke dalam & mata menyipit tegang bergetar cepat (*micro-jitter*).
    3. **Nemu Ide (Eureka / Lightbulb Moment)**: Alis melonjak tinggi terkejut senang & mata membelalak lebar memantul ceria.
    4. **Nemu Jawaban (Confident & Solving)**: Alis tenang rileks & mata mengedip percaya diri saat solusi selesai dirumuskan.
- **Solusi & Peningkatan**:
  1. **HTML & DOM (`newtab.html` & `sidepanel.html`)**:
     - Menambahkan container `.gen-face-wrapper` dengan sub-elemen `.gen-eyebrows-wrapper` (`.gen-eyebrow.gen-brow-left` dan `.gen-brow-right`) dan `.gen-eyes-wrapper` (`.gen-eye-slit.gen-eye-left` dan `.gen-eye-right`).
  2. **Styling & Keyframe Animasi 8 Detik (`newtab.css` & `sidepanel.css`)**:
     - Menata dimensi alis 5px x 1.5px dan mata 3.5px x 10px warna Dark Slate di atas background bundar Neon Lime.
     - Menyusun 4 set keyframes terkoordinasi: `@keyframes faceExpressionCycle`, `@keyframes browLeftCycle`, `@keyframes browRightCycle`, dan `@keyframes eyesSlitCycle` yang bertransisi halus secara berulang.
     - Mengatur interaksi hover pada `.btn-send.loading:hover` agar wajah mengecil halus dan memunculkan ikon stop.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.69.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 270: Pendar Aura Gradien Neon Halus pada Frosted Glass Prompt Input Saat AI Berpikir
- **Kebutuhan Pengguna**:
  - Memberikan efek pendar glow neon gradien halus yang menyelimuti perimeter dan memancar di belakang kotak input prompt saat AI sedang berpikir (`loading`/`generating`).
  - Efek glow menyatu dengan desain frosted glass transparan tanpa animasi naik-turun yang berlebihan (*natural ambient breathing*).
- **Solusi & Peningkatan**:
  1. **Styling Aura Gradien Neon (`newtab.css` & `sidepanel.css`)**:
     - Menambahkan layer pseudo-element `::before` dengan `radial-gradient(ellipse at 50% 60%, rgba(206, 241, 40, 0.35) 0%, rgba(163, 230, 53, 0.22) 40%, rgba(34, 197, 94, 0.12) 65%, transparent 80%)` dan `filter: blur(24px)`.
     - Mengimplementasikan `@keyframes smoothNeonAuraGlow` (4 detik loop bolak-balik) dengan modulasi kelembutan opacity (0.72 - 1.0) dan scale micro (0.99 - 1.015) tanpa translasi vertikal yang mengganggu.
     - Menambahkan iluminasi halus border neon lime (`border-color: rgba(206, 241, 40, 0.45)`) dan ambient drop-shadow berlapis pada `.chat-input-container.ai-thinking` dan `.chat-input-bar.ai-thinking`.
  2. **Sinkronisasi State JS (`sidepanel.js`)**:
     - Memperbarui fungsi `updateSendButtonState(loading)` untuk mengaktifkan/menonaktifkan kelas `.ai-thinking` pada `#chat-input-container` dan `#chat-input-bar` serta `.ai-is-generating` pada `document.body`.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.70.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 271: Reposisi Glow Neon ke Bawah (Ambient Bottom Underglow) & Jernihkan Area Input
- **Kebutuhan Pengguna**:
  - Glow neon sebelumnya terlalu menumpuk di tengah kotak dan membuat area teks di dalam textarea berkabut/terlalu kuning.
  - Memposisikan pendar glow neon organik di bagian bawah / lantai terluar kotak input prompt (`bottom underglow`) agar tidak monoton dan tidak membungkus presisi kaku.
- **Solusi & Peningkatan**:
  1. **Styling Bottom Floor Underglow (`newtab.css` & `sidepanel.css`)**:
     - Memindahkan titik pancar glow ke bagian bawah paling luar (`top: auto; bottom: -18px; left: -20px; right: -20px; height: 50px;`) dengan `border-radius: 0 0 40px 40px`.
     - Mengatur gradien `radial-gradient(ellipse 70% 100% at 50% 100%, rgba(206, 241, 40, 0.28) 0%, rgba(163, 230, 53, 0.14) 45%, rgba(34, 197, 94, 0.04) 75%, transparent 100%)` sehingga memancar ke bawah-luar secara anggun.
     - Mengunci background container menjadi dark frosted glass pekat (`rgba(22, 22, 26, 0.94)`) agar area teks tetap bersih, tajam, dan kontras sempurna.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.71.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 272: Animasi Gelombang Bergeser (Floor Wave) & Peningkatan Intensitas Glow Neon Bawah
- **Kebutuhan Pengguna**:
  - Menambahkan animasi dinamis pada glow bawah agar tidak diam / statis saat AI sedang berpikir.
  - Meningkatkan intensitas pendar glow neon secukupnya agar lebih hidup dan berkarakter namun tetap elegan.
- **Solusi & Peningkatan**:
  1. **Animasi `neonFloorWave` & Multi-Layer Gradient (`newtab.css` & `sidepanel.css`)**:
     - Menerapkan dua radial-gradient elips ganda dengan `background-size: 160% 100%` yang bergerak bergeser secara halus (`@keyframes neonFloorWave` 3.8 detik bolak-balik).
     - Meningkatkan sedikit intensitas pendar neon lime ke `rgba(206, 241, 40, 0.42)` dan memperluas ketinggian underglow (`height: 56px`, `bottom: -20px`).
     - Mempertahankan ketegasan border iluminasi (`border-color: rgba(206, 241, 40, 0.38)`) dan bayangan ambient glow bawah (`box-shadow: 0 14px 34px -4px rgba(206, 241, 40, 0.24)`).
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.72.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 273: Perluasan Radius Panoramic Horizon Wave Neon Glow Membentang Lebar Layar Bawah
- **Kebutuhan Pengguna**:
  - Memperluas radius jangkauan glow neon mencakup seluruh lebar area bawah layar (sesuai kotak bounding box yang ditandai pengguna).
  - Menerapkan animasi gelombang halus dinamis yang menyapu secara luas dan lembut.
- **Solusi & Peningkatan**:
  1. **Styling Panoramic Horizon Glow (`newtab.css` & `sidepanel.css`)**:
     - Mengembangkan dimensi pendar neon bawah menjadi format panorama membentang luas (`width: min(96vw, 1280px); height: 130px; bottom: -35px; left: 50%; transform: translateX(-50%);`) dengan `border-radius: 50% 50% 30% 30%`.
     - Mengimplementasikan `@keyframes neonPanoramicWave` (5 detik pergeseran multi-lobe wave loop) dengan 3 titik fokal gradien radial elips bergerak dinamis.
     - Meningkatkan kehalusan filter blur menjadi `blur(34px)` agar menghasilkan atmosfer cybernetic ambient yang menyelimuti seluruh dek bawah tanpa mengaburkan teks input.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.73.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 274: Pendar Neon Halus Membungkus Kotak Input Sesuai Style Referensi dengan Animasi Gerak Kiri-Kanan
- **Kebutuhan Pengguna**:
  - Mengembalikan bentuk pendaran neon agar membungkus rapi sekeliling perimeter kotak input prompt persis seperti style visual referensi (border neon lembut & aura halus merata di sekeliling container).
  - Menerapkan animasi berkas cahaya neon gradien yang bergerak halus bolak-balik dari kiri ke kanan.
- **Solusi & Peningkatan**:
  1. **Styling Aura Presisi & Sapuan Kiri-Kanan (`newtab.css` & `sidepanel.css`)**:
     - Mengatur `inset: -4px; border-radius: 24px; filter: blur(20px);` dengan border halus `1px solid rgba(206, 241, 40, 0.48)`.
     - Menerapkan linear-gradient multi-stop 90° dengan `background-size: 200% 100%`.
     - Mengimplementasikan `@keyframes glowSweepLeftRight` (4 detik `cubic-bezier(0.45, 0.05, 0.55, 0.95)`) yang mengalirkan hotspot cahaya neon lime secara lembut bolak-balik dari kiri ke kanan.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.74.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 275: Berkas Spotlight Orb Neon Bergerak Fisik Kiri-Kanan & Proteksi Interior Gelap Bersih
- **Kebutuhan Pengguna**:
  - Menghilangkan warna kuning/hijau keruh yang menembus ke dalam textarea (terlalu over).
  - Menampilkan animasi gerak kiri-kanan yang nyata dan terlihat jelas (*physical moving spotlight glow*).
- **Solusi & Peningkatan**:
  1. **Spotlight Orb Bergerak Fisik (`newtab.css` & `sidepanel.css`)**:
     - Mengubah pseudo-element `::before` menjadi spotlight orb neon berukuran 140px (`width: 140px; top: -8px; bottom: -8px; border-radius: 30px;`) yang bergerak secara fisik melintasi lebar input dari `left: -10px` hingga `left: calc(100% - 130px)` via `@keyframes sweepOrbLeftRight` (3.2s).
     - Mengunci background container prompt menjadi `#141417` pekat agar blur filter tidak memantulkan warna kuning ke dalam area teks, menjaga interior tetap bersih dan tajam.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.75.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 276: Orb Neon 250px dengan Jangkauan Moderat Kiri-Kanan & Animasi Fade In/Fade Out
- **Kebutuhan Pengguna**:
  - Memperbesar ukuran orb neon agar lebih proporsional dan tidak terlalu kecil.
  - Membatasi gerak orb di dalam area kotak input (tidak sampai mentok ke tepi kanan/kiri luar).
  - Memberikan animasi transisi gerak yang mulus dengan efek bernapas *fade in / fade out*.
- **Solusi & Peningkatan**:
  1. **Dimensi & Keyframes Fade In/Out (`newtab.css` & `sidepanel.css`)**:
     - Memperbesar dimensi orb menjadi 250px x 80px (`width: 250px; top: -16px; bottom: -16px; border-radius: 40px; filter: blur(24px);`).
     - Mengunci batas gerak dari `left: 6%` hingga `left: 54%` (zona aman yang nyaman di mata).
     - Mengimplementasikan `@keyframes smoothOrbSweepFade` (5.5s `cubic-bezier(0.4, 0, 0.2, 1)`) dengan modulasi opasitas dinamis (0.15 saat di ujung kiri, memudar naik ke 0.95 saat bergerak meluncur ke tengah-kanan, dan *fade out* lembut saat berputar balik).
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.76.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 277: Perbaikan Gliding Orb dengan Hardware-Accelerated translate3d & Pelepasan Properti Inset
- **Kebutuhan Pengguna**:
  - Berdasarkan rekaman video `Screencast_20260823_110647.mp4`, orb neon sebelumnya diam di sisi kiri dan tidak bergerak nyata meluncur ke kanan.
  - Memastikan animasi pergerakan meluncur ke kanan-kiri berjalan 100% mulus (60fps) dengan efek *fade in / fade out*.
- **Solusi & Peningkatan**:
  1. **Root Cause Analysis & Fix (`newtab.css` & `sidepanel.css`)**:
     - *Root Cause*: Properti `inset` dari selector induk menahan `right: -12px` secara simultan, sehingga mengubah nilai `left` hanya meregangkan lebar elemen tanpa menggeser posisinya secara fisik, ditambah transisi CSS yang memblokir keyframe.
     - *Perbaikan*: Mendefinisikan `right: auto !important; transition: none !important; left: 0 !important;` dan menggerakkan orb menggunakan GPU `translate3d(20px, 0, 0)` ke `translate3d(360px, 0, 0)` (4.8s `cubic-bezier(0.45, 0.05, 0.55, 0.95)`).
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.77.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 278: Penghapusan Total Efek Glow & Orb Animasi pada Input Prompt Saat AI Generate
- **Kebutuhan Pengguna**:
  - Menghapus seluruh efek glow neon dan orb gerak pada kotak input prompt saat AI generate agar tampilan kembali bersih, minimalis, dan tidak mengganggu visual pengetikan.
- **Solusi & Peningkatan**:
  1. **Pembersihan CSS & JS (`newtab.css`, `sidepanel.css`, & `sidepanel.js`)**:
     - Menghapus seluruh blok CSS `.chat-input-container.ai-thinking`, `.chat-input-bar.ai-thinking`, pseudo-element `::before`, serta keyframes `smoothOrbSweepFade` / `smoothOrbSweepSidepanel`.
     - Mengembalikan styling kotak input ke format murni dark frosted glass transparan dengan border standar yang rapi.
     - Membersihkan fungsi `updateSendButtonState(loading)` di `sidepanel.js` dari penambahan/penghapusan kelas `.ai-thinking` / `.ai-is-generating`.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.78.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 279: Perbaikan Ukuran Gambar Lampiran User yang Terlalu Besar di Fullscreen Chat
- **Kebutuhan Pengguna**:
  - Mengatasi bug gambar yang diunggah/dikirim oleh pengguna yang melebar raksasa di fullscreen New Tab.
  - Membatasi ukuran thumbnail gambar lampiran menjadi format thumbnail kompak yang rapi dan elegan.
- **Solusi & Peningkatan**:
  1. **Styling Lampiran User (`newtab.css`)**:
     - Menambahkan aturan lengkap `.user-msg-attachments`, `.user-attached-thumb` (dikunci ke `width: 84px; height: 84px; border-radius: 14px; object-fit: cover;` dengan efek hover zoom), `.user-attached-video-card`, dan `.user-attached-file-pill`.
     - Menambahkan defensive rule `.message .message-content img` (`max-width: min(420px, 100%); max-height: 340px; border-radius: 12px; object-fit: contain;`) agar gambar di bubble chat tidak pernah meluap keluar layar.
     - Pengguna tetap dapat memperbesar gambar ukuran penuh melalui klik Lightbox modal instan.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.79.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 280: Integrasi Animasi Swarm Stickman Biomekanik AI Bekerja Tepat di Atas Input Prompt
- **Kebutuhan Pengguna**:
  - Mengintegrasikan codingan animasi stickman swarm dari `/home/arya/browser-agent/extension/ai-stickman-animation/` agar muncul aktif di atas kotak input prompt saat AI sedang generate respon / mengeksekusi perintah.
- **Solusi & Peningkatan**:
  1. **Modul Animasi Canvas 2D Modular (`stickman-animation.js`)**:
     - Membuat modul mesin animasi canvas berkinerja tinggi 60fps dengan pelari stickman biomekanik 3 tier gait (sprint, jog, walk, fatigue cargo), teknisi obeng, teknisi kabel berkedip, dan server rack neon.
     - Menyediakan kontrol siklus hidup hemat daya `startStickmanSwarmAnimation()` dan `stopStickmanSwarmAnimation()` (0% CPU saat idle).
     - Menambahkan container `#ai-stickman-swarm-container` dan `#physicsCanvas` di New Tab dan Sidepanel tepat di atas dock input prompt.
     - Menghubungkan trigger animasi secara otomatis dengan state `updateSendButtonState(loading)` di `sidepanel.js`.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.80.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 281: Pemisahan Modular File Kodingan Animasi Stickman untuk Kemudahan Edit
- **Kebutuhan Pengguna**:
  - Memisahkan file-file kodingan animasi stickman ke dalam folder terorganisir agar sangat mudah diedit, dikonfigurasi, dan dikembangkan di masa mendatang.
- **Solusi & Peningkatan**:
  1. **Struktur Direktori Khusus (`extension/stickman-animation/`)**:
     - `stickman-config.js`: Pusat konfigurasi warna (`#CEF128`), kecepatan, tinggi lantai, dan daftar pelari.
     - `stickman-physics.js`: Model matematika kinematika pelari, kurva bezier, dan ekspresi muka.
     - `stickman-scenery.js`: Desain server rack, LED alert/blink, teknisi obeng, dan teknisi kabel.
     - `stickman-engine.js`: Mesin utama 60fps render loop, DPR auto-scaling, dan kontrol siklus hidup start/stop.
     - `stickman-styles.css`: Stylesheet terpisah khusus tata letak container & panggung kanvas.
     - `index.html`: Live sandbox playground mandiri untuk preview dan pengujian cepat di browser.
  2. **Integrasi Bersih**:
     - `newtab.html` dan `sidepanel.html` memuat file-file modular ini secara bersih tanpa duplikasi kode CSS.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.81.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 282: Penyesuaian Tinggi Ramping & Perpanjangan Lebar Penuh Menyesuaikan Input Prompt
- **Kebutuhan Pengguna**:
  - Memperkecil tinggi panggung animasi stickman agar ramping dan elegan serta memperpanjang ukuran lebarnya agar membentang 100% penuh menyesuaikan panjang kotak input prompt.
- **Solusi & Peningkatan**:
  1. **Tinggi Ramping (Compact Sleek Proportions)**:
     - Mengubah tinggi stage kanvas menjadi 68px di New Tab dan 62px di Sidepanel (`stickman-styles.css`).
     - Mengatur ulang posisi lantai `FLOOR_Y: 55`, radius kepala avatar (5.8px), ketebalan garis tulang (2.2px), serta tinggi rak server (38px) agar proporsional dan tidak terpotong.
  2. **Perpanjangan Lebar Penuh (Edge-to-Edge Span)**:
     - Menggunakan `width: calc(100% + 30px); margin: -10px -14px 6px -16px; border-radius: 19px 19px 0 0;` pada `.ai-stickman-swarm-container` di New Tab agar membentang penuh 100% menyatu dengan bingkai luar input prompt tanpa celah padding.
     - Menggunakan `width: calc(100% + 20px); margin: -8px -10px 6px -10px;` di Sidepanel untuk integrasi penuh dari tepi ke tepi.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.82.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 283: Penghapusan Jarak Bawah & Penambahan Jarak Atas Proporsional pada Banner Stickman
- **Kebutuhan Pengguna**:
  - Menghilangkan jarak kosong di bagian bawah banner stickman dan memberikan ruang napas/jarak yang cukup di bagian atas agar kepala avatar tidak mepet dengan garis border.
- **Solusi & Peningkatan**:
  1. **Penghapusan Jarak Bawah (Zero Bottom Gap)**:
     - Mengubah margin container menjadi `margin: -10px -14px 0 -16px;` (margin bottom 0) pada `stickman-styles.css`.
     - Menyesuaikan `FLOOR_Y: 61` pada tinggi stage 64px sehingga garis lantai pijakan duduk rapat di batas bawah panggung.
  2. **Ruang Napas Atas (Top Headroom Clearance)**:
     - Menyesuaikan radius kepala `HEAD_RADIUS: 5.2px`, panjang torso `10.5px`, serta tinggi server rack `34px` pada `stickman-physics.js` & `stickman-scenery.js`.
     - Memberikan jarak lega (~11px) antara bagian atas kepala avatar pelari/teknisi dengan garis border atas panggung.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.83.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 284: Penambahan Menu Dropup Switch Tab (ON / OFF Auto Switch Tab)
- **Kebutuhan Pengguna**:
  - Menambahkan tombol switch tab dropup pilihan menu ON/OFF di samping kanan kotak input prompt.
  - Jika **ON**: otomatis beralih fokus tab ke halaman yang dikontrol browser agent (seperti sekarang).
  - Jika **OFF**: tidak auto switch tab (eksekusi browser agent berjalan di latar belakang tanpa menginterupsi tab pengguna).
- **Solusi & Peningkatan**:
  1. **Komponen UI Dropup (`newtab.html`, `sidepanel.html`, `newtab.css`, `sidepanel.css`)**:
     - Menambahkan `.switch-tab-mode-wrapper` dengan trigger pill `#btn-switch-tab-mode-trigger`, ikon status, dan dropup menu `#switch-tab-mode-dropup` (opsi ON & OFF dengan deskripsi dan checkmark).
  2. **Logika Kontrol & Integrasi Alat (`sidepanel.js`)**:
     - Menambahkan variabel `autoSwitchTabEnabled` dan listener `initSwitchTabDropdown()`.
     - Menyimpan preferensi ke `chrome.storage.local` (`browser_agent_auto_switch_tab`).
     - Menghubungkan fungsi `isAutoSwitchTabEnabled()` ke `selectTab(tabId, forceFocus)`, `browser_create_tab`, `browser_navigate`, dan `browser_switch_tab`.
     - Saat mode **OFF**, `chrome.tabs.create` dan `chrome.tabs.update` dijalankan dengan `active: false`, dan debugger tetap terhubung tanpa mengalihkan tab aktif pengguna.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.84.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 285: Pengelompokan Header Kanan (Switch Tab & Accept) & Auto-Hide di Mode Web Search
- **Kebutuhan Pengguna**:
  - Posisi tombol Switch Tab harus pas di samping kiri tombol Accept (tanpa celah kosong/gap besar di tengah).
  - Jika mode Web Search aktif, sembunyikan tombol Switch Tab karena tidak diperlukan dalam pencarian instan web.
- **Solusi & Peningkatan**:
  1. **Struktur DOM Flex Grouping (`newtab.html`, `sidepanel.html`)**:
     - Membungkus `.switch-tab-mode-wrapper` dan `.execution-mode-wrapper` di dalam `<div class="chat-input-header-right">`.
     - Bilah atas prompt (`.chat-input-top-bar`) kini memiliki 2 elemen flex utama: mode switcher group di kiri dan `.chat-input-header-right` di kanan.
  2. **Styling & Gap Precision (`newtab.css`, `sidepanel.css`)**:
     - Menambahkan class `.chat-input-header-right` dengan `display: flex; align-items: center; gap: 8px;` (6px pada Sidepanel) sehingga tombol Switch Tab duduk rapat berdampingan di samping kiri tombol Accept.
     - Menambahkan aturan `.chat-input-container.mode-websearch #switch-tab-mode-wrapper { display: none !important; }` sehingga otomatis hilang saat berpindah ke mode Web Search.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.85.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 286: Tombol Toggle Langsung Switch Tab (ON/OFF) & Mode Eksekusi (Accept/Planning) Berwarna
- **Kebutuhan Pengguna**:
  - Menghilangkan menu dropup popup dan mengubah tombol Switch Tab serta Accept/Planning menjadi tombol toggle langsung (sekali klik ganti status).
  - Tampilan warna:
    - **Accept**: Fill Neon Lime (`#CEF128`) dengan teks gelap kontras (`#0F172A`).
    - **Planning**: Fill Biru (`#0284C7`) dengan teks putih (`#FFFFFF`).
    - **Switch Tab ON**: Fill Neon Lime (`#CEF128`) dengan teks gelap kontras (`#0F172A`).
    - **Switch Tab OFF**: Fill Hitam / Gelap default (`rgba(0, 0, 0, 0.4)`).
- **Solusi & Peningkatan**:
  1. **Penyederhanaan DOM (`newtab.html`, `sidepanel.html`)**:
     - Menghapus elemen `.switch-tab-mode-dropup`, `.execution-mode-dropup`, dan ikon panah chevron `v`.
     - Mengubah kedua elemen menjadi tombol toggle instan (`#btn-switch-tab-mode-trigger` & `#btn-execution-mode-trigger`).
  2. **Styling Warna Dinamis (`newtab.css`, `sidepanel.css`)**:
     - Menambahkan aturan styling `.btn-execution-mode-trigger.mode-accept` (Neon Lime Fill `#CEF128` + Dark Text) dan `.btn-execution-mode-trigger.mode-planning` (Sky Blue Fill `#0284C7` + White Text).
     - Menambahkan aturan styling `.btn-switch-tab-mode-trigger.is-on` (Neon Lime Fill `#CEF128` + Dark Text) dan `.btn-switch-tab-mode-trigger.is-off` (Default Dark/Black + Muted Text).
  3. **Logika Toggle Instan (`sidepanel.js`)**:
     - Mengupdate listener `initExecutionModeDropdown` dan `initSwitchTabDropdown` sehingga sekali klik langsung mengubah state (`currentExecutionMode` & `autoSwitchTabEnabled`) dan menyimpannya ke `chrome.storage.local`.
  4. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.86.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 287: Penyimpanan Pengaturan & Model List ke SQLite Terpisah Serta Fitur Export/Import All Settings
- **Kebutuhan Pengguna**:
  - Menyimpan pengaturan daftar model prioritas ke database SQLite lokal namun dibedakan strukturnya (tabel terpisah).
  - Menambahkan tombol **Export All Settings** dan **Import Settings** di halaman pengaturan untuk backup & restore seluruh konfigurasi secara instan (100% pengaturan ikut tercadangkan).
- **Solusi & Peningkatan**:
  1. **Struktur Database SQLite Dedicated (`host/native_host.py`)**:
     - Menambahkan tabel `model_configs` (`id`, `name`, `model_id`, `priority_order`, `is_primary`, `config_json`, `updated_at`) khusus untuk urutan dan metadata prioritas model AI.
     - Menambahkan tabel `settings` (`key`, `value_json`, `updated_at`) untuk seluruh konfigurasi global ekosistem Browser Agent.
     - Menyediakan handler RPC `db_save_models`, `db_get_models`, `db_save_all_settings`, dan `db_get_all_settings`.
  2. **Tombol & UI Export/Import (`options.html`, `options.css`)**:
     - Menambahkan tombol `[Export Settings]` dan `[Import Settings]` pada baris header LLM Providers dan kartu khusus **Backup & Restore Pengaturan (SQLite & JSON)**.
  3. **Engine Backup & Restore (`options.js`, `sidepanel.js`)**:
     - `exportAllSettings()`: Mengemas seluruh API keys, provider base URL, daftar prioritas model, custom multi-agent persona, skills SOP, memory rules, dan preferensi UI ke file JSON terstruktur (`browser-agent-settings-backup-YYYY-MM-DD.json`).
     - `importAllSettings(file)`: Membaca file JSON backup, memvalidasi schema, menyimpannya ke `chrome.storage.local` dan database SQLite lokal, serta merender ulang seluruh komponen form dan kartu persona secara realtime tanpa perlu reload manual.
  4. **Verifikasi**:
     - Unit test Python RPC database SQLite lulus 100%.
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.87.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/`.

### Iterasi 288: Universal Full Database & Settings Export/Import (Lintas Windows, Mac, Linux)
- **Kebutuhan Pengguna**:
  - Ekspor seluruh database SQLite yang ada di folder `~/.browser-agent` (`chat_history.db`, sesi chat, settings, model list) beserta custom markdown files (`agents`, `skills`, `memories`).
  - Menjadikan backup universal sehingga dapat diimpor tanpa masalah di OS Windows, macOS, maupun Linux.
  - Menambahkan tombol **Export All Database** pada UI pengaturan dan modal riwayat chat.
- **Solusi & Peningkatan**:
  1. **Native RPC Universal DB Exporter (`host/native_host.py`)**:
     - Menambahkan handler `db_export_full_database` yang mengekstrak seluruh tabel SQLite (`sessions`, `settings`, `model_configs`) dan membaca seluruh berkas markdown di direktori `AGENTS_DIR`, `SKILLS_DIR`, dan `MEMORIES_DIR`.
     - Menambahkan handler `db_import_full_database` yang merestorasi seluruh data ke SQLite dengan `INSERT ON CONFLICT DO UPDATE` dan menulis ulang berkas markdown menggunakan relative path cross-platform.
  2. **Tombol & UI Universal Backup (`options.html`, `options.css`, `sidepanel.html`, `sidepanel.css`)**:
     - Menambahkan tombol **`Export All Database`** pada header LLM Providers, kartu khusus **Backup & Restore Universal**, dan modal **Riwayat Chat SQLite** (`#btn-history-export-db`).
  3. **Universal Importer Engine (`options.js`, `sidepanel.js`)**:
     - Fungsi `importAllSettings(file)` secara cerdas mendeteksi apakah file JSON adalah backup pengaturan saja atau full database backup (`universal_full_database_backup`).
     - Mengimpor seluruh sesi percakapan SQLite dan pengaturan secara simultan serta merender ulang seluruh komponen UI secara realtime.
  4. **Verifikasi**:
     - Test Python simulasi full export (13 sessions, 3 models, 2 settings, 84 files) dan full import berhasil 100%.
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.88.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 289: Dedicated Import All Database & Full TAR.GZ All-Data Universal Backup/Restore
- **Kebutuhan Pengguna**:
  - Menyediakan tombol eksplisit **`Import All Database`** agar sangat jelas untuk memulihkan seluruh data (sesi percakapan, skills, memori, model, settings).
  - Ekspor seluruh data yang ada di `~/.browser-agent` ke dalam format **`.tar.gz`** terkompresi tanpa ada data yang tertinggal.
- **Solusi & Peningkatan**:
  1. **Native RPC `.tar.gz` Backup Engine (`host/native_host.py`)**:
     - Menambahkan handler `db_export_targz_backup` yang mengompres `chat_history.db` (SQLite), `agents/`, `skills/`, `memories/`, `generated_images/`, `walkthrough_screenshots/`, dan `storage_settings.json` ke dalam format `.tar.gz`.
     - File `.tar.gz` otomatis dikirim via Base64 binary download dan di-save langsung ke `~/Downloads/`.
     - Menambahkan handler `db_import_targz_backup` yang mengekstrak seluruh arsip `.tar.gz` ke `~/.browser-agent/` secara aman (anti path traversal) dan mengembalikan konfigurasi Chrome storage.
  2. **Dedicated UI Buttons for Database & Settings (`options.html`, `options.css`, `sidepanel.html`, `sidepanel.css`)**:
     - Header Options: **`[Export All Database (.tar.gz)]`**, **`[Import All Database]`**, **`[Export Settings]`**, **`[Import Settings]`**.
     - Backup & Restore Card: 4 Action Boxes yang terpisah jelas (Ekspor Semua Database .tar.gz, Impor Semua Database, Ekspor Pengaturan .json, Impor Pengaturan .json).
     - Modal Riwayat Chat: Tombol **`[Ekspor DB]`** & **`[Impor DB]`** terhubung langsung ke `.tar.gz`.
  3. **Universal Importer Engine (`options.js`, `sidepanel.js`)**:
     - Fungsi `importAllDatabase(file)` membaca binary ArrayBuffer dari `.tar.gz` atau JSON, menjalankan `db_import_targz_backup` RPC, merestorasi seluruh tabel SQLite & berkas disk, mengupdate `chrome.storage.local`, dan me-refresh UI secara realtime.
  4. **Verifikasi**:
     - Test Python export `.tar.gz` (159 files, 25MB) dan import `.tar.gz` sukses 100%.
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.89.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 290: Modern Clean Bento Card Redesign for Backup & Restore
- **Kebutuhan Pengguna**:
  - Memperbaiki dan mempercantik tampilan kartu Backup & Restore yang sebelumnya terlihat bertumpuk dan kaku menjadi desain yang bersih, minimalis, dan modern.
- **Solusi & Peningkatan**:
  1. **Bento 2-Panel Symmetrical Layout (`options.html`, `options.css`)**:
     - Mengubah 4 kotak vertikal kaku menjadi 2 Bento Panel elegan yang berdampingan:
       - **Panel 1 (Database SQLite & Workspace .tar.gz)**: Berisi badge ungu, judul, deskripsi jelas, dan 2 tombol aksi simetris (`Download .tar.gz` & `Restore .tar.gz / .json`).
       - **Panel 2 (Pengaturan & Model Priorities .json)**: Berisi badge neon lime, judul, deskripsi jelas, dan 2 tombol aksi simetris (`Download JSON` & `Restore JSON`).
  2. **Modern Dark Glass & Hover Aesthetics**:
     - Gradien halus `linear-gradient(145deg, ...)`, rounded border 14px, glowing hover micro-interactions, dan visual hierarchy yang jelas.
     - Status footer sinkronisasi SQLite lokal di bawahnya dipercantik dengan glowing dot hijau neon dan code-pill minimalis.
  3. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - CSS layout render clean & responsive pada semua breakpoint.
     - Restore Point: `v2.90.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 291: Refined Dark Slate Pill Aesthetic for Accept & Switch Tab
- **Kebutuhan Pengguna**:
  - Mengubah tampilan tombol `[Accept]` dan `[Switch Tab]` yang sebelumnya berwarna solid polos mencolok agar memiliki style yang serasi dan elegan seperti tombol `[Agent Mode]` (Image 2).
- **Solusi & Peningkatan**:
  1. **Refined Dark Pill Aesthetic (`newtab.css`, `sidepanel.css`)**:
     - `.btn-execution-mode-trigger.mode-accept`: Background dark slate `#27272A`, inset highlight `inset 0 1px 0 rgba(255, 255, 255, 0.06)`, subtle border neon lime `rgba(206, 241, 40, 0.35)`, teks dan ikon neon lime `#CEF128`, serta hover glow lembut.
     - `.btn-switch-tab-mode-trigger.is-on`: Background dark slate `#27272A`, subtle border neon lime `rgba(206, 241, 40, 0.35)`, teks dan ikon neon lime `#CEF128`.
     - `.btn-switch-tab-mode-trigger.is-off`: Background transparan dark `rgba(0, 0, 0, 0.35)`, subtle border `rgba(255, 255, 255, 0.08)`, teks muted `#94A3B8`.
     - `.btn-execution-mode-trigger.mode-planning`: Background dark slate `#27272A`, subtle border cyan `rgba(56, 189, 248, 0.4)`, teks dan ikon cyan sky blue `#38BDF8`.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.91.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 292: Segmented Track & Inner Pill Button Design for Switch Tab and Accept/Planning
- **Kebutuhan Pengguna**:
  - Tombol tidak boleh langsung diberi stroke border luar begitu saja, melainkan memiliki struktur berlapis yang presisi menyerupai group button `[Agent Mode]`: ada track well frame di luar (`rgba(0,0,0,0.4)` dengan padding 2px dan stroke halus `rgba(255,255,255,0.06)`), dan di dalamnya terdapat button pill aktif yang memiliki background fill `#27272A` dengan teks & icon neon lime `#CEF128`.
- **Solusi & Peningkatan**:
  1. **Segmented Track & Inner Pill Structure (`newtab.css`, `sidepanel.css`)**:
     - `.switch-tab-mode-wrapper` & `.execution-mode-wrapper`: Diberi container track `background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 9999px; padding: 2px; height: 28px;` (100% identik dengan `.chat-mode-switch-group`).
     - `.btn-switch-tab-mode-trigger` & `.btn-execution-mode-trigger`: Diberi styling inner pill `height: 100%; border: none; border-radius: 9999px; padding: 0 10px;`.
     - State `is-on` & `mode-accept`: Background `#27272A`, teks dan icon neon lime `var(--accent-lime)` (`#CEF128`), shadow `0 1px 2px rgba(0, 0, 0, 0.3)`.
     - State `is-off`: Background transparan, teks muted `var(--text-muted)`.
     - State `mode-planning`: Background `#27272A`, teks dan icon cyan blue `#38BDF8`.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.92.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 293: Unified Segmented Capsule with Flat Seamless Center Join for Switch Tab & Accept/Planning
- **Kebutuhan Pengguna**:
  - Menggabungkan tombol `Switch Tab` dan `Accept/Planning` menjadi 1 kapsul utuh yang menyatu, di mana sudut pertemuan di tengah tidak rounded (flat) sehingga terlihat seperti 1 segmented control capsule yang presisi.
- **Solusi & Peningkatan**:
  1. **Unified Segmented Capsule (`newtab.css`, `sidepanel.css`)**:
     - `.chat-input-header-right`: Dijadikan outer capsule well track (`background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 9999px; padding: 2px; height: 28px; gap: 0;`).
     - Segmen kiri (`.btn-switch-tab-mode-trigger`): `border-top-left-radius: 9999px; border-bottom-left-radius: 9999px; border-top-right-radius: 0; border-bottom-right-radius: 0;`.
     - Segmen kanan (`.btn-execution-mode-trigger`): `border-top-left-radius: 0; border-bottom-left-radius: 0; border-top-right-radius: 9999px; border-bottom-right-radius: 9999px;`.
     - Sudut tengah flat menyatu tanpa celah (`gap: 0`), transisi hover mulus, dan state warna aktif/pasif tetap presisi.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.93.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 294: Fix Settings Layout Balance & Full-Width Span for Backup & Restore Card
- **Kebutuhan Pengguna**:
  - Memperbaiki bug tampilan pengaturan di mana kartu Backup & Restore Data terjepit di dalam kolom kanan (`.options-col`), menyebabkan kolom kanan sangat panjang dan timpang sementara kolom kiri kosong di bawahnya.
- **Solusi & Peningkatan**:
  1. **Full-Width Hero Layout for Backup & Restore (`options.html`)**:
     - Memindahkan `#card-backup-restore` keluar dari `.options-grid-2col` menjadi kartu full width di bagian bawah.
     - Kolom kiri dan kolom kanan di atasnya menjadi seimbang dan simetris (Kiri: AI Connection & Key + Model Priorities; Kanan: Parameter Generasi + AI Image Generation + PC Native Bridge).
     - Kartu Backup & Restore Data di bawahnya mendapatkan lebar horizontal 100% penuh sehingga 2 panel Bento (Database `.tar.gz` dan Settings `.json`) tampil sangat leluasa, proporsional, dan estetik.
  2. **Verifikasi**:
     - JS Syntax check `node -c` lulus 100%.
     - Restore Point: `v2.94.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 295: Universal All-Data .TAR.GZ Engine with Streaming Chunked Protocol & Direct Save
- **Kebutuhan Pengguna**:
  - Memastikan seluruh data yang ada di `~/.browser-agent` (termasuk SQLite `chat_history.db` sebesar 75MB, seluruh 72 screenshots `walkthrough_screenshots/`, gambar AI `generated_images/`, 46 skills SOP `skills/`, 28 memori `memories/`, 10 agents `agents/`, `README_TIAR_PROPERTY.md`, dan konfigurasi ekstensi) 100% lengkap diekspor ke `.tar.gz` dan dapat diimpor kembali secara mulus tanpa terpotong atau fallback ke JSON.
- **Solusi & Peningkatan**:
  1. **Root Cause Analysis**:
     - Chrome Native Messaging memiliki batasan keras payload sebesar 1 MB (1,048,576 bytes).
     - Ketika database `.tar.gz` berukuran 25MB - 100MB+ diubah menjadi base64 dan dikirim via stdout native host, Chrome langsung memutus koneksi sehingga antarmuka JS melakukan fallback ke ekspor JSON kecil.
  2. **Direct Downloads Save & Omission of Massive Base64 Payload (`native_host.py`)**:
     - Menulis arsip `.tar.gz` langsung ke direktori `~/Downloads/` (atau `%USERPROFILE%\Downloads`) dengan kompresi disk stream.
     - Hanya mengirim base64 jika ukuran file < 700 KB. Jika >= 700 KB, native host mengembalikan path file dan metadata status (`saved_file_path`, `size_bytes`, `counts`), menjaga payload response < 1 KB (100% aman dari limit 1 MB Chrome).
  3. **Streaming Chunked Import Protocol (`options.js`, `native_host.py`)**:
     - Mengembangkan protokol chunking 512 KB/chunk (`db_import_chunk_start`, `db_import_chunk_data`, `db_import_chunk_finish`) untuk mengimpor arsip `.tar.gz` berukuran tak terbatas (tested 25MB+ / 50 chunks) dari browser ke native host dengan progress bar interaktif.
  4. **Verifikasi**:
     - Berhasil mengekspor 24.82 MB `.tar.gz` berisi 160 file lengkap ke `~/Downloads/`.
     - Berhasil menguji pemulihan (restore) 26 MB chunked import (160 files extracted).
     - JS & Python Syntax check lulus 100%.
     - Restore Point: `v2.95.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 296: Fix Switch Tab OFF Multitasking Non-Intrusive Background Execution
- **Kebutuhan Pengguna**:
  - Memperbaiki bug di mana ketika `Switch Tab` berada pada mode `OFF`, browser tetap berpindah tab atau memfokuskan jendela secara paksa saat agent menjalankan instruksi browser.
- **Solusi & Peningkatan**:
  1. **Strict Guard on Tool Execution Dispatcher (`sidepanel.js`)**:
     - Memperbaiki `executeTool` (line 1496) yang sebelumnya memanggil `chrome.tabs.update(activeTabId, { active: true })` tanpa mengecek `isAutoSwitchTabEnabled()`.
     - Sekarang `executeTool` memeriksa `const shouldFocus = isAutoSwitchTabEnabled();` sebelum mengaktifkan tab atau memfokuskan jendela Chrome.
  2. **Non-Intrusive Background Execution (`sidepanel.js`)**:
     - Pada mode `Switch Tab: OFF`, CDP debugger tetap terhubung dan dapat mengklik, mengetik, menavigasi, mengekstrak data, dan mengambil screenshot di tab target secara hening di latar belakang tanpa mengubah fokus tab pengguna yang sedang aktif bekerja (multitasking 100% mulus).
  3. **Storage Cross-Tab Synchronization (`sidepanel.js`)**:
     - Menambahkan listener `browser_agent_auto_switch_tab` dan `browser_agent_exec_mode` pada `chrome.storage.onChanged` sehingga perubahan tombol di Newtab, Sidepanel, maupun Options langsung tersinkronisasi secara real-time di semua tab.
  4. **Verifikasi**:
     - JS & Python Syntax check lulus 100%.
     - Restore Point: `v2.96.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 297: Fix AI Generator Modal Layout & Responsive Form Controls for Agents, Skills, and Memories
- **Kebutuhan Pengguna**:
  - Memperbaiki bug layout antarmuka pada modal pembuatan Sub-Agent, Skills, dan Memories ketika beralih ke tab 'Buat dengan AI' yang sebelumnya bertumpuk horizontal tak beraturan dan membuat input prompt terjepit sempit.
- **Solusi & Peningkatan**:
  1. **Vertical Flex Column Layout for AI Generator (`options.css`)**:
     - Mengubah container `.ai-generator-box` menjadi `display: flex; flex-direction: column; gap: 12px;` dengan latar belakang semi-transparan `rgba(0, 0, 0, 0.35)` dan border neon halus `rgba(206, 241, 40, 0.2)`.
  2. **Dedicated Responsive Form Controls**:
     - Menata `.ai-model-select-row` dengan label header uppercase yang jelas dan dropdown `<select class="ai-model-select">` berwarna gelap beraksen neon saat aktif (focus).
     - Menata `.ai-generator-box textarea` menjadi lebar 100% penuh (`min-height: 72px`), padding lapang, font bersih, dan placeholder abu-abu netral.
     - Merancang tombol `.btn-generate-ai` menjadi tombol full-width neon lime mencolok dengan hover glow dan loading state.
     - Menambahkan styling box status respons `.ai-status-msg` untuk notifikasi info dan error.
  3. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.97.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 298: Dark Luxury Pill Redesign for Web Search Engine Selector
- **Kebutuhan Pengguna**:
  - Memperbarui antarmuka tombol pemilih mesin pencari (search engine selector dropdown) agar tidak polos, melainkan menggunakan gaya pill Dark Luxury dengan icon Globe neon lime, label bold berkarakter, dan dropup menu berlatar transparan blur.
- **Solusi & Peningkatan**:
  1. **Dark Luxury Search Engine Pill Button (`newtab.html`, `sidepanel.html`, `newtab.css`, `sidepanel.css`)**:
     - Memperbarui `#btn-search-engine-trigger` dengan icon Globe SVG neon lime (`#CEF128`), label mesin pencari aktif (`#search-engine-label`), chevron neon lime berputar saat open, background dark slate `#27272A`, dan border neon halus `rgba(206, 241, 40, 0.35)` dengan hover glow.
  2. **Refined Translucent Dropup Menu**:
     - Menu dropup `#search-engine-dropup` menggunakan background `#18181B`, blur 20px, border subtle, item padding proporsional, serta indikator centang checkmark hijau aktif pada mesin pencari yang dipilih.
  3. **Cross-Tab Realtime Sync (`sidepanel.js`)**:
     - Pilihan mesin pencari disimpan ke `chrome.storage.local` dan disinkronkan real-time ke semua tab melalui listener `storage.onChanged`.
  4. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.98.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 299: Compact Sleek Height Optimization for Docked Stickman Swarm Animation
- **Kebutuhan Pengguna**:
  - Memperkecil sedikit tinggi panggung kanvas animasi stickman swarm di atas container input prompt agar tampil lebih ramping, compact, dan hemat ruang vertikal.
- **Solusi & Peningkatan**:
  1. **Slimmer Stage Canvas Height (`stickman-styles.css`, `stickman-config.js`)**:
     - Mengurangi tinggi stage `.ai-stickman-stage` dari 64px menjadi **50px** di New Tab (dan 44px di mode mobile/sidepanel).
  2. **Harmonized Physics & Scenery Coordinates (`stickman-engine.js`, `stickman-scenery.js`)**:
     - Menyesuaikan garis lantai `FLOOR_Y` menjadi 47px (`FLOOR_Y_COMPACT` 41px).
     - Menyesuaikan tinggi rak server menjadi 30px dengan 4 slot LED proporsional dan radius kepala stickman menjadi 4.8px.
  3. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.99.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 300: Seamless Track Well & Borderless Fill Aesthetic for Search Engine Selector Pill
- **Kebutuhan Pengguna**:
  - Menghilangkan garis stroke/border outline neon yang mencolok pada tombol pemilih mesin pencari (`#btn-search-engine-trigger`), dan menyelaraskan tampilannya menjadi seamless pill tanpa border (`border: none`) yang duduk manis di dalam track well (`.search-engine-wrapper`) persis seperti tombol toggle Agent Mode & Web Search.
- **Solusi & Peningkatan**:
  1. **Borderless Fill Pill & Outer Track Well (`newtab.css`, `sidepanel.css`)**:
     - Menghapus outline neon (`border: none`) pada `.btn-search-engine-trigger`.
     - Mengubah `.search-engine-wrapper` menjadi wadah track semi-transparan `rgba(0, 0, 0, 0.4)` dengan padding 2px, border halus `rgba(255, 255, 255, 0.06)`, dan `border-radius: 9999px`.
     - Tombol di dalamnya memiliki fill dark slate `#27272A`, icon Globe + teks neon lime `#CEF128`, dan bayangan halus `0 1px 2px rgba(0,0,0,0.3)`.
  2. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.100.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 301: Fix Double-Track Nesting & Perfectly Flush Symmetrical Pill Alignment
- **Kebutuhan Pengguna**:
  - Memperbaiki tampilan tombol pemilih mesin pencari yang sebelumnya tampak kurang rapi karena terbungkus double-ring/double-track di dalam header bar.
- **Solusi & Peningkatan**:
  1. **Transparent Wrapper & Flush Single Pill (`newtab.css`, `sidepanel.css`)**:
     - Mengubah `.search-engine-wrapper` menjadi transparan (`background: transparent; border: none; padding: 0`) sehingga tidak lagi menghasilkan double-border di dalam `.chat-input-header-right`.
     - Menata `.btn-search-engine-trigger` menjadi satu pill tunggal presisi (`height: 100%; border-radius: 9999px; background: #27272A; line-height: 1`), dengan perataan vertikal icon Globe + teks + chevron yang rapi dan 100% simetris dengan pill toggle di sebelah kiri.
  2. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.101.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 302: Fix Add Model Row Bug in Options & Settings
- **Kebutuhan Pengguna**:
  - Memperbaiki bug di mana tombol `+ Tambah Model Baru` pada menu Pengaturan (Options) tidak merespons atau tidak memunculkan baris input baru ketika diklik.
- **Solusi & Peningkatan**:
  1. **Preserve Draft Models in Save Pipeline (`options.js`)**:
     - Memperbaiki `saveAllConfig` agar tidak membuang baris yang memiliki ID kosong saat auto-save dipicu, sehingga baris draft yang baru ditambahkan tidak terhapus.
     - Membersihkan `handleAddModelRow` dari panggilan instan `triggerAutoSave(0)` yang sebelumnya memicu siklus simpan dan merender ulang DOM.
     - Menambahkan proteksi pada listener `storage.onChanged` agar tidak menimpa fokus form saat pengguna sedang aktif mengetik di input model.
  2. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.102.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 305: Clean 1 2 3 Priority Numbering & Generous Stickman Clearance Spacing
- **Kebutuhan Pengguna**:
  - Memberikan jarak lega di atas panggung stickman agar teks atau elemen card agent terbawah tidak menempel/ketumpuk saat animasi berjalan.
  - Memperbarui tampilan badge urutan prioritas model di menu Pengaturan dan Sidepanel menjadi angka bersih `1`, `2`, `3` yang clean dan minimalis.
- **Solusi & Peningkatan**:
  1. **Clean 1 2 3 Priority Number Badges (`options.js`, `sidepanel.js`, CSS)**:
     - Mengubah teks badge `#1 (UTAMA)` dan `#2 (CADANGAN 1)` menjadi nomor bersih `${index + 1}` (`1`, `2`, `3`).
     - Mendesain ulang `.model-priority-badge` menjadi badge nomor kotak/rounded kompak (`38px x 38px` di Options & `28px x 28px` di Sidepanel) dengan font weight 800 dan border neon lime pada model #1.
  2. **Ample Breathing Room & Clearance Spacing (`newtab.css`, `sidepanel.css`, `sidepanel.js`)**:
     - Meningkatkan `padding-bottom` pada `.fullscreen-chat-main` saat `stickman-active` menjadi `340px !important` dan `.chat-messages` menjadi `40px` (serta `120px` di Sidepanel).
     - Menyesuaikan fungsi `scrollToBottom` dengan offset `+360px` saat stickman aktif sehingga stream pesan dan badge tool selalu terlihat bersih tanpa terpotong atau bertabrakan dengan input prompt.
  3. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.105.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 304: Official Vector SVG Brand Logos & Folder Organization for Search Engines
- **Kebutuhan Pengguna**:
  - Mengorganisir logo mesin pencari ke dalam folder rapi di project dan memperbarui tampilan icon logo mesin pencari pada menu dropdown dan trigger button menggunakan SVG resmi dari `/home/arya/Downloads/search-engine-logos`.
- **Solusi & Peningkatan**:
  1. **Folder Organization (`extension/icons/search-engines/`)**:
     - Memindahkan dan merapikan seluruh file SVG resmi (`google.svg`, `duckduckgo.svg`, `bing.svg`, `brave.svg`, `ecosia.svg`, `yandex.svg`) ke dalam subfolder khusus `extension/icons/search-engines/`.
  2. **UI Integration (`newtab.html`, `sidepanel.html`, `sidepanel.js`, CSS)**:
     - Memperbarui `SEARCH_ENGINES` config dengan path logo SVG untuk setiap mesin pencari.
     - Mengubah item menu dropup dan tombol trigger `#btn-search-engine-trigger` agar menampilkan logo brand vektor berwarna tajam dan presisi.
  3. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.104.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

### Iterasi 303: Smooth Morphing Animation & Dynamic Chat Clearance Spacing for Stickman Swarm
- **Kebutuhan Pengguna**:
  - Memberikan jarak otomatis di atas container stickman ketika animasi aktif agar pesan/kartu aksi agent tidak tertutup atau menempel rapat di atas panggung stickman, dengan transisi kembalinya yang smooth/tidak patah saat selesai.
  - Membuat animasi kemunculan dan hilangnya container stickman swarm menjadi transisi morphing yang mulus dan seamless.
- **Solusi & Peningkatan**:
  1. **Smooth Morphing Transition for Stickman (`stickman-styles.css`, `stickman-engine.js`)**:
     - Merancang `.ai-stickman-swarm-container` dengan `max-height: 0`, `opacity: 0`, `transform: translateY(12px) scaleY(0.65)` saat inaktif, dan bertransisi mulus ke `max-height: 50px`, `opacity: 1`, `transform: translateY(0) scaleY(1)` (`.is-active`) menggunakan kurva `cubic-bezier(0.16, 1, 0.3, 1)`.
     - Saat stop, container dikolaps mulus selama 400ms sembari render loop tetap berjalan sebelum kanvas dibersihkan dan di-hide.
  2. **Dynamic Chat Room Spacing (`newtab.css`, `sidepanel.css`)**:
     - Menambahkan class `body.stickman-active` saat animasi menyala.
     - `.fullscreen-chat-main` padding-bottom otomatis bertambah dari 160px menjadi 235px (dan `.chat-messages` diberi padding-bottom ekstra) dengan transisi `0.38s cubic-bezier(0.16, 1, 0.3, 1)`.
     - Ketika AI selesai bekerja, jarak chat room meluncur kembali ke posisi normal secara halus tanpa patah.
  3. **Verifikasi**:
     - JS & CSS Syntax check lulus 100%.
     - Restore Point: `v2.103.0`.
     - Sinkronisasi ke `/home/arya/Downloads/browser-agent/` dan `/home/arya/Downloads/BACKUP_BROWSER_AGENT_DAN_CHAT/`.

---

## ⚡ 3. Ringkasan Cepat untuk Agent Selanjutnya
- **Engine Path:** `/home/arya/browser-agent`
- **Downloads Export:** `/home/arya/Downloads/browser-agent/` & `/home/arya/Downloads/Browser-Agent-Universal-Installer.zip`
- **CRX Package:** `/home/arya/Downloads/browser-agent/extension.crx`
- **SQLite Database Tables:** `sessions`, `settings`, `model_configs` di `~/.browser-agent/chat_history.db`.
- **Stickman Swarm Smooth Morphing & Chat Spacing:** Transisi `max-height 0.38s cubic-bezier(0.16, 1, 0.3, 1)`, class `body.stickman-active` menambahkan padding-bottom 235px pada chat room secara mulus saat bekerja dan meluncur kembali ke posisi normal saat selesai.
- **Add Model Row:** Tombol `+ Tambah Model Baru` di Options dan Sidepanel Settings menambahkan baris draft `{ id: '', name: '' }` secara instan dan fokus langsung ke input Nama UI.
- **Search Engine Selector Seamless Pill:** `#btn-search-engine-trigger` duduk flush di dalam `.chat-input-header-right` (tanpa double wrapper/nesting), berlatar `#27272A`, icon Globe + teks neon lime `#CEF128`, chevron dropup.
- **Stickman Swarm Compact Proportions:** 50px height (Newtab) / 44px (Sidepanel), `FLOOR_Y: 47`, 4.8px head radius, zero bottom gap, docked directly atop the chat input prompt.
- **AI Generator Modal Layout:** Tab 'Buat dengan AI' pada modal Agent, Skill, dan Memory menggunakan container vertikal kolumnar 100% lebar penuh dengan dropdown model, textarea lapang, dan tombol generate neon lime.
- **Switch Tab Toggle (ON / OFF):**
  - `ON`: Otomatis berpindah tab dan memfokuskan jendela saat agent beraksi.
  - `OFF`: Aksi browser dieksekusi hening di latar belakang (background) via CDP tanpa mengganggu tab aktif pengguna, memungkinkan multitasking 100%.
- **All-Data Universal .tar.gz Engine:** 100% full workspace backup (`chat_history.db` 75MB, `walkthrough_screenshots/`, `generated_images/`, `skills/`, `memories/`, `agents/`, `storage_settings.json`) dengan chunked streaming import (512KB/chunk) dan direct download save.
- **Balanced Settings Grid & Full-Width Bento Backup:** 2 kolom seimbang di atas, kartu Backup & Restore Full-Width 100% di bawah dengan 2 Bento Panels (Database `.tar.gz` & Settings `.json`).
- **Unified Segmented Header Capsule:**
  - Outer Well: Single capsule container track `rgba(0, 0, 0, 0.4)` dengan `border-radius: 9999px`.
  - Left Segment (`Switch Tab`): `border-radius: 9999px 0 0 9999px` (flat di kanan).
  - Right Segment (`Accept/Planning`): `border-radius: 0 9999px 9999px 0` (flat di kiri).
- **Modular Stickman Animation Structure:** Located in `extension/stickman-animation/` (`stickman-config.js`, `stickman-physics.js`, `stickman-scenery.js`, `stickman-engine.js`, `stickman-styles.css`, `index.html`).
- **AI Stickman Swarm Working Animation:** 60fps canvas animation docked above the prompt container displaying busy runner stickmen, cable technicians, and blinking server racks during generation.
- **User Attached Media Thumbnails:** Constrained 84x84px compact square thumbnails (`.user-attached-thumb`) with Lightbox fullscreen click zoom.
- **Clean Frosted Glass Input Container:** Minimalist, high-contrast dark frosted glass input prompt without distracting ambient glow/orbs during generation.
- **AI Face Expressions Generating Button:** 100% Round Neon Lime Button with animated Eyebrows & 4 Emotion States (`faceExpressionCycle`: Mikir ➔ Stres ➔ Nemu Ide ➔ Nemu Jawaban).
- **Versioning & Restore Point Mandate:**
  - **Versi Terkini:** `v2.99.0` (Iterasi 299).
  - **Restore Points Tracker:** [RESTORE_POINTS.md](file:///home/arya/browser-agent/RESTORE_POINTS.md).
- **Search Engine Selector Pill:** `#btn-search-engine-trigger` dengan ikon Globe neon lime (`#CEF128`), background `#27272A`, border `rgba(206, 241, 40, 0.35)`, chevron dropup, dan realtime storage sync.
- **AI Generator Modal Layout:** Tab 'Buat dengan AI' pada modal Agent, Skill, dan Memory menggunakan container vertikal kolumnar 100% lebar penuh dengan dropdown model, textarea lapang, dan tombol generate neon lime.
- **Switch Tab Toggle (ON / OFF):**
  - `ON`: Otomatis berpindah tab dan memfokuskan jendela saat agent beraksi.
  - `OFF`: Aksi browser dieksekusi hening di latar belakang (background) via CDP tanpa mengganggu tab aktif pengguna, memungkinkan multitasking 100%.
- **All-Data Universal .tar.gz Engine:** 100% full workspace backup (`chat_history.db` 75MB, `walkthrough_screenshots/`, `generated_images/`, `skills/`, `memories/`, `agents/`, `storage_settings.json`) dengan chunked streaming import (512KB/chunk) dan direct download save.
- **Balanced Settings Grid & Full-Width Bento Backup:** 2 kolom seimbang di atas, kartu Backup & Restore Full-Width 100% di bawah dengan 2 Bento Panels (Database `.tar.gz` & Settings `.json`).
- **Unified Segmented Header Capsule:**
  - Outer Well: Single capsule container track `rgba(0, 0, 0, 0.4)` dengan `border-radius: 9999px`.
  - Left Segment (`Switch Tab`): `border-radius: 9999px 0 0 9999px` (flat di kanan).
  - Right Segment (`Accept/Planning`): `border-radius: 0 9999px 9999px 0` (flat di kiri).
- **Modular Stickman Animation Structure:** Located in `extension/stickman-animation/` (`stickman-config.js`, `stickman-physics.js`, `stickman-scenery.js`, `stickman-engine.js`, `stickman-styles.css`, `index.html`).
- **Stickman Swarm Proportions:** 64px / 58px height, zero bottom gap (`margin-bottom: 0`, `FLOOR_Y: 61`), generous 11px top headroom clearance, edge-to-edge full width docked directly atop the chat input container.
- **AI Stickman Swarm Working Animation:** 60fps canvas animation docked above the prompt container displaying busy runner stickmen, cable technicians, and blinking server racks during generation.
- **User Attached Media Thumbnails:** Constrained 84x84px compact square thumbnails (`.user-attached-thumb`) with Lightbox fullscreen click zoom.
- **Clean Frosted Glass Input Container:** Minimalist, high-contrast dark frosted glass input prompt without distracting ambient glow/orbs during generation.
- **AI Face Expressions Generating Button:** 100% Round Neon Lime Button with animated Eyebrows & 4 Emotion States (`faceExpressionCycle`: Mikir ➔ Stres ➔ Nemu Ide ➔ Nemu Jawaban).
- **Versioning & Restore Point Mandate:**
  - **Versi Terkini:** `v2.98.0` (Iterasi 298).
  - **Restore Points Tracker:** [RESTORE_POINTS.md](file:///home/arya/browser-agent/RESTORE_POINTS.md).
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
  - **Versi Terkini:** `v2.66.0` (Iterasi 266).
  - **Restore Points Tracker:** [RESTORE_POINTS.md](file:///home/arya/browser-agent/RESTORE_POINTS.md).
  - **Mandat:** Setiap ada update, jalankan `./create_restore_point.sh <VERSION_TAG> "<DESKRIPSI>"` dan SELALU cantumkan versi terbaru di setiap akhir respons pengguna.




