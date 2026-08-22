// =========================================================================
// Browser Agent - Autonomous Web & Local PC AI Controller (Standalone)
// =========================================================================

// Global State
let config = {
  preset: "gemini",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: "",
  model: "auto",
  selectedModelChoice: "auto",
  imageModel: "dall-e-3",
  temperature: 0.2,
  maxTokens: 4096,
  autoRotateModel: true,
  models: [],
  customModels: []
};

let conversationHistory = [];
let pendingAttachments = [];
let currentSessionId = null;
let currentSessionTitle = "New Chat";
let currentSessionCreatedAt = null;
let sessionToDeleteId = null;
let sessionToDeleteTitle = "";
let isExecuting = false;
let abortController = null;
let activeTabId = null;
let nativePort = null;
let nativeRpcCallbacks = new Map();
let nativeReqId = 1;
let consoleLogs = [];
let viewMode = 'chat'; // 'chat' or 'terminal'
let currentChatMode = 'agent'; // 'agent' (default, autonomous browser control) or 'chat' (conversational only)

// Multi-Agent Persona, Skills & Memories State
let customAgents = [];
let customSkills = [];
let customMemories = [];

// Maintain long-lived port connection to background for visibility synchronization across tabs
let sidepanelBackgroundPort = null;
try {
  sidepanelBackgroundPort = chrome.runtime.connect({ name: "sidepanel" });
} catch(e) {}

let activeAgentId = null;
let activeAgent = null;

// Conversational Chat-Only System Prompt (No browser tools)
const CHAT_ONLY_SYSTEM_PROMPT = `Anda adalah Browser Agent dalam "Mode Chat (Percakapan Cepat)".
Anda siap berdiskusi, membantu analisa ide/data, menjawab pertanyaan umum, coding, merangkum teks, dan konsultasi secara cerdas, akurat, dan to the point.

ATURAN UTAMA & DETEKSI OTOMASI BROWSER:
- Mode Chat TIDAK memiliki akses ke tool browser (tidak bisa membuka tab web baru, mengklik tombol di website, mengambil screenshot halaman web, membaca chat WhatsApp di tab aktif, atau mengeksekusi aksi browser secara otomatis).
- Jika pengguna meminta tindakan yang memerlukan kontrol/otomasi browser (contoh: "buka google", "buka youtube", "baca pesan wa di tab aktif", "klik tombol login", "ambil screenshot web ini", "cari info di tab sebelah", "isi form ini", dll), Anda WAJIB:
  1. Menjelaskan secara ringkas dan ramah bahwa tindakan tersebut memerlukan kontrol browser dan dapat dijalankan di "Mode Agent".
  2. Menyertakan tag switch khusus di baris paling akhir respons Anda dengan format persis:
     [SWITCH_TO_AGENT_REQUEST: <perintah_asli_pengguna>]

Contoh jika user minta "Buka web kompas dan cari info":
"Untuk membuka tab web dan mencari informasi secara langsung di browser, silakan beralih ke Mode Agent.

[SWITCH_TO_AGENT_REQUEST: Buka web kompas dan cari info]"`;

// Base System Prompt with Tool Directives (Agent Mode)
const DEFAULT_SYSTEM_PROMPT = `You are Browser Agent, an autonomous, highly capable AI assistant capable of controlling the user's web browser, accessing local PC data, and generating high-quality images.

You have access to 3 categories of tools:
1. BROWSER AUTOMATION TOOLS (via Chrome DevTools Protocol):
   - browser_screenshot(): Take a screenshot of the active tab. MANDATORY ON STEP 1 of browser control tasks to inspect visual layout and walkthrough orientation.
   - browser_snapshot(): Get the interactive DOM / Accessibility tree with backendNodeIds for clicking and typing.
   - browser_list_tabs(): List all open browser tabs (tabId, title, url, active). Use to see what tabs exist and find target sites (e.g. Meta Ads, Docs, YouTube, etc.).
   - browser_switch_tab(tabId): Switch focus to a specific tab by tabId so subsequent actions (browser_screenshot, browser_snapshot, browser_click) operate on it.
   - browser_create_tab(url): Open a new tab with the specified URL and switch focus to it.
   - browser_navigate(url): Navigate the active browser tab to any URL.
   - browser_click(backendNodeId): Click on an interactive element using its backendNodeId.
   - browser_type(backendNodeId, text, pressEnter): Type text into an input box.
   - browser_press_key(key): Press a key like 'Enter', 'Escape', 'Tab', 'Space', 'k'.
   - browser_hover(backendNodeId): Move mouse over an element.
   - browser_scroll(scrollX, scrollY): Scroll the page.
   - browser_control_media(action): Play, pause, toggle, mute, or check status of HTML5/YouTube/Spotify videos and media.
   - browser_evaluate_script(script): Execute custom JavaScript in page context for direct interactions.
   - browser_get_console_logs(): Check page errors.

2. LOCAL PC TOOLS (via Local Native Host):
   - local_read_file(path): Read file contents from user's local PC.
   - local_write_file(path, content): Create or overwrite a file on user's PC.
   - local_list_dir(path): List files and directories on local PC.
   - local_run_command(command, cwd): Run a terminal shell command on the user's PC.

3. AI IMAGE GENERATION:
   - generate_image(prompt, aspect_ratio): Generate an image or illustration from a descriptive text prompt. When the user asks to draw, create, or generate an image, use this tool immediately.

4. SPECIALIST SUB-AGENT COORDINATION & DEEP TABLE EXTRACTION:
   - ask_clarification(question, context_summary, options): Call when user prompt is broad, ambiguous, or needs strategic direction before running complex actions. Presents 3 clickable option bubbles and 1 custom input to the user for interactive clarification.
   - browser_extract_table(max_rows, auto_scroll, sort_by_metric): Deep structured table/grid extraction that auto-scrolls virtual lists (e.g. Meta Ads 100+ campaigns) to extract ALL rows without first-page bias!
   - agent_subtask_analysis(agent_name, focus, findings, recommended_next_action): Call whenever a specialist sub-agent (e.g. Meta Ads Strategist, Gen-Z Copywriter, Deep Web Researcher) completes domain analysis, evaluates metrics, drafts copy, or formulates recommendations for Master Agent before directing next browser actions.

- MANDATORY SCREENSHOT WALKTHROUGH RULE (ATURAN MUTLAK SCREENSHOT WALKTHROUGH DI LANGKAH PERTAMA & AKHIR):
  Ketika pengguna meminta tindakan yang memerlukan kontrol browser (klik tombol, isi form, navigasi halaman, scroll, beli/pesan produk, login, eksplorasi web, analisis tampilan):
  1. LANGKAH 1 (WALKTHROUGH VISUAL AWAL): Master Agent WAJIB memanggil browser_screenshot() TERLEBIH DAHULU pada langkah pertama untuk mengambil screenshot walkthrough visual layar, melihat posisi elemen, mendeteksi modal/pop-up, dan memastikan orientasi halaman secara visual sebelum memerintahkan aksi klik/scroll.
  2. LANGKAH 2 (SNAPSHOT & DELEGASI PRESISI): Setelah screenshot walkthrough diambil dan dipahami, panggil browser_snapshot() untuk mendapatkan daftar backendNodeId interaktif, lalu Master Agent memerintahkan Browser Control Agent untuk melakukan klik (browser_click), pengetikan (browser_type), atau scroll (browser_scroll).
  3. LANGKAH 3 (VERIFIKASI & SCREENSHOT WALKTHROUGH AKHIR): Setiap setelah aksi browser dieksekusi atau sebelum tugas dinyatakan tuntas, agen WAJIB memanggil browser_screenshot() atau browser_snapshot() untuk memverifikasi perubahan visual layar secara riil agar diperiksa Master Agent sebelum mengirim laporan akhir ke pengguna!
- CHAT & WEB PAGE CONTENT READING RULE (ANTI-HALUSINASI & DATA ASLI):
  When asked to read or reply to messages from chat applications (WhatsApp Web, Telegram Web, Gmail, Instagram DM) or inspect articles/documents:
  1. Call browser_snapshot() immediately.
  2. Inspect the 'activePageContent' object returned by browser_snapshot(). On WhatsApp Web, look directly at 'activePageContent.recentChatMessages' to read the 100% exact, real sender names, timestamps, and message contents.
  3. STRICT PROHIBITION ON HALLUCINATING MESSAGES: NEVER fabricate, invent, or guess messages that are not present in activePageContent.recentChatMessages. Always quote or reply directly to the genuine messages found in activePageContent!
- MANDATORY POST-ACTION VERIFICATION (ATURAN VERIFIKASI VISUAL):
  Every time you click a button (browser_click), submit a form, or type text (browser_type), you MUST immediately call browser_snapshot() or browser_screenshot() to see the updated screen state! Check if a modal dialog opened (e.g. "Pilih format kampanye", "Lanjutkan", "Confirm", "Duplikat"), if a new step loaded, or if validation errors appeared. Continue clicking buttons and progressing through the flow until the entire task is actually completed on screen. NEVER assume a task is finished while a modal dialog or next step is still visible on screen!
- TAB SWITCHING AWARENESS (PENCARIAN TAB OTOMATIS):
  If the user asks you to analyze or operate on a specific service (e.g. 'analisis meta ads saya', 'buat iklan di pengelola iklan', 'cek google doc saya') but the current active tab is something unrelated (e.g. YouTube), first call browser_list_tabs() to check if that tab is open in another tab. If found, call browser_switch_tab({ tabId }) to focus it! If not open, call browser_create_tab({ url: "https://adsmanager.facebook.com/" }) or browser_navigate({ url }) to open it!
- When asked to SEARCH / RESEARCH & DOWNLOAD (e.g. 'carikan jurnal tentang AI...', 'cari paper riset', 'download pdf simpan di folder download'):
  1. Navigate to the search engine or journal repository: browser_navigate({ url: 'https://scholar.google.com/scholar?q=' + encodeURIComponent(query) }) or https://www.google.com/search?q= with query.
  2. ALWAYS call browser_snapshot() immediately after navigation to inspect the page DOM, read search results, and get clickable link IDs.
  3. Call browser_click({ backendNodeId }) on the most relevant journal / article link to open the article page, OR copy the direct PDF URL.
  4. Call browser_snapshot() again on the article page to find the 'Download PDF' / full text link.
  5. Download the PDF directly into the user's local Downloads folder using local_run_command:
     local_run_command({ command: 'curl -L -o "$HOME/Downloads/<filename>.pdf" "<pdf_url>"' })
  6. Verify the downloaded file with local_run_command({ command: 'ls -lh "$HOME/Downloads/<filename>.pdf"' }).
  7. Provide a complete, rich final Markdown report summarizing the findings, abstract, key points of the paper, and confirming the exact local file path where it was saved.
  8. NEVER stop after just navigating. You MUST continue taking snapshots, clicking links, downloading the file, and writing the final report!
- When the user asks to play a song, video, or music (e.g. 'play deny caknan', 'putar video', 'play lagu'):
  1. If not on YouTube, navigate to YouTube search: browser_navigate({ url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(userQuery) })
  2. ALWAYS call browser_snapshot() to inspect the search results and obtain the backendNodeId of the first relevant video link/heading.
  3. Call browser_click({ backendNodeId }) on that video to open the video page! (MANDATORY: You MUST click the video element to open the watch page, never stop at the search page).
  4. Once on the video page, call browser_control_media({ action: 'play' }) to ensure playback starts with user gesture.
  5. Reply to the user by mentioning the video title that has been played.
- When asked to 'play', 'pause', 'resume', or 'mute' media on the current tab, immediately call browser_control_media({ action }).
- When asked to generate, create, or draw an image, call generate_image with a detailed, descriptive prompt.
- When asked to interact with a web page, ALWAYS first take a snapshot (browser_snapshot) to see available elements and their IDs.
- To click or type into elements, use the backendNodeId returned from browser_snapshot.
- NEVER return a vague one-liner like 'Tindakan telah selesai dijalankan'. ALWAYS provide a clear, comprehensive final answer explaining the exact action performed, research findings, and file paths in clean Markdown.
- Respond in the language used by the user (default to Indonesian if user writes in Indonesian).
- Be concise, accurate, and proactive in solving tasks step-by-step.`;

function getDetailedCurrentTimeContext() {
  const now = new Date();
  
  const daysId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthsId = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const dayName = daysId[now.getDay()];
  const dateNum = now.getDate();
  const monthName = monthsId[now.getMonth()];
  const monthNum = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
  const localeFull = `${dayName}, ${dateNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} (${timeZone})`;
  
  return `=== CURRENT REAL-TIME TEMPORAL CONTEXT ===
- Waktu Lokal Sekarang: ${localeFull}
- Hari: ${dayName}
- Tanggal: ${dateNum}
- Bulan: ${monthName} (Bulan ke-${monthNum})
- Tahun: ${year}
- Jam / Pukul: ${hours}:${minutes}:${seconds}
- Zona Waktu: ${timeZone}
- ISO 8601: ${now.toISOString()}
- PENTING: Anda memiliki akses ke waktu nyata di atas. Gunakan tahun ${year} dan tanggal hari ini sebagai jangkar waktu saat ini saat mencari berita terkini, peristiwa terbaru, atau menjawab pertanyaan temporal pengguna. Jangan berasumsi waktu terkunci pada dataset lama.`;
}

const AUTO_AGENT_ID = "auto";

function getAgentDisplayName(ag) {
  if (!ag || !ag.name) return "Agen";
  let name = ag.name.trim();
  // Strip trailing metadata in parentheses or brackets e.g. (Module 408 & 254), (Mbak Ningsih), [v1.0]
  name = name.replace(/\s*[\(\[][^()\[\]]*[\)\]]/gi, '').trim();
  return name || ag.name;
}

const getAgentShortName = getAgentDisplayName;

