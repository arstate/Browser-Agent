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
let currentSessionIsPinned = false;
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

// Persistent Memory & Autonomous Brain State (Hermes-Surpassing)
let cachedPersistentMemory = {
  user_memories: [],
  experience_ledger: [],
  anti_patterns: [],
  autonomous_skills: [],
  autonomous_agents: [],
  counts: { user_memories: 0, experience_ledger: 0, anti_patterns: 0, autonomous_skills: 0, autonomous_agents: 0 }
};

async function loadPersistentMemoryFromHost() {
  try {
    const res = await sendNativeRpc("db_get_persistent_memory", { search: "" });
    if (res && res.status === "ok") {
      cachedPersistentMemory = {
        user_memories: res.user_memories || [],
        experience_ledger: res.experience_ledger || [],
        anti_patterns: res.anti_patterns || [],
        autonomous_skills: res.autonomous_skills || [],
        autonomous_agents: res.autonomous_agents || [],
        counts: res.counts || {}
      };
      console.log("[Brain] Persistent Memory Loaded:", cachedPersistentMemory.counts);
      if (typeof updateBrainDrawerBadge === "function") {
        updateBrainDrawerBadge();
      }
    }
  } catch (err) {
    console.warn("[Brain] Could not load persistent memory from host:", err);
  }
}

function notifyPersistentBrainUpdated() {
  try {
    chrome.storage.local.set({ persistent_brain_last_updated: Date.now() }).catch(() => {});
    chrome.runtime.sendMessage({ type: "PERSISTENT_BRAIN_UPDATED", timestamp: Date.now() }).catch(() => {});
  } catch (e) {}
}

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

FITUR BAWAAN RESMI (CONNECTED APPS & TELEGRAM BOT REMOTE):
- Browser Agent SUDAH MEMILIKI fitur bawaan (Built-in Native) bernama "Connected Apps" di menu Pengaturan (Options -> Connected Apps -> Telegram Bot).
- Pengguna TIDAK PERLU membuat script Python/Node.js manual! Pengguna bisa langsung mengontrol AI dan Browser dari smartphone via bot Telegram.
- Jika pengguna bertanya tentang koneksi Telegram Bot ("bisa konek ke bot tele ga", "gimana cara remote dari telegram", dll), jelaskan dengan ramah bahwa fitur tersebut SUDAH TERSEDIA SECARA NATIVE di tab Connected Apps pada menu Pengaturan, dan pandu cara setup 3 langkah mudahnya:
  1. Dapatkan Bot Token dari @BotFather di Telegram.
  2. Buka Pengaturan Browser Agent -> Connected Apps -> Telegram Bot, lalu paste token dan aktifkan switch listener.
  3. Kirim pesan apa saja ke bot Anda di Telegram lalu klik "Deteksi ID Otomatis" untuk mengunci Whitelist ID Anda demi keamanan privat.

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

FITUR BAWAAN: CONNECTED APPS & TELEGRAM BOT REMOTE CONTROL ECOSYSTEM
Browser Agent SUDAH MEMILIKI fitur bawaan terintegrasi (Built-in Native) bernama "Connected Apps" di menu Pengaturan (Options Page -> tab Connected Apps).
1. 📱 Telegram Bot Remote Control:
   - Pengguna DAPAT mengontrol Browser Agent secara langsung dari smartphone/aplikasi Telegram tanpa perlu menjalankan script Python/Node.js manual!
   - Pengaturan: Cukup buka Pengaturan Ekstensi -> tab Connected Apps -> Telegram Bot, masukkan Bot Token dari @BotFather, aktifkan listener switch, dan klik "Deteksi ID Otomatis" untuk mengunci Whitelist Authorized User ID (keamanan privat).
   - Fitur & Command yang Didukung Bot Telegram:
     * Menjalankan instruksi prompt AI dan kontrol browser jarak jauh.
     * /model [nama/auto] : Mengganti atau mengecek model LLM yang aktif.
     * /agent [nama/auto] : Mengganti spesialis agen atau otomatisasi routing.
     * /mode [chat/agent] : Beralih antara Mode Chat dan Mode Agent.
     * /screenshot : Mengambil tangkapan layar tab aktif Chrome secara instan dan mengirimkannya langsung ke chat Telegram!
     * /status : Mengecek status polling bot, model aktif, dan memori persistent.
     * /new : Mereset percakapan baru.
   - Dedicated Chat Logs: Semua pesan dari bot dicatat terpisah di panel "Riwayat & Log Chat Telegram" di tab Connected Apps.
2. Panduan Eksekusi & Konfigurasi Otomatis Telegram Bot:
   - ATURAN OTOMASI MUTLAK (AUTO-CONFIGURE DIRECTLY):
     * Ketika Anda membaca Bot Token (misal dari chat @BotFather di tab Telegram Web) atau ketika pengguna memberikan Bot Token / ID Telegram:
     * DILARANG KERAS hanya menyuruh pengguna menyalin dan menyetelnya secara manual di menu Pengaturan!
     * Master Agent WAJIB LANGSUNG MEMANGGIL TOOL configure_telegram_bot({ bot_token: "...", authorized_chat_id: "...", enabled: true }) untuk mengonfigurasi dan mengaktifkan bot secara otomatis!
     * Setelah tool berhasil dijalankan, laporkan kepada pengguna bahwa bot sudah aktif, terverifikasi, dan siap digunakan melalui link t.me/NamaBotAnda dengan perintah /start.
   - Jika pengguna bertanya apakah bisa terkoneksi ke bot Telegram (misal: "bisa konek ke bot tele ga", "ada bot tele ga", "gimana cara remote dari telegram"):
     * JANGAN PERNAH menyuruh user membuat script Python/Node.js sendiri!
     * Beritahu pengguna bahwa Browser Agent SUDAH MEMILIKI fitur bawaan "Connected Apps" di menu Pengaturan -> Connected Apps -> Telegram Bot. Jika token sudah ada di tab web Telegram, tawarkan atau langsung bantu konfigurasikan secara otomatis via tool configure_telegram_bot!

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
  let name = String(ag.name).trim();
  // Strip trailing metadata in parentheses or brackets e.g. (Module 408 & 254), (Mbak Ningsih), [v1.0]
  name = name.replace(/\s*[\(\[][^()\[\]]*[\)\]]/gi, '').trim();
  return name || String(ag.name);
}

const getAgentShortName = getAgentDisplayName;

