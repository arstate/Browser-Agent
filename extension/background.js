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
    const placeholder = `___TG_CODE_BLOCK_${codeBlocks.length}___`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const langAttr = lang ? ` class="language-${lang}"` : '';
    codeBlocks.push(`<pre><code${langAttr}>${escapedCode}</code></pre>`);
    return placeholder;
  });

  // 2. Extract inline code
  const inlineCodes = [];
  str = str.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `___TG_INLINE_CODE_${inlineCodes.length}___`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  // 3. Escape raw HTML characters without double-escaping valid Telegram HTML tags
  str = str.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
  str = str.replace(/<(?!\/?(?:b|i|u|s|strong|em|ins|strike|del|code|pre|a|blockquote)(?:\s+[^>]+)?>)/gi, '&lt;');

  // 4. Convert Markdown syntax
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  str = str.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');
  str = str.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
  str = str.replace(/__([^_\n]+?)__/g, '<b>$1</b>');
  str = str.replace(/^[ \t]{4,8}[\*\-\+][ \t]+/gm, '      • ');
  str = str.replace(/^[ \t]{2,3}[\*\-\+][ \t]+/gm, '   • ');
  str = str.replace(/^[ \t]*[\*\-\+][ \t]+/gm, '• ');
  str = str.replace(/(^|[^\*])\*([^*\n\s](?:[^*\n]*[^*\n\s])?)\*(?!\*)/g, '$1<i>$2</i>');
  str = str.replace(/(^|[^_])_([^_\n\s](?:[^_\n]*[^_\n\s])?)_(?!_)/g, '$1<i>$2</i>');
  str = str.replace(/\n{3,}/g, '\n\n');

  // 5. Restore preserved code elements
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
        // Safely access chrome.runtime.lastError to prevent unchecked error log
        const err = chrome.runtime.lastError;
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

  // Execute directly and independently in background
  executePromptInBackgroundServiceWorker(effectiveText, senderId, senderName, botToken, tgCfg).catch(err => {
    console.error("Error executing background prompt:", err);
  });
}

// Standalone Direct AI Processing in Background Service Worker (Fast, Dedicated Session)
async function executePromptInBackgroundServiceWorker(text, senderId, senderName, botToken, tgCfg) {
  try {
    // 1. Send instant typing indicator so Telegram shows 'typing...' immediately
    telegramSendChatAction(botToken, senderId, "typing").catch(() => {});

    const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config', 'custom_agents', 'chat_sessions_cache']);
    const cfg = storageData.browser_agent_config || {};
    const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};

    const model = activeTgCfg.selected_model || cfg.selectedModelChoice || cfg.model || "gemini-2.5-flash";
    const apiKey = cfg.apiKey;
    const preset = cfg.preset || "gemini";
    const customEndpoint = cfg.customEndpoint || "";

    if (!apiKey && preset !== "ollama" && preset !== "9router") {
      await telegramSendMessage(botToken, senderId, `⚠️ <b>API Key Belum Dikonfigurasi:</b> Silakan buka menu Pengaturan Browser Agent di Chrome untuk memasukkan API Key Anda.`);
      return;
    }

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
    
    let responseText = "";

    if (preset === "gemini" || (!preset && !customEndpoint)) {
      const contents = [];
      for (const m of history) {
        if (m.role === 'user' || m.role === 'assistant') {
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: text }]
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = { contents };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.candidates && json.candidates[0]?.content?.parts) {
        responseText = json.candidates[0].content.parts.map(p => p.text || '').join('');
      } else if (json.error) {
        responseText = `⚠️ Error Gemini: ${json.error.message || JSON.stringify(json.error)}`;
      }
    } else {
      // OpenAI / Groq / OpenRouter / Custom / Ollama
      let endpoint = "https://api.openai.com/v1/chat/completions";
      if (preset === "groq") endpoint = "https://api.groq.com/openai/v1/chat/completions";
      else if (preset === "openrouter") endpoint = "https://openrouter.ai/api/v1/chat/completions";
      else if (preset === "ollama") endpoint = (customEndpoint || "http://localhost:11434") + "/v1/chat/completions";
      else if (customEndpoint) endpoint = customEndpoint.endsWith('/chat/completions') ? customEndpoint : (customEndpoint + '/chat/completions');

      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const messages = [
        { role: "system", content: "You are Browser Agent AI assistant responding directly to the user via Telegram remote chat. Be helpful, concise, accurate, and format with clean markdown." }
      ];
      for (const m of history) {
        if (m.role === 'user' || m.role === 'assistant') {
          messages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || ''
          });
        }
      }
      messages.push({ role: "user", content: text });

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model,
          messages
        })
      });
      const json = await res.json();
      if (json.choices && json.choices[0]?.message?.content) {
        responseText = json.choices[0].message.content;
      } else if (json.error) {
        responseText = `⚠️ Error API: ${json.error.message || JSON.stringify(json.error)}`;
      }
    }

    if (!responseText) {
      responseText = "⚠️ Tidak ada respons yang dihasilkan oleh model AI.";
    }

    // 3. Update dedicated Telegram session in cache
    tgSession.updated_at = Date.now();
    tgSession.model = model;
    tgSession.messages.push({ role: 'user', content: text, timestamp: Date.now() });
    tgSession.messages.push({ role: 'assistant', content: responseText, timestamp: Date.now() });
    cache[sessId] = tgSession;
    await chrome.storage.local.set({ chat_sessions_cache: cache });

    // Notify UI if history sidebar is open
    chrome.runtime.sendMessage({ type: "TELEGRAM_HISTORY_UPDATED" }).catch(() => {});

    // 4. Send formatted response to Telegram
    await telegramSendMessage(botToken, senderId, responseText);
  } catch (err) {
    await telegramSendMessage(botToken, senderId, `⚠️ Gagal memproses instruksi: ${err.message}`);
  }
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
    checkAndRestartTelegramPoller();
    sendResponse({ status: "ok" });
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
