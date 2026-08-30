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
   * Extracts or decomposes a user prompt into structured milestones with assigned agents
   */
  function extractGoalMilestones(promptText, customAgents = [], matchedWorkers = []) {
    if (!promptText || typeof promptText !== 'string') return [];

    let text = promptText.replace(/^\/goal\s*/i, '').trim();
    const cleanLower = text.toLowerCase();
    const milestones = [];

    // Helper to find specific worker by name/id pattern
    function findWorker(pattern, fallbackName) {
      if (Array.isArray(matchedWorkers) && matchedWorkers.length > 0) {
        const found = matchedWorkers.find(w => {
          const id = String(w.id || '').toLowerCase();
          const name = String(w.name || '').toLowerCase();
          return id.includes(pattern) || name.includes(pattern);
        });
        if (found) return found.name;
        if (matchedWorkers[0]?.name) return matchedWorkers[0].name;
      }
      if (Array.isArray(customAgents) && customAgents.length > 0) {
        const found = customAgents.find(a => {
          const id = String(a.id || '').toLowerCase();
          const name = String(a.name || '').toLowerCase();
          return id.includes(pattern) || name.includes(pattern);
        });
        if (found) return found.name;
      }
      return fallbackName;
    }

    // Helper to determine best agent for task
    function inferAgentForTask(taskTitle) {
      const lower = taskTitle.toLowerCase();
      if (lower.includes('deep think') || lower.includes('analisis sasaran') || lower.includes('koordinasi') || lower.includes('validasi') || lower.includes('laporan akhir') || lower.includes('sintesis')) {
        return "Master Agent";
      }
      if (lower.includes('lead') || lower.includes('ads') || lower.includes('iklan') || lower.includes('cpr') || lower.includes('boncos') || lower.includes('gacor') || lower.includes('campaign')) {
        return findWorker('ads', findWorker('auditor', 'Sub-Agent Auditor & Analis Meta Ads'));
      }
      if (lower.includes('copy') || lower.includes('caption') || lower.includes('hook') || lower.includes('naskah') || lower.includes('genz')) {
        return findWorker('copy', 'Tiar Copywriter Expert');
      }
      if (lower.includes('kpr') || lower.includes('properti') || lower.includes('rumah') || lower.includes('closing') || lower.includes('sales')) {
        return findWorker('closer', findWorker('sales', 'Tiar Sales Closer CS'));
      }
      if (lower.includes('terminal') || lower.includes('bash') || lower.includes('command') || lower.includes('file') || lower.includes('script') || lower.includes('kode') || lower.includes('coding')) {
        return findWorker('coding', 'Coding & System Engineer');
      }
      if (lower.includes('doc') || lower.includes('sheet') || lower.includes('slides') || lower.includes('drive') || lower.includes('gmail') || lower.includes('gsuite') || lower.includes('workspace')) {
        return findWorker('gsuite', 'Google Workspace Specialist');
      }
      if (lower.includes('gambar') || lower.includes('image') || lower.includes('desain') || lower.includes('visual') || lower.includes('poster')) {
        return findWorker('visual', findWorker('desain', 'AI Visual Designer'));
      }
      if (lower.includes('skripsi') || lower.includes('jurnal') || lower.includes('tesis') || lower.includes('akademik') || lower.includes('unesa')) {
        return findWorker('thesis', 'Thesis & Academic Assistant');
      }
      if (lower.includes('buka') || lower.includes('navigasi') || lower.includes('web') || lower.includes('klik') || lower.includes('snapshot') || lower.includes('url') || lower.includes('browser')) {
        return findWorker('default', 'General Browser Assistant');
      }
      return matchedWorkers[0]?.name || "General Browser Assistant";
    }

    // Always start with Task 1: Master Agent Deep Thinking & Strategic Planning
    milestones.push({
      id: 1,
      title: "Deep Thinking: Analisis Sasaran & Pemilihan Tim Spesialis",
      assignedAgent: "Master Agent",
      completed: false,
      inProgress: true
    });

    // 1. Check for explicit numbered lines (e.g. 1. xxx, 2. yyy)
    const numberedRegex = /(?:^|\n)\s*(?:\d+[\.\)]|\-|\*)\s*([^\n]+)/g;
    let match;
    const explicitSteps = [];
    while ((match = numberedRegex.exec(text)) !== null) {
      const item = match[1].trim();
      if (item.length > 3) {
        explicitSteps.push(item);
      }
    }

    if (explicitSteps.length >= 2) {
      explicitSteps.forEach(step => {
        milestones.push({
          id: milestones.length + 1,
          title: step,
          assignedAgent: inferAgentForTask(step),
          completed: false,
          inProgress: false
        });
      });
      milestones.push({
        id: milestones.length + 1,
        title: "Validasi Hasil Akhir & Penyusunan Laporan Tuntas",
        assignedAgent: "Master Agent",
        completed: false,
        inProgress: false
      });
      return milestones;
    }

    // 2. Check conjunctions (lalu, kemudian, setelah itu)
    const stepParts = text.split(/\s*(?:,\s*lalu\s+|,\s*kemudian\s+|,\s*setelah itu\s+|\s+lalu\s+|\s+kemudian\s+|\s+setelah itu\s+|\s+dan setelahnya\s+)\s*/i);
    if (stepParts.length > 1 && stepParts[0].length > 3) {
      stepParts.forEach(part => {
        const cleanPart = part.trim().replace(/^[-*•]\s*/, '');
        if (cleanPart.length > 3) {
          milestones.push({
            id: milestones.length + 1,
            title: cleanPart,
            assignedAgent: inferAgentForTask(cleanPart),
            completed: false,
            inProgress: false
          });
        }
      });
      milestones.push({
        id: milestones.length + 1,
        title: "Validasi Hasil Akhir & Penyusunan Laporan Tuntas",
        assignedAgent: "Master Agent",
        completed: false,
        inProgress: false
      });
      return milestones;
    }

    // 3. Domain-Specific Intelligent Multi-Agent Schedule Synthesis
    if (cleanLower.includes('lead') || cleanLower.includes('ads') || cleanLower.includes('iklan') || cleanLower.includes('boncos') || cleanLower.includes('cpr') || cleanLower.includes('gacor') || cleanLower.includes('campaign') || cleanLower.includes('meta')) {
      const adsAgent = findWorker('ads', findWorker('auditor', 'Sub-Agent Auditor & Analis Meta Ads'));
      const salesAgent = findWorker('closer', findWorker('sales', 'Tiar Sales Closer CS'));
      milestones.push(
        { id: 2, title: "Audit Matriks Kinerja Iklan & Filter Lead High-Intent", assignedAgent: adsAgent, completed: false, inProgress: false },
        { id: 3, title: "Evaluasi Funnel Chat Closing & Kualifikasi Prospek", assignedAgent: salesAgent, completed: false, inProgress: false },
        { id: 4, title: "Perumusan Rekomendasi Solusi & Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('tiar') || cleanLower.includes('properti') || cleanLower.includes('rumah') || cleanLower.includes('kpr') || cleanLower.includes('surabaya') || cleanLower.includes('sidoarjo')) {
      const salesAgent = findWorker('closer', findWorker('sales', 'Tiar Sales Closer CS'));
      milestones.push(
        { id: 2, title: "Analisis Unit Properti & Simulasi Cicilan KPR 2026", assignedAgent: salesAgent, completed: false, inProgress: false },
        { id: 3, title: "Penyusunan Rekomendasi Closing & Booking Survei", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('copy') || cleanLower.includes('caption') || cleanLower.includes('hook') || cleanLower.includes('naskah') || cleanLower.includes('genz') || cleanLower.includes('reels') || cleanLower.includes('tiktok')) {
      const copyAgent = findWorker('copy', 'Tiar Copywriter Expert');
      milestones.push(
        { id: 2, title: "Perumusan Copywriting Viral, Hooks & Mental Triggers", assignedAgent: copyAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Tone of Voice & Penyajian Konten Final", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('desain') || cleanLower.includes('design') || cleanLower.includes('visual') || cleanLower.includes('gambar') || cleanLower.includes('poster') || cleanLower.includes('image')) {
      const visualAgent = findWorker('visual', findWorker('desain', 'AI Visual Designer'));
      milestones.push(
        { id: 2, title: "Render Desain Grafis & Pembuatan Layout Visual", assignedAgent: visualAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Komposisi & Penyajian Aset Akhir", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('unesa') || cleanLower.includes('thesis') || cleanLower.includes('skripsi') || cleanLower.includes('jurnal') || cleanLower.includes('akademik')) {
      const thesisAgent = findWorker('thesis', 'Thesis & Academic Assistant');
      milestones.push(
        { id: 2, title: "Sintesis Literatur & Penyusunan Kerangka Teori", assignedAgent: thesisAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Metodologi & Laporan Akademik Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('run') || cleanLower.includes('terminal') || cleanLower.includes('command') || cleanLower.includes('file') || cleanLower.includes('code') || cleanLower.includes('buat file') || cleanLower.includes('bash')) {
      const codeAgent = findWorker('coding', 'Coding & System Engineer');
      milestones.push(
        { id: 2, title: "Eksekusi Perintah Terminal & Pemrosesan File", assignedAgent: codeAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Output Eksekusi & Integritas Solusi", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('doc') || cleanLower.includes('sheet') || cleanLower.includes('slide') || cleanLower.includes('drive') || cleanLower.includes('gmail') || cleanLower.includes('gsuite')) {
      const gsuiteAgent = findWorker('gsuite', 'Google Workspace Specialist');
      milestones.push(
        { id: 2, title: "Pembuatan & Penataan Berkas via REST API", assignedAgent: gsuiteAgent, completed: false, inProgress: false },
        { id: 3, title: "Verifikasi URL Berkas & Penyajian Laporan", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('http') || cleanLower.includes('web') || cleanLower.includes('cari') || cleanLower.includes('browse') || cleanLower.includes('scrape') || cleanLower.includes('riset') || cleanLower.includes('buka')) {
      const browserAgent = findWorker('default', 'General Browser Assistant');
      milestones.push(
        { id: 2, title: `Navigasi Web & Ekstraksi Data Target: ${text.slice(0, 40)}`, assignedAgent: browserAgent, completed: false, inProgress: false },
        { id: 3, title: "Analisis Kelengkapan & Validasi Data Temuan", assignedAgent: "Master Agent", completed: false, inProgress: false },
        { id: 4, title: "Penyusunan Laporan Tuntas & Verifikasi Solusi", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else {
      const fallbackWorker = matchedWorkers[0]?.name || "General Browser Assistant";
      milestones.push(
        { id: 2, title: `Eksekusi Tugas Spesialis: ${text.slice(0, 45)}`, assignedAgent: fallbackWorker, completed: false, inProgress: false },
        { id: 3, title: "Validasi Hasil Akhir & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
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
