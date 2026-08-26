/**
 * =========================================================================
 * Browser Agent - Plugin: Ponytail Context Trimmer & Token Optimizer
 * Dedicated Controller for Plugin UI, Settings Modal & State Management
 * =========================================================================
 */

const DEFAULT_PONYTAIL_SETTINGS = {
  enabled: true,
  maxRecentTurns: 6,
  maxToolOutputChars: 1200,
  stripRedundantDOM: true,
  stripBase64: true,
  preserveSystemFacts: true
};

async function getPonytailSettings() {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    return {
      ...DEFAULT_PONYTAIL_SETTINGS,
      ...(data.plugin_settings?.ponytail || {})
    };
  } catch (e) {
    return { ...DEFAULT_PONYTAIL_SETTINGS };
  }
}

async function savePonytailSettings(newSettings) {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    const allPluginSettings = data.plugin_settings || {};
    allPluginSettings.ponytail = {
      ...DEFAULT_PONYTAIL_SETTINGS,
      ...(allPluginSettings.ponytail || {}),
      ...newSettings
    };
    await chrome.storage.local.set({ plugin_settings: allPluginSettings });
    updatePonytailUI();
  } catch (e) {
    console.error("Failed to save Ponytail settings:", e);
  }
}

async function updatePonytailUI() {
  const ponytail = await getPonytailSettings();
  const isEnabled = ponytail.enabled !== false;

  // Toggle Switches (support both IDs)
  const toggle1 = document.getElementById('plugin-ponytail-toggle');
  const toggle2 = document.getElementById('setting-plugin-ponytail-enabled');
  if (toggle1) toggle1.checked = isEnabled;
  if (toggle2) toggle2.checked = isEnabled;

  // Status Text in Card
  const statusText = document.getElementById('plugin-ponytail-status-text');
  if (statusText) {
    if (isEnabled) {
      statusText.innerHTML = `● Aktif (Optimal)`;
      statusText.style.color = '#4ade80';
    } else {
      statusText.innerHTML = `○ Nonaktif`;
      statusText.style.color = '#94a3b8';
    }
  }

  // Active Badges Count in Header & Sidebar
  const totalBadge = document.getElementById('plugins-total-active-badge');
  const sidebarBadge = document.getElementById('badge-status-plugins');
  const activeCount = isEnabled ? 1 : 0;

  if (totalBadge) totalBadge.innerText = `${activeCount} Plugin Aktif`;
  if (sidebarBadge) {
    sidebarBadge.innerText = `${activeCount} Aktif`;
    sidebarBadge.style.background = activeCount > 0 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(100, 116, 139, 0.15)';
    sidebarBadge.style.color = activeCount > 0 ? '#f472b6' : '#94a3b8';
    sidebarBadge.style.borderColor = activeCount > 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(100, 116, 139, 0.3)';
  }

  // Modal Inputs & Value Displays
  const inputTurns = document.getElementById('ponytail-max-turns');
  const valTurns = document.getElementById('ponytail-max-turns-val');
  const inputChars = document.getElementById('ponytail-max-tool-chars');
  const valChars = document.getElementById('ponytail-max-tool-chars-val');

  const chkDOM = document.getElementById('ponytail-opt-dom') || document.getElementById('ponytail-strip-dom');
  const chkBase64 = document.getElementById('ponytail-opt-base64') || document.getElementById('ponytail-strip-base64');
  const chkFacts = document.getElementById('ponytail-opt-facts') || document.getElementById('ponytail-preserve-facts');

  if (inputTurns) {
    inputTurns.value = ponytail.maxRecentTurns || 6;
    if (valTurns) valTurns.textContent = `${inputTurns.value} Turns`;
  }
  if (inputChars) {
    inputChars.value = ponytail.maxToolOutputChars || 1200;
    if (valChars) valChars.textContent = `${inputChars.value} Chars`;
  }
  if (chkDOM) chkDOM.checked = ponytail.stripRedundantDOM !== false;
  if (chkBase64) chkBase64.checked = ponytail.stripBase64 !== false;
  if (chkFacts) chkFacts.checked = ponytail.preserveSystemFacts !== false;
}

function openPonytailModal() {
  updatePonytailUI();
  const modal = document.getElementById('modal-plugin-ponytail');
  if (modal) modal.style.display = 'flex';
}

