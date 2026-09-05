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
  // Support both (slidesData, deckMeta) and alternate (topic, slidesData)
  if (typeof slidesData === 'string' && Array.isArray(deckMeta)) {
    const tempSlides = deckMeta;
    deckMeta = { title: slidesData, brand: slidesData };
    slidesData = tempSlides;
  }
  if (!Array.isArray(slidesData)) {
    slidesData = [];
  }
  const total = slidesData.length || 1;
  const promptOrTitle = deckMeta.userPrompt || deckMeta.title || (slidesData[0]?.title || "");
  const theme = deckMeta.themeObj || detectOptimalSlideTheme(promptOrTitle, deckMeta);

  // Brand Name logic: NEVER hardcode DJADI CREATIVE!
  let brandName = deckMeta.brand;
  if (!brandName || (/djadi/i.test(brandName) && !/djadi/i.test(promptOrTitle))) {
    brandName = (deckMeta.title || slidesData[0]?.title || "MATERI PRESENTASI").slice(0, 40);
  }

  let categoryTitle = deckMeta.categoryTitle || deckMeta.title || (slidesData[0]?.title || "MATERI PRESENTASI");
  if (/FONDASI BRAND|STRATEGI & IDENTITAS/i.test(categoryTitle) && !/fondasi|identitas|gsm/i.test(promptOrTitle)) {
    categoryTitle = (deckMeta.title || slidesData[0]?.title || "MATERI PRESENTASI").slice(0, 40);
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

  const thumbnailsHtml = slidesData.map((s, idx) => {
    const slideNumStr = String(idx + 1).padStart(2, '0');
    const totalStr = String(total).padStart(2, '0');
    const cards = s.cards || [];

    return `
      <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-target="${idx}" id="thumb-${idx}">
        <span class="thumb-num">${idx + 1}</span>
        <div class="thumb-card">
          <div class="thumb-mini-slide-wrap">
            <div class="thumb-mini-slide">
              <div class="thumb-mini-header">
                <span class="thumb-mini-chapter">BAB ${toRoman(idx + 1)} // ${escapeHtml(categoryTitle.toUpperCase())} // ${escapeHtml(subCategory)}</span>
                <span class="thumb-mini-page">HALAMAN ${slideNumStr}/${totalStr}</span>
              </div>
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
              <div class="thumb-mini-footer">
                <span>${escapeHtml(copyrightText)}</span>
                <span style="color: ${accentColor}; font-weight: 800;">${escapeHtml(badgeTag)}</span>
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
    
    const cardsHtml = cards.map((c, cIdx) => {
      const badgeColor = c.badgeColor || (cIdx === 0 ? accentColor : cIdx === 1 ? accentSecondary : accentTertiary);
      const highlightColor = c.highlightColor || badgeColor;
      const rawBadge = c.badge || `POIN 0${cIdx + 1} // ANALISIS`;
      const cleanBadge = (/ORTOGRAFI|FILOSOFI|DIFERENSIASI/i.test(rawBadge) && !/ortografi|filosofi/i.test(c.title || '')) ? `POIN 0${cIdx + 1} // ANALISIS` : rawBadge;
      const rawHl = c.footerHighlight || c.keyTakeaway || c.title || `POIN UTAMA 0${cIdx + 1}`;
      const cleanHl = (/"DJ" → JADI|TERWUJUD & SELESAI|DISTINCTIVE BRAND ASSET/i.test(rawHl) && !/djadi/i.test(promptOrTitle)) ? (c.title || `POIN UTAMA 0${cIdx + 1}`).slice(0, 28).toUpperCase() : rawHl;

      return `
        <div class="slide-col">
          <div class="col-top">
            <div class="col-badge" style="color: ${badgeColor};">
              ${escapeHtml(cleanBadge)}
            </div>
            <h3 class="col-title">${escapeHtml(c.title || `Poin Strategis 0${cIdx + 1}`)}</h3>
            <p class="col-desc">${escapeHtml(c.desc || '')}</p>
          </div>
          <div class="col-highlight-box">
            <span class="col-highlight-text" style="color: ${highlightColor};">
              ${escapeHtml(cleanHl)}
            </span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="slide-section ${idx === 0 ? 'active' : ''}" data-index="${idx}" id="slide-${idx}">
        <div class="slide-canvas">
          <div class="slide-header-bar">
            <div class="header-left">
              <span class="header-chapter">BAB ${toRoman(idx + 1)} // ${escapeHtml(categoryTitle.toUpperCase())} // ${escapeHtml(subCategory)}</span>
            </div>
            <div class="header-right">
              <span class="header-ratio">MODULAR RATIO 16:9</span>
              <span class="header-page-tag" style="color: ${accentColor};">HALAMAN ${slideNumStr}/${totalStr}</span>
            </div>
          </div>

          <div class="slide-hero">
            <h1 class="slide-main-title">${escapeHtml(s.title)}</h1>
            <div class="hero-sub-row">
              <p class="slide-lead-desc">${escapeHtml(s.subtitle || '')}</p>
              <div class="slide-big-counter">
                <span>${slideNumStr} // ${totalStr}</span>
              </div>
            </div>
          </div>

          <div class="slide-columns-grid" style="grid-template-columns: repeat(${Math.min(cards.length || 3, 4)}, 1fr);">
            ${cardsHtml}
          </div>

          <div class="slide-footer-bar">
            <div class="footer-meta-block">
              <div class="footer-line-1">${escapeHtml(copyrightText)}</div>
              <div class="footer-line-2">
                SLIDE ${idx + 1} DARI ${total} • <span class="footer-status-tag" style="color: ${accentColor}; font-weight: 800;">${escapeHtml(badgeTag)}</span>
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
      </nav>
    </main>
  </div>

  <script>
    (function() {
      const slides = Array.from(document.querySelectorAll('.slide-section'));
      const thumbs = Array.from(document.querySelectorAll('.thumb-item'));
      const currSlideEl = document.getElementById('dock-curr-slide');
      let currentIndex = 0;
      window.currentIndex = 0;

      function goToSlide(targetIdx) {
        let idx = parseInt(targetIdx, 10);
        if (isNaN(idx)) idx = 0;
        if (idx < 0) idx = 0;
        if (idx >= slides.length) idx = Math.max(0, slides.length - 1);

        currentIndex = idx;
        window.currentIndex = idx;

        for (let i = 0; i < slides.length; i++) {
          slides[i].classList.toggle('active', i === idx);
        }

        for (let i = 0; i < thumbs.length; i++) {
          const isActive = (i === idx);
          thumbs[i].classList.toggle('active', isActive);
          if (isActive) {
            try {
              thumbs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (_) {}
          }
        }

        if (currSlideEl) {
          currSlideEl.textContent = String(idx + 1);
        }
      }

      window.goToSlide = goToSlide;

      // Event delegation on document (single source of truth, robust against child element clicks)
      document.addEventListener('click', function(e) {
        const thumb = e.target.closest('.thumb-item');
        if (thumb) {
          e.preventDefault();
          const target = thumb.getAttribute('data-target') || thumb.id.replace('thumb-', '');
          goToSlide(target);
          return;
        }
        const prevBtn = e.target.closest('#dock-btn-prev');
        if (prevBtn) {
          e.preventDefault();
          goToSlide(currentIndex - 1);
          return;
        }
        const nextBtn = e.target.closest('#dock-btn-next');
        if (nextBtn) {
          e.preventDefault();
          goToSlide(currentIndex + 1);
          return;
        }
        const resetBtn = e.target.closest('#dock-btn-reset');
        if (resetBtn) {
          e.preventDefault();
          goToSlide(0);
          return;
        }

        const exportTrigger = e.target.closest('#dock-btn-export, .dock-export-trigger');
        if (exportTrigger) {
          e.preventDefault();
          const wrapper = document.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.toggle('open');
          return;
        }

        const exportPdfItem = e.target.closest('#dock-export-pdf-item, [data-action="export-pdf"]');
        if (exportPdfItem) {
          e.preventDefault();
          const wrapper = document.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.remove('open');
          window.parent.postMessage({
            type: 'EXPORT_SLIDE_DECK_PDF',
            html: document.documentElement.outerHTML,
            title: document.title || 'Slide Deck'
          }, '*');
          return;
        }

        const exportWrapper = document.getElementById('dock-export-wrapper');
        if (exportWrapper && exportWrapper.classList.contains('open') && !e.target.closest('#dock-export-wrapper')) {
          exportWrapper.classList.remove('open');
        }
      });

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
          goToSlide(currentIndex + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
          goToSlide(currentIndex - 1);
        } else if (e.key === 'r' || e.key === 'R') {
          goToSlide(0);
        } else if (e.key === 'e' || e.key === 'E') {
          const wrapper = document.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.toggle('open');
        } else if (e.key === 'p' || e.key === 'P') {
          window.parent.postMessage({
            type: 'EXPORT_SLIDE_DECK_PDF',
            html: document.documentElement.outerHTML,
            title: document.title || 'Slide Deck'
          }, '*');
        } else if (e.key === 'f' || e.key === 'F') {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
      });

      // Window postMessage bridge for parent iframe communication
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'GO_TO_SLIDE') {
          goToSlide(e.data.index);
        }
      });
    })();
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
