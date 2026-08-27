/**
 * =========================================================================
 * Browser Agent - Caveman Output Compressor & Token Shrinker Engine
 * "why use many token when few do trick" - JuliusBrussee/caveman
 * =========================================================================
 */

const DEFAULT_CAVEMAN_CONFIG = {
  enabled: true,
  mode: 'terse', // 'terse' | 'ultra' | 'code-only'
  compressOutput: true,
  preserveExactCode: true,
  stripPoliteFluff: true,
  enforceProofCheck: true
};

/**
 * Returns the dynamic Caveman system directive to inject into LLM prompts.
 */
function getCavemanSystemDirective(mode = 'terse') {
  const modeKey = (mode || 'terse').toLowerCase();

  let directive = `\n=== 🪨 [PLUGIN: CAVEMAN (AKTIF - MODE: ${modeKey.toUpperCase()})] ===\n`;
  directive += `Prinsip Inti: "why use many token when few do trick". Pangkas kata basa-basi tanpa mengorbankan ketepatan teknis.\n`;

  if (modeKey === 'ultra') {
    directive += `- Bicara super padat dan telegram-style. Buang artikel dan kata pengisi.\n`;
    directive += `- Format: Langsung poin utama, aksi, atau kode. Maksimal 1-3 baris penjelasan.\n`;
    directive += `- Kode, nama fungsi, path file, dan error HARUS 100% tepat tanpa disingkat.\n`;
  } else if (modeKey === 'code-only') {
    directive += `- Prioritas kode/eksekusi tool langsung tanpa pengantar atau penutup.\n`;
    directive += `- Dilarang membuat rangkuman jika tidak diminta pengguna.\n`;
    directive += `- Jawaban non-kode ditulis dalam 1 baris singkat.\n`;
  } else {
    // Standard Terse (Default)
    directive += `- Hilangkan kalimat basa-basi sopan ("Tentu, saya akan membantu Anda...", "Berikut adalah penjelasannya").\n`;
    directive += `- Langsung ke inti jawaban secara terstruktur, to-the-point, dan hemat token.\n`;
    directive += `- Pertahankan ketepatan kode, perintah terminal, dan data teknis secara utuh.\n`;
  }

  return directive;
}

/**
 * Compresses conversational fluff from model responses
 */
function cavemanShrinkProse(text = '') {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // Strip common conversational opening fluff
  const fluffOpeners = [
    /^(?:Tentu|Baik(?:lah)?|Siap|Tentu saja|Halo|Hi|Halo bro)[,!.]?\s*(?:saya (?:akan|bisa) membantu (?:Anda|kamu|lo)[^.\n]*[.\n])?/gi,
    /^(?:Here is the (?:code|solution|fix|answer|explanation)[^:\n]*:?\s*)/gi,
    /^(?:Sure(?: thing)?,? I(?: can| will) help you with that[^.\n]*[.\n])/gi,
    /^(?:Berikut (?:ini )?(?:adalah )?(?:kode|solusi|hasil|langkah|penjelasan)[^:\n]*:?\s*)/gi
  ];

  for (const regex of fluffOpeners) {
    cleaned = cleaned.replace(regex, '');
  }

  // Strip closing fluff
  const fluffClosers = [
    /(?:Semoga (?:ini )?membantu[!.]?\s*(?:Jika ada pertanyaan[^.\n]*)?)$/gi,
    /(?:Hope this helps[!.]?\s*(?:Let me know if you need anything else[^.\n]*)?)$/gi,
    /(?:Jangan ragu untuk bertanya lagi[^.\n]*)$/gi
  ];

  for (const regex of fluffClosers) {
    cleaned = cleaned.replace(regex, '');
  }

  return cleaned.trim();
}

/**
 * Calculates Caveman token savings metrics
 */
function cavemanEstimateSavings(originalChars = 0, compressedChars = 0) {
  const origTokens = Math.round(originalChars / 4);
  const compTokens = Math.round(compressedChars / 4);
  const savedTokens = Math.max(0, origTokens - compTokens);
  const percent = origTokens > 0 ? Math.round((savedTokens / origTokens) * 100) : 0;

  return {
    original_tokens: origTokens,
    compressed_tokens: compTokens,
    saved_tokens: savedTokens,
    percent_saved: percent,
    efficiency_label: percent >= 50 ? 'Ultra Lean' : percent >= 25 ? 'Efficient' : 'Standard'
  };
}

// Global Export
if (typeof self !== 'undefined') {
  self.getCavemanSystemDirective = getCavemanSystemDirective;
  self.cavemanShrinkProse = cavemanShrinkProse;
  self.cavemanEstimateSavings = cavemanEstimateSavings;
}
if (typeof window !== 'undefined') {
  window.getCavemanSystemDirective = getCavemanSystemDirective;
  window.cavemanShrinkProse = cavemanShrinkProse;
  window.cavemanEstimateSavings = cavemanEstimateSavings;
}
