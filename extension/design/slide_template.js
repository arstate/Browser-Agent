// =========================================================================
// EXECUTIVE SLIDE TEMPLATE GENERATOR (16:9 Widescreen HTML / CSS Builder)
// Modular Slide Canvas, Responsive Grid, Scaled Viewport & Live Thumbnails
// =========================================================================

if (typeof escapeHtml !== "function") {
  function escapeHtml(str) {
    if (typeof str !== "string") return String(str || "");
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}

if (typeof toRoman !== "function") {
  function toRoman(num) {
    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
    return romans[num - 1] || String(num);
  }
}

function buildExecutiveSlideDeckHtml(slidesData, deckMeta = {}) {
  // Support both (slidesData, deckMeta) and alternate (topic, slidesData) or ({ slides, ... }, deckMeta)
  if (slidesData && !Array.isArray(slidesData) && Array.isArray(slidesData.slides)) {
    const orig = slidesData;
    slidesData = orig.slides;
    deckMeta = { ...orig, ...deckMeta };
  } else if (typeof slidesData === 'string' && Array.isArray(deckMeta)) {
    const tempSlides = deckMeta;
    deckMeta = { title: slidesData, brand: slidesData };
    slidesData = tempSlides;
  }
  if (!Array.isArray(slidesData)) {
    slidesData = [];
  }
  const total = slidesData.length || 1;
  const promptOrTitle = deckMeta.userPrompt || deckMeta.title || (slidesData[0]?.title || "");
  const getThemeFn = (typeof detectOptimalSlideTheme === 'function')
    ? detectOptimalSlideTheme
    : (typeof window !== 'undefined' && typeof window.detectOptimalSlideTheme === 'function' ? window.detectOptimalSlideTheme : null);
  const theme = deckMeta.themeObj || (getThemeFn ? getThemeFn(promptOrTitle, deckMeta) : {
    id: "dark_luxury_cyber",
    bg: "#0B0F19",
    accent: "#6366F1",
    accentSecondary: "#38BDF8",
    accentTertiary: "#F43F5E",
    tag: "PRESENTASI EKSEKUTIF"
  });

  const cleanFn = (typeof cleanPresentationTopic === 'function')
    ? cleanPresentationTopic
    : (typeof window !== 'undefined' && typeof window.cleanPresentationTopic === 'function' ? window.cleanPresentationTopic : null);

  // Brand Name logic: NEVER hardcode DJADI CREATIVE!
  let brandName = deckMeta.brand;
  if (!brandName || (/djadi/i.test(brandName) && !/djadi/i.test(promptOrTitle))) {
    brandName = (deckMeta.title || slidesData[0]?.title || "MATERI PRESENTASI").slice(0, 40);
  }
  if (cleanFn && /^(?:slide|pdf|ppt|deck|tentang|buatkan)/i.test(brandName)) {
    brandName = cleanFn(brandName);
  }

  let categoryTitle = deckMeta.categoryTitle || deckMeta.title || (slidesData[0]?.title || "MATERI PRESENTASI");
  if (/FONDASI BRAND|STRATEGI & IDENTITAS/i.test(categoryTitle) && !/fondasi|identitas|gsm/i.test(promptOrTitle)) {
    categoryTitle = (deckMeta.title || slidesData[0]?.title || "MATERI PRESENTASI").slice(0, 40);
  }
  if (cleanFn && /^(?:slide|pdf|ppt|deck|tentang|buatkan)/i.test(categoryTitle)) {
    categoryTitle = cleanFn(categoryTitle);
  }

  // Header subcategory: NEVER hardcode GSM v3.0!
  let subCategory = deckMeta.version || deckMeta.subCategory;
  if (!subCategory || subCategory === "GSM v3.0") {
    subCategory = theme.subHeader || "PANDUAN LENGKAP";
  }

  const accentColor = deckMeta.accentColor || theme.accent;
  const accentSecondary = deckMeta.accentSecondary || theme.accentSecondary;
  const accentTertiary = deckMeta.accentTertiary || theme.accentTertiary;

  // Copyright text: NEVER hardcode STANDAR IDENTITAS VISUAL RESMI!
  let copyrightText = deckMeta.copyright;
  if (!copyrightText || (/DJADI CREATIVE|STANDAR IDENTITAS VISUAL RESMI/i.test(copyrightText) && !/djadi/i.test(promptOrTitle))) {
    copyrightText = `© 2026 ${brandName.toUpperCase()} • MATERI PRESENTASI RESMI`;
  }

  // Badge tag: NEVER hardcode CONFIDENTIAL // ENTERPRISE!
  let badgeTag = deckMeta.badgeTag || deckMeta.statusTag;
  if (!badgeTag || (/CONFIDENTIAL/i.test(badgeTag) && !/confidential|rahasia|enterprise/i.test(promptOrTitle))) {
    badgeTag = theme.tag || "EDUKASI & INFORMASI";
  }

  const userImages = Array.isArray(deckMeta.userImages) ? deckMeta.userImages : [];
  const isPlayfulCute = Boolean(theme.isPlayful || /lucu|cute|gemes|gemoy|kucing|cat|kitten|paw|coretan|emot|kartun|anabul/i.test(promptOrTitle));

  function resolveCardImage(s, c, cardIdx, slideIdx) {
    if (c && c.imageUrl) return c.imageUrl;
    if (userImages.length > 0) {
      const uImg = userImages[(slideIdx * 2 + cardIdx) % userImages.length];
      return uImg?.dataUrl || uImg?.thumbnailUrl || '';
    }
    if (isPlayfulCute && typeof resolveThematicImageUrl === 'function') {
      return resolveThematicImageUrl(promptOrTitle, slideIdx * 2 + cardIdx);
    }
    return '';
  }

  function resolveSlideLayout(s, idx, totalSlides) {
    if (s && s.layout) {
      const l = String(s.layout).toLowerCase().trim();
      if (/cover|hero|title|sampul/i.test(l)) return 'cover';
      if (/split|duo|grid-2|comparison|dua/i.test(l)) return 'split';
      if (/metrics|metric|stat|kpi|grid-4|angka/i.test(l)) return 'metrics';
      if (/quote|kutipan|statement|manifesto/i.test(l)) return 'quote';
      if (/timeline|step|alur|tahap|proses|roadmap/i.test(l)) return 'timeline';
      if (/conclusion|summary|penutup|kesimpulan|checklist/i.test(l)) return 'conclusion';
      if (/bento|trio|grid-3/i.test(l)) return 'bento';
    }
    if (idx === 0) return 'cover';
    if (idx === totalSlides - 1 && totalSlides >= 4) return 'conclusion';

    const cards = s.cards || [];
    if (cards.length === 2) return 'split';
    if (s.steps || /tahap|langkah|step|alur|proses|jadwal|roadmap/i.test(s.title || '')) return 'timeline';
    if (cards.length === 4) return 'metrics';
    if (s.quoteText || s.quote || (cards.length === 1 && !s.title)) return 'quote';

    return 'bento';
  }

  const thumbnailsHtml = slidesData.map((s, idx) => {
    const slideNumStr = String(idx + 1).padStart(2, '0');
    const totalStr = String(total).padStart(2, '0');
    const cards = s.cards || [];
    const layout = resolveSlideLayout(s, idx, total);

    let thumbBodyHtml = '';
    if (s.loading) {
      thumbBodyHtml = `
        <div class="thumb-mini-loading">
          <div class="thumb-mini-skeleton-line shimmer"></div>
          <div class="thumb-mini-skeleton-line short shimmer"></div>
          <div class="thumb-mini-loading-grid">
            <div class="thumb-mini-skeleton-box shimmer"></div>
            <div class="thumb-mini-skeleton-box shimmer"></div>
          </div>
          <div class="thumb-mini-loading-status" style="color: ${accentColor};">
            <span class="pulse-dot" style="background: ${accentColor};"></span> MENYUSUN
          </div>
        </div>
      `;
    } else if (layout === 'cover') {
      thumbBodyHtml = `
        <div class="thumb-mini-cover">
          <div class="thumb-mini-cover-tag" style="color: ${accentColor}; border-color: ${accentColor};">${escapeHtml((s.badge || badgeTag || 'COVER').slice(0, 16))}</div>
          <div class="thumb-mini-cover-title">${escapeHtml((s.title || categoryTitle).slice(0, 36))}</div>
          <div class="thumb-mini-cover-sub">${escapeHtml((s.subtitle || brandName).slice(0, 48))}</div>
          <div class="thumb-mini-cover-badges">
            <span>16:9 WIDESCREEN</span>
            <span style="color: ${accentColor}; font-weight: 800;">${total} SLIDES</span>
          </div>
        </div>
      `;
    } else if (layout === 'split') {
      thumbBodyHtml = `
        <div class="thumb-mini-hero">
          <div class="thumb-mini-title">${escapeHtml(s.title || '')}</div>
          <div class="thumb-mini-counter">${slideNumStr} // ${totalStr}</div>
        </div>
        <div class="thumb-mini-split">
          ${cards.slice(0, 2).map((c, ci) => `
            <div class="thumb-mini-col">
              <div class="thumb-mini-badge" style="color: ${ci === 0 ? accentColor : accentSecondary};">${escapeHtml((c.badge || `PILAR 0${ci + 1}`).slice(0, 14))}</div>
              <div class="thumb-mini-col-title">${escapeHtml((c.title || '').slice(0, 22))}</div>
              <div class="thumb-mini-box"><span style="color: ${ci === 0 ? accentColor : accentSecondary};">${escapeHtml((c.footerHighlight || c.title || '').slice(0, 16))}</span></div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (layout === 'metrics') {
      const metricCards = cards.length >= 4 ? cards.slice(0, 4) : [...cards, { title: 'Pilar 04', metricValue: '100%' }].slice(0, 4);
      thumbBodyHtml = `
        <div class="thumb-mini-hero">
          <div class="thumb-mini-title">${escapeHtml(s.title || '')}</div>
          <div class="thumb-mini-counter">${slideNumStr} // ${totalStr}</div>
        </div>
        <div class="thumb-mini-metrics">
          ${metricCards.map((c, ci) => `
            <div class="thumb-mini-metric-col">
              <div class="thumb-mini-metric-num" style="color: ${ci === 0 ? accentColor : accentSecondary};">${escapeHtml((c.metricValue || c.stat || `0${ci + 1}`).slice(0, 6))}</div>
              <div class="thumb-mini-metric-title">${escapeHtml((c.title || '').slice(0, 14))}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (layout === 'quote') {
      thumbBodyHtml = `
        <div class="thumb-mini-quote">
          <div class="thumb-mini-quote-mark" style="color: ${accentColor};">“</div>
          <div class="thumb-mini-quote-text">${escapeHtml((s.quoteText || s.subtitle || s.title || '').slice(0, 56))}...</div>
          <div class="thumb-mini-quote-author" style="color: ${accentColor};">— ${escapeHtml((s.quoteAuthor || brandName).slice(0, 20))}</div>
        </div>
      `;
    } else if (layout === 'timeline') {
      thumbBodyHtml = `
        <div class="thumb-mini-hero">
          <div class="thumb-mini-title">${escapeHtml(s.title || '')}</div>
          <div class="thumb-mini-counter">${slideNumStr} // ${totalStr}</div>
        </div>
        <div class="thumb-mini-timeline">
          ${cards.slice(0, 4).map((c, ci) => `
            <div class="thumb-mini-timeline-step">
              <div class="thumb-mini-step-num" style="color: ${ci === 0 ? accentColor : 'inherit'};">STEP 0${ci + 1}</div>
              <div class="thumb-mini-col-title">${escapeHtml((c.title || '').slice(0, 14))}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (layout === 'conclusion') {
      thumbBodyHtml = `
        <div class="thumb-mini-hero">
          <div class="thumb-mini-title">${escapeHtml(s.title || 'Kesimpulan')}</div>
          <div class="thumb-mini-counter">${slideNumStr} // ${totalStr}</div>
        </div>
        <div class="thumb-mini-conclusion">
          <div class="thumb-mini-col">
            <div class="thumb-mini-badge" style="color: ${accentColor};">SUMMARY</div>
            <div class="thumb-mini-col-title">${escapeHtml((s.title || '').slice(0, 16))}</div>
            <div class="thumb-mini-box"><span>ACTION</span></div>
          </div>
          <div class="thumb-mini-col">
            <div class="thumb-mini-badge" style="color: ${accentSecondary};">CHECKLIST</div>
            <div class="thumb-mini-checklist-lines">
              <div>✔ <span>${escapeHtml((cards[0]?.title || 'Poin 1').slice(0, 14))}</span></div>
              <div>✔ <span>${escapeHtml((cards[1]?.title || 'Poin 2').slice(0, 14))}</span></div>
            </div>
          </div>
        </div>
      `;
    } else {
      thumbBodyHtml = `
        <div class="thumb-mini-hero">
          <div class="thumb-mini-title">${escapeHtml(s.title || '')}</div>
          <div class="thumb-mini-counter">${slideNumStr} // ${totalStr}</div>
        </div>
        <div class="thumb-mini-grid">
          ${cards.slice(0, 3).map((c, ci) => {
            const badgeColor = c.badgeColor || (ci === 0 ? accentColor : ci === 1 ? accentSecondary : accentTertiary);
            const highlightColor = c.highlightColor || badgeColor;
            const rawBadge = c.badge || `POIN 0${ci + 1} // ANALISIS`;
            const cleanBadge = (/ORTOGRAFI|FILOSOFI|DIFERENSIASI/i.test(rawBadge) && !/ortografi|filosofi/i.test(c.title || '')) ? `POIN 0${ci + 1} // ANALISIS` : rawBadge;
            const rawHl = c.footerHighlight || c.keyTakeaway || c.title || `POIN UTAMA 0${ci + 1}`;
            const cleanHl = (/"DJ" → JADI|TERWUJUD & SELESAI|DISTINCTIVE BRAND ASSET/i.test(rawHl) && !/djadi/i.test(promptOrTitle)) ? (c.title || `POIN UTAMA 0${ci + 1}`).slice(0, 24).toUpperCase() : rawHl;

            return `
              <div class="thumb-mini-col">
                <div class="thumb-mini-badge" style="color: ${badgeColor};">${escapeHtml(cleanBadge)}</div>
                <div class="thumb-mini-col-title">${escapeHtml((c.title || '').slice(0, 24))}</div>
                <div class="thumb-mini-box">
                  <span style="color: ${highlightColor};">${escapeHtml(cleanHl.slice(0, 20))}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-target="${idx}" id="thumb-${idx}">
        <span class="thumb-num">${idx + 1}</span>
        <div class="thumb-card">
          <div class="thumb-mini-slide-wrap">
            <div class="thumb-mini-slide">
              <div class="thumb-mini-header">
                <span class="thumb-mini-chapter">${escapeHtml(brandName.slice(0, 20))}</span>
                <span class="thumb-mini-page">${slideNumStr}/${totalStr}</span>
              </div>
              ${thumbBodyHtml}
              <div class="thumb-mini-footer">
                <span>${escapeHtml(brandName.slice(0, 20))}</span>
                <span style="color: ${accentColor}; font-weight: 800;">${escapeHtml((badgeTag || 'MODULAR').slice(0, 14))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const slidesHtml = slidesData.map((s, idx) => {
    const slideNumStr = String(idx + 1).padStart(2, '0');
    const totalStr = String(total).padStart(2, '0');
    const cards = s.cards || [];
    const layout = resolveSlideLayout(s, idx, total);

    // If custom canvas HTML is already provided directly from AI, preserve it 1:1!
    if (s.rawCanvasHtml && s.rawCanvasHtml.includes('slide-canvas')) {
      return `
        <section class="slide-section ${idx === 0 ? 'active' : ''}" data-index="${idx}" id="slide-${idx}">
          ${s.rawCanvasHtml}
        </section>
      `;
    }

    let slideBodyContent = '';
    if (s.loading) {
      slideBodyContent = `
        <div class="slide-loading-skeleton">
          <div class="skeleton-header">
            <div class="skeleton-badge shimmer"></div>
            <div class="skeleton-title shimmer"></div>
            <div class="skeleton-subtitle shimmer"></div>
          </div>
          <div class="skeleton-cards-grid">
            <div class="skeleton-card shimmer">
              <div class="skeleton-card-badge"></div>
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-desc"></div>
              <div class="skeleton-card-desc short"></div>
            </div>
            <div class="skeleton-card shimmer">
              <div class="skeleton-card-badge"></div>
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-desc"></div>
              <div class="skeleton-card-desc short"></div>
            </div>
            <div class="skeleton-card shimmer">
              <div class="skeleton-card-badge"></div>
              <div class="skeleton-card-title"></div>
              <div class="skeleton-card-desc"></div>
              <div class="skeleton-card-desc short"></div>
            </div>
          </div>
          <div class="skeleton-status-pill" style="border-color: ${accentColor}; color: ${accentColor};">
            <svg class="spin-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"></circle></svg>
            <span>Master Design sedang menyusun konten Slide ${slideNumStr}...</span>
          </div>
        </div>
      `;
    } else if (layout === 'cover') {
      const coverImg = s.imageUrl || userImages[0]?.dataUrl || (isPlayfulCute && typeof resolveThematicImageUrl === 'function' ? resolveThematicImageUrl(promptOrTitle, 0) : '');
      const coverPaw = (isPlayfulCute && typeof getCutePawSvg === 'function') ? getCutePawSvg(accentColor, 14) + ' ' : '';
      slideBodyContent = `
        <div class="cover-center-content">
          ${coverImg ? `
            <div class="cover-hero-image-wrap">
              <img class="cover-hero-image" src="${coverImg}" alt="${escapeHtml(s.title || 'Sampul')}">
            </div>
          ` : ''}
          <div class="cover-badge-pill" style="color: ${accentColor}; border-color: ${accentColor};">
            ${coverPaw}${escapeHtml(s.badge || badgeTag || (isPlayfulCute ? 'CATATAN GEMAS ANABUL' : 'EDISI EKSKLUSIF'))}
          </div>
          <h1 class="cover-main-title">${escapeHtml(s.title || categoryTitle)}</h1>
          <p class="cover-lead-subtitle">${escapeHtml(s.subtitle || 'Panduan komprehensif, wawasan bernutrisi, dan visual estetik.')}</p>
          
          <div class="cover-meta-row">
            <div class="cover-meta-item">
              <span class="cover-meta-label">TOPIK:</span>
              <strong class="cover-meta-val">${escapeHtml(brandName)}</strong>
            </div>
            <div class="cover-meta-item">
              <span class="cover-meta-label">TOTAL MATERI:</span>
              <strong class="cover-meta-val" style="color: ${accentColor};">${total} SLIDE DECK</strong>
            </div>
            <div class="cover-meta-item">
              <span class="cover-meta-label">FORMAT:</span>
              <strong class="cover-meta-val">MODULAR 16:9</strong>
            </div>
          </div>
        </div>
      `;
    } else if (layout === 'split') {
      const splitCards = cards.slice(0, 2);
      slideBodyContent = `
        <div class="slide-hero">
          <h1 class="slide-main-title">${escapeHtml(s.title)}</h1>
          <div class="hero-sub-row">
            <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
            <div class="slide-big-counter"><span>${slideNumStr} // ${totalStr}</span></div>
          </div>
        </div>
        <div class="split-grid">
          ${splitCards.map((c, ci) => {
            const bColor = c.badgeColor || (ci === 0 ? accentColor : accentSecondary);
            const rawBadge = c.badge || '';
            const cleanBadge = (!rawBadge || /pilar\s*\d+|poin\s*\d+/i.test(rawBadge)) ? (c.title || `FOKUS 0${ci + 1}`).slice(0, 20).toUpperCase() : rawBadge;
            const cleanHl = c.footerHighlight || c.title || `POIN 0${ci + 1}`;
            const colImg = resolveCardImage(s, c, ci, idx);
            const pawBadge = (isPlayfulCute && typeof getCutePawSvg === 'function') ? getCutePawSvg(bColor, 12) + ' ' : '';
            return `
              <div class="split-col ${ci === 0 ? 'is-featured' : ''}">
                <div class="split-col-top">
                  ${colImg ? `<div class="card-image-wrap"><img class="card-image" src="${colImg}" alt="${escapeHtml(c.title || '')}"></div>` : ''}
                  <div class="col-badge" style="color: ${bColor};">${pawBadge}${escapeHtml(cleanBadge)}</div>
                  <h3 class="split-col-title">${escapeHtml(c.title || `Fokus 0${ci + 1}`)}</h3>
                  <p class="split-col-desc">${escapeHtml(c.desc || '')}</p>
                </div>
                <div class="col-tag-chip" style="color: ${bColor}; border-color: ${bColor}44; background: ${bColor}12;">
                  <span class="col-tag-dot" style="background: ${bColor};"></span>
                  <span class="col-highlight-text">${escapeHtml(cleanHl)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (layout === 'metrics') {
      const metricCards = cards.length >= 4 ? cards.slice(0, 4) : [...cards, { title: 'Pilar 04', metricValue: '100%' }].slice(0, 4);
      slideBodyContent = `
        <div class="slide-hero">
          <h1 class="slide-main-title">${escapeHtml(s.title)}</h1>
          <div class="hero-sub-row">
            <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
            <div class="slide-big-counter"><span>${slideNumStr} // ${totalStr}</span></div>
          </div>
        </div>
        <div class="metrics-grid">
          ${metricCards.map((c, ci) => {
            const mColor = ci === 0 ? accentColor : ci === 1 ? accentSecondary : ci === 2 ? accentTertiary : accentColor;
            return `
              <div class="metric-card">
                <div>
                  <div class="metric-val" style="color: ${mColor};">${escapeHtml(c.metricValue || c.stat || `0${ci + 1}`)}</div>
                  <div class="metric-title">${escapeHtml(c.title || `Metrik 0${ci + 1}`)}</div>
                  <div class="metric-desc">${escapeHtml(c.desc || '')}</div>
                </div>
                <div class="col-tag-chip" style="color: ${mColor}; border-color: ${mColor}44; background: ${mColor}12;">
                  <span class="col-tag-dot" style="background: ${mColor};"></span>
                  <span class="col-highlight-text">${escapeHtml(c.footerHighlight || c.badge || 'INDIKATOR')}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (layout === 'quote') {
      slideBodyContent = `
        <div class="slide-hero">
          <h1 class="slide-main-title">${escapeHtml(s.title)}</h1>
          <div class="hero-sub-row">
            <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
            <div class="slide-big-counter"><span>${slideNumStr} // ${totalStr}</span></div>
          </div>
        </div>
        <div class="quote-wrap">
          <div class="quote-mark" style="color: ${accentColor};">“</div>
          <blockquote class="quote-text">${escapeHtml(s.quoteText || s.subtitle || s.title || '')}</blockquote>
          <div class="quote-author" style="color: ${accentColor};">— ${escapeHtml(s.quoteAuthor || brandName.toUpperCase())}</div>
          ${s.quoteTakeaway ? `<div class="quote-takeaway-pill">${escapeHtml(s.quoteTakeaway)}</div>` : ''}
        </div>
      `;
    } else if (layout === 'timeline') {
      const stepCards = cards.slice(0, 4);
      slideBodyContent = `
        <div class="slide-hero">
          <h1 class="slide-main-title">${escapeHtml(s.title)}</h1>
          <div class="hero-sub-row">
            <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
            <div class="slide-big-counter"><span>${slideNumStr} // ${totalStr}</span></div>
          </div>
        </div>
        <div class="timeline-grid">
          ${stepCards.map((c, ci) => `
            <div class="timeline-step ${ci === 0 ? 'is-featured' : ''}">
              <div>
                <span class="timeline-step-badge" style="color: ${ci === 0 ? accentColor : accentSecondary};">TAHAP 0${ci + 1}</span>
                <h3 class="timeline-step-title">${escapeHtml(c.title || `Langkah 0${ci + 1}`)}</h3>
                <p class="timeline-step-desc">${escapeHtml(c.desc || '')}</p>
              </div>
              <div class="col-tag-chip" style="color: ${ci === 0 ? accentColor : accentSecondary}; border-color: ${ci === 0 ? accentColor : accentSecondary}44; background: ${ci === 0 ? accentColor : accentSecondary}12;">
                <span class="col-tag-dot" style="background: ${ci === 0 ? accentColor : accentSecondary};"></span>
                <span class="col-highlight-text">${escapeHtml(c.footerHighlight || 'EKSEKUSI')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (layout === 'conclusion') {
      const sumBadge = isPlayfulCute ? '🐾 RANGKUMAN KASIH SAYANG' : (s.summaryBadge || 'RINGKASAN UTAMA');
      const sumPill = isPlayfulCute ? '💖 BAHAGIA BERSAMA ANABUL' : (s.conclusionPill || 'SIAP DITERAPKAN');
      const checkBadge = isPlayfulCute ? '🐱 CHECKLIST PERAWATAN' : (s.checklistBadge || 'CHECKLIST AKSI');
      const checkPill = isPlayfulCute ? '🐾 PANDUAN HARIAN 2026' : (s.actionTag || 'PANDUAN 2026');
      const conclImg = resolveCardImage(s, cards[0], 0, idx);
      slideBodyContent = `
        <div class="slide-hero">
          <h1 class="slide-main-title">${escapeHtml(s.title || 'Kesimpulan & Tindak Lanjut')}</h1>
          <div class="hero-sub-row">
            <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
            <div class="slide-big-counter"><span>${slideNumStr} // ${totalStr}</span></div>
          </div>
        </div>
        <div class="conclusion-grid">
          <div class="conclusion-card">
            <div>
              ${conclImg ? `<div class="card-image-wrap"><img class="card-image" src="${conclImg}" alt="${escapeHtml(s.title || '')}"></div>` : ''}
              <div class="col-badge" style="color: ${accentColor};">${sumBadge}</div>
              <h3 class="conclusion-card-title">${escapeHtml(s.title || 'Rangkuman Materi')}</h3>
              <p class="conclusion-card-desc">${escapeHtml(s.subtitle || 'Seluruh materi disusun penuh kehangatan untuk pemahaman komprehensif.')}</p>
            </div>
            <div class="col-highlight-box">
              <span class="col-highlight-text" style="color: ${accentColor};">${sumPill}</span>
            </div>
          </div>
          <div class="conclusion-card">
            <div class="col-badge" style="color: ${accentSecondary};">${checkBadge}</div>
            <div class="conclusion-list">
              ${cards.slice(0, 3).map((c, ci) => `
                <div class="conclusion-item">
                  <span class="conclusion-check" style="color: ${accentColor};">✔</span>
                  <div><strong>${escapeHtml(c.title || `Poin 0${ci + 1}`)}</strong>: ${escapeHtml((c.desc || c.footerHighlight || '').slice(0, 80))}</div>
                </div>
              `).join('')}
            </div>
            <div class="col-highlight-box" style="min-height: 38px; padding: 6px 10px;">
              <span class="col-highlight-text" style="color: ${accentSecondary}; font-size: 11px;">${checkPill}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const cardsHtml = cards.map((c, cIdx) => {
        const badgeColor = c.badgeColor || (cIdx === 0 ? accentColor : cIdx === 1 ? accentSecondary : accentTertiary);
        const highlightColor = c.highlightColor || badgeColor;
        const rawBadge = c.badge || '';
        const cleanBadge = (!rawBadge || /pilar\s*\d+|poin\s*\d+/i.test(rawBadge)) ? (c.title || `TOPIK 0${cIdx + 1}`).slice(0, 20).toUpperCase() : rawBadge;
        const rawHl = c.footerHighlight || c.keyTakeaway || c.title || `POIN 0${cIdx + 1}`;
        const cleanHl = (/"DJ" → JADI|TERWUJUD & SELESAI|DISTINCTIVE BRAND ASSET/i.test(rawHl) && !/djadi/i.test(promptOrTitle)) ? (c.title || `POIN 0${cIdx + 1}`).slice(0, 28).toUpperCase() : rawHl;
        const cardImg = resolveCardImage(s, c, cIdx, idx);
        const pawBadge = (isPlayfulCute && typeof getCutePawSvg === 'function') ? getCutePawSvg(badgeColor, 12) + ' ' : '';

        return `
          <div class="slide-col ${cIdx === 0 ? 'is-featured' : ''}">
            <div class="col-top">
              ${cardImg ? `<div class="card-image-wrap"><img class="card-image" src="${cardImg}" alt="${escapeHtml(c.title || '')}"></div>` : ''}
              <div class="col-badge" style="color: ${badgeColor};">${pawBadge}${escapeHtml(cleanBadge)}</div>
              <h3 class="col-title">${escapeHtml(c.title || `Poin 0${cIdx + 1}`)}</h3>
              <p class="col-desc">${escapeHtml(c.desc || '')}</p>
            </div>
            <div class="col-tag-chip" style="color: ${highlightColor}; border-color: ${highlightColor}44; background: ${highlightColor}12;">
              <span class="col-tag-dot" style="background: ${highlightColor};"></span>
              <span class="col-highlight-text">${escapeHtml(cleanHl)}</span>
            </div>
          </div>
        `;
      }).join('');

      slideBodyContent = `
        <div class="slide-hero">
          <h1 class="slide-main-title">${escapeHtml(s.title)}</h1>
          <div class="hero-sub-row">
            <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
            <div class="slide-big-counter"><span>${slideNumStr} // ${totalStr}</span></div>
          </div>
        </div>
        <div class="slide-columns-grid" style="grid-template-columns: repeat(${Math.min(cards.length || 3, 4)}, 1fr);">
          ${cardsHtml}
        </div>
      `;
    }

    return `
      <section class="slide-section ${idx === 0 ? 'active' : ''}" data-index="${idx}" id="slide-${idx}">
        <div class="slide-canvas slide-layout-${layout}">
          ${isPlayfulCute ? `
            <div class="paw-watermark paw-bg-1">${(typeof getCutePawSvg === 'function' ? getCutePawSvg(accentColor, 72) : '')}</div>
            <div class="paw-watermark paw-bg-2">${(typeof getCuteCatFaceSvg === 'function' ? getCuteCatFaceSvg(accentColor, 80) : '')}</div>
          ` : ''}
          <div class="slide-header-bar">
            <div class="header-left">
              <span class="header-topic-crumb">${escapeHtml(brandName)}</span>
              <span class="header-sep">/</span>
              <span class="header-chapter-sub">${escapeHtml(categoryTitle)}</span>
            </div>
            <div class="header-right">
              <span class="header-page-tag" style="color: ${accentColor};">${slideNumStr} / ${totalStr}</span>
            </div>
          </div>

          ${slideBodyContent}

          <div class="slide-footer-bar">
            <div class="footer-meta-block">
              <div class="footer-line-1">${escapeHtml(brandName)}</div>
              <div class="footer-line-2">
                <span class="footer-status-tag" style="color: ${accentColor}; font-weight: 700;">${escapeHtml(badgeTag || theme.tag || 'MATERI EKSKLUSIF')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(deckMeta.title || 'Executive Presentation Deck')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Syne:wght@700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    ${(typeof getExecutiveSlideDeckCss === 'function' ? getExecutiveSlideDeckCss(theme, { accentColor, accentSecondary, accentTertiary }) : (typeof window !== 'undefined' && window.getExecutiveSlideDeckCss ? window.getExecutiveSlideDeckCss(theme, { accentColor, accentSecondary, accentTertiary }) : ''))}
    ${(typeof getSlideDeckEditorCss === 'function' ? getSlideDeckEditorCss() : (typeof window !== 'undefined' && window.getSlideDeckEditorCss ? window.getSlideDeckEditorCss() : ''))}
  </style>
</head>
<body>
  <div class="presentation-workspace">
    <aside class="deck-sidebar" id="deck-sidebar">
      ${thumbnailsHtml}
    </aside>

    <main class="deck-stage-wrap" id="deck-stage-wrap">
      ${slidesHtml}

      <nav class="deck-floating-dock">
        <button type="button" class="dock-btn dock-btn-circle" id="dock-btn-prev" title="Slide Sebelumnya (ArrowLeft)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="dock-counter">
          <span id="dock-curr-slide">1</span>
          <span>/</span>
          <span>${total}</span>
        </div>
        <button type="button" class="dock-btn dock-btn-circle" id="dock-btn-next" title="Slide Berikutnya (ArrowRight)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div class="dock-divider"></div>
        <button type="button" class="dock-btn dock-shortcut-btn" id="dock-btn-reset" title="Kembali ke slide awal (R)">
          <span>Atur ulang</span>
          <span class="dock-key-badge">R</span>
        </button>
        <div class="dock-divider"></div>
        <div class="dock-export-wrapper" id="dock-export-wrapper">
          <button type="button" class="dock-btn dock-export-trigger" id="dock-btn-export" title="Ekspor Presentasi (E)">
            <span>Export</span>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" class="dock-export-chevron"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <div class="dock-export-menu" id="dock-export-menu">
            <button type="button" class="dock-export-item" data-action="export-pdf" id="dock-export-pdf-item">
              <span class="export-item-label">PDF slide deck</span>
            </button>
            <div class="dock-export-divider"></div>
            <button type="button" class="dock-export-item disabled" disabled title="Segera hadir">
              <span class="export-item-label">PPTX</span>
              <span class="export-item-soon">Soon</span>
            </button>
            <button type="button" class="dock-export-item disabled" disabled title="Segera hadir">
              <span class="export-item-label">HTML</span>
              <span class="export-item-soon">Soon</span>
            </button>
            <button type="button" class="dock-export-item disabled" disabled title="Segera hadir">
              <span class="export-item-label">PNG</span>
              <span class="export-item-soon">Soon</span>
            </button>
          </div>
        </div>
        <div class="dock-divider"></div>
        <button type="button" class="dock-btn" id="dock-btn-edit" title="Mode Edit Realtime">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Edit</span>
        </button>
        <button type="button" class="dock-btn dock-btn-circle" id="dock-btn-fullscreen" title="Layar Penuh (F)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </button>
      </nav>
    </main>
  </div>

  <script>
    ${(typeof getSlideDeckRuntimeScript === 'function' ? getSlideDeckRuntimeScript() : (typeof window !== 'undefined' && window.getSlideDeckRuntimeScript ? window.getSlideDeckRuntimeScript() : ''))}
  </script>
  ${(typeof getSlideDeckEditorHtml === 'function' ? getSlideDeckEditorHtml() : (typeof window !== 'undefined' && window.getSlideDeckEditorHtml ? window.getSlideDeckEditorHtml() : ''))}
  <script>
    ${(typeof getSlideDeckEditorScript === 'function' ? getSlideDeckEditorScript() : (typeof window !== 'undefined' && window.getSlideDeckEditorScript ? window.getSlideDeckEditorScript() : ''))}
  </script>
</body>
</html>`;
}

// Global attachments
if (typeof window !== "undefined") {
  window.buildExecutiveSlideDeckHtml = buildExecutiveSlideDeckHtml;
  if (!window.escapeHtml) window.escapeHtml = escapeHtml;
  if (!window.toRoman) window.toRoman = toRoman;
}
