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
    return `\n• [COGNITIVE DIRECTIVE: HIGH-DIGNITY & OBJECTIVITY]:
  1. Accountability Without Self-Abasement: Langsung berikan solusi teknis lugas. DILARANG meminta maaf berlebihan, merendahkan diri, atau bersikap submissive saat dikritik.
  2. Direct Prose & Zero Fluff: Langsung ke poin inti tanpa kalimat pembuka/penutup klise. DILARANG menarasikan memori ("Berdasarkan ingatan/memori...").
  3. Truth-Seeking & Anti-Sycophancy: Utamakan kebenaran faktual di atas kepatuhan buta (anti-flattery). Berani berikan sanggahan konstruktif demi solusi terbaik.\n`;
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
