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

## 🚀 27. Canvas Mode Input Prompt Right Edge Alignment (v2.150.211)

1. **Input Box Geometry Realignment (`newtab.css`)**:
   - Memperbarui lebar kotak prompt saat `body.canvas-active` dari `408px` menjadi `424px` (`width: 424px !important; max-width: 424px !important;`).
   - Dengan `left: 74px`, sisi kanan kotak prompt bergeser dari 482px ke 498px, sejajar rata dengan batas sisi kanan kartu pesan dan gelembung chat pengguna (*user bubble*), mengeliminasi celah asimetris 16px di sebelah kanan.

## 🚀 28. Text-Only Ultra-Clean Floating Dock Export Menu (v2.150.212)

1. **Text-Only Floating Dock Menu**:
   - Menghapus pembungkus ikon SVG dokumen pada item menu ekspor floating dock (`.dock-export-menu`), menyajikan opsi murni berbasis tipografi: `<span class="export-item-label">PDF slide deck</span>`.
   - Mengoptimalkan `min-width` menu popover akrilik dari 210px menjadi 146px di `slide_styles.js` agar pas, proporsional, dan minimalis.

## 🚀 29. Dynamic Multi-Layout Slide Deck Architecture & Anti-Template Sidebar Miniatures (v2.150.213)

1. **Separation of System Chrome vs Dynamic Slide Content**:
   - UI sistem ruang kerja pratinjau (`#deck-stage-wrap`, `#deck-sidebar`, `.deck-floating-dock`) adalah UI sistem yang stabil dan seragam di semua presentasi.
   - Kanvas slide (`.slide-canvas`) kini dirancang dinamis dengan berbagai variasi arketipe tata letak yang dipilih cerdas oleh AI:
     - **Cover / Hero Title (`.slide-layout-cover`)**: Judul display besar (42-46px), lead subtitle/abstrak, dan metadata dokumen/slide tanpa grid 3-kolom kaku.
     - **Split 2-Column (`.slide-layout-split`)**: 2 kolom lapang 50:50 untuk perbandingan atau deep-dive.
     - **Bento 3-Column (`.slide-layout-bento`)**: 3 kartu pilar standar dengan highlight footer.
     - **Metrics 4-Grid (`.slide-layout-metrics`)**: 4 kartu statistik/KPI dengan angka metrik besar dan deskripsi ringkas.
     - **Statement / Quote (`.slide-layout-quote`)**: Tipografi kutipan/manifesto besar di tengah dengan tanda petik elegan dan pill takeaway.
     - **Stepped Process (`.slide-layout-timeline`)**: 4 langkah proses horizontal terurut (Tahap 01 s/d 04).
     - **Conclusion & Checklist (`.slide-layout-conclusion`)**: Ringkasan eksekutif dan daftar periksa aksi penutup.

2. **Contextual Sidebar Miniatures**:
   - Bilah thumbnail kiri (`#deck-sidebar`) menampilkan siluet miniatur visual yang sesuai dengan layout unik masing-masing slide (`.thumb-mini-cover`, `.thumb-mini-split`, `.thumb-mini-metrics`, `.thumb-mini-quote`, `.thumb-mini-timeline`, `.thumb-mini-conclusion`, `.thumb-mini-grid`), sehingga sidebar tidak lagi tampak kembar identik.


## 🚀 30. Progressive Step-by-Step Slide Execution Loop & Master Agent Re-Check (v2.150.214)

1. **Progressive Step-by-Step Slide Execution Architecture**:
   - Master Design tidak lagi menyemburkan seluruh slide sekaligus secara monolitik; proses kini berjalan secara bertahap slide per slide (Slide 1 -> Slide 2 -> ... -> Slide N).
   - Setiap slide melewati siklus kerja aktif:
     - `execute_slide_step`: Penyusunan arketipe tata letak, judul, subjudul, dan kartu informasi slide target.
     - `audit_slide_quality` via `auditSingleSlide`: Pengujian kualitas deterministik untuk memastikan judul memenuhi panjang minimal, kartu terstruktur dengan benar, dan bebas fake branding.
     - `revise_slide_step` via `reviseSlideData`: Jika slide tidak lolos pengujian (misal subjudul kosong atau kartu kurang dari standar layout), Master Design secara otomatis merevisi slide hingga terverifikasi `[OK]`.
   - Gelembung chat menampilkan progress real-time per slide (`- Slide X [OK]: Title (Layout)`).

2. **Master Agent Full-Deck Re-Check & Correction Gate**:
   - Setelah seluruh slide 1..N tuntas dirancang oleh Master Design, Master Agent (`👑 Master Agent`) mengambil alih untuk melakukan re-check detail keseluruhan deck (`master_agent_recheck_all_slides` via `auditFullDeck`).
   - Master Agent memverifikasi Slide 1 berformat Cover, variasi tata letak antar-slide tinggi (kombinasi cover, split, bento, metrics, timeline, quote, conclusion), serta memastikan tidak ada kartu atau judul yang kosong.
   - Apabila ditemukan miss atau kekurangan, Master Agent mendelegasikan perintah perbaikan spesifik ke Master Design (`delegate_revision_to_master_design` via `reviseFullDeckData`) hingga seluruh kekurangan disempurnakan.
   - Master Agent kemudian menerbitkan Final Approval (`audit_and_approve_artifact`) sebelum menyajikan presentasi ke canvas dan chat room.


## 🚀 31. Immediate Slide 1 Canvas Activation & Dedicated Per-Slide Token Pipeline (v2.150.215)

1. **Immediate Slide 1 Canvas Reveal**:
   - Master Design menyelesaikan Slide 1 (Cover / Hero) terlebih dahulu dan memvalidasinya.
   - Segera setelah Slide 1 berstatus `[OK]`, kartu hasil `.opendesign-result-card` langsung dimunculkan di obrolan dengan tombol *"Buka Canvas"* yang aktif.
   - Canvas pratinjau sudah mendaftarkan seluruh slide yang diminta (misal 5 atau 10 slide), dengan Slide 1 dapat dijelajahi langsung sementara Slide 2..N menampilkan skeleton animasi shimmer (`.thumb-mini-loading` dan `.slide-loading-skeleton`).

2. **Dedicated Token Context Per-Slide**:
   - Master Agent bertindak sebagai Supreme Commander yang meracik dan mengirimkan prompt terfokus untuk setiap slide (`createSlidePromptForMasterDesign`).
   - Setiap slide mendapatkan alokasi token terfokus penuh untuk mengeksplorasi data, metrik, dan analisis tanpa terpotong oleh batas token output (*zero token starvation*).

3. **Live In-Place Canvas Morphing**:
   - Begitu Master Design menyelesaikan Slide 2, 3, dst., iframe pratinjau canvas (`opendesign-preview-frame`) diperbarui secara real-time.
   - Animasi skeleton bertransformasi seketika menjadi konten nyata dengan transisi mulus.


## 🚀 32. Persistent Slide 1 Open Canvas Card & Dynamic Viewport Sync (v2.150.216)

1. **Persistent OpenDesign Result Card Preservation**:
   - Fungsi `updateAssistantText` dan `renderStreamingChunk` menjaga keberadaan elemen `.opendesign-result-card` saat memperbarui konten markdown.
   - Kartu dengan tombol *"Buka Canvas ↗"* tidak lagi terhapus oleh pembaruan teks streaming saat slide lanjutan diproses.
   - Teks tombol diselaraskan menjadi *"Buka Canvas ↗"* (dan *"Buka Canvas (Update) ↗"* untuk revisi) sesuai Zero Emoji Protocol.

