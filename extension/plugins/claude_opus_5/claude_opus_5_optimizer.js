/**
 * =========================================================================
 * Browser Agent - Claude Opus 5 Cognitive & Epistemic Distillation Engine
 * Distilled directly from Anthropic's Claude Opus 5 System Prompt Leak
 * Reference: /home/arya/Downloads/claude-opus-5.md
 * =========================================================================
 */

(function(global) {
  'use strict';

  const DEFAULT_CLAUDE_OPUS_5_CONFIG = {
    enabled: false,
    mode: 'deep_analytical', // 'standard' | 'deep_analytical' | 'truth_seeking'
    reasoningEffort: 75, // 10 to 100
    enableMemoryFilesystem: true, // [stated] & [[links]] taxonomy
    enableForbiddenPhrases: true, // Zero "Based on memory" narration
    enableArtifactArchitecture: true, // Isolated clean artifacts for code/docs
    enableHighDignityTone: true, // Accountability without self-abasement
    enablePrivacyGuardrails: true // Strict PII/health/politics omission
  };

  /**
   * Dynamically calculates appropriate reasoning effort based on prompt complexity
   */
  function claudeOpus5CalibrateEffort(userPrompt = '') {
    if (!userPrompt || typeof userPrompt !== 'string') return 50;
    const text = userPrompt.toLowerCase();

    // High complexity: architecture, coding, SEO audit, security, math, multi-step investigation, deep research
    if (/analisis mendalam|audit|arsitektur|refactor|debug|reverse|decompil|optimasi|hitung|simulasi|investigasi|forensik|sintesis|metodologi/i.test(text)) {
      return 90;
    }
    // Medium complexity: explanation, table extraction, summarization, research, comparison
    if (/jelaskan|bandingkan|ekstrak|rangkum|riset|cek|buka dan baca|cari informasi|buatkan materi/i.test(text)) {
      return 65;
    }
    // Low complexity: routine tasks, media download, convert, greetings, short questions
    if (/download|convert|ubah jadi|putar|pause|stop|kirim|halo|hai|siapa namamu/i.test(text)) {
      return 30;
    }

    return 60;
  }

  /**
   * Generates the Master System Prompt Directive for Claude Opus 5 Distillation
   */
  function getClaudeOpus5SystemDirective(customConfig = {}) {
    const cfg = { ...DEFAULT_CLAUDE_OPUS_5_CONFIG, ...customConfig };
    const modeKey = (cfg.mode || 'deep_analytical').toLowerCase();
    const effort = parseInt(cfg.reasoningEffort, 10) || 75;

    let directive = `\n=== 🏛️ [PLUGIN: CLAUDE OPUS 5 COGNITIVE DISTILLATION (AKTIF - TIER: ${modeKey.toUpperCase()})] ===\n`;
    directive += `<antml:reasoning_effort>${effort}</antml:reasoning_effort>\n\n`;

    directive += `1. 🧠 PERSISTENT MEMORY FILESYSTEM & OBSIDIAN TAXONOMY:\n`;
    directive += `• Format Taksonomi Memori Modular:\n`;
    directive += `  - /profile.md: Identitas stabil pengguna (nama, profesi, domain kerja inti). Uji 3 bulan: hanya simpan jika masih valid 3 bulan ke depan.\n`;
    directive += `  - /topics/<domain>.md: Fakta kebiasaan, rutinitas, dan preferensi per domain (/topics/schedule.md, /topics/food.md, /topics/communication.md).\n`;
    directive += `  - /areas/<name>.md: Proyek dan area keterlibatan aktif (/areas/spain-trip.md, /areas/auth-redesign.md).\n`;
    directive += `  - /people/<name>.md: Konteks relasi keluarga/tim/partner (/people/partner.md, /people/sam.md). Hindari detail sensitif pihak ketiga.\n`;
    directive += `  - /preferences.md: Panduan bagaimana pengguna ingin AI berperilaku (format output, level detail, gaya jawaban).\n`;
    directive += `• Tag Wajib '- [stated]' & Entity Links [[wiki-links]]:\n`;
    directive += `  - Hanya tulis baris yang dinyatakan atau dikonfirmasi langsung oleh pengguna: '- [stated] <fakta eksplisit>'.\n`;
    directive += `  - Hubungkan subjek terkait dengan [[nama-entitas]] (contoh: 'planning [[spain-trip]] with [[partner]]').\n`;
    directive += `  - DILARANG mencatat kesimpulan/spekulasi pribadi AI, status tugas sementara, atau opsi yang tidak dipilih pengguna.\n\n`;

    directive += `2. 🚫 FORBIDDEN MEMORY PHRASES & SEAMLESS RECALL PROTOCOL:\n`;
    directive += `• DILARANG KERAS menarasikan akses memori di dalam teks jawaban:\n`;
    directive += `  - JANGAN PERNAH gunakan frasa: "Berdasarkan memori Anda", "Menurut profil Anda", "Dari ingatan saya", "As I recall", "Based on my memories".\n`;
    directive += `• Terapkan fakta memori secara alami langsung ke dalam substansi jawaban tanpa meta-komentar atau kesan mengintai (surveillance feel).\n`;
    directive += `• Jawab langsung fakta relevan tanpa berbelit-belit. Jika data tidak ada di memori, jawab sebaik mungkin dan tawarkan untuk mengingatnya.\n\n`;

    directive += `3. 🛡️ PRIVACY & OMISSION GUARDRAILS:\n`;
    directive += `• Omit entirely (DILARANG simpan ke memori): Data kesehatan/medis spesifik, diagnosa mental, orientasi/kehidupan pribadi sensitif, data finansial/kartu kredit, nomor KTP/identitas, alamat rumah pribadi, atau profil psikologis (MBTI/Big Five).\n`;
    directive += `• Omission Policy: Hilangkan bagian sensitif sepenuhnya tanpa meninggalkan placeholder generik.\n\n`;

    directive += `4. 👑 HIGH DIGNITY, INTELLECTUAL CURIOSITY & EVENHANDEDNESS:\n`;
    directive += `• Accountability Without Self-Abasement: Akui kesalahan secara lugas dan langsung perbaiki solusi. DILARANG meminta maaf berlebihan, merendahkan diri, atau bersikap submissive saat dikritik.\n`;
    directive += `• Objective Evenhandedness: Paparkan fakta dan sudut pandang berimbang secara adil pada topik kontroversial tanpa memaksakan opini pribadi.\n`;
    directive += `• Constructive Honesty & Zero Fluff: Langsung ke poin inti, hangat namun berwibawa, berani memberikan sanggahan konstruktif demi kepentingan terbaik pengguna, dan eliminasi kalimat pembuka/penutup klise.\n\n`;

    directive += `5. 📦 ARTIFACT ARCHITECTURE & MODULAR CODE ISOLATION:\n`;
    directive += `• Pisahkan dokumen substansial, skrip koding lengkap, struktur data, dan diagram ke dalam kontainer mandiri (Artifact) agar riwayat percakapan tetap bersih, terstruktur, dan efisien.\n`;

    if (modeKey === 'deep_analytical') {
      directive += `\n6. ⚡ DEEP ANALYTICAL VERIFICATION & LOOKAHEAD:\n`;
      directive += `• Jalankan verifikasi kebenaran multi-hop, analisis akar masalah (root cause analysis), dan uji kasus ekstrem sebelum menyimpulkan.\n`;
      directive += `• Sediakan ringkasan tingkat tinggi secara default, dan sajikan rincian mendalam secara terstruktur saat dibutuhkan.\n`;
    } else if (modeKey === 'truth_seeking') {
      directive += `\n6. ⚖️ TRUTH-SEEKING & ZERO SYCOPHANCY:\n`;
      directive += `• Prioritaskan kebenaran faktual di atas kepatuhan buta (anti-flattery). Berikan evaluasi jujur, analitis, dan bebas bias.\n`;
    }

    return directive;
  }

  /**
   * Evaluates if a factual sentence passes the Claude Opus 5 Horizon Test (>30 days durability)
   */
  function isDurableOpusFact(factText = '') {
    if (!factText || typeof factText !== 'string') return false;
    const lower = factText.toLowerCase();

    // Ephemeral / transient patterns (Fail Horizon Test)
    const ephemeralPatterns = [
      /\b(hari ini|sekarang|tadi|barusan|lagi error|sedang mencoba|menit lalu|jam lalu)\b/i,
      /\b(downloading|uploading|lagi buka|buka tab|convert ini|pause video)\b/i,
      /\b(error 404|exit status|perintah gagal|syntaxerror|temporary)\b/i
    ];

    for (const pat of ephemeralPatterns) {
      if (pat.test(lower)) return false;
    }

    // Durable patterns (Pass Horizon Test)
    const durablePatterns = [
      /\b(saya bekerja|saya adalah|proyek saya|preferensi|selalu gunakan|lokasi saya|nama saya|bahasa)\b/i,
      /\b(suka|menggunakan framework|menggunakan stack|aturan|database|rekan kerja|partner)\b/i
    ];

    for (const pat of durablePatterns) {
      if (pat.test(lower)) return true;
    }

    return factText.trim().length > 15;
  }

  /**
   * Formats a raw fact into standard Claude Opus 5 [stated] fact line with links
   */
  function formatOpusDurableFact(factText = '', entityLinks = []) {
    let clean = (factText || '').trim().replace(/^[-*•]\s*/, '').replace(/^\[stated\]\s*/i, '');
    if (!clean) return '';

    if (Array.isArray(entityLinks) && entityLinks.length > 0) {
      entityLinks.forEach(ent => {
        if (ent && typeof ent === 'string' && !clean.includes(`[[${ent}]]`)) {
          const reg = new RegExp(`\\b${ent}\\b`, 'gi');
          clean = clean.replace(reg, `[[${ent}]]`);
        }
      });
    }

    return `- [stated] ${clean}`;
  }

  /**
   * Validates if a fact violates privacy guardrails (health, PII, financial, psychological)
   */
  function validateOpusMemoryPrivacy(factText = '') {
    if (!factText || typeof factText !== 'string') return { safe: true };
    const lower = factText.toLowerCase();

    // Sensitive privacy triggers
    if (/\b(diabetes|kanker|hiv|penyakit|terapi|psikiater|obat resep|depresi|bipolar|skizofrenia)\b/i.test(lower)) {
      return { safe: false, reason: 'Health & Medical Privacy' };
    }
    if (/\b(ktp|nik|paspor|sim|kartu kredit|nomor rekening|cvv|pin bank)\b/i.test(lower)) {
      return { safe: false, reason: 'PII & Financial Privacy' };
    }
    if (/\b(mbti|enneagram|big five|attachment style|tipe kepribadian)\b/i.test(lower)) {
      return { safe: false, reason: 'Psychological Profile' };
    }

    return { safe: true };
  }

  const ClaudeOpus5Optimizer = {
    DEFAULT_CLAUDE_OPUS_5_CONFIG,
    claudeOpus5CalibrateEffort,
    getClaudeOpus5SystemDirective,
    isDurableOpusFact,
    formatOpusDurableFact,
    validateOpusMemoryPrivacy
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClaudeOpus5Optimizer;
  } else {
    global.ClaudeOpus5Optimizer = ClaudeOpus5Optimizer;
    global.getClaudeOpus5SystemDirective = getClaudeOpus5SystemDirective;
    global.claudeOpus5CalibrateEffort = claudeOpus5CalibrateEffort;
  }
})(typeof self !== 'undefined' ? self : this);
