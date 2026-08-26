// =========================================================================
// Browser Agent - Background Service Worker & Master Telegram Engine
// =========================================================================

// --- State Variables (Initialized First to Prevent TDZ Errors) ---
let isSidePanelOpen = false;
let telegramPollingActive = false;
let telegramAbortController = null;
const bgProcessedUpdateIds = new Set();
let lastProcessedTelegramPrompt = { text: '', time: 0 };

// --- Helper Functions ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getAuthorizedTelegramIds(authorizedConfig) {
  if (!authorizedConfig) return [];
  if (Array.isArray(authorizedConfig)) return authorizedConfig.map(s => String(s).trim()).filter(Boolean);
  return String(authorizedConfig)
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function isTelegramUserAuthorized(userId, authorizedConfig) {
  const list = getAuthorizedTelegramIds(authorizedConfig);
  if (list.length === 0) return true;
  return list.includes(String(userId).trim());
}

function formatMarkdownForTelegram(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let str = rawText;

  // 1. Extract code blocks
  const codeBlocks = [];
  str = str.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `@@@TGCODEBLOCK${codeBlocks.length}@@@`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const langAttr = lang ? ` class="language-${lang}"` : '';
    codeBlocks.push(`<pre><code${langAttr}>${escapedCode}</code></pre>`);
    return placeholder;
  });

  // 2. Extract inline code
  const inlineCodes = [];
  str = str.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `@@@TGINLINECODE${inlineCodes.length}@@@`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  // 3. Convert Markdown Tables into clean structured key-value bullet points
  str = str.replace(/((?:^[ \t]*\|.+?\|[ \t]*(?:\n|$))+)/gm, (match) => {
    const lines = match.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;
    const isDivider = /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[1]);
    const parseRow = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
    const headers = parseRow(lines[0]);
    const dataLines = isDivider ? lines.slice(2) : lines.slice(1);
    const formattedRows = [];
    for (const dLine of dataLines) {
      if (/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(dLine)) continue;
      const cols = parseRow(dLine);
      if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;
      if (cols.length === 2) {
        formattedRows.push(`• <b>${cols[0]}:</b> ${cols[1]}`);
      } else {
        const parts = cols.map((col, idx) => `<b>${headers[idx] || ("Kolom " + (idx + 1))}:</b> ${col}`);
        formattedRows.push(`• ${parts.join(" | ")}`);
      }
    }
    return formattedRows.length > 0 ? formattedRows.join("\n") + "\n" : match;
  });

  // 4. Escape raw HTML characters without double-escaping valid Telegram HTML tags
  str = str.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
  str = str.replace(/<(?!\/?(?:b|i|u|s|strong|em|ins|strike|del|code|pre|a|blockquote)(?:\s+[^>]+)?>)/gi, '&lt;');

  // 5. Convert Markdown syntax
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  str = str.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');
  str = str.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
  str = str.replace(/__([^_\n]+?)__/g, '<b>$1</b>');
  str = str.replace(/^[ \t]{4,8}[\*\-\+][ \t]+/gm, '      • ');
  str = str.replace(/^[ \t]{2,3}[\*\-\+][ \t]+/gm, '   • ');
  str = str.replace(/^[ \t]*[\*\-\+][ \t]+/gm, '• ');
  str = str.replace(/(^|[^\*])\*([^*\n\s](?:[^*\n]*[^*\n\s])?)\*(?!\*)/g, '$1<i>$2</i>');
  str = str.replace(/(^|[^_])_([^_\n\s](?:[^_\n]*[^_\n\s])?)_(?!_)/g, '$1<i>$2</i>');
  str = str.replace(/^[ \t]*---[ \t]*$/gm, '');
  str = str.replace(/\n{3,}/g, '\n\n');

  // 6. Restore preserved code elements
  inlineCodes.forEach((codeHtml, idx) => {
    str = str.replace(`@@@TGINLINECODE${idx}@@@`, codeHtml);
  });
  codeBlocks.forEach((blockHtml, idx) => {
    str = str.replace(`@@@TGCODEBLOCK${idx}@@@`, blockHtml);
  });

  return str.trim();
}

async function telegramSendMessage(botToken, chatId, text, replyMarkup = null) {
  if (!botToken || !chatId) return null;
  try {
    const formattedText = formatMarkdownForTelegram(text);
    const payload = {
      chat_id: chatId,
      text: formattedText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    
    // If HTML parsing failed on Telegram server, automatically retry with clean plain text
    if (!json.ok && json.error_code === 400) {
      const fallbackPayload = {
        chat_id: chatId,
        text: text,
        disable_web_page_preview: true
      };
      if (replyMarkup) fallbackPayload.reply_markup = replyMarkup;
      const fbRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload)
      });
      return await fbRes.json();
    }
    return json;
  } catch (err) {
    return null;
  }
}

async function telegramEditMessageText(botToken, chatId, messageId, text, replyMarkup = null) {
  if (!botToken || !chatId || !messageId) return null;
  try {
    const formattedText = formatMarkdownForTelegram(text);
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: formattedText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    
    // If HTML parsing failed on Telegram server, automatically retry with clean plain text
    if (!json.ok && json.error_code === 400) {
      const fallbackPayload = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        disable_web_page_preview: true
      };
      if (replyMarkup) fallbackPayload.reply_markup = replyMarkup;
      const fbRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload)
      });
      return await fbRes.json();
    }
    return json;
  } catch (err) {
    return null;
  }
}

async function telegramSendPhoto(botToken, chatId, photoDataUrlOrBase64, caption = "") {
  if (!botToken || !chatId || !photoDataUrlOrBase64) return null;
  try {
    let base64Data = photoDataUrlOrBase64;
    if (base64Data.startsWith("data:")) {
      base64Data = base64Data.split(",")[1];
    }
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", blob, "screenshot.png");
    if (caption) {
      formData.append("caption", formatMarkdownForTelegram(caption));
      formData.append("parse_mode", "HTML");
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: formData
    });
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function telegramSendChatAction(botToken, chatId, action = "typing") {
  if (!botToken || !chatId) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: action })
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function downloadTelegramFile(botToken, fileId) {
  if (!botToken || !fileId) return null;
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const infoJson = await infoRes.json();
    if (!infoJson.ok || !infoJson.result || !infoJson.result.file_path) {
      return null;
    }
    const filePath = infoJson.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const fileRes = await fetch(downloadUrl);
    const arrayBuffer = await fileRes.arrayBuffer();

    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    let mime = "application/octet-stream";
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
    else if (lower.endsWith(".png")) mime = "image/png";
    else if (lower.endsWith(".webp")) mime = "image/webp";
    else if (lower.endsWith(".gif")) mime = "image/gif";
    else if (lower.endsWith(".pdf")) mime = "application/pdf";
    else if (lower.endsWith(".txt") || lower.endsWith(".md")) mime = "text/plain";
    else if (lower.endsWith(".csv")) mime = "text/csv";
    else if (lower.endsWith(".json")) mime = "application/json";

    return {
      filePath,
      fileSize: infoJson.result.file_size,
      mime,
      base64,
      dataUrl: `data:${mime};base64,${base64}`
    };
  } catch (e) {
    console.error("Error downloading telegram file:", e);
    return null;
  }
}

function sendNativeRpcInBackground(action, payload = {}) {
  return new Promise((resolve) => {
    try {
      const port = chrome.runtime.connectNative("com.antigravity.chrome.agent");
      const msgId = "rpc_" + Date.now();
      let chunkBuffer = null;

      const handler = (res) => {
        if (!res || res.id !== msgId) return;

        // Handle chunked response (payload > 500KB)
        if (res.is_chunk) {
          if (!chunkBuffer) {
            chunkBuffer = { chunks: new Array(res.total_chunks), received: 0 };
          }
          chunkBuffer.chunks[res.chunk_index] = res.chunk_data;
          chunkBuffer.received++;
          if (chunkBuffer.received === res.total_chunks) {
            const fullJsonStr = chunkBuffer.chunks.join('');
            try {
              const fullMsg = JSON.parse(fullJsonStr);
              port.disconnect();
              resolve(fullMsg);
            } catch (e) {
              port.disconnect();
              resolve({ status: "error", error: "Failed to parse reassembled RPC chunks: " + e.message });
            }
          }
          return; // Wait for remaining chunks before disconnecting
        }

        // Regular non-chunked response
        port.disconnect();
        resolve(res);
      };

      port.onMessage.addListener(handler);
      port.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError;
        resolve(null);
      });

      port.postMessage({ id: msgId, action, ...payload });

      setTimeout(() => {
        try { port.disconnect(); } catch(e) {}
        resolve(null);
      }, 20000);
    } catch (e) {
      resolve(null);
    }
  });
}

// Sidepanel Action Click Handler
const enableSidePanelOnAction = async () => {
  try {
    if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === "function") {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    // Silently handle race condition during SW startup/reload
  }
};

// Periodic watchdog alarm to keep Telegram Poller alive in MV3
function setupWatchdogAlarm() {
  try {
    if (chrome.alarms) {
      chrome.alarms.create("telegram_poller_watchdog", { periodInMinutes: 1 });
    }
  } catch (e) {}
}

function broadcastSidePanelState(isOpen) {
  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;
      tabs.forEach((t) => {
        if (t.id) {
          chrome.tabs.sendMessage(t.id, { type: "SIDEPANEL_VISIBILITY", isOpen }).catch(() => {});
        }
      });
    });
  } catch (e) {}
}

