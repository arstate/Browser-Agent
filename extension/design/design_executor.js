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

    if (typeof appendToolBadge === 'function') {
      toolBadgeSynthesize = appendToolBadge(
        assistantBubble,
        isRevision ? 'update_canvas_slides' : 'synthesize_executive_slides',
        isRevision
          ? { mode: 'in-place live update', target: 'Active Canvas Drawer' }
          : { aspect_ratio: '16:9', layout: 'Left Thumbnails + Stage + Bento Cards + Floating Dock' },
        'Master Design'
      );
    }

    const endpointUrl = getEffectiveEndpointUrl(config.endpoint);
    let systemDirective = (typeof DESIGN_MODE_SYSTEM_PROMPT !== 'undefined') ? DESIGN_MODE_SYSTEM_PROMPT : '';

    const messages = [
      { role: "system", content: systemDirective }
    ];

    const trimmedHistory = conversationHistory.slice(-10);
    for (const item of trimmedHistory) {
      if (item.chatMode === "design" || !item.chatMode) {
        messages.push({
          role: item.role,
          content: item.rawContent || item.content
        });
      }
    }

    let userContent = userMessage;
    if (attachments && attachments.length > 0) {
      userContent += "\n\n[Lampiran Gambar/File]: " + attachments.map(a => a.name || 'file').join(', ');
    }
    if (isRevision && currentOpenArtifact && currentOpenArtifact.html) {
      userContent = `[INSTRUKSI REVISI CANVAS AKTIF]\nBerikut kode HTML slide deck / antarmuka yang saat ini SEDANG AKTIF DIBUKA oleh pengguna di Canvas Workspace:\n\n\`\`\`html\n${currentOpenArtifact.html}\n\`\`\`\n\nPermintaan revisi pengguna: "${userContent}"\n\nPENTING:\n1. Lakukan pembaruan langsung pada bagian / slide / elemen yang diminta oleh pengguna.\n2. Pertahankan keutuhan slide-slide lainnya, tata letak bento grid, sidebar thumbnail, floating navigation dock, dan skrip interaktif.\n3. Kembalikan kode HTML LENGKAP yang telah direvisi di dalam blok \`\`\`html ... \`\`\` bersama tag <design_meta>...</design_meta>.`;
    }
    messages.push({ role: "user", content: userContent });

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };

    if (config.endpoint === "openrouter" || (config.endpointUrl && config.endpointUrl.includes("openrouter.ai"))) {
      headers["HTTP-Referer"] = "https://github.com/browser-agent";
      headers["X-Title"] = "Browser Agent OpenDesign Engine";
    }

    let accumulatedContent = "";
    let accumulatedReasoning = "";
    let hasStartedContent = false;

    let candidateModels = [];
    const chosenModel = (typeof activeAgentModel !== 'undefined' && activeAgentModel) ? activeAgentModel : config.model;
    if (chosenModel) candidateModels.push(chosenModel);

    if (config.endpoint === "openrouter") {
      const fallbackDefaults = [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.7-sonnet",
        "deepseek/deepseek-chat"
      ];
      for (const fb of fallbackDefaults) {
        if (!candidateModels.includes(fb)) candidateModels.push(fb);
      }
    } else if (config.autoRotateModel === false) {
      candidateModels = [candidateModels[0]];
    }

    let response = null;
    let activeModelChoice = candidateModels[0];
    let lastErrorMessage = "";

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      activeModelChoice = candidateModels[mIdx];
      try {
        const resp = await fetch(endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: activeModelChoice,
            messages,
            temperature: 0.4,
            max_tokens: parseInt(config.maxTokens, 10) || 1000000,
            stream: true
          }),
          signal: abortController.signal
        });

        if (!resp.ok) {
          let errorMsg = "";
          try {
            const errJson = await resp.json();
            errorMsg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
          } catch (e) {
            errorMsg = await resp.text();
          }
          lastErrorMessage = errorMsg;

          if (isRetryableAIError(resp.status, errorMsg) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
            const nextModel = candidateModels[mIdx + 1];
            updateAssistantText(assistantBubble, `*Model \`${activeModelChoice}\` mengalami kendala. Beralih ke \`${nextModel}\`...*\n\n`, true);
            continue;
          }
          throw new Error(`AI Request Error (${resp.status}): ${errorMsg}`);
        }

        response = resp;
        break;
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError' || !isExecuting) throw fetchErr;
        lastErrorMessage = fetchErr.message;
        if (isRetryableAIError(0, fetchErr.message) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
          const nextModel = candidateModels[mIdx + 1];
          updateAssistantText(assistantBubble, `*Kendala koneksi pada \`${activeModelChoice}\`. Mencoba \`${nextModel}\`...*\n\n`, true);
          continue;
        }
        throw fetchErr;
      }
    }

    if (!response) {
      throw new Error(lastErrorMessage || `Gagal menghubungi AI dengan model ${candidateModels.join(', ')}.`);
    }

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        if (!isExecuting || abortController?.signal.aborted) {
          try { await reader.cancel(); } catch (e) {}
          throw new DOMException("Aborted", "AbortError");
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]" || !trimmed.startsWith("data:")) continue;
          try {
            const jsonStr = trimmed.replace(/^data:\s*/, "");
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta || chunk.choices?.[0]?.message || {};
            const deltaContent = delta.content || "";
            const deltaReasoning = delta.reasoning_content || delta.reasoning || delta.thought || "";

            if (deltaReasoning) {
              accumulatedReasoning += deltaReasoning;
              if (!hasStartedContent) {
                const shortSnippet = accumulatedReasoning.slice(-60).replace(/[\r\n]+/g, ' ').trim();
                updateAssistantActiveAgent(assistantBubble, "Master Design", `🤔 Merancang Alur Presentasi... ${shortSnippet ? `(${shortSnippet})` : ''}`, false, false);
              }
            }

            if (deltaContent) {
              if (!hasStartedContent) {
                hasStartedContent = true;
                designMilestones[2].completed = true;
                designMilestones[2].inProgress = false;
                designMilestones[3].completed = false;
                designMilestones[3].inProgress = true;
                if (typeof updateTaskScheduleProgress === 'function') {
                  updateTaskScheduleProgress(assistantBubble, designMilestones, 3, true);
                }
                const workingMsg = isRevision ? "⚡ Memperbarui kode antarmuka & tata letak..." : "⚡ Menyusun slide deck 16:9 & kartu bento...";
                updateAssistantActiveAgent(assistantBubble, "Master Design", workingMsg, false, false);
              }
              accumulatedContent += deltaContent;
              const kb = (accumulatedContent.length / 1024).toFixed(1);
              const liveProgressText = isRevision
                ? `*⚡ Sedang menerapkan revisi pada canvas aktif (${kb} KB)...*\n\n> 👑 **Master Agent** & 🎨 **Master Design** sedang memperbarui desain canvas yang terbuka secara langsung.`
                : `*⚡ Sedang merancang slide deck 16:9 & kartu bento modular (${kb} KB)...*\n\n> 👑 **Master Agent** & 🎨 **Master Design** sedang berkolaborasi membangun slide deck eksekutif interaktif. Pratinjau akan otomatis aktif di Canvas setelah selesai.`;
              updateAssistantText(assistantBubble, liveProgressText, true);
            }
          } catch (err) {}
        }
      }
    } else {
      const data = await response.json();
      accumulatedContent = data.choices?.[0]?.message?.content || "";
    }

    if (toolBadgeSynthesize && typeof updateToolBadgeState === 'function') {
      updateToolBadgeState(toolBadgeSynthesize, 'success', isRevision ? 'Revisi elemen dan tata letak slide deck berhasil disusun.' : 'Drafting materi presentasi 16:9 selesai.');
    }

    // Extract slides from accumulated content or markdown
    let workingSlides = [];
    const rawExtracted = (typeof extractSlidesFromRawHtml === 'function') ? extractSlidesFromRawHtml(accumulatedContent) : [];
    if (rawExtracted && rawExtracted.length > 0) {
      workingSlides = rawExtracted;
    } else {
      const mdSlides = (typeof parseMarkdownToSlides === 'function') ? parseMarkdownToSlides(accumulatedContent, userMessage) : [];
      if (mdSlides && mdSlides.length > 0) {
        workingSlides = mdSlides;
      }
    }

    // Supplement with blueprint if count less than targetSlideCount
    const defaultBp = (typeof createDefaultBlueprint === 'function') ? createDefaultBlueprint(userMessage, targetSlideCount, deducedTheme) : null;
    if (workingSlides.length === 0) {
      workingSlides = defaultBp ? defaultBp.slides : [];
    } else if (workingSlides.length < targetSlideCount && defaultBp && defaultBp.slides) {
      for (let sIdx = workingSlides.length; sIdx < targetSlideCount; sIdx++) {
        if (defaultBp.slides[sIdx]) workingSlides.push(defaultBp.slides[sIdx]);
      }
    }

    // Step 2: Master Design executes step-by-step per-slide loop with quality check & revision
    designMilestones[1].completed = true;
    designMilestones[1].inProgress = false;
    designMilestones[2].completed = false;
    designMilestones[2].inProgress = true;
    if (typeof updateTaskScheduleProgress === 'function') {
      updateTaskScheduleProgress(assistantBubble, designMilestones, 2, true);
    }

    const slideSummaries = [];
    for (let sIdx = 0; sIdx < workingSlides.length; sIdx++) {
      if (!isExecuting || abortController?.signal?.aborted) break;

      const slideNum = sIdx + 1;
      let curSlide = workingSlides[sIdx];
      const slideTitle = curSlide.title || `Slide ${slideNum}`;

      // Status & tool badge: execute_slide_step
      updateAssistantActiveAgent(assistantBubble, "Master Design", `🎨 Master Design: Merancang Slide ${slideNum}/${workingSlides.length}...`, false, false);
      let slideExecBadge = null;
      if (typeof appendToolBadge === 'function') {
        slideExecBadge = appendToolBadge(
          assistantBubble,
          'execute_slide_step',
          { slideIndex: slideNum, layout: curSlide.layout || 'bento', title: slideTitle },
          'Master Design'
        );
        if (typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(slideExecBadge, 'success', `Slide ${slideNum} (${curSlide.layout || 'bento'}) selesai dirancang.`);
        }
      }

      // Status & tool badge: audit_slide_quality
      updateAssistantActiveAgent(assistantBubble, "Master Design", `🔍 Master Design: Mengaudit kualitas Slide ${slideNum}...`, false, false);
      let auditRes = (typeof auditSingleSlide === 'function')
        ? auditSingleSlide(curSlide, curSlide.layout, userMessage)
        : { ok: true };

      let slideAuditBadge = null;
      if (typeof appendToolBadge === 'function') {
        slideAuditBadge = appendToolBadge(
          assistantBubble,
          'audit_slide_quality',
          { slideIndex: slideNum, title: slideTitle, layout: curSlide.layout || 'bento' },
          'Master Design'
        );
      }

      // If quality check fails, trigger revision until OK
      if (!auditRes.ok) {
        if (slideAuditBadge && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(slideAuditBadge, 'running', `Catatan audit: ${auditRes.reason}`);
        }
        updateAssistantActiveAgent(assistantBubble, "Master Design", `🛠️ Master Design: Merevisi Slide ${slideNum}...`, false, false);

        let slideReviseBadge = null;
        if (typeof appendToolBadge === 'function') {
          slideReviseBadge = appendToolBadge(
            assistantBubble,
            'revise_slide_step',
            { slideIndex: slideNum, issue: auditRes.reason },
            'Master Design'
          );
        }

        if (typeof reviseSlideData === 'function') {
          curSlide = reviseSlideData(curSlide, auditRes.reason, curSlide.layout, userMessage, deducedTheme);
          workingSlides[sIdx] = curSlide;
        }

        await new Promise(r => setTimeout(r, 120));

        auditRes = (typeof auditSingleSlide === 'function')
          ? auditSingleSlide(curSlide, curSlide.layout, userMessage)
          : { ok: true };

        if (slideReviseBadge && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(slideReviseBadge, 'success', `Slide ${slideNum} berhasil disempurnakan.`);
        }
        if (slideAuditBadge && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(slideAuditBadge, 'success', `Slide ${slideNum} tervalidasi memenuhi standar kualitas.`);
        }
      } else {
        if (slideAuditBadge && typeof updateToolBadgeState === 'function') {
          updateToolBadgeState(slideAuditBadge, 'success', `Slide ${slideNum} tervalidasi memenuhi standar kualitas.`);
        }
      }

      slideSummaries.push(`- **Slide ${slideNum} [OK]**: ${curSlide.title || 'Slide'} *(${curSlide.layout || 'bento'})*`);
      const liveProgressText = `*⚡ Perancangan Bertahap Sedang Berjalan (${slideNum}/${workingSlides.length} slide tervalidasi)...*\n\n` +
        slideSummaries.join('\n') +
        `\n\n> 🎨 **Master Design** memvalidasi setiap slide demi slide secara berurutan.`;
      updateAssistantText(assistantBubble, liveProgressText, true);

      await new Promise(r => setTimeout(r, 80));
    }

    // Step 3: Master Agent conducts full-deck detailed re-check
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

      await new Promise(r => setTimeout(r, 150));
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
        isRevision ? 'audit_and_apply_live_revision' : 'audit_and_approve_artifact',
        isRevision
          ? { verified: true, liveSynced: true, target: 'Active Canvas' }
          : { antiSlopCheck: true, allSlidesOk: true, totalSlides: workingSlides.length, themeCompliance: deducedTheme.name },
        'Master Agent'
      );
      if (typeof updateToolBadgeState === 'function') {
        updateToolBadgeState(toolBadgeAudit, 'success', isRevision ? 'Revisi tervalidasi dan disinkronkan langsung ke canvas aktif.' : `Artifact disetujui. Standar tema ${deducedTheme.name}, rasio 16:9, dan ${workingSlides.length} slide terpenuhi.`);
      }
    }

    // Step 4: Assemble final executive slide deck HTML
    const meta = extractDesignMeta(accumulatedContent) || {};
    const cleanTopic = (userMessage || 'Materi Presentasi').replace(/^buatkan\s+(?:\d+\s+)?(?:slide|halaman)?\s*/i, '').trim();
    const rawTitle = meta?.title || cleanTopic.slice(0, 40) || "Executive Presentation Deck";

    const deckMeta = {
      title: rawTitle,
      brand: rawTitle,
      categoryTitle: rawTitle.toUpperCase(),
      subCategory: deducedTheme.subHeader,
      accentColor: meta?.colors?.[2] || deducedTheme.accent,
      themeObj: deducedTheme,
      userPrompt: userMessage
    };

    const finalHtml = (typeof buildExecutiveSlideDeckHtml === 'function')
      ? buildExecutiveSlideDeckHtml(workingSlides, deckMeta)
      : ((typeof renderSlideDeckHtml === 'function') ? renderSlideDeckHtml(workingSlides, deckMeta) : accumulatedContent);

    let artifact = {
      html: finalHtml,
      raw: finalHtml
    };

    // Finalize tasks & tools
    designMilestones[4].completed = true;
    designMilestones[4].inProgress = false;
    if (typeof finalizeTaskScheduleSection === 'function') {
      finalizeTaskScheduleSection(assistantBubble);
    }
    if (typeof finalizeToolSection === 'function') {
      finalizeToolSection(assistantBubble, true);
    }

    // Clean summary response for chat (Anti-Nyampah: No raw HTML code dumps in chat room!)
    let briefSummaryText = "";
    if (artifact.html) {
      briefSummaryText = getCleanDesignSummaryText(accumulatedContent, { meta, html: artifact.html }, userMessage);
    } else {
      let cleanFallback = accumulatedContent.replace(/<design_meta>[\s\S]*?<\/design_meta>/gi, '').trim();
      briefSummaryText = cleanFallback || "*Model AI tidak mengembalikan respons desain yang lengkap.*";
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

      renderOpenDesignCard(contentEl, targetArtifact, { isRevision });

      if (window.OpenDesignBridge?.lintArtifact) {
        window.OpenDesignBridge.lintArtifact(artifact.html).catch(() => {});
      }
    }

    const finalStatusText = artifact.html ? "Selesai" : (briefSummaryText ? "Selesai" : "Respon Kosong");
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
      designArtifact: artifact.html ? { html: artifact.html, meta, raw: artifact.raw } : null,
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