function formatUserMentions(text) {
  if (!text) return "";
  let escaped = escapeHtml(text);

  // Sort candidate agents by name length descending to avoid partial greedy matches
  const sorted = [...customAgents]
    .filter(a => a && a.id !== "master_agent" && a.id !== "boss_agent" && !a.is_boss)
    .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

  for (const ag of sorted) {
    const dispName = getAgentDisplayName(ag);
    const escapedDisp = escapeHtml(dispName);
    const escapedFullName = escapeHtml(ag.name);
    
    // Replace @FullName or @DispName or @id
    const patterns = [
      new RegExp(`@${escapedFullName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi'),
      new RegExp(`@${escapedDisp.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi'),
      new RegExp(`@${ag.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi')
    ];

    for (const pat of patterns) {
      if (pat.test(escaped)) {
        escaped = escaped.replace(pat, `<span class="chat-mention-badge"><span class="mention-at">@</span>${escapedDisp}</span>`);
      }
    }
  }

  return escaped;
}

function sortAgentsByPipeline(agents) {
  const priority = {
    "web_researcher_agent": 1,
    "default_agent": 2,
    "coding_engineer_agent": 3
  };
  return [...agents].sort((a, b) => (priority[a.id] || 4) - (priority[b.id] || 4));
}

function resolveAutoAgents(userMessage = "", explicitMentionAgents = []) {
  const cleanStr = (typeof userMessage === 'string') ? userMessage : (userMessage?.content || userMessage?.textContent || "");
  const text = cleanStr.toLowerCase();
  const matchedWorkers = [];

  // 0. Include ONLY the explicit user-selected @mention chips (Exact match by ID)
  if (Array.isArray(explicitMentionAgents) && explicitMentionAgents.length > 0) {
    explicitMentionAgents.forEach(ag => {
      if (ag && ag.id !== "master_agent" && ag.id !== "boss_agent" && !matchedWorkers.some(m => m.id === ag.id)) {
        matchedWorkers.push(ag);
      }
    });
  } else {
    // 0b. If no chips were selected, check if user manually typed an @mention in userMessage (Match exact full name/ID only)
    const candidates = [...customAgents]
      .filter(a => a && a.id !== "master_agent" && a.id !== "boss_agent" && !a.is_boss)
      .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

    for (const ag of candidates) {
      const agNameLower = (ag.name || "").toLowerCase();
      const agIdLower = (ag.id || "").toLowerCase();
      const dispNameLower = getAgentDisplayName(ag).toLowerCase();

      if (text.includes(`@${agIdLower}`) || (agNameLower && text.includes(`@${agNameLower}`)) || (dispNameLower && text.includes(`@${dispNameLower}`))) {
        if (!matchedWorkers.some(m => m.id === ag.id)) {
          matchedWorkers.push(ag);
          break; // Only match the exact single target agent mentioned
        }
      }
    }
  }

  // 1. Check for research / journal / scraping / analysis intent (Pipeline Phase 1)
  const researchKeywords = [
    "riset", "research", "jurnal", "paper", "artikel", "cari data", "scraping", "scrape", 
    "ekstrak", "extract", "bandingkan", "komparasi", "compare", "analisis", "analisa", 
    "rangkum", "summarize", "summary", "harga", "produk", "pasar", "review", "studi", 
    "literatur", "tabel data", "berita", "news", "trend", "tren", "searching web", "cari jurnal", "baca web"
  ];
  const isResearch = researchKeywords.some(kw => text.includes(kw));
  if (isResearch) {
    const researchAgent = customAgents.find(a => a.id === "web_researcher_agent" || a.name?.toLowerCase().includes("research") || a.name?.toLowerCase().includes("riset"));
    if (researchAgent && !matchedWorkers.some(m => m.id === researchAgent.id)) {
      matchedWorkers.push(researchAgent);
    }
  }

  // 2. Check for browser navigation / interaction / media (Pipeline Phase 2)
  const generalKeywords = [
    "buka", "play", "putar", "youtube", "video", "musik", "lagu", "klik", "scroll", "tonton", "isi formulir", "login", "website", "tab", "link", "url"
  ];
  const isGeneral = generalKeywords.some(kw => text.includes(kw));
  if (isGeneral && !isResearch) {
    const defaultAgent = customAgents.find(a => a.id === "default_agent") || customAgents.find(a => a.id !== "master_agent" && a.id !== "boss_agent");
    if (defaultAgent && !matchedWorkers.some(m => m.id === defaultAgent.id)) {
      matchedWorkers.push(defaultAgent);
    }
  }

  // 3. Check for coding / system engineering / local file intent (Pipeline Phase 3)
  const codeKeywords = [
    "code", "koding", "coding", "script", "terminal", "command", "bash", "shell", 
    "python", "javascript", "typescript", "html", "css", "git", "repo", "commit", 
    "bug", "error", "traceback", "exception", "fix", "debug", "refactor", 
    "file", "folder", "directory", "dir", "cat", "ls", "grep", "npm", "pip", "docker",
    "lokal pc", "download masukin ke folder", "simpan ke lokal", "save to folder", "download ke pc", "lokal", "download"
  ];
  const isCoding = codeKeywords.some(kw => text.includes(kw));
  if (isCoding) {
    const codingAgent = customAgents.find(a => a.id === "coding_engineer_agent" || a.name?.toLowerCase().includes("coding") || a.name?.toLowerCase().includes("engineer"));
    if (codingAgent && !matchedWorkers.some(m => m.id === codingAgent.id)) {
      matchedWorkers.push(codingAgent);
    }
  }

  // 4. Check custom agents by keyword in description or name
  for (const ag of customAgents) {
    if (ag.id === "master_agent" || ag.id === "boss_agent" || ag.id === "default_agent" || ag.id === "web_researcher_agent" || ag.id === "coding_engineer_agent") continue;
    const nameMatch = ag.name && text.includes(ag.name.toLowerCase());
    const descWords = (ag.description || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descMatch = descWords.some(w => text.includes(w));
    if (nameMatch || descMatch) {
      if (!matchedWorkers.some(m => m.id === ag.id)) {
        matchedWorkers.push(ag);
      }
    }
  }

  // Fallback worker if none matched
  if (matchedWorkers.length === 0) {
    const defaultAgent = customAgents.find(a => a.id === "default_agent") || customAgents.find(a => a.id !== "master_agent" && a.id !== "boss_agent") || customAgents[0];
    if (defaultAgent) matchedWorkers.push(defaultAgent);
  }

  const sortedWorkers = sortAgentsByPipeline(matchedWorkers);

  // Master Agent is ALWAYS the supreme commander prepended at index 0
  let bossAgent = customAgents.find(a => a.id === "master_agent" || a.id === "boss_agent" || a.is_boss);
  if (!bossAgent) {
    bossAgent = {
      id: "master_agent",
      name: "Master Agent (Supreme Orchestrator)",
      description: "Koordinator utama dan direktur ekosistem AI",
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
      is_boss: true
    };
  } else {
    const requiredSkills = ["skill_screenshot_walkthrough", "skill_dashboard_preflight", "skill_browser_wait", "skill_extract_data", "skill_fill_form"];
    const existing = bossAgent.skills || [];
    bossAgent.skills = [...new Set([...requiredSkills, ...existing])];
  }

  return [bossAgent, ...sortedWorkers];
}

function buildDynamicSystemPrompt(agentOrAgents = null) {
  let agents = [];
  if (Array.isArray(agentOrAgents)) {
    agents = agentOrAgents.filter(Boolean);
  } else if (agentOrAgents) {
    agents = [agentOrAgents];
  } else if (activeAgentId === AUTO_AGENT_ID || !activeAgentId) {
    agents = resolveAutoAgents();
  } else {
    agents = [activeAgent || customAgents[0]].filter(Boolean);
  }

  if (agents.length === 0) {
    agents = [customAgents[0] || { name: "Master Agent (Supreme Orchestrator)", content: DEFAULT_SYSTEM_PROMPT }];
  }

  let prompt = "";

  // 1. Inject Real-Time Current Temporal Context
  prompt += getDetailedCurrentTimeContext() + "\n\n";

  const hasBoss = (agents[0]?.id === "master_agent" || agents[0]?.id === "boss_agent" || agents[0]?.is_boss);
  const workers = hasBoss ? agents.slice(1) : agents;

  // 2. Inject Agent Persona(s) with Master Agent Hierarchy
  if (hasBoss && workers.length > 0) {
    prompt += `=== PROTOKOL MASTER AGENT (SUPREME COMMANDER & KARYAWAN MULTI-AGENT SWARM) ===\n`;
    prompt += `👑 KOMANDAN UTAMA: **Master Agent (Supreme Commander & Orchestrator)**\n`;
    prompt += `Anda bertindak sebagai **Master Agent**, direktur utama dan koordinator tertinggi yang memimpin, menginterogasi, dan mengaudit seluruh agen karyawan bawahan Anda. Anda TIDAK HANYA MENURUTI PERINTAH SECARA PASIF, melainkan proaktif dan interaktif 2 arah.\n\n`;
    prompt += `🛠️ TIM AGEN KARYAWAN BAWAHAN YANG ANDA PERINTAH:\n`;
    workers.forEach((ag, idx) => {
      prompt += `Karyawan ${idx + 1} (${ag.name}): ${ag.description || 'Specialist'}\n`;
    });
    prompt += `\nALUR KERJA RESMI MASTER AGENT & SIKLUS PERINTAH KARYAWAN (MASTER MANDATE):

1. 🤔 TAHAP 1: INTERAKTIF 2-ARAH & KLARIFIKASI OPSI (JIKA PROMPT AMBIGU / KURANG LENGKAP):
   - JIKA instruksi pengguna masih umum, luas, atau kurang spesifik (contoh: "analisis mendalam bro lihat ke dalam iklan yang iklan paling rame di meta ads"):
   - DILARANG langsung berasumsi atau menebak-nebak!
   - Master Agent WAJIB memanggil tool \`ask_clarification({ question, context_summary, options: [opt1, opt2, opt3] })\` untuk menyajikan 3 Opsi Pilihan Interaktif + 1 Opsi Kustom kepada pengguna (misal: Opsi 1: Iklan Teramai saja [Volume Leads], Opsi 2: Iklan Teramai + Biaya Termurah [CPR/CPC Rendah], Opsi 3: Audit Menyeluruh Semua Adset + Rekomendasi Scaling & Copy).
   - Tunggu konfirmasi bubble dari pengguna sebelum melanjutkan ke eksekusi mendalam.

2. 🛠️ TAHAP 2: PRE-FLIGHT DASHBOARD CHECKLIST & FULL TABLE EXTRACTION (ANTI-DATA TERLEWAT):
   - Jika tugas berhubungan dengan tabel data, iklan (Meta Ads Manager), toko online, atau metrik analytics:
   - DILARANG hanya membaca 5-10 baris pertama di layar (Anti-Tunnel Vision)!
   - Master Agent WAJIB menjalankan 3 SOP Pre-Flight:
     a. 📅 RENTANG TANGGAL: Cek dan ubah filter rentang tanggal ke "Masa Pakai / Lifetime" atau rentang waktu yang sesuai (jangan biarkan di rentang sempit "Hari Ini" jika diminta mencari performa terbaik/teramai).
     b. 🔄 PENGURUTAN KOLOM: Klik sortir kolom target (misal: klik header "Hasil / Results ↓" untuk iklan teramai, atau "Biaya per Hasil / CPR ↑").
     c. 📊 EKSTRAKSI TABEL LENGKAP: Panggil \`browser_extract_table({ auto_scroll: true, max_rows: 200 })\` untuk menyedot SELURUH 100+ baris data dari virtual grid tanpa terpotong pagination!
     d. 🔍 VERIFIKASI TOTAL BARIS (ROW AUDIT GATE): Cocokkan jumlah total kampanye di akun (misal: 138 total kampanye). Pastikan dataset yang dianalisis mencakup seluruh data tersebut.

3. 📋 TAHAP 3: PERINTAH KARYAWAN BERTAHAP & SUBTASK ANALYSIS:
   - Setelah dataset lengkap terekstrak, Master Agent memerintahkan agen analis spesialis (misal: *Meta Ads Strategist*) untuk menelaah seluruh baris data dan melapor via \`agent_subtask_analysis\`.
   - Master Agent memeriksa laporan, mengambil screenshot walkthrough untuk verifikasi visual.
   - Jika ada tindakan lanjutan (misal duplikasi iklan, pause kampanye boros), Master Agent memerintahkan *General Browser Assistant* untuk melakukan klik/input form.

4. 🔍 TAHAP 4: AUDIT REKAPITULASI AKHIR SUPER DETAIL (FINAL QUALITY GATE):
   - Sebelum mengirimkan hasil akhir ke pengguna, Master Agent TIDAK LANGSUNG MERANGKUM CEPAT-CEPAT!
   - Master Agent mengumpulkan, mengkoreksi, dan menginterogasi seluruh laporan tindakan dari semua agen karyawan bawahannya.
   - Master Agent membandingkan data real di layar vs permintaan awal pengguna.
   - HANYA KETIKA SUDAH FIX 100% BENAR, LENGKAP, DAN TUNTAS, Master Agent menyusun Laporan Akhir Komprehensif secara profesional dalam format Markdown kepada pengguna.

ATURAN KRUSIAL:
- DILARANG KERAS berasumsi tanpa verifikasi riil melalui screenshot/snapshot/extract_table!
- Pastikan seluruh proses dan hasil kerja seluruh karyawan bawahan telah teruji 100% sebelum dilaporkan ke pengguna!\n\n`;

    prompt += `=== DETAIL INSTRUKSI & PERAN SUB-AGENT ===\n`;
    agents.forEach(ag => {
      prompt += `\n### Role Persona: ${ag.name}\n${(ag.content || DEFAULT_SYSTEM_PROMPT).trim()}\n`;
    });
    prompt += "\n";
  } else if (agents.length === 1) {
    const ag = agents[0];
    if (ag && ag.content && ag.content.trim().length > 0) {
      prompt += ag.content.trim() + "\n\n";
    } else {
      prompt += DEFAULT_SYSTEM_PROMPT + "\n\n";
    }
  } else {
    prompt += `=== PROTOKOL EKSEKUSI BERTAHAP MULTI-AGENT ===\n`;
    agents.forEach((ag, idx) => {
      prompt += `Tahap ${idx + 1} (${ag.name}): ${ag.description || 'Specialist'}\n`;
    });
    prompt += "\n";
    agents.forEach(ag => {
      prompt += `\n### Role Persona: ${ag.name}\n${(ag.content || DEFAULT_SYSTEM_PROMPT).trim()}\n`;
    });
    prompt += "\n";
  }

  prompt += `=== CAPABILITIES & TOOLS AVAILABLE ===
1. Browser Automation Tools: browser_navigate, browser_snapshot, browser_click, browser_type, browser_press_key, browser_hover, browser_scroll, browser_control_media, browser_evaluate_script, browser_screenshot, browser_get_console_logs.
2. Local PC Tools: local_read_file, local_write_file, local_list_dir, local_run_command.
3. AI Image Generation: generate_image(prompt, size).

Always provide clear, comprehensive final answers in clean Markdown.`;

  // 3. Inject Combined Assigned Skills (Deduplicated)
  const allSkillIds = [...new Set(agents.flatMap(a => a.skills || []))];
  if (hasBoss && !allSkillIds.includes("skill_screenshot_walkthrough")) {
    allSkillIds.unshift("skill_screenshot_walkthrough");
  }
  if (allSkillIds.length > 0) {
    const assigned = customSkills.filter(s => allSkillIds.includes(s.id));
    if (assigned.length > 0) {
      prompt += "\n\n=== ASSIGNED SKILLS & SOP GUIDELINES ===\n";
      assigned.forEach(sk => {
        prompt += `\n### Skill: ${sk.name}\n${sk.content}\n`;
      });
    }
  }

  // 4. Inject Combined Assigned Memories (Deduplicated)
  const allMemIds = [...new Set(agents.flatMap(a => a.memories || []))];
  if (allMemIds.length > 0) {
    const assigned = customMemories.filter(m => allMemIds.includes(m.id));
    if (assigned.length > 0) {
      prompt += "\n\n=== USER PREFERENCES & MEMORIES ===\n";
      assigned.forEach(mem => {
        prompt += `\n### Memory: ${mem.name}\n${mem.content}\n`;
      });
    }
  }

  return prompt;
}

// Tool Definitions for OpenAI-compatible Function Calling
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an AI image or illustration based on a descriptive text prompt. Supports custom dimensions and aspect ratios.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed descriptive text prompt for the image to generate" },
          size: { type: "string", description: "Image size or aspect ratio: 'auto', '1024x1024', '1280x720', '720x1280', '16:9', '9:16', '1:1', '4:3', '3:4'. Defaults to 'auto'.", default: "auto" }
        },
        required: ["prompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description: "Call this tool when user prompt is ambiguous, broad, or underspecified (e.g. asking for 'iklan paling rame' without specifying whether by leads, lowest CPR, or full audit). This presents 3 clickable option bubbles and 1 custom prompt input to the user for interactive 2-way clarification.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "Clear and friendly question explaining what needs clarification from the user" },
          context_summary: { type: "string", description: "Brief context of what was found or why clarification is needed" },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Exactly 3 concrete selectable option bubbles for the user to choose from"
          }
        },
        required: ["question", "options"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "agent_subtask_analysis",
      description: "Call this tool when a specialist sub-agent (e.g. Meta Ads Strategist, Gen-Z Copywriter, Deep Web Researcher, Market Analyst) evaluates data/metrics, drafts copy, or formulates recommendations to report back to Master Agent before physical browser actions.",
      parameters: {
        type: "object",
        properties: {
          agent_name: { type: "string", description: "Name of the specialist sub-agent (e.g. Meta Ads Strategist, Gen-Z Copywriter, Deep Web Researcher)" },
          focus: { type: "string", description: "Brief focus title (e.g. Evaluasi CPR & Scaling Reels, Analisis DOM Dashboard Iklan, Validasi Form Duplikat)" },
          findings: { type: "string", description: "Key analysis findings, metrics breakdown, formulated copy, or evaluation results" },
          recommended_next_action: { type: "string", description: "Recommended next action for General Browser Assistant (e.g. Klik tombol Lanjutkan, Masukkan nama duplikat, Tinjau dan Terbitkan)" }
        },
        required: ["agent_name", "focus", "findings"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_wait",
      description: "Wait for a specified duration in seconds (e.g. 1, 2, 3, 5) for slow network, async API requests, modal animations, or heavy web apps (like Meta Ads Manager) to finish loading before clicking or snapshotting.",
      parameters: {
        type: "object",
        properties: {
          duration_seconds: {
            type: "number",
            description: "Duration to wait in seconds (1 to 30). Defaults to 2."
          },
          reason: {
            type: "string",
            description: "Reason for waiting (e.g. 'Menunggu modal terbuka', 'Menunggu loading dashboard')"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_extract_table",
      description: "Extract structured data from tables, data grids, or virtual scroll lists (e.g. Meta Ads Manager campaign tables, analytics grids, e-commerce listings). Automatically extracts all rows, headers, and metrics without pagination bias, with optional auto-scrolling to capture deep rows.",
      parameters: {
        type: "object",
        properties: {
          max_rows: {
            type: "integer",
            description: "Maximum number of rows to extract (default: 100, max: 500)."
          },
          auto_scroll: {
            type: "boolean",
            description: "If true, scrolls down the table container to load all virtualized rows before extracting (crucial for Meta Ads Manager 100+ campaigns). Defaults to true."
          },
          sort_by_metric: {
            type: "string",
            description: "Optional metric keyword to sort extracted rows by (e.g. 'Hasil', 'Results', 'CPR', 'Biaya', 'Belanja')."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_list_tabs",
      description: "List all currently open browser tabs (tabId, title, url, active). Use this to discover open tabs and find target web apps (Meta Ads Manager, Google Docs, YouTube, etc.).",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_switch_tab",
      description: "Switch focus and bind the agent to a specific browser tab by tabId, title keyword, or URL (e.g. 'meta ads', 'instagram', tabId). Subsequent actions (browser_snapshot, browser_click) control that tab.",
      parameters: {
        type: "object",
        properties: {
          tabId: { type: "string", description: "The tabId (integer) or keyword / service name (e.g. 'meta ads', 'youtube') to switch to." }
        },
        required: ["tabId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_create_tab",
      description: "Open a new browser tab with the specified URL and switch focus to it.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to open in a new tab" }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Navigate active browser tab to a specific URL",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to navigate to (e.g. https://google.com)" }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Capture visual screenshot walkthrough of the active browser tab. MANDATORY on Step 1 of browser tasks to inspect layout, orientation, and modals before clicking or typing.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_snapshot",
      description: "Capture real-time interactive DOM elements, forms, and Accessibility Tree with backendNodeIds for clicking, typing, and post-action verification. Essential for zero-hallucination browser control.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "Click an interactive element on the page using its verified backendNodeId. Always verify screen updates with browser_snapshot or browser_screenshot afterwards.",
      parameters: {
        type: "object",
        properties: {
          backendNodeId: { type: "integer", description: "The backendNodeId from browser_snapshot" }
        },
        required: ["backendNodeId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description: "Type text into an input element using its backendNodeId. Follow with browser_snapshot to verify entered value or submit button.",
      parameters: {
        type: "object",
        properties: {
          backendNodeId: { type: "integer", description: "The backendNodeId of the target input element" },
          text: { type: "string", description: "The text to type" },
          pressEnter: { type: "boolean", description: "Whether to press Enter after typing" }
        },
        required: ["backendNodeId", "text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_press_key",
      description: "Press a keyboard key on the active web page",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Key name like 'Enter', 'Escape', 'Tab', 'ArrowDown'" }
        },
        required: ["key"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_hover",
      description: "Hover mouse pointer over an element to reveal dropdown menus or tooltips",
      parameters: {
        type: "object",
        properties: {
          backendNodeId: { type: "integer", description: "The backendNodeId to hover over" }
        },
        required: ["backendNodeId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_scroll",
      description: "Scroll page vertically or horizontally to bring elements into view. Follow with browser_snapshot or browser_screenshot to inspect new viewport.",
      parameters: {
        type: "object",
        properties: {
          scrollX: { type: "integer", description: "Horizontal delta in pixels" },
          scrollY: { type: "integer", description: "Vertical delta in pixels (positive = scroll down)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_control_media",
      description: "Directly control media playback (HTML5 video/audio, YouTube, Spotify, etc.) on the active tab: play, pause, toggle, mute, unmute, or get current playback status.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["play", "pause", "toggle", "mute", "unmute", "status"],
            description: "Playback action to perform ('play' starts/resumes video, 'pause' stops, 'toggle' switches, 'status' inspects)"
          }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_evaluate_script",
      description: "Execute a custom JavaScript expression directly in the active web page context and return the evaluated result. Use for advanced DOM interaction, form manipulation, or custom scripts.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "JavaScript code string to evaluate in the page context" }
        },
        required: ["script"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_get_console_logs",
      description: "Get recent console logs and runtime error messages from the active tab",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "local_read_file",
      description: "Read content of a local file on user's PC",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative file path on PC" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "local_write_file",
      description: "Write or create a file on user's local PC",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative file path" },
          content: { type: "string", description: "File content string" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "local_list_dir",
      description: "List directory contents on user's PC",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path (leave empty for current directory)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "local_run_command",
      description: "Execute a shell/terminal command on user's local PC",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command line to execute" },
          cwd: { type: "string", description: "Working directory (optional)" }
        },
        required: ["command"]
      }
    }
  }
];

// =========================================================================
// Terminal Initialization (xterm.js)
// =========================================================================
const term = new Terminal({
  cursorBlink: true,
  cursorStyle: 'block',
  fontSize: 13,
  fontFamily: '"JetBrains Mono", Courier, monospace',
  theme: {
    background: '#000000',
    foreground: '#f8fafc',
    cursor: '#10b981',
    black: '#000000',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#d946ef',
    cyan: '#06b6d4',
    white: '#f1f5f9'
  }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

function initTerminal() {
  const container = document.getElementById('terminal-container');
  if (container) {
    term.open(container);
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    }, 100);
  }
}

term.onData((data) => {
  if (nativePort) {
    nativePort.postMessage({ data });
  }
});

// =========================================================================
// IndexedDB Local Media Cache Manager (Images & Videos - Zero SQLite Bloat)
// =========================================================================
let mediaDB = null;

function initImageDB() {
  return new Promise((resolve) => {
    if (mediaDB) return resolve(mediaDB);
    try {
      const request = indexedDB.open("BrowserAgentMediaDB", 2);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => {
        mediaDB = e.target.result;
        resolve(mediaDB);
      };
      request.onerror = (e) => {
        console.warn("IndexedDB init error:", e);
        resolve(null);
      };
    } catch (e) {
      console.warn("IndexedDB exception:", e);
      resolve(null);
    }
  });
}

async function saveImageToIndexedDB(id, dataUrl, prompt = "") {
  try {
    const db = await initImageDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction("images", "readwrite");
      const store = tx.objectStore("images");
      store.put({ id, dataUrl, prompt, createdAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("IndexedDB save image error:", e);
  }
}

async function getImageFromIndexedDB(id) {
  try {
    const db = await initImageDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction("images", "readonly");
      const store = tx.objectStore("images");
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("IndexedDB get image error:", e);
    return null;
  }
}

async function saveVideoToIndexedDB(id, dataUrl, name = "", duration = 0) {
  try {
    const db = await initImageDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction("videos", "readwrite");
      const store = tx.objectStore("videos");
      store.put({ id, dataUrl, name, duration, createdAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("IndexedDB save video error:", e);
  }
}

async function saveVideoAttachmentsToIndexedDB(attachments) {
  if (!Array.isArray(attachments)) return;
  for (const att of attachments) {
    if (att.isVideo && att.dataUrl) {
      const vidId = att.id || ('att_vid_' + Date.now());
      await saveVideoToIndexedDB(vidId, att.dataUrl, att.name || 'video.mp4', att.duration || 0);
    }
  }
}

async function getVideoFromIndexedDB(id) {
  try {
    const db = await initImageDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction("videos", "readonly");
      const store = tx.objectStore("videos");
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("IndexedDB get video error:", e);
    return null;
  }
}

async function hydrateLocalImages(container = chatMessages) {
  if (!container) return;

  // 1. Hydrate AI Generated Images
  const wrappers = container.querySelectorAll('.gen-img-wrapper[data-local-id]');
  for (const wrapper of wrappers) {
    const imgId = wrapper.getAttribute('data-local-id');
    if (!imgId || wrapper.dataset.hydrated === 'true') continue;

    const imgEl = wrapper.querySelector('img');
    const downloadLink = wrapper.querySelector('.btn-gen-img-download');

    let cached = await getImageFromIndexedDB(imgId);
    let finalSrc = cached?.dataUrl;

    if (!finalSrc && nativePort) {
      try {
        const res = await sendNativeRpc("get_generated_image", { image_id: imgId });
        if (res && res.status === "ok" && res.data_url) {
          finalSrc = res.data_url;
          saveImageToIndexedDB(imgId, finalSrc, res.prompt || "");
        }
      } catch (e) {
        console.warn("Native host image fetch notice:", e);
      }
    }

    if (finalSrc) {
      wrapper.dataset.hydrated = 'true';
      wrapper.setAttribute('data-src', finalSrc);
      if (imgEl) {
        imgEl.src = finalSrc;
        imgEl.style.opacity = '1';
      }
      if (downloadLink) {
        downloadLink.href = finalSrc;
      }
    }
  }

  // 2. Hydrate Resumed Video Attachments from IndexedDB
  const videoCards = container.querySelectorAll('.user-attached-video-card[data-video-id]');
  for (const card of videoCards) {
    const vidId = card.getAttribute('data-video-id');
    if (!vidId || card.dataset.hydrated === 'true') continue;

    const cachedVid = await getVideoFromIndexedDB(vidId);
    if (cachedVid && cachedVid.dataUrl) {
      card.dataset.hydrated = 'true';
      const mediaWrapper = card.querySelector('.user-video-media-wrapper');
      if (mediaWrapper) {
        // Swap poster placeholder to real interactive video player
        mediaWrapper.innerHTML = `
          <video src="${cachedVid.dataUrl}" controls preload="metadata" playsinline controlsList="nofullscreen nodownload"></video>
          <button type="button" class="btn-video-fullscreen-overlay" title="Putar Layar Penuh (Fullscreen)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        `;
      }
    }
  }
}

// =========================================================================
// File Path Actions & Auto-Detection Helpers (Open File & Reveal Folder)
// =========================================================================
function extractFilePathsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/\uE000[^\uE001]+\uE001/g, ' ');
  const found = [];
  
  const pathRegex = /(?:^|[\s\(\[\"'`])((?:\/(?:home|Users|tmp|var|etc|usr|opt|root|mnt|media|\.browser-agent|[a-zA-Z0-9_\-\.]+)\/[^\n\r\"'`<>|:*?]+?\.[a-zA-Z0-9]{1,8})|(?:[a-zA-Z]:\\[^\n\r\"'`<>|:*?]+?\.[a-zA-Z0-9]{1,8})|(?:~\/[^\n\r\"'`<>|:*?]+?\.[a-zA-Z0-9]{1,8}))(?=[\s\)\]\"'`,;:]|$)/g;

  let match;
  while ((match = pathRegex.exec(clean)) !== null) {
    const p = match[1].trim();
    if (!p.startsWith('http://') && !p.startsWith('https://') && !found.includes(p)) {
      found.push(p);
    }
  }

  const lines = clean.split('\n');
  for (const line of lines) {
    if (/(?:lokasi|saved|output|path|file)\s*(?:file|path)?\s*[:=]\s*(.+)/i.test(line)) {
      const sub = line.replace(/^(?:lokasi|saved|output|path|file)\s*(?:file|path)?\s*[:=]\s*/i, '').trim();
      const candidate = sub.split(/\s+\(/)[0].trim().replace(/^['"`]|['"`]$/g, '');
      if ((candidate.startsWith('/') || /^[a-zA-Z]:\\/.test(candidate) || candidate.startsWith('~/')) && candidate.includes('.') && !found.includes(candidate)) {
        found.push(candidate);
      }
    }
  }

  return found;
}

function buildFileCardHtml(filePath, extraText = '') {
  const cleanPath = filePath.trim();
  const fileName = cleanPath.split(/[/\\]/).pop() || cleanPath;
  const ext = fileName.split('.').pop().toLowerCase();
  
  let iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
  } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  } else if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  }

  return `
    <div class="md-file-card" data-file-path="${escapeHtml(cleanPath)}">
      <div class="md-file-info">
        <div class="md-file-icon">${iconSvg}</div>
        <div class="md-file-details">
          <div class="md-file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>
          <div class="md-file-path" title="${escapeHtml(cleanPath)}">${escapeHtml(cleanPath)}${extraText ? ` <span class="md-file-meta">${escapeHtml(extraText)}</span>` : ''}</div>
        </div>
      </div>
      <div class="md-file-actions">
        <button type="button" class="btn-file-action btn-reveal-file" data-path="${escapeHtml(cleanPath)}" title="Buka folder dan sorot file di file manager">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>Open File</span>
        </button>
      </div>
    </div>
  `;
}

async function handleOpenFile(filePath, btn = null) {
  if (!filePath) return;
  const originalHtml = btn ? btn.innerHTML : '';
  try {
    if (btn) {
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      btn.innerHTML = `<svg class="spin-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg> <span>Membuka...</span>`;
    }
    const res = await sendNativeRpc("open_file", { path: filePath });
    if (res && res.status === "ok") {
      if (btn) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>Terbuka</span>`;
        setTimeout(() => { if (btn) btn.innerHTML = originalHtml; }, 2000);
      }
    } else {
      throw new Error(res?.error || "Gagal membuka file");
    }
  } catch (err) {
    console.error("Open file error:", err);
    if (btn) {
      btn.innerHTML = `<span style="color: #EF4444;">Gagal</span>`;
      setTimeout(() => { if (btn) btn.innerHTML = originalHtml; }, 2500);
    }
  } finally {
    if (btn) {
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    }
  }
}

async function handleRevealFile(filePath, btn = null) {
  if (!filePath) return;
  const originalHtml = btn ? btn.innerHTML : '';
  try {
    if (btn) {
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      btn.innerHTML = `<svg class="spin-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg> <span>Membuka...</span>`;
    }
    const res = await sendNativeRpc("reveal_file", { path: filePath });
    if (res && res.status === "ok") {
      if (btn) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>Terbuka</span>`;
        setTimeout(() => { if (btn) btn.innerHTML = originalHtml; }, 2000);
      }
    } else {
      throw new Error(res?.error || "Gagal membuka folder");
    }
  } catch (err) {
    console.error("Reveal file error:", err);
    if (btn) {
      btn.innerHTML = `<span style="color: #EF4444;">Gagal</span>`;
      setTimeout(() => { if (btn) btn.innerHTML = originalHtml; }, 2500);
    }
  } finally {
    if (btn) {
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    }
  }
}

function hydrateFileActions(container = chatMessages) {
  // Bottom action bar kept clean (only Copy button) as requested.
}

// =========================================================================
// Native Messaging Host Bridge (Local PC RPC & PTY)
// =========================================================================
let nativeReconnectTimer = null;
let rpcChunkBuffers = new Map();

function connectNativeHost() {
  updateHostStatus('connecting');
  try {
    nativePort = chrome.runtime.connectNative('com.antigravity.chrome.agent');
    updateHostStatus('connected');

    nativePort.onMessage.addListener((msg) => {
      // 0. Handle Chunked RPC Messages (Chunk Reassembly)
      if (msg && msg.is_chunk && msg.id) {
        let buf = rpcChunkBuffers.get(msg.id);
        if (!buf) {
          buf = { chunks: new Array(msg.total_chunks), received: 0 };
          rpcChunkBuffers.set(msg.id, buf);
        }
        buf.chunks[msg.chunk_index] = msg.chunk_data;
        buf.received++;
        if (buf.received === msg.total_chunks) {
          rpcChunkBuffers.delete(msg.id);
          const fullJsonStr = buf.chunks.join('');
          try {
            msg = JSON.parse(fullJsonStr);
          } catch (e) {
            console.error("Failed to parse reassembled chunked RPC message:", e);
            return;
          }
        } else {
          return; // Still waiting for more chunks
        }
      }

      // 1. Handle RPC Callbacks
      if (msg && msg.id && nativeRpcCallbacks.has(msg.id)) {
        const { resolve, reject } = nativeRpcCallbacks.get(msg.id);
        nativeRpcCallbacks.delete(msg.id);
        if (msg.status === 'ok') {
          resolve(msg);
        } else {
          reject(new Error(msg.error || 'Native RPC failed'));
        }
        return;
      }

      // 2. Handle Terminal Data
      if (msg && msg.data) {
        term.write(msg.data);
      }
    });

    nativePort.onDisconnect.addListener(() => {
      const lastErr = chrome.runtime.lastError;
      if (lastErr && !lastErr.message.includes("Extension context invalidated")) {
        // Native host disconnected normally or re-initializing
      }
      updateHostStatus('disconnected');
      nativePort = null;
      
      // Reject any pending callbacks so they don't hang
      for (const [id, cb] of nativeRpcCallbacks.entries()) {
        cb.reject(new Error(lastErr?.message || "Native host disconnected"));
      }
      nativeRpcCallbacks.clear();

      if (!nativeReconnectTimer) {
        nativeReconnectTimer = setTimeout(() => {
          nativeReconnectTimer = null;
          connectNativeHost();
        }, 1500);
      }
    });

  } catch (err) {
    console.warn("Native host connection error:", err);
    updateHostStatus('disconnected');
    if (!nativeReconnectTimer) {
      nativeReconnectTimer = setTimeout(() => {
        nativeReconnectTimer = null;
        connectNativeHost();
      }, 1500);
    }
  }
}

async function sendNativeRpc(action, params = {}) {
  // If not connected, attempt immediate connection and wait up to 1.5s
  if (!nativePort) {
    connectNativeHost();
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (nativePort) break;
    }
  }

  if (!nativePort) {
    throw new Error("Native PC Bridge is not connected. Run setup script.");
  }

  return new Promise((resolve, reject) => {
    const id = nativeReqId++;
    nativeRpcCallbacks.set(id, { resolve, reject });
    
    // 30s timeout
    setTimeout(() => {
      if (nativeRpcCallbacks.has(id)) {
        nativeRpcCallbacks.delete(id);
        reject(new Error(`RPC action '${action}' timed out`));
      }
    }, 30000);

    try {
      nativePort.postMessage({ id, action, ...params });
    } catch (postErr) {
      nativeRpcCallbacks.delete(id);
      reject(postErr);
    }
  });
}

function updateHostStatus(status) {
  const chip = document.getElementById('host-status-indicator');
  const text = document.getElementById('host-status-text');
  const diagDot = document.getElementById('diag-pc-bridge');
  const diagText = document.getElementById('diag-pc-text');

  if (chip && text) {
    if (status === 'connected') {
      chip.className = 'bento-status-chip chip-dark connected';
      text.textContent = 'PC Bridge: Online';
    } else if (status === 'connecting') {
      chip.className = 'bento-status-chip chip-dark';
      text.textContent = 'PC Bridge: Connecting...';
    } else {
      chip.className = 'bento-status-chip chip-dark disconnected';
      text.textContent = 'PC Bridge: Offline';
    }
  }

  if (diagDot && diagText) {
    if (status === 'connected') {
      diagDot.className = 'diag-dot connected';
      diagText.textContent = 'Connected (OK)';
    } else {
      diagDot.className = 'diag-dot disconnected';
      diagText.textContent = 'Not Connected';
    }
  }
}

// =========================================================================
// Browser Automation & CDP Controllers
// =========================================================================
function isNormalUrl(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

async function attachDebugger(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !isNormalUrl(tab.url)) {
      return;
    }
    await chrome.debugger.attach({ tabId }, "1.3");
  } catch (err) {
    if (!err.message.includes("already attached") && !err.message.includes("Cannot access")) {
      console.warn("Debugger attach notice:", err);
    }
  }
  try {
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
    await chrome.debugger.sendCommand({ tabId }, "DOM.enable");
    await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
  } catch (err) {}
}

async function selectTab(tabId) {
  if (!tabId) return;
  if (activeTabId && activeTabId !== tabId) {
    try {
      await chrome.debugger.detach({ tabId: activeTabId });
    } catch (err) {}
  }
  activeTabId = tabId;
  consoleLogs = [];
  try {
    // Automatically switch Chrome focus to the controlled tab so user sees live automation
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    }
    if (isNormalUrl(tab.url)) {
      await attachDebugger(tabId);
    }
    updateMcpStatus();
  } catch (err) {
    console.error("Failed to select tab:", err);
  }
}

function updateMcpStatus() {
  const chip = document.getElementById('mcp-status-indicator') || document.getElementById('chip-system-tab');
  const text = document.getElementById('mcp-status-text');
  const currentTabIdEl = document.getElementById('current-tab-id');
  const diagDot = document.getElementById('diag-browser-mcp');
  const diagText = document.getElementById('diag-mcp-text');
  if (!chip) return;

  if (!activeTabId) {
    chip.className = 'bento-status-chip chip-lime';
    if (text) text.textContent = 'No Bound Tab';
    if (currentTabIdEl) currentTabIdEl.textContent = '-';
    return;
  }

  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError || !tab) {
      chip.className = 'bento-status-chip chip-lime disconnected';
      chip.title = 'Bound tab closed. Click to bind to current tab.';
      if (text) text.textContent = 'Tab Closed';
      if (currentTabIdEl) currentTabIdEl.textContent = 'Closed';
      if (diagDot && diagText) {
        diagDot.className = 'diag-dot disconnected';
        diagText.textContent = 'No Tab Attached';
      }
      return;
    }
    const shortTitle = tab.title ? (tab.title.length > 14 ? tab.title.substring(0, 14) + '...' : tab.title) : `#${tab.id}`;
    if (isNormalUrl(tab.url)) {
      chip.className = 'bento-status-chip chip-lime connected';
      chip.title = `Bound to: ${tab.title} (${tab.url})\nClick to switch binding to current active tab`;
      if (text) text.textContent = `Tab: ${shortTitle}`;
      if (currentTabIdEl) currentTabIdEl.textContent = shortTitle;
      if (diagDot && diagText) {
        diagDot.className = 'diag-dot connected';
        diagText.textContent = 'Attached to Browser Tab';
      }
    } else {
      chip.className = 'bento-status-chip chip-lime';
      chip.title = 'Non-debuggable internal page';
      if (text) text.textContent = 'System Tab';
      if (currentTabIdEl) currentTabIdEl.textContent = 'System Tab';
    }
  });
}

// Track target tab updates and avoid jumping on tab switch
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId) {
    if (changeInfo.status === 'complete' && isNormalUrl(tab.url)) {
      await attachDebugger(tabId);
    }
    updateMcpStatus();
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
    updateMcpStatus();
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        await selectTab(tabs[0].id);
        updateMcpStatus();
      }
    } catch (e) {}
  }
});

// Click status chip to manually bind to current active tab
document.getElementById('mcp-status-indicator')?.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      await selectTab(tabs[0].id);
      updateMcpStatus();
    }
  } catch (e) {
    console.warn("Failed to bind to active tab:", e);
  }
});

// Capture console logs
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (source.tabId !== activeTabId) return;
  if (method === "Runtime.consoleAPICalled") {
    const { type, timestamp, args } = params;
    const message = args.map(arg => arg.value || arg.description || JSON.stringify(arg)).join(" ");
    consoleLogs.push({ type, timestamp, message });
  } else if (method === "Runtime.exceptionThrown") {
    const { timestamp, exceptionDetails } = params;
    consoleLogs.push({ type: "exception", timestamp, message: exceptionDetails.text || exceptionDetails.exception?.description });
  }
  if (consoleLogs.length > 100) consoleLogs.shift();
});

// =========================================================================
// Tool Execution Dispatcher
// =========================================================================
async function executeTool(name, args, assistantBubble = null) {
  if (!activeTabId && name.startsWith("browser_")) {
    const ownTab = await chrome.tabs.getCurrent().catch(() => null);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const target = tabs.find(t => !ownTab || t.id !== ownTab.id) || tabs[0];
    if (target) {
      await selectTab(target.id);
    }
  }

  // Ensure active tab is focused on any browser interaction so the user sees live action
  if (name.startsWith("browser_") && name !== "browser_list_tabs") {
    if (activeTabId) {
      try {
        await chrome.tabs.update(activeTabId, { active: true });
        const tab = await chrome.tabs.get(activeTabId).catch(() => null);
        if (tab && tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        }
      } catch (err) {}
    }
  }

  switch (name) {
    case "ask_clarification": {
      const q = args.question || "Mohon konfirmasi pilihan arahan Anda:";
      const opts = Array.isArray(args.options) ? args.options : [];
      const ctx = args.context_summary || "";

      showClarificationDock(q, opts, ctx);

      return {
        status: "clarification_displayed",
        question: q,
        options: opts,
        context_summary: ctx,
        hint: "Opsi konfirmasi arahan telah disajikan di panel atas input prompt. Menunggu pilihan arahan pengguna sebelum melanjutkan eksekusi."
      };
    }

    case "agent_subtask_analysis": {
      const agentName = args.agent_name || "Specialist Sub-Agent";
      const focus = args.focus || "Analisis Data";
      const findings = args.findings || "";
      const nextAction = args.recommended_next_action || "";

      return {
        status: "success",
        sub_agent: agentName,
        focus_area: focus,
        findings: findings,
        recommended_next_action: nextAction,
        hint: `Laporan telaah dari [${agentName}] telah diterima Master Agent. Master Agent: Evaluasi data ini, instruksikan General Browser Assistant untuk mengambil tindakan browser (klik/ketik jika diperlukan), dan jalankan browser_screenshot() untuk verifikasi visual.`
      };
    }

    case "browser_wait": {
      const durationSec = Math.max(0.5, Math.min(30, Number(args.duration_seconds) || 2));
      const reason = args.reason || "Menunggu proses loading halaman/modal";
      
      await new Promise(resolve => setTimeout(resolve, durationSec * 1000));
      
      let readyState = "unknown";
      try {
        if (activeTabId) {
          const evalRes = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.evaluate", {
            expression: "document.readyState",
            returnByValue: true
          });
          readyState = evalRes.result?.value || "complete";
        }
      } catch (e) {}

      const tab = activeTabId ? await chrome.tabs.get(activeTabId).catch(() => null) : null;

      return {
        status: "success",
        waited_seconds: durationSec,
        reason: reason,
        documentReadyState: readyState,
        pageTitle: tab?.title || "",
        hint: `Berhasil menunggu ${durationSec}s (${reason}). Halaman siap diinspeksi (browser_snapshot) atau diklik (browser_click).`
      };
    }

    case "browser_extract_table": {
      const maxRows = Math.min(500, Math.max(5, Number(args.max_rows) || 150));
      const autoScroll = args.auto_scroll !== false;

      let extractResult = null;
      try {
        if (!activeTabId) throw new Error("Tidak ada tab yang terhubung.");
        
        const scriptCode = `
          (async function extractSmartTable(maxRows, autoScroll) {
            function getHeaders() {
              const headerEls = Array.from(document.querySelectorAll('th, [role="columnheader"], .x-grid3-hd-inner'));
              const headers = headerEls.map(el => (el.innerText || '').trim()).filter(Boolean);
              return headers.length > 0 ? headers : ["Nama / Judul", "Status", "Hasil / Leads", "CPR", "Biaya", "Jangkauan"];
            }

            const rowDataMap = new Map();

            function scrapeVisibleRows() {
              const rowEls = Array.from(document.querySelectorAll('tr, [role="row"], .x-grid3-row, [data-testid*="row"]'));
              rowEls.forEach(row => {
                const text = (row.innerText || '').trim();
                if (!text || text.length < 4) return;
                if (row.querySelector('th, [role="columnheader"]')) return;
                
                const cells = Array.from(row.querySelectorAll('td, [role="gridcell"], [role="cell"], .x-grid3-cell-inner'))
                  .map(c => (c.innerText || '').trim())
                  .filter(c => c.length > 0);

                const key = cells.length > 0 ? cells.slice(0, 3).join(" | ") : text.slice(0, 80);
                if (!rowDataMap.has(key)) {
                  rowDataMap.set(key, {
                    raw_text: text,
                    cells: cells.length > 0 ? cells : [text]
                  });
                }
              });
            }

            scrapeVisibleRows();

            if (autoScroll && rowDataMap.size < maxRows) {
              const scrollTargets = [
                ...Array.from(document.querySelectorAll('[role="grid"], .x-grid3-scroller, [data-testid*="table"], .table-container, main')),
                document.documentElement,
                document.body
              ];
              
              for (let i = 0; i < 8 && rowDataMap.size < maxRows; i++) {
                scrollTargets.forEach(c => {
                  if (c && c.scrollBy) {
                    try { c.scrollBy(0, 650); } catch(e) {}
                  }
                });
                window.scrollBy(0, 650);
                await new Promise(r => setTimeout(r, 250));
                scrapeVisibleRows();
              }
              window.scrollTo(0, 0);
            }

            const headers = getHeaders();
            const allRows = Array.from(rowDataMap.values()).slice(0, maxRows);

            return {
              headers: headers,
              total_extracted: allRows.length,
              rows: allRows.map(r => r.cells.join(" | "))
            };
          })(${maxRows}, ${autoScroll});
        `;

        const evalRes = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.evaluate", {
          expression: scriptCode,
          awaitPromise: true,
          returnByValue: true
        });

        extractResult = evalRes.result?.value || { headers: [], total_extracted: 0, rows: [] };
      } catch (err) {
        return {
          status: "error",
          message: `Gagal mengekstrak tabel: ${err.message}`
        };
      }

      const total = extractResult.total_extracted || 0;
      const rows = extractResult.rows || [];

      return {
        status: "success",
        total_rows_extracted: total,
        headers_found: extractResult.headers.slice(0, 10),
        dataset_rows: rows,
        all_rows_count: total,
        hint: `Berhasil mengekstrak ${total} baris data tabel secara utuh tanpa bias halaman pertama. Master Agent & Sub-Agent Analis: Gunakan seluruh baris data ini untuk ranking dan analisis komparasi komprehensif 100% akurat.`
      };
    }

    case "browser_list_tabs": {
      const allTabs = await chrome.tabs.query({});
      const tabList = allTabs.map(t => ({
        tabId: t.id,
        title: t.title,
        url: t.url,
        active: t.active,
        windowId: t.windowId
      }));
      return {
        tabs: tabList,
        count: tabList.length,
        currentBoundTabId: activeTabId,
        hint: "Gunakan browser_switch_tab({ tabId }) untuk mengarahkan kontrol agent ke tab yang Anda tuju (misal tab Meta Ads / Pengelola Iklan)."
      };
    }

    case "browser_switch_tab": {
      const ownTab = await chrome.tabs.getCurrent().catch(() => null);
      const allTabs = await chrome.tabs.query({});
      let queryTerm = String(args.tabId ?? args.query ?? args.title ?? args.url ?? "").trim();
      let numId = Number(queryTerm);
      let targetTab = null;

      // Filter candidate tabs to exclude own extension tab if in tab mode
      const candidateTabs = allTabs.filter(t => !ownTab || t.id !== ownTab.id);

      // 1. If numerical tabId passed and exists in candidateTabs
      if (!isNaN(numId) && numId > 0) {
        targetTab = candidateTabs.find(t => t.id === numId);
      }

      // 2. If not found by ID, search by title or URL fuzzy match
      if (!targetTab && queryTerm) {
        const qLower = queryTerm.toLowerCase();
        targetTab = candidateTabs.find(t => 
          (t.title && t.title.toLowerCase().includes(qLower)) || 
          (t.url && t.url.toLowerCase().includes(qLower))
        );
      }

      // 3. Known quick services if requested service is not open yet
      const knownServices = {
        "meta ads": "https://adsmanager.facebook.com/",
        "facebook ads": "https://adsmanager.facebook.com/",
        "ads manager": "https://adsmanager.facebook.com/",
        "adsmanager": "https://adsmanager.facebook.com/",
        "instagram": "https://www.instagram.com/",
        "youtube": "https://www.youtube.com/",
        "chatgpt": "https://chatgpt.com/",
        "whatsapp": "https://web.whatsapp.com/",
        "facebook": "https://www.facebook.com/",
        "threads": "https://www.threads.net/",
        "tiktok": "https://www.tiktok.com/",
        "google": "https://www.google.com/"
      };

      if (!targetTab && queryTerm) {
        const qLower = queryTerm.toLowerCase();
        let matchedUrl = null;
        for (const [key, url] of Object.entries(knownServices)) {
          if (qLower.includes(key)) {
            matchedUrl = url;
            break;
          }
        }

        if (matchedUrl) {
          const newTab = await chrome.tabs.create({ url: matchedUrl, active: true });
          await selectTab(newTab.id);
          await new Promise(r => setTimeout(r, 1500));
          return {
            status: "success",
            tabId: newTab.id,
            title: newTab.title || queryTerm,
            url: matchedUrl,
            hint: `Tab ${queryTerm} belum dibuka sebelumnya. Otomatis membuka ${matchedUrl} di tab baru. WAJIB panggil browser_snapshot() sekarang!`
          };
        }
      }

      // 4. Fallback to active tab or first normal webpage tab if still not matched
      if (!targetTab) {
        targetTab = candidateTabs.find(t => t.active && isNormalUrl(t.url)) || candidateTabs.find(t => isNormalUrl(t.url)) || candidateTabs[0];
      }

      if (!targetTab) {
        let fallbackUrl = "https://www.google.com";
        if (queryTerm && /^https?:\/\//i.test(queryTerm)) {
          fallbackUrl = queryTerm;
        }
        const newTab = await chrome.tabs.create({ url: fallbackUrl, active: true });
        targetTab = newTab;
      }

      let updatedTab = targetTab;
      await selectTab(updatedTab.id);
      
      await new Promise(r => setTimeout(r, 500));
      return {
        status: "success",
        tabId: updatedTab.id,
        title: updatedTab.title || "Active Tab",
        url: updatedTab.url || "",
        hint: `Berhasil mengarahkan kontrol ke tab "${updatedTab.title || updatedTab.url}". WAJIB panggil browser_snapshot() sekarang untuk menginspeksi elemen pada tab ini!`
      };
    }

    case "browser_create_tab": {
      let targetUrl = args.url || "https://www.google.com";
      if (!/^https?:\/\//i.test(targetUrl) && !/^file:\/\//i.test(targetUrl) && !/^chrome:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
      }
      
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      await selectTab(newTab.id);
      
      await new Promise(r => setTimeout(r, 1500));
      return {
        status: "success",
        tabId: newTab.id,
        url: targetUrl,
        hint: "Tab baru berhasil dibuka. Panggil browser_snapshot() untuk melihat elemen pada halaman ini."
      };
    }

    case "browser_navigate": {
      let targetUrl = args.url || "https://www.google.com";
      if (!/^https?:\/\//i.test(targetUrl) && !/^file:\/\//i.test(targetUrl) && !/^chrome:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
      }

      const ownTab = await chrome.tabs.getCurrent().catch(() => null);
      let targetTabId = activeTabId;

      // If activeTabId is null, or belongs to our own full newtab extension page, open in a new active tab!
      if (!targetTabId || (ownTab && targetTabId === ownTab.id)) {
        const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
        await selectTab(newTab.id);
        targetTabId = newTab.id;
      } else {
        await chrome.tabs.update(targetTabId, { url: targetUrl, active: true });
        await selectTab(targetTabId);
      }

      await new Promise(resolve => {
        const listener = (tid, info) => {
          if (tid === targetTabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        setTimeout(resolve, 8000); // max 8s wait
      });
      await attachDebugger(targetTabId);
      const tab = await chrome.tabs.get(targetTabId).catch(() => ({ title: targetUrl, url: targetUrl, id: targetTabId }));
      updateMcpStatus();
      return { 
        status: "success", 
        title: tab.title || targetUrl, 
        url: tab.url || targetUrl,
        tabId: tab.id,
        hint: "Halaman web berhasil dibuka di tab browser. Panggil browser_snapshot() sekarang untuk melihat elemen tombol, link artikel, judul pencarian, atau tombol pada halaman ini."
      };
    }

    case "browser_snapshot": {
      await attachDebugger(activeTabId);
      const { nodes } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Accessibility.getFullAXTree");
      
      const interactiveNodes = (nodes || []).filter(n => {
        if (n.ignored) return false;
        const role = n.role?.value;
        const name = n.name?.value;
        const isInteractiveRole = [
          "button", "link", "textbox", "searchbox", "checkbox", "radio", "combobox", 
          "menuitem", "tab", "heading", "article", "dialog", "alert", "alertdialog", 
          "switch", "gridcell", "row", "columnheader"
        ].includes(role);
        return isInteractiveRole || (name && name.trim().length > 0);
      }).map(n => ({
        backendNodeId: n.backendDOMNodeId,
        role: n.role?.value,
        name: n.name?.value,
        value: n.value?.value,
        description: n.description?.value
      }));

      const tab = await chrome.tabs.get(activeTabId);

      // Deep Real-Time Active Content & Chat Extractor (100% Real DOM - Anti Hallucination)
      let activePageContent = null;
      let mediaStatus = null;

      try {
        const evalRes = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.evaluate", {
          expression: `(() => {
            const url = window.location.href;
            const isWhatsApp = url.includes('web.whatsapp.com');
            const isInstagram = url.includes('instagram.com');
            const isTelegram = url.includes('telegram.org') || url.includes('web.telegram.org');
            const isGmail = url.includes('mail.google.com');

            // 1. WhatsApp Web Chat Extractor
            if (isWhatsApp) {
              try {
                const chatHeader = document.querySelector('#main header');
                const contactName = chatHeader ? (chatHeader.querySelector('[title]')?.getAttribute('title') || chatHeader.querySelector('span[dir="auto"]')?.textContent || 'Active Chat') : '';
                
                const msgElements = Array.from(document.querySelectorAll('#main .message-in, #main .message-out, #main [data-testid="msg-container"]'));
                const recentMsgs = msgElements.slice(-25).map(el => {
                  const isIn = el.classList.contains('message-in') || !!el.closest('.message-in');
                  const prePlainText = el.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
                  
                  const textEl = el.querySelector('.copyable-text, [data-testid="selectable-text"], span._ao3e, span.selectable-text');
                  let text = textEl ? textEl.innerText.trim() : '';
                  if (!text) {
                    const clone = el.cloneNode(true);
                    clone.querySelectorAll('span[data-testid="msg-meta"], .copyable-text').forEach(m => m.remove());
                    text = clone.innerText.trim();
                  }
                  
                  const timeEl = el.querySelector('span[dir="auto"], [data-testid="msg-time"]');
                  const time = timeEl ? timeEl.innerText.trim() : '';

                  const hasImg = !!el.querySelector('img:not([alt=""]):not([src*="emoji"])');
                  const hasVideo = !!el.querySelector('video, [data-testid="video-thumb"]');
                  const hasAudio = !!el.querySelector('audio, [data-testid="audio-player"]');
                  const mediaType = hasVideo ? '[Lampiran Video]' : (hasImg ? '[Lampiran Foto / Stiker]' : (hasAudio ? '[Lampiran Pesan Suara]' : ''));

                  return {
                    direction: isIn ? 'incoming' : 'outgoing',
                    sender: isIn ? (contactName || 'Lawan Bicara') : 'Saya',
                    time: time,
                    text: text || mediaType,
                    meta: prePlainText
                  };
                }).filter(m => m.text && m.text.length > 0);

                const inputEl = document.querySelector('#main footer [contenteditable="true"], footer [contenteditable="true"]');
                const currentDraft = inputEl ? inputEl.innerText.trim() : '';

                return {
                  platform: "WhatsApp Web",
                  activeContact: contactName,
                  currentDraft: currentDraft,
                  messagesCount: recentMsgs.length,
                  recentChatMessages: recentMsgs
                };
              } catch (e) {
                return { platform: "WhatsApp Web", error: String(e) };
              }
            }

            // 2. Generic Web Page Real Visible Text Extractor
            try {
              const mainContainer = document.querySelector('main, article, [role="main"], #content, #main-content, .main-content') || document.body;
              const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => ({ tag: h.tagName.toLowerCase(), text: h.innerText.trim() })).filter(h => h.text);
              const paragraphs = Array.from(mainContainer.querySelectorAll('p, li, [role="article"], .tweet, .post')).slice(0, 30).map(p => p.innerText.trim()).filter(t => t.length > 5);

              const v = document.querySelector('video, audio');
              const media = v ? { present: true, paused: v.paused, currentTime: Math.round(v.currentTime), duration: Math.round(v.duration || 0), title: document.title } : { present: false };

              return {
                platform: "Generic Web",
                headings: headings,
                mainTextSnippets: paragraphs.slice(0, 15),
                visibleTextPreview: (mainContainer.innerText || '').slice(0, 3000),
                media: media
              };
            } catch (e) {
              return { platform: "Generic Web", visibleTextPreview: (document.body?.innerText || '').slice(0, 2000) };
            }
          })()`,
          returnByValue: true
        });
        activePageContent = evalRes.result?.value;
        if (activePageContent?.media) {
          mediaStatus = activePageContent.media;
        }
      } catch (e) {
        console.warn("browser_snapshot content extractor notice:", e);
      }

      return {
        pageTitle: tab.title,
        url: tab.url,
        activePageContent: activePageContent,
        mediaStatus: mediaStatus,
        interactiveElementsCount: interactiveNodes.length,
        elements: interactiveNodes.slice(0, 300)
      };
    }

    case "browser_click": {
      await attachDebugger(activeTabId);
      try {
        // 1. Scroll element into view first
        await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.scrollIntoViewIfNeeded", { backendNodeId: args.backendNodeId }).catch(() => {});
        
        // 2. Resolve element coordinates reliably using target element's actual visual bounds
        let coords = null;
        try {
          const { object } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.resolveNode", { backendNodeId: args.backendNodeId });
          if (object && object.objectId) {
            const res = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.callFunctionOn", {
              objectId: object.objectId,
              functionDeclaration: `function() {
                const el = this;
                if (!el) return null;

                const target = el.closest('button, [role="button"], a, input, select, textarea, [role="radio"], [role="checkbox"], [role="tab"], [role="menuitem"], label') || el;
                if (typeof target.scrollIntoView === 'function') {
                  target.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                } else if (typeof el.scrollIntoView === 'function') {
                  el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                }

                let rect = target.getBoundingClientRect ? target.getBoundingClientRect() : el.getBoundingClientRect();
                if ((!rect || rect.width === 0 || rect.height === 0) && el.getBoundingClientRect) {
                  rect = el.getBoundingClientRect();
                }

                if (!rect) return null;
                const cx = rect.width > 0 ? rect.left + rect.width / 2 : rect.left + 10;
                const cy = rect.height > 0 ? rect.top + rect.height / 2 : rect.top + 10;

                return {
                  x: Math.round(cx),
                  y: Math.round(cy)
                };
              }`,
              returnByValue: true
            });
            if (res && res.result && res.result.value) {
              coords = res.result.value;
            }
          }
        } catch (e) {}

        if (!coords) {
          try {
            const { model } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.getBoxModel", { backendNodeId: args.backendNodeId });
            const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
            coords = {
              x: Math.round((x1 + x2 + x3 + x4) / 4),
              y: Math.round((y1 + y2 + y3 + y4) / 4)
            };
          } catch (e) {}
        }

        // Animate AI Cursor glide and click to target coordinates immediately
        if (coords && coords.x > 0 && coords.y > 0) {
          chrome.tabs.sendMessage(activeTabId, {
            type: "AGENT_CLICK_ANIMATION",
            x: coords.x,
            y: coords.y,
            action: "click"
          }).catch(() => {});
        }

        // 3. Single Authoritative Click Execution (Zero Double-Click Collision)
        if (coords && coords.x > 0 && coords.y > 0) {
          // Native CDP Mouse Click (Exact single click)
          await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchMouseEvent", { type: "mousePressed", x: coords.x, y: coords.y, button: "left", clickCount: 1 });
          await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchMouseEvent", { type: "mouseReleased", x: coords.x, y: coords.y, button: "left", clickCount: 1 });
        } else {
          // Fallback direct JS click for virtual / offscreen nodes
          try {
            const { object } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.resolveNode", { backendNodeId: args.backendNodeId });
            if (object && object.objectId) {
              await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.callFunctionOn", {
                objectId: object.objectId,
                functionDeclaration: `function() {
                  const target = this.closest('button, [role="button"], a, input, select, textarea, [role="radio"], [role="checkbox"], [role="tab"], [role="menuitem"], label') || this;
                  if (typeof target.focus === 'function') target.focus();
                  if (typeof target.click === 'function') {
                    target.click();
                  } else {
                    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                  }
                }`,
                userGesture: true
              });
            }
          } catch (jsErr) {}
        }

        // 4. Wait 400ms for DOM / animations to settle
        await new Promise(r => setTimeout(r, 400));
        
        const tab = await chrome.tabs.get(activeTabId);
        return { 
          status: "success", 
          clickedNodeId: args.backendNodeId, 
          clickedAt: coords, 
          pageTitle: tab.title,
          url: tab.url,
          hint: "Klik tunggal berhasil dieksekusi! WAJIB ambil screenshot walkthrough (browser_screenshot) atau snapshot (browser_snapshot) sekarang untuk memeriksa perubahan layar!"
        };
      } catch (err) {
        throw new Error(`Gagal mengklik elemen (${args.backendNodeId}): ${err.message}`);
      }
    }

    case "browser_type": {
      await attachDebugger(activeTabId);
      try {
        // 1. Focus target and prepare coordinate without duplicate value setting
        let coords = null;
        try {
          await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.focus", { backendNodeId: args.backendNodeId }).catch(() => {});
          const { object } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.resolveNode", { backendNodeId: args.backendNodeId });
          if (object && object.objectId) {
            const res = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.callFunctionOn", {
              objectId: object.objectId,
              functionDeclaration: `function() {
                const target = this.closest('input, textarea, [contenteditable="true"]') || this.querySelector('input, textarea') || this;
                if (typeof target.focus === 'function') target.focus();
                
                if (typeof target.scrollIntoView === 'function') {
                  target.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                }

                // Clean existing value so typing cleanly replaces instead of duplicating
                if ('value' in target) {
                  target.value = '';
                } else if (target.isContentEditable) {
                  target.innerText = '';
                }

                let rect = target.getBoundingClientRect ? target.getBoundingClientRect() : this.getBoundingClientRect();
                const cx = rect.width > 0 ? rect.left + 15 : rect.left + 5;
                const cy = rect.height > 0 ? rect.top + rect.height / 2 : rect.top + 10;
                return {
                  x: Math.round(cx),
                  y: Math.round(cy)
                };
              }`,
              returnByValue: true,
              userGesture: true
            });

            if (res && res.result && res.result.value) {
              coords = res.result.value;
              if (coords.x > 0 && coords.y > 0) {
                chrome.tabs.sendMessage(activeTabId, {
                  type: "AGENT_CLICK_ANIMATION",
                  x: coords.x,
                  y: coords.y,
                  action: "type"
                }).catch(() => {});
              }
            }
          }
        } catch (e) {}

        // 2. Insert text cleanly ONCE via CDP Input (zero duplicate typing)
        await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.insertText", { text: args.text });

        if (args.pressEnter) {
          await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchKeyEvent", { type: "keyDown", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: "Enter", code: "Enter" });
          await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        }

        await new Promise(r => setTimeout(r, 400));
        return { 
          status: "success", 
          typedText: args.text, 
          pressedEnter: !!args.pressEnter,
          hint: "Teks berhasil diketik! WAJIB ambil screenshot walkthrough (browser_screenshot) atau snapshot (browser_snapshot) sekarang untuk memeriksa perubahan layar!"
        };
      } catch (err) {
        throw new Error(`Gagal mengetik teks (${args.backendNodeId}): ${err.message}`);
      }
    }

    case "browser_press_key": {
      await attachDebugger(activeTabId);
      const key = args.key;
      const isEnter = key.toLowerCase() === "enter";
      const keyCode = isEnter ? 13 : 0;
      await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: key, windowsVirtualKeyCode: keyCode });
      await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: key, windowsVirtualKeyCode: keyCode });
      return { success: true, pressedKey: key };
    }

    case "browser_hover": {
      await attachDebugger(activeTabId);
      let coords = null;
      try {
        const { object } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.resolveNode", { backendNodeId: args.backendNodeId });
        if (object && object.objectId) {
          const res = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.callFunctionOn", {
            objectId: object.objectId,
            functionDeclaration: `function() {
              const el = this;
              if (!el) return null;
              const target = el.closest('button, [role="button"], a, input, select, textarea, [role="radio"], [role="checkbox"], [role="tab"], [role="menuitem"], label') || el;
              let rect = target.getBoundingClientRect ? target.getBoundingClientRect() : el.getBoundingClientRect();
              if (!rect) return null;
              return {
                x: Math.round(rect.width > 0 ? rect.left + rect.width / 2 : rect.left + 10),
                y: Math.round(rect.height > 0 ? rect.top + rect.height / 2 : rect.top + 10)
              };
            }`,
            returnByValue: true
          });
          if (res && res.result && res.result.value) {
            coords = res.result.value;
          }
        }
      } catch (e) {}

      if (!coords) {
        try {
          const { model } = await chrome.debugger.sendCommand({ tabId: activeTabId }, "DOM.getBoxModel", { backendNodeId: args.backendNodeId });
          const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
          coords = {
            x: Math.round((x1 + x2 + x3 + x4) / 4),
            y: Math.round((y1 + y2 + y3 + y4) / 4)
          };
        } catch (e) {}
      }

      if (coords && coords.x > 0 && coords.y > 0) {
        chrome.tabs.sendMessage(activeTabId, {
          type: "AGENT_CLICK_ANIMATION",
          x: coords.x,
          y: coords.y,
          action: "hover"
        }).catch(() => {});
        await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchMouseEvent", { type: "mouseMoved", x: coords.x, y: coords.y });
      }
      return { success: true, hoveredAt: coords };
    }

    case "browser_scroll": {
      await attachDebugger(activeTabId);
      const scrollX = args.scrollX || 0;
      const scrollY = args.scrollY || 300;
      await chrome.debugger.sendCommand({ tabId: activeTabId }, "Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 300,
        y: 300,
        deltaX: scrollX,
        deltaY: scrollY
      });
      return { success: true, scrolled: { scrollX, scrollY } };
    }

    case "browser_control_media": {
      await attachDebugger(activeTabId);
      const action = args.action || "play";
      const script = `(() => {
        try {
          const videos = Array.from(document.querySelectorAll('video, audio'));
          const ytPlayBtn = document.querySelector('.ytp-play-button') || document.querySelector('button.ytp-play-button');
          const ytLargePlayBtn = document.querySelector('.ytp-large-play-button');
          
          let result = { action: "${action}", foundMediaCount: videos.length, isYouTube: !!(ytPlayBtn || ytLargePlayBtn) };

          if ("${action}" === "play") {
            if (ytLargePlayBtn && ytLargePlayBtn.offsetParent !== null) {
              ytLargePlayBtn.click();
            }
            if (ytPlayBtn) {
              const tooltip = (ytPlayBtn.getAttribute('data-title-no-tooltip') || ytPlayBtn.getAttribute('aria-label') || '').toLowerCase();
              if (tooltip.includes('play') || tooltip.includes('putar') || tooltip.includes('mainkan') || (videos.length > 0 && videos.every(v => v.paused))) {
                ytPlayBtn.click();
              }
            }
            videos.forEach(v => {
              if (v.paused) {
                v.muted = false;
                const p = v.play();
                if (p && typeof p.catch === 'function') {
                  p.catch(() => {
                    v.muted = true;
                    v.play().catch(e => console.warn(e));
                  });
                }
              }
            });
            result.playing = videos.some(v => !v.paused);
          } else if ("${action}" === "pause") {
            if (ytPlayBtn) {
              const tooltip = (ytPlayBtn.getAttribute('data-title-no-tooltip') || ytPlayBtn.getAttribute('aria-label') || '').toLowerCase();
              if (tooltip.includes('pause') || tooltip.includes('jeda') || (videos.length > 0 && videos.some(v => !v.paused))) {
                ytPlayBtn.click();
              }
            }
            videos.forEach(v => v.pause());
            result.playing = false;
          } else if ("${action}" === "toggle") {
            if (ytPlayBtn) {
              ytPlayBtn.click();
            } else if (videos.length > 0) {
              const anyPlaying = videos.some(v => !v.paused);
              videos.forEach(v => anyPlaying ? v.pause() : v.play().catch(e => console.warn(e)));
            }
            result.playing = videos.some(v => !v.paused);
          } else if ("${action}" === "mute") {
            videos.forEach(v => v.muted = true);
            result.muted = true;
          } else if ("${action}" === "unmute") {
            videos.forEach(v => v.muted = false);
            result.muted = false;
          } else if ("${action}" === "status") {
            result.playing = videos.some(v => !v.paused);
            result.mediaDetails = videos.map(v => ({ currentTime: Math.round(v.currentTime), duration: Math.round(v.duration || 0), paused: v.paused, muted: v.muted }));
            result.pageTitle = document.title;
          }

          const activeVid = videos.find(v => !v.paused) || videos[0];
          if (activeVid) {
            result.activeMedia = {
              currentTime: Math.round(activeVid.currentTime),
              duration: Math.round(activeVid.duration || 0),
              paused: activeVid.paused,
              muted: activeVid.muted
            };
          }
          return result;
        } catch(err) {
          return { status: "error", error: err.toString() };
        }
      })()`;

      const evalRes = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.evaluate", {
        expression: script,
        returnByValue: true,
        userGesture: true,
        awaitPromise: true
      });
      return evalRes.result?.value || { success: true, action };
    }

    case "browser_evaluate_script": {
      await attachDebugger(activeTabId);
      const userScript = args.script || "";
      const evalRes = await chrome.debugger.sendCommand({ tabId: activeTabId }, "Runtime.evaluate", {
        expression: `(() => { try { ${userScript} } catch(e) { return { error: e.toString() }; } })()`,
        returnByValue: true,
        userGesture: true,
        awaitPromise: true
      });
      return {
        success: true,
        result: evalRes.result?.value !== undefined ? evalRes.result.value : evalRes.result
      };
    }

    case "browser_screenshot": {
      const tab = await chrome.tabs.get(activeTabId);
      return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, async (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            let savedFilePath = "";
            const screenshotId = `walkthrough_${Date.now()}`;
            
            // Automatically persist screenshot to ~/.browser-agent/walkthrough_screenshots/ next to SQLite chat_history.db
            if (nativePort) {
              try {
                const saveRes = await sendNativeRpc("save_screenshot", {
                  screenshot_id: screenshotId,
                  image_data: dataUrl,
                  session_id: currentSessionId || "",
                  label: tab.title || "Walkthrough Audit"
                });
                if (saveRes && saveRes.status === "ok") {
                  savedFilePath = saveRes.file_path;
                }
              } catch (e) {
                console.warn("Screenshot local save notice:", e);
              }
            }

            resolve({ 
              status: "success", 
              pageTitle: tab.title, 
              url: tab.url, 
              savedFilePath: savedFilePath || undefined,
              image_url: dataUrl,
              hint: `Tangkapan layar walkthrough berhasil diambil${savedFilePath ? ` dan tersimpan di file lokal: "${savedFilePath}"` : ''}. Gunakan bukti visual ini untuk memvalidasi apakah seluruh tahapan selesai atau masih ada dialog yang belum tuntas.`
            });
          }
        });
      });
    }

    case "browser_get_console_logs": {
      return { logs: consoleLogs.slice(-20) };
    }

    case "local_read_file": {
      const res = await sendNativeRpc("read_file", { path: args.path });
      return { path: res.path, size: res.size, content: res.content };
    }

    case "local_write_file": {
      const res = await sendNativeRpc("write_file", { path: args.path, content: args.content });
      return { success: true, path: res.path, bytesWritten: res.bytes_written };
    }

    case "local_list_dir": {
      const res = await sendNativeRpc("list_dir", { path: args.path });
      return { path: res.path, items: res.items };
    }

    case "local_run_command": {
      const res = await sendNativeRpc("run_command", { command: args.command, cwd: args.cwd });
      return {
        exitCode: res.exit_code,
        stdout: res.stdout,
        stderr: res.stderr
      };
    }

    case "generate_image": {
      const prompt = args.prompt || "";
      const size = args.size || args.aspect_ratio || "auto";
      const model = config.imageModel || "ag/gemini-3.1-flash-image";

      let imageUrl = null;

      // 1. Attempt OpenAI-compatible /images/generations endpoint
      if (config.endpoint) {
        try {
          const baseEndpoint = config.endpoint.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
          const imgEndpoint = `${baseEndpoint}/images/generations`;
          const headers = { "Content-Type": "application/json" };
          if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

          const payload = {
            model: model,
            prompt: prompt,
            n: 1,
            size: size,
            quality: "auto",
            background: "auto",
            image_detail: "high",
            output_format: "png"
          };

          const resp = await fetch(imgEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: abortController ? abortController.signal : undefined
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.data?.[0]?.url) {
              imageUrl = data.data[0].url;
            } else if (data.data?.[0]?.b64_json) {
              imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
            } else if (data.image_url) {
              imageUrl = data.image_url;
            } else if (data.images?.[0]?.url) {
              imageUrl = data.images[0].url;
            } else if (data.url) {
              imageUrl = data.url;
            }
          } else {
            console.warn("Image endpoint returned status:", resp.status);
          }
        } catch (err) {
          console.warn("Direct /images/generations call notice, attempting fallback:", err);
        }
      }

      // 2. High-performance generative fallback: Pollinations AI (instant, no auth required, Flux/SDXL models)
      if (!imageUrl) {
        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        let width = 1024;
        let height = 1024;
        if (size === "16:9" || size === "1280x720") { width = 1280; height = 720; }
        else if (size === "9:16" || size === "720x1280") { width = 720; height = 1280; }
        else if (size === "4:3" || size === "1024x768") { width = 1024; height = 768; }
        else if (size === "3:4" || size === "768x1024") { width = 768; height = 1024; }

        const pollModel = encodeURIComponent(model.toLowerCase().includes("flux") ? "flux" : (model.toLowerCase().includes("turbo") ? "turbo" : "flux"));
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${pollModel}`;
      }

      // Generate lightweight image ID
      const imageId = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // 1. Cache immediately into IndexedDB
      await saveImageToIndexedDB(imageId, imageUrl, prompt);

      // 2. Save .png file to PC disk asynchronously via Native Host
      if (nativePort) {
        sendNativeRpc("save_generated_image", {
          image_id: imageId,
          image_data: imageUrl,
          prompt: prompt
        }).catch(err => console.warn("Native image file save notice:", err));
      }

      const localImgUrl = `local-img://${imageId}`;

      return {
        status: "success",
        prompt: prompt,
        size: size,
        image_id: imageId,
        image_url: localImgUrl,
        display_url: imageUrl,
        markdown: `![${prompt}](${localImgUrl})`
      };
    }

    default:
      throw new Error(`Tool '${name}' is not recognized.`);
  }
}

