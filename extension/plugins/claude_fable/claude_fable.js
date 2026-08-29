/**
 * =========================================================================
 * Browser Agent - Plugin: Claude Fable 5 Cognitive Distillation
 * Dedicated Controller for Plugin UI, Settings Modal & State Management
 * Reference: https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.md
 * =========================================================================
 */

const DEFAULT_CLAUDE_FABLE_SETTINGS = {
  enabled: true,
  mode: 'balanced', // 'lite' | 'balanced' | 'mythos'
  reasoningEffort: 60,
  enableMemoryTaxonomy: true,
  enableHorizonTest: true,
  enableDignifiedTone: true,
  enableCheckMemoryFirst: true
};

const CLAUDE_FABLE_SKILL_DOCS = {
  'claude-fable': `# Claude Fable 5 Distillation (Main Skill)
Arsitektur Kognitif Anthropic Mythos-Tier yang didistilasikan ke dalam Browser Agent.
Meningkatkan kematangan berpikir, eliminasi basa-basi, kalibrasi memori epistemik, dan reasoning adaptif.

## Mode Tier:
1. Lite: Format memori [stated] dan gaya komunikasi langsung tanpa basa-basi.
2. Balanced (Default): Horizon Test 30 hari + Taksonomi Memori + Reasoning Effort adaptif.
3. Mythos Tier: Penalaran Multi-Hop, verifikasi lookahead ketat, dan pemisahan artifact dokumen mandiri.`,

  'epistemic-memory': `# Epistemic Memory Taxonomy (/epistemic-memory)
Strukturisasi memori Brain berbasis taksonomi file modular ala Obsidian:
- /profile.md: Identitas stabil (pekerjaan, peran).
- /topics/<domain>.md: Kebiasaan & preferensi jangka panjang.
- /areas/<project>.md: Proyek dan keterlibatan aktif.
- /people/<name>.md: Konteks relasi rekan kerja/partner.
- /preferences.md: Panduan format keluaran AI yang diinginkan.
- Tagging: Format '- [stated]' pada fakta eksplisit dan link ganda '[[entitas]]'.`,

  'horizon-test': `# Horizon Test (/horizon-test)
Penyaringan fakta bernilai tahan lama (>30 hari).
- Menolak mencatat status tugas yang habis dalam satu sesi (downloading, status tab, error sesaat).
- Menjaga database Brain Browser Agent tetap bersih dan berbobot tinggi.`,

  'reasoning-effort': `# Reasoning Effort Control (/reasoning-effort)
Modulasi kedalaman berpikir adaptif (<antml:reasoning_effort> 10-100).
- Effort Rendah (20-30): Untuk tugas rutin (convert file, download musik, pause video).
- Effort Tinggi (80-90): Untuk tugas kompleks (analisis On-Page SEO, refactor kode, investigasi bug).`,

  'dignified-prose': `# Dignified Prose & High Dignity (/dignified-prose)
Standar komunikasi berwibawa dan anti-submissive:
- Zero Filler: Tanpa kalimat klise pengantar/penutup.
- Akuntabilitas Tanpa Merendahkan Diri: Langsung perbaiki error secara lugas tanpa meminta maaf berlebihan.`
};

async function getClaudeFableSettings() {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    return {
      ...DEFAULT_CLAUDE_FABLE_SETTINGS,
      ...(data.plugin_settings?.claude_fable || {})
    };
  } catch (e) {
    return { ...DEFAULT_CLAUDE_FABLE_SETTINGS };
  }
}

async function saveClaudeFableSettings(newSettings) {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    const allPluginSettings = data.plugin_settings || {};
    allPluginSettings.claude_fable = {
      ...DEFAULT_CLAUDE_FABLE_SETTINGS,
      ...(allPluginSettings.claude_fable || {}),
      ...newSettings
    };
    await chrome.storage.local.set({ plugin_settings: allPluginSettings });
    updateClaudeFableUI();
  } catch (e) {
    console.error('[ClaudeFable] Save error:', e);
  }
}

