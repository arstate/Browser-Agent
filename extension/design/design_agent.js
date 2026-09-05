// =========================================================================
// DESIGN AGENT DEFINITION & MULTI-AGENT HIERARCHY
// Master Agent (Supreme Commander) & Master Design (Right-Hand Lead Architect)
// =========================================================================

const MASTER_DESIGN_AGENT = {
  id: 'master_design',
  name: 'Master Design',
  role: 'Lead Creative Director & Slide Architect',
  badge: 'Tangan Kanan Master Agent',
  description: 'Tangan kanan Master Agent untuk perancangan visual, tata letak 16:9 widescreen, sistem desain adaptif sesuai materi, kurasi tipografi harmonis, dan interaktivitas canvas.',
  category: 'Design & Presentation',
  capabilities: [
    'slide_deck_16_9',
    'adaptive_design_systems',
    'bento_grid_layout',
    'bespoke_theming',
    'interactive_dock',
    'pdf_export_ready'
  ]
};

function createDesignHierarchyAgentInfo() {
  return {
    isBoss: true,
    name: 'Master Agent',
    role: 'Supreme Commander & Chief Orchestrator',
    badge: 'Supreme Orchestrator',
    workers: [
      {
        id: MASTER_DESIGN_AGENT.id,
        name: MASTER_DESIGN_AGENT.name,
        role: MASTER_DESIGN_AGENT.role,
        badge: MASTER_DESIGN_AGENT.badge,
        description: MASTER_DESIGN_AGENT.description,
        capabilities: MASTER_DESIGN_AGENT.capabilities
      }
    ]
  };
}

function getDesignMilestones(userTopic = '', isRevision = false, totalSlides = 5) {
  if (isRevision) {
    return [
      { title: "👑 Master Agent: Analisis Permintaan Revisi Canvas", completed: false, inProgress: true },
      { title: "🤝 Delegasi ke Master Design: Penyesuaian Slide & Elemen Aktif", completed: false, inProgress: false },
      { title: "🎨 Master Design: Modifikasi Teks, Tata Letak & Visual Canvas", completed: false, inProgress: false },
      { title: "👑 Master Agent: Re-Check Detail Seluruh Slide & Deteksi Miss", completed: false, inProgress: false },
      { title: "👑 Master Agent: Verifikasi Perubahan & Update Live Canvas Langsung", completed: false, inProgress: false }
    ];
  }
  return [
    {
      title: '👑 Master Agent: Analisis Brief & Penyusunan Cetak Biru Presentasi',
      completed: false,
      inProgress: true
    },
    {
      title: '🤝 Delegasi ke Master Design: Kurasi Style Visual & Palet Sesuai Materi',
      completed: false,
      inProgress: false
    },
    {
      title: `🎨 Master Design: Perancangan Bertahap Slide demi Slide (1 s/d ${totalSlides || 'N'})`,
      completed: false,
      inProgress: false
    },
    {
      title: '🔍 Quality Gate: Evaluasi & Revisi Setiap Slide sampai Tervalidasi',
      completed: false,
      inProgress: false
    },
    {
      title: '👑 Master Agent: Re-Check Detail Seluruh Slide & Final Approval',
      completed: false,
      inProgress: false
    }
  ];
}