// =========================================================================
// Standalone Autonomous Agent Loop (OpenAI Format)
// =========================================================================
function sanitizeMessagesForApi(history, isChatOnly = false) {
  if (!Array.isArray(history)) return [];

  if (isChatOnly) {
    // In Chat-only mode: only pass pure user and assistant messages with textual content.
    // Strip tool messages and assistant tool_calls so standard LLM endpoints (without tools schema) accept the request cleanly.
    const textHistory = [];
    for (const msg of history) {
      if (!msg) continue;
      if (msg.role === 'user') {
        textHistory.push({
          role: 'user',
          content: msg.content
        });
      } else if (msg.role === 'assistant') {
        let textContent = (typeof msg.content === 'string') ? msg.content : (msg.displayContent || "");
        if (textContent && textContent.trim()) {
          // Clean up large image data URLs if any
          textContent = textContent.replace(/!\[([^\]]*)\]\((?:data:image\/[^\s)]+|local-img:\/\/[^\s)]+)\)/g, '[Gambar: $1]');
          textHistory.push({
            role: 'assistant',
            content: textContent
          });
        }
      }
    }

    // Ensure it doesn't end with an assistant turn
    while (textHistory.length > 0 && textHistory[textHistory.length - 1].role === 'assistant') {
      textHistory.pop();
    }

    return textHistory;
  }

  // Filter out any messages without valid roles
  const valid = history.filter(m => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'tool' || m.role === 'system'));

  let cleaned = valid.map((msg, index, arr) => {
    let content = msg.content;

    // Strip huge base64 data URLs or local-img protocol from assistant messages sent to API to protect context tokens
    if (msg.role === 'assistant' && typeof content === 'string') {
      content = content.replace(/!\[([^\]]*)\]\((?:data:image\/[^\s)]+|local-img:\/\/[^\s)]+)\)/g, (match, alt) => {
        return `[Gambar AI telah digenerate: ${alt || 'Image'}]`;
      });
    }

    // Handle tool message content trimming to prevent context limit errors
    if (msg.role === 'tool' && typeof content === 'string') {
      const isRecent = index >= arr.length - 4;
      if (!isRecent && content.length > 800) {
        try {
          const parsed = JSON.parse(content);
          content = JSON.stringify({
            status: parsed.status || "success",
            title: parsed.pageTitle || parsed.title || undefined,
            url: parsed.url || undefined,
            summary: "Output truncated to preserve token context"
          });
        } catch (e) {
          content = content.slice(0, 500) + "... [truncated]";
        }
      } else if (content.length > 30000) {
        content = content.slice(0, 30000) + "\n... [truncated to prevent token limit]";
      }
    }

    const clean = {
      role: msg.role,
      content: content !== undefined ? content : null
    };

    if (msg.name) clean.name = msg.name;
    if (msg.tool_calls && Array.isArray(msg.tool_calls)) clean.tool_calls = msg.tool_calls;
    if (msg.tool_call_id) clean.tool_call_id = msg.tool_call_id;
    return clean;
  });

  // Guard against Gemini "Requests ending with a model turn are not supported"
  while (cleaned.length > 0) {
    const last = cleaned[cleaned.length - 1];
    if (last.role === 'assistant' && (!last.tool_calls || last.tool_calls.length === 0)) {
      cleaned.pop();
    } else {
      break;
    }
  }

  return cleaned;
}