2. **Dynamic Live Canvas Detection**:
   - Deteksi canvas terbuka kini menggunakan fungsi dinamis `checkCanvasOpen()` yang dievaluasi secara real-time pada setiap siklus pembaruan slide.
   - Ketika pengguna menekan tombol *"Buka Canvas"* segera setelah Slide 1 selesai, pembaruan slide berikutnya (Slide 2..N) seketika menyelaraskan frame pratinjau (`iframe.srcdoc`) tanpa terhenti oleh variabel statis masa lalu.

3. **Zero ReferenceError Stability**:
   - Penyelarasan artefak pada tahap finalisasi mengikat variabel `targetArtifact.html` yang terverifikasi, mengeliminasi exception `ReferenceError: artifact is not defined` dan menjamin penyelesaian presentasi 100% mulus.


## 🚀 33. Context-Aware Editorial Titles & Multi-Model OpenDesign Resilience (v2.150.217)

1. **Contextual Presentation Topic Extraction (`cleanPresentationTopic`)**:
   - Membersihkan input mentah pengguna dari awalan/akhiran teknis (`slide`, `pdf`, `ppt`, `deck`, `tentang`, `buatkan`, dan penanda jumlah `\d+ slide`).
   - Contoh: `"slide pdf tentang kucing lucu di indonesia 10"` diekstraksi menjadi topik murni `"kucing lucu di indonesia"`.

2. **Creative Editorial Titles (`generateEditorialTitle`)**:
   - Menghasilkan judul display sampul yang artistik, berwawasan luas, dan elegan (contoh: *"Pesona & Ragam Kucing Lucu di Indonesia"*) beserta subjudul puitis/eksploratif yang relevan dengan topik pengguna.
   - Mengeliminasi pengulangan teks prompt mentah ("Slide PDF tentang...") di cover slide.

3. **Multi-Model API Resolution (`resolveDesignCandidateModels`)**:
   - Menghilangkan kegagalan HTTP 404 pada endpoint AI yang terjadi saat `config.model` bernilai `"auto"`.
   - Mengambil model kandidat valid (`gemini-2.5-flash`, dll.) dan mencoba secara berurutan dengan penanganan graceful error.

4. **Zero-Corporate Fallback Safeguard**:
   - Fallback kartu (`reviseSlideData`, `createDefaultBlueprint`) tidak lagi memuat teks korporat kaku ("Prioritas Implementasi 30 Hari: Mobilisasi sumber daya", "Bab II: Eksplorasi Strategis").
   - Generator kartu kini mengikat variabel topik pengguna secara dinamis dan kontekstual.


## 🚀 34. Master Design Visual Style Ideation Engine & Non-Corporate Card Architecture (v2.150.218)

1. **Master Design Visual Style Ideation Engine (`exploreDesignStyleConcept`)**:
   - Menginisiasi eksplorasi gaya visual, mood, palet warna, dan arah seni sebelum slide dieksekusi (`master_design_ideate_visual_style`).
   - Memberikan konsep spesifik domain (contoh topik kucing: *"Warm Cozy Pet & Lifestyle Editorial"*, lembut, organik, palet hangat, badge unik non-korporat).
   - Menyuntikkan konsep ini ke dalam prompt AI Master Design di setiap slide agar layout bervariasi dan tidak mengulang template kaku.

2. **Eliminasi Frame Korporat Kaku (Anti-Enterprise Template)**:
   - Menghapus label kuno seperti `BAB III //`, `MODULAR RATIO 16:9`, dan `MATERI PRESENTASI RESMI`.
   - Menggantinya dengan breadcrumbs editorial modern (`.header-topic-crumb` / `.header-chapter-sub` dan `.header-page-tag`) serta footer minimalis yang rapi.

3. **Sleek Tag Chips & Asymmetric Card Highlighting**:
   - Mengubah elemen `.col-highlight-box` (yang tampak seperti tombol aksi) menjadi `.col-tag-chip` dengan dot penanda aksen warna (`.col-tag-dot`).
   - Menyematkan kelas `.is-featured` pada kartu sorotan utama dengan aksen border atas dan elevasi visual.
   - Menghilangkan template badge seragam `PILAR 01/02/03` menjadi label kontekstual murni.
   - Menginstruksikan AI Master Design untuk menghindari dinding teks padat dan memformat kartu dengan poin-poin ringkas yang scannable.


## 🚀 35. Universal SSE Stream & JSON Response Decoding with Zero ReferenceError Guard (v2.150.219)

1. **Universal Stream Decoder (`readAiResponseContent`)**:
   - Membaca dan menafsirkan respons API baik berformat Server-Sent Events (SSE chunks berawalan `data: {"id": ...}`) maupun JSON standar.
   - Mengeliminasi exception `SyntaxError: Unexpected token 'd', "data: {"id"... is not valid JSON` yang terjadi saat menggunakan model proxy seperti `ag/gemini-3.8-flash-high`.
   - Mengakumulasi potongan delta token dari stream secara presisi menjadi konten utuh.

2. **Multi-Candidate Model Fallback on Revision**:
   - Menghubungkan alur revisi canvas aktif (`isRevision === true`) dengan rotasi kandidat model (`resolveDesignCandidateModels`) dan parameter `stream: false`.
   - Menyelesaikan pembaruan badge `update_canvas_slides` dan milestones jadwal tugas secara rapi tanpa tertahan di status gagal.

3. **Function-Level Variable Scoping (`accumulatedContent`)**:
   - Mendeklarasikan `accumulatedContent` di tingkat fungsi utama sebelum blok `try-catch`, mencegah `ReferenceError` pada penanganan exception di blok `catch`.


## 🚀 36. Realtime Visual & Text Slide Deck Editor Engine (v2.150.220)

1. **Dual-Surface Edit Mode Entry Points**:
   - Tombol `#dock-btn-edit` disematkan tepat di sebelah kiri tombol Fullscreen (`#dock-btn-fullscreen`) pada floating dock `.deck-floating-dock`.
   - Tombol `#btn-canvas-edit-mode` disematkan tepat di sebelah kiri tombol Fullscreen / Maximize (`#btn-canvas-expand`) pada canvas header actions (`.canvas-header-actions`) di `newtab.html` dan `sidepanel.html`.
   - Dua arah sinkronisasi via `postMessage`: klik tombol di header canvas mengirimkan `{ type: 'TOGGLE_EDIT_MODE' }` ke iframe slide deck, dan slide deck mengirimkan `{ type: 'EDIT_MODE_TOGGLED', active }` kembali ke header untuk memperbarui status visual aktif.

2. **Floating Formatting Toolbar (`#deck-editor-toolbar` di `slide_editor.js`)**:
   - Toolbar terapung akrilik modern di bagian atas kanvas slide saat mode edit aktif.
   - Pilihan Font Family dinamis: Inter, Outfit, Plus Jakarta Sans, Space Grotesk, Syne, JetBrains Mono, dan Georgia Editorial Serif.
   - Kontrol ukuran font responsif: Tombol `A-` dan `A+` dengan step 2px.
   - Penataan gaya tipografi: Bold (**B**), Italic (*I*), Underline (<u>U</u>), serta perataan teks (Left, Center, Right).
   - Palet warna instan 6 aksen: Putih, Aksen Utama, Biru Langit, Emas, Karang, Slate.

