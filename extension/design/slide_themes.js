// =========================================================================
// SLIDE THEMES REGISTRY & ADAPTIVE THEMATIC DEDUCTION
// 7 Design System Archetypes & "Mikir Keras" Semantic Style Engine
// =========================================================================

const SLIDE_THEMES = {
  playful_pastel: {
    id: "playful_pastel",
    name: "Playful Pastel & Warm Organic",
    category: "Cute / Pets / Food / Kids / Lifestyle / Fun",
    bgDesk: "#1A1715",
    bgSidebar: "#141210",
    bgSlide: "#FFFDF9",
    textMain: "#2C221E",
    textMuted: "#6E5D53",
    borderHeader: "#E5D9D0",
    accent: "#FF6B6B",
    accentSecondary: "#FA8072",
    accentTertiary: "#4ECDC4",
    cardBg: "#FFF5EE",
    cardBorder: "1.5px solid rgba(255, 107, 107, 0.22)",
    cardBoxBg: "#FFFFFF",
    cardRadius: "16px",
    fontHeading: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    tag: "PANDUAN & ENSIKLOPEDIA",
    subHeader: "EDUKASI LENGKAP"
  },
  dark_luxury_cyber: {
    id: "dark_luxury_cyber",
    name: "Dark Luxury Obsidian & Neon",
    category: "Tech / AI / Code / Web3 / Cyber / Future",
    bgDesk: "#07080A",
    bgSidebar: "#0C0E12",
    bgSlide: "#0F1117",
    textMain: "#F8FAFC",
    textMuted: "#94A3B8",
    borderHeader: "#334155",
    accent: "#CEF128",
    accentSecondary: "#00F0FF",
    accentTertiary: "#A855F7",
    cardBg: "#161922",
    cardBorder: "1.5px solid rgba(206, 241, 40, 0.25)",
    cardBoxBg: "#1E2330",
    cardRadius: "8px",
    fontHeading: "'Space Grotesk', 'Syne', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    tag: "TECH INNOVATION // ARCHITECTURE",
    subHeader: "SYSTEM SPECIFICATION"
  },
  swiss_minimalist: {
    id: "swiss_minimalist",
    name: "Swiss International Clean Minimal",
    category: "Corporate / Finance / Research / B2B / Law",
    bgDesk: "#0D1117",
    bgSidebar: "#161B22",
    bgSlide: "#FFFFFF",
    textMain: "#0F172A",
    textMuted: "#475569",
    borderHeader: "#E2E8F0",
    accent: "#0284C7",
    accentSecondary: "#0D9488",
    accentTertiary: "#E11D48",
    cardBg: "#F8FAFC",
    cardBorder: "1.5px solid rgba(15, 23, 42, 0.09)",
    cardBoxBg: "#FFFFFF",
    cardRadius: "6px",
    fontHeading: "'Inter', 'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    tag: "ANALISIS & LAPORAN RESMI",
    subHeader: "EXECUTIVE REPORT"
  },
  neo_brutalist: {
    id: "neo_brutalist",
    name: "Vibrant Neo-Brutalist",
    category: "Creative Pitch / Startups / Gen-Z / Campaigns",
    bgDesk: "#121212",
    bgSidebar: "#1A1A1A",
    bgSlide: "#FFFDF0",
    textMain: "#000000",
    textMuted: "#333333",
    borderHeader: "#000000",
    accent: "#FACC15",
    accentSecondary: "#FF3366",
    accentTertiary: "#00D26A",
    cardBg: "#FFFFFF",
    cardBorder: "2px solid #000000",
    cardBoxBg: "#F3F4F6",
    cardRadius: "10px",
    fontHeading: "'Syne', 'Space Grotesk', sans-serif",
    fontBody: "'Space Grotesk', sans-serif",
    tag: "CREATIVE STRATEGY // PLAYBOOK",
    subHeader: "ACTION PLAYBOOK"
  },
  botanical_sage: {
    id: "botanical_sage",
    name: "Botanical Sage & Organic Wellness",
    category: "Health / Nature / Wellness / Environment / Psychology",
    bgDesk: "#0F1A15",
    bgSidebar: "#14221C",
    bgSlide: "#F3F7F4",
    textMain: "#132E22",
    textMuted: "#3E6050",
    borderHeader: "#D1E0D7",
    accent: "#059669",
    accentSecondary: "#D97706",
    accentTertiary: "#0284C7",
    cardBg: "#E5EFE8",
    cardBorder: "1.5px solid rgba(5, 150, 105, 0.2)",
    cardBoxBg: "#FFFFFF",
    cardRadius: "14px",
    fontHeading: "'Plus Jakarta Sans', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    tag: "PANDUAN & KESEHATAN",
    subHeader: "WELLNESS FRAMEWORK"
  },
  monochrome_minimal: {
    id: "monochrome_minimal",
    name: "Monochrome Noir & Minimalist",
    category: "High-Fashion / Architecture / Portfolio / Photography",
    bgDesk: "#050505",
    bgSidebar: "#0D0D0D",
    bgSlide: "#141414",
    textMain: "#FFFFFF",
    textMuted: "#9CA3AF",
    borderHeader: "#262626",
    accent: "#E5E5E5",
    accentSecondary: "#999999",
    accentTertiary: "#525252",
    cardBg: "#1F1F1F",
    cardBorder: "1.5px solid rgba(255, 255, 255, 0.14)",
    cardBoxBg: "#262626",
    cardRadius: "8px",
    fontHeading: "'Space Grotesk', 'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    tag: "PORTFOLIO & DOKUMEN RESMI",
    subHeader: "VISUAL ANTHOLOGY"
  },
  warm_editorial: {
    id: "warm_editorial",
    name: "Warm Editorial Linen",
    category: "Editorial / Literature / Branding / Manifesto",
    bgDesk: "#0E1015",
    bgSidebar: "#0B0C10",
    bgSlide: "#F5F3EF",
    textMain: "#111827",
    textMuted: "#4B5563",
    borderHeader: "#9CA3AF",
    accent: "#FF4D00",
    accentSecondary: "#0284C7",
    accentTertiary: "#111827",
    cardBg: "rgba(255, 255, 255, 0.65)",
    cardBorder: "1.5px solid rgba(0, 0, 0, 0.08)",
    cardBoxBg: "#FFFFFF",
    cardRadius: "6px",
    fontHeading: "'Syne', 'Space Grotesk', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    tag: "STUDI & EKSPLORASI",
    subHeader: "PANDUAN MATERI"
  }
};

