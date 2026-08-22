// =========================================================================
// Browser Agent - Options / Full-Screen Settings Page Logic
// Multi-Agent, Skills, Memories & AI Generator Architecture
// =========================================================================

let config = {
  preset: "gemini",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: "",
  model: "gemini-2.5-flash",
  imageModel: "dall-e-3",
  temperature: 0.2,
  maxTokens: 4096,
  models: [],
  customModels: []
};

let agentsList = [];
let skillsList = [];
let memoriesList = [];
let activeAgentId = null;
let nativePort = null;

const PRESET_CONFIGS = {
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    imageModel: "imagen-3.0-generate-002",
    temp: 0.2
  },
  openai: {
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o",
    imageModel: "dall-e-3",
    temp: 0.2
  },
  claude: {
    endpoint: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-3.5-sonnet",
    imageModel: "black-forest-labs/flux-1-schnell",
    temp: 0.2
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.5-flash",
    imageModel: "black-forest-labs/flux-1-schnell",
    temp: 0.2
  },
  ollama: {
    endpoint: "http://localhost:11434/v1",
    model: "llama3.3",
    imageModel: "flux",
    temp: 0.2
  },
  "9router": {
    endpoint: "http://localhost:20128/v1",
    model: "ag/gemini-3.7-flash-high",
    imageModel: "ag/gemini-3.1-flash-image",
    temp: 0.2
  },
  deepseek: {
    endpoint: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    imageModel: "dall-e-3",
    temp: 0.2
  },
  lmstudio: {
    endpoint: "http://localhost:1234/v1",
    model: "local-model",
    imageModel: "flux",
    temp: 0.2
  },
  qwen: {
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-max",
    imageModel: "flux",
    temp: 0.2
  },
  moonshot: {
    endpoint: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    imageModel: "dall-e-3",
    temp: 0.2
  },
  copilot: {
    endpoint: "https://api.githubcopilot.com",
    model: "gpt-4o",
    imageModel: "dall-e-3",
    temp: 0.2
  },
  custom: {
    endpoint: "",
    model: "",
    imageModel: "dall-e-3",
    temp: 0.2
  }
};

const DEFAULT_MODELS_BY_PRESET = {
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" }
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "o1", name: "o1" },
    { id: "o3-mini", name: "o3-mini" }
  ],
  claude: [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet" },
    { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku" },
    { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" }
  ],
  openrouter: [
    { id: "google/gemini-2.5-flash", name: "Gemini Flash" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1" }
  ],
  ollama: [
    { id: "llama3.3", name: "Llama 3.3" },
    { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder" },
    { id: "deepseek-r1:8b", name: "DeepSeek R1 8B" },
    { id: "mistral", name: "Mistral" }
  ],
  "9router": [
    { id: "ag/gemini-3.7-flash-high", name: "Gemini 3.7 Flash High" },
    { id: "ag/gemini-3.7-flash", name: "Gemini 3.7 Flash" },
    { id: "ag/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "ag/claude-3.7-sonnet", name: "Claude 3.7 Sonnet" }
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek V3" },
    { id: "deepseek-reasoner", name: "DeepSeek R1" }
  ],
  lmstudio: [
    { id: "local-model", name: "Local LLM Model" }
  ],
  qwen: [
    { id: "qwen-max", name: "Qwen Max" },
    { id: "qwen-plus", name: "Qwen Plus" },
    { id: "qwen-turbo", name: "Qwen Turbo" }
  ],
  moonshot: [
    { id: "moonshot-v1-8k", name: "Kimi 8k" },
    { id: "moonshot-v1-32k", name: "Kimi 32k" },
    { id: "moonshot-v1-128k", name: "Kimi 128k" }
  ],
  copilot: [
    { id: "gpt-4o", name: "Copilot GPT-4o" },
    { id: "claude-3.5-sonnet", name: "Copilot Claude 3.5" }
  ],
  custom: []
};

// Elements - AI Config
const settingEndpoint = document.getElementById('setting-endpoint');
const settingApiKey = document.getElementById('setting-apikey');
const settingImageModel = document.getElementById('setting-image-model');
const settingTemp = document.getElementById('setting-temp');
const tempValDisplay = document.getElementById('temp-val-display');
const settingMaxTokens = document.getElementById('setting-max-tokens');
const modelsRowsContainer = document.getElementById('settings-models-rows');
const btnAddRow = document.getElementById('btn-add-model-row');
const btnSaveHeader = document.getElementById('btn-save-header');
const btnToggleApiKey = document.getElementById('btn-toggle-apikey');
const saveToast = document.getElementById('save-toast');

// Elements - Navigation
const navTabs = document.querySelectorAll('.nav-tab, .sidebar-tab-btn');
const tabViews = {
  ai: document.getElementById('tab-view-ai'),
  agents: document.getElementById('tab-view-agents'),
  skills: document.getElementById('tab-view-skills'),
  memories: document.getElementById('tab-view-memories')
};

// Elements - Modals
const modalAgent = document.getElementById('modal-agent');
const modalSkill = document.getElementById('modal-skill');
const modalMemory = document.getElementById('modal-memory');

// =========================================================================
// Native Messaging Host Bridge RPC
// =========================================================================
let nativeRpcCallbacks = new Map();
let nativeReqId = 1;

function connectNativeHost() {
  try {
    nativePort = chrome.runtime.connectNative('com.antigravity.chrome.agent');
    nativePort.onMessage.addListener((msg) => {
      if (msg.id && nativeRpcCallbacks.has(msg.id)) {
        const { resolve, reject } = nativeRpcCallbacks.get(msg.id);
        nativeRpcCallbacks.delete(msg.id);
        if (msg.status === 'ok') {
          resolve(msg);
        } else {
          reject(new Error(msg.error || 'Native RPC failed'));
        }
      }
    });

    nativePort.onDisconnect.addListener(() => {
      const lastErr = chrome.runtime.lastError;
      nativePort = null;
      for (const [id, cb] of nativeRpcCallbacks.entries()) {
        cb.reject(new Error(lastErr?.message || "Native host disconnected"));
      }
      nativeRpcCallbacks.clear();
      updateBridgeUI(false, "Terputus", "Native host offline");
    });
  } catch (e) {
    nativePort = null;
  }
}

function sendNativeRpc(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!nativePort) {
      connectNativeHost();
    }
    if (!nativePort) {
      return reject(new Error("Native PC Bridge is offline"));
    }
    const id = nativeReqId++;
    nativeRpcCallbacks.set(id, { resolve, reject });
    setTimeout(() => {
      if (nativeRpcCallbacks.has(id)) {
        nativeRpcCallbacks.delete(id);
        reject(new Error(`RPC action '${action}' timed out`));
      }
    }, 15000);
    nativePort.postMessage({ id, action, ...params });
  });
}

// =========================================================================
// Initial Load & Config Management
// =========================================================================
async function init() {
  connectNativeHost();
  await loadConfig();
  await loadAllData();
  setupEventListeners();
  checkPCBridgeStatus();
}

async function loadConfig() {
  const res = await chrome.storage.local.get(['browser_agent_config', 'active_agent_id']);
  if (res && res.browser_agent_config) {
    config = { ...config, ...res.browser_agent_config };
  }
  if (res && res.active_agent_id) {
    activeAgentId = res.active_agent_id;
  }
  applyConfigToUI();
  renderModelsRows();
}

function normalizeModelItem(item) {
  if (!item) return { id: "", name: "" };
  if (typeof item === 'string') {
    const clean = item.trim();
    let shortName = clean;
    if (clean.startsWith('ag/')) shortName = clean.replace('ag/', '');
    else if (clean.startsWith('google/')) shortName = clean.replace('google/', '');
    else if (clean.startsWith('anthropic/')) shortName = clean.replace('anthropic/', '');
    else if (clean.startsWith('openai/')) shortName = clean.replace('openai/', '');
    return { id: clean, name: shortName || clean };
  }
  const id = (item.id || item.model || '').trim();
  const name = (item.name || item.label || id).trim();
  return { id, name: name || id };
}

function getModelsList(includeEmpty = false) {
  let raw = [];
  if (Array.isArray(config.models) && config.models.length > 0) {
    raw = config.models;
  } else if (Array.isArray(config.customModels) && config.customModels.length > 0) {
    raw = config.customModels;
  } else {
    const presetDefaults = DEFAULT_MODELS_BY_PRESET[config.preset] || [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
    ];
    raw = presetDefaults;
  }

  const normalized = raw.map(normalizeModelItem);
  if (includeEmpty) return normalized;
  return normalized.filter(m => m.id.length > 0);
}

function applyConfigToUI() {
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-preset') === config.preset);
  });

  const displayChoice = document.getElementById('display-active-model-choice');
  if (displayChoice) {
    const models = getModelsList();
    if (models.length > 0) {
      displayChoice.textContent = `${models[0].name || models[0].id} (Primary #1)`;
    } else {
      displayChoice.textContent = config.model || "Auto (Rotating Priority)";
    }
  }

  if (settingEndpoint) settingEndpoint.value = config.endpoint || "";
  if (settingApiKey) settingApiKey.value = config.apiKey || "";
  if (settingImageModel) settingImageModel.value = config.imageModel || "dall-e-3";
  if (settingTemp) {
    settingTemp.value = config.temperature ?? 0.2;
    if (tempValDisplay) tempValDisplay.textContent = Number(config.temperature ?? 0.2).toFixed(2);
  }
  if (settingMaxTokens) settingMaxTokens.value = config.maxTokens || 4096;
}

