# 🎨 DESIGN SYSTEM & UI SPECIFICATION — BROWSER AGENT (CLEAN ELEGANT SAAS)

Dokumen ini mendefinisikan standar visual **Clean, Elegant, Rounded Bento UI** berbasis palet SaaS modern (Lime Chartreuse, Pure White, Slate Dark) untuk ekstensi **General Browser Agent**.

---

## ⛔ ATURAN MUTLAK IKON: ZERO EMOJI PROTOCOL (HARAM HUKUMNYA MEMAKAI ICON EMOTICON / EMOJI)
- **HARAM HUKUMNYA MENGGUNAKAN ICON EMOTICON / EMOJI DI SELURUH ANTARMUKA & UI:** Penggunaan karakter emoji (🧠, 🤖, ⚡, 📄, 📊, 📁, 🔍, 💡, 🛡️, 👤, dll.) pada label, tombol, kartu, badge, modal, dan elemen UI apapun **DILARANG KERAS** karena terlihat tidak profesional.
- **SEMUA IKON WAJIB MENGGUNAKAN VECTOR SVG MURNI:**
  - Seluruh ikon wajib menggunakan format vector SVG yang tajam, presisi, scalable, ber-stroke modern 1.8px - 2.0px, dan elegan.
  - **Direktori Ikon Resmi:** Seluruh file icon SVG disimpan rapi dan terorganisir di dalam folder [`extension/icons/svg/`](file:///home/arya/browser-agent/extension/icons/svg/) (misal: `brain.svg`, `robot.svg`, `sparkle.svg`, `user.svg`, `book.svg`, `shield.svg`, `bolt.svg`, `users.svg`, `file_doc.svg`, `file_sheet.svg`, `folder.svg`, `search.svg`).
  - Untuk rendering dinamis pada JavaScript, gunakan helper function / inline SVG murni dengan class `.ui-svg-icon` agar terintegrasi sempurna dengan CSS tema Dark Luxury.

---

## 🌟 1. Core Visual Direction & Brand Mood

- **Visual Tone**: Clean, Elegant, Minimalist, High-Tech, High-Contrast, Rounded, General Purpose SaaS.
- **Foundation**: Canvas clean off-white `#F8F9FB` dengan kartu pure white `#FFFFFF`, garis batas ultra-halus `#ECEEF2`, aksen **Lime Chartreuse** (`#CEF128`), dan kontras **Slate Dark** (`#0F172A`).
- **AI Models Manager (`.model-row-card`)**:
  - Horizontal flex row dengan radio selector sejajar (`.model-default-radio`), input nama model font monospace (`.model-row-input`), badge default (`.model-default-badge`), dan tombol hapus icon trash SVG (`.btn-model-delete`).
  - Active state `.model-row-card.is-active` dengan border slate dark dan bayangan halus.
- **Built-in System Protection Badge (`.badge-builtin`)**:
  - Badge abu-abu profesional ber-border halus (`#F1F5F9` / `#CBD5E1`) dengan label **Bawaan**.
  - Mengindikasikan Agent, Skill, dan Memory inti sistem yang dilindungi dari penghapusan.
  - Tombol hapus diganti dengan ikon gembok terkunci (`disabled` state).
- **Default General Agents & Skills**:
  - **Agents**: `General Browser Assistant`, `Deep Web Researcher`, `Coding & System Engineer`.
  - **Skills**: `Web Analysis & Data Crawler`, `BrowserOS Internal Architecture (ask-internal)`, `Structured Data & JSON Extractor`, `Content Writer & Executive Summarizer`.
  - **Memories**: `Preferensi Komunikasi & Gaya Respon`.
- **High-Performance Local Image Storage & Hydration (`local-img://`)**:
  - File fisik `.png` di disk lokal (`~/.browser-agent/generated_images/{image_id}.png`) via Native Host dan IndexedDB (`BrowserAgentImagesDB`).
  - SQLite database hanya menyimpan `![prompt](local-img://img_xxx)`.
- **🧠 Persistent Brain & Autonomous AI Badges (`.item-tag-badge`)**:
  - Neon Blue (`rgba(59, 130, 246, 0.15)` / `#60a5fa`) untuk badge `🤖 Autonomous AI` pada skill dan agent yang diciptakan atau dimodifikasi sendiri oleh AI.
  - Emerald Green (`rgba(34, 197, 94, 0.1)` / `#86efac`) untuk solusi permanen pada kartu Anti-Pattern.
  - Red Rose (`rgba(239, 68, 68, 0.15)` / `#f87171`) untuk peringatan kesalahan masa lalu pada kartu Anti-Pattern.
  - Quick-access drawer button di header Side Panel dengan counter badge real-time (`#badge-brain-total-count`).

---

## 🍏 2. macOS-Style Full Rounded Glasses UI Specification

Standar visual navigasi dan kontrol antarmuka berbasis **Apple macOS (Big Sur / Sonoma / Sequoia)** dengan estetika *liquid frosted glass* dan bentuk kapsul bulat penuh (*full rounded capsule*):

### A. Full Rounded Capsule Geometry (`border-radius: 9999px`)
- **Pill Shape Standard**: Seluruh tombol navigasi sidebar (`.sidebar-nav-item`, `.sidebar-tab-btn`), chip mention (`.mention-chip`), dan header selectors (`.header-pill-btn`) wajib menggunakan `border-radius: 9999px !important`.
- **Slim Minimalist Height**:
  - Tinggi tombol navigasi: `height: 34px; min-height: 34px;`
  - Padding internal: `padding: 0 12px;`
  - Tipografi: `font-size: 12.5px; font-weight: 500; letter-spacing: -0.1px;`
  - Jarak antar ikon & teks: `gap: 9px;` hingga `gap: 10px;`

### B. Liquid Frosted Glass Translucency & States
1. **Active State (`.active`)**:
   - Background: `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%) !important`
   - Border Stroke: `1px solid rgba(255, 255, 255, 0.15) !important`
   - Inner Highlight & Shadow: `box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 10px rgba(0, 0, 0, 0.3) !important`
   - Blur Filter: `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);`
   - Text & Icon: `color: #FFFFFF !important; font-weight: 600;`
   - Icon Glow: `color: var(--accent-lime); filter: drop-shadow(0 0 6px rgba(206, 241, 40, 0.45));`
2. **Hover State (`:hover:not(.active)`)**:
   - Background: `rgba(255, 255, 255, 0.05) !important`
   - Border Stroke: `1px solid rgba(255, 255, 255, 0.08) !important`
   - Text & Icon: `color: #F8FAFC !important;`
   - Shadow: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);`
3. **Idle / Inactive State**:
   - Background: `transparent;`
   - Border Stroke: `1px solid transparent;`
   - Text & Icon: `color: #94A3B8;` (Icon: `#64748B`)

