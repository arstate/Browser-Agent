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
    :root {
      --bg-desk: ${theme.bgDesk || '#0E1015'};
      --bg-sidebar: ${theme.bgSidebar || '#0B0C10'};
      --bg-slide: ${theme.bgSlide || '#F5F3EF'};
      --text-main: ${theme.textMain || '#111827'};
      --text-muted: ${theme.textMuted || '#4B5563'};
      --border-header: ${theme.borderHeader || '#9CA3AF'};
      --accent: ${accentColor};
      --accent-sec: ${accentSecondary};
      --accent-ter: ${accentTertiary};
      --card-bg: ${theme.cardBg || 'rgba(255, 255, 255, 0.65)'};
      --card-border: ${theme.cardBorder || '1.5px solid rgba(0, 0, 0, 0.08)'};
      --card-box-bg: ${theme.cardBoxBg || '#FFFFFF'};
      --card-radius: ${theme.cardRadius || '6px'};
      --font-heading: ${theme.fontHeading || "'Syne', 'Space Grotesk', sans-serif"};
      --font-body: ${theme.fontBody || "'Plus Jakarta Sans', sans-serif"};
      --dock-bg: #16181F;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: var(--font-body);
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
      user-select: none;
    }
    .thumb-item * {
      pointer-events: none;
    }
    .thumb-item:hover { opacity: 0.95; }
    .thumb-item.active { opacity: 1; }

    .thumb-num {
      font-family: var(--font-body);
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
      background: var(--bg-slide);
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--card-radius);
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
      background: var(--bg-slide);
    }
    .thumb-mini-slide {
      width: 864px;
      height: 486px;
      transform: scale(0.125);
      transform-origin: top left;
      pointer-events: none;
      user-select: none;
      background: var(--bg-slide);
      color: var(--text-main);
      padding: 24px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .thumb-mini-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid var(--border-header);
      padding-bottom: 6px;
      font-family: var(--font-body);
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .thumb-mini-page { color: var(--accent); font-weight: 800; }
    .thumb-mini-hero {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 10px 0 6px 0;
    }
    .thumb-mini-title {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 650px;
    }
    .thumb-mini-counter {
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 800;
      color: var(--text-main);
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
      font-family: var(--font-body);
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .thumb-mini-col-title {
      font-family: var(--font-heading);
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .thumb-mini-box {
      background: var(--card-box-bg);
      border: var(--card-border);
      border-radius: var(--card-radius);
      padding: 8px 10px;
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .thumb-mini-footer {
      border-top: 1px solid var(--border-header);
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-family: var(--font-body);
      font-size: 9px;
      font-weight: 600;
      color: var(--text-muted);
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
      display: none !important;
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
      display: flex !important;
      opacity: 1 !important;
      transform: scale(1) !important;
    }

    .slide-canvas {
      width: 100%;
      height: 100%;
      background: var(--bg-slide);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
      border-radius: var(--card-radius);
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
      border-bottom: 1.5px solid var(--border-header);
      padding-bottom: 10px;
    }
    .header-chapter {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-main);
      text-transform: uppercase;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .header-ratio {
      color: var(--text-muted);
    }
    .header-page-tag {
      font-weight: 800;
    }

    /* HERO */
    .slide-hero {
      margin: 18px 0 16px 0;
    }
    .slide-main-title {
      font-family: var(--font-heading);
      font-size: 30px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.01em;
      text-transform: uppercase;
      color: var(--text-main);
      margin-bottom: 8px;
    }
    .hero-sub-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .slide-lead-desc {
      font-family: var(--font-body);
      font-size: 13.5px;
      color: var(--text-muted);
      line-height: 1.45;
      flex: 1;
    }
    .slide-big-counter {
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 800;
      color: var(--text-main);
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
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .col-title {
      font-family: var(--font-heading);
      font-size: 17px;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text-main);
      margin-bottom: 8px;
    }
    .col-desc {
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.55;
      margin-bottom: 16px;
    }
    .col-highlight-box {
      background: var(--card-box-bg);
      border: var(--card-border);
      border-radius: var(--card-radius);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      min-height: 46px;
    }
    .col-highlight-text {
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* FOOTER */
    .slide-footer-bar {
      border-top: 1px solid var(--border-header);
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
      font-family: var(--font-body);
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-main);
    }
    .footer-line-2 {
      font-family: var(--font-body);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .footer-status-tag {
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
    .dock-btn * {
      pointer-events: none;
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
      font-family: var(--font-body);
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
        background: var(--bg-slide) !important;
        color: var(--text-main) !important;
        overflow: visible !important;
        height: auto !important;
      }
      .deck-sidebar, .deck-floating-dock { display: none !important; }
      .deck-stage-wrap {
        padding: 0 !important;
        height: auto !important;
        display: block !important;
        background: var(--bg-slide) !important;
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
      });

      // Keyboard navigation
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