function auditSingleSlide(slide, expectedLayout = '', topic = '') {
  if (!slide || typeof slide !== 'object') {
    return { ok: false, reason: 'Objek slide tidak valid atau kosong' };
  }
  if (!slide.title || String(slide.title).trim().length < 3) {
    return { ok: false, reason: 'Judul slide kosong atau terlalu pendek' };
  }
  
  // Strict check: Anti-slop and zero fake branding
  const textBlob = JSON.stringify(slide);
  if (/DJADI CREATIVE|GSM v3\.0|CONFIDENTIAL \/\/ ENTERPRISE/i.test(textBlob) && !/djadi/i.test(topic)) {
    return { ok: false, reason: 'Terdeteksi teks identitas usang atau fake corporate branding' };
  }

  const layout = String(slide.layout || expectedLayout || 'bento').toLowerCase();
  const cards = Array.isArray(slide.cards) ? slide.cards : [];

  if (layout === 'cover') {
    if (!slide.subtitle && cards.length === 0) {
      return { ok: false, reason: 'Subjudul atau ringkasan sampul belum terisi' };
    }
    return { ok: true, layout: 'cover' };
  }

  if (layout === 'split') {
    if (cards.length < 2) {
      return { ok: false, reason: 'Layout split membutuhkan minimal 2 pilar perbandingan' };
    }
    if (!cards[0].title || !cards[1].title) {
      return { ok: false, reason: 'Judul kartu pada layout split belum lengkap' };
    }
    return { ok: true, layout: 'split' };
  }

  if (layout === 'metrics') {
    if (cards.length < 3) {
      return { ok: false, reason: 'Layout metrics membutuhkan minimal 3-4 indikator data/angka' };
    }
    return { ok: true, layout: 'metrics' };
  }

  if (layout === 'quote') {
    if (!slide.quoteText && !slide.subtitle && cards.length === 0) {
      return { ok: false, reason: 'Pernyataan kutipan / manifesto belum lengkap' };
    }
    return { ok: true, layout: 'quote' };
  }

  if (layout === 'timeline') {
    if (cards.length < 3) {
      return { ok: false, reason: 'Alur proses timeline membutuhkan minimal 3 langkah terurut' };
    }
    return { ok: true, layout: 'timeline' };
  }

  if (layout === 'conclusion') {
    if (cards.length < 2 && !slide.subtitle) {
      return { ok: false, reason: 'Rangkuman checklist aksi penutup belum lengkap' };
    }
    return { ok: true, layout: 'conclusion' };
  }

  // Default Bento
  if (cards.length < 2) {
    return { ok: false, reason: 'Kartu bento modular kurang dari 2 pilar' };
  }

  return { ok: true, layout: 'bento' };
}

function auditFullDeck(slides, topic = '') {
  if (!Array.isArray(slides) || slides.length === 0) {
    return { ok: false, missList: ['Tidak ada slide yang berhasil dibuat'] };
  }

  const missList = [];

  // Check 1: Slide 1 should be Cover
  if (slides[0].layout !== 'cover') {
    missList.push('Slide 1 belum berformat Cover / Hero Title');
  }

  // Check 2: Layout variety - must NOT all have identical layout
  const layoutSet = new Set(slides.map(s => s.layout || 'bento'));
  if (slides.length >= 4 && layoutSet.size < 2) {
    missList.push('Variasi tata letak antar-slide masih minim, perlu diferensiasi arketipe');
  }

  // Check 3: Check for empty cards or titles
  slides.forEach((s, idx) => {
    if (!s.title || String(s.title).trim().length < 3) {
      missList.push(`Slide ${idx + 1} tidak memiliki judul yang memadai`);
    }
    if (s.cards && s.cards.length > 0 && s.cards.every(c => !c.title && !c.desc)) {
      missList.push(`Slide ${idx + 1} memiliki kartu dengan konten kosong`);
    }
  });

  return {
    ok: missList.length === 0,
    missList
  };
}

function createDefaultBlueprint(topic = 'Presentasi', targetSlideCount = 5, theme = {}) {
  const count = Math.max(3, Math.min(parseInt(targetSlideCount, 10) || 5, 12));
  const rawTitle = (topic || 'Materi Presentasi').replace(/^buatkan\s+(?:\d+\s+)?(?:slide|halaman)?\s*/i, '').trim() || 'Materi Presentasi';
  const cleanTitle = rawTitle.slice(0, 45).toUpperCase();

  const archetypes = ['split', 'bento', 'metrics', 'timeline', 'quote', 'bento', 'split', 'metrics'];
  const slides = [];

  const toRomanChar = (num) => {
    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return romans[num - 1] || String(num);
  };

  // Slide 1: Cover
  slides.push({
    index: 1,
    title: cleanTitle,
    subtitle: `Panduan komprehensif, wawasan strategis, dan implementasi terstruktur ${rawTitle.toLowerCase()}.`,
    layout: 'cover',
    badge: theme.tag || 'EDISI EKSKLUSIF'
  });

  // Middle slides
  for (let i = 2; i < count; i++) {
    const layout = archetypes[(i - 2) % archetypes.length];
    let defaultSub = 'Analisis mendalam dan kerangka kerja operasional.';
    if (layout === 'split') defaultSub = 'Eksplorasi dua dimensi utama dan komparasi strategis.';
    else if (layout === 'metrics') defaultSub = 'Indikator performa kunci dan tolak ukur keberhasilan.';
    else if (layout === 'quote') defaultSub = 'Prinsip fundamental dan filosofi inti pelaksanaan.';
    else if (layout === 'timeline') defaultSub = 'Tahapan implementasi berurutan dan terstandarisasi.';

    slides.push({
      index: i,
      title: `Bab ${toRomanChar(i)}: Eksplorasi Strategis 0${i}`,
      subtitle: defaultSub,
      layout: layout,
      badge: `POIN 0${i} // ANALISIS`
    });
  }

  // Final slide: Conclusion
  if (count >= 3) {
    slides.push({
      index: count,
      title: 'Kesimpulan & Tindak Lanjut',
      subtitle: 'Rangkuman eksekutif, rekomendasi aksi prioritas, dan peta jalan implementasi.',
      layout: 'conclusion',
      badge: 'ACTION PLAYBOOK'
    });
  }

  return {
    title: cleanTitle,
    category: theme.name || 'Executive Presentation',
    slides
  };
}

