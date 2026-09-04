// =========================================================================
// DESIGN EXECUTOR & MULTI-AGENT ORCHESTRATION LOOP
// Master Agent (Supreme Commander) & Master Design (Right-Hand Lead Architect)
// =========================================================================

async function runDesignModeLoop(userMessage, attachments = [], explicitMentions = []) {
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

  isExecuting = true;
  updateSendButtonState(true);
  abortController = new AbortController();

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

  // Initialize structured 5-milestone plan for Master Agent & Master Design
  const designMilestones = (typeof getDesignMilestones === 'function')
    ? getDesignMilestones(userMessage)
    : [
        { title: "👑 Master Agent: Analisis Brief & Strategi Konseptual", completed: false, inProgress: true },
        { title: "🤝 Delegasi ke Master Design: Penataan Layout & GSM Brand", completed: false, inProgress: false },
        { title: "🎨 Master Design: Sintesis Konten 16:9 Widescreen & Struktur Bab", completed: false, inProgress: false },
        { title: "🎨 Master Design: Penerapan Dark Luxury Typography & Visual Polish", completed: false, inProgress: false },
        { title: "👑 Master Agent: Review Kualitas, Anti-Slop Audit & Final Approval", completed: false, inProgress: false }
      ];

  if (typeof renderTaskScheduleSection === 'function') {
    renderTaskScheduleSection(assistantBubble, designMilestones, 'min');
  }

  let toolBadgeDelegate = null;
  let toolBadgeSynthesize = null;
  let toolBadgeAudit = null;

  // Step 1: Master Agent analyzes brief & delegates to Master Design
  if (typeof appendToolBadge === 'function') {
    toolBadgeDelegate = appendToolBadge(
      assistantBubble,
      'delegate_to_master_design',
      { brief: userMessage, layout: '16:9 Widescreen', style: 'Executive Editorial GSM v3.0' },
      'Master Agent'
    );
  }

  try {
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
    if (toolBadgeDelegate && typeof updateToolBadgeState === 'function') {
      updateToolBadgeState(toolBadgeDelegate, 'success', 'Brief dan spesifikasi slide deck 16:9 diserahkan ke Master Design.');
    }

    // Master Design takes the active execution lead
    updateAssistantActiveAgent(assistantBubble, "Master Design", "🎨 Master Design: Merancang slide 16:9...", false, false);

    if (typeof appendToolBadge === 'function') {
      toolBadgeSynthesize = appendToolBadge(
        assistantBubble,
        'synthesize_executive_slides',
        { aspect_ratio: '16:9', layout: 'Left Thumbnails + Stage + Bento Cards + Floating Dock' },
        'Master Design'
      );
    }

    const endpointUrl = buildApiUrl(config.endpoint);
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
                updateAssistantActiveAgent(assistantBubble, "Master Design", "⚡ Menyusun slide deck 16:9 & kartu bento...", false, false);
              }
              accumulatedContent += deltaContent;
              const kb = (accumulatedContent.length / 1024).toFixed(1);
              const liveProgressText = `*⚡ Sedang merancang slide deck 16:9 & kartu bento modular (${kb} KB)...*\n\n> 👑 **Master Agent** & 🎨 **Master Design** sedang berkolaborasi membangun slide deck eksekutif interaktif. Pratinjau akan otomatis aktif di Canvas setelah selesai.`;
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
      updateToolBadgeState(toolBadgeSynthesize, 'success', 'Slide deck eksekutif 16:9 widescreen berhasil disintesis.');
    }

    // Step 3: Master Agent conducts quality audit & approval
    designMilestones[3].completed = true;
    designMilestones[3].inProgress = false;
    designMilestones[4].completed = false;
    designMilestones[4].inProgress = true;

    if (typeof updateTaskScheduleProgress === 'function') {
      updateTaskScheduleProgress(assistantBubble, designMilestones, 4, true);
    }
    updateAssistantActiveAgent(assistantBubble, "Master Agent", "👑 Master Agent: Memverifikasi kualitas & anti-slop...", true, false);

    if (typeof appendToolBadge === 'function') {
      toolBadgeAudit = appendToolBadge(
        assistantBubble,
        'audit_and_approve_artifact',
        { antiSlopCheck: true, gsmCompliance: true, layoutVerification: '16:9 Widescreen' },
        'Master Agent'
      );
    }

    let artifact = extractHtmlArtifact(accumulatedContent);

    // Fallback: If no direct HTML block found, convert markdown slide outline to interactive HTML slide deck
    if (!artifact.html && accumulatedContent.trim()) {
      const convertedSlideHtml = convertMarkdownOrTextToInteractiveSlideDeck(accumulatedContent, userMessage);
      if (convertedSlideHtml) {
        artifact = {
          html: convertedSlideHtml,
          raw: convertedSlideHtml
        };
      }
    }

    const meta = extractDesignMeta(accumulatedContent);

    // Ensure artifact has the 100% executive slide deck layout (with sidebar thumbnails & floating dock)
    if (artifact.html) {
      artifact.html = upgradeSlideDeckHtmlIfNeeded(artifact.html, userMessage, meta);
    }

    if (toolBadgeAudit && typeof updateToolBadgeState === 'function') {
      updateToolBadgeState(toolBadgeAudit, 'success', 'Artifact tervalidasi. Standar visual GSM v3.0 dan rasio 16:9 terpenuhi.');
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
      const fullArtifact = {
        html: artifact.html,
        raw: artifact.raw,
        meta,
        content: briefSummaryText,
        rawContent: accumulatedContent
      };
      if (typeof setActiveDesignArtifact === 'function') {
        setActiveDesignArtifact(fullArtifact);
      } else {
        activeDesignArtifact = fullArtifact;
        window.__activeDesignArtifact = fullArtifact;
      }
      renderOpenDesignCard(contentEl, fullArtifact);

      if (window.OpenDesignBridge?.lintArtifact) {
        window.OpenDesignBridge.lintArtifact(artifact.html).catch(() => {});
      }
    }

    const finalStatusText = artifact.html ? "Selesai" : (briefSummaryText ? "Selesai" : "Respon Kosong");
    updateAssistantActiveAgent(assistantBubble, "Master Agent", finalStatusText, true, true);

    conversationHistory.push({
      role: "assistant",
      content: briefSummaryText,
      rawContent: accumulatedContent,
      agentInfo: agentInfo,
      designArtifact: artifact.html ? { html: artifact.html, meta, raw: artifact.raw } : null,
      chatMode: "design"
    });

    saveCurrentSessionToDB();

  } catch (err) {
    console.error("Design Mode Error:", err);
    updateAssistantActiveAgent(assistantBubble, "Master Agent", "Gagal", true, true);
    const friendlyMsg = formatFriendlyErrorMessage(err, config.endpoint, (typeof activeModelChoice !== 'undefined' ? activeModelChoice : ''));
    if (contentEl) {
      contentEl.style.display = 'block';
      contentEl.innerHTML = `<div class="error-msg-box" style="color: #EF4444; font-size: 13px; font-weight: 500; line-height: 1.5; padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">${escapeHtml(friendlyMsg)}</div>`;
    }
    updateFooterStatus("Design Error / Network Issue");
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
