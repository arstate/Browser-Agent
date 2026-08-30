/**
 * =========================================================================
 * Browser Agent - Plugin: Claude Opus 5 Distill
 * Dedicated Controller for Plugin UI, Settings Modal & Mutual Exclusivity
 * Reference: Leaked System Prompt Claude Opus 5 (Anthropic)
 * =========================================================================
 */

const DEFAULT_CLAUDE_OPUS_5_SETTINGS = {
  enabled: false,
  mode: 'deep_analytical', // 'standard' | 'deep_analytical' | 'truth_seeking'
  reasoningEffort: 75,
  enableMemoryFilesystem: true,
  enableForbiddenPhrases: true,
  enableArtifactArchitecture: true,
  enableHighDignityTone: true,
  enablePrivacyGuardrails: true
};

const CLAUDE_OPUS_5_SKILL_DOCS = {
  'claude-opus-5': `# Claude Opus 5 Cognitive Distillation (Main Skill)
Distilasi arsitektur penalaran Anthropic **Claude Opus 5** — Model tercanggih untuk tantangan analitis kompleks, pemecahan masalah mendalam, dan penataan memori persisten.

## 🎯 Pilar Utama Opus 5:
1. **Deep Analytical Problem Solving:** Penyelidikan akar masalah (root cause), pengujian kasus ekstrem, dan deduksi multi-langkah yang ketat.
2. **Autonomous Memory Filesystem:** Penataan memori modular berbasis file (\`/profile.md\`, \`/topics/\`, \`/areas/\`, \`/people/\`, \`/preferences.md\`) dengan tag wajib \`- [stated]\` dan wiki-links \`[[entitas]]\`.
3. **Zero Forbidden Memory Narration:** Mengintegrasikan memori secara mulus ke dalam jawaban tanpa menarasikan *"Berdasarkan memori Anda..."* atau memicu kesan pengintaian (surveillance feel).
4. **Artifact Architecture:** Memisahkan dokumen substansial, kode pemrograman, dan diagram ke kontainer mandiri agar chat tetap rapi.
5. **High-Dignity & Evenhandedness:** Bertanggung jawab langsung atas kesalahan tanpa meminta maaf berlebihan, serta adil dan objektif pada isu multi-perspektif.`,

  'opus-memory-filesystem': `# Taksonomi Memori Epistemik (/opus-memory-filesystem)
Strukturisasi memori Brain berbasis taksonomi file modular ala Obsidian:
- \`/profile.md\`: Identitas stabil pengguna (profesi, domain kerja, peran utama). Uji 3 bulan: hanya simpan fakta yang valid >3 bulan.
- \`/topics/<domain>.md\`: Kebiasaan, rutinitas, dan preferensi per domain (/topics/schedule.md, /topics/food.md).
- \`/areas/<project>.md\`: Proyek dan area kerja aktif yang sedang berjalan (/areas/spain-trip.md, /areas/auth-redesign.md).
- \`/people/<name>.md\`: Konteks relasi keluarga/tim/partner (/people/partner.md, /people/sam.md).
- \`/preferences.md\`: Panduan format keluaran dan gaya respons AI yang diinginkan.

## 🏷️ Tag Wajib & Wiki-Links:
- Setiap fakta wajib diberi label \`- [stated]\` (hanya apa yang dikatakan langsung oleh pengguna).
- Entitas dihubungkan dengan tautan ganda \`[[nama-entitas]]\`.`,

  'forbidden-memory-phrases': `# Larangan Narasi Akses Memori (/forbidden-memory-phrases)
Standar integrasi memori tanpa kesan pengintaian:
- **DILARANG MENGGUNAKAN FRASA:**
  - *"Berdasarkan memori Anda..."*
  - *"Menurut profil Anda..."*
  - *"Dari apa yang saya ingat..."*
  - *"As I recall..." / "Based on your memories..."*
- **SOP Integrasi Mulus:** Fakta memori langsung diterapkan ke dalam logika jawaban tanpa perlu diumumkan atau dijustifikasi.`,

  'opus-privacy-guardrails': `# Perlindungan Privasi & Omission (/opus-privacy-guardrails)
Standar keamanan ketat untuk menolak pencatatan data sensitif:
- **Dilarang Disimpan (Omit Entirely):**
  - Data medis/kesehatan spesifik, riwayat terapi, resep obat, atau diagnosa psikologis.
  - Nomor KTP/NIK/SIM/Paspor, nomor rekening bank, kartu kredit, CVV, PIN.
  - Alamat rumah pribadi dan nomor telepon pribadi.
  - Profil kepribadian psikologis (MBTI, Enneagram, Big Five).
- **Aturan Omission:** Hilangkan bagian sensitif sepenuhnya tanpa meninggalkan placeholder generik.`,

  'opus-reasoning-effort': `# Modulasi Kedalaman Berpikir (/opus-reasoning-effort)
Kontrol kedalaman berpikir adaptif (\`<antml:reasoning_effort> 10-100\`):
- **Effort Cepat (20-30):** Untuk tugas rutin (convert format, download media, sapaan kasual).
- **Effort Standar (50-65):** Untuk rangkuman, eksplorasi data, dan browsing terarah.
- **Effort Maksimal (80-100):** Untuk refactoring kode, audit sistem, SEO audit, investigasi bug, dan riset multi-hop.`,

  'opus-dignified-prose': `# Komunikasi Berwibawa & Tanpa Basa-Basi (/opus-dignified-prose)
Standar interaksi profesional Opus 5:
- **Accountability Without Self-Abasement:** Akui kekeliruan secara lugas, fokus langsung ke perbaikan, tanpa permintaan maaf berulang-ulang yang melemahkan wibawa AI.
- **Direct Prose & Zero Fluff:** Eliminasi pembuka klise (*"Tentu, dengan senang hati saya akan..."*) dan penutup berulang (*"Semoga membantu ya!"*).
- **Constructive Sincerity:** Berani memberikan pandangan alternatif objektif demi kebaikan pengguna.`
};