### C. Collapsed Sidebar Centering Architecture (58px Mini Dock)
- **Container Alignment**: Container `.sidebar-nav` menggunakan `align-items: center; width: 100%; padding: 10px 0 24px;`.
- **Perfect Circular Buttons**: Dalam posisi tertutup/sembunyi (*collapsed*), tombol navigasi menyusut menjadi lingkaran simetris `36px x 36px` (`border-radius: 50% !important; margin: 0 auto; justify-content: center; padding: 0 !important;`).
- **Brand Logo Centering**: Header `.sidebar-top` menggunakan `padding: 0 15px` (`(58px - 28px) / 2 = 15px`), sehingga logo "B" dan seluruh ikon di bawahnya tersusun 100% lurus simetris di tengah satu sumbu vertikal.
- **Smooth Adaptive Morph**: Saat di-hover (`width: 240px`), tombol melebar halus menjadi kapsul panjang dengan transisi `cubic-bezier(0.16, 1, 0.3, 1)`.

### D. Translucent Glass Capsule Badges (`.tab-btn-badge`)
- **Struktur**: `height: 18px; padding: 0 7px; border-radius: 9999px !important; font-size: 10.5px; font-weight: 700;`
- **Default Inactive**: `background: rgba(255, 255, 255, 0.07); color: #94A3B8; border: 1px solid rgba(255, 255, 255, 0.09);`
- **When Active**: `background: rgba(255, 255, 255, 0.16); color: #FFFFFF; border-color: rgba(255, 255, 255, 0.22);`
- **Persistent Brain Badge**: `background: rgba(59, 130, 246, 0.18) !important; color: #60A5FA !important; border: 1px solid rgba(59, 130, 246, 0.35) !important;`

### E. Section Headers & Dividers
- **Section Headers (`.sidebar-group-header`)**: `font-size: 9.5px; font-weight: 800; color: rgba(148, 163, 184, 0.5); letter-spacing: 1px; padding: 8px 12px 2px; text-transform: uppercase;`
- **Dividers (`.sidebar-divider`)**: `height: 1px; background: rgba(255, 255, 255, 0.07); margin: 6px 8px; border-radius: 1px;`

---

## 🧠 3. Persistent Memory & Brain Vault Glassmorphism Card System

Standar visual kartu (*content card*) pada halaman **Persistent Memory & Brain Vault** (`options.html` / Memory Drawer):

### A. Card Geometry & Frosted Blur Surface
- **Container (`.brain-card`)**:
  - Background: `rgba(22, 22, 29, 0.65)` dengan `backdrop-filter: blur(24px) saturate(180%)`.
  - Border: `1px solid rgba(255, 255, 255, 0.08)`.
  - Corner Radius: `border-radius: 20px`.
  - Padding: `18px 20px`.
  - Dimensi: `min-height: 250px; height: 100%;` (bebas dari scrollbar internal yang kaku dan sempit).
  - Bayangan & Hover: `box-shadow: 0 10px 30px -6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)`. Pada hover: `transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.2); background: rgba(30, 30, 40, 0.75)`.

### B. Full Rounded Header & Badges
- **Badge Capsules (`.brain-badge`)**: `border-radius: 9999px; font-size: 11px; font-weight: 600; padding: 4px 10px; backdrop-filter: blur(8px);`
- **Circular Delete Button (`.brain-delete-btn`)**: `width: 28px; height: 28px; border-radius: 50%;` dengan efek hover merah transparan.

### C. Clean Body & Multi-line Ellipsis
- **Title (`.brain-card-title`)**: `font-size: 15px; font-weight: 700; color: #F8FAFC; line-height: 1.35;`.
- **Description (`.brain-card-desc`)**: `font-size: 12.5px; color: #94A3B8; line-height: 1.55;` dengan `display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;` agar teks tampil rapi tanpa scrollbar sempit.

### D. Balanced Footer & Capsule Action Buttons
- **Footer Row (`.brain-card-footer`)**: `display: flex; justify-content: space-between; align-items: center; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px;`.
- **Action Pill Button (`.brain-card-action-btn`)**: `border-radius: 9999px; font-size: 11.5px; font-weight: 600; padding: 6px 14px;` dengan aksen border glow sesuai tipe item (Emerald untuk Skill, Purple untuk Agent, Amber untuk Training).
- **ID Badge (`.brain-card-id`)**: Kapsul monospace ramping ber-border halus (`padding: 3px 10px; border-radius: 9999px; max-width: 140px; text-overflow: ellipsis;`).

---

## 🔮 4. Tampilan & UI Preferences Bento Glass Container System

Standar visual kartu preferensi antarmuka pada view **Tampilan & UI** (`#tab-view-ui`):

### A. Bento Glass Container Geometry (`.bento-glass-card`)
- **Corner Radius**: `border-radius: 24px !important;` (24px Smooth Squircle Glass).
- **Surface**: `background: rgba(18, 18, 22, 0.72) !important;` dengan `backdrop-filter: blur(28px) saturate(180%) !important;`.
- **Border Stroke**: `1px solid rgba(255, 255, 255, 0.08) !important;`.
- **Internal Padding**: `padding: 24px 26px !important;`.
- **Elevation & Inner Highlight**: `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;`.

### B. Header Box & Vertical Centering Architecture
- **Header Container (`.card-header`)**: `display: flex; align-items: center !important; gap: 14px; margin-bottom: 20px;`.
- **Icon Box (`.header-icon-box`)**: `width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;`.
- **Title (`.card-header-text h2`)**: `font-size: 16px; font-weight: 700; color: #FFFFFF; line-height: 1 !important; margin: 0 !important; display: flex; align-items: center;` (100% presisi vertikal center sejajar kotak ikon).

### C. Full Rounded Pill Row Items (`.ui-pref-pill-row`)
- **Pill Geometry**: `border-radius: 9999px !important;` (Kapsul Bulat Penuh).
- **Height & Spacing**: `height: 52px; min-height: 52px; padding: 0 22px; margin-bottom: 0;`.
- **Surface**: `background: rgba(255, 255, 255, 0.035); border: 1px solid rgba(255, 255, 255, 0.07); backdrop-filter: blur(14px);`.
- **Interactive Hover**: `background: rgba(255, 255, 255, 0.065); border-color: rgba(255, 255, 255, 0.14); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); transform: translateY(-1px);`.
## 5. Zero-Emoji Mandate & Vector SVG Asset Architecture