async function notifyActiveTabExecutionState(isExec, step = 1, maxStep = 15, statusText = "") {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const targetTabId = activeTabId || (tabs && tabs[0]?.id);
    if (targetTabId) {
      chrome.tabs.sendMessage(targetTabId, {
        type: "AGENT_EXECUTION_STATE",
        isExecuting: isExec,
        step: step,
        maxSteps: maxStep,
        statusText: statusText
      }).catch(async () => {
        if (isExec) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: targetTabId },
              files: ["content-scripts/content.js"]
            });
            chrome.tabs.sendMessage(targetTabId, {
              type: "AGENT_EXECUTION_STATE",
              isExecuting: isExec,
              step: step,
              maxSteps: maxStep,
              statusText: statusText
            }).catch(() => {});
          } catch (err) {}
        }
      });
    }
  } catch (e) {}
}

// Global listener for stop/pause execution from content script HUD
try {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && (msg.type === "ABORT_AGENT_EXECUTION" || msg.type === "PAUSE_AGENT_EXECUTION")) {
      cancelExecution();
      sendResponse({ status: "aborted" });
      return true;
    }
  });
} catch (e) {}

async function runAgentLoop(userMessage, attachments = [], explicitMentions = []) {
  if (!config.apiKey && config.preset !== "ollama" && config.preset !== "9router") {
    showSettingsModal();
    appendAssistantMessage("Silakan masukkan API Key dan atur Endpoint AI Anda di menu Setup untuk memulai.");
    return;
  }

  isExecuting = true;
  updateSendButtonState(true);
  abortController = new AbortController();
  notifyActiveTabExecutionState(true, 1, 15, "AI Controlling Browser...");

  if (!currentSessionId) {
    currentSessionId = 'sess_' + Date.now();
    const fallbackTitle = (attachments[0] ? attachments[0].name : 'Chat Session');
    currentSessionTitle = (userMessage || fallbackTitle).slice(0, 45).trim();
    currentSessionCreatedAt = Date.now();
  }

  // Construct user content payload
  // Construct user content payload
  let userPayloadContent = userMessage;
  const imageAttachments = Array.isArray(attachments) ? attachments.filter(a => a.isImage && a.dataUrl) : [];
  const videoAttachments = Array.isArray(attachments) ? attachments.filter(a => a.isVideo) : [];
  const textAttachments = Array.isArray(attachments) ? attachments.filter(a => !a.isImage && !a.isVideo && a.textContent) : [];

  let combinedPrompt = userMessage || "";
  if (textAttachments.length > 0) {
    const fileDocs = textAttachments.map(f => `--- [File Lampiran: ${f.name}] ---\n${f.textContent}`).join("\n\n");
    combinedPrompt = combinedPrompt ? `${combinedPrompt}\n\n${fileDocs}` : fileDocs;
  }

  if (videoAttachments.length > 0) {
    const videoDocs = videoAttachments.map(v => 
      `--- [Lampiran Video: ${v.name} (Durasi: ${Math.round(v.duration || 0)}s, Resolusi: ${v.width || 0}x${v.height || 0}, Ukuran: ${(v.size / (1024*1024)).toFixed(1)}MB)] ---\nMohon analisis video terlampir ini secara menyeluruh (alur visual, transisi, adegan, teks di video, audio/skrip, dan pesan utama).`
    ).join("\n\n");
    combinedPrompt = combinedPrompt ? `${combinedPrompt}\n\n${videoDocs}` : videoDocs;
  }

  if (imageAttachments.length > 0 || videoAttachments.length > 0) {
    userPayloadContent = [
      { type: "text", text: combinedPrompt || "Tolong analisis gambar/video/file terlampir ini." }
    ];

    // Add images
    imageAttachments.forEach(img => {
      userPayloadContent.push({
        type: "image_url",
        image_url: {
          url: img.dataUrl
        }
      });
    });

    // Add video keyframes
    videoAttachments.forEach(vid => {
      if (Array.isArray(vid.keyframes) && vid.keyframes.length > 0) {
        vid.keyframes.forEach(kf => {
          userPayloadContent.push({
            type: "text",
            text: `[Frame Video "${vid.name}" pada detik ke-${kf.timestamp}s]:`
          });
          userPayloadContent.push({
            type: "image_url",
            image_url: {
              url: kf.dataUrl
            }
          });
        });
      } else if (vid.dataUrl) {
        userPayloadContent.push({
          type: "image_url",
          image_url: {
            url: vid.dataUrl
          }
        });
      }
    });
  } else {
    userPayloadContent = combinedPrompt;
  }

  conversationHistory.push({
    role: "user",
    content: userPayloadContent,
    displayContent: userMessage,
    attachments: attachments
  });
  appendUserMessage(userMessage, attachments);

  const isAutoMode = (activeAgentId === AUTO_AGENT_ID || !activeAgentId);
  const resolvedAgents = isAutoMode ? resolveAutoAgents(userMessage, explicitMentions) : [activeAgent || customAgents[0]].filter(Boolean);
  
  const hasBoss = (resolvedAgents[0]?.id === "master_agent" || resolvedAgents[0]?.id === "boss_agent" || resolvedAgents[0]?.is_boss);
  const bossAgent = hasBoss ? resolvedAgents[0] : null;
  const workerAgents = hasBoss ? resolvedAgents.slice(1) : resolvedAgents;
  
  const initialAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");

  const agentInfo = {
    boss: bossAgent,
    workers: workerAgents,
    agents: resolvedAgents.map(a => ({ id: a.id, name: a.name, description: a.description })),
    displayName: initialAgentName,
    name: initialAgentName,
    isAuto: isAutoMode,
    isBoss: hasBoss,
    isMulti: workerAgents.length > 0
  };

  const assistantBubble = appendAssistantMessage(null, true, agentInfo);
  let maxSteps = 30;
  let currentStep = 0;

  if (hasBoss && workerAgents.length > 0) {
    updateFooterStatus(`👑 Master Agent: Menugaskan ${workerAgents.length} agen spesialis...`);
    updateAssistantActiveAgent(assistantBubble, "Master Agent", `Menemukan ${workerAgents.length} Agen Spesialis`, true, false);
  }

  try {
    while (currentStep < maxSteps && isExecuting) {
      currentStep++;
      if (hasBoss) {
        updateFooterStatus(`👑 Master Agent (Step ${currentStep})...`);
        notifyActiveTabExecutionState(true, currentStep, maxSteps, `Master Agent: Step ${currentStep}/${maxSteps}`);
        updateAssistantActiveAgent(assistantBubble, "Master Agent", `Mengarahkan tim eksekutor (Step ${currentStep})...`, true, false);
      } else {
        updateFooterStatus(`${initialAgentName} (Step ${currentStep})...`);
        notifyActiveTabExecutionState(true, currentStep, maxSteps, `${initialAgentName}: Step ${currentStep}/${maxSteps}`);
        updateAssistantActiveAgent(assistantBubble, initialAgentName, `Memproses (Step ${currentStep})...`, false, false);
      }

      // Prepare sanitized payload for API with dynamic agent persona & skills
      let dynamicSystemPrompt = buildDynamicSystemPrompt(resolvedAgents);
      const isPlanningTurn = (currentExecutionMode === 'planning' && !isPlanApprovedRun);
      if (isPlanningTurn) {
        dynamicSystemPrompt += `\n\n[PLANNING WORKFLOW MODE ACTIVE]:
PENTING: JANGAN mengeksekusi tool browser apa pun pada tahap ini!
Tugas Anda:
1. Awali dengan 1 kalimat pengantar singkat.
2. Buat "Rencana Langkah Kerja" terstruktur dengan format Markdown bernomor yang rapi:
### 📋 Rencana Langkah Kerja (Action Plan)
1. **[Nama Langkah 1]**
   - **Pelaksana:** [Nama Agen / Tool]
   - **Aksi:** [Tindakan spesifik yang akan dilakukan]
2. **[Nama Langkah 2]**
   - **Pelaksana:** [Nama Agen / Tool]
   - **Aksi:** [Tindakan spesifik yang akan dilakukan]
3. Tutup dengan 1 kalimat singkat menanyakan kesiapan pengguna untuk memulai eksekusi.`;
      }

      const messages = [
        { role: "system", content: dynamicSystemPrompt },
        ...sanitizeMessagesForApi(conversationHistory)
      ];

      const endpointUrl = config.endpoint.replace(/\/+$/, "") + "/chat/completions";
      const headers = {
        "Content-Type": "application/json"
      };
      if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      // Prioritized models candidates for auto-rotation
      let candidateModels = getCandidateModelsList();
      const specializedWithModel = resolvedAgents.find(a => a.model && a.model.trim().length > 0);
      if (specializedWithModel) {
        const spModel = specializedWithModel.model.trim();
        candidateModels = [spModel, ...candidateModels.filter(m => m !== spModel)];
      }
      if (config.autoRotateModel === false && config.selectedModelChoice && config.selectedModelChoice !== "auto") {
        candidateModels = [config.selectedModelChoice];
      } else if (config.autoRotateModel === false) {
        candidateModels = [candidateModels[0]];
      }

      let response = null;
      let activeModelChoice = candidateModels[0];

      for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
        activeModelChoice = candidateModels[mIdx];

        try {
          const resp = await fetch(endpointUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: activeModelChoice,
              messages,
              tools: isPlanningTurn ? undefined : AGENT_TOOLS,
              tool_choice: isPlanningTurn ? undefined : "auto",
              temperature: parseFloat(config.temperature) || 0.2,
              max_tokens: parseInt(config.maxTokens) || 4096,
              stream: true
            }),
            signal: abortController.signal
          });

          if (!resp.ok) {
            let errorMsg = "";
            try {
              const errJson = await resp.json();
              errorMsg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
            } catch (e) {
              errorMsg = await resp.text();
            }

            if (isRateLimitError(resp.status, errorMsg) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
              const nextModel = candidateModels[mIdx + 1];
              console.warn(`[Auto-Rotate] Model '${activeModelChoice}' rate limited (${resp.status}). Rotating to '${nextModel}'...`);
              updateFooterStatus(`🔄 Rate limit: Beralih ke ${nextModel}...`);
              updateAssistantActiveAgent(assistantBubble, hasBoss ? "Master Agent" : initialAgentName, `🔄 Model \`${activeModelChoice}\` terkena rate limit. Otomatis beralih ke \`${nextModel}\`...`, true, false);
              continue;
            }

            if (resp.status === 429) {
              throw new Error(`Rate Limit Exceeded (429): ${errorMsg || 'Kuota API limit atau rate limit tercapai. Silakan coba beberapa saat lagi.'}`);
            } else if (resp.status === 401) {
              throw new Error(`API Key Invalid (401): ${errorMsg || 'API Key salah atau belum diatur di Pengaturan.'}`);
            } else if (resp.status === 400) {
              throw new Error(`Bad Request / Limit (400): ${errorMsg || 'Panjang konteks atau format permintaan melampaui batas model.'}`);
            }
            throw new Error(`AI Request Error (${resp.status}): ${errorMsg}`);
          }

          response = resp;
          break;
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError' || !isExecuting) throw fetchErr;
          if (isRateLimitError(0, fetchErr.message) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
            const nextModel = candidateModels[mIdx + 1];
            console.warn(`[Auto-Rotate] Exception on '${activeModelChoice}'. Rotating to '${nextModel}'...`, fetchErr);
            updateFooterStatus(`🔄 Rate limit: Beralih ke ${nextModel}...`);
            continue;
          }
          throw fetchErr;
        }
      }

      if (!response) {
        throw new Error(`Gagal menghubungi AI dengan model ${candidateModels.join(', ')}.`);
      }

      let message = null;
      let accumulatedContent = "";
      let toolCallsMap = {};

      // Realtime streaming chunk processor (ChatGPT/Gemini style)
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          if (!isExecuting || abortController?.signal.aborted) {
            try { await reader.cancel(); } catch (e) {}
            throw new DOMException("Aborted", "AbortError");
          }

          const { done, value } = await reader.read();
          if (done) break;

          if (!isExecuting || abortController?.signal.aborted) {
            try { await reader.cancel(); } catch (e) {}
            throw new DOMException("Aborted", "AbortError");
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // Keep last incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data:")) {
              try {
                const jsonStr = trimmed.replace(/^data:\s*/, "");
                const chunk = JSON.parse(jsonStr);
                const delta = chunk.choices?.[0]?.delta || chunk.choices?.[0]?.message;
                if (delta) {
                  if (delta.content) {
                    accumulatedContent += delta.content;
                    updateAssistantText(assistantBubble, accumulatedContent, true);
                  }
                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index !== undefined ? tc.index : 0;
                      if (!toolCallsMap[idx]) {
                        toolCallsMap[idx] = { id: tc.id || `call_${idx}_${Date.now()}`, type: "function", function: { name: "", arguments: "" } };
                      }
                      if (tc.id) toolCallsMap[idx].id = tc.id;
                      if (tc.function?.name) toolCallsMap[idx].function.name += tc.function.name;
                      if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }

        const toolCalls = Object.values(toolCallsMap);
        message = {
          role: "assistant",
          content: accumulatedContent || null,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          agentInfo: agentInfo
        };
      } else {
        // Fallback for non-streamed JSON responses
        const rawText = await response.text();
        const result = JSON.parse(rawText);
        const choice = result.choices?.[0];
        if (!choice || !choice.message) {
          throw new Error("Invalid response format from AI endpoint.");
        }
        message = choice.message;
        message.agentInfo = agentInfo;
      }

      if (!isExecuting || abortController?.signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      conversationHistory.push(message);

      // Finalize assistant text only if there are NO tool calls in this turn
      if (message.content && (!message.tool_calls || message.tool_calls.length === 0)) {
        updateAssistantText(assistantBubble, message.content, false);
      }

      let shouldStopTurn = false;

      // Check if model called tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Clear interim pseudo-tool strings from bubble so only clean tool section is shown
        const contentEl = assistantBubble?.querySelector('.message-content');
        if (contentEl) {
          contentEl.innerHTML = '';
          contentEl.style.display = 'none';
        }

        for (const toolCall of message.tool_calls) {
          if (!isExecuting || abortController?.signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }

          const toolName = toolCall.function?.name || toolCall.name || "tool";
          let toolArgs = {};
          try {
            toolArgs = typeof toolCall.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : (toolCall.function?.arguments || {});
          } catch (e) {}

          const isWebTool = toolName.startsWith("browser_");
          const isLocalTool = toolName.startsWith("local_");
          const isAnalysisTool = (toolName === "agent_subtask_analysis");
          const isClarificationTool = (toolName === "ask_clarification");
          let activeWorkerAgent = null;

          if (isClarificationTool) {
            activeWorkerAgent = { id: "master_agent", name: "Master Agent (Klarifikasi Interaktif)", is_boss: true };
          } else if (isAnalysisTool) {
            const customAgentName = toolArgs.agent_name || "Specialist Sub-Agent";
            activeWorkerAgent = resolvedAgents.find(a => a.name?.toLowerCase().includes(customAgentName.toLowerCase())) || 
                                customAgents.find(a => a.name?.toLowerCase().includes(customAgentName.toLowerCase())) || 
                                { id: "specialist_analyst", name: customAgentName };
          } else if (toolName === "browser_screenshot") {
            // Master Agent performs the visual walkthrough audit
            activeWorkerAgent = { id: "master_agent", name: "Master Agent (Audit Walkthrough)", is_boss: true };
          } else if (isWebTool) {
            // General Browser Assistant executes physical browser operations
            activeWorkerAgent = resolvedAgents.find(a => a.id === "default_agent") || 
                                customAgents.find(a => a.id === "default_agent") || 
                                { id: "default_agent", name: "General Browser Assistant" };
          } else if (isLocalTool) {
            // Coding & System Engineer executes local shell commands and filesystem tasks
            activeWorkerAgent = resolvedAgents.find(a => a.id === "coding_engineer_agent") || 
                                customAgents.find(a => a.id === "coding_engineer_agent") || 
                                { id: "coding_engineer_agent", name: "Coding & System Engineer" };
          } else if (toolName === "generate_image") {
            // Visual Designer executes image generation
            activeWorkerAgent = resolvedAgents.find(a => a.name?.toLowerCase().includes("visual") || a.name?.toLowerCase().includes("desain")) || 
                                customAgents.find(a => a.name?.toLowerCase().includes("visual") || a.name?.toLowerCase().includes("desain")) || 
                                { id: "visual_designer", name: "AI Visual Designer" };
          } else {
            activeWorkerAgent = (hasBoss ? (workerAgents[0] || resolvedAgents[0]) : resolvedAgents[0]);
          }

          const workerName = activeWorkerAgent.name || "General Browser Assistant";
          const isBossWorker = (activeWorkerAgent.id === "master_agent" || activeWorkerAgent.is_boss);
          let badgeActionName = toolName;
          if (isAnalysisTool) {
            badgeActionName = `${toolArgs.focus || 'Analisis Data'}`;
          } else if (isClarificationTool) {
            badgeActionName = "Konfirmasi Opsi Pilihan";
          }
          const badge = appendToolBadge(assistantBubble, badgeActionName, toolArgs, workerName);
          updateAssistantActiveAgent(assistantBubble, workerName, `Menjalankan ${badgeActionName}...`, isBossWorker, false);
          updateFooterStatus(`⚡ ${workerName}: ${badgeActionName}...`);
          notifyActiveTabExecutionState(true, currentStep, maxSteps, `${workerName}: ${badgeActionName}...`);

          let toolOutput = "";
          let isImageGen = (toolName === "generate_image");
          let genImgResult = null;

          try {
            const toolResult = await executeTool(toolName, toolArgs, assistantBubble);
            if (isImageGen && toolResult?.image_url) {
              genImgResult = toolResult;
              const imgMarkdown = `![${toolResult.prompt || 'AI Image'}](${toolResult.image_url})`;
              updateAssistantText(assistantBubble, imgMarkdown);
              toolOutput = JSON.stringify({ status: "success", message: "Image generated and displayed successfully." });
            } else {
              toolOutput = JSON.stringify(toolResult);
            }
            updateToolBadgeState(badge, "success", isImageGen ? `Generated: ${toolResult.prompt || 'Image'}` : toolOutput);
          } catch (err) {
            toolOutput = JSON.stringify({ error: err.message });
            updateToolBadgeState(badge, "error", toolOutput);
          }

          // Push tool response into history
          conversationHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: toolOutput
          });

          // If clarification requested, stop loop and wait for user's interactive bubble choice
          if (toolName === "ask_clarification") {
            shouldStopTurn = true;
            break;
          }

          // If image was generated, save assistant markdown message & finish turn cleanly
          if (isImageGen && genImgResult?.image_url) {
            conversationHistory.push({
              role: "assistant",
              content: `![${genImgResult.prompt || 'AI Image'}](${genImgResult.image_url})`
            });
            shouldStopTurn = true;
            break;
          }
        }
      } else {
        // No more tool calls, task finished!
        break;
      }

      if (shouldStopTurn) {
        break;
      }
    }

    finalizeToolSection(assistantBubble, true);
    
    // If clarification dock was rendered, pause and wait for user option click
    const hasClarification = activeClarificationState !== null || (document.getElementById('clarification-dock-container')?.style.display !== 'none' && document.getElementById('clarification-dock-container')?.innerHTML !== '');
    if (hasClarification) {
      updateAssistantActiveAgent(assistantBubble, "Master Agent", "Menunggu arahan Anda...", true, true);
      updateFooterStatus("💡 Master Agent: Menunggu pilihan arahan di atas input prompt...");
      notifyActiveTabExecutionState(false);
      isExecuting = false;
      updateSendButtonState(false);
      return;
    }
    
    // Check if tools were executed but assistant produced no substantial text response
    const contentEl = assistantBubble?.querySelector('.message-content');
    const toolBadges = assistantBubble.querySelectorAll('.tool-badge');
    const currentText = contentEl ? (contentEl.innerText || contentEl.textContent || "").trim() : "";
    const isPseudoToolText = currentText.startsWith("[") || currentText.includes("local_run_command") || currentText.includes("browser_") || currentText.includes("Tindakan") || currentText.includes("Mengeksekusi");
    const isSubstantialFinalAnswer = currentText.length > 40 && !isPseudoToolText && !currentText.includes("Sedang memproses...") && !currentText.includes("Tindakan telah selesai dijalankan.");

    if (toolBadges.length > 0 && !isSubstantialFinalAnswer) {
      try {
        updateAssistantActiveAgent(assistantBubble, "Master Agent", "Menyusun laporan akhir...", true, false);
        updateFooterStatus("👑 Master Agent: Menyusun laporan akhir...");
        notifyActiveTabExecutionState(true, currentStep, maxSteps, "Master Agent: Menyusun laporan akhir...");
        if (contentEl) {
          contentEl.innerHTML = '';
          contentEl.style.display = 'block';
        }

        // 1. Build a clean, universal textual history of previous tool actions (100% LLM API compatible)
        const cleanTextHistory = conversationHistory.map(msg => {
          if (msg.role === 'tool') {
            const rawContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            return {
              role: 'user',
              content: `[Hasil Eksekusi Tool ${msg.name || 'tool'}]:\n${rawContent.slice(0, 4000)}`
            };
          }
          if (msg.role === 'assistant' && msg.tool_calls) {
            const callsDesc = msg.tool_calls.map(tc => `${tc.function?.name || tc.name}(${tc.function?.arguments || ''})`).join(', ');
            return {
              role: 'assistant',
              content: `[Mengeksekusi Tindakan: ${callsDesc}]`
            };
          }
          return {
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : (msg.displayContent || JSON.stringify(msg.content))
          };
        }).filter(m => m && m.content && (m.role === 'user' || m.role === 'assistant'));

        const cleanUserPrompt = typeof userMessage === 'string' ? userMessage.trim() : "permintaan saya";
        const synthesisMessages = [
          { 
            role: "system", 
            content: buildDynamicSystemPrompt(resolvedAgents) + 
            "\n\n=== TUGAS LAPORAN HASIL AKHIR & AUDIT REKAPITULASI KARYAWAN OLEH MASTER AGENT ===\n" +
            "Anda bertindak sebagai Master Agent (Supreme Commander) yang menyajikan LAPORAN HASIL AKHIR setelah menginterogasi, mengkoreksi super detail, dan merekapitulasi seluruh tindakan agen karyawan bawahan Anda:\n" +
            "1. 📸 Verifikasi Audit Walkthrough: Jelaskan hasil verifikasi keadaan layar terakhir secara akurat (apakah seluruh form, modal 'Pilih format kampanye', tombol 'Lanjutkan', 'Tinjau & Terbitkan', atau data berhasil tuntas 100%).\n" +
            "2. 👥 Rekapitulasi Kinerja Tim Karyawan: Uraikan secara singkat kontribusi dari tiap agen karyawan bawahan (misal: telaah metrik oleh Meta Ads Strategist, eksekusi kontrol oleh General Browser Assistant, formula teks oleh Copywriter).\n" +
            "3. 📊 Analisis Komprehensif & Evaluasi Metrik: Sajikan tabel/ringkasan terstruktur (CTR, CPR, CPC, Leads, dll.) beserta alasan di balik temuan tersebut.\n" +
            "4. 📁 Berkas Lokal: Jika ada berkas yang diunduh/dibuat di PC lokal, sebutkan lokasinya secara presisi (contoh: `/home/arya/Downloads/<nama_file>`).\n" +
            "5. 💡 Kesimpulan & Rekomendasi Strategis: Berikan langkah aksi konkret terbaik bagi pengguna."
          },
          ...cleanTextHistory,
          { 
            role: "user", 
            content: `Tolong Master Agent sajikan laporan hasil analisis/tindakan akhir secara lengkap, to the point, dan terstruktur rapi dalam format Markdown berdasarkan permintaan saya ("${cleanUserPrompt}") dan hasil eksekusi tool di atas.` 
          }
        ];

        const endpointUrl = config.endpoint.replace(/\/+$/, "") + "/chat/completions";
        const headers = { "Content-Type": "application/json" };
        if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

        let candidateModels = getCandidateModelsList();
        const specializedWithModel = resolvedAgents.find(a => a.model && a.model.trim().length > 0);
        if (specializedWithModel) {
          const spModel = specializedWithModel.model.trim();
          candidateModels = [spModel, ...candidateModels.filter(m => m !== spModel)];
        }
        if (config.autoRotateModel === false && config.selectedModelChoice && config.selectedModelChoice !== "auto") {
          candidateModels = [config.selectedModelChoice];
        } else if (config.autoRotateModel === false) {
          candidateModels = [candidateModels[0]];
        }

        let synthResp = null;
        for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
          const currentModel = candidateModels[mIdx];
          try {
            const resp = await fetch(endpointUrl, {
              method: "POST",
              headers,
              body: JSON.stringify({
                model: currentModel,
                messages: synthesisMessages,
                temperature: 0.2,
                max_tokens: 4096,
                stream: true
              }),
              signal: abortController.signal
            });

            if (!resp.ok) {
              let errorMsg = "";
              try {
                const errJson = await resp.json();
                errorMsg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
              } catch (e) {
                errorMsg = await resp.text();
              }
              if (isRateLimitError(resp.status, errorMsg) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
                console.warn(`[Auto-Rotate Synthesis] Model '${currentModel}' rate limited (${resp.status}). Rotating to next...`);
                continue;
              }
            } else {
              synthResp = resp;
              break;
            }
          } catch (e) {
            if (e.name === 'AbortError') throw e;
          }
        }

        if (synthResp && synthResp.ok) {
          const reader = synthResp.body.getReader();
          const decoder = new TextDecoder();
          let synthContent = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (trimmed.startsWith("data:")) {
                try {
                  const chunk = JSON.parse(trimmed.replace(/^data:\s*/, ""));
                  const delta = chunk.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    synthContent += delta;
                    updateAssistantText(assistantBubble, synthContent, true);
                  }
                } catch (e) {}
              }
            }
          }

          if (synthContent.trim().length > 0) {
            updateAssistantText(assistantBubble, synthContent, false);
            conversationHistory.push({
              role: "assistant",
              content: synthContent,
              agentInfo: agentInfo
            });
          }
        } else {
          // Fallback if synthesis request failed: scan local_run_command and browser outputs to construct summary table
          console.warn("Synthesis turn status:", synthResp.status, await synthResp.text());
          const downloadedFiles = [];
          conversationHistory.forEach(msg => {
            if (msg.role === 'assistant' && msg.tool_calls) {
              msg.tool_calls.forEach(tc => {
                if (tc.function?.name === 'local_run_command') {
                  try {
                    const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    const m = (args.command || '').match(/Downloads\/([a-zA-Z0-9_\-\.]+)/);
                    if (m && m[1] && !downloadedFiles.includes(m[1])) {
                      downloadedFiles.push(m[1]);
                    }
                  } catch (e) {}
                }
              });
            }
          });

          if (downloadedFiles.length > 0) {
            let fallbackMd = `### 📚 Berkas Jurnal Berhasil Diunduh\n\nSeluruh file jurnal telah berhasil ditemukan dan disimpan ke komputer lokal Anda:\n\n`;
            downloadedFiles.forEach((fn, idx) => {
              fallbackMd += `${idx + 1}. **${fn.replace(/\.pdf$/i, '').replace(/_/g, ' ')}**\n   - Path: \`/home/arya/Downloads/${fn}\`\n`;
            });
            fallbackMd += `\nAnda dapat langsung membuka file-file di atas pada folder **Downloads** komputer Anda.`;
            updateAssistantText(assistantBubble, fallbackMd, false);
          }
        }
      } catch (synthErr) {
        console.warn("Auto synthesis turn warning:", synthErr);
      }
    }

    if (contentEl) {
      const spinner = contentEl.querySelector('.tool-spinner');
      if (spinner) spinner.remove();
      const finalText = (contentEl.innerText || contentEl.textContent || "").trim();
      if (!finalText) {
        contentEl.style.display = 'none';
      }
    }

    const finalAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");
    updateAssistantActiveAgent(assistantBubble, finalAgentName, (currentExecutionMode === 'planning' && !isPlanApprovedRun) ? "Rencana Siap" : "Selesai", hasBoss, true);
    updateFooterStatus("Agent Ready");

    if (currentExecutionMode === 'planning' && !isPlanApprovedRun) {
      showPlanApprovalDock();
    }

  } catch (err) {
    finalizeToolSection(assistantBubble, true);
    const finalAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");
    const isAbort = (
      err.name === "AbortError" ||
      err.code === 20 ||
      (err.message && /abort/i.test(err.message)) ||
      (err.toString && /abort/i.test(err.toString())) ||
      !isExecuting
    );

    if (isAbort) {
      updateAssistantText(assistantBubble, "*[Eksekusi dihentikan oleh pengguna]*", false);
      updateAssistantActiveAgent(assistantBubble, finalAgentName, "Dibatalkan", hasBoss, true);
      updateFooterStatus("Execution Cancelled");
    } else {
      console.error("Agent Loop Error:", err);
      // Only render error card if there is no image already rendered in bubble
      const contentEl = assistantBubble?.querySelector('.message-content');
      if (!contentEl || !contentEl.querySelector('.generated-image-card')) {
        renderErrorCard(assistantBubble, err.message, true);
      }
      updateAssistantActiveAgent(assistantBubble, finalAgentName, "Error", hasBoss, true);
      updateFooterStatus("AI Error / Limit Reached");
    }
  } finally {
    isExecuting = false;
    abortController = null;
    updateSendButtonState(false);
    notifyActiveTabExecutionState(false);
    saveCurrentSessionToDB();
    await focusOwnAgentTab();
    scrollToBottom();
  }
}