function formatUserMentions(text) {
  if (!text) return "";
  let escaped = escapeHtml(String(text));

  // Sort candidate agents by name length descending to avoid partial greedy matches
  const sorted = [...customAgents]
    .filter(a => a && a.id !== "master_agent" && a.id !== "boss_agent" && !a.is_boss)
    .sort((a, b) => (String(b.name || '').length) - (String(a.name || '').length));

  for (const ag of sorted) {
    const dispName = String(getAgentDisplayName(ag) || '');
    const fullName = String(ag.name || '');
    const idStr = String(ag.id || '');
    if (!dispName && !fullName && !idStr) continue;

    const escapedDisp = escapeHtml(dispName);
    const escapedFullName = escapeHtml(fullName);
    const escapedId = escapeHtml(idStr);

    const patterns = [];
    if (escapedFullName) {
      patterns.push(new RegExp(`@${escapedFullName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi'));
    }
    if (escapedDisp && escapedDisp !== escapedFullName) {
      patterns.push(new RegExp(`@${escapedDisp.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi'));
    }
    if (escapedId && escapedId !== escapedFullName && escapedId !== escapedDisp) {
      patterns.push(new RegExp(`@${escapedId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi'));
    }

    for (const pat of patterns) {
      if (pat.test(escaped)) {
        escaped = escaped.replace(pat, `<span class="chat-mention-badge"><span class="mention-at">@</span>${escapedDisp || escapedFullName || escapedId}</span>`);
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
      if (ag && String(ag.id || '') !== "master_agent" && String(ag.id || '') !== "boss_agent" && !matchedWorkers.some(m => String(m.id || '') === String(ag.id || ''))) {
        matchedWorkers.push(ag);
      }
    });
  } else {
    // 0b. If no chips were selected, check if user manually typed an @mention in userMessage (Match exact full name/ID only)
    const candidates = [...customAgents]
      .filter(a => a && String(a.id || '') !== "master_agent" && String(a.id || '') !== "boss_agent" && !a.is_boss)
      .sort((a, b) => (String(b.name || '').length) - (String(a.name || '').length));

    for (const ag of candidates) {
      const agNameLower = String(ag.name || "").toLowerCase();
      const agIdLower = String(ag.id || "").toLowerCase();
      const dispNameLower = String(getAgentDisplayName(ag) || "").toLowerCase();

      if ((agIdLower && text.includes(`@${agIdLower}`)) || (agNameLower && text.includes(`@${agNameLower}`)) || (dispNameLower && text.includes(`@${dispNameLower}`))) {
        if (!matchedWorkers.some(m => String(m.id || '') === String(ag.id || ''))) {
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
    const researchAgent = customAgents.find(a => String(a.id || '') === "web_researcher_agent" || String(a.name || '').toLowerCase().includes("research") || String(a.name || '').toLowerCase().includes("riset"));
    if (researchAgent && !matchedWorkers.some(m => String(m.id || '') === String(researchAgent.id || ''))) {
      matchedWorkers.push(researchAgent);
    }
  }

  // 2. Check for browser navigation / interaction / media (Pipeline Phase 2)
  const generalKeywords = [
    "buka", "play", "putar", "youtube", "video", "musik", "lagu", "klik", "scroll", "tonton", "isi formulir", "login", "website", "tab", "link", "url"
  ];
  const isGeneral = generalKeywords.some(kw => text.includes(kw));
  if (isGeneral && !isResearch) {
    const defaultAgent = customAgents.find(a => String(a.id || '') === "default_agent") || customAgents.find(a => String(a.id || '') !== "master_agent" && String(a.id || '') !== "boss_agent");
    if (defaultAgent && !matchedWorkers.some(m => String(m.id || '') === String(defaultAgent.id || ''))) {
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
    const codingAgent = customAgents.find(a => String(a.id || '') === "coding_engineer_agent" || String(a.name || '').toLowerCase().includes("coding") || String(a.name || '').toLowerCase().includes("engineer"));
    if (codingAgent && !matchedWorkers.some(m => String(m.id || '') === String(codingAgent.id || ''))) {
      matchedWorkers.push(codingAgent);
    }
  }

  // 4. Check custom agents by keyword in description or name
  for (const ag of customAgents) {
    const agIdStr = String(ag.id || '');
    if (agIdStr === "master_agent" || agIdStr === "boss_agent" || agIdStr === "default_agent" || agIdStr === "web_researcher_agent" || agIdStr === "coding_engineer_agent") continue;
    const agNameStr = String(ag.name || '');
    const nameMatch = agNameStr && text.includes(agNameStr.toLowerCase());
    const descWords = String(ag.description || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descMatch = descWords.some(w => text.includes(w));
    if (nameMatch || descMatch) {
      if (!matchedWorkers.some(m => String(m.id || '') === String(ag.id || ''))) {
        matchedWorkers.push(ag);
      }
    }
  }

  // Fallback worker if none matched
  if (matchedWorkers.length === 0) {
    const defaultAgent = customAgents.find(a => String(a.id || '') === "default_agent") || customAgents.find(a => String(a.id || '') !== "master_agent" && String(a.id || '') !== "boss_agent") || customAgents[0];
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
1. 🧠 Autonomous Brain & Self-Evolution Tools: manage_personal_memory, create_autonomous_skill, update_autonomous_skill, create_autonomous_agent, edit_manual_skill, edit_manual_agent, rollback_brain_item, record_anti_pattern, save_epistemic_triplet, query_epistemic_graph, execute_jit_microtool.
2. 🌐 Browser Automation Tools: browser_navigate, browser_snapshot, browser_click, browser_type, browser_press_key, browser_hover, browser_scroll, browser_control_media, browser_evaluate_script, browser_screenshot, browser_get_console_logs, browser_extract_table, browser_list_tabs, browser_switch_tab, browser_wait.
3. 💻 Local PC Tools: local_read_file, local_write_file, local_list_dir, local_run_command.
4. 🎨 AI Image Generation: generate_image(prompt, size).
5. 💬 Interactive Clarification & Sub-Agent Analysis: ask_clarification, agent_subtask_analysis.
6. 📱 Built-in Connected Apps & Telegram Bot Remote: configure_telegram_bot, get_telegram_bot_status. Browser Agent memiliki mesin Telegram Bot bawaan. Ketika mendeteksi Bot Token & Chat ID (misal dari chat @BotFather di tab Telegram Web) atau ketika user meminta koneksi Telegram, Master Agent WAJIB LANGSUNG MEMANGGIL configure_telegram_bot({ bot_token, authorized_chat_id, enabled: true }) untuk mengaktifkan bot secara otomatis tanpa menyuruh pengguna setting manual!

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

  // 5. Inject Autonomous Brain & Persistent Memory Directives (Hermes-Surpassing Intelligence)
  prompt += `\n\n=== 🧠 HERMES-SURPASSING PERSISTENT MEMORY & CONTINUOUS BIDIRECTIONAL SELF-EVOLUTION ENGINE ===\n`;
  prompt += `Anda BUKAN chatbot pasif yang hanya membalas teks atau terjebak pada data lama yang kaku. Anda adalah MASTER AGENT OTONOM EKSEKUTIF yang BERTINDAK SEGERA, MEMPELAJARI & MENYEMPURNAKAN DATA LAMA, SERTA MENAMBAH AGENT & SKILL BARU SECARA DINAMIS!\n`;
  prompt += `MANDAT OTONOM PROAKTIF & EVOLUSI DUA ARAH:\n`;
  prompt += `1. 🎭 SPAWN & DAFTARKAN SUB-AGENT BARU KE MULTI-AGENT LIST (\`create_autonomous_agent\`):\n`;
  prompt += `   - Setiap kali Anda mendeteksi peran/tugas/domain kerja baru dari pengguna (contoh: 'saya magang di Diskominfo konten IG', 'saya jualan produk X', 'saya butuh auditor SEO'):\n`;
  prompt += `   - ANDA WAJIB LANGSUNG MEMANGGIL TOOL INI PADA TURN PERTAMA: \`create_autonomous_agent\` dan \`create_autonomous_skill\`.\n`;
  prompt += `   - Agen dan skill baru yang Anda buat akan OTOMATIS muncul di tab Manajemen Multi-Agent Persona dan Katalog Skill dengan label terverifikasi \`[🤖 AI Auto-Evolved]\`.\n`;
  prompt += `2. ⚡ PELAJARI & SEMPURNAKAN SKILL / AGENT KUSTOM USER (\`edit_manual_skill\` & \`edit_manual_agent\`):\n`;
  prompt += `   - Jangan berpatokan pada data lama terus-menerus! Jika Anda melihat SOP/Prompt buatan user masih bisa disempurnakan (misal: menambahkan hook baru, aturan teknis baru, atau memperbaiki celah kesalahan), Anda BERHAK MEMPERBARUI skill tersebut via \`edit_manual_skill\` atau agen tersebut via \`edit_manual_agent\`.\n`;
  prompt += `   - Pembaruan oleh AI otomatis dicatat riwayat rollback-nya (\`.history/\`) dan diberi label \`[⚡ AI Refined]\` sehingga sistem semakin cerdas dari waktu ke waktu.\n`;
  prompt += `3. 🧠 INSTANT AUTO-MEMORY RECORDING (\`manage_personal_memory\`):\n`;
  prompt += `   - Setiap kali ada fakta personal, KPI, kontak, atau preferensi penting, LANGSUNG panggil \`manage_personal_memory(action='save', ...)\` tanpa menunggu disuruh!\n`;
  prompt += `4. 🕸️ RELASI PENGETAHUAN KOGNITIF (\`save_epistemic_triplet\`):\n`;
  prompt += `   - Tautkan relasi entitas baru ke grafis pengetahuan kognitif dengan confidence score yang presisi.\n`;
  prompt += `5. 🛡️ REFLEKS MENCATAT ANTI-PATTERN & DISTILASI KESALAHAN (\`record_anti_pattern\`):\n`;
  prompt += `   - Jika terjadi hambatan atau koreksi, catat penyebab dan solusinya agar AI tidak pernah mengulangi kesalahan yang sama.\n`;

  // Inject User Profile & Rules
  const mems = cachedPersistentMemory.user_memories || [];
  if (mems.length > 0) {
    prompt += `\n📌 FAKTA PERSONAL & ATURAN PENGGUNA TERVERIFIKASI (PERSISTENT FACTS):\n`;
    mems.forEach((m, idx) => {
      const srcBadge = m.source === 'autonomous_ai' ? '[🤖 AI Learned]' : '[👤 User Rule]';
      prompt += `${idx + 1}. ${srcBadge} [${(m.category || 'fact').toUpperCase()}] ${m.content}${m.reason ? ` (Alasan: ${m.reason})` : ''}\n`;
    });
  }

  // Inject Anti-Patterns (Pre-Flight Failure Checklist)
  const aps = cachedPersistentMemory.anti_patterns || [];
  if (aps.length > 0) {
    prompt += `\n🛡️ ANTI-PATTERN VAULT (PELAJARAN DARI KESALAHAN MASA LALU - JANGAN PERNAH DIULANGI):\n`;
    aps.slice(0, 10).forEach((ap, idx) => {
      prompt += `[AP-${String(idx + 1).padStart(3, '0')}] Konteks: ${ap.target_domain} | Gejala: ${ap.mistake_description} | Solusi Permanen: ${ap.winning_fix} | Aturan Pencegahan: ${ap.prevention_rule}\n`;
    });
  }

  // Inject Autonomous Skills
  const autoSkills = cachedPersistentMemory.autonomous_skills || [];
  if (autoSkills.length > 0) {
    prompt += `\n⚡ AUTONOMOUS SKILLS VAULT (SOP & ALUR KERJA OTONOM):\n`;
    autoSkills.forEach(sk => {
      prompt += `\n### [⚡ Skill ${sk.version || 'v1.0.0'}] ${sk.name} (ID: ${sk.id})\n- Trigger: ${sk.description}\n- Prosedur Operasional:\n${sk.workflow_markdown}\n`;
    });
  }

  // Inject Autonomous Specialist Agents with Connected Skills Routing
  const autoAgents = cachedPersistentMemory.autonomous_agents || [];
  if (autoAgents.length > 0) {
    prompt += `\n🎭 SPECIALIST AGENTS & AUTONOMOUS ROUTING VAULT:\n`;
    autoAgents.forEach(ag => {
      const assigned = Array.isArray(ag.assigned_skills) ? ag.assigned_skills : [];
      const skillsStr = assigned.length > 0 ? assigned.join(", ") : "General Skills";
      prompt += `\n### [🤖 Specialist Agent] ${ag.name} (ID: ${ag.id})\n- Persona & Target: ${ag.role_description}\n- Terhubung ke Skill (Connected Skills): [${skillsStr}]\n- Instruksi Operasional:\n${ag.system_prompt}\n`;
    });
  }

  // Inject Top Distilled Training Corpus Points (Few-Shot Point-by-Point Learning)
  const trainingItems = cachedPersistentMemory.training_corpus || [];
  if (trainingItems.length > 0) {
    prompt += `\n🎯 DISTILLED TRAINING CORPUS (INTISARI RIWAYAT PERCAKAPAN & WORKFLOW SUKSES):\n`;
    trainingItems.slice(0, 3).forEach(tr => {
      prompt += `\n#### Sesi Sukses: ${tr.title} (ID: ${tr.session_id})\n${tr.distilled_points_md}\n`;
    });
  }

  // Inject Epistemic Knowledge Graph Triplets (Graph RAG Multi-Hop Relations)
  const triplets = cachedPersistentMemory.epistemic_triplets || [];
  if (triplets.length > 0) {
    prompt += `\n🕸️ DYNAMIC EPISTEMIC KNOWLEDGE GRAPH (RELASI ENTITAS & FAKTA BERBOBOT):\n`;
    triplets.slice(0, 15).forEach(t => {
      const negBadge = t.negative_constraint ? '[🚨 TERLARANG/NEGATIVE]' : '[✅ VALID]';
      const confPct = Math.round((t.decayed_confidence || t.confidence || 1.0) * 100);
      prompt += `- ${negBadge} (${t.subject}) ──[${t.predicate} (Confidence: ${confPct}%)]──► (${t.object})\n`;
    });
  }

  // System 2 Cognitive MCTS & JIT Micro-Tool Directives
  prompt += `\n🧠 COGNITIVE SYSTEM 2 & JUST-IN-TIME (JIT) SELF-CODING DIRECTIVES:\n`;
  prompt += `- Saat menghadapi tugas rumit, jalankan simulasi lookahead dan validasi rencana aksi sebelum mengeksekusi tool.\n`;
  prompt += `- Jika memerlukan kalkulasi khusus atau ekstraksi data kustom yang belum tersedia di tool bawaan, gunakan \`execute_jit_microtool(language='javascript'|'python', code=..., purpose=...)\` untuk mengeksekusi kode secara instan dan deterministik di sandbox.\n`;
  prompt += `- Simpan relasi pengetahuan baru yang penting menggunakan \`save_epistemic_triplet\` agar jaringan grafis pengetahuan Anda semakin luas.\n`;

  // Anti-AI Slop Directive
  prompt += `\n🚫 STANDAR ANTI-AI-SLOP (MAKSIMUM SIGNAL-TO-NOISE RATIO):
- DILARANG memproduksi teks basa-basi klise, pembukaan mengulur waktu ("Tentu saja!", "Sebagai asisten AI...", "Berikut adalah langkah-langkah...").
- Sajikan analisis empiris, berbasis data dan fakta nyata di layar browser atau file sistem.
- Jika terjadi kegagalan atau error pada tools/eksekusi: DILARANG menyembunyikan error atau mengembalikan respons kosong! AI WAJIB segera mendiagnosa root cause, mencari solusi alternatif yang benar, dan mencatatnya ke \`record_anti_pattern\`.\n`;

  // 6. Inject Dynamic AI Cognitive / Thinking Level Directive (Hacked Client-Side without API dependency)
  prompt += getThinkingDirective(currentThinkingLevel);

  return prompt;
}

let currentThinkingLevel = "high";

function getThinkingDirective(level) {
  switch (level) {
    case "low":
      return `\n\n=== [AI THINKING LEVEL: LOW (Instan & Cepat — 0x Koreksi Diri)] ===
- DILARANG membuat rantai penalaran panjang atau draf bertahap.
- Langsung lakukan pattern-matching dan hasilkan jawaban linier tercepat, ringkas, akurat, dan to-the-point tanpa self-correction.`;
    case "medium":
      return `\n\n=== [AI THINKING LEVEL: MEDIUM (Standar — 1x Sanity Check)] ===
- Buat draf penalaran singkat dan lakukan 1 kali verifikasi validitas logika sebelum menyimpulkan jawaban.
- Perbaiki kesalahan logika sederhana jika ditemukan.`;
    case "high":
      return `\n\n=== [AI THINKING LEVEL: HIGH (Mendalam — Multi-Branch Tree-of-Thought)] ===
- Eksplorasi 2-3 jalur penalaran paralel di dalam pikiran Anda.
- Dekomposisi tugas ke langkah-langkah kerja terstruktur (Step 1, Step 2, dst.).
- Uji kasus ekstrem (edge cases) dan verifikasi konvergensi hasil sebelum menyajikan jawaban terbaik.`;
    case "xhigh":
      return `\n\n=== [AI THINKING LEVEL: XHIGH (Kritik Diri Ketat — Adversarial Red-Teaming & Step Planning)] ===
- 🧠 RENCANAKAN RANGKAIAN LANGKAH EKSEKUSI DETAIL: Petakan rencana kerja bertahap dan jalankan secara komprehensif.
- 🛡️ Bertindaklah sebagai pengkritik paling tajam terhadap draf Anda sendiri (Devil's Advocate).
- Cari minimal 3 potensi celah, bug, asumsi keliru, atau kontradiksi logis pada draf Anda, perbaiki seluruh kelemahan tersebut, lalu sajikan solusi yang kokoh tanpa celah.`;
    case "extreme":
    case "max":
      return `\n\n=== [AI THINKING LEVEL: EXTREME 10x (MAXIMUM COGNITIVE CAPACITY & HYPER-DETAILED REASONING)] ===
- 🧠 KERAHKAN KAPASITAS PENALARAN MAKSIMAL (10x LIPAT BERPIKIR SANGAT KERAS, TAJAM, & DETAIL).
- 📋 DEKOMPOSISI RENCANA MULTI-LANGKAH MENYELURUH (MULTI-STAGE ACTION PLAN):
  Sebelum mengeksekusi tindakan atau menyimpulkan jawaban, susun pemetaan rencana kerja granular (Step 1, Step 2, Step 3, dst.) yang komprehensif. Jika tugas rumit atau melibatkan banyak data, pecah menjadi sebanyak mungkin sub-langkah yang diperlukan tanpa memotong proses.
- 🔬 FIRST PRINCIPLES & MULTI-HYPOTHESIS TREE-OF-THOUGHT:
  Dekonstruksi setiap masalah dari hukum/prinsip paling dasar. Evaluasi minimal 3 hipotesis atau arsitektur solusi yang berbeda, bedah implikasi dan resiko setiap cabang, lalu pilih lintasan eksekusi yang paling sempurna.
- 🛡️ ADVERSARIAL STRESS-TESTING & DEVIL'S ADVOCATE AUDIT:
  Uji secara agresif setiap baris argumen, kode, atau query Anda. Cari potensi kegagalan sistem terburuk (worst-case failure modes), edge cases, race conditions, false assumptions, dan bias data. Lakukan backtracking dan perbaikan total seketika.
- 📊 KEDALAMAN HASIL AKHIR SUPER MIKROSKOPIS (ULTRA-DEEP COMPREHENSIVE OUTPUT):
  DILARANG membuat ringkasan dangkal atau melewatkan detail krusial. Sajikan analisis, kode, dan solusi dengan kedalaman mikroskopis mutlak, terstruktur, berbasis bukti empiris, dan siap dieksekusi 100%.`;
    default:
      return `\n\n=== [AI THINKING LEVEL: HIGH (Mendalam — Multi-Branch Tree-of-Thought)] ===
- Eksplorasi alternatif solusi, uji edge cases, dan berikan penalaran terstruktur.`;
  }
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
  },
  // ==========================================
  // Autonomous Brain & Persistent Memory Tools (Hermes-Surpassing)
  // ==========================================
  {
    type: "function",
    function: {
      name: "manage_personal_memory",
      description: "Manage persistent personal facts, rules, and preferences of the user. Use when user expresses a preference, rule, identity detail, or asks to remember/forget something.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["save", "delete", "list"], description: "Action to perform: 'save', 'delete', or 'list'" },
          category: { type: "string", enum: ["profile", "preference", "rule", "knowledge", "guideline"], description: "Category of the memory item" },
          content: { type: "string", description: "The core fact, rule, or preference to remember permanently" },
          reason: { type: "string", description: "Why this memory was recorded or updated" },
          confidence: { type: "number", description: "Confidence score between 0.1 and 1.0 (default 1.0)" },
          memory_id: { type: "string", description: "Target memory ID (required for 'delete')" },
          query: { type: "string", description: "Search query string (optional for 'list')" }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "distill_session_experience",
      description: "Distill the current interaction session into high-signal key learnings, patterns, and empirical takeaways into the persistent experience ledger.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Concise title of the distilled experience (e.g., 'Fix Image Persistence', 'Meta Ads CPR Optimization')" },
          distilled_markdown: { type: "string", description: "Markdown summary of key learnings, workflow discoveries, and solutions." },
          key_learnings: {
            type: "array",
            items: { type: "string" },
            description: "Array of bullet-point takeaways"
          },
          tags: { type: "string", description: "Comma-separated tags (e.g., 'indexeddb,images,fix')" }
        },
        required: ["title", "distilled_markdown"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "record_anti_pattern",
      description: "Record a mistake, failed attempt, or sub-optimal pattern into the anti-pattern vault to ensure AI NEVER repeats the same error.",
      parameters: {
        type: "object",
        properties: {
          target_domain: { type: "string", description: "Context domain (e.g., 'Git Backup', 'WhatsApp CS', 'DOM Scraping', 'CSS Dark Theme')" },
          mistake_description: { type: "string", description: "What failed or went wrong" },
          root_cause: { type: "string", description: "Technical or logical root cause of the error" },
          winning_fix: { type: "string", description: "The verified, permanent winning solution" },
          prevention_rule: { type: "string", description: "Actionable guardrail rule to avoid this error in future runs" }
        },
        required: ["target_domain", "mistake_description", "winning_fix", "prevention_rule"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_autonomous_skill",
      description: "Autonomously create a brand-new reusable workflow skill and persist it to the autonomous skills vault and file system.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Skill name (e.g., 'Autonomous Meta Ads Auditor', 'Dynamic Carousel Generator')" },
          description: { type: "string", description: "When and why this skill triggers" },
          workflow_markdown: { type: "string", description: "Step-by-step markdown workflow and action directives" },
          version: { type: "string", description: "Initial semantic version, default 'v1.0.0'" }
        },
        required: ["name", "description", "workflow_markdown"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_autonomous_skill",
      description: "Self-improve, refactor, or increment the version of an existing autonomous skill based on empirical execution results.",
      parameters: {
        type: "object",
        properties: {
          skill_id: { type: "string", description: "ID of the autonomous skill to update" },
          name: { type: "string", description: "Updated skill name" },
          description: { type: "string", description: "Updated description" },
          workflow_markdown: { type: "string", description: "Updated workflow markdown" },
          version: { type: "string", description: "Updated version string (e.g., 'v1.1.0')" },
          changelog: { type: "string", description: "Explanation of what was improved or fixed" }
        },
        required: ["skill_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_autonomous_agent",
      description: "Autonomously spawn and persist a new domain specialist multi-agent persona complete with custom system prompt and assigned skills.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent persona name (e.g., 'Lead Qualification Specialist', 'Dark Luxury Art Director')" },
          role_description: { type: "string", description: "Brief role definition and specialty" },
          system_prompt: { type: "string", description: "Full system prompt directives for this agent" },
          assigned_skills: {
            type: "array",
            items: { type: "string" },
            description: "List of skill IDs or skill names assigned to this agent"
          },
          reason: { type: "string", description: "Why the AI autonomously decided to create this agent" }
        },
        required: ["name", "role_description", "system_prompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_manual_skill",
      description: "Edit, refine, or improve a skill created manually by the user or preset skill. Automatically creates a rollback backup before applying modifications.",
      parameters: {
        type: "object",
        properties: {
          skill_id: { type: "string", description: "ID of the manual skill to edit" },
          name: { type: "string", description: "Updated skill name" },
          description: { type: "string", description: "Updated description" },
          content: { type: "string", description: "Updated markdown instruction content for the skill" },
          change_summary: { type: "string", description: "Summary of changes made to improve the skill" }
        },
        required: ["skill_id", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_manual_agent",
      description: "Edit, refine, or improve an agent persona created manually by the user. Automatically creates a rollback backup before applying modifications.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string", description: "ID of the manual agent to edit" },
          name: { type: "string", description: "Updated agent name" },
          description: { type: "string", description: "Updated role description" },
          system_prompt: { type: "string", description: "Updated system prompt / instruction directives" },
          skills: { type: "array", items: { type: "string" }, description: "Updated list of attached skill IDs" },
          change_summary: { type: "string", description: "Summary of changes made to improve the agent" }
        },
        required: ["agent_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rollback_brain_item",
      description: "Rollback any skill, agent persona, or memory to its previous version before it was modified by the AI.",
      parameters: {
        type: "object",
        properties: {
          item_type: { type: "string", enum: ["skill", "agent", "memory", "autonomous_skill", "autonomous_agent", "user_memory"], description: "Type of item to rollback" },
          item_id: { type: "string", description: "ID of the item to rollback" },
          history_id: { type: "string", description: "Optional specific history snapshot ID to restore" }
        },
        required: ["item_type", "item_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_epistemic_triplet",
      description: "Save or update an entity-relation knowledge triplet into the Epistemic Graph with confidence and dynamic conflict resolution.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Source entity (e.g. 'Tiar Property', 'Arya')" },
          predicate: { type: "string", description: "Relationship predicate (e.g. 'offers_promo', 'located_in')" },
          object: { type: "string", description: "Target entity or value" },
          confidence: { type: "number", description: "Confidence score 0.0 - 1.0, default 1.0" },
          source: { type: "string", description: "Provenance: 'user_chat', 'web_search', 'bash', 'agent_inference'" },
          negative_constraint: { type: "boolean", description: "True if this relation represents a forbidden action or anti-pattern" }
        },
        required: ["subject", "predicate", "object"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_epistemic_graph",
      description: "Multi-hop query of the Epistemic Knowledge Graph starting from a root entity to perform associative reasoning.",
      parameters: {
        type: "object",
        properties: {
          root_entity: { type: "string", description: "Entity name to explore outwards from" },
          max_depth: { type: "integer", description: "Traversal depth (1-3), default 2" }
        },
        required: ["root_entity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_jit_microtool",
      description: "Just-In-Time (JIT) self-coding execution: Write and run an on-the-fly JavaScript or Python snippet in an isolated sandbox for specialized calculation or extraction.",
      parameters: {
        type: "object",
        properties: {
          language: { type: "string", enum: ["javascript", "python"], description: "Execution language" },
          code: { type: "string", description: "Code snippet to execute" },
          purpose: { type: "string", description: "Why this micro-tool was written" }
        },
        required: ["language", "code", "purpose"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "configure_telegram_bot",
      description: "Directly configure, save, and activate the built-in Telegram Bot Remote Control in Browser Agent settings. When user provides a bot token, allowed chat ID, or when the agent reads them from @BotFather on Telegram Web, IMMEDIATELY call this tool to configure the bot directly without requiring the user to do manual setup.",
      parameters: {
        type: "object",
        properties: {
          bot_token: { type: "string", description: "The HTTP API bot token from @BotFather (e.g. '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ')" },
          authorized_chat_id: { type: "string", description: "The authorized user Telegram ID (e.g. '5871099248') for private whitelist security" },
          enabled: { type: "boolean", description: "Whether to enable the Telegram bot listener daemon (default true)" },
          auto_model: { type: "boolean", description: "Enable dynamic model routing (default true)" },
          auto_agent: { type: "boolean", description: "Enable smart agent routing (default true)" },
          auto_accept: { type: "boolean", description: "Auto-accept actions without prompt (default true)" }
        },
        required: ["bot_token"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_telegram_bot_status",
      description: "Get the current configuration, whitelist user ID, and status of the built-in Telegram Bot Remote Control.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

// =========================================================================
// 🧠 Cognitive System 2 Engine: MCTS Lookahead & Adversarial Arbiter
// =========================================================================
class MCTSNode {
  constructor(action, parent = null, state = {}) {
    this.action = action;
    this.parent = parent;
    this.children = [];
    this.qValue = 0.0;
    this.visitCount = 0;
    this.state = state;
    this.isPruned = false;
    this.heuristicScore = 0.0;
  }

  getUCT(cExplore = 1.414) {
    if (this.visitCount === 0) return Infinity;
    const parentVisits = this.parent ? Math.max(1, this.parent.visitCount) : 1;
    const exploitation = this.qValue / this.visitCount;
    const exploration = cExplore * Math.sqrt(Math.log(parentVisits) / this.visitCount);
    return exploitation + exploration;
  }

  backpropagate(reward) {
    this.visitCount++;
    this.qValue += reward;
    if (this.parent) {
      this.parent.backpropagate(reward);
    }
  }
}

// Live Working Memory Scratchpad State
let activeDAGState = {
  goal: "",
  tasks: [],
  activeTaskIndex: 0,
  isRunning: false
};

function parseGoalToDAG(userPrompt) {
  if (!userPrompt || userPrompt.trim().length < 10) return [];
  const text = userPrompt.trim();
  const subTasks = [];
  
  // Intelligent heuristic decomposition
  if (text.toLowerCase().includes("cari") || text.toLowerCase().includes("search") || text.toLowerCase().includes("browsing")) {
    subTasks.push({ id: "dag_1", title: "Kueri Web & Navigasi Halaman", status: "pending", phase: "retrieval" });
    subTasks.push({ id: "dag_2", title: "Ekstraksi Data & Verifikasi Visual", status: "pending", phase: "extraction" });
    subTasks.push({ id: "dag_3", title: "Sintesis Pengetahuan & Critic Review", status: "pending", phase: "synthesis" });
  } else if (text.toLowerCase().includes("buat") || text.toLowerCase().includes("bikin") || text.toLowerCase().includes("koding") || text.toLowerCase().includes("script")) {
    subTasks.push({ id: "dag_1", title: "Analisis Kebutuhan & Desain Solusi", status: "pending", phase: "planning" });
    subTasks.push({ id: "dag_2", title: "Eksekusi JIT Code / Tool Call", status: "pending", phase: "execution" });
    subTasks.push({ id: "dag_3", title: "Adversarial Critic & Zero-Error Check", status: "pending", phase: "verification" });
  } else {
    subTasks.push({ id: "dag_1", title: "MCTS Lookahead Planning", status: "pending", phase: "mcts" });
    subTasks.push({ id: "dag_2", title: "Eksekusi Aksi Deterministic", status: "pending", phase: "action" });
    subTasks.push({ id: "dag_3", title: "Validasi Respon Bebas Halusinasi", status: "pending", phase: "critic" });
  }
  return subTasks;
}

function renderWorkingMemoryScratchpad(dagState) {
  const container = document.getElementById("cognitive-scratchpad-container");
  if (!container) return;

  if (!dagState || !dagState.tasks || dagState.tasks.length === 0 || !dagState.isRunning) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "block";
  let tasksHtml = "";
  dagState.tasks.forEach((t, idx) => {
    let badgeClass = "badge-pending";
    let badgeLabel = "Pending";
    let itemClass = "scratchpad-task-item";

    if (t.status === "done") {
      badgeClass = "badge-done";
      badgeLabel = "Done";
      itemClass += " done";
    } else if (t.status === "simulating" || t.status === "running") {
      badgeClass = "badge-simulating";
      badgeLabel = "MCTS Run";
      itemClass += " running";
    } else if (t.status === "critic") {
      badgeClass = "badge-critic";
      badgeLabel = "Critic";
      itemClass += " running";
    }

    tasksHtml += `
      <div class="${itemClass}">
        <span>${idx + 1}. ${t.title}</span>
        <span class="scratchpad-task-badge ${badgeClass}">${badgeLabel}</span>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="scratchpad-card">
      <div class="scratchpad-header">
        <div class="scratchpad-header-left">
          <span class="pulse-indicator"></span>
          <span>Cognitive MCTS &amp; Working Scratchpad</span>
        </div>
        <div style="font-size: 10.5px; color: #94A3B8; font-family: monospace;">
          ${dagState.tasks.filter(t => t.status === 'done').length}/${dagState.tasks.length} Sub-goals
        </div>
      </div>
      <div class="scratchpad-tasks-list">
        ${tasksHtml}
      </div>
    </div>
  `;
}

function updateDAGTaskStatus(taskIndex, status) {
  if (activeDAGState && activeDAGState.tasks && activeDAGState.tasks[taskIndex]) {
    activeDAGState.tasks[taskIndex].status = status;
    renderWorkingMemoryScratchpad(activeDAGState);
  }
}

function clearWorkingMemoryScratchpad() {
  activeDAGState.isRunning = false;
  activeDAGState.tasks = [];
  renderWorkingMemoryScratchpad(activeDAGState);
}

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

async function saveAttachmentsToIndexedDB(attachments) {
  if (!Array.isArray(attachments)) return;
  for (const att of attachments) {
    if (att.isImage && att.dataUrl) {
      const imgId = att.id || ('att_img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      att.id = imgId;
      if (!att.thumbnailUrl) att.thumbnailUrl = att.dataUrl;
      await saveImageToIndexedDB(imgId, att.dataUrl, att.name || 'image.png');
    } else if (att.isVideo && att.dataUrl) {
      const vidId = att.id || ('att_vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      att.id = vidId;
      await saveVideoToIndexedDB(vidId, att.dataUrl, att.name || 'video.mp4', att.duration || 0);
    }
  }
}

// Backward compatibility alias
const saveVideoAttachmentsToIndexedDB = saveAttachmentsToIndexedDB;

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

  // 3. Hydrate User Attached Images from IndexedDB (Fix Broken Image History)
  const userThumbs = container.querySelectorAll('.user-attached-thumb[data-image-id]');
  for (const thumb of userThumbs) {
    const imgId = thumb.getAttribute('data-image-id');
    if (!imgId || thumb.dataset.hydrated === 'true') continue;

    const imgEl = thumb.querySelector('img');
    if (imgEl && imgEl.src && imgEl.src.startsWith('data:image/') && !imgEl.src.startsWith('data:image/gif;base64')) {
      imgEl.style.opacity = '1';
      thumb.dataset.hydrated = 'true';
      continue;
    }

    const cachedImg = await getImageFromIndexedDB(imgId);
    if (cachedImg && cachedImg.dataUrl) {
      thumb.dataset.hydrated = 'true';
      if (imgEl) {
        imgEl.src = cachedImg.dataUrl;
        imgEl.style.opacity = '1';
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
      if (msg && msg.id !== undefined) {
        const callbackEntry = nativeRpcCallbacks.get(msg.id) || 
                              nativeRpcCallbacks.get(String(msg.id)) || 
                              nativeRpcCallbacks.get(Number(msg.id));
        if (callbackEntry) {
          const { resolve, reject } = callbackEntry;
          nativeRpcCallbacks.delete(msg.id);
          nativeRpcCallbacks.delete(String(msg.id));
          nativeRpcCallbacks.delete(Number(msg.id));
          if (msg.status === 'ok') {
            resolve(msg);
          } else {
            reject(new Error(msg.error || 'Native RPC failed'));
          }
          return;
        }
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

let isDebuggerAttached = false;

async function attachDebugger(tabId) {
  if (!tabId) return;
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !isNormalUrl(tab.url)) {
      return;
    }
    await chrome.debugger.attach({ tabId }, "1.3");
    isDebuggerAttached = true;
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable").catch(() => {});
    await chrome.debugger.sendCommand({ tabId }, "DOM.enable").catch(() => {});
    await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable").catch(() => {});
  } catch (err) {
    if (err && err.message && err.message.includes("already attached")) {
      isDebuggerAttached = true;
    } else {
      console.warn("Debugger attach notice:", err);
    }
  }
}

async function detachDebugger(tabId) {
  const targetId = tabId || activeTabId;
  if (!targetId) return;
  try {
    await chrome.debugger.detach({ tabId: targetId });
  } catch (err) {}
  isDebuggerAttached = false;
}

async function selectTab(tabId, forceFocus = false) {
  if (!tabId) return;
  if (activeTabId && activeTabId !== tabId) {
    try {
      await detachDebugger(activeTabId);
    } catch (err) {}
  }
  activeTabId = tabId;
  consoleLogs = [];
  try {
    const shouldFocus = (typeof isAutoSwitchTabEnabled === 'function' ? isAutoSwitchTabEnabled() : true) || forceFocus;
    if (shouldFocus) {
      await chrome.tabs.update(tabId, { active: true });
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
      }
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

  // Ensure active tab is focused on any browser interaction ONLY IF auto switch tab is enabled
  if (name.startsWith("browser_") && name !== "browser_list_tabs") {
    const shouldFocus = typeof isAutoSwitchTabEnabled === 'function' ? isAutoSwitchTabEnabled() : true;
    if (shouldFocus && activeTabId) {
      try {
        await chrome.tabs.update(activeTabId, { active: true });
        const tab = await chrome.tabs.get(activeTabId).catch(() => null);
        if (tab && tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        }
      } catch (err) {}
    }
    if (activeTabId && name !== "browser_navigate") {
      await attachDebugger(activeTabId);
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
          const shouldSwitch = (typeof isAutoSwitchTabEnabled === 'function' ? isAutoSwitchTabEnabled() : true);
          const newTab = await chrome.tabs.create({ url: matchedUrl, active: shouldSwitch });
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
        const shouldSwitch = (typeof isAutoSwitchTabEnabled === 'function' ? isAutoSwitchTabEnabled() : true);
        const newTab = await chrome.tabs.create({ url: fallbackUrl, active: shouldSwitch });
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
      
      const shouldSwitch = (typeof isAutoSwitchTabEnabled === 'function' ? isAutoSwitchTabEnabled() : true);
      const newTab = await chrome.tabs.create({ url: targetUrl, active: shouldSwitch });
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
      const shouldSwitch = (typeof isAutoSwitchTabEnabled === 'function' ? isAutoSwitchTabEnabled() : true);

      // If activeTabId is null, or belongs to our own full newtab extension page, open in a new active tab!
      if (!targetTabId || (ownTab && targetTabId === ownTab.id)) {
        const newTab = await chrome.tabs.create({ url: targetUrl, active: shouldSwitch });
        await selectTab(newTab.id);
        targetTabId = newTab.id;
      } else {
        await chrome.tabs.update(targetTabId, { url: targetUrl, active: shouldSwitch });
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
            lastCapturedScreenshotDataUrl = dataUrl;
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

    // ==========================================
    // Autonomous Brain & Persistent Memory Tool Dispatchers
    // ==========================================
    case "manage_personal_memory": {
      const action = args.action || "save";
      if (action === "save") {
        const res = await sendNativeRpc("db_save_personal_memory", {
          memory: {
            category: args.category || "preference",
            content: args.content,
            reason: args.reason || "Autonomous AI observation",
            confidence: args.confidence !== undefined ? args.confidence : 1.0,
            source: "autonomous_ai"
          }
        });
        notifyPersistentBrainUpdated();
        return { success: true, message: "Personal memory recorded successfully in SQLite and synced to personal_facts.md", memory_id: res.id, content: res.content };
      } else if (action === "delete") {
        const res = await sendNativeRpc("db_delete_persistent_item", {
          item_type: "memory",
          item_id: args.memory_id
        });
        notifyPersistentBrainUpdated();
        return { success: true, message: "Personal memory deleted", deleted_id: res.deleted_id };
      } else if (action === "list") {
        const res = await sendNativeRpc("db_get_persistent_memory", { search: args.query || "" });
        return { success: true, user_memories: res.user_memories || [] };
      }
      return { error: `Unsupported action: ${action}` };
    }

    case "distill_session_experience": {
      const currentSid = currentSessionId || (chatHistory[0]?.id) || `sess_${Date.now()}`;
      const res = await sendNativeRpc("db_save_experience_distillation", {
        distillation: {
          session_id: currentSid,
          title: args.title,
          distilled_markdown: args.distilled_markdown,
          key_learnings: args.key_learnings || [],
          tags: args.tags || ""
        }
      });
      notifyPersistentBrainUpdated();
      return { success: true, message: "Session experience distilled and stored in SQLite & experience ledger file", id: res.id, title: res.title, file: res.file };
    }

    case "record_anti_pattern": {
      const res = await sendNativeRpc("db_save_anti_pattern", {
        anti_pattern: {
          target_domain: args.target_domain,
          mistake_description: args.mistake_description,
          root_cause: args.root_cause || "",
          winning_fix: args.winning_fix,
          prevention_rule: args.prevention_rule
        }
      });
      notifyPersistentBrainUpdated();
      return { success: true, message: "Anti-pattern recorded permanently. AI will not repeat this error.", id: res.id, domain: res.target_domain };
    }

    case "create_autonomous_skill": {
      const res = await sendNativeRpc("db_save_autonomous_skill", {
        skill: {
          name: args.name,
          description: args.description,
          workflow_markdown: args.workflow_markdown,
          version: args.version || "v1.0.0",
          source: "autonomous_ai",
          created_by: "AI Agent (Self-Evolved)"
        }
      });

      // Synchronize directly into custom_skills in chrome.storage.local
      try {
        const stored = await chrome.storage.local.get(['custom_skills']);
        let curSkills = Array.isArray(stored.custom_skills) ? [...stored.custom_skills] : [];
        const skillId = res.id || `skill_auto_${Date.now()}`;
        const existingIdx = curSkills.findIndex(s => s.id === skillId || s.name?.toLowerCase() === args.name?.toLowerCase());
        const newSkillObj = {
          id: skillId,
          name: args.name,
          description: args.description,
          content: args.workflow_markdown,
          version: args.version || "v1.0.0",
          source: "autonomous_ai",
          created_by: "AI Agent (Self-Evolved)",
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) {
          curSkills[existingIdx] = { ...curSkills[existingIdx], ...newSkillObj };
        } else {
          curSkills.push(newSkillObj);
        }
        await chrome.storage.local.set({ custom_skills: curSkills });
        if (typeof customSkills !== 'undefined') customSkills = curSkills;
      } catch (e) {
        console.warn("Sync custom_skills error:", e);
      }

      notifyPersistentBrainUpdated();
      return { success: true, message: "Autonomous skill created and registered in Skills Catalog", id: res.id, name: res.name, version: res.version };
    }

    case "update_autonomous_skill": {
      const res = await sendNativeRpc("db_save_autonomous_skill", {
        skill: {
          id: args.skill_id,
          name: args.name,
          description: args.description,
          workflow_markdown: args.workflow_markdown,
          version: args.version,
          changelog: args.changelog,
          source: "autonomous_ai",
          edited_by: "autonomous_ai"
        }
      });

      // Synchronize into custom_skills in chrome.storage.local
      try {
        const stored = await chrome.storage.local.get(['custom_skills']);
        let curSkills = Array.isArray(stored.custom_skills) ? [...stored.custom_skills] : [];
        const existingIdx = curSkills.findIndex(s => s.id === args.skill_id);
        if (existingIdx >= 0) {
          curSkills[existingIdx] = {
            ...curSkills[existingIdx],
            name: args.name || curSkills[existingIdx].name,
            description: args.description || curSkills[existingIdx].description,
            content: args.workflow_markdown || curSkills[existingIdx].content,
            version: args.version || curSkills[existingIdx].version,
            edited_by: "autonomous_ai",
            last_refined: new Date().toISOString(),
            changelog: args.changelog || "Updated by AI Agent"
          };
          await chrome.storage.local.set({ custom_skills: curSkills });
          if (typeof customSkills !== 'undefined') customSkills = curSkills;
        }
      } catch (e) {
        console.warn("Sync custom_skills update error:", e);
      }

      notifyPersistentBrainUpdated();
      return { success: true, message: "Autonomous skill updated and refactored", id: res.id, name: res.name, version: res.version };
    }

    case "create_autonomous_agent": {
      const res = await sendNativeRpc("db_save_autonomous_agent", {
        agent: {
          name: args.name,
          role_description: args.role_description,
          system_prompt: args.system_prompt,
          assigned_skills: args.assigned_skills || [],
          reason: args.reason || "Autonomous task specialization",
          source: "autonomous_ai",
          created_by: "AI Agent (Self-Evolved)"
        }
      });

      // Synchronize directly into custom_agents in chrome.storage.local
      try {
        const stored = await chrome.storage.local.get(['custom_agents']);
        let curAgents = Array.isArray(stored.custom_agents) ? [...stored.custom_agents] : [];
        const agentId = res.id || `agent_auto_${Date.now()}`;
        const existingIdx = curAgents.findIndex(a => a.id === agentId || a.name?.toLowerCase() === args.name?.toLowerCase());
        const newAgentObj = {
          id: agentId,
          name: args.name,
          description: args.role_description,
          content: args.system_prompt,
          skills: args.assigned_skills || [],
          source: "autonomous_ai",
          created_by: "AI Agent (Self-Evolved)",
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) {
          curAgents[existingIdx] = { ...curAgents[existingIdx], ...newAgentObj };
        } else {
          curAgents.push(newAgentObj);
        }
        await chrome.storage.local.set({ custom_agents: curAgents });
        if (typeof customAgents !== 'undefined') customAgents = curAgents;
        if (typeof renderAgentDropdown === 'function') renderAgentDropdown();
      } catch (e) {
        console.warn("Sync custom_agents error:", e);
      }

      notifyPersistentBrainUpdated();
      return { success: true, message: "Autonomous specialist agent spawned and registered in Multi-Agent Persona list", id: res.id, name: res.name };
    }

    case "edit_manual_skill": {
      const res = await sendNativeRpc("save_skill", {
        skill: {
          id: args.skill_id,
          name: args.name,
          description: args.description,
          content: args.content,
          edited_by: "autonomous_ai",
          change_summary: args.change_summary || "Skill improvement by AI agent"
        }
      });

      // Synchronize into custom_skills in chrome.storage.local
      try {
        const stored = await chrome.storage.local.get(['custom_skills']);
        let curSkills = Array.isArray(stored.custom_skills) ? [...stored.custom_skills] : [];
        const existingIdx = curSkills.findIndex(s => s.id === args.skill_id);
        if (existingIdx >= 0) {
          curSkills[existingIdx] = {
            ...curSkills[existingIdx],
            name: args.name || curSkills[existingIdx].name,
            description: args.description || curSkills[existingIdx].description,
            content: args.content || curSkills[existingIdx].content,
            edited_by: "autonomous_ai",
            last_refined: new Date().toISOString(),
            changelog: args.change_summary || "Refined by AI Agent"
          };
          await chrome.storage.local.set({ custom_skills: curSkills });
          if (typeof customSkills !== 'undefined') customSkills = curSkills;
        }
      } catch (e) {
        console.warn("Sync custom_skills edit error:", e);
      }

      notifyPersistentBrainUpdated();
      return { success: true, message: "Manual skill updated with rollback backup created", id: args.skill_id, res };
    }

    case "edit_manual_agent": {
      const res = await sendNativeRpc("save_agent", {
        agent: {
          id: args.agent_id,
          name: args.name,
          description: args.description,
          system_prompt: args.system_prompt,
          skills: args.skills,
          edited_by: "autonomous_ai",
          change_summary: args.change_summary || "Agent persona improvement by AI agent"
        }
      });

      // Synchronize into custom_agents in chrome.storage.local
      try {
        const stored = await chrome.storage.local.get(['custom_agents']);
        let curAgents = Array.isArray(stored.custom_agents) ? [...stored.custom_agents] : [];
        const existingIdx = curAgents.findIndex(a => a.id === args.agent_id);
        if (existingIdx >= 0) {
          curAgents[existingIdx] = {
            ...curAgents[existingIdx],
            name: args.name || curAgents[existingIdx].name,
            description: args.description || curAgents[existingIdx].description,
            content: args.system_prompt || curAgents[existingIdx].content,
            skills: args.skills || curAgents[existingIdx].skills,
            edited_by: "autonomous_ai",
            last_refined: new Date().toISOString(),
            changelog: args.change_summary || "Refined by AI Agent"
          };
          await chrome.storage.local.set({ custom_agents: curAgents });
          if (typeof customAgents !== 'undefined') customAgents = curAgents;
          if (typeof renderAgentDropdown === 'function') renderAgentDropdown();
        }
      } catch (e) {
        console.warn("Sync custom_agents edit error:", e);
      }

      notifyPersistentBrainUpdated();
      return { success: true, message: "Manual agent updated with rollback backup created", id: args.agent_id, res };
    }

    case "rollback_brain_item": {
      const res = await sendNativeRpc("db_rollback_item", {
        item_type: args.item_type,
        item_id: args.item_id,
        history_id: args.history_id
      });
      notifyPersistentBrainUpdated();
      return { success: res.status === "ok", message: res.message || res.error, res };
    }

    case "save_epistemic_triplet": {
      const res = await sendNativeRpc("db_save_epistemic_triplet", {
        triplet: {
          subject: args.subject,
          predicate: args.predicate,
          object: args.object,
          confidence: args.confidence !== undefined ? args.confidence : 1.0,
          source_kappa: args.source || "user_chat",
          negative_constraint: args.negative_constraint ? 1 : 0
        }
      });
      notifyPersistentBrainUpdated();
      return { success: res.status === "ok", message: "Epistemic knowledge triplet saved with decay & conflict resolution", triplet: res };
    }

    case "query_epistemic_graph": {
      const res = await sendNativeRpc("db_traverse_knowledge_graph", {
        root_entity: args.root_entity,
        max_depth: args.max_depth || 2
      });
      return { success: res.status === "ok", root_entity: args.root_entity, traversal: res.graph || [] };
    }

    case "execute_jit_microtool": {
      const lang = (args.language || "javascript").toLowerCase();
      const code = args.code || "";
      const purpose = args.purpose || "Dynamic micro-tool execution";

      if (lang === "javascript" || lang === "js") {
        try {
          const sandboxFn = new Function("context", `
            return (async () => {
              ${code}
            })();
          `);
          const result = await sandboxFn({ timestamp: Date.now() });
          return { success: true, language: "javascript", purpose, output: result !== undefined ? result : "Executed successfully without return value" };
        } catch (jsErr) {
          return { success: false, language: "javascript", error: jsErr.message, purpose };
        }
      } else if (lang === "python" || lang === "py") {
        const res = await sendNativeRpc("run_command", {
          command: `python3 -c ${JSON.stringify(code)}`,
          cwd: "/tmp"
        });
        return { success: res.status === "ok" && res.exit_code === 0, language: "python", purpose, stdout: res.stdout || "", stderr: res.stderr || "" };
      } else {
        return { success: false, error: `Unsupported language: ${lang}` };
      }
    }

    case "configure_telegram_bot": {
      const botToken = (args.bot_token || "").trim();
      const authChatId = (args.authorized_chat_id || "").trim();
      const enabled = args.enabled !== false;
      const autoModel = args.auto_model !== false;
      const autoAgent = args.auto_agent !== false;
      const autoAccept = args.auto_accept !== false;

      if (!botToken) {
        return { error: "Bot token is required." };
      }

      // Verify token with Telegram API
      let botInfo = null;
      try {
        const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const json = await resp.json();
        if (!json.ok) {
          return { error: `Telegram Bot Token tidak valid: ${json.description || 'Gagal verifikasi'}` };
        }
        botInfo = json.result;
      } catch (err) {
        return { error: `Gagal menghubungi server Telegram: ${err.message}` };
      }

      // Automatically register bot commands with Telegram
      try {
        const cmdList = [
          { command: "start", description: "Buka menu utama & instruksi Browser Agent" },
          { command: "model", description: "Ganti/cek model AI aktif (/model auto)" },
          { command: "agent", description: "Ganti/cek spesialis agent (/agent auto)" },
          { command: "mode", description: "Ganti mode percakapan (/mode chat atau agent)" },
          { command: "screenshot", description: "Ambil tangkapan layar tab aktif Chrome" },
          { command: "status", description: "Cek kesehatan daemon & ringkasan memori" },
          { command: "new", description: "Mulai sesi percakapan baru" }
        ];
        await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commands: cmdList })
        });
      } catch(e) {}

      // Save directly into chrome.storage.local
      const currentStorage = await chrome.storage.local.get(['telegram_bot_config']);
      const updatedConfig = {
        ...(currentStorage.telegram_bot_config || {}),
        bot_token: botToken,
        authorized_chat_id: authChatId || currentStorage.telegram_bot_config?.authorized_chat_id || "",
        enabled: enabled,
        auto_model: autoModel,
        auto_agent: autoAgent,
        auto_accept: autoAccept,
        bot_username: botInfo.username,
        bot_first_name: botInfo.first_name,
        updated_at: new Date().toISOString()
      };

      await chrome.storage.local.set({ telegram_bot_config: updatedConfig });

      // Automatically set Telegram Bot Profile Photo to Browser Agent Icon
      try {
        await telegramSetBotProfilePhotoFromSidepanel(token);
      } catch(e) {}

      // Notify options page / background to update polling daemon immediately
      try {
        chrome.runtime.sendMessage({
          type: "TELEGRAM_CONFIG_UPDATED",
          config: updatedConfig
        });
      } catch(e) {}

      // Record this configuration in personal memories so AI remembers it permanently
      try {
        await sendNativeRpc("db_save_personal_memory", {
          memory: {
            category: "knowledge",
            content: `Telegram Bot Remote Control terhubung ke @${botInfo.username} (ID: ${botInfo.id}) dengan Whitelist Chat ID: ${updatedConfig.authorized_chat_id || 'Semua'} dan status AKTIF.`,
            reason: "Autonomous Telegram Bot Setup",
            confidence: 1.0,
            source: "autonomous_ai"
          }
        });
        notifyPersistentBrainUpdated();
      } catch(e) {}

      return {
        success: true,
        message: `Bot Telegram @${botInfo.username} (${botInfo.first_name}) berhasil dikonfigurasikan dan diaktifkan secara otomatis!`,
        bot_username: botInfo.username,
        bot_first_name: botInfo.first_name,
        bot_id: botInfo.id,
        bot_url: `https://t.me/${botInfo.username}`,
        authorized_chat_id: updatedConfig.authorized_chat_id,
        enabled: updatedConfig.enabled,
        commands_registered: true
      };
    }

    case "get_telegram_bot_status": {
      const data = await chrome.storage.local.get(['telegram_bot_config', 'telegram_bot_logs']);
      const config = data.telegram_bot_config || {};
      const logs = Array.isArray(data.telegram_bot_logs) ? data.telegram_bot_logs : [];
      return {
        success: true,
        configured: !!config.bot_token,
        enabled: !!config.enabled,
        bot_username: config.bot_username || "Belum diset",
        authorized_chat_id: config.authorized_chat_id || "Belum diset",
        total_logs: logs.length,
        last_log: logs.length > 0 ? logs[logs.length - 1] : null
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

// Telegram Remote Bridge State & Helpers (Anti-Spam In-Place Editing)
let activeTelegramSession = null;
let lastCapturedScreenshotDataUrl = null;
let lastTelegramEditTimestamp = 0;

// Helper: Cleanly format Markdown text specifically for Telegram HTML parse mode without altering Browser Agent UI
function formatMarkdownForTelegram(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let str = rawText;

  // 1. Extract code blocks and inline code
  const codeBlocks = [];
  str = str.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `___TG_CODE_BLOCK_${codeBlocks.length}___`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const langAttr = lang ? ` class="language-${lang}"` : '';
    codeBlocks.push(`<pre><code${langAttr}>${escapedCode}</code></pre>`);
    return placeholder;
  });

  const inlineCodes = [];
  str = str.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `___TG_INLINE_CODE_${inlineCodes.length}___`;
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escapedCode}</code>`);
    return placeholder;
  });

  // 2. Escape raw HTML entities
  str = str.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
  str = str.replace(/<(?!\/?(?:b|i|u|s|code|pre|a|blockquote)(?:\s+[^>]+)?>)/gi, '&lt;');

  // 3. Convert Headers
  str = str.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');

  // 4. Convert Bold
  str = str.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
  str = str.replace(/__([^_\n]+?)__/g, '<b>$1</b>');

  // 5. Convert Bullets / Lists
  str = str.replace(/^[ \t]{4,8}[\*\-\+][ \t]+/gm, '      • ');
  str = str.replace(/^[ \t]{2,3}[\*\-\+][ \t]+/gm, '   • ');
  str = str.replace(/^[ \t]*[\*\-\+][ \t]+/gm, '• ');

  // 6. Convert Italic
  str = str.replace(/(^|[^\*])\*([^*\n\s](?:[^*\n]*[^*\n\s])?)\*(?!\*)/g, '$1<i>$2</i>');
  str = str.replace(/(^|[^_])_([^_\n\s](?:[^_\n]*[^_\n\s])?)_(?!_)/g, '$1<i>$2</i>');

  // 7. Convert Links
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2">$1</a>');

  // 8. Restore Code Blocks & Inline Code
  codeBlocks.forEach((cb, idx) => {
    str = str.replace(`___TG_CODE_BLOCK_${idx}___`, cb);
  });
  inlineCodes.forEach((ic, idx) => {
    str = str.replace(`___TG_INLINE_CODE_${idx}___`, ic);
  });

  // 9. Normalize paragraph spacing
  str = str.replace(/\n{3,}/g, '\n\n').trim();
  return str;
}

async function telegramSendMessageFromSidepanel(botToken, chatId, text, replyMarkup = null) {
  if (!botToken || !chatId) return;
  try {
    const formattedText = formatMarkdownForTelegram(text);
    const payload = {
      chat_id: chatId,
      text: formattedText,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("Sidepanel Telegram Send Error:", err);
  }
}

async function telegramEditMessageFromSidepanel(botToken, chatId, messageId, text, replyMarkup = null) {
  if (!botToken || !chatId || !messageId) return;
  try {
    const formattedText = formatMarkdownForTelegram(text);
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: formattedText,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    // Silently ignore if message not modified
  }
}

// In-place single status updater (prevents message spam by editing the same message)
async function updateTelegramLiveStatus(statusText) {
  if (!activeTelegramSession || !activeTelegramSession.botToken || !activeTelegramSession.senderId) return;
  const { botToken, senderId } = activeTelegramSession;

  if (!activeTelegramSession.statusMessageId) {
    const res = await telegramSendMessageFromSidepanel(botToken, senderId, statusText);
    if (res && res.ok && res.result?.message_id && activeTelegramSession) {
      activeTelegramSession.statusMessageId = res.result.message_id;
    }
    return;
  }

  // Throttle Telegram edits to prevent HTTP 429
  const now = Date.now();
  if (now - lastTelegramEditTimestamp < 500) {
    await new Promise(r => setTimeout(r, 500));
  }
  lastTelegramEditTimestamp = Date.now();

  await telegramEditMessageFromSidepanel(botToken, senderId, activeTelegramSession.statusMessageId, statusText);
}

// Telegram API Helper: Set Bot Profile Photo to Browser Agent Icon
async function telegramSetBotProfilePhotoFromSidepanel(botToken) {
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
    console.warn("Set bot profile photo error:", err);
    return false;
  }
}

async function telegramSendPhotoFromSidepanel(botToken, chatId, photoDataUrlOrBase64, caption = "") {
  if (!botToken || !chatId || !photoDataUrlOrBase64) return;
  try {
    let base64Data = photoDataUrlOrBase64;
    let mimeType = "image/png";
    if (photoDataUrlOrBase64.startsWith("data:")) {
      const parts = photoDataUrlOrBase64.split(",");
      mimeType = parts[0].split(";")[0].split(":")[1] || "image/png";
      base64Data = parts[1];
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", blob, "screenshot.png");
    if (caption) formData.append("caption", caption);
    formData.append("parse_mode", "HTML");

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: formData
    });
    return await resp.json();
  } catch (err) {
    console.error("Sidepanel Telegram Send Photo Error:", err);
  }
}

// =========================================================================
// Telegram Remote Control Poller Daemon & Bridge Engine
// =========================================================================
const sidepanelPollerInstanceId = 'sp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
let telegramRemoteDaemonStarted = false;

// Fetch Recent Sessions for Telegram History Command
async function getTelegramRecentSessions() {
  let sessions = [];
  try {
    if (nativePort) {
      const res = await sendNativeRpc("db_get_sessions", { search: "" });
      if (res && res.status === "ok" && Array.isArray(res.sessions)) {
        sessions = res.sessions;
      }
    }
  } catch (e) {}

  if (sessions.length === 0) {
    const res = await chrome.storage.local.get(['chat_sessions_cache']);
    const cache = res.chat_sessions_cache || {};
    sessions = Object.values(cache);
  }

  sessions.sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
  return sessions.slice(0, 6);
}

// Render and Send /history message to Telegram
async function handleTelegramHistoryCommand(botToken, chatId) {
  const sessions = await getTelegramRecentSessions();
  if (sessions.length === 0) {
    await telegramSendMessageFromSidepanel(botToken, chatId, `🗂️ <b>Riwayat Sesi Percakapan:</b>\n\nBelum ada sesi percakapan yang tersimpan di database.`, {
      inline_keyboard: [
        [{ text: "➕ Buat Sesi Percakapan Baru", callback_data: "cmd_new_session" }]
      ]
    });
    return;
  }

  let text = `🗂️ <b>Daftar Riwayat Sesi Chat Browser Agent:</b>\n\n`;
  const keyboardRows = [];
  const switchButtons = [];

  sessions.forEach((s, idx) => {
    const num = idx + 1;
    const title = s.title || `Sesi ${num}`;
    const dateStr = s.created_at ? new Date(s.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
    const msgCount = Array.isArray(s.messages) ? s.messages.length : (s.message_count || 0);
    const isCurrent = (s.id === currentSessionId);
    
    text += `${num}. ${isCurrent ? '🟢 ' : '💬 '}<b>${escapeHtml(title.slice(0, 38))}</b>\n`;
    text += `   <i>Waktu: ${dateStr} • ${msgCount} pesan</i>\n\n`;

    switchButtons.push({
      text: `${isCurrent ? '🟢 ' : ''}Sesi ${num}`,
      callback_data: `switch_sess:${s.id}`
    });
  });

  text += `<i>Ketuk tombol di bawah untuk langsung berpindah sesi chat:</i>`;

  // Pair buttons 2 per row
  for (let i = 0; i < switchButtons.length; i += 2) {
    keyboardRows.push(switchButtons.slice(i, i + 2));
  }
  keyboardRows.push([
    { text: "➕ Buat Sesi Baru", callback_data: "cmd_new_session" },
    { text: "🔄 Segarkan List", callback_data: "cmd_history" }
  ]);

  await telegramSendMessageFromSidepanel(botToken, chatId, text, { inline_keyboard: keyboardRows });
}

// Process Incoming Telegram Update directly in Sidepanel / New Tab
async function handleTelegramIncomingUpdateInSidepanel(update, tgCfg) {
  const botToken = tgCfg.bot_token;
  if (!botToken) return;

  // 1. Handle Callback Query (Buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const fromId = String(cb.from?.id || '');
    const data = cb.data || '';

    // Whitelist check
    if (tgCfg.authorized_chat_id && fromId !== String(tgCfg.authorized_chat_id)) {
      return;
    }

    if (data === 'cmd_history' || data === 'cmd_sessions') {
      await handleTelegramHistoryCommand(botToken, fromId);
      return;
    }

    if (data.startsWith('switch_sess:')) {
      const sid = data.replace('switch_sess:', '');
      await resumeSession(sid);
      const title = currentSessionTitle || 'Sesi Chat';
      await telegramSendMessageFromSidepanel(botToken, fromId, `📂 <b>Berhasil Beralih ke Sesi:</b>\n<i>"${escapeHtml(title)}"</i>\n\nSesi ini sekarang aktif di Browser Agent. Silakan ketik perintah untuk melanjutkan!`);
      return;
    }

    if (data === 'cmd_new_session') {
      startNewChat();
      await telegramSendMessageFromSidepanel(botToken, fromId, `✨ <b>Sesi Percakapan Baru Telah Dibuat!</b>\n\nTampilan Browser Agent telah di-reset ke sesi baru. Silakan ketik prompt atau instruksi Anda.`);
      return;
    }

    if (data === 'cmd_model') {
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config']);
      const cfg = storageData.browser_agent_config || config || {};
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const modelList = Array.isArray(cfg.models) && cfg.models.length > 0 ? cfg.models : (DEFAULT_MODELS_BY_PRESET[cfg.preset] || [{ id: cfg.model || "gemini-2.5-flash", name: cfg.model || "Default Model" }]);
      const keyboardRows = [
        [{ text: `🤖 AUTO (Smart Dynamic) ${activeTgCfg.auto_model ? '✓' : ''}`, callback_data: "set_model:auto" }]
      ];
      for (let i = 0; i < modelList.length; i += 2) {
        const row = [];
        const m1 = modelList[i];
        const m1Id = m1.id || m1;
        const m1Name = m1.name || m1Id;
        const isM1Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m1Id || cfg.model === m1Id);
        row.push({ text: `${isM1Active ? '🟢 ' : ''}${m1Name}`, callback_data: `set_model:${m1Id}` });
        if (i + 1 < modelList.length) {
          const m2 = modelList[i + 1];
          const m2Id = m2.id || m2;
          const m2Name = m2.name || m2Id;
          const isM2Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m2Id || cfg.model === m2Id);
          row.push({ text: `${isM2Active ? '🟢 ' : ''}${m2Name}`, callback_data: `set_model:${m2Id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessageFromSidepanel(botToken, fromId, `🧠 <b>Pilih Model AI:</b>\n\nModel aktif: <code>${activeTgCfg.auto_model ? 'AUTO' : (activeTgCfg.selected_model || cfg.model || 'Default')}</code>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (data === 'cmd_agent') {
      const storageData = await chrome.storage.local.get(['custom_agents', 'active_agent_id', 'telegram_bot_config']);
      const agents = Array.isArray(storageData.custom_agents) && storageData.custom_agents.length > 0 ? storageData.custom_agents : [{ id: "master_agent", name: "Master Agent" }];
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const keyboardRows = [
        [{ text: `🧠 AUTO (Delegasi Otomatis) ${activeTgCfg.auto_agent ? '✓' : ''}`, callback_data: "set_agent:auto" }]
      ];
      for (let i = 0; i < agents.length; i += 2) {
        const row = [];
        const a1 = agents[i];
        const isA1Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a1.id || storageData.active_agent_id === a1.id);
        row.push({ text: `${isA1Active ? '🟢 ' : ''}${a1.name}`, callback_data: `set_agent:${a1.id}` });
        if (i + 1 < agents.length) {
          const a2 = agents[i + 1];
          const isA2Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a2.id || storageData.active_agent_id === a2.id);
          row.push({ text: `${isA2Active ? '🟢 ' : ''}${a2.name}`, callback_data: `set_agent:${a2.id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessageFromSidepanel(botToken, fromId, `👥 <b>Pilih Spesialis Agent:</b>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (data === 'cmd_screenshot_tab') {
      await telegramSendMessageFromSidepanel(botToken, fromId, `📸 <i>Mengambil tangkapan layar tab Chrome...</i>`);
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        if (dataUrl) {
          const caption = `📸 <b>Screenshot Tab Chrome</b>\n<i>${escapeHtml(activeTab?.title || 'Chrome Tab')}</i>\nURL: <code>${escapeHtml(activeTab?.url || '-')}</code>`;
          await telegramSendPhotoFromSidepanel(botToken, fromId, dataUrl, caption);
        } else {
          await telegramSendMessageFromSidepanel(botToken, fromId, `⚠️ Gagal mengambil tangkapan layar tab.`);
        }
      } catch (err) {
        await telegramSendMessageFromSidepanel(botToken, fromId, `⚠️ Error screenshot tab: ${err.message}`);
      }
      return;
    }

    if (data === 'cmd_screenshot_os') {
      await telegramSendMessageFromSidepanel(botToken, fromId, `🖥️ <i>Mengambil screenshot Full Desktop Linux OS...</i>`);
      try {
        const rpcRes = await sendNativeRpc("capture_os_screenshot", {});
        if (rpcRes && rpcRes.status === "ok" && rpcRes.data_url) {
          const caption = `🖥️ <b>Fullscreen Linux OS Desktop Screenshot</b>\nWaktu: <code>${new Date().toLocaleString('id-ID')}</code>`;
          await telegramSendPhotoFromSidepanel(botToken, fromId, rpcRes.data_url, caption);
        } else {
          await telegramSendMessageFromSidepanel(botToken, fromId, `⚠️ Gagal mengambil screenshot OS: ${rpcRes?.error || 'Native Host error'}`);
        }
      } catch (err) {
        await telegramSendMessageFromSidepanel(botToken, fromId, `⚠️ Error screenshot OS: ${err.message}`);
      }
      return;
    }

    if (data.startsWith('set_model:')) {
      const selectedModel = data.replace('set_model:', '');
      tgCfg.auto_model = (selectedModel === 'auto');
      tgCfg.selected_model = (selectedModel === 'auto' ? '' : selectedModel);
      await chrome.storage.local.set({ telegram_bot_config: tgCfg });
      await telegramSendMessageFromSidepanel(botToken, fromId, `✅ <b>Model AI Berhasil Diganti:</b> <code>${escapeHtml(selectedModel === 'auto' ? 'AUTO (Smart Dynamic)' : selectedModel)}</code>`);
      return;
    }

    if (data.startsWith('set_agent:')) {
      const selectedAgent = data.replace('set_agent:', '');
      tgCfg.auto_agent = (selectedAgent === 'auto');
      tgCfg.selected_agent = (selectedAgent === 'auto' ? '' : selectedAgent);
      await chrome.storage.local.set({ telegram_bot_config: tgCfg });
      await telegramSendMessageFromSidepanel(botToken, fromId, `👥 <b>Spesialis Agent Berhasil Dipilih:</b> <code>${escapeHtml(selectedAgent === 'auto' ? 'AUTO (Delegasi Otomatis)' : selectedAgent)}</code>`);
      return;
    }
    return;
  }

  // 2. Handle Messages
  const msg = update.message;
  if (!msg || !msg.text) return;

  const senderId = String(msg.from?.id || msg.chat?.id || '');
  const senderName = msg.from?.first_name || 'User';
  const text = msg.text.trim();

  // If authorized_chat_id is empty, auto-detect on first message
  if (!tgCfg.authorized_chat_id) {
    tgCfg.authorized_chat_id = senderId;
    await chrome.storage.local.set({ telegram_bot_config: tgCfg });
    await telegramSendMessageFromSidepanel(botToken, senderId, `🎉 <b>Selamat Datang, ${escapeHtml(senderName)}!</b>\nID Akun Anda <code>${senderId}</code> telah berhasil didaftarkan sebagai pemilik resmi Browser Agent.`);
  }

  // Security Whitelist Filter
  if (String(tgCfg.authorized_chat_id) !== senderId) {
    await telegramSendMessageFromSidepanel(botToken, senderId, `⛔ <b>Akses Ditolak.</b> Bot ini diproteksi khusus untuk pemilik terdaftar.`);
    return;
  }

  // Handle Slash Commands
  if (text.startsWith('/')) {
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === '/start' || cmd === '/help') {
      const welcome = `🤖 <b>Browser Agent Remote Control Aktif!</b>\n\nHalo <b>${escapeHtml(senderName)}</b>, Anda dapat mengontrol browser dan mengeksekusi AI langsung dari chat ini.\n\n<b>Pilihan Perintah:</b>\n• /history - Daftar riwayat sesi chat & pindah sesi\n• /model - Ganti model AI aktif\n• /agent - Ganti spesialis agent\n• /screenshot - Ambil screenshot Tab Chrome\n• /screenshot_os - Ambil screenshot Full Desktop Linux\n• /status - Cek status tab & performa\n• /new - Mulai sesi percakapan baru\n\n<i>Atau langsung ketik perintah apa saja untuk dieksekusi di browser!</i>`;
      await telegramSendMessageFromSidepanel(botToken, senderId, welcome, {
        inline_keyboard: [
          [
            { text: "🗂️ Riwayat Sesi", callback_data: "cmd_history" },
            { text: "🤖 Model AI", callback_data: "cmd_model" }
          ],
          [
            { text: "👥 Spesialis Agent", callback_data: "cmd_agent" },
            { text: "📸 Screenshot Tab", callback_data: "cmd_screenshot_tab" }
          ],
          [
            { text: "🖥️ Screenshot OS Linux", callback_data: "cmd_screenshot_os" },
            { text: "✨ Sesi Baru", callback_data: "cmd_new_session" }
          ]
        ]
      });
      return;
    }

    if (cmd === '/history' || cmd === '/sessions') {
      await handleTelegramHistoryCommand(botToken, senderId);
      return;
    }

    if (cmd === '/new') {
      startNewChat();
      await telegramSendMessageFromSidepanel(botToken, senderId, `✨ <b>Sesi Percakapan Baru Telah Dibuat!</b>\n\nTampilan Browser Agent telah di-reset ke sesi baru. Silakan ketik prompt atau instruksi Anda.`);
      return;
    }

    if (cmd === '/model') {
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config']);
      const cfg = storageData.browser_agent_config || config || {};
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const modelList = Array.isArray(cfg.models) && cfg.models.length > 0 ? cfg.models : (DEFAULT_MODELS_BY_PRESET[cfg.preset] || [{ id: cfg.model || "gemini-2.5-flash", name: cfg.model || "Default Model" }]);
      const keyboardRows = [
        [{ text: `🤖 AUTO (Smart Dynamic) ${activeTgCfg.auto_model ? '✓' : ''}`, callback_data: "set_model:auto" }]
      ];
      for (let i = 0; i < modelList.length; i += 2) {
        const row = [];
        const m1 = modelList[i];
        const m1Id = m1.id || m1;
        const m1Name = m1.name || m1Id;
        const isM1Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m1Id || cfg.model === m1Id);
        row.push({ text: `${isM1Active ? '🟢 ' : ''}${m1Name}`, callback_data: `set_model:${m1Id}` });
        if (i + 1 < modelList.length) {
          const m2 = modelList[i + 1];
          const m2Id = m2.id || m2;
          const m2Name = m2.name || m2Id;
          const isM2Active = !activeTgCfg.auto_model && (activeTgCfg.selected_model === m2Id || cfg.model === m2Id);
          row.push({ text: `${isM2Active ? '🟢 ' : ''}${m2Name}`, callback_data: `set_model:${m2Id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessageFromSidepanel(botToken, senderId, `🧠 <b>Pilih Model AI:</b>\n\nModel aktif: <code>${activeTgCfg.auto_model ? 'AUTO' : (activeTgCfg.selected_model || cfg.model || 'Default')}</code>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (cmd === '/agent') {
      const storageData = await chrome.storage.local.get(['custom_agents', 'active_agent_id', 'telegram_bot_config']);
      const agents = Array.isArray(storageData.custom_agents) && storageData.custom_agents.length > 0 ? storageData.custom_agents : [{ id: "master_agent", name: "Master Agent" }];
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const keyboardRows = [
        [{ text: `🧠 AUTO (Delegasi Otomatis) ${activeTgCfg.auto_agent ? '✓' : ''}`, callback_data: "set_agent:auto" }]
      ];
      for (let i = 0; i < agents.length; i += 2) {
        const row = [];
        const a1 = agents[i];
        const isA1Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a1.id || storageData.active_agent_id === a1.id);
        row.push({ text: `${isA1Active ? '🟢 ' : ''}${a1.name}`, callback_data: `set_agent:${a1.id}` });
        if (i + 1 < agents.length) {
          const a2 = agents[i + 1];
          const isA2Active = !activeTgCfg.auto_agent && (activeTgCfg.selected_agent === a2.id || storageData.active_agent_id === a2.id);
          row.push({ text: `${isA2Active ? '🟢 ' : ''}${a2.name}`, callback_data: `set_agent:${a2.id}` });
        }
        keyboardRows.push(row);
      }
      await telegramSendMessageFromSidepanel(botToken, senderId, `👥 <b>Pilih Spesialis Agent:</b>`, { inline_keyboard: keyboardRows });
      return;
    }

    if (cmd === '/screenshot' || cmd === '/screenshot_tab') {
      await telegramSendMessageFromSidepanel(botToken, senderId, `📸 <i>Mengambil tangkapan layar tab Chrome...</i>`);
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
        if (dataUrl) {
          const caption = `📸 <b>Screenshot Tab Chrome</b>\n<i>${escapeHtml(activeTab?.title || 'Chrome Tab')}</i>\nURL: <code>${escapeHtml(activeTab?.url || '-')}</code>`;
          await telegramSendPhotoFromSidepanel(botToken, senderId, dataUrl, caption);
        } else {
          await telegramSendMessageFromSidepanel(botToken, senderId, `⚠️ Gagal mengambil snapshot tab.`);
        }
      } catch (err) {
        await telegramSendMessageFromSidepanel(botToken, senderId, `⚠️ Gagal mengambil screenshot tab: ${err.message}`);
      }
      return;
    }

    if (cmd === '/screenshot_os' || cmd === '/screenshot_fullscreen') {
      await telegramSendMessageFromSidepanel(botToken, senderId, `🖥️ <i>Mengambil screenshot Full Desktop Linux OS...</i>`);
      try {
        const rpcRes = await sendNativeRpc("capture_os_screenshot", {});
        if (rpcRes && rpcRes.status === "ok" && rpcRes.data_url) {
          const caption = `🖥️ <b>Fullscreen Linux OS Desktop Screenshot</b>\nWaktu: <code>${new Date().toLocaleString('id-ID')}</code>`;
          await telegramSendPhotoFromSidepanel(botToken, senderId, rpcRes.data_url, caption);
        } else {
          await telegramSendMessageFromSidepanel(botToken, senderId, `⚠️ Gagal mengambil screenshot OS Desktop: ${rpcRes?.error || 'Native Host Error'}`);
        }
      } catch (err) {
        await telegramSendMessageFromSidepanel(botToken, senderId, `⚠️ Error screenshot OS: ${err.message}`);
      }
      return;
    }

    if (cmd === '/status') {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      const storageData = await chrome.storage.local.get(['browser_agent_config', 'telegram_bot_config', 'custom_agents']);
      const cfg = storageData.browser_agent_config || config || {};
      const activeTgCfg = storageData.telegram_bot_config || tgCfg || {};
      const agents = Array.isArray(storageData.custom_agents) ? storageData.custom_agents : [];
      
      let realActiveModel = "";
      if (activeTgCfg.selected_model) {
        realActiveModel = activeTgCfg.selected_model;
      } else if (cfg.selectedModelChoice && cfg.selectedModelChoice !== "auto") {
        realActiveModel = cfg.selectedModelChoice;
      } else if (Array.isArray(cfg.models) && cfg.models.length > 0) {
        realActiveModel = cfg.models[0].id || cfg.models[0];
      } else {
        realActiveModel = cfg.model || "gemini-2.5-flash";
      }
      
      const modelDisplay = activeTgCfg.auto_model ? `AUTO (${realActiveModel})` : realActiveModel;
      const agentDisplay = activeTgCfg.auto_agent ? `AUTO (${agents[0]?.name || 'Master Agent'})` : (agents.find(a => a.id === activeTgCfg.selected_agent)?.name || 'Master Agent');

      const statusMsg = `📊 <b>Status Browser Agent:</b>\n\n• <b>Tab Aktif:</b> ${escapeHtml(activeTab?.title || 'None')}\n• <b>URL:</b> <code>${escapeHtml(activeTab?.url || '-')}</code>\n• <b>Sesi Chat:</b> <code>${escapeHtml(currentSessionTitle || 'New Chat')}</code>\n• <b>Model:</b> <code>${escapeHtml(modelDisplay)}</code>\n• <b>Agent:</b> <code>${escapeHtml(agentDisplay)}</code>\n• <b>Auto-Accept:</b> <code>${activeTgCfg.auto_accept ? 'ON (Otomatis)' : 'OFF (Safe Mode)'}</code>\n• <b>Status:</b> <code>Online 🟢</code>`;
      await telegramSendMessageFromSidepanel(botToken, senderId, statusMsg);
      return;
    }
  }

  // 3. User Prompt Execution (Direct Ingestion into Browser Agent)
  activeTelegramSession = { senderId, senderName, botToken, statusMessageId: null };
  updateTelegramLiveStatus(`⏳ <b>Browser Agent:</b> Memulai eksekusi instruksi...`).catch(() => {});

  if (chatInput) {
    chatInput.value = text;
  }
  hideClarificationDock();

  // If in welcome screen without session, create fresh session
  if (!currentSessionId) {
    currentSessionId = 'sess_' + Date.now();
    currentSessionTitle = text.slice(0, 45).trim();
    currentSessionCreatedAt = Date.now();
    updateHeaderChatTitle(currentSessionTitle);
  }

  // Ensure body has-messages is active so chat UI renders immediately
  document.body.classList.add('has-messages');
  if (welcomeCard) welcomeCard.style.display = 'none';

  if (currentChatMode === 'chat') {
    runChatModeLoop(text, [], []);
  } else {
    runAgentLoop(text, [], []);
  }
}

// Background Telegram Poller Daemon running in Sidepanel / NewTab
async function startTelegramPollingDaemonFromSidepanel() {
  if (telegramRemoteDaemonStarted) return;
  telegramRemoteDaemonStarted = true;

  while (true) {
    try {
      const storageData = await chrome.storage.local.get(['telegram_bot_config', 'telegram_poller_lease', 'telegram_last_update_id']);
      const tgCfg = storageData.telegram_bot_config;

      if (!tgCfg || !tgCfg.enabled || !tgCfg.bot_token) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // Check cooperative leader lease
      const now = Date.now();
      const lease = storageData.telegram_poller_lease;
      const isLeader = (lease && lease.id === sidepanelPollerInstanceId);
      const isExpired = (!lease || (now - (lease.time || 0) > 7000));

      if (!isLeader && !isExpired) {
        // Another instance is currently leader, standby
        await new Promise(r => setTimeout(r, 2500));
        continue;
      }

      // Claim / Renew lease
      await chrome.storage.local.set({
        telegram_poller_lease: { id: sidepanelPollerInstanceId, time: now }
      });

      const lastId = storageData.telegram_last_update_id || 0;
      const url = `https://api.telegram.org/bot${tgCfg.bot_token}/getUpdates?offset=${lastId + 1}&timeout=12`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.ok && Array.isArray(json.result) && json.result.length > 0) {
        let maxUpdateId = lastId;
        for (const update of json.result) {
          if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;
          await handleTelegramIncomingUpdateInSidepanel(update, tgCfg);
        }
        await chrome.storage.local.set({ telegram_last_update_id: maxUpdateId });
      }
    } catch (err) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Global listener for stop/pause execution
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
    openSettingsPage();
    appendAssistantMessage("⚠️ API Key belum diatur. Membuka halaman Pengaturan di tab baru untuk mengatur Provider AI Anda.");
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
    updateHeaderChatTitle(currentSessionTitle);
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
  saveAttachmentsToIndexedDB(attachments);

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
  
  // Dynamic Max Steps ceiling based on AI Thinking Level
  let maxSteps = 35;
  if (currentThinkingLevel === 'low') maxSteps = 15;
  else if (currentThinkingLevel === 'medium') maxSteps = 25;
  else if (currentThinkingLevel === 'high') maxSteps = 40;
  else if (currentThinkingLevel === 'xhigh') maxSteps = 60;
  else if (currentThinkingLevel === 'extreme' || currentThinkingLevel === 'max') maxSteps = 100;

  function detectPlannedStepsCount(text) {
    if (!text || typeof text !== 'string') return null;
    const matches = text.match(/(?:^|\n)\s*(?:[0-9]+\.|\b(?:Step|Langkah|Tahap)\s+[0-9]+[:\.\)])\s+[^\n]+/gi);
    if (matches && matches.length >= 2) {
      return matches.length;
    }
    const planTagMatch = text.match(/\[(?:PLAN|TOTAL\s*STEPS|RENCANA):\s*(\d+)\s*(?:STEPS|LANGKAH)?\]/i);
    if (planTagMatch && parseInt(planTagMatch[1], 10) > 0) {
      return parseInt(planTagMatch[1], 10);
    }
    return null;
  }

  let plannedStepsTotal = detectPlannedStepsCount(userMessage);
  let currentStep = 0;
  const sessionGeneratedImages = [];

  function ensureGeneratedImagesInText(text, images) {
    if (!images || images.length === 0) return text;
    let result = text || "";
    const missingImages = images.filter(img => img && img.image_url && !result.includes(img.image_url) && !result.includes(img.image_id));
    if (missingImages.length > 0) {
      const imgMd = missingImages.map(img => `![${img.prompt || 'AI Generated Image'}](${img.image_url})`).join('\n\n');
      result = result ? `${imgMd}\n\n${result}`.trim() : imgMd;
    }
    return result;
  }

  if (hasBoss && workerAgents.length > 0) {
    updateFooterStatus(`👑 Master Agent: Menugaskan ${workerAgents.length} agen spesialis...`);
    updateAssistantActiveAgent(assistantBubble, "Master Agent", `Menemukan ${workerAgents.length} Agen Spesialis`, true, false);
  }

  try {
    while (currentStep < maxSteps && isExecuting) {
      currentStep++;
      const stepStr = `Step ${currentStep}`;

      if (hasBoss) {
        updateFooterStatus(`👑 Master Agent (${stepStr})...`);
        notifyActiveTabExecutionState(true, currentStep, maxSteps, `Master Agent: ${stepStr}`);
        updateAssistantActiveAgent(assistantBubble, "Master Agent", `Mengarahkan tim eksekutor (${stepStr})...`, true, false);
      } else {
        updateFooterStatus(`${initialAgentName} (${stepStr})...`);
        notifyActiveTabExecutionState(true, currentStep, maxSteps, `${initialAgentName}: ${stepStr}`);
        updateAssistantActiveAgent(assistantBubble, initialAgentName, `Memproses (${stepStr})...`, false, false);
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

      const endpointUrl = getNormalizedChatEndpoint(config.endpoint);
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
      let lastErrorMessage = "";

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
            lastErrorMessage = errorMsg;

            if (isRetryableAIError(resp.status, errorMsg) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
              const nextModel = candidateModels[mIdx + 1];
              console.warn(`[Auto-Rotate] Model '${activeModelChoice}' error (${resp.status}: ${errorMsg}). Rotating to '${nextModel}'...`);
              updateFooterStatus(`🔄 Kendala pada ${activeModelChoice}: Beralih ke ${nextModel}...`);
              updateAssistantActiveAgent(assistantBubble, hasBoss ? "Master Agent" : initialAgentName, `🔄 Model \`${activeModelChoice}\` mengalami kendala (${resp.status}). Otomatis beralih ke \`${nextModel}\`...`, true, false);
              continue;
            }

            if (resp.status === 429) {
              throw new Error(`Rate Limit Exceeded (429): ${errorMsg || 'Kuota API limit atau rate limit tercapai. Silakan coba beberapa saat lagi.'}`);
            } else if (resp.status === 401) {
              throw new Error(`API Key Invalid (401): ${errorMsg || 'API Key salah atau belum diatur di Pengaturan.'}`);
            } else if (resp.status === 400) {
              throw new Error(`Bad Request / Limit (400): ${errorMsg || 'Panjang konteks atau format permintaan melampaui batas model.'}`);
            } else if (resp.status === 404) {
              throw new Error(`Model / Endpoint Not Found (404): ${errorMsg || 'Model atau URL endpoint tidak ditemukan.'}`);
            }
            throw new Error(`AI Request Error (${resp.status}): ${errorMsg}`);
          }

          response = resp;
          break;
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError' || !isExecuting) throw fetchErr;
          lastErrorMessage = fetchErr.message;
          if (isRetryableAIError(0, fetchErr.message) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
            const nextModel = candidateModels[mIdx + 1];
            console.warn(`[Auto-Rotate] Network/Connection Exception on '${activeModelChoice}'. Rotating to '${nextModel}'...`, fetchErr);
            updateFooterStatus(`🔄 Network issue: Beralih ke ${nextModel}...`);
            updateAssistantActiveAgent(assistantBubble, hasBoss ? "Master Agent" : initialAgentName, `🔄 Model \`${activeModelChoice}\` mengalami kendala koneksi. Otomatis beralih ke \`${nextModel}\`...`, true, false);
            continue;
          }
          throw fetchErr;
        }
      }

      if (!response) {
        throw new Error(lastErrorMessage || `Gagal menghubungi AI dengan model ${candidateModels.join(', ')}.`);
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
                    updateAssistantText(assistantBubble, ensureGeneratedImagesInText(accumulatedContent, sessionGeneratedImages), true);
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
          content: accumulatedContent ? ensureGeneratedImagesInText(accumulatedContent, sessionGeneratedImages) : null,
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
        if (message.content) {
          message.content = ensureGeneratedImagesInText(message.content, sessionGeneratedImages);
        }
        message.agentInfo = agentInfo;
      }

      if (!isExecuting || abortController?.signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      conversationHistory.push(message);

      const detectedInPlan = detectPlannedStepsCount(accumulatedContent || message.content);
      if (detectedInPlan && (!plannedStepsTotal || detectedInPlan > plannedStepsTotal)) {
        plannedStepsTotal = detectedInPlan;
      }

      // Finalize assistant text only if there are NO tool calls in this turn
      if (message.content && (!message.tool_calls || message.tool_calls.length === 0)) {
        updateAssistantText(assistantBubble, ensureGeneratedImagesInText(message.content, sessionGeneratedImages), false);
      }

      let shouldStopTurn = false;

      // Check if model called tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        if (!plannedStepsTotal || plannedStepsTotal < currentStep + message.tool_calls.length - 1) {
          plannedStepsTotal = Math.max(plannedStepsTotal || 0, currentStep + message.tool_calls.length - 1);
        }

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
          const stepStr = `Step ${currentStep}`;
          
          updateAssistantActiveAgent(assistantBubble, workerName, `Menjalankan ${badgeActionName}...`, isBossWorker, false);
          updateFooterStatus(`⚡ ${workerName}: ${badgeActionName} (${stepStr})...`);
          notifyActiveTabExecutionState(true, currentStep, maxSteps, `${workerName}: ${stepStr} • ${badgeActionName}`);

          // Broadcast live step progress to Telegram remote chat via in-place message edit (NO SPAM)
          if (activeTelegramSession && activeTelegramSession.botToken && activeTelegramSession.senderId) {
            let userFriendlyAction = badgeActionName;
            if (toolName === "browser_navigate") userFriendlyAction = `🌐 Membuka halaman web...`;
            else if (toolName === "browser_click") userFriendlyAction = `👆 Mengklik elemen pada layar...`;
            else if (toolName === "browser_type") userFriendlyAction = `⌨️ Mengetik teks...`;
            else if (toolName === "browser_control_media") userFriendlyAction = `▶️ Mengontrol pemutar media...`;
            else if (toolName === "browser_screenshot") userFriendlyAction = `📸 Mengambil screenshot visual...`;
            else if (toolName === "browser_snapshot") userFriendlyAction = `🔍 Memeriksa tampilan halaman...`;
            else if (toolName === "local_run_command") userFriendlyAction = `💻 Menjalankan perintah terminal...`;
            else if (toolName.startsWith("manage_") || toolName.startsWith("db_")) userFriendlyAction = `🧠 Mengakses memori agen...`;
            else userFriendlyAction = `⚡ Menjalankan aksi (${badgeActionName})...`;
            
            const statusText = `⏳ <b>${escapeHtml(workerName)}:</b> ${userFriendlyAction} (<i>${stepStr}</i>)`;
            updateTelegramLiveStatus(statusText).catch(() => {});
          }

          let toolOutput = "";
          let isImageGen = (toolName === "generate_image");
          let genImgResult = null;

          try {
            const toolResult = await executeTool(toolName, toolArgs, assistantBubble);
            if (isImageGen && toolResult?.image_url) {
              genImgResult = toolResult;
              if (!sessionGeneratedImages.some(img => img.image_id === toolResult.image_id)) {
                sessionGeneratedImages.push(toolResult);
              }
              const imgMarkdown = `![${toolResult.prompt || 'AI Image'}](${toolResult.image_url})`;
              updateAssistantText(assistantBubble, ensureGeneratedImagesInText("", sessionGeneratedImages));
              toolOutput = JSON.stringify({
                status: "success",
                image_id: toolResult.image_id,
                image_url: toolResult.image_url,
                display_url: toolResult.display_url,
                markdown: imgMarkdown,
                instruction: "WAJIB: Tampilkan gambar ini kepada pengguna dalam balasanmu dengan menyertakan markdown persis: " + imgMarkdown
              });
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
        const stepStr = `Step ${currentStep}`;
        updateAssistantActiveAgent(assistantBubble, "Master Agent", `Menyusun laporan akhir (${stepStr})...`, true, false);
        updateFooterStatus(`👑 Master Agent: Menyusun laporan akhir (${stepStr})...`);
        notifyActiveTabExecutionState(true, currentStep, maxSteps, `Master Agent: Menyusun laporan akhir (${stepStr})`);
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

        const endpointUrl = getNormalizedChatEndpoint(config.endpoint);
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
                    updateAssistantText(assistantBubble, ensureGeneratedImagesInText(synthContent, sessionGeneratedImages), true);
                  }
                } catch (e) {}
              }
            }
          }

          if (synthContent.trim().length > 0) {
            const finalSynth = ensureGeneratedImagesInText(synthContent, sessionGeneratedImages);
            updateAssistantText(assistantBubble, finalSynth, false);
            conversationHistory.push({
              role: "assistant",
              content: finalSynth,
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
            updateAssistantText(assistantBubble, ensureGeneratedImagesInText(fallbackMd, sessionGeneratedImages), false);
          }
        }
      } catch (synthErr) {
        console.warn("Auto synthesis turn warning:", synthErr);
      }
    }

    if (sessionGeneratedImages.length > 0) {
      const lastMsg = conversationHistory[conversationHistory.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && typeof lastMsg.content === 'string') {
        lastMsg.content = ensureGeneratedImagesInText(lastMsg.content, sessionGeneratedImages);
        updateAssistantText(assistantBubble, lastMsg.content, false);
      } else if (!lastMsg || lastMsg.role !== 'assistant') {
        const finalImgMd = sessionGeneratedImages.map(img => `![${img.prompt || 'AI Generated Image'}](${img.image_url})`).join('\n\n');
        updateAssistantText(assistantBubble, finalImgMd, false);
        conversationHistory.push({
          role: "assistant",
          content: finalImgMd,
          agentInfo: agentInfo
        });
      }
      hydrateLocalImages(assistantBubble);
    }

    if (contentEl) {
      const spinner = contentEl.querySelector('.tool-spinner');
      if (spinner) spinner.remove();
      const finalText = (contentEl.innerText || contentEl.textContent || "").trim();
      if (!finalText && sessionGeneratedImages.length === 0) {
        contentEl.style.display = 'none';
      }
    }

    const finalAgentName = hasBoss ? "Master Agent" : (resolvedAgents[0]?.name || "General Agent");
    updateAssistantActiveAgent(assistantBubble, finalAgentName, (currentExecutionMode === 'planning' && !isPlanApprovedRun) ? "Rencana Siap" : "Selesai", hasBoss, true);
    updateFooterStatus("Agent Ready");

    // Final Notification to Telegram Remote (In-Place Edit + Clean Completion)
    if (activeTelegramSession && activeTelegramSession.botToken && activeTelegramSession.senderId) {
      const finalMsg = conversationHistory[conversationHistory.length - 1]?.content || "Tugas browser telah berhasil diselesaikan!";
      const activeModelTag = typeof activeModelChoice !== 'undefined' ? activeModelChoice : 'Browser Agent';

      if (activeTelegramSession.statusMessageId) {
        await telegramEditMessageFromSidepanel(
          activeTelegramSession.botToken,
          activeTelegramSession.senderId,
          activeTelegramSession.statusMessageId,
          `✅ <b>Browser Agent:</b> Tugas selesai dijalankan!`
        );
      }

      await telegramSendMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, `🤖 <b>[${activeModelTag}]</b>\n\n${finalMsg}`);
      
      if (lastCapturedScreenshotDataUrl) {
        await telegramSendPhotoFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, lastCapturedScreenshotDataUrl, "📸 <b>Screenshot Hasil Tindakan Browser</b>");
        lastCapturedScreenshotDataUrl = null;
      }
      activeTelegramSession = null;
    }

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
      if (activeTelegramSession && activeTelegramSession.botToken && activeTelegramSession.senderId) {
        if (activeTelegramSession.statusMessageId) {
          await telegramEditMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, activeTelegramSession.statusMessageId, `⏹️ <i>Eksekusi browser dibatalkan.</i>`);
        } else {
          await telegramSendMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, `⏹️ <i>Eksekusi browser dibatalkan.</i>`);
        }
        activeTelegramSession = null;
      }
    } else {
      console.error("Agent Loop Error:", err);
      const friendlyMsg = formatFriendlyErrorMessage(err, config.endpoint, (typeof activeModelChoice !== 'undefined' ? activeModelChoice : ''));
      // Only render error card if there is no image already rendered in bubble
      const contentEl = assistantBubble?.querySelector('.message-content');
      if (!contentEl || !contentEl.querySelector('.generated-image-card')) {
        renderErrorCard(assistantBubble, friendlyMsg, true);
      }
      updateAssistantActiveAgent(assistantBubble, finalAgentName, "Error", hasBoss, true);
      updateFooterStatus("AI Error / Network Issue");
      if (activeTelegramSession && activeTelegramSession.botToken && activeTelegramSession.senderId) {
        if (activeTelegramSession.statusMessageId) {
          await telegramEditMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, activeTelegramSession.statusMessageId, `❌ <b>Gagal:</b> ${err.message || 'Terjadi kesalahan sistem'}`);
        } else {
          await telegramSendMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, `❌ <b>Gagal:</b> ${err.message || 'Terjadi kesalahan sistem'}`);
        }
        activeTelegramSession = null;
      }
    }
  } finally {
    isExecuting = false;
    abortController = null;
    updateSendButtonState(false);
    notifyActiveTabExecutionState(false);
    saveCurrentSessionToDB();
    await detachDebugger(activeTabId);
    await focusOwnAgentTab();
    scrollToBottom();
    setTimeout(() => {
      checkAndProcessNextPromptQueue();
    }, 350);
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
  const trigger = document.getElementById('btn-execution-mode-trigger');

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

  if (trigger) {
    trigger.classList.toggle('mode-accept', mode === 'accept');
    trigger.classList.toggle('mode-planning', mode === 'planning');
    trigger.title = (mode === 'accept') 
      ? 'Mode Eksekusi: Accept (Klik untuk beralih ke Planning)' 
      : 'Mode Eksekusi: Planning (Klik untuk beralih ke Accept)';
  }

  try {
    chrome.storage.local.set({ browser_agent_exec_mode: mode });
  } catch (e) {}
}

function initExecutionModeDropdown() {
  const trigger = document.getElementById('btn-execution-mode-trigger');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextMode = (currentExecutionMode === 'planning') ? 'accept' : 'planning';
    setExecutionMode(nextMode);
  });

  try {
    chrome.storage.local.get(['browser_agent_exec_mode'], (res) => {
      if (res && res.browser_agent_exec_mode) {
        setExecutionMode(res.browser_agent_exec_mode);
      } else {
        setExecutionMode('accept');
      }
    });
  } catch (e) {}
}

let autoSwitchTabEnabled = true;

function isAutoSwitchTabEnabled() {
  return autoSwitchTabEnabled !== false;
}

function setAutoSwitchTab(mode) {
  autoSwitchTabEnabled = (mode === 'on' || mode === true);
  const label = document.getElementById('switch-tab-mode-label');
  const iconContainer = document.getElementById('switch-tab-mode-icon');
  const trigger = document.getElementById('btn-switch-tab-mode-trigger');

  if (label) {
    label.textContent = autoSwitchTabEnabled ? 'Switch Tab: ON' : 'Switch Tab: OFF';
  }

  if (iconContainer) {
    if (autoSwitchTabEnabled) {
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      `;
    } else {
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
      `;
    }
  }

  if (trigger) {
    trigger.classList.toggle('is-on', autoSwitchTabEnabled);
    trigger.classList.toggle('is-off', !autoSwitchTabEnabled);
    trigger.title = autoSwitchTabEnabled 
      ? 'Auto Switch Tab: ON (Klik untuk mematikan ke OFF)' 
      : 'Auto Switch Tab: OFF (Klik untuk menyalakan ke ON)';
  }

  try {
    chrome.storage.local.set({ browser_agent_auto_switch_tab: autoSwitchTabEnabled });
  } catch (e) {}
}

function initSwitchTabDropdown() {
  const trigger = document.getElementById('btn-switch-tab-mode-trigger');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    setAutoSwitchTab(!autoSwitchTabEnabled);
  });

  try {
    chrome.storage.local.get(['browser_agent_auto_switch_tab'], (res) => {
      if (res && res.browser_agent_auto_switch_tab !== undefined) {
        setAutoSwitchTab(res.browser_agent_auto_switch_tab);
      } else {
        setAutoSwitchTab(true);
      }
    });
  } catch (e) {}
}

let stickmanAnimationEnabled = true;

function setStickmanAnimation(enabled) {
  stickmanAnimationEnabled = (enabled === true || enabled === 'on');
  const label = document.getElementById('stickman-mode-label');
  const trigger = document.getElementById('btn-stickman-mode-trigger');

  if (label) {
    label.textContent = stickmanAnimationEnabled ? 'Stickman: ON' : 'Stickman: OFF';
  }

  if (trigger) {
    trigger.classList.toggle('is-on', stickmanAnimationEnabled);
    trigger.classList.toggle('is-off', !stickmanAnimationEnabled);
    trigger.title = stickmanAnimationEnabled
      ? 'Animasi Stickman: ON (Klik untuk mematikan ke OFF)'
      : 'Animasi Stickman: OFF (Klik untuk menyalakan ke ON)';
  }

  if (!stickmanAnimationEnabled && typeof window.stopStickmanSwarmAnimation === 'function') {
    window.stopStickmanSwarmAnimation();
  }

  try {
    chrome.storage.local.set({ setting_stickman_animation: stickmanAnimationEnabled });
    chrome.storage.local.get(['browser_agent_config'], (cfgRes) => {
      if (cfgRes && cfgRes.browser_agent_config) {
        cfgRes.browser_agent_config.stickmanAnimation = stickmanAnimationEnabled;
        chrome.storage.local.set({ browser_agent_config: cfgRes.browser_agent_config });
      }
    });
  } catch (e) {}
}

function initStickmanToggle() {
  const trigger = document.getElementById('btn-stickman-mode-trigger');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    setStickmanAnimation(!stickmanAnimationEnabled);
  });

  try {
    chrome.storage.local.get(['setting_stickman_animation', 'browser_agent_config'], (res) => {
      if (res && res.setting_stickman_animation !== undefined) {
        setStickmanAnimation(res.setting_stickman_animation);
      } else if (res && res.browser_agent_config && res.browser_agent_config.stickmanAnimation !== undefined) {
        setStickmanAnimation(res.browser_agent_config.stickmanAnimation);
      } else {
        setStickmanAnimation(true);
      }
    });
  } catch (e) {}
}

const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    logo: 'icons/search-engines/google.svg',
    placeholder: 'Cari di Google atau ketik URL web...',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    logo: 'icons/search-engines/duckduckgo.svg',
    placeholder: 'Cari di DuckDuckGo atau ketik URL web...',
    searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
  },
  bing: {
    name: 'Bing',
    logo: 'icons/search-engines/bing.svg',
    placeholder: 'Cari di Bing atau ketik URL web...',
    searchUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`
  },
  brave: {
    name: 'Brave Search',
    logo: 'icons/search-engines/brave.svg',
    placeholder: 'Cari di Brave Search atau ketik URL web...',
    searchUrl: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`
  },
  ecosia: {
    name: 'Ecosia',
    logo: 'icons/search-engines/ecosia.svg',
    placeholder: 'Cari di Ecosia atau ketik URL web...',
    searchUrl: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`
  },
  yandex: {
    name: 'Yandex',
    logo: 'icons/search-engines/yandex.svg',
    placeholder: 'Cari di Yandex atau ketik URL web...',
    searchUrl: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`
  }
};

let currentSearchEngine = 'google';

function setSearchEngine(engineKey) {
  if (!SEARCH_ENGINES[engineKey]) engineKey = 'google';
  currentSearchEngine = engineKey;
  const info = SEARCH_ENGINES[engineKey];

  const iconEl = document.getElementById('search-engine-icon');
  if (iconEl && info.logo) {
    iconEl.innerHTML = `<img class="engine-trigger-logo" src="${info.logo}" alt="${escapeHtml(info.name)}" width="13" height="13">`;
  }

  const labelEl = document.getElementById('search-engine-label');
  if (labelEl) labelEl.textContent = info.name;

  if (currentChatMode === 'websearch' && chatInput) {
    chatInput.placeholder = info.placeholder;
  }

  // Update active status in dropup list
  document.querySelectorAll('.engine-dropup-item').forEach(item => {
    if (item.getAttribute('data-engine') === engineKey) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  try {
    chrome.storage.local.set({ browser_agent_search_engine: engineKey });
  } catch (e) {}
}

function initSearchEngineDropdown() {
  const trigger = document.getElementById('btn-search-engine-trigger');
  const dropup = document.getElementById('search-engine-dropup');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dropup) return;
    const isHidden = (dropup.style.display === 'none' || !dropup.style.display);
    dropup.style.display = isHidden ? 'flex' : 'none';
    trigger.classList.toggle('open', isHidden);
  });

  document.querySelectorAll('.engine-dropup-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const engine = item.getAttribute('data-engine');
      if (engine) setSearchEngine(engine);
      if (dropup) dropup.style.display = 'none';
      trigger?.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (dropup && !dropup.contains(e.target) && !trigger?.contains(e.target)) {
      dropup.style.display = 'none';
      trigger?.classList.remove('open');
    }
  });

  try {
    chrome.storage.local.get(['browser_agent_search_engine'], (res) => {
      if (res && res.browser_agent_search_engine) {
        setSearchEngine(res.browser_agent_search_engine);
      } else {
        setSearchEngine('google');
      }
    });
  } catch (e) {
    setSearchEngine('google');
  }
}

function setThinkingLevel(level) {
  if (!['low', 'medium', 'high', 'xhigh', 'extreme', 'max'].includes(level)) level = 'high';
  currentThinkingLevel = level;

  const labels = {
    low: "Thinking: Low",
    medium: "Thinking: Medium",
    high: "Thinking: High",
    xhigh: "Thinking: Xhigh",
    extreme: "Thinking: Extreme",
    max: "Thinking: Extreme"
  };

  const labelEl = document.getElementById('thinking-level-label');
  if (labelEl) labelEl.textContent = labels[level] || "Thinking: High";

  document.querySelectorAll('.thinking-level-option').forEach(opt => {
    const optLvl = opt.getAttribute('data-level');
    if (optLvl === level || (level === 'extreme' && optLvl === 'max') || (level === 'max' && optLvl === 'extreme')) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  try {
    chrome.storage.local.set({ browser_agent_thinking_level: level });
  } catch (e) {}
}

function initThinkingLevelDropdown() {
  const trigger = document.getElementById('btn-thinking-level-trigger');
  const dropup = document.getElementById('thinking-level-dropup-menu');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dropup) return;
    const isHidden = (dropup.style.display === 'none' || !dropup.style.display);
    
    // Close other dropups if open
    const modeDropup = document.getElementById('chat-mode-dropup-menu');
    const searchDropup = document.getElementById('search-engine-dropup');
    if (modeDropup) modeDropup.style.display = 'none';
    document.getElementById('btn-chat-mode-trigger')?.classList.remove('open');
    if (searchDropup) searchDropup.style.display = 'none';
    document.getElementById('btn-search-engine-trigger')?.classList.remove('open');

    dropup.style.display = isHidden ? 'flex' : 'none';
    trigger.classList.toggle('open', isHidden);
  });

  document.querySelectorAll('.thinking-level-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedLevel = opt.getAttribute('data-level');
      if (selectedLevel) {
        setThinkingLevel(selectedLevel);
      }
      if (dropup) dropup.style.display = 'none';
      trigger?.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (dropup && !dropup.contains(e.target) && !trigger?.contains(e.target)) {
      dropup.style.display = 'none';
      trigger?.classList.remove('open');
    }
  });

  try {
    chrome.storage.local.get(['browser_agent_thinking_level'], (res) => {
      if (res && res.browser_agent_thinking_level) {
        setThinkingLevel(res.browser_agent_thinking_level);
      } else {
        setThinkingLevel('high');
      }
    });
  } catch (e) {
    setThinkingLevel('high');
  }
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

// =========================================================================
// Silky-Smooth Cyber Decipher Wave Animation (Anti-Jitter)
// =========================================================================
const SLEEK_GLITCH_CHARS = '01—+_/\<>*~';

function scrambleText(element, targetHTML, duration = 340) {
  if (!element) return;
  
  if (element._scrambleTimer) {
    cancelAnimationFrame(element._scrambleTimer);
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = targetHTML;
  const targetText = tempDiv.textContent;
  const oldText = element.textContent || '';
  
  const startTime = performance.now();
  const targetLen = targetText.length;

  function updateScramble(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const wavePos = progress * (targetLen + 4);

    let output = '';
    for (let i = 0; i < targetLen; i++) {
      const charTarget = targetText[i];
      if (charTarget === ' ') {
        output += ' ';
        continue;
      }

      if (i < wavePos - 3) {
        output += charTarget;
      } else if (i <= wavePos) {
        output += SLEEK_GLITCH_CHARS[Math.floor(Math.random() * SLEEK_GLITCH_CHARS.length)];
      } else {
        output += (i < oldText.length && oldText[i] !== ' ') ? oldText[i] : SLEEK_GLITCH_CHARS[Math.floor(Math.random() * SLEEK_GLITCH_CHARS.length)];
      }
    }

    if (progress >= 1) {
      element.innerHTML = targetHTML;
      element._scrambleTimer = null;
    } else {
      if (targetHTML.includes('hero-highlight')) {
        const highlightMatch = targetHTML.match(/<span class="hero-highlight">(.*?)<\/span>/);
        if (highlightMatch) {
          const highlightWord = highlightMatch[1];
          const highlightIndex = targetText.indexOf(highlightWord);
          if (highlightIndex !== -1) {
            const before = output.slice(0, highlightIndex);
            const mid = output.slice(highlightIndex, highlightIndex + highlightWord.length);
            const after = output.slice(highlightIndex + highlightWord.length);
            element.innerHTML = `${before}<span class="hero-highlight">${mid}</span>${after}`;
          } else {
            element.textContent = output;
          }
        } else {
          element.textContent = output;
        }
      } else {
        element.textContent = output;
      }
      element._scrambleTimer = requestAnimationFrame(updateScramble);
    }
  }

  element._scrambleTimer = requestAnimationFrame(updateScramble);
}

function updateHeroSubtitleSmooth(element, newText) {
  if (!element || element.textContent === newText) return;
  element.style.opacity = '0';
  element.style.transform = 'translateY(3px)';
  setTimeout(() => {
    element.textContent = newText;
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, 140);
}

const CHAT_MODES_CONFIG = {
  agent: {
    key: 'agent',
    name: 'Agent Mode',
    icon: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/></svg>`
  },
  chat: {
    key: 'chat',
    name: 'Chat Mode',
    icon: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
  },
  websearch: {
    key: 'websearch',
    name: 'Web Search',
    icon: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
  }
};

function setChatMode(mode) {
  if (mode !== 'chat' && mode !== 'agent' && mode !== 'websearch') mode = 'agent';
  currentChatMode = mode;
  
  const iconEl = document.getElementById('chat-mode-trigger-icon');
  const labelEl = document.getElementById('chat-mode-trigger-label');
  const modeInfo = CHAT_MODES_CONFIG[mode] || CHAT_MODES_CONFIG.agent;

  if (iconEl) iconEl.innerHTML = modeInfo.icon;
  if (labelEl) labelEl.textContent = modeInfo.name;

  // Update active state in dropup menu options
  document.querySelectorAll('.chat-mode-option').forEach(opt => {
    if (opt.getAttribute('data-mode') === mode) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  const inputContainer = document.getElementById('chat-input-container');
  const agentStatusEl = document.getElementById('agent-status-text');
  const btnSendEl = document.getElementById('btn-send');
  const heroTitleEl = document.querySelector('.hero-title');
  const heroSubtitleEl = document.querySelector('.hero-subtitle');

  inputContainer?.classList.remove('mode-websearch');

  if (mode === 'websearch') {
    inputContainer?.classList.add('mode-websearch');
    const activeEngine = SEARCH_ENGINES[currentSearchEngine] || SEARCH_ENGINES.google;
    if (chatInput) chatInput.placeholder = activeEngine.placeholder;
    if (agentStatusEl) agentStatusEl.textContent = 'Web Search';
    if (btnSendEl) btnSendEl.title = `Cari di ${activeEngine.name}`;
    if (heroTitleEl) scrambleText(heroTitleEl, 'Search the web or <span class="hero-highlight">find anything</span> online', 340);
    if (heroSubtitleEl) updateHeroSubtitleSmooth(heroSubtitleEl, 'Instant Google search, website navigation, and smart suggestions.');
    clearAttachments();
    clearMentionAgents();
  } else if (mode === 'chat') {
    if (chatInput) chatInput.placeholder = 'Ketik pesan chat di sini...';
    if (agentStatusEl) agentStatusEl.textContent = 'Chat Ready';
    if (btnSendEl) btnSendEl.title = 'Kirim Pesan';
    if (heroTitleEl) scrambleText(heroTitleEl, 'What would you like to <span class="hero-highlight">talk about</span> today?', 340);
    if (heroSubtitleEl) updateHeroSubtitleSmooth(heroSubtitleEl, 'Chat freely with your personal AI assistant — fast, direct, and conversational.');
    hideWebSearchSuggestions();
  } else {
    if (chatInput) chatInput.placeholder = 'Ketik perintah atau drop/paste gambar di sini...';
    if (agentStatusEl) agentStatusEl.textContent = 'Agent Ready';
    if (btnSendEl) btnSendEl.title = 'Kirim Perintah';
    if (heroTitleEl) scrambleText(heroTitleEl, 'What should your agent <span class="hero-highlight">work on</span> next?', 340);
    if (heroSubtitleEl) updateHeroSubtitleSmooth(heroSubtitleEl, 'Pick Browser Agent or any specialist, then start a task — all without leaving this tab.');
    hideWebSearchSuggestions();
  }

  if (mode !== 'websearch') {
    try {
      chrome.storage.local.set({ browser_agent_mode: mode });
    } catch (e) {}
  }

  adjustChatInputHeight();
}

function initChatModeDropdown() {
  const trigger = document.getElementById('btn-chat-mode-trigger');
  const dropup = document.getElementById('chat-mode-dropup-menu');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dropup) return;
    const isHidden = (dropup.style.display === 'none' || !dropup.style.display);
    dropup.style.display = isHidden ? 'flex' : 'none';
    trigger.classList.toggle('open', isHidden);
  });

  document.querySelectorAll('.chat-mode-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedMode = opt.getAttribute('data-mode');
      if (selectedMode) {
        setChatMode(selectedMode);
      }
      if (dropup) dropup.style.display = 'none';
      trigger?.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (dropup && !dropup.contains(e.target) && !trigger?.contains(e.target)) {
      dropup.style.display = 'none';
      trigger?.classList.remove('open');
    }
  });
}

async function runChatModeLoop(userMessage, attachments = [], explicitMentions = []) {
  try {
    const stored = await chrome.storage.local.get(["browser_agent_config"]);
    if (stored && stored.browser_agent_config) {
      config = { ...config, ...stored.browser_agent_config };
    }
  } catch (e) {}

  if (!config.apiKey && config.preset !== "ollama" && config.preset !== "9router") {
    openSettingsPage();
    appendAssistantMessage("⚠️ API Key belum diatur. Membuka halaman Pengaturan di tab baru untuk mengatur Provider AI Anda.");
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
    updateHeaderChatTitle(currentSessionTitle);
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
      const endpointUrl = getNormalizedChatEndpoint(config.endpoint);
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
      let lastErrorMessage = "";

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
            lastErrorMessage = errorMsg;

            if (isRetryableAIError(resp.status, errorMsg) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
              const nextModel = candidateModels[mIdx + 1];
              console.warn(`[Auto-Rotate Chat] Model '${activeModelChoice}' error (${resp.status}: ${errorMsg}). Rotating to '${nextModel}'...`);
              updateAssistantText(assistantBubble, `*🔄 Model \`${activeModelChoice}\` mengalami kendala. Otomatis beralih ke \`${nextModel}\`...*\n\n`, true);
              continue;
            }

            if (resp.status === 429) {
              throw new Error(`Rate Limit Exceeded (429): ${errorMsg || 'Kuota API limit atau rate limit tercapai. Silakan coba beberapa saat lagi.'}`);
            } else if (resp.status === 401) {
              throw new Error(`API Key Invalid (401): ${errorMsg || 'API Key salah atau belum diatur di Pengaturan.'}`);
            }
            throw new Error(`AI Request Error (${resp.status}): ${errorMsg}`);
          }

          response = resp;
          break;
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError' || !isExecuting) throw fetchErr;
          lastErrorMessage = fetchErr.message;
          if (isRetryableAIError(0, fetchErr.message) && mIdx < candidateModels.length - 1 && config.autoRotateModel !== false) {
            const nextModel = candidateModels[mIdx + 1];
            console.warn(`[Auto-Rotate Chat] Connection Exception on '${activeModelChoice}'. Rotating to '${nextModel}'...`, fetchErr);
            updateAssistantText(assistantBubble, `*🔄 Kendala koneksi pada \`${activeModelChoice}\`. Mencoba \`${nextModel}\`...*\n\n`, true);
            continue;
          }
          throw fetchErr;
        }
      }

      if (!response) {
        throw new Error(lastErrorMessage || `Gagal menghubungi AI dengan model ${candidateModels.join(', ')}.`);
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

      // Telegram Remote Notification from Chat Mode
      if (activeTelegramSession && activeTelegramSession.botToken && activeTelegramSession.senderId) {
        if (switchMatch) {
          const targetPrompt = switchMatch[1].trim() || userMessage;
          await telegramSendMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, `🔄 <i>Perintah memerlukan otomatisasi browser. Otomatis beralih ke Mode Agent untuk mengeksekusi...</i>`);
          setChatMode("agent");
          runAgentLoop(targetPrompt, attachments);
          return;
        } else {
          await telegramSendMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, `🤖 <b>[Browser Agent]</b>\n\n${cleanFinalText || accumulatedContent}`);
          activeTelegramSession = null;
        }
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
      if (activeTelegramSession && activeTelegramSession.botToken && activeTelegramSession.senderId) {
        await telegramSendMessageFromSidepanel(activeTelegramSession.botToken, activeTelegramSession.senderId, `❌ <b>Gagal Menjawab Chat:</b>\n${err.message || 'Terjadi kesalahan'}`);
        activeTelegramSession = null;
      }
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
        const friendlyMsg = formatFriendlyErrorMessage(err, config.endpoint, (typeof activeModelChoice !== 'undefined' ? activeModelChoice : ''));
        if (contentEl) {
          contentEl.style.display = 'block';
          contentEl.innerHTML = `<div class="error-msg-box" style="color: #EF4444; font-size: 13px; font-weight: 500; line-height: 1.5; padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">${escapeHtml(friendlyMsg)}</div>`;
        }
        updateFooterStatus("AI Error / Network Issue");
      }
    } finally {
      isExecuting = false;
      updateSendButtonState(false);
      abortController = null;
      await focusOwnAgentTab();
      scrollToBottom();
      setTimeout(() => {
        checkAndProcessNextPromptQueue();
      }, 350);
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
        const imgId = att.id || ('att_img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
        const imgSrc = att.dataUrl || att.thumbnailUrl || "";
        attachmentsHtml += `
          <div class="user-attached-thumb" data-image-id="${escapeHtml(imgId)}" title="${escapeHtml(att.name || 'Image')}">
            <img src="${imgSrc || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" alt="${escapeHtml(att.name || 'Image')}" ${!imgSrc ? 'style="opacity: 0; transition: opacity 0.2s;"' : ''}>
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
        const sizeStr = formatFileSize(att.size || (att.text ? att.text.length : 0));
        attachmentsHtml += `
          <div class="user-attached-file-pill" title="${escapeHtml(att.name || 'File')}">
            <div class="attached-file-icon-wrapper">
              ${getMacOsFileIconSvg(att.name || 'File', 18, 22)}
            </div>
            <div class="attached-file-info">
              <span class="attached-file-name">${escapeHtml(att.name || 'File')}</span>
              ${sizeStr ? `<span class="attached-file-size">${sizeStr}</span>` : ''}
            </div>
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
  const id = String(agent?.id || '').toLowerCase();
  const name = String(agent?.name || '').toLowerCase();
  const desc = String(agent?.description || '').toLowerCase();

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
  const target = String(agentName || '').trim().toLowerCase();

  treeItems.forEach(item => {
    const nameEl = item.querySelector('.tree-agent-name');
    const badgeEl = item.querySelector('.tree-agent-badge');
    const itemAgentId = item.dataset.agentId ? String(item.dataset.agentId).toLowerCase() : '';
    const itemAgentName = nameEl ? String(nameEl.textContent).trim().toLowerCase() : '';

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
  const contentEl = bubble?.querySelector('.message-content');
  const actionsEl = bubble?.querySelector('.message-actions');
  if (contentEl) {
    contentEl.style.display = 'block';
    const formatted = formatMarkdown(text);
    if (isStreaming) {
      contentEl.innerHTML = formatted + '<span class="streaming-cursor"></span>';
      hydrateLocalImages(bubble);
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
  if (!btnSend) return;
  if (loading) {
    btnSend.classList.add('loading');
    btnSend.title = "Batalkan eksekusi (Cancel)";
    if (!window.location.pathname.includes('sidepanel.html') && stickmanAnimationEnabled && typeof window.startStickmanSwarmAnimation === 'function') {
      window.startStickmanSwarmAnimation();
    }
  } else {
    btnSend.classList.remove('loading');
    btnSend.classList.remove('has-queue-input');
    btnSend.title = "Kirim perintah (Enter)";
    if (typeof window.stopStickmanSwarmAnimation === 'function') {
      window.stopStickmanSwarmAnimation();
    }
  }
  syncQueueButtonMorphState();
}

function syncQueueButtonMorphState() {
  if (!btnSend) return;
  const text = chatInput ? chatInput.value.trim() : '';
  const hasInput = (text.length > 0 || pendingAttachments.length > 0 || selectedMentionAgents.length > 0);

  if (isExecuting && hasInput) {
    btnSend.classList.add('has-queue-input');
    btnSend.title = "Masukkan ke Antrean Prompt (Add to Queue)";
  } else {
    btnSend.classList.remove('has-queue-input');
    if (isExecuting) {
      btnSend.title = "Batalkan eksekusi (Cancel)";
    } else {
      btnSend.title = "Kirim perintah (Enter)";
    }
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
    const isStickman = document.body.classList.contains('stickman-active');
    const scrollTarget = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      chatMessages ? chatMessages.scrollHeight : 0
    );
    const extraOffset = isStickman ? 220 : 160;
    window.scrollTo({
      top: scrollTarget + extraOffset,
      behavior: smooth ? 'smooth' : 'auto'
    });
  } catch (e) {
    window.scrollTo(0, (document.body.scrollHeight || 0) + (document.body.classList.contains('stickman-active') ? 220 : 160));
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

function formatFileSize(bytes) {
  if (!bytes || typeof bytes !== 'number' || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMacOsFileIconSvg(fileName, width = 20, height = 24) {
  const name = String(fileName || 'file.txt');
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  
  let tag = ext.toUpperCase();
  let tagBg = '#3B82F6';
  let tagColor = '#FFFFFF';
  let docBg = '#18181B';
  let docStroke = 'rgba(255, 255, 255, 0.22)';
  let cornerFold = '#27272A';

  switch (ext) {
    case 'md':
    case 'markdown':
      tag = 'MD';
      tagBg = '#0284C7'; // Cyan / Sky Blue
      docBg = '#0C1929';
      docStroke = 'rgba(56, 189, 248, 0.4)';
      cornerFold = '#163352';
      break;
    case 'pdf':
      tag = 'PDF';
      tagBg = '#DC2626'; // Apple PDF Red
      docBg = '#261214';
      docStroke = 'rgba(239, 68, 68, 0.4)';
      cornerFold = '#451A1E';
      break;
    case 'txt':
    case 'log':
    case 'rtf':
      tag = 'TXT';
      tagBg = '#D97706'; // Amber / Slate
      docBg = '#1F1A14';
      docStroke = 'rgba(245, 158, 11, 0.4)';
      cornerFold = '#3B2E1C';
      break;
    case 'json':
      tag = '{ }';
      tagBg = '#CA8A04'; // Yellow Gold
      docBg = '#1F1B12';
      docStroke = 'rgba(234, 179, 8, 0.4)';
      cornerFold = '#3B3319';
      break;
    case 'js':
    case 'mjs':
    case 'cjs':
      tag = 'JS';
      tagBg = '#EAB308'; // JS Yellow
      tagColor = '#000000';
      docBg = '#1F1C12';
      docStroke = 'rgba(250, 204, 21, 0.4)';
      cornerFold = '#3D3517';
      break;
    case 'ts':
    case 'tsx':
      tag = 'TS';
      tagBg = '#2563EB'; // TypeScript Blue
      docBg = '#0E172E';
      docStroke = 'rgba(59, 130, 246, 0.4)';
      cornerFold = '#192C59';
      break;
    case 'jsx':
      tag = 'JSX';
      tagBg = '#0891B2';
      docBg = '#0B232E';
      docStroke = 'rgba(6, 182, 212, 0.4)';
      cornerFold = '#134054';
      break;
    case 'py':
      tag = 'PY';
      tagBg = '#0284C7';
      docBg = '#0E1A29';
      docStroke = 'rgba(56, 189, 248, 0.4)';
      cornerFold = '#16314F';
      break;
    case 'html':
    case 'htm':
      tag = '< >';
      tagBg = '#EA580C'; // HTML Orange
      docBg = '#261610';
      docStroke = 'rgba(249, 115, 22, 0.4)';
      cornerFold = '#472416';
      break;
    case 'css':
    case 'scss':
    case 'less':
      tag = 'CSS';
      tagBg = '#0891B2';
      docBg = '#0B232E';
      docStroke = 'rgba(6, 182, 212, 0.4)';
      cornerFold = '#134054';
      break;
    case 'sh':
    case 'bash':
    case 'zsh':
      tag = 'SH';
      tagBg = '#059669'; // Terminal Emerald
      docBg = '#0B241C';
      docStroke = 'rgba(16, 185, 129, 0.4)';
      cornerFold = '#124233';
      break;
    case 'csv':
    case 'tsv':
    case 'xlsx':
    case 'xls':
      tag = ext === 'csv' ? 'CSV' : 'XLS';
      tagBg = '#059669'; // Spreadsheet Green
      docBg = '#0B241C';
      docStroke = 'rgba(16, 185, 129, 0.4)';
      cornerFold = '#124233';
      break;
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      tag = 'ZIP';
      tagBg = '#7C3AED'; // Archive Purple
      docBg = '#1B132E';
      docStroke = 'rgba(139, 92, 246, 0.4)';
      cornerFold = '#321F59';
      break;
    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'ogg':
    case 'flac':
      tag = '♫';
      tagBg = '#DB2777'; // Audio Pink
      docBg = '#261120';
      docStroke = 'rgba(236, 72, 153, 0.4)';
      cornerFold = '#471B39';
      break;
    default:
      tag = (tag.length > 4 ? tag.slice(0, 3) : tag) || 'DOC';
      tagBg = '#475569';
      docBg = '#18181B';
      docStroke = 'rgba(255, 255, 255, 0.22)';
      cornerFold = '#27272A';
      break;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="macos-doc-icon" style="flex-shrink:0; display:block;">
      <path d="M2.5 3C2.5 1.89543 3.39543 1 4.5 1H13L17.5 5.5V21C17.5 22.1046 16.6046 23 15.5 23H4.5C3.39543 23 2.5 22.1046 2.5 21V3Z" fill="${docBg}" stroke="${docStroke}" stroke-width="1.1"/>
      <path d="M13 1V5C13 5.55228 13.4477 6 14 6H17.5" fill="${cornerFold}" stroke="${docStroke}" stroke-width="1.1" stroke-linejoin="round"/>
      <line x1="5.5" y1="8" x2="11" y2="8" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-linecap="round"/>
      <line x1="5.5" y1="11" x2="14.5" y2="11" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-linecap="round"/>
      <line x1="5.5" y1="14" x2="13" y2="14" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-linecap="round"/>
      <rect x="3.5" y="16.2" width="13" height="5.5" rx="1.8" fill="${tagBg}"/>
      <text x="10" y="20.4" fill="${tagColor}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Roboto, sans-serif" font-size="3.6" font-weight="800" text-anchor="middle" letter-spacing="0.2">${tag}</text>
    </svg>
  `;
}

function parseLatexMath(str) {
  if (!str || (!str.includes('$') && !str.includes('\\'))) return str;
  let res = str;

  function convertMathTokens(expr) {
    let s = expr;
    // 0. Clean LaTeX delimiters \left and \right
    s = s.replace(/\\left\s*([(\[{|.\\])/g, '$1');
    s = s.replace(/\\right\s*([)\]}|.\\])/g, '$1');
    s = s.replace(/\\left\b/g, '');
    s = s.replace(/\\right\b/g, '');

    // 1. Text wrappers: \text{...}, \mathrm{...}, \mathbf{...}, \textbf{...}, \textit{...}
    s = s.replace(/\\(?:text|mathrm|mathbf|textbf|textit|textsf)\{([^}]+)\}/g, '$1');
    
    // 2. Fractions: \frac{a}{b} -> a/b
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
    
    // 3. Square root: \sqrt{a} -> √a or √(a)
    s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

    // 4. Common operators & symbols
    const symbolMap = [
      [/\\ge\b|\\geq\b/g, '≥'],
      [/\\le\b|\\leq\b/g, '≤'],
      [/\\neq\b|\\ne\b/g, '≠'],
      [/\\approx\b/g, '≈'],
      [/\\pm\b/g, '±'],
      [/\\mp\b/g, '∓'],
      [/\\times\b/g, '×'],
      [/\\div\b/g, '÷'],
      [/\\cdot\b/g, '·'],
      [/\\bullet\b/g, '•'],
      [/\\circ\b|\^\\circ\b|\\degree\b/g, '°'],
      [/\\infty\b/g, '∞'],
      [/\\sim\b/g, '∼'],
      [/\\equiv\b/g, '≡'],
      [/\\propto\b/g, '∝'],
      [/\\ll\b/g, '≪'],
      [/\\gg\b/g, '≫'],
      [/\\in\b/g, '∈'],
      [/\\notin\b/g, '∉'],
      [/\\subset\b/g, '⊂'],
      [/\\subseteq\b/g, '⊆'],
      [/\\cup\b/g, '∪'],
      [/\\cap\b/g, '∩'],
      [/\\forall\b/g, '∀'],
      [/\\exists\b/g, '∃'],
      [/\\to\b|\\rightarrow\b/g, '→'],
      [/\\leftarrow\b/g, '←'],
      [/\\Rightarrow\b/g, '⇒'],
      [/\\Leftarrow\b/g, '⇐'],
      [/\\Leftrightarrow\b|\\iff\b/g, '⇔'],
      [/\\sum\b/g, '∑'],
      [/\\prod\b/g, '∏'],
      [/\\int\b/g, '∫'],
      [/\\partial\b/g, '∂'],
      [/\\nabla\b/g, '∇'],
      [/\\quad\b/g, ' '],
      [/\\qquad\b/g, '  '],
      [/\\%/g, '%'],
      [/\\\$/g, '$'],
      [/\\_/g, '_'],
      [/\\&/g, '&'],
      [/\\#/g, '#'],
      [/\\\{/g, '{'],
      [/\\\}/g, '}'],
      [/\\alpha\b/g, 'α'],
      [/\\beta\b/g, 'β'],
      [/\\gamma\b/g, 'γ'],
      [/\\delta\b/g, 'δ'],
      [/\\epsilon\b|\\varepsilon\b/g, 'ε'],
      [/\\zeta\b/g, 'ζ'],
      [/\\eta\b/g, 'η'],
      [/\\theta\b|\\vartheta\b/g, 'θ'],
      [/\\iota\b/g, 'ι'],
      [/\\kappa\b/g, 'κ'],
      [/\\lambda\b/g, 'λ'],
      [/\\mu\b/g, 'μ'],
      [/\\nu\b/g, 'ν'],
      [/\\xi\b/g, 'ξ'],
      [/\\pi\b/g, 'π'],
      [/\\rho\b/g, 'ρ'],
      [/\\sigma\b/g, 'σ'],
      [/\\tau\b/g, 'τ'],
      [/\\upsilon\b/g, 'υ'],
      [/\\phi\b|\\varphi\b/g, 'φ'],
      [/\\chi\b/g, 'χ'],
      [/\\psi\b/g, 'ψ'],
      [/\\omega\b/g, 'ω'],
      [/\\Gamma\b/g, 'Γ'],
      [/\\Delta\b/g, 'Δ'],
      [/\\Theta\b/g, 'Θ'],
      [/\\Lambda\b/g, 'Λ'],
      [/\\Xi\b/g, 'Ξ'],
      [/\\Pi\b/g, 'Π'],
      [/\\Sigma\b/g, 'Σ'],
      [/\\Upsilon\b/g, 'Υ'],
      [/\\Phi\b/g, 'Φ'],
      [/\\Psi\b/g, 'Ψ'],
      [/\\Omega\b/g, 'Ω']
    ];

    for (const [regex, rep] of symbolMap) {
      s = s.replace(regex, rep);
    }

    s = s.replace(/\^{([^}]+)}|\^([0-9a-zA-Z\+\-]+)/g, (m, p1, p2) => `<sup>${p1 || p2}</sup>`);
    s = s.replace(/_{([^}]+)}|_([0-9a-zA-Z\+\-]+)/g, (m, p1, p2) => `<sub>${p1 || p2}</sub>`);

    return s.trim();
  }

  function isMathExpression(s) {
    const trimmed = s.trim();
    if (/\\/.test(trimmed)) return true;
    if (/[\^_{}±×÷√∑∏∫∂∇≠≤≥≈∝]/.test(trimmed)) return true;
    if (/&(?:lt|gt|le|ge);/.test(trimmed)) return true;
    if (/^[<>]=?/.test(trimmed)) return true;
    if (/^\d+(?:[.,]\d+)*(?:\s*(?:k|m|b|ribu|juta|miliar|USD|IDR|SGD|EUR|rb|jt))?$/i.test(trimmed)) {
      return false;
    }
    const words = trimmed.split(/\s+/);
    if (words.length > 1 && words.some(w => /^[a-zA-Z]{2,}$/.test(w) && !/^(?:sin|cos|tan|log|ln|lim|exp|min|max|deg|lt|gt|le|ge)$/i.test(w))) {
      return false;
    }
    if (/^[a-zA-Z0-9+\-*/=()<>.,\s&;]+$/.test(trimmed)) {
      return true;
    }
    return false;
  }

  // 1. Block Math: $$...$$ or \[...\]
  res = res.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (match, b1, b2) => {
    const mathContent = convertMathTokens(b1 || b2 || "");
    return `<div class="md-math-block">${mathContent}</div>`;
  });

  // 2. Explicit inline LaTeX: \( ... \)
  res = res.replace(/\\\(([\s\S]+?)\\\)/g, (match, inner) => {
    const mathContent = convertMathTokens(inner);
    return `<span class="md-math-inline">${mathContent}</span>`;
  });

  // 3. Inline math $...$
  res = res.replace(/\$([^\$\n]+?)\$/g, (match, inner) => {
    if (!isMathExpression(inner)) {
      return match;
    }
    const mathContent = convertMathTokens(inner);
    return `<span class="md-math-inline">${mathContent}</span>`;
  });

  // 4. Standalone raw LaTeX tokens outside dollars
  res = convertMathTokens(res);
  return res;
}

function formatInline(str) {
  if (!str) return "";
  let res = str;

  // Convert escaped <br> tags back to HTML line break
  res = res.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

  // Parse LaTeX Math Formulas & Unicode Symbols ($\ge 75$, $\le 20\%$, fractions, powers, Greek letters)
  res = parseLatexMath(res);

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

  // 10. Restore Inline Code (with Intelligent Color Swatches & Clean Handle Badges)
  inlineCodes.forEach((code, idx) => {
    const trimmed = code.trim();
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i.test(trimmed)) {
      finalHtml = finalHtml.split(`\uE000INLINE_CODE_${idx}\uE001`).join(`<code class="md-inline-code md-color-pill"><span class="color-swatch-dot" style="background-color: ${trimmed};"></span>${trimmed}</code>`);
    } else if (/^@[a-zA-Z0-9_\-\.]+$/i.test(trimmed)) {
      finalHtml = finalHtml.split(`\uE000INLINE_CODE_${idx}\uE001`).join(`<code class="md-inline-code md-handle-pill"><span class="mention-at">@</span>${escapeHtml(trimmed.slice(1))}</code>`);
    } else {
      finalHtml = finalHtml.split(`\uE000INLINE_CODE_${idx}\uE001`).join(`<code class="md-inline-code">${code}</code>`);
    }
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

function getNormalizedChatEndpoint(rawEndpoint) {
  if (!rawEndpoint || typeof rawEndpoint !== 'string' || !rawEndpoint.trim()) {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  let clean = rawEndpoint.trim().replace(/\/+$/, "");
  if (clean.endsWith("/chat/completions")) {
    return clean;
  }
  return clean + "/chat/completions";
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

function isRetryableAIError(status, errorMsg = "") {
  if (isRateLimitError(status, errorMsg)) return true;
  if (status === 429 || status === 503 || status === 502 || status === 504 || status === 500 || status === 408 || status === 0) return true;
  const lower = String(errorMsg || "").toLowerCase();
  return (
    lower.includes("network error") ||
    lower.includes("network_error") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkrequestfailed") ||
    lower.includes("connection") ||
    lower.includes("refused") ||
    lower.includes("timeout") ||
    lower.includes("econnreset")
  );
}

function formatFriendlyErrorMessage(err, endpointUrl = "", activeModel = "") {
  if (!err) return "Terjadi kesalahan tidak diketahui.";
  const raw = String(err.message || err.toString() || "");
  const lower = raw.toLowerCase();

  if (lower.includes("network error") || lower.includes("failed to fetch") || lower.includes("networkrequestfailed") || lower.includes("err_connection_refused") || lower.includes("err_name_not_resolved")) {
    const isLocal = endpointUrl.includes("localhost") || endpointUrl.includes("127.0.0.1");
    if (isLocal) {
      return `Gagal terhubung ke server AI lokal (${endpointUrl}). Pastikan server AI lokal Anda (Ollama / 9Router / LM Studio / LocalAI) sudah berjalan aktif di latar belakang.`;
    }
    return `Koneksi jaringan terputus (Network Error). Gagal menghubungi endpoint API AI (${endpointUrl || 'API URL'}). Pastikan koneksi internet Anda aktif dan URL endpoint sudah benar di Pengaturan.`;
  }

  if (lower.includes("401") || lower.includes("invalid api key") || lower.includes("unauthorized") || lower.includes("api_key_invalid")) {
    return `API Key tidak valid atau belum diatur (401 Unauthorized). Silakan periksa dan masukkan API Key yang benar di menu Pengaturan.`;
  }

  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted")) {
    return `Batas kuota atau rate limit API AI tercapai (429 Rate Limit Exceeded). Silakan ganti model AI lain atau tunggu beberapa saat.`;
  }

  if (lower.includes("404") || lower.includes("not found")) {
    return `Endpoint URL atau model tidak ditemukan (404 Not Found). Periksa Base URL API (${endpointUrl}) atau nama model (${activeModel}) di Pengaturan.`;
  }

  return raw;
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

  // 1. Persist to Chrome Local Storage
  chrome.storage.local.set({ browser_agent_config: config }, () => {
    applyConfigToUI();
    renderModelDropdown();
    renderSettingsModelRows();
    hideSettingsModal();
  });

  // 2. Persist distinct models and settings to SQLite
  try {
    sendNativeRpc('db_save_models', { models: config.models }).catch(() => {});
    sendNativeRpc('db_save_all_settings', {
      settings: {
        browser_agent_config: config,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        preset: config.preset,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        autoRotateModel: config.autoRotateModel
      }
    }).catch(() => {});
  } catch (e) {}
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
    const badgeText = `${idx + 1}`;

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

  // Load Autonomous Brain & Persistent Memory from Host
  await loadPersistentMemoryFromHost();
  if (cachedPersistentMemory.autonomous_agents && cachedPersistentMemory.autonomous_agents.length > 0) {
    cachedPersistentMemory.autonomous_agents.forEach(ag => {
      if (!customAgents.some(a => a.id === ag.id)) {
        customAgents.push({
          id: ag.id,
          name: ag.name,
          description: ag.role_description,
          content: ag.system_prompt,
          skills: ag.assigned_skills || [],
          is_autonomous: true,
          source: ag.source || "autonomous_ai"
        });
      }
    });
  }

  if (cachedPersistentMemory.autonomous_skills && cachedPersistentMemory.autonomous_skills.length > 0) {
    cachedPersistentMemory.autonomous_skills.forEach(sk => {
      const existingIdx = customSkills.findIndex(s => s.id === sk.id);
      const skillObj = {
        id: sk.id,
        name: sk.name,
        description: sk.description,
        content: `# ${sk.name} (${sk.version})\n\n## Trigger & Deskripsi:\n${sk.description}\n\n## Alur Kerja:\n${sk.workflow_markdown}`,
        version: sk.version,
        is_autonomous: true
      };
      if (existingIdx >= 0) {
        customSkills[existingIdx] = skillObj;
      } else {
        customSkills.push(skillObj);
      }
    });
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
    divider.className = "agent-list-divider";
    divider.style.cssText = "height: 1px; background: rgba(255, 255, 255, 0.08); margin: 6px 4px;";
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
  const rawEp = document.getElementById('setting-endpoint')?.value || "";
  const endpoint = getNormalizedChatEndpoint(rawEp);
  const apiKey = document.getElementById('setting-apikey')?.value?.trim() || "";
  const model = document.getElementById('setting-model')?.value?.trim() || "gemini-2.5-pro";
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
      let errorMsg = "";
      try {
        const errJson = await res.json();
        errorMsg = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch (e) {
        errorMsg = await res.text();
      }
      resultBox.className = 'test-result-box error';
      resultBox.textContent = `Failed (${res.status}): ${errorMsg}`;
    }
  } catch (err) {
    resultBox.className = 'test-result-box error';
    resultBox.textContent = `Error: ${formatFriendlyErrorMessage(err, endpoint, model)}`;
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

  // If in newtab (embedded fullscreen-settings-overlay exists), open in-page overlay directly!
  const settingsOverlay = document.getElementById('fullscreen-settings-overlay');
  if (settingsOverlay) {
    settingsOverlay.style.display = 'flex';
    const settingsIframe = document.getElementById('settings-embedded-iframe');
    if (settingsIframe && (!settingsIframe.src || !settingsIframe.src.includes('options.html'))) {
      settingsIframe.src = 'options.html#ai';
    }
    return;
  }

  if (isOpeningOptions) return;
  isOpeningOptions = true;
  setTimeout(() => { isOpeningOptions = false; }, 600);

  const targetUrl = chrome.runtime.getURL('newtab.html#settings');
  try {
    const allTabs = await chrome.tabs.query({});
    const existingNewTab = allTabs.find(t => t.url && (t.url.includes('newtab.html') || t.url === 'chrome://newtab/'));
    
    if (existingNewTab) {
      await chrome.tabs.update(existingNewTab.id, { active: true, url: targetUrl });
      if (existingNewTab.windowId) {
        await chrome.windows.update(existingNewTab.windowId, { focused: true });
      }
      try {
        chrome.tabs.sendMessage(existingNewTab.id, { action: 'openSettingsOverlay', tab: 'ai' });
      } catch (err) {}
      return;
    }

    await chrome.tabs.create({ url: targetUrl, active: true });
  } catch (err) {
    try {
      await chrome.tabs.create({ url: targetUrl, active: true });
    } catch (e) {
      window.open(targetUrl, '_blank');
    }
  }
}

function openPersistentBrainTab() {
  const targetUrl = chrome.runtime.getURL('options.html#tab-persistent-brain');
  chrome.tabs.query({ url: chrome.runtime.getURL('options.html*') }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { url: targetUrl, active: true });
      if (tabs[0].windowId) chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: targetUrl, active: true });
    }
  });
}

function updateBrainDrawerBadge() {
  const badgeEl = document.getElementById('badge-brain-total-count');
  if (!badgeEl) return;
  const total = (cachedPersistentMemory.user_memories?.length || 0) +
                (cachedPersistentMemory.experience_ledger?.length || 0) +
                (cachedPersistentMemory.anti_patterns?.length || 0) +
                (cachedPersistentMemory.autonomous_skills?.length || 0) +
                (cachedPersistentMemory.autonomous_agents?.length || 0);
  if (total > 0) {
    badgeEl.textContent = total > 99 ? '99+' : String(total);
    badgeEl.style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
  }
}

document.getElementById('btn-open-brain-drawer')?.addEventListener('click', openPersistentBrainTab);
document.getElementById('btn-open-settings')?.addEventListener('click', openOptionsTab);
document.getElementById('btn-close-settings')?.addEventListener('click', hideSettingsModal);
document.getElementById('btn-cancel-settings')?.addEventListener('click', hideSettingsModal);
document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);

// Realtime sync config from full-screen options tab
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.browser_agent_config) {
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
    if (changes.browser_agent_auto_switch_tab !== undefined) {
      setAutoSwitchTab(changes.browser_agent_auto_switch_tab.newValue);
    }
    if (changes.browser_agent_exec_mode !== undefined && typeof setExecutionMode === 'function') {
      setExecutionMode(changes.browser_agent_exec_mode.newValue);
    }
    if (changes.browser_agent_search_engine !== undefined && typeof setSearchEngine === 'function') {
      setSearchEngine(changes.browser_agent_search_engine.newValue);
    }
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
        thumbnailUrl: att.thumbnailUrl || (att.isImage && att.dataUrl ? att.dataUrl : "") || "",
        dataUrl: (att.isImage && att.dataUrl) ? att.dataUrl : (att.thumbnailUrl || ""),
        textContent: att.textContent || "",
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
    is_pinned: currentSessionIsPinned ? 1 : 0,
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
      // Non-blocking auto-refresh of persistent memory
      loadPersistentMemoryFromHost();
      notifyPersistentBrainUpdated();
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
      is_pinned: s.is_pinned ? 1 : 0,
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
    sessions.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
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
    const isPinned = !!sess.is_pinned;
    const timeStr = formatTimeAgo(sess.updated_at || sess.created_at);

    const card = document.createElement('div');
    card.className = `history-item-card ${isActive ? 'active-session' : ''} ${isPinned ? 'is-pinned' : ''}`;
    card.setAttribute('data-session-id', sess.id);
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
      <div class="history-item-actions">
        <button type="button" class="btn-history-action btn-pin-history-item ${isPinned ? 'is-pinned' : ''}" title="${isPinned ? 'Lepas Sematan (Unpin)' : 'Sematkan ke Atas (Pin)'}">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"/>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
          </svg>
        </button>
        <button type="button" class="btn-history-action btn-rename-history-item" title="Ubah Judul Percakapan">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button type="button" class="btn-history-action btn-del-history-item" title="Hapus Percakapan">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;

    // Resume chat on card click (excluding action buttons and inline input)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-history-action') || e.target.closest('.history-rename-wrap')) return;
      resumeSession(sess.id);
    });

    // Pin toggle
    const pinBtn = card.querySelector('.btn-pin-history-item');
    pinBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const nextPinnedState = !sess.is_pinned;
      sess.is_pinned = nextPinnedState ? 1 : 0;
      if (sess.id === currentSessionId) {
        currentSessionIsPinned = nextPinnedState;
      }
      if (nativePort) {
        try {
          await sendNativeRpc("db_pin_session", { session_id: sess.id, is_pinned: nextPinnedState });
        } catch (err) {
          console.warn("SQLite pin error:", err);
        }
      }
      try {
        const res = await chrome.storage.local.get(['chat_sessions_cache']);
        const cache = res.chat_sessions_cache || {};
        if (cache[sess.id]) {
          cache[sess.id].is_pinned = nextPinnedState ? 1 : 0;
          await chrome.storage.local.set({ chat_sessions_cache: cache });
        }
      } catch (err) {}
      loadHistoryList(searchQuery);
    });

    // Inline Rename
    const renameBtn = card.querySelector('.btn-rename-history-item');
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const headerEl = card.querySelector('.history-item-header');
      const oldTitle = sess.title || 'New Chat';
      headerEl.innerHTML = `
        <div class="history-rename-wrap">
          <input type="text" class="history-rename-input" value="${escapeHtml(oldTitle)}" maxlength="80" />
          <button type="button" class="btn-save-rename" title="Simpan Judul">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button type="button" class="btn-cancel-rename" title="Batal">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      const input = headerEl.querySelector('.history-rename-input');
      const saveBtn = headerEl.querySelector('.btn-save-rename');
      const cancelBtn = headerEl.querySelector('.btn-cancel-rename');

      input.focus();
      input.select();

      const doSave = async () => {
        const newTitle = (input.value || '').trim() || 'New Chat';
        sess.title = newTitle;
        if (sess.id === currentSessionId) {
          currentSessionTitle = newTitle;
          updateHeaderChatTitle(currentSessionTitle);
        }
        if (nativePort) {
          try {
            await sendNativeRpc("db_rename_session", { session_id: sess.id, title: newTitle });
          } catch (err) {
            console.warn("SQLite rename error:", err);
          }
        }
        try {
          const res = await chrome.storage.local.get(['chat_sessions_cache']);
          const cache = res.chat_sessions_cache || {};
          if (cache[sess.id]) {
            cache[sess.id].title = newTitle;
            await chrome.storage.local.set({ chat_sessions_cache: cache });
          }
        } catch (err) {}
        loadHistoryList(searchQuery);
      };

      const doCancel = () => {
        loadHistoryList(searchQuery);
      };

      saveBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        doSave();
      });

      cancelBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        doCancel();
      });

      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
          ev.preventDefault();
          doSave();
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          doCancel();
        }
      });

      input.addEventListener('click', (ev) => {
        ev.stopPropagation();
      });
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
  currentSessionIsPinned = !!session.is_pinned;
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
  updateHeaderChatTitle(currentSessionTitle);
  updateFooterStatus("Sesi Dimuat");
  setTimeout(() => updateFooterStatus("Agent Ready"), 1500);
}

function updateHeaderChatTitle(title) {
  const headerTitleEl = document.getElementById('header-chat-title');
  if (!headerTitleEl) return;
  const activeTitle = (title !== undefined) ? title : currentSessionTitle;
  const isChatRoomActive = document.body.classList.contains('has-messages') || (conversationHistory && conversationHistory.length > 0) || (currentSessionId !== null);
  
  if (isChatRoomActive && activeTitle && activeTitle !== "New Chat") {
    headerTitleEl.textContent = activeTitle;
    headerTitleEl.title = activeTitle;
    headerTitleEl.style.display = "inline-flex";
  } else {
    headerTitleEl.textContent = "";
    headerTitleEl.title = "";
    headerTitleEl.style.display = "none";
  }
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

function resetChatMessagesUI() {
  if (!chatMessages) return;
  const workspace = document.getElementById('agent-workspace');
  if (welcomeCard && workspace && workspace.contains(welcomeCard) && !chatMessages.contains(welcomeCard)) {
    chatMessages.innerHTML = '';
    welcomeCard.style.display = 'flex';
  } else {
    chatMessages.innerHTML = '';
    if (welcomeCard) {
      chatMessages.appendChild(welcomeCard);
      welcomeCard.style.display = 'block';
    }
  }
  document.body.classList.remove('has-messages');
  updateHeaderChatTitle("");
}

function startNewChat() {
  if (isExecuting) {
    cancelExecution();
  }
  hideClarificationDock();
  saveCurrentSessionToDB();
  currentSessionId = null;
  currentSessionTitle = "New Chat";
  currentSessionIsPinned = false;
  currentSessionCreatedAt = null;
  conversationHistory = [];
  pendingAttachments = [];
  clearAttachments();
  clearPromptQueue();
  resetChatMessagesUI();
  updateHeaderChatTitle("");
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
    currentSessionIsPinned = false;
    currentSessionCreatedAt = null;
    conversationHistory = [];
    resetChatMessagesUI();

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
    currentSessionIsPinned = false;
    currentSessionCreatedAt = null;
    conversationHistory = [];
    resetChatMessagesUI();
  }

  hideDeleteConfirmModal();
  const searchInput = document.getElementById('input-search-history');
  await loadHistoryList(searchInput ? searchInput.value : "");
}

// History & Delete Event Listeners
document.getElementById('btn-open-history')?.addEventListener('click', openHistoryModal);
document.getElementById('btn-close-history')?.addEventListener('click', hideHistoryModal);
document.getElementById('btn-history-export-db')?.addEventListener('click', exportFullDatabaseFromSidepanel);

const btnHistoryImportDb = document.getElementById('btn-history-import-db');
const inputHistoryImportFile = document.getElementById('input-history-import-file');

btnHistoryImportDb?.addEventListener('click', () => {
  inputHistoryImportFile?.click();
});

inputHistoryImportFile?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) {
    importFullDatabaseFromSidepanel(file);
    inputHistoryImportFile.value = '';
  }
});

document.getElementById('btn-history-new-chat')?.addEventListener('click', startNewChat);
document.getElementById('btn-header-new-chat')?.addEventListener('click', startNewChat);
document.getElementById('btn-clear-all-history')?.addEventListener('click', openClearAllConfirmModal);

async function exportFullDatabaseFromSidepanel() {
  try {
    updateFooterStatus("Mengompres seluruh database ke tar.gz...");
    const allStorage = await chrome.storage.local.get(null);

    // Try tar.gz export first
    try {
      const dbRes = await sendNativeRpc("db_export_targz_backup", {
        storage: {
          browser_agent_config: config,
          active_agent_id: activeAgentId,
          custom_agents: customAgents,
          browser_agent_exec_mode: allStorage.browser_agent_exec_mode || 'accept',
          browser_agent_auto_switch_tab: allStorage.browser_agent_auto_switch_tab ?? true,
          browser_agent_search_engine: allStorage.browser_agent_search_engine || 'google',
          browser_agent_mode: allStorage.browser_agent_mode || 'agent',
          show_floating_button: allStorage.show_floating_button ?? true
        }
      });

      if (dbRes && dbRes.status === "ok" && dbRes.tar_gz_b64) {
        const binaryStr = atob(dbRes.tar_gz_b64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "application/gzip" });
        const url = URL.createObjectURL(blob);
        const filename = dbRes.filename || `browser-agent-full-database-${Date.now()}.tar.gz`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);

        const sizeMb = (dbRes.size_bytes / (1024 * 1024)).toFixed(1);
        updateFooterStatus(`Database Berhasil Diekspor (${sizeMb} MB)`);
        setTimeout(() => updateFooterStatus("Agent Ready"), 2000);
        return;
      }
    } catch (e) {}

    // Fallback JSON
    let nativeDbData = { sessions: [], settings: {}, models: [] };
    let nativeFiles = { agents: [], skills: [], memories: [] };

    try {
      const dbRes = await sendNativeRpc("db_export_full_database");
      if (dbRes && dbRes.status === "ok" && dbRes.data) {
        nativeDbData = dbRes.data.database || nativeDbData;
        nativeFiles = dbRes.data.files || nativeFiles;
      }
    } catch (e) {}

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;

    const fullBackupPayload = {
      meta: {
        app: "Browser Agent",
        version: "v2.88.0",
        export_type: "universal_full_database_backup",
        platform_origin: navigator.platform || "Universal",
        exported_at: new Date().toISOString(),
        timestamp: Date.now(),
        description: "Universal Full Backup: SQLite sessions, settings, model priority, custom agents, skills SOP, memories, and storage."
      },
      storage: {
        browser_agent_config: config,
        active_agent_id: activeAgentId,
        custom_agents: customAgents,
        browser_agent_exec_mode: allStorage.browser_agent_exec_mode || 'accept',
        browser_agent_auto_switch_tab: allStorage.browser_agent_auto_switch_tab ?? true,
        browser_agent_search_engine: allStorage.browser_agent_search_engine || 'google',
        browser_agent_mode: allStorage.browser_agent_mode || 'agent',
        show_floating_button: allStorage.show_floating_button ?? true
      },
      database: nativeDbData,
      files: nativeFiles
    };

    const jsonStr = JSON.stringify(fullBackupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const filename = `browser-agent-full-database-universal-${dateStr}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);

    const count = (nativeDbData.sessions || []).length;
    updateFooterStatus(`Database Berhasil Diekspor (${count} Sesi)`);
    setTimeout(() => updateFooterStatus("Agent Ready"), 2000);
  } catch (err) {
    console.error("Sidepanel export DB error:", err);
    alert("Gagal mengekspor database: " + err.message);
  }
}