### A. Aturan Baku Desain (Zero-Emoji Policy)
- **Haram Emoticon/Emoji Unicode**: Seluruh komponen antarmuka pengguna (UI), modal dialog, kartu metrik, badge, tombol kontrol, generator markdown, template preset, dan notifikasi sistem **DILARANG KERAS** menggunakan emoji Unicode (`🧠`, `🤖`, `⚡`, `⚙️`, `📚`, `⚖️`, `🔒`, `🌱`, `🔥`, `🪨`, `💬`, `💻`, `🛠️`, `🎯`, `🌐`, `📖`, `🛡️`, dll.). Penggunaan emoticon dinilai tidak profesional dan merusak estetika desain modern Dark Luxury.
- **Standar Grafis Vector SVG**: Setiap representasi grafis, icon penanda tipe data, dan tombol aksi wajib menggunakan **Vector SVG murni** (inline SVG atau file terisolasi di folder `extension/icons/svg/`).

### B. Dedicated Asset Directory (`extension/icons/svg/`)
Aset vector SVG disimpan secara modular dan terstruktur rapi:
- `brain.svg`: Simbol representasi Memori Utama / Obsidian Graph.
- `sparkle.svg`: Simbol AI / Autonomous Reasoning.
- `robot.svg`: Simbol Specialist & Autonomous Agents.
- `user.svg`: Simbol User Experience / Persona.
- `book.svg`: Simbol Training Corpus / Knowledge Base.
- `shield.svg`: Simbol Anti-Patterns / Guardrails.
- `bolt.svg`: Simbol Skills & Procedural Actions.
- `target.svg`: Simbol Goal Checklist Matrix & Milestone.
- `globe.svg`: Simbol Web Search & Browser Navigation.
- `file_doc.svg`: Simbol Dokumen / Google Docs.
- `file_sheet.svg`: Simbol Spreadsheet / Google Sheets.
- `folder.svg`: Simbol Direktori & Manajemen Berkas Lokal.
- `search.svg`: Simbol Riset & Filter Pencarian.

### C. Standard SVG Styling & Alignment
Semua icon SVG diintegrasikan dengan standar CSS:
```css
.ui-svg-icon {
  vertical-align: -1px;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

---

## 6. Unified Bento Hero Header Architecture (100% Consistent Across Tabs)

Seluruh view dan tab dalam halaman Pengaturan (`#tab-view-ai`, `#tab-view-agents`, `#tab-view-skills`, `#tab-view-memories`, `#tab-view-persistent-brain`, `#tab-view-ui`, `#tab-view-connected-apps`, `#tab-view-plugins`) wajib menggunakan standar container header yang seragam:

### A. Container Geometry & Material (`.bento-hero-provider-card`)
- **Background**: `rgba(18, 18, 22, 0.72)` dengan `backdrop-filter: blur(28px) saturate(180%)`.
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`.
- **Border Radius**: `20px` (Squircle Glass Card).
- **Padding**: `20px 24px`.
- **Box Shadow**: `0 10px 30px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)`.
- **Margin Bottom**: `20px`.

### B. Typography & Brand Grouping
- **Title (`.hero-provider-title`)**: `font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em; line-height: 1.25;`.
- **Description (`.hero-provider-desc`)**: `font-size: 12.5px; color: #94A3B8; margin-top: 3px; line-height: 1.4;`.

### C. Actions & Pill Buttons
- **Action Group (`.hero-provider-actions`)**: `display: flex; align-items: center; gap: 8px; flex-wrap: wrap;`.
- **Primary Add Pill (`.btn-add-primary`)**: `height: 34px; padding: 0 16px; border-radius: 9999px; font-weight: 700; font-size: 12.5px; background: var(--accent-lime); color: #0F172A; box-shadow: 0 2px 10px rgba(206, 241, 40, 0.25);`.

---

## 🔍 7. Search Glasses Full Rounded Bar & Multi-Column Grid Architecture

Standar visual, ukuran presisi, tata letak (*margins & paddings*), simetri vertikal, dan sistem keseragaman kontainer multi-kolom di halaman Pengaturan:

### A. Geometri & Dimensi Kapsul Penuh (`border-radius: 9999px`)
- **Container Box (`.glass-rounded-search-box` / `.brain-search-unified-box`)**:
  - `width: 100%;`
  - `box-sizing: border-box;`
  - `border-radius: 9999px !important;` (Bentuk Kapsul/Pill Penuh).
  - `height: 48px; min-height: 48px; max-height: 48px;`
  - `padding: 0 10px 0 18px;` (atau `0 6px 0 18px` jika menyertakan embedded view switcher).
  - `display: flex; align-items: center;`
  - `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);`
- **Search Wrapper (`.catalog-search-wrapper`)**:
  - `width: 100%;`
  - `box-sizing: border-box;`
  - `margin: 0;` (Jarak vertikal atas dan bawah dikendalikan secara deterministik via `gap: 20px` pada parent `.options-view` / `.connected-apps-view-section` sehingga jarak atas dan bawah selalu identik 20px).

### B. Material Kaca & Efek Interaktif (Liquid Glassmorphism)
- **Surface**: `background: rgba(18, 18, 22, 0.72);` dengan `backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);`.
- **Border**: `1px solid rgba(255, 255, 255, 0.08);`.
- **Elevation**: `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);`.
- **Focus Glow State (`:focus-within`)**:
  - Border: `border-color: var(--accent-lime) !important;` (`#CEF128`).
  - Glow: `box-shadow: 0 0 0 2px rgba(206, 241, 40, 0.15), 0 6px 20px rgba(0, 0, 0, 0.35) !important;`.

### C. Elemen Internal & Simetri Vertikal Presisi (100% Zero-Bias)
1. **Search Icon SVG (`.search-icon-svg`)**:
   - Dimensi: `16px x 16px` murni vector SVG (`stroke-width: 2.2`).
   - Warna: `color: var(--text-muted);` (`#94A3B8`).
   - Margin & Alignment: `margin-right: 12px; flex-shrink: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;`.
2. **Text Input (`.glass-rounded-search-input` / `.brain-search-unified-input`)**:
   - `flex: 1;`
   - `background: transparent !important;`
   - `border: none !important;`
   - `outline: none !important;`
   - `padding: 0 12px 0 0 !important;`
   - `height: 100% !important;`
   - `line-height: 48px !important;` (Menjamin teks input berada persis di titik tengah sumbu vertikal container).
   - `font-size: 13px;`
   - `color: #FFFFFF;`
   - `font-family: inherit;`
   - Placeholder: `color: var(--text-muted); font-size: 13px;`.
3. **Embedded View Switcher (`.brain-view-switcher-embedded .brain-view-mode-btn`)**:
   - `height: 36px;`
   - `padding: 0 16px;`
   - `border-radius: 9999px;`
   - `margin: auto 0;` (Menciptakan ruang simetris atas-bawah persis $(48\text{px} - 36\text{px})/2 = 6\text{px}$).
4. **Clear Button (`.btn-clear-search`)**:
   - `width: 28px; height: 28px; padding: 0;`
   - `border-radius: 9999px;`
   - `background: transparent; border: none; color: var(--text-muted); cursor: pointer;`
   - Hover: `color: #FFFFFF; background: rgba(255, 255, 255, 0.08);`.
