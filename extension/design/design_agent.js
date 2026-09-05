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
    { title: '👑 Master Agent: Analisis Brief & Penyusunan Cetak Biru Presentasi', completed: false, inProgress: true },
    { title: '🤝 Delegasi ke Master Design: Kurasi Style Visual & Palet Sesuai Materi', completed: false, inProgress: false },
    { title: `🎨 Master Design: Perancangan Bertahap Slide demi Slide (1 s/d ${totalSlides || 'N'})`, completed: false, inProgress: false },
    { title: '🔍 Quality Gate: Evaluasi & Revisi Setiap Slide sampai Tervalidasi', completed: false, inProgress: false },
    { title: '👑 Master Agent: Re-Check Detail Seluruh Slide & Final Approval', completed: false, inProgress: false }
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

function cleanPresentationTopic(rawPrompt = "") {
  let text = String(rawPrompt || "").trim();
  text = text.replace(/^(?:tolong\s+)?(?:buatkan|bikin|buat|generate|create|siapkan|rancang|tampilkan|sajikan)\s+/i, "");
  text = text.replace(/^(?:(?:\d+\s+)?(?:slide|slides|deck|presentasi|presentation|ppt|pdf|materi|dokumen|kanvas|canvas)\s*)+(?:tentang|mengenai|seputar|topik|tema|bahas|soal)?\s+/i, "");
  text = text.replace(/^(?:tentang|mengenai|seputar|topik|tema|bahas|soal)\s+/i, "");
  text = text.replace(/\s+(?:sebanyak\s+)?\d+\s*(?:slide|slides|halaman|lembar|page|pages|hal)?\s*$/i, "");
  text = text.replace(/\s+(?:format\s+)?(?:pdf|ppt|powerpoint|deck|16:9|widescreen)\s*$/i, "");
  text = text.replace(/^[:\-\s]+|[:\-\s]+$/g, "").trim();
  return text || "Materi Presentasi";
}