async function focusOwnAgentTab() {
  try {
    const ownTab = await chrome.tabs.getCurrent().catch(() => null);
    if (ownTab && ownTab.id) {
      await chrome.tabs.update(ownTab.id, { active: true });
      if (ownTab.windowId) {
        await chrome.windows.update(ownTab.windowId, { focused: true }).catch(() => {});
      }
    }
  } catch (e) {}
}

function renderErrorCard(assistantBubble, errorMessage, canRetry = true) {
  const contentEl = assistantBubble.querySelector('.message-content');
  if (contentEl) {
    contentEl.style.display = 'block';
    // Remove any trailing spinner
    const spinner = contentEl.querySelector('.tool-spinner');
    if (spinner) spinner.remove();

    contentEl.innerHTML = `
      <div class="ai-error-card">
        <div class="ai-error-header">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Terjadi Kendala AI / Rate Limit</span>
        </div>
        <div class="ai-error-body">${escapeHtml(errorMessage)}</div>
        <div class="ai-error-actions">
          ${canRetry ? `
            <button type="button" class="btn-retry-ai">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>Coba Lagi (Try Again)</span>
            </button>
          ` : ''}
          <button type="button" class="btn-error-settings">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Pengaturan</span>
          </button>
        </div>
      </div>
    `;

    const retryBtn = contentEl.querySelector('.btn-retry-ai');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        assistantBubble.remove();
        retryLastExecution();
      });
    }

    const settingsBtn = contentEl.querySelector('.btn-error-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', openOptionsTab);
    }
  }
  scrollToBottom();
}

async function retryLastExecution() {
  if (isExecuting) return;
  if (conversationHistory.length === 0) return;

  // Clean trailing assistant message if it had no completed text
  while (conversationHistory.length > 0) {
    const lastMsg = conversationHistory[conversationHistory.length - 1];
    if (lastMsg.role === 'assistant' && (!lastMsg.content || lastMsg.content.trim().length === 0) && (!lastMsg.tool_calls || lastMsg.tool_calls.length === 0)) {
      conversationHistory.pop();
    } else {
      break;
    }
  }

  isExecuting = true;
  abortController = new AbortController();
  updateSendButtonState(true);

  const assistantBubble = appendAssistantMessage();
  await runAgentLoop(assistantBubble);
}

let currentExecutionMode = 'accept'; // 'accept' | 'planning'
let isPlanApprovedRun = false;

function setExecutionMode(mode) {
  if (mode !== 'accept' && mode !== 'planning') mode = 'accept';
  currentExecutionMode = mode;

  const label = document.getElementById('execution-mode-label');
  const iconContainer = document.getElementById('execution-mode-icon');
  const dropup = document.getElementById('execution-mode-dropup');
  const trigger = document.getElementById('btn-execution-mode-trigger');
  const items = document.querySelectorAll('.execution-dropup-item');

  if (label) {
    label.textContent = (mode === 'planning') ? 'Planning' : 'Accept';
  }

  if (iconContainer) {
    if (mode === 'planning') {
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12h6"/>
          <path d="M9 16h4"/>
        </svg>
      `;
    } else {
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
    }
  }

  items.forEach(item => {
    if (item.getAttribute('data-exec-mode') === mode) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  if (dropup) dropup.style.display = 'none';
  if (trigger) trigger.classList.remove('open');

  try {
    chrome.storage.local.set({ browser_agent_exec_mode: mode });
  } catch (e) {}
}

function initExecutionModeDropdown() {
  const trigger = document.getElementById('btn-execution-mode-trigger');
  const dropup = document.getElementById('execution-mode-dropup');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dropup) return;
    const isHidden = (dropup.style.display === 'none' || !dropup.style.display);
    dropup.style.display = isHidden ? 'flex' : 'none';
    trigger.classList.toggle('open', isHidden);
  });

  document.querySelectorAll('.execution-dropup-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = item.getAttribute('data-exec-mode');
      if (mode) setExecutionMode(mode);
    });
  });

  document.addEventListener('click', (e) => {
    if (dropup && !dropup.contains(e.target) && !trigger?.contains(e.target)) {
      dropup.style.display = 'none';
      trigger?.classList.remove('open');
    }
  });

  try {
    chrome.storage.local.get(['browser_agent_exec_mode'], (res) => {
      if (res && res.browser_agent_exec_mode) {
        setExecutionMode(res.browser_agent_exec_mode);
      }
    });
  } catch (e) {}
}

function showPlanApprovalDock() {
  const container = document.getElementById('chat-input-container');
  const dock = document.getElementById('plan-approval-dock');
  if (!dock || !container) return;

  dock.innerHTML = `
    <div class="plan-approval-dock-inner">
      <div class="plan-approval-dock-header">
        <div class="plan-approval-status-pill">
          <span class="plan-status-dot pulse"></span>
          <span class="plan-status-text">Rencana Eksekusi Siap</span>
        </div>
        <span class="plan-approval-subtitle" id="plan-dock-subtitle">Silakan review rencana di atas sebelum agent mulai bekerja</span>
      </div>
      <div class="plan-approval-dock-actions">
        <button type="button" class="btn-plan-approve" id="btn-dock-approve-plan">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Setujui & Jalankan Rencana</span>
        </button>
        <button type="button" class="btn-plan-revise" id="btn-dock-revise-plan">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>Minta Revisi Rencana</span>
        </button>
      </div>
    </div>
  `;

  dock.style.display = 'block';
  container.classList.add('plan-approval-mode');

  const btnApprove = dock.querySelector('#btn-dock-approve-plan');
  const btnRevise = dock.querySelector('#btn-dock-revise-plan');

  btnApprove?.addEventListener('click', async () => {
    btnApprove.disabled = true;
    btnRevise.disabled = true;
    const sub = dock.querySelector('#plan-dock-subtitle');
    if (sub) sub.textContent = 'Rencana telah disetujui, agent segera mengeksekusi...';

    hidePlanApprovalDock();

    // Trigger execution with approved plan directive
    isPlanApprovedRun = true;
    const approveText = "Rencana kerja di atas disetujui. Silakan lanjutkan dan jalankan langkah-langkahnya sekarang.";
    if (chatInput) chatInput.value = '';
    await runAgentLoop(approveText);
  });

  btnRevise?.addEventListener('click', () => {
    hidePlanApprovalDock();

    if (chatInput) {
      chatInput.value = "Revisi rencana: ";
      chatInput.focus();
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
      adjustChatInputHeight();
    }
  });

  syncHeroPlaceholderHeight();
  scrollToBottom();
}

function hidePlanApprovalDock() {
  const container = document.getElementById('chat-input-container');
  const dock = document.getElementById('plan-approval-dock');
  if (dock) {
    dock.style.display = 'none';
    dock.innerHTML = '';
  }
  if (container) {
    container.classList.remove('plan-approval-mode');
  }
  syncHeroPlaceholderHeight();
}

function setChatMode(mode) {
  if (mode !== 'chat' && mode !== 'agent') mode = 'agent';
  currentChatMode = mode;
  
  const btnChat = document.getElementById('btn-mode-chat');
  const btnAgent = document.getElementById('btn-mode-agent');
  const agentStatusEl = document.getElementById('agent-status-text');

  if (mode === 'chat') {
    btnChat?.classList.add('active');
    btnAgent?.classList.remove('active');
    if (chatInput) chatInput.placeholder = 'Ketik pesan chat di sini...';
    if (agentStatusEl) agentStatusEl.textContent = 'Chat Ready';
  } else {
    btnAgent?.classList.add('active');
    btnChat?.classList.remove('active');
    if (chatInput) chatInput.placeholder = 'Ketik perintah atau drop/paste gambar di sini...';
    if (agentStatusEl) agentStatusEl.textContent = 'Agent Ready';
  }

  try {
    chrome.storage.local.set({ browser_agent_mode: mode });
  } catch (e) {}
}

async function runChatModeLoop(userMessage, attachments = [], explicitMentions = []) {
  try {
    const stored = await chrome.storage.local.get(["browser_agent_config"]);
    if (stored && stored.browser_agent_config) {
      config = { ...config, ...stored.browser_agent_config };
    }
  } catch (e) {}

  if (!config.apiKey && config.preset !== "ollama" && config.preset !== "9router") {
    showSettingsModal();
    appendAssistantMessage("Silakan masukkan API Key dan atur Endpoint AI Anda di menu Setup untuk memulai.");
    return;
  }

  isExecuting = true;
  updateSendButtonState(true);
  abortController = new AbortController();

  if (!currentSessionId) {
    currentSessionId = 'sess_' + Date.now();
    const fallbackTitle = (attachments[0] ? attachments[0].name : 'Chat Session');
    currentSessionTitle = (userMessage || fallbackTitle).slice(0, 45).trim();
    currentSessionCreatedAt = Date.now();
  }

  // Construct user content payload
  let userPayloadContent = userMessage;
  const imageAttachments = Array.isArray(attachments) ? attachments.filter(a => a.isImage && a.dataUrl) : [];
  const videoAttachments = Array.isArray(attachments) ? attachments.filter(a => a.isVideo) : [];
  const textAttachments = Array.isArray(attachments) ? attachments.filter(a => !a.isImage && !a.isVideo && a.textContent) : [];

  let combinedPrompt = userMessage || "";
  if (textAttachments.length > 0) {
    const fileDocs = textAttachments.map(f => `--- [File Lampiran: ${f.name}] ---\n${f.textContent}`).join("\n\n");
    combinedPrompt = combinedPrompt ? `${combinedPrompt}\n\n${fileDocs}` : fileDocs;
  }

  if (videoAttachments.length > 0) {
    const videoDocs = videoAttachments.map(v => 
      `--- [Lampiran Video: ${v.name} (Durasi: ${Math.round(v.duration || 0)}s, Resolusi: ${v.width || 0}x${v.height || 0}, Ukuran: ${(v.size / (1024*1024)).toFixed(1)}MB)] ---\nMohon analisis video terlampir ini.`
    ).join("\n\n");
    combinedPrompt = combinedPrompt ? `${combinedPrompt}\n\n${videoDocs}` : videoDocs;
  }

  if (imageAttachments.length > 0 || videoAttachments.length > 0) {
    userPayloadContent = [
      { type: "text", text: combinedPrompt || "Tolong analisis gambar/video/file terlampir ini." }
    ];
    imageAttachments.forEach(img => {
      userPayloadContent.push({
        type: "image_url",
        image_url: { url: img.dataUrl }
      });
    });
    videoAttachments.forEach(vid => {
      if (Array.isArray(vid.keyframes) && vid.keyframes.length > 0) {
        vid.keyframes.forEach(kf => {
          userPayloadContent.push({
            type: "text",
            text: `[Frame Video "${vid.name}" pada detik ke-${kf.timestamp}s]:`
          });
          userPayloadContent.push({
            type: "image_url",
            image_url: { url: kf.dataUrl }
          });
        });
      } else if (vid.dataUrl) {
        userPayloadContent.push({
          type: "image_url",
          image_url: { url: vid.dataUrl }
        });
      }
    });
  } else {
    userPayloadContent = combinedPrompt;
  }

  appendUserMessage(userMessage, attachments);
  saveVideoAttachmentsToIndexedDB(attachments);

  // Resolve Master Agent and custom skills / memories identical to Agent Mode
  const isAutoMode = (activeAgentId === AUTO_AGENT_ID || !activeAgentId);
  const resolvedAgents = isAutoMode ? resolveAutoAgents(userMessage, explicitMentions) : [activeAgent || customAgents[0]].filter(Boolean);
  const hasBoss = (resolvedAgents[0]?.id === "master_agent" || resolvedAgents[0]?.id === "boss_agent" || resolvedAgents[0]?.is_boss);
  const bossAgent = hasBoss ? resolvedAgents[0] : null;
  const workerAgents = hasBoss ? resolvedAgents.slice(1) : resolvedAgents;
  const initialAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");

  const agentInfo = {
    boss: bossAgent,
    workers: workerAgents,
    agents: resolvedAgents.map(a => ({ id: a.id, name: a.name })),
    displayName: initialAgentName,
    name: initialAgentName,
    isAuto: isAutoMode,
    isBoss: hasBoss,
    isMulti: workerAgents.length > 0
  };

  const assistantBubble = appendAssistantMessage(null, true, agentInfo);
  const contentEl = assistantBubble.querySelector('.message-content');
  const pillStatusEl = assistantBubble.querySelector('.agent-pill-status');
  const pillDotEl = assistantBubble.querySelector('.agent-pill-dot');
  
  if (hasBoss && workerAgents.length > 0) {
    updateAssistantActiveAgent(assistantBubble, "all", "Menjawab...", true, false);
  } else {
    updateAssistantActiveAgent(assistantBubble, initialAgentName, "Menjawab...", false, false);
  }

  // Push user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userPayloadContent,
    displayContent: userMessage || "",
    attachments: attachments
  });

    let accumulatedContent = "";

    try {
      const endpointUrl = config.endpoint.replace(/\/+$/, "") + "/chat/completions";
      const headers = {
        "Content-Type": "application/json"
      };
      if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      const dynamicMasterPrompt = buildDynamicSystemPrompt(resolvedAgents) + `\n\n` + CHAT_ONLY_SYSTEM_PROMPT;

      // Build chat-only messages array with sanitized text-only turns
      const messages = [
        { role: "system", content: dynamicMasterPrompt },
        ...sanitizeMessagesForApi(conversationHistory, true)
      ];

      let candidateModels = getCandidateModelsList();
      const specializedWithModel = resolvedAgents.find(a => a.model && a.model.trim().length > 0);
      if (specializedWithModel) {
        const spModel = specializedWithModel.model.trim();
        candidateModels = [spModel, ...candidateModels.filter(m => m !== spModel)];
      }
      if (config.autoRotateModel === false && config.selectedModelChoice && config.selectedModelChoice !== "auto") {
        candidateModels = [config.selectedModelChoice];
      } else if (config.autoRotateModel === false) {
        candidateModels = [candidateModels[0]];
      }

      let response = null;
      let activeModelChoice = candidateModels[0];

      for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
        activeModelChoice = candidateModels[mIdx];

        try {
          const resp = await fetch(endpointUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: activeModelChoice,
              messages,
              temperature: parseFloat(config.temperature) || 0.7,
              max_tokens: parseInt(config.maxTokens) || 4096,
              stream: true
            }),
            signal: abortController.signal
          });

          if (!resp.ok) {
            let errorMsg = "";
            try {
              const errJson = await resp.json();
              errorMsg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
            } catch (e) {
              errorMsg = await resp.text();
            }

            if (isRateLimitError(resp.status, errorMsg) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
              const nextModel = candidateModels[mIdx + 1];
              console.warn(`[Auto-Rotate Chat] Model '${activeModelChoice}' rate limited (${resp.status}). Rotating to '${nextModel}'...`);
              updateAssistantText(assistantBubble, `*🔄 Model \`${activeModelChoice}\` terkena rate limit. Otomatis beralih ke \`${nextModel}\`...*\n\n`, true);
              continue;
            }

            if (resp.status === 429) {
              throw new Error(`Rate Limit Exceeded (429): ${errorMsg || 'Kuota API limit atau rate limit tercapai. Silakan coba beberapa saat lagi.'}`);
            }
            throw new Error(`AI Request Error (${resp.status}): ${errorMsg}`);
          }

          response = resp;
          break;
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError' || !isExecuting) throw fetchErr;
          if (isRateLimitError(0, fetchErr.message) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
            const nextModel = candidateModels[mIdx + 1];
            console.warn(`[Auto-Rotate Chat] Exception on '${activeModelChoice}'. Rotating to '${nextModel}'...`, fetchErr);
            continue;
          }
          throw fetchErr;
        }
      }

      if (!response) {
        throw new Error(`Gagal menghubungi AI dengan model ${candidateModels.join(', ')}.`);
      }

      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          if (!isExecuting || abortController?.signal.aborted) {
            try { await reader.cancel(); } catch (e) {}
            throw new DOMException("Aborted", "AbortError");
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]" || !trimmed.startsWith("data:")) continue;
            
            try {
              const jsonStr = trimmed.replace(/^data:\s*/, "");
              const chunk = JSON.parse(jsonStr);
              const deltaContent = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || "";
              if (deltaContent) {
                accumulatedContent += deltaContent;
                // Temporarily hide switch tag while streaming
                const cleanDisplay = accumulatedContent.replace(/\[SWITCH_TO_AGENT_REQUEST:[\s\S]*?\]/gi, '').trim();
                updateAssistantText(assistantBubble, cleanDisplay || accumulatedContent, true);
              }
            } catch (err) {}
          }
        }
      } else {
        const data = await response.json();
        accumulatedContent = data.choices?.[0]?.message?.content || "";
      }

      // Check for switch-to-agent intent
      const switchMatch = accumulatedContent.match(/\[SWITCH_TO_AGENT_REQUEST:\s*([\s\S]*?)\]/i);
      const cleanFinalText = accumulatedContent.replace(/\[SWITCH_TO_AGENT_REQUEST:[\s\S]*?\]/gi, '').trim();
      
      updateAssistantText(assistantBubble, cleanFinalText || accumulatedContent, false);

      if (switchMatch) {
        const targetPrompt = switchMatch[1].trim() || userMessage;
        
        const switchCard = document.createElement("div");
        switchCard.className = "agent-switch-card";
        switchCard.innerHTML = `
          <div class="agent-switch-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#CEF128" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="3"/>
              <circle cx="12" cy="5" r="2"/>
              <path d="M12 7v4"/>
              <line x1="8" y1="16" x2="8.01" y2="16"/>
              <line x1="16" y1="16" x2="16.01" y2="16"/>
            </svg>
            <span>Beralih ke Mode Agent?</span>
          </div>
          <p>Perintah ini memerlukan otomatisasi & kontrol langsung pada tab browser.</p>
          <div class="agent-switch-btn-row">
            <button type="button" class="btn-switch-to-agent-confirm">Pindah ke Mode Agent & Jalankan</button>
            <button type="button" class="btn-switch-to-agent-cancel">Tetap di Mode Chat</button>
          </div>
        `;

        if (contentEl) {
          contentEl.appendChild(switchCard);
        }
        scrollToBottom();

        const confirmBtn = switchCard.querySelector(".btn-switch-to-agent-confirm");
        const cancelBtn = switchCard.querySelector(".btn-switch-to-agent-cancel");

        confirmBtn?.addEventListener("click", () => {
          switchCard.remove();
          setChatMode("agent");
          runAgentLoop(targetPrompt, attachments);
        });

        cancelBtn?.addEventListener("click", () => {
          switchCard.remove();
        });
      }

      const finalAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");
      updateAssistantActiveAgent(assistantBubble, finalAgentName, "Selesai", hasBoss, true);

      conversationHistory.push({
        role: "assistant",
        content: cleanFinalText || accumulatedContent,
        agentInfo: agentInfo
      });

      saveCurrentSessionToDB();

    } catch (err) {
      const finalAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");
      const isAbort = (
        err.name === 'AbortError' ||
        err.code === 20 ||
        (err.message && /abort/i.test(err.message)) ||
        (err.toString && /abort/i.test(err.toString())) ||
        !isExecuting
      );

      if (isAbort) {
        updateAssistantActiveAgent(assistantBubble, finalAgentName, "Dihentikan", hasBoss, true);
        const currentText = (contentEl ? (contentEl.innerText || contentEl.textContent || "") : "").trim();
        if (!currentText) {
          if (contentEl) {
            contentEl.style.display = 'block';
            contentEl.innerHTML = formatMarkdown("*(Percakapan dihentikan oleh pengguna)*");
          }
        }
        if (accumulatedContent && accumulatedContent.trim().length > 0) {
          conversationHistory.push({
            role: "assistant",
            content: accumulatedContent.trim(),
            agentInfo: agentInfo
          });
          saveCurrentSessionToDB();
        }
        updateFooterStatus("Chat Ready");
      } else {
        console.error("Chat Mode Error:", err);
        updateAssistantActiveAgent(assistantBubble, finalAgentName, "Gagal", hasBoss, true);
        if (contentEl) {
          contentEl.style.display = 'block';
          contentEl.innerHTML = `<div class="error-msg-box" style="color: #EF4444; font-size: 13px; font-weight: 500; line-height: 1.5; padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">Kesalahan: ${escapeHtml(err.message || 'Gagal merespons')}</div>`;
        }
        updateFooterStatus("AI Error / Limit Reached");
      }
    } finally {
      isExecuting = false;
      updateSendButtonState(false);
      abortController = null;
      await focusOwnAgentTab();
      scrollToBottom();
    }
}

// =========================================================================
// UI Renderers & Helpers
// =========================================================================
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const welcomeCard = document.getElementById('welcome-card');

function appendUserMessage(text, attachments = []) {
  if (typeof text === 'object' && text !== null) {
    text = text.text || "";
  }
  const cleanText = (typeof text === 'string' ? text.trim() : "");
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  
  if (!cleanText && !hasAttachments) return null;
  if (cleanText === "{}" || cleanText === "[object Object]") {
    if (!hasAttachments) return null;
  }

  if (welcomeCard) welcomeCard.style.display = 'none';
  document.body.classList.add('has-messages');
  const msg = document.createElement('div');
  msg.className = 'message user';
  
  let attachmentsHtml = '';
  if (hasAttachments) {
    attachmentsHtml = `<div class="user-msg-attachments">`;
    attachments.forEach(att => {
      if (att.isImage) {
        const imgSrc = att.dataUrl || att.thumbnailUrl || "";
        attachmentsHtml += `
          <div class="user-attached-thumb" title="${escapeHtml(att.name || 'Image')}">
            <img src="${imgSrc}" alt="${escapeHtml(att.name || 'Image')}">
          </div>
        `;
      } else if (att.isVideo) {
        const vidId = att.id || ('att_vid_' + Date.now());
        if (att.dataUrl) {
          attachmentsHtml += `
            <div class="user-attached-video-card" data-video-id="${escapeHtml(vidId)}" title="${escapeHtml(att.name || 'Video')}">
              <div class="user-video-media-wrapper">
                <video src="${att.dataUrl}" controls preload="metadata" playsinline controlsList="nofullscreen nodownload"></video>
                <button type="button" class="btn-video-fullscreen-overlay" title="Putar Layar Penuh (Fullscreen)">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div class="user-attached-video-info">
                <span title="${escapeHtml(att.name || 'Video')}">${escapeHtml(att.name || 'Video')}</span>
                <span>${att.duration ? `${Math.round(att.duration)}s` : ''}</span>
              </div>
            </div>
          `;
        } else {
          // Render preserved poster & thumbnail from history with data-video-id for hydration
          attachmentsHtml += `
            <div class="user-attached-video-card" data-video-id="${escapeHtml(vidId)}" title="${escapeHtml(att.name || 'Video')}">
              <div class="user-video-media-wrapper" style="cursor: pointer;">
                ${att.thumbnailUrl ? `<img src="${att.thumbnailUrl}" alt="${escapeHtml(att.name || 'Video')}">` : `
                  <div style="display:flex;align-items:center;justify-content:center;width:160px;height:120px;background:#0F172A;color:#CEF128;">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </div>
                `}
                <div class="user-video-play-badge">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <button type="button" class="btn-video-fullscreen-overlay" title="Lihat Layar Penuh">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div class="user-attached-video-info">
                <span title="${escapeHtml(att.name || 'Video')}">${escapeHtml(att.name || 'Video')}</span>
                <span>${att.duration ? `${Math.round(att.duration)}s` : 'Video'}</span>
              </div>
            </div>
          `;
        }
      } else {
        attachmentsHtml += `
          <div class="user-attached-file-pill" title="${escapeHtml(att.name || 'File')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>${escapeHtml(att.name || 'File')}</span>
          </div>
        `;
      }
    });
    attachmentsHtml += `</div>`;
  }

  const userContent = (cleanText && cleanText !== "{}" && cleanText !== "[object Object]") ? cleanText : "";
  const formattedUserContent = userContent ? formatUserMentions(userContent) : "";

  msg.innerHTML = `
    ${attachmentsHtml}
    ${formattedUserContent ? `<div class="message-content">${formattedUserContent}</div>` : ''}
    <div class="message-actions">
      <button class="msg-copy-btn" title="Copy message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span class="copy-label">Copy</span>
      </button>
    </div>
  `;
  const copyBtn = msg.querySelector('.msg-copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(userContent || (attachments.map(a => a.name).join(', ')));
    const label = copyBtn.querySelector('.copy-label');
    if (label) label.textContent = 'Copied!';
    setTimeout(() => { if (label) label.textContent = 'Copy'; }, 1500);
  });
  chatMessages.appendChild(msg);
  scrollToBottom();
  return msg;
}

