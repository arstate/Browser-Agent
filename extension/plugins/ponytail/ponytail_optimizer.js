/**
 * =========================================================================
 * Browser Agent - Ponytail Context Trimmer & Token Saver Engine
 * Core optimization algorithms for Multi-Turn History, DOM Pruning & Base64
 * =========================================================================
 */

function applyPonytailContextOptimization(messages, ponytailConfig = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const maxTurns = ponytailConfig.maxRecentTurns || 6;
  const maxToolChars = ponytailConfig.maxToolOutputChars || 1200;
  const stripDOM = ponytailConfig.stripRedundantDOM !== false;
  const stripBase64 = ponytailConfig.stripBase64 !== false;

  // 1. Preserve system messages
  const systemMsgs = messages.filter(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  // 2. Keep only the most recent N turns
  const trimmedNonSystem = nonSystemMsgs.slice(-maxTurns);

  // 3. Compact intermediate tool outputs and prune old DOM snapshots
  const optimizedMsgs = trimmedNonSystem.map((msg, index) => {
    const isLatest = index === trimmedNonSystem.length - 1;
    let content = msg.content;

    if (typeof content === 'string') {
      // Prune base64 data URLs from old turns
      if (stripBase64 && !isLatest && content.includes('data:image/')) {
        content = content.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g, '[Image Data URL Pruned by Ponytail]');
      }

      // Compact old tool outputs
      if (!isLatest && content.length > maxToolChars) {
        content = content.slice(0, maxToolChars) + `\n... [Sisa ${content.length - maxToolChars} karakter dipangkas oleh Ponytail Plugin untuk efisiensi token]`;
      }

      // Compact old snapshot/DOM trees
      if (stripDOM && !isLatest && (content.includes('AXTree') || content.includes('backendNodeId'))) {
        content = content.replace(/\[\d+\]\s+<[^>]+>.*(\n\s+\[\d+\]\s+<[^>]+>)*/g, '[Accessibility Tree Snapshot Dipadatkan oleh Ponytail]');
      }
    }

    return {
      ...msg,
      content
    };
  });

  return [...systemMsgs, ...optimizedMsgs];
}

// Global Export for Chrome Service Worker & Scripts
if (typeof self !== 'undefined') {
  self.applyPonytailContextOptimization = applyPonytailContextOptimization;
}
if (typeof window !== 'undefined') {
  window.applyPonytailContextOptimization = applyPonytailContextOptimization;
}