function toTitleCaseIndonesian(str) {
  const smallWords = /^(di|ke|dari|dan|yang|untuk|pada|seputar|tentang|dengan|atau|serta)$/i;
  return String(str || "").split(/\s+/).map((w, i) => {
    if (i > 0 && smallWords.test(w)) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function generateEditorialTitle(cleanTopic, themeId = "playful_pastel") {
  const titleCase = toTitleCaseIndonesian(cleanTopic);
  if (/kucing|hewan|anjing|pet|fauna|satwa|binatang/i.test(cleanTopic)) {
    return {
      title: `Pesona & Ragam ${titleCase}`,
      subtitle: `Mengenal keunikan ras nusantara, tingkah menggemaskan si anabul, dan panduan merawat penuh kasih.`
    };
  }
  if (/kopi|kuliner|makanan|masakan|resep|minuman/i.test(cleanTopic)) {
    return {
      title: `Cita Rasa & Eksplorasi ${titleCase}`,
      subtitle: `Menjelajahi asal-usul rasa autentik, seni peracikan, dan keistimewaan tradisi nusantara.`
    };
  }
  if (/ai|coding|tech|cyber|software|startup|data|cloud|devops/i.test(cleanTopic)) {
    return {
      title: `Inovasi & Masa Depan: ${titleCase}`,
      subtitle: `Analisis arsitektur sistem modern, peluang transformasi digital, dan peta jalan teknologi terdepan.`
    };
  }
  if (/sejarah|budaya|nusantara|indonesia|seni|tradisi/i.test(cleanTopic)) {
    return {
      title: `Warisan & Jejak Sejarah: ${titleCase}`,
      subtitle: `Kilas balik mendalam, nilai-nilai luhur peradaban, dan relevansinya di era modern.`
    };
  }
  if (/kesehatan|medis|wellness|olahraga|nutrisi|mental/i.test(cleanTopic)) {
    return {
      title: `Harmoni & Panduan Hidup Sehat: ${titleCase}`,
      subtitle: `Pendekatan komprehensif, pemahaman fundamental, dan langkah praktis mewujudkan kebugaran optimal.`
    };
  }
  return {
    title: `Eksplorasi Komprehensif: ${titleCase}`,
    subtitle: `Wawasan mendalam, analisis pilar utama, dan panduan terstruktur seputar ${cleanTopic.toLowerCase()}.`
  };
}

function createDefaultBlueprint(topic = 'Presentasi', targetSlideCount = 5, theme = {}) {
  const count = Math.max(3, Math.min(parseInt(targetSlideCount, 10) || 5, 30));
  const cleanTopic = cleanPresentationTopic(topic);
  const edObj = generateEditorialTitle(cleanTopic, theme.id);
  const titleCase = toTitleCaseIndonesian(cleanTopic);

  const archetypes = ['split', 'bento', 'metrics', 'timeline', 'quote', 'bento', 'split', 'metrics'];
  const slides = [];

  slides.push({
    index: 1,
    title: edObj.title,
    subtitle: edObj.subtitle,
    layout: 'cover',
    badge: theme.tag || 'EDISI EKSKLUSIF'
  });

  let outlineTitles = [];
  if (/meta\s*ads|iklan|marketing|facebook\s*ads|instagram\s*ads|cpr|roas|campaign/i.test(cleanTopic)) {
    outlineTitles = [
      ['Ringkasan Kinerja & KPI Utama', 'Ikhtisar metrik performa kampanye iklan, spend, dan pencapaian target.'],
      ['Struktur Kampanye & Objektif Penjualan', 'Pemetaan hierarki Advantage+ Campaign Budget (CBO) dan targeting.'],
      ['Analisis Biaya per Hasil (CPR) & Efisiensi', 'Tolak ukur biaya per prospek berkualitas vs threshold profitabilitas.'],
      ['Evaluasi CTR, Hook Rate & Interaksi Visual', 'Daya pikat 3 detik pertama video Reels dan rasio klik tautan.'],
      ['Segmentasi Demografi & Sebaran Wilayah', 'Karakteristik audiens usia 25-45 tahun di wilayah target utama.'],
      ['Komparasi Format: Reels vs Feed vs Carousel', 'Analisis efektivitas format materi kreatif dalam memicu respon chat.'],
      ['Kualitas Leads & Rasio Konversi WhatsApp', 'Tingkat kelayakan calon pembeli dan kecepatan respon admin.'],
      ['A/B Testing Copywriting & Sudut Penawaran', 'Pengujian headline anti-price shock dan pemicu urgensi penawaran.'],
      ['Deteksi Ad Fatigue & Siklus Kejenuhan Kreatif', 'Pemantauan frekuensi tayang dan timing tepat untuk penyegaran materi.'],
      ['Alokasi Anggaran & Strategi Skalabilitas', 'Rencana penambahan budget bertahap pada adset dengan CPR terendah.'],
      ['Strategi Retargeting & Custom Audience', 'Menjangkau kembali pengunjung profil dan prospek yang belum closing.'],
      ['Eliminasi Junk Leads & Penyempurnaan Filter', 'Penerapan negative keyword dan penguncian audiens berdaya beli tinggi.'],
      ['Benchmark Kompetitor & Tren Kreatif Industri', 'Peta persaingan konten visual dan diferensiasi penawaran produk.'],
      ['Analisis Kebocoran Biaya & Optimalisasi Jam Tayang', 'Penyesuaian jadwal penayangan iklan pada jam-jam aktif konsumen.'],
      ['Diagnostik Kesehatan Akun & Mitigasi Risiko', 'Pencegahan pembatasan akun dan kepatuhan terhadap kebijakan periklanan.'],
      ['Rekomendasi Strategis & Quick Wins', 'Langkah perbaikan instan untuk menurunkan CPR dalam 48 jam ke depan.'],
      ['Peta Jalan Eksekusi & Target Skala Bulanan', 'Tahapan aksi berkelanjutan menuju target closing maksimal.']
    ].map(([title, sub]) => ({ title, sub }));
  } else if (/kucing|hewan|anjing|pet|fauna|satwa/i.test(cleanTopic)) {
    outlineTitles = [
      [`Asal-Usul & Keanekaragaman ${titleCase}`, `Menelusuri jejak sejarah dan keunikan fauna endemik nusantara.`],
      [`Ragam Ras Populer & Karakteristik Fisik`, `Mengenal ciri khas bulu, postur tubuh, dan adaptasi lingkungan.`],
      [`Perilaku & Tingkah Menggemaskan Si Anabul`, `Mengapa kucing mendengkur, memijat, dan bagaimana mereka berkomunikasi.`],
      [`Fakta Kunci & Statistik Pecinta Hewan`, `Data populasi, tren adopsi, dan antusiasme komunitas nusantara.`],
      [`Mitos vs Fakta Populer Seputar ${titleCase}`, `Mengurai kesalahpahaman umum dengan fakta biologis terpercaya.`],
      [`Filosofi Kasih Sayang & Kesejahteraan Hewan`, `Tanggung jawab moral dan kebahagiaan hidup berdampingan dengan satwa.`],
      [`Panduan Perawatan & Kebutuhan Nutrisi Harian`, `Langkah demi langkah menjaga kebersihan, gizi seimbang, dan kebugaran.`],
      [`Kesehatan, Vaksinasi & Perlindungan Rutin`, `Pencegahan penyakit menular dan pentingnya jadwal dokter hewan.`],
      [`Komitmen Peduli: Aksi Nyata Lindungi ${titleCase}`, `Gerakan adopsi bertanggung jawab dan kepedulian satwa jalanan.`]
    ].map(([title, sub]) => ({ title, sub }));
  } else if (/kopi|kuliner|makanan|masakan/i.test(cleanTopic)) {
    outlineTitles = [
      [`Asal-Usul & Filosofi Rasa ${titleCase}`, `Kisah di balik tradisi bahan baku autentik nusantara.`],
      [`Keistimewaan Bahan & Varietas Utama`, `Karakteristik mutu dan standar pemilihan bahan terbaik.`],
      [`Seni Peracikan & Teknik Pengolahan`, `Kombinasi metode tradisional dan sentuhan presisi modern.`],
      [`Metrik Mutu & Standar Cita Rasa`, `Tolak ukur rasa, aroma, dan kepuasan penikmat kuliner.`],
      [`Diferensiasi & Ciri Khas Autentik`, `Faktor pembeda yang menjadikannya ikonik dan dicintai.`],
      [`Filosofi & Kebersamaan Menikmati Hidangan`, `Nilai sosial dan kehangatan di setiap sajian.`],
      [`Alur Kreasi dari Dapur hingga Meja Saji`, `Tahapan pengolahan higienis dengan dedikasi tinggi.`],
      [`Peluang Eksplorasi & Inovasi Rasa`, `Tren masa depan dan adaptasi selera generasi baru.`],
      [`Rangkuman Rasa & Warisan Kuliner`, `Melestarikan kekayaan tradisi kuliner untuk generasi mendatang.`]
    ].map(([title, sub]) => ({ title, sub }));
  } else if (/ai|coding|tech|cyber|software|startup|data/i.test(cleanTopic)) {
    outlineTitles = [
      [`Pondasi & Evolusi Teknologi ${titleCase}`, `Latar belakang perkembangan dan pendorong inovasi modern.`],
      [`Arsitektur Sistem & Komponen Kunci`, `Pilar teknis yang menopang keandalan dan skalabilitas.`],
      [`Kapabilitas Inti & Diferensiasi Solusi`, `Fitur unggulan yang memberikan keunggulan kompetitif nyata.`],
      [`Indikator Performa & Metrik Efisiensi`, `Pengukuran latensi, throughput, dan dampak optimasi.`],
      [`Tantangan Keamanan & Mitigasi Risiko`, `Evaluasi komparatif celah sistem dan benteng pertahanan.`],
      [`Prinsip Filosofi Desain Sistem Terbuka`, `Standar kehandalan, interoperabilitas, dan keamanan kode.`],
      [`Peta Jalan Implementasi & Deployment`, `Alur eksekusi dari prototipe hingga skala produksi.`],
      [`Ekosistem Integrasi & Automasi Terpadu`, `Menghubungkan layanan pendukung untuk efisiensi maksimal.`],
      [`Kesimpulan Strategis & Arah Masa Depan`, `Rangkuman eksekutif dan rekomendasi adopsi teknologi.`]
    ].map(([title, sub]) => ({ title, sub }));
  } else {
    outlineTitles = [
      [`Fondasi & Latar Belakang ${titleCase}`, `Pemahaman mendasar mengenai sejarah dan konteks utama.`],
      [`Pilar Utama & Ruang Lingkup ${titleCase}`, `Eksplorasi dimensi penting dan struktur pembahasan.`],
      [`Karakteristik & Keunikan Penting`, `Aspek khusus yang membedakan dan menjadikannya bernilai.`],
      [`Data, Fakta & Statistik Kunci`, `Angka nyata dan tolak ukur penting yang terverifikasi.`],
      [`Komparasi Perspektif & Analisis Kritis`, `Membedah peluang, tantangan, dan sudut pandang berbeda.`],
      [`Prinsip Utama & Nilai Fundamental`, `Pijakan moral dan pemikiran inti yang mendasari materi.`],
      [`Tahapan Implementasi & Panduan Aksi`, `Langkah operasional yang sistematis dan terstruktur.`],
      [`Faktor Pendukung & Penguatan Kualitas`, `Elemen pelengkap yang memaksimalkan keberhasilan hasil.`],
      [`Kesimpulan Komprehensif & Rekomendasi`, `Rangkuman wawasan dan intisari penting untuk masa depan.`]
    ].map(([title, sub]) => ({ title, sub }));
  }

  for (let i = 2; i < count; i++) {
    const layout = archetypes[(i - 2) % archetypes.length];
    const outlineIdx = (i - 2) % outlineTitles.length;
    const outlineItem = outlineTitles[outlineIdx];
    const suffix = (i - 2 >= outlineTitles.length) ? ` // Lanjutan ${Math.floor((i - 2) / outlineTitles.length) + 1}` : '';
    slides.push({
      index: i,
      title: outlineItem.title + suffix,
      subtitle: outlineItem.sub,
      layout: layout,
      badge: `BAB ${String(i).padStart(2, '0')} // ${cleanTopic.slice(0, 16).toUpperCase()}`
    });
  }

  if (count >= 3) {
    const lastOutline = outlineTitles[outlineTitles.length - 1];
    slides.push({
      index: count,
      title: lastOutline.title || `Rangkuman & Kesimpulan: ${titleCase}`,
      subtitle: lastOutline.sub || `Intisari pemahaman dan rekomendasi terbaik seputar ${cleanTopic.toLowerCase()}.`,
      layout: 'conclusion',
      badge: 'KESIMPULAN'
    });
  }

  return {
    title: edObj.title,
    category: theme.name || 'Executive Presentation',
    slides
  };
}

function reviseSlideData(slide, auditReason = '', expectedLayout = '', topic = '', theme = {}) {
  const revised = { ...(slide || {}) };
  const cleanTopic = cleanPresentationTopic(topic || 'Materi Presentasi');
  const titleCase = toTitleCaseIndonesian(cleanTopic);

  // Fix 1: Bad or short title
  if (!revised.title || String(revised.title).trim().length < 3 || /^(?:slide|halaman|lembar)\s*\d*$/i.test(revised.title)) {
    revised.title = `${titleCase}: Wawasan Penting`;
  }

  // Fix 2: Remove legacy or fake branding
  let strRep = JSON.stringify(revised);
  if (/DJADI CREATIVE|GSM v3\.0|CONFIDENTIAL \/\/ ENTERPRISE/i.test(strRep)) {
    strRep = strRep
      .replace(/DJADI CREATIVE/gi, cleanTopic.slice(0, 24).toUpperCase() || 'PRESENTASI')
      .replace(/GSM v3\.0/gi, theme.subHeader || 'PANDUAN LENGKAP')
      .replace(/CONFIDENTIAL \/\/ ENTERPRISE/gi, theme.tag || 'EDUKASI & INFORMASI');
  }
  if (theme?.isPlayful || /kucing|cat|pet|lucu|anabul/i.test(cleanTopic)) {
    strRep = strRep
      .replace(/RINGKASAN EKSEKUTIF/gi, '🐾 RANGKUMAN KASIH SAYANG')
      .replace(/SIAP DIIMPLEMENTASIKAN/gi, '💖 BAHAGIA BERSAMA ANABUL')
      .replace(/CHECKLIST AKSI/gi, '🐱 CHECKLIST PERAWATAN')
      .replace(/ACTION PLAYBOOK 2026/gi, '🐾 PANDUAN HARIAN 2026');
  }
  try {
    const parsed = JSON.parse(strRep);
    Object.assign(revised, parsed);
  } catch (e) {}

  const layout = String(revised.layout || expectedLayout || 'bento').toLowerCase();
  revised.layout = layout;
  revised.cards = Array.isArray(revised.cards) ? [...revised.cards] : [];

  // Fix 3: Layout-specific fixes
  if (layout === 'cover') {
    const ed = generateEditorialTitle(cleanTopic, theme.id);
    if (!revised.title || revised.title.length < 3 || /^(?:slide|presentasi|dokumen|buatkan)/i.test(revised.title)) {
      revised.title = ed.title;
    }
    if (!revised.subtitle || /analisis komprehensif/i.test(revised.subtitle)) {
      revised.subtitle = ed.subtitle;
    }
    revised.badge = revised.badge || theme.tag || 'EDISI EKSKLUSIF';
  } else if (layout === 'split') {
    while (revised.cards.length < 2) {
      const idx = revised.cards.length + 1;
      revised.cards.push({
        badge: `ASPEK 0${idx}`,
        title: idx === 1 ? `Karakteristik Kunci ${titleCase}` : `Daya Tarik & Potensi ${titleCase}`,
        desc: idx === 1 ? `Eksplorasi ciri khas mendasar dan aspek pembeda seputar ${cleanTopic.toLowerCase()}.` : `Peluang pengembangan dan manfaat bernilai tinggi terkait ${cleanTopic.toLowerCase()}.`,
        stat: `0${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: idx === 1 ? 'KARAKTERISTIK' : 'POTENSI UTAMA'
      });
    }
  } else if (layout === 'metrics') {
    while (revised.cards.length < 3) {
      const idx = revised.cards.length + 1;
      const metricValues = ['87.5%', '3.8x', '100%', '+52%'];
      revised.cards.push({
        badge: `DATA 0${idx}`,
        title: `Indikator & Fakta Kunci 0${idx}`,
        desc: `Bukti empiris dan data relevan mengenai dinamika ${cleanTopic.toLowerCase()}.`,
        stat: metricValues[idx - 1] || '100%',
        metricValue: metricValues[idx - 1] || '100%',
        footerHighlight: 'DATA RIIL'
      });
    }
  } else if (layout === 'quote') {
    if (!revised.quoteText) {
      revised.quoteText = revised.subtitle || `Memahami seluk-beluk ${cleanTopic.toLowerCase()} memberikan wawasan mendalam dan perspektif baru yang berharga.`;
    }
    if (!revised.quoteAuthor) {
      revised.quoteAuthor = `${titleCase} Insights`;
    }
  } else if (layout === 'timeline') {
    while (revised.cards.length < 3) {
      const idx = revised.cards.length + 1;
      const phases = ['Pemahaman Awal', 'Pengamatan & Penerapan', 'Pengembangan Lanjutan'];
      revised.cards.push({
        badge: `TAHAP 0${idx}`,
        title: phases[idx - 1] || `Langkah 0${idx}`,
        desc: `Panduan terarah dalam mengeksplorasi ${cleanTopic.toLowerCase()} secara berurutan.`,
        stat: `T${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: 'PANDUAN AKSI'
      });
    }
  } else if (layout === 'conclusion') {
    while (revised.cards.length < 2) {
      const idx = revised.cards.length + 1;
      revised.cards.push({
        badge: `INTISARI 0${idx}`,
        title: idx === 1 ? `Kesimpulan Inti ${titleCase}` : `Rekomendasi & Langkah Lanjutan`,
        desc: idx === 1 ? `Rangkuman poin esensial dan wawasan paling krusial mengenai ${cleanTopic.toLowerCase()}.` : `Arahan praktis yang dapat langsung diterapkan untuk mendapatkan hasil optimal seputar ${cleanTopic.toLowerCase()}.`,
        stat: `0${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: idx === 1 ? 'INTISARI' : 'REKOMENDASI'
      });
    }
  } else {
    // Bento
    while (revised.cards.length < 2) {
      const idx = revised.cards.length + 1;
      revised.cards.push({
        badge: `POIN 0${idx}`,
        title: `Wawasan ${titleCase} 0${idx}`,
        desc: `Penjabaran komprehensif mengenai aspek penting ${cleanTopic.toLowerCase()} secara faktual.`,
        stat: `0${idx}`,
        metricValue: `0${idx}`,
        footerHighlight: 'POIN KUNCI'
      });
    }
  }

  // Ensure card titles are not empty
  revised.cards.forEach((c, ci) => {
    if (!c.title || String(c.title).trim().length < 2) {
      c.title = `Poin Penting 0${ci + 1}`;
    }
    if (!c.desc || String(c.desc).trim().length < 4) {
      c.desc = `Penjabaran komprehensif mengenai aspek ${cleanTopic.toLowerCase()} secara mendalam.`;
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

function createSlidePromptForMasterDesign(slideIndex, totalSlides, topic = '', blueprintSlide = {}, prevSlideSummary = '', styleConcept = {}) {
  const slideNum = slideIndex + 1;
  const cleanTopic = cleanPresentationTopic(topic || 'Materi Presentasi');
  const layout = blueprintSlide.layout || (slideNum === 1 ? 'cover' : 'bento');
  const title = blueprintSlide.title || `Slide ${slideNum}`;
  const conceptName = styleConcept.conceptName || 'Bespoke Modern Minimalist';
  const vibe = styleConcept.vibe || 'Visual ekspresif, estetik, dan scannable';
  const layoutFeel = styleConcept.layoutFeel || 'Asimetris dinamis, kartu sorotan';

  const isPlayful = Boolean(styleConcept?.theme?.isPlayful || /lucu|cute|gemes|gemoy|kucing|cat|kitten|paw|coretan|kartun|anabul/i.test(cleanTopic));
  const isCover = (slideNum === 1 || layout === 'cover');
  const coverDirective = isCover
    ? `KHUSUS COVER:
- Buat judul utama ("title") yang ARTISTIK, KREATIF, dan MEMIKAT (BUKAN teks perintah seperti "Slide PDF tentang...", "Buatkan...", dsb). Contoh: "Pesona & Ragam Kucing Lucu di Indonesia".
- Buat subjudul ("subtitle") yang informatif, puitis, dan menggugah minat audiens.${isPlayful ? '\n- Gaya Playful / Kawaii: Gunakan judul ceria, hangat, bersahabat dengan sentuhan kasih sayang anabul.' : ''}`
    : `KHUSUS KONTEN:
- Seluruh judul kartu, deskripsi, dan metrik HARUS 100% KONSISTEN dengan tema "${cleanTopic}".
- ANTI-TEMPLATE & ANTI-TEXT-WALL: Buat deskripsi padat (2-3 kalimat tajam atau poin-poin karakteristik penting yang scannable).
- DILARANG menggunakan kata seragam "PILAR 01", "PILAR 02" pada badge kartu! Berikan badge spesifik topik (misal: "${isPlayful ? '🐾 RAS ASLI' : 'CIRI FISIK'}", "${isPlayful ? '🐱 TINGKAH GEMAS' : 'FAVORIT'}", "${isPlayful ? '✨ FAKTA LUCU' : 'TIPS RAWAT'}").
- "footerHighlight": Frasa kunci ringkas (1-3 kata), bukan tombol aksi.${isPlayful ? '\n- Hindari istilah korporat kaku seperti "Action Playbook", "Eksekutif", "Implementasi", "KPI"!' : ''}`;

  return `Kamu adalah 🎨 Master Design (Tangan Kanan Master Agent).
Tugasmu: Rancang konten SANGAT DETAIL dan SPESIFIK untuk Slide ${slideNum} dari total ${totalSlides} slide presentasi 16:9 widescreen.

Materi Utama: "${cleanTopic}"
Konsep Art Direction: "${conceptName}"
Mood & Vibe: "${vibe}"
Pedoman Tata Letak: "${layoutFeel}"
Arketipe Tata Letak: ${layout.toUpperCase()}
Sasaran Topik Slide: "${title}"
${prevSlideSummary ? `Konteks Slide Sebelumnya: "${prevSlideSummary}"` : ''}

${coverDirective}

ATURAN KETAT:
1. DILARANG menggunakan teks korporat palsu ("Djadi Creative", "GSM v3.0", "Confidential // Enterprise", "PILAR 01"${isPlayful ? ', "Action Playbook", "Eksekutif"' : ''}).
2. Konten harus berbobot, berbasis fakta/karakteristik nyata mengenai "${cleanTopic}".
3. Arketipe ${layout}:
   - Jika "cover": Hasilkan judul utama megah/lucu, lead subtitle komprehensif, badge status eksklusif.
   - Jika "split": 2 kartu komparasi visual dengan judul tajam dan deskripsi komparatif tentang ${cleanTopic}.
   - Jika "metrics": 3-4 kartu metrik dengan angka riil (contoh: "85%", "12-16 Jam", "4 Juta") dan penjelasan dampak.
   - Jika "timeline": 3-4 kartu langkah berurutan dengan judul fase roadmap ${cleanTopic}.
   - Jika "quote": Kutipan bermakna tentang ${cleanTopic} dan atribusi terpercaya.
   - Jika "conclusion": Ringkasan intisari dan checklist rekomendasi tentang ${cleanTopic}.
   - Jika "bento": 3 kartu pilar bento asimetris: kartu 1 sorotan utama, kartu 2 & 3 pendukung dengan poin scannable mengenai ${cleanTopic}.

Balas HANYA berupa JSON valid dalam blok \`\`\`json ... \`\`\` dengan format:
{
  "title": "${isCover ? (isPlayful ? 'Pesona Kucing Lucu Indonesia' : 'Judul Editorial yang Menarik') : title}",
  "subtitle": "Penjelasan mendalam konteks slide",
  "layout": "${layout}",
  "badge": "${isCover ? (isPlayful ? '🐾 EDISI GEMAS' : 'EDISI EKSKLUSIF') : (isPlayful ? '🐾 TOPIK KUNCI' : 'TOPIK KUNCI')}",
  "imageUrl": "",
  "quoteText": "",
  "quoteAuthor": "",
  "cards": [
    {
      "badge": "${isPlayful ? '🐾 CIRI KHAS' : 'TAG TOPIK SPESIFIK'}",
      "title": "Judul Spesifik Topik",
      "desc": "Penjabaran scannable seputar ${cleanTopic}...",
      "stat": "98%",
      "metricValue": "98%",
      "footerHighlight": "${isPlayful ? 'FAKTA GEMAS' : 'POIN KUNCI'}",
      "imageUrl": ""
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

function generateSlideDeckArtifactFromOutline({
  topic = 'Presentasi Eksekutif',
  slideCount = 10,
  detailedOutlineOrContent = '',
  designArchetype = 'auto',
  userImages = []
} = {}) {
  const cleanFn = (typeof cleanPresentationTopic === 'function')
    ? cleanPresentationTopic
    : (typeof window !== 'undefined' && typeof window.cleanPresentationTopic === 'function' ? window.cleanPresentationTopic : null);
  const cleanTopic = cleanFn ? cleanFn(topic) : String(topic || '').replace(/^(?:slide|pdf|ppt|deck|tentang|buatkan)\s+/i, '').trim();
  const titleCaseFn = (typeof toTitleCaseIndonesian === 'function')
    ? toTitleCaseIndonesian
    : (typeof window !== 'undefined' && typeof window.toTitleCaseIndonesian === 'function' ? window.toTitleCaseIndonesian : null);
  const titleCase = titleCaseFn ? titleCaseFn(cleanTopic) : cleanTopic;

  const targetCount = Math.max(3, Math.min(parseInt(slideCount, 10) || 10, 30));

  const getThemeFn = (typeof detectOptimalSlideTheme === 'function')
    ? detectOptimalSlideTheme
    : (typeof window !== 'undefined' && typeof window.detectOptimalSlideTheme === 'function' ? window.detectOptimalSlideTheme : null);
  const themeQuery = (designArchetype && designArchetype !== 'auto') ? `${designArchetype} ${cleanTopic}` : cleanTopic;
  const theme = getThemeFn ? getThemeFn(themeQuery, { archetype: designArchetype }) : {
    id: 'dark_luxury_cyber',
    name: 'Dark Luxury Cyber Editorial',
    bgSlide: '#0B0F19',
    accent: '#6366F1',
    subHeader: 'LAPORAN EKSEKUTIF & STRATEGIS',
    badge: 'INSIGHT'
  };

  const parseFn = (typeof parseMarkdownToSlides === 'function')
    ? parseMarkdownToSlides
    : (typeof window !== 'undefined' && typeof window.parseMarkdownToSlides === 'function' ? window.parseMarkdownToSlides : null);

  let parsedSlides = [];
  if (detailedOutlineOrContent && parseFn) {
    parsedSlides = parseFn(detailedOutlineOrContent, topic);
  }

  const blueprintFn = (typeof createDefaultBlueprint === 'function')
    ? createDefaultBlueprint
    : (typeof window !== 'undefined' && typeof window.createDefaultBlueprint === 'function' ? window.createDefaultBlueprint : null);

  let finalSlides = [];
  if (parsedSlides.length >= targetCount) {
    finalSlides = parsedSlides.slice(0, targetCount);
  } else {
    const blueprint = blueprintFn ? blueprintFn(topic, targetCount, theme) : { slides: [] };
    const bpSlides = blueprint.slides || [];
    finalSlides = [];

    // First slide: cover
    if (parsedSlides.length > 0 && parsedSlides[0].layout === 'cover') {
      finalSlides.push(parsedSlides[0]);
    } else if (bpSlides.length > 0) {
      finalSlides.push(bpSlides[0]);
    }

    // Intermediate slides
    for (let i = 1; i < targetCount - 1; i++) {
      if (i < parsedSlides.length && parsedSlides[i].title && parsedSlides[i].title !== parsedSlides[0]?.title) {
        finalSlides.push(parsedSlides[i]);
      } else if (i < bpSlides.length) {
        finalSlides.push(bpSlides[i]);
      } else {
        const cycle = i % 4;
        const layouts = ['split', 'bento', 'metrics', 'timeline'];
        finalSlides.push({
          index: i + 1,
          title: `${titleCase} // Analisis Bagian ${String(i + 1).padStart(2, '0')}`,
          subtitle: `Pendalaman metrik kinerja, tren operasional, dan temuan kunci seputar ${cleanTopic}.`,
          layout: layouts[cycle],
          badge: `MODUL ${String(i + 1).padStart(2, '0')}`,
          cards: [
            { badge: 'POIN 01', title: 'Observasi Mendalam', desc: `Evaluasi komprehensif data lapangan dan tolak ukur efisiensi ${cleanTopic}.`, stat: '01', metricValue: '98%', footerHighlight: 'HIGH IMPACT' },
            { badge: 'POIN 02', title: 'Optimalisasi Taktis', desc: `Peluang percepatan hasil dan mitigasi kendala operasional secara terukur.`, stat: '02', metricValue: '+45%', footerHighlight: 'SCALABILITY' }
          ]
        });
      }
    }

    // Last slide: conclusion
    if (parsedSlides.length >= targetCount && parsedSlides[parsedSlides.length - 1].layout === 'conclusion') {
      finalSlides.push(parsedSlides[parsedSlides.length - 1]);
    } else if (bpSlides.length >= targetCount) {
      finalSlides.push(bpSlides[bpSlides.length - 1]);
    } else {
      finalSlides.push({
        index: targetCount,
        title: `Rangkuman Eksekutif & Rekomendasi: ${titleCase}`,
        subtitle: `Intisari kesimpulan strategis dan langkah aksi terukur untuk optimalisasi performa.`,
        layout: 'conclusion',
        badge: 'KESIMPULAN'
      });
    }
  }

  // Sequential 1 to N indexing
  finalSlides.forEach((s, idx) => { s.index = idx + 1; });

  const buildHtmlFn = (typeof buildExecutiveSlideDeckHtml === 'function')
    ? buildExecutiveSlideDeckHtml
    : (typeof window !== 'undefined' && typeof window.buildExecutiveSlideDeckHtml === 'function' ? window.buildExecutiveSlideDeckHtml : null);

  const deckMeta = {
    title: titleCase,
    brand: titleCase,
    categoryTitle: titleCase.toUpperCase(),
    subCategory: theme.subHeader || 'LAPORAN EKSEKUTIF & STRATEGIS',
    accentColor: theme.accent || '#38BDF8',
    themeObj: theme,
    userPrompt: `${topic} ${designArchetype}`
  };

  let deckHtml = buildHtmlFn ? buildHtmlFn(finalSlides, deckMeta) : '';

  const injectImgFn = (typeof injectImagesIntoSlideDeckHtml === 'function')
    ? injectImagesIntoSlideDeckHtml
    : (typeof window !== 'undefined' && typeof window.injectImagesIntoSlideDeckHtml === 'function' ? window.injectImagesIntoSlideDeckHtml : null);

  if (injectImgFn && userImages && userImages.length > 0) {
    deckHtml = injectImgFn(deckHtml, userImages);
  }

  return {
    id: `deck_${Date.now()}`,
    html: deckHtml,
    meta: {
      title: titleCase,
      description: `Presentasi 16:9 widescreen interaktif (${finalSlides.length} slide) hasil analisis Master Agent & Master Design.`,
      system: 'Slide Deck 16:9',
      category: 'Executive Presentation',
      theme: theme.id,
      colors: [theme.bgSlide || theme.bg || '#0B0F19', theme.accent || '#6366F1', theme.accentSecondary || '#38BDF8', '#FFFFFF'],
      tags: ['16:9 Deck', 'Thumbnails', 'PDF Ready', `${finalSlides.length} Slides`]
    },
    raw: detailedOutlineOrContent || deckHtml,
    slideCount: finalSlides.length
  };
}

// Attach to window for global extension access
if (typeof window !== 'undefined') {
  window.cleanPresentationTopic = cleanPresentationTopic;
  window.toTitleCaseIndonesian = toTitleCaseIndonesian;
  window.generateEditorialTitle = generateEditorialTitle;
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
  window.generateSlideDeckArtifactFromOutline = generateSlideDeckArtifactFromOutline;
}