5. **Statistik Hasil Pencarian (`.search-result-stats`)**:
   - `font-size: 11.5px; color: var(--text-muted); margin-top: 8px; margin-left: 18px;`

### D. Standar Multi-Column Responsive Grid (Anti 1-Baris Kebawah)
Katalog kartu DILARANG disusun dalam bentuk 1 kolom tunggal (stack block), melainkan wajib menggunakan responsive multi-column grid:
1. **Connected Apps & Integrations (`.connected-apps-grid`)**:
   - `display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; width: 100%; box-sizing: border-box;`
2. **Plugin Ecosystem & Optimizers (`.plugins-grid`)**:
   - `display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; width: 100%; box-sizing: border-box;`
3. **Brain Cards & Management (`.brain-cards-grid`, `.items-cards-grid`, `.item-cards-grid`)**:
   - `display: grid; grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)); gap: 16px; width: 100%; box-sizing: border-box; align-items: stretch;`
4. **Bento 2-Columns Preferences (`.bento-grid-2col`)**:
   - `display: grid; grid-template-columns: 1fr 1fr; gap: 18px; width: 100%; box-sizing: border-box;` (Mobile: `1fr`).
5. **Main Content Container Frame (`.options-main-content`)**:
   - `max-width: 1240px; margin: 0 auto; padding: 28px 36px 60px; width: 100%; box-sizing: border-box;`
6. **Harmonisasi Gap Vertikal (100% Identik Atas & Bawah)**:
   - Semua `.options-view` dan `.connected-apps-view-section` menggunakan `display: flex; flex-direction: column; gap: 20px; width: 100%; box-sizing: border-box; margin: 0;`.
   - Seluruh hero card (termasuk `.brain-hero-card` dan `.bento-hero-provider-card`) dan wrapper search bar (`.catalog-search-wrapper`) wajib menggunakan `margin: 0;` sehingga jarak vertikal atas (dari kartu header) dan jarak bawah (ke kartu grid) adalah **persis 20px sama rata tanpa deviasi**.
7. **Clean Text Action Buttons (No Icon Standard)**:
   - Tombol aksi pada kartu Connected Apps (`.btn-glass-action`) menggunakan teks ringkas **`Settings`** murni tanpa icon chevron/panah (`>`), dengan padding simetris `8px 18px` dan border-radius `9999px`.
8. **Connected Apps Sub-Views Normalization & Seamless 48px Subnav (`#connected-app-telegram-detail` & `#connected-app-google-workspace-detail`)**:
   - Seluruh sub-view konfigurasi mengalir menggunakan flex `gap: 20px` tanpa inline `margin-top` / `margin-bottom` manual.
   - Posisi kartu hero (`.bento-hero-provider-card`) tetap berada di paling atas (posisi 1) seperti halaman utama Hub Catalog.
   - Posisi ke-2 menggunakan Bar Navigasi Kaca Terpadu (`.connected-app-detail-subnav`) dengan **tinggi persis 48px, border-radius 9999px, padding simetris, dan gap 20px** yang 100% identik dengan Search Bar di halaman Home.
   - Di dalam `.connected-app-detail-subnav`:
     - Sisi Kiri: Tombol Back (`.btn-subnav-back`) dengan ikon chevron halus dan border-radius 9999px.
     - Sisi Kanan: Breadcrumb navigasi (`.subnav-breadcrumb`) yang informatif dan elegan.
   - Transisi antara Home Catalog (Search Bar) dan Detail View (Subnav Bar) menjadi **100% seamless tanpa pergeseran layout (zero layout shift)**.
   - Kartu kiri dan kanan dalam `.bento-grid-2col` diatur dengan `height: 100%; align-items: stretch;` dan container log auto-grow agar kedua kolom selalu setinggi dan sejajar rapi.
   - Tombol aksi Telegram dikelompokkan dalam `.telegram-action-buttons-wrap` (`height: 38px`, pills `9999px`, transisi halus).
   - Seluruh switch preferensi menggunakan kapsul modern iOS/Bento `.custom-pill-switch`.

### E. Universal Search Bar Deployment Across All Settings Menus (7 Menu Standar)
Seluruh 7 menu utama di halaman Pengaturan dilengkapi Search Bar Full Rounded (`height: 48px`, symmetric `padding: 0 10px 0 18px`, equal `20px` top & bottom distance, live real-time filtering):
1. **Multi-Agent Management (`#search-agents-input`)**: Live search sub-agent, nama, peran, dan prompt spesialis.
2. **Skills Catalog (`#search-skills-input`)**: Live search katalog skill, SOP, dan procedural tools.
3. **Memories Management (`#search-memories-input`)**: Live search aturan permanen & preferensi pengguna.
4. **Persistent Brain Vault (`#search-brain-input`)**: Unified search + embedded dual view switcher capsule (`Grid Cards` & `Neural Graph`).
5. **Tampilan & UI (`#search-ui-input`)**: Live search preferensi tema, animasi, efek glass blur, shadow, glow, dan switch interaktif.
6. **Connected Apps Hub (`#search-connected-apps-input`)**: Live search aplikasi terhubung (Telegram Bot, Google Workspace, WhatsApp, Webhook, Companion).
7. **Plugin Ecosystem (`#search-plugins-input`)**: Live search plugin modular & token optimizer (Ponytail, KV Cache, Caveman, Claude Fable, Claude Opus 5).

---

## ⚡ 8. Dual Performance Optimization Switches (Low-Spec Hardware Mode)

Untuk menjamin performa super lancar dan bebas lag pada perangkat PC / laptop dengan spesifikasi rendah atau akselerasi hardware terbatas:
1. **Efek Bayangan (Box Shadows & Glow - `#setting-ui-shadows`)**:
   - **ON (Default)**: Visualisasi efek neon glow `#CEF128`, ambient card shadow, dan elevation depth.
   - **OFF**: Mengaktifkan kelas `.no-shadows` di `body` & `html` (`box-shadow: none !important; text-shadow: none !important; filter: none !important;`).
2. **Efek Kaca Transparan (Liquid Glass Blur - `#setting-ui-glass-blur`)**:
   - **ON (Default)**: Material Liquid Glassmorphism dengan `backdrop-filter: blur(16px)` dan transparansi kaca `rgba(18, 18, 22, 0.72)`.
   - **OFF (Opaque Low-Spec Mode)**: Mengaktifkan kelas `.no-glass-blur` di `body` & `html` (`backdrop-filter: none !important;`), mengganti seluruh permukaan kartu kaca menjadi warna solid gelap matte (`background: #141419 !important; background-color: #141419 !important;`), menghilangkan beban GPU rasterization/compositing secara total sehingga rendering 100% ringan, instan, dan bebas lag.