function renderModelsRows() {
  if (!modelsRowsContainer) return;
  modelsRowsContainer.innerHTML = '';

  const models = getModelsList(true);
  models.forEach((mObj, index) => {
    const isPrimary = (index === 0);
    const priorityBadgeText = isPrimary ? '#1 (Utama)' : `#${index + 1} (Cadangan ${index})`;

    const row = document.createElement('div');
    row.className = `model-row-card ${isPrimary ? 'is-primary' : ''}`;
    row.innerHTML = `
      <span class="model-priority-badge ${isPrimary ? 'priority-primary' : ''}" title="${isPrimary ? 'Model Prioritas #1 (Utama)' : `Model Cadangan #${index}`}">${priorityBadgeText}</span>
      <div class="model-inputs-box">
        <input type="text" class="model-input-name" value="${escapeHtml(mObj.name)}" placeholder="Nama UI (e.g. Flash Low)">
        <input type="text" class="model-input-id" value="${escapeHtml(mObj.id)}" placeholder="ID Model API (e.g. ag/gemini-3.7-flash-low)">
      </div>
      <div class="model-actions-group">
        <button type="button" class="btn-model-reorder btn-model-move-up" title="Naikkan Prioritas" ${index === 0 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button type="button" class="btn-model-reorder btn-model-move-down" title="Turunkan Prioritas" ${index === models.length - 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button type="button" class="btn-model-delete" title="Hapus model" ${models.length <= 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;

    const nameInput = row.querySelector('.model-input-name');
    const idInput = row.querySelector('.model-input-id');

    const updateCurrentModel = async () => {
      const idVal = idInput.value.trim();
      const nameVal = nameInput.value.trim() || idVal;
      models[index] = { id: idVal, name: nameVal };
      if (index === 0 && config.selectedModelChoice !== "auto") {
        config.model = idVal;
      }
      config.models = [...models];
      await chrome.storage.local.set({ browser_agent_config: config, active_agent_id: activeAgentId });
    };

    nameInput.addEventListener('change', async () => {
      await updateCurrentModel();
      renderModelsRows();
    });

    idInput.addEventListener('change', async () => {
      await updateCurrentModel();
      renderModelsRows();
    });

    nameInput.addEventListener('input', () => {
      models[index].name = nameInput.value.trim();
      config.models = models;
    });

    idInput.addEventListener('input', () => {
      models[index].id = idInput.value.trim();
      if (!models[index].name) {
        models[index].name = idInput.value.trim();
      }
      if (index === 0 && config.selectedModelChoice !== "auto") {
        config.model = models[index].id;
      }
      config.models = models;
    });

    const moveUpBtn = row.querySelector('.btn-model-move-up');
    moveUpBtn.addEventListener('click', async () => {
      if (index > 0) {
        const temp = models[index];
        models[index] = models[index - 1];
        models[index - 1] = temp;
        config.models = [...models];
        if (config.selectedModelChoice !== "auto") config.model = models[0].id;
        await chrome.storage.local.set({ browser_agent_config: config, active_agent_id: activeAgentId });
        renderModelsRows();
      }
    });

    const moveDownBtn = row.querySelector('.btn-model-move-down');
    moveDownBtn.addEventListener('click', async () => {
      if (index < models.length - 1) {
        const temp = models[index];
        models[index] = models[index + 1];
        models[index + 1] = temp;
        config.models = [...models];
        if (config.selectedModelChoice !== "auto") config.model = models[0].id;
        await chrome.storage.local.set({ browser_agent_config: config, active_agent_id: activeAgentId });
        renderModelsRows();
      }
    });

    const removeBtn = row.querySelector('.btn-model-delete');
    removeBtn.addEventListener('click', async () => {
      if (models.length <= 1) {
        alert("Minimal harus ada satu model.");
        return;
      }
      models.splice(index, 1);
      if (config.selectedModelChoice !== "auto") config.model = models[0].id;
      config.models = [...models];
      await chrome.storage.local.set({ browser_agent_config: config, active_agent_id: activeAgentId });
      renderModelsRows();
    });

    modelsRowsContainer.appendChild(row);
  });
}

async function saveAllConfig() {
  const models = [];
  document.querySelectorAll('.model-row-card').forEach(row => {
    const idInput = row.querySelector('.model-input-id');
    const nameInput = row.querySelector('.model-input-name');
    const idVal = idInput ? idInput.value.trim() : "";
    const nameVal = nameInput ? nameInput.value.trim() : "";
    if (idVal) {
      models.push({ id: idVal, name: nameVal || idVal });
    }
  });

  config.endpoint = settingEndpoint ? settingEndpoint.value.trim() : config.endpoint;
  config.apiKey = settingApiKey ? settingApiKey.value.trim() : config.apiKey;
  config.imageModel = settingImageModel ? settingImageModel.value.trim() : config.imageModel;
  config.temperature = settingTemp ? parseFloat(settingTemp.value) : config.temperature;
  config.maxTokens = settingMaxTokens ? parseInt(settingMaxTokens.value, 10) : config.maxTokens;
  config.models = models.length > 0 ? models : [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
  ];
  if (config.selectedModelChoice !== "auto" && config.selectedModelChoice) {
    config.model = config.selectedModelChoice;
    config.autoRotateModel = false;
  } else {
    config.selectedModelChoice = "auto";
    config.model = "auto";
    config.autoRotateModel = true;
  }

  await chrome.storage.local.set({ browser_agent_config: config, active_agent_id: activeAgentId });

  showToast();
}

function showToast() {
  if (!saveToast) return;
  saveToast.style.display = 'flex';
  setTimeout(() => { saveToast.style.display = 'none'; }, 3000);
}

// =========================================================================
// Multi-Agent, Skills & Memories Data Synchronization
// =========================================================================
// =========================================================================
// Multi-Agent, Skills & Memories Data Synchronization
// =========================================================================
// Default Initial Data (Multi-Agent, Skills & Memories)
// =========================================================================
const MASTER_AGENT = {
  id: "master_agent",
  name: "Master Agent (Supreme Orchestrator)",
  description: "Koordinator utama dan direktur ekosistem AI. Menerima instruksi pengguna, mendelegasikan tugas ke sub-agent (Deep Web Researcher, Coding & System Engineer, dll), mengaudit dan memverifikasi hasil kerja, serta menyajikan laporan final yang komprehensif dan profesional ke pengguna.",
  model: "",
  skills: [
    "skill_screenshot_walkthrough",
    "skill_dashboard_preflight",
    "skill_browser_wait",
    "skill_extract_data",
    "skill_fill_form",
    "skill_summarize_page",
    "skill_deep_research",
    "skill_save_page",
    "skill_gaya_komunikasi"
  ],
  memories: [
    "mem_user_guidelines",
    "mem_response_normal"
  ],
  is_boss: true,
  is_default: true,
  content: `# 👑 MASTER AGENT (SUPREME ORCHESTRATOR & SYSTEM COORDINATOR)

Anda adalah **Master Agent**, direktur utama dan koordinator tertinggi dari seluruh sub-agent AI dalam sistem ini.

## 🎯 1. PERAN & TANGGUNG JAWAB UTAMA:
1. **Frontline Communicator**: Anda adalah pihak yang berkomunikasi langsung dengan pengguna secara profesional, cerdas, sigap, dan solutif.
2. **Task Delegation & Swarm Command**: 
   - Analisis prompt pengguna dan tentukan sub-agent spesialis yang harus bekerja:
     - 🔍 **Deep Web Researcher**: Ditugaskan mencari jurnal, riset data, scraping web, dan menemukan tautan unduhan.
     - 💻 **Coding & System Engineer**: Ditugaskan mengeksekusi terminal command (curl, wget, python, file operations) dan menyimpan berkas ke lokal PC ($HOME/Downloads/).
     - 🌐 **General Browser Assistant**: Ditugaskan mengontrol browser, mengisi formulir, memutar video/media, dan mengelola tab.
3. **Strict Quality Assurance & Audit**:
   - Setelah sub-agent mengeksekusi tools, **Master Agent WAJIB mengaudit dan memeriksa hasil kerja mereka**:
     - Apakah sub-agent berhasil mengunduh file yang diminta?
     - Apakah hasil pencarian akurat dan tidak ada yang terlewat?
     - Jika sub-agent berhenti sebelum selesai, malas, atau menghasilkan teks kosong, **Master Agent WAJIB mengevaluasi dan mengambil alih tindakan untuk menyelesaikannya sampai tuntas!**
4. **Final Comprehensive Delivery**:
   - Master Agent menyajikan laporan akhir yang lengkap, terstruktur rapi, dan mudah dipahami dalam format Markdown:
     - 📊 Rangkuman dan jumlah hasil yang ditemukan/dikerjakan.
     - 📄 Daftar judul, poin analisis penting, dan temuan utama.
     - 📁 Path lokasi file di PC lokal secara presisi (misal: \`/home/arya/Downloads/<nama_file>.pdf\`) beserta petunjuk cara membukanya.

DILARANG KERAS memberikan balasan singkat tanpa hasil. Pastikan seluruh pekerjaan sub-agent telah selesai 100% sebelum melapor ke pengguna!`
};

const DEFAULT_AGENTS = [
  MASTER_AGENT,
  {
    id: "web_researcher_agent",
    name: "Deep Web Researcher",
    description: "Sub-agent spesialis riset multi-sumber mendalam, pencarian jurnal/paper, data scraping, dan fact-checking",
    model: "",
    skills: [
      "skill_deep_research",
      "skill_extract_data",
      "skill_summarize_page",
      "skill_compare_prices",
      "skill_find_alternatives",
      "skill_monitor_page",
      "skill_save_page"
    ],
    memories: [
      "mem_user_guidelines",
      "mem_academic_journal_analyst",
      "mem_data_scraping_specialist",
      "mem_response_medium"
    ],
    is_default: false,
    content: `You are a Deep Web Researcher working under Master Agent. Your role is to perform thorough investigations, cross-reference multiple sources, search academic repositories/journals, inspect web pages with snapshots, extract high-value insights, and report findings cleanly to Master Agent.`
  },
  {
    id: "coding_engineer_agent",
    name: "Coding & System Engineer",
    description: "Sub-agent spesialis koding, debugging sistem, terminal shell execution, dan manipulasi berkas lokal PC",
    model: "",
    skills: [
      "ask_internal",
      "skill_extract_data",
      "skill_save_page",
      "skill_screenshot_walkthrough",
      "skill_gaya_komunikasi"
    ],
    memories: [
      "mem_user_guidelines",
      "mem_root_cause_debugger",
      "mem_response_terse"
    ],
    is_default: false,
    content: `You are a Senior Coding & System Engineer working under Master Agent. Analyze codebases systematically, execute terminal commands safely via local_run_command, manage local files and folders (e.g. ~/Downloads), cite precise file paths, and report results cleanly to Master Agent.`
  },
  {
    id: "default_agent",
    name: "General Browser Assistant & Control",
    description: "Sub-agent spesialis kontrol browser tingkat tinggi: navigasi, snapshot, klik akurat, form input, jeda render browser_wait untuk internet lambat, dan kontrol media",
    model: "",
    skills: [
      "skill_dashboard_preflight",
      "skill_browser_wait",
      "skill_extract_data",
      "skill_fill_form",
      "skill_screenshot_walkthrough",
      "skill_organize_tabs",
      "skill_compare_prices",
      "skill_find_alternatives",
      "skill_save_page",
      "skill_monitor_page",
      "skill_read_later",
      "skill_manage_bookmarks",
      "skill_summarize_page",
      "skill_deep_research",
      "skill_gaya_komunikasi"
    ],
    memories: ["mem_user_guidelines", "mem_response_terse"],
    is_default: false,
    content: `# 🌐 GENERAL BROWSER ASSISTANT & CONTROL (EXPERT BROWSER WORKER)

You are General Browser Assistant & Control working under Master Agent.
You specialize in controlling the web browser with 100% precision and handling slow networks/rendering delays.

## Core Capabilities & Tools
1. **Dashboard Pre-Flight & Deep Table Extraction (browser_extract_table)**:
   - Always run pre-flight checks: set Date Range to 'Masa Pakai / Lifetime', sort by Results, and call \`browser_extract_table({ auto_scroll: true, max_rows: 200 })\` to capture all 100+ campaigns!
2. **Handling Slow Internet & SPA Loading (browser_wait)**:
   - Always call \`browser_wait({ duration_seconds, reason })\` when a page, dashboard (e.g. Meta Ads Manager), modal popup, or form is still loading or rendering before clicking/typing!
3. **Precision Navigation & Tabs**:
   - \`browser_list_tabs()\`, \`browser_switch_tab({ tabId })\`, \`browser_create_tab({ url })\`, \`browser_navigate({ url })\`.
4. **DOM Inspection & Clicks**:
   - \`browser_snapshot()\` for interactive AX tree.
   - \`browser_click({ backendNodeId })\` with deep composed event dispatch.
   - \`browser_type({ backendNodeId, text, pressEnter })\` for input.
   - \`browser_scroll({ scrollX, scrollY })\`, \`browser_press_key({ key })\`.
5. **Visual Walkthrough & Media**:
   - \`browser_screenshot()\` for walkthrough verification.
   - \`browser_control_media({ action })\` for play/pause/mute.

## Persona & Communication Style
- GAYA BAHASA: Sangat singkat, padat, to the point (Terse Caveman Style). Tanpa basa-basi/fluff.
- Selalu laporkan tindakan teknis secara presisi dan ringkas kepada Master Agent.`
  }
];

const DEFAULT_SKILLS = [
  {
    "id": "skill_dashboard_preflight",
    "name": "Dashboard Pre-Flight & Deep Table Extractor",
    "description": "SOP audit dashboard data: set rentang tanggal Masa Pakai (Lifetime), sort kolom Hasil (Results), ekstraksi tabel penuh dengan browser_extract_table, dan verifikasi total baris data 100% tuntas.",
    "content": "# Dashboard Pre-Flight & Deep Table Extraction SOP\n\nSOP wajib untuk menganalisis dashboard web app (Meta Ads Manager, Analytics, CRM) tanpa terpotong pagination.\n\n## 3 Langkah Wajib:\n1. **Pre-Flight Setup**: Set rentang tanggal ke 'Masa Pakai (Lifetime)' dan klik header kolom sortir ('Hasil / Results ↓').\n2. **Deep Table Extraction**: Panggil `browser_extract_table({ auto_scroll: true, max_rows: 200 })` untuk menyedot seluruh 100+ baris data.\n3. **Audit Total Baris**: Cocokkan total baris tertera di dashboard vs total data yang dianalisis sebelum membuat kesimpulan."
  },
  {
    "id": "skill_browser_wait",
    "name": "Browser Wait & Anti-Miss Click",
    "description": "SOP jeda tunggu pemuatan halaman (browser_wait) saat internet lambat, render modal popup asinkron, atau dashboard SPA berat untuk mencegah miss click.",
    "content": "# Browser Wait & Anti-Miss Click SOP\n\nSOP penanganan koneksi internet lambat, jeda render modal SPA dengan `browser_wait`, dan eksekusi kontrol browser tanpa meleset.\n\n## Kapan Digunakan\n- Membuka halaman web baru atau berpindah tab (`browser_switch_tab`, `browser_navigate`).\n- Muncul dialog modal / popup formulir asinkron (misal: 'Pilih format kampanye' di Meta Ads Manager).\n- Jaringan internet mengalami buffering atau latensi tinggi.\n\n## Langkah Eksekusi\n1. Panggil `browser_wait({ duration_seconds: 2, reason: \"Menunggu render DOM/modal\" })`.\n2. Lakukan `browser_snapshot()` untuk memeriksa elemen interaktif terbaru.\n3. Eksekusi `browser_click` atau `browser_type` pada `backendNodeId` yang valid.\n4. Verifikasi visual dengan `browser_screenshot()`."
  },
  {
    "id": "skill_summarize_page",
    "name": "Summarize Page",
    "description": "Extract and summarize the main content of the current web page into structured markdown. Use when the user asks to summarize, digest, or get the gist of a page.",
    "content": "# Summarize Page\n\n## When to Use\n\nActivate when the user asks to summarize, digest, condense, or get the key points from the current page or a specific URL.\n\n## Steps\n\n1. If the user provided a URL, use `navigate_page` to go there first.\n2. Use `get_page_content` to extract the full text content of the page.\n3. Identify the page type (article, documentation, product page, forum thread, etc.) and adapt the summary format accordingly.\n4. Produce a structured markdown summary:\n\n### Output Format\n\n```\n## Summary: [Page Title]\n\n**Source:** [URL]\n**Type:** [article/docs/product/forum/etc.]\n\n### Key Points\n- [3-5 bullet points capturing the main ideas]\n\n### Details\n[2-3 paragraphs expanding on the most important content]\n\n### Takeaways\n- [Actionable items or conclusions, if applicable]\n```\n\n## Tips\n\n- For long pages, focus on headings, first paragraphs of sections, and any emphasized text.\n- For product pages, emphasize specs, pricing, and reviews.\n- For news articles, lead with the who/what/when/where/why.\n- If the page content is behind a paywall or login, inform the user rather than summarizing partial content."
  },
  {
    "id": "skill_deep_research",
    "name": "Deep Research",
    "description": "Research a topic across multiple sources using parallel tabs, save raw content and findings to files, then produce an HTML report and PDF. Use when the user asks to research, investigate, or gather information on a topic.",
    "content": "# Deep Research\n\nEnd-to-end research workflow that searches the web in parallel tabs, persists raw content and notes to disk as it goes (instead of holding everything in memory), synthesizes findings, and delivers a polished HTML report plus PDF.\n\n## When to Apply\n\nActivate when the user asks to research a topic, compare information across sources, investigate something thoroughly, or compile findings from the web.\n\n## Workflow\n\n### Phase 1 — Clarify & Plan\n\n1. **Clarify the research question.** If the query is vague, ask the user for specifics: scope, depth, preferred sources, and where to save output (default: `~/Downloads/research-<topic-slug>/`).\n2. **Plan search queries.** Break the topic into 3–5 search angles. Example for \"best standing desks\":\n   - `best standing desks 2025 reviews`\n   - `standing desk comparison reddit`\n   - `ergonomic standing desk features`\n   - `standing desk health benefits studies`\n3. **Create the output directory.** Use `evaluate_script` to create the target folder structure:\n   ```\n   research-<topic-slug>/\n   ├── sources/          ← raw page content per source\n   ├── findings.md       ← running synthesis\n   ├── report.html       ← final HTML report\n   └── report.pdf        ← final PDF report\n   ```\n\n### Phase 2 — Parallel Research & Persistence\n\nFor **each** search query, open a parallel research tab and persist results to disk immediately:\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Open tab | `new_hidden_page` | Opens a background tab so research doesn't disrupt the user |\n| Search | `navigate_page` | Navigate to `https://www.google.com/search?q=<encoded-query>` (or the user's preferred search engine) |\n| Pick results | `get_page_content` / `get_page_links` | Read the search results page; identify the 2–3 most relevant links |\n| Visit source | `navigate_page` | Navigate to each selected result |\n| Extract content | `get_page_content` | Pull the full page text |\n| **Save raw content** | `evaluate_script` | Write a markdown file to `sources/<n>-<slug>.md` containing the page title, source URL, extraction date, and full text. **Always include the source URL** so every fact is traceable. |\n| Close tab | `close_page` | Free resources after extraction |\n\nRepeat across all search angles. Run multiple tabs concurrently where possible.\n\n#### Source File Format (`sources/<n>-<slug>.md`)\n\n```markdown\n# <Page Title>\n\n- **URL:** <source-url>\n- **Retrieved:** <date-time>\n\n---\n\n<extracted page content>\n```\n\n### Phase 3 — Synthesize Findings\n\nAfter all sources are saved:\n\n1. **Read each source file** and extract key facts, data points, expert opinions, and areas of agreement or disagreement.\n2. **Write `findings.md`** in the output directory using the format below. Every claim must reference the source file and URL it came from.\n3. Continuously append to `findings.md` as you process each source — do not hold all content in memory.\n\n#### Findings File Format (`findings.md`)\n\n```markdown\n# Research Findings: <Topic>\n\n**Date:** <current date>\n**Sources consulted:** <count>\n**Output directory:** <path>\n\n## Key Findings\n\n1. **<Finding title>**\n   <Detail with supporting evidence>\n   _Source: [<source name>](<url>) — sources/<n>-<slug>.md_\n\n2. **<Finding title>**\n   ...\n\n## Source Summary\n\n| # | Source | URL | Key Insight | Credibility |\n|---|--------|-----|-------------|-------------|\n| 1 | <name> | <url> | <insight> | high / med / low |\n\n## Agreements & Disagreements\n\n- **Consensus:** ...\n- **Conflicting views:** ...\n\n## Conclusion\n\n<Synthesis of findings with actionable recommendation>\n```\n\n### Phase 4 — HTML Report\n\nGenerate a self-contained `report.html` in the output directory with the following requirements:\n\n| Requirement | Detail |\n|-------------|--------|\n| **Theme** | Light background (`#ffffff`), clean sans-serif typography, generous whitespace |\n| **Sections** | Title banner, executive summary, key findings (numbered cards), source table, conclusion |\n| **Source links** | Every finding must hyperlink to its original source URL. The source table must include clickable links. |\n| **Self-contained** | All styles inline or in a `<style>` block — no external CSS or JS dependencies |\n| **Responsive** | Readable on both desktop and mobile viewports |\n| **Footer** | \"Generated by BrowserOS Deep Research\" with the current date |\n\nUse `evaluate_script` to write the HTML string to `report.html` in the output directory.\n\n### Phase 5 — Open, Export & Notify\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Open report | `new_page` | Open `file://<path>/report.html` so the user sees the finished report |\n| Export PDF | `save_pdf` | Save the currently open report page as `report.pdf` in the same output directory |\n| Notify user | — | Tell the user research is complete and provide paths to both `report.html` and `report.pdf` |\n\n## Tool Reference\n\n| Category | Tools Used |\n|----------|-----------|\n| Tab management | `new_hidden_page`, `new_page`, `close_page` |\n| Navigation | `navigate_page` |\n| Content extraction | `get_page_content`, `get_page_links` |\n| File I/O & scripting | `evaluate_script` |\n| Export | `save_pdf` |\n\n## Tips\n\n- **4–6 sources** is the sweet spot for balanced coverage. More isn't always better.\n- **Prioritize recent sources** — check publication dates and prefer current information.\n- **Note disagreements** between sources rather than hiding them; surface conflicting data.\n- **Always record the source URL** next to every fact so the report is fully traceable.\n- For product research, include pricing and availability.\n- For technical topics, prefer official documentation and peer-reviewed sources.\n- If a Google search returns unhelpful results, try alternative queries or go directly to known authoritative sites."
  },
  {
    "id": "skill_extract_data",
    "name": "Extract Data",
    "description": "Extract structured data from web pages — tables, lists, product info, pricing — into clean CSV, JSON, or markdown tables. Parallelizes across hidden tabs for multi-source extraction and saves results to disk incrementally. Use when the user asks to scrape, extract, or pull data from a page.",
    "content": "# Extract Data\n\nEnd-to-end data extraction workflow that pulls structured content from one or many web pages, saves results to disk incrementally (never accumulating everything in memory), and delivers clean output in the user's preferred format.\n\n## When to Apply\n\nActivate when the user asks to extract, scrape, pull, or collect structured data from web pages — tables, product listings, pricing, contact info, search results, leaderboards, or any repeating data pattern.\n\n## Workflow\n\n### Phase 1 — Clarify & Plan\n\n1. **Clarify the request.** Before extracting, confirm with the user:\n   - **Source(s):** Single page, list of URLs, or search-then-extract?\n   - **Output format:** CSV, JSON, or Markdown table? Default to CSV if not specified.\n   - **Output location:** Where to save files. Default: `~/Downloads/extract-<topic-slug>/`.\n   - **What data to extract:** Column names, specific fields, or \"everything in the table.\"\n2. **Create the output directory.** Use `evaluate_script` to create the target folder:\n   ```\n   extract-<topic-slug>/\n   ├── raw/              ← per-page extracted content\n   ├── merged.<format>   ← final combined output (csv / json)\n   └── extraction.log    ← progress log with source URLs\n   ```\n\n### Phase 2 — Single-Page Extraction\n\nFor a **single page** (or each individual page in a batch):\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Navigate | `navigate_page` | Go to the target URL (skip if already on the page) |\n| Read content | `get_page_content` | Extract the page as markdown — this captures tables, lists, and text in a structured format |\n| Identify structure | — | Determine the data pattern: HTML table, repeated cards, key-value pairs, etc. |\n| Extract data | `evaluate_script` | For complex structures (e.g., product grids, nested cards), run JavaScript to query elements and return a JSON array. For clean markdown tables from `get_page_content`, parse directly. |\n| **Save immediately** | `evaluate_script` | Write the extracted data to `raw/<n>-<slug>.<format>` with a header comment containing the source URL and timestamp |\n| Log progress | `evaluate_script` | Append the source URL, row count, and status to `extraction.log` |\n\n#### Handling Pagination\n\nIf the page has pagination (next buttons, page numbers, infinite scroll):\n\n1. Extract the current page's data and save to `raw/<n>-page-<p>.<format>`\n2. Use `click` or `navigate_page` to go to the next page\n3. Repeat until all pages are processed or a user-specified limit is reached\n4. Each page's data is saved to its own file immediately — never accumulate across pages in memory\n\n### Phase 3 — Multi-Source Parallel Extraction\n\nWhen extracting from **multiple URLs or sources**, parallelize using a hidden window:\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Create workspace | `create_hidden_window` | Open a dedicated hidden window for extraction work — keeps the user's browsing undisturbed |\n| Open batch of tabs | `new_hidden_page` | Open up to **10 tabs concurrently** within the hidden window, one per source URL |\n| Extract per tab | `navigate_page` → `get_page_content` → `evaluate_script` | For each tab: navigate, extract content, parse structured data |\n| Save per tab | `evaluate_script` | Write each tab's results to `raw/<n>-<slug>.<format>` immediately after extraction |\n| Close tab | `close_page` | Free the tab after its data is saved |\n| Next batch | — | Once a batch of 10 completes, open the next batch. Continue until all sources are processed. |\n| Close workspace | `close_window` | Close the hidden window after all extraction is done |\n\n**Concurrency rule:** Never exceed 10 open tabs at a time. Process in batches of 10, saving and closing before opening the next batch.\n\n### Phase 4 — Merge & Format\n\nAfter all raw files are saved:\n\n1. **Read each raw file** from `raw/` using `evaluate_script`.\n2. **Merge into a single output file** (`merged.csv`, `merged.json`, or `merged.md`) with:\n   - Consistent column headers / keys across all sources\n   - A `source_url` column so every row is traceable to its origin\n   - Deduplication if the same record appears in multiple sources\n3. **Write the merged file** to the output directory.\n4. For large datasets, provide a summary: total rows, sources processed, any errors.\n\n#### Output Formats\n\n| Format | File | Notes |\n|--------|------|-------|\n| **CSV** | `merged.csv` | Header row, comma-separated, properly escaped. Include `source_url` as the last column. |\n| **JSON** | `merged.json` | Array of objects with consistent keys. Each object includes a `source_url` field. |\n| **Markdown** | `merged.md` | Aligned table with headers. Source URL in the last column. |\n\n### Phase 5 — HTML Report\n\nGenerate a self-contained `report.html` in the output directory that serves as an index for the entire extraction.\n\n| Requirement | Detail |\n|-------------|--------|\n| **Theme** | Light background (`#ffffff`), clean sans-serif typography, generous whitespace |\n| **Header** | Title, date, total rows extracted, number of sources processed |\n| **What was done** | Brief description of the extraction: source URLs, data fields extracted, format used |\n| **File index** | Table listing every file in the output directory (`raw/*`, `merged.*`, `extraction.log`) with file paths as clickable `file://` links so the user can open them directly |\n| **Data preview** | First 20 rows of the merged dataset rendered as an HTML table |\n| **Source list** | All source URLs as clickable hyperlinks with the row count extracted from each |\n| **Self-contained** | All styles inline or in a `<style>` block — no external dependencies |\n| **Footer** | \"Generated by BrowserOS Extract Data\" with the current date |\n\nUse `evaluate_script` to write the HTML file to the output directory.\n\n### Phase 6 — Open & Notify\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Open report | `new_page` | Open `file://<path>/report.html` so the user sees the extraction summary |\n| Notify user | — | Tell the user: extraction is complete, total rows, source count, and paths to `report.html` and `merged.<format>` |\n\n## Tool Reference\n\n| Category | Tools Used |\n|----------|-----------|\n| Window management | `create_hidden_window`, `close_window` |\n| Tab management | `new_hidden_page`, `close_page`, `new_page` |\n| Navigation | `navigate_page` |\n| Content extraction | `get_page_content` |\n| Data parsing & file I/O | `evaluate_script` |\n| Interaction | `click` (for pagination) |\n\n## Tips\n\n- **Always ask the format first.** CSV, JSON, and Markdown have different strengths — let the user decide.\n- **Save after every page.** Never hold more than one page's worth of data in memory at a time.\n- **10 tabs max.** More tabs degrades performance and risks timeouts. Batch in groups of 10.\n- **Record the source URL** on every row and in every raw file so data is fully traceable.\n- Clean up extracted data: trim whitespace, normalize currency symbols, remove hidden characters.\n- For paginated sites, check for a total count or \"showing X of Y\" to estimate progress.\n- If a page requires login or blocks extraction, report it to the user rather than retrying silently."
  },
  {
    "id": "skill_fill_form",
    "name": "Fill Form",
    "description": "Intelligently fill web forms using provided data — handles text fields, dropdowns, checkboxes, radio buttons, and multi-step forms. Use when the user asks to fill out, complete, or submit a form.",
    "content": "# Fill Form\n\n## When to Use\n\nActivate when the user asks to fill out a form, complete an application, enter data into fields, or submit information on a web page.\n\n## Steps\n\n1. **Collect the data to fill.** Ask the user for the information if not already provided. Organize it as key-value pairs.\n\n2. **Take a snapshot** using `take_snapshot` to see the form fields and understand the layout.\n\n3. **Map data to fields.** Match the user's data keys to form field labels. Handle common variations:\n   - \"Name\" may map to \"Full Name\", \"Your Name\", or separate \"First Name\" + \"Last Name\" fields\n   - \"Phone\" may map to \"Phone Number\", \"Mobile\", \"Tel\"\n   - \"Address\" may need to split into Street, City, State, Zip\n\n4. **Fill fields in order.** For each field:\n   - **Text inputs:** Use `fill` with the field selector and value\n   - **Dropdowns/selects:** Use `select_option` with the appropriate value\n   - **Checkboxes:** Use `check` to toggle on/off\n   - **Radio buttons:** Use `click` on the correct option\n   - **Date pickers:** Try `fill` first; if that fails, interact with the date picker UI using `click`\n   - **File uploads:** Use `upload_file` for attachment fields\n\n5. **Handle multi-step forms.** After filling visible fields:\n   - Look for \"Next\", \"Continue\", or \"Step 2\" buttons\n   - Use `click` to advance\n   - Take a new snapshot to see the next step's fields\n   - Repeat the fill process\n\n6. **Review before submission.** Take a final `take_snapshot` and present the filled form to the user for confirmation before clicking Submit.\n\n## Tips\n\n- Fill fields top-to-bottom, left-to-right to match natural tab order.\n- For auto-complete fields (like address), type slowly and wait for suggestions to appear, then select.\n- If a field has validation errors after filling, read the error message and adjust the value.\n- Never submit payment forms without explicit user confirmation.\n- For CAPTCHA fields, inform the user they need to complete it manually."
  },
  {
    "id": "skill_screenshot_walkthrough",
    "name": "Screenshot Walkthrough & Visual Orientation",
    "description": "SOP Orientasi Visual Walkthrough Langkah-1 (browser_screenshot) sebelum klik/scroll dan verifikasi pasca-aksi (Snap & Verify) untuk kontrol browser 100% presisi dan minim kesalahan.",
    "content": "# Screenshot Walkthrough & Visual Orientation SOP\n\nSOP wajib untuk seluruh operasi kontrol browser (klik tombol, input form, scroll, navigasi alur kerja).\n\n## 4 Langkah Wajib (100% Presisi Loop):\n1. **Orientasi Visual Awal (Langkah 1)**: Master Agent WAJIB memanggil `browser_screenshot()` terlebih dahulu untuk melihat tata letak visual layar, mendeteksi modal/pop-up, banner cookie, dan memastikan posisi target secara visual sebelum memerintahkan aksi.\n2. **Inspeksi DOM & Snapshot**: Panggil `browser_snapshot()` untuk mendapatkan pohon aksesibilitas dan `backendNodeId` dari elemen interaktif.\n3. **Eksekusi Presisi**: Perintahkan Browser Control Agent mengeksekusi `browser_click`, `browser_type`, atau `browser_scroll` dengan `backendNodeId` yang valid.\n4. **Verifikasi Pasca-Aksi (Snap & Verify)**: Segera setelah aksi dieksekusi, panggil `browser_snapshot()` atau `browser_screenshot()` untuk memverifikasi perubahan tampilan UI (modal terbuka/tertutup, navigasi langkah form) sebelum menyatakan tuntas."
  },
  {
    "id": "skill_organize_tabs",
    "name": "Organize Tabs",
    "description": "Analyze open tabs, group related ones by topic, close duplicates, and clean up tab clutter. Use when the user asks to organize, clean up, sort, or manage their tabs.",
    "content": "# Organize Tabs\n\n## When to Use\n\nActivate when the user asks to organize tabs, clean up tab clutter, group related tabs, close duplicates, or manage their open browser tabs.\n\n## Steps\n\n1. **List all open tabs** using `list_pages` to get the full inventory of open pages with their titles and URLs.\n\n2. **Analyze and categorize.** Group tabs by:\n   - **Domain** — Same website tabs together\n   - **Topic** — Related content across domains (e.g., all \"travel planning\" tabs)\n   - **Activity** — Shopping, research, social media, work, entertainment\n\n3. **Identify issues:**\n   - **Duplicates** — Same URL open in multiple tabs\n   - **Dead tabs** — Error pages, \"page not found\", crashed tabs\n   - **Stale tabs** — Tabs that are likely no longer needed\n\n4. **Present a plan to the user:**\n\n```\n## Tab Analysis\n\n**Total tabs:** [N]\n\n### Groups Found\n- Work: [list of tabs]\n- Research: [list of tabs]\n- Shopping: [list of tabs]\n- Uncategorized: [list of tabs]\n\n### Issues\n- Duplicates: [N] tabs (will close extras)\n- Dead/Error pages: [N] tabs (will close)\n\n### Proposed Actions\n1. Group [N] tabs into [M] tab groups\n2. Close [N] duplicate tabs\n3. Close [N] dead tabs\n```\n\n5. **Execute with user confirmation:**\n   - Use `group_tabs` to create named tab groups for each category\n   - Use `close_page` to close duplicates (keep the first instance)\n   - Use `close_page` to close dead/error tabs\n\n6. **Offer to bookmark** stale tabs before closing using `create_bookmark`.\n\n## Tips\n\n- Always ask before closing tabs — users may have unsaved work.\n- Keep at least one tab open at all times.\n- For duplicate detection, compare URLs after removing query parameters and fragments.\n- If the user has 50+ tabs, prioritize grouping over individual analysis."
  },
  {
    "id": "skill_compare_prices",
    "name": "Compare Prices",
    "description": "Search for a product across multiple retailers in parallel, save pricing data to disk, and produce an HTML report with the best deals and direct product links. Use when the user asks to compare prices, find the best deal, or check prices across stores.",
    "content": "# Compare Prices\n\nSearch for a product across retailers in parallel using a hidden window, save pricing data incrementally to disk, and deliver a clean HTML comparison report with direct links to every product page.\n\n## When to Apply\n\nActivate when the user asks to compare prices for a product, find the cheapest option, check if a price is good, or shop across multiple stores.\n\n## Workflow\n\n### Phase 1 — Clarify\n\nConfirm with the user before searching:\n\n- **Product name** — exact model, variant, size, or color if applicable\n- **Retailer preferences** — any stores to include or exclude\n- **Region / currency** — defaults to user's locale\n\n### Phase 2 — Set Up & Search\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Create output directory | `evaluate_script` | Create `~/Downloads/compare-<product-slug>/` with a `raw/` subfolder |\n| Open hidden window | `create_hidden_window` | Dedicated workspace — keeps the user's browsing undisturbed |\n| Open parallel tabs | `new_hidden_page` | Open up to **10 tabs** concurrently, one per retailer/search |\n\n**Default search targets** (adjust based on product type and user's region):\n\n| Tab | Target |\n|-----|--------|\n| 1 | Google Shopping — `https://www.google.com/search?tbm=shop&q=<product>` |\n| 2 | Amazon — `https://www.amazon.com/s?k=<product>` |\n| 3 | Walmart — `https://www.walmart.com/search?q=<product>` |\n| 4 | Best Buy — `https://www.bestbuy.com/site/searchpage.jsp?st=<product>` |\n| 5 | Target — `https://www.target.com/s?searchTerm=<product>` |\n| 6 | eBay — `https://www.ebay.com/sch/i.html?_nkw=<product>` |\n| 7–10 | Additional retailers relevant to the product category (Newegg for tech, Home Depot for tools, etc.) |\n\n### Phase 3 — Extract & Save\n\nFor **each tab**, extract pricing data and save immediately:\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Navigate | `navigate_page` | Go to the search URL |\n| Read results | `get_page_content` | Extract the search results page as markdown |\n| Find best match | `navigate_page` | Click through to the most relevant product listing |\n| Extract pricing | `get_page_content` | Pull the product page content — price, availability, shipping, seller |\n| **Save raw data** | `evaluate_script` | Write to `raw/<retailer>.json` with all extracted fields (see format below) |\n| Close tab | `close_page` | Free the tab after saving |\n\n**Never hold all retailer data in memory.** Save each retailer's data to its own file immediately after extraction.\n\n#### Raw Data Format (`raw/<retailer>.json`)\n\n```json\n{\n  \"retailer\": \"Amazon\",\n  \"product_name\": \"Product Title as Listed\",\n  \"product_url\": \"https://www.amazon.com/dp/...\",\n  \"price\": 299.99,\n  \"original_price\": 349.99,\n  \"currency\": \"USD\",\n  \"shipping\": \"Free\",\n  \"availability\": \"In Stock\",\n  \"seller\": \"Amazon.com\",\n  \"condition\": \"New\",\n  \"rating\": \"4.5/5\",\n  \"notes\": \"Prime eligible\",\n  \"extracted_at\": \"2025-03-11T10:30:00Z\"\n}\n```\n\n### Phase 4 — HTML Report\n\nAfter all retailers are processed, read the saved `raw/*.json` files and generate a self-contained `report.html`:\n\n| Requirement | Detail |\n|-------------|--------|\n| **Theme** | Light background (`#ffffff`), clean sans-serif typography, generous whitespace |\n| **Header** | Product name, search date, number of retailers checked |\n| **Best Deal banner** | Highlighted card at the top showing the lowest total price with a direct link to the product page |\n| **Comparison table** | All retailers sorted by total price (lowest first) with columns: Retailer, Price, Shipping, Total, Stock, Seller, Rating, Link |\n| **Product links** | Every retailer name and a \"View Deal\" button must be a clickable `<a href>` linking to the actual product page URL |\n| **Price highlights** | Lowest price in green, highest in muted gray. Show discount percentage if original price differs. |\n| **Self-contained** | All styles in a `<style>` block — no external CSS or JS |\n| **Responsive** | Readable on desktop and mobile |\n| **Footer** | \"Generated by BrowserOS Compare Prices\" with date |\n\nUse `evaluate_script` to write `report.html` to the output directory.\n\n### Phase 5 — Open & Notify\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Close hidden window | `close_window` | Clean up the research workspace |\n| Open report | `new_page` | Open `file://<path>/report.html` in the user's active window |\n| Notify user | — | Tell the user the comparison is complete, highlight the best deal, and provide the report path |\n\n## Tool Reference\n\n| Category | Tools Used |\n|----------|-----------|\n| Window management | `create_hidden_window`, `close_window` |\n| Tab management | `new_hidden_page`, `close_page`, `new_page` |\n| Navigation | `navigate_page` |\n| Content extraction | `get_page_content` |\n| Data & file I/O | `evaluate_script` |\n\n## Tips\n\n- **Always compare total price** (product + shipping), not just the listed price.\n- **Note the seller** — marketplace third-party sellers may have different return policies than the retailer itself.\n- Mention membership discounts (Prime, Walmart+) as a note, not as the default price.\n- If the product has variants (sizes, colors), ensure every retailer is quoting the same variant.\n- If a retailer blocks scraping or returns no results, skip it and note the gap in the report.\n- For used/refurbished listings, separate them from new-condition results."
  },
  {
    "id": "skill_find_alternatives",
    "name": "Find Alternatives",
    "description": "Find alternative products to something the user is looking at or considering. Searches across retailers and review sites, compares options, and delivers a ranked HTML report with ratings, pricing, and direct links. Use when the user asks for alternatives, similar products, or \"something like this but...\"",
    "content": "# Find Alternatives\n\nSearch for alternative products across retailers and review sites, save research data incrementally to disk, rank the top 5 alternatives on a 1–5 scale, and deliver a clean HTML comparison report with direct product links.\n\n## When to Apply\n\nActivate when the user:\n\n- Asks for alternatives to a product they're viewing or considering\n- Says \"something like this but cheaper / better / different\"\n- Wants to explore options before buying\n- Asks \"what else is out there\" for a product category\n\n## Workflow\n\n### Phase 1 — Understand the Product\n\n1. **Identify the reference product.** Use `get_active_page` and `get_page_content` to understand what the user is currently looking at — product name, brand, price, key features, category.\n2. **Confirm with the user:**\n   - **Price range** — same range, cheaper, or open budget? If unclear, default to ±30% of the reference product's price.\n   - **Key criteria** — what matters most? (e.g., price, quality, brand, specific features)\n   - **Any exclusions** — brands or stores to skip\n3. **Create output directory.** Use `evaluate_script` to create in your working directory:\n   ```\n   alternatives-<product-slug>/\n   ├── raw/              ← per-source research data\n   ├── findings.md       ← running notes and rankings\n   └── report.html       ← final HTML report\n   ```\n\n### Phase 2 — Research Alternatives\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Open hidden window | `create_hidden_window` | Dedicated research workspace |\n| Search in parallel | `new_hidden_page` | Open up to **10 tabs** concurrently across search targets |\n\n**Search targets** (adapt to product category):\n\n| Tab | Target | Query |\n|-----|--------|-------|\n| 1 | Google Shopping | `{product category} alternatives under ${budget}` |\n| 2 | Google Search | `best {product category} alternatives {year} reddit` |\n| 3 | Google Search | `{product category} vs comparison {year}` |\n| 4 | Amazon | `{product category}` filtered to price range |\n| 5 | Walmart | `{product category}` in price range |\n| 6 | Best Buy / category retailer | `{product category}` |\n| 7–10 | Review sites, Reddit threads, or niche retailers relevant to the category |\n\nFor **each tab**:\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Navigate | `navigate_page` | Go to the search URL |\n| Read results | `get_page_content` | Extract search results as markdown |\n| Visit promising results | `navigate_page` | Click through to individual product pages and review articles |\n| Extract data | `get_page_content` | Pull product details — name, price, features, ratings, reviews |\n| **Save immediately** | `evaluate_script` | Write to `raw/{n}-{source-slug}.json` (see format below) |\n| Close tab | `close_page` | Free the tab after saving |\n\n#### Raw Data Format (`raw/{n}-{source-slug}.json`)\n\n```json\n{\n  \"source\": \"Amazon\",\n  \"source_url\": \"https://www.amazon.com/...\",\n  \"products\": [\n    {\n      \"name\": \"Product Name\",\n      \"brand\": \"Brand\",\n      \"product_url\": \"https://...\",\n      \"price\": 149.99,\n      \"currency\": \"USD\",\n      \"rating\": \"4.3/5\",\n      \"review_count\": 1250,\n      \"key_features\": [\"feature 1\", \"feature 2\"],\n      \"availability\": \"In Stock\",\n      \"image_url\": \"https://...\"\n    }\n  ],\n  \"extracted_at\": \"2025-03-11T10:30:00Z\"\n}\n```\n\n### Phase 3 — Rank & Synthesize\n\nAfter all sources are saved:\n\n1. **Read each raw file** from `raw/` using `evaluate_script`.\n2. **Deduplicate** — the same product may appear across multiple retailers. Group by product, keep the best price.\n3. **Select the top 5 alternatives** based on:\n   - Price relative to budget\n   - User ratings and review volume\n   - Feature match to the user's criteria\n   - Availability\n4. **Rate each alternative 1–5** on a composite scale:\n\n| Rating | Meaning |\n|--------|---------|\n| ⭐⭐⭐⭐⭐ 5 | Excellent match — great price, high ratings, strong features |\n| ⭐⭐⭐⭐ 4 | Very good — minor trade-offs |\n| ⭐⭐⭐ 3 | Decent — good in some areas, weaker in others |\n| ⭐⭐ 2 | Fair — notable compromises |\n| ⭐ 1 | Marginal — only worth considering for a specific reason |\n\n5. **Write `findings.md`** with the full ranking, reasoning, and source references:\n\n```markdown\n# Alternatives for: {Reference Product}\n\n**Reference price:** $X\n**Budget range:** $X – $Y\n**Date:** {current date}\n\n## Top 5 Alternatives\n\n### 1. {Product Name} — ⭐⭐⭐⭐⭐ (5/5)\n- **Price:** $X at {Retailer}\n- **Why:** {1–2 sentence justification}\n- **Link:** {product URL}\n- _Source: raw/{n}-{slug}.json_\n\n### 2. {Product Name} — ⭐⭐⭐⭐ (4/5)\n...\n\n## Comparison vs Reference\n\n| Feature | Reference | Alt 1 | Alt 2 | Alt 3 | Alt 4 | Alt 5 |\n|---------|-----------|-------|-------|-------|-------|-------|\n| Price   | $X        | $X    | $X    | $X    | $X    | $X    |\n| Rating  | 4.2/5     | 4.5/5 | 4.3/5 | 4.1/5 | 3.9/5 | 4.0/5 |\n```\n\n### Phase 4 — HTML Report\n\nGenerate a self-contained `report.html` in the output directory:\n\n| Requirement | Detail |\n|-------------|--------|\n| **Theme** | Light background (`#ffffff`), clean sans-serif typography, generous whitespace |\n| **Header** | \"Alternatives for: {Product Name}\", date, budget range |\n| **Reference product card** | Show the original product with its price, rating, and link as the baseline |\n| **Top 5 cards** | Each alternative as a card showing: rank, name, rating (star visualization), price, key features, and a clickable \"View Product\" link to the actual product page |\n| **Comparison table** | Side-by-side table with the reference product and all 5 alternatives — price, rating, key features, pros/cons |\n| **Rating explanation** | Brief note on how the 1–5 rating was determined |\n| **Product links** | Every product name and \"View Product\" button must be a clickable link to the actual product URL |\n| **Source references** | Footer section listing all sources consulted with links |\n| **Self-contained** | All styles in a style block — no external CSS or JS |\n| **Responsive** | Readable on desktop and mobile |\n| **Footer** | \"Generated by BrowserOS Find Alternatives\" with date |\n\nUse `evaluate_script` to write the HTML file.\n\n### Phase 5 — Open & Notify\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Close hidden window | `close_window` | Clean up the research workspace |\n| Open report | `new_page` | Open `file://{path}/report.html` in the user's active window |\n| Notify user | — | Summarize the top pick, mention the report path, and highlight any standout findings |\n\n## Tool Reference\n\n| Category | Tools Used |\n|----------|-----------|\n| Page info | `get_active_page` |\n| Window management | `create_hidden_window`, `close_window` |\n| Tab management | `new_hidden_page`, `close_page`, `new_page` |\n| Navigation | `navigate_page` |\n| Content extraction | `get_page_content` |\n| Data & file I/O | `evaluate_script` |\n\n## Tips\n\n- **Save after every source.** Never accumulate all research data in memory.\n- **10 tabs max** at a time. Batch if there are more sources.\n- **Deduplicate across retailers** — the same product on Amazon and Walmart should appear once with the best price noted.\n- If the reference product is niche, broaden the search to the general category rather than exact alternatives.\n- Include at least one budget option and one premium option to give the user a range.\n- If a product has very few reviews (under 50), note the low confidence in the rating."
  },
  {
    "id": "skill_save_page",
    "name": "Save Page",
    "description": "Save web pages as PDF files for offline reading, archiving, or sharing. Use when the user asks to save, download, export, or archive a page as PDF.",
    "content": "# Save Page\n\n## When to Use\n\nActivate when the user asks to save a page as PDF, download a page for offline reading, archive a webpage, or export page content to a file.\n\n## Steps\n\n1. **Navigate to the target page** using `navigate_page` if not already there. If the user provides multiple URLs, process them one by one.\n\n2. **Prepare the page for saving:**\n   - Dismiss any popups or overlays that would appear in the PDF\n   - Scroll to load any lazy-loaded content if the page uses infinite scroll\n\n3. **Save as PDF** using `save_pdf` with a descriptive filename:\n   - Pattern: `{domain}-{title-slug}-{date}.pdf`\n   - Example: `nytimes-climate-report-2025-03-11.pdf`\n   - Let the user specify a custom path if they prefer\n\n4. **For multiple pages**, process each URL sequentially:\n   - Navigate to the page\n   - Save as PDF\n   - Report progress to the user\n\n5. **Confirm the save:**\n   ```\n   Saved: [filename].pdf\n   Source: [URL]\n   Location: [file path]\n   ```\n\n## Tips\n\n- For articles, the PDF will capture the current page state — make sure content is fully loaded.\n- Some pages have print stylesheets that produce better PDFs — `save_pdf` uses these automatically.\n- For documentation sites with multiple pages, offer to save each section as a separate PDF.\n- If saving fails, offer the alternative of using `get_page_content` to save as markdown."
  },
  {
    "id": "skill_monitor_page",
    "name": "Monitor Page",
    "description": "Track changes on a web page by comparing content snapshots over time. Use when the user wants to watch for updates, price drops, stock availability, or content changes.",
    "content": "# Monitor Page\n\n## When to Use\n\nActivate when the user asks to monitor a page for changes, watch for price drops, track stock availability, detect new content, or be alerted when something changes on a website.\n\n## Steps\n\n1. **Clarify what to monitor.** Ask the user:\n   - What URL to watch\n   - What specific content to track (price, stock status, text, any change)\n   - How to identify the target content (a specific section, element, or keyword)\n\n2. **Capture the baseline.** Navigate to the page and extract the current state:\n   - Use `navigate_page` to load the target URL\n   - Use `get_page_content` or `evaluate_script` to extract the specific content to track\n   - Save the baseline to memory using `memory_write` with a descriptive key like `monitor:{url-slug}:baseline`\n\n3. **Check for changes.** On subsequent checks:\n   - Navigate to the same URL\n   - Extract the same content using the same method\n   - Compare against the saved baseline\n   - Report differences\n\n4. **Report findings:**\n\n### If changes detected:\n```\n## Page Change Detected\n\n**URL:** [url]\n**Checked:** [current date/time]\n\n### Changes\n- **Before:** [previous value]\n- **After:** [current value]\n```\n\n### If no changes:\n```\nNo changes detected on [URL].\nLast checked: [current date/time]\nMonitoring: [what you're tracking]\n```\n\n5. **Update the baseline** after reporting changes, using `memory_write` to store the new state.\n\n## Tips\n\n- For price monitoring, extract just the price element rather than the full page to avoid false positives from ad changes.\n- Use `evaluate_script` with specific CSS selectors for precise element tracking.\n- Suggest the user set a reminder to ask you to check again — BrowserOS doesn't yet have scheduled tasks.\n- For stock availability, look for phrases like \"In Stock\", \"Out of Stock\", or \"Add to Cart\" button presence."
  },
  {
    "id": "skill_read_later",
    "name": "Read Later",
    "description": "Bookmark the current page to a \"Read Later\" folder and save a PDF copy for offline reading. Use when the user wants to save a page for later, bookmark it for reading, or keep an offline copy.",
    "content": "# Read Later\n\nQuick-save the current page: bookmark it into a dedicated \"📚 Read Later\" folder and download a PDF copy for offline reading.\n\n## When to Apply\n\nActivate when the user asks to save a page for later, read it later, bookmark something to come back to, or keep an offline copy of an article.\n\n## Workflow\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Get current page | `get_active_page` | Identify the page URL and title |\n| Check for folder | `get_bookmarks` | Look for an existing folder named \"📚 Read Later\" in the bookmark bar |\n| Create folder (if needed) | `create_bookmark` | If the folder doesn't exist, create \"📚 Read Later\" in the bookmark bar |\n| Add bookmark | `create_bookmark` | Save the current page URL and title into the \"📚 Read Later\" folder |\n| Save PDF | `save_pdf` | Download the full page as a PDF to the user's default downloads directory |\n| Notify user | — | Tell the user the page has been saved with the bookmark location and PDF file path |\n\n## Notification Format\n\n```\nSaved to 📚 Read Later\nTitle: <page title>\nURL: <page url>\nPDF: <download path>\n```\n\n## Tool Reference\n\n| Category | Tools Used |\n|----------|-----------|\n| Page info | `get_active_page` |\n| Bookmarks | `get_bookmarks`, `create_bookmark` |\n| Export | `save_pdf` |\n\n## Tips\n\n- Always check if \"📚 Read Later\" already exists before creating it — avoid duplicate folders.\n- If the page title is empty or generic, use the domain + path as the bookmark title.\n- The PDF captures the page as-is, including the current scroll position and expanded sections."
  },
  {
    "id": "skill_manage_bookmarks",
    "name": "Manage Bookmarks",
    "description": "Organize bookmarks — find duplicates, categorize by topic, create a clean folder structure, and clean up unused bookmarks. Use when the user asks to organize, clean up, sort, or manage their bookmarks.",
    "content": "# Manage Bookmarks\n\nAnalyze the user's bookmark collection, propose a clean top-level folder structure (max 5 folders), execute with confirmation, and deliver a markdown summary of everything that changed.\n\n## When to Apply\n\nActivate when the user asks to organize bookmarks, find duplicates, create bookmark folders, clean up old bookmarks, or restructure their bookmark library.\n\n## Workflow\n\n### Phase 1 — Analyze\n\n1. **Retrieve bookmarks** using `get_bookmarks` to get the full bookmark tree.\n2. **Analyze the collection thoroughly:**\n   - Total bookmarks and existing folders\n   - Duplicates (same URL, possibly different titles)\n   - Group every bookmark by domain and inferred topic\n   - Identify dead or broken patterns (e.g., `localhost`, empty titles)\n\n3. **Present the analysis to the user.** Use short one-word slug categories:\n\n```\n## Bookmark Analysis\n\n**Total:** 342 bookmarks, 12 folders\n**Duplicates:** 8\n\n### Proposed Folders (top-level)\n- dev — 94 bookmarks (GitHub, Stack Overflow, docs)\n- work — 67 bookmarks (Notion, Slack, Jira, company domains)\n- news — 45 bookmarks (HN, Reddit, RSS feeds)\n- shop — 28 bookmarks (Amazon, product pages)\n- misc — 108 bookmarks (everything else)\n\n### Duplicates to Remove\n- github.com/user/repo × 3 (keep: \"User/Repo - GitHub\")\n- notion.so/page × 2 (keep: \"Project Notes\")\n```\n\n**Folder naming rules:**\n- One-word lowercase slugs: `dev`, `work`, `news`, `shop`, `ref`, `social`, `misc`\n- **Maximum 3–5 top-level folders.** Fewer is better. Do not over-categorize.\n- Only suggest subfolders if the user explicitly asks for deeper organization\n\n4. **Wait for confirmation.** Do not proceed until the user says to go ahead. If they want changes to the plan (rename folders, merge categories, split a group), adjust and re-present.\n\n### Phase 2 — Organize\n\nOnce the user confirms:\n\n| Step | Tool | Detail |\n|------|------|--------|\n| Create folders | `create_bookmark` | Create each top-level folder from the approved plan |\n| Move bookmarks | `move_bookmark` | Move each bookmark into its assigned folder |\n| Remove duplicates | `remove_bookmark` | Remove confirmed duplicates, keeping the one with the better title |\n\n**Order matters:** Create all folders first, then move bookmarks, then remove duplicates.\n\n### Phase 3 — Summary\n\nAfter all operations complete, present a clean markdown summary:\n\n```markdown\n## Bookmark Cleanup Complete\n\n**Before:** 342 bookmarks, 12 folders\n**After:** 334 bookmarks, 5 folders\n\n### Created Folders\n- dev (94 bookmarks)\n- work (67 bookmarks)\n- news (45 bookmarks)\n- shop (28 bookmarks)\n- misc (108 bookmarks)\n\n### Duplicates Removed (8)\n- github.com/user/repo — removed 2 copies\n- notion.so/page — removed 1 copy\n\n### Moved\n- 287 bookmarks reorganized into new folders\n- 47 bookmarks already in correct location\n```\n\n## Tool Reference\n\n| Category | Tools Used |\n|----------|-----------|\n| Read | `get_bookmarks` |\n| Create | `create_bookmark` |\n| Move | `move_bookmark` |\n| Delete | `remove_bookmark` |\n\n## Tips\n\n- **Never delete without confirmation.** Always present the plan and wait for the user to say proceed.\n- **Keep it flat.** 3–5 top-level folders covers most collections. Resist the urge to create deep hierarchies.\n- When removing duplicates, keep the bookmark with the more descriptive title.\n- For very large collections (500+), process in batches by category to avoid timeouts.\n- Some users prefer a flat bookmark bar — ask about their preferred structure before reorganizing."
  },
  {
    "id": "skill_gaya_komunikasi",
    "name": "Gaya Komunikasi & Aturan Kontrol Browser",
    "description": "Mengatur gaya bahasa AI agar selalu to the point (langsung ke inti tanpa basa-basi), menggunakan Bahasa Indonesia santai/gaul (lo, gue, siap bro, okelah bro, cuy, dll.), memastikan poin informasi inti tetap lengkap, dan wajib menggunakan kontrol browser (browsermcp) daripada tool websearch bawaan.",
    "content": "# Gaya Komunikasi & Aturan Kontrol Browser\n\n## Aturan Gaya Bicara (Persona)\n\n1. **Bahasa Indonesia Gaul & Santai:**\n   - Jangan pakai bahasa baku kaku.\n   - Gunakan kata-kata santai seperti: *lo*, *gue*, *siap bro*, *okelah bro*, *cuy*, *mantap*, *nih*, *ya*, dll.\n\n2. **Langsung ke Inti (To the Point - Ekstrim & Hemat Token):**\n   - Hapus total semua kalimat basa-basi di awal maupun akhir.\n   - Jangan berikan penjelasan latar belakang yang tidak perlu.\n   - Langsung berikan apa yang diminta dengan format seringkas mungkin.\n\n3. **Styling Teks di Terminal (Sangat Penting):**\n   - **JANGAN** gunakan backticks (`` ` ``) untuk path file atau nama file (misal: `/home/arya/...`). Biarkan sebagai teks biasa agar terminal merendernya sebagai link biru bersih, bukan blok kode abu-abu yang kaku.\n   - **JANGAN** gunakan format tebal/codeblock berlebihan yang membuat tampilan terminal penuh blok warna.\n   - Gunakan bullet point standar untuk list agar rapi di terminal.\n\n4. **Informasi Inti Tetap Lengkap:**\n   - Meskipun sangat singkat dan hemat token, pastikan semua detail teknis dan poin penting wajib disampaikan agar tidak ada misinformasi.\n\n## Aturan Penggunaan Alat (Tools & Browser Control)\n\n5. **Selalu Gunakan Kontrol Browser (browsermcp):**\n   - **JANGAN PERNAH** menggunakan google search bawaan, search engine API internal, atau tool websearch mandiri dari Google.\n   - Jika membutuhkan pencarian informasi, melakukan riset, membuka link, atau mencari di web, Anda **WAJIB** mengontrol browser menggunakan tool `browsermcp` (seperti `browser_navigate` ke google.com, ketik kata kunci pencarian, klik tombol cari, scroll, klik link hasil pencarian, ambil snapshot halaman/screenshoot, dsb).\n   - Seluruh aktivitas pencarian informasi harus dilakukan secara interaktif melalui tab browser yang sedang dikontrol oleh AI agent."
  },
  {
    "id": "ask_internal",
    "name": "BrowserOS Internal Architecture (ask-internal)",
    "description": "Panduan arsitektur internal BrowserOS, inspeksi submodule .internal-docs/, Electron lifecycle, release packaging, dan VM OpenClaw",
    "content": "# 🏗️ SOP BrowserOS Internal Architecture (ask-internal)\n\n## 1. Ruang Lingkup Topik:\n- Electron Main/Preload/Renderer lifecycle & context isolation.\n- Native Messaging host stdio communication protocol (length-prefixed JSON).\n- Submodule .internal-docs/ untuk ADR dan catatan arsitektur rahasia.\n- Release signing (macOS Notarization, Windows EV Certificate, Linux AppImage).\n- OpenClaw VM isolation & snapshotting.\n\n## 2. Aturan Eksekusi:\n1. Periksa folder .internal-docs/ terlebih dahulu menggunakan local_list_dir / local_read_file.\n2. Telusuri codebase jika dokumentasi belum mencukupi.\n3. Wajib menyertakan kutipan path berkas dan nomor baris presisi (file.ts:line).\n4. Jalankan perintah terminal secara bertahap (per-command review) via local_run_command."
  }
];

const DEFAULT_MEMORIES = [
  {
    id: "mem_user_guidelines",
    name: "Preferensi Utama & Bahasa Indonesia",
    description: "Aturan baku bahasa Indonesia, akurasi fakta, dan format link/kode presisi",
    content: `- Selalu berkomunikasi dan merespons dalam Bahasa Indonesia.\n- Pertahankan format link dan kode dengan presisi.\n- Berikan jawaban yang akurat berdasarkan fakta dan data nyata tanpa asumsi fiktif.`
  },
  {
    id: "mem_response_terse",
    name: "Gaya Respon: Ringkas (Terse & To The Point)",
    description: "Respon padat, langsung ke inti solusi/kode tanpa basa-basi pembuka dan penutup",
    content: `[PREFERENSI GAYA RESPON: RINGKAS / TERSE]\n- Komunikasi sangat ringkas, padat, langsung to the point (Terse Style).\n- Hilangkan kalimat pembuka, basa-basi, dan penutup yang tidak perlu (zero fluff).\n- Tampilkan kode, langkah, atau hasil data secara langsung dan presisi.\n- Bahasa Indonesia yang santai, lugas, dan profesional.`
  },
  {
    id: "mem_response_normal",
    name: "Gaya Respon: Normal (Standar Komunikatif)",
    description: "Keseimbangan ideal antara penjelasan yang jelas, ramah, dan ringkasan terstruktur",
    content: `[PREFERENSI GAYA RESPON: NORMAL / STANDAR]\n- Komunikasi natural, ramah, dan bersahabat dalam Bahasa Indonesia.\n- Keseimbangan ideal: berikan penjelasan singkat tentang apa yang dilakukan, poin-poin penting, dan hasil akhir yang jelas.\n- Gunakan format Markdown yang rapi dengan bullet points dan heading yang terstruktur tanpa bertele-tele.`
  },
  {
    id: "mem_response_medium",
    name: "Gaya Respon: Medium (Semi-Informatif & Kontekstual)",
    description: "Penjelasan terstruktur dengan konteks yang cukup, highlight temuan, dan rekomendasi",
    content: `[PREFERENSI GAYA RESPON: MEDIUM / SEMI-INFORMATIF]\n- Berikan jawaban dengan kedalaman sedang (Medium Depth) dan konteks yang memadai.\n- Struktur respon:\n  1. Ringkasan Singkat (Executive Summary).\n  2. Poin-poin Penjelasan / Analisis dengan konteks latar belakang.\n  3. Data / Kode / Bukti pendukung.\n  4. Rekomendasi atau langkah tindak lanjut.\n- Bahasa Indonesia yang komunikatif, profesional, dan mudah dipahami.`
  },
  {
    id: "mem_response_super_detail",
    name: "Gaya Respon: Super Detail & Komprehensif",
    description: "Analisis mendalam 360 derajat, rincian teknis lengkap, metodologi, dan perbandingan",
    content: `[PREFERENSI GAYA RESPON: SUPER DETAIL & KOMPREHENSIF]\n- Berikan analisis dan jawaban dengan tingkat kedalaman maksimal (Deep Comprehensive Breakdown).\n- Struktur respon lengkap:\n  1. 📌 Rangkuman Eksekutif & Intisari Jawaban.\n  2. 🔍 Analisis Mendalam & Pembahasan Komprehensif (Metodologi, Latar Belakang, & Rincian Teknis/Faktual).\n  3. 📊 Tabel Komparasi / Matriks Data / Parameter Lengkap.\n  4. ⚠️ Batasan, Potensi Risiko, & Pertimbangan Edge Cases.\n  5. 💡 Rekomendasi Solusi & Action Plan Berurutan.\n- Gunakan data angka presisi, kutipan sumber, dan penjelasan menyeluruh.`
  },
  {
    id: "mem_academic_journal_analyst",
    name: "Gaya Analis: Riset Jurnal & Academic Paper",
    description: "Bahasa saintifik, tinjauan pustaka, sintesis metodologi, kutipan DOI/sumber, dan fact-checking",
    content: `[PREFERENSI GAYA ANALIS: RISET JURNAL & AKADEMIK]\n- Persona: Senior Academic Researcher & Literature Review Analyst.\n- Fokus pada rigor saintifik, objektivitas, dan verifikasi fakta berbasis bukti (Evidence-Based).\n- Saat mencari atau menganalisis jurnal/paper:\n  1. Cantumkan Judul Paper, Penulis/Institusi, Tahun Terbit, dan Nama Jurnal / Konferensi / DOI jika ada.\n  2. Ulas Metodologi Penelitian (Dataset, Metode, Baseline, & Metrik Evaluasi).\n  3. Rangkum Temuan Kunci (Key Findings), Novelty / Kontribusi Utama, serta Limitasi Penelitian.\n  4. Lakukan sintesis perbandingan (Comparative Synthesis) antar berbagai jurnal terkait.\n- Hindari klaim tanpa rujukan; selalu sebutkan sumber data atau literatur yang dianalisis.`
  },
  {
    id: "mem_data_scraping_specialist",
    name: "Gaya Analis: Data Scraping & Web Intelligence",
    description: "Skema data terstruktur, selektor DOM presisi, validasi data, tabel Markdown, dan ekspor JSON",
    content: `[PREFERENSI GAYA ANALIS: DATA SCRAPING & WEB INTELLIGENCE]\n- Persona: Web Scraping & Data Extraction Specialist.\n- Pendekatan sistematis dalam ekstraksi data dari halaman web:\n  1. Petakan struktur kontainer elemen (DOM Tree, Selector, Atribut data).\n  2. Ekstrak data secara konsisten dan lengkap (Nama/Judul, Nilai/Harga, URL Tautan, Rating/Status, Metadata).\n  3. Sajikan hasil dalam format terstruktur: Tabel Markdown yang bersih atau JSON Schema yang valid.\n  4. Berikan insight ringkasan dari kumpulan data yang diekstraksi (tren harga, distribusi kategori, anomali data).\n  5. Bersihkan data dari tag HTML sisa atau inkonsistensi format.`
  },
  {
    id: "mem_market_business_analyst",
    name: "Gaya Analis: Bisnis & Intelijen Pasar",
    description: "Analisis tren pasar, perbandingan produk/harga e-commerce, SWOT, dan rekomendasi bisnis",
    content: `[PREFERENSI GAYA ANALIS: BISNIS & INTELIJEN PASAR]\n- Persona: Strategic Business & Market Intelligence Analyst.\n- Gaya komunikasi eksekutif yang fokus pada nilai bisnis (Business Value), analisis komparatif, dan tren pasar.\n- Format analisis:\n  1. 📈 Analisis Lanskap & Tren Pasar.\n  2. ⚖️ Perbandingan Fitur, Harga, & Value Proposition.\n  3. 🔍 Analisis Kelebihan & Kekurangan (Pros & Cons / SWOT).\n  4. 🎯 Rekomendasi Keputusan Pembelian atau Strategi Bisnis.\n- Tampilkan angka dalam format finansial/persentase yang jelas.`
  },
  {
    id: "mem_root_cause_debugger",
    name: "Gaya Analis: Debugging & Root Cause Investigator",
    description: "Investigasi log, penelusuran akar masalah (5-Whys), verifikasi empiris, dan mitigasi",
    content: `[PREFERENSI GAYA ANALIS: DEBUGGING & ROOT CAUSE INVESTIGATOR]\n- Persona: Principal Systems Debugger & Root Cause Investigator.\n- Metode pemecahan masalah sistematis:\n  1. 🚨 Identifikasi Gejala & Error Message / Log Traceback yang sebenarnya.\n  2. 🔬 Investigasi Akar Masalah (Root Cause Analysis - Mengapa kontrak/aliran data rusak).\n  3. 🛠️ Solusi Perbaikan Kode / Konfigurasi yang Tepat Sasaran (Tanpa tambal sulam gejala).\n  4. ✅ Verifikasi Empiris & Pengujian Hasil.\n  5. 🛡️ Mitigasi Pencegahan untuk Menghindari Regresi di Masa Depan.`
  }
];

async function loadAllData() {
  await Promise.all([loadAgents(), loadSkills(), loadMemories()]);
}

async function loadAgents() {
  let loaded = false;
  if (nativePort) {
    try {
      const res = await sendNativeRpc("list_agents");
      if (res && res.status === "ok" && Array.isArray(res.items) && res.items.length > 0) {
        // Filter out legacy property agents and any broken untitled items
        agentsList = res.items.filter(a => a.id !== "property_closer_agent" && a.name && a.name !== "Untitled" && a.name !== "Untitled Sub-Agent" && a.name !== "Untitled Agent");
        loaded = true;
      }
    } catch (e) {
      console.warn("Native list_agents notice:", e);
    }
  }

  if (!loaded) {
    const res = await chrome.storage.local.get(['custom_agents']);
    if (res && Array.isArray(res.custom_agents) && res.custom_agents.length > 0) {
      agentsList = res.custom_agents.filter(a => a.id !== "property_closer_agent" && a.name && a.name !== "Untitled" && a.name !== "Untitled Sub-Agent" && a.name !== "Untitled Agent");
    } else {
      agentsList = [...DEFAULT_AGENTS];
    }
  }

  // 1. Clean, unify and migrate master_agent / boss_agent into single canonical master_agent
  let masterFound = false;
  const cleanedList = [];

  for (const ag of agentsList) {
    if (!ag || !ag.id || ag.name === "Untitled" || ag.name === "Untitled Sub-Agent" || ag.name === "Untitled Agent") {
      continue;
    }
    if (ag.id === "boss_agent" || ag.id === "master_agent" || ag.is_boss) {
      if (!masterFound) {
        masterFound = true;
        cleanedList.push({
          ...DEFAULT_AGENTS[0],
          ...ag,
          id: "master_agent",
          name: "Master Agent (Supreme Orchestrator)",
          description: DEFAULT_AGENTS[0].description,
          is_boss: true,
          is_default: true,
          skills: [...new Set(ag.skills || DEFAULT_AGENTS[0].skills)],
          memories: [...new Set(ag.memories || DEFAULT_AGENTS[0].memories)]
        });
      }
    } else {
      // Remove duplicates by ID and deduplicate skills/memories
      if (!cleanedList.some(item => item.id === ag.id)) {
        ag.skills = [...new Set(ag.skills || [])];
        ag.memories = [...new Set(ag.memories || [])];
        cleanedList.push(ag);
      }
    }
  }
  agentsList = cleanedList;

  // 2. Ensure all default agents are present and properly configured
  DEFAULT_AGENTS.forEach(defAg => {
    const existingIdx = agentsList.findIndex(a => a.id === defAg.id || (defAg.id === "master_agent" && (a.id === "boss_agent" || a.is_boss)));
    if (existingIdx === -1) {
      agentsList.push({ ...defAg });
    } else {
      // Refresh canonical default names and deduplicate skills/memories
      agentsList[existingIdx].name = defAg.name;
      agentsList[existingIdx].description = defAg.description;
      agentsList[existingIdx].id = defAg.id;
      agentsList[existingIdx].skills = [...new Set(agentsList[existingIdx].skills || defAg.skills)];
      agentsList[existingIdx].memories = [...new Set(agentsList[existingIdx].memories || defAg.memories)];
    }
  });

  // Ensure master_agent is always first in list
  agentsList.sort((a, b) => ((a.id === "master_agent" || a.is_boss) ? -1 : ((b.id === "master_agent" || b.is_boss) ? 1 : 0)));

  if (agentsList.length === 0) {
    agentsList = [...DEFAULT_AGENTS];
  }

  await chrome.storage.local.set({ custom_agents: agentsList });
  await syncDefaultAgentsToDisk();
  updateBadgeCount('badge-count-agents', agentsList.length);
  renderAgentsCards();
}

async function syncDefaultAgentsToDisk() {
  if (!nativePort) return;
  for (const ag of DEFAULT_AGENTS) {
    try {
      await sendNativeRpc("save_agent", { agent: ag });
    } catch (e) {}
  }
}

async function loadSkills() {
  let loaded = false;
  if (nativePort) {
    try {
      const res = await sendNativeRpc("list_skills");
      if (res && res.status === "ok" && Array.isArray(res.items) && res.items.length > 0) {
        // Filter out legacy property skills
        skillsList = res.items.filter(s => s.id !== "skill_kpr_simulation" && s.id !== "skill_seo_copywriting");
        loaded = true;
      }
    } catch (e) {
      console.warn("Native list_skills notice:", e);
    }
  }

  if (!loaded) {
    const res = await chrome.storage.local.get(['custom_skills']);
    if (res && Array.isArray(res.custom_skills) && res.custom_skills.length > 0) {
      skillsList = res.custom_skills.filter(s => s.id !== "skill_kpr_simulation" && s.id !== "skill_seo_copywriting");
    } else {
      skillsList = [...DEFAULT_SKILLS];
      await syncDefaultSkillsToDisk();
    }
  }

  // Auto-merge newly added default skills if missing from loaded list
  let hasMergedSkills = false;
  DEFAULT_SKILLS.forEach(defSk => {
    if (!skillsList.some(s => s.id === defSk.id)) {
      skillsList.push({ ...defSk });
      hasMergedSkills = true;
    }
  });

  if (hasMergedSkills || skillsList.length === 0) {
    if (skillsList.length === 0) skillsList = [...DEFAULT_SKILLS];
    await syncDefaultSkillsToDisk();
  }

  await chrome.storage.local.set({ custom_skills: skillsList });
  updateBadgeCount('badge-count-skills', skillsList.length);
  renderSkillsCards();
}

async function syncDefaultSkillsToDisk() {
  if (!nativePort) return;
  for (const sk of DEFAULT_SKILLS) {
    try {
      await sendNativeRpc("save_skill", { skill: sk });
    } catch (e) {}
  }
}

async function loadMemories() {
  let loaded = false;
  if (nativePort) {
    try {
      const res = await sendNativeRpc("list_memories");
      if (res && res.status === "ok" && Array.isArray(res.items)) {
        memoriesList = res.items;
        loaded = true;
      }
    } catch (e) {
      console.warn("Native list_memories notice:", e);
    }
  }

  if (!loaded) {
    const res = await chrome.storage.local.get(['custom_memories']);
    if (res && Array.isArray(res.custom_memories)) {
      memoriesList = res.custom_memories;
    } else {
      memoriesList = [];
    }
  }

  // Auto-merge all default memories if not already present
  for (const defMem of DEFAULT_MEMORIES) {
    const existingIdx = memoriesList.findIndex(m => m.id === defMem.id);
    if (existingIdx === -1) {
      memoriesList.push(defMem);
    } else if (BUILTIN_MEMORY_IDS.includes(defMem.id)) {
      // Refresh built-in metadata
      memoriesList[existingIdx] = { ...defMem, ...memoriesList[existingIdx], name: defMem.name, description: defMem.description };
    }
  }

  await chrome.storage.local.set({ custom_memories: memoriesList });
  await syncDefaultMemoriesToDisk();
  updateBadgeCount('badge-count-memories', memoriesList.length);
  renderMemoriesCards();
}

async function syncDefaultMemoriesToDisk() {
  if (!nativePort) return;
  for (const mem of DEFAULT_MEMORIES) {
    try {
      await sendNativeRpc("save_memory", { memory: mem });
    } catch (e) {}
  }
}

function updateBadgeCount(badgeId, count) {
  const el = document.getElementById(badgeId);
  if (el) el.textContent = count;
}

// =========================================================================
// Built-in System IDs (Protected from deletion)
// =========================================================================
const BUILTIN_AGENT_IDS = ["master_agent", "boss_agent", "default_agent", "web_researcher_agent", "coding_engineer_agent"];
const BUILTIN_SKILL_IDS = [
  "skill_summarize_page",
  "skill_deep_research",
  "skill_extract_data",
  "skill_fill_form",
  "skill_screenshot_walkthrough",
  "skill_organize_tabs",
  "skill_compare_prices",
  "skill_find_alternatives",
  "skill_save_page",
  "skill_monitor_page",
  "skill_read_later",
  "skill_manage_bookmarks",
  "skill_gaya_komunikasi",
  "ask_internal"
];
const BUILTIN_MEMORY_IDS = [
  "mem_user_guidelines",
  "mem_response_terse",
  "mem_response_normal",
  "mem_response_medium",
  "mem_response_super_detail",
  "mem_academic_journal_analyst",
  "mem_data_scraping_specialist",
  "mem_market_business_analyst",
  "mem_root_cause_debugger"
];

// =========================================================================
// UI Renderers - Cards & Realtime Search
// =========================================================================
let currentSearchAgents = '';
let currentSearchSkills = '';
let currentSearchMemories = '';

function renderAgentsCards(searchQuery = currentSearchAgents) {
  const bossContainer = document.getElementById('boss-agent-hero-section');
  const subAgentsContainer = document.getElementById('agents-cards-grid');
  const statsEl = document.getElementById('stats-search-agents');
  const clearBtn = document.getElementById('btn-clear-search-agents');
  if (!subAgentsContainer) return;

  subAgentsContainer.innerHTML = '';
  if (bossContainer) bossContainer.innerHTML = '';

  const q = (searchQuery || '').trim().toLowerCase();
  currentSearchAgents = searchQuery;

  if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';

  const bossAgent = agentsList.find(a => a.id === "master_agent" || a.id === "boss_agent" || a.is_boss) || DEFAULT_AGENTS[0];
  let subAgents = agentsList.filter(a => a.id !== "master_agent" && a.id !== "boss_agent" && !a.is_boss && a.name && a.name !== "Untitled" && a.name !== "Untitled Sub-Agent" && a.name !== "Untitled Agent");

  const totalSubAgents = subAgents.length;

  if (q) {
    subAgents = subAgents.filter(ag => {
      const matchName = (ag.name || '').toLowerCase().includes(q);
      const matchDesc = (ag.description || '').toLowerCase().includes(q);
      const matchId = (ag.id || '').toLowerCase().includes(q);
      const matchModel = (ag.model || '').toLowerCase().includes(q);
      const matchPrompt = (ag.content || '').toLowerCase().includes(q);
      const matchSkills = (ag.skills || []).some(sId => {
        const found = skillsList.find(s => s.id === sId);
        return sId.toLowerCase().includes(q) || (found && found.name.toLowerCase().includes(q));
      });
      const matchMemories = (ag.memories || []).some(mId => {
        const found = memoriesList.find(m => m.id === mId);
        return mId.toLowerCase().includes(q) || (found && found.name.toLowerCase().includes(q));
      });
      return matchName || matchDesc || matchId || matchModel || matchPrompt || matchSkills || matchMemories;
    });
  }

  if (statsEl) {
    if (q) {
      statsEl.style.display = 'inline-block';
      statsEl.textContent = `Ditemukan ${subAgents.length} dari ${totalSubAgents} sub-agent`;
    } else {
      statsEl.style.display = 'none';
    }
  }

  // 1. Render Boss Agent Hero Card at Top Center (hide if searching and boss doesn't match)
  const bossMatches = !q || (bossAgent.name || '').toLowerCase().includes(q) || (bossAgent.description || '').toLowerCase().includes(q) || (bossAgent.content || '').toLowerCase().includes(q);
  if (bossContainer && bossAgent && bossMatches) {
    const bossSkillChips = (bossAgent.skills || []).map(sId => {
      const found = skillsList.find(s => s.id === sId);
      return `<span class="boss-tag-pill highlight">⚡ ${escapeHtml(found ? found.name : sId)}</span>`;
    }).join('');

    const bossMemoryChips = (bossAgent.memories || []).map(mId => {
      const found = memoriesList.find(m => m.id === mId);
      return `<span class="boss-tag-pill">🧠 ${escapeHtml(found ? found.name : mId)}</span>`;
    }).join('');

    const cleanModel = (bossAgent.model || '').trim().replace(/^["']|["']$/g, '').trim();

    bossContainer.innerHTML = `
      <div class="boss-hero-card">
        <div class="boss-hero-header">
          <div class="boss-title-group">
            <div class="boss-crown-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/>
              </svg>
            </div>
            <div class="boss-title-text">
              <h3>${escapeHtml(bossAgent.name || 'Master Agent (Supreme Orchestrator)')}</h3>
              <span class="boss-status-badge">
                <span class="boss-status-dot"></span>
                Permanent Active Orchestrator
              </span>
            </div>
          </div>
          ${cleanModel ? `<span class="tag-pill model-tag" style="background: rgba(206,241,40,0.2); color: #CEF128; border-color: rgba(206,241,40,0.4);">${escapeHtml(cleanModel)}</span>` : ''}
        </div>
        <p class="boss-hero-desc">${escapeHtml(bossAgent.description || 'Koordinator utama dan direktur ekosistem AI. Menerima instruksi pengguna, mendelegasikan tugas ke sub-agent, menginspeksi hasil kerja, dan menyajikan laporan final yang komprehensif dan profesional.')}</p>
        <div class="boss-hero-tags">
          <span class="boss-tag-pill highlight">👑 Frontline Communicator &amp; Delegator</span>
          <span class="boss-tag-pill highlight">🛡️ Quality Auditor &amp; Inspector</span>
          ${bossSkillChips}
          ${bossMemoryChips}
        </div>
        <div class="boss-hero-actions">
          <span class="boss-hero-actions-info">🔒 Master Agent selalu aktif otomatis pada mode "Auto (Agent)" dan tidak dapat dinonaktifkan.</span>
          <button type="button" class="btn-edit-boss" id="btn-edit-boss-agent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>Edit Instruksi Master Agent</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-edit-boss-agent')?.addEventListener('click', () => openAgentModal(bossAgent));
  }

  // 2. Render Sub-Agents Cards
  if (subAgents.length === 0) {
    subAgentsContainer.innerHTML = `<div class="empty-placeholder"><p>${q ? `Tidak ada sub-agent yang cocok dengan pencarian "${escapeHtml(q)}".` : 'Belum ada sub-agent pekerja. Klik tombol "+ Tambah Sub-Agent Baru" di atas.'}</p></div>`;
    return;
  }

  subAgents.forEach(ag => {
    const isBuiltin = BUILTIN_AGENT_IDS.includes(ag.id) || !!ag.is_builtin;
    const card = document.createElement('div');
    card.className = `item-card`;

    const skillChips = (ag.skills || []).map(sId => {
      const found = skillsList.find(s => s.id === sId);
      return `<span class="tag-pill skill-tag">⚡ ${escapeHtml(found ? found.name : sId)}</span>`;
    }).join('');

    const memoryChips = (ag.memories || []).map(mId => {
      const found = memoriesList.find(m => m.id === mId);
      return `<span class="tag-pill memory-tag">🧠 ${escapeHtml(found ? found.name : mId)}</span>`;
    }).join('');

    const cleanModel = (ag.model || '').trim().replace(/^["']|["']$/g, '').trim();

    card.innerHTML = `
      <div class="item-card-top">
        <div class="item-card-header">
          <div class="item-title-group">
            <div class="item-card-title">
              <span>${escapeHtml(ag.name || 'Untitled Sub-Agent')}</span>
              ${isBuiltin ? '<span class="badge-builtin">Bawaan</span>' : ''}
            </div>
            ${cleanModel ? `<span class="tag-pill model-tag">${escapeHtml(cleanModel)}</span>` : ''}
          </div>
        </div>
        <p class="item-card-desc">${escapeHtml(ag.description || 'Tidak ada deskripsi.')}</p>
        <div class="item-tags-row">
          ${skillChips || '<span class="tag-pill memory-tag">Tanpa Skill Khusus</span>'}
          ${memoryChips}
        </div>
      </div>
      <div class="item-card-actions">
        <button type="button" class="btn-item-action btn-edit-agent" data-id="${ag.id}">Edit</button>
        ${!isBuiltin ? `
        <button type="button" class="btn-item-del btn-delete-agent" data-id="${ag.id}" title="Hapus Sub-Agent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : `
        <button type="button" class="btn-item-del disabled" title="Sub-agent bawaan sistem dilindungi (tidak dapat dihapus)" disabled style="opacity: 0.35; cursor: not-allowed; filter: grayscale(1);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>`}
      </div>
    `;

    card.querySelector('.btn-edit-agent')?.addEventListener('click', () => openAgentModal(ag));
    if (!isBuiltin) {
      card.querySelector('.btn-delete-agent')?.addEventListener('click', () => deleteAgent(ag.id));
    }

    subAgentsContainer.appendChild(card);
  });
}

function renderSkillsCards(searchQuery = currentSearchSkills) {
  const container = document.getElementById('skills-cards-grid');
  const statsEl = document.getElementById('stats-search-skills');
  const clearBtn = document.getElementById('btn-clear-search-skills');
  if (!container) return;
  container.innerHTML = '';

  const q = (searchQuery || '').trim().toLowerCase();
  currentSearchSkills = searchQuery;

  if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';

  let filtered = [...skillsList];
  const totalSkills = filtered.length;

  if (q) {
    filtered = filtered.filter(sk => {
      const matchName = (sk.name || '').toLowerCase().includes(q);
      const matchDesc = (sk.description || '').toLowerCase().includes(q);
      const matchId = (sk.id || '').toLowerCase().includes(q);
      const matchContent = (sk.content || '').toLowerCase().includes(q);
      return matchName || matchDesc || matchId || matchContent;
    });
  }

  if (statsEl) {
    if (q) {
      statsEl.style.display = 'inline-block';
      statsEl.textContent = `Ditemukan ${filtered.length} dari ${totalSkills} skill`;
    } else {
      statsEl.style.display = 'none';
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-placeholder"><p>${q ? `Tidak ada skill yang cocok dengan pencarian "${escapeHtml(q)}".` : 'Belum ada skill terdaftar. Klik "+ Tambah Skill Baru".'}</p></div>`;
    return;
  }

  filtered.forEach(sk => {
    const isBuiltin = BUILTIN_SKILL_IDS.includes(sk.id) || !!sk.is_builtin;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-header">
        <div class="item-title-group">
          <div class="item-card-title">
            <span>⚡ ${escapeHtml(sk.name || 'Untitled Skill')}</span>
            ${isBuiltin ? '<span class="badge-builtin">Bawaan</span>' : ''}
          </div>
          <span class="tag-pill skill-tag"><code>${escapeHtml(sk.id)}</code></span>
        </div>
      </div>
      <p class="item-card-desc">${escapeHtml(sk.description || 'Tidak ada deskripsi.')}</p>
      <div class="item-code-preview">${escapeHtml(sk.content || '')}</div>
      <div class="item-card-actions">
        <button type="button" class="btn-item-action btn-edit-skill" data-id="${sk.id}">Edit SOP</button>
        ${!isBuiltin ? `
        <button type="button" class="btn-item-del btn-delete-skill" data-id="${sk.id}" title="Hapus Skill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : `
        <button type="button" class="btn-item-del disabled" title="Skill bawaan sistem dilindungi (tidak dapat dihapus)" disabled style="opacity: 0.35; cursor: not-allowed; filter: grayscale(1);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>`}
      </div>
    `;

    card.querySelector('.btn-edit-skill')?.addEventListener('click', () => openSkillModal(sk));
    if (!isBuiltin) {
      card.querySelector('.btn-delete-skill')?.addEventListener('click', () => deleteSkill(sk.id));
    }

    container.appendChild(card);
  });
}

function renderMemoriesCards(searchQuery = currentSearchMemories) {
  const container = document.getElementById('memories-cards-grid');
  const statsEl = document.getElementById('stats-search-memories');
  const clearBtn = document.getElementById('btn-clear-search-memories');
  if (!container) return;
  container.innerHTML = '';

  const q = (searchQuery || '').trim().toLowerCase();
  currentSearchMemories = searchQuery;

  if (clearBtn) clearBtn.style.display = q ? 'inline-flex' : 'none';

  let filtered = [...memoriesList];
  const totalMemories = filtered.length;

  if (q) {
    filtered = filtered.filter(mem => {
      const matchName = (mem.name || '').toLowerCase().includes(q);
      const matchDesc = (mem.description || '').toLowerCase().includes(q);
      const matchId = (mem.id || '').toLowerCase().includes(q);
      const matchContent = (mem.content || '').toLowerCase().includes(q);
      return matchName || matchDesc || matchId || matchContent;
    });
  }

  if (statsEl) {
    if (q) {
      statsEl.style.display = 'inline-block';
      statsEl.textContent = `Ditemukan ${filtered.length} dari ${totalMemories} memory`;
    } else {
      statsEl.style.display = 'none';
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-placeholder"><p>${q ? `Tidak ada memory yang cocok dengan pencarian "${escapeHtml(q)}".` : 'Belum ada memory terdaftar. Klik "+ Tambah Memory Baru".'}</p></div>`;
    return;
  }

  memoriesList.forEach(mem => {
    const isBuiltin = BUILTIN_MEMORY_IDS.includes(mem.id) || !!mem.is_builtin;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-header">
        <div class="item-title-group">
          <div class="item-card-title">
            <span>🧠 ${escapeHtml(mem.name || 'Untitled Memory')}</span>
            ${isBuiltin ? '<span class="badge-builtin">Bawaan</span>' : ''}
          </div>
          <span class="tag-pill memory-tag"><code>${escapeHtml(mem.id)}</code></span>
        </div>
      </div>
      <p class="item-card-desc">${escapeHtml(mem.description || '')}</p>
      <div class="item-code-preview">${escapeHtml(mem.content || '')}</div>
      <div class="item-card-actions">
        <button type="button" class="btn-item-action btn-edit-memory" data-id="${mem.id}">Edit</button>
        ${!isBuiltin ? `
        <button type="button" class="btn-item-del btn-delete-memory" data-id="${mem.id}" title="Hapus Memory">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : `
        <button type="button" class="btn-item-del disabled" title="Memory bawaan sistem dilindungi (tidak dapat dihapus)" disabled style="opacity: 0.35; cursor: not-allowed; filter: grayscale(1);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>`}
      </div>
    `;

    card.querySelector('.btn-edit-memory')?.addEventListener('click', () => openMemoryModal(mem));
    if (!isBuiltin) {
      card.querySelector('.btn-delete-memory')?.addEventListener('click', () => deleteMemory(mem.id));
    }

    container.appendChild(card);
  });
}

// =========================================================================
// CRUD Operations
// =========================================================================
async function setActiveAgent(agentId) {
  activeAgentId = agentId;
  agentsList.forEach(ag => {
    ag.is_default = (ag.id === agentId);
  });
  await chrome.storage.local.set({ active_agent_id: activeAgentId, custom_agents: agentsList });
  renderAgentsCards();
  showToast();
}

async function saveAgent(agentData) {
  if (agentData.id === "master_agent" || agentData.id === "boss_agent") {
    agentData.id = "master_agent";
    agentData.is_boss = true;
    agentData.is_default = true;
  }
  const existingIdx = agentsList.findIndex(a => a.id === agentData.id || (agentData.id === "master_agent" && a.id === "boss_agent"));
  if (existingIdx >= 0) {
    agentsList[existingIdx] = { ...agentsList[existingIdx], ...agentData };
  } else {
    agentsList.push(agentData);
  }

  // Ensure master_agent stays first
  agentsList.sort((a, b) => ((a.id === "master_agent" || a.is_boss) ? -1 : ((b.id === "master_agent" || b.is_boss) ? 1 : 0)));

  if (nativePort) {
    try {
      await sendNativeRpc("save_agent", { agent: agentData });
    } catch (e) {}
  }

  await chrome.storage.local.set({ custom_agents: agentsList });
  renderAgentsCards();
  updateBadgeCount('badge-count-agents', agentsList.length);
  closeAllModals();
  showToast();
}

async function deleteAgent(agentId) {
  if (BUILTIN_AGENT_IDS.includes(agentId)) {
    alert("Agent bawaan sistem dilindungi dan tidak dapat dihapus.");
    return;
  }
  if (agentsList.length <= 1) {
    alert("Minimal harus ada 1 agent.");
    return;
  }
  if (!confirm("Hapus agent ini? File Markdown lokal juga akan dihapus.")) return;

  agentsList = agentsList.filter(a => a.id !== agentId);
  if (activeAgentId === agentId) {
    activeAgentId = agentsList[0]?.id || null;
    if (agentsList[0]) agentsList[0].is_default = true;
  }

  if (nativePort) {
    try {
      await sendNativeRpc("delete_agent", { agent_id: agentId });
    } catch (e) {}
  }

  await chrome.storage.local.set({ custom_agents: agentsList, active_agent_id: activeAgentId });
  renderAgentsCards();
  updateBadgeCount('badge-count-agents', agentsList.length);
  showToast();
}

async function saveSkill(skillData) {
  const existingIdx = skillsList.findIndex(s => s.id === skillData.id);
  if (existingIdx >= 0) {
    skillsList[existingIdx] = skillData;
  } else {
    skillsList.push(skillData);
  }

  if (nativePort) {
    try {
      await sendNativeRpc("save_skill", { skill: skillData });
    } catch (e) {}
  }

  await chrome.storage.local.set({ custom_skills: skillsList });
  renderSkillsCards();
  updateBadgeCount('badge-count-skills', skillsList.length);
  closeAllModals();
  showToast();
}

async function deleteSkill(skillId) {
  if (BUILTIN_SKILL_IDS.includes(skillId)) {
    alert("Skill bawaan sistem dilindungi dan tidak dapat dihapus.");
    return;
  }
  if (!confirm("Hapus skill ini?")) return;

  skillsList = skillsList.filter(s => s.id !== skillId);
  // Also remove skill reference from agents
  agentsList.forEach(ag => {
    if (Array.isArray(ag.skills)) {
      ag.skills = ag.skills.filter(id => id !== skillId);
    }
  });

  if (nativePort) {
    try {
      await sendNativeRpc("delete_skill", { skill_id: skillId });
      for (const ag of agentsList) {
        await sendNativeRpc("save_agent", { agent: ag });
      }
    } catch (e) {}
  }

  await chrome.storage.local.set({ custom_skills: skillsList, custom_agents: agentsList });
  renderSkillsCards();
  renderAgentsCards();
  updateBadgeCount('badge-count-skills', skillsList.length);
  showToast();
}

async function saveMemory(memoryData) {
  const existingIdx = memoriesList.findIndex(m => m.id === memoryData.id);
  if (existingIdx >= 0) {
    memoriesList[existingIdx] = memoryData;
  } else {
    memoriesList.push(memoryData);
  }

  if (nativePort) {
    try {
      await sendNativeRpc("save_memory", { memory: memoryData });
    } catch (e) {}
  }

  await chrome.storage.local.set({ custom_memories: memoriesList });
  renderMemoriesCards();
  updateBadgeCount('badge-count-memories', memoriesList.length);
  closeAllModals();
  showToast();
}

async function deleteMemory(memoryId) {
  if (BUILTIN_MEMORY_IDS.includes(memoryId)) {
    alert("Memory bawaan sistem dilindungi dan tidak dapat dihapus.");
    return;
  }
  if (!confirm("Hapus memory ini?")) return;

  memoriesList = memoriesList.filter(m => m.id !== memoryId);
  agentsList.forEach(ag => {
    if (Array.isArray(ag.memories)) {
      ag.memories = ag.memories.filter(id => id !== memoryId);
    }
  });

  if (nativePort) {
    try {
      await sendNativeRpc("delete_memory", { memory_id: memoryId });
      for (const ag of agentsList) {
        await sendNativeRpc("save_agent", { agent: ag });
      }
    } catch (e) {}
  }

  await chrome.storage.local.set({ custom_memories: memoriesList, custom_agents: agentsList });
  renderMemoriesCards();
  renderAgentsCards();
  updateBadgeCount('badge-count-memories', memoriesList.length);
  showToast();
}

// =========================================================================
// =========================================================================
// AI Generator Engine (Calls Configured AI Endpoint)
// =========================================================================
function populateAiModelSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '';
  const models = getModelsList();
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = (m.name && m.name !== m.id) ? `${m.name} (${m.id})` : (m.name || m.id);
    if (m.id === config.model || m.id === config.selectedModelChoice) opt.selected = true;
    select.appendChild(opt);
  });
}

async function callAiToGenerate(prompt, systemInstruction, targetModel = null) {
  if (!config.apiKey && config.preset !== "ollama" && config.preset !== "9router") {
    throw new Error("API Key belum dikonfigurasi. Silakan isi di tab AI & Provider terlebih dahulu.");
  }
  const endpointUrl = config.endpoint.replace(/\/+$/, "") + "/chat/completions";
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

  const chosenModel = targetModel || config.model || "gemini-2.5-flash";

  const payload = {
    model: chosenModel,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2048,
    stream: false
  };

  const resp = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI API Error (${resp.status}): ${errText}`);
  }

  const rawResponse = await resp.text();
  let rawText = "";

  // 1. Check if the response is an SSE (Server-Sent Events) stream (e.g. data: {"id": ...})
  if (rawResponse.includes("data:")) {
    let accumulated = "";
    const lines = rawResponse.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data:")) {
        try {
          const jsonStr = trimmed.replace(/^data:\s*/, "");
          const chunk = JSON.parse(jsonStr);
          const delta = chunk.choices?.[0]?.delta || chunk.choices?.[0]?.message;
          if (delta?.content) {
            accumulated += delta.content;
          }
        } catch (e) {}
      }
    }
    rawText = accumulated || rawResponse;
  } else {
    // 2. Standard JSON Response
    try {
      const data = JSON.parse(rawResponse);
      rawText = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.response || rawResponse;
    } catch (e) {
      rawText = rawResponse;
    }
  }
  
  // 3. Extract JSON object from AI generation output (stripping markdown code blocks or wrapping text)
  let jsonCandidate = (typeof rawText === "string" ? rawText : JSON.stringify(rawText)).trim();
  const codeBlockMatch = jsonCandidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonCandidate = codeBlockMatch[1].trim();
  }

  // If there is preamble text before the JSON object, slice from first { to last }
  if (!jsonCandidate.startsWith("{")) {
    const firstBrace = jsonCandidate.indexOf("{");
    const lastBrace = jsonCandidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonCandidate = jsonCandidate.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    return { raw: rawText };
  }
}

// =========================================================================
// Modal Dialog Form Controllers
// =========================================================================
function closeAllModals() {
  if (modalAgent) modalAgent.style.display = 'none';
  if (modalSkill) modalSkill.style.display = 'none';
  if (modalMemory) modalMemory.style.display = 'none';
}

// Agent Modal
function openAgentModal(agent = null) {
  if (!modalAgent) return;
  const isBoss = agent?.id === "boss_agent" || agent?.is_boss;
  const isEdit = !!agent;
  document.getElementById('modal-agent-title').textContent = isBoss 
    ? 'Edit Persona & Instruksi Master Agent' 
    : (isEdit ? 'Edit Sub-Agent' : 'Tambah Sub-Agent Baru');
    
  document.getElementById('agent-form-id').value = agent?.id || '';
  document.getElementById('agent-form-name').value = agent?.name || '';
  document.getElementById('agent-form-desc').value = agent?.description || '';
  document.getElementById('agent-form-prompt').value = agent?.content || '';
  
  const defaultCheckbox = document.getElementById('agent-form-default');
  if (defaultCheckbox) {
    defaultCheckbox.checked = isBoss || !!agent?.is_default;
    defaultCheckbox.disabled = isBoss;
  }

  // Populate AI Generator Model Dropdown
  populateAiModelSelect('agent-ai-model-select');

  // Render Model Dropdown Options
  const modelSelect = document.getElementById('agent-form-model');
  if (modelSelect) {
    modelSelect.innerHTML = '<option value="">Gunakan Model Global</option>';
    getModelsList().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = (m.name && m.name !== m.id) ? `${m.name} (${m.id})` : (m.name || m.id);
      if (agent?.model === m.id) opt.selected = true;
      modelSelect.appendChild(opt);
    });
  }

  // Render Skills Checkboxes
  const skillsContainer = document.getElementById('agent-skills-checkboxes');
  if (skillsContainer) {
    skillsContainer.innerHTML = '';
    if (skillsList.length === 0) {
      skillsContainer.innerHTML = '<span style="font-size: 12px; color: #94A3B8;">Belum ada skill yang tersedia.</span>';
    } else {
      skillsList.forEach(sk => {
        const isChecked = Array.isArray(agent?.skills) && agent.skills.includes(sk.id);
        const label = document.createElement('label');
        label.className = 'checkbox-chip-label';
        label.innerHTML = `
          <input type="checkbox" name="agent_skill_checkbox" value="${sk.id}" ${isChecked ? 'checked' : ''}>
          <span>⚡ ${escapeHtml(sk.name)}</span>
        `;
        skillsContainer.appendChild(label);
      });
    }
  }

  // Render Memories Checkboxes
  const memoriesContainer = document.getElementById('agent-memories-checkboxes');
  if (memoriesContainer) {
    memoriesContainer.innerHTML = '';
    if (memoriesList.length === 0) {
      memoriesContainer.innerHTML = '<span style="font-size: 12px; color: #94A3B8;">Belum ada memory yang tersedia.</span>';
    } else {
      memoriesList.forEach(mem => {
        const isChecked = Array.isArray(agent?.memories) && agent.memories.includes(mem.id);
        const label = document.createElement('label');
        label.className = 'checkbox-chip-label';
        label.innerHTML = `
          <input type="checkbox" name="agent_memory_checkbox" value="${mem.id}" ${isChecked ? 'checked' : ''}>
          <span>🧠 ${escapeHtml(mem.name)}</span>
        `;
        memoriesContainer.appendChild(label);
      });
    }
  }

  setModalMode('agent', 'manual');
  modalAgent.style.display = 'flex';
}

// Skill Modal
function openSkillModal(skill = null) {
  if (!modalSkill) return;
  const isEdit = !!skill;
  document.getElementById('modal-skill-title').textContent = isEdit ? 'Edit Dokumen Skill' : 'Tambah Skill Baru';
  document.getElementById('skill-form-id').value = skill?.id || '';
  document.getElementById('skill-form-name').value = skill?.name || '';
  document.getElementById('skill-form-desc').value = skill?.description || '';
  document.getElementById('skill-form-content').value = skill?.content || '';

  // Populate AI Generator Model Dropdown
  populateAiModelSelect('skill-ai-model-select');

  setModalMode('skill', 'manual');
  modalSkill.style.display = 'flex';
}

// Memory Modal
function openMemoryModal(memory = null) {
  if (!modalMemory) return;
  const isEdit = !!memory;
  document.getElementById('modal-memory-title').textContent = isEdit ? 'Edit Memory' : 'Tambah Memory Baru';
  document.getElementById('memory-form-id').value = memory?.id || '';
  document.getElementById('memory-form-name').value = memory?.name || '';
  document.getElementById('memory-form-desc').value = memory?.description || '';
  document.getElementById('memory-form-content').value = memory?.content || '';

  // Populate AI Generator Model Dropdown
  populateAiModelSelect('memory-ai-model-select');

  setModalMode('memory', 'manual');
  modalMemory.style.display = 'flex';
}

function setModalMode(type, mode) {
  const manualBtn = document.getElementById(`${type}-mode-manual-btn`);
  const aiBtn = document.getElementById(`${type}-mode-ai-btn`);
  const aiSec = document.getElementById(`${type}-ai-section`);

  if (mode === 'ai') {
    manualBtn?.classList.remove('active');
    aiBtn?.classList.add('active');
    if (aiSec) aiSec.style.display = 'flex';
  } else {
    aiBtn?.classList.remove('active');
    manualBtn?.classList.add('active');
    if (aiSec) aiSec.style.display = 'none';
  }
}

// =========================================================================
// Event Listeners Setup
// =========================================================================
function setupEventListeners() {
  // Back to Chat button
  document.getElementById('btn-back-chat')?.addEventListener('click', () => {
    try {
      window.parent.postMessage({ action: 'closeSettings' }, '*');
    } catch (e) {}
    if (window.history.length > 1) {
      window.history.back();
    }
  });

  // Quick Add Model button
  document.getElementById('btn-add-model-row-quick')?.addEventListener('click', () => {
    document.getElementById('btn-add-model-row')?.click();
    document.getElementById('card-models-priority')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Test AI Connection button
  document.getElementById('btn-test-ai-conn')?.addEventListener('click', async () => {
    const endpoint = (settingEndpoint?.value.trim() || "").replace(/\/+$/, "") + "/chat/completions";
    const apiKey = settingApiKey?.value.trim() || "";
    const models = getModelsList();
    const model = models.length > 0 ? models[0].id : (config.model || "gemini-2.5-flash");
    const resultBox = document.getElementById('test-ai-result-box');
    if (!resultBox) return;

    resultBox.style.display = 'block';
    resultBox.className = 'test-result-box';
    resultBox.textContent = `Menghubungi AI endpoint (${model})...`;

    const startTime = Date.now();
    try {
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Hi, reply 'OK' in 1 word." }],
          max_tokens: 10
        })
      });
      const latency = Date.now() - startTime;
      if (res.ok) {
        resultBox.className = 'test-result-box success';
        resultBox.textContent = `Koneksi AI Berhasil! (Latency: ${latency}ms, Status: ${res.status})`;
      } else {
        const text = await res.text().catch(() => "");
        resultBox.className = 'test-result-box error';
        resultBox.textContent = `Koneksi Gagal (${res.status}): ${text.slice(0, 150)}`;
      }
    } catch (err) {
      resultBox.className = 'test-result-box error';
      resultBox.textContent = `Gagal Menghubungi Server: ${err.message}`;
    }
  });

  // Navigation Tabs Switching (with Scroll Target support)
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      const targetId = tab.getAttribute('data-target');

      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.keys(tabViews).forEach(k => {
        if (tabViews[k]) {
          tabViews[k].style.display = (k === tabName) ? 'flex' : 'none';
        }
      });

      if (targetId) {
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    });
  });

  // Modal Open Buttons
  document.getElementById('btn-open-add-agent')?.addEventListener('click', () => openAgentModal(null));
  document.getElementById('btn-open-add-skill')?.addEventListener('click', () => openSkillModal(null));
  document.getElementById('btn-open-add-memory')?.addEventListener('click', () => openMemoryModal(null));

  // Modal Close Buttons
  document.getElementById('btn-close-agent-modal')?.addEventListener('click', closeAllModals);
  document.getElementById('btn-cancel-agent-modal')?.addEventListener('click', closeAllModals);
  document.getElementById('btn-close-skill-modal')?.addEventListener('click', closeAllModals);
  document.getElementById('btn-cancel-skill-modal')?.addEventListener('click', closeAllModals);
  document.getElementById('btn-close-memory-modal')?.addEventListener('click', closeAllModals);
  document.getElementById('btn-cancel-memory-modal')?.addEventListener('click', closeAllModals);

  // Modal Mode Switchers
  document.getElementById('agent-mode-manual-btn')?.addEventListener('click', () => setModalMode('agent', 'manual'));
  document.getElementById('agent-mode-ai-btn')?.addEventListener('click', () => setModalMode('agent', 'ai'));
  document.getElementById('skill-mode-manual-btn')?.addEventListener('click', () => setModalMode('skill', 'manual'));
  document.getElementById('skill-mode-ai-btn')?.addEventListener('click', () => setModalMode('skill', 'ai'));
  document.getElementById('memory-mode-manual-btn')?.addEventListener('click', () => setModalMode('memory', 'manual'));
  document.getElementById('memory-mode-ai-btn')?.addEventListener('click', () => setModalMode('memory', 'ai'));

  // AI Generator - Agent
  document.getElementById('btn-generate-agent-ai')?.addEventListener('click', async () => {
    const promptInput = document.getElementById('agent-ai-prompt');
    const statusBox = document.getElementById('agent-ai-status');
    const genBtn = document.getElementById('btn-generate-agent-ai');
    const modelSelect = document.getElementById('agent-ai-model-select');
    const selectedModel = modelSelect ? modelSelect.value : config.model;
    const prompt = promptInput?.value.trim();

    if (!prompt) {
      alert("Silakan masukkan deskripsi agent yang ingin dibuat.");
      return;
    }

    genBtn.classList.add('loading');
    statusBox.className = 'ai-status-msg info';
    statusBox.style.display = 'block';
    statusBox.textContent = `Menghubungi AI (${selectedModel}) untuk merancang persona agent...`;

    try {
      const sysInstruction = `You are an expert AI persona architect. The user wants to build an autonomous AI Agent. Respond strictly with a valid JSON object in this format:\n{\n  "name": "Concise Agent Name",\n  "description": "Short summary of role",\n  "system_prompt": "Detailed Markdown system prompt defining behavior, tone, rules, and workflow."\n}`;
      const result = await callAiToGenerate(prompt, sysInstruction, selectedModel);

      if (result.name) document.getElementById('agent-form-name').value = result.name;
      if (result.description) document.getElementById('agent-form-desc').value = result.description;
      if (result.system_prompt) document.getElementById('agent-form-prompt').value = result.system_prompt;
      else if (result.raw) document.getElementById('agent-form-prompt').value = result.raw;

      statusBox.style.display = 'none';
      setModalMode('agent', 'manual');
    } catch (err) {
      statusBox.className = 'ai-status-msg error';
      statusBox.textContent = `Gagal generate: ${err.message}`;
    } finally {
      genBtn.classList.remove('loading');
    }
  });

  // AI Generator - Skill
  document.getElementById('btn-generate-skill-ai')?.addEventListener('click', async () => {
    const promptInput = document.getElementById('skill-ai-prompt');
    const statusBox = document.getElementById('skill-ai-status');
    const genBtn = document.getElementById('btn-generate-skill-ai');
    const modelSelect = document.getElementById('skill-ai-model-select');
    const selectedModel = modelSelect ? modelSelect.value : config.model;
    const prompt = promptInput?.value.trim();

    if (!prompt) {
      alert("Silakan masukkan deskripsi skill yang ingin dibuat.");
      return;
    }

    genBtn.classList.add('loading');
    statusBox.className = 'ai-status-msg info';
    statusBox.style.display = 'block';
    statusBox.textContent = `Menghubungi AI (${selectedModel}) untuk menyusun panduan skill...`;

    try {
      const sysInstruction = `You are an expert AI skills architect. The user wants to create a reusable specialized skill document (SOP). Respond strictly with a valid JSON object in this format:\n{\n  "name": "Skill Name",\n  "description": "Brief description of when to use this skill",\n  "content": "Step-by-step markdown guidelines, formulas, criteria, or rules for this skill."\n}`;
      const result = await callAiToGenerate(prompt, sysInstruction, selectedModel);

      if (result.name) document.getElementById('skill-form-name').value = result.name;
      if (result.description) document.getElementById('skill-form-desc').value = result.description;
      if (result.content) document.getElementById('skill-form-content').value = result.content;
      else if (result.raw) document.getElementById('skill-form-content').value = result.raw;

      statusBox.style.display = 'none';
      setModalMode('skill', 'manual');
    } catch (err) {
      statusBox.className = 'ai-status-msg error';
      statusBox.textContent = `Gagal generate: ${err.message}`;
    } finally {
      genBtn.classList.remove('loading');
    }
  });

  // AI Generator - Memory
  document.getElementById('btn-generate-memory-ai')?.addEventListener('click', async () => {
    const promptInput = document.getElementById('memory-ai-prompt');
    const statusBox = document.getElementById('memory-ai-status');
    const genBtn = document.getElementById('btn-generate-memory-ai');
    const modelSelect = document.getElementById('memory-ai-model-select');
    const selectedModel = modelSelect ? modelSelect.value : config.model;
    const prompt = promptInput?.value.trim();

    if (!prompt) {
      alert("Silakan masukkan aturan/memori yang ingin dibuat.");
      return;
    }

    genBtn.classList.add('loading');
    statusBox.className = 'ai-status-msg info';
    statusBox.style.display = 'block';
    statusBox.textContent = `Menghubungi AI (${selectedModel}) untuk mensintesis memori...`;

    try {
      const sysInstruction = `You are a memory synthesis expert. Create a concise memory rule for an AI agent based on user preferences. Respond strictly with a valid JSON object:\n{\n  "name": "Memory Title",\n  "description": "Brief description",\n  "content": "Concise markdown bullet points defining user preferences or permanent rules."\n}`;
      const result = await callAiToGenerate(prompt, sysInstruction, selectedModel);

      if (result.name) document.getElementById('memory-form-name').value = result.name;
      if (result.description) document.getElementById('memory-form-desc').value = result.description;
      if (result.content) document.getElementById('memory-form-content').value = result.content;
      else if (result.raw) document.getElementById('memory-form-content').value = result.raw;

      statusBox.style.display = 'none';
      setModalMode('memory', 'manual');
    } catch (err) {
      statusBox.className = 'ai-status-msg error';
      statusBox.textContent = `Gagal generate: ${err.message}`;
    } finally {
      genBtn.classList.remove('loading');
    }
  });

  // Form Submissions
  document.getElementById('form-agent')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('agent-form-id').value || `agent_${Date.now()}`;
    const name = document.getElementById('agent-form-name').value.trim();
    const model = document.getElementById('agent-form-model').value.trim();
    const description = document.getElementById('agent-form-desc').value.trim();
    const content = document.getElementById('agent-form-prompt').value.trim();
    const is_default = document.getElementById('agent-form-default').checked;

    const selectedSkills = [];
    document.querySelectorAll('input[name="agent_skill_checkbox"]:checked').forEach(cb => selectedSkills.push(cb.value));

    const selectedMemories = [];
    document.querySelectorAll('input[name="agent_memory_checkbox"]:checked').forEach(cb => selectedMemories.push(cb.value));

    saveAgent({
      id,
      name,
      model,
      description,
      content,
      skills: selectedSkills,
      memories: selectedMemories,
      is_default
    });
  });

  document.getElementById('form-skill')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('skill-form-id').value || `skill_${Date.now()}`;
    const name = document.getElementById('skill-form-name').value.trim();
    const description = document.getElementById('skill-form-desc').value.trim();
    const content = document.getElementById('skill-form-content').value.trim();

    saveSkill({ id, name, description, content });
  });

  document.getElementById('form-memory')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('memory-form-id').value || `mem_${Date.now()}`;
    const name = document.getElementById('memory-form-name').value.trim();
    const description = document.getElementById('memory-form-desc').value.trim();
    const content = document.getElementById('memory-form-content').value.trim();

    saveMemory({ id, name, description, content });
  });

  // Preset Pills & Template Items
  document.querySelectorAll('.preset-pill, .template-item').forEach(pill => {
    pill.addEventListener('click', () => {
      const preset = pill.getAttribute('data-preset');
      if (!preset) return;
      config.preset = preset;
      if (PRESET_CONFIGS[preset]) {
        config.endpoint = PRESET_CONFIGS[preset].endpoint;
        config.model = PRESET_CONFIGS[preset].model;
        config.imageModel = PRESET_CONFIGS[preset].imageModel || config.imageModel;
        config.temperature = PRESET_CONFIGS[preset].temp;
        config.models = DEFAULT_MODELS_BY_PRESET[preset] ? [...DEFAULT_MODELS_BY_PRESET[preset]] : [config.model];
      }
      applyConfigToUI();
      renderModelsRows();
    });
  });

  // Temperature Slider
  settingTemp?.addEventListener('input', (e) => {
    if (tempValDisplay) tempValDisplay.textContent = parseFloat(e.target.value).toFixed(2);
  });

  // Toggle API Key visibility
  btnToggleApiKey?.addEventListener('click', () => {
    if (settingApiKey) {
      const isPwd = (settingApiKey.type === 'password');
      settingApiKey.type = isPwd ? 'text' : 'password';
      btnToggleApiKey.innerHTML = isPwd 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  });

  // Add Model Row Button
  btnAddRow?.addEventListener('click', async () => {
    const models = getModelsList(true);
    models.push({ id: '', name: '' });
    config.models = models;
    await chrome.storage.local.set({ browser_agent_config: config, active_agent_id: activeAgentId });
    renderModelsRows();
    const inputs = document.querySelectorAll('.model-input-name');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  });

  // Header Save Button
  btnSaveHeader?.addEventListener('click', saveAllConfig);

  // OS Tab Switcher
  document.querySelectorAll('.os-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const os = tab.getAttribute('data-os');
      document.querySelectorAll('.os-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.os-code-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById(`os-cmd-${os}`);
      if (panel) panel.style.display = 'flex';
    });
  });

  // Copy command buttons
  document.querySelectorAll('.copy-cmd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-copy');
      if (cmd) {
        navigator.clipboard.writeText(cmd);
        btn.textContent = 'Tersalin!';
        setTimeout(() => { btn.textContent = 'Salin Perintah'; }, 1500);
      }
    });
  });

  // Search Inputs for Multi-Agent, Skills & Memories
  const searchAgentsInput = document.getElementById('search-agents-input');
  const btnClearSearchAgents = document.getElementById('btn-clear-search-agents');
  searchAgentsInput?.addEventListener('input', (e) => {
    renderAgentsCards(e.target.value);
  });
  btnClearSearchAgents?.addEventListener('click', () => {
    if (searchAgentsInput) {
      searchAgentsInput.value = '';
      renderAgentsCards('');
      searchAgentsInput.focus();
    }
  });

  const searchSkillsInput = document.getElementById('search-skills-input');
  const btnClearSearchSkills = document.getElementById('btn-clear-search-skills');
  searchSkillsInput?.addEventListener('input', (e) => {
    renderSkillsCards(e.target.value);
  });
  btnClearSearchSkills?.addEventListener('click', () => {
    if (searchSkillsInput) {
      searchSkillsInput.value = '';
      renderSkillsCards('');
      searchSkillsInput.focus();
    }
  });

  const searchMemoriesInput = document.getElementById('search-memories-input');
  const btnClearSearchMemories = document.getElementById('btn-clear-search-memories');
  searchMemoriesInput?.addEventListener('input', (e) => {
    renderMemoriesCards(e.target.value);
  });
  btnClearSearchMemories?.addEventListener('click', () => {
    if (searchMemoriesInput) {
      searchMemoriesInput.value = '';
      renderMemoriesCards('');
      searchMemoriesInput.focus();
    }
  });

  // Test connection button
  document.getElementById('btn-test-connection')?.addEventListener('click', checkPCBridgeStatus);
}