function detectOptimalSlideTheme(promptOrTopic = "", rawMeta = {}) {
  const text = (promptOrTopic + " " + (rawMeta?.title || "") + " " + (rawMeta?.description || "") + " " + (rawMeta?.system || "") + " " + (rawMeta?.theme || "")).toLowerCase();

  // 1. Explicit user request matching
  if (/pastel|kawaii|lucu|cute|gemes|gemoy|soft/i.test(text)) return SLIDE_THEMES.playful_pastel;
  if (/cyber|cyberpunk|neon|dark|obsidian|futuristik|hacker/i.test(text)) return SLIDE_THEMES.dark_luxury_cyber;
  if (/brutalis|brutalist|pop|retro|warna-warni/i.test(text)) return SLIDE_THEMES.neo_brutalist;
  if (/sage|botani|nature|organik|hijau|alam|wellness/i.test(text)) return SLIDE_THEMES.botanical_sage;
  if (/monokrom|monochrome|hitam-putih|noir|black and white/i.test(text)) return SLIDE_THEMES.monochrome_minimal;
  if (/swiss|minimalis|clean|putih|white/i.test(text)) return SLIDE_THEMES.swiss_minimalist;

  // 2. Intelligent Subject Domain Matching ("Mikir Keras" berdasarkan konteks materi)
  if (/kucing|cat|kitten|feline|anjing|dog|pet|hewan|binatang|satwa|burung|fish|ikan|anak|kids|bayi|toddler|resep|kuliner|masak|cooking|baking|cake|kopi|coffee|hobi|game|gaming|manga|anime|kartun/i.test(text)) {
    return SLIDE_THEMES.playful_pastel;
  }
  if (/ai|llm|machine learning|deep learning|coding|code|programmer|programming|python|javascript|react|vue|node|backend|frontend|devops|cloud|docker|linux|kubernetes|api|database|sql|cyber|security|solana|bitcoin|crypto|blockchain|web3|robot/i.test(text)) {
    return SLIDE_THEMES.dark_luxury_cyber;
  }
  if (/kesehatan|health|medis|medical|dokter|rumah sakit|mental|psikologi|mindfulness|yoga|diet|nutrisi|gizi|stres|stress|vitamin|olahraga|fitness|lingkungan|hutan|tanaman|bumi|climate/i.test(text)) {
    return SLIDE_THEMES.botanical_sage;
  }
  if (/bisnis|business|keuangan|finance|investasi|saham|reksadana|crypto finance|bank|banking|laporan|revenue|omset|audit|pajak|tax|hukum|law|compliance|legal|asuransi|insurance|corporate|b2b|enterprise/i.test(text)) {
    return SLIDE_THEMES.swiss_minimalist;
  }
  if (/startup|pitch|venture|growth|marketing|viral|tiktok|instagram|reels|campaign|gen-z|influencer|iklan|funnel|sales pitch/i.test(text)) {
    return SLIDE_THEMES.neo_brutalist;
  }
  if (/fashion|mode|fotografi|photography|seni|art|galeri|gallery|puisi|sastra|arsitektur|architecture|interior/i.test(text)) {
    return SLIDE_THEMES.monochrome_minimal;
  }

  // 3. Fallback to colors if provided
  if (rawMeta?.colors && Array.isArray(rawMeta.colors) && rawMeta.colors.length > 0) {
    const primary = rawMeta.colors[0];
    if (/^#0[0-9a-f]{5}$/i.test(primary)) {
      return SLIDE_THEMES.dark_luxury_cyber;
    }
  }

  return SLIDE_THEMES.warm_editorial;
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.SLIDE_THEMES = SLIDE_THEMES;
  window.detectOptimalSlideTheme = detectOptimalSlideTheme;
}