async function importFullDatabaseFromSidepanel(file) {
  if (!file) return;
  try {
    updateFooterStatus("Memulihkan database...");
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz') || fileName.endsWith('.gz')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Str = btoa(binary);

          const res = await sendNativeRpc("db_import_targz_backup", {
            tar_gz_b64: base64Str
          });

          if (res && res.status === "ok") {
            if (res.storage && typeof res.storage === "object") {
              await chrome.storage.local.set(res.storage);
              if (res.storage.browser_agent_config) config = { ...config, ...res.storage.browser_agent_config };
              if (res.storage.active_agent_id) activeAgentId = res.storage.active_agent_id;
              if (res.storage.custom_agents) customAgents = res.storage.custom_agents;
            }

            await loadHistoryList();
            await populateAgentSelect();
            updateFooterStatus("Database Sukses Dipulihkan!");
            setTimeout(() => updateFooterStatus("Agent Ready"), 2000);
          } else {
            throw new Error(res.error || "Gagal memulihkan tar.gz");
          }
        } catch (tarErr) {
          console.error("tar.gz import error in sidepanel:", tarErr);
          alert("Gagal memulihkan dari tar.gz: " + tarErr.message);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // JSON Handler
    const text = await file.text();
    const parsed = JSON.parse(text);
    const database = parsed.database;
    const files = parsed.files;
    const storage = parsed.storage || parsed.settings || parsed;

    if (database || files) {
      await sendNativeRpc("db_import_full_database", {
        payload: { database: database || {}, files: files || {} }
      });
    }

    if (storage && typeof storage === "object") {
      await chrome.storage.local.set(storage);
    }

    await loadHistoryList();
    await populateAgentSelect();
    updateFooterStatus("Database Sukses Dipulihkan!");
    setTimeout(() => updateFooterStatus("Agent Ready"), 2000);
  } catch (err) {
    console.error("Sidepanel import DB error:", err);
    alert("Gagal memulihkan database: " + err.message);
  }
}

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
      const sizeStr = formatFileSize(att.size || (att.text ? att.text.length : 0));
      card.innerHTML = `
        <div class="attachment-file-icon-box">
          ${getMacOsFileIconSvg(att.name, 20, 24)}
        </div>
        <div class="attachment-file-meta">
          <span class="attachment-file-name" title="${escapeHtml(att.name)}">${escapeHtml(att.name)}</span>
          ${sizeStr ? `<span class="attachment-file-size">${sizeStr}</span>` : ''}
        </div>
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
  syncQueueButtonMorphState();
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
      const attId = 'att_img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      // Persist full image dataUrl into IndexedDB asynchronously
      saveImageToIndexedDB(attId, dataUrl, file.name || 'image.png');

      pendingAttachments.push({
        id: attId,
        name: file.name || 'image.png',
        type: file.type || 'image/png',
        size: file.size,
        isImage: true,
        isVideo: false,
        dataUrl,
        thumbnailUrl: dataUrl
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

// Autonomous Brain Continuous Learning Reflex: Silently extract user profile, email, rules, and facts
async function autoLearnReflexFromUserText(text) {
  if (!text || typeof text !== 'string' || text.length < 3) return;
  const clean = text.trim();

  try {
    // 1. Email Detection
    let foundEmails = clean.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g) || [];
    const emailIntentMatch = clean.match(/(?:email|mail)\s+(?:saya\s+)?(?:pribadi\s+)?([a-zA-Z0-9_.-]{4,30})/i);
    if (emailIntentMatch) {
      const rawVal = emailIntentMatch[1].trim();
      if (!rawVal.includes('@') && !['pribadi', 'bro', 'aja', 'ya', 'dong'].includes(rawVal.toLowerCase())) {
        foundEmails.push(`${rawVal}@gmail.com`);
      }
    }

    for (const em of new Set(foundEmails)) {
      const cleanEm = em.trim().replace(/\.$/, '');
      const alreadySaved = (cachedPersistentMemory.user_memories || []).some(m => (m.content || '').toLowerCase().includes(cleanEm.toLowerCase()));
      if (!alreadySaved) {
        console.log(`[Auto-Reflex] Learning new email profile: ${cleanEm}`);
        await sendNativeRpc("db_save_personal_memory", {
          memory: {
            category: "profile",
            content: `Email pribadi pengguna: ${cleanEm}`,
            reason: "Otomatis dipelajari dari pesan pengguna saat berinteraksi",
            confidence: 1.0,
            source: "autonomous_ai"
          }
        });
        await loadPersistentMemoryFromHost();
        notifyPersistentBrainUpdated();
      }
    }

    // 2. Name / Identity Detection
    const nameMatch = clean.match(/(?:nama\s+saya|panggil\s+saya(?:\s+aja)?)\s*[:=]?\s*([A-Za-z0-9\s]{2,20})/i);
    if (nameMatch) {
      const nameVal = nameMatch[1].trim();
      if (!['bro', 'kak', 'admin', 'ai', 'kamu', 'anda'].includes(nameVal.toLowerCase())) {
        const alreadySaved = (cachedPersistentMemory.user_memories || []).some(m => (m.content || '').toLowerCase().includes(nameVal.toLowerCase()));
        if (!alreadySaved) {
          console.log(`[Auto-Reflex] Learning user name: ${nameVal}`);
          await sendNativeRpc("db_save_personal_memory", {
            memory: {
              category: "profile",
              content: `Nama/panggilan pengguna adalah ${nameVal}.`,
              reason: "Otomatis dipelajari saat pengguna memperkenalkan nama",
              confidence: 1.0,
              source: "autonomous_ai"
            }
          });
          await loadPersistentMemoryFromHost();
          notifyPersistentBrainUpdated();
        }
      }
    }

    // 3. User Rule & Instruction Detection
    const ruleMatch = clean.match(/(?:selalu\s+gunakan|wajib\s+selalu|aturan(?:\s+baru)?\s*:|jangan\s+pernah)\s+(.+)/i);
    if (ruleMatch) {
      const ruleVal = ruleMatch[1].trim();
      if (ruleVal.length > 10) {
        const alreadySaved = (cachedPersistentMemory.user_memories || []).some(m => (m.content || '').toLowerCase().includes(ruleVal.substring(0, 20).toLowerCase()));
        if (!alreadySaved) {
          console.log(`[Auto-Reflex] Learning user rule: ${ruleVal}`);
          await sendNativeRpc("db_save_personal_memory", {
            memory: {
              category: "rule",
              content: `Aturan pengguna: ${ruleVal}`,
              reason: "Otomatis dicatat dari instruksi pengguna",
              confidence: 1.0,
              source: "autonomous_ai"
            }
          });
          await loadPersistentMemoryFromHost();
          notifyPersistentBrainUpdated();
        }
      }
    }
  } catch (err) {
    console.warn("[Auto-Reflex] Error in autoLearnReflexFromUserText:", err);
  }
}

// =========================================================================
// ⚡ Prompt Queue System (Unlimited Multi-Prompt Antrean & Auto-Execution)
// =========================================================================
let promptQueue = [];
let editingQueueItemId = null;

function addToPromptQueue(text, attachments = [], mentions = [], chatMode = 'agent') {
  const item = {
    id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text: text || '',
    attachments: [...attachments],
    mentions: [...mentions],
    chatMode: chatMode || currentChatMode || 'agent',
    timestamp: Date.now()
  };
  promptQueue.push(item);
  renderPromptQueueUI();
  showQueueToast(`Berhasil dimasukkan ke Antrean #${promptQueue.length}`);
}

