# 🧩 Apps Integration Module · Browser Agent

Folder ini berisi arsitektur modul untuk fitur **Apps Integration & In-App Embedded Webview** pada ekstensi Browser Agent.

---

## 📁 Struktur Berkas

```
extension/apps-integration/
├── README.md             # Dokumentasi modul dan panduan teknis
├── apps_registry.js      # Katalog aplikasi terintegrasi, metadata, ikon SVG, dan aturan Dynamic DNR
├── apps_manager.js       # Lifecycle controller in-app webview, declarativeNetRequest, drawer katalog, & event binding
└── apps_overlay.css      # Stylesheet terpisah untuk overlay aplikasi, header navbar kaca, bento cards, & launcher
```

---

## 🚀 Komponen Utama

### 1. `apps_registry.js`
- **Katalog Default**:
  - `flow`: Google Flow (`https://flow.google.com/`) - Workflow Automation & Orchestration (Hero App).
  - `cloudnotes`: Cloud Notes (`https://cloudnotes-wheat.vercel.app/`) - Digital notepad.
  - `gemini`: Google Gemini (`https://gemini.google.com/`) - Multimodal conversational AI.
  - `aistudio`: Google AI Studio (`https://aistudio.google.com/`) - Prototyping & system instructions.
  - `metaads`: Meta Ads Manager (`https://adsmanager.facebook.com/`) - Ads monitoring.
- **Dynamic DeclarativeNetRequest Rules**:
  - Rule ID 9901: Penghapusan header `x-frame-options`, `content-security-policy`, `frame-options`, dan set `cross-origin-opener-policy: unsafe-none` untuk kelancaran embedding `iframe` sub_frame.
  - Rule ID 9902: Penyesuaian `referer` dan `sec-fetch-*` headers untuk Google Flow.

### 2. `apps_manager.js` (`AppsIntegrationManager`)
- Mengelola state `currentAppUrl`, `currentAppName`.
- Membuka (`openAppsView`), menutup (`closeAppsView`), dan mengalihkan katalog (`toggleAppsCatalog`).
- Memuat aplikasi ke iframe (`launchApp`), reload, dan custom app launcher.
- Mencegah memory leak dengan mereset `iframe.src = 'about:blank'` saat overlay ditutup.
- Menyediakan binding global `window.AppsIntegration = { registry, manager }`.

### 3. `apps_overlay.css`
- Styling khusus untuk `.fullscreen-apps-overlay`, `.apps-header-bar` kaca blur transparan tanpa garis sekat, kapsul navigasi url terpadu, bento cards grid, dan custom url input.

---

## 💻 Penggunaan (Usage)

Di `newtab.html` atau `sidepanel.html`:
```html
<link rel="stylesheet" href="apps-integration/apps_overlay.css">
...
<script src="apps-integration/apps_registry.js"></script>
<script src="apps-integration/apps_manager.js"></script>
```

Di JavaScript:
```javascript
// Buka Google Flow langsung
window.AppsIntegration.manager.launchApp('https://flow.google.com/', 'Google Flow');

// Buka katalog apps
window.AppsIntegration.manager.openAppsView();
```
