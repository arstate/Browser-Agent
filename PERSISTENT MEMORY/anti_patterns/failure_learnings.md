# 🛡️ Anti-Pattern Vault & Failure Learnings (Pelajaran dari Kesalahan)
*Kumpulan catatan kesalahan masa lalu, diagnosa akar masalah, dan solusi permanen yang dipelajari secara otonom oleh AI.*
*Terakhir Diperbarui: 2026-08-24 03:33 WIB | Total Learned: 4 Anti-Patterns*

---

### ⚠️ [AP-001] Test
- **Target / Konteks:** Test
- **Gejala Kesalahan:** Test
- **Root Cause (Akar Masalah):** N/A
- **Solusi Permanen (Winning Fix):** Fix
- **Aturan Pencegahan:** Rule

---

### ⚠️ [AP-002] Zip terabaikan oleh .gitignore
- **Target / Konteks:** GitHub Backup
- **Gejala Kesalahan:** Zip terabaikan oleh .gitignore
- **Root Cause (Akar Masalah):** Aturan *.zip tanpa whitelist
- **Solusi Permanen (Winning Fix):** Tambahkan !antigravity_session/*.zip
- **Aturan Pencegahan:** Cek git status sebelum konfirmasi push

---

### ⚠️ [AP-003] File arsip .zip sesi percakapan terabaikan oleh git.
- **Target / Konteks:** GitHub Backup
- **Gejala Kesalahan:** File arsip .zip sesi percakapan terabaikan oleh git.
- **Root Cause (Akar Masalah):** Aturan *.zip tanpa whitelist
- **Solusi Permanen (Winning Fix):** Tambahkan !antigravity_session/*.zip di .gitignore
- **Aturan Pencegahan:** Periksa git status sebelum konfirmasi push

---

### ⚠️ [AP-004] Thumbnail gambar upload/paste user rusak saat resume session.
- **Target / Konteks:** Chat History
- **Gejala Kesalahan:** Thumbnail gambar upload/paste user rusak saat resume session.
- **Root Cause (Akar Masalah):** Gambar user tidak disimpan ke IndexedDB dan terpotong di storage
- **Solusi Permanen (Winning Fix):** Gunakan saveAttachmentsToIndexedDB dengan key att_img_... dan auto-hydration di hydrateLocalImages
- **Aturan Pencegahan:** Jangan hanya andalkan base64 inline untuk media besar

---