3. **Multi-Selection, Transform & Drag-to-Move Architecture**:
   - Multi-Selection: Pengguna dapat memilih satu atau banyak elemen sekaligus dengan menekan Shift / Ctrl + Click.
   - Lockstep Multi-Drag: Menggeser salah satu elemen yang terpilih otomatis memindahkan seluruh elemen terpilih lainnya secara proporsional.
   - Skala & Rotasi: Tombol Scale Up (+10%), Scale Down (-10%), Rotasi Kiri (-15°), Rotasi Kanan (+15°), dan Reset Transformasi tanpa merusak layout dasar CSS.
   - Inline In-Place Text Editing: Double-click pada elemen teks manapun mengaktifkan `contenteditable="true"` seketika.
   - Auto-Save & Synchronization: Tombol "Simpan" mengakhiri mode edit dan menyiarkan `{ type: 'SLIDE_DECK_CONTENT_CHANGED', html }` ke parent window untuk memperbarui `activeDesignArtifact`, tab kode HTML, dan penyimpanan lokal.

4. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 780 baris.
   - `canvas_manager.js`: 792 baris.
   - `slide_template.js`: 772 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_styles.js`: 789 baris.
   - `slide_deck_engine.js`: 505 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.


## 🚀 37. Slide Deck Editor Undo, Redo, Duplicate & Delete Architecture (v2.150.221)

1. **Snapshot History Stack & State Preservation**:
   - `historyStack` dan `futureStack` mengelola hingga 30 snapshot status inner HTML dari seluruh `.slide-section`.
   - Menggunakan serialisasi JSON terisolasi tanpa mengotori class seleksi aktif (`.deck-editable-selected`).
   - Setiap mutasi (drag posisi, font, ukuran, styling, warna, perataan, skala, rotasi, reset, penyuntingan teks, duplikasi, dan hapus) memicu `takeSnapshot()` dan memperbarui status tombol Undo (`#editor-btn-undo`) dan Redo (`#editor-btn-redo`).

2. **Precision Element Duplication (`#editor-btn-duplicate`)**:
   - Melakukan kloning deep (`cloneNode(true)`) pada setiap elemen yang sedang terpilih.
   - Menghitung koordinat transform saat ini dan memberikan pergeseran relatif (+20px X, +20px Y).
   - Menyisipkan klon ke dalam DOM tepat setelah elemen sumber (`el.parentNode.insertBefore(clone, el.nextSibling)`), kemudian secara otomatis memilih seluruh klon baru untuk mempermudah pergeseran lanjutan.
   - Mendukung pintasan keyboard global `Ctrl+D` / `Cmd+D`.

3. **Safe Element Deletion (`#editor-btn-delete`)**:
   - Menghapus elemen terpilih dari DOM dengan perlindungan terhadap elemen struktur utama slide.
   - Mendukung tombol fisik `Delete` dan `Backspace` (ketika tidak sedang mengetik di input/contenteditable).
   - Event listener keyboard menggunakan capture phase (`capture: true`) untuk mencegah `Backspace` berpindah ke slide sebelumnya.

4. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 780 baris.
   - `canvas_manager.js`: 792 baris.
   - `slide_styles.js`: 789 baris.
   - `design_executor.js`: 776 baris.
   - `slide_template.js`: 772 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 505 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎯 38. Slide Deck Realtime Edit Mode Click Activation, Global Bridge & Self-Init Architecture (v2.150.222)

1. **Dual-Surface Click Event Interception & Bridge**:
   - `attachSlideDeckController` di `canvas_manager.js` beroperasi di capture phase (`useCapture: true`) pada dokumen iframe, kini menyadap klik `#dock-btn-edit` dan `#dock-btn-fullscreen` untuk memicu `win.toggleEditMode()` atau `win.postMessage({ type: 'TOGGLE_EDIT_MODE' }, '*')`.
   - `slide_template.js` mengimplementasikan penanganan klik `#dock-btn-edit` dan `#dock-btn-fullscreen` di dokumen internal slide deck secara langsung.

2. **Global Method Exposure & Visual Dock Feedback**:
   - `slide_editor.js` mengekspos `window.toggleEditMode = toggleEditMode` secara global di dalam iframe.
   - Mengaktifkan class `.active`, background aksen indigo/ungu (`var(--accent, #6366F1)`), dan warna teks `#FFFFFF` pada `#dock-btn-edit`.
   - Memancarkan event `DECK_EDIT_MODE_CHANGED` ke parent window untuk sinkronisasi tombol `#btn-canvas-edit-mode`.

3. **Canvas Manager Auto-Initialization & State Sync**:
   - Menambahkan pemanggilan otomatis `initOpenDesignCanvas` pada `DOMContentLoaded` di akhir `canvas_manager.js` dengan idempotency guard (`window.__opendesign_canvas_inited`), menjamin seluruh event listener header canvas selalu terpasang sempurna baik di `newtab.html` maupun `sidepanel.html`.
   - Header action button `#btn-canvas-edit-mode` otomatis disinkronkan status `.active`-nya dan dapat memicu toggle langsung via `iframe.contentWindow.toggleEditMode()`.

4. **Active State Visual Styling**:
   - Menambahkan class `.canvas-action-icon-btn.active` di `sidepanel.css` dan `newtab.css` dengan background aksen dan glow highlight.

5. **Strict Sub-800 Line Rule Compliance**:
   - `canvas_manager.js`: 788 baris.
   - `slide_template.js`: 788 baris.
   - `slide_editor.js`: 783 baris.
   - `slide_styles.js`: 789 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 505 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🛡️ 39. Slide Deck Realtime Edit Mode Debounce Guard, Legacy Upgrade & Dynamic Injection Architecture (v2.150.223)

1. **Debounce Cooldown & Immediate Propagation Guard**:
   - `slide_editor.js` menerapkan cooldown 300ms (`now - lastToggleTime < 300`) pada fungsi `toggleEditMode` untuk mengeliminasi flipping instan on-off saat tombol diklik.
   - Menggunakan `e.stopImmediatePropagation()` pada penanganan event click `#dock-btn-edit` sehingga event tidak menyebar ke event listener lain di dokumen iframe yang sama.
   - Memastikan `#deck-editor-toolbar` bertransformasi mulus dengan deklarasi style eksplisit saat aktif maupun nonaktif.

2. **Strict Legacy Artifact Auto-Upgrade**:
   - `upgradeSlideDeckHtmlIfNeeded` di `slide_deck_engine.js` kini mewajibkan keberadaan `dock-btn-edit`, `deck-editor-toolbar`, dan `initSlideDeckRealtimeEditor` agar sebuah artefak dianggap up-to-date.
   - Artefak presentasi lama yang tersimpan dalam riwayat otomatis di-upgrade ke template modern saat dibuka di Canvas Drawer.

3. **Dynamic Fallback Injection**:
   - `attachSlideDeckController` di `canvas_manager.js` secara runtime memeriksa ketersediaan toolbar `#deck-editor-toolbar` dan tombol `#dock-btn-edit`. Jika salah satu hilang, controller menyuntikkan CSS editor, markup DOM, dan skrip secara live ke dalam iframe.

4. **Instant Optimistic UI Feedback**:
   - Tombol `#btn-canvas-edit-mode` di header drawer langsung merespons interaksi dengan toast universal interaktif (`✏️ Mode Edit Realtime Aktif` / `💾 Mode Edit Disimpan & Selesai`).

5. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 794 baris.
   - `canvas_manager.js`: 785 baris.
   - `slide_template.js`: 781 baris.
   - `slide_styles.js`: 789 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 40. Slide Deck Figma-Style Interactive Transform Box, Corner Scaling & Rotation Handles Architecture (v2.150.224)