async function getClaudeOpus5Settings() {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    return {
      ...DEFAULT_CLAUDE_OPUS_5_SETTINGS,
      ...(data.plugin_settings?.claude_opus_5 || {})
    };
  } catch (e) {
    return { ...DEFAULT_CLAUDE_OPUS_5_SETTINGS };
  }
}

async function saveClaudeOpus5Settings(newSettings) {
  try {
    const data = await chrome.storage.local.get(['plugin_settings']);
    const allPluginSettings = data.plugin_settings || {};
    
    // Mutual Exclusivity: If Claude Opus 5 is turned ON, Claude Fable 5 must be turned OFF!
    if (newSettings.enabled) {
      allPluginSettings.claude_fable = {
        ...(allPluginSettings.claude_fable || {}),
        enabled: false
      };
    }

    allPluginSettings.claude_opus_5 = {
      ...DEFAULT_CLAUDE_OPUS_5_SETTINGS,
      ...(allPluginSettings.claude_opus_5 || {}),
      ...newSettings
    };

    await chrome.storage.local.set({ plugin_settings: allPluginSettings });
    updateClaudeOpus5UI();

    // Trigger update on Claude Fable UI if active on page
    if (typeof updateClaudeFableUI === 'function') {
      updateClaudeFableUI();
    }
  } catch (e) {
    console.error('[ClaudeOpus5] Save error:', e);
  }
}

async function updateClaudeOpus5UI() {
  const settings = await getClaudeOpus5Settings();

  // Update Card Badge & Toggle
  const statusText = document.getElementById('plugin-claude-opus-5-status-text');
  const cardBadge = document.getElementById('plugin-claude-opus-5-card-badge');
  const toggle = document.getElementById('plugin-claude-opus-5-toggle');

  if (toggle) toggle.checked = !!settings.enabled;

  if (statusText) {
    const modeLabel = settings.mode === 'truth_seeking' ? 'Truth-Seeking' : 
                      settings.mode === 'standard' ? 'Standard' : 'Deep Analytical';
    statusText.textContent = settings.enabled ? `● Aktif (${modeLabel})` : '○ Nonaktif';
    statusText.className = settings.enabled ? 'plugin-status-text active' : 'plugin-status-text inactive';
    statusText.style.color = settings.enabled ? '#ffedd5' : '#94a3b8';
  }

  if (cardBadge) {
    if (settings.enabled) {
      cardBadge.textContent = `● Aktif (${(settings.mode || 'deep_analytical').toUpperCase()})`;
      cardBadge.className = 'plugin-badge active';
    } else {
      cardBadge.textContent = '○ Nonaktif';
      cardBadge.className = 'plugin-badge inactive';
    }
  }

  // Update Modal Fields
  const modeBtns = document.querySelectorAll('.opus-mode-btn');
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === settings.mode);
  });

  const effortSlider = document.getElementById('opus-effort-slider');
  const effortVal = document.getElementById('opus-effort-val');
  if (effortSlider) effortSlider.value = settings.reasoningEffort || 75;
  if (effortVal) effortVal.textContent = settings.reasoningEffort || 75;

  const optFilesystem = document.getElementById('opus-opt-filesystem');
  const optForbidden = document.getElementById('opus-opt-forbidden');
  const optArtifacts = document.getElementById('opus-opt-artifacts');
  const optDignity = document.getElementById('opus-opt-dignity');
  const optPrivacy = document.getElementById('opus-opt-privacy');

  if (optFilesystem) optFilesystem.checked = settings.enableMemoryFilesystem !== false;
  if (optForbidden) optForbidden.checked = settings.enableForbiddenPhrases !== false;
  if (optArtifacts) optArtifacts.checked = settings.enableArtifactArchitecture !== false;
  if (optDignity) optDignity.checked = settings.enableHighDignityTone !== false;
  if (optPrivacy) optPrivacy.checked = settings.enablePrivacyGuardrails !== false;

  if (typeof updateGlobalPluginsBadge === 'function') {
    updateGlobalPluginsBadge();
  }
}