function removePromptQueueItem(id) {
  promptQueue = promptQueue.filter(item => item.id !== id);
  if (editingQueueItemId === id) editingQueueItemId = null;
  renderPromptQueueUI();
}

function movePromptQueueItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= promptQueue.length) return;
  const temp = promptQueue[index];
  promptQueue[index] = promptQueue[targetIndex];
  promptQueue[targetIndex] = temp;
  renderPromptQueueUI();
}

function clearPromptQueue() {
  promptQueue = [];
  editingQueueItemId = null;
  renderPromptQueueUI();
}

function checkAndProcessNextPromptQueue() {
  if (isExecuting) return;
  if (promptQueue.length === 0) {
    renderPromptQueueUI();
    return;
  }

  const nextItem = promptQueue.shift();
  renderPromptQueueUI();

  if (!nextItem) return;

  setTimeout(() => {
    if (nextItem.chatMode === 'chat') {
      runChatModeLoop(nextItem.text, nextItem.attachments, nextItem.mentions);
    } else {
      runAgentLoop(nextItem.text, nextItem.attachments, nextItem.mentions);
    }
  }, 250);
}

function showQueueToast(message) {
  let toast = document.getElementById('prompt-queue-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'prompt-queue-toast';
    toast.className = 'prompt-queue-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-pulse"></span> <span>${escapeHtml(message)}</span>`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function renderPromptQueueUI() {
  const dock = document.getElementById('prompt-queue-dock');
  const list = document.getElementById('prompt-queue-list');
  const countBadge = document.getElementById('prompt-queue-count');
  if (!dock || !list) return;

  if (promptQueue.length === 0) {
    dock.style.display = 'none';
    document.body.classList.remove('prompt-queue-active');
    return;
  }

  dock.style.display = 'flex';
  document.body.classList.add('prompt-queue-active');
  if (countBadge) countBadge.textContent = promptQueue.length;

  let html = '';
  promptQueue.forEach((item, index) => {
    const isNext = (index === 0);
    const isEditing = (editingQueueItemId === item.id);

    let attachmentsHtml = '';
    if (item.attachments && item.attachments.length > 0) {
      attachmentsHtml = `<div class="queue-card-attachments">`;
      item.attachments.forEach(att => {
        if (att.isImage) {
          attachmentsHtml += `<span class="queue-att-badge image"><img src="${att.dataUrl}"> <span>${escapeHtml(att.name || 'Gambar')}</span></span>`;
        } else {
          attachmentsHtml += `<span class="queue-att-badge file">${getMacOsFileIconSvg(att.name, 12, 15)} <span>${escapeHtml(att.name || 'File')}</span></span>`;
        }
      });
      attachmentsHtml += `</div>`;
    }

    let mentionsHtml = '';
    if (item.mentions && item.mentions.length > 0) {
      mentionsHtml = `<div class="queue-card-mentions">` + 
        item.mentions.map(m => `<span class="queue-mention-tag">@${escapeHtml(getAgentShortName(m))}</span>`).join('') +
        `</div>`;
    }

    html += `
      <div class="prompt-queue-card ${isNext ? 'is-next' : ''}" data-queue-id="${item.id}">
        <div class="queue-card-header">
          <div class="queue-card-badge-wrap">
            <span class="queue-badge-pill ${isNext ? 'pulse-lime' : ''}">
              ${isNext ? 'Antrean #1 (Berikutnya)' : `Antrean #${index + 1}`}
            </span>
          </div>
          <div class="queue-card-actions">
            ${index > 0 ? `<button type="button" class="btn-queue-card-action btn-move-up" data-idx="${index}" title="Naikkan Urutan">▲</button>` : ''}
            ${index < promptQueue.length - 1 ? `<button type="button" class="btn-queue-card-action btn-move-down" data-idx="${index}" title="Turunkan Urutan">▼</button>` : ''}
            <button type="button" class="btn-queue-card-action btn-edit-queue" data-id="${item.id}" title="Edit Prompt">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="btn-queue-card-action btn-delete-queue" data-id="${item.id}" title="Batal / Hapus Antrean">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        ${isEditing ? `
          <div class="queue-card-editor">
            <textarea class="queue-card-textarea" id="queue-edit-textarea-${item.id}">${escapeHtml(item.text)}</textarea>
            <div class="queue-edit-actions">
              <button type="button" class="btn-queue-save" data-id="${item.id}">Simpan</button>
              <button type="button" class="btn-queue-cancel-edit" data-id="${item.id}">Batal</button>
            </div>
          </div>
        ` : `
          <div class="queue-card-body">
            <p class="queue-prompt-text">${escapeHtml(item.text || '(Tanpa teks prompt)')}</p>
            ${attachmentsHtml}
            ${mentionsHtml}
          </div>
        `}
      </div>
    `;
  });

  list.innerHTML = html;
  bindQueueCardEvents();
}

function bindQueueCardEvents() {
  const dock = document.getElementById('prompt-queue-dock');
  if (!dock) return;

  dock.querySelector('#btn-queue-clear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearPromptQueue();
  });

  dock.querySelectorAll('.btn-edit-queue').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editingQueueItemId = btn.dataset.id;
      renderPromptQueueUI();
    });
  });

  dock.querySelectorAll('.btn-delete-queue').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePromptQueueItem(btn.dataset.id);
    });
  });

  dock.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      movePromptQueueItem(idx, -1);
    });
  });

  dock.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      movePromptQueueItem(idx, 1);
    });
  });

  dock.querySelectorAll('.btn-queue-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const textarea = document.getElementById(`queue-edit-textarea-${id}`);
      if (textarea) {
        const item = promptQueue.find(q => q.id === id);
        if (item) {
          item.text = textarea.value.trim();
        }
      }
      editingQueueItemId = null;
      renderPromptQueueUI();
    });
  });

  dock.querySelectorAll('.btn-queue-cancel-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editingQueueItemId = null;
      renderPromptQueueUI();
    });
  });
}

// Send message (Prompt + Attachments with Unlimited Queue Support)
function handleSendMessage() {
  const text = chatInput.value.trim();
  const hasInput = (text || pendingAttachments.length > 0 || selectedMentionAgents.length > 0);

  // If AI is currently generating/executing
  if (isExecuting) {
    if (!hasInput) {
      // Empty input & clicked stop button -> cancel current execution
      cancelExecution();
      return;
    }

    // User submitted a prompt during generation -> Add to Prompt Queue!
    const currentAttachments = [...pendingAttachments];
    const currentMentions = [...selectedMentionAgents];

    let displayMessage = text;
    if (currentMentions.length > 0) {
      const mentionPrefix = currentMentions.map(m => `@${getAgentShortName(m)}`).join(' ') + ' ';
      if (!displayMessage.startsWith('@')) {
        displayMessage = (mentionPrefix + displayMessage).trim();
      }
    }

    addToPromptQueue(displayMessage, currentAttachments, currentMentions, currentChatMode);

    chatInput.value = '';
    clearAttachments();
    clearMentionAgents();
    adjustChatInputHeight();
    return;
  }

  if (!hasInput) return;

  // Trigger continuous autonomous self-learning reflex in background
  autoLearnReflexFromUserText(text);

  // Web Search mode: Instant Search / Open URL directly without starting AI chat session
  if (currentChatMode === 'websearch') {
    if (!text) return;
    let targetUrl = text;
    if (/^https?:\/\//i.test(text)) {
      targetUrl = text;
    } else if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/.*)?$/i.test(text) && !text.includes(' ')) {
      targetUrl = 'https://' + text;
    } else {
      const engine = SEARCH_ENGINES[currentSearchEngine] || SEARCH_ENGINES.google;
      targetUrl = engine.searchUrl(text);
    }
    chatInput.value = '';
    window.location.href = targetUrl;
    return;
  }

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
  syncQueueButtonMorphState();
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
  const q = String(query || "").toLowerCase().trim();
  // Filter out boss agents and untitled/empty agents
  const list = customAgents.filter(ag => 
    ag && 
    String(ag.id || '') !== "master_agent" && 
    String(ag.id || '') !== "boss_agent" && 
    !ag.is_boss && 
    ag.name && 
    ag.name !== "Untitled" && 
    ag.name !== "Untitled Agent" &&
    ag.name !== "Untitled Sub-Agent"
  );

  if (!q) return list;

  return list.filter(ag => {
    const nameMatch = String(ag.name || "").toLowerCase().includes(q);
    const idMatch = String(ag.id || "").toLowerCase().includes(q);
    const descMatch = String(ag.description || "").toLowerCase().includes(q);
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

// =========================================================================
// Web Search Google Suggestions Autocomplete Engine
// =========================================================================
const webSearchDropup = document.getElementById('websearch-suggestions-dropdown');
let activeSuggestionIndex = -1;
let currentSuggestionsList = [];
let suggestionDebounceTimer = null;

function hideWebSearchSuggestions() {
  if (!webSearchDropup) return;
  webSearchDropup.style.display = 'none';
  webSearchDropup.innerHTML = '';
  activeSuggestionIndex = -1;
  currentSuggestionsList = [];
}

async function fetchGoogleSuggestions(query) {
  if (!query || !query.trim() || currentChatMode !== 'websearch') {
    hideWebSearchSuggestions();
    return;
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url);
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      const suggestions = data[1].slice(0, 6); // Top 6 clean suggestions without overflow
      renderWebSearchSuggestions(suggestions, query.trim());
    }
  } catch (err) {
    console.debug('Error fetching suggestions:', err);
  }
}

function renderWebSearchSuggestions(suggestions, rawQuery) {
  if (!webSearchDropup) return;
  if (!suggestions || suggestions.length === 0 || currentChatMode !== 'websearch') {
    hideWebSearchSuggestions();
    return;
  }

  currentSuggestionsList = suggestions;
  activeSuggestionIndex = -1;

  let html = '';
  suggestions.forEach((sug, idx) => {
    let formattedText = sug;
    const lowerSug = sug.toLowerCase();
    const lowerQ = rawQuery.toLowerCase();
    if (lowerSug.startsWith(lowerQ)) {
      formattedText = `<strong>${sug.slice(0, rawQuery.length)}</strong>${sug.slice(rawQuery.length)}`;
    }

    html += `
      <div class="websearch-suggestion-item" data-index="${idx}" data-val="${sug.replace(/"/g, '&quot;')}">
        <svg class="websearch-suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span class="websearch-suggestion-text">${formattedText}</span>
        <svg class="websearch-suggestion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      </div>
    `;
  });

  webSearchDropup.innerHTML = html;
  webSearchDropup.style.display = 'flex';

  webSearchDropup.querySelectorAll('.websearch-suggestion-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = item.getAttribute('data-val');
      if (val) {
        chatInput.value = val;
        hideWebSearchSuggestions();
        handleSendMessage();
      }
    });
  });
}

function updateActiveSuggestionItem() {
  if (!webSearchDropup) return;
  const items = webSearchDropup.querySelectorAll('.websearch-suggestion-item');
  items.forEach((it, idx) => {
    if (idx === activeSuggestionIndex) {
      it.classList.add('selected');
      it.scrollIntoView({ block: 'nearest' });
      const val = it.getAttribute('data-val');
      if (val && chatInput) {
        chatInput.value = val;
      }
    } else {
      it.classList.remove('selected');
    }
  });
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

  // If Web Search suggestions are open, intercept ArrowUp, ArrowDown, Escape
  if (webSearchDropup && webSearchDropup.style.display !== 'none' && currentSuggestionsList.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestionsList.length;
      updateActiveSuggestionItem();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex - 1 + currentSuggestionsList.length) % currentSuggestionsList.length;
      updateActiveSuggestionItem();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideWebSearchSuggestions();
      return;
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    hideMentionDropup();
    hideWebSearchSuggestions();
    handleSendMessage();
  }
});

// Close mention dropup and suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (mentionDropup && !mentionDropup.contains(e.target) && e.target !== chatInput) {
    hideMentionDropup();
  }
  if (webSearchDropup && !webSearchDropup.contains(e.target) && e.target !== chatInput) {
    hideWebSearchSuggestions();
  }
});

// Mode Switcher Dropdown & Persistence (Default: Agent Mode)
try {
  initChatModeDropdown();
  initThinkingLevelDropdown();
  initExecutionModeDropdown();
  initSwitchTabDropdown();
  initStickmanToggle();
  initSearchEngineDropdown();
} catch (e) {}

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

// Robust auto-expand and auto-shrink textarea with mode-adaptive base height
function adjustChatInputHeight() {
  if (!chatInput) return;
  const baseHeight = 32;

  if (!chatInput.value || chatInput.value.trim() === '') {
    chatInput.style.height = baseHeight + 'px';
  } else {
    chatInput.style.height = baseHeight + 'px';
    const newHeight = Math.min(Math.max(chatInput.scrollHeight, baseHeight), 160);
    chatInput.style.height = newHeight + 'px';
  }

  syncHeroPlaceholderHeight();
}

try {
  adjustChatInputHeight();
} catch (e) {}

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
  syncQueueButtonMorphState();
  if (currentChatMode === 'websearch') {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = setTimeout(() => {
      fetchGoogleSuggestions(chatInput.value);
    }, 120);
  }
});
chatInput.addEventListener('keyup', (e) => {
  adjustChatInputHeight();
  syncQueueButtonMorphState();
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Enter' && e.key !== 'Tab') {
    handleChatInputMentionCheck();
    if (currentChatMode === 'websearch') {
      clearTimeout(suggestionDebounceTimer);
      suggestionDebounceTimer = setTimeout(() => {
        fetchGoogleSuggestions(chatInput.value);
      }, 120);
    }
  }
});
chatInput.addEventListener('change', () => {
  adjustChatInputHeight();
  syncQueueButtonMorphState();
});

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
// Lightbox Fullscreen Media Viewer
// =========================================================================
function getLightboxElements() {
  return {
    modal: document.getElementById('image-lightbox-modal'),
    img: document.getElementById('lightbox-full-img'),
    video: document.getElementById('lightbox-full-video'),
    downloadLink: document.getElementById('lightbox-download-link'),
    downloadText: document.getElementById('lightbox-download-text'),
    closeBtn: document.getElementById('btn-close-lightbox'),
    backdrop: document.getElementById('lightbox-backdrop')
  };
}

async function openMediaLightbox(src, isVideo = false, filename = '') {
  if (!src) return;
  const { modal, img, video, downloadLink, downloadText } = getLightboxElements();
  if (!modal) return;

  let resolvedSrc = src;
  if (src.startsWith('local-img://')) {
    const imgId = src.replace('local-img://', '');
    try {
      const cached = await getImageFromIndexedDB(imgId);
      if (cached?.dataUrl) {
        resolvedSrc = cached.dataUrl;
      } else if (typeof nativePort !== 'undefined' && nativePort) {
        const res = await sendNativeRpc("get_generated_image", { image_id: imgId });
        if (res && res.status === "ok" && res.data_url) {
          resolvedSrc = res.data_url;
        }
      }
    } catch (e) {
      console.warn("Error resolving local image for lightbox:", e);
    }
  }

  if (isVideo) {
    if (img) {
      img.src = '';
      img.style.display = 'none';
    }
    if (video) {
      video.src = resolvedSrc;
      video.style.display = 'block';
      try { video.play(); } catch (e) {}
    }
    if (downloadText) downloadText.textContent = 'Unduh Video';
    if (downloadLink) {
      downloadLink.href = resolvedSrc;
      downloadLink.download = filename || 'video.mp4';
    }
  } else {
    if (video) {
      try { video.pause(); } catch (e) {}
      video.style.display = 'none';
      video.src = '';
    }
    if (img) {
      img.src = resolvedSrc;
      img.style.display = 'block';
    }
    if (downloadText) downloadText.textContent = 'Unduh Gambar';
    if (downloadLink) {
      downloadLink.href = resolvedSrc;
      downloadLink.download = filename || 'ai-generated-image.png';
    }
  }

  modal.style.display = 'flex';
}

function closeMediaLightbox() {
  const { modal, img, video } = getLightboxElements();
  if (!modal) return;
  modal.style.display = 'none';
  if (img) {
    img.src = '';
    img.style.display = 'none';
  }
  if (video) {
    try { video.pause(); } catch (e) {}
    video.src = '';
    video.style.display = 'none';
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const { modal } = getLightboxElements();
    if (modal && modal.style.display === 'flex') {
      closeMediaLightbox();
    }
  }
});

// Delegate click on generated image cards, thumbnails, and user attached videos to open fullscreen preview
document.addEventListener('click', (e) => {
  // 1. Close Lightbox Click
  if (e.target.closest('#btn-close-lightbox') || e.target.closest('#lightbox-backdrop')) {
    closeMediaLightbox();
    return;
  }

  // 2. AI Generated Image Card / Zoom Button
  const zoomBtn = e.target.closest('.btn-gen-img-zoom');
  const imgWrapper = e.target.closest('.gen-img-wrapper');
  if (zoomBtn || (imgWrapper && !e.target.closest('.btn-gen-img-download'))) {
    const targetWrapper = (zoomBtn ? zoomBtn.closest('.gen-img-wrapper') : imgWrapper) || imgWrapper;
    if (targetWrapper) {
      const imgEl = targetWrapper.querySelector('img');
      const src = targetWrapper.getAttribute('data-src') || (targetWrapper.getAttribute('data-local-id') ? `local-img://${targetWrapper.getAttribute('data-local-id')}` : (imgEl?.currentSrc || imgEl?.src));
      const alt = imgEl?.alt || 'AI Generated Image';
      if (src && !src.startsWith('data:image/gif;base64,')) {
        openMediaLightbox(src, false, alt.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) + '.png');
        return;
      } else if (imgEl?.src && !imgEl.src.startsWith('data:image/gif;base64,')) {
        openMediaLightbox(imgEl.src, false, alt.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) + '.png');
        return;
      }
    }
  }

  // 3. Click directly on any markdown/assistant image (excluding icons/avatars)
  const assistantImg = e.target.closest('.message.assistant .message-content img:not(.template-provider-img):not(.avatar):not(.quick-provider-icon)');
  if (assistantImg && !e.target.closest('.btn-gen-img-download') && !e.target.closest('.gen-img-wrapper')) {
    const src = assistantImg.currentSrc || assistantImg.src;
    if (src && !src.startsWith('data:image/gif;base64,')) {
      openMediaLightbox(src, false, (assistantImg.alt || 'ai-image').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) + '.png');
      return;
    }
  }

  // 4. User attached image thumbnail
  const userThumb = e.target.closest('.user-attached-thumb');
  if (userThumb) {
    const imgEl = userThumb.querySelector('img');
    const imgId = userThumb.getAttribute('data-image-id');
    (async () => {
      let src = imgEl?.src;
      if ((!src || src.startsWith('data:image/gif;base64')) && imgId) {
        const cached = await getImageFromIndexedDB(imgId);
        if (cached?.dataUrl) {
          src = cached.dataUrl;
          if (imgEl) {
            imgEl.src = src;
            imgEl.style.opacity = '1';
          }
        }
      }
      if (src && !src.startsWith('data:image/gif;base64')) {
        openMediaLightbox(src, false, userThumb.getAttribute('title') || 'image.png');
      }
    })();
    return;
  }

  // 5. User attached video card fullscreen button
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

  // 6. User attached video card body
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
  updateHeaderChatTitle();
  startTelegramPollingDaemonFromSidepanel();
}

bootstrap();
