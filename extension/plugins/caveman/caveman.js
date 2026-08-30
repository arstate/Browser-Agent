/**
 * =========================================================================
 * Browser Agent - Plugin: Caveman Output Compressor & Token Shrinker
 * Dedicated Controller for Plugin UI, Settings Modal & State Management
 * Reference: https://github.com/JuliusBrussee/caveman
 * =========================================================================
 */

const DEFAULT_CAVEMAN_SETTINGS = {
  enabled: true,
  mode: 'terse', // 'terse' | 'ultra' | 'code-only'
  compressOutput: true,
  preserveExactCode: true,
  stripPoliteFluff: true,
  enforceProofCheck: true
};

const CAVEMAN_SKILL_DOCS = {
  'caveman': `# Caveman (Main Skill)
Filosofi: "why use many token when few do trick".
Kompresi output token hingga 60%-75% dengan gaya bicara telegrafik super ringkas, tanpa basa-basi pengantar/penutup, namun kode, error, dan nama fungsi tetap 100% tepat tanpa singkatan.

## Mode Intensitas:
1. Terse (Default): Langsung ke inti penjelasan, buang basa-basi sopan santun berlebih.
2. Ultra-Caveman: Kalimat telegrafik pendek 1-2 baris, buang kata hubung tidak penting.
3. Code-Only: Langsung hasil kode / eksekusi aksi tanpa penjelasan teks kecuali diminta.`,

  'investigate-first': `# Investigate First (/investigate-first)
Diagnosis kegagalan dan kumpulkan bukti sebelum mengubah kode produk.
- Pisahkan gejala (symptom) dari akar penyebab (root cause).
- Lacak input, state transitions, dan batasan kepemilikan kode.
- Buat hipotesis terurut bukti sebelum mengeksekusi edit.`,

  'surgical-patch': `# Surgical Patch (/surgical-patch)
Perbaikan bug pada layer tersempit yang bertanggung jawab.
- Ubah layer terkecil yang memiliki bug.
- Jaga kode di sekitarnya tetap utuh tanpa refactor liar.
- Tambahkan bukti verifikasi bahwa bug telah terselesaikan.`,

  'safe-refactor': `# Safe Refactor (/safe-refactor)
Restrukturisasi kode dengan jaminan 100% perilaku (behavior) tetap aman.
- Geser satu boundary kepemilikan dalam satu waktu.
- Pertahankan public interface dan error handling.
- Uji ulang dengan acceptance test yang sama.`,

  'verify-and-stop': `# Verify and Stop (/verify-and-stop)
Buktikan pekerjaan selesai memenuhi acceptance criteria lalu berhenti tanpa scope creep.
- Jangan menambah polesan atau refactor baru setelah tes lolos.
- Laporkan bukti perintah, hasil, dan risiko saja.`,

  'lean-build': `# Lean Build (/lean-build)
Bangun fitur baru dengan arsitektur ringkas dan batasan ketat anti-overbuilding.`,

  'migration': `# Migration (/migration)
Eksekusi transisi kompatibilitas yang aman dan dapat di-rollback (schema, API, protocol).`
};

async function getCavemanSettings() {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    return {
      ...DEFAULT_CAVEMAN_SETTINGS,
      ...(data.plugin_settings?.caveman || {})
    };
  } catch (e) {
    return { ...DEFAULT_CAVEMAN_SETTINGS };
  }
}

async function saveCavemanSettings(newSettings) {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    const allPluginSettings = data.plugin_settings || {};
    allPluginSettings.caveman = {
      ...DEFAULT_CAVEMAN_SETTINGS,
      ...(allPluginSettings.caveman || {}),
      ...newSettings
    };
    await chrome.storage.local.set({ plugin_settings: allPluginSettings });
    updateCavemanUI();
  } catch (e) {
    console.error("Failed to save Caveman settings:", e);
  }
}

