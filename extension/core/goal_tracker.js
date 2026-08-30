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
      if (lower.includes('companion') || lower.includes('casual') || lower.includes('sahabat') || lower.includes('santai') || lower.includes('fakta') || lower.includes('personal') || lower.includes('obrolan') || lower.includes('tanya jawab')) {
        return findWorker('companion', findWorker('casual', 'Casual Companion & Personal Fact Assistant'));
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

    // 0. If matchedWorkers has specific assigned agents, generate tasks for top 1-2 specialists!
    if (Array.isArray(matchedWorkers) && matchedWorkers.length > 0) {
      const topWorkers = matchedWorkers.slice(0, 2);
      topWorkers.forEach(worker => {
        const wName = worker.name || "Agen Spesialis";
        const wId = String(worker.id || '').toLowerCase();
        const wNameLower = wName.toLowerCase();
        let taskTitle = "";
        
        if (wId.includes("companion") || wNameLower.includes("companion") || wId.includes("casual") || wNameLower.includes("casual") || wNameLower.includes("personal") || wNameLower.includes("fact") || wNameLower.includes("sahabat") || wNameLower.includes("santai")) {
          taskTitle = "Jawaban Ramah, Interaksi Percakapan & Fakta Personal";
        } else if (wId.includes("auditor") || wNameLower.includes("auditor") || wNameLower.includes("lead quality")) {
          taskTitle = "Audit Matriks Kinerja Iklan & Filter Lead High-Intent";
        } else if (wId.includes("strategist") || wNameLower.includes("strategist") || wId.includes("cpr")) {
          taskTitle = "Analisis Strategi Optimasi CPR & Evaluasi Kampanye";
        } else if (wId.includes("closer") || wId.includes("sales") || wNameLower.includes("sales") || wNameLower.includes("closer")) {
          taskTitle = "Evaluasi Funnel Chat Closing & Kualifikasi Prospek KPR";
        } else if (wId.includes("copy") || wNameLower.includes("copywriter") || wNameLower.includes("viral")) {
          taskTitle = "Perumusan Copywriting Viral, Hooks & Naskah Konten";
        } else if (wId.includes("visual") || wId.includes("desain") || wNameLower.includes("visual") || wNameLower.includes("designer")) {
          taskTitle = "Pembuatan Desain Visual Dark Luxury & Layout Grafis";
        } else if (wId.includes("coding") || wId.includes("engineer") || wNameLower.includes("coding") || wNameLower.includes("engineer")) {
          taskTitle = "Eksekusi Script Terminal, Manajemen File & Koding";
        } else if (wId.includes("gsuite") || wId.includes("workspace") || wNameLower.includes("workspace") || wNameLower.includes("google")) {
          taskTitle = "Sinkronisasi REST API & Pembuatan Berkas Google Workspace";
        } else if (wId.includes("thesis") || wId.includes("unesa") || wNameLower.includes("thesis") || wNameLower.includes("akademik")) {
          taskTitle = "Kajian Metodologi, Riset Literatur & Penulisan Akademik";
        } else if (wId.includes("research") || wId.includes("riset") || wNameLower.includes("researcher")) {
          taskTitle = "Investigasi Riset Mendalam & Validasi Data Web";
        } else if (wId.includes("default") || wNameLower.includes("browser")) {
          const isExplicitBrowserAction = (cleanLower.includes("buka") || cleanLower.includes("navigasi") || cleanLower.includes("klik") || cleanLower.includes("login") || cleanLower.includes("website") || cleanLower.includes("tab") || cleanLower.includes("url") || cleanLower.includes("scroll") || cleanLower.includes("tonton") || cleanLower.includes("download") || cleanLower.includes("scrape"));
          if (!isExplicitBrowserAction && (cleanLower.length < 35 || cleanLower.includes("siapa") || cleanLower.includes("halo") || cleanLower.includes("apa kabar"))) {
            taskTitle = "Pemberian Informasi, Konsultasi & Jawaban Percakapan";
          } else {
            taskTitle = "Navigasi Browser, Snapshot & Ekstraksi Data Halaman";
          }
        } else {
          taskTitle = `Eksekusi Operasi Spesialis: ${worker.description ? worker.description.slice(0, 45) : text.slice(0, 40)}`;
        }

        milestones.push({
          id: milestones.length + 1,
          title: taskTitle,
          assignedAgent: wName,
          completed: false,
          inProgress: false
        });
      });

      // Final Task is ALWAYS Perfectionist Master Agent Quality Validation:
      milestones.push({
        id: milestones.length + 1,
        title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas",
        assignedAgent: "Master Agent",
        completed: false,
        inProgress: false
      });

      return milestones;
    }

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
        title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas",
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
        title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas",
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
        { id: 4, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('tiar') || cleanLower.includes('properti') || cleanLower.includes('rumah') || cleanLower.includes('kpr') || cleanLower.includes('surabaya') || cleanLower.includes('sidoarjo')) {
      const salesAgent = findWorker('closer', findWorker('sales', 'Tiar Sales Closer CS'));
      milestones.push(
        { id: 2, title: "Analisis Unit Properti & Simulasi Cicilan KPR 2026", assignedAgent: salesAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('copy') || cleanLower.includes('caption') || cleanLower.includes('hook') || cleanLower.includes('naskah') || cleanLower.includes('genz') || cleanLower.includes('reels') || cleanLower.includes('tiktok')) {
      const copyAgent = findWorker('copy', 'Tiar Copywriter Expert');
      milestones.push(
        { id: 2, title: "Perumusan Copywriting Viral, Hooks & Mental Triggers", assignedAgent: copyAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('desain') || cleanLower.includes('design') || cleanLower.includes('visual') || cleanLower.includes('gambar') || cleanLower.includes('poster') || cleanLower.includes('image')) {
      const visualAgent = findWorker('visual', findWorker('desain', 'AI Visual Designer'));
      milestones.push(
        { id: 2, title: "Render Desain Grafis & Pembuatan Layout Visual", assignedAgent: visualAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('unesa') || cleanLower.includes('thesis') || cleanLower.includes('skripsi') || cleanLower.includes('jurnal') || cleanLower.includes('akademik')) {
      const thesisAgent = findWorker('thesis', 'Thesis & Academic Assistant');
      milestones.push(
        { id: 2, title: "Sintesis Literatur & Penyusunan Kerangka Teori", assignedAgent: thesisAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('run') || cleanLower.includes('terminal') || cleanLower.includes('command') || cleanLower.includes('file') || cleanLower.includes('code') || cleanLower.includes('buat file') || cleanLower.includes('bash')) {
      const codeAgent = findWorker('coding', 'Coding & System Engineer');
      milestones.push(
        { id: 2, title: "Eksekusi Perintah Terminal & Pemrosesan File", assignedAgent: codeAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('doc') || cleanLower.includes('sheet') || cleanLower.includes('slide') || cleanLower.includes('drive') || cleanLower.includes('gmail') || cleanLower.includes('gsuite')) {
      const gsuiteAgent = findWorker('gsuite', 'Google Workspace Specialist');
      milestones.push(
        { id: 2, title: "Pembuatan & Penataan Berkas via REST API", assignedAgent: gsuiteAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('http') || cleanLower.includes('web') || cleanLower.includes('cari') || cleanLower.includes('browse') || cleanLower.includes('scrape') || cleanLower.includes('riset') || cleanLower.includes('buka')) {
      const browserAgent = findWorker('default', 'General Browser Assistant');
      milestones.push(
        { id: 2, title: `Navigasi Web & Ekstraksi Data Target: ${text.slice(0, 40)}`, assignedAgent: browserAgent, completed: false, inProgress: false },
        { id: 3, title: "Analisis Kelengkapan & Validasi Data Temuan", assignedAgent: "Master Agent", completed: false, inProgress: false },
        { id: 4, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else {
      const fallbackWorker = matchedWorkers[0]?.name || "General Browser Assistant";
      milestones.push(
        { id: 2, title: `Eksekusi Tugas Spesialis: ${text.slice(0, 45)}`, assignedAgent: fallbackWorker, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    }

    return milestones;
  }

  /**
   * Adds a revision task dynamically when Master Agent detects incomplete or flawed data
   */
  function addRevisionMilestone(milestones, targetAgentName, revisionNote) {
    if (!milestones || !Array.isArray(milestones)) return milestones;
    
    const valIdx = milestones.findIndex(m => m.title.toLowerCase().includes("validasi"));
    const newId = milestones.length + 1;
    const revMilestone = {
      id: newId,
      title: `🔄 Revisi & Penyempurnaan Data: ${revisionNote || 'Lengkapi data yang kurang'}`,
      assignedAgent: targetAgentName || "Agen Spesialis",
      completed: false,
      inProgress: true,
      isRevision: true
    };

    if (valIdx >= 0) {
      milestones.splice(valIdx, 0, revMilestone);
    } else {
      milestones.push(revMilestone);
    }

    milestones.forEach((m, idx) => { m.id = idx + 1; });
    return milestones;
  }

  /**
   * Builds the System Instruction Goal Directive containing the live Goal Checklist Matrix
   */
  function buildGoalPromptDirective(milestones) {
    if (!milestones || milestones.length === 0) return '';

    const listStr = milestones.map(m => {
      const mark = m.completed ? '[x]' : (m.inProgress ? '[▶]' : '[ ]');
      const ag = m.assignedAgent ? ` [Penanggung Jawab: ${m.assignedAgent}]` : '';
      return `- ${mark} Milestone ${m.id}: ${m.title}${ag}`;
    }).join('\n');

    return `\n\n=== 👑 MANDAT BOS PERFEKSIONIS & GOAL CHECKLIST MATRIX (100% ACCURACY LOOP) ===
Anda adalah 👑 Master Agent (Supreme Commander & Perfectionist Boss). Anda memiliki standar kualitas mutlak 100% dan TIDAK PERNAH menerima data yang salah, kurang lengkap, atau halusinasi dari bawahan Anda!

TARGET SASARAN & JADWAL TUGAS MULTI-AGENT:
${listStr}

PROTOKOL EKSEKUSI BOS PERFEKSIONIS:
1. DILARANG BERHENTI PREMATUR (NO PREMATURE STOP): Anda TIDAK BOLEH mengakhiri tugas jika masih ada Milestone bertanda [ ] atau [▶]!
2. KOORDINASI LENGKAP: Pastikan setiap agen pelaksana menjalankan tugasnya secara optimal dan menghasilkan data konkret yang utuh.
3. VALIDASI KUALITAS 100%: Sebelum memberikan jawaban akhir kepada pengguna, evaluasi seluruh temuan:
   - Jika data bawahan masih ada yang kurang atau meragukan: Perintahkan revisi (panggil tool perbaikan atau delegasikan kembali).
   - Hanya serahkan laporan ke pengguna jika data telah terverifikasi 100% akurat, lengkap, dan tuntas!\n`;
  }

  /**
   * Analyzes conversation turns & tool outputs to update milestone states in realtime
   */
  function updateMilestonesFromTurns(milestones, turns) {
    if (!milestones || milestones.length === 0) return milestones;

    const total = milestones.length;
    if (total <= 1) return milestones;

    const nonSystemTurns = (turns || []).filter(t => t.role !== 'system');
    const toolTurns = nonSystemTurns.filter(t => t.role === 'tool');
    const toolCount = toolTurns.length;

    // Milestone 0 (Index 0) is ALWAYS completed after the initial planning phase
    milestones[0].completed = true;
    milestones[0].inProgress = false;

    // Worker milestones span from index 1 to total - 2
    const workerMilestonesCount = Math.max(1, total - 2);
    
    // Calculate which worker milestone is currently active based on toolCount
    // Each worker milestone takes roughly 2-3 tools to complete
    const toolsPerWorker = 3;
    const currentWorkerOffset = Math.min(
      workerMilestonesCount - 1,
      Math.floor(toolCount / toolsPerWorker)
    );
    const activeWorkerIdx = 1 + currentWorkerOffset;

    for (let i = 1; i < total - 1; i++) {
      if (i < activeWorkerIdx) {
        milestones[i].completed = true;
        milestones[i].inProgress = false;
      } else if (i === activeWorkerIdx) {
        milestones[i].completed = false;
        milestones[i].inProgress = true;
      } else {
        milestones[i].completed = false;
        milestones[i].inProgress = false;
      }
    }

    // The LAST milestone (Index total - 1: Final Validation & Report)
    // MUST NEVER be marked completed while tools or LLM are still running!
    const lastIdx = total - 1;
    milestones[lastIdx].completed = false;

    // If all intermediate worker milestones are completed (or high tool count),
    // the final validation milestone becomes inProgress (Master Agent validating)
    const allWorkersDone = milestones.slice(1, total - 1).every(m => m.completed);
    if (allWorkersDone || toolCount >= workerMilestonesCount * toolsPerWorker) {
      for (let i = 1; i < total - 1; i++) {
        milestones[i].completed = true;
        milestones[i].inProgress = false;
      }
      milestones[lastIdx].inProgress = true;
    } else {
      milestones[lastIdx].inProgress = false;
    }

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
   * Returns true if there are still pending unstarted worker milestones
   */
  function hasPendingMilestones(milestones) {
    if (!milestones || milestones.length === 0) return false;
    // Check if intermediate worker milestones are still pending
    const intermediateMilestones = milestones.slice(1, milestones.length - 1);
    return intermediateMilestones.some(m => !m.completed && !m.inProgress);
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
    addRevisionMilestone,
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