1. **Figma Transform Bounding Box Architecture (`.deck-figma-box` di `slide_editor.js`)**:
   - Setiap kali elemen atau blok teks dipilih saat mode edit realtime aktif (`.deck-editable-selected`), sistem secara otomatis menginjeksi kontainer visual pembatas `.deck-figma-box` dengan `inset: -5px` dan `z-index: 1000`.
   - Menghadirkan kontrol manipulasi visual setara Canva/Figma:
     - **4 Corner Resize Handles (`.figma-handle`)**: 4 titik kotak sudut 9x9px dengan styling putih berbingkai aksen `var(--accent, #6366F1)` dan shadow elevasi. Menggunakan kursor arah diagonal `nwse-resize` dan `nesw-resize`. Menyeret handle sudut menghitung rasio jarak Euclidean dari titik pusat elemen (`currentDist / initialDistance`) untuk mengubah nilai `scale(X)` secara mulus (0.2x hingga 3.5x).
     - **Top Rotation Stem & Handle (`.figma-rot-stem` & `.figma-handle-rot`)**: Batang garis aksen vertikal 18px menghubungkan sisi atas elemen ke titik lingkaran putar di posisi `-29px`. Menggunakan kursor `crosshair`. Menyeret handle rotasi menghitung selisih sudut trigonometri `atan2` dari titik pusat elemen secara presisi 360°, dengan dukungan snapping kelipatan 15° saat menekan tombol `Shift`.
     - **Dynamic Dimension Pill Badge (`.figma-badge-dim`)**: Badge pill gelap monospace muncul di bawah elemen saat manipulasi berlangsung, menampilkan sudut rotasi aktif (misal `45°`) atau persentase skala aktif (misal `130%`), dan menghilang otomatis saat `mouseup`.
     - **Direct Body Drag & Inline Text Edit**: Menyeret badan elemen mentranslasikan koordinat `X` dan `Y`. Melakukan double-click pada teks mengaktifkan `contenteditable="true"` dan memfokuskan kursor pengetikan secara in-place.

2. **Snapshot Hygiene & Leak-Proof Export**:
   - Fungsi `takeSnapshot()` dan `notifyParentContentChanged()` memanggil `removeFigmaBoxes()` sebelum mengonversi DOM atau `outerHTML`, dan memulihkan kembali handle (`updateFigmaHandles()`) seketika setelahnya.
   - Menjamin bahwa state snapshot Undo/Redo dan kode HTML yang dikirim ke parent drawer atau diekspor ke file selalu bersih murni tanpa residu DOM bounding box.

3. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 765 baris.
   - `canvas_manager.js`: 786 baris.
   - `slide_styles.js`: 790 baris.
   - `slide_template.js`: 782 baris.
   - `design_executor.js`: 777 baris.
   - `design_agent.js`: 627 baris.
   - `slide_deck_engine.js`: 507 baris.
   - `slide_themes.js`: 267 baris.
   - `canvas_exporter.js`: 245 baris.
   - `design_prompt.js`: 184 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 41. Slide Deck Realtime Edit Mode Injection, Native Text Selection Prevention & Transform Activation (v2.150.225)

1. **Native Text Selection Prevention Architecture (`slide_editor.js`)**:
   - **Global User-Select Suppression**:
     - Aturan CSS ketat pada body aktif: `body.deck-edit-mode-active, body.deck-edit-mode-active * { user-select: none !important; -webkit-user-select: none !important; }`.
     - Pengecualian presisi pada elemen inline editing: `body.deck-edit-mode-active [contenteditable="true"], body.deck-edit-mode-active [contenteditable="true"] * { user-select: text !important; -webkit-user-select: text !important; }`.
   - **Mousedown Drag Hijack Prevention**:
     - Pada `mousedown` handler `slide_editor.js`, memanggil `if (!target.isContentEditable) { e.preventDefault(); }` segera setelah elemen target editable terdeteksi. Hal ini mencegah Chrome menginisiasi native text selection highlight berwarna biru saat pengguna mulai mengklik dan menggeser elemen teks di dalam kanvas.

2. **Expanded Target Element Selection (`findEditableTarget`)**:
   - Meliputi seluruh elemen teks, judul (`h1-h4`), badge (`.cover-badge-pill`, `.col-badge`), metadata (`.cover-meta-item`, `.cover-meta-val`), kutipan, metrik, kartu kolom, dan elemen anak kanvas (`span`, `strong`, `em`, `b`, `i`).
   - Penanganan khusus untuk void elements (`img`, `input`, `hr`) agar secara otomatis mengarahkan target ke `parentElement`, menjamin bounding box `.deck-figma-box` selalu dapat disisipkan ke DOM tanpa exception.

3. **Ultra-High Z-Index Floating Toolbar**:
   - `.deck-editor-toolbar` kini memiliki `z-index: 999999 !important;`, menjamin bilah alat terapung selalu berada di lapisan teratas di atas seluruh slide canvas dan dock controller.
   - State aktif dipaksakan via CSS: `body.deck-edit-mode-active .deck-editor-toolbar { transform: translateX(-50%) translateY(0) !important; opacity: 1 !important; pointer-events: auto !important; }`.

4. **Synchronous Runtime Injection (`ensureSlideEditorInjected` di `canvas_manager.js`)**:
   - Menyuntikkan style, HTML toolbar, dan mengevaluasi script editor via `win.eval` atau `win.Function` ke dalam konteks `iframe.contentWindow` secara instan bahkan sebelum event toggle dipancarkan.
   - Status tombol header `#btn-canvas-edit-mode` diverifikasi secara deterministik terhadap kehadiran class `deck-edit-mode-active` pada `iframe.contentDocument.body`.

5. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 781 baris.
   - `canvas_manager.js`: 795 baris.
   - `slide_styles.js`: 789 baris.
   - `slide_template.js`: 781 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 42. Zero-CSP Inline Script Elimination & Direct Runtime Editor Context (v2.150.226)

1. **CSP Inline Script & Eval Elimination**:
   - Menghapus tuntas seluruh pemanggilan `win.eval`, `new win.Function`, dan pembuatan tag dinamis `doc.createElement('script')` dengan inline `textContent` dari `canvas_manager.js`.
   - Mengeliminasi error pelanggaran Content Security Policy (`script-src 'self'`) pada konteks `chrome://newtab/` dan `sidepanel.html`.

2. **Direct DOM Context Initialization (`initSlideDeckRealtimeEditor`)**:
   - Engine penyuntingan slide kini berbentuk fungsi JavaScript murni yang beroperasi langsung pada referensi `doc` dan `win`:
     - Listener tombol toolbar terikat langsung ke elemen DOM di dalam iframe.
     - Listener dokumen (`mousedown`, `mousemove`, `mouseup`, `dblclick`) terikat ke `doc`.
     - Keyboard shortcuts dan window message bridge terikat ke `win`.
     - Fungsi kontrol `win.toggleEditMode` diekspos langsung ke window context iframe tanpa melewati parser script string.

3. **Standalone HTML Export Serialization**:
   - `getSlideDeckEditorScript()` mengembalikan `(${initSlideDeckRealtimeEditor.toString()})(document, window);`, memastikan file ekspor mandiri tetap dapat menjalankan editor saat dibuka di browser biasa.

4. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 788 baris.
   - `canvas_manager.js`: 787 baris.
   - `slide_styles.js`: 789 baris.
   - `slide_template.js`: 781 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 43. Slide Deck Figma-Style Edge Sizing Handles for Width & Height Dimensions (v2.150.227)

1. **Edge Resize Handles Architecture (`.figma-handle-tm`, `.bm`, `.ml`, `.mr`)**:
   - Kotak pembatas transformasi `.deck-figma-box` kini dilengkapi 4 handle sisi independen berposisi `calc(50% - 4.5px)`:
     - Top-Middle (`.figma-handle-tm`, cursor `ns-resize`, `data-handle="resize-h"`, `data-dir="tm"`).
     - Bottom-Middle (`.figma-handle-bm`, cursor `ns-resize`, `data-handle="resize-h"`, `data-dir="bm"`).
     - Middle-Left (`.figma-handle-ml`, cursor `ew-resize`, `data-handle="resize-w"`, `data-dir="ml"`).
     - Middle-Right (`.figma-handle-mr`, cursor `ew-resize`, `data-handle="resize-w"`, `data-dir="mr"`).

