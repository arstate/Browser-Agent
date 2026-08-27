/**
 * =========================================================================
 * Browser Agent - Ponytail Context Trimmer, Token Saver & Lazy Senior Engine
 * Core optimization algorithms for Multi-Turn History, DOM Pruning, Base64 Stripping,
 * Over-Engineering Auditing, Debt Harvesting, and Token Metering.
 * Reference: https://github.com/DietrichGebert/ponytail
 * =========================================================================
 */

const PONYTAIL_DEFAULT_CONFIG = {
  enabled: true,
  mode: 'full', // 'lite' | 'full' | 'ultra'
  maxRecentTurns: 6,
  maxToolOutputChars: 1200,
  stripRedundantDOM: true,
  stripBase64: true,
  preserveSystemFacts: true,
  lazyDecisionLadder: true,
  autoHookEnabled: true
};

/**
 * Optimizes an array of chat messages before sending to the LLM API.
 * Prunes older DOM dumps, replaces large base64 strings with metadata tags,
 * truncates lengthy historical tool logs, and retains only the most recent N turns.
 */
function applyPonytailContextOptimization(messages, customConfig = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const config = { ...PONYTAIL_DEFAULT_CONFIG, ...customConfig };
  if (config.enabled === false) return messages;

  const maxTurns = Math.max(2, parseInt(config.maxRecentTurns, 10) || 6);
  const maxToolChars = Math.max(300, parseInt(config.maxToolOutputChars, 10) || 1200);
  const stripDOM = config.stripRedundantDOM !== false;
  const stripB64 = config.stripBase64 !== false;
  const preserveFacts = config.preserveSystemFacts !== false;

  // 1. Separate system messages (and protected cognitive memory if enabled)
  const systemMsgs = [];
  const nonSystemMsgs = [];

  for (const msg of messages) {
    if (msg.role === 'system' || (preserveFacts && msg.isSystemFact)) {
      systemMsgs.push(msg);
    } else {
      nonSystemMsgs.push(msg);
    }
  }

  // 2. Determine sliding window threshold for recent turns
  const recentThreshold = Math.max(0, nonSystemMsgs.length - maxTurns);

  // 3. Process and compact non-system messages
  const optimizedNonSystem = nonSystemMsgs.slice(recentThreshold).map((msg, index, arr) => {
    const isLatestTurn = index >= arr.length - 2; // Keep last 2 turns in highest fidelity
    let content = msg.content;

    if (typeof content === 'string') {
      // 3a. Strip massive Base64 data URLs in older turns
      if (stripB64 && !isLatestTurn && content.includes('data:image/')) {
        content = content.replace(
          /data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{80,}/g,
          '[🖼️ Image Data URL Pruned by Ponytail Token Saver]'
        );
      }

      // 3b. Prune repetitive DOM snapshots and AXTree dumps
      if (stripDOM && !isLatestTurn && (content.includes('AXTree') || content.includes('backendNodeId') || content.includes('accessibilityTree') || content.includes('interactiveElements'))) {
        if (content.length > maxToolChars) {
          content = content.slice(0, maxToolChars) + `\n... [✂️ Snapshot DOM / AXTree ${content.length - maxToolChars} karakter dipadatkan oleh Ponytail]`;
        }
      }

      // 3c. Truncate long tool execution logs in historical turns
      if (!isLatestTurn && content.length > maxToolChars) {
        content = content.slice(0, maxToolChars) + `\n... [✂️ Output riwayat dipangkas (${content.length - maxToolChars} karakter dihemat oleh Ponytail)]`;
      }
    } else if (Array.isArray(content)) {
      // Handle multimodal message contents (text + image_url blocks)
      content = content.map(part => {
        if (part.type === 'image_url' && !isLatestTurn && stripB64) {
          if (part.image_url?.url?.startsWith('data:image/')) {
            return {
              type: 'text',
              text: '[🖼️ Image Data URL Pruned by Ponytail Token Saver]'
            };
          }
        }
        return part;
      });
    }

    return {
      ...msg,
      content
    };
  });

  return [...systemMsgs, ...optimizedNonSystem];
}

/**
 * Calculates token efficiency metrics between original and compressed messages.
 */
function ponytailEstimateTokenSavings(originalMsgs = [], optimizedMsgs = []) {
  const calcLen = (msgs) => {
    if (!Array.isArray(msgs)) return 0;
    return msgs.reduce((acc, m) => {
      if (typeof m.content === 'string') return acc + m.content.length;
      if (Array.isArray(m.content)) return acc + JSON.stringify(m.content).length;
      return acc + 100;
    }, 0);
  };

  const origChars = calcLen(originalMsgs);
  const optChars = calcLen(optimizedMsgs);

  // Approximation: ~4 characters per token
  const origTokens = Math.round(origChars / 4);
  const optTokens = Math.round(optChars / 4);
  const savedTokens = Math.max(0, origTokens - optTokens);
  const percentSaved = origTokens > 0 ? Math.round((savedTokens / origTokens) * 100) : 0;

  // Approx cost savings based on average $2.50 / 1M input tokens
  const estimatedCostSavedUSD = ((savedTokens / 1_000_000) * 2.50).toFixed(4);

  return {
    original_chars: origChars,
    optimized_chars: optChars,
    original_tokens: origTokens,
    optimized_tokens: optTokens,
    tokens_saved: savedTokens,
    percent_saved: percentSaved,
    estimated_cost_saved_usd: `$${estimatedCostSavedUSD}`,
    efficiency_rating: percentSaved >= 60 ? 'Ultra Efficient' : percentSaved >= 30 ? 'Good' : 'Standard'
  };
}

