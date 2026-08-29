# 🏛️ Skill 19: Claude Fable 5 Cognitive Distillation

- **Identitas**: `claude_fable`
- **Tipe**: Cognitive System & Memory Taxonomy Plugin
- **Referensi Asal**: Leaked Anthropic Claude Fable 5 (Mythos-Tier System Prompt)
- **Fungsi Utama**:
  1. **Epistemic Memory Taxonomy**: Pengelompokan memori terstruktur (`/profile.md`, `/topics/`, `/areas/`, `/people/`, `/preferences.md`), pelabelan `- [stated]` dan tautan entitas ganda `[[wiki-links]]`.
  2. **Horizon Test**: Memfilter data transient sesaat agar tidak mengotori ingatan jangka panjang di Brain.
  3. **Check Memory First**: Menghindari pertanyaan berulang dengan mengecek database Brain sebelum bertanya.
  4. **High-Dignity & Non-Apologetic Tone**: Menghilangkan basa-basi pembuka/penutup dan mengedepankan akuntabilitas solusi tanpa bersikap submissive.
  5. **Adaptive Reasoning Effort**: Pengaturan `<antml:reasoning_effort>` dinamis (10 - 100) berbasis kompleksitas tugas.