2. **Scale-Aware Dimension Mutation**:
   - Delta pergerakan kursor mouse dinormalisasi terhadap skala elemen saat ini (`dx / scale`, `dy / scale`).
   - Lebar (`resize-w`): `newW = Math.max(20, Math.round(initialWidth + (activeDir === 'mr' ? dx : -dx)))`.
     Menetapkan `activeElement.style.maxWidth = 'none'`, `flexShrink = '0'`, `width = newW + 'px'`.
   - Tinggi (`resize-h`): `newH = Math.max(16, Math.round(initialHeight + (activeDir === 'bm' ? dy : -dy)))`.
     Menetapkan `activeElement.style.minHeight = 'auto'`, `flexShrink = '0'`, `height = newH + 'px'`.
   - Badge dimensi visual (`.figma-badge-dim`) menampilkan `P: [width]px` atau `T: [height]px` selama aksi drag berlangsung.

3. **Reset & Clean State Restoration**:
   - Tombol Reset Transformasi (`#editor-btn-reset-transform`) mengembalikan `width`, `height`, `maxWidth`, `minHeight`, dan `flexShrink` ke string kosong selain mereset koordinat translasi dan sudut rotasi.
   - Fungsi snapshot otomatis merekam mutasi ukuran ke dalam `historyStack` dan menyiarkan pembaruan HTML ke parent canvas.

4. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 778 baris.
   - `canvas_manager.js`: 787 baris.
   - `slide_styles.js`: 789 baris.
   - `slide_template.js`: 781 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 44. Slide Deck Magnetic Snapping (Edge & Center) & Persistent Inline-Block Transform Architecture (v2.150.228)

1. **Persistent Inline-Block Transform Architecture**:
   - Spesifikasi browser W3C menetapkan `transform` tidak memiliki efek komputasi pada elemen dengan `display: inline`.
   - Mengunci `display: inline-block !important;` pada selector `[data-deck-transform]` serta menetapkan `el.style.display = 'inline-block'` langsung pada atribut inline elemen saat `applyTransform()` dipanggil.
   - Menjamin bahwa saat mode edit ditutup atau artefak disimpan, transformasi elemen tetap 100% aktif dan tidak melompat kembali ke posisi default.
   - `canvas_manager.js` menyelaraskan penyimpanan ke `chrome.storage.local` (`opendesign_last_artifact`) seketika saat `SLIDE_DECK_CONTENT_CHANGED` disiarkan.

2. **Magnetic Snapping (Smart Guides) Engine**:
   - Kandidat snap X dan Y dihimpun saat inisiasi geser (`mousedown`):
     - Center kanvas: `cRect.width / 2`, padding batas 48px.
     - Center Y kanvas: `cRect.height / 2`, padding batas 36px.
     - Sibling elements: bounding box left, center, right, top, middle, bottom.
   - Ambang batas snap magnet: 7px.
   - Garis pandu perataan visual Figma: `.figma-snap-guide-v` (vertikal) dan `.figma-snap-guide-h` (horizontal) dengan aksen warna magenta `#EC4899` dan glowing box-shadow.
   - Pembersihan otomatis: Garis pandu snap segera dibersihkan pada `mouseup`, `removeFigmaBoxes()`, serta sebelum serialisasi snapshot.

3. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 783 baris.
   - `canvas_manager.js`: 790 baris.
   - `slide_styles.js`: 789 baris.
   - `slide_template.js`: 781 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 46. True 16:9 Scaling Parity (Preview vs Downloaded PDF & Standalone HTML) (v2.150.230)

1. **Resolution & Scaling Disparity Analysis**:
   - Standar CSS mendefinisikan 1 inchi = 96 px. Aturan `@page { size: 16in 9in; }` sebelumnya menciptakan viewport 1536px x 864px, sedangkan tipografi dan padding slide didesain untuk kanvas 1200px x 675px.
   - Perbedaan skala sebesar 28% tersebut menyebabkan teks tampak kecil dan kontainer `justify-content: space-between` meninggalkan ruang kosong putih besar di bagian bawah dan kanan halaman hasil unduh.

2. **1:1 Pixel-Perfect Export & Screen CSS**:
   - **Print / PDF Export**:
     - `@page { size: 1200px 675px !important; margin: 0 !important; }`.
     - `.slide-section { width: 1200px !important; height: 675px !important; min-width: 1200px !important; min-height: 675px !important; max-width: 1200px !important; max-height: 675px !important; }`.
     - Disinkronkan ke `slide_styles.js`, `canvas_exporter.js`, `native_host.py`, dan `host/rust_host/src/main.rs`.
   - **Screen Mode**:
     - `.slide-section { width: min(1200px, 100%, calc((100vh - 96px) * (16 / 9))); max-width: 1200px; max-height: 675px; aspect-ratio: 16 / 9; }`.
     - Menjamin kanvas terkunci pada rasio 16:9 widescreen di semua perangkat layar tanpa distorsi atau overflow.

3. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 776 baris.
   - `canvas_manager.js`: 791 baris.
   - `slide_styles.js`: 790 baris.
   - `slide_template.js`: 781 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 47. Slide Deck Dimension Resize Magnetic Snapping & Clean 1px Guides (v2.150.231)

1. **Dimension Resize Magnetic Snapping Architecture**:
   - `initSnapCandidates(el)` mengekstrak kandidat magnet horizontal (center X, padding 48px, tepi & tengah sibling) dan vertikal (center Y, padding 36px, tepi & tengah sibling) saat handle resize (`resize-w` / `resize-h`) ditekan.
   - Pada pergeseran handle lebar `activeAction === 'resize-w'`, tepi aktif (`edge`) mendeteksi kandidat terdekat dalam rentang 7px dan mengunci `newW`. Garis pandu vertikal `.figma-snap-guide-v` dimunculkan tepat di koordinat kandidat snap.
   - Pada pergeseran handle tinggi `activeAction === 'resize-h'`, tepi aktif mendeteksi kandidat vertikal terdekat dalam rentang 7px dan mengunci `newH`. Garis pandu horizontal `.figma-snap-guide-h` dimunculkan tepat di koordinat kandidat snap.

2. **Glow-Free 1px Razor-Thin Visual Guides**:
   - Menghilangkan `box-shadow: 0 0 6px #EC4899;` dan merampingkan ketebalan garis dari `1.5px` menjadi `1px` (`width: 1px;` / `height: 1px;`).
   - Menyajikan garis perataan presisi ultra-bersih tanpa efek pendar/silau, memudahkan navigasi visual saat kanvas padat elemen.

3. **Strict Sub-800 Line Rule Compliance**:
   - `slide_editor.js`: 776 baris.
   - `canvas_manager.js`: 791 baris.
   - `slide_styles.js`: 790 baris.
   - `slide_template.js`: 781 baris.
   - `design_executor.js`: 776 baris.
   - `design_agent.js`: 626 baris.
   - `slide_deck_engine.js`: 506 baris.
   - `slide_themes.js`: 266 baris.
   - `canvas_exporter.js`: 244 baris.
   - `design_prompt.js`: 183 baris.
   - Seluruh 10 file di `extension/design/` patuh limit <= 800 baris.

## 🎨 48. New Tab Session Isolation & Clean Welcome Screen Guard (v2.150.232)

