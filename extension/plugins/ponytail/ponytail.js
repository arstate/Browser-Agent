/**
 * =========================================================================
 * Browser Agent - Plugin: Ponytail Context Trimmer, Token Saver & Lazy Senior
 * Dedicated Controller for Plugin UI, Settings Modal & State Management
 * Reference: https://github.com/DietrichGebert/ponytail
 * =========================================================================
 */

const DEFAULT_PONYTAIL_SETTINGS = {
  enabled: true,
  mode: 'full', // 'lite' | 'full' | 'ultra'
  maxRecentTurns: 6,
  maxToolOutputChars: 1200,
  stripRedundantDOM: true,
  stripBase64: true,
  preserveSystemFacts: true,
  lazyDecisionLadder: true,
  autoHookEnabled: true
};

async function updateGlobalPluginsBadge() {
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
if (typeof window !== 'undefined') {
  window.updateGlobalPluginsBadge = updateGlobalPluginsBadge;
}

// Embedded Documentation for Skills
const PONYTAIL_SKILL_DOCS = {
  'ponytail': `# Ponytail (Main Skill)
Filosofi: Lazy Senior Developer. Solusi paling ringkas, tepat guna, tanpa over-engineering.

## The Ponytail Decision Ladder:
1. Apakah ini perlu ada sama sekali? (YAGNI)
2. Sudah ada di codebase? → Reuse yang sudah ada.
3. Apakah Standard Library menyediakannya? → Gunakan stdlib.
4. Apakah fitur platform native menyediakannya? (cth: <dialog>, <input type="date">, Intl.DateTimeFormat).
5. Apakah dependensi yang sudah terpasang bisa menyelesaikannya?
6. Bisa satu baris? → Tulis 1 baris.
7. Hanya jika tidak bisa: Tulis kode minimal baru.`,

  'ponytail-review': `# Ponytail Review (/ponytail-review)
Code review tertarget pada diff untuk memburu over-engineering dan kode yang bisa dihapus.

Format output: L<line>: <tag> <what>. <replacement>.
Tags:
- delete: Kode mati atau fleksibilitas prematur. Pengganti: tidak ada.
- stdlib: Fitur buatan sendiri yang sudah disediakan stdlib.
- native: Dependensi yang fungsinya sudah ada di browser/platform.
- yagni: Abstraksi dengan implementasi tunggal / layer tidak perlu.
- shrink: Logika sama dengan baris jauh lebih ringkas.
Skor akhir: net: -<N> baris kode.`,

  'ponytail-audit': `# Ponytail Audit (/ponytail-audit)
Pemindaian seluruh repositori / codebase untuk mendeteksi bloat dan abstraksi mubazir.
Menghasilkan daftar temuan terurut berdasarkan potensi pemangkasan terbesar.
Skor akhir: net: -<N> lines, -<M> deps possible.`,

  'ponytail-debt': `# Ponytail Debt (/ponytail-debt)
Merekap seluruh penanda deliberate shortcut (# ponytail: / // ponytail:) ke dalam ledger terstruktur.
Format: L<line>: <what was skipped> → upgrade when <trigger>`,

  'ponytail-gain': `# Ponytail Gain (/ponytail-gain)
Papan skor benchmark efisiensi hasil pemadatan Ponytail:
• Baris Kode (LOC): Hemat 80%–94%
• Biaya Token Prompt: Hemat 47%–77%
• Kecepatan Respon: 3–6× Lebih Cepat`,

  'ponytail-help': `# Ponytail Help (/ponytail-help)
Panduan cepat seluruh perintah & mode Ponytail:
• /ponytail lite  : Bangun fitur + sarankan alternatif 1 baris
• /ponytail       : Full ladder enforcement (Default)
• /ponytail ultra : YAGNI garis keras, minimalisasi ekstrem
• /ponytail off   : Nonaktifkan mode Ponytail`
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
      statusText.innerHTML = `● Aktif (${(ponytail.mode || 'full').toUpperCase()})`;
      statusText.style.color = '#4ade80';
    } else {
      statusText.innerHTML = `○ Nonaktif`;
      statusText.style.color = '#94a3b8';
    }
  }

  // Mode Selection Radio Cards
  const activeMode = ponytail.mode || 'full';
  document.querySelectorAll('.ponytail-mode-card').forEach(card => {
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

  // Modal Inputs & Value Displays
  const inputTurns = document.getElementById('ponytail-max-turns');
  const valTurns = document.getElementById('ponytail-max-turns-val');
  const inputChars = document.getElementById('ponytail-max-tool-chars');
  const valChars = document.getElementById('ponytail-max-tool-chars-val');

  const chkDOM = document.getElementById('ponytail-opt-dom') || document.getElementById('ponytail-strip-dom');
  const chkBase64 = document.getElementById('ponytail-opt-base64') || document.getElementById('ponytail-strip-base64');
  const chkFacts = document.getElementById('ponytail-opt-facts') || document.getElementById('ponytail-preserve-facts');
  const chkLadder = document.getElementById('ponytail-opt-ladder');
  const chkHook = document.getElementById('ponytail-opt-hook');

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
  if (chkLadder) chkLadder.checked = ponytail.lazyDecisionLadder !== false;
  if (chkHook) chkHook.checked = ponytail.autoHookEnabled !== false;

  if (typeof updateGlobalPluginsBadge === 'function') {
    updateGlobalPluginsBadge();
  }
}

function openPonytailModal() {
  updatePonytailUI();
  const modal = document.getElementById('modal-plugin-ponytail');
  if (modal) {
    modal.style.display = 'flex';
    // Switch to first tab by default
    switchPonytailTab('settings');
  }
}

function closePonytailModal() {
  const modal = document.getElementById('modal-plugin-ponytail');
  if (modal) modal.style.display = 'none';
}

function switchPonytailTab(tabName) {
  document.querySelectorAll('.ponytail-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  const secSettings = document.getElementById('ponytail-tab-section-settings');
  const secDocs = document.getElementById('ponytail-tab-section-docs');
  if (secSettings) secSettings.style.display = tabName === 'settings' ? 'block' : 'none';
  if (secDocs) secDocs.style.display = tabName === 'docs' ? 'block' : 'none';
}

function showSkillDoc(skillKey) {
  document.querySelectorAll('.ponytail-skill-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.skill === skillKey);
  });
  const box = document.getElementById('ponytail-doc-preview-box');
  if (box && PONYTAIL_SKILL_DOCS[skillKey]) {
    box.textContent = PONYTAIL_SKILL_DOCS[skillKey];
  }
}

function setupPonytailEventListeners() {
  // Toggle Switch Change Listeners
  const handleToggleChange = async (e) => {
    const isChecked = e.target.checked;
    await savePonytailSettings({ enabled: isChecked });
    if (typeof showSaveToast === 'function') {
      showSaveToast(isChecked ? "Plugin Ponytail Diaktifkan (Hemat Token & Lazy Senior Aktif)!" : "Plugin Ponytail Dinonaktifkan.");
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

  // Mode Selection Card Clicks
  document.querySelectorAll('.ponytail-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      document.querySelectorAll('.ponytail-mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Tab Switching inside Modal
  document.querySelectorAll('.ponytail-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchPonytailTab(btn.dataset.tab);
    });
  });

  // Skill Docs sub-nav
  document.querySelectorAll('.ponytail-skill-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showSkillDoc(btn.dataset.skill);
    });
  });

  // Real-time Visual Value Display updates
  document.getElementById('ponytail-max-turns')?.addEventListener('input', (e) => {
    const valSpan = document.getElementById('ponytail-max-turns-val');
    if (valSpan) valSpan.textContent = `${e.target.value} Turns`;
  });

  document.getElementById('ponytail-max-tool-chars')?.addEventListener('input', (e) => {
    const valSpan = document.getElementById('ponytail-max-tool-chars-val');
    if (valSpan) valSpan.textContent = `${e.target.value} Chars`;
  });

  // Save Modal Settings
  const handleSaveModal = async (e) => {
    if (e) e.preventDefault();
    const activeModeCard = document.querySelector('.ponytail-mode-card.active');
    const selectedMode = activeModeCard?.dataset.mode || 'full';

    const inputTurns = document.getElementById('ponytail-max-turns');
    const inputChars = document.getElementById('ponytail-max-tool-chars');
    const chkDOM = document.getElementById('ponytail-opt-dom') || document.getElementById('ponytail-strip-dom');
    const chkBase64 = document.getElementById('ponytail-opt-base64') || document.getElementById('ponytail-strip-base64');
    const chkFacts = document.getElementById('ponytail-opt-facts') || document.getElementById('ponytail-preserve-facts');
    const chkLadder = document.getElementById('ponytail-opt-ladder');
    const chkHook = document.getElementById('ponytail-opt-hook');

    const turns = Math.max(2, Math.min(30, parseInt(inputTurns?.value, 10) || 6));
    const chars = Math.max(300, Math.min(10000, parseInt(inputChars?.value, 10) || 1200));

    await savePonytailSettings({
      mode: selectedMode,
      maxRecentTurns: turns,
      maxToolOutputChars: chars,
      stripRedundantDOM: chkDOM ? chkDOM.checked : true,
      stripBase64: chkBase64 ? chkBase64.checked : true,
      preserveSystemFacts: chkFacts ? chkFacts.checked : true,
      lazyDecisionLadder: chkLadder ? chkLadder.checked : true,
      autoHookEnabled: chkHook ? chkHook.checked : true
    });

    closePonytailModal();
    if (typeof showSaveToast === 'function') {
      showSaveToast("Pengaturan Plugin Ponytail berhasil disimpan!");
    }
  };

  document.getElementById('form-ponytail-settings')?.addEventListener('submit', handleSaveModal);
  document.getElementById('btn-save-ponytail-modal')?.addEventListener('click', handleSaveModal);

  // Document Delegated Fallback Click Handler
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-config-ponytail, #btn-open-plugin-ponytail-modal')) {
      e.preventDefault();
      openPonytailModal();
      return;
    }
    if (e.target.closest('#btn-close-ponytail-modal, #btn-cancel-ponytail-modal')) {
      e.preventDefault();
      closePonytailModal();
      return;
    }
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
  // Init default doc preview
  showSkillDoc('ponytail');
});

// Real-time synchronization when settings change anywhere
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.plugin_settings) {
    updatePonytailUI();
  }
});