---

## 📌 9. Fixed Pinned Sidebar & Independent Viewport Scroll Architecture

Untuk menjamin navigasi sidebar selalu terlihat dan tidak pernah terdorong keluar layar saat konten utama di-scroll:
1. **Root Viewport Locking (`html, body.options-body`)**: Mengunci tinggi `100vh` dengan `overflow: hidden;` sehingga window/viewport tidak pernah melakukan scroll secara global.
2. **Fixed Pinned Sidebar (`.options-sidebar`)**: Sidebar berukuran `width: 240px; height: 100vh; flex-shrink: 0;` terkunci permanen di sisi kiri. Jika daftar navigasi melebihi tinggi layar, kontainer internal `.sidebar-nav-scroll` melakukan scrolling secara mandiri (`overflow-y: auto;`).
3. **Independent Main Content Viewport (`.options-main-content`)**: Kontainer utama berukuran `flex: 1; height: 100vh; overflow-y: scroll; scrollbar-gutter: stable;` menggulirkan konten kartu secara independen tanpa memengaruhi posisi sidebar.
4. **Canonical Width Normalization (`.options-view`)**: Setiap view (`#tab-view-ai`, `#tab-view-agents`, `#tab-view-skills`, `#tab-view-memories`, `#tab-view-persistent-brain`, `#tab-view-ui`, `#tab-view-connected-apps`, `#tab-view-plugins`) memiliki `max-width: 1240px; margin: 0 auto; width: 100%;` untuk menjamin posisi batas kiri dan kanan 100% simetris dan seamless di seluruh menu.

---

## 🧠 10. Resilient Brain & Skills Data Parsing Standard

1. **Automatic Filename Stem ID Fallback**: Pada RPC Native Host (`list_skills`, `list_agents`, `list_memories`), file Markdown tanpa metadata `id:` otomatis mengadopsi nama file sebagai `id` dan `name` sehingga tidak menghasilkan tag kosong (`<code></code>`).
2. **Defensive Filtering in UI Renderers**: Seluruh fungsi render kartu di `options.js` (`renderPersistentBrain`, `renderSkillsCards`, `renderAgentsCards`, `renderMemoriesCards`) menyaring baris kosong/null (`filter(item => item && (item.id || item.name))`) dan memberikan fallback nama & ID yang aman (`itemId`, `itemName`, `skillId`, `agentId`).
3. **Database Ghost Row Protection**: SQLite database `chat_history.db` secara ketat dibersihkan dari baris dummy tanpa ID / nama untuk menjaga tampilan Persistent Memory selalu bersih, valid, dan bebas anomali visual.

---

## 🏛️ 11. Claude Opus 5 Distill Plugin & Mutual Exclusivity Architecture

1. **Dark Luxury Terracotta Palette**: Kartu `.plugin-card-opus-5` menggunakan gradien `linear-gradient(135deg, rgba(45, 22, 14, 0.4) 0%, rgba(20, 10, 6, 0.6) 100%)` dengan border terracotta `rgba(217, 119, 87, 0.28)` dan aksen hover `#FF8A65`.
2. **Autonomous Memory Filesystem & Obsidian Taxonomy**: Penataan memori modular (`/profile.md`, `/topics/`, `/areas/`, `/people/`, `/preferences.md`) dengan tag wajib `- [stated]` dan tautan entitas ganda `[[entitas]]`.
3. **Zero Forbidden Memory Phrases**: Integrasi mulus tanpa kalimat meta-komentar *"Berdasarkan ingatan saya..."* atau *"From memory..."*.
4. **Mutual Exclusivity Switch State**: Mengunci status switch antara **Claude Opus 5** dan **Claude Fable 5** (jika salah satu dinyalakan, yang lain otomatis dimatikan) untuk menjaga orkestrasi directive AI tetap bersih tanpa benturan kognitif.

---

## 🎨 12. Mode Label Minimalism & Adaptive Narrow Input Architecture (v2.150.195)

1. **Ultra-Clean Mode Labels**: Menghilangkan kata "Mode" dari seluruh pemicu dan menu dropup:
   - `Agent Mode` → `Agent`
   - `Chat Mode` → `Chat`
   - `Design Mode` → `Design`
2. **Adaptive Narrow Input Toolbar**:
   - Baris atas prompt box (`.chat-input-header`): Dioptimalkan agar hanya menyisakan tombol trigger Mode di pojok kiri atas dan tombol trigger Thinking di pojok kanan atas (`.chat-input-header-right`). Menu dropup Thinking di-anchor ke kanan (`right: 0; left: auto;`).
   - Baris bawah prompt box (`.chat-input-bottom-actions`): Tombol `System Design Auto` (`#design-system-dropup-wrapper`) dipindahkan ke samping kanan tombol lampiran file `+` (`#btn-attach-file`) dengan `gap: 6px;` dan anchor menu ke kiri (`left: 0; right: auto; z-index: 500;`), mencegah tabrakan saat Canvas dibuka atau sidepanel berukuran sempit.
3. **Pixel-Perfect 2-Pane Executive Presentation UI**:
   - Sidebar kiri `#0B0C10` dengan active thumbnail miniature scaled 1:8 (`.thumb-mini-slide`), white border & glow.
   - Stage 16:9 warm paper `#F5F3EF`, Google Font `Syne` (800) display headers, 3-column bento cadence (`#FF4D00`, `#0284C7`, `#111827`), white rounded takeaway cards, 2-line bottom footer, dan obsidian floating dock.
   - `@media print` 1 halaman utuh per slide untuk ekspor PDF instan.

---

## 🖥️ 13. Canvas Design Session Persistence & Rehydration Standard (v2.150.196)

1. **Host RPC Full Artifact Preservation**:
   - `prune_messages_for_rpc` pada binary Rust `browser_agent_host` dan Python `native_host.py` secara ketat melestarikan `designArtifact` (termasuk HTML mandiri, metadata, warna, swatch, dan tag), `chatMode`, serta `rawContent`.
2. **Resilient Client-Side Rehydration**:
   - `renderMessageSliceIntoDOM` di `sidepanel.js` mendeteksi peran presentasi dan merender kartu `.opendesign-result-card` interaktif di gelembung pesan.
   - Mekanisme self-healing otomatis merekonstruksi artefak slide deck 16:9 via `buildExecutiveSlideDeckHtml` jika sesi histori lama kehilangan artefak.
3. **Seamless Auto-Restore on Refresh**:
   - Status `last_active_session_id` disimpan di storage lokal dan otomatis direhidrasi saat startup `bootstrap()`, menjaga kesinambungan chat dan Canvas tanpa reset manual.

---

## 🎨 14. Dual Master Agent Working UI & Modular Design System (v2.150.197)