function getAgentIconSvg(agent) {
  const id = (agent?.id || '').toLowerCase();
  const name = (agent?.name || '').toLowerCase();
  const desc = (agent?.description || '').toLowerCase();

  if (id.includes('research') || name.includes('research') || name.includes('riset') || desc.includes('jurnal')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  }
  if (id.includes('coding') || id.includes('engineer') || name.includes('coding') || name.includes('engineer') || desc.includes('koding')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
  }
  if (id.includes('ads') || name.includes('ads') || name.includes('iklan') || desc.includes('meta ads')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  }
  if (id.includes('copy') || name.includes('copy') || name.includes('penulis') || desc.includes('caption')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
  }
  if (id.includes('visual') || id.includes('desain') || name.includes('visual') || name.includes('desain')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
}

function updateAssistantActiveAgent(assistantBubble, agentName, statusText = '', isBoss = false, isFinished = false) {
  if (!assistantBubble) return;
  const pill = assistantBubble.querySelector('.agent-execution-pill');
  if (pill) {
    const dot = pill.querySelector('.agent-pill-dot');
    if (dot) {
      dot.className = isFinished ? 'agent-pill-dot' : 'agent-pill-dot pulse';
    }
    const statusEl = pill.querySelector('.agent-pill-status');
    if (statusEl && statusText) {
      statusEl.textContent = statusText;
    }
  }

  // Update tree branch items active state & status badges
  const treeContainer = assistantBubble.querySelector('.agent-tree-branch-container');
  const treeItems = assistantBubble.querySelectorAll('.agent-tree-item');
  const target = (agentName || '').trim().toLowerCase();

  treeItems.forEach(item => {
    const nameEl = item.querySelector('.tree-agent-name');
    const badgeEl = item.querySelector('.tree-agent-badge');
    const itemAgentId = item.dataset.agentId ? item.dataset.agentId.toLowerCase() : '';
    const itemAgentName = nameEl ? nameEl.textContent.trim().toLowerCase() : '';

    if (isFinished) {
      item.classList.remove('active-working');
      item.classList.add('completed');
      if (badgeEl) {
        badgeEl.className = 'tree-agent-badge status-done';
        badgeEl.textContent = 'Selesai';
      }
    } else if (
      target === 'all' || 
      target === 'master agent' || 
      (target && (itemAgentName.includes(target) || target.includes(itemAgentName) || (itemAgentId && target.includes(itemAgentId))))
    ) {
      item.classList.add('active-working');
      if (badgeEl) {
        badgeEl.className = 'tree-agent-badge status-working';
        badgeEl.textContent = 'Bekerja...';
      }
    } else {
      item.classList.remove('active-working');
      if (badgeEl && !badgeEl.classList.contains('status-done')) {
        badgeEl.className = 'tree-agent-badge status-ready';
        badgeEl.textContent = 'Siap Kerja';
      }
    }
  });

  // Auto-collapse assigned agents list when task is completely finished
  if (isFinished && treeContainer) {
    treeContainer.classList.add('collapsed');
    const textEl = treeContainer.querySelector('.agent-tree-toggle-text');
    if (textEl) {
      textEl.textContent = 'Detail';
    }
  }
}

let activeClarificationState = null;

function showClarificationDock(question, options = [], contextSummary = "") {
  const dock = document.getElementById('clarification-dock-container');
  if (!dock) return;

  activeClarificationState = { question, options, contextSummary };

  let optionsHtml = '';
  (options || []).forEach((opt, idx) => {
    const cleanOpt = typeof opt === 'string' ? opt : JSON.stringify(opt);
    optionsHtml += `
      <button type="button" class="clarification-chip" data-prompt="${escapeHtml(cleanOpt)}">
        <span class="chip-num">${idx + 1}</span>
        <span class="chip-text">${escapeHtml(cleanOpt)}</span>
      </button>
    `;
  });

  optionsHtml += `
    <button type="button" class="clarification-chip custom-chip" data-action="custom">
      <span class="chip-num">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </span>
      <span class="chip-text">Tulis Arahan Kustom Sendiri...</span>
    </button>
  `;

  dock.innerHTML = `
    <div class="clarification-card">
      <div class="clarification-header">
        <div class="clarification-header-left">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span class="clarification-title">Konfirmasi Arahan Master Agent</span>
        </div>
        <button type="button" class="btn-dismiss-clarification" id="btn-dismiss-clarification" title="Tutup / Batal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="clarification-question">${escapeHtml(question || "Mohon konfirmasi pilihan arahan Anda:")}</div>
      ${contextSummary ? `<div class="clarification-context">${escapeHtml(contextSummary)}</div>` : ''}
      <div class="clarification-options-grid">
        ${optionsHtml}
      </div>
    </div>
  `;

  dock.style.display = 'block';

  document.getElementById('btn-dismiss-clarification')?.addEventListener('click', () => {
    hideClarificationDock();
  });

  scrollToBottom();
}

function hideClarificationDock() {
  const dock = document.getElementById('clarification-dock-container');
  if (dock) {
    dock.style.display = 'none';
    dock.innerHTML = '';
  }
  activeClarificationState = null;
}

function appendAssistantMessage(initialText = null, isLiveLoading = true, agentInfo = null) {
  if (welcomeCard) welcomeCard.style.display = 'none';
  document.body.classList.add('has-messages');
  const msg = document.createElement('div');
  msg.className = 'message assistant';
  
  let contentHtml = '';
  if (initialText) {
    contentHtml = formatMarkdown(initialText);
  } else {
    contentHtml = '';
  }

  let pillHtml = '';
  if (agentInfo) {
    const isBoss = !!agentInfo.isBoss;
    const initialName = isBoss ? "Master Agent" : (agentInfo.displayName || agentInfo.name || "General Agent");
    const workers = Array.isArray(agentInfo.workers) ? agentInfo.workers : [];
    const hasWorkers = (isBoss && workers.length > 0);
    
    let initialStatus = isLiveLoading ? "Menganalisis tugas..." : "Selesai";
    if (isLiveLoading && isBoss && workers.length > 0) {
      initialStatus = `Menemukan ${workers.length} Agen Spesialis`;
    }
    const dotClass = isLiveLoading ? "agent-pill-dot pulse" : "agent-pill-dot";
    const cleanName = (isBoss && initialName === "Master Agent") ? "" : escapeHtml(initialName);

    let treeBranchHtml = '';
    if (hasWorkers) {
      const isInitiallyCollapsed = !isLiveLoading;
      treeBranchHtml = `
        <div class="agent-tree-branch-container ${isInitiallyCollapsed ? 'collapsed' : ''}">
          <button type="button" class="agent-tree-branch-header" title="Klik untuk sembunyikan / tampilkan daftar agen">
            <div class="agent-tree-header-left">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span class="agent-tree-branch-title">Tim Agen yang Ditugaskan (${workers.length})</span>
            </div>
            <div class="agent-tree-header-right">
              <span class="agent-tree-toggle-text">${isInitiallyCollapsed ? 'Detail' : 'Tutup'}</span>
              <svg class="agent-tree-toggle-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </button>
          <div class="agent-tree-branch-list">
            ${workers.map(w => `
              <div class="agent-tree-item" data-agent-id="${escapeHtml(w.id || '')}">
                <div class="tree-stem"></div>
                <div class="tree-agent-card">
                  <div class="tree-agent-icon">${getAgentIconSvg(w)}</div>
                  <div class="tree-agent-details">
                    <span class="tree-agent-name">${escapeHtml(w.name || 'Spesialis')}</span>
                    <span class="tree-agent-desc">${escapeHtml(w.description || 'Sub-agent eksekutor')}</span>
                  </div>
                  <span class="tree-agent-badge ${isLiveLoading ? 'status-ready' : 'status-done'}">${isLiveLoading ? 'Siap Kerja' : 'Selesai'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    pillHtml = `
      <div class="agent-hierarchy-block">
        <div class="agent-execution-pill ${isBoss ? 'boss-mode' : ''}">
          <span class="${dotClass}"></span>
          ${isBoss ? `
            <span class="agent-boss-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/>
              </svg>
              Master Agent
            </span>
          ` : ''}
          ${cleanName ? `<span class="agent-pill-name">${cleanName}</span>` : ''}
          <span class="agent-pill-status">${escapeHtml(initialStatus)}</span>
        </div>
        ${treeBranchHtml}
      </div>
    `;
  }

  msg.innerHTML = `
    ${pillHtml}
    <div class="thinking-block" style="display: none;">
      <div class="thinking-header">
        <svg class="thinking-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/><path d="M9 21h6"/></svg>
        <span class="thinking-title">Proses Berpikir</span>
        <span class="thinking-arrow">▼</span>
      </div>
      <div class="thinking-content"></div>
    </div>
    <div class="tool-section-wrapper" style="display: none;">
      <button type="button" class="tool-toggle-header" title="Klik untuk sembunyikan/tampilkan riwayat tool">
        <div class="tool-toggle-left">
          <svg class="tool-toggle-check" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="tool-toggle-title">Langkah Tindakan</span>
        </div>
        <div class="tool-toggle-right">
          <span class="tool-toggle-text">Detail</span>
          <svg class="tool-toggle-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      <div class="tool-badge-container"></div>
    </div>
    <div class="message-content" style="${!contentHtml ? 'display: none;' : ''}">${contentHtml}</div>
    <div class="message-actions assistant-actions" style="display: ${initialText ? 'flex' : 'none'};">
      <button class="msg-copy-btn" title="Copy response">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span class="copy-label">Copy</span>
      </button>
    </div>
  `;

  // Bind interactive click toggle for assigned agents list
  const treeHeader = msg.querySelector('.agent-tree-branch-header');
  if (treeHeader) {
    treeHeader.addEventListener('click', () => {
      const treeContainer = msg.querySelector('.agent-tree-branch-container');
      if (treeContainer) {
        const isCollapsed = treeContainer.classList.toggle('collapsed');
        const textEl = treeHeader.querySelector('.agent-tree-toggle-text');
        if (textEl) {
          textEl.textContent = isCollapsed ? 'Detail' : 'Tutup';
        }
      }
    });
  }

  const copyBtn = msg.querySelector('.msg-copy-btn');
  copyBtn.addEventListener('click', () => {
    const contentEl = msg.querySelector('.message-content');
    if (contentEl) {
      navigator.clipboard.writeText(contentEl.innerText || contentEl.textContent);
      const label = copyBtn.querySelector('.copy-label');
      if (label) label.textContent = 'Copied!';
      setTimeout(() => { if (label) label.textContent = 'Copy'; }, 1500);
    }
  });
  chatMessages.appendChild(msg);
  if (initialText) {
    hydrateLocalImages(msg);
    hydrateFileActions(msg);
  }
  scrollToBottom();
  return msg;
}

function updateAssistantText(bubble, text, isStreaming = false) {
  const contentEl = bubble.querySelector('.message-content');
  const actionsEl = bubble.querySelector('.message-actions');
  if (contentEl) {
    contentEl.style.display = 'block';
    const formatted = formatMarkdown(text);
    if (isStreaming) {
      contentEl.innerHTML = formatted + '<span class="streaming-cursor"></span>';
    } else {
      contentEl.innerHTML = formatted;
      hydrateLocalImages(bubble);
      hydrateFileActions(bubble);
    }
    if (actionsEl) {
      actionsEl.style.display = (text.trim().length > 0 && !isStreaming) ? 'flex' : 'none';
      if (!isStreaming) {
        hydrateFileActions(bubble);
      }
    }
    scrollToBottom();
  }
}

function appendToolBadge(bubble, toolName, args, agentName = "") {
  const section = bubble.querySelector('.tool-section-wrapper');
  const container = bubble.querySelector('.tool-badge-container');
  if (section) {
    section.style.display = 'flex';
    section.classList.remove('collapsed');
    const header = section.querySelector('.tool-toggle-header');
    if (header && !header.dataset.bound) {
      header.dataset.bound = 'true';
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isCollapsed = section.classList.toggle('collapsed');
        const textEl = header.querySelector('.tool-toggle-text');
        if (textEl) {
          textEl.textContent = isCollapsed ? 'Detail' : 'Tutup';
        }
      });
    }
  }

  const badge = document.createElement('div');
  badge.className = 'tool-badge running';
  const icon = getToolIcon(toolName);
  
  // Clean short agent display name
  let cleanAgentName = agentName || "";
  cleanAgentName = cleanAgentName.replace(/\s*\([^)]*\)/g, "").trim(); // Remove (Module 408 & 254)
  if (cleanAgentName.length > 22) {
    cleanAgentName = cleanAgentName.slice(0, 20) + "...";
  }

  const agentTagHtml = cleanAgentName ? `<span class="tool-agent-tag" title="${escapeHtml(agentName)}">${escapeHtml(cleanAgentName)}</span>` : '';
  badge.innerHTML = `
    <div class="tool-badge-left">
      <span class="tool-spinner"></span>
      <span class="tool-icon-svg">${icon}</span>
      <span class="tool-name-text">${escapeHtml(toolName)}</span>
    </div>
    ${agentTagHtml}
  `;
  container.appendChild(badge);

  updateToolSectionTitle(bubble);
  scrollToBottom();
  return badge;
}

function updateToolSectionTitle(bubble) {
  if (!bubble) return;
  const count = bubble.querySelectorAll('.tool-badge').length;
  const titleEl = bubble.querySelector('.tool-toggle-title');
  if (titleEl && count > 0) {
    titleEl.textContent = `${count} Langkah Tindakan`;
  }
}

function finalizeToolSection(bubble, collapse = true) {
  if (!bubble) return;
  const section = bubble.querySelector('.tool-section-wrapper');
  if (!section) return;
  const count = bubble.querySelectorAll('.tool-badge').length;
  if (count === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'flex';
  const titleEl = bubble.querySelector('.tool-toggle-title');
  if (titleEl) {
    titleEl.textContent = `${count} Langkah Tindakan Selesai`;
  }

  const header = section.querySelector('.tool-toggle-header');
  if (header && !header.dataset.bound) {
    header.dataset.bound = 'true';
    header.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isCollapsed = section.classList.toggle('collapsed');
      const textEl = header.querySelector('.tool-toggle-text');
      if (textEl) {
        textEl.textContent = isCollapsed ? 'Detail' : 'Tutup';
      }
    });
  }

  const textEl = header ? header.querySelector('.tool-toggle-text') : null;
  if (collapse) {
    section.classList.add('collapsed');
    if (textEl) textEl.textContent = 'Detail';
  } else {
    section.classList.remove('collapsed');
    if (textEl) textEl.textContent = 'Tutup';
  }
}

function updateToolBadgeState(badge, state, output) {
  badge.className = `tool-badge ${state}`;
  const spinner = badge.querySelector('.tool-spinner');
  if (spinner) spinner.remove();
  const icon = state === 'success' 
    ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const left = badge.querySelector('.tool-badge-left') || badge;
  left.insertAdjacentHTML('afterbegin', icon);
  badge.title = output.length > 200 ? output.substring(0, 200) + "..." : output;
}