1. **Page-Context Aware Auto-Restore Architecture**:
   - `bootstrap()` di `sidepanel.js` membedakan antara lingkungan Full-Screen New Tab (`window.location.pathname.includes('newtab.html') || document.body.classList.contains('newtab-body')`) dan Sidepanel biasa (`sidepanel.html`).
   - Halaman tab baru (Ctrl+T / tombol `+`) kini diisolasi dari sesi global `last_active_session_id` di `chrome.storage.local`.
   - Tab baru SELALU menampilkan antarmuka awal yang bersih: `#welcome-card` tampil, hero subtitle aktif, prompt bar berada di tengah kanvas layar, dan 8 ubin situs favorit (`recent-sites-grid`) terlihat rapi.

2. **Per-Tab Session Storage Isolation**:
   - Menggunakan `sessionStorage` per-tab (`tab_active_session_id`) yang terisolasi secara native oleh browser.
   - Saat tab baru dibuat, `sessionStorage` kosong sehingga tidak ada riwayat chat yang ter-restore secara tidak sengaja.
   - Pemulihan sesi pada tab baru hanya terjadi jika tab tersebut di-refresh (F5) atau dibuka dengan parameter URL eksplisit `?session=...`.
   - Sidepanel tetap mempertahankan kenyamanan persistensi sesi via `chrome.storage.local`.

3. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 779 baris, `canvas_manager.js` 784 baris, `slide_styles.js` 790 baris, `slide_template.js` 781 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🎨 49. Slide Deck Manual Edit Persistence Across Refresh (v2.150.233)

1. **Anti-Demolition Slide Deck Engine (`slide_deck_engine.js`)**:
   - `upgradeSlideDeckHtmlIfNeeded` tidak lagi memaksakan regenerasi template jika mendeteksi deck yang sudah lengkap dengan dock floating/editor dan slide stage.
   - Seluruh styling inline kustom hasil drag/move (`transform: translate(...) scale(...) rotate(...)`), resize (`width`, `height`), dan edit teks dipertahankan secara utuh tanpa risiko ter-overwrite oleh template bawaan.

2. **Full-Stack Persistence Pipeline (`sidepanel.js` & `canvas_manager.js`)**:
   - Event `SLIDE_DECK_CONTENT_CHANGED` langsung mengalirkan update HTML ke:
     - `activeDesignArtifact` di memori kanvas.
     - Pesan asisten yang sesuai di `conversationHistory`.
     - Penyimpanan lokal SQLite via Native Host RPC `db_save_session`.
     - Cache memori cepat `chat_sessions_cache` di `chrome.storage.local`.
   - Menjamin bahwa saat pengguna me-refresh halaman (F5), sesi obrolan memuat slide deck yang telah diperbarui secara konsisten.

3. **Session Canvas Auto-Reopen**:
   - Status kanvas yang sedang aktif dicatat di `sessionStorage.getItem('canvas_was_open')`.
   - Saat tab di-refresh, kanvas secara mulus terbuka kembali dengan kondisi slide hasil editan manual terakhir.

4. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 787 baris, `canvas_manager.js` 784 baris, `slide_styles.js` 790 baris, `slide_template.js` 781 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🎨 50. Shift-Key Straight Axis Movement Constraint (v2.150.234)

1. **Orthogonal Axis Drag Constrain (`slide_editor.js`)**:
   - Menahan tombol `Shift` saat menyeret elemen membatasi pergerakan hanya pada satu sumbu lurus (horizontal atau vertikal) berdasarkan deviasi terbesar (`Math.abs(dx) >= Math.abs(dy)` -> `dy = 0`, selain itu `dx = 0`).
   - Menyediakan presisi ala Figma dan Adobe Illustrator untuk menyelaraskan elemen secara horizontal atau vertikal tanpa risiko tergeser miring secara diagonal.

2. **Axis-Aware Magnetic Snapping Alignment**:
   - Garis pandu snapping magnetik (`.figma-snap-guide-v` dan `.figma-snap-guide-h`) terintegrasi dinamis: hanya menampilkan panduan snap pada sumbu yang sedang aktif bergerak dan menyembunyikan panduan pada sumbu yang terkunci nol.

3. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 787 baris, `canvas_manager.js` 784 baris, `slide_styles.js` 790 baris, `slide_template.js` 781 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🎨 51. Backspace Shortcut Elimination from Slide Navigation (v2.150.235)

1. **Isolation of Navigation Keydown vs Element Deletion**:
   - `Backspace` dihapus dari trigger navigasi slide sebelumnya di `canvas_manager.js` dan `slide_template.js`. Navigasi mundur kini hanya menggunakan `ArrowLeft`.
   - Event listener navigasi kanvas dilengkapi guard ketat: memeriksa `.deck-edit-mode-active`, `isContentEditable`, dan tag `INPUT`/`TEXTAREA`. Jika kondisi terpenuhi, listener segera `return` agar tombol keyboard tidak mengganggu alur pengeditan elemen.

2. **Full Reservation for Element & Text Editing**:
   - Menjamin penekanan `Backspace` saat elemen terseleksi di kanvas memicu `deleteSelectedElements()` tanpa risiko berpindah slide ke halaman sebelumnya.
   - Menghapus karakter di dalam input teks atau node yang dapat diedit tidak lagi memicu navigasi slide.

3. **Prompt Synchronisation**:
   - Mengubah prompt listener keyboard di `design_prompt.js` agar hanya merujuk pada `ArrowLeft` untuk navigasi slide sebelumnya.

4. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 787 baris, `canvas_manager.js` 785 baris, `slide_styles.js` 790 baris, `slide_template.js` 782 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🎨 52. Clean Slide Editor Toolbar Overhaul (v2.150.236)

1. **Elimination of Visual Clutter**:
   - Menghapus badge `EDIT MODE` yang mendominasi kiri toolbar untuk mengalihkan fokus pengguna sepenuhnya pada kanvas desain.
   - Menghapus tombol `-10%` dan `+10%` (`#editor-btn-scale-down`, `#editor-btn-scale-up`).

2. **Dropdown Grouping (Format & Perataan Teks)**:
   - Format teks disatukan ke dalam `<select id="editor-format-select">`: Tebal, Miring, Garis Bawah, Ukuran A+, Ukuran A-.
   - Perataan teks disatukan ke dalam `<select id="editor-align-select">` dengan tambahan opsi Rata Kanan-Kiri (`justify`).
   - Penyelarasan otomatis: memilih elemen kanvas langsung menyinkronkan nilai select perataan dengan `textAlign` elemen.

3. **Dynamic Active Color Circle & Full HEX Popover**:
   - Menggantikan deretan tombol warna statis dengan 1 lingkaran indikator (`#editor-color-preview`) yang merefleksikan warna elemen terpilih secara live.
   - Popover akrilik (`#editor-color-popover`) menyajikan:
     - 8 warna template preset terkurasi.
     - Picker native `<input type="color">`.
     - Input teks HEX `#editor-color-hex` dengan sinkronisasi dua arah real-time.

4. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 785 baris, `canvas_manager.js` 785 baris, `slide_styles.js` 790 baris, `slide_template.js` 782 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🚀 53. Chat Scroll Retention on Canvas Exit & Floating Scroll to Bottom Button (v2.150.237)

