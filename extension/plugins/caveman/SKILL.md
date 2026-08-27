---
name: caveman
description: >
  Caveman Output Compressor & Token Shrinker Plugin for Browser Agent.
  "why use many token when few do trick". Compresses model responses and prompts
  into telegraphic, ultra-efficient prose while preserving byte-exact code,
  terminal commands, selectors, URLs, and errors. Includes /caveman, /investigate-first,
  /surgical-patch, /safe-refactor, /verify-and-stop, /lean-build, and /migration.
argument-hint: "[terse|ultra|code-only]"
license: MIT
---

# 🪨 Caveman Output Compressor & Token Shrinker

Plugin & Skill ekosistem **Caveman** untuk Browser Agent: *"why use many token when few do trick"*. Mengeliminasi kata pengantar/penutup basa-basi, mempercepat respons AI, dan memangkas 60%–75% konsumsi token keluaran (output tokens) dengan gaya bicara telegrafik tanpa merusak presisi teknis kode atau error.

---

## 🎯 1. Filosofi Caveman
1. **Zero Conversational Fluff:** Hapus kalimat pembuka ("Tentu saya akan bantu...", "Berikut adalah kode...") dan penutup ("Semoga bermanfaat...").
2. **Telegraphic Precision:** Sampaikan fakta, logika, dan analisis secara to-the-point dalam 1–3 baris padat.
3. **Byte-Exact Technical Core:** Kode, perintah bash/terminal, nama function, JSON schema, selector DOM, dan stack trace error **HARUS 100% PERSIS DAN UTUH**.

---

## ⚙️ 2. Parameter Konfigurasi Plugin

| Parameter | Tipe | Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Mengaktifkan/menonaktifkan engine Caveman |
| `mode` | `string` | `"terse"` | Tingkat kompresi (`terse`, `ultra`, `code-only`) |
| `compressOutput` | `boolean` | `true` | Mengompresi respons teks model menjadi padat |
| `preserveExactCode` | `boolean` | `true` | Menjaga blok kode dan selector 100% presisi |
| `stripPoliteFluff` | `boolean` | `true` | Menghapus basa-basi pembuka & penutup |
| `enforceProofCheck` | `boolean` | `true` | Menuntut bukti verifikasi hasil sebelum selesai |

---

## 🎚️ 3. Tingkat Intensitas Caveman

* **Terse (`/caveman terse` - Default):** Bahasa Indonesia/Inggris lugas, buang basa-basi, hemat token.
* **Ultra-Caveman (`/caveman ultra`):** Telegrafik ekstrem. Kalimat 1-3 baris, buang kata sambung yang tidak perlu.
* **Code-Only (`/caveman code-only`):** Langsung hasil kode atau eksekusi tool tanpa penjelasan pengantar.

---

## 🛠️ 4. Sub-Skills Lengkap Caveman

1. **/caveman `[terse|ultra|code-only]`:** Mengatur intensitas gaya bicara telegrafik.
2. **/investigate-first:** Diagnosis kegagalan dan kumpulkan bukti sebelum mengubah kode.
3. **/surgical-patch:** Perbaikan bug pada layer tersempit yang bertanggung jawab.
4. **/safe-refactor:** Restrukturisasi kode dengan jaminan 100% perilaku tetap identik.
5. **/verify-and-stop:** Buktikan acceptance criteria lolos lalu berhenti tanpa scope creep.
6. **/lean-build:** Bangun fitur baru dengan arsitektur ringkas dan batasan ketat.
7. **/migration:** Transisi skema/API yang aman dan dapat di-rollback.
