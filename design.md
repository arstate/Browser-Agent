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
