# 🛡️ Anti-Pattern Vault & Failure Learnings (Pelajaran dari Kesalahan)
*Kumpulan catatan kesalahan masa lalu, diagnosa akar masalah, dan solusi permanen yang dipelajari secara otonom oleh AI.*
*Terakhir Diperbarui: 2026-08-24 03:38 WIB | Total Learned: 1 Anti-Patterns*

---

### ⚠️ [AP-001] Thumbnail gambar upload/paste user rusak saat resume session.
- **Target / Konteks:** Chat History
- **Gejala Kesalahan:** Thumbnail gambar upload/paste user rusak saat resume session.
- **Root Cause (Akar Masalah):** Gambar user tidak disimpan ke IndexedDB dan terpotong di storage
- **Solusi Permanen (Winning Fix):** Gunakan saveAttachmentsToIndexedDB dengan key att_img_... dan auto-hydration di hydrateLocalImages
- **Aturan Pencegahan:** Jangan hanya andalkan base64 inline untuk media besar

---