// Master Update Dispatcher
async function handleTelegramIncomingUpdate(update, tgCfg) {
  const botToken = tgCfg.bot_token;
  if (!botToken) return;

  // 1. Callback Query Handler (Inline Buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const fromId = String(cb.from?.id || '');
    const data = cb.data || '';

    if (!isTelegramUserAuthorized(fromId, tgCfg.authorized_chat_id)) return;

    if (data === 'cmd_history' || data === 'cmd_sessions') {
      const storageData = await chrome.storage.local.get(['chat_sessions_cache']);
      const cache = storageData.chat_sessions_cache || {};
      let sessions = Object.values(cache);
      sessions.sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
      sessions = sessions.slice(0, 6);

      if (sessions.length === 0) {
        await telegramSendMessage(botToken, fromId, `🗂️ <b>Riwayat Sesi Percakapan:</b>\n\nBelum ada sesi percakapan yang tersimpan.`, {
          inline_keyboard: [
            [{ text: "➕ Buat Sesi Percakapan Baru", callback_data: "cmd_new_session" }]
          ]
        });
        return;
      }

      let text = `🗂️ <b>Daftar Riwayat Sesi Chat Browser Agent:</b>\n\n`;
      const keyboardRows = [];
      const switchButtons = [];

      sessions.forEach((s, idx) => {
        const num = idx + 1;
        const title = s.title || `Sesi ${num}`;
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
        const msgCount = Array.isArray(s.messages) ? s.messages.length : 0;
        
        text += `${num}. 💬 <b>${escapeHtml(title.slice(0, 38))}</b>\n`;
        text += `   <i>Waktu: ${dateStr} • ${msgCount} pesan</i>\n\n`;

        switchButtons.push({
          text: `Sesi ${num}`,
          callback_data: `switch_sess:${s.id}`
        });
      });

      for (let i = 0; i < switchButtons.length; i += 3) {
        keyboardRows.push(switchButtons.slice(i, i + 3));
      }
      keyboardRows.push([{ text: "➕ Buat Sesi Percakapan Baru", callback_data: "cmd_new_session" }]);

      await telegramSendMessage(botToken, fromId, text, { inline_keyboard: keyboardRows });
      return;
    }

    if (data.startsWith('switch_sess:')) {
      const sid = data.replace('switch_sess:', '');
      chrome.runtime.sendMessage({ type: "SWITCH_SESSION_DIRECT", sessionId: sid }).catch(() => {});
      await telegramSendMessage(botToken, fromId, `📂 <b>Berhasil Mengaktifkan Sesi:</b> <code>${escapeHtml(sid)}</code>\n\nSesi ini sekarang aktif. Silakan ketik perintah untuk melanjutkan.`);
      return;
    }

    if (data === 'cmd_new_session') {
      chrome.runtime.sendMessage({ type: "START_NEW_CHAT_DIRECT" }).catch(() => {});
      await telegramSendMessage(botToken, fromId, `✨ <b>Sesi Percakapan Baru Telah Dibuat!</b>\n\nTampilan Browser Agent telah di-reset. Silakan ketik prompt atau instruksi Anda.`);
      return;
    }

    if (data === 'cmd_model') {
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config']);
      const cfg = storageData.browser_agent_config || {};
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const modelList = Array.isArray(cfg.models) && cfg.models.length > 0 ? cfg.models : [{ id: cfg.model || "gemini-2.5-flash", name: cfg.model || "Default Model" }];
      const keyboardRows = [
        [{ text: `🤖 AUTO (Smart Dynamic) ${activeTgCfg.auto_model ? '✓' : ''}`, callback_data: "set_model:auto" }]
      ];
      for (let i = 0; i < modelList.length; i += 2) {
        const row = [];
        const m1 = modelList[i];
        const m1Id = m1.id || m1;
        const m1Name = m1.name || m1Id;
        const isM1Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m1Id || cfg.model === m1Id);
        row.push({ text: `${isM1Active ? '🟢 ' : ''}${m1Name}`, callback_data: `set_model:${m1Id}` });
        if (i + 1 < modelList.length) {
          const m2 = modelList[i + 1];
          const m2Id = m2.id || m2;
          const m2Name = m2.name || m2Id;
          const isM2Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m2Id || cfg.model === m2Id);
          row.push({ text: `${isM2Active ? '🟢 ' : ''}${m2Name}`, callback_data: `set_model:${m2Id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessage(botToken, fromId, `🧠 <b>Pilih Model AI:</b>\n\nModel aktif: <code>${activeTgCfg.auto_model ? 'AUTO' : (activeTgCfg.selected_model || cfg.model || 'Default')}</code>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (data === 'cmd_agent') {
      const storageData = await chrome.storage.local.get(['custom_agents', 'active_agent_id', 'telegram_bot_config']);
      const agents = Array.isArray(storageData.custom_agents) && storageData.custom_agents.length > 0 ? storageData.custom_agents : [{ id: "master_agent", name: "Master Agent" }];
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const keyboardRows = [
        [{ text: `🧠 AUTO (Delegasi Otomatis) ${activeTgCfg.auto_agent ? '✓' : ''}`, callback_data: "set_agent:auto" }]
      ];
      for (let i = 0; i < agents.length; i += 2) {
        const row = [];
        const a1 = agents[i];
        const isA1Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a1.id || storageData.active_agent_id === a1.id);
        row.push({ text: `${isA1Active ? '🟢 ' : ''}${a1.name}`, callback_data: `set_agent:${a1.id}` });
        if (i + 1 < agents.length) {
          const a2 = agents[i + 1];
          const isA2Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a2.id || storageData.active_agent_id === a2.id);
          row.push({ text: `${isA2Active ? '🟢 ' : ''}${a2.name}`, callback_data: `set_agent:${a2.id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessage(botToken, fromId, `👥 <b>Pilih Spesialis Agent:</b>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (data === 'cmd_screenshot_tab') {
      await telegramSendMessage(botToken, fromId, `📸 <i>Mengambil tangkapan layar tab Chrome...</i>`);
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        if (dataUrl) {
          const caption = `📸 <b>Screenshot Tab Chrome</b>\n<i>${escapeHtml(activeTab?.title || 'Chrome Tab')}</i>\nURL: <code>${escapeHtml(activeTab?.url || '-')}</code>`;
          await telegramSendPhoto(botToken, fromId, dataUrl, caption);
        } else {
          await telegramSendMessage(botToken, fromId, `⚠️ Gagal mengambil tangkapan layar tab.`);
        }
      } catch (err) {
        await telegramSendMessage(botToken, fromId, `⚠️ Error screenshot tab: ${err.message}`);
      }
      return;
    }

    if (data === 'cmd_screenshot_os') {
      await telegramSendMessage(botToken, fromId, `🖥️ <i>Mengambil screenshot Full Desktop Linux OS...</i>`);
      try {
        const rpcRes = await sendNativeRpcInBackground("capture_os_screenshot", {});
        if (rpcRes && rpcRes.status === "ok" && rpcRes.data_url) {
          const caption = `🖥️ <b>Fullscreen Linux OS Desktop Screenshot</b>\nWaktu: <code>${new Date().toLocaleString('id-ID')}</code>`;
          await telegramSendPhoto(botToken, fromId, rpcRes.data_url, caption);
        } else {
          await telegramSendMessage(botToken, fromId, `⚠️ Gagal mengambil screenshot OS: ${rpcRes?.error || 'Native Host error'}`);
        }
      } catch (err) {
        await telegramSendMessage(botToken, fromId, `⚠️ Error screenshot OS: ${err.message}`);
      }
      return;
    }

    if (data.startsWith('set_model:')) {
      const selectedModel = data.replace('set_model:', '');
      tgCfg.auto_model = (selectedModel === 'auto');
      tgCfg.selected_model = (selectedModel === 'auto' ? '' : selectedModel);
      await chrome.storage.local.set({ telegram_bot_config: tgCfg });
      await telegramSendMessage(botToken, fromId, `✅ <b>Model AI Berhasil Diganti:</b> <code>${escapeHtml(selectedModel === 'auto' ? 'AUTO (Smart Dynamic)' : selectedModel)}</code>`);
      return;
    }

    if (data.startsWith('set_agent:')) {
      const selectedAgent = data.replace('set_agent:', '');
      tgCfg.auto_agent = (selectedAgent === 'auto');
      tgCfg.selected_agent = (selectedAgent === 'auto' ? '' : selectedAgent);
      await chrome.storage.local.set({ telegram_bot_config: tgCfg });
      await telegramSendMessage(botToken, fromId, `👥 <b>Spesialis Agent Berhasil Dipilih:</b> <code>${escapeHtml(selectedAgent === 'auto' ? 'AUTO (Delegasi Otomatis)' : selectedAgent)}</code>`);
      return;
    }

    if (data === 'cmd_thinking') {
      const storageData = await chrome.storage.local.get(['thinking_level', 'telegram_bot_config']);
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const activeLevel = activeTgCfg.thinking_level || storageData.thinking_level || "high";

      const levels = [
        { id: "low", label: "Low (Instan & Cepat)" },
        { id: "medium", label: "Medium (Standar 1x Sanity)" },
        { id: "high", label: "High (Mendalam Tree-of-Thought)" },
        { id: "xhigh", label: "Xhigh (Kritik Diri Ketat)" },
        { id: "extreme", label: "Extreme (10x Mikir Keras)" }
      ];

      const keyboardRows = levels.map(lvl => ([
        {
          text: `${activeLevel === lvl.id ? '🟢 ' : ''}${lvl.label}`,
          callback_data: `set_thinking:${lvl.id}`
        }
      ]));

      const thinkingMsg = `🧠 <b>Pilih Intensitas Penalaran (Thinking Mode):</b>\n\nMode aktif saat ini: <code>${activeLevel.toUpperCase()}</code>\n\n<i>Pilih tingkat intensitas penalaran AI untuk Master Agent di Telegram:</i>`;
      await telegramSendMessage(botToken, fromId, thinkingMsg, { inline_keyboard: keyboardRows });
      return;
    }

    if (data.startsWith('set_thinking:')) {
      const selectedLevel = data.replace('set_thinking:', '');
      tgCfg.thinking_level = selectedLevel;
      await chrome.storage.local.set({ thinking_level: selectedLevel, telegram_bot_config: tgCfg });
      await telegramSendMessage(botToken, fromId, `🧠 <b>Thinking Mode Berhasil Diubah:</b> <code>${selectedLevel.toUpperCase()}</code>\nMaster Agent sekarang akan mengeksekusi instruksi dengan intensitas penalaran <b>${selectedLevel.toUpperCase()}</b>.`);
      return;
    }

    if (data.startsWith('clarify_opt:')) {
      const optIdx = parseInt(data.replace('clarify_opt:', ''), 10);
      const storageData = await chrome.storage.local.get(['telegram_active_clarification']);
      const clarState = storageData.telegram_active_clarification;
      let selectedText = "";
      if (clarState && Array.isArray(clarState.options) && clarState.options[optIdx]) {
        selectedText = clarState.options[optIdx];
      } else {
        selectedText = `Opsi ${optIdx + 1}`;
      }
      await chrome.storage.local.remove(['telegram_active_clarification']);

      await telegramSendMessage(botToken, fromId, `👉 <b>Anda Memilih Opsi ${optIdx + 1}:</b>\n<i>"${escapeHtml(selectedText)}"</i>\n\nMemulai eksekusi arahan...`);

      executePromptInBackgroundServiceWorker(selectedText, fromId, cb.from?.first_name || 'User', botToken, tgCfg).catch(err => {
        console.error("Error executing clarification choice:", err);
      });
      return;
    }

    if (data === 'clarify_custom') {
      await telegramSendMessage(botToken, fromId, `✏️ <b>Ketik Arahan Kustom:</b>\nSilakan ketik langsung perintah Anda di chat ini.`);
      return;
    }
    return;
  }

  // 2. Message Handler
  const msg = update.message;
  if (!msg) return;

  const senderId = String(msg.from?.id || msg.chat?.id || '');
  const senderName = msg.from?.first_name || 'User';
  let text = (msg.text || msg.caption || '').trim();
  let mediaPayload = null;

  // Whitelist setup / validation
  const authList = getAuthorizedTelegramIds(tgCfg.authorized_chat_id);
  if (authList.length === 0) {
    tgCfg.authorized_chat_id = senderId;
    await chrome.storage.local.set({ telegram_bot_config: tgCfg });
    await telegramSendMessage(botToken, senderId, `🎉 <b>Selamat Datang, ${escapeHtml(senderName)}!</b>\nID Akun Anda <code>${senderId}</code> telah berhasil didaftarkan ke whitelist Browser Agent.`);
  } else if (!isTelegramUserAuthorized(senderId, tgCfg.authorized_chat_id)) {
    await telegramSendMessage(botToken, senderId, `⛔ <b>Akses Ditolak.</b> ID Akun Anda (<code>${senderId}</code>) tidak terdaftar dalam whitelist pengguna resmi bot ini.`);
    return;
  }

  // Handle Photo Attachments (Images / Screenshots)
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    const highestPhoto = msg.photo[msg.photo.length - 1];
    telegramSendChatAction(botToken, senderId, "typing").catch(() => {});
    const downloaded = await downloadTelegramFile(botToken, highestPhoto.file_id);
    if (downloaded) {
      mediaPayload = {
        type: "image",
        dataUrl: downloaded.dataUrl,
        mime: downloaded.mime
      };
      if (!text) text = "Tolong analisis, baca teks, dan jelaskan detail gambar ini secara mendalam:";
    }
  }
  // Handle Voice Notes & Audio Messages (Speech-to-Text via Configured API Key)
  else if (msg.voice || msg.audio) {
    const audioObj = msg.voice || msg.audio;
    telegramSendChatAction(botToken, senderId, "typing").catch(() => {});
    await telegramSendMessage(botToken, senderId, `🎙️ <i>Mendengarkan & mentranskripsi pesan suara...</i>`);
    const downloaded = await downloadTelegramFile(botToken, audioObj.file_id);
    if (downloaded) {
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config']);
      const cfg = storageData.browser_agent_config || {};
      const rawEndpoint = cfg.endpoint || cfg.customEndpoint || "";
      const apiKey = cfg.apiKey;

      try {
        const rpcRes = await sendNativeRpcInBackground("transcribe_audio", {
          file_base64: downloaded.base64,
          mime_type: downloaded.mime || "audio/ogg",
          api_key: apiKey,
          endpoint: rawEndpoint,
          preset: cfg.preset
        });

        if (rpcRes && rpcRes.status === "ok" && rpcRes.text) {
          const rawTranscribed = rpcRes.text.trim();
          let refinedText = rawTranscribed;

          // AI LLM Phonetic & Typo Refinement: Correct typos/slang/grammar so the agent understands accurately
          try {
            const refineModel = activeTgCfg.selected_model || cfg.selectedModelChoice || cfg.model || "gemini-2.5-flash";
            const headers = { "Content-Type": "application/json" };
            if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

            let endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
            if (rawEndpoint) {
              endpoint = rawEndpoint.endsWith("/chat/completions") ? rawEndpoint : `${rawEndpoint.replace(/\/+$/, '')}/chat/completions`;
            }

            const refineRes = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify({
                model: refineModel,
                messages: [
                  {
                    role: "system",
                    content: "Anda adalah AI Audio Transcript Typo & Intent Corrector. Tugas Anda adalah membaca transkripsi suara mentah pengguna, memperbaiki kesalahan ketik (typo), salah dengar fonetik kata/istilah (misal istilah Linux, tool web, bahasa gaul Indonesia, nama software), serta merapikan tanda baca agar menjadi kalimat perintah yang jelas dan mudah dipahami oleh AI Agent. HANYA berikan hasil kalimat yang sudah diperbaiki tanpa tanda kutip, tanpa kata pengantar, dan tanpa penjelasan tambahan."
                  },
                  {
                    role: "user",
                    content: `Perbaiki teks transkripsi suara mentah berikut:\n"${rawTranscribed}"`
                  }
                ],
                temperature: 0.1,
                max_tokens: 1024
              })
            });

            if (refineRes.ok) {
              const refineJson = await refineRes.json();
              const corrected = refineJson.choices?.[0]?.message?.content?.trim();
              if (corrected && corrected.length > 0) {
                refinedText = corrected.replace(/^["']|["']$/g, '').trim();
              }
            }
          } catch (refineErr) {
            console.warn("Audio transcript refinement notice:", refineErr);
          }

          await telegramSendMessage(botToken, senderId, `🎙️ <b>Transkrip Suara:</b> <i>"${escapeHtml(refinedText)}"</i>`);
          text = refinedText;
        } else {
          await telegramSendMessage(botToken, senderId, `⚠️ Gagal mentranskripsi pesan suara: ${rpcRes?.error || 'Tidak ada teks yang terdeteksi'}`);
          return;
        }
      } catch (err) {
        await telegramSendMessage(botToken, senderId, `⚠️ Error transkripsi audio: ${err.message}`);
        return;
      }
    }
  }
  // Handle Document Attachments (PDF, DOCX, CSV, JSON, TXT, Code, etc.)
  else if (msg.document) {
    const doc = msg.document;
    const fileName = doc.file_name || "document";
    telegramSendChatAction(botToken, senderId, "typing").catch(() => {});
    const downloaded = await downloadTelegramFile(botToken, doc.file_id);
    if (downloaded) {
      if (downloaded.mime && downloaded.mime.startsWith("image/")) {
        mediaPayload = {
          type: "image",
          dataUrl: downloaded.dataUrl,
          mime: downloaded.mime
        };
        if (!text) text = `Tolong analisis dan jelaskan gambar dokumen ${fileName} ini:`;
      } else {
        // Extract text from document via Native Host RPC (pdftotext for PDF, XML for DOCX, plain UTF-8 for text/data)
        let docText = "";
        try {
          const rpcRes = await sendNativeRpcInBackground("extract_document_text", {
            file_base64: downloaded.base64,
            file_name: fileName
          });
          if (rpcRes && rpcRes.status === "ok" && rpcRes.text) {
            docText = rpcRes.text;
          }
        } catch (e) {}

        if (!docText && (fileName.endsWith(".txt") || fileName.endsWith(".csv") || fileName.endsWith(".json") || fileName.endsWith(".md"))) {
          try {
            docText = atob(downloaded.base64);
          } catch (e) {}
        }

        mediaPayload = {
          type: "document",
          fileName: fileName,
          extractedText: docText || ""
        };

        const docHeader = `📄 [Dokumen Terlampir: "${fileName}"]\n--- ISI DOKUMEN ---\n${docText ? docText.slice(0, 40000) : 'Dokumen berhasil diunduh.'}\n--- AKHIR DOKUMEN ---\n\n`;
        text = docHeader + (text || "Tolong baca, analisis, dan jelaskan isi dokumen ini secara komprehensif:");
      }
    }
  }

  if (!text && !mediaPayload) return;

  // Slash Commands (Instant Sub-Second Response)
  if (text.startsWith('/')) {
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === '/start' || cmd === '/help') {
      const welcome = `🤖 <b>Browser Agent Remote Control Aktif!</b>\n\nHalo <b>${escapeHtml(senderName)}</b>, Anda dapat mengontrol browser, mengirim pesan suara (Voice Audio), mengirim gambar/foto, mengirim dokumen (PDF, Word, TXT, CSV), dan mengeksekusi AI langsung dari chat ini.\n\n<b>Pilihan Perintah:</b>\n• /thinking - Atur intensitas berpikir AI (Low, Medium, High, Xhigh, Extreme)\n• /model - Ganti model AI aktif\n• /agent - Ganti spesialis agent\n• /history - Daftar riwayat sesi chat & pindah sesi\n• /screenshot - Ambil screenshot Tab Chrome\n• /screenshot_os - Ambil screenshot Full Desktop Linux\n• /status - Cek status tab & performa\n• /new - Mulai sesi percakapan baru\n\n<i>Kirim pesan suara, foto, dokumen PDF/Word/TXT, atau ketik instruksi apa saja!</i>`;
      await telegramSendMessage(botToken, senderId, welcome, {
        inline_keyboard: [
          [
            { text: "🧠 Thinking Mode", callback_data: "cmd_thinking" },
            { text: "🤖 Model AI", callback_data: "cmd_model" }
          ],
          [
            { text: "👥 Spesialis Agent", callback_data: "cmd_agent" },
            { text: "🗂️ Riwayat Sesi", callback_data: "cmd_history" }
          ],
          [
            { text: "📸 Screenshot Tab", callback_data: "cmd_screenshot_tab" },
            { text: "🖥️ Screenshot OS", callback_data: "cmd_screenshot_os" }
          ],
          [
            { text: "✨ Sesi Baru", callback_data: "cmd_new_session" }
          ]
        ]
      });
      return;
    }

    if (cmd === '/thinking' || cmd === '/think') {
      const storageData = await chrome.storage.local.get(['thinking_level', 'telegram_bot_config']);
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const activeLevel = activeTgCfg.thinking_level || storageData.thinking_level || "high";

      const levels = [
        { id: "low", label: "Low (Instan & Cepat)" },
        { id: "medium", label: "Medium (Standar 1x Sanity)" },
        { id: "high", label: "High (Mendalam Tree-of-Thought)" },
        { id: "xhigh", label: "Xhigh (Kritik Diri Ketat)" },
        { id: "extreme", label: "Extreme (10x Mikir Keras)" }
      ];

      const keyboardRows = levels.map(lvl => ([
        {
          text: `${activeLevel === lvl.id ? '🟢 ' : ''}${lvl.label}`,
          callback_data: `set_thinking:${lvl.id}`
        }
      ]));

      const thinkingMsg = `🧠 <b>Pilih Intensitas Penalaran (Thinking Mode):</b>\n\nMode aktif saat ini: <code>${activeLevel.toUpperCase()}</code>\n\n<i>Pilih tingkat intensitas penalaran AI untuk Master Agent di Telegram:</i>`;
      await telegramSendMessage(botToken, senderId, thinkingMsg, { inline_keyboard: keyboardRows });
      return;
    }

    if (cmd === '/history' || cmd === '/sessions') {
      const storageData = await chrome.storage.local.get(['chat_sessions_cache']);
      const cache = storageData.chat_sessions_cache || {};
      let sessions = Object.values(cache);
      sessions.sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
      sessions = sessions.slice(0, 6);

      if (sessions.length === 0) {
        await telegramSendMessage(botToken, senderId, `🗂️ <b>Riwayat Sesi Percakapan:</b>\n\nBelum ada sesi percakapan yang tersimpan.`, {
          inline_keyboard: [
            [{ text: "➕ Buat Sesi Baru", callback_data: "cmd_new_session" }]
          ]
        });
        return;
      }

      let histText = `🗂️ <b>Daftar Riwayat Sesi Chat:</b>\n\n`;
      const keyboardRows = [];
      const switchButtons = [];
      sessions.forEach((s, idx) => {
        const num = idx + 1;
        const title = s.title || `Sesi ${num}`;
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
        histText += `${num}. 💬 <b>${escapeHtml(title.slice(0, 38))}</b> (<i>${dateStr}</i>)\n`;
        switchButtons.push({ text: `Sesi ${num}`, callback_data: `switch_sess:${s.id}` });
      });

      for (let i = 0; i < switchButtons.length; i += 3) {
        keyboardRows.push(switchButtons.slice(i, i + 3));
      }
      keyboardRows.push([{ text: "➕ Buat Sesi Baru", callback_data: "cmd_new_session" }]);
      await telegramSendMessage(botToken, senderId, histText, { inline_keyboard: keyboardRows });
      return;
    }

    if (cmd === '/new') {
      const storageData = await chrome.storage.local.get(['chat_sessions_cache']);
      const cache = storageData.chat_sessions_cache || {};
      const sessId = `sess_tg_${senderId}`;
      if (cache[sessId] && Array.isArray(cache[sessId].messages) && cache[sessId].messages.length > 0) {
        const archivedId = `sess_tg_${senderId}_${Date.now()}`;
        cache[archivedId] = {
          ...cache[sessId],
          id: archivedId,
          title: `📱 Telegram: ${senderName} (${new Date().toLocaleDateString('id-ID')})`
        };
      }
      cache[sessId] = {
        id: sessId,
        title: `📱 Telegram: ${senderName}`,
        model: tgCfg.selected_model || "gemini-2.5-flash",
        is_telegram: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        messages: []
      };
      await chrome.storage.local.set({ chat_sessions_cache: cache });
      chrome.runtime.sendMessage({ type: "TELEGRAM_HISTORY_UPDATED" }).catch(() => {});
      await telegramSendMessage(botToken, senderId, `✨ <b>Sesi Percakapan Telegram Baru Dimulai!</b>\nMemori riwayat percakapan telah di-reset.`);
      return;
    }

    if (cmd === '/model') {
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config']);
      const cfg = storageData.browser_agent_config || {};
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const modelList = Array.isArray(cfg.models) && cfg.models.length > 0 ? cfg.models : [{ id: cfg.model || "gemini-2.5-flash", name: cfg.model || "Default Model" }];
      const keyboardRows = [
        [{ text: `🤖 AUTO (Smart Dynamic) ${activeTgCfg.auto_model ? '✓' : ''}`, callback_data: "set_model:auto" }]
      ];
      for (let i = 0; i < modelList.length; i += 2) {
        const row = [];
        const m1 = modelList[i];
        const m1Id = m1.id || m1;
        const m1Name = m1.name || m1Id;
        const isM1Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m1Id || cfg.model === m1Id);
        row.push({ text: `${isM1Active ? '🟢 ' : ''}${m1Name}`, callback_data: `set_model:${m1Id}` });
        if (i + 1 < modelList.length) {
          const m2 = modelList[i + 1];
          const m2Id = m2.id || m2;
          const m2Name = m2.name || m2Id;
          const isM2Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m2Id || cfg.model === m2Id);
          row.push({ text: `${isM2Active ? '🟢 ' : ''}${m2Name}`, callback_data: `set_model:${m2Id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessage(botToken, senderId, `🧠 <b>Pilih Model AI:</b>\n\nModel aktif: <code>${activeTgCfg.auto_model ? 'AUTO' : (activeTgCfg.selected_model || cfg.model || 'Default')}</code>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (cmd === '/agent') {
      const storageData = await chrome.storage.local.get(['custom_agents', 'active_agent_id', 'telegram_bot_config']);
      const agents = Array.isArray(storageData.custom_agents) && storageData.custom_agents.length > 0 ? storageData.custom_agents : [{ id: "master_agent", name: "Master Agent" }];
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const keyboardRows = [
        [{ text: `🧠 AUTO (Delegasi Otomatis) ${activeTgCfg.auto_agent ? '✓' : ''}`, callback_data: "set_agent:auto" }]
      ];
      for (let i = 0; i < agents.length; i += 2) {
        const row = [];
        const a1 = agents[i];
        const isA1Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a1.id || storageData.active_agent_id === a1.id);
        row.push({ text: `${isA1Active ? '🟢 ' : ''}${a1.name}`, callback_data: `set_agent:${a1.id}` });
        if (i + 1 < agents.length) {
          const a2 = agents[i + 1];
          const isA2Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a2.id || storageData.active_agent_id === a2.id);
          row.push({ text: `${isA2Active ? '🟢 ' : ''}${a2.name}`, callback_data: `set_agent:${a2.id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessage(botToken, senderId, `👥 <b>Pilih Spesialis Agent:</b>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (cmd === '/screenshot' || cmd === '/screenshot_tab') {
      await telegramSendMessage(botToken, senderId, `📸 <i>Mengambil tangkapan layar tab Chrome...</i>`);
      try {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const activeTab = tabs && tabs[0] ? tabs[0] : (await chrome.tabs.query({ active: true }))[0];
        let dataUrl = null;
        if (activeTab && activeTab.windowId) {
          try {
            dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: "png" });
          } catch (e) {}
        }
        if (!dataUrl) {
          const rpcRes = await sendNativeRpcInBackground("capture_os_screenshot", {});
          if (rpcRes && rpcRes.status === "ok" && rpcRes.data_url) {
            dataUrl = rpcRes.data_url;
          }
        }
        if (dataUrl) {
          const caption = `📸 <b>Screenshot Layar Aktif</b>\n<i>${escapeHtml(activeTab?.title || 'Desktop / Chrome Tab')}</i>\nURL: <code>${escapeHtml(activeTab?.url || '-')}</code>`;
          await telegramSendPhoto(botToken, senderId, dataUrl, caption);
        } else {
          await telegramSendMessage(botToken, senderId, `⚠️ Gagal mengambil screenshot tab.`);
        }
      } catch (err) {
        await telegramSendMessage(botToken, senderId, `⚠️ Gagal screenshot: ${err.message}`);
      }
      return;
    }

    if (cmd === '/screenshot_os' || cmd === '/screenshot_fullscreen') {
      await telegramSendMessage(botToken, senderId, `🖥️ <i>Mengambil screenshot Full Desktop Linux OS...</i>`);
      try {
        const rpcRes = await sendNativeRpcInBackground("capture_os_screenshot", {});
        if (rpcRes && rpcRes.status === "ok" && rpcRes.data_url) {
          const caption = `🖥️ <b>Fullscreen Linux OS Desktop Screenshot</b>\nWaktu: <code>${new Date().toLocaleString('id-ID')}</code>`;
          await telegramSendPhoto(botToken, senderId, rpcRes.data_url, caption);
        } else {
          await telegramSendMessage(botToken, senderId, `⚠️ Gagal mengambil screenshot OS: ${rpcRes?.error || 'Native Host error'}`);
        }
      } catch (err) {
        await telegramSendMessage(botToken, senderId, `⚠️ Error screenshot OS: ${err.message}`);
      }
      return;
    }

    if (cmd === '/status') {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'custom_agents', 'telegram_bot_config']);
      const cfg = storageData.browser_agent_config || {};
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const agents = Array.isArray(storageData.custom_agents) ? storageData.custom_agents : [];
      
      const realActiveModel = activeTgCfg.selected_model || cfg.selectedModelChoice || cfg.model || "gemini-2.5-flash";
      const modelDisplay = activeTgCfg.auto_model ? `AUTO (${realActiveModel})` : realActiveModel;
      const agentDisplay = activeTgCfg.auto_agent ? `AUTO (${agents[0]?.name || 'Master Agent'})` : (agents.find(a => a.id === activeTgCfg.selected_agent)?.name || 'Master Agent');
      const thinkingLevel = activeTgCfg.thinking_level || storageData.thinking_level || "high";
      const statusMsg = `📊 <b>Status Browser Agent:</b>\n\n• <b>Tab Aktif:</b> ${escapeHtml(activeTab?.title || 'None')}\n• <b>URL:</b> <code>${escapeHtml(activeTab?.url || '-')}</code>\n• <b>Thinking Mode:</b> <code>${escapeHtml(thinkingLevel.toUpperCase())}</code>\n• <b>Model:</b> <code>${escapeHtml(modelDisplay)}</code>\n• <b>Agent:</b> <code>${escapeHtml(agentDisplay)}</code>\n• <b>Auto-Accept:</b> <code>${activeTgCfg.auto_accept ? 'ON (Otomatis)' : 'OFF (Safe Mode)'}</code>\n• <b>Latensi Engine:</b> <code>Real-Time (<100ms) 🟢</code>`;
      await telegramSendMessage(botToken, senderId, statusMsg);
      return;
    }
  }

  // 3. User Prompt Execution -> Always Execute via Fast Independent Background Engine
  let effectiveText = text;
  const storageData = await chrome.storage.local.get(['telegram_active_clarification']);
  const clarState = storageData.telegram_active_clarification;
  if (clarState && Array.isArray(clarState.options)) {
    const trimmed = text.trim();
    if (/^[1-9]$/.test(trimmed)) {
      const numIdx = parseInt(trimmed, 10) - 1;
      if (clarState.options[numIdx]) {
        effectiveText = clarState.options[numIdx];
        await telegramSendMessage(botToken, senderId, `👉 <b>Memilih Opsi ${trimmed}:</b> <i>"${escapeHtml(effectiveText)}"</i>`);
      }
    }
    await chrome.storage.local.remove(['telegram_active_clarification']);
  }

  const now = Date.now();
  if (lastProcessedTelegramPrompt.text === effectiveText && (now - lastProcessedTelegramPrompt.time < 2000)) {
    return;
  }
  lastProcessedTelegramPrompt = { text: effectiveText, time: now };

  // Execute directly and independently in background (with optional media/document payload)
  executePromptInBackgroundServiceWorker(effectiveText, senderId, senderName, botToken, tgCfg, mediaPayload).catch(err => {
    console.error("Error executing background prompt:", err);
  });
}

// Tool Definitions for Background Autonomous Agent Loop (Aligned with Sidepanel Browser Control Agent)
const BACKGROUND_AGENT_TOOLS = [
  // 1. 🌐 Primary Browser Control Agent Tools (CDP & Live DOM)
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Navigate or open a specific URL in a dedicated browser tab (e.g. 'http://localhost:20128/dashboard/quota', 'https://www.google.com', 'https://youtube.com').",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to navigate to" }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_snapshot",
      description: "Capture real-time interactive DOM elements, forms, and Accessibility Tree with backendNodeIds for clicking, typing, and post-action verification. Essential for zero-hallucination browser control.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "Click an interactive element on the page using its verified backendNodeId (from browser_snapshot) with 100% precision via CDP mouse events.",
      parameters: {
        type: "object",
        properties: {
          backendNodeId: { type: "integer", description: "The backendNodeId from browser_snapshot" },
          selector: { type: "string", description: "Optional fallback CSS selector or button text" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description: "Type text into an input element using its backendNodeId (from browser_snapshot) or selector.",
      parameters: {
        type: "object",
        properties: {
          backendNodeId: { type: "integer", description: "The backendNodeId of the target input element" },
          text: { type: "string", description: "The text to type" },
          pressEnter: { type: "boolean", description: "Whether to press Enter after typing", default: false }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_extract_table",
      description: "Extract structured data from tables, quota grids, or virtual scroll lists (e.g. 9Router Quota Tracker, Meta Ads Manager, analytics grids). Automatically extracts all rows, headers, and metrics.",
      parameters: {
        type: "object",
        properties: {
          max_rows: { type: "integer", description: "Maximum number of rows to extract (default: 100)", default: 100 },
          auto_scroll: { type: "boolean", description: "Auto-scroll to capture virtualized rows", default: true }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Capture visual screenshot walkthrough of the active browser tab and send the image directly to Telegram.",
      parameters: {
        type: "object",
        properties: {
          caption: { type: "string", description: "Caption description for the screenshot photo" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_list_tabs",
      description: "List all currently open browser tabs (tabId, title, url, active) to find and switch between target pages.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_switch_tab",
      description: "Switch focus and bind the agent to a specific browser tab by tabId, title keyword, or URL.",
      parameters: {
        type: "object",
        properties: {
          tabId: { type: "string", description: "The tabId or title/url keyword to switch to" }
        },
        required: ["tabId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_wait",
      description: "Wait for a specified duration in seconds (1 to 10) for slow network, async API requests, or heavy web apps (like 9Router or Meta Ads) to settle.",
      parameters: {
        type: "object",
        properties: {
          duration_seconds: { type: "number", description: "Duration to wait in seconds (default: 2)", default: 2 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_control_media",
      description: "Control media playback (YouTube, Spotify, video) on active tab: play, pause, toggle, mute, status.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pause", "toggle", "mute", "unmute", "status"] }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description: "Present 3 clickable option buttons on Telegram when instructions are ambiguous.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "Question to ask" },
          options: { type: "array", items: { type: "string" }, description: "Up to 3 selectable options" }
        },
        required: ["question", "options"]
      }
    }
  },

  // 2. 💻 Native Linux OS Desktop & Terminal Tools
  {
    type: "function",
    function: {
      name: "open_linux_app",
      description: "Open any Linux desktop application or GUI window (e.g. 'dolphin' for file manager, 'konsole' or 'xterm' for terminal, 'code' for VS Code, 'gedit', 'calc', etc.).",
      parameters: {
        type: "object",
        properties: {
          app_name: { type: "string", description: "Binary or command name (e.g. 'dolphin', 'konsole', 'code')" },
          args: { type: "string", description: "Optional arguments or path" }
        },
        required: ["app_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_bash_command",
      description: "Execute a bash shell command directly on Linux OS and receive stdout/stderr output (e.g. 'ls -la', 'ps aux', 'git status', 'mkdir', etc.).",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Bash command string to execute" },
          cwd: { type: "string", description: "Optional working directory" }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "type_os_text",
      description: "Type text or keystrokes into the active Linux Desktop window or Terminal.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text or command string to type" },
          press_enter: { type: "boolean", description: "Press Enter after typing", default: true }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_os_file",
      description: "Read text contents of a file on Linux OS.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute path to file" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_os_file",
      description: "Write text content to a file on Linux OS.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute path to file" },
          content: { type: "string", description: "Content to write" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_file_to_telegram",
      description: "Send any local file (document, text file, script, audio MP3/WAV, video MP4, photo, or generated content) directly to the user's Telegram chat. Use this when the user asks to download music/video (e.g. via yt-dlp or curl), write a script, generate a document, or send an image/file.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute path to the local file to send (e.g. '/tmp/Denny_Caknan.mp3', '/home/arya/dokumen.pdf', '/tmp/script_kucing.txt')" },
          content: { type: "string", description: "Direct text/markdown content to send as a file if creating on the fly" },
          file_name: { type: "string", description: "File name with extension (e.g. 'script_konten_kucing.txt', 'lagu.mp3', 'data.json')" },
          caption: { type: "string", description: "Caption description for the sent file or media" },
          media_type: { type: "string", enum: ["auto", "document", "photo", "audio", "video"], description: "Type of media" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web via DuckDuckGo in real-time to find live information, tutorials, CLI commands, Python syntax, documentation, or solutions whenever you don't know the exact command or method.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords (e.g. 'how to convert pdf to png poppler pdftoppm', 'merge pdf linux command', 'ffmpeg convert video mp4')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "learn_new_skill",
      description: "Save a newly discovered workflow, CLI recipe, or solution into the Browser Agent Brain SQLite database so it is permanently remembered and recalled for all future tasks.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short descriptive name for the skill (e.g. 'PDF to Image Zip Converter', 'Merge PDF CLI Workflow')" },
          description: { type: "string", description: "Summary of what this skill does" },
          workflow_markdown: { type: "string", description: "Step-by-step instructions, CLI commands, or Python code for executing the workflow" }
        },
        required: ["name", "workflow_markdown"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image or illustration using the AI Image Generation model configured in Browser Agent settings (DALL-E 3, Imagen 3, Flux, SDXL, etc.). Always use this tool whenever the user asks to draw, generate, or create an image. The generated photo will automatically be saved and sent directly to the user's Telegram chat.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed, high-quality, descriptive prompt in English or Indonesian for the image to generate" },
          aspect_ratio: { type: "string", enum: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"], description: "Aspect ratio for the generated image" },
          caption: { type: "string", description: "Short creative Indonesian caption for the image when sent to Telegram" }
        },
        required: ["prompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ponytail_token_meter",
      description: "Ponytail Token Saver Plugin: Check active token optimization status, context turn count, and token compression savings estimate.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

let telegramAgentWorkerTabId = null;

async function attachCdpDebugger(tabId) {
  if (!tabId) return false;
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      return false;
    }
    await chrome.debugger.attach({ tabId }, "1.3");
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable").catch(() => {});
    await chrome.debugger.sendCommand({ tabId }, "DOM.enable").catch(() => {});
    await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable").catch(() => {});
    return true;
  } catch (err) {
    if (err && err.message && err.message.includes("already attached")) {
      return true;
    }
    return false;
  }
}

async function getOrCreateTelegramAgentTab(targetUrl = null) {
  // 1. If targetUrl is requested:
  if (targetUrl) {
    if (telegramAgentWorkerTabId) {
      try {
        const existing = await chrome.tabs.get(telegramAgentWorkerTabId);
        if (existing && existing.id) {
          await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
          await new Promise(r => setTimeout(r, 2000));
          return existing;
        }
      } catch(e) {
        telegramAgentWorkerTabId = null;
      }
    }
    // Create dedicated fresh worker tab without touching existing tabs
    const createdTab = await chrome.tabs.create({ url: targetUrl, active: true });
    telegramAgentWorkerTabId = createdTab.id;
    await new Promise(r => setTimeout(r, 2200));
    return createdTab;
  }

  // 2. If inspecting current tab without targetUrl:
  if (telegramAgentWorkerTabId) {
    try {
      const existing = await chrome.tabs.get(telegramAgentWorkerTabId);
      if (existing && existing.id) return existing;
    } catch(e) {
      telegramAgentWorkerTabId = null;
    }
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    let cand = tabs && tabs[0] ? tabs[0] : (await chrome.tabs.query({ active: true }))[0];
    if (cand && cand.url && !cand.url.startsWith("chrome://") && !cand.url.startsWith("chrome-extension://")) {
      return cand;
    }
  } catch(e) {}

  return null;
}

async function executeBackgroundTool(toolName, toolArgs, senderId, botToken, cfg = {}) {
  try {
    // A. Browser Navigation & Tab Tools
    if (toolName === "browser_navigate" || toolName === "navigate_to" || toolName === "browser_create_tab" || toolName === "new_tab") {
      let targetUrl = (toolArgs.url || "https://www.google.com").trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }
      const workerTab = await getOrCreateTelegramAgentTab(targetUrl);
      return { status: "success", url: targetUrl, tab_id: workerTab?.id, pageTitle: workerTab?.title, message: `Berhasil membuka tab baru ${targetUrl}` };
    }

    if (toolName === "browser_list_tabs") {
      const allTabs = await chrome.tabs.query({});
      const list = allTabs.map(t => ({
        tabId: t.id,
        title: t.title || "Untitled",
        url: t.url || "about:blank",
        active: !!t.active
      }));
      return { status: "success", total: list.length, tabs: list };
    }

    if (toolName === "browser_switch_tab" || toolName === "switch_tab") {
      const allTabs = await chrome.tabs.query({});
      let target = null;
      const query = String(toolArgs.tabId || toolArgs.tab_id || toolArgs.query || "").toLowerCase();
      
      if (/^\d+$/.test(query)) {
        target = allTabs.find(t => t.id === Number(query));
      }
      if (!target && query) {
        target = allTabs.find(t => (t.title && t.title.toLowerCase().includes(query)) || (t.url && t.url.toLowerCase().includes(query)));
      }
      if (target && target.id) {
        await chrome.tabs.update(target.id, { active: true });
        telegramAgentWorkerTabId = target.id;
        return { status: "success", tabId: target.id, title: target.title, url: target.url, message: `Beralih ke tab "${target.title}"` };
      }
      return { error: `Tab '${query}' tidak ditemukan.` };
    }

    if (toolName === "browser_wait") {
      const dur = Math.min(15, Math.max(1, Number(toolArgs.duration_seconds) || 2));
      await new Promise(r => setTimeout(r, dur * 1000));
      return { status: "success", waited_seconds: dur };
    }

    // B. Linux OS Native Tools
    if (toolName === "open_linux_app") {
      const app = toolArgs.app_name || toolArgs.command || "konsole";
      const args = toolArgs.args || "";
      const rpcRes = await sendNativeRpcInBackground("open_application", { app_name: app, args });
      if (rpcRes && rpcRes.status === "ok") {
        return { status: "success", message: `Aplikasi Linux '${app}' berhasil dibuka di Desktop.` };
      }
      return { error: rpcRes?.error || `Gagal membuka aplikasi '${app}'` };
    }

    if (toolName === "run_bash_command") {
      const cmd = toolArgs.command || "";
      const cwd = toolArgs.cwd || "";
      const rpcRes = await sendNativeRpcInBackground("run_command", { command: cmd, cwd });
      if (rpcRes && rpcRes.status === "ok") {
        const out = (rpcRes.stdout || '').trim();
        const err = (rpcRes.stderr || '').trim();
        return {
          status: "success",
          stdout: out || "(perintah selesai tanpa output)",
          stderr: err,
          exit_code: rpcRes.exit_code
        };
      }
      return { error: rpcRes?.error || "Gagal mengeksekusi perintah shell." };
    }

    if (toolName === "type_os_text") {
      const text = toolArgs.text || "";
      const press_enter = toolArgs.press_enter !== false;
      const rpcRes = await sendNativeRpcInBackground("type_os_text", { text, press_enter });
      if (rpcRes && rpcRes.status === "ok") {
        return { status: "success", message: `Berhasil mengetik teks ke jendela aktif di Desktop.` };
      }
      return { error: rpcRes?.error || "Gagal mengetik ke jendela aktif." };
    }

    if (toolName === "read_os_file") {
      const rpcRes = await sendNativeRpcInBackground("read_file", { path: toolArgs.path });
      if (rpcRes && rpcRes.status === "ok") {
        return { status: "success", content: rpcRes.content, path: rpcRes.path, size: rpcRes.size };
      }
      return { error: rpcRes?.error || "Gagal membaca file." };
    }

    if (toolName === "write_os_file") {
      const rpcRes = await sendNativeRpcInBackground("write_file", { path: toolArgs.path, content: toolArgs.content });
      if (rpcRes && rpcRes.status === "ok") {
        return { status: "success", message: `Berhasil menulis file ${rpcRes.path}` };
      }
      return { error: rpcRes?.error || "Gagal menulis file." };
    }

    if (toolName === "send_file_to_telegram" || toolName === "telegram_send_file") {
      const rpcRes = await sendNativeRpcInBackground("telegram_send_file", {
        bot_token: botToken,
        chat_id: senderId,
        file_path: toolArgs.file_path || "",
        content: toolArgs.content,
        file_name: toolArgs.file_name || "",
        caption: toolArgs.caption || "",
        media_type: toolArgs.media_type || "auto"
      });
      if (rpcRes && rpcRes.status === "ok") {
        return {
          status: "success",
          file_name: rpcRes.file_name,
          message: `Berkas '${rpcRes.file_name}' berhasil dikirim langsung ke chat Telegram pengguna!`
        };
      }
      return { error: rpcRes?.error || "Gagal mengirim berkas ke Telegram." };
    }

    if (toolName === "web_search") {
      const query = (toolArgs.query || "").trim();
      const rpcRes = await sendNativeRpcInBackground("web_search", { query, max_results: 6 });
      if (rpcRes && rpcRes.status === "ok") {
        return {
          status: "success",
          query: query,
          results: rpcRes.results,
          count: rpcRes.count,
          message: `Ditemukan ${rpcRes.count} hasil pencarian untuk "${query}"`
        };
      }
      return { error: rpcRes?.error || "Gagal melakukan pencarian web." };
    }

    if (toolName === "learn_new_skill") {
      const skillName = toolArgs.name || "Autonomous Skill";
      const skillDesc = toolArgs.description || "";
      const workflow = toolArgs.workflow_markdown || "";

      const rpcRes = await sendNativeRpcInBackground("db_save_autonomous_skill", {
        skill: {
          name: skillName,
          description: skillDesc,
          workflow_markdown: workflow,
          source: "autonomous_ai_telegram"
        }
      });

      if (rpcRes && rpcRes.status === "ok") {
        return {
          status: "success",
          skill_id: rpcRes.id,
          name: skillName,
          message: `Skill baru '${skillName}' berhasil dipelajari dan disimpan ke Brain SQLite database!`
        };
      }
      return { error: rpcRes?.error || "Gagal menyimpan skill baru." };
    }

    if (toolName === "generate_image") {
      const prompt = toolArgs.prompt || "";
      const aspect_ratio = toolArgs.aspect_ratio || "auto";
      const model = cfg.imageModel || "ag/gemini-3.1-flash-image";
      const rawEndpoint = cfg.endpoint || cfg.customEndpoint || "";
      const apiKey = cfg.apiKey;

      let imageUrl = null;

      // 1. Attempt user-configured OpenAI-compatible API (/images/generations)
      if (rawEndpoint) {
        try {
          const baseEndpoint = rawEndpoint.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
          const imgEndpoint = `${baseEndpoint}/images/generations`;
          const headers = { "Content-Type": "application/json" };
          if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

          let size = "1024x1024";
          if (aspect_ratio === "16:9") size = "1792x1024";
          else if (aspect_ratio === "9:16") size = "1024x1792";
          else if (aspect_ratio === "4:3") size = "1024x768";
          else if (aspect_ratio === "3:4") size = "768x1024";

          const payload = {
            model: model,
            prompt: prompt,
            n: 1,
            size: size,
            quality: "auto",
            output_format: "png"
          };

          const resp = await fetch(imgEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.data?.[0]?.url) {
              imageUrl = data.data[0].url;
            } else if (data.data?.[0]?.b64_json) {
              imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
            } else if (data.image_url) {
              imageUrl = data.image_url;
            } else if (data.images?.[0]?.url) {
              imageUrl = data.images[0].url;
            } else if (data.url) {
              imageUrl = data.url;
            }
          }
        } catch (err) {
          console.warn("Direct API /images/generations call notice, attempting fallback:", err);
        }
      }

      // 2. High-performance fallback: Pollinations AI (Flux / SDXL)
      if (!imageUrl) {
        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        let width = 1024;
        let height = 1024;
        if (aspect_ratio === "16:9") { width = 1280; height = 720; }
        else if (aspect_ratio === "9:16") { width = 720; height = 1280; }
        else if (aspect_ratio === "4:3") { width = 1024; height = 768; }
        else if (aspect_ratio === "3:4") { width = 768; height = 1024; }

        const pollModel = encodeURIComponent(model.toLowerCase().includes("flux") ? "flux" : (model.toLowerCase().includes("turbo") ? "turbo" : "flux"));
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${pollModel}`;
      }

      // 3. Save generated image locally to disk via Native Host
      const imageId = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const saveRes = await sendNativeRpcInBackground("save_generated_image", {
        image_id: imageId,
        image_data: imageUrl,
        prompt: prompt
      });

      const filePath = saveRes?.file_path || `/tmp/${imageId}.png`;

      // 4. Send photo directly to Telegram chat
      const photoCaption = toolArgs.caption || `🎨 ${prompt}`;
      const tgSendRes = await sendNativeRpcInBackground("telegram_send_file", {
        bot_token: botToken,
        chat_id: senderId,
        file_path: filePath,
        caption: photoCaption,
        media_type: "photo"
      });

      return {
        status: "success",
        image_id: imageId,
        model_used: model,
        file_path: filePath,
        prompt: prompt,
        telegram_sent: tgSendRes?.status === "ok",
        message: `Gambar AI berhasil dibuat menggunakan model '${model}' sesuai konfigurasi Pengaturan Browser Agent dan telah dikirim langsung ke Telegram!`
      };
    }

    // C. Active Browser Tab Verification
    const activeTab = await getOrCreateTelegramAgentTab(null);
    if (!activeTab || !activeTab.id) {
      return { error: "Tidak ada tab web yang aktif untuk dikontrol. Silakan gunakan perintah 'browser_navigate' terlebih dahulu untuk membuka halaman web." };
    }

    if (activeTab.url && (activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("chrome-extension://"))) {
      return { error: "Tab aktif saat ini adalah halaman internal Chrome. Gunakan 'browser_navigate' untuk membuka tab web yang dituju terlebih dahulu." };
    }

    // D. CDP-Powered Interactive Browser Tools
    if (toolName === "browser_snapshot" || toolName === "get_page_content") {
      await attachCdpDebugger(activeTab.id);
      let interactiveNodes = [];
      try {
        const { nodes } = await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Accessibility.getFullAXTree");
        interactiveNodes = (nodes || []).filter(n => {
          if (n.ignored) return false;
          const role = n.role?.value;
          const name = n.name?.value;
          const isInteractive = [
            "button", "link", "textbox", "searchbox", "checkbox", "radio", "combobox", 
            "menuitem", "tab", "heading", "switch", "gridcell", "row", "columnheader"
          ].includes(role);
          return isInteractive || (name && name.trim().length > 0);
        }).map(n => ({
          backendNodeId: n.backendDOMNodeId,
          role: n.role?.value,
          name: n.name?.value,
          value: n.value?.value,
          description: n.description?.value
        }));
      } catch(e) {}

      // Scrape text content and table rows
      const [domRes] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const text = document.body ? (document.body.innerText || '').slice(0, 12000) : '';
          const rows = [];
          document.querySelectorAll('tr, .quota-item, [role="row"], .card, .grid > div, [class*="quota"], [class*="row"]').forEach(el => {
            const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
            if (t && t.length > 4 && t.length < 300 && !rows.includes(t)) rows.push(t);
          });
          return { text, rows: rows.slice(0, 50) };
        }
      }).catch(() => [{}]);

      return {
        status: "success",
        pageTitle: activeTab.title,
        url: activeTab.url,
        interactiveElementsCount: interactiveNodes.length,
        interactiveElements: interactiveNodes.slice(0, 60),
        tableRows: domRes?.result?.rows || [],
        visibleTextPreview: (domRes?.result?.text || '').slice(0, 4000)
      };
    }

    if (toolName === "browser_click" || toolName === "click_element") {
      const backendNodeId = toolArgs.backendNodeId;
      if (backendNodeId) {
        await attachCdpDebugger(activeTab.id);
        try {
          await chrome.debugger.sendCommand({ tabId: activeTab.id }, "DOM.scrollIntoViewIfNeeded", { backendNodeId }).catch(() => {});
          
          let coords = null;
          try {
            const { object } = await chrome.debugger.sendCommand({ tabId: activeTab.id }, "DOM.resolveNode", { backendNodeId });
            if (object && object.objectId) {
              const res = await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Runtime.callFunctionOn", {
                objectId: object.objectId,
                functionDeclaration: `function() {
                  const target = this.closest('button, [role="button"], a, input, select, textarea, [role="radio"], [role="checkbox"], [role="tab"], [role="menuitem"], label') || this;
                  if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                  const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : this.getBoundingClientRect();
                  return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
                }`,
                returnByValue: true
              });
              coords = res?.result?.value;
            }
          } catch(e) {}

          if (coords && coords.x > 0 && coords.y > 0) {
            await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Input.dispatchMouseEvent", { type: "mousePressed", x: coords.x, y: coords.y, button: "left", clickCount: 1 });
            await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Input.dispatchMouseEvent", { type: "mouseReleased", x: coords.x, y: coords.y, button: "left", clickCount: 1 });
            await new Promise(r => setTimeout(r, 600));
            return { status: "success", backendNodeId, clickedAt: coords, message: "Klik elemen presisi berhasil via CDP!" };
          }
        } catch(e) {}
      }

      // Fallback selector-based click
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (sel) => {
          let el = null;
          try { el = document.querySelector(sel); } catch(e) {}
          if (!el) {
            const all = Array.from(document.querySelectorAll('button, a, input, [role="button"], span, div'));
            el = all.find(e => e.innerText && e.innerText.trim().toLowerCase().includes(sel.toLowerCase()));
          }
          if (el) {
            el.click();
            return { success: true, text: (el.innerText || el.value || '').trim() };
          }
          return { success: false, error: `Elemen '${sel}' tidak ditemukan di halaman.` };
        },
        args: [toolArgs.selector || 'button']
      });
      await new Promise(r => setTimeout(r, 800));
      return res?.result || { error: "Gagal mengklik elemen." };
    }

    if (toolName === "browser_type" || toolName === "type_text") {
      const backendNodeId = toolArgs.backendNodeId;
      const textToType = toolArgs.text || "";
      const pressEnter = !!(toolArgs.pressEnter || toolArgs.press_enter);

      if (backendNodeId) {
        await attachCdpDebugger(activeTab.id);
        try {
          await chrome.debugger.sendCommand({ tabId: activeTab.id }, "DOM.focus", { backendNodeId }).catch(() => {});
          const { object } = await chrome.debugger.sendCommand({ tabId: activeTab.id }, "DOM.resolveNode", { backendNodeId });
          if (object && object.objectId) {
            await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Runtime.callFunctionOn", {
              objectId: object.objectId,
              functionDeclaration: `function() {
                const target = this.closest('input, textarea, [contenteditable="true"]') || this;
                if (typeof target.focus === 'function') target.focus();
                if ('value' in target) target.value = '';
                else if (target.isContentEditable) target.innerText = '';
              }`,
              userGesture: true
            });
          }
          await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Input.insertText", { text: textToType });
          if (pressEnter) {
            await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Input.dispatchKeyEvent", { type: "keyDown", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: "Enter", code: "Enter" });
            await chrome.debugger.sendCommand({ tabId: activeTab.id }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
          }
          await new Promise(r => setTimeout(r, 500));
          return { status: "success", backendNodeId, typedText: textToType, pressedEnter: pressEnter };
        } catch(e) {}
      }

      // Fallback selector-based typing
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (sel, val, enter) => {
          let el = null;
          if (sel) {
            try { el = document.querySelector(sel); } catch(e) {}
          }
          if (!el) {
            el = document.querySelector('input[type="password"]') || document.querySelector('input[type="text"], textarea, input:not([type="hidden"])');
          }
          if (el) {
            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            if (enter) {
              el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              if (el.form) el.form.submit();
            }
            return { success: true, value: val };
          }
          return { success: false, error: 'Input form tidak ditemukan di halaman.' };
        },
        args: [toolArgs.selector || '', textToType, pressEnter]
      });
      await new Promise(r => setTimeout(r, 800));
      return res?.result || { error: "Gagal mengisi input teks." };
    }

    if (toolName === "browser_extract_table") {
      const maxRows = Math.min(300, Math.max(5, Number(toolArgs.max_rows) || 100));
      const autoScroll = toolArgs.auto_scroll !== false;

      const [res] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: async (maxR, doScroll) => {
          const rowDataMap = new Map();
          function scrape() {
            document.querySelectorAll('tr, .quota-item, [role="row"], .card, .grid > div, [class*="quota"], [class*="row"]').forEach(r => {
              const t = (r.innerText || '').replace(/\s+/g, ' ').trim();
              if (t && t.length > 4 && !rowDataMap.has(t)) {
                rowDataMap.set(t, t);
              }
            });
          }
          scrape();
          if (doScroll) {
            for (let i = 0; i < 4 && rowDataMap.size < maxR; i++) {
              window.scrollBy(0, 600);
              await new Promise(r => setTimeout(r, 200));
              scrape();
            }
            window.scrollTo(0, 0);
          }
          const all = Array.from(rowDataMap.values()).slice(0, maxR);
          return { total_extracted: all.length, rows: all };
        },
        args: [maxRows, autoScroll]
      });
      return res?.result || { total_extracted: 0, rows: [] };
    }

    if (toolName === "browser_screenshot" || toolName === "take_screenshot") {
      let dataUrl = null;
      if (activeTab && activeTab.windowId) {
        try {
          dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: "png" });
        } catch(e) {}
      }
      if (!dataUrl) {
        const rpcRes = await sendNativeRpcInBackground("capture_os_screenshot", {});
        if (rpcRes && rpcRes.status === "ok" && rpcRes.data_url) dataUrl = rpcRes.data_url;
      }
      if (dataUrl) {
        await telegramSendPhoto(botToken, senderId, dataUrl, toolArgs.caption || `📸 Layar Tab: ${activeTab?.title || 'Browser'}`);
        return { success: true, message: "Screenshot tab berhasil dikirim ke Telegram." };
      }
      return { error: "Gagal mengambil screenshot tab." };
    }

    if (toolName === "browser_control_media") {
      const action = toolArgs.action || "toggle";
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (act) => {
          const videos = Array.from(document.querySelectorAll('video, audio'));
          const ytPlayBtn = document.querySelector('.ytp-play-button') || document.querySelector('button.ytp-play-button');
          if (act === 'toggle' || act === 'play' || act === 'pause') {
            if (ytPlayBtn) ytPlayBtn.click();
            else videos.forEach(v => v.paused ? v.play() : v.pause());
          }
          return { action: act, playing: videos.some(v => !v.paused) };
        },
        args: [action]
      });
      return res?.result || { success: true, action };
    }

    if (toolName === "ask_clarification") {
      const question = toolArgs.question || "Mohon pilih salah satu opsi:";
      const options = Array.isArray(toolArgs.options) ? toolArgs.options.slice(0, 3) : [];
      const inline_keyboard = [];
      options.forEach((opt, idx) => {
        inline_keyboard.push([{ text: `👉 ${opt}`, callback_data: `clarify_opt:${idx}` }]);
      });
      inline_keyboard.push([{ text: "✏️ Ketik Jawaban Kustom", callback_data: "clarify_custom" }]);
      await telegramSendMessage(botToken, senderId, `❓ <b>${escapeHtml(question)}</b>`, { inline_keyboard });
      await chrome.storage.local.set({ telegram_active_clarification: { question, options, timestamp: Date.now() } });
      return { success: true, message: "Clarification buttons sent to Telegram" };
    }

    if (toolName === "ponytail_token_meter") {
      const pluginData = await chrome.storage.local.get(['plugin_settings']);
      const p = pluginData.plugin_settings?.ponytail || { enabled: true, maxRecentTurns: 6 };
      return {
        status: "ok",
        plugin_name: "Ponytail Context Trimmer & Token Saver",
        is_active: p.enabled !== false,
        max_recent_turns: p.maxRecentTurns || 6,
        max_tool_output_chars: p.maxToolOutputChars || 1200,
        estimated_token_savings_percent: "50% - 75%",
        summary: "Plugin Ponytail aktif mengompresi konteks riwayat, memotong pohon DOM berlebih, dan menghemat biaya token AI."
      };
    }
  } catch (err) {
    return { error: err.message };
  }
  return { error: `Tool ${toolName} not supported` };
}

function parseChatCompletionResponse(rawText) {
  rawText = (rawText || "").trim();
  if (rawText.startsWith("{")) {
    try {
      return JSON.parse(rawText);
    } catch (e) {}
  }
  if (rawText.includes("data:")) {
    const lines = rawText.split("\n");
    let accumulatedContent = "";
    const accumulatedToolCallsMap = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:") || trimmed === "data: [DONE]") continue;
      const dataStr = trimmed.replace(/^data:\s*/, "").trim();
      if (!dataStr) continue;

      try {
        const chunkJson = JSON.parse(dataStr);
        const choice = chunkJson.choices?.[0];
        if (!choice) continue;

        const deltaContent = choice.delta?.content || choice.message?.content || "";
        if (deltaContent) accumulatedContent += deltaContent;

        const deltaToolCalls = choice.delta?.tool_calls || choice.message?.tool_calls;
        if (Array.isArray(deltaToolCalls)) {
          for (const tc of deltaToolCalls) {
            const idx = tc.index ?? 0;
            if (!accumulatedToolCallsMap[idx]) {
              accumulatedToolCallsMap[idx] = {
                id: tc.id || `call_${Date.now()}_${idx}`,
                type: tc.type || "function",
                function: {
                  name: tc.function?.name || "",
                  arguments: tc.function?.arguments || ""
                }
              };
            } else {
              if (tc.id && !accumulatedToolCallsMap[idx].id) accumulatedToolCallsMap[idx].id = tc.id;
              if (tc.function?.name) accumulatedToolCallsMap[idx].function.name += tc.function.name;
              if (tc.function?.arguments) accumulatedToolCallsMap[idx].function.arguments += tc.function.arguments;
            }
          }
        }
      } catch (e) {}
    }

    const toolCallsList = Object.values(accumulatedToolCallsMap);
    const messageObj = {};
    if (accumulatedContent) messageObj.content = accumulatedContent;
    if (toolCallsList.length > 0) messageObj.tool_calls = toolCallsList;

    if (accumulatedContent || toolCallsList.length > 0) {
      return { choices: [{ message: messageObj }] };
    }
  }
  return null;
}

function getThinkingDirective(level) {
  switch (level) {
    case "low":
      return `\n\n=== [AI THINKING LEVEL: LOW (Instan & Cepat — 0x Koreksi Diri)] ===
- DILARANG membuat rantai penalaran panjang atau draf bertahap.
- Langsung lakukan pattern-matching dan hasilkan jawaban linier tercepat, ringkas, akurat, dan to-the-point tanpa self-correction.`;
    case "medium":
      return `\n\n=== [AI THINKING LEVEL: MEDIUM (Standar — 1x Sanity Check)] ===
- Buat draf penalaran singkat dan lakukan 1 kali verifikasi validitas logika sebelum menyimpulkan jawaban.
- Perbaiki kesalahan logika sederhana jika ditemukan.`;
    case "high":
      return `\n\n=== [AI THINKING LEVEL: HIGH (Mendalam — Multi-Branch Tree-of-Thought)] ===
- Eksplorasi 2-3 jalur penalaran paralel di dalam pikiran Anda.
- Dekomposisi tugas ke langkah-langkah kerja terstruktur (Step 1, Step 2, dst.).
- Uji kasus ekstrem (edge cases) dan verifikasi konvergensi hasil sebelum menyajikan jawaban terbaik.`;
    case "xhigh":
      return `\n\n=== [AI THINKING LEVEL: XHIGH (Kritik Diri Ketat — Adversarial Red-Teaming & Step Planning)] ===
- 🧠 RENCANAKAN RANGKAIAN LANGKAH EKSEKUSI DETAIL: Petakan rencana kerja bertahap dan jalankan secara komprehensif.
- 🛡️ Bertindaklah sebagai pengkritik paling tajam terhadap draf Anda sendiri (Devil's Advocate).
- Cari minimal 3 potensi celah, bug, asumsi keliru, atau kontradiksi logis pada draf Anda, perbaiki seluruh kelemahan tersebut, lalu sajikan solusi yang kokoh tanpa celah.`;
    case "extreme":
    case "max":
      return `\n\n=== [AI THINKING LEVEL: EXTREME 10x (MAXIMUM COGNITIVE CAPACITY & HYPER-DETAILED REASONING)] ===
- 🧠 KERAHKAN KAPASITAS PENALARAN MAKSIMAL (10x LIPAT BERPIKIR SANGAT KERAS, TAJAM, & DETAIL).
- 📋 DEKOMPOSISI RENCANA MULTI-LANGKAH MENYELURUH (MULTI-STAGE ACTION PLAN):
  Sebelum mengeksekusi tindakan atau menyimpulkan jawaban, susun pemetaan rencana kerja granular (Step 1, Step 2, Step 3, dst.) yang komprehensif. Jika tugas rumit atau melibatkan banyak data, pecah menjadi sebanyak mungkin sub-langkah yang diperlukan tanpa memotong proses.
- 🔬 FIRST PRINCIPLES & MULTI-HYPOTHESIS TREE-OF-THOUGHT:
  Dekonstruksi setiap masalah dari hukum/prinsip paling dasar. Evaluasi minimal 3 hipotesis atau arsitektur solusi yang berbeda, bedah implikasi dan resiko setiap cabang, lalu pilih lintasan eksekusi yang paling sempurna.
- 🛡️ ADVERSARIAL STRESS-TESTING & DEVIL'S ADVOCATE AUDIT:
  Uji secara agresif setiap baris argumen, kode, atau query Anda. Cari potensi kegagalan sistem terburuk (worst-case failure modes), edge cases, race conditions, false assumptions, dan bias data. Lakukan backtracking dan perbaikan total seketika.
- 📊 KEDALAMAN HASIL AKHIR SUPER MIKROSKOPIS (ULTRA-DEEP COMPREHENSIVE OUTPUT):
  DILARANG membuat ringkasan dangkal atau melewatkan detail krusial. Sajikan analisis, kode, dan solusi dengan kedalaman mikroskopis mutlak, terstruktur, berbasis bukti empiris, dan siap dieksekusi 100%.`;
    default:
      return `\n\n=== [AI THINKING LEVEL: HIGH (Mendalam — Multi-Branch Tree-of-Thought)] ===
- Eksplorasi alternatif solusi, uji edge cases, dan berikan penalaran terstruktur.`;
  }
}

function getToolStepDescription(toolName, args) {
  if (toolName === "web_search") return `Mencari solusi di web untuk <code>${escapeHtml((args.query || '').slice(0, 45))}</code>...`;
  if (toolName === "learn_new_skill") return `Menyimpan & mengingat skill baru <code>${escapeHtml(args.name || '')}</code> ke Brain...`;
  if (toolName === "generate_image") return `Membuat gambar AI <code>${escapeHtml((args.prompt || '').slice(0, 45))}</code> via model Pengaturan...`;
  if (toolName === "send_file_to_telegram" || toolName === "telegram_send_file") return `Mengunggah & mengirim berkas <code>${escapeHtml(args.file_name || args.file_path || 'dokumen')}</code> ke Telegram...`;
  if (toolName === "browser_navigate" || toolName === "navigate_to") return `Membuka halaman web <code>${escapeHtml(args.url || '')}</code>...`;
  if (toolName === "browser_snapshot" || toolName === "get_page_content") return `Mengambil snapshot DOM & Accessibility Tree...`;
  if (toolName === "browser_click" || toolName === "click_element") return `Mengklik elemen ${args.backendNodeId ? `(ID: ${args.backendNodeId})` : `<i>"${escapeHtml(args.selector || '')}"</i>`} via CDP...`;
  if (toolName === "browser_type" || toolName === "type_text") return `Mengisi teks ke form / input via CDP...`;
  if (toolName === "browser_extract_table") return `Mengekstrak baris data tabel & quota grid...`;
  if (toolName === "browser_screenshot" || toolName === "take_screenshot") return `Mengambil screenshot walkthrough...`;
  if (toolName === "browser_list_tabs") return `Memeriksa daftar tab yang terbuka...`;
  if (toolName === "browser_switch_tab" || toolName === "switch_tab") return `Beralih ke tab target...`;
  if (toolName === "browser_wait") return `Menunggu rendering web (${args.duration_seconds || 2}s)...`;
  if (toolName === "open_linux_app") return `Membuka aplikasi Linux <code>${escapeHtml(args.app_name || args.command || '')}</code>...`;
  if (toolName === "run_bash_command") return `Menjalankan terminal <code>${escapeHtml((args.command || '').slice(0, 45))}</code>...`;
  if (toolName === "type_os_text") return `Mengetik teks ke jendela/terminal aktif...`;
  if (toolName === "read_os_file") return `Membaca file OS <code>${escapeHtml(args.path || '')}</code>...`;
  if (toolName === "write_os_file") return `Menulis file OS <code>${escapeHtml(args.path || '')}</code>...`;
  if (toolName === "ask_clarification") return `Menyiapkan opsi konfirmasi...`;
  if (toolName === "ponytail_token_meter") return `Memeriksa efisiensi token & pemadatan konteks Ponytail...`;
  return `Menjalankan aksi ${escapeHtml(toolName)}...`;
}

// Ponytail Context Trimmer & Token Optimizer Core Engine
function applyPonytailContextOptimization(turns, pluginSettings = {}) {
  const ponytail = pluginSettings?.ponytail || {
    enabled: true,
    maxRecentTurns: 6,
    maxToolOutputChars: 1200,
    stripRedundantDOM: true,
    stripBase64: true,
    preserveSystemFacts: true
  };

  if (ponytail.enabled === false) return turns;

  const maxTurns = ponytail.maxRecentTurns || 6;
  const maxChars = ponytail.maxToolOutputChars || 1200;
  const stripDOM = ponytail.stripRedundantDOM !== false;
  const stripB64 = ponytail.stripBase64 !== false;

  const optimized = [];
  const systemMsg = turns.find(t => t.role === 'system');
  if (systemMsg) optimized.push(systemMsg);

  const nonSystem = turns.filter(t => t.role !== 'system');
  const recentThreshold = Math.max(0, nonSystem.length - maxTurns);

  nonSystem.forEach((turn, idx) => {
    const isOldTurn = idx < recentThreshold;
    let content = turn.content;

    if (typeof content === 'string') {
      // 1. Strip heavy raw base64 data URLs from older turns
      if (stripB64 && isOldTurn && content.includes('data:image/')) {
        content = content.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{100,}/g, '[Gambar/Attachment: base64 diringkas oleh Ponytail Token Saver]');
      }

      // 2. Prune repeated DOM dumps if older turn
      if (stripDOM && isOldTurn && content.length > maxChars) {
        if (content.includes('backendNodeId') || content.includes('accessibilityTree') || content.includes('interactiveElements')) {
          content = content.slice(0, maxChars) + `\n... [Older DOM tree trimmed (${content.length - maxChars} chars saved by Ponytail)]`;
        } else {
          content = content.slice(0, maxChars) + `\n... [Older output trimmed by Ponytail]`;
        }
      }
    } else if (Array.isArray(content)) {
      if (stripB64 && isOldTurn) {
        content = content.map(item => {
          if (item.type === 'image_url' && item.image_url?.url?.startsWith('data:')) {
            return { type: 'text', text: '[Past Image attachment omitted by Ponytail]' };
          }
          return item;
        });
      }
    }

    const newTurn = { ...turn, content };
    if (isOldTurn && Array.isArray(newTurn.tool_calls)) {
      newTurn.tool_calls = newTurn.tool_calls.map(tc => {
        let args = tc.function?.arguments || '';
        if (typeof args === 'string' && args.length > 500) {
          args = args.slice(0, 500) + '... [args trimmed]';
        }
        return {
          ...tc,
          function: {
            ...tc.function,
            arguments: args
          }
        };
      });
    }

    optimized.push(newTurn);
  });

  return optimized;
}

// Standalone Direct Autonomous AI Agent Execution in Background Service Worker
async function executePromptInBackgroundServiceWorker(text, senderId, senderName, botToken, tgCfg, mediaPayload = null) {
  try {
    // 1. Send instant typing indicator so Telegram shows 'typing...' immediately (< 30ms)
    telegramSendChatAction(botToken, senderId, "typing").catch(() => {});

    const storageData = await chrome.storage.local.get([
      'browser_agent_config',
      'telegram_bot_config',
      'custom_agents',
      'custom_skills',
      'custom_memories',
      'cached_persistent_brain',
      'chat_sessions_cache',
      'plugin_settings'
    ]);
    const cfg = storageData.browser_agent_config || {};
    const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
    const apiKey = cfg.apiKey;
    const rawEndpoint = cfg.endpoint || cfg.customEndpoint || "";

    // Resolve Model matching Browser Agent exact priority list
    let model = activeTgCfg.selected_model;
    if (!model || model === "auto") {
      if (cfg.selectedModelChoice && cfg.selectedModelChoice !== "auto") {
        model = cfg.selectedModelChoice;
      } else if (Array.isArray(cfg.models) && cfg.models.length > 0) {
        model = cfg.models[0].id || cfg.models[0].name || cfg.models[0];
      } else if (cfg.model && cfg.model !== "auto") {
        model = cfg.model;
      } else {
        model = "gemini-2.5-flash";
      }
    }

    if (!apiKey && cfg.preset !== "ollama" && cfg.preset !== "9router") {
      await telegramSendMessage(botToken, senderId, `⚠️ <b>API Key Belum Dikonfigurasi:</b> Silakan buka menu Pengaturan Browser Agent di Chrome untuk memasukkan API Key Anda.`);
      return;
    }

    // Get Active Tab Context for Browser Agent
    let activeTabInfo = "No active tab";
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const t = tabs && tabs[0] ? tabs[0] : (await chrome.tabs.query({ active: true }))[0];
      if (t) activeTabInfo = `Title: "${t.title || 'Untitled'}" | URL: ${t.url || 'about:blank'}`;
    } catch(e) {}

    // 1.5. Fetch Live Persistent Brain Data from Native Host SQLite (User Memories, Facts, Epistemic Triplets, Skills)
    let brainData = {};
    try {
      const rpcBrain = await sendNativeRpcInBackground("db_get_persistent_memory", { search: "" });
      if (rpcBrain && rpcBrain.status === "ok") {
        brainData = rpcBrain;
        chrome.storage.local.set({ cached_persistent_brain_data: rpcBrain }).catch(() => {});
      }
    } catch (be) {}

    if (!brainData.user_memories) {
      const cached = await chrome.storage.local.get(['cached_persistent_brain_data']);
      brainData = cached.cached_persistent_brain_data || {};
    }

    const userMemories = Array.isArray(brainData.user_memories) ? brainData.user_memories : [];
    const epistemicTriplets = Array.isArray(brainData.epistemic_triplets) ? brainData.epistemic_triplets : [];
    const autoSkills = Array.isArray(brainData.autonomous_skills) ? brainData.autonomous_skills : [];
    const antiPatterns = Array.isArray(brainData.anti_patterns) ? brainData.anti_patterns : [];
    const customMemories = Array.isArray(storageData.custom_memories) ? storageData.custom_memories : [];
    const customSkills = Array.isArray(storageData.custom_skills) ? storageData.custom_skills : [];

    // Build rich dynamic system prompt with Master Browser Control Agent Instructions
    let systemInstruction = `You are Browser Agent (Master Autonomous Browser Control Agent & Supreme System Controller) operating Google Chrome, Host OS, and Telegram Bot remote engine.

YOU HAVE FULL ACCESS TO OFFICIAL BROWSER AGENT CDP & OS TOOLS:
1. 🌐 Browser Navigation & Tab Control:
- 'browser_navigate': Open target URL (e.g. 'http://localhost:20128/dashboard/quota', 'https://youtube.com', 'https://adsmanager.facebook.com').
- 'browser_list_tabs': List all currently open tabs.
- 'browser_switch_tab': Switch focus to target tab by title/URL keyword.
- 'browser_wait': Wait for dynamic web apps/SPAs to settle.

2. 🎯 Zero-Hallucination CDP Inspection & Interaction:
- 'browser_snapshot': Capture real-time Accessibility Tree with backendNodeIds of all buttons, inputs, links, and DOM elements.
- 'browser_click': Click buttons/elements with 100% precision via CDP using 'backendNodeId'.
- 'browser_type': Type text or passwords with exact input focus using 'backendNodeId'.
- 'browser_extract_table': Auto-scroll and extract structured rows/metrics from tables.
- 'browser_screenshot': Take a visual screenshot of the tab.

3. 💻 Linux OS Desktop, Terminal, File Processing, Search & AI Tools:
- 'web_search': Search the web in real-time to find live tutorials, documentation, CLI syntax, Python libraries, or solutions whenever you encounter an unknown or challenging problem.
- 'learn_new_skill': Save any newly discovered workflow, CLI recipe, or solution into the Browser Agent Brain SQLite database so you permanently remember it for all future tasks.
- 'send_file_to_telegram': Send ANY local file (PDF, ZIP archive, document, text file, script, audio MP3/WAV, video MP4, or photo) directly to the user's Telegram chat.
- 'run_bash_command': Execute bash shell command on Linux OS (e.g. PDF manipulation via 'pdftoppm' / 'pdfunite' / 'convert' / Python, download audio via 'yt-dlp', convert video via 'ffmpeg', curl, git, zip, dll).
- 'generate_image': Generate gambar/ilustrasi AI berkualitas tinggi menggunakan model AI Image Generation yang dikonfigurasi di Pengaturan (${cfg.imageModel || 'ag/gemini-3.1-flash-image'}). Foto otomatis tersimpan dan dikirim langsung ke chat Telegram pengguna!
- 'open_linux_app': Launch desktop GUI apps (e.g. 'dolphin', 'konsole', 'code').
- 'type_os_text': Type text into active OS window.
- 'read_os_file' & 'write_os_file': Membaca dan menulis file lokal.

Current Browser State:
• Active Tab: ${activeTabInfo}

MANDAT EKSEKUTIF UTAMA (UNRESTRICTED POWER & FILE DELIVERY):
1. 📄 MANIPULASI FILE, PDF, GAMBAR, AUDIO & ZIP:
   - Jika pengguna meminta membuat/mengedit/menggabungkan/mengonversi file (contoh: "edit jadi pdf", "merge pdf", "convert pdf to image", "buatkan pdf dari gambar", "convert gambar ke pdf", "ekstrak zip", "download lagu mp3"):
     a. JALANKAN perintah bash / python di Linux via 'run_bash_command' secara nyata untuk menghasilkan file output di /tmp/.
     b. UNTUK PDF TO IMAGE: Selalu gunakan 'pdftoppm -png -r 150 <file.pdf> /tmp/page' lalu bungkus seluruh gambar ke dalam file ZIP ('zip -j /tmp/hasil_gambar.zip /tmp/page-*.png') agar tidak nyepam di chat Telegram, kemudian kirim file ZIP tersebut via 'send_file_to_telegram'!
     c. UNTUK IMAGE TO PDF / MERGE PDF: Gunakan 'convert /path/*.png /tmp/output.pdf' (atau script Python PIL 'from PIL import Image; ...' / 'pdfunite in1.pdf in2.pdf /tmp/merged.pdf'), lalu kirim file PDF via 'send_file_to_telegram'!
     d. WAJIB SELALU KIRIM FILE HASIL AKHIR: DILARANG KERAS hanya membalas pesan teks tanpa memanggil 'send_file_to_telegram' ketika diminta memproses berkas!
2. 🔍 TIDAK TAHU? CARI TAHU DENGAN 'web_search' LALU SIMPAN SKILL:
   - Jika Anda belum mengetahui sintaks CLI atau metode untuk suatu permintaan pengguna, gunakan tool 'web_search' untuk mencari tahu di internet.
   - Setelah menemukan solusi dan berhasil mengeksekusinya, panggil tool 'learn_new_skill' untuk menyimpan resep workflow tersebut ke database Brain Browser Agent agar Anda mengingatnya selamanya.
3. 🌐 TUGAS WEB & DASHBOARD (Contoh: "cek sisa kredit 9router", "cek usage 9router", "buka youtube", "analisis iklan meta", "isi form web"):
   - WAJIB gunakan browser control tools: Buka halaman via 'browser_navigate' (atau 'browser_switch_tab'), ambil data via 'browser_extract_table' atau 'browser_snapshot', klik dengan 'browser_click', dan ketik dengan 'browser_type'.
   - DILARANG menggunakan perintah curl/bash jika tugas tersebut adalah tugas web atau dashboard browser!
4. 🎨 GENERASI GAMBAR AI (AI IMAGE GENERATION):
   - Jika pengguna meminta untuk membuat, melukis, menggambar, atau men-generate gambar (contoh: "generate image kucing makan eskrim", "buatkan gambar pemandangan cyberpunk", "draw a cute kitten"): WAJIB langsung panggil tool 'generate_image' dengan prompt yang kaya, detail, dan artistik.
5. 🖼️ ANALISIS GAMBAR & DOKUMEN:
   - Jika pengguna mengirim foto/screenshot/gambar, amati dan baca seluruh elemen visual, teks, diagram, atau error dengan teliti.
   - Jika pengguna mengirim dokumen (PDF, Word, TXT, CSV, JSON), baca dan analisis seluruh isi dokumen yang terlampir secara mendalam, tepat, dan komprehensif.
6. 📝 SETELAH MENJALANKAN TOOL: WAJIB MEMBUAT LAPORAN TERTULIS YANG LENGKAP, JELAS, DAN TERSTRUKTUR DALAM FORMAT MARKDOWN KEPADA PENGGUNA. Rincikan semua temuan atau data yang terekstrak secara komprehensif!
7. 💬 ATURAN FORMAT PESAN TELEGRAM (BERSIH & ESTETIK):
   - DILARANG menggunakan Markdown Pipe Tables (| Kolom 1 | Kolom 2 |) karena Telegram tidak mendukung rendering tabel secara visual dan akan terlihat berantakan!
   - Gunakan format list bullet point dengan ikon emoji yang rapi (contoh: • <b>Parameter:</b> Nilai).
   - Jangan gunakan garis pemisah '---' berlebihan.
   - Sajikan laporan yang bersih, terstruktur, estetik, dan rapi agar nyaman dibaca di Telegram.`;

    // Inject Verified Facts & User Profile Memories
    if (userMemories.length > 0) {
      systemInstruction += "\n\n=== 📌 FAKTA PERSONAL, PROFIL & ATURAN PENGGUNA TERVERIFIKASI (PERSISTENT MEMORY) ===\n";
      userMemories.forEach((m, idx) => {
        const cat = (m.category || 'FACT').toUpperCase();
        systemInstruction += `${idx + 1}. [${cat}] ${m.content}\n`;
      });
    }

    // Inject Epistemic Knowledge Triplets (Subject -> Predicate -> Object)
    if (epistemicTriplets.length > 0) {
      systemInstruction += "\n\n=== 🕸️ KNOWLEDGE GRAPH TRIPLETS (RELASI PENGETAHUAN KOGNITIF) ===\n";
      epistemicTriplets.slice(0, 30).forEach(t => {
        if (!t.negative_constraint) {
          systemInstruction += `• (${t.subject}) --[${t.predicate}]--> (${t.object})\n`;
        }
      });
    }

    // Inject Custom Memories / User Preferences
    if (customMemories.length > 0) {
      systemInstruction += "\n\n=== 🧠 PREFERENSI & ATURAN PENGGUNA ===\n";
      customMemories.forEach(cm => {
        systemInstruction += `### ${cm.name}:\n${cm.content}\n\n`;
      });
    }

    // Inject Anti-Patterns (Failure Prevention)
    if (antiPatterns.length > 0) {
      systemInstruction += "\n\n=== 🛡️ ANTI-PATTERN VAULT (Pencegahan Kesalahan) ===\n";
      antiPatterns.slice(0, 8).forEach((ap, idx) => {
        systemInstruction += `• [Pencegahan] Konteks: ${ap.target_domain} | Solusi: ${ap.winning_fix} | Aturan: ${ap.prevention_rule}\n`;
      });
    }

    // Inject Available Skills (Custom + Autonomous)
    const allSkills = [...customSkills, ...autoSkills];
    if (allSkills.length > 0) {
      systemInstruction += "\n\n=== ⚡ KATALOG KEMAMPUAN KHUSUS & SKILLS ===\n";
      allSkills.slice(0, 12).forEach(sk => {
        systemInstruction += `• Skill: ${sk.name} - ${sk.description || ''}\n`;
      });
    }

    // Inject Dynamic AI Cognitive / Thinking Level Directive (Low, Medium, High, Xhigh, Extreme)
    const activeThinkingLevel = activeTgCfg.thinking_level || storageData.thinking_level || cfg.thinking_level || "high";
    systemInstruction += getThinkingDirective(activeThinkingLevel);

    // 2. Retrieve dedicated Telegram session history
    const cache = storageData.chat_sessions_cache || {};
    const sessId = `sess_tg_${senderId}`;
    let tgSession = cache[sessId];
    if (!tgSession) {
      tgSession = {
        id: sessId,
        title: `📱 Telegram: ${senderName}`,
        model: model,
        is_telegram: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        messages: []
      };
    }

    // Build context history (last 10 messages)
    const history = Array.isArray(tgSession.messages) ? tgSession.messages.slice(-10) : [];
    
    let endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    if (rawEndpoint && rawEndpoint.trim()) {
      let clean = rawEndpoint.trim().replace(/\/+$/, "");
      endpoint = clean.endsWith("/chat/completions") ? clean : (clean + "/chat/completions");
    } else if (cfg.preset === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
    } else if (cfg.preset === "openrouter") {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
    } else if (cfg.preset === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
    }

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const conversationTurns = [
      { role: "system", content: systemInstruction }
    ];
    for (const m of history) {
      if (m.role === 'user' || m.role === 'assistant') {
        conversationTurns.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || ''
        });
      }
    }

    // Support multimodal vision user turn if image payload attached
    if (mediaPayload && mediaPayload.type === 'image' && mediaPayload.dataUrl) {
      conversationTurns.push({
        role: "user",
        content: [
          { type: "text", text: text },
          {
            type: "image_url",
            image_url: {
              url: mediaPayload.dataUrl
            }
          }
        ]
      });
    } else {
      conversationTurns.push({ role: "user", content: text });
    }

    let finalResponseText = "";
    let stepCount = 0;
    const maxSteps = 8;
    let liveStatusMsgId = null;
    let anyToolExecuted = false;
    const executedToolCalls = [];

    const STEP_EMOJIS = ["⚡", "⚙️", "🔍", "📂", "✨", "🎯", "🚀", "💡"];
    let currentEmoji = "⚡";
    let currentBaseText = "Menganalisis instruksi & merancang eksekusi";
    let lastRenderedText = "";
    let lastEditTime = 0;
    let isAgentRunning = true;

    // Helper to render and edit live status safely (throttled to at most once per 3s to prevent 429 Flood Control)
    async function renderLiveStatus(force = false) {
      if (!liveStatusMsgId || !isAgentRunning) return;
      const now = Date.now();
      if (!force && (now - lastEditTime < 3000)) return;
      const cleanBase = currentBaseText.replace(/\.+$/, '').trim();
      const textToRender = `${currentEmoji} <b>Master Agent:</b> ${cleanBase}...`;
      
      if (textToRender !== lastRenderedText || force) {
        lastRenderedText = textToRender;
        lastEditTime = now;
        await telegramEditMessageText(botToken, senderId, liveStatusMsgId, textToRender).catch(() => {});
      }
    }

    // Send initial status message
    const initialStatus = await telegramSendMessage(botToken, senderId, `⚡ <b>Master Agent:</b> Menganalisis instruksi & merancang eksekusi...`);
    if (initialStatus && initialStatus.result && initialStatus.result.message_id) {
      liveStatusMsgId = initialStatus.result.message_id;
      lastRenderedText = `⚡ <b>Master Agent:</b> Menganalisis instruksi & merancang eksekusi...`;
      lastEditTime = Date.now();
    }

    // Native Telegram typing action pulse (every 4.5 seconds) -> Zero rate limit, displays native animated typing header!
    const typingTicker = setInterval(() => {
      if (!isAgentRunning) {
        clearInterval(typingTicker);
        return;
      }
      telegramSendChatAction(botToken, senderId, "typing").catch(() => {});
    }, 4500);

    // Multi-turn Autonomous Agent Loop
    while (stepCount < maxSteps) {
      stepCount++;
      telegramSendChatAction(botToken, senderId, "typing").catch(() => {});

      const optimizedTurns = applyPonytailContextOptimization(conversationTurns, storageData.plugin_settings);

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model,
          messages: optimizedTurns,
          tools: BACKGROUND_AGENT_TOOLS,
          tool_choice: "auto",
          stream: false,
          temperature: cfg.temperature ?? 0.2,
          max_tokens: cfg.maxTokens || 4096
        })
      });

      const rawText = await res.text();
      let responseObj = parseChatCompletionResponse(rawText);

      if (!responseObj) {
        finalResponseText = "⚠️ Gagal membaca respons dari model AI.";
        break;
      }

      if (responseObj.error) {
        finalResponseText = `⚠️ Error API: ${responseObj.error.message || JSON.stringify(responseObj.error)}`;
        break;
      }

      const choice = responseObj.choices?.[0];
      const message = choice?.message;

      if (!message) {
        finalResponseText = "⚠️ Tidak ada pesan yang dihasilkan oleh model AI.";
        break;
      }

      // Check if LLM requested tool execution
      if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        anyToolExecuted = true;
        conversationTurns.push(message);

        for (const tc of message.tool_calls) {
          const tName = tc.function?.name || "tool";
          let tArgs = {};
          try {
            tArgs = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {});
          } catch(e) {}

          executedToolCalls.push({
            id: tc.id || `call_${Date.now()}_${executedToolCalls.length}`,
            type: "function",
            function: {
              name: tName,
              arguments: typeof tc.function?.arguments === 'string' ? tc.function.arguments : JSON.stringify(tArgs)
            }
          });

          const stepDesc = getToolStepDescription(tName, tArgs);
          currentEmoji = STEP_EMOJIS[stepCount % STEP_EMOJIS.length];
          currentBaseText = stepDesc.replace(/\.+$/, '').trim();

          // Immediate render on new step
          await renderLiveStatus(true);

          const toolResult = await executeBackgroundTool(tName, tArgs, senderId, botToken, cfg);

          conversationTurns.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tName,
            content: JSON.stringify(toolResult)
          });
        }
      } else {
        // Final text answer reached
        finalResponseText = message.content || "";
        break;
      }
    }

    // If tools were executed but final text is empty, run one synthesis turn to generate the final report
    if (!finalResponseText && anyToolExecuted) {
      currentBaseText = "Menyusun laporan akhir eksekusi";
      currentEmoji = "✨";
      await renderLiveStatus(true);
      telegramSendChatAction(botToken, senderId, "typing").catch(() => {});
      try {
        const synthTurns = applyPonytailContextOptimization([
          ...conversationTurns,
          { role: "user", content: "Sintesiskan semua temuan dan hasil eksekusi tool di atas, lalu berikan laporan akhir yang lengkap, jelas, dan terstruktur dalam format Markdown kepada pengguna sekarang." }
        ], storageData.plugin_settings);

        const synthRes = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model,
            messages: synthTurns,
            stream: false,
            temperature: 0.2,
            max_tokens: 4096
          })
        });
        const synthText = await synthRes.text();
        const synthObj = parseChatCompletionResponse(synthText);
        finalResponseText = synthObj?.choices?.[0]?.message?.content || "";
      } catch (se) {}
    }

    // Stop typing ticker
    isAgentRunning = false;
    clearInterval(typingTicker);

    if (!finalResponseText) {
      finalResponseText = "✅ Tugas agent telah selesai dijalankan di browser.";
    }

    // Update status to finished smoothly
    if (liveStatusMsgId) {
      await telegramEditMessageText(botToken, senderId, liveStatusMsgId, `✅ <b>Master Agent:</b> Instruksi berhasil dieksekusi!`).catch(() => {});
    }

    // 3. Update dedicated Telegram session in cache & SQLite
    tgSession.updated_at = Date.now();
    tgSession.model = model;

    const userMsgObj = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    if (mediaPayload && mediaPayload.type === 'image' && mediaPayload.dataUrl) {
      userMsgObj.attachments = [{
        type: 'image',
        name: 'Telegram Photo',
        dataUrl: mediaPayload.dataUrl
      }];
    } else if (mediaPayload && mediaPayload.type === 'document') {
      userMsgObj.attachments = [{
        type: 'file',
        name: mediaPayload.fileName || 'Telegram Document',
        mime: 'application/octet-stream'
      }];
    }
    tgSession.messages.push(userMsgObj);

    const assistantMsgObj = {
      role: 'assistant',
      content: finalResponseText,
      timestamp: Date.now(),
      agentInfo: {
        id: "master_agent",
        name: "Master Agent",
        isBoss: true
      }
    };
    if (executedToolCalls.length > 0) {
      assistantMsgObj.tool_calls = executedToolCalls;
    }
    tgSession.messages.push(assistantMsgObj);

    cache[sessId] = tgSession;
    await chrome.storage.local.set({ chat_sessions_cache: cache });

    // Sync to SQLite in native host
    sendNativeRpcInBackground("db_save_session", { session: tgSession }).catch(() => {});

    // Notify UI if history sidebar is open
    chrome.runtime.sendMessage({ type: "TELEGRAM_HISTORY_UPDATED" }).catch(() => {});

    // 4. Send final response to Telegram
    await telegramSendMessage(botToken, senderId, finalResponseText);
  } catch (err) {
    isAgentRunning = false;
    if (typeof typingTicker !== 'undefined') clearInterval(typingTicker);
    await telegramSendMessage(botToken, senderId, `⚠️ Gagal memproses instruksi: ${err.message}`);
  }
}