function renderClaudeOpus5Doc(skillKey) {
  const viewer = document.getElementById('opus-doc-viewer');
  if (!viewer) return;
  const doc = CLAUDE_OPUS_5_SKILL_DOCS[skillKey] || CLAUDE_OPUS_5_SKILL_DOCS['claude-opus-5'];
  
  if (typeof marked !== 'undefined') {
    viewer.innerHTML = marked.parse(doc);
  } else {
    viewer.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #ffedd5;">${doc}</pre>`;
  }
}

function openClaudeOpus5Modal() {
  const modal = document.getElementById('modal-claude-opus-5-config');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    updateClaudeOpus5UI();
    renderClaudeOpus5Doc('claude-opus-5');
  }
}

function closeClaudeOpus5Modal() {
  const modal = document.getElementById('modal-claude-opus-5-config');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function initClaudeOpus5Plugin() {
  // 1. Modal Triggers
  const btnOpen = document.getElementById('btn-config-claude-opus-5');
  if (btnOpen) {
    btnOpen.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openClaudeOpus5Modal();
    });
  }

  const btnClose = document.getElementById('btn-close-claude-opus-5-modal');
  const btnCancel = document.getElementById('btn-cancel-claude-opus-5-modal');
  if (btnClose) btnClose.addEventListener('click', closeClaudeOpus5Modal);
  if (btnCancel) btnCancel.addEventListener('click', closeClaudeOpus5Modal);

  // 2. Card Toggle with Mutual Exclusivity
  const toggle = document.getElementById('plugin-claude-opus-5-toggle');
  if (toggle) {
    toggle.addEventListener('change', async () => {
      await saveClaudeOpus5Settings({ enabled: toggle.checked });
    });
  }

  // 3. Mode Buttons
  const modeBtns = document.querySelectorAll('.opus-mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 4. Effort Slider
  const effortSlider = document.getElementById('opus-effort-slider');
  const effortVal = document.getElementById('opus-effort-val');
  if (effortSlider && effortVal) {
    effortSlider.addEventListener('input', () => {
      effortVal.textContent = effortSlider.value;
    });
  }

  // 5. Doc Tabs
  const docTabs = document.querySelectorAll('.opus-doc-tab');
  docTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      docTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const skill = tab.getAttribute('data-skill');
      renderClaudeOpus5Doc(skill);
    });
  });

  // 6. Save Button
  const btnSave = document.getElementById('btn-save-claude-opus-5-modal');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const activeModeBtn = document.querySelector('.opus-mode-btn.active');
      const mode = activeModeBtn ? activeModeBtn.getAttribute('data-mode') : 'deep_analytical';
      const reasoningEffort = effortSlider ? parseInt(effortSlider.value, 10) : 75;

      const optFilesystem = document.getElementById('opus-opt-filesystem');
      const optForbidden = document.getElementById('opus-opt-forbidden');
      const optArtifacts = document.getElementById('opus-opt-artifacts');
      const optDignity = document.getElementById('opus-opt-dignity');
      const optPrivacy = document.getElementById('opus-opt-privacy');

      const newSettings = {
        mode,
        reasoningEffort,
        enableMemoryFilesystem: optFilesystem ? optFilesystem.checked : true,
        enableForbiddenPhrases: optForbidden ? optForbidden.checked : true,
        enableArtifactArchitecture: optArtifacts ? optArtifacts.checked : true,
        enableHighDignityTone: optDignity ? optDignity.checked : true,
        enablePrivacyGuardrails: optPrivacy ? optPrivacy.checked : true
      };

      await saveClaudeOpus5Settings(newSettings);
      closeClaudeOpus5Modal();
    });
  }

  // Document Click Delegation Fallback
  document.addEventListener('click', (e) => {
    const configBtn = e.target.closest('#btn-config-claude-opus-5');
    if (configBtn) {
      e.preventDefault();
      openClaudeOpus5Modal();
    }
  });

  updateClaudeOpus5UI();
}

// Auto Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClaudeOpus5Plugin);
} else {
  initClaudeOpus5Plugin();
}
