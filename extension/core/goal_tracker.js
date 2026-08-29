/**
 * =========================================================================
 * Browser Agent - Goal-Driven Deep Reasoning & Task Tracker Engine (Option 3)
 * Multi-Step Goal Decomposition, Milestone Tracking & Completion Guard
 * =========================================================================
 */

(function(global) {
  'use strict';

  /**
   * Checks if user prompt represents a multi-step, complex goal, or explicit /goal command
   */
  function isGoalTask(promptText) {
    if (!promptText || typeof promptText !== 'string') return false;
    const clean = promptText.trim().toLowerCase();

    if (clean.startsWith('/goal')) return true;

    // Multi-step indicators
    const multiStepPatterns = [
      /\b(lalu|kemudian|setelah itu|selanjutnya|lakukan langkah|step by step|tahapan)\b/i,
      /\b(1\.|2\.|3\.)/,
      /\b(pertama|kedua|ketiga)\b/i,
      /\b(audit|analisis lengkap|riset mendalam|scrape dan simpan|ekstrak dan konversi|buat laporan)\b/i,
      /\b(dan kirim|dan download|serta convert)\b/i
    ];

    for (const pat of multiStepPatterns) {
      if (pat.test(clean)) return true;
    }

    return false;
  }

  /**
   * Extracts or decomposes a user prompt into structured milestones
   */
  function extractGoalMilestones(promptText) {
    if (!promptText || typeof promptText !== 'string') return [];

    let text = promptText.replace(/^\/goal\s*/i, '').trim();
    const milestones = [];

    // 1. Check for explicit numbered lines (e.g. 1. xxx, 2. yyy)
    const numberedRegex = /(?:^|\n)\s*(?:\d+[\.\)]|\-|\*)\s*([^\n]+)/g;
    let match;
    while ((match = numberedRegex.exec(text)) !== null) {
      const item = match[1].trim();
      if (item.length > 3) {
        milestones.push({
          id: milestones.length + 1,
          title: item,
          completed: false,
          inProgress: milestones.length === 0
        });
      }
    }

    // 2. If no numbered lines found, split by conjunctions (lalu, kemudian, setelah itu)
    if (milestones.length < 2) {
      const stepParts = text.split(/\s*(?:,\s*lalu\s+|,\s*kemudian\s+|,\s*setelah itu\s+|\s+lalu\s+|\s+kemudian\s+|\s+setelah itu\s+|\s+dan setelahnya\s+)\s*/i);
      if (stepParts.length > 1) {
        stepParts.forEach((part, idx) => {
          const cleanPart = part.trim().replace(/^[-*•]\s*/, '');
          if (cleanPart.length > 3) {
            milestones.push({
              id: idx + 1,
              title: cleanPart,
              completed: false,
              inProgress: idx === 0
            });
          }
        });
      }
    }

    // 3. Fallback: Decompose complex instruction into standard 3-phase Goal Matrix
    if (milestones.length === 0) {
      milestones.push(
        { id: 1, title: `Inisialisasi & Pengumpulan Data: ${text.slice(0, 60)}...`, completed: false, inProgress: true },
        { id: 2, title: "Eksekusi Aksi & Pemrosesan Berkas / Web Dashboard", completed: false, inProgress: false },
        { id: 3, title: "Validasi Hasil Akhir & Penyusunan Laporan Tuntas", completed: false, inProgress: false }
      );
    }

    return milestones;
  }

  /**
   * Builds the System Instruction Goal Directive containing the live Goal Checklist Matrix
   */
  function buildGoalPromptDirective(milestones) {
    if (!milestones || milestones.length === 0) return '';

    const listStr = milestones.map(m => {
      const mark = m.completed ? '[x]' : (m.inProgress ? '[▶]' : '[ ]');
      return `- ${mark} Milestone ${m.id}: ${m.title}`;
    }).join('\n');

    return `\n\n=== 🎯 MANDAT GOAL CHECKLIST MATRIX (GOAL-DRIVEN DEEP REASONING LOOP) ===
Tugas ini memiliki target sasaran multi-langkah yang WAJIB diselesaikan 100% secara tuntas:
${listStr}

PROTOKOL EKSEKUSI MUTLAK:
1. DILARANG BERHENTI (NO PREMATURE STOP): Anda TIDAK BOLEH mengakhiri tugas atau menyatakan selesai jika masih ada Milestone bertanda [ ] atau [▶]!
2. EVALUASI BERKELANJUTAN: Pada setiap langkah Reasoning, tinjau progres Milestone Anda dan lanjutkan eksekusi ke langkah berikutnya secara berkesinambungan.
3. KELUARAN AKHIR: Hanya berikan jawaban akhir setelah SEMUA Milestone telah berhasil dieksekusi dan terverifikasi 100%!\n`;
  }

  /**
   * Analyzes conversation turns & tool outputs to update milestone states
   */
  function updateMilestonesFromTurns(milestones, turns) {
    if (!milestones || milestones.length === 0) return milestones;

    const total = milestones.length;
    const nonSystemTurns = turns.filter(t => t.role !== 'system');
    const toolTurns = nonSystemTurns.filter(t => t.role === 'tool');

    // Heuristic completion calculation based on executed steps
    const stepRatio = toolTurns.length / Math.max(1, total * 2);

    milestones.forEach((m, idx) => {
      const threshold = (idx + 1) / total;
      if (stepRatio >= threshold || (idx === 0 && toolTurns.length >= 1)) {
        m.completed = true;
        m.inProgress = false;
      } else if (idx === 0 || milestones[idx - 1]?.completed) {
        m.inProgress = true;
      }
    });

    return milestones;
  }

  /**
   * Formats a clean progress string for Telegram live status or UI badge
   */
  function getGoalStatusString(milestones) {
    if (!milestones || milestones.length === 0) return '';

    const total = milestones.length;
    const completed = milestones.filter(m => m.completed).length;
    const active = milestones.find(m => !m.completed) || milestones[milestones.length - 1];

    const activeTitle = active ? active.title.slice(0, 45) : 'Menyelesaikan sasaran';
    return `🎯 <b>Goal Progress [${completed}/${total}]</b>\n<i>▶ ${activeTitle}...</i>`;
  }

  /**
   * Returns true if there are still pending milestones in the checklist
   */
  function hasPendingMilestones(milestones) {
    if (!milestones || milestones.length === 0) return false;
    return milestones.some(m => !m.completed);
  }

  /**
   * Generates strict continuation prompt if LLM attempts premature stop
   */
  function generateGoalContinuationPrompt(milestones) {
    const pending = milestones.filter(m => !m.completed).map(m => `• Milestone ${m.id}: ${m.title}`).join('\n');

    return `🛑 [SYSTEM GOAL COMPLETION GUARD]:
Tugas BELUM selesai! Masih ada Milestone yang tertunda dan belum dieksekusi tuntas:
${pending}

MANDAT:
Lanjutkan eksekusi langkah berikutnya sekarang juga menggunakan tool browser / bash / manipulasi data yang sesuai. DILARANG berhenti sebelum seluruh Milestone di atas terselesaikan 100%!`;
  }

  const GoalTracker = {
    isGoalTask,
    extractGoalMilestones,
    buildGoalPromptDirective,
    updateMilestonesFromTurns,
    getGoalStatusString,
    hasPendingMilestones,
    generateGoalContinuationPrompt
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalTracker;
  } else {
    global.GoalTracker = GoalTracker;
  }
})(typeof self !== 'undefined' ? self : this);