// Telegram API Command Registrar
async function telegramSetMyCommands(botToken) {
  if (!botToken) return false;
  const commands = [
    { command: "start", description: "Buka menu utama & instruksi Browser Agent" },
    { command: "thinking", description: "Atur mode berpikir AI (Low, Med, High, Xhigh, Extreme)" },
    { command: "model", description: "Pilih model AI aktif atau aktifkan auto-routing" },
    { command: "agent", description: "Pilih persona spesialis agent atau delegasi otomatis" },
    { command: "history", description: "Daftar riwayat sesi percakapan & pindah sesi" },
    { command: "screenshot", description: "Ambil screenshot tab Chrome aktif di PC" },
    { command: "screenshot_os", description: "Ambil screenshot Full Desktop OS Linux" },
    { command: "status", description: "Cek tab aktif, model, memory, dan performa" },
    { command: "new", description: "Mulai sesi baru dan bersihkan tampilan chat" }
  ];
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
    const json = await res.json();
    return json && json.ok;
  } catch (err) {
    return false;
  }
}

// Background Poller Execution
async function checkAndRestartTelegramPoller(force = false) {
  if (force && telegramAbortController) {
    try { telegramAbortController.abort(); } catch(e) {}
    telegramAbortController = null;
    telegramPollingActive = false;
  }

  if (telegramPollingActive) return;

  const storageData = await chrome.storage.local.get(['telegram_bot_config', 'telegram_last_update_id']);
  const tgCfg = storageData.telegram_bot_config;

  if (!tgCfg || !tgCfg.enabled || !tgCfg.bot_token) {
    telegramPollingActive = false;
    return;
  }

  telegramPollingActive = true;

  // Auto-register command list with Telegram API so /thinking immediately shows in Telegram popup
  telegramSetMyCommands(tgCfg.bot_token).catch(() => {});

  while (telegramPollingActive) {
    try {
      const liveStorage = await chrome.storage.local.get(['telegram_bot_config', 'telegram_last_update_id']);
      const activeCfg = liveStorage.telegram_bot_config;
      if (!activeCfg || !activeCfg.enabled || !activeCfg.bot_token) {
        break;
      }

      let lastId = liveStorage.telegram_last_update_id || 0;
      telegramAbortController = new AbortController();
      const timeoutId = setTimeout(() => {
        try { telegramAbortController.abort(); } catch(e) {}
      }, 30000);

      // Fast Long-Polling (timeout 25s) -> Instant push when message arrives!
      const url = `https://api.telegram.org/bot${activeCfg.bot_token}/getUpdates?offset=${lastId + 1}&timeout=25`;
      const res = await fetch(url, { signal: telegramAbortController.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 409) {
          // Conflict: delete any active webhook and resume long-polling
          try {
            await fetch(`https://api.telegram.org/bot${activeCfg.bot_token}/deleteWebhook?drop_pending_updates=false`);
          } catch (we) {}
          await new Promise(r => setTimeout(r, 1500));
          continue;
        } else if (res.status === 401) {
          console.warn("Telegram Bot Token is invalid (401 Unauthorized)");
          break;
        } else {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }

      const json = await res.json();

      if (json.ok && Array.isArray(json.result) && json.result.length > 0) {
        let maxUpdateId = lastId;
        for (const update of json.result) {
          if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;
        }
        await chrome.storage.local.set({ telegram_last_update_id: maxUpdateId });

        for (const update of json.result) {
          if (bgProcessedUpdateIds.has(update.update_id)) continue;
          bgProcessedUpdateIds.add(update.update_id);
          if (bgProcessedUpdateIds.size > 300) {
            const firstKey = bgProcessedUpdateIds.values().next().value;
            bgProcessedUpdateIds.delete(firstKey);
          }
          handleTelegramIncomingUpdate(update, activeCfg).catch(err => {
            console.error("Error processing update:", err);
          });
        }
      } else if (json.error_code === 409) {
        try {
          await fetch(`https://api.telegram.org/bot${activeCfg.bot_token}/deleteWebhook?drop_pending_updates=false`);
        } catch (we) {}
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Timeout or intentional abort - sleep briefly and continue
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  telegramPollingActive = false;
}

// --- Event Listeners Registration ---
chrome.runtime.onInstalled.addListener(async (details) => {
  await enableSidePanelOnAction();
  if (details && details.reason === "install") {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    } catch (e) {}
  }
  setupWatchdogAlarm();
  checkAndRestartTelegramPoller();
});

chrome.runtime.onStartup.addListener(async () => {
  await enableSidePanelOnAction();
  setupWatchdogAlarm();
  checkAndRestartTelegramPoller();
});

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "telegram_poller_watchdog") {
      checkAndRestartTelegramPoller();
    }
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    isSidePanelOpen = true;
    broadcastSidePanelState(true);

    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
      broadcastSidePanelState(false);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;
  if (message.type === "CHECK_SIDEPANEL_OPEN") {
    sendResponse({ isOpen: isSidePanelOpen });
    return true;
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender && sender.tab && sender.tab.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(err => {
        if (sender.tab.windowId) {
          chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {});
        }
      });
    }
    sendResponse({ status: "ok" });
    return true;
  }

  if (message.type === "TELEGRAM_CONFIG_UPDATED") {
    checkAndRestartTelegramPoller(true);
    sendResponse({ status: "ok" });
    return true;
  }

  if (message.type === "RESTART_TELEGRAM_BOT") {
    chrome.storage.local.get(['telegram_bot_config']).then(async (data) => {
      const tgCfg = data.telegram_bot_config;
      if (tgCfg && tgCfg.bot_token) {
        try {
          // Flush pending telegram updates offset & clear any webhook conflict
          await fetch(`https://api.telegram.org/bot${tgCfg.bot_token}/deleteWebhook?drop_pending_updates=false`).catch(() => {});
          const dropRes = await fetch(`https://api.telegram.org/bot${tgCfg.bot_token}/getUpdates?offset=-1`);
          const dropJson = await dropRes.json();
          if (dropJson.ok && dropJson.result && dropJson.result.length > 0) {
            const maxUpId = dropJson.result[dropJson.result.length - 1].update_id;
            await chrome.storage.local.set({ telegram_last_update_id: maxUpId + 1 });
          }
        } catch(e) {}
      }
      checkAndRestartTelegramPoller(true);
    });
    sendResponse({ status: "ok", message: "Telegram bot restarted successfully" });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.telegram_bot_config) {
    checkAndRestartTelegramPoller();
  }
});

// --- Initial Startup Bootstrapping ---
enableSidePanelOnAction();
setupWatchdogAlarm();
checkAndRestartTelegramPoller();
