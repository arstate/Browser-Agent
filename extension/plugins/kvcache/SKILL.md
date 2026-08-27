---
name: kvcache-optimizer
description: >
  KV Cache & Prompt Caching Optimizer Plugin for Browser Agent. Enforces
  deterministic prefix ordering, isolates dynamic timestamps and URLs to prompt
  suffixes, sorts tool schemas alphabetically, and injects explicit ephemeral
  cache breakpoints to achieve 80-95% KV Cache hit rates and reduce API costs by 70-90%.
argument-hint: "[balanced|aggressive|strict]"
license: MIT
---

# ⚡ KV Cache & Prompt Caching Optimizer

Plugin & Skill ekosistem **KV Cache Optimizer** untuk Browser Agent: Mengunci efisiensi *Transformer Key-Value Cache* melalui *Deterministic Prefix Isolation*, pemindahan variabel dinamis ke *Suffix*, pengurutan skema tools secara alfabetis, dan penyisipan breakpoint eksplisit bagi Anthropic Claude, Google Gemini, OpenAI, DeepSeek, serta Ollama/vLLM lokal.

---

## 🎯 1. Cara Kerja KV Cache & Prompt Caching
Pada model LLM berbasis Transformer, setiap input token dikonversi menjadi representasi vektor *Key (K)* dan *Value (V)*. Ketika awalan prompt (*Prefix*) bernilai **100% IDENTIK** karakter-demi-karakter dengan request sebelumnya:
1. Backend LLM **tidak menghitung ulang** matriks KV (Zero-Recomputation).
2. Provider memberikan diskon harga input token hingga **90%** (Cache Read Tokens).
3. Latensi *Time To First Token (TTFT)* menjadi **3x–8x lebih cepat**.

---

## 🛡️ 2. 4 Pilar Deterministic Prompt Anchoring

1. **Static Prefix Pinning:** System Prompt, Master Brand Rules, dan Definisi Tools ditempatkan di paling awal dan diisolasi 100% beku.
2. **Dynamic-to-Suffix Relocation:** Jam/waktu real-time, tanggal, URL tab aktif, dan status viewport yang berubah-ubah dipindahkan ke blok *SUFFIX* paling bawah (di pesan User terbaru).
3. **Deterministic Tool Sorting:** Seluruh array JSON schema tools selalu diurutkan secara alfabetis berdasarkan `function.name`.
4. **Explicit Ephemeral Cache Breakpoints:** Menyisipkan objek `"cache_control": {"type": "ephemeral"}` pada blok static prompt / tools schema untuk Anthropic dan DeepSeek.

---

## ⚙️ 3. Parameter Konfigurasi Plugin

| Parameter | Tipe | Default | Deskripsi |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Mengaktifkan/menonaktifkan engine KV Cache |
| `mode` | `string` | `"aggressive"` | Tingkat optimasi (`balanced`, `aggressive`, `strict`) |
| `isolateDynamicSuffix` | `boolean` | `true` | Memindahkan timestamp dan URL dinamis ke suffix prompt |
| `deterministicToolSort` | `boolean` | `true` | Mengurutkan JSON schema tools secara alfabetis |
| `injectExplicitBreakpoints` | `boolean` | `true` | Menambahkan cache_control ephemeral untuk Anthropic/DeepSeek |
| `preserveFrozenTurns` | `boolean` | `true` | Membekukan riwayat turn sebelumnya agar cache tidak invalid |

---

## 🎚️ 4. Tingkat Intensitas Cache

* **Balanced:** Mengisolasi waktu dinamis dan menjaga kestabilan prefix dasar.
* **Aggressive (Default):** Prefix Pinning total, pengurutan alfabetis seluruh tools, pemindahan URL/Viewport ke Suffix, dan breakpoint eksplisit.
* **Strict:** Validasi byte-level determinism; memblokir modifikasi acak di tengah riwayat percakapan.

---

## 🛠️ 5. Perintah & Sub-Skills

* **/kvcache `[balanced|aggressive|strict]`:** Mengatur mode dan memeriksa status KV Cache.
* **/kvcache-audit:** Memindai prompt untuk mendeteksi anti-pattern *Cache-Busting* (timestamp di prefix, session UUID acak, tools tidak terurut).
* **/kvcache-meter:** Menampilkan laporan scoreboard efisiensi cache hit ratio dan estimasi penghematan biaya.