1. **Chat Scroll Position Restoration on Canvas Exit (`canvas_manager.js`)**:
   - **Problem**: Saat keluar dari mode kanvas slide PDF (`closeOpenDesignCanvas`), tata letak jendela beralih kembali ke layar penuh NewTab dan posisi scroll ruang obrolan kerap ter-reset ke koordinat `0, 0` (paling atas), memaksa pengguna menggulir ulang ke bawah.
   - **Solusi**:
     - Saat kanvas dibuka (`openOpenDesignCanvas`), koordinat `window.scrollY` disimpan ke `window.__savedChatScrollY`, dan kontainer split `.fullscreen-chat-main` otomatis digulirkan ke pesan terbaru (`scrollTop = scrollHeight`).
     - Saat kanvas ditutup (`closeOpenDesignCanvas`), sistem memeriksa apakah pengguna berada di dekat bagian bawah (`isNearBottom`) atau berada di posisi tengah riwayat pesan (`anchorMsg`).
     - Jika pengguna berada di bawah, `forceScrollChatToBottom()` dipanggil via `requestAnimationFrame`. Jika pengguna sedang membaca pesan lampau di atas, posisi dipulihkan secara instan ke elemen jangkar (`anchorMsg.scrollIntoView({ block: 'center', behavior: 'instant' })`) atau `window.scrollTo({ top: window.__savedChatScrollY })`.

2. **Floating "Scroll to Bottom" Button (`#btn-scroll-to-bottom`)**:
   - **Desain & Penempatan**:
     - Ditempatkan mengambang tepat di atas bilah input prompt (`#chat-input-container`), terpusat horizontal (`left: 50%; transform: translateX(-50%)`).
     - Berbentuk lingkaran akrilik modern 34x34px dengan efek blur kaca, border halus, dan transisi neon lime `#CEF128` saat di-hover.
   - **Logika Visibilitas Adaptif**:
     - Tersembunyi saat posisi chat berada di bagian bawah atau pada halaman selamat datang awal (`body:not(.has-messages)`).
     - Otomatis muncul dengan animasi fade-up (`.visible`) begitu pengguna menggulir ke atas (jarak ke bawah > 120-140px) pada mode NewTab fullscreen, kanvas split pane (`.fullscreen-chat-main`), maupun panel samping SidePanel (`#chat-messages`).
   - **Aksi Cepat**:
     - Mengklik tombol secara instan memicu `scrollToBottom(true)`, mengalirkan tampilan obrolan dengan mulus (*smooth scroll*) ke pesan paling akhir.

3. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 785 baris, `canvas_manager.js` 796 baris, `slide_styles.js` 790 baris, `slide_template.js` 782 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🎨 54. Hierarchical Image & Inner Container Frame Selection Engine (v2.150.238)

1. **Root Cause Analysis (Missing Media Selectors & Void Element Failure)**:
   - Evaluasi selector target sebelumnya (`target.closest(...)`) tidak menyertakan elemen `img, picture, figure, svg` maupun container pembungkus gambar (`.card-image-wrap`, `div` dalam kolom/kartu).
   - Akibatnya, mengklik gambar di dalam kartu (`.split-col, .slide-col`) langsung melompati gambar dan memilih kartu induk. Bila kartu sudah aktif, event `mousedown` langsung mengasumsikan drag translasi kartu (*card move*).
   - Pemanggilan `el.appendChild(box)` pada `<img>` memicu `HierarchyRequestError` di DOM browser karena `img` adalah void tag yang tidak dapat memiliki child node.

2. **Hierarchical Drill-Down & Cycling Selector (`findEditableTarget`)**:
   - **Prioritas 1: Direct Media**: Mengidentifikasi `img, svg, picture, figure, video, canvas`. Mengklik gambar yang belum terpilih langsung memilih gambar tersebut dengan outline dan kotak Figma.
   - **Prioritas 2: Frame Pembungkus / Container Gambar**: Jika gambar sudah dalam keadaan terpilih dan diklik kembali, selector cerdas beralih ke container induknya (`media.parentElement`), memungkinkan pengguna memilih bingkai / container gambar (*inner container frame*).
   - **Prioritas 3: Frame Kontainer Dalam**: Mengenali selector container dalam (`[class*="image"], [class*="frame"], [class*="box"], [class*="wrap"], div` di dalam kartu).
   - **Prioritas 4: Kartu Induk / Kolom**: Siklus berlanjut ke kartu terluar (`.split-col, .slide-col`), lalu kembali ke gambar bila diklik berulang.

3. **Void Element Figma Handles Mounting (`updateFigmaHandles`)**:
   - Kotak kontrol `.deck-figma-box` untuk elemen void (`IMG`, `INPUT`, `HR`, `VIDEO`) dipasang ke `el.parentElement` dengan kalkulasi offset presisi (`el.offsetLeft - 5`, `el.offsetTop - 5`, `el.offsetWidth + 10`, `el.offsetHeight + 10`) dan sinkronisasi transform.
   - Menyematkan referensi `box._targetElement = el` sehingga klik pada gagang kontrol transformasi (`[data-handle]`) langsung merujuk pada elemen gambar.
   - Menambahkan fitur double click pada gambar untuk memicu dialog penggantian URL sumber gambar (`src`) dengan snapshot riwayat instan.

4. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`slide_editor.js` 789 baris, `canvas_manager.js` 796 baris, `slide_styles.js` 790 baris, `slide_template.js` 782 baris, `design_executor.js` 776 baris, `design_agent.js` 626 baris, `slide_deck_engine.js` 506 baris, `slide_themes.js` 266 baris, `canvas_exporter.js` 244 baris, `design_prompt.js` 183 baris).

## 🎨 55. User Uploaded Image Embedding & Creative Un-Locked Slide Deck Architecture (v2.150.239)

1. **Root Cause Analysis (Missing Attachment Flow, Hardcoded Rigidity, & Cluttered Spacing)**:
   - Gambar yang diunggah pengguna lewat input lampiran chat (`attachments`) tidak pernah diteruskan ke `deckMeta` maupun struktur data kartu slide (`workingSlides`), sehingga prompt revisi atau pembuatan kanvas deck tidak dapat menyertakan foto pengguna.
   - Template slide deck penutup sebelumnya di-*hardcode* dengan terminologi korporat kaku ("RINGKASAN EKSEKUTIF", "SIAP DIIMPLEMENTASIKAN", "CHECKLIST AKSI", "ACTION PLAYBOOK 2026") tanpa mempertimbangkan tema ceria/lucu/hewan peliharaan.
   - Kanvas slide tidak menyediakan aset visual emot cakar kucing (*paw print*), wajah kucing lucu, maupun stempel kilau, serta margin `.slide-canvas` terlalu sempit (`36px 48px`) sehingga kartu dan teks tampak menempel pada frame luar.

2. **User Image Extraction & Token Replacement Pipeline (`design_executor.js`, `slide_deck_engine.js`)**:
   - **Attachment Extraction**: Mengekstrak lampiran gambar base64 (`a.isImage && a.dataUrl`) dari prompt aktif dan riwayat obrolan (`conversationHistory`).
   - **Token Placeholder Strategy (`__USER_IMG_X__`)**: Mengirim token placeholder ringkas ke LLM agar tidak membebani batas token output (`max_tokens: 8192`), lalu menggantinya secara lokal dengan base64 asli melalui `replaceImagePlaceholdersInHtml(html, userImages)`.
   - **Deterministic Fallback Injection (`injectImagesIntoSlideDeckHtml`)**: Berfungsi sebagai safety net DOM jika AI merespon tanpa menyisipkan tag gambar; secara otomatis menyisipkan container kartu gambar `<div class="card-image-wrap"><img class="card-image" src="..." alt="Foto"></div>` pada kartu slide aktif.

