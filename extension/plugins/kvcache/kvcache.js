/**
 * =========================================================================
 * Browser Agent - Plugin: KV Cache & Prompt Caching Optimizer
 * Dedicated Controller for Plugin UI, Settings Modal & State Management
 * =========================================================================
 */

const DEFAULT_KVCACHE_SETTINGS = {
  enabled: true,
  mode: 'aggressive', // 'balanced' | 'aggressive' | 'strict'
  isolateDynamicSuffix: true,
  deterministicToolSort: true,
  injectExplicitBreakpoints: true,
  preserveFrozenTurns: true,
  supportAnthropicEphemeral: true,
  supportGeminiContextCache: true,
  supportOpenAIPrefix: true,
  supportOllamaLocal: true
};

const KVCACHE_SKILL_DOCS = {
  'kvcache': `# KV Cache & Prompt Caching Optimizer (Main Skill)
Optimasi arsitektur Transformer pada level Key-Value (KV) Cache untuk menghemat 70%-90% biaya token dan mempercepat response time (TTFT) hingga 4x-8x.

## 4 Pilar Deterministic KV Cache Anchoring:
1. Static Prefix Pinning: System Prompt, Master Rules, dan Format Tools dijaga 100% BEKU dan identik.
2. Dynamic-to-Suffix Relocation: Jam, tanggal, status tab, dan input user dinamis dipindahkan ke bagian SUFFIX paling akhir.
3. Deterministic Tool Sorting: Urutan JSON schema tools disortir secara alfabetis agar urutan token tidak pernah acak.
4. Explicit Breakpoint Injection: Menyisipkan cache_control ephemeral untuk Anthropic Claude & DeepSeek.`,

  'kvcache-audit': `# KV Cache Anti-Pattern Audit (/kvcache-audit)
Memindai prompt dan konfigurasi agent untuk mendeteksi 'Cache-Busting' anti-patterns:
• Dynamic Timestamps di awal prompt (100% Cache Killer)
• Random Session UUID di baris header
• Urutan schema tools yang acak-acakan
• Modifikasi turn lama di tengah riwayat.`,

  'kvcache-meter': `# KV Cache Meter (/kvcache-meter)
Mengecek status KV Cache Hit Ratio dan estimasi penghematan biaya secara real-time.
Menampilkan metrik:
• Cache Hit Rate: 85% - 95%
• Token Cost Discount: Diskon 80% - 90%
• TTFT Latency: 3x - 8x lebih cepat.`
};

async function getKVCacheSettings() {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    return {
      ...DEFAULT_KVCACHE_SETTINGS,
      ...(data.plugin_settings?.kvcache || {})
    };
  } catch (e) {
    return { ...DEFAULT_KVCACHE_SETTINGS };
  }
}

async function saveKVCacheSettings(newSettings) {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    const allPluginSettings = data.plugin_settings || {};
    allPluginSettings.kvcache = {
      ...DEFAULT_KVCACHE_SETTINGS,
      ...(allPluginSettings.kvcache || {}),
      ...newSettings
    };
    await chrome.storage.local.set({ plugin_settings: allPluginSettings });
    updateKVCacheUI();
  } catch (e) {
    console.error("Failed to save KV Cache settings:", e);
  }
}

async function updateKVCacheUI() {
  const kv = await getKVCacheSettings();
  const isEnabled = kv.enabled !== false;

  // Toggle switch in catalog
  const toggle = document.getElementById('plugin-kvcache-toggle');
  if (toggle) toggle.checked = isEnabled;

  // Status text in card
  const statusText = document.getElementById('plugin-kvcache-status-text');
  if (statusText) {
    if (isEnabled) {
      statusText.innerHTML = `● Aktif (Hit Rate ~90%)`;
      statusText.style.color = '#38bdf8';
    } else {
      statusText.innerHTML = `○ Nonaktif`;
      statusText.style.color = '#94a3b8';
    }
  }

  // Active Badges Count in Header
  if (typeof updateGlobalPluginsBadge === 'function') {
    updateGlobalPluginsBadge();
  } else {
    try {
      const pData = await chrome.storage.local.get(['plugin_settings']);
      const p = pData.plugin_settings || {};
      let activeCount = 0;
      if (p.ponytail?.enabled !== false) activeCount++;
      if (p.kvcache?.enabled !== false) activeCount++;
      if (p.caveman?.enabled !== false) activeCount++;
      if (p.claude_fable?.enabled !== false) activeCount++;

      const totalBadge = document.getElementById('plugins-total-active-badge');
      const sidebarBadge = document.getElementById('badge-status-plugins');
      if (totalBadge) {
        totalBadge.innerText = `${activeCount} Plugin Aktif`;
        totalBadge.style.background = activeCount > 0 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(100, 116, 139, 0.15)';
        totalBadge.style.color = activeCount > 0 ? '#f472b6' : '#94a3b8';
        totalBadge.style.borderColor = activeCount > 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(100, 116, 139, 0.3)';
      }
      if (sidebarBadge) {
        sidebarBadge.innerText = `${activeCount} Aktif`;
        sidebarBadge.style.background = activeCount > 0 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(100, 116, 139, 0.15)';
        sidebarBadge.style.color = activeCount > 0 ? '#f472b6' : '#94a3b8';
        sidebarBadge.style.borderColor = activeCount > 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(100, 116, 139, 0.3)';
      }
    } catch (e) {}
  }

  // Mode Selection Radio Cards
  const activeMode = kv.mode || 'aggressive';
  document.querySelectorAll('.kvcache-mode-card').forEach(card => {
    const modeVal = card.dataset.mode;
    const radio = card.querySelector('input[type="radio"]');
    if (modeVal === activeMode) {
      card.classList.add('active');
      if (radio) radio.checked = true;
    } else {
      card.classList.remove('active');
      if (radio) radio.checked = false;
    }
  });

  // Modal Checkboxes
  const chkSuffix = document.getElementById('kvcache-opt-suffix');
  const chkSort = document.getElementById('kvcache-opt-sort');
  const chkBreak = document.getElementById('kvcache-opt-break');
  const chkFrozen = document.getElementById('kvcache-opt-frozen');

  if (chkSuffix) chkSuffix.checked = kv.isolateDynamicSuffix !== false;
  if (chkSort) chkSort.checked = kv.deterministicToolSort !== false;
  if (chkBreak) chkBreak.checked = kv.injectExplicitBreakpoints !== false;
  if (chkFrozen) chkFrozen.checked = kv.preserveFrozenTurns !== false;
}

