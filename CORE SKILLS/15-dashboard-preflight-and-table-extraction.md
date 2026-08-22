# Dashboard Pre-Flight & Deep Table Extraction SOP

SOP wajib untuk menganalisis dashboard web app (seperti Meta Ads Manager, Google Analytics, Shopee/Tokopedia Seller Center, tabel CRM) agar seluruh data terekstrak 100% tanpa terpotong pagination atau virtual scroll.

## 🎯 3 Protokol Wajib (Kombinasi Opsi A + B + C)

### 1. 📅 Protokol A: Pre-Flight Setup (Rentang Waktu & Sorting)
- **Rentang Waktu (Date Range)**: Selalu periksa rentang tanggal dashboard. Jika mencari performa terbaik/teramai, ubah ke **"Masa Pakai (Lifetime)"** atau 30 hari terakhir.
- **Pengurutan Kolom (Sorting)**: Klik header kolom metrik utama (misal: "Hasil / Results ↓" untuk volume tertinggi, atau "Biaya per Hasil / CPR ↑" untuk biaya termurah).

### 2. 📊 Protokol B: Deep Table Extraction (`browser_extract_table`)
- DILARANG hanya membaca 5-10 baris pertama di DOM.
- Gunakan tool `browser_extract_table({ auto_scroll: true, max_rows: 200 })` yang secara otomatis men-scroll virtual grid dan mengekstrak SELURUH baris data kampanye ke dalam dataset JSON terstruktur.

### 3. 🔍 Protokol C: Audit Gate (Verifikasi Total Baris)
- Master Agent wajib mencocokkan total data yang tertera di dashboard (misal: *"Total 138 kampanye"*).
- Pastikan seluruh 138 baris data telah masuk ke dataset sebelum sub-agent analis merilis kesimpulan ranking.
- Jika baru terbaca sebagian, lanjutkan proses ekstraksi hingga 100% tuntas.
