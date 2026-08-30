/**
 * =========================================================================
 * Browser Agent - Goal-Driven Deep Reasoning & Dynamic Task Tracker Engine
 * Multi-Step Goal Decomposition, Milestone Tracking & Perfectionist Guard
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
      /\b(pertama|kedua|ketiga|keempat|kelima)\b/i,
      /\b(audit|analisis lengkap|riset mendalam|scrape dan simpan|ekstrak dan konversi|buat laporan)\b/i,
      /\b(backup|cadangkan|sinkronisasi|dump database|kompresi|zip)\b/i,
      /\b(dan kirim|dan download|serta convert|lalu buka)\b/i
    ];

    for (const pat of multiStepPatterns) {
      if (pat.test(clean)) return true;
    }

    return true; // Default to true for full orchestration transparency
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
      if (lower.includes('backup') || lower.includes('database') || lower.includes('sqlite') || lower.includes('dump') || lower.includes('sinkron')) {
        return findWorker('backup', findWorker('database', findWorker('coding', 'Database & Brain Backup Specialist')));
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
      if (lower.includes('terminal') || lower.includes('bash') || lower.includes('command') || lower.includes('file') || lower.includes('script') || lower.includes('kode') || lower.includes('coding') || lower.includes('zip') || lower.includes('git')) {
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
      if (lower.includes('buka') || lower.includes('navigasi') || lower.includes('web') || lower.includes('klik') || lower.includes('snapshot') || lower.includes('url') || lower.includes('browser') || lower.includes('scrape') || lower.includes('cari')) {
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

    // -------------------------------------------------------------
    // PRIORITY 1: Explicit numbered lines or bullets from user (Inline & Multi-Line)
    // -------------------------------------------------------------
    const stepRegex = /(?:^|\n|\s+)(?:\d+[\.\)]|\-|\*|•)\s*([^\d\n]+?)(?=(?:\s+\d+[\.\)]|\s+[-*•]\s+|\n|$))/g;
    let match;
    const explicitSteps = [];
    while ((match = stepRegex.exec(text)) !== null) {
      const item = match[1].trim();
      if (item.length > 2) {
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

    // -------------------------------------------------------------
    // PRIORITY 2: Explicit conjunctions (lalu, kemudian, setelah itu, serta)
    // -------------------------------------------------------------
    const stepParts = text.split(/\s*(?:,\s*lalu\s+|,\s*kemudian\s+|,\s*setelah itu\s+|\s+lalu\s+|\s+kemudian\s+|\s+setelah itu\s+|\s+dan setelahnya\s+|\s+serta selanjutnya\s+)\s*/i);
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

    // -------------------------------------------------------------
    // PRIORITY 3: Deep Domain-Specific Multi-Step Workflows (Varied 4-6 Tasks)
    // -------------------------------------------------------------
    if (cleanLower.includes('backup') || cleanLower.includes('cadang') || cleanLower.includes('sqlite') || cleanLower.includes('dump') || cleanLower.includes('db_') || cleanLower.includes('sinkron')) {
      const dbAgent = findWorker('backup', findWorker('database', 'Database & Brain Backup Specialist'));
      const codeAgent = findWorker('coding', 'Coding & System Engineer');
      milestones.push(
        { id: 2, title: "Pencadangan Database SQLite & Ekstraksi Riwayat Percakapan", assignedAgent: dbAgent, completed: false, inProgress: false },
        { id: 3, title: "Sinkronisasi Direktori Brain, Agen, Skills & Snapshot Media", assignedAgent: dbAgent, completed: false, inProgress: false },
        { id: 4, title: "Kompresi Berkas Arsip ZIP & Verifikasi Integritas Cadangan", assignedAgent: codeAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Verifikasi Laporan Cadangan", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('lead') || cleanLower.includes('ads') || cleanLower.includes('iklan') || cleanLower.includes('boncos') || cleanLower.includes('cpr') || cleanLower.includes('gacor') || cleanLower.includes('campaign') || cleanLower.includes('meta')) {
      const adsAgent = findWorker('ads', findWorker('auditor', 'Sub-Agent Auditor & Analis Meta Ads'));
      const strategistAgent = findWorker('strategist', 'Tiar Meta Ads Strategist');
      const salesAgent = findWorker('closer', findWorker('sales', 'Tiar Sales Closer CS'));
      milestones.push(
        { id: 2, title: "Audit Matriks Kinerja Iklan & Eliminasi Junk Leads", assignedAgent: adsAgent, completed: false, inProgress: false },
        { id: 3, title: "Perumusan Strategi Targeting Advantage+ CBO & Optimasi CPR", assignedAgent: strategistAgent, completed: false, inProgress: false },
        { id: 4, title: "Evaluasi Funnel Chat Closing & Kualifikasi Prospek KPR", assignedAgent: salesAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('properti') || cleanLower.includes('rumah') || cleanLower.includes('kpr') || cleanLower.includes('surabaya') || cleanLower.includes('sidoarjo') || cleanLower.includes('survei')) {
      const salesAgent = findWorker('closer', findWorker('sales', 'Tiar Sales Closer CS'));
      const adminAgent = findWorker('admin', 'Tiar Admin Customer CS');
      milestones.push(
        { id: 2, title: "Analisis Kebutuhan Hunian & Seleksi Unit Cluster Strategis", assignedAgent: salesAgent, completed: false, inProgress: false },
        { id: 3, title: "Simulasi Skema KPR 2026, DP 0% & Perhitungan Angsuran Ringan", assignedAgent: salesAgent, completed: false, inProgress: false },
        { id: 4, title: "Kualifikasi Profil Finansial & Penguncian Jadwal Survei Lokasi", assignedAgent: adminAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('copy') || cleanLower.includes('caption') || cleanLower.includes('hook') || cleanLower.includes('naskah') || cleanLower.includes('genz') || cleanLower.includes('reels') || cleanLower.includes('tiktok') || cleanLower.includes('video')) {
      const trendAgent = findWorker('trend', 'Tiar Trend Surfer');
      const copyAgent = findWorker('copy', 'Tiar Copywriter Expert');
      const visualAgent = findWorker('visual', findWorker('desain', 'AI Visual Designer'));
      milestones.push(
        { id: 2, title: "Riset Tren FYP Surabaya-Sidoarjo & 8 Formula Hook Viral", assignedAgent: trendAgent, completed: false, inProgress: false },
        { id: 3, title: "Penulisan Naskah Video Fast-Cuts, AIDA Caption & 7 Mental Triggers", assignedAgent: copyAgent, completed: false, inProgress: false },
        { id: 4, title: "Arahan Visual Dark Luxury Real Estate & Storyboard Layout", assignedAgent: visualAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Finalisasi Konten Siap Upload", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('desain') || cleanLower.includes('design') || cleanLower.includes('visual') || cleanLower.includes('gambar') || cleanLower.includes('poster') || cleanLower.includes('image')) {
      const visualAgent = findWorker('visual', findWorker('desain', 'AI Visual Designer'));
      milestones.push(
        { id: 2, title: "Eksplorasi Konsep Estetika Dark Luxury & Palet Warna", assignedAgent: visualAgent, completed: false, inProgress: false },
        { id: 3, title: "Eksekusi Render Desain Grafis & Pembuatan Layout Visual", assignedAgent: visualAgent, completed: false, inProgress: false },
        { id: 4, title: "Validasi Kualitas 100% (Perfeksionis) & Verifikasi Resolusi Gambar", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('unesa') || cleanLower.includes('thesis') || cleanLower.includes('skripsi') || cleanLower.includes('jurnal') || cleanLower.includes('akademik') || cleanLower.includes('literatur')) {
      const thesisAgent = findWorker('thesis', 'Thesis & Academic Assistant');
      milestones.push(
        { id: 2, title: "Penelusuran Literatur Akademik & Ekstraksi Teori Relevan", assignedAgent: thesisAgent, completed: false, inProgress: false },
        { id: 3, title: "Sintesis Kerangka Konseptual & Perumusan Metodologi Riset", assignedAgent: thesisAgent, completed: false, inProgress: false },
        { id: 4, title: "Uji Koherensi Argumen, Validasi Sitasi & Penulisan Naskah", assignedAgent: thesisAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Dokumen Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('terminal') || cleanLower.includes('bash') || cleanLower.includes('command') || cleanLower.includes('file') || cleanLower.includes('code') || cleanLower.includes('koding') || cleanLower.includes('script') || cleanLower.includes('git') || cleanLower.includes('bug') || cleanLower.includes('refactor')) {
      const codeAgent = findWorker('coding', 'Coding & System Engineer');
      milestones.push(
        { id: 2, title: "Inspeksi Struktur File Codebase & Penelusuran Sumber Log", assignedAgent: codeAgent, completed: false, inProgress: false },
        { id: 3, title: "Implementasi Refactoring Kode & Eksekusi Perintah Terminal", assignedAgent: codeAgent, completed: false, inProgress: false },
        { id: 4, title: "Verifikasi Sintaksis, Uji Eksekusi & Validasi Runtime", assignedAgent: codeAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Dokumentasi Perubahan", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('slide') || cleanLower.includes('doc') || cleanLower.includes('sheet') || cleanLower.includes('drive') || cleanLower.includes('gmail') || cleanLower.includes('gsuite') || cleanLower.includes('workspace')) {
      const gsuiteAgent = findWorker('gsuite', 'Google Workspace Specialist');
      milestones.push(
        { id: 2, title: "Perumusan Struktur Outline & Konfigurasi Berkas di Google Drive", assignedAgent: gsuiteAgent, completed: false, inProgress: false },
        { id: 3, title: "Sinkronisasi REST API, Penataan Konten & Visualisasi Elemen", assignedAgent: gsuiteAgent, completed: false, inProgress: false },
        { id: 4, title: "Verifikasi Tautan Berkas, Izin Akses & Format Keluaran", assignedAgent: gsuiteAgent, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Konfirmasi Hasil Akhir", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('http') || cleanLower.includes('web') || cleanLower.includes('cari') || cleanLower.includes('browse') || cleanLower.includes('scrape') || cleanLower.includes('riset') || cleanLower.includes('buka') || cleanLower.includes('url')) {
      const browserAgent = findWorker('default', 'General Browser Assistant');
      milestones.push(
        { id: 2, title: "Navigasi Halaman Web Sasaran & Inspeksi Struktur DOM", assignedAgent: browserAgent, completed: false, inProgress: false },
        { id: 3, title: "Ekstraksi Data Terstruktur, Konten Teks & Bukti Visual", assignedAgent: browserAgent, completed: false, inProgress: false },
        { id: 4, title: "Analisis Kelengkapan Data & Pembersihan Informasi", assignedAgent: "Master Agent", completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else if (cleanLower.includes('companion') || cleanLower.includes('casual') || cleanLower.includes('sahabat') || cleanLower.includes('santai') || cleanLower.includes('fakta') || cleanLower.includes('personal') || cleanLower.includes('obrolan') || cleanLower.includes('tanya jawab') || cleanLower.length < 35) {
      const companionAgent = findWorker('companion', 'Casual Companion & Personal Fact Assistant');
      milestones.push(
        { id: 2, title: "Pemberian Informasi Ramah, Interaksi Santai & Fakta Personal", assignedAgent: companionAgent, completed: false, inProgress: false },
        { id: 3, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Jawaban", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    } else {
      // -------------------------------------------------------------
      // PRIORITY 4: Dynamic Granular Multi-Step Synthesis for matched workers
      // -------------------------------------------------------------
      const primaryWorker = matchedWorkers[0]?.name || "General Browser Assistant";
      milestones.push(
        { id: 2, title: `Pemetaan Parameter & Persiapan Operasi: ${text.slice(0, 40)}`, assignedAgent: primaryWorker, completed: false, inProgress: false },
        { id: 3, title: `Eksekusi Tindakan Spesifik & Pemrosesan Data`, assignedAgent: primaryWorker, completed: false, inProgress: false },
        { id: 4, title: `Pengujian Hasil & Verifikasi Kelengkapan`, assignedAgent: primaryWorker, completed: false, inProgress: false },
        { id: 5, title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas", assignedAgent: "Master Agent", completed: false, inProgress: false }
      );
    }

    return milestones;
  }

  /**
   * Parses dynamic task schedules emitted by Master Agent in thought/content
   * Supports XML <task_schedule>, <manage_task>, and Markdown plan formats
   */
  function parseModelSchedule(text, existingMilestones = [], customAgents = []) {
    if (!text || typeof text !== 'string') return null;

    // 1. Try parsing XML <task_schedule> or <manage_task>
    const xmlMatch = text.match(/<(?:task_schedule|manage_task)>([\s\S]*?)<\/(?:task_schedule|manage_task)>/i);
    if (xmlMatch) {
      const body = xmlMatch[1];
      const taskMatches = [...body.matchAll(/<(?:task|milestone|step)\s+([^>]+?)\/?>/gi)];
      if (taskMatches.length >= 2) {
        const parsed = [];
        taskMatches.forEach((tm, idx) => {
          const attrStr = tm[1];
          const titleMatch = attrStr.match(/title=["']([^"']+)["']/i) || attrStr.match(/name=["']([^"']+)["']/i) || attrStr.match(/task=["']([^"']+)["']/i);
          const agentMatch = attrStr.match(/agent=["']([^"']+)["']/i) || attrStr.match(/executor=["']([^"']+)["']/i);
          const title = titleMatch ? titleMatch[1].trim() : `Langkah Kerja ${idx + 1}`;
          const assignedAgent = agentMatch ? agentMatch[1].trim() : "Master Agent";
          parsed.push({
            id: idx + 1,
            title,
            assignedAgent,
            completed: false,
            inProgress: idx === 0
          });
        });
        return parsed;
      }
    }

    // 2. Try parsing Markdown numbered plan: ### 📋 Rencana Langkah Kerja or ### 🎯 Rencana Jadwal Tugas
    const planHeaderMatch = text.match(/###\s*(?:📋|🎯|📝)?\s*(?:Rencana Langkah Kerja|Rencana Jadwal Tugas|Action Plan|Task Schedule)([\s\S]+?)(?=\n###|\n\n\n|$)/i);
    if (planHeaderMatch) {
      const planBody = planHeaderMatch[1];
      const lineMatches = [...planBody.matchAll(/(?:^|\n)\s*(\d+)[\.\)]\s*\*\*?([^\*\n]+)\*\*?(?:\s*-\s*\*\*?(?:Pelaksana|Agen|Executor):\*\*?\s*([^\n]+))?/gi)];
      if (lineMatches.length >= 2) {
        const parsed = [];
        // Task 1: Deep Thinking
        parsed.push({
          id: 1,
          title: "Deep Thinking: Analisis Sasaran & Pemilihan Tim Spesialis",
          assignedAgent: "Master Agent",
          completed: true,
          inProgress: false
        });

        lineMatches.forEach(lm => {
          const title = lm[2].trim();
          const agent = lm[3] ? lm[3].trim() : "Master Agent";
          parsed.push({
            id: parsed.length + 1,
            title,
            assignedAgent: agent,
            completed: false,
            inProgress: parsed.length === 1
          });
        });

        parsed.push({
          id: parsed.length + 1,
          title: "Validasi Kualitas 100% (Perfeksionis) & Penyusunan Laporan Tuntas",
          assignedAgent: "Master Agent",
          completed: false,
          inProgress: false
        });
        return parsed;
      }
    }

    return null;
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

TARGET SASARAN & JADWAL TUGAS MULTI-AGENT (${milestones.length} TAHAPAN TUNTAS):
${listStr}

PROTOKOL EKSEKUSI BOS PERFEKSIONIS:
1. DILARANG BERHENTI PREMATUR (NO PREMATURE STOP): Anda TIDAK BOLEH mengakhiri tugas jika masih ada Milestone bertanda [ ] atau [▶]!
2. DYNAMIC TASK REFINEMENT: Jika Anda membutuhkan langkah tambahan, Anda dapat mendeklarasikan jadwal baru dalam format <task_schedule><task title="..." agent="..." /></task_schedule> di awal respon Anda.
3. KOORDINASI LENGKAP: Pastikan setiap agen pelaksana menjalankan tugasnya secara optimal dan menghasilkan data konkret yang utuh.
4. VALIDASI KUALITAS 100%: Sebelum memberikan jawaban akhir kepada pengguna, evaluasi seluruh temuan:
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
    // Distribute tools across intermediate milestones
    const toolsPerMilestone = Math.max(1, Math.floor(Math.max(toolCount, 1) / workerMilestonesCount)) || 2;
    const currentWorkerOffset = Math.min(
      workerMilestonesCount - 1,
      Math.floor(toolCount / 2)
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

    // If all intermediate worker milestones are completed, the final validation milestone becomes inProgress
    const allWorkersDone = milestones.slice(1, total - 1).every(m => m.completed);
    if (allWorkersDone || toolCount >= workerMilestonesCount * 2) {
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
    parseModelSchedule,
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