function getToolIcon(name) {
  if (name.includes("clarification") || name.includes("ask") || name.includes("question") || name.includes("konfirmasi")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  }
  if (name.includes("analysis") || name.includes("subtask") || name.includes("finding") || name.includes("eval")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
  }
  if (name.includes("table") || name.includes("grid") || name.includes("extract_table")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>';
  }
  if (name.includes("wait") || name.includes("delay") || name.includes("sleep")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  }
  if (name.includes("tab")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>';
  }
  if (name.includes("navigate")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }
  if (name.includes("snapshot")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  }
  if (name.includes("click")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>';
  }
  if (name.includes("type") || name.includes("press")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>';
  }
  if (name.includes("screenshot")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  }
  if (name.includes("run_command")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>';
  }
  if (name.includes("image") || name.includes("draw")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  }
  if (name.includes("file")) {
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
}

function updateSendButtonState(loading) {
  const sendIcon = btnSend.querySelector('.send-icon');
  const stopIcon = btnSend.querySelector('.stop-icon');
  if (loading) {
    btnSend.classList.add('loading');
    btnSend.title = "Batalkan eksekusi (Cancel)";
    if (sendIcon) sendIcon.style.display = 'none';
    if (stopIcon) stopIcon.style.display = 'block';
  } else {
    btnSend.classList.remove('loading');
    btnSend.title = "Kirim perintah (Enter)";
    if (sendIcon) sendIcon.style.display = 'block';
    if (stopIcon) stopIcon.style.display = 'none';
  }
}

function updateFooterStatus(statusText) {
  const pill = document.getElementById('footer-agent-status');
  if (pill) {
    pill.innerHTML = `<span>${escapeHtml(statusText)}</span>`;
  }
}

function scrollToBottom(smooth = false) {
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  try {
    const scrollTarget = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      chatMessages ? chatMessages.scrollHeight : 0
    );
    window.scrollTo({
      top: scrollTarget + 200,
      behavior: smooth ? 'smooth' : 'auto'
    });
  } catch (e) {
    window.scrollTo(0, (document.body.scrollHeight || 0) + 200);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  if (typeof str !== 'string') {
    if (typeof str === 'object') {
      try { str = JSON.stringify(str, null, 2); } catch (e) { str = String(str); }
    } else {
      str = String(str);
    }
  }
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatInline(str) {
  if (!str) return "";
  let res = str;

  // Convert escaped <br> tags back to HTML line break
  res = res.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

  // Bold & Italic (***, **, *, __, ~~)
  res = res.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  res = res.replace(/(?:^|[^\w])___([^_]+)___(?:[^\w]|$)/g, (m, c) => m.replace(`___${c}___`, `<strong><em>${c}</em></strong>`));
  res = res.replace(/(?:^|[^\w])__([^_]+)__(?:[^\w]|$)/g, (m, c) => m.replace(`__${c}__`, `<strong>${c}</strong>`));
  res = res.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Markdown Links [text](url)
  res = res.replace(/\[([^\]]+)\]\(((?:https?|chrome|edge|file):\/\/[^\s)]+)\)/gi, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Auto-link Plain URLs (https://, http://, chrome://, edge://)
  res = res.replace(/(^|[\s(])((?:https?|chrome|edge):\/\/[^\s)<>"]+)/gi, (match, prefix, url) => {
    if (url.includes('\uE000') || url.includes('\uE001')) return match;
    return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="md-link">${url}</a>`;
  });

  return res;
}

function formatMarkdown(raw) {
  if (raw === null || raw === undefined) return "";
  if (typeof raw !== 'string') {
    try { raw = JSON.stringify(raw, null, 2); } catch (e) { raw = String(raw); }
  }

  // 1. Extract code blocks (```lang ... ```) to safe unicode placeholders
  const codeBlocks = [];
  let text = raw.replace(/```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `\uE000CODE_BLOCK_${codeBlocks.length}\uE001`;
    codeBlocks.push({ lang: lang || 'code', code: code.trim() });
    return placeholder;
  });

  // 2. Extract Markdown Images ![alt](url)
  const imageBlocks = [];
  text = text.replace(/!\[([^\]]*)\]\((local-img:\/\/[^\s)]+|https?:\/\/[^\s)]+|data:image\/[^\s)]+?)(?:\s*(?:\.\.\.\s*)?\[storage truncated\]|\.\.\.)?\)/g, (match, alt, url) => {
    const cleanAlt = alt || 'AI Generated Image';
    const isLocalProtocol = url.startsWith('local-img://');
    const localId = isLocalProtocol ? url.replace('local-img://', '') : '';
    const isTruncated = url.includes('[storage truncated]') || match.includes('[storage truncated]');
    const displayUrl = isTruncated ? '' : (isLocalProtocol ? '' : url);

    const card = `
      <div class="generated-image-card">
        <div class="gen-img-wrapper" ${localId ? `data-local-id="${localId}"` : ''} data-src="${displayUrl}">
          ${(displayUrl || localId) ? `<img src="${displayUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="${cleanAlt}" loading="lazy" class="gen-img-preview" ${localId ? 'style="opacity: 0; transition: opacity 0.2s ease;"' : ''}>` : `
            <div class="gen-img-corrupted-fallback" title="Gambar sesi sebelumnya terpotong pada penyimpanan lama">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>${cleanAlt}</span>
            </div>
          `}
          ${(displayUrl || localId) ? `
          <div class="gen-img-hover-overlay">
            <button type="button" class="btn-gen-img-zoom" title="Perbesar Layar Penuh">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              <span>Lihat Penuh</span>
            </button>
            <a href="${displayUrl || '#'}" download="${cleanAlt.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) || 'ai-image'}.png" target="_blank" rel="noopener noreferrer" class="btn-gen-img-download" title="Unduh Gambar">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Unduh</span>
            </a>
          </div>` : ''}
        </div>
      </div>
    `;
    const placeholder = `\uE000IMAGE_BLOCK_${imageBlocks.length}\uE001`;
    imageBlocks.push(card);
    return `\n${placeholder}\n`;
  });

  // 2b. Extract Standalone Local File Paths into Interactive File Cards
  const fileCardBlocks = [];
  const fileLineRegex = /(?:^|\n)(?:(?:Lokasi|Saved|Output|File)\s*(?:file|path)?\s*[:=]\s*)?((?:\/(?:home|Users|tmp|var|etc|usr|opt|root|mnt|media|\.browser-agent|[a-zA-Z0-9_\-\.]+)\/[^\n\r\"'`<>|:*?]+?\.[a-zA-Z0-9]{1,8})|(?:[a-zA-Z]:\\[^\n\r\"'`<>|:*?]+?\.[a-zA-Z0-9]{1,8})|(?:~\/[^\n\r\"'`<>|:*?]+?\.[a-zA-Z0-9]{1,8}))(?:\s*(\([^)\n]+\)))?(?=\n|$)/gi;

  text = text.replace(fileLineRegex, (match, pathVal, meta) => {
    if (!pathVal || pathVal.startsWith('http://') || pathVal.startsWith('https://')) return match;
    const cardHtml = buildFileCardHtml(pathVal, meta || '');
    const placeholder = `\uE000FILE_CARD_${fileCardBlocks.length}\uE001`;
    fileCardBlocks.push(cardHtml);
    return `\n${placeholder}\n`;
  });

  // 3. Escape HTML
  text = escapeHtml(text);

  // 4. Inline code placeholders
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `\uE000INLINE_CODE_${inlineCodes.length}\uE001`;
    inlineCodes.push(code);
    return placeholder;
  });

  // 5. Extract Markdown Tables
  const tableBlocks = [];
  text = text.replace(/((?:^|\n)\|?[^\n|]+\|[^\n]+\|\s*\n\|?\s*(?:[-:]+[-| :]*)\s*\|\s*\n(?:\|?[^\n|]+\|[^\n]+\|\s*(?:\n|$))+)/g, (tableMatch) => {
    const tLines = tableMatch.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (tLines.length < 2) return tableMatch;

    const headerCells = tLines[0].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const sepCells = tLines[1].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    
    const alignments = sepCells.map(c => {
      if (c.startsWith(':') && c.endsWith(':')) return 'center';
      if (c.endsWith(':')) return 'right';
      return 'left';
    });

    let html = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
    headerCells.forEach((c, idx) => {
      const align = alignments[idx] || 'left';
      html += `<th style="text-align: ${align}">${formatInline(c)}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let r = 2; r < tLines.length; r++) {
      const rowCells = tLines[r].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      html += '<tr>';
      rowCells.forEach((c, idx) => {
        const align = alignments[idx] || 'left';
        const cleanVal = c.replace(/[*_`]/g, '').trim();
        const isNumericOrMetric = /^(?:Rp\s*[\d\.,]+|[\d\.,]+\s*%|\d+[\d\.,]*)$/i.test(cleanVal);
        const nowrapStyle = isNumericOrMetric ? 'white-space: nowrap; font-variant-numeric: tabular-nums;' : '';
        html += `<td style="text-align: ${align}; ${nowrapStyle}">${formatInline(c)}</td>`;
      });
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    const placeholder = `\uE000TABLE_BLOCK_${tableBlocks.length}\uE001`;
    tableBlocks.push(html);
    return `\n${placeholder}\n`;
  });

  // 6. Headings (######, #####, ####, ###, ##, #)
  text = text.replace(/^###### (.*$)/gim, (m, h) => `<h6 class="md-h6">${formatInline(h)}</h6>`);
  text = text.replace(/^##### (.*$)/gim, (m, h) => `<h5 class="md-h5">${formatInline(h)}</h5>`);
  text = text.replace(/^#### (.*$)/gim, (m, h) => `<h5 class="md-h5">${formatInline(h)}</h5>`);
  text = text.replace(/^### (.*$)/gim, (m, h) => `<h4 class="md-h4">${formatInline(h)}</h4>`);
  text = text.replace(/^## (.*$)/gim, (m, h) => `<h3 class="md-h3">${formatInline(h)}</h3>`);
  text = text.replace(/^# (.*$)/gim, (m, h) => `<h2 class="md-h2">${formatInline(h)}</h2>`);

  // 7. Horizontal rule & Blockquote
  text = text.replace(/^---$/gim, '<hr class="md-hr">');
  text = text.replace(/^> (.*$)/gim, (m, q) => `<blockquote class="md-quote">${formatInline(q)}</blockquote>`);

  // 8. Process Lists and Paragraphs line by line
  const rawLines = text.split('\n');
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const curr = rawLines[i].trim();
    if (curr === '' && lines.length > 0 && lines[lines.length - 1].trim() === '') {
      continue;
    }
    lines.push(rawLines[i]);
  }

  let inUl = false;
  let inOl = false;
  let resultLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for nested sub-bullet item inside an active Ordered List (e.g. - Pelaksana: ...)
    if (inOl && (line.match(/^(\s{2,}|\t)[-*•]\s+(.*)$/) || trimmed.match(/^[-*•]\s+(.*)$/))) {
      const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
      const bulletText = bulletMatch ? bulletMatch[1] : trimmed;
      const lastIdx = resultLines.length - 1;
      if (lastIdx >= 0 && resultLines[lastIdx].endsWith('</li>')) {
        resultLines[lastIdx] = resultLines[lastIdx].slice(0, -5) + `<div class="md-list-sub">• ${formatInline(bulletText)}</div></li>`;
        continue;
      }
    }

    // Check for Unordered List Item: "- text" or "* text" or "• text"
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) {
        resultLines.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        resultLines.push('<ul class="md-ul">');
        inUl = true;
      }
      resultLines.push(`<li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    // Check for Ordered List Item: "1. text", "2. text", etc.
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const itemNum = parseInt(olMatch[1], 10) || 1;
      if (inUl) {
        resultLines.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        resultLines.push(`<ol class="md-ol" start="${itemNum}">`);
        inOl = true;
      }
      resultLines.push(`<li data-step="${itemNum}">${formatInline(olMatch[2])}</li>`);
      continue;
    }

    // Special block check
    const isSpecialBlock = (
      trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || 
      trimmed.startsWith('<h4') || trimmed.startsWith('<h5') || 
      trimmed.startsWith('<h6') || trimmed.startsWith('<blockquote') || 
      trimmed.startsWith('<hr') || trimmed.includes('\uE000CODE_BLOCK_') || 
      trimmed.includes('\uE000TABLE_BLOCK_') || trimmed.includes('\uE000IMAGE_BLOCK_') ||
      trimmed.includes('\uE000FILE_CARD_')
    );

    // If inside a list and encountered continuation line
    if ((inUl || inOl) && trimmed !== '' && !isSpecialBlock) {
      const lastIdx = resultLines.length - 1;
      if (lastIdx >= 0 && resultLines[lastIdx].endsWith('</li>')) {
        resultLines[lastIdx] = resultLines[lastIdx].slice(0, -5) + `<div class="md-list-sub">${formatInline(trimmed)}</div></li>`;
        continue;
      }
    }

    // If empty line inside list, check if next line continues list
    if ((inUl || inOl) && trimmed === '') {
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
      const nextIsUl = !!nextLine.match(/^[-*•]\s+/);
      const nextIsOl = !!nextLine.match(/^(\d+)\.\s+/);
      if ((inUl && nextIsUl) || (inOl && nextIsOl)) {
        continue;
      }
    }

    // Close active lists
    if (inUl) {
      resultLines.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      resultLines.push('</ol>');
      inOl = false;
    }

    if (!trimmed) {
      resultLines.push('<div class="md-spacer"></div>');
    } else if (isSpecialBlock) {
      resultLines.push(line);
    } else {
      resultLines.push(`<p class="md-p">${formatInline(line)}</p>`);
    }
  }

  if (inUl) resultLines.push('</ul>');
  if (inOl) resultLines.push('</ol>');

  let finalHtml = resultLines.join('');

  // 9. Restore Tables FIRST so table cells can have their code blocks/images restored
  tableBlocks.forEach((tbl, idx) => {
    finalHtml = finalHtml.split(`\uE000TABLE_BLOCK_${idx}\uE001`).join(tbl);
  });

  // 10. Restore Inline Code
  inlineCodes.forEach((code, idx) => {
    finalHtml = finalHtml.split(`\uE000INLINE_CODE_${idx}\uE001`).join(`<code class="md-inline-code">${code}</code>`);
  });

  // 11. Restore Code Blocks
  codeBlocks.forEach((block, idx) => {
    const codeCard = `
      <div class="md-code-card">
        <div class="md-code-header">
          <span class="md-code-lang">${escapeHtml(block.lang)}</span>
          <button type="button" class="md-code-copy-btn" title="Salin kode">Copy</button>
        </div>
        <pre><code class="language-${escapeHtml(block.lang)}">${escapeHtml(block.code)}</code></pre>
      </div>
    `;
    finalHtml = finalHtml.split(`\uE000CODE_BLOCK_${idx}\uE001`).join(codeCard);
  });

  // 12. Restore Images
  imageBlocks.forEach((imgCard, idx) => {
    finalHtml = finalHtml.split(`\uE000IMAGE_BLOCK_${idx}\uE001`).join(imgCard);
  });

  // 13. Restore File Cards
  fileCardBlocks.forEach((card, idx) => {
    finalHtml = finalHtml.split(`\uE000FILE_CARD_${idx}\uE001`).join(card);
  });

  return finalHtml;
}

// Global Delegation for Code Block Copy Buttons (CSP Compliant)
document.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.md-code-copy-btn');
  if (copyBtn) {
    e.preventDefault();
    e.stopPropagation();
    const card = copyBtn.closest('.md-code-card');
    const codeEl = card ? card.querySelector('code') : null;
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent || codeEl.innerText);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    }
  }

  // Global Delegation for Clarification Option Chips
  const chip = e.target.closest('.clarification-chip');
  if (chip) {
    e.preventDefault();
    e.stopPropagation();
    const prompt = chip.getAttribute('data-prompt');
    const action = chip.getAttribute('data-action');
    if (prompt) {
      if (chatInput) {
        chatInput.value = prompt;
        hideClarificationDock();
        handleSendMessage();
      }
    } else if (action === 'custom') {
      hideClarificationDock();
      if (chatInput) {
        chatInput.focus();
        chatInput.placeholder = "Ketik arahan kustom Anda di sini...";
        scrollToBottom();
      }
    }
  }
});

// =========================================================================
// Settings Modal & Preset Logic
// =========================================================================
const PRESET_CONFIGS = {
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    temp: 0.2
  },
  openai: {
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o",
    temp: 0.2
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.5-flash",
    temp: 0.2
  },
  ollama: {
    endpoint: "http://localhost:11434/v1",
    model: "llama3.3",
    temp: 0.2
  },
  "9router": {
    endpoint: "http://localhost:20128/v1",
    model: "gemini-2.5-flash",
    temp: 0.2
  },
  custom: {
    endpoint: "",
    model: "",
    temp: 0.2
  }
};

const DEFAULT_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" }
];

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
    raw = DEFAULT_MODELS;
  }

  const normalized = raw.map(normalizeModelItem);
  if (includeEmpty) return normalized;
  return normalized.filter(m => m.id.length > 0);
}

function getCandidateModelsList() {
  const list = getModelsList();
  const ids = list.map(m => m.id).filter(Boolean);
  if (ids.length === 0) {
    if (config.model && config.model.trim() && config.model !== 'auto') {
      return [config.model.trim()];
    }
    return ["gemini-2.5-flash"];
  }
  return ids;
}

function getModelDisplayName(modelId) {
  if (!modelId || modelId === 'auto') return "Auto (Model)";
  const list = getModelsList();
  const found = list.find(m => m.id === modelId);
  if (found && found.name) return found.name;
  return modelId;
}

function isRateLimitError(status, errorMsg = "") {
  if (status === 429 || status === 503) return true;
  const lower = String(errorMsg || "").toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("overloaded") ||
    lower.includes("too many requests") ||
    lower.includes("capacity") ||
    lower.includes("busy")
  );
}

function loadSettings() {
  chrome.storage.local.get(['browser_agent_config'], (res) => {
    if (res && res.browser_agent_config) {
      config = { ...config, ...res.browser_agent_config };
    }
    if (Array.isArray(config.models) && config.models.length > 0) {
      // Respect exact user model list
    } else if (Array.isArray(config.customModels) && config.customModels.length > 0) {
      config.models = [...config.customModels];
    } else {
      config.models = [...DEFAULT_MODELS];
    }
    const cleanList = getModelsList();
    const candidateIds = cleanList.map(m => m.id);

    // Default to "auto" if not explicitly set
    if (!config.selectedModelChoice) {
      config.selectedModelChoice = "auto";
    }

    if (config.selectedModelChoice === "auto") {
      config.autoRotateModel = true;
      config.model = "auto";
    } else {
      if (!candidateIds.includes(config.selectedModelChoice)) {
        config.selectedModelChoice = "auto";
        config.autoRotateModel = true;
        config.model = "auto";
      } else {
        config.model = config.selectedModelChoice;
        config.autoRotateModel = false;
      }
    }

    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
    loadAgentsAndSkills();
  });
}

function saveSettings() {
  config.preset = document.getElementById('setting-preset').value;
  config.endpoint = document.getElementById('setting-endpoint').value.trim();
  config.apiKey = document.getElementById('setting-apikey').value.trim();
  config.temperature = parseFloat(document.getElementById('setting-temp').value) || 0.2;
  config.maxTokens = parseInt(document.getElementById('setting-max-tokens').value) || 4096;

  // Collect all model inputs from rows in priority order
  const modelCards = document.querySelectorAll('.model-row-item');
  const collected = [];
  modelCards.forEach(card => {
    const idInput = card.querySelector('.model-input-id');
    const nameInput = card.querySelector('.model-input-name');
    const idVal = idInput ? idInput.value.trim() : "";
    const nameVal = nameInput ? nameInput.value.trim() : "";
    if (idVal) {
      collected.push({ id: idVal, name: nameVal || idVal });
    }
  });

  if (collected.length > 0) {
    config.models = collected;
  }

  if (config.selectedModelChoice !== "auto" && config.selectedModelChoice) {
    config.model = config.selectedModelChoice;
    config.autoRotateModel = false;
  } else {
    config.selectedModelChoice = "auto";
    config.model = "auto";
    config.autoRotateModel = true;
  }

  chrome.storage.local.set({ browser_agent_config: config }, () => {
    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
    hideSettingsModal();
  });
}

function selectModelChoice(choice) {
  if (choice === "auto") {
    config.selectedModelChoice = "auto";
    config.model = "auto";
    config.autoRotateModel = true;
  } else {
    config.selectedModelChoice = choice;
    config.model = choice;
    config.autoRotateModel = false;
    if (!config.models) config.models = [];
    const exists = config.models.some(m => (typeof m === 'string' ? m === choice : m.id === choice));
    if (!exists) {
      config.models.push({ id: choice, name: choice });
    }
  }

  chrome.storage.local.set({ browser_agent_config: config }, () => {
    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
    closeModelDropdown();
  });
}

function selectModel(modelName) {
  selectModelChoice(modelName);
}

function addCustomModel(modelName) {
  const clean = modelName.trim();
  if (!clean) return;
  if (!config.models) config.models = [];
  const exists = config.models.some(m => (typeof m === 'string' ? m === clean : m.id === clean));
  if (!exists) {
    config.models.push({ id: clean, name: clean });
  }
  chrome.storage.local.set({ browser_agent_config: config }, () => {
    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
  });
}

function deleteModelRow(index) {
  const list = getModelsList(true);
  if (list.length <= 1) return;
  const removed = list.splice(index, 1)[0];
  config.models = list;
  if (config.selectedModelChoice === removed.id) {
    config.selectedModelChoice = "auto";
    config.model = "auto";
    config.autoRotateModel = true;
  }
  chrome.storage.local.set({ browser_agent_config: config }, () => {
    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
  });
}

function applyConfigToUI() {
  const activeModelName = document.getElementById('active-model-name');
  if (activeModelName) {
    if (config.selectedModelChoice === "auto" || config.model === "auto" || !config.selectedModelChoice) {
      activeModelName.textContent = "Auto (Model)";
    } else {
      activeModelName.textContent = getModelDisplayName(config.selectedModelChoice || config.model);
    }
  }

  const settingPreset = document.getElementById('setting-preset');
  if (settingPreset) settingPreset.value = config.preset || "gemini";

  const settingEndpoint = document.getElementById('setting-endpoint');
  if (settingEndpoint) settingEndpoint.value = config.endpoint || "";

  const settingApiKey = document.getElementById('setting-apikey');
  if (settingApiKey) settingApiKey.value = config.apiKey || "";

  const settingTemp = document.getElementById('setting-temp');
  if (settingTemp) settingTemp.value = config.temperature || 0.2;

  const settingMaxTokens = document.getElementById('setting-max-tokens');
  if (settingMaxTokens) settingMaxTokens.value = config.maxTokens || 4096;
}

function renderModelDropdown() {
  const container = document.getElementById('model-list-scroll');
  if (!container) return;

  const models = getModelsList();
  container.innerHTML = '';

  const isAuto = (config.selectedModelChoice === "auto" || !config.selectedModelChoice || config.model === "auto");

  // 1. Auto (Model) Option (clean, without AUTO badge pill)
  const autoItem = document.createElement('div');
  autoItem.className = `model-item model-item-auto ${isAuto ? 'active' : ''}`;
  autoItem.innerHTML = `
    <div class="model-item-info">
      <span class="model-check-box">${isAuto ? '<svg class="model-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</span>
      <span class="model-name" title="Otomatis rotasi model sesuai urutan prioritas #1, #2, #3 saat rate limit">Auto (Model)</span>
    </div>
  `;
  autoItem.addEventListener('click', () => {
    selectModelChoice("auto");
  });
  container.appendChild(autoItem);

  // 2. Individual Configured Models (#1, #2, #3 without 'Utama' label)
  models.forEach((mObj, idx) => {
    const isCurrentChoice = (!isAuto && (config.selectedModelChoice === mObj.id || config.model === mObj.id));
    const badgeText = `#${idx + 1}`;

    const item = document.createElement('div');
    item.className = `model-item ${isCurrentChoice ? 'active' : ''}`;
    item.innerHTML = `
      <div class="model-item-info">
        <span class="model-check-box">${isCurrentChoice ? '<svg class="model-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</span>
        <span class="model-priority-badge" style="font-size: 8.5px; padding: 1.5px 5px; margin-right: 6px;">${badgeText}</span>
        <span class="model-name" title="${escapeHtml(mObj.name)} (${escapeHtml(mObj.id)})">${escapeHtml(mObj.name || mObj.id)}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      selectModelChoice(mObj.id);
    });

    container.appendChild(item);
  });
}

function renderSettingsModelRows() {
  const container = document.getElementById('settings-models-rows');
  if (!container) return;

  const models = getModelsList(true);
  container.innerHTML = '';

  models.forEach((mObj, idx) => {
    const isPrimary = (idx === 0);
    const badgeText = isPrimary ? '#1 (Utama)' : `#${idx + 1} (Cadangan ${idx})`;

    const row = document.createElement('div');
    row.className = `model-row-item ${isPrimary ? 'is-primary' : ''}`;
    row.innerHTML = `
      <span class="model-priority-badge ${isPrimary ? 'priority-primary' : ''}" title="${isPrimary ? 'Prioritas #1 (Utama)' : `Cadangan #${idx}`}">${badgeText}</span>
      <div class="model-inputs-box">
        <input type="text" class="model-input-name" placeholder="Nama UI" value="${escapeHtml(mObj.name)}">
        <input type="text" class="model-input-id" placeholder="ID Model API" value="${escapeHtml(mObj.id)}">
      </div>
      <div class="model-actions-group">
        <button type="button" class="btn-model-reorder btn-model-move-up" title="Naikkan Prioritas" ${idx === 0 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button type="button" class="btn-model-reorder btn-model-move-down" title="Turunkan Prioritas" ${idx === models.length - 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button type="button" class="btn-del-row" title="Hapus model" ${models.length <= 1 ? 'disabled style="opacity: 0.25; cursor: not-allowed;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    const nameInput = row.querySelector('.model-input-name');
    const idInput = row.querySelector('.model-input-id');

    const updateCurrentModel = () => {
      const idVal = idInput.value.trim();
      const nameVal = nameInput.value.trim() || idVal;
      config.models[idx] = { id: idVal, name: nameVal };
      if (idx === 0 && config.selectedModelChoice !== "auto") {
        config.model = idVal;
      }
      chrome.storage.local.set({ browser_agent_config: config }, () => {
        applyConfigToUI();
        renderModelDropdown();
      });
    };

    nameInput.addEventListener('change', updateCurrentModel);
    idInput.addEventListener('change', updateCurrentModel);

    nameInput.addEventListener('input', () => {
      if (config.models[idx]) {
        config.models[idx].name = nameInput.value.trim();
      }
    });

    idInput.addEventListener('input', () => {
      if (config.models[idx]) {
        config.models[idx].id = idInput.value.trim();
        if (!config.models[idx].name) {
          config.models[idx].name = idInput.value.trim();
        }
      }
      if (idx === 0 && config.selectedModelChoice !== "auto") {
        config.model = idInput.value.trim();
        applyConfigToUI();
      }
    });

    const moveUpBtn = row.querySelector('.btn-model-move-up');
    moveUpBtn.addEventListener('click', () => {
      if (idx > 0) {
        const temp = config.models[idx];
        config.models[idx] = config.models[idx - 1];
        config.models[idx - 1] = temp;
        if (config.selectedModelChoice !== "auto") {
          config.model = config.models[0].id;
        }
        chrome.storage.local.set({ browser_agent_config: config }, () => {
          applyConfigToUI();
          renderModelDropdown();
          renderSettingsModelRows();
        });
      }
    });

    const moveDownBtn = row.querySelector('.btn-model-move-down');
    moveDownBtn.addEventListener('click', () => {
      if (idx < config.models.length - 1) {
        const temp = config.models[idx];
        config.models[idx] = config.models[idx + 1];
        config.models[idx + 1] = temp;
        if (config.selectedModelChoice !== "auto") {
          config.model = config.models[0].id;
        }
        chrome.storage.local.set({ browser_agent_config: config }, () => {
          applyConfigToUI();
          renderModelDropdown();
          renderSettingsModelRows();
        });
      }
    });

    const btnDel = row.querySelector('.btn-del-row');
    btnDel.addEventListener('click', () => {
      deleteModelRow(idx);
    });

    container.appendChild(row);
  });
}

// Add new Model Row in Settings Modal
document.getElementById('btn-add-model-row')?.addEventListener('click', () => {
  if (!Array.isArray(config.models)) {
    config.models = [...DEFAULT_MODELS];
  }
  config.models.push({ id: "", name: "" });
  chrome.storage.local.set({ browser_agent_config: config }, () => {
    renderSettingsModelRows();
    const inputs = document.querySelectorAll('.model-input-name');
    if (inputs.length > 0) {
      const last = inputs[inputs.length - 1];
      last.focus();
    }
  });
});

const modelDropdownMenu = document.getElementById('model-dropdown-menu');
const btnActiveModel = document.getElementById('btn-active-model');

function toggleModelDropdown() {
  if (!modelDropdownMenu) return;
  const isShown = modelDropdownMenu.style.display === 'flex';
  if (isShown) {
    closeModelDropdown();
  } else {
    openModelDropdown();
  }
}

function openModelDropdown() {
  closeAgentDropdown();
  renderModelDropdown();
  if (modelDropdownMenu) modelDropdownMenu.style.display = 'flex';
  if (btnActiveModel) btnActiveModel.classList.add('open');
  const input = document.getElementById('input-quick-add-model');
  if (input) setTimeout(() => input.focus(), 50);
}

function closeModelDropdown() {
  if (modelDropdownMenu) modelDropdownMenu.style.display = 'none';
  if (btnActiveModel) btnActiveModel.classList.remove('open');
}

btnActiveModel?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleModelDropdown();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#btn-active-model') && !e.target.closest('#model-dropdown-menu')) {
    closeModelDropdown();
  }
  if (!e.target.closest('#btn-active-agent') && !e.target.closest('#agent-dropdown-menu')) {
    closeAgentDropdown();
  }
});

// =========================================================================
// Agent Dropdown & Multi-Agent Persona Manager
// =========================================================================
const agentDropdownMenu = document.getElementById('agent-dropdown-menu');
const btnActiveAgent = document.getElementById('btn-active-agent');

async function loadAgentsAndSkills() {
  const res = await chrome.storage.local.get(['custom_agents', 'custom_skills', 'custom_memories', 'active_agent_id']);
  if (res && Array.isArray(res.custom_agents) && res.custom_agents.length > 0) {
    customAgents = res.custom_agents;
  } else {
    customAgents = [
      {
        id: "default_agent",
        name: "General Browser Assistant & Control",
        description: "Sub-agent spesialis kontrol browser tingkat tinggi: navigasi, snapshot, klik akurat, form input, jeda render browser_wait untuk internet lambat, dan kontrol media",
        content: `You are General Browser Assistant & Control working under Master Agent. You specialize in controlling the web browser with 100% precision and handling slow networks/rendering delays via browser_wait. GAYA BAHASA: Sangat singkat, padat, to the point (Terse Caveman Style). Tanpa basa-basi/fluff.`,
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
        is_default: true
      }
    ];
  }

  if (res && Array.isArray(res.custom_skills)) customSkills = res.custom_skills;
  if (res && Array.isArray(res.custom_memories)) customMemories = res.custom_memories;

  // Always guarantee updated skill_screenshot_walkthrough exists in customSkills
  const walkthroughSkillObj = {
    id: "skill_screenshot_walkthrough",
    name: "Screenshot Walkthrough & Visual Orientation",
    description: "SOP Orientasi Visual Walkthrough Langkah-1 (browser_screenshot) sebelum klik/scroll dan verifikasi pasca-aksi (Snap & Verify) untuk kontrol browser 100% presisi dan minim kesalahan.",
    content: "# Screenshot Walkthrough & Visual Orientation SOP\n\nSOP wajib untuk seluruh operasi kontrol browser (klik tombol, input form, scroll, navigasi alur kerja).\n\n## 4 Langkah Wajib (100% Presisi Loop):\n1. **Orientasi Visual Awal (Langkah 1)**: Master Agent WAJIB memanggil `browser_screenshot()` terlebih dahulu untuk melihat tata letak visual layar, mendeteksi modal/pop-up, banner cookie, dan memastikan posisi target secara visual sebelum memerintahkan aksi.\n2. **Inspeksi DOM & Snapshot**: Panggil `browser_snapshot()` untuk mendapatkan pohon aksesibilitas dan `backendNodeId` dari elemen interaktif.\n3. **Eksekusi Presisi**: Perintahkan Browser Control Agent mengeksekusi `browser_click`, `browser_type`, atau `browser_scroll` dengan `backendNodeId` yang valid.\n4. **Verifikasi Pasca-Aksi (Snap & Verify)**: Segera setelah aksi dieksekusi, panggil `browser_snapshot()` atau `browser_screenshot()` untuk memverifikasi perubahan tampilan UI (modal terbuka/tertutup, navigasi langkah form) sebelum menyatakan tuntas."
  };
  const wtIdx = customSkills.findIndex(s => s.id === "skill_screenshot_walkthrough");
  if (wtIdx >= 0) {
    customSkills[wtIdx] = walkthroughSkillObj;
  } else {
    customSkills.unshift(walkthroughSkillObj);
  }

  activeAgentId = res.active_agent_id || AUTO_AGENT_ID;
  activeAgent = (activeAgentId === AUTO_AGENT_ID) ? null : (customAgents.find(a => a.id === activeAgentId) || customAgents[0]);

  updateAgentUI();
  renderAgentDropdown();
}

function updateAgentUI() {
  const nameEl = document.getElementById('active-agent-name');
  if (!nameEl) return;
  if (activeAgentId === AUTO_AGENT_ID || !activeAgentId) {
    nameEl.textContent = "Auto (Agent)";
  } else if (activeAgent) {
    nameEl.textContent = activeAgent.name || "General Agent";
  } else {
    nameEl.textContent = "Auto (Agent)";
  }
}

function renderAgentDropdown() {
  const container = document.getElementById('agent-list-scroll');
  if (!container) return;
  container.innerHTML = '';

  // 1. Auto (Agent) Option
  const isAutoActive = (activeAgentId === AUTO_AGENT_ID || !activeAgentId);
  const autoItem = document.createElement('div');
  autoItem.className = `agent-item ${isAutoActive ? 'active' : ''}`;
  autoItem.innerHTML = `
    <div class="agent-item-top">
      <span class="agent-item-name" style="display: flex; align-items: center; gap: 6px;">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Auto (Agent)
      </span>
      ${isAutoActive ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
    </div>
    <span class="agent-item-desc">Mode Master Agent otomatis yang mengorkestrasikan sub-agent (Riset, Coding, Browser) sesuai kebutuhan</span>
  `;
  autoItem.addEventListener('click', () => {
    selectAgent(AUTO_AGENT_ID);
  });
  container.appendChild(autoItem);

  // 2. Filter out Master Agent (since Master Agent is represented by Auto mode) and broken/untitled agents
  const workerAgents = customAgents.filter(ag => ag && ag.id !== "master_agent" && ag.id !== "boss_agent" && !ag.is_boss && ag.name && ag.name !== "Untitled" && ag.name !== "Untitled Sub-Agent" && ag.name !== "Untitled Agent");

  if (workerAgents.length > 0) {
    const divider = document.createElement('div');
    divider.style.cssText = "height: 1px; background: #E2E8F0; margin: 4px 8px;";
    container.appendChild(divider);
  }

  // 3. Render Worker / Specialist Sub-Agents
  workerAgents.forEach(ag => {
    const isActive = (activeAgentId !== AUTO_AGENT_ID && ag.id === activeAgentId);
    const item = document.createElement('div');
    item.className = `agent-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `
      <div class="agent-item-top">
        <span class="agent-item-name">${escapeHtml(ag.name)}</span>
        ${isActive ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      <span class="agent-item-desc">${escapeHtml(ag.description || '')}</span>
    `;

    item.addEventListener('click', () => {
      selectAgent(ag.id);
    });

    container.appendChild(item);
  });
}

function selectAgent(agentId) {
  activeAgentId = agentId;
  if (agentId === AUTO_AGENT_ID) {
    activeAgent = null;
    chrome.storage.local.set({ active_agent_id: AUTO_AGENT_ID });
    updateFooterStatus("Agent: Auto (Agent)");
  } else {
    activeAgent = customAgents.find(a => a.id === agentId) || customAgents[0];
    chrome.storage.local.set({ active_agent_id: activeAgentId, custom_agents: customAgents });
    updateFooterStatus(`Agent: ${activeAgent.name}`);
  }
  updateAgentUI();
  renderAgentDropdown();
  closeAgentDropdown();
}

function toggleAgentDropdown() {
  if (!agentDropdownMenu) return;
  const isShown = agentDropdownMenu.style.display === 'flex';
  if (isShown) {
    closeAgentDropdown();
  } else {
    openAgentDropdown();
  }
}

function openAgentDropdown() {
  closeModelDropdown();
  renderAgentDropdown();
  agentDropdownMenu.style.display = 'flex';
  if (btnActiveAgent) btnActiveAgent.classList.add('open');
}

function closeAgentDropdown() {
  if (agentDropdownMenu) agentDropdownMenu.style.display = 'none';
  if (btnActiveAgent) btnActiveAgent.classList.remove('open');
}

btnActiveAgent?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleAgentDropdown();
});

// Quick add model inside dropdown
document.getElementById('btn-quick-add-model')?.addEventListener('click', () => {
  const input = document.getElementById('input-quick-add-model');
  if (input && input.value.trim()) {
    addCustomModel(input.value.trim());
    input.value = '';
  }
});

document.getElementById('input-quick-add-model')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.target.value.trim()) {
      addCustomModel(e.target.value.trim());
      e.target.value = '';
    }
  }
});

function showSettingsModal() {
  applyConfigToUI();
  renderSettingsModelRows();
  document.getElementById('settings-modal').style.display = 'flex';
}

function hideSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

// OS Tab Switcher
document.querySelectorAll('.os-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.os-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const os = tab.getAttribute('data-os');
    document.getElementById('os-cmd-linux').style.display = os === 'linux' ? 'block' : 'none';
    document.getElementById('os-cmd-mac').style.display = os === 'mac' ? 'block' : 'none';
    document.getElementById('os-cmd-windows').style.display = os === 'windows' ? 'block' : 'none';
  });
});

// Copy button in setup
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-copy');
    if (text) {
      navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }
  });
});

// Test AI Connection Button
document.getElementById('btn-test-ai')?.addEventListener('click', async () => {
  const endpoint = document.getElementById('setting-endpoint').value.trim().replace(/\/+$/, "") + "/chat/completions";
  const apiKey = document.getElementById('setting-apikey').value.trim();
  const model = document.getElementById('setting-model').value.trim();
  const resultBox = document.getElementById('test-ai-result');

  resultBox.style.display = 'block';
  resultBox.className = 'test-result-box';
  resultBox.textContent = 'Testing connection...';

  const startTime = Date.now();
  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 5,
        stream: false
      })
    });

    const elapsed = Date.now() - startTime;
    if (res.ok) {
      resultBox.className = 'test-result-box success';
      resultBox.textContent = `Connected successfully! Latency: ${elapsed}ms (Model: ${model})`;
    } else {
      const errText = await res.text();
      resultBox.className = 'test-result-box error';
      resultBox.textContent = `Failed (${res.status}): ${errText}`;
    }
  } catch (err) {
    resultBox.className = 'test-result-box error';
    resultBox.textContent = `Error: ${err.message}`;
  }
});

// Toggle password visibility
document.getElementById('btn-toggle-apikey')?.addEventListener('click', () => {
  const input = document.getElementById('setting-apikey');
  const btn = document.getElementById('btn-toggle-apikey');
  if (input) {
    const isPwd = (input.type === 'password');
    input.type = isPwd ? 'text' : 'password';
    if (btn) {
      btn.innerHTML = isPwd
        ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }
});

// Modal & Options Tab Event Listeners
let isOpeningOptions = false;

async function openOptionsTab(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (isOpeningOptions) return;
  isOpeningOptions = true;
  setTimeout(() => { isOpeningOptions = false; }, 600);

  const url = chrome.runtime.getURL('options.html');
  try {
    const existingTabs = await chrome.tabs.query({ url });
    if (existingTabs && existingTabs.length > 0) {
      await chrome.tabs.update(existingTabs[0].id, { active: true });
      if (existingTabs[0].windowId) {
        await chrome.windows.update(existingTabs[0].windowId, { focused: true });
      }
      return;
    }
    await chrome.tabs.create({ url, active: true });
  } catch (err) {
    try {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
      }
    } catch (e) {}
    window.open(url, '_blank');
  }
}

document.getElementById('btn-open-settings')?.addEventListener('click', openOptionsTab);
document.getElementById('btn-close-settings')?.addEventListener('click', hideSettingsModal);
document.getElementById('btn-cancel-settings')?.addEventListener('click', hideSettingsModal);
document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);

// Realtime sync config from full-screen options tab
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.browser_agent_config) {
    config = { ...config, ...changes.browser_agent_config.newValue };
    if (Array.isArray(config.models)) {
      // Keep exact models array
    } else if (Array.isArray(config.customModels)) {
      config.models = [...config.customModels];
    }
    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
  }
});

// =========================================================================
// SQLite Chat History & Resume Management
// =========================================================================
function sanitizeHistoryForStorage(history) {
  if (!Array.isArray(history)) return [];
  return history.map(msg => {
    let content = msg.content;
    let attachments = msg.attachments;

    // Lightweight tool output summary for history storage (prevents megabyte bloating)
    if (msg.role === 'tool') {
      content = '{"status":"success"}';
    } else if (typeof content === 'string') {
      // For assistant or user messages, preserve full markdown image syntax intact
      const hasImageMarkdown = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+|local-img:\/\/[^\s)]+)\)/.test(content);
      if (!hasImageMarkdown && content.length > 50000) {
        content = content.slice(0, 50000) + '... [storage truncated]';
      }
    } else if (Array.isArray(content)) {
      content = content.map(part => {
        if (part && part.type === 'image_url') {
          return { type: 'text', text: '[Lampiran Gambar / Video Frame]' };
        }
        return part;
      });
    }

    if (Array.isArray(attachments)) {
      attachments = attachments.map(att => ({
        id: att.id || ('att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        name: att.name,
        size: att.size,
        type: att.type,
        isImage: !!att.isImage,
        isVideo: !!att.isVideo,
        duration: att.duration || 0,
        thumbnailUrl: att.thumbnailUrl || (att.isImage && att.dataUrl && att.dataUrl.length < 500000 ? att.dataUrl : "") || "",
        width: att.width || 0,
        height: att.height || 0
      }));
    }

    const clean = {
      role: msg.role,
      content: content,
      displayContent: msg.role === 'tool' ? "" : ((typeof msg.displayContent === 'string') ? msg.displayContent : (typeof msg.content === 'string' ? msg.content : ""))
    };
    if (attachments) clean.attachments = attachments;
    if (msg.name) clean.name = msg.name;
    if (msg.tool_calls) clean.tool_calls = msg.tool_calls;
    if (msg.tool_call_id) clean.tool_call_id = msg.tool_call_id;
    if (msg.agentInfo) clean.agentInfo = msg.agentInfo;
    return clean;
  });
}

async function saveCurrentSessionToDB() {
  if (!currentSessionId || conversationHistory.length === 0) return;
  const sanitizedMessages = sanitizeHistoryForStorage(conversationHistory);
  const sessionData = {
    id: currentSessionId,
    title: currentSessionTitle || "New Chat",
    model: config.model || "Default Model",
    messages: sanitizedMessages,
    created_at: currentSessionCreatedAt || Date.now()
  };

  // Cache in chrome.storage.local safely (prune to 10 latest sessions to prevent quota issues)
  try {
    const res = await chrome.storage.local.get(['chat_sessions_cache']);
    let cache = res.chat_sessions_cache || {};
    cache[currentSessionId] = sessionData;

    const keys = Object.keys(cache);
    if (keys.length > 10) {
      keys.sort((a, b) => (cache[b]?.created_at || 0) - (cache[a]?.created_at || 0));
      const pruned = {};
      keys.slice(0, 10).forEach(k => { pruned[k] = cache[k]; });
      cache = pruned;
    }

    await chrome.storage.local.set({ chat_sessions_cache: cache });
  } catch (e) {
    try {
      await chrome.storage.local.set({ chat_sessions_cache: { [currentSessionId]: sessionData } });
    } catch (err2) {
      console.warn("Storage quota notice (saved to SQLite):", err2);
    }
  }

  // Save to SQLite via Native Host RPC
  try {
    if (nativePort) {
      await sendNativeRpc("db_save_session", { session: sessionData });
    }
  } catch (e) {
    console.warn("SQLite save notice (cached locally):", e);
  }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Baru saja';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

async function loadHistoryList(searchQuery = "") {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  container.innerHTML = '<div class="history-empty-state"><p>Memuat riwayat chat...</p></div>';

  let sessions = [];
  let fetchedFromNative = false;

  // 1. Query SQLite from Native Host
  if (nativePort) {
    try {
      const res = await sendNativeRpc("db_get_sessions", { search: searchQuery });
      if (res && res.status === "ok" && Array.isArray(res.sessions)) {
        sessions = res.sessions;
        fetchedFromNative = true;
        // Keep cache strictly in sync with SQLite
        if (!searchQuery.trim()) {
          const cacheMap = {};
          for (const s of sessions) {
            cacheMap[s.id] = s;
          }
          await chrome.storage.local.set({ chat_sessions_cache: cacheMap });
        }
      }
    } catch (e) {
      console.warn("SQLite get error, fallback to cache:", e);
    }
  }

  // 2. Only fallback to local storage cache if native host is offline/unavailable
  if (!fetchedFromNative) {
    const res = await chrome.storage.local.get(['chat_sessions_cache']);
    const cache = res.chat_sessions_cache || {};
    sessions = Object.values(cache).map(s => ({
      id: s.id,
      title: s.title,
      model: s.model,
      message_count: s.messages ? s.messages.length : 0,
      preview: s.messages && s.messages[0] ? (s.messages[0].content || "").slice(0, 120) : "",
      created_at: s.created_at,
      updated_at: s.updated_at || s.created_at
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sessions = sessions.filter(s => 
        (s.title && s.title.toLowerCase().includes(q)) || 
        (s.preview && s.preview.toLowerCase().includes(q)) ||
        (s.model && s.model.toLowerCase().includes(q))
      );
    }
    sessions.sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
  }

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="history-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <strong>Belum Ada Riwayat</strong>
        <p>${searchQuery ? 'Tidak ada riwayat percakapan yang cocok.' : 'Percakapan Anda akan tersimpan otomatis di database SQLite lokal.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  sessions.forEach(sess => {
    const isActive = sess.id === currentSessionId;
    const timeStr = formatTimeAgo(sess.updated_at || sess.created_at);

    const card = document.createElement('div');
    card.className = `history-item-card ${isActive ? 'active-session' : ''}`;
    card.innerHTML = `
      <div class="history-item-content">
        <div class="history-item-header">
          <span class="history-item-title" title="${escapeHtml(sess.title || 'New Chat')}">${escapeHtml(sess.title || 'New Chat')}</span>
          <span class="history-model-badge">${escapeHtml(sess.model || 'Model')}</span>
        </div>
        <div class="history-item-meta">
          <span>${timeStr}</span>
          <span>•</span>
          <span>${sess.message_count || 0} pesan</span>
        </div>
        ${sess.preview ? `<div class="history-preview">${escapeHtml(sess.preview)}</div>` : ''}
      </div>
      <button type="button" class="btn-del-history-item" title="Hapus percakapan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    `;

    // Resume chat on card click
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-del-history-item')) return;
      resumeSession(sess.id);
    });

    // Delete session on trash button click
    const delBtn = card.querySelector('.btn-del-history-item');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirmModal(sess.id, sess.title || 'New Chat');
    });

    container.appendChild(card);
  });
}

async function resumeSession(sessionId) {
  if (isExecuting) {
    cancelExecution();
  }
  let session = null;

  // 1. Fetch from SQLite
  if (nativePort) {
    try {
      const res = await sendNativeRpc("db_get_session", { session_id: sessionId });
      if (res && res.status === "ok" && res.session) {
        session = res.session;
      }
    } catch (e) {
      console.warn("SQLite get session notice:", e);
    }
  }

  // 2. Fetch from cache fallback
  if (!session) {
    const res = await chrome.storage.local.get(['chat_sessions_cache']);
    const cache = res.chat_sessions_cache || {};
    session = cache[sessionId];
  }

  if (!session) {
    console.warn("Session data not found for id:", sessionId);
    hideHistoryModal();
    return;
  }

  currentSessionId = session.id;
  currentSessionTitle = session.title;
  currentSessionCreatedAt = session.created_at;
  conversationHistory = session.messages || [];

  if (session.model) {
    config.model = session.model;
    applyConfigToUI();
  }

  // Re-render chat messages cleanly from history
  chatMessages.innerHTML = '';
  if (welcomeCard) welcomeCard.style.display = 'none';
  document.body.classList.add('has-messages');

  let currentAssistantBubble = null;

  for (let i = 0; i < conversationHistory.length; i++) {
    const msg = conversationHistory[i];

    if (msg.role === 'user') {
      currentAssistantBubble = null;
      const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;
      let displayText = "";
      if (typeof msg.displayContent === 'string') {
        displayText = msg.displayContent;
      } else if (!hasAttachments) {
        if (typeof msg.content === 'string') {
          displayText = msg.content;
        } else if (typeof msg.content === 'object' && msg.content !== null && typeof msg.content.text === 'string') {
          displayText = msg.content.text;
        }
      }
      const cleanDisplay = typeof displayText === 'string' ? displayText.trim() : "";
      if ((cleanDisplay && cleanDisplay !== "{}" && cleanDisplay !== "[object Object]") || hasAttachments) {
        appendUserMessage(cleanDisplay, msg.attachments || []);
      }
    } else if (msg.role === 'assistant') {
      // 1. Render tool calls as completed badges if present
      if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        if (!currentAssistantBubble) {
          currentAssistantBubble = appendAssistantMessage(null, false, msg.agentInfo);
        }
        msg.tool_calls.forEach(tc => {
          const tName = tc.function?.name || tc.name || "tool";
          let tArgs = {};
          try {
            tArgs = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {});
          } catch (e) {}
          const badge = appendToolBadge(currentAssistantBubble, tName, tArgs);
          updateToolBadgeState(badge, "success", JSON.stringify(tArgs));
        });
        finalizeToolSection(currentAssistantBubble, true);
      }

      // 2. Render assistant text response if present
      if (msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0) {
        if (!currentAssistantBubble) {
          currentAssistantBubble = appendAssistantMessage(msg.content, false, msg.agentInfo);
        } else {
          updateAssistantText(currentAssistantBubble, msg.content);
        }
        currentAssistantBubble = null;
      }
    } else if (msg.role === 'tool') {
      // Tool output already captured in badge
      continue;
    }
  }

  hydrateLocalImages(chatMessages);
  hydrateFileActions(chatMessages);
  hideHistoryModal();
  updateFooterStatus("Sesi Dimuat");
  setTimeout(() => updateFooterStatus("Agent Ready"), 1500);
}

function cancelExecution() {
  if (isExecuting || abortController) {
    isExecuting = false;
    if (abortController) {
      try {
        abortController.abort();
      } catch (e) {}
    }
  }
  isExecuting = false;
  abortController = null;
  updateSendButtonState(false);
  notifyActiveTabExecutionState(false);
  updateFooterStatus("Agent Ready");
}

function startNewChat() {
  if (isExecuting) {
    cancelExecution();
  }
  hideClarificationDock();
  saveCurrentSessionToDB();
  currentSessionId = null;
  currentSessionTitle = "New Chat";
  currentSessionCreatedAt = null;
  conversationHistory = [];
  pendingAttachments = [];
  clearAttachments();
  chatMessages.innerHTML = '';
  if (welcomeCard) {
    chatMessages.appendChild(welcomeCard);
    welcomeCard.style.display = 'block';
  }
  document.body.classList.remove('has-messages');
  isExecuting = false;
  abortController = null;
  updateSendButtonState(false);
  hideHistoryModal();
  updateFooterStatus("Chat Baru Dimulai");
  setTimeout(() => updateFooterStatus("Agent Ready"), 1500);
}

function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.style.display = 'flex';
    const searchInput = document.getElementById('input-search-history');
    if (searchInput) searchInput.value = '';
    loadHistoryList();
  }
}

function hideHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.style.display = 'none';
}

let isDeletingAll = false;

