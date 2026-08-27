# Skill 17: KV Cache & Prompt Caching Optimizer

## Deskripsi
Skill arsitektur Key-Value (KV) Cache & Prompt Caching untuk mengoptimalkan efisiensi token prompt hingga 70%–90% dan mempercepat TTFT (Time To First Token) hingga 8x lipat.

## 4 Pilar Deterministic Prompt:
1. **Static Prefix Pinning:** Menjaga System Prompt & Base Rules 100% statis di awal prompt.
2. **Dynamic-to-Suffix Relocation:** Jam, tanggal, dan URL dinamis ditaruh di Suffix pesan terakhir.
3. **Deterministic Tool Sorting:** Seluruh JSON schema tools selalu diurutkan alfabetis.
4. **Explicit Breakpoint Injection:** Menyisipkan flag ephemeral cache untuk Anthropic Claude / DeepSeek.

## Perintah Tersedia:
- `/kvcache [balanced|aggressive|strict]`
- `/kvcache-audit`
- `/kvcache-meter`
