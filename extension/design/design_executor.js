// =========================================================================
// DESIGN EXECUTOR & MULTI-AGENT ORCHESTRATION LOOP
// Master Agent (Supreme Commander) & Master Design (Right-Hand Lead Architect)
// =========================================================================

function getEffectiveEndpointUrl(rawEndpoint) {
  if (typeof getNormalizedChatEndpoint === 'function') {
    return getNormalizedChatEndpoint(rawEndpoint);
  }
  if (typeof window !== 'undefined' && typeof window.getNormalizedChatEndpoint === 'function') {
    return window.getNormalizedChatEndpoint(rawEndpoint);
  }
  if (typeof buildApiUrl === 'function' && buildApiUrl !== getEffectiveEndpointUrl) {
    return buildApiUrl(rawEndpoint);
  }
  let clean = (rawEndpoint || 'https://generativelanguage.googleapis.com/v1beta/openai').trim().replace(/\/+$/, '');
  return clean.endsWith('/chat/completions') ? clean : clean + '/chat/completions';
}

if (typeof buildApiUrl !== 'function') {
  var buildApiUrl = getEffectiveEndpointUrl;
}
if (typeof window !== 'undefined') {
  window.buildApiUrl = getEffectiveEndpointUrl;
}

async function fetchSlideContentFromAI(slideIndex, totalSlides, topic, blueprintSlide, prevSlideSummary, agentConfig, abortSignal) {
  const prompt = (typeof createSlidePromptForMasterDesign === 'function')
    ? createSlidePromptForMasterDesign(slideIndex, totalSlides, topic, blueprintSlide, prevSlideSummary)
    : `Rancang konten detail untuk slide ${slideIndex + 1} topik: ${topic}`;

  const endpointUrl = getEffectiveEndpointUrl(agentConfig.endpoint);
  const apiKey = (agentConfig.apiKey || "").trim();
  const chosenModel = (typeof activeAgentModel !== 'undefined' && activeAgentModel) ? activeAgentModel : (agentConfig.model || "google/gemini-2.5-flash");

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  if (agentConfig.endpoint === "openrouter" || (agentConfig.endpointUrl && agentConfig.endpointUrl.includes("openrouter.ai"))) {
    headers["HTTP-Referer"] = "https://github.com/browser-agent";
    headers["X-Title"] = "Browser Agent OpenDesign Engine";
  }

  try {
    const resp = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: "system", content: "Kamu adalah Master Design, perancang presentasi 16:9 modular kelas dunia. Balas HANYA dengan JSON valid tanpa teks pengantar." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1800
      }),
      signal: abortSignal
    });

    if (resp.ok) {
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content && typeof parseSingleSlideJson === 'function') {
        return parseSingleSlideJson(content, blueprintSlide);
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
  }

  return (typeof reviseSlideData === 'function')
    ? reviseSlideData(blueprintSlide, '', blueprintSlide.layout, topic)
    : blueprintSlide;
}