/**
 * Performs an over-engineering code review of a diff snippet.
 * Tags: delete:, stdlib:, native:, yagni:, shrink:
 */
function ponytailReviewDiff(diffText = '') {
  if (!diffText || typeof diffText !== 'string') {
    return { status: 'empty', message: 'No diff content provided.', findings: [], netLinesPossible: 0 };
  }

  const findings = [];
  const lines = diffText.split('\n');
  let netLinesPossible = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Check for Moment.js / Day.js when native Intl or Date exists
    if (trimmed.includes('require("moment")') || trimmed.includes('import moment') || trimmed.includes('from "dayjs"')) {
      findings.push({
        line: lineNum,
        tag: 'native',
        what: 'Import library manipulasi tanggal untuk formatting sederhana',
        replacement: 'Gunakan native Intl.DateTimeFormat atau Date API (0 dependency).',
        estimatedCut: 15
      });
      netLinesPossible += 15;
    }

    // Check for Lodash / Underscore utils that are built-in JS
    if (trimmed.includes('_.cloneDeep') || trimmed.includes('lodash.clonedeep')) {
      findings.push({
        line: lineNum,
        tag: 'native',
        what: 'Lodash cloneDeep',
        replacement: 'Gunakan native structuredClone(obj) (bawaan modern JavaScript).',
        estimatedCut: 10
      });
      netLinesPossible += 10;
    }

    // Check for single implementation interfaces or unnecessary factory boilerplate
    if (trimmed.startsWith('class ') && trimmed.includes('Factory') && trimmed.includes('{')) {
      findings.push({
        line: lineNum,
        tag: 'yagni',
        what: 'Factory pattern untuk pembuatan objek tunggal',
        replacement: 'Inline konstruksi objek langsung tanpa layer factory.',
        estimatedCut: 20
      });
      netLinesPossible += 20;
    }

    // Check for redundant Axios import when native fetch is available
    if (trimmed.includes('import axios') || trimmed.includes('require("axios")')) {
      findings.push({
        line: lineNum,
        tag: 'native',
        what: 'Dependency Axios untuk HTTP request standar',
        replacement: 'Gunakan native fetch() API bawaan browser/Node.',
        estimatedCut: 25
      });
      netLinesPossible += 25;
    }
  });

  return {
    status: 'ok',
    total_findings: findings.length,
    findings,
    net_lines_possible: netLinesPossible,
    summary: findings.length === 0 ? 'Lean already. Ship.' : `net: -${netLinesPossible} lines possible.`
  };
}

/**
 * Harvests deliberate simplification markers (# ponytail: / // ponytail:)
 */
function ponytailHarvestDebt(codeText = '', filePath = 'snippet.js') {
  if (!codeText) return { totalMarkers: 0, items: [] };

  const items = [];
  const lines = codeText.split('\n');
  const regex = /(?:\/\/|#|\/\*|<!--)\s*ponytail:\s*(.*?)(?:\*\/|-->)?$/i;

  lines.forEach((line, idx) => {
    const match = line.match(regex);
    if (match) {
      const fullComment = match[1].trim();
      const parts = fullComment.split(/[,→;]|upgrade when/i);
      const skipped = parts[0]?.trim() || fullComment;
      const trigger = parts[1]?.trim() || (fullComment.includes('when') ? fullComment : null);

      items.push({
        file: filePath,
        line: idx + 1,
        skipped,
        trigger: trigger || 'no-trigger',
        hasTrigger: !!trigger
      });
    }
  });

  return {
    totalMarkers: items.length,
    noTriggerCount: items.filter(i => !i.hasTrigger).length,
    items
  };
}

/**
 * Returns the standard Ponytail measured impact scoreboard
 */
function ponytailGetGainScoreboard() {
  return `
  🐴 PONYTAIL GAIN SCOREBOARD (Benchmark Median · 5 Tasks · 3 Models)
  ──────────────────────────────────────────────────────────────────
  Lines of Code   No-Skill  ████████████████████  100%
                  Ponytail  ██▌·················    6–20%   ▼ 80–94%

  Prompt Cost     No-Skill  ████████████████████  100%
                  Ponytail  █████▌··············   23–53%  ▼ 47–77%

  Inference Speed Ponytail  ▸ 3–6× Lebih Cepat (Response Time)
  ──────────────────────────────────────────────────────────────────
  Perintah Tersedia:
    /ponytail        : Aktifkan mode lazy developer (lite | full | ultra)
    /ponytail-review : Audit diff untuk eliminasi over-engineering
    /ponytail-audit  : Audit codebase komprehensif
    /ponytail-debt   : Rekap komentar teknikal debt (# ponytail:)
    /ponytail-gain   : Tampilkan papan skor benchmark
    /ponytail-help   : Bantuan perintah cepat
`;
}

// Global Export for Chrome Extension Background Service Worker and UI Windows
if (typeof self !== 'undefined') {
  self.applyPonytailContextOptimization = applyPonytailContextOptimization;
  self.ponytailEstimateTokenSavings = ponytailEstimateTokenSavings;
  self.ponytailReviewDiff = ponytailReviewDiff;
  self.ponytailHarvestDebt = ponytailHarvestDebt;
  self.ponytailGetGainScoreboard = ponytailGetGainScoreboard;
}
if (typeof window !== 'undefined') {
  window.applyPonytailContextOptimization = applyPonytailContextOptimization;
  window.ponytailEstimateTokenSavings = ponytailEstimateTokenSavings;
  window.ponytailReviewDiff = ponytailReviewDiff;
  window.ponytailHarvestDebt = ponytailHarvestDebt;
  window.ponytailGetGainScoreboard = ponytailGetGainScoreboard;
}