function openDeleteConfirmModal(sessionId, title) {
  isDeletingAll = false;
  sessionToDeleteId = sessionId;
  sessionToDeleteTitle = title;
  const titleEl = document.querySelector('.delete-confirm-title');
  if (titleEl) titleEl.textContent = "Hapus Riwayat Chat?";
  const nameEl = document.getElementById('delete-session-name');
  if (nameEl) {
    nameEl.textContent = title || "New Chat";
    if (nameEl.parentElement) nameEl.parentElement.style.display = 'flex';
  }
  const desc = document.getElementById('delete-confirm-desc');
  if (desc) {
    desc.textContent = 'Percakapan ini akan dihapus secara permanen dari database SQLite lokal dan tidak dapat dipulihkan.';
  }
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.style.display = 'flex';
}

function openClearAllConfirmModal() {
  isDeletingAll = true;
  sessionToDeleteId = null;
  sessionToDeleteTitle = "";
  const titleEl = document.querySelector('.delete-confirm-title');
  if (titleEl) titleEl.textContent = "Hapus Semua Riwayat Chat?";
  const nameEl = document.getElementById('delete-session-name');
  if (nameEl && nameEl.parentElement) {
    nameEl.parentElement.style.display = 'none';
  }
  const desc = document.getElementById('delete-confirm-desc');
  if (desc) {
    desc.textContent = 'Seluruh riwayat percakapan akan dihapus bersih secara permanen dari database SQLite lokal dan cache memori.';
  }
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.style.display = 'flex';
}

function hideDeleteConfirmModal() {
  sessionToDeleteId = null;
  sessionToDeleteTitle = "";
  isDeletingAll = false;
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.style.display = 'none';
}

async function confirmDeleteSession() {
  if (isDeletingAll) {
    // 1. Clear all in SQLite
    if (nativePort) {
      try {
        await sendNativeRpc("db_clear_all", {});
      } catch (e) {
        console.warn("SQLite clear all error:", e);
      }
    }
    // 2. Clear cache
    await chrome.storage.local.set({ chat_sessions_cache: {} });

    // 3. Reset current session to clean state
    currentSessionId = null;
    currentSessionTitle = "New Chat";
    currentSessionCreatedAt = null;
    conversationHistory = [];
    chatMessages.innerHTML = '';
    if (welcomeCard) {
      chatMessages.appendChild(welcomeCard);
      welcomeCard.style.display = 'block';
    }
    document.body.classList.remove('has-messages');

    hideDeleteConfirmModal();
    const searchInput = document.getElementById('input-search-history');
    if (searchInput) searchInput.value = '';
    await loadHistoryList("");
    updateFooterStatus("Semua Riwayat Dihapus");
    setTimeout(() => updateFooterStatus("Agent Ready"), 1500);
    return;
  }

  if (!sessionToDeleteId) return;
  const sid = sessionToDeleteId;

  // 1. Delete from SQLite
  if (nativePort) {
    try {
      await sendNativeRpc("db_delete_session", { session_id: sid });
    } catch (e) {
      console.warn("SQLite delete error:", e);
    }
  }

  // 2. Delete from cache
  const res = await chrome.storage.local.get(['chat_sessions_cache']);
  let cache = res.chat_sessions_cache || {};
  delete cache[sid];
  await chrome.storage.local.set({ chat_sessions_cache: cache });

  // If deleted current session, reset to fresh chat
  if (sid === currentSessionId) {
    currentSessionId = null;
    currentSessionTitle = "New Chat";
    currentSessionCreatedAt = null;
    conversationHistory = [];
    chatMessages.innerHTML = '';
    if (welcomeCard) {
      chatMessages.appendChild(welcomeCard);
      welcomeCard.style.display = 'block';
    }
  }

  hideDeleteConfirmModal();
  const searchInput = document.getElementById('input-search-history');
  await loadHistoryList(searchInput ? searchInput.value : "");
}

// History & Delete Event Listeners
document.getElementById('btn-open-history')?.addEventListener('click', openHistoryModal);
document.getElementById('btn-close-history')?.addEventListener('click', hideHistoryModal);
document.getElementById('btn-history-new-chat')?.addEventListener('click', startNewChat);
document.getElementById('btn-header-new-chat')?.addEventListener('click', startNewChat);
document.getElementById('btn-clear-all-history')?.addEventListener('click', openClearAllConfirmModal);

document.getElementById('btn-cancel-delete')?.addEventListener('click', hideDeleteConfirmModal);
document.getElementById('btn-confirm-delete')?.addEventListener('click', confirmDeleteSession);

// History Search
const inputSearchHistory = document.getElementById('input-search-history');
const btnClearHistorySearch = document.getElementById('btn-clear-history-search');

inputSearchHistory?.addEventListener('input', () => {
  const val = inputSearchHistory.value;
  if (btnClearHistorySearch) {
    btnClearHistorySearch.style.display = val ? 'inline-block' : 'none';
  }
  loadHistoryList(val);
});

btnClearHistorySearch?.addEventListener('click', () => {
  if (inputSearchHistory) {
    inputSearchHistory.value = '';
    btnClearHistorySearch.style.display = 'none';
    loadHistoryList();
  }
});

// Suggestion Prompt Templates (populate into chat input without auto-sending)
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.getAttribute('data-prompt');
    if (prompt && chatInput) {
      chatInput.value = prompt;
      adjustChatInputHeight();
      chatInput.focus();
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
    }
  });
});

// =========================================================================
// Multimodal File & Image Attachment Handling (Paste, Drag & Drop, File Picker)
// =========================================================================
const attachmentsPreviewBar = document.getElementById('attachments-preview-bar');
const btnAttachFile = document.getElementById('btn-attach-file');
const inputFileHidden = document.getElementById('input-file-hidden');
const dragDropOverlay = document.getElementById('drag-drop-overlay');

function renderAttachmentsPreview() {
  if (!attachmentsPreviewBar) return;
  if (pendingAttachments.length === 0) {
    attachmentsPreviewBar.innerHTML = '';
    attachmentsPreviewBar.style.display = 'none';
    adjustChatInputHeight();
    return;
  }

  attachmentsPreviewBar.style.display = 'flex';
  attachmentsPreviewBar.innerHTML = '';

  pendingAttachments.forEach(att => {
    const card = document.createElement('div');
    card.className = `attachment-preview-card ${att.isImage ? 'is-image' : (att.isVideo ? 'is-video' : 'is-file')}`;

    if (att.isImage) {
      card.innerHTML = `
        <img src="${att.dataUrl}" alt="${escapeHtml(att.name || 'Image')}">
        <button type="button" class="attachment-remove-btn" title="Hapus gambar">×</button>
      `;
    } else if (att.isVideo) {
      card.innerHTML = `
        ${att.thumbnailUrl ? `<img src="${att.thumbnailUrl}" alt="${escapeHtml(att.name || 'Video')}">` : `
          <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0F172A;color:#CEF128;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
        `}
        <div class="attachment-video-badge-overlay">
          <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>${att.duration ? `${Math.round(att.duration)}s` : 'Video'}</span>
        </div>
        <button type="button" class="attachment-remove-btn" title="Hapus video">×</button>
      `;
    } else {
      card.innerHTML = `
        <svg class="attachment-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span class="attachment-file-name" title="${escapeHtml(att.name)}">${escapeHtml(att.name)}</span>
        <button type="button" class="attachment-remove-btn" title="Hapus file">×</button>
      `;
    }

    card.querySelector('.attachment-remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeAttachment(att.id);
    });

    attachmentsPreviewBar.appendChild(card);
  });

  adjustChatInputHeight();
}

function removeAttachment(id) {
  pendingAttachments = pendingAttachments.filter(a => a.id !== id);
  renderAttachmentsPreview();
}

function clearAttachments() {
  pendingAttachments = [];
  renderAttachmentsPreview();
}

async function extractVideoMetadataAndFrames(file, dataUrl) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = dataUrl;
      video.muted = true;
      video.playsInline = true;

      const onReady = async () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('loadedmetadata', onReady);

        const duration = video.duration || 0;
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 360;
        const keyframes = [];

        try {
          const samplePoints = duration > 4 
            ? [0.1, 0.3, 0.5, 0.7, 0.9].map(p => Math.min(duration - 0.1, Math.max(0.1, p * duration)))
            : [0.2 * duration, 0.8 * duration].filter(t => t >= 0 && t <= duration);

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxDim = 640;
          const scale = Math.min(1, maxDim / Math.max(vW, vH));
          canvas.width = Math.round(vW * scale);
          canvas.height = Math.round(vH * scale);

          for (const time of samplePoints) {
            await new Promise((resSeek) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                try {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  keyframes.push({
                    timestamp: Math.round(time * 10) / 10,
                    dataUrl: canvas.toDataURL('image/jpeg', 0.82)
                  });
                } catch (e) {}
                resSeek();
              };
              video.addEventListener('seeked', onSeeked);
              video.currentTime = time;
              setTimeout(resSeek, 500);
            });
          }
        } catch (err) {
          console.warn("Video keyframe extraction notice:", err);
        }

        resolve({
          duration,
          width: vW,
          height: vH,
          keyframes,
          thumbnailUrl: keyframes[0]?.dataUrl || ''
        });
      };

      video.addEventListener('loadeddata', onReady);
      video.addEventListener('loadedmetadata', onReady);

      video.onerror = () => {
        resolve({ duration: 0, width: 0, height: 0, keyframes: [], thumbnailUrl: '' });
      };

      setTimeout(() => {
        resolve({ duration: 0, width: 0, height: 0, keyframes: [], thumbnailUrl: '' });
      }, 3500);
    } catch (e) {
      resolve({ duration: 0, width: 0, height: 0, keyframes: [], thumbnailUrl: '' });
    }
  });
}

async function handleFileSelection(files) {
  if (!files || files.length === 0) return;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.name);

    if (isImg) {
      const dataUrl = await readFileAsDataURL(file);
      pendingAttachments.push({
        id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: file.name || 'image.png',
        type: file.type || 'image/png',
        size: file.size,
        isImage: true,
        isVideo: false,
        dataUrl
      });
    } else if (isVid) {
      const dataUrl = await readFileAsDataURL(file);
      const meta = await extractVideoMetadataAndFrames(file, dataUrl);
      const attId = 'att_vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      
      // Persist full video dataUrl into IndexedDB asynchronously
      saveVideoToIndexedDB(attId, dataUrl, file.name || 'video.mp4', meta.duration || 0);

      pendingAttachments.push({
        id: attId,
        name: file.name || 'video.mp4',
        type: file.type || 'video/mp4',
        size: file.size,
        isImage: false,
        isVideo: true,
        dataUrl,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        keyframes: meta.keyframes,
        thumbnailUrl: meta.thumbnailUrl
      });
    } else {
      // Treat text/code/document files
      let textContent = "";
      try {
        textContent = await readFileAsText(file);
      } catch (e) {
        console.warn("Could not read as text:", e);
      }
      pendingAttachments.push({
        id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: file.name || 'file',
        type: file.type || 'text/plain',
        size: file.size,
        isImage: false,
        isVideo: false,
        textContent
      });
    }
  }

  renderAttachmentsPreview();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Attach Button Trigger
btnAttachFile?.addEventListener('click', () => {
  inputFileHidden?.click();
});

inputFileHidden?.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFileSelection(e.target.files);
    e.target.value = '';
  }
});

// Clipboard Paste Listener (Images & Text files)
window.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  const imageFiles = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        imageFiles.push(blob);
      }
    }
  }

  if (imageFiles.length > 0) {
    e.preventDefault();
    await handleFileSelection(imageFiles);
  }
});

// Drag & Drop Handling
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (dragDropOverlay) dragDropOverlay.style.display = 'flex';
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0 && dragDropOverlay) {
    dragDropOverlay.style.display = 'none';
    dragCounter = 0;
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  if (dragDropOverlay) dragDropOverlay.style.display = 'none';
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileSelection(e.dataTransfer.files);
  }
});

// Send message (Prompt + Attachments)
function handleSendMessage() {
  if (isExecuting) {
    cancelExecution();
    return;
  }

  const text = chatInput.value.trim();
  if (!text && pendingAttachments.length === 0 && selectedMentionAgents.length === 0) return;

  // Auto-dismiss and clear docked clarification card upon giving guidance / submitting prompt
  hideClarificationDock();

  const currentAttachments = [...pendingAttachments];
  const currentMentions = [...selectedMentionAgents];

  // Prepend mention badges prefix to user message display if mention chips exist
  let displayMessage = text;
  if (currentMentions.length > 0) {
    const mentionPrefix = currentMentions.map(m => `@${getAgentShortName(m)}`).join(' ') + ' ';
    if (!displayMessage.startsWith('@')) {
      displayMessage = (mentionPrefix + displayMessage).trim();
    }
  }

  chatInput.value = '';
  clearAttachments();
  clearMentionAgents();
  adjustChatInputHeight();

  if (currentChatMode === 'chat') {
    runChatModeLoop(displayMessage, currentAttachments, currentMentions);
  } else {
    runAgentLoop(displayMessage, currentAttachments, currentMentions);
  }
}

// Global & local alias for backward-compatibility
const handleSend = handleSendMessage;
window.handleSend = handleSendMessage;

btnSend.addEventListener('click', handleSendMessage);

// =========================================================================
// Agent Mention Dropup Autocomplete (@mention) & Active Chips Engine
// =========================================================================
const mentionDropup = document.getElementById('agent-mention-dropup');
const activeMentionsBar = document.getElementById('active-mentions-bar');
let activeMentionIndex = 0;
let currentMentionMatches = [];
let currentMentionQuery = "";
let selectedMentionAgents = [];

function renderActiveMentionChips() {
  if (!activeMentionsBar) return;

  if (selectedMentionAgents.length === 0) {
    activeMentionsBar.style.display = 'none';
    activeMentionsBar.innerHTML = '';
    return;
  }

  let html = '';
  selectedMentionAgents.forEach(ag => {
    const shortName = getAgentShortName(ag);
    html += `
      <div class="mention-chip" data-agent-id="${escapeHtml(ag.id || '')}">
        <span class="mention-chip-at">@</span>
        <span class="mention-chip-name">${escapeHtml(shortName)}</span>
        <button type="button" class="mention-chip-remove" data-remove-id="${escapeHtml(ag.id || '')}" title="Hapus mention">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  });

  activeMentionsBar.innerHTML = html;
  activeMentionsBar.style.display = 'flex';

  // Bind remove handlers
  activeMentionsBar.querySelectorAll('.mention-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const removeId = btn.dataset.removeId;
      removeMentionAgent(removeId);
    });
  });
}

function addMentionAgent(ag) {
  if (!ag) return;
  if (!selectedMentionAgents.some(m => m.id === ag.id)) {
    selectedMentionAgents.push(ag);
    renderActiveMentionChips();
  }
}

function removeMentionAgent(agId) {
  selectedMentionAgents = selectedMentionAgents.filter(m => m.id !== agId);
  renderActiveMentionChips();
}

function clearMentionAgents() {
  selectedMentionAgents = [];
  renderActiveMentionChips();
}

function getMentionableAgents(query = "") {
  const q = (query || "").toLowerCase().trim();
  // Filter out boss agents and untitled/empty agents
  const list = customAgents.filter(ag => 
    ag && 
    ag.id !== "master_agent" && 
    ag.id !== "boss_agent" && 
    !ag.is_boss && 
    ag.name && 
    ag.name !== "Untitled" && 
    ag.name !== "Untitled Agent" &&
    ag.name !== "Untitled Sub-Agent"
  );

  if (!q) return list;

  return list.filter(ag => {
    const nameMatch = (ag.name || "").toLowerCase().includes(q);
    const idMatch = (ag.id || "").toLowerCase().includes(q);
    const descMatch = (ag.description || "").toLowerCase().includes(q);
    return nameMatch || idMatch || descMatch;
  });
}

function renderMentionDropup(matches, activeIdx = 0) {
  if (!mentionDropup) return;
  if (!matches || matches.length === 0) {
    hideMentionDropup();
    return;
  }

  currentMentionMatches = matches;
  activeMentionIndex = Math.max(0, Math.min(activeIdx, matches.length - 1));

  let itemsHtml = '';
  matches.forEach((ag, idx) => {
    const isActive = (idx === activeMentionIndex);
    const shortName = getAgentShortName(ag);
    itemsHtml += `
      <div class="mention-dropup-item ${isActive ? 'active' : ''}" data-idx="${idx}">
        <div class="mention-item-icon">${getAgentIconSvg(ag)}</div>
        <div class="mention-item-details">
          <span class="mention-item-name">@${escapeHtml(shortName)} <small style="font-weight:normal;opacity:0.75;font-size:10px;">${escapeHtml(ag.name !== shortName ? `(${ag.name})` : '')}</small></span>
          <span class="mention-item-desc">${escapeHtml(ag.description || 'Sub-agent eksekutor')}</span>
        </div>
        <span class="mention-item-tag">Sub-Agent</span>
      </div>
    `;
  });

  mentionDropup.innerHTML = `
    <div class="mention-dropup-header">
      <div class="mention-dropup-header-left">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Pilih Agen Spesialis yang Ditugaskan (@mention)</span>
      </div>
      <span class="mention-dropup-hint">↑↓ Pilih • ↵ Terapkan</span>
    </div>
    <div class="mention-dropup-list">
      ${itemsHtml}
    </div>
  `;

  // Bind click handlers to items
  mentionDropup.querySelectorAll('.mention-dropup-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(item.dataset.idx);
      if (currentMentionMatches[idx]) {
        selectMentionAgent(currentMentionMatches[idx]);
      }
    });
  });

  mentionDropup.style.display = 'block';
}

function updateActiveMentionItem() {
  if (!mentionDropup) return;
  const items = mentionDropup.querySelectorAll('.mention-dropup-item');
  items.forEach((item, idx) => {
    if (idx === activeMentionIndex) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

function hideMentionDropup() {
  if (mentionDropup) {
    mentionDropup.style.display = 'none';
    mentionDropup.innerHTML = '';
  }
  currentMentionMatches = [];
  currentMentionQuery = "";
  activeMentionIndex = 0;
}

function selectMentionAgent(agent) {
  if (!agent || !chatInput) return;

  const text = chatInput.value;
  const cursorPos = chatInput.selectionStart || text.length;

  // Find the @ position before cursor
  const lastAt = text.lastIndexOf('@', cursorPos - 1);
  if (lastAt !== -1) {
    const beforeAt = text.slice(0, lastAt);
    const afterCursor = text.slice(cursorPos);
    // Remove the typed @query from textarea so the input text is clean!
    chatInput.value = (beforeAt.trimEnd() + ' ' + afterCursor.trimStart()).trim();
    chatInput.setSelectionRange(beforeAt.length, beforeAt.length);
  }

  addMentionAgent(agent);
  hideMentionDropup();
  adjustChatInputHeight();
  chatInput.focus();
}

function handleChatInputMentionCheck() {
  if (!chatInput) return;
  const text = chatInput.value;
  const cursorPos = chatInput.selectionStart;

  // Check if cursor is right after an @ or @query (at start of line or after whitespace)
  const textBefore = text.slice(0, cursorPos);
  const match = /(?:^|\s)@([a-zA-Z0-9_\-\s]*)$/.exec(textBefore);

  if (match) {
    const query = match[1];
    currentMentionQuery = query;

    const matches = getMentionableAgents(query);
    if (matches.length > 0) {
      renderMentionDropup(matches, 0);
      return;
    }
  }

  hideMentionDropup();
}

chatInput.addEventListener('keydown', (e) => {
  // If mention dropup is open, intercept ArrowUp, ArrowDown, Enter, Tab, Escape
  if (mentionDropup && mentionDropup.style.display !== 'none' && currentMentionMatches.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeMentionIndex = (activeMentionIndex + 1) % currentMentionMatches.length;
      updateActiveMentionItem();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeMentionIndex = (activeMentionIndex - 1 + currentMentionMatches.length) % currentMentionMatches.length;
      updateActiveMentionItem();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectMentionAgent(currentMentionMatches[activeMentionIndex]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideMentionDropup();
      return;
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    hideMentionDropup();
    handleSendMessage();
  }
});

// Close mention dropup when clicking outside
document.addEventListener('click', (e) => {
  if (mentionDropup && !mentionDropup.contains(e.target) && e.target !== chatInput) {
    hideMentionDropup();
  }
});

// Mode Switcher Listeners & Persistence (Default: Agent Mode)
document.getElementById('btn-mode-chat')?.addEventListener('click', () => setChatMode('chat'));
document.getElementById('btn-mode-agent')?.addEventListener('click', () => setChatMode('agent'));

try {
  chrome.storage.local.get(['browser_agent_mode'], (res) => {
    if (res && res.browser_agent_mode) {
      setChatMode(res.browser_agent_mode);
    } else {
      setChatMode('agent');
    }
  });
} catch (e) {
  setChatMode('agent');
}

try {
  initExecutionModeDropdown();
} catch (e) {}

// Robust auto-expand and auto-shrink textarea
function adjustChatInputHeight() {
  if (!chatInput) return;
  if (!chatInput.value || chatInput.value.trim() === '') {
    chatInput.style.height = '32px';
  } else {
    chatInput.style.height = '32px';
    const newHeight = Math.min(Math.max(chatInput.scrollHeight, 32), 120);
    chatInput.style.height = newHeight + 'px';
  }

  syncHeroPlaceholderHeight();
}

function syncHeroPlaceholderHeight() {
  const placeholder = document.getElementById('hero-input-placeholder');
  const inputContainer = document.getElementById('chat-input-container');
  if (placeholder && inputContainer && !document.body.classList.contains('has-messages')) {
    const containerHeight = inputContainer.offsetHeight;
    if (containerHeight > 0) {
      placeholder.style.height = `${containerHeight}px`;
    }
  }
}

// Observe input container size dynamically for images, mentions, and multiline text
try {
  const inputContainerEl = document.getElementById('chat-input-container');
  if (inputContainerEl && window.ResizeObserver) {
    const inputResizeObserver = new ResizeObserver(() => {
      syncHeroPlaceholderHeight();
    });
    inputResizeObserver.observe(inputContainerEl);
  }
} catch (e) {}

chatInput.addEventListener('input', () => {
  adjustChatInputHeight();
  handleChatInputMentionCheck();
});
chatInput.addEventListener('keyup', (e) => {
  adjustChatInputHeight();
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter' && e.key !== 'Tab') {
    handleChatInputMentionCheck();
  }
});
chatInput.addEventListener('change', adjustChatInputHeight);

// Toggle View Mode (Chat vs Terminal)
const btnToggleView = document.getElementById('btn-toggle-view');
const agentWorkspace = document.getElementById('agent-workspace');
const terminalWorkspace = document.getElementById('terminal-workspace');
const iconTerminal = document.getElementById('icon-terminal');
const iconChat = document.getElementById('icon-chat');

btnToggleView?.addEventListener('click', () => {
  if (viewMode === 'chat') {
    viewMode = 'terminal';
    agentWorkspace.style.display = 'none';
    terminalWorkspace.style.display = 'flex';
    iconTerminal.style.display = 'none';
    iconChat.style.display = 'block';
    setTimeout(() => {
      try {
        fitAddon.fit();
        term.focus();
      } catch (e) {}
    }, 50);
  } else {
    viewMode = 'chat';
    terminalWorkspace.style.display = 'none';
    agentWorkspace.style.display = 'flex';
    iconTerminal.style.display = 'block';
    iconChat.style.display = 'none';
  }
});

// Delegate click for collapsible thinking blocks & File Actions
chatMessages.addEventListener('click', (e) => {
  // 1. Thinking block collapse/expand
  const header = e.target.closest('.thinking-header');
  if (header) {
    const block = header.closest('.thinking-block');
    if (block) block.classList.toggle('open');
    return;
  }

  // 2. Open File with Default System App
  const openFileBtn = e.target.closest('.btn-open-file, .msg-open-file-btn');
  if (openFileBtn) {
    e.preventDefault();
    e.stopPropagation();
    const filePath = openFileBtn.getAttribute('data-path');
    if (filePath) {
      handleOpenFile(filePath, openFileBtn);
      return;
    }
  }

  // 3. Reveal / Open Folder in File Manager
  const revealFolderBtn = e.target.closest('.btn-reveal-file, .btn-reveal-folder, .msg-reveal-folder-btn');
  if (revealFolderBtn) {
    e.preventDefault();
    e.stopPropagation();
    const filePath = revealFolderBtn.getAttribute('data-path');
    if (filePath) {
      handleRevealFile(filePath, revealFolderBtn);
      return;
    }
  }
});

// Window resize
window.addEventListener('resize', () => {
  if (viewMode === 'terminal') {
    try {
      fitAddon.fit();
    } catch (e) {}
  }
});

// =========================================================================
// Fullscreen Media Lightbox Modal Logic (Image & Video)
// =========================================================================
const lightboxModal = document.getElementById('image-lightbox-modal');
const lightboxImg = document.getElementById('lightbox-full-img');
const lightboxVideo = document.getElementById('lightbox-full-video');
const lightboxDownload = document.getElementById('lightbox-download-link');
const lightboxDownloadText = document.getElementById('lightbox-download-text');
const btnCloseLightbox = document.getElementById('btn-close-lightbox');
const lightboxBackdrop = document.getElementById('lightbox-backdrop');

async function openMediaLightbox(src, isVideo = false, filename = '') {
  if (!lightboxModal || !src) return;

  let resolvedSrc = src;
  if (src.startsWith('local-img://')) {
    const imgId = src.replace('local-img://', '');
    const cached = await getImageFromIndexedDB(imgId);
    if (cached?.dataUrl) {
      resolvedSrc = cached.dataUrl;
    } else if (nativePort) {
      try {
        const res = await sendNativeRpc("get_generated_image", { image_id: imgId });
        if (res && res.status === "ok" && res.data_url) {
          resolvedSrc = res.data_url;
        }
      } catch (e) {}
    }
  }

  if (isVideo) {
    if (lightboxImg) lightboxImg.style.display = 'none';
    if (lightboxVideo) {
      lightboxVideo.src = resolvedSrc;
      lightboxVideo.style.display = 'block';
      try { lightboxVideo.play(); } catch (e) {}
    }
    if (lightboxDownloadText) lightboxDownloadText.textContent = 'Unduh Video';
    if (lightboxDownload) {
      lightboxDownload.href = resolvedSrc;
      lightboxDownload.download = filename || 'video.mp4';
    }
  } else {
    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.style.display = 'none';
      lightboxVideo.src = '';
    }
    if (lightboxImg) {
      lightboxImg.src = resolvedSrc;
      lightboxImg.style.display = 'block';
    }
    if (lightboxDownloadText) lightboxDownloadText.textContent = 'Unduh Gambar';
    if (lightboxDownload) {
      lightboxDownload.href = resolvedSrc;
      lightboxDownload.download = filename || 'ai-generated-image.png';
    }
  }

  lightboxModal.style.display = 'flex';
}

function closeMediaLightbox() {
  if (!lightboxModal) return;
  lightboxModal.style.display = 'none';
  if (lightboxImg) {
    lightboxImg.src = '';
    lightboxImg.style.display = 'none';
  }
  if (lightboxVideo) {
    try { lightboxVideo.pause(); } catch (e) {}
    lightboxVideo.src = '';
    lightboxVideo.style.display = 'none';
  }
}

btnCloseLightbox?.addEventListener('click', closeMediaLightbox);
lightboxBackdrop?.addEventListener('click', closeMediaLightbox);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightboxModal && lightboxModal.style.display === 'flex') {
    closeMediaLightbox();
  }
});

// Delegate click on generated image cards, thumbnails, and user attached videos to open fullscreen preview
document.addEventListener('click', (e) => {
  const imgWrapper = e.target.closest('.gen-img-wrapper');
  if (imgWrapper && !e.target.closest('.btn-gen-img-download')) {
    const src = imgWrapper.getAttribute('data-src') || (imgWrapper.getAttribute('data-local-id') ? `local-img://${imgWrapper.getAttribute('data-local-id')}` : imgWrapper.querySelector('img')?.src);
    if (src) {
      openMediaLightbox(src, false);
    }
    return;
  }

  const userThumb = e.target.closest('.user-attached-thumb');
  if (userThumb) {
    const src = userThumb.querySelector('img')?.src;
    if (src) openMediaLightbox(src, false, userThumb.getAttribute('title') || 'image.png');
    return;
  }

  const fullscreenBtn = e.target.closest('.btn-video-fullscreen-overlay');
  if (fullscreenBtn) {
    e.stopPropagation();
    const card = fullscreenBtn.closest('.user-attached-video-card');
    if (card) {
      const vidId = card.getAttribute('data-video-id');
      const vid = card.querySelector('video');
      const img = card.querySelector('img');
      (async () => {
        let src = vid?.src;
        let isRealVideo = !!src;
        if (!src && vidId) {
          const cached = await getVideoFromIndexedDB(vidId);
          if (cached?.dataUrl) {
            src = cached.dataUrl;
            isRealVideo = true;
          }
        }
        if (!src) {
          src = img?.src;
          isRealVideo = false;
        }
        if (src) {
          openMediaLightbox(src, isRealVideo, card.getAttribute('title') || 'video.mp4');
        }
      })();
    }
    return;
  }

  const userVideoCard = e.target.closest('.user-attached-video-card');
  if (userVideoCard) {
    const vidId = userVideoCard.getAttribute('data-video-id');
    const vidElem = userVideoCard.querySelector('video');
    const imgPoster = userVideoCard.querySelector('img');
    const isClickingControls = e.target.tagName === 'VIDEO' && e.offsetY > (e.target.clientHeight - 40);
    if (!isClickingControls) {
      (async () => {
        let src = vidElem?.src;
        let isRealVideo = !!src;
        if (!src && vidId) {
          const cached = await getVideoFromIndexedDB(vidId);
          if (cached?.dataUrl) {
            src = cached.dataUrl;
            isRealVideo = true;
          }
        }
        if (!src) {
          src = imgPoster?.src;
          isRealVideo = false;
        }
        if (src) {
          openMediaLightbox(src, isRealVideo, userVideoCard.getAttribute('title') || 'video.mp4');
        }
      })();
    }
    return;
  }
});

// =========================================================================
// App Bootstrap
// =========================================================================
async function bootstrap() {
  initImageDB();
  loadSettings();
  initTerminal();
  connectNativeHost();

  // Initial Target Tab Binding
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      await selectTab(tabs[0].id);
    }
  } catch (e) {
    console.warn("Bootstrap active tab query warning:", e);
  }
  updateMcpStatus();

  // If no API key configured on initial launch, prompt settings
  chrome.storage.local.get(['browser_agent_config'], (res) => {
    if (!res.browser_agent_config || (!res.browser_agent_config.apiKey && res.browser_agent_config.preset !== 'ollama' && res.browser_agent_config.preset !== '9router')) {
      showSettingsModal();
    }
  });
}

bootstrap();
