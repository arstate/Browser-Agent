# Browser Controlling & Network Wait SOP

Skill untuk mengontrol elemen browser, menangani koneksi internet lambat / proses rendering asinkron menggunakan `browser_wait`, dan mengeksekusi navigasi tab secara presisi.

## Kapan Digunakan
Gunakan ketika mengontrol browser, membuka dashboard web app kompleks (seperti Meta Ads Manager, Google Docs, Canva), mengisi formulir, atau mengklik tombol interaktif saat halaman masih dalam proses loading.

## Alur Prosedur & Best Practices
1. **Identifikasi Status Loading**:
   - Jika halaman sedang memuat data AJAX / React, atau modal sedang dalam proses animasi popup, panggil `browser_wait({ duration_seconds: 2, reason: "Menunggu render modal" })`.
2. **Inspeksi Elemen Terkini**:
   - Selalu panggil `browser_snapshot()` setelah jeda tunggu untuk mendapatkan `backendNodeId` terbaru.
3. **Eksekusi Klik & Input Terkendali**:
   - Gunakan `browser_click({ backendNodeId })` atau `browser_type({ backendNodeId, text, pressEnter })`.
4. **Verifikasi Visual**:
   - Panggil `browser_screenshot()` untuk memastikan layar telah berubah sesuai target sebelum melanjutkan ke langkah berikutnya.
