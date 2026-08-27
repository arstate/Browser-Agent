# Skill 16: Ponytail Context Trimmer & Lazy Senior Developer

## Deskripsi
Skill kompresi token kontekstual dan prinsip *Lazy Senior Developer* berdasarkan filosofi DietrichGebert/ponytail. Mengeliminasi over-engineering, memprioritaskan fitur native browser dan standard library, serta secara otomatis memotong snapshot DOM berlebih dan string base64 untuk menghemat 50-75% token prompt.

## The Ponytail Decision Ladder
1. **Apakah ini perlu ada sama sekali? (YAGNI):** Jangan buat yang tidak diminta.
2. **Sudah ada di codebase?** Gunakan kembali helper/utilitas yang sudah ada di repo.
3. **Apakah Standard Library menyediakannya?** Gunakan stdlib.
4. **Apakah fitur platform native menyediakannya?** Gunakan native API browser.
5. **Apakah dependensi yang terpasang bisa menyelesaikannya?** Jangan tambah package baru.
6. **Bisa satu baris?** Jadikan satu baris.
7. **Hanya jika tidak bisa:** Tulis kode baru seminimal mungkin yang bekerja dengan benar.

## Perintah & Sub-Skills
- `/ponytail [lite|full|ultra]` : Set intensitas lazy developer.
- `/ponytail-review` : Review diff fokus eliminasi kompleksitas.
- `/ponytail-audit` : Audit codebase untuk membersihkan bloat.
- `/ponytail-debt` : Rekap penanda `# ponytail:` ke ledger teknikal debt.
- `/ponytail-gain` : Tampilkan scoreboard efisiensi & benchmark penghematan token.
- `/ponytail-help` : Panduan bantuan cepat perintah Ponytail.

## Context Trimming & Pruning
- Mempertahankan ${maxRecentTurns || 6} turn pesan terakhir dalam resolusi penuh.
- Memotong snapshot DOM AXTree lama yang berulang.
- Mengganti base64 gambar lama dengan metadata ringkas.
- Melindungi System Prompt, Knowledge Graph, dan Aturan User.