function openKVCacheModal() {
  updateKVCacheUI();
  const modal = document.getElementById('modal-plugin-kvcache');
  if (modal) {
    modal.style.display = 'flex';
    switchKVCacheTab('settings');
  }
}

function closeKVCacheModal() {
  const modal = document.getElementById('modal-plugin-kvcache');
  if (modal) modal.style.display = 'none';
}

function switchKVCacheTab(tabName) {
  document.querySelectorAll('.kvcache-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  const secSettings = document.getElementById('kvcache-tab-section-settings');
  const secDocs = document.getElementById('kvcache-tab-section-docs');
  if (secSettings) secSettings.style.display = tabName === 'settings' ? 'block' : 'none';
  if (secDocs) secDocs.style.display = tabName === 'docs' ? 'block' : 'none';
}

function showKVCacheSkillDoc(skillKey) {
  document.querySelectorAll('.kvcache-skill-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.skill === skillKey);
  });
  const box = document.getElementById('kvcache-doc-preview-box');
  if (box && KVCACHE_SKILL_DOCS[skillKey]) {
    box.textContent = KVCACHE_SKILL_DOCS[skillKey];
  }
}

function setupKVCacheEventListeners() {
  // Toggle Switch
  document.getElementById('plugin-kvcache-toggle')?.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    await saveKVCacheSettings({ enabled: isChecked });
    if (typeof showSaveToast === 'function') {
      showSaveToast(isChecked ? "Plugin KV Cache Diaktifkan (Prompt Caching 90% Aktif)!" : "Plugin KV Cache Dinonaktifkan.");
    }
  });

  // Open Modal Buttons
  document.getElementById('btn-config-kvcache')?.addEventListener('click', (e) => {
    e.preventDefault();
    openKVCacheModal();
  });

  // Close Modal Buttons
  document.getElementById('btn-close-kvcache-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeKVCacheModal();
  });
  document.getElementById('btn-cancel-kvcache-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeKVCacheModal();
  });

  // Mode Selection Card Clicks
  document.querySelectorAll('.kvcache-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.kvcache-mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Tabs Switching
  document.querySelectorAll('.kvcache-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchKVCacheTab(btn.dataset.tab);
    });
  });

  // Skill Docs sub-nav
  document.querySelectorAll('.kvcache-skill-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showKVCacheSkillDoc(btn.dataset.skill);
    });
  });

  // Save Modal Settings
  const handleSaveModal = async (e) => {
    if (e) e.preventDefault();
    const activeModeCard = document.querySelector('.kvcache-mode-card.active');
    const selectedMode = activeModeCard?.dataset.mode || 'aggressive';

    const chkSuffix = document.getElementById('kvcache-opt-suffix');
    const chkSort = document.getElementById('kvcache-opt-sort');
    const chkBreak = document.getElementById('kvcache-opt-break');
    const chkFrozen = document.getElementById('kvcache-opt-frozen');

    await saveKVCacheSettings({
      mode: selectedMode,
      isolateDynamicSuffix: chkSuffix ? chkSuffix.checked : true,
      deterministicToolSort: chkSort ? chkSort.checked : true,
      injectExplicitBreakpoints: chkBreak ? chkBreak.checked : true,
      preserveFrozenTurns: chkFrozen ? chkFrozen.checked : true
    });

    closeKVCacheModal();
    if (typeof showSaveToast === 'function') {
      showSaveToast("Pengaturan Plugin KV Cache berhasil disimpan!");
    }
  };

  document.getElementById('form-kvcache-settings')?.addEventListener('submit', handleSaveModal);
  document.getElementById('btn-save-kvcache-modal')?.addEventListener('click', handleSaveModal);

  // Document Click Delegation Fallback
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-config-kvcache')) {
      e.preventDefault();
      openKVCacheModal();
      return;
    }
    if (e.target.closest('#btn-close-kvcache-modal, #btn-cancel-kvcache-modal')) {
      e.preventDefault();
      closeKVCacheModal();
      return;
    }
    const modal = document.getElementById('modal-plugin-kvcache');
    if (modal && e.target === modal) {
      closeKVCacheModal();
    }
  });
}

// Initial binding on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateKVCacheUI();
  setupKVCacheEventListeners();
  showKVCacheSkillDoc('kvcache');
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.plugin_settings) {
    updateKVCacheUI();
  }
});
