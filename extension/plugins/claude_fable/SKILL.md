---
name: claude-fable-5-distillation
description: Distilasi arsitektur kognitif Claude Fable 5 Anthropic (Mythos-tier). Meliputi Epistemic Memory Filesystem, Horizon Test 30 hari, Adaptive Reasoning Effort (<antml:reasoning_effort>), dan Dignified Prose Communication.
---

# 🏛️ Claude Fable 5 Cognitive & Memory Distillation

Plugin ini mengadaptasi dan mendistilasikan arsitektur sistem kognitif tingkat tinggi dari **Claude Fable 5 (Anthropic Mythos-tier)** ke dalam Browser Agent.

---

## 💎 Pilar Inti Distilasi:

1. **Epistemic Memory Filesystem (Obsidian Wiki-Style)**:
   - Mengelompokkan memori ke dalam `/profile.md`, `/topics/`, `/areas/`, `/people/`, dan `/preferences.md`.
   - Menggunakan format label `- [stated]` pada fakta langsung dari pengguna dan tautan ganda `[[entitas]]`.
   - *Check Memory First*: Memprioritaskan penelusuran fakta di Brain sebelum bertanya ulang.

2. **Horizon Test (Uji Tahan Lama 30 Hari)**:
   - Memfilter fakta sementara (downloading, status tab, error sesaat) agar tidak mengotori database memori permanen.

3. **High-Dignity & Non-Apologetic Tone**:
   - Zero-Fluff: Langsung ke pokok jawaban tanpa kalimat pengantar basa-basi atau penutup klise.
   - Akuntabilitas Tanpa Merendahkan Diri: Memperbaiki kesalahan secara lugas dan objektif.

4. **Adaptive Reasoning Effort (`<antml:reasoning_effort>`)**:
   - Menyesuaikan kedalaman pemikiran (10-100) secara otomatis sesuai tingkat kesulitan tugas.