function reviseSlideData(slide, auditReason = '', expectedLayout = '', topic = '', theme = {}) {
  const revised = { ...(slide || {}) };
  const cleanTopic = (topic || 'Materi Presentasi').replace(/^buatkan\s+(?:\d+\s+)?(?:slide|halaman)?\s*/i, '').trim() || 'Materi Presentasi';

  // Fix 1: Bad or short title
  if (!revised.title || String(revised.title).trim().length < 3) {
    revised.title = `Analisis Komprehensif: ${cleanTopic.slice(0, 30)}`;
  }

  // Fix 2: Remove legacy or fake branding
  let strRep = JSON.stringify(revised);
  if (/DJADI CREATIVE|GSM v3\.0|CONFIDENTIAL \/\/ ENTERPRISE/i.test(strRep)) {
    strRep = strRep
      .replace(/DJADI CREATIVE/gi, cleanTopic.slice(0, 24).toUpperCase() || 'PRESENTASI')
      .replace(/GSM v3\.0/gi, theme.subHeader || 'PANDUAN LENGKAP')
      .replace(/CONFIDENTIAL \/\/ ENTERPRISE/gi, theme.tag || 'EDUKASI & INFORMASI');
    try {
      const parsed = JSON.parse(strRep);
      Object.assign(revised, parsed);
    } catch (e) {}
  }

  const layout = String(revised.layout || expectedLayout || 'bento').toLowerCase();
  revised.layout = layout;
  revised.cards = Array.isArray(revised.cards) ? [...revised.cards] : [];

  // Fix 3: Layout-specific fixes
  if (layout === 'cover') {
    if (!revised.subtitle) {
      revised.subtitle = `Panduan komprehensif, wawasan strategis, dan peta jalan implementasi ${cleanTopic.toLowerCase()}.`;
    }
    revised.badge = revised.badge || theme.tag || 'EDISI EKSKLUSIF';
  } else if (layout === 'split') {
    while (revised.cards.length < 2) {
      const idx = revised.cards.length + 1;
      revised.cards.push({
        badge: `PILAR 0${idx}`,
        title: idx === 1 ? 'Kondisi Eksisting & Tantangan' : 'Peluang Transformasi & Solusi',
        desc: idx === 1 ? 'Pemetaan komparatif variabel kritis dan evaluasi risiko mendasar.' : 'Akselerasi terukur dengan metodologi berbasis data dan dampak teruji.',
        stat: `0${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: idx === 1 ? 'EVALUASI RISIKO' : 'SOLUSI STRATEGIS'
      });
    }
  } else if (layout === 'metrics') {
    while (revised.cards.length < 3) {
      const idx = revised.cards.length + 1;
      const metricValues = ['98.4%', '3.5x', '100%', '+45%'];
      revised.cards.push({
        badge: `METRIK 0${idx}`,
        title: `Indikator Performa 0${idx}`,
        desc: `Capaian efisiensi dan tolak ukur keberhasilan operasional sistem.`,
        stat: metricValues[idx - 1] || '100%',
        metricValue: metricValues[idx - 1] || '100%',
        footerHighlight: 'KPI TARGET'
      });
    }
  } else if (layout === 'quote') {
    if (!revised.quoteText) {
      revised.quoteText = revised.subtitle || `Keberhasilan transformasi terletak pada presisi eksekusi dan konsistensi perbaikan berkesinambungan.`;
    }
    if (!revised.quoteAuthor) {
      revised.quoteAuthor = cleanTopic.slice(0, 24).toUpperCase() || 'EXECUTIVE PRINCIPLE';
    }
  } else if (layout === 'timeline') {
    while (revised.cards.length < 3) {
      const idx = revised.cards.length + 1;
      const phases = ['Inisiasi & Analisis', 'Eksekusi & Integrasi', 'Skalabilitas & Audit'];
      revised.cards.push({
        badge: `FASE 0${idx}`,
        title: phases[idx - 1] || `Tahap Implementasi 0${idx}`,
        desc: `Pelaksanaan terstruktur dengan kontrol kualitas ketat pada setiap milestone.`,
        stat: `F${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: 'MILESTONE UTAMA'
      });
    }
  } else if (layout === 'conclusion') {
    while (revised.cards.length < 2) {
      const idx = revised.cards.length + 1;
      revised.cards.push({
        badge: `AKSI 0${idx}`,
        title: idx === 1 ? 'Prioritas Implementasi 30 Hari' : 'Evaluasi & Skalabilitas Berkelanjutan',
        desc: idx === 1 ? 'Mobilisasi sumber daya dan penetapan parameter keberhasilan awal.' : 'Monitoring berkala untuk memastikan konsistensi luaran jangka panjang.',
        stat: `0${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: 'ACTION ITEM'
      });
    }
  } else {
    // Bento
    while (revised.cards.length < 2) {
      const idx = revised.cards.length + 1;
      revised.cards.push({
        badge: `POIN 0${idx} // ANALISIS`,
        title: `Wawasan Strategis 0${idx}`,
        desc: `Pendalaman materi dan elaborasi solusi praktis berbasis studi kasus nyata.`,
        stat: `0${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: 'KEY INSIGHT'
      });
    }
  }

  // Ensure card titles are not empty
  revised.cards.forEach((c, ci) => {
    if (!c.title || String(c.title).trim().length < 2) {
      c.title = `Poin Analisis 0${ci + 1}`;
    }
    if (!c.desc || String(c.desc).trim().length < 4) {
      c.desc = `Penjabaran poin penting mengenai implementasi dan optimasi sistem.`;
    }
  });

  return revised;
}

function reviseFullDeckData(slides, missList = [], topic = '', theme = {}) {
  if (!Array.isArray(slides) || slides.length === 0) return slides;
  const revisedSlides = [...slides];
  const archetypes = ['split', 'bento', 'metrics', 'timeline', 'quote', 'bento', 'split', 'metrics'];

  // Miss: Slide 1 not cover
  if (missList.some(m => /slide 1 belum berformat cover/i.test(m))) {
    revisedSlides[0].layout = 'cover';
    revisedSlides[0] = reviseSlideData(revisedSlides[0], '', 'cover', topic, theme);
  }

  // Miss: Layout variety minimal
  if (missList.some(m => /variasi tata letak antar-slide masih minim/i.test(m))) {
    revisedSlides.forEach((s, idx) => {
      if (idx === 0) s.layout = 'cover';
      else if (idx === revisedSlides.length - 1 && revisedSlides.length >= 4) s.layout = 'conclusion';
      else {
        s.layout = archetypes[(idx - 1) % archetypes.length];
      }
      revisedSlides[idx] = reviseSlideData(s, '', s.layout, topic, theme);
    });
  }

  // Miss: empty titles or cards
  revisedSlides.forEach((s, idx) => {
    const singleAudit = auditSingleSlide(s, s.layout, topic);
    if (!singleAudit.ok) {
      revisedSlides[idx] = reviseSlideData(s, singleAudit.reason, s.layout, topic, theme);
    }
  });

  return revisedSlides;
}

function createSlidePromptForMasterDesign(slideIndex, totalSlides, topic = '', blueprintSlide = {}, prevSlideSummary = '') {
  const slideNum = slideIndex + 1;
  const cleanTopic = (topic || 'Materi Presentasi').replace(/^buatkan\s+(?:\d+\s+)?(?:slide|halaman)?\s*/i, '').trim();
  const layout = blueprintSlide.layout || (slideNum === 1 ? 'cover' : 'bento');
  const title = blueprintSlide.title || `Slide ${slideNum}`;

  return `Kamu adalah 🎨 Master Design (Tangan Kanan Master Agent).
Tugasmu: Rancang konten SANGAT DETAIL dan SPESIFIK untuk Slide ${slideNum} dari total ${totalSlides} slide presentasi 16:9 widescreen.

Materi Utama: "${cleanTopic}"
Arketipe Tata Letak: ${layout.toUpperCase()}
Judul Sasaran: "${title}"
${prevSlideSummary ? `Konteks Slide Sebelumnya: "${prevSlideSummary}"` : ''}

ATURAN KETAT:
1. DILARANG menggunakan teks korporat palsu ("Djadi Creative", "GSM v3.0", "Confidential // Enterprise").
2. Konten harus berbobot, berbasis fakta/analisis/strategi nyata, tidak klise.
3. Arketipe ${layout}:
   - Jika "cover": Hasilkan judul utama megah, lead subtitle komprehensif, badge status eksklusif, dan 2-3 poin ringkasan.
   - Jika "split": Minimal 2 kartu perbandingan (50:50) dengan judul tajam, deskripsi komparatif, dan footer highlight.
   - Jika "metrics": Minimal 3-4 kartu dengan angka metrik/KPI riil (contoh: "98.4%", "3.5x", "12-16 Jam"), judul metrik, deskripsi dampak, dan highlight.
   - Jika "timeline": Minimal 3-4 kartu langkah berurutan (Tahap 01 s/d 04) dengan judul fase dan roadmap eksekusi.
   - Jika "quote": Kutipan berbobot, signifikansi strategis, dan atribusi otoritatif.
   - Jika "conclusion": Ringkasan eksekutif dan checklist aksi prioritas.
   - Jika "bento": 3 kartu pilar bento dengan analisis mendalam.

Balas HANYA berupa JSON valid dalam blok \`\`\`json ... \`\`\` dengan format:
{
  "title": "Judul Slide ${slideNum}",
  "subtitle": "Penjelasan mendalam konteks slide",
  "layout": "${layout}",
  "badge": "BADGE ${slideNum}",
  "quoteText": "",
  "quoteAuthor": "",
  "cards": [
    {
      "badge": "PILAR 01",
      "title": "Judul Analitis",
      "desc": "Penjabaran komprehensif tanpa generalisasi klise...",
      "stat": "98%",
      "metricValue": "98%",
      "footerHighlight": "KEY POINT"
    }
  ]
}`;
}

function parseSingleSlideJson(rawText, fallbackSlide = {}) {
  if (!rawText || typeof rawText !== 'string') return fallbackSlide;
  try {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i) || [null, rawText];
    const targetStr = (jsonMatch[1] || rawText).trim();
    const firstBrace = targetStr.indexOf('{');
    const lastBrace = targetStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const cleanJson = targetStr.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(cleanJson);
      if (parsed && (parsed.title || parsed.cards)) {
        return {
          ...fallbackSlide,
          ...parsed,
          layout: parsed.layout || fallbackSlide.layout || 'bento',
          cards: Array.isArray(parsed.cards) && parsed.cards.length > 0 ? parsed.cards : (fallbackSlide.cards || [])
        };
      }
    }
  } catch (e) {}

  // Fallback markdown parsing
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const slide = { ...fallbackSlide };
  const cards = [];
  for (const line of lines) {
    if (line.startsWith('#')) {
      slide.title = line.replace(/^#+\s*/, '').trim() || slide.title;
    } else if (/^(?:subjudul|subtitle)[:\s-]/i.test(line)) {
      slide.subtitle = line.replace(/^(?:subjudul|subtitle)[:\s-]*/i, '').trim();
    } else if (/^[-*•]\s*/.test(line)) {
      const item = line.replace(/^[-*•]\s*/, '').trim();
      const parts = item.split(':');
      if (parts.length > 1) {
        cards.push({
          badge: `PILAR 0${cards.length + 1}`,
          title: parts[0].replace(/\*\*/g, '').trim(),
          desc: parts.slice(1).join(':').trim(),
          stat: `0${cards.length + 1}`,
          metricValue: `0${cards.length + 1}`,
          footerHighlight: parts[0].slice(0, 20).toUpperCase()
        });
      }
    }
  }
  if (cards.length > 0) slide.cards = cards;
  return slide;
}

// Attach to window for global extension access
if (typeof window !== 'undefined') {
  window.MASTER_DESIGN_AGENT = MASTER_DESIGN_AGENT;
  window.createDesignHierarchyAgentInfo = createDesignHierarchyAgentInfo;
  window.getDesignMilestones = getDesignMilestones;
  window.auditSingleSlide = auditSingleSlide;
  window.auditFullDeck = auditFullDeck;
  window.createDefaultBlueprint = createDefaultBlueprint;
  window.reviseSlideData = reviseSlideData;
  window.reviseFullDeckData = reviseFullDeckData;
  window.createSlidePromptForMasterDesign = createSlidePromptForMasterDesign;
  window.parseSingleSlideJson = parseSingleSlideJson;
}
