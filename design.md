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




