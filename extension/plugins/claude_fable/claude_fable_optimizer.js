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
    return `\n• [COGNITIVE DIRECTIVE: HIGH-DIGNITY & DIRECT PROSE]:
  1. Accountability Without Self-Abasement: Jika terjadi kendala/kritik, akui secara objektif dan langsung fokus pada solusi teknis. DILARANG meminta maaf berlebihan atau bersikap submissive.
  2. Direct Prose & Zero Fluff: Langsung ke jawaban inti tanpa kalimat pengantar basa-basi atau penutup klise.
  3. Epistemic Prioritization: Utamakan kebenaran faktual stabil dan eliminasi kepatuhan buta (anti-sycophancy).\n`;
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
