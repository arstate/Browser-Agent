/**
 * =========================================================================
 * Browser Agent - Connected Apps: Telegram Bot Module
 * Dedicated Controller for Settings UI, Whitelist Detection, Logs & Polling
 * =========================================================================
 */

let telegramConfig = {
  enabled: false,
  bot_token: '',
  authorized_chat_id: '',
  auto_model: true,
  auto_agent: true,
  auto_accept: true
};

let telegramBotLogs = [];
let telegramPollingActive = false;

// Initialize Telegram Bot Settings from storage
async function initTelegramBotSettings() {
  try {
    const data = await chrome.storage.local.get(['telegram_bot_config', 'telegram_bot_logs']);
    if (data.telegram_bot_config) {
      telegramConfig = { ...telegramConfig, ...data.telegram_bot_config };
    }
    if (Array.isArray(data.telegram_bot_logs)) {
      telegramBotLogs = data.telegram_bot_logs;
    }

    const inputToken = document.getElementById('input-telegram-token');
    const inputChatId = document.getElementById('input-telegram-chatid');
    const chkEnabled = document.getElementById('setting-telegram-enabled');
    const chkAutoModel = document.getElementById('setting-telegram-auto-model');
    const chkAutoAgent = document.getElementById('setting-telegram-auto-agent');
    const chkAutoAccept = document.getElementById('setting-telegram-auto-accept');

    if (inputToken) inputToken.value = telegramConfig.bot_token || '';
    if (inputChatId) inputChatId.value = telegramConfig.authorized_chat_id || '';
    if (chkEnabled) chkEnabled.checked = !!telegramConfig.enabled;
    if (chkAutoModel) chkAutoModel.checked = !!telegramConfig.auto_model;
    if (chkAutoAgent) chkAutoAgent.checked = !!telegramConfig.auto_agent;
    if (chkAutoAccept) chkAutoAccept.checked = !!telegramConfig.auto_accept;

    updateTelegramStatusUI();
    renderTelegramLogs();
  } catch (err) {
    console.error("Error initializing Telegram Bot settings:", err);
  }
}

// Helper: Extract array of clean Telegram User IDs from string/array
function getAuthorizedTelegramIds(authorizedConfig) {
  if (!authorizedConfig) return [];
  if (Array.isArray(authorizedConfig)) {
    return authorizedConfig.map(id => String(id).trim()).filter(id => id.length > 0);
  }
  return String(authorizedConfig).split(/[\s,;]+/).map(id => id.trim()).filter(id => id.length > 0);
}

function updateTelegramStatusUI() {
  const statusPill = document.getElementById('telegram-bot-status-pill');
  const statusDot = document.getElementById('telegram-status-dot');
  const statusText = document.getElementById('telegram-status-text');
  const badgeNav = document.getElementById('badge-status-telegram');

  const hubStatusPill = document.getElementById('hub-telegram-status-pill');
  const hubStatusDot = document.getElementById('hub-telegram-status-dot');
  const hubStatusText = document.getElementById('hub-telegram-status-text');
  const hubUserInfo = document.getElementById('hub-telegram-user-info');

  const isOnline = telegramConfig.enabled && telegramConfig.bot_token;

  if (isOnline) {
    if (statusPill) {
      statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
      statusPill.style.borderColor = 'rgba(52, 211, 153, 0.35)';
      statusPill.style.color = '#34d399';
    }
    if (statusDot) {
      statusDot.style.background = '#34d399';
      statusDot.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.8)';
      statusDot.style.animation = 'livePulse 2s infinite ease-in-out';
    }
    if (statusText) statusText.innerText = 'Online (Listening)';
    if (badgeNav) {
      badgeNav.innerText = 'Online';
      badgeNav.style.background = 'rgba(16, 185, 129, 0.15)';
      badgeNav.style.borderColor = 'rgba(52, 211, 153, 0.35)';
      badgeNav.style.color = '#34d399';
    }

    if (hubStatusPill) {
      hubStatusPill.style.background = 'rgba(16, 185, 129, 0.15)';
      hubStatusPill.style.borderColor = 'rgba(52, 211, 153, 0.35)';
      hubStatusPill.style.color = '#34d399';
    }
    if (hubStatusDot) {
      hubStatusDot.style.background = '#34d399';
      hubStatusDot.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.8)';
    }
    if (hubStatusText) hubStatusText.innerText = 'Online';
  } else {
    if (statusPill) {
      statusPill.style.background = 'rgba(100, 116, 139, 0.15)';
      statusPill.style.borderColor = 'rgba(100, 116, 139, 0.3)';
      statusPill.style.color = '#94a3b8';
    }
    if (statusDot) {
      statusDot.style.background = '#64748b';
      statusDot.style.boxShadow = 'none';
      statusDot.style.animation = 'none';
    }
    if (statusText) statusText.innerText = 'Offline';
    if (badgeNav) {
      badgeNav.innerText = 'Bot';
      badgeNav.style.background = 'rgba(56, 189, 248, 0.15)';
      badgeNav.style.borderColor = 'rgba(56, 189, 248, 0.35)';
      badgeNav.style.color = '#38bdf8';
    }

    if (hubStatusPill) {
      hubStatusPill.style.background = 'rgba(100, 116, 139, 0.15)';
      hubStatusPill.style.borderColor = 'rgba(100, 116, 139, 0.3)';
      hubStatusPill.style.color = '#94a3b8';
    }
    if (hubStatusDot) {
      hubStatusDot.style.background = '#64748b';
      hubStatusDot.style.boxShadow = 'none';
    }
    if (hubStatusText) hubStatusText.innerText = 'Offline';
  }

  if (hubUserInfo) {
    const authList = getAuthorizedTelegramIds(telegramConfig.authorized_chat_id);
    if (authList.length > 0) {
      hubUserInfo.innerText = `Whitelist: ${authList.length} User ID (${authList.join(', ')})`;
    } else {
      hubUserInfo.innerText = 'Belum ada ID terdaftar';
    }
  }
}

