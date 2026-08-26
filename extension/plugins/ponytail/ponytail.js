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
  const data = await chrome.storage.local.get(['plugin_settings']);
  return {
    ...DEFAULT_PONYTAIL_SETTINGS,
    ...(data.plugin_settings?.ponytail || {})
  };
}

async function savePonytailSettings(newSettings) {
  const data = await chrome.storage.local.get(['plugin_settings']);
  const allPluginSettings = data.plugin_settings || {};
  allPluginSettings.ponytail = {
    ...DEFAULT_PONYTAIL_SETTINGS,
    ...(allPluginSettings.ponytail || {}),
    ...newSettings
  };
  await chrome.storage.local.set({ plugin_settings: allPluginSettings });
  updatePonytailUI();
}

async function updatePonytailUI() {
  const ponytail = await getPonytailSettings();

  // Toggle Switch
  const toggle = document.getElementById('setting-plugin-ponytail-enabled');
  if (toggle) toggle.checked = ponytail.enabled !== false;

  // Active Badges Count
  const totalBadge = document.getElementById('plugins-total-active-badge');
  const sidebarBadge = document.getElementById('badge-status-plugins');
  let activeCount = ponytail.enabled ? 1 : 0;

  if (totalBadge) totalBadge.innerText = `${activeCount} Plugin Aktif`;
  if (sidebarBadge) {
    sidebarBadge.innerText = `${activeCount} Aktif`;
    sidebarBadge.style.background = activeCount > 0 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(100, 116, 139, 0.15)';
    sidebarBadge.style.color = activeCount > 0 ? '#f472b6' : '#94a3b8';
    sidebarBadge.style.borderColor = activeCount > 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(100, 116, 139, 0.3)';
  }

  // Modal Inputs
  const inputTurns = document.getElementById('ponytail-max-turns');
  const inputChars = document.getElementById('ponytail-max-tool-chars');
  const chkDOM = document.getElementById('ponytail-strip-dom');
  const chkBase64 = document.getElementById('ponytail-strip-base64');
  const chkFacts = document.getElementById('ponytail-preserve-facts');

  if (inputTurns) inputTurns.value = ponytail.maxRecentTurns || 6;
  if (inputChars) inputChars.value = ponytail.maxToolOutputChars || 1200;
  if (chkDOM) chkDOM.checked = ponytail.stripRedundantDOM !== false;
  if (chkBase64) chkBase64.checked = ponytail.stripBase64 !== false;
  if (chkFacts) chkFacts.checked = ponytail.preserveSystemFacts !== false;
}

function setupPonytailEventListeners() {
  // Toggle Switch in Card
  document.getElementById('setting-plugin-ponytail-enabled')?.addEventListener('change', async (e) => {
    await savePonytailSettings({ enabled: e.target.checked });
    if (typeof showSaveToast === 'function') {
      showSaveToast(e.target.checked ? "Plugin Ponytail Diaktifkan (Hemat Token Aktif)!" : "Plugin Ponytail Dinonaktifkan.");
    }
  });

  // Open Modal
  document.getElementById('btn-open-plugin-ponytail-modal')?.addEventListener('click', async () => {
    await updatePonytailUI();
    const modal = document.getElementById('modal-plugin-ponytail');
    if (modal) modal.style.display = 'flex';
  });

  // Close Modal
  document.getElementById('btn-close-plugin-ponytail-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-plugin-ponytail');
    if (modal) modal.style.display = 'none';
  });

  // Save Modal Settings
  document.getElementById('btn-save-plugin-ponytail-settings')?.addEventListener('click', async () => {
    const inputTurns = document.getElementById('ponytail-max-turns');
    const inputChars = document.getElementById('ponytail-max-tool-chars');
    const chkDOM = document.getElementById('ponytail-strip-dom');
    const chkBase64 = document.getElementById('ponytail-strip-base64');
    const chkFacts = document.getElementById('ponytail-preserve-facts');

    const turns = Math.max(2, Math.min(20, parseInt(inputTurns?.value, 10) || 6));
    const chars = Math.max(300, Math.min(10000, parseInt(inputChars?.value, 10) || 1200));

    await savePonytailSettings({
      maxRecentTurns: turns,
      maxToolOutputChars: chars,
      stripRedundantDOM: chkDOM ? chkDOM.checked : true,
      stripBase64: chkBase64 ? chkBase64.checked : true,
      preserveSystemFacts: chkFacts ? chkFacts.checked : true
    });

    const modal = document.getElementById('modal-plugin-ponytail');
    if (modal) modal.style.display = 'none';
    if (typeof showSaveToast === 'function') {
      showSaveToast("Pengaturan Plugin Ponytail berhasil disimpan!");
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updatePonytailUI();
  setupPonytailEventListeners();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.plugin_settings) {
    updatePonytailUI();
  }
});