3. **Playful Pastel & Kawaii Doodles Archetype (`slide_themes.js`, `slide_styles.js`, `slide_template.js`)**:
   - **Aset Visual & Emot SVG**: Menambahkan generator SVG inline `getCutePawSvg()`, `getCuteCatFaceSvg()`, `getCuteSparkleSvg()`, `getCuteHeartSvg()`, serta watermark cakar kucing melayang transparan di latar belakang slide.
   - **Thematic Photo Fallback (`CUTE_CAT_PHOTO_COLLECTION`)**: Menyediakan 8 foto kucing resolusi tinggi pilihan dengan fokus wajah yang jelas dan ekspresif jika pengguna meminta konten kucing tanpa melampirkan foto pribadi.
   - **Dynamic Un-Locked Conclusions**: Mengganti teks penutup korporat kaku menjadi tajuk bernuansa hangat (misal: "🐾 RANGKUMAN KASIH SAYANG", "💖 BAHAGIA BERSAMA ANABUL", "🐱 CHECKLIST PERAWATAN").
   - **Expanded Canvas Margins**: Padding `.slide-canvas` diperlebar menjadi `42px 54px`, memberikan ruang bernapas lega yang rapi dan elegan.

4. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`canvas_exporter.js` 244, `canvas_manager.js` 796, `design_agent.js` 636, `design_executor.js` 792, `design_prompt.js` 190, `slide_deck_engine.js` 656, `slide_editor.js` 789, `slide_styles.js` 737, `slide_template.js` 686, `slide_themes.js` 318).

## 🎨 56. Slide Deck Edit Mode Extreme Performance Optimization (Anti-Lag, rAF Throttling, Hover Elimination & Debounced Sync) (v2.150.240)

1. **Root Cause Analysis (Reflow Thrashing, Unthrottled Events & Heavy DB Overload)**:
   - **Universal `*:hover` Reflow Flood**: Aturan `.slide-canvas *:hover` memaksa mesin rendering browser melakukan perhitungan ulang gaya (*style recalculations*) pada seluruh turunan DOM di setiap pergerakan mouse kursor 1px.
   - **Unthrottled Raw `mousemove`**: Seluruh event drag, resize, rotate, dan scale dieksekusi langsung tanpa throttling `requestAnimationFrame` (rAF), menyebabkan lonjakan eksekusi kalkulasi hingga 120-240Hz dengan query DOM berulang.
   - **Double Update on `mouseup` & Eager Full Serialization**: Setiap `mouseup` memicu pembersihan dan pemasangan ulang gagang Figma ganda (`takeSnapshot` dan `notifyParentContentChanged`), mengonversi string `outerHTML` secara sinkron, dan langsung memicu transaksi SQLite `saveCurrentSessionToDB()`.
   - **Code Display Reflow**: Element `#canvas-code-display` memuat ulang 100KB teks HTML pada setiap edit kecil sekalipun pengguna sedang berada di tab Preview.

2. **rAF Drag Engine & Hardware Acceleration (`slide_editor.js`)**:
   - **Vsync-Aligned Event Loop**: Mengonsolidasikan input mouse ke `pendingMove` dan mengeksekusi mutasi transformasi (`updateActiveDrag`) eksklusif di dalam callback `requestAnimationFrame`, menjamin 60fps/120fps yang sangat mulus tanpa frame drop.
   - **GPU Layer Promotion**: Menerapkan kelas `body.deck-is-dragging` dengan properti `will-change: transform` pada elemen terpilih saat drag dimulai dan melepaskannya pada `mouseup`.
   - **Selective Hover Gating**: Mengganti `*:hover` dengan penargetan selektif khusus elemen yang dapat disunting dan mengisolasinya dengan `:not(.deck-is-dragging)`.
   - **Cached Magnetic Guides & O(1) Box Sync**: Menyimpan referensi elemen panduan magnetik (`guideVEl`, `guideHEl`) untuk manipulasi via `display: block/none` tanpa `querySelector`/`appendChild` berulang. Menyinkronkan translasi elemen void secara instan melalui `el._figmaBox`.

3. **Debounced Serialization & Lazy Code Rendering (`slide_editor.js`, `canvas_manager.js`, `sidepanel.js`)**:
   - **Debounced Parent Notification**: Menerapkan debounce 250ms pada `notifyParentContentChanged()`, dan segera melakukan flush (`immediate: true`) saat pengguna menekan tombol Simpan atau keluar dari mode edit.
   - **Debounced SQLite & Storage Saves**: Menambahkan debounce 350ms pada penanganan pesan `SLIDE_DECK_CONTENT_CHANGED` di `canvas_manager.js` dan `sidepanel.js` untuk mencegah penulisan database beruntun.
   - **Debounced Color Input**: `applyElementColor` menerapkan perubahan visual secara real-time dan menunda snapshot/DB save sebesar 200ms saat slider warna digeser.
   - **Lazy Code Tab**: Elemen `#canvas-code-display` hanya diperbarui ketika tab Code dibuka (`switchCanvasTab('code')`), menghemat waktu render 100KB teks saat menyunting di kanvas visual.

4. **Strict Sub-800 Line Rule Compliance**:
   - Seluruh 10 file di `extension/design/` terjaga ketat di bawah limit 800 baris (`canvas_exporter.js` 244, `canvas_manager.js` 787, `design_agent.js` 636, `design_executor.js` 792, `design_prompt.js` 190, `slide_deck_engine.js` 656, `slide_editor.js` 788, `slide_styles.js` 737, `slide_template.js` 686, `slide_themes.js` 318).

---

## 57. Integrasi Agent Mode ➔ Master Design Slide Deck Orchestration (`v2.150.241`)

### 🎨 1. Arsitektur Komunikasi Lintas-Mode (Seamless Agent-to-Design Handshake)
- **Problem**: Pengguna di Agent Mode yang meminta analisis kompleks (misal audit Meta Ads ratusan baris) sekaligus slide deck presentasi/PDF report harus berpindah mode secara manual atau prompt terpotong.
- **Solusi Terpadu**:
  - `AGENT_TOOLS` kini dilengkapi tool resmi: `create_slide_deck_design`.
  - Master Agent memproses analisis, tabel data, dan audit terlebih dahulu, kemudian secara otomatis memanggil `create_slide_deck_design`.
  - Eksekusi dialihkan ke **🎨 Master Design (Slide Architect)** dengan visual badge: `Instruksikan 🎨 Master Design: Merancang Slide Deck 16:9 (N Slide)`.

### 📑 2. Blueprinting Adaptif hingga 30 Slide & Domain Meta Ads
- **Peningkatan Kapasitas Slide**: `createDefaultBlueprint` kini mendukung hingga 30 slide terstruktur tanpa batasan 12 slide sebelumnya.
- **Domain Meta Ads**: Menyediakan 17 modul terkurasi khusus metrik periklanan (KPI, CPR, CTR, CBO, Demografi, Ad Fatigue, Lead Quality, A/B Testing Copy, dsb.) dengan penomoran bab dinamis.
- **Generator Terpadu**: `generateSlideDeckArtifactFromOutline` menggabungkan input markdown/outline dari Master Agent, blueprinting, tema visual adaptif, dan injeksi gambar otomatis.

### 🖼️ 3. Presentasi Otomatis di Canvas Drawer & Bento Result Card
- Tool eksekusi langsung merender `.opendesign-result-card` di dalam obrolan asisten.
- Otomatis membuka Canvas Drawer (`openOpenDesignCanvas(artifact)`).
- Menyematkan `designArtifact` pada `conversationHistory` sehingga kartu preview dan dokumen kanvas tetap utuh saat obrolan dimuat ulang.

### 📏 4. Kepatuhan Ketat Aturan Sub-800 Baris
- Seluruh 10 file di `extension/design/` tetap strictly `<= 800` baris (`canvas_exporter.js` 245, `canvas_manager.js` 788, `design_agent.js` 782, `design_executor.js` 793, `design_prompt.js` 191, `slide_deck_engine.js` 657, `slide_editor.js` 789, `slide_styles.js` 738, `slide_template.js` 687, `slide_themes.js` 319).


