// Render dedicated Telegram bot logs in Realtime
function renderTelegramLogs() {
  const container = document.getElementById('telegram-logs-container');
  if (!container) return;

  if (!telegramBotLogs || telegramBotLogs.length === 0) {
    container.innerHTML = `
      <div style="margin: auto; padding: 36px 16px; text-align: center; color: #64748b; font-size: 12px;">
        <p>Belum ada riwayat percakapan dari Bot Telegram.</p>
        <p style="margin-top: 6px; font-size: 11px; color: #475569;">Pesan yang Anda kirim dari Telegram ke bot akan tampil di sini secara real-time.</p>
      </div>
    `;
    return;
  }

  let html = '';
  const recentLogs = telegramBotLogs.slice(-50);
  recentLogs.forEach(entry => {
    const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    const isInbound = entry.type === 'inbound';
    const senderName = entry.sender_name || (isInbound ? 'Pengguna Telegram' : 'Master Agent');
    const senderId = entry.sender_id ? ` (ID: ${entry.sender_id})` : '';

    html += `
      <div class="telegram-log-entry ${isInbound ? 'telegram-log-inbound' : 'telegram-log-outbound'}">
        <div style="flex-shrink: 0; font-size: 16px; margin-top: 2px;">
          ${isInbound ? '👤' : '🤖'}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div class="telegram-log-meta">
            <span class="telegram-log-sender">${escapeHtml(senderName)}${escapeHtml(senderId)}</span>
            <span class="telegram-log-time">${timeStr}</span>
          </div>
          <div class="telegram-log-body">${escapeHtml(entry.text || '')}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Telegram API Helper: Set Bot Commands Menu
async function telegramSetMyCommands(botToken) {
  if (!botToken) return false;
  const commands = [
    { command: "model", description: "Pilih model AI (/model gemini-2.5-pro, /model auto)" },
    { command: "agent", description: "Pilih persona (/agent coder, /agent closer, /agent auto)" },
    { command: "mode", description: "Ganti mode eksekusi (/mode autonomous, /mode standard)" },
    { command: "screenshot", description: "Ambil screenshot tab browser aktif & kirim ke chat" },
    { command: "status", description: "Cek model aktif, persona, tab browser, & status kognitif" },
    { command: "clear", description: "Bersihkan riwayat konteks percakapan bot Telegram" },
    { command: "help", description: "Panduan lengkap sintaks & kemampuan Master Agent" }
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands })
    });
    const json = await res.json();
    return json.ok;
  } catch (err) {
    console.error("Failed to register Telegram commands:", err);
    return false;
  }
}

// Telegram API Helper: Set Bot Profile Photo to Browser Agent Icon
async function telegramSetBotProfilePhoto(botToken) {
  if (!botToken) return false;
  try {
    const iconUrl = chrome.runtime.getURL("icons/icon512.png");
    const resp = await fetch(iconUrl);
    const blob = await resp.blob();

    const formData = new FormData();
    formData.append("photo", blob, "avatar.png");

    const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyProfilePhoto`, {
      method: "POST",
      body: formData
    });
    const json = await res.json();
    return json.ok;
  } catch (err) {
    console.error("Failed to set Telegram bot profile photo:", err);
    return false;
  }
}

