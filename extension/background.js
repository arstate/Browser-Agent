// =========================================================================
// Browser Agent - Background Service Worker & Master Telegram Engine
// =========================================================================

// Enable opening the side panel when clicking the extension icon safely
const enableSidePanelOnAction = async () => {
  try {
    if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === "function") {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    // Silently handle race condition during SW startup/reload
  }
};

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

enableSidePanelOnAction();
setupWatchdogAlarm();
checkAndRestartTelegramPoller();

// Periodic watchdog alarm to keep Telegram Poller alive in MV3
function setupWatchdogAlarm() {
  try {
    if (chrome.alarms) {
      chrome.alarms.create("telegram_poller_watchdog", { periodInMinutes: 1 });
    }
  } catch (e) {}
}

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "telegram_poller_watchdog") {
      checkAndRestartTelegramPoller();
    }
  });
}

// Track Side Panel open state across tabs
let isSidePanelOpen = false;

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

// Listen for runtime messages
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
    checkAndRestartTelegramPoller();
    sendResponse({ status: "ok" });
    return true;
  }
});

// Watch storage changes for Telegram config
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.telegram_bot_config) {
    checkAndRestartTelegramPoller();
  }
});

// =========================================================================
// Centralized Telegram Remote Control Engine (Zero Conflict, Sub-Second Latency)
// =========================================================================
let telegramPollingActive = false;
let telegramAbortController = null;
const bgProcessedUpdateIds = new Set();
let lastProcessedTelegramPrompt = { text: '', time: 0 };

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

  const codeBlocks = [];
  str = str.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `___TG_CODE_BLOCK_${codeBlocks.length}___`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const langAttr = lang ? ` class="language-${lang}"` : '';
    codeBlocks.push(`<pre><code${langAttr}>${escapedCode}</code></pre>`);
    return placeholder;
  });

  const inlineCodes = [];
  str = str.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `___TG_INLINE_CODE_${inlineCodes.length}___`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  str = str.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');
  str = str.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  str = str.replace(/__([^_]+)__/g, '<b>$1</b>');
  str = str.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<i>$2</i>$3');
  str = str.replace(/(^|[^_])_([^_\n]+)_([^_]|$)/g, '$1<i>$2</i>$3');
  str = str.replace(/^[\*\-]\s+(.+)$/gm, '• $1');
  str = str.replace(/\n{3,}/g, '\n\n');

  inlineCodes.forEach((codeHtml, idx) => {
    str = str.replace(`___TG_INLINE_CODE_${idx}___`, codeHtml);
  });
  codeBlocks.forEach((blockHtml, idx) => {
    str = str.replace(`___TG_CODE_BLOCK_${idx}___`, blockHtml);
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
    return await res.json();
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

function sendNativeRpcInBackground(action, payload = {}) {
  return new Promise((resolve) => {
    try {
      const port = chrome.runtime.connectNative("com.antigravity.browser_agent");
      const msgId = "rpc_" + Date.now();
      const handler = (res) => {
        if (res && res.id === msgId) {
          port.disconnect();
          resolve(res);
        }
      };
      port.onMessage.addListener(handler);
      port.onDisconnect.addListener(() => {
        resolve(null);
      });
      port.postMessage({ id: msgId, action, payload });
      setTimeout(() => {
        try { port.disconnect(); } catch(e) {}
        resolve(null);
      }, 8000);
    } catch (e) {
      resolve(null);
    }
  });
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

    if (data.startsWith('clarify_opt:')) {
      // Forward option selection directly to active Sidepanel / NewTab
      chrome.runtime.sendMessage({
        type: "TELEGRAM_PROMPT_EXECUTE",
        callback_data: data,
        senderId: fromId,
        senderName: cb.from?.first_name || 'User',
        botToken
      }).catch(() => {});
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
  if (!msg || !msg.text) return;

  const senderId = String(msg.from?.id || msg.chat?.id || '');
  const senderName = msg.from?.first_name || 'User';
  const text = msg.text.trim();

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

  // Slash Commands (Instant Sub-Second Response)
  if (text.startsWith('/')) {
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === '/start' || cmd === '/help') {
      const welcome = `🤖 <b>Browser Agent Remote Control Aktif!</b>\n\nHalo <b>${escapeHtml(senderName)}</b>, Anda dapat mengontrol browser dan mengeksekusi AI langsung dari chat ini.\n\n<b>Pilihan Perintah:</b>\n• /history - Daftar riwayat sesi chat & pindah sesi\n• /model - Ganti model AI aktif\n• /agent - Ganti spesialis agent\n• /screenshot - Ambil screenshot Tab Chrome\n• /screenshot_os - Ambil screenshot Full Desktop Linux\n• /status - Cek status tab & performa\n• /new - Mulai sesi percakapan baru\n\n<i>Atau langsung ketik perintah apa saja untuk dieksekusi di browser!</i>`;
      await telegramSendMessage(botToken, senderId, welcome, {
        inline_keyboard: [
          [
            { text: "🗂️ Riwayat Sesi", callback_data: "cmd_history" },
            { text: "🤖 Model AI", callback_data: "cmd_model" }
          ],
          [
            { text: "👥 Spesialis Agent", callback_data: "cmd_agent" },
            { text: "📸 Screenshot Tab", callback_data: "cmd_screenshot_tab" }
          ],
          [
            { text: "🖥️ Screenshot OS Linux", callback_data: "cmd_screenshot_os" },
            { text: "✨ Sesi Baru", callback_data: "cmd_new_session" }
          ]
        ]
      });
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
      chrome.runtime.sendMessage({ type: "START_NEW_CHAT_DIRECT" }).catch(() => {});
      await telegramSendMessage(botToken, senderId, `✨ <b>Sesi Percakapan Baru Dimulai!</b> Memori sementara telah di-reset.`);
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
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        if (dataUrl) {
          const caption = `📸 <b>Screenshot Tab Chrome</b>\n<i>${escapeHtml(activeTab?.title || 'Chrome Tab')}</i>\nURL: <code>${escapeHtml(activeTab?.url || '-')}</code>`;
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

      const statusMsg = `📊 <b>Status Browser Agent:</b>\n\n• <b>Tab Aktif:</b> ${escapeHtml(activeTab?.title || 'None')}\n• <b>URL:</b> <code>${escapeHtml(activeTab?.url || '-')}</code>\n• <b>Model:</b> <code>${escapeHtml(modelDisplay)}</code>\n• <b>Agent:</b> <code>${escapeHtml(agentDisplay)}</code>\n• <b>Auto-Accept:</b> <code>${activeTgCfg.auto_accept ? 'ON (Otomatis)' : 'OFF (Safe Mode)'}</code>\n• <b>Latensi Engine:</b> <code>Real-Time (<100ms) 🟢</code>`;
      await telegramSendMessage(botToken, senderId, statusMsg);
      return;
    }
  }

  // 3. User Prompt Execution -> Forward to Open Sidepanel / NewTab
  const now = Date.now();
  if (lastProcessedTelegramPrompt.text === text && (now - lastProcessedTelegramPrompt.time < 3000)) {
    return;
  }
  lastProcessedTelegramPrompt = { text, time: now };

  chrome.runtime.sendMessage({
    type: "TELEGRAM_PROMPT_EXECUTE",
    text,
    senderId,
    senderName,
    botToken
  }, async (res) => {
    if (chrome.runtime.lastError || !res || res.status !== "handled_by_sidepanel") {
      // If sidepanel is closed, open sidepanel on current active tab
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0]) {
          await chrome.sidePanel.open({ tabId: tabs[0].id }).catch(() => {});
        }
      } catch(e) {}
    }
  });
}

// Background Poller Execution
async function checkAndRestartTelegramPoller() {
  if (telegramPollingActive) return;

  const storageData = await chrome.storage.local.get(['telegram_bot_config', 'telegram_last_update_id']);
  const tgCfg = storageData.telegram_bot_config;

  if (!tgCfg || !tgCfg.enabled || !tgCfg.bot_token) {
    return;
  }

  telegramPollingActive = true;

  while (telegramPollingActive) {
    try {
      const liveStorage = await chrome.storage.local.get(['telegram_bot_config', 'telegram_last_update_id']);
      const activeCfg = liveStorage.telegram_bot_config;
      if (!activeCfg || !activeCfg.enabled || !activeCfg.bot_token) {
        break;
      }

      let lastId = liveStorage.telegram_last_update_id || 0;
      telegramAbortController = new AbortController();

      // Fast Long-Polling (timeout 25s) -> Instant push when message arrives!
      const url = `https://api.telegram.org/bot${activeCfg.bot_token}/getUpdates?offset=${lastId + 1}&timeout=25`;
      const res = await fetch(url, { signal: telegramAbortController.signal });
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
        // Another connection was active, sleep 2s and resume
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      if (err.name === 'AbortError') break;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  telegramPollingActive = false;
}
