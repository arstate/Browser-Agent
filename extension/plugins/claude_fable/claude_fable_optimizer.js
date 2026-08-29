/**
 * =========================================================================
 * Browser Agent - Claude Fable 5 Cognitive & Epistemic Distillation Engine
 * Distilled from Anthropic's Claude Fable 5 (Mythos-Tier System Prompt)
 * Reference: https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.md
 * =========================================================================
 */

(function(global) {
  'use strict';

  const DEFAULT_CLAUDE_FABLE_CONFIG = {
    enabled: true,
    mode: 'balanced', // 'lite' | 'balanced' | 'mythos'
    reasoningEffort: 60, // 10 to 100
    enableMemoryTaxonomy: true, // [stated] & [[links]]
    enableHorizonTest: true, // Filter ephemeral vs durable facts
    enableDignifiedTone: true, // Anti-submissive & high-dignity
    enableCheckMemoryFirst: true // Prioritize existing brain over questioning
  };

  /**
   * Dynamically calculates appropriate reasoning effort based on prompt complexity
   */
  function claudeFableCalibrateEffort(userPrompt = '') {
    if (!userPrompt || typeof userPrompt !== 'string') return 40;
    const text = userPrompt.toLowerCase();

    // High complexity: architecture, coding, SEO audit, security, math, multi-step goals
    if (/analisis mendalam|audit|arsitektur|refactor|debug|reverse|decompil|optimasi|hitung|simulasi|investigasi|forensik/i.test(text)) {
      return 85;
    }
    // Medium complexity: explanation, table extraction, summarization, research
    if (/jelaskan|bandingkan|ekstrak|rangkum|riset|cek|buka dan baca|cari informasi/i.test(text)) {
      return 55;
    }
    // Low complexity: routine tasks, media download, convert, play/pause
    if (/download|convert|ubah jadi|putar|pause|stop|kirim|halo|hai/i.test(text)) {
      return 25;
    }

    return 50;
  }

  /**
   * Generates the Master System Prompt Directive for Claude Fable 5 Distillation
   */
  function getClaudeFableSystemDirective(customConfig = {}) {
    const cfg = { ...DEFAULT_CLAUDE_FABLE_CONFIG, ...customConfig };
    const modeKey = (cfg.mode || 'balanced').toLowerCase();
    const effort = parseInt(cfg.reasoningEffort, 10) || 60;

    let directive = `\n=== 🏛️ [PLUGIN: CLAUDE FABLE 5 COGNITIVE DISTILLATION (AKTIF - TIER: ${modeKey.toUpperCase()})] ===\n`;
    directive += `<antml:reasoning_effort>${effort}</antml:reasoning_effort>\n\n`;

    directive += `1. 🧠 EPISTEMIC MEMORY FILESYSTEM & TAXONOMY:\n`;
    directive += `• Format Penyimpanan Memori Terstruktur (Taxonomy):\n`;
    directive += `  - /profile.md: Identitas stabil pengguna (profesi, domain kerja, peran utama).\n`;
    directive += `  - /topics/<domain>.md: Preferensi stabil, kebiasaan, dan domain keahlian.\n`;
    directive += `  - /areas/<project>.md: Proyek dan area kerja aktif yang sedang berjalan.\n`;
    directive += `  - /people/<name>.md: Konteks relasi rekan kerja, tim, atau partner.\n`;
    directive += `  - /preferences.md: Panduan bagaimana pengguna ingin AI merespons.\n`;
    directive += `• Tag [stated] & Entity Links [[wiki-style]]:\n`;
    directive += `  - Beri label '- [stated]' pada setiap fakta eksplisit dari pengguna.\n`;
    directive += `  - Hubungkan entitas dengan format link ganda (contoh: [[nama-proyek]], [[partner]]).\n`;
    directive += `• Check Memory First Protocol: Selalu prioritaskan mengecek fakta di memori Brain sebelum bertanya ulang kepada pengguna.\n\n`;

    directive += `2. ⏳ HORIZON TEST (DURABLE VS EPHEMERAL STATE):\n`;
    directive += `• Uji Horizon 30 Hari: Simpan hanya fakta yang bernilai dan relevan >30 hari ke depan.\n`;
    directive += `• Jangan mengotori Brain dengan status sementara yang kedaluwarsa dalam 1 percakapan.\n\n`;

    directive += `3. 👑 HIGH-DIGNITY & CONSTRUCTIVE TONE (ANTI-SUBMISSIVE):\n`;
    directive += `• Accountability Without Self-Abasement: Jika terjadi kendala/error atau kritik pengguna, akui secara objektif dan langsung fokus pada solusi teknis. DILARANG meminta maaf berlebihan atau bersikap submissive!\n`;
    directive += `• Direct Prose & Zero Fluff: Langsung ke jawaban inti tanpa kalimat pengantar basa-basi ("Tentu, saya akan membantu Anda...") atau penutup klise ("Semoga membantu!").\n`;

    if (modeKey === 'mythos') {
      directive += `\n4. ⚡ MYTHOS-TIER REASONING STANDARDS:\n`;
      directive += `• Lakukan verifikasi lookahead multi-hop sebelum mengeksekusi aksi fatal.\n`;
      directive += `• Pisahkan dokumen/kode mandiri secara terstruktur (Artifact Pattern) dari percakapan teks biasa.\n`;
    }

    return directive;
  }

  /**
   * Evaluates if a factual sentence passes the Horizon Test (>30 days durability)
   */
  function isDurableFact(factText = '') {
    if (!factText || typeof factText !== 'string') return false;
    const lower = factText.toLowerCase();

    // Ephemeral / transient patterns (Fail Horizon Test)
    const ephemeralPatterns = [
      /\b(hari ini|sekarang|tadi|barusan|lagi error|sedang mencoba|menit lalu|jam lalu)\b/i,
      /\b(downloading|uploading|lagi buka|buka tab|convert ini|pause video)\b/i,
      /\b(error 404|exit status|perintah gagal|syntaxerror)\b/i
    ];

    for (const pat of ephemeralPatterns) {
      if (pat.test(lower)) return false;
    }

    // Durable patterns (Pass Horizon Test)
    const durablePatterns = [
      /\b(saya bekerja|saya adalah|proyek saya|preferensi|selalu gunakan|lokasi saya|nama saya|bahasa)\b/i,
      /\b(suka|menggunakan framework|menggunakan stack|aturan|database)\b/i
    ];

    for (const pat of durablePatterns) {
      if (pat.test(lower)) return true;
    }

    return factText.trim().length > 15;
  }

  /**
   * Formats a raw fact into standard Claude Fable [stated] fact line with links
   */
  function formatDurableFact(factText = '', entityLinks = []) {
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

  const ClaudeFableOptimizer = {
    DEFAULT_CLAUDE_FABLE_CONFIG,
    claudeFableCalibrateEffort,
    getClaudeFableSystemDirective,
    isDurableFact,
    formatDurableFact
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClaudeFableOptimizer;
  } else {
    global.ClaudeFableOptimizer = ClaudeFableOptimizer;
    global.getClaudeFableSystemDirective = getClaudeFableSystemDirective;
    global.claudeFableCalibrateEffort = claudeFableCalibrateEffort;
  }
})(typeof self !== 'undefined' ? self : this);