1. **Dual Master Agent Collaborative Hierarchy**:
   - **👑 Master Agent** (*Supreme Commander & Chief Orchestrator*): Memegang jabatan tertinggi (Level 1), menganalisis brief pengguna, memimpin strategi konseptual, mendelegasikan perancangan slide ke Master Design, dan melakukan audit akhir kelayakan artefak.
   - **🎨 Master Design** (*Lead Creative Director & Slide Architect*): Tangan kanan Master Agent yang menguasai eksekusi visual, layout bento grid 16:9 widescreen, GSM brand visual v3.0, Dark Luxury typography, dan interaktivitas canvas drawer.

2. **Full AI Working UI Components**:
   - **Header Hirarki Agen** (`.agent-hierarchy-block`):
     * Boss chip: `👑 Master Agent` (`.agent-boss-chip`) dengan status aktif dan badge "Supreme Orchestrator".
     * Tree branch: `.agent-tree-branch-container` dengan item `🎨 Master Design` (`.tree-agent-card`) yang berganti status real-time (`Siap Kerja` → `Bekerja...` → `Selesai`).
   - **Rencana & Jadwal Tugas** (`.task-schedule-wrapper`):
     * Milestone 1: 👑 Master Agent: Analisis Brief & Strategi Konseptual
     * Milestone 2: 🤝 Delegasi ke Master Design: Penataan Layout & GSM Brand
     * Milestone 3: 🎨 Master Design: Sintesis Konten 16:9 Widescreen & Struktur Bab
     * Milestone 4: 🎨 Master Design: Penerapan Dark Luxury Typography & Visual Polish
     * Milestone 5: 👑 Master Agent: Review Kualitas, Anti-Slop Audit & Final Approval
   - **Langkah Tindakan Tool Interaktif** (`.tool-section-wrapper`):
     * `delegate_to_master_design` (👑 Master Agent): Hand-off brief dan parameter visual ke Master Design.
     * `synthesize_executive_slides` (🎨 Master Design): Pembentukan kode HTML 16:9 dan komponen bento cards.
     * `audit_and_approve_artifact` (👑 Master Agent): Validasi anti-slop, kepatuhan GSM v3.0, dan rasio widescreen.

3. **Modular Architecture Map (`extension/design/`)**:
   - `design_agent.js`: Metadata, persona, hirarki agen, dan generator milestone.
   - `slide_deck_engine.js`: Mesin kompilasi slide 16:9, konverter, dan upgrader layout.
   - `design_prompt.js`: Prompt kolaborasi 2 agen, regex extractor, dan summary chat builder.
   - `canvas_manager.js`: UI result card, virtual files, auto-linter, export engine, dan modal drawer controller.
   - `design_executor.js`: Loop eksekusi `runDesignModeLoop`, state manager, dan streaming bridge.

---

## 🧭 15. Contextual Thinking Trigger Placement & Toolbar Rhythm (v2.150.198)

1. **Agent & Chat Mode Top-Bar Rhythm**:
   - `.chat-input-header-left`: Menampung tombol pemicu mode (`[ Agent ⌵ ]` / `[ Chat ⌵ ]`) dan tombol pilihan Thinking (`[ Thinking: Extreme ⌵ ]`) berdampingan dengan `gap: 6px;` (Sidepanel) dan `gap: 8px;` (NewTab).
   - `.chat-input-header-right`: Dikhususkan untuk tombol status eksekusi: `[ Switch Tab: ON/OFF ]` dan `[ Accept ]`.
2. **Design Mode Top-Bar Rhythm**:
   - `.chat-input-header-left`: Menampung pemicu mode `[ Design ⌵ ]`.
   - `.chat-input-header-right`: Menampung pemicu Thinking (`[ Thinking: Extreme ⌵ ]`) di pojok kanan atas.
   - `.chat-input-bottom-actions`: Menampung tombol `System Design Auto` di samping tombol lampiran `+`.
3. **Adaptive Menu Anchoring**:
   - `.chat-input-header-left .thinking-level-dropup-menu`: Menggunakan `left: 0; right: auto;` sehingga menu memanjang ke kanan ke area terbuka prompt box.
   - `.chat-input-header-right .thinking-level-dropup-menu`: Menggunakan `right: 0; left: auto;` sehingga menu mengikat ke tepi kanan tanpa overflow.

---

## 🖼️ 16. Canvas Drawer Minimalism & True 16:9 Slide Thumbnails (v2.150.200)

1. **Canvas Drawer UI Declutter**:
   - Menghapus `.opendesign-canvas-footer`: Seluruh area footer drawer (Anti-Slop score badge, tombol linter, dan dropdown export) dieliminasi. Area pratinjau kanvas `.opendesign-canvas-body` kini membentang penuh ke dasar panel dengan `flex: 1; min-height: 0;`.
   - Menghapus `#canvas-system-badge`: Badge `🎨 Executive Editorial 16:9` pada `.canvas-header-meta` dihilangkan, menyisakan judul `.canvas-design-title` yang bersih, lapang, dan elegan di header bar.
2. **Clean Sidebar Thumbnails (Zero Brand Clutter)**:
   - Sidebar presentasi `.deck-sidebar` (`#0B0C10`, lebar 156px) murni menampilkan deretan thumbnail bernomor (`1`, `2`, `3`...).
   - Dilarang keras menampilkan judul arsip/brand tambahan (seperti *"FELINE ARCHIVE"* atau subjudul) di atas sidebar.
3. **Pixel-Perfect 16:9 Thumbnail Miniatures**:
   - Miniatur `.thumb-card` (108px x 60.75px) beresolusi 16:9 memuat representasi nyata dari slide (`.thumb-mini-slide`, 864px x 486px scaled `0.125`).
   - Active state `.thumb-item.active .thumb-card` memiliki border putih solid (`#FFFFFF`) dan bayangan lembut (`box-shadow: 0 0 14px rgba(255, 255, 255, 0.35)`).

---

## 🎮 17. Bulletproof Slide Deck Navigation & UI Cleanliness Standard (v2.150.201)

1. **Single-Source Event Delegation Navigation**:
   - Menggunakan delegasi event tunggal pada level dokumen iframe (`document.addEventListener('click')`) yang mencocokkan target melalui `e.target.closest()`.
   - Mengeliminasi double-invocation / skipping slide yang sebelumnya terjadi akibat tumpukan inline `onclick` dan element listener ganda.
   - Child click interception diatasi secara tuntas melalui CSS `.thumb-item * { pointer-events: none; }` dan `.dock-btn * { pointer-events: none; }`.
2. **Zero-Emoji Flyout Submenu Protocol**:
   - Menghilangkan semua ikon emoji (`🖥️`, `🌐`, `📊`) dari flyout submenu opsi Design di `sidepanel.html` dan `newtab.html`.
   - Tampilan flyout submenu kini mengusung tipografi murni (*clean text & status badge*) dengan gaya minimalis gelap mewah.