function closePonytailModal() {
  const modal = document.getElementById('modal-plugin-ponytail');
  if (modal) modal.style.display = 'none';
}

function setupPonytailEventListeners() {
  // Toggle Switch Change Listeners
  const handleToggleChange = async (e) => {
    const isChecked = e.target.checked;
    await savePonytailSettings({ enabled: isChecked });
    if (typeof showSaveToast === 'function') {
      showSaveToast(isChecked ? "Plugin Ponytail Diaktifkan (Hemat Token Aktif)!" : "Plugin Ponytail Dinonaktifkan.");
    }
  };

  document.getElementById('plugin-ponytail-toggle')?.addEventListener('change', handleToggleChange);
  document.getElementById('setting-plugin-ponytail-enabled')?.addEventListener('change', handleToggleChange);

  // Open Modal Buttons
  document.getElementById('btn-config-ponytail')?.addEventListener('click', (e) => {
    e.preventDefault();
    openPonytailModal();
  });
  document.getElementById('btn-open-plugin-ponytail-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    openPonytailModal();
  });

  // Close Modal Buttons
  document.getElementById('btn-close-ponytail-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closePonytailModal();
  });
  document.getElementById('btn-cancel-ponytail-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closePonytailModal();
  });
  document.getElementById('btn-close-plugin-ponytail-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closePonytailModal();
  });

  // Real-time Visual Value Display updates when dragging / typing
  document.getElementById('ponytail-max-turns')?.addEventListener('input', (e) => {
    const valSpan = document.getElementById('ponytail-max-turns-val');
    if (valSpan) valSpan.textContent = `${e.target.value} Turns`;
  });

  document.getElementById('ponytail-max-tool-chars')?.addEventListener('input', (e) => {
    const valSpan = document.getElementById('ponytail-max-tool-chars-val');
    if (valSpan) valSpan.textContent = `${e.target.value} Chars`;
  });

  // Save Modal Settings (Form submit / Save button)
  const handleSaveModal = async (e) => {
    if (e) e.preventDefault();
    const inputTurns = document.getElementById('ponytail-max-turns');
    const inputChars = document.getElementById('ponytail-max-tool-chars');
    const chkDOM = document.getElementById('ponytail-opt-dom') || document.getElementById('ponytail-strip-dom');
    const chkBase64 = document.getElementById('ponytail-opt-base64') || document.getElementById('ponytail-strip-base64');
    const chkFacts = document.getElementById('ponytail-opt-facts') || document.getElementById('ponytail-preserve-facts');

    const turns = Math.max(2, Math.min(30, parseInt(inputTurns?.value, 10) || 6));
    const chars = Math.max(300, Math.min(10000, parseInt(inputChars?.value, 10) || 1200));

    await savePonytailSettings({
      maxRecentTurns: turns,
      maxToolOutputChars: chars,
      stripRedundantDOM: chkDOM ? chkDOM.checked : true,
      stripBase64: chkBase64 ? chkBase64.checked : true,
      preserveSystemFacts: chkFacts ? chkFacts.checked : true
    });

    closePonytailModal();
    if (typeof showSaveToast === 'function') {
      showSaveToast("Pengaturan Plugin Ponytail berhasil disimpan!");
    }
  };

  document.getElementById('form-ponytail-settings')?.addEventListener('submit', handleSaveModal);
  document.getElementById('btn-save-ponytail-modal')?.addEventListener('click', handleSaveModal);
  document.getElementById('btn-save-plugin-ponytail-settings')?.addEventListener('click', handleSaveModal);

  // Document Delegated Fallback Click Handler
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-config-ponytail, #btn-open-plugin-ponytail-modal')) {
      e.preventDefault();
      openPonytailModal();
      return;
    }
    if (e.target.closest('#btn-close-ponytail-modal, #btn-cancel-ponytail-modal, #btn-close-plugin-ponytail-modal')) {
      e.preventDefault();
      closePonytailModal();
      return;
    }
    // Click outside modal dialog to close
    const modal = document.getElementById('modal-plugin-ponytail');
    if (modal && e.target === modal) {
      closePonytailModal();
    }
  });
}

// Initial binding on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updatePonytailUI();
  setupPonytailEventListeners();
});

// Real-time synchronization when settings change anywhere
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.plugin_settings) {
    updatePonytailUI();
  }
});