// Bind Telegram UI event listeners
function setupTelegramEventListeners() {
  // Save Telegram Config Button
  document.getElementById('btn-save-telegram-config')?.addEventListener('click', async () => {
    const inputToken = document.getElementById('input-telegram-token');
    const inputChatId = document.getElementById('input-telegram-chatid');
    const chkEnabled = document.getElementById('setting-telegram-enabled');
    const chkAutoModel = document.getElementById('setting-telegram-auto-model');
    const chkAutoAgent = document.getElementById('setting-telegram-auto-agent');
    const chkAutoAccept = document.getElementById('setting-telegram-auto-accept');

    telegramConfig = {
      enabled: chkEnabled ? chkEnabled.checked : false,
      bot_token: inputToken ? inputToken.value.trim() : '',
      authorized_chat_id: inputChatId ? inputChatId.value.trim() : '',
      auto_model: chkAutoModel ? chkAutoModel.checked : true,
      auto_agent: chkAutoAgent ? chkAutoAgent.checked : true,
      auto_accept: chkAutoAccept ? chkAutoAccept.checked : true
    };

    await chrome.storage.local.set({ telegram_bot_config: telegramConfig });
    updateTelegramStatusUI();
    if (typeof showSaveToast === 'function') showSaveToast("Pengaturan Telegram Bot berhasil disimpan!");

    if (telegramConfig.bot_token) {
      telegramSetBotProfilePhoto(telegramConfig.bot_token).catch(() => {});
    }
  });

  // Toggle Listener Switch
  document.getElementById('setting-telegram-enabled')?.addEventListener('change', (e) => {
    telegramConfig.enabled = e.target.checked;
    chrome.storage.local.set({ telegram_bot_config: telegramConfig });
    updateTelegramStatusUI();
    if (typeof showSaveToast === 'function') {
      showSaveToast(telegramConfig.enabled ? "Listener Bot Telegram Diaktifkan!" : "Listener Bot Telegram Dinonaktifkan.");
    }
  });

  // Test Ping Connection
  document.getElementById('btn-test-telegram-ping')?.addEventListener('click', async () => {
    const inputToken = document.getElementById('input-telegram-token');
    const token = inputToken ? inputToken.value.trim() : telegramConfig.bot_token;
    if (!token) {
      alert("Masukkan Bot Token terlebih dahulu!");
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const json = await res.json();
      if (json.ok) {
        alert(`✅ Koneksi Berhasil!\n\nNama Bot: @${json.result.username} (${json.result.first_name})\nID: ${json.result.id}`);
      } else {
        alert(`❌ Gagal terhubung: ${json.description || 'Token tidak valid'}`);
      }
    } catch (err) {
      alert(`❌ Error koneksi: ${err.message}`);
    }
  });

  // Register Commands
  document.getElementById('btn-register-telegram-commands')?.addEventListener('click', async () => {
    const inputToken = document.getElementById('input-telegram-token');
    const token = inputToken ? inputToken.value.trim() : telegramConfig.bot_token;
    if (!token) {
      alert("Masukkan Bot Token terlebih dahulu!");
      return;
    }
    const success = await telegramSetMyCommands(token);
    if (success) {
      if (typeof showSaveToast === 'function') showSaveToast("Daftar perintah shortcut berhasil didaftarkan!");
      alert("✅ Seluruh perintah shortcut (/model, /agent, /mode, /screenshot, /status) berhasil didaftarkan ke Telegram API!");
    } else {
      alert("❌ Gagal mendaftarkan menu perintah ke Telegram.");
    }
  });

  // Set Bot Profile Photo
  document.getElementById('btn-set-telegram-avatar')?.addEventListener('click', async () => {
    const inputToken = document.getElementById('input-telegram-token');
    const token = inputToken ? inputToken.value.trim() : telegramConfig.bot_token;
    if (!token) {
      alert("Masukkan Bot Token terlebih dahulu!");
      return;
    }
    const btn = document.getElementById('btn-set-telegram-avatar');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<span>Mengunggah...</span>`;

    try {
      const ok = await telegramSetBotProfilePhoto(token);
      if (ok) {
        if (typeof showSaveToast === 'function') showSaveToast("Foto profil Bot Telegram berhasil diatur!");
        alert("🎉 Foto profil Bot Telegram Anda telah berhasil diperbarui menggunakan Icon resmi Browser Agent!");
      } else {
        alert("⚠️ Gagal mengatur foto profil bot. Pastikan Bot Token valid.");
      }
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      if (btn) btn.innerHTML = origHtml;
    }
  });

  // Auto-detect Telegram ID
  document.getElementById('btn-autodetect-telegram-id')?.addEventListener('click', async () => {
    const inputToken = document.getElementById('input-telegram-token');
    const token = inputToken ? inputToken.value.trim() : telegramConfig.bot_token;
    if (!token) {
      alert("Masukkan Bot Token terlebih dahulu!");
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.result) && json.result.length > 0) {
        let lastMsg = null;
        for (let i = json.result.length - 1; i >= 0; i--) {
          if (json.result[i].message && json.result[i].message.from) {
            lastMsg = json.result[i].message;
            break;
          }
        }

        if (lastMsg && lastMsg.from) {
          const detectedId = String(lastMsg.from.id);
          const detectedName = lastMsg.from.first_name || 'User';
          const inputChatId = document.getElementById('input-telegram-chatid');
          
          const existingIds = getAuthorizedTelegramIds(inputChatId ? inputChatId.value : telegramConfig.authorized_chat_id);
          if (!existingIds.includes(detectedId)) {
            existingIds.push(detectedId);
            const newIdsStr = existingIds.join(', ');
            if (inputChatId) inputChatId.value = newIdsStr;
            telegramConfig.authorized_chat_id = newIdsStr;
            await chrome.storage.local.set({ telegram_bot_config: telegramConfig });
            updateTelegramStatusUI();
            if (typeof showSaveToast === 'function') showSaveToast(`ID Akun ${detectedName} (${detectedId}) ditambahkan!`);
            alert(`✅ ID Berhasil Dideteksi & Ditambahkan ke Whitelist!\n\nNama: ${detectedName}\nID Telegram: ${detectedId}\n\nTotal User Whitelist: ${existingIds.length} akun (${newIdsStr})`);
          } else {
            alert(`ℹ️ ID Telegram ${detectedId} (${detectedName}) sudah terdaftar dalam whitelist.`);
          }
          return;
        }
      }
      alert("Belum ada pesan masuk di bot Anda. Silakan buka bot di Telegram, kirim pesan apa saja (misal: halo), lalu klik tombol ini lagi.");
    } catch (err) {
      alert(`Error mendeteksi ID: ${err.message}`);
    }
  });

  // Toggle Password Visibility
  document.getElementById('btn-toggle-telegram-token-vis')?.addEventListener('click', () => {
    const inputToken = document.getElementById('input-telegram-token');
    if (inputToken) {
      inputToken.type = inputToken.type === 'password' ? 'text' : 'password';
    }
  });

  // Refresh Logs
  document.getElementById('btn-refresh-telegram-logs')?.addEventListener('click', () => {
    renderTelegramLogs();
    if (typeof showSaveToast === 'function') showSaveToast("Log Telegram diperbarui!");
  });

  // Clear Logs
  document.getElementById('btn-clear-telegram-logs')?.addEventListener('click', async () => {
    if (confirm("Apakah Anda yakin ingin membersihkan riwayat log chat Telegram?")) {
      telegramBotLogs = [];
      await chrome.storage.local.set({ telegram_bot_logs: telegramBotLogs });
      renderTelegramLogs();
      if (typeof showSaveToast === 'function') showSaveToast("Riwayat log Telegram telah dibersihkan.");
    }
  });

  // Restart Bot & Fresh Chat
  document.getElementById('btn-restart-telegram-bot')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-restart-telegram-bot');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<span>Merestart Bot...</span>`;

    try {
      await chrome.storage.local.remove(['telegram_active_clarification']);
      chrome.runtime.sendMessage({ type: "RESTART_TELEGRAM_BOT" }, () => {
        if (typeof showSaveToast === 'function') showSaveToast("🎉 Bot Telegram berhasil di-restart dan siap untuk chat baru!");
        renderTelegramLogs();
        updateTelegramStatusUI();
      });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setTimeout(() => {
        if (btn) btn.innerHTML = origHtml;
      }, 800);
    }
  });

  // Switch between Connected Apps Hub Catalog and Telegram Detail View
  document.getElementById('btn-open-telegram-config')?.addEventListener('click', () => {
    const hub = document.getElementById('connected-apps-hub');
    const detail = document.getElementById('connected-app-telegram-detail');
    if (hub && detail) {
      hub.style.display = 'none';
      detail.style.display = 'block';
      renderTelegramLogs();
    }
  });

  document.getElementById('btn-back-to-apps-hub')?.addEventListener('click', () => {
    const hub = document.getElementById('connected-apps-hub');
    const detail = document.getElementById('connected-app-telegram-detail');
    if (hub && detail) {
      detail.style.display = 'none';
      hub.style.display = 'block';
      updateTelegramStatusUI();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTelegramBotSettings();
  setupTelegramEventListeners();
});

// Listen for storage changes & runtime messages
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.telegram_bot_config || changes.telegram_bot_logs)) {
    initTelegramBotSettings();
  }
});