3. **Contextual Thinking Visibility Guard**:
   - Menu Thinking (`#thinking-level-dropup-wrapper`) otomatis disembunyikan (`display: none`) saat berpindah ke mode `Web Search`.
   - Tetap aktif dan tertata rapi (`display: inline-flex`) pada mode `Agent`, `Chat`, dan `Design`.

---

## 🎨 18. In-Place Live Canvas Revision & Same-Origin Navigation Guard (v2.150.202)

1. **Parent-Controlled Same-Origin Iframe Navigation Guard**:
   - Injeksi script navigasi tangguh dari window parent (`attachSlideDeckController`) ke `iframe.contentDocument` saat iframe event `load` dan assign `srcdoc`.
   - Penegasan pointer-events `.thumb-item * { pointer-events: none !important; }` dan `.dock-btn * { pointer-events: none !important; }` menjamin klik thumbnail maupun anak tombol selalu memicu pergantian slide.
   - Mengontrol state slide aktif (`.slide-section.active` display flex) dan nomor counter dock secara sinkron.
2. **In-Place Live Canvas Revision Protocol**:
   - Saat Canvas Drawer aktif (`isCanvasOpen()`), setiap input chat yang dikirim diarahkan otomatis ke proses revisi kanvas in-place tanpa membuat card kanvas baru yang terpisah.
   - Status badge kartu chat bertransformasi menjadi `Live Updated` berwarna hijau zamrud (`#34D399`) dengan tombol aksi `View Updated Canvas ↗`.
   - Live iframe reload, pembaruan kode di Code Tab, pembaruan Virtual Files di Files Tab, dan toast feedback `✅ Canvas aktif berhasil diperbarui!` bekerja secara real-time.

---

## 🌈 19. Adaptive Multi-Theme Archetypes & Strict Contextual Branding Standard (v2.150.203)

1. **Adaptive Thematic Archetypes (7 Design System Archetypes)**:
   - `playful_pastel`: Soft warm ivory canvas (`#FFFDF9`), playful coral accents (`#FF6B6B`), mint (`#4ECDC4`), font `Outfit`/`Plus Jakarta Sans`, 16px soft rounded cards. Ideal untuk topik hewan peliharaan, anak-anak, resep, kuliner, dan gaya hidup.
   - `dark_luxury_cyber`: Deep obsidian canvas (`#0A0D14`), dark slate card boxes, neon cyan (`#06B6D4`) & electric emerald accents, font `JetBrains Mono`/`Space Grotesk`. Ideal untuk AI, LLM, coding, cloud, DevOps, dan web3.
   - `swiss_minimalist`: Crisp off-white canvas (`#F8F9FA`), razor-sharp borders (6px radius), deep navy/slate & cobalt blue accents, font `Inter`/`Space Grotesk`. Ideal untuk laporan keuangan, audit, perbankan, hukum, dan enterprise B2B.
   - `neo_brutalist`: High-contrast energetic cream (`#FFFDF9`), bold black borders (2px solid), electric orange (`#FF4D00`) & acid lime, font `Syne`/`Space Grotesk`. Ideal untuk startup pitch decks dan kampanye viral Gen-Z.
   - `botanical_sage`: Calming pale sage canvas (`#F3F7F4`), forest slate text, botanical green accents (`#059669`), font `Plus Jakarta Sans`. Ideal untuk kesehatan, medis, yoga, nutrisi, dan lingkungan.
   - `monochrome_minimal`: Stark noir canvas (`#141414`), white text, chrome silver accents, font `Space Grotesk`/`Inter`. Ideal untuk fashion, arsitektur, seni, dan fotografi.
   - `warm_editorial`: Warm linen canvas (`#F5F3EF`), terracotta accents (`#FF4D00`), font `Syne`/`Plus Jakarta Sans`. Ideal untuk sastra, manifesto, dan studi panjang.

2. **Intelligent "Mikir Keras" Style Deduction**:
   - Jika pengguna menentukan tema (misal: "pastel", "neon cyber", "brutalis"), sistem mematuhinya 100%.
   - Jika tidak ditentukan, fungsi `detectOptimalSlideTheme` mengekstrak domain subjek materi dan memilih arketipe paling harmonis secara otonom.

3. **Strict Brand Integrity & Contextual Footer Standard**:
   - Menghapus total teks palsu: `DJADI CREATIVE`, `GSM v3.0`, `CONFIDENTIAL // ENTERPRISE`, `"DJ" → JADI`, dan `TERWUJUD & SELESAI`.
   - Header Bab: `BAB {I} // {TOPIK MATERI NYATA} // {SUBHEADER TEMATIK}`.
   - Footer: `© 2026 {TOPIK / BRAND} • MATERI PRESENTASI RESMI` dan `.footer-status-tag` tematik (misal: `PANDUAN & ENSIKLOPEDIA`, `EDUKASI & SAINS`).
   - Card Highlight Box: Ditarik langsung dari intisari pilar kartu nyata.

## 📐 20. Sub-1000 Lines Modular Architecture & Compact Mode Dropup UI (v2.150.204)

1. **Prompt Visibility in Design Mode**:
   - `design_executor.js` memanggil `appendUserMessage(userMessage, attachments)` dan memperbarui `conversationHistory` di awal `runDesignModeLoop`. Gelembung chat pertanyaan pengguna tidak pernah lagi hilang/blank.

2. **Ultra-Compact Mode Dropup Selector**:
   - Menghapus flyout submenu kanan dan chevron pada opsi `Design`.
   - Menyetel dropup `min-width: 116px`, `padding: 4px`, `border-radius: 14px`, `gap: 2px`.
   - Opsi mode `Agent`, `Chat`, dan `Design` tampil ramping dan padat (`height: 28px`, `font-size: 11.5px`).

3. **Modular Sub-1000 Lines Design Architecture**:
   - `slide_themes.js` (209 lines): 7 visual design archetypes & intelligent detector.
   - `slide_template.js` (856 lines): 16:9 widescreen HTML builder, CSS variables & live thumbnails.
   - `slide_deck_engine.js` (359 lines): Markdown parser, slide HTML extractor & interactive upgrader.
   - `canvas_exporter.js` (153 lines): ZIP bundle, standalone HTML, PDF & PNG exporter.
   - `canvas_manager.js` (752 lines): Drawer UI, tab view, virtual files, iframe sandbox & in-place updater.
   - `design_executor.js` (517 lines): Execution loop, streaming milestones & toast dispatch.
   - `design_prompt.js` (178 lines): System prompt & meta extractor.
   - `design_agent.js` (78 lines): Agent metadata & tools declaration.

## 🚀 21. Floating Dock Export Dropup & Native Background 16:9 Vector PDF Engine (v2.150.205)