// =========================================================================
// PC Bridge Diagnostic
// =========================================================================
async function checkPCBridgeStatus() {
  const dot = document.getElementById('bridge-status-dot');
  const title = document.getElementById('bridge-status-title');
  const desc = document.getElementById('bridge-status-desc');
  const resultBox = document.getElementById('test-connection-result');

  if (title) title.textContent = "Menguji koneksi...";
  if (dot) dot.className = "indicator-dot";

  try {
    const res = await sendNativeRpc("ping");
    if (res && res.status === "ok") {
      updateBridgeUI(true, "PC Bridge Terhubung (Online)", `Platform: ${res.platform} • DB: ${res.db_path}`);
      if (resultBox) {
        resultBox.style.display = "block";
        resultBox.className = "test-result-box success";
        resultBox.textContent = `Koneksi Berhasil! Native host aktif di ${res.cwd} (Versi: ${res.version || '1.0'})`;
      }
    } else {
      throw new Error(res.error || "Gagal berkomunikasi");
    }
  } catch (err) {
    updateBridgeUI(false, "PC Bridge Belum Terpasang", "Jalankan script instalasi di bawah untuk mengaktifkan");
    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.className = "test-result-box error";
      resultBox.textContent = `Error: ${err.message}. Pastikan script install.sh telah dijalankan.`;
    }
  }
}

function updateBridgeUI(online, titleText, descText) {
  const dot = document.getElementById('bridge-status-dot');
  const title = document.getElementById('bridge-status-title');
  const desc = document.getElementById('bridge-status-desc');

  if (dot) dot.className = `indicator-dot ${online ? 'online' : 'offline'}`;
  if (title) title.textContent = titleText;
  if (desc) desc.textContent = descText;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  if (typeof str !== 'string') {
    try { str = JSON.stringify(str); } catch (e) { str = String(str); }
  }
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener('DOMContentLoaded', init);

// Realtime sync from Sidepanel
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.browser_agent_config) {
    config = { ...config, ...changes.browser_agent_config.newValue };
    applyConfigToUI();
    renderModelsRows();
  }
});