async function updateCavemanUI() {
  const cm = await getCavemanSettings();
  const isEnabled = cm.enabled !== false;

  // Toggle switch in catalog
  const toggle = document.getElementById('plugin-caveman-toggle');
  if (toggle) toggle.checked = isEnabled;

  // Status text in card
  const statusText = document.getElementById('plugin-caveman-status-text');
  if (statusText) {
    if (isEnabled) {
      statusText.innerHTML = `● Aktif (${(cm.mode || 'terse').toUpperCase()})`;
      statusText.style.color = '#f59e0b';
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
      if (p.claude_fable?.enabled) activeCount++;
      if (p.claude_opus_5?.enabled) activeCount++;

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
  const activeMode = cm.mode || 'terse';
  document.querySelectorAll('.caveman-mode-card').forEach(card => {
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
  const chkOut = document.getElementById('caveman-opt-output');
  const chkCode = document.getElementById('caveman-opt-code');
  const chkFluff = document.getElementById('caveman-opt-fluff');
  const chkProof = document.getElementById('caveman-opt-proof');

  if (chkOut) chkOut.checked = cm.compressOutput !== false;
  if (chkCode) chkCode.checked = cm.preserveExactCode !== false;
  if (chkFluff) chkFluff.checked = cm.stripPoliteFluff !== false;
  if (chkProof) chkProof.checked = cm.enforceProofCheck !== false;
}

function openCavemanModal() {
  updateCavemanUI();
  const modal = document.getElementById('modal-plugin-caveman');
  if (modal) {
    modal.style.display = 'flex';
    switchCavemanTab('settings');
  }
}

function closeCavemanModal() {
  const modal = document.getElementById('modal-plugin-caveman');
  if (modal) modal.style.display = 'none';
}

function switchCavemanTab(tabName) {
  document.querySelectorAll('.caveman-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  const secSettings = document.getElementById('caveman-tab-section-settings');
  const secDocs = document.getElementById('caveman-tab-section-docs');
  if (secSettings) secSettings.style.display = tabName === 'settings' ? 'block' : 'none';
  if (secDocs) secDocs.style.display = tabName === 'docs' ? 'block' : 'none';
}

function showCavemanSkillDoc(skillKey) {
  document.querySelectorAll('.caveman-skill-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.skill === skillKey);
  });
  const box = document.getElementById('caveman-doc-preview-box');
  if (box && CAVEMAN_SKILL_DOCS[skillKey]) {
    box.textContent = CAVEMAN_SKILL_DOCS[skillKey];
  }
}

function setupCavemanEventListeners() {
  // Toggle Switch
  document.getElementById('plugin-caveman-toggle')?.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    await saveCavemanSettings({ enabled: isChecked });
    if (typeof showSaveToast === 'function') {
      showSaveToast(isChecked ? "Plugin Caveman Diaktifkan (Output Ringkas Aktif)!" : "Plugin Caveman Dinonaktifkan.");
    }
  });

  // Open Modal
  document.getElementById('btn-config-caveman')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCavemanModal();
  });

  // Close Modal
  document.getElementById('btn-close-caveman-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeCavemanModal();
  });
  document.getElementById('btn-cancel-caveman-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeCavemanModal();
  });

  // Mode Selection Card Clicks
  document.querySelectorAll('.caveman-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.caveman-mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Tabs Switching
  document.querySelectorAll('.caveman-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchCavemanTab(btn.dataset.tab);
    });
  });

  // Skill Docs sub-nav
  document.querySelectorAll('.caveman-skill-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showCavemanSkillDoc(btn.dataset.skill);
    });
  });

  // Save Modal Settings
  const handleSaveModal = async (e) => {
    if (e) e.preventDefault();
    const activeModeCard = document.querySelector('.caveman-mode-card.active');
    const selectedMode = activeModeCard?.dataset.mode || 'terse';

    const chkOut = document.getElementById('caveman-opt-output');
    const chkCode = document.getElementById('caveman-opt-code');
    const chkFluff = document.getElementById('caveman-opt-fluff');
    const chkProof = document.getElementById('caveman-opt-proof');

    await saveCavemanSettings({
      mode: selectedMode,
      compressOutput: chkOut ? chkOut.checked : true,
      preserveExactCode: chkCode ? chkCode.checked : true,
      stripPoliteFluff: chkFluff ? chkFluff.checked : true,
      enforceProofCheck: chkProof ? chkProof.checked : true
    });

    closeCavemanModal();
    if (typeof showSaveToast === 'function') {
      showSaveToast("Pengaturan Plugin Caveman berhasil disimpan!");
    }
  };

  document.getElementById('form-caveman-settings')?.addEventListener('submit', handleSaveModal);
  document.getElementById('btn-save-caveman-modal')?.addEventListener('click', handleSaveModal);

  // Document Click Delegation Fallback
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-config-caveman')) {
      e.preventDefault();
      openCavemanModal();
      return;
    }
    if (e.target.closest('#btn-close-caveman-modal, #btn-cancel-caveman-modal')) {
      e.preventDefault();
      closeCavemanModal();
      return;
    }
    const modal = document.getElementById('modal-plugin-caveman');
    if (modal && e.target === modal) {
      closeCavemanModal();
    }
  });
}

// Initial binding on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateCavemanUI();
  setupCavemanEventListeners();
  showCavemanSkillDoc('caveman');
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.plugin_settings) {
    updateCavemanUI();
  }
});