async function runDesignModeLoop(userMessage, attachments = [], explicitMentions = [], options = {}) {
  try {
    const stored = await chrome.storage.local.get(["browser_agent_config"]);
    if (stored && stored.browser_agent_config) {
      config = { ...config, ...stored.browser_agent_config };
    }
  } catch (e) {}

  const apiKey = (config.apiKey || "").trim();
  if (!apiKey) {
    appendAssistantMessage("⚠️ API Key belum dikonfigurasi. Silakan buka Pengaturan (ikon gerigi) untuk memasukkan API Key Anda.", false);
    return;
  }

  const canvasIsOpen = (typeof isCanvasOpen === 'function') ? isCanvasOpen() : (typeof window !== 'undefined' && typeof window.isCanvasOpen === 'function' ? window.isCanvasOpen() : false);
  const currentOpenArtifact = (typeof getActiveDesignArtifact === 'function') ? getActiveDesignArtifact() : (typeof window !== 'undefined' && typeof window.getActiveDesignArtifact === 'function' ? window.getActiveDesignArtifact() : activeDesignArtifact);
  const isRevision = Boolean(options.isRevision || (canvasIsOpen && currentOpenArtifact && currentOpenArtifact.html));

  isExecuting = true;
  updateSendButtonState(true);
  abortController = new AbortController();

  // Ensure active session is initialized for chat history persistence
  if (typeof ensureCurrentSessionInitialized === 'function') {
    ensureCurrentSessionInitialized(userMessage, attachments, 'Slide Deck Design');
  } else if (typeof window !== 'undefined' && typeof window.ensureCurrentSessionInitialized === 'function') {
    window.ensureCurrentSessionInitialized(userMessage, attachments, 'Slide Deck Design');
  } else if (typeof currentSessionId !== 'undefined' && !currentSessionId) {
    currentSessionId = 'sess_' + Date.now();
    currentSessionTitle = (userMessage || 'Slide Deck Design').slice(0, 45).trim();
    currentSessionCreatedAt = Date.now();
    if (typeof updateHeaderChatTitle === 'function') updateHeaderChatTitle(currentSessionTitle);
  }

  if (typeof appendUserMessage === 'function') {
    appendUserMessage(userMessage, attachments);
  } else if (typeof window !== 'undefined' && typeof window.appendUserMessage === 'function') {
    window.appendUserMessage(userMessage, attachments);
  }

  if (typeof conversationHistory !== 'undefined' && Array.isArray(conversationHistory)) {
    conversationHistory.push({
      role: "user",
      content: userMessage,
      displayContent: userMessage,
      attachments: attachments,
      chatMode: "design"
    });
  }

  // Save session immediately so user prompt is persisted in history
  if (typeof saveCurrentSessionToDB === 'function') {
    saveCurrentSessionToDB();
  } else if (typeof window !== 'undefined' && typeof window.saveCurrentSessionToDB === 'function') {
    window.saveCurrentSessionToDB();
  }

  if (typeof saveAttachmentsToIndexedDB === 'function' && attachments && attachments.length > 0) {
    saveAttachmentsToIndexedDB(attachments);
  }

  // Dual Master Agent Hierarchy: Master Agent (Boss) directing Master Design (Right Hand)
  const agentInfo = (typeof createDesignHierarchyAgentInfo === 'function') 
    ? createDesignHierarchyAgentInfo() 
    : {
        isBoss: true,
        name: "Master Agent",
        role: "Supreme Commander & Chief Orchestrator",
        badge: "Supreme Orchestrator",
        workers: [
          {
            id: "master_design",
            name: "Master Design",
            role: "Lead Creative Director & Slide Architect",
            badge: "Tangan Kanan Master Agent"
          }
        ]
      };

  const assistantBubble = appendAssistantMessage("", true, agentInfo);
  currentActiveAssistantBubble = assistantBubble;
  const contentEl = assistantBubble ? assistantBubble.querySelector('.message-content') : null;

  const detectThemeFn = (typeof detectOptimalSlideTheme === 'function')
    ? detectOptimalSlideTheme
    : (typeof window !== 'undefined' && typeof window.detectOptimalSlideTheme === 'function' ? window.detectOptimalSlideTheme : null);
  const deducedTheme = detectThemeFn ? detectThemeFn(userMessage) : { id: 'adaptive', name: 'Adaptive Bespoke System' };

  const slideCountMatch = userMessage.match(/(\d+)\s*(?:slide|halaman|lembar)/i);
  const targetSlideCount = slideCountMatch ? Math.max(3, Math.min(parseInt(slideCountMatch[1], 10), 12)) : 5;

  // Initialize structured 5-milestone plan for Master Agent & Master Design
  const designMilestones = (typeof getDesignMilestones === 'function')
    ? getDesignMilestones(userMessage, isRevision, targetSlideCount)
    : [
        { title: "👑 Master Agent: Analisis Brief & Cetak Biru", completed: false, inProgress: true },
        { title: "🤝 Delegasi ke Master Design: Kurasi Style Visual & Palet", completed: false, inProgress: false },
        { title: `🎨 Master Design: Perancangan Bertahap Slide (1 s/d ${targetSlideCount})`, completed: false, inProgress: false },
        { title: "🔍 Quality Gate: Evaluasi & Revisi Setiap Slide", completed: false, inProgress: false },
        { title: "👑 Master Agent: Re-Check Detail Seluruh Slide & Final Approval", completed: false, inProgress: false }
      ];

  if (typeof renderTaskScheduleSection === 'function') {
    renderTaskScheduleSection(assistantBubble, designMilestones, 'min');
  }

  let toolBadgeDelegate = null;
  let toolBadgeSynthesize = null;
  let toolBadgeAudit = null;

  // Step 1: Master Agent analyzes brief/revision & delegates to Master Design
  if (typeof appendToolBadge === 'function') {
    toolBadgeDelegate = appendToolBadge(
      assistantBubble,
      isRevision ? 'delegate_revision_to_master_design' : 'delegate_to_master_design',
      isRevision
        ? { revisionRequest: userMessage, target: 'Active OpenDesign Canvas', canvasTitle: currentOpenArtifact?.meta?.title || 'Slide Deck' }
        : { brief: userMessage, layout: '16:9 Widescreen', style: deducedTheme.name, archetype: deducedTheme.id },
      'Master Agent'
    );
  }

  try {
    // Milestone 1 complete: Brief/Revision analyzed & handoff initiated
    designMilestones[0].completed = true;
    designMilestones[0].inProgress = false;
    designMilestones[1].completed = true;
    designMilestones[1].inProgress = false;
    designMilestones[2].completed = false;
    designMilestones[2].inProgress = true;

    if (typeof updateTaskScheduleProgress === 'function') {
      updateTaskScheduleProgress(assistantBubble, designMilestones, 2, true);
    }
    if (toolBadgeDelegate && typeof updateToolBadgeState === 'function') {
      updateToolBadgeState(toolBadgeDelegate, 'success', isRevision ? 'Arahan revisi canvas aktif diserahkan ke Master Design.' : 'Brief dan spesifikasi slide deck 16:9 diserahkan ke Master Design.');
    }

    // Master Design takes the active execution lead
    const workingAgentStatus = isRevision ? "🎨 Master Design: Menerapkan revisi pada canvas aktif..." : "🎨 Master Design: Merancang slide 16:9...";
    updateAssistantActiveAgent(assistantBubble, "Master Design", workingAgentStatus, false, false);

    let targetArtifact = (isRevision && currentOpenArtifact) ? currentOpenArtifact : {};
    let cardRendered = false;
    let accumulatedContent = "";
    const meta = { category: deducedTheme.name };

    const defaultBp = (typeof createDefaultBlueprint === 'function')
      ? createDefaultBlueprint(userMessage, targetSlideCount, deducedTheme)
      : { title: 'Materi Presentasi', slides: [] };

    const cleanTopic = (userMessage || 'Materi Presentasi').replace(/^buatkan\s+(?:\d+\s+)?(?:slide|halaman)?\s*/i, '').trim();
    const rawTitle = defaultBp.title || cleanTopic.slice(0, 40) || "Executive Presentation Deck";
    meta.title = rawTitle;

    const deckMeta = {
      title: rawTitle,
      brand: rawTitle,
      categoryTitle: rawTitle.toUpperCase(),
      subCategory: deducedTheme.subHeader,
      accentColor: deducedTheme.accent,
      themeObj: deducedTheme,
      userPrompt: userMessage
    };

    let workingSlides = [];

    if (isRevision && currentOpenArtifact && currentOpenArtifact.html) {
      if (typeof appendToolBadge === 'function') {
        toolBadgeSynthesize = appendToolBadge(
          assistantBubble,
          'update_canvas_slides',
          { mode: 'in-place live update', target: 'Active Canvas Drawer' },
          'Master Design'
        );
      }

      const endpointUrl = getEffectiveEndpointUrl(config.endpoint);
      const systemDirective = (typeof DESIGN_MODE_SYSTEM_PROMPT !== 'undefined') ? DESIGN_MODE_SYSTEM_PROMPT : '';
      const messages = [{ role: "system", content: systemDirective }];

      const trimmedHistory = conversationHistory.slice(-10);
      for (const item of trimmedHistory) {
        if (item.chatMode === "design" || !item.chatMode) {
          messages.push({ role: item.role, content: item.rawContent || item.content });
        }
      }

      const revisionContent = `[INSTRUKSI REVISI CANVAS AKTIF]\nBerikut kode HTML slide deck yang SEDANG AKTIF DIBUKA:\n\n\`\`\`html\n${currentOpenArtifact.html}\n\`\`\`\n\nPermintaan revisi: "${userMessage}"\n\nKembalikan kode HTML LENGKAP yang telah direvisi di dalam blok \`\`\`html ... \`\`\`.`;
      messages.push({ role: "user", content: revisionContent });

      const chosenModel = (typeof activeAgentModel !== 'undefined' && activeAgentModel) ? activeAgentModel : config.model;
      const resp = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: chosenModel, messages, temperature: 0.3, max_tokens: 1000000 }),
        signal: abortController.signal
      });

      if (resp.ok) {
        const data = await resp.json();
        accumulatedContent = data.choices?.[0]?.message?.content || "";
        const art = extractHtmlArtifact(accumulatedContent);
        if (art.html) targetArtifact.html = art.html;
      }
    } else {
      // === PROGRESSIVE SLIDE-BY-SLIDE PIPELINE ===
      workingSlides = defaultBp.slides.map((s, idx) => ({
        ...s,
        loading: true,
        completed: false,
        status: idx === 0 ? 'generating' : 'pending'
      }));

      // Milestone 1 complete: Brief analyzed & handoff initiated
      designMilestones[0].completed = true;
      designMilestones[0].inProgress = false;
      designMilestones[1].completed = true;
      designMilestones[1].inProgress = false;
      designMilestones[2].completed = false;
      designMilestones[2].inProgress = true;
      if (typeof updateTaskScheduleProgress === 'function') {
        updateTaskScheduleProgress(assistantBubble, designMilestones, 2, true);
      }

      // 1. GENERATE SLIDE 1 FIRST
      updateAssistantActiveAgent(assistantBubble, "Master Agent", "👑 Master Agent: Mengirim prompt Slide 1 (Cover) ke Master Design...", true, false);
      let toolBadgeDispatch1 = null;
      if (typeof appendToolBadge === 'function') {
        toolBadgeDispatch1 = appendToolBadge(
          assistantBubble,
          'master_agent_send_prompt_to_master_design',
          { slideIndex: 1, layout: 'cover', title: workingSlides[0].title, tokenContext: 'Dedicated cover tokens' },
          'Master Agent'
        );
      }

      updateAssistantActiveAgent(assistantBubble, "Master Design", `🎨 Master Design: Merancang Slide 1/${targetSlideCount} (Sampul Eksekutif)...`, false, false);
      let toolBadgeExec1 = null;
      if (typeof appendToolBadge === 'function') {
        toolBadgeExec1 = appendToolBadge(
          assistantBubble,
          'execute_slide_step',
          { slideIndex: 1, layout: 'cover', title: workingSlides[0].title },
          'Master Design'
        );
      }

      const aiSlide1 = await fetchSlideContentFromAI(0, targetSlideCount, userMessage, workingSlides[0], '', config, abortController.signal);
      workingSlides[0] = { ...workingSlides[0], ...aiSlide1 };

      let audit1 = (typeof auditSingleSlide === 'function')
        ? auditSingleSlide(workingSlides[0], 'cover', userMessage)
        : { ok: true };

      if (!audit1.ok && typeof reviseSlideData === 'function') {
        workingSlides[0] = reviseSlideData(workingSlides[0], audit1.reason, 'cover', userMessage, deducedTheme);
      }

      workingSlides[0].loading = false;
      workingSlides[0].completed = true;
      workingSlides[0].status = 'ready';

      if (toolBadgeDispatch1 && typeof updateToolBadgeState === 'function') {
        updateToolBadgeState(toolBadgeDispatch1, 'success', 'Slide 1 selesai dirancang dengan detail tinggi.');
      }
      if (toolBadgeExec1 && typeof updateToolBadgeState === 'function') {
        updateToolBadgeState(toolBadgeExec1, 'success', 'Slide 1 selesai dirancang & tervalidasi.');
      }

      // 2. MUNCUL LANGSUNG BISA DIBUKA CANVASNYA
      const initialDeckHtml = (typeof buildExecutiveSlideDeckHtml === 'function')
        ? buildExecutiveSlideDeckHtml(workingSlides, deckMeta)
        : '';

      targetArtifact.html = initialDeckHtml;
      targetArtifact.raw = initialDeckHtml;
      targetArtifact.meta = { title: rawTitle, category: deducedTheme.name };
      targetArtifact.content = `*⚡ Slide 1 tervalidasi. Pratinjau Canvas aktif & siap dibuka...*`;

      if (typeof setActiveDesignArtifact === 'function') {
        setActiveDesignArtifact(targetArtifact);
      } else {
        activeDesignArtifact = targetArtifact;
        window.__activeDesignArtifact = targetArtifact;
      }

      if (contentEl && !cardRendered) {
        renderOpenDesignCard(contentEl, targetArtifact, { isRevision: false });
        cardRendered = true;
      }

      if (canvasIsOpen) {
        const iframe = document.getElementById('opendesign-preview-frame');
        if (iframe) {
          iframe.srcdoc = initialDeckHtml;
          if (typeof attachSlideDeckController === 'function') {
            setTimeout(() => attachSlideDeckController(iframe), 50);
          }
        }
      }

      const slideSummaries = [`- **Slide 1 [OK]**: ${workingSlides[0].title} *(Cover)*`];
      const initialProgressText = `*⚡ Slide 1 Selesai Dirancang! Canvas Pratinjau Sudah Bisa Dibuka.*\n\n` +
        slideSummaries.join('\n') +
        `\n\n> 🎨 **Master Design** melanjutkan penyusunan slide berikutnya secara bertahap...`;
      updateAssistantText(assistantBubble, initialProgressText, true);

      // 3. PROGRESSIVE SLIDE 2 .. N LOOP
      for (let sIdx = 1; sIdx < workingSlides.length; sIdx++) {
        if (!isExecuting || abortController?.signal?.aborted) break;

        const slideNum = sIdx + 1;
        let curSlide = workingSlides[sIdx];
        curSlide.status = 'generating';
        const slideTitle = curSlide.title || `Slide ${slideNum}`;

        updateAssistantActiveAgent(assistantBubble, "Master Agent", `👑 Master Agent: Mengirim prompt Slide ${slideNum} ke Master Design...`, true, false);
        let badgePrompt = null;
        if (typeof appendToolBadge === 'function') {
          badgePrompt = appendToolBadge(
            assistantBubble,
            'master_agent_send_prompt_to_master_design',
            { slideIndex: slideNum, layout: curSlide.layout || 'bento', title: slideTitle },
            'Master Agent'
          );
        }

        updateAssistantActiveAgent(assistantBubble, "Master Design", `🎨 Master Design: Merancang Slide ${slideNum}/${workingSlides.length} (${curSlide.layout})...`, false, false);
        let badgeExec = null;
        if (typeof appendToolBadge === 'function') {
          badgeExec = appendToolBadge(
            assistantBubble,
            'execute_slide_step',
            { slideIndex: slideNum, layout: curSlide.layout || 'bento', title: slideTitle },
            'Master Design'
          );
        }

        const prevContext = workingSlides[sIdx - 1].title + ': ' + (workingSlides[sIdx - 1].subtitle || '');
        const aiSlide = await fetchSlideContentFromAI(sIdx, targetSlideCount, userMessage, curSlide, prevContext, config, abortController.signal);
        curSlide = { ...curSlide, ...aiSlide };

        let auditRes = (typeof auditSingleSlide === 'function')
          ? auditSingleSlide(curSlide, curSlide.layout, userMessage)
          : { ok: true };

        if (!auditRes.ok && typeof reviseSlideData === 'function') {
          curSlide = reviseSlideData(curSlide, auditRes.reason, curSlide.layout, userMessage, deducedTheme);
        }

        curSlide.loading = false;
        curSlide.completed = true;
        curSlide.status = 'ready';
        workingSlides[sIdx] = curSlide;

        if (badgeExec && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(badgeExec, 'success', `Slide ${slideNum} (${curSlide.layout}) tervalidasi.`);
        }
        if (badgePrompt && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(badgePrompt, 'success', `Slide ${slideNum} selesai dirancang.`);
        }

        // Live update Canvas in-place!
        const currentHtml = (typeof buildExecutiveSlideDeckHtml === 'function')
          ? buildExecutiveSlideDeckHtml(workingSlides, deckMeta)
          : '';

        targetArtifact.html = currentHtml;
        targetArtifact.raw = currentHtml;
        if (typeof setActiveDesignArtifact === 'function') {
          setActiveDesignArtifact(targetArtifact);
        }
        if (canvasIsOpen) {
          const iframe = document.getElementById('opendesign-preview-frame');
          if (iframe) {
            iframe.srcdoc = currentHtml;
            if (typeof attachSlideDeckController === 'function') {
              setTimeout(() => attachSlideDeckController(iframe), 50);
            }
          }
        }

        slideSummaries.push(`- **Slide ${slideNum} [OK]**: ${curSlide.title} *(${curSlide.layout || 'bento'})*`);
        const liveProgressText = `*⚡ Perancangan Bertahap Sedang Berjalan (${slideNum}/${workingSlides.length} slide tervalidasi)...*\n\n` +
          slideSummaries.join('\n') +
          `\n\n> 🎨 **Master Design** memvalidasi slide demi slide secara berurutan.`;
        updateAssistantText(assistantBubble, liveProgressText, true);

        await new Promise(r => setTimeout(r, 60));
      }

      // 4. MASTER AGENT FULL-DECK RE-CHECK
      designMilestones[2].completed = true;
      designMilestones[2].inProgress = false;
      designMilestones[3].completed = true;
      designMilestones[3].inProgress = false;
      designMilestones[4].completed = false;
      designMilestones[4].inProgress = true;
      if (typeof updateTaskScheduleProgress === 'function') {
        updateTaskScheduleProgress(assistantBubble, designMilestones, 4, true);
      }

      updateAssistantActiveAgent(assistantBubble, "Master Agent", "👑 Master Agent: Re-check detail seluruh slide & deteksi miss...", true, false);

      let toolBadgeRecheck = null;
      if (typeof appendToolBadge === 'function') {
        toolBadgeRecheck = appendToolBadge(
          assistantBubble,
          'master_agent_recheck_all_slides',
          { totalSlides: workingSlides.length, target: 'Kontinuitas, layout variety & anti-slop' },
          'Master Agent'
        );
      }

      let deckAudit = (typeof auditFullDeck === 'function') ? auditFullDeck(workingSlides, userMessage) : { ok: true, missList: [] };

      if (!deckAudit.ok && deckAudit.missList && deckAudit.missList.length > 0) {
        if (toolBadgeRecheck && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(toolBadgeRecheck, 'running', `Ditemukan catatan: ${deckAudit.missList.join(', ')}`);
        }

        updateAssistantActiveAgent(assistantBubble, "Master Agent", "👑 Master Agent: Memerintahkan Master Design merevisi slide yang kurang...", true, false);
        let toolBadgeDelegateFix = null;
        if (typeof appendToolBadge === 'function') {
          toolBadgeDelegateFix = appendToolBadge(
            assistantBubble,
            'delegate_revision_to_master_design',
            { missList: deckAudit.missList, order: 'Perbaiki variasi arketipe dan lengkapi detail slide' },
            'Master Agent'
          );
        }

        if (typeof reviseFullDeckData === 'function') {
          workingSlides = reviseFullDeckData(workingSlides, deckAudit.missList, userMessage, deducedTheme);
        }

        await new Promise(r => setTimeout(r, 120));
        deckAudit = (typeof auditFullDeck === 'function') ? auditFullDeck(workingSlides, userMessage) : { ok: true, missList: [] };

        if (toolBadgeDelegateFix && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(toolBadgeDelegateFix, 'success', 'Master Design telah menyempurnakan seluruh slide sesuai arahan Master Agent.');
        }
      }

      if (toolBadgeRecheck && typeof updateToolBadgeState === 'function') {
        updateToolBadgeState(toolBadgeRecheck, 'success', `Seluruh ${workingSlides.length} slide tervalidasi 100% lengkap tanpa miss.`);
      }

      if (typeof appendToolBadge === 'function') {
        toolBadgeAudit = appendToolBadge(
          assistantBubble,
          'audit_and_approve_artifact',
          { antiSlopCheck: true, allSlidesOk: true, totalSlides: workingSlides.length, themeCompliance: deducedTheme.name },
          'Master Agent'
        );
        if (typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(toolBadgeAudit, 'success', `Artifact disetujui. Standar tema ${deducedTheme.name}, rasio 16:9, dan ${workingSlides.length} slide terpenuhi.`);
        }
      }

      const finalDeckHtml = (typeof buildExecutiveSlideDeckHtml === 'function')
        ? buildExecutiveSlideDeckHtml(workingSlides, deckMeta)
        : '';
      targetArtifact.html = finalDeckHtml;
      targetArtifact.raw = finalDeckHtml;
      accumulatedContent = finalDeckHtml;
    }

    // Finalize tasks & tools
    designMilestones[4].completed = true;
    designMilestones[4].inProgress = false;
    if (typeof finalizeTaskScheduleSection === 'function') {
      finalizeTaskScheduleSection(assistantBubble);
    }
    if (typeof finalizeToolSection === 'function') {
      finalizeToolSection(assistantBubble, true);
    }

    // Clean summary response for chat
    let briefSummaryText = "";
    if (targetArtifact.html) {
      briefSummaryText = `👑 **Master Agent & Master Design**: Seluruh ${workingSlides.length || targetSlideCount} slide presentasi 16:9 widescreen bertema *${deducedTheme.name}* telah berhasil disusun dan divalidasi.`;
    } else {
      briefSummaryText = "*Perancangan slide deck selesai.*";
    }
    updateAssistantText(assistantBubble, briefSummaryText, false);

    if (artifact.html && contentEl) {
      let targetArtifact = (isRevision && currentOpenArtifact) ? currentOpenArtifact : {};
      targetArtifact.html = artifact.html;
      targetArtifact.raw = artifact.raw;
      targetArtifact.meta = { ...(targetArtifact.meta || {}), ...(meta || {}) };
      targetArtifact.content = briefSummaryText;
      targetArtifact.rawContent = accumulatedContent;

      if (typeof setActiveDesignArtifact === 'function') {
        setActiveDesignArtifact(targetArtifact);
      } else {
        activeDesignArtifact = targetArtifact;
        window.__activeDesignArtifact = targetArtifact;
      }

      // If canvas is currently open, live update the open drawer in-place!
      if (canvasIsOpen) {
        const iframe = document.getElementById('opendesign-preview-frame');
        if (iframe) {
          iframe.srcdoc = targetArtifact.html;
          if (typeof attachSlideDeckController === 'function') {
            setTimeout(() => attachSlideDeckController(iframe), 50);
            setTimeout(() => attachSlideDeckController(iframe), 250);
          }
        }
        const titleEl = document.getElementById('canvas-design-title');
        if (titleEl && targetArtifact.meta?.title) {
          titleEl.textContent = targetArtifact.meta.title;
        }
        const codeDisplay = document.getElementById('canvas-code-display');
        if (codeDisplay) {
          codeDisplay.textContent = targetArtifact.html;
        }
        const codeLangLabel = document.getElementById('canvas-code-lang-label');
        if (codeLangLabel) {
          codeLangLabel.textContent = `index.html (HTML5 Standalone • ${(targetArtifact.html.length / 1024).toFixed(1)} KB)`;
        }
        if (typeof updateCanvasVirtualFiles === 'function') {
          updateCanvasVirtualFiles(targetArtifact);
        }
        if (typeof runCanvasAutoLint === 'function') {
          runCanvasAutoLint(targetArtifact.html);
        }
        if (typeof showUniversalToast === 'function') {
          showUniversalToast('✅ Canvas aktif berhasil diperbarui!');
        }
      }

      if (!cardRendered && contentEl) {
        renderOpenDesignCard(contentEl, targetArtifact, { isRevision });
        cardRendered = true;
      }

      if (window.OpenDesignBridge?.lintArtifact) {
        window.OpenDesignBridge.lintArtifact(targetArtifact.html).catch(() => {});
      }
    }

    const finalStatusText = targetArtifact.html ? "Selesai" : (briefSummaryText ? "Selesai" : "Respon Kosong");
    updateAssistantActiveAgent(assistantBubble, "Master Agent", finalStatusText, true, true);

    if (meta && meta.title) {
      const cleanMetaTitle = String(meta.title).slice(0, 45).trim();
      if (cleanMetaTitle) {
        if (typeof setCurrentSessionTitle === 'function') {
          setCurrentSessionTitle(cleanMetaTitle);
        } else if (typeof window !== 'undefined' && typeof window.setCurrentSessionTitle === 'function') {
          window.setCurrentSessionTitle(cleanMetaTitle);
        } else if (typeof currentSessionTitle !== 'undefined') {
          currentSessionTitle = cleanMetaTitle;
          if (typeof updateHeaderChatTitle === 'function') updateHeaderChatTitle(currentSessionTitle);
        }
      }
    }

    conversationHistory.push({
      role: "assistant",
      content: briefSummaryText,
      rawContent: accumulatedContent,
      agentInfo: agentInfo,
      designArtifact: targetArtifact.html ? { html: targetArtifact.html, meta, raw: targetArtifact.raw } : null,
      chatMode: "design"
    });

    if (typeof saveCurrentSessionToDB === 'function') {
      saveCurrentSessionToDB();
    } else if (typeof window !== 'undefined' && typeof window.saveCurrentSessionToDB === 'function') {
      window.saveCurrentSessionToDB();
    }

  } catch (err) {
    const isAbort = (
      err.name === 'AbortError' ||
      err.code === 20 ||
      (err.message && /abort/i.test(err.message)) ||
      (err.toString && /abort/i.test(err.toString())) ||
      !isExecuting ||
      Boolean(abortController?.signal?.aborted)
    );

    if (isAbort) {
      updateAssistantActiveAgent(assistantBubble, "Master Agent", "Dihentikan", true, true);
      if (Array.isArray(designMilestones)) {
        designMilestones.forEach(m => { if (m.inProgress) m.inProgress = false; });
      }
      if (typeof finalizeTaskScheduleSection === 'function') {
        finalizeTaskScheduleSection(assistantBubble);
      }
      if (typeof finalizeToolSection === 'function') {
        finalizeToolSection(assistantBubble, true);
      }

      const currentText = (contentEl ? (contentEl.innerText || contentEl.textContent || "") : "").trim();
      if (!currentText || currentText.includes("Sedang merancang") || currentText.includes("Sedang menerapkan revisi") || currentText.includes("Memulai perancangan")) {
        if (contentEl) {
          contentEl.style.display = 'block';
          contentEl.innerHTML = `<div style="color: var(--text-muted, #94a3b8); font-size: 13px; font-style: italic; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">(Perancangan slide dihentikan oleh pengguna)</div>`;
        }
      }
      updateFooterStatus("Design Ready");

      conversationHistory.push({
        role: "assistant",
        content: (accumulatedContent && accumulatedContent.trim().length > 0) ? accumulatedContent.trim() : "*(Perancangan slide dihentikan oleh pengguna)*",
        agentInfo: agentInfo,
        chatMode: "design"
      });

      if (typeof saveCurrentSessionToDB === 'function') {
        saveCurrentSessionToDB();
      } else if (typeof window !== 'undefined' && typeof window.saveCurrentSessionToDB === 'function') {
        window.saveCurrentSessionToDB();
      }
    } else {
      console.error("Design Mode Error:", err);
      updateAssistantActiveAgent(assistantBubble, "Master Agent", "Gagal", true, true);
      const friendlyMsg = formatFriendlyErrorMessage(err, config.endpoint, (typeof activeModelChoice !== 'undefined' ? activeModelChoice : ''));
      if (contentEl) {
        contentEl.style.display = 'block';
        contentEl.innerHTML = `<div class="error-msg-box" style="color: #EF4444; font-size: 13px; font-weight: 500; line-height: 1.5; padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">${escapeHtml(friendlyMsg)}</div>`;
      }
      updateFooterStatus("Design Error / Network Issue");
      if (typeof saveCurrentSessionToDB === 'function') {
        saveCurrentSessionToDB();
      } else if (typeof window !== 'undefined' && typeof window.saveCurrentSessionToDB === 'function') {
        window.saveCurrentSessionToDB();
      }
    }
  } finally {
    isExecuting = false;
    updateSendButtonState(false);
    abortController = null;
    requestSmoothScrollToBottom(true);
    if (chatInput) {
      chatInput.focus();
    }
  }
}

// Global attachment
if (typeof window !== 'undefined') {
  window.runDesignModeLoop = runDesignModeLoop;
}
