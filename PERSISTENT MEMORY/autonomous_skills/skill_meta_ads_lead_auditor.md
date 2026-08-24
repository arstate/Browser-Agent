---
id: skill_auto_meta_ads_auditor
name: Meta Ads Lead & CPR Auditor
description: Workflow otonom untuk memeriksa performa biaya per lead (CPR) dan eliminasi junk leads dari Meta Ads Manager.
version: v1.0.0
source: autonomous_ai
category: marketing
created_at: 1787515000000
updated_at: 1787515000000
success_count: 1
failure_count: 0
changelog: "v1.0.0: Initial autonomous distillation for property marketing campaign audit."
---

# ⚡ Meta Ads Lead & CPR Auditor (Autonomous Skill v1.0.0)

## 🎯 Trigger:
Gunakan skill ini saat user meminta audit iklan Meta Ads, optimasi Cost Per Result (CPR), atau analisis kualitas leads.

## 📋 Langkah Eksekusi Terbukti Sukses:
1. **Navigasi ke Ads Manager:**
   - Gunakan `browser_navigate` ke dashboard Meta Ads Manager.
   - Tunggu hingga tabel metrics (CPR, Amount Spent, Results) selesai di-load.
2. **Ekstraksi Metrik Kunci:**
   - Ambil data CPR, CTR, Frekuensi, dan Volume Chat masuk.
   - Hitung rasio *High-Intent Leads* vs *Junk Leads*.
3. **Pemberian Rekomendasi Solusi:**
   - Jika CPR > Rp 10.000, sarankan perbaikan Headline Hook atau penyesuaian usia targeting (27-45 tahun).
   - Pastikan Hero Offer (DP 0%, Cicilan Ringan, Free BPHTB/Biaya) ditekankan di ad copy.