async function updateClaudeFableUI() {
  const settings = await getClaudeFableSettings();

  // Update Card Badge
  const statusText = document.getElementById('plugin-claude-fable-status-text');
  const cardBadge = document.getElementById('plugin-claude-fable-card-badge');
  const toggle = document.getElementById('plugin-claude-fable-toggle');

  if (toggle) toggle.checked = !!settings.enabled;

  if (statusText) {
    statusText.textContent = settings.enabled ? 'Aktif' : 'Nonaktif';
    statusText.className = settings.enabled ? 'plugin-status-text active' : 'plugin-status-text inactive';
  }

  if (cardBadge) {
    if (settings.enabled) {
      cardBadge.textContent = `● Aktif (${(settings.mode || 'balanced').toUpperCase()})`;
      cardBadge.className = 'plugin-badge active';
    } else {
      cardBadge.textContent = '○ Nonaktif';
      cardBadge.className = 'plugin-badge inactive';
    }
  }

  // Update Modal Fields
  const modeBtns = document.querySelectorAll('.fable-mode-btn');
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === settings.mode);
  });

  const effortSlider = document.getElementById('fable-effort-slider');
  const effortVal = document.getElementById('fable-effort-val');
  if (effortSlider) effortSlider.value = settings.reasoningEffort || 60;
  if (effortVal) effortVal.textContent = settings.reasoningEffort || 60;

  const optTaxonomy = document.getElementById('fable-opt-taxonomy');
  const optHorizon = document.getElementById('fable-opt-horizon');
  const optDignity = document.getElementById('fable-opt-dignity');
  const optMemoryFirst = document.getElementById('fable-opt-memory-first');

  if (optTaxonomy) optTaxonomy.checked = settings.enableMemoryTaxonomy !== false;
  if (optHorizon) optHorizon.checked = settings.enableHorizonTest !== false;
  if (optDignity) optDignity.checked = settings.enableDignifiedTone !== false;
  if (optMemoryFirst) optMemoryFirst.checked = settings.enableCheckMemoryFirst !== false;

  if (typeof updateGlobalPluginsBadge === 'function') {
    updateGlobalPluginsBadge();
  }
}

function renderClaudeFableDoc(skillKey) {
  const viewer = document.getElementById('fable-doc-viewer');
  if (!viewer) return;
  const doc = CLAUDE_FABLE_SKILL_DOCS[skillKey] || CLAUDE_FABLE_SKILL_DOCS['claude-fable'];
  
  if (typeof marked !== 'undefined') {
    viewer.innerHTML = marked.parse(doc);
  } else {
    viewer.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #e2e8f0;">${doc}</pre>`;
  }
}

function openClaudeFableModal() {
  const modal = document.getElementById('modal-claude-fable-config');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    updateClaudeFableUI();
    renderClaudeFableDoc('claude-fable');
  }
}

function closeClaudeFableModal() {
  const modal = document.getElementById('modal-claude-fable-config');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function initClaudeFablePlugin() {
  // 1. Modal Triggers
  const btnOpen = document.getElementById('btn-config-claude-fable');
  if (btnOpen) {
    btnOpen.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openClaudeFableModal();
    });
  }

  const btnClose = document.getElementById('btn-close-claude-fable-modal');
  const btnCancel = document.getElementById('btn-cancel-claude-fable-modal');
  if (btnClose) btnClose.addEventListener('click', closeClaudeFableModal);
  if (btnCancel) btnCancel.addEventListener('click', closeClaudeFableModal);

  // 2. Card Toggle
  const toggle = document.getElementById('plugin-claude-fable-toggle');
  if (toggle) {
    toggle.addEventListener('change', async () => {
      await saveClaudeFableSettings({ enabled: toggle.checked });
    });
  }

  // 3. Mode Buttons
  const modeBtns = document.querySelectorAll('.fable-mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 4. Effort Slider
  const effortSlider = document.getElementById('fable-effort-slider');
  const effortVal = document.getElementById('fable-effort-val');
  if (effortSlider && effortVal) {
    effortSlider.addEventListener('input', () => {
      effortVal.textContent = effortSlider.value;
    });
  }

  // 5. Doc Tabs
  const docTabs = document.querySelectorAll('.fable-doc-tab');
  docTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      docTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const skill = tab.getAttribute('data-skill');
      renderClaudeFableDoc(skill);
    });
  });

  // 6. Save Button
  const btnSave = document.getElementById('btn-save-claude-fable-modal');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const activeModeBtn = document.querySelector('.fable-mode-btn.active');
      const mode = activeModeBtn ? activeModeBtn.getAttribute('data-mode') : 'balanced';
      const reasoningEffort = effortSlider ? parseInt(effortSlider.value, 10) : 60;

      const optTaxonomy = document.getElementById('fable-opt-taxonomy');
      const optHorizon = document.getElementById('fable-opt-horizon');
      const optDignity = document.getElementById('fable-opt-dignity');
      const optMemoryFirst = document.getElementById('fable-opt-memory-first');

      const newSettings = {
        mode,
        reasoningEffort,
        enableMemoryTaxonomy: optTaxonomy ? optTaxonomy.checked : true,
        enableHorizonTest: optHorizon ? optHorizon.checked : true,
        enableDignifiedTone: optDignity ? optDignity.checked : true,
        enableCheckMemoryFirst: optMemoryFirst ? optMemoryFirst.checked : true
      };

      await saveClaudeFableSettings(newSettings);
      closeClaudeFableModal();
    });
  }

  // Document Click Delegation Fallback
  document.addEventListener('click', (e) => {
    const configBtn = e.target.closest('#btn-config-claude-fable');
    if (configBtn) {
      e.preventDefault();
      openClaudeFableModal();
    }
  });

  updateClaudeFableUI();
}

// Auto Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClaudeFablePlugin);
} else {
  initClaudeFablePlugin();
}