1. **Floating Navigation Dock Export Dropup**:
   - Tombol lama `PDF P` direfactor menjadi tombol `Export ⌵` dengan dropup menu akrilik elegan (`.dock-export-menu`).
   - Opsi aktif: `Export PDF Slide` dilengkapi badge hijau `Vektor 16:9` dan ikon SVG dokumen.
   - Opsi non-aktif: `Export PPTX (Soon)`, `Export HTML (Soon)`, `Export PNG (Soon)`.
   - Menutup otomatis saat klik di luar menu. Didukung keyboard shortcut `E` (toggle menu) dan `P` (ekspor PDF langsung).

2. **Native Background Vector 16:9 PDF Engine**:
   - Handler RPC `export_slide_deck_pdf` pada Rust Native Host binary (`browser_agent_host`) dan Python (`native_host.py`).
   - Eksekusi background via headless Chrome (`--print-to-pdf`, `--no-pdf-header-footer`).
   - Dimensi cetak: 1152 x 648 pt (rasio 16:9 widescreen presisi tinggi).
   - Teks, font, dan elemen vektor tertanam sebagai vektor murni (ukuran berkas kecil ~100-140 KB, tidak pernah pecah). Gambar raster dirender dalam resolusi tajam asli.
   - Seluruh halaman diekspor otomatis tanpa memotong atau mengubah tampilan preview.

3. **Sub-800 Line Modularization Mastery**:
   - `slide_styles.js` (697 baris): Pembangun CSS lengkap (theme tokens, floating dock, layout grid, dan aturan `@media print` 16:9).
   - `slide_template.js` (413 baris): Generator HTML, miniature thumbnails bar, dan lifecycle controller.
   - `canvas_manager.js` (798 baris): Modular event delegation dan DOM synchronization.
   - Seluruh 9 file di folder `extension/design/` terverifikasi ketat di bawah 800 baris.

## 🚀 22. All-Slides Sequential 16:9 Vector PDF Pagination & Crisp Sidebar Thumbnails (v2.150.206)

1. **Sequential All-Slides Print Engine**:
   - Isolasi aturan interaksi slide stage `.slide-section { display: none !important; }` ke dalam `@media screen { ... }` pada `canvas_manager.js` dan `slide_styles.js`.
   - Sanitasi berlapis pada `canvas_exporter.js`, Python host (`native_host.py`), dan Rust Native Host (`browser_agent_host`): otomatis membuang tag gaya interaktif `#slide-deck-controller-style` dan menyuntikkan `<style id="bulletproof-pdf-print-pagination">`.
   - Menjamin 100% halaman slide terpaginasi urut dari 1 sampai akhir dalam satu berkas PDF 16:9 widescreen (1152 x 648 pt) tanpa memotong slide pasif.

2. **Crisp Sidebar Thumbnails Styling**:
   - Mengganti aturan `.thumb-card` yang sebelumnya `border-radius: var(--card-radius)` (hingga 16px pada tema soft/pastel) menjadi `border-radius: 5px;` dan `.thumb-mini-slide-wrap` `border-radius: 4px;`.
   - Mencegah bentuk kartu thumbnail lonjong / kapsul, menghasilkan tampilan galeri slide yang rapi, tajam, dan profesional.

## 🚀 23. Design Mode Chat History Persistence & Real-Time Sync (v2.150.207)

1. **Design Mode Lifecycle Session Initialization**:
   - Fungsi global `ensureCurrentSessionInitialized` (`sidepanel.js`) menjamin `currentSessionId`, `currentSessionTitle`, dan timestamp terbuat secara deterministik di awal siklus pembuatan slide.
   - Mengatasi isu null-session yang sebelumnya memblokir penyimpanan otomatis ke SQLite dan `chrome.storage.local`.

2. **Real-Time Title & State Synchronization**:
   - Judul sesi otomatis diperbarui dari metadata slide (`meta.title`) saat perakitan selesai.
   - Laci riwayat chat (`openHistoryModal`) secara otomatis memanggil `saveCurrentSessionToDB()` sebelum membaca daftar riwayat, memastikan sesi pembuatan slide langsung terlihat di kartu riwayat.

## 🚀 24. Minimalist Queue Morphing Button UI (v2.150.208)

1. **Queue Button Visual Streamlining**:
   - Mengeliminasi ikon SVG `+` dan prefix `Add to ` dari tombol `.btn-queue-morph-label`.
   - Menampilkan label teks `"Queue"` bersih dengan font size 11px weight 800.
   - Mengoptimalkan lebar pill morphing `.has-queue-input` (`min-width: 82px` di sidepanel dan `90px` di newtab) sehingga pas dan proporsional.
   - Seluruh animasi stickman face morphing (`.gen-morph-container`), ekspresi alis/mata, dan interaksi cancel tetap berfungsi 100%.

## 🚀 25. Graceful Design Mode Cancellation & True 16:9 Flush Canvas PDF Margins (v2.150.209)

1. **Graceful Design Mode Cancellation**:
   - Deteksi `isAbort` komprehensif pada blok `catch` di `design_executor.js` untuk menangkap `AbortError`, `DOMException: BodyStreamBuffer was aborted`, dan `!isExecuting`.
   - Mengubah status agent menjadi `Dihentikan` (Canceled), menghentikan milestone yang sedang berjalan (`inProgress = false`), dan menampilkan notifikasi ramah tanpa kotak merah error `[object DOMException]`.
   - Menyimpan percakapan parsial ke riwayat chat secara konsisten.

2. **True 16:9 Flush Canvas PDF Margins**:
   - Menghapus penumpukan padding ganda pada cetak PDF: mengubah `.slide-section` dari `padding: 40px 48px !important;` menjadi `padding: 0 !important; margin: 0 !important;`.
   - Menambahkan `box-sizing: border-box !important;` pada `.slide-canvas` sehingga kanvas slide menyentuh batas 16in x 9in secara flush dengan padding internal asli (`36px 48px`), identik 100% dengan tampilan preview canvas di layar tanpa margin kosong/zoom out berlebih.
   - Sinkronisasi CSS paginasi cetak pada `slide_styles.js`, `canvas_exporter.js`, `native_host.py`, dan binary Rust Host `browser_agent_host`.

## 🚀 26. Clean Floating Dock PDF Slide Deck Menu Item UI (v2.150.210)

1. **Clean Minimalist Export Menu Item**:
   - Menghapus badge hijau `Vektor 16:9` (`.export-item-badge`) pada item ekspor PDF di menu dropup floating dock (`.dock-export-menu`).
   - Memperbarui label item menjadi langsung dan bersih: `"PDF slide deck"` (`.export-item-label`).
   - Mempertahankan integrasi RPC ekspor PDF di latar belakang via headless Chrome dan pintasan keyboard `E` serta `P`.





