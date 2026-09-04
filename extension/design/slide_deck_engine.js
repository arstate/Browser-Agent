// =========================================================================
// EXECUTIVE SLIDE DECK ENGINE (16:9 Widescreen Presentation Engine)
// Standard Executive Editorial GSM v3.0, Widescreen Bento Grid & Floating Dock
// =========================================================================

if (typeof escapeHtml !== 'function') {
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}

function toRoman(num) {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  return romans[num - 1] || String(num);
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
  const brandName = deckMeta.brand || "DJADI CREATIVE";
  const categoryTitle = deckMeta.categoryTitle || deckMeta.title || "FONDASI BRAND & MANIFESTO";
  const gsmVersion = deckMeta.version || "GSM v3.0";
  const accentColor = deckMeta.accentColor || "#FF4D00";
  const copyrightText = deckMeta.copyright || `© 2026 ${brandName.toUpperCase()} • STANDAR IDENTITAS VISUAL RESMI`;

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
                <span class="thumb-mini-chapter">BAB ${toRoman(idx + 1)} // ${escapeHtml(categoryTitle.toUpperCase())} // ${escapeHtml(gsmVersion)}</span>
                <span class="thumb-mini-page">HALAMAN ${slideNumStr}/${totalStr}</span>
              </div>
              <div class="thumb-mini-hero">
                <div class="thumb-mini-title">${escapeHtml(s.title || '')}</div>
                <div class="thumb-mini-counter">${slideNumStr} // ${totalStr}</div>
              </div>
              <div class="thumb-mini-grid">
                ${cards.slice(0, 3).map((c, ci) => {
                  const badgeColor = c.badgeColor || (ci === 0 ? '#FF4D00' : ci === 1 ? '#0284C7' : '#111827');
                  const highlightColor = c.highlightColor || (ci === 0 ? '#111827' : ci === 1 ? '#0284C7' : '#FF4D00');
                  return `
                    <div class="thumb-mini-col">
                      <div class="thumb-mini-badge" style="color: ${badgeColor};">${escapeHtml(c.badge || `KARTU 0${ci + 1}`)}</div>
                      <div class="thumb-mini-col-title">${escapeHtml((c.title || '').slice(0, 24))}</div>
                      <div class="thumb-mini-box">
                        <span style="color: ${highlightColor};">${escapeHtml((c.footerHighlight || c.title || '').slice(0, 20))}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="thumb-mini-footer">
                <span>${escapeHtml(copyrightText)}</span>
                <span style="color: ${accentColor}; font-weight: 800;">CONFIDENTIAL // ENTERPRISE</span>
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
      const badgeColor = c.badgeColor || (cIdx === 0 ? '#FF4D00' : cIdx === 1 ? '#0284C7' : '#111827');
      const highlightColor = c.highlightColor || (cIdx === 0 ? '#111827' : cIdx === 1 ? '#0284C7' : '#FF4D00');
      const badgeText = c.badge || (cIdx === 0 ? 'KARTU 01 // ORTOGRAFI' : cIdx === 1 ? 'KARTU 02 // FILOSOFI' : `KARTU 0${cIdx + 1} // DIFERENSIASI`);
      const highlightText = c.footerHighlight || (cIdx === 0 ? '"DJ" → JADI' : cIdx === 1 ? 'TERWUJUD & SELESAI' : 'DISTINCTIVE BRAND ASSET');

      return `
        <div class="slide-col">
          <div class="col-top">
            <div class="col-badge" style="color: ${badgeColor};">
              ${escapeHtml(badgeText)}
            </div>
            <h3 class="col-title">${escapeHtml(c.title || `Poin Strategis 0${cIdx + 1}`)}</h3>
            <p class="col-desc">${escapeHtml(c.desc || '')}</p>
          </div>
          <div class="col-highlight-box">
            <span class="col-highlight-text" style="color: ${highlightColor};">
              ${escapeHtml(highlightText)}
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
              <span class="header-chapter">BAB ${toRoman(idx + 1)} // ${escapeHtml(categoryTitle.toUpperCase())} // ${escapeHtml(gsmVersion)}</span>
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

          <div class="slide-columns-grid" style="grid-template-columns: repeat(${Math.min(cards.length || 3, 3)}, 1fr);">
            ${cardsHtml}
          </div>

          <div class="slide-footer-bar">
            <div class="footer-meta-block">
              <div class="footer-line-1">${escapeHtml(copyrightText)}</div>
              <div class="footer-line-2">
                BAB ${idx + 1} DARI ${total} • <span class="confidential-tag" style="color: ${accentColor};">CONFIDENTIAL // ENTERPRISE</span>
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-desk: #0E1015;
      --bg-sidebar: #0B0C10;
      --bg-slide: #F5F3EF;
      --text-main: #111827;
      --text-muted: #4B5563;
      --accent: ${accentColor};
      --accent-blue: #0284C7;
      --dock-bg: #16181F;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-desk);
      color: var(--text-main);
    }

    .presentation-workspace {
      display: flex;
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    /* === SIDEBAR THUMBNAILS === */
    .deck-sidebar {
      width: 156px;
      height: 100vh;
      background: var(--bg-sidebar);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px 12px;
      flex-shrink: 0;
      z-index: 20;
    }
    .deck-sidebar::-webkit-scrollbar { width: 4px; }
    .deck-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

    .thumb-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      opacity: 0.65;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .thumb-item:hover { opacity: 0.95; }
    .thumb-item.active { opacity: 1; }

    .thumb-num {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #6B7280;
      width: 16px;
      text-align: right;
      flex-shrink: 0;
    }
    .thumb-item.active .thumb-num { color: #FFFFFF; font-weight: 800; }

    .thumb-card {
      width: 108px;
      height: 60.75px;
      background: #F5F3EF;
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .thumb-item.active .thumb-card {
      border-color: #FFFFFF;
      box-shadow: 0 0 14px rgba(255, 255, 255, 0.35);
    }
    .thumb-mini-slide-wrap {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: #F5F3EF;
    }
    .thumb-mini-slide {
      width: 864px;
      height: 486px;
      transform: scale(0.125);
      transform-origin: top left;
      pointer-events: none;
      user-select: none;
      background: #F5F3EF;
      padding: 24px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .thumb-mini-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #9CA3AF;
      padding-bottom: 6px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: #374151;
    }
    .thumb-mini-page { color: var(--accent); font-weight: 800; }
    .thumb-mini-hero {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 10px 0 6px 0;
    }
    .thumb-mini-title {
      font-family: 'Syne', 'Space Grotesk', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 650px;
    }
    .thumb-mini-counter {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #111;
    }
    .thumb-mini-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      flex: 1;
      margin: 10px 0;
    }
    .thumb-mini-col {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .thumb-mini-badge {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .thumb-mini-col-title {
      font-size: 13px;
      font-weight: 700;
      color: #111;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .thumb-mini-box {
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 6px;
      padding: 8px 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .thumb-mini-footer {
      border-top: 1px solid #D1D5DB;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 600;
      color: #6B7280;
    }

    /* === MAIN STAGE VIEWPORT === */
    .deck-stage-wrap {
      flex: 1;
      height: 100vh;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-desk);
      padding: 24px 36px 72px 36px;
    }

    .slide-section {
      display: none;
      width: 100%;
      height: 100%;
      max-width: 1220px;
      max-height: calc(1220px * 9 / 16);
      aspect-ratio: 16 / 9;
      opacity: 0;
      transform: scale(0.99);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .slide-section.active {
      display: flex;
      opacity: 1;
      transform: scale(1);
    }

    .slide-canvas {
      width: 100%;
      height: 100%;
      background: var(--bg-slide);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
      border-radius: 4px;
      padding: 36px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      position: relative;
    }

    /* HEADER */
    .slide-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #9CA3AF;
      padding-bottom: 10px;
    }
    .header-chapter {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #1F2937;
      text-transform: uppercase;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .header-ratio {
      color: #4B5563;
    }
    .header-page-tag {
      font-weight: 800;
    }

    /* HERO */
    .slide-hero {
      margin: 18px 0 16px 0;
    }
    .slide-main-title {
      font-family: 'Syne', 'Space Grotesk', sans-serif;
      font-size: 30px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.01em;
      text-transform: uppercase;
      color: #000000;
      margin-bottom: 8px;
    }
    .hero-sub-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .slide-lead-desc {
      font-size: 13.5px;
      color: #4B5563;
      line-height: 1.45;
      flex: 1;
    }
    .slide-big-counter {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }

    /* 3 COLUMNS GRID */
    .slide-columns-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      flex: 1;
      align-items: stretch;
      margin: 12px 0 20px 0;
    }
    .slide-col {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: transparent;
    }
    .col-top {
      display: flex;
      flex-direction: column;
    }
    .col-badge {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .col-title {
      font-size: 17px;
      font-weight: 700;
      line-height: 1.3;
      color: #111827;
      margin-bottom: 8px;
    }
    .col-desc {
      font-size: 13px;
      color: #4B5563;
      line-height: 1.55;
      margin-bottom: 16px;
    }
    .col-highlight-box {
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      min-height: 46px;
    }
    .col-highlight-text {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* FOOTER */
    .slide-footer-bar {
      border-top: 1px solid #D1D5DB;
      padding-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-meta-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .footer-line-1 {
      font-size: 10.5px;
      font-weight: 600;
      color: #374151;
    }
    .footer-line-2 {
      font-size: 10.5px;
      font-weight: 700;
      color: #4B5563;
    }
    .confidential-tag {
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    /* === FLOATING NAVIGATION DOCK === */
    .deck-floating-dock {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--dock-bg);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 9999px;
      padding: 5px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(20px);
      z-index: 100;
    }
    .dock-btn {
      background: none;
      border: none;
      color: #FFFFFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
    }
    .dock-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--accent);
    }
    .dock-btn-circle {
      width: 26px;
      height: 26px;
      padding: 0;
      border-radius: 50%;
    }
    .dock-counter {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0 4px;
    }
    .dock-counter strong { color: var(--accent); }
    .dock-divider {
      width: 1px;
      height: 16px;
      background: rgba(255, 255, 255, 0.16);
    }
    .dock-shortcut-btn {
      font-size: 12px;
      color: #D1D5DB;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dock-key-badge {
      background: #282B33;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #E5E7EB;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }

    /* === PRINT FOR PDF EXPORT === */
    @media print {
      @page {
        size: 16in 9in;
        margin: 0;
      }
      body, html {
        background: #F5F3EF !important;
        overflow: visible !important;
        height: auto !important;
      }
      .deck-sidebar, .deck-floating-dock { display: none !important; }
      .deck-stage-wrap {
        padding: 0 !important;
        height: auto !important;
        display: block !important;
        background: #F5F3EF !important;
      }
      .slide-section {
        display: block !important;
        opacity: 1 !important;
        transform: none !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        page-break-after: always !important;
        break-after: page !important;
        padding: 40px 48px !important;
        box-sizing: border-box !important;
      }
      .slide-canvas {
        height: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        justify-content: space-between !important;
      }
    }
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
        <button type="button" class="dock-btn dock-shortcut-btn" id="dock-btn-print" onclick="window.print()" title="Cetak / Simpan PDF (P)">
          <span>PDF</span>
          <span class="dock-key-badge">P</span>
        </button>
      </nav>
    </main>
  </div>

  <script>
    const slides = document.querySelectorAll('.slide-section');
    const thumbs = document.querySelectorAll('.thumb-item');
    const currSlideEl = document.getElementById('dock-curr-slide');
    const sidebarEl = document.getElementById('deck-sidebar');
    let currentIndex = 0;

    function goToSlide(idx) {
      if (idx < 0) idx = 0;
      if (idx >= slides.length) idx = slides.length - 1;
      
      slides[currentIndex].classList.remove('active');
      thumbs[currentIndex]?.classList.remove('active');
      
      currentIndex = idx;
      
      slides[currentIndex].classList.add('active');
      if (thumbs[currentIndex]) {
        thumbs[currentIndex].classList.add('active');
        thumbs[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      if (currSlideEl) {
        currSlideEl.textContent = currentIndex + 1;
      }
    }

    document.getElementById('dock-btn-prev')?.addEventListener('click', () => goToSlide(currentIndex - 1));
    document.getElementById('dock-btn-next')?.addEventListener('click', () => goToSlide(currentIndex + 1));
    document.getElementById('dock-btn-reset')?.addEventListener('click', () => goToSlide(0));

    thumbs.forEach((t, i) => {
      t.addEventListener('click', () => goToSlide(i));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        goToSlide(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        goToSlide(currentIndex - 1);
      } else if (e.key === 'r' || e.key === 'R') {
        goToSlide(0);
      } else if (e.key === 'p' || e.key === 'P') {
        window.print();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    });
  </script>
</body>
</html>`;
}

function parseMarkdownToSlides(content, userPrompt = "") {
  if (!content || typeof content !== 'string') return [];

  let rawSlides = [];
  if (content.includes("\n---\n") || content.includes("\n--- \n")) {
    rawSlides = content.split(/\n---\s*\n/).map(s => s.trim()).filter(Boolean);
  } else if (/(?:^|\n)#+\s*Slide\s+\d+/i.test(content)) {
    rawSlides = content.split(/(?:^|\n)(?=#+\s*Slide\s+\d+)/i).map(s => s.trim()).filter(Boolean);
  } else if (/(?:^|\n)Slide\s+\d+[:\s-]/i.test(content)) {
    rawSlides = content.split(/(?:^|\n)(?=Slide\s+\d+[:\s-])/i).map(s => s.trim()).filter(Boolean);
  } else {
    const headings = content.split(/(?:^|\n)(?=#{1,2}\s+)/m).map(s => s.trim()).filter(Boolean);
    if (headings.length >= 2) rawSlides = headings;
  }

  const validSlides = rawSlides.filter(s => {
    const lines = s.split("\n").map(l => l.trim()).filter(Boolean);
    return lines.length >= 2 || s.length > 50;
  });

  if (validSlides.length === 0) return [];

  return validSlides.map((raw, idx) => {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    let title = `Slide ${idx + 1}`;
    let subtitle = "";
    const cards = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && (line.startsWith("#") || /^slide\s+\d+/i.test(line))) {
        title = line.replace(/^#+\s*/, "").replace(/^slide\s+\d+[:\s-]*/i, "").trim() || title;
      } else if (!subtitle && (line.toLowerCase().startsWith("subjudul:") || line.toLowerCase().startsWith("subtitle:"))) {
        subtitle = line.replace(/^(subjudul|subtitle)[:\s-]*/i, "").trim();
      } else if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•") || /^\d+\./.test(line)) {
        const itemText = line.replace(/^[-*•\d.]+\s*/, "").trim();
        const colonIdx = itemText.indexOf(":");
        if (colonIdx > 0 && colonIdx < 40) {
          const cardTitle = itemText.slice(0, colonIdx).replace(/\*\*/g, "").trim();
          const cardDesc = itemText.slice(colonIdx + 1).trim();
          cards.push({
            badge: `KARTU 0${cards.length + 1} // ANALISIS`,
            title: cardTitle,
            desc: cardDesc,
            footerHighlight: cardTitle.toUpperCase().slice(0, 32)
          });
        } else {
          cards.push({
            badge: `KARTU 0${cards.length + 1} // POIN UTAMA`,
            title: itemText.slice(0, 32),
            desc: itemText,
            footerHighlight: "KEY TAKEAWAY"
          });
        }
      } else if (line.length > 0 && !line.startsWith("<design_meta>") && !line.startsWith("```")) {
        if (!subtitle && cards.length === 0) {
          subtitle = line;
        } else {
          cards.push({
            badge: `KARTU 0${cards.length + 1} // INSIGHT`,
            title: `Insight 0${cards.length + 1}`,
            desc: line,
            footerHighlight: "STRATEGIC VALUE"
          });
        }
      }
    }

    while (cards.length < 3) {
      const cIdx = cards.length + 1;
      cards.push({
        badge: `KARTU 0${cIdx} // FOKUS STRATEGIS`,
        title: `Pilar Eksekusi 0${cIdx}`,
        desc: `Implementasi terukur dengan standar akurasi tinggi dan efisiensi maksimal pada tahap operasional.`,
        footerHighlight: `OPTIMASI 0${cIdx}`
      });
    }

    return { title, subtitle, cards: cards.slice(0, 3), index: idx + 1 };
  });
}

function convertMarkdownOrTextToInteractiveSlideDeck(content, userPrompt = "") {
  if (!content || typeof content !== 'string') return '';
  const slides = parseMarkdownToSlides(content, userPrompt);
  if (slides.length >= 2) {
    const deckMeta = {
      title: (userPrompt || "Executive Presentation Deck").slice(0, 40),
      brand: "DJADI CREATIVE",
      categoryTitle: (userPrompt || "PRESENTASI EKSEKUTIF").slice(0, 32).toUpperCase(),
      version: "GSM v3.0",
      accentColor: "#FF4D00"
    };
    return buildExecutiveSlideDeckHtml(slides, deckMeta);
  }
  return '';
}

function extractSlidesFromRawHtml(html) {
  if (!html || typeof html !== "string") return [];
  const slideRegex = /<(?:section|div|article)[^>]*class=["'](?=[^"']*(?:slide|presentation-slide|deck-slide|swiper-slide))[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div|article)>/gi;
  let match;
  const extracted = [];
  while ((match = slideRegex.exec(html)) !== null) {
    const slideContent = match[1];
    const titleMatch = slideContent.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : `Slide ${extracted.length + 1}`;
    
    const pMatches = [...slideContent.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    let subtitle = "";
    let pointTexts = [];
    if (pMatches.length > 0) {
      subtitle = pMatches[0];
      pointTexts = pMatches.slice(1);
    }

    const liMatches = [...slideContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    if (liMatches.length > 0) {
      pointTexts.push(...liMatches);
    }

    const cards = [];
    for (let p of pointTexts) {
      if (cards.length >= 3) break;
      const colon = p.indexOf(":");
      const cTitle = colon > 0 ? p.slice(0, colon).trim() : p.slice(0, 30);
      const cDesc = colon > 0 ? p.slice(colon + 1).trim() : p;
      cards.push({
        badge: `KARTU 0${cards.length + 1} // ANALISIS`,
        title: cTitle,
        desc: cDesc,
        footerHighlight: cTitle.toUpperCase().slice(0, 30)
      });
    }

    while (cards.length < 3) {
      const cIdx = cards.length + 1;
      cards.push({
        badge: `KARTU 0${cIdx} // FOKUS STRATEGIS`,
        title: `Pilar Eksekusi 0${cIdx}`,
        desc: `Implementasi terukur dengan standar akurasi tinggi dan efisiensi maksimal pada tahap operasional.`,
        footerHighlight: `OPTIMASI 0${cIdx}`
      });
    }

    extracted.push({
      title,
      subtitle,
      cards,
      index: extracted.length + 1
    });
  }
  return extracted;
}

function upgradeSlideDeckHtmlIfNeeded(html, userPrompt = "", meta = {}) {
  if (!html || typeof html !== "string") return html;
  
  // If already has the executive sidebar and dock, return as-is
  if (html.includes("deck-sidebar") && html.includes("deck-floating-dock")) {
    return html;
  }

  // If HTML contains slide elements, upgrade to full executive layout
  const extractedSlides = extractSlidesFromRawHtml(html);
  if (extractedSlides.length >= 1) {
    const deckMeta = {
      title: meta?.title || (userPrompt || "Executive Presentation Deck").slice(0, 40),
      brand: "DJADI CREATIVE",
      categoryTitle: meta?.title || (userPrompt || "STRATEGI & IDENTITAS").slice(0, 32).toUpperCase(),
      version: "GSM v3.0",
      accentColor: "#FF4D00"
    };
    return buildExecutiveSlideDeckHtml(extractedSlides, deckMeta);
  }

  return html;
}



// Global attachments
if (typeof window !== 'undefined') {
  window.toRoman = toRoman;
  window.buildExecutiveSlideDeckHtml = buildExecutiveSlideDeckHtml;
  window.parseMarkdownToSlides = parseMarkdownToSlides;
  window.convertMarkdownOrTextToInteractiveSlideDeck = convertMarkdownOrTextToInteractiveSlideDeck;
  window.extractSlidesFromRawHtml = extractSlidesFromRawHtml;
  window.upgradeSlideDeckHtmlIfNeeded = upgradeSlideDeckHtmlIfNeeded;
}
