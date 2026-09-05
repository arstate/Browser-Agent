// =========================================================================
// SLIDE THEMES REGISTRY & ADAPTIVE THEMATIC DEDUCTION
// 7 Design System Archetypes & "Mikir Keras" Semantic Style Engine
// =========================================================================

const SLIDE_THEMES = {
  playful_pastel: {
    id: "playful_pastel",
    name: "Playful Pastel & Kawaii Doodles",
    category: "Cute / Pets / Food / Kids / Lifestyle / Fun",
    isPlayful: true,
    doodlePaws: true,
    bgDesk: "#181513",
    bgSidebar: "#13110F",
    bgSlide: "#FFF9F2",
    textMain: "#2C211B",
    textMuted: "#7A685D",
    borderHeader: "#F0E1D5",
    accent: "#FF6B6B",
    accentSecondary: "#FA8072",
    accentTertiary: "#4ECDC4",
    cardBg: "#FFFFFF",
    cardBorder: "1.5px solid rgba(255, 107, 107, 0.28)",
    cardBoxBg: "#FFF6EF",
    cardRadius: "18px",
    fontHeading: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    tag: "🐾 CATATAN GEMAS",
    subHeader: "PANDUAN HANGAT ANABUL"
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
  window.exploreDesignStyleConcept = exploreDesignStyleConcept;
}

function exploreDesignStyleConcept(promptOrTopic = "", rawMeta = {}) {
  const theme = detectOptimalSlideTheme(promptOrTopic, rawMeta);
  const text = (promptOrTopic + " " + (rawMeta?.title || "")).toLowerCase();

  let conceptName = "Bespoke Modern Minimalist";
  let vibe = "Bersih, terstruktur, fokus pada keterbacaan data dan hierarki visual yang jelas.";
  let layoutFeel = "Asimetris dinamis, kartu sorotan fokus, chip tag modern, tanpa sekat korporat kaku.";
  let badgeTone = "KARAKTERISTIK";

  if (theme.id === "playful_pastel") {
    conceptName = "Kawaii Doodles & Warm Cat Stories";
    vibe = "Hangat, ceria, menggemaskan dengan ilustrasi emot paws 🐾, coretan doodle kucing, sudut membulat manis, dan foto kucing berwajah lucu.";
    layoutFeel = "Bebas dari sekat kaku korporat, kartu bernafas lega, chip tag manis bertabur paw print, margin lapang.";
    badgeTone = "🐾 FAKTA GEMAS";
  } else if (theme.id === "dark_luxury_cyber") {
    conceptName = "Dark Luxury Obsidian & High-Tech HUD";
    vibe = "Futuristik, sleek, presisi, beraksen neon tajam dengan latar belakang gelap pekat.";
    layoutFeel = "Grid berteknologi tinggi, chip metrik bercahaya, badge monospaced.";
    badgeTone = "SYSTEM CORE";
  } else if (theme.id === "swiss_minimalist") {
    conceptName = "Swiss Contemporary Executive";
    vibe = "Rapi, otoritatif, elegan tanpa dekorasi berlebih, menitikberatkan pada tipografi tajam.";
    layoutFeel = "Proporsi grid modular murni, whitespace lapang, kontras tinggi.";
    badgeTone = "KEY FINDING";
  } else if (theme.id === "neo_brutalist") {
    conceptName = "Vibrant Neo-Brutalist Playbook";
    vibe = "Ekspresif, berenergi tinggi, kontras berani, cocok untuk audiens modern & Gen-Z.";
    layoutFeel = "Border tebal berkarakter, badge blok mencolok, tipografi dinamis.";
    badgeTone = "CORE ACTION";
  } else if (theme.id === "botanical_sage") {
    conceptName = "Organic Botanical & Natural Wellness";
    vibe = "Menenangkan, organik, menyegarkan dengan palet daun sage dan warna bumi alami.";
    layoutFeel = "Kartu lapang berventilasi, badge pill natural, ritme visual santai.";
    badgeTone = "PRINSIP ALAMI";
  } else if (theme.id === "monochrome_minimal") {
    conceptName = "Noir Architecture & High-Fashion Gallery";
    vibe = "Sophisticated, artistik, kontras hitam-putih murni layaknya kurasi majalah mode.";
    layoutFeel = "Tata letak galeri seni, tipografi editorial ekspresif, minimalis ekstrem.";
    badgeTone = "PORTFOLIO INSIGHT";
  } else {
    conceptName = "Warm Magazine Editorial Linen";
    vibe = "Hangat layaknya kertas linen majalah literatur independen, estetika klasik modern.";
    layoutFeel = "Kombinasi headline berkarakter dan catatan kurasi tajam.";
    badgeTone = "CATATAN KURASI";
  }

  return {
    theme,
    conceptName,
    vibe,
    layoutFeel,
    badgeTone,
    paletteSummary: `${theme.accent} (Aksen), ${theme.accentSecondary} (Sekunder), ${theme.bgSlide} (Latar)`
  };
}

// Koleksi kurasi foto kucing lucu resolusi tinggi (muka kucing jelas & menggemaskan)
const CUTE_CAT_PHOTO_COLLECTION = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=800&auto=format&fit=crop&q=80'
];

