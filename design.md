# 🎨 DESIGN SYSTEM & UI SPECIFICATION — BROWSER AGENT (CLEAN ELEGANT SAAS)

Dokumen ini mendefinisikan standar visual **Clean, Elegant, Rounded Bento UI** berbasis palet SaaS modern (Lime Chartreuse, Pure White, Slate Dark) untuk ekstensi **General Browser Agent**.

---

## ⛔ ATURAN MUTLAK IKON: ZERO EMOJI PROTOCOL
- **DILARANG KERAS menggunakan icon emoji/emotikon** di seluruh antarmuka.
- **Semua ikon wajib menggunakan Vector SVG murni** (stroke/fill terdefinisi rapi, scalable, modern, clean, dan profesional).

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