function getCutePawSvg(color = "currentColor", size = 20) {
  return `<svg class="doodle-paw-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 13c-2.2 0-4 1.8-4 4 0 1.7 1.3 3 3 3 1.1 0 2-.9 2-2 0 1.1.9 2 2 2 1.7 0 3-1.3 3-3 0-2.2-1.8-4-4-4zm-4.5-3c1.4 0 2.5-1.1 2.5-2.5S8.9 5 7.5 5 5 6.1 5 7.5 6.1 10 7.5 10zm9 0c1.4 0 2.5-1.1 2.5-2.5S17.9 5 16.5 5 14 6.1 14 7.5s1.1 2.5 2.5 2.5zM12 7.5c1.4 0 2.5-1.1 2.5-2.5S13.4 2.5 12 2.5 9.5 3.6 9.5 5s1.1 2.5 2.5 2.5z"/></svg>`;
}

function getCuteCatFaceSvg(color = "currentColor", size = 24) {
  return `<svg class="doodle-cat-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><path d="M4 11V7l5 3h6l5-3v4c0 5-4 9-8 9s-8-4-8-9z"/><circle cx="9" cy="13" r="1.2" fill="${color}"/><circle cx="15" cy="13" r="1.2" fill="${color}"/><path d="M12 15v1.2m-2.2-.2h4.4"/><path d="M6 13H2m4 2H3m15-2h4m-4 2h3"/></svg>`;
}

function getCuteSparkleSvg(color = "currentColor", size = 18) {
  return `<svg class="doodle-sparkle-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>`;
}

function getCuteHeartSvg(color = "currentColor", size = 18) {
  return `<svg class="doodle-heart-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
}

function resolveThematicImageUrl(topic = '', index = 0) {
  const isCat = /kucing|cat|kitten|feline|meow|anabul/i.test(topic);
  if (isCat && CUTE_CAT_PHOTO_COLLECTION.length > 0) {
    const idx = Math.abs(index) % CUTE_CAT_PHOTO_COLLECTION.length;
    return CUTE_CAT_PHOTO_COLLECTION[idx];
  }
  return '';
}

// Global attachments
if (typeof window !== 'undefined') {
  window.SLIDE_THEMES = SLIDE_THEMES;
  window.detectOptimalSlideTheme = detectOptimalSlideTheme;
  window.exploreDesignStyleConcept = exploreDesignStyleConcept;
  window.CUTE_CAT_PHOTO_COLLECTION = CUTE_CAT_PHOTO_COLLECTION;
  window.getCutePawSvg = getCutePawSvg;
  window.getCuteCatFaceSvg = getCuteCatFaceSvg;
  window.getCuteSparkleSvg = getCuteSparkleSvg;
  window.getCuteHeartSvg = getCuteHeartSvg;
  window.resolveThematicImageUrl = resolveThematicImageUrl;
}
