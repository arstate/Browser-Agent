// =========================================================================
// EXECUTIVE SLIDE DECK STYLES (CSS Variables, Grid, Layout, Dock & Print)
// Modular Theme Token Bindings, Glassmorphic Floating Dock & 16:9 Vector Print
// =========================================================================

function getExecutiveSlideDeckCss(theme = {}, options = {}) {
  const accentColor = options.accentColor || theme.accent || "#FF4D00";
  const accentSecondary = options.accentSecondary || theme.accentSecondary || "#0284C7";
  const accentTertiary = options.accentTertiary || theme.accentTertiary || "#111827";

  return `    :root {
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
      align-items: flex-start;
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
      line-height: 1;
      padding-top: 4px;
    }
    .thumb-item.active .thumb-num { color: #FFFFFF; font-weight: 800; }

    .thumb-card {
      width: 108px;
      height: 60.75px;
      background: var(--bg-slide);
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
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
      border-radius: 4px;
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
    /* Thumb mini layout variants */
    .thumb-mini-cover { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 14px 10px; }
    .thumb-mini-cover-tag { font-size: 8.5px; font-weight: 800; padding: 2px 8px; border: 1px solid var(--accent); border-radius: 9999px; margin-bottom: 8px; }
    .thumb-mini-cover-title { font-family: var(--font-heading); font-size: 22px; font-weight: 800; text-transform: uppercase; line-height: 1.15; margin-bottom: 6px; }
    .thumb-mini-cover-sub { font-size: 10px; color: var(--text-muted); margin-bottom: 8px; }
    .thumb-mini-cover-badges { display: flex; gap: 8px; font-size: 8.5px; color: var(--text-muted); }
    .thumb-mini-split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; flex: 1; margin: 10px 0; }
    .thumb-mini-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1; margin: 10px 0; }
    .thumb-mini-metric-col { display: flex; flex-direction: column; justify-content: space-between; background: var(--card-box-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 8px 6px; text-align: center; }
    .thumb-mini-metric-num { font-family: var(--font-heading); font-size: 18px; font-weight: 800; }
    .thumb-mini-metric-title { font-size: 8.5px; font-weight: 700; color: var(--text-muted); line-height: 1.2; }
    .thumb-mini-quote { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 10px 16px; }
    .thumb-mini-quote-mark { font-size: 32px; line-height: 0.8; }
    .thumb-mini-quote-text { font-family: var(--font-heading); font-size: 13px; font-weight: 700; margin: 6px 0; }
    .thumb-mini-quote-author { font-size: 8.5px; font-weight: 800; }
    .thumb-mini-timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1; margin: 10px 0; }
    .thumb-mini-timeline-step { display: flex; flex-direction: column; justify-content: space-between; background: var(--card-box-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 6px; }
    .thumb-mini-step-num { font-size: 8.5px; font-weight: 800; margin-bottom: 4px; }
    .thumb-mini-conclusion { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; margin: 10px 0; }
    .thumb-mini-checklist-lines { font-size: 8.5px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; }

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

    @media screen {
      .slide-section {
        display: none !important;
        width: min(1200px, 100%, calc((100vh - 96px) * (16 / 9)));
        max-width: 1200px;
        max-height: 675px;
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
    }

    .slide-canvas {
      width: 100%;
      height: 100%;
      background: var(--bg-slide);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
      border-radius: var(--card-radius);
      padding: 42px 54px;
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
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-topic-crumb {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--text-main);
      text-transform: uppercase;
    }
    .header-sep {
      color: var(--text-muted);
      opacity: 0.6;
      font-size: 11px;
    }
    .header-chapter-sub {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
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
    .col-tag-chip, .col-highlight-box {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 9999px;
      border: 1px solid currentColor;
      align-self: flex-start;
      margin-top: 8px;
    }
    .col-tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .col-highlight-text {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1;
    }
    .slide-col.is-featured, .split-col.is-featured, .timeline-step.is-featured {
      border-top: 2px solid var(--accent);
      padding-top: 8px;
    }


    /* === MULTI-LAYOUT SLIDE ARCHITECTURES === */
    /* Cover / Hero Layout */
    .slide-layout-cover .cover-center-content { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; margin: 16px 0; }
    .cover-badge-pill { font-family: var(--font-body); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 14px; border: 1.5px solid var(--accent); border-radius: 9999px; margin-bottom: 16px; display: inline-block; }
    .cover-main-title { font-family: var(--font-heading); font-size: 42px; font-weight: 800; line-height: 1.12; letter-spacing: -0.02em; text-transform: uppercase; color: var(--text-main); max-width: 960px; margin-bottom: 12px; }
    .cover-lead-subtitle { font-family: var(--font-body); font-size: 16px; color: var(--text-muted); line-height: 1.55; max-width: 820px; margin-bottom: 24px; }
    .cover-meta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .cover-meta-item { display: flex; align-items: center; gap: 8px; background: var(--card-box-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 8px 16px; font-family: var(--font-body); font-size: 12px; }
    .cover-meta-label { color: var(--text-muted); font-weight: 600; }
    .cover-meta-val { color: var(--text-main); font-weight: 800; }

    /* Split 2-Column Layout */
    .split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; flex: 1; align-items: stretch; margin: 12px 0 20px 0; }
    .split-col { display: flex; flex-direction: column; justify-content: space-between; background: var(--card-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 26px 28px; }
    .split-col-title { font-family: var(--font-heading); font-size: 21px; font-weight: 700; line-height: 1.25; color: var(--text-main); margin: 8px 0 10px 0; }
    .split-col-desc { font-family: var(--font-body); font-size: 14px; color: var(--text-muted); line-height: 1.6; margin-bottom: 18px; }

    /* 4-Grid Metrics Layout */
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; flex: 1; align-items: stretch; margin: 12px 0 20px 0; }
    .metric-card { display: flex; flex-direction: column; justify-content: space-between; background: var(--card-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 20px 18px; }
    .metric-val { font-family: var(--font-heading); font-size: 36px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
    .metric-title { font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--text-main); margin: 8px 0 6px 0; }
    .metric-desc { font-family: var(--font-body); font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px; }

    /* Quote / Statement Layout */
    .quote-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px 48px; margin: 12px 0 20px 0; }
    .quote-mark { font-family: var(--font-heading); font-size: 56px; line-height: 0.8; margin-bottom: 10px; opacity: 0.85; }
    .quote-text { font-family: var(--font-heading); font-size: 24px; font-weight: 700; line-height: 1.38; color: var(--text-main); max-width: 860px; margin-bottom: 16px; }
    .quote-author { font-family: var(--font-body); font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .quote-takeaway-pill { margin-top: 16px; background: var(--card-box-bg); border: var(--card-border); border-radius: 9999px; padding: 7px 22px; font-family: var(--font-body); font-size: 12px; font-weight: 700; color: var(--text-muted); }

    /* Timeline / Stepped Process Layout */
    .timeline-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; flex: 1; align-items: stretch; margin: 12px 0 20px 0; }
    .timeline-step { display: flex; flex-direction: column; justify-content: space-between; background: var(--card-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 20px 16px; }
    .timeline-step-badge { font-family: var(--font-body); font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px; display: inline-block; }
    .timeline-step-title { font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; }
    .timeline-step-desc { font-family: var(--font-body); font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; }

    /* Conclusion / Action Checklist Layout */
    .conclusion-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; flex: 1; align-items: stretch; margin: 12px 0 20px 0; }
    .conclusion-card { display: flex; flex-direction: column; justify-content: space-between; background: var(--card-bg); border: var(--card-border); border-radius: var(--card-radius); padding: 24px 26px; }
    .conclusion-card-title { font-family: var(--font-heading); font-size: 21px; font-weight: 700; color: var(--text-main); margin: 6px 0 8px 0; }
    .conclusion-card-desc { font-family: var(--font-body); font-size: 13.5px; color: var(--text-muted); line-height: 1.55; }
    .conclusion-list { display: flex; flex-direction: column; gap: 10px; margin: 12px 0; }
    .conclusion-item { display: flex; gap: 10px; align-items: flex-start; font-family: var(--font-body); font-size: 13px; color: var(--text-main); line-height: 1.45; }
    .conclusion-check { font-weight: 800; font-size: 14px; flex-shrink: 0; }

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

    /* === DOCK EXPORT MENU === */
    .dock-export-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .dock-export-trigger {
      font-size: 12px;
      color: #E5E7EB;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 9999px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: all 0.15s ease;
    }
    .dock-export-trigger:hover,
    .dock-export-wrapper.open .dock-export-trigger {
      background: rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .dock-export-chevron {
      transition: transform 0.2s ease;
      opacity: 0.8;
    }
    .dock-export-wrapper.open .dock-export-chevron {
      transform: rotate(180deg);
    }
    .dock-export-menu {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      min-width: 146px;
      background: #181B22;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      padding: 5px;
      display: none;
      flex-direction: column;
      gap: 3px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(24px);
      z-index: 200;
      animation: dropupFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .dock-export-wrapper.open .dock-export-menu {
      display: flex;
    }
    @keyframes dropupFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .dock-export-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 32px;
      padding: 0 10px;
      border: none;
      background: none;
      border-radius: 8px;
      color: #E5E7EB;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.12s ease;
      box-sizing: border-box;
      gap: 8px;
    }
    .dock-export-item:not(.disabled):hover {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }
    .dock-export-item.disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }
    .export-item-soon {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: #9CA3AF;
      border: 1px solid rgba(255, 255, 255, 0.1);
      text-transform: uppercase;
    }
    .dock-export-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 3px 0;
    }

    /* === SKELETON & PROGRESSIVE SLIDE LOADER === */
    @keyframes slideShimmer { 0%,100% { opacity:0.25; background-position:-200% 0; } 50% { opacity:0.6; } }
    @keyframes pulseAnim { 0%,100% { opacity:0.35; transform:scale(0.85); } 50% { opacity:1; transform:scale(1.15); } }
    @keyframes spinLoader { 100% { transform:rotate(360deg); } }
    .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%); background-size: 200% 100%; animation: slideShimmer 2s infinite ease-in-out; }
    .thumb-mini-loading { height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 4px; }
    .thumb-mini-skeleton-line { height: 7px; border-radius: 4px; margin-bottom: 3px; width: 85%; }
    .thumb-mini-skeleton-line.short { width: 50%; }
    .thumb-mini-loading-grid { display: flex; gap: 4px; height: 26px; margin: 3px 0; }
    .thumb-mini-skeleton-box { flex: 1; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); }
    .thumb-mini-loading-status { font-size: 8px; font-weight: 800; letter-spacing: 0.08em; display: flex; align-items: center; gap: 4px; }
    .pulse-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; animation: pulseAnim 1.2s infinite ease-in-out; }
    .slide-loading-skeleton { height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 14px 0; }
    .skeleton-header { margin-bottom: 18px; }
    .skeleton-badge { width: 130px; height: 16px; border-radius: 6px; margin-bottom: 10px; }
    .skeleton-title { width: 58%; height: 32px; border-radius: 8px; margin-bottom: 8px; }
    .skeleton-subtitle { width: 78%; height: 14px; border-radius: 6px; }
    .skeleton-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; flex: 1; margin-bottom: 16px; }
    .skeleton-card { border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .skeleton-card-badge { width: 60px; height: 10px; border-radius: 3px; background: rgba(255,255,255,0.06); }
    .skeleton-card-title { width: 75%; height: 18px; border-radius: 5px; background: rgba(255,255,255,0.08); }
    .skeleton-card-desc { width: 100%; height: 12px; border-radius: 4px; background: rgba(255,255,255,0.04); }
    .skeleton-card-desc.short { width: 55%; }
    .skeleton-status-pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; border: 1px solid; background: rgba(0,0,0,0.35); font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }
    .spin-svg { animation: spinLoader 1s linear infinite; }

    /* === IMAGES, CARDS & DOODLES === */
    .card-image-wrap { width: 100%; height: 160px; border-radius: calc(var(--card-radius) - 2px); overflow: hidden; margin-bottom: 12px; position: relative; background: rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: center; }
    .card-image { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-hero-image-wrap { width: 124px; height: 124px; border-radius: 50%; overflow: hidden; margin: 0 auto 16px auto; border: 3px solid var(--accent); box-shadow: 0 8px 24px rgba(0,0,0,0.12); background: var(--card-box-bg); }
    .cover-hero-image { width: 100%; height: 100%; object-fit: cover; display: block; }
    .doodle-paw-svg, .doodle-cat-svg, .doodle-sparkle-svg, .doodle-heart-svg { display: inline-block; vertical-align: middle; }
    .paw-watermark { position: absolute; pointer-events: none; opacity: 0.07; z-index: 0; }
    .paw-bg-1 { top: 28px; right: 36px; transform: rotate(18deg); }
    .paw-bg-2 { bottom: 28px; left: 32px; transform: rotate(-14deg); }

    /* === PRINT FOR VECTOR 16:9 PDF EXPORT === */
    @media print {
      @page { size: 1200px 675px; margin: 0; }
      *, *::before, *::after { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html, body { background: var(--bg-slide) !important; color: var(--text-main) !important; overflow: visible !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
      .presentation-workspace { display: block !important; width: 100% !important; height: auto !important; overflow: visible !important; position: static !important; }
      .deck-sidebar, .deck-floating-dock { display: none !important; }
      .deck-stage-wrap { padding: 0 !important; margin: 0 !important; height: auto !important; display: block !important; overflow: visible !important; background: var(--bg-slide) !important; position: static !important; }
      .slide-section { display: flex !important; opacity: 1 !important; visibility: visible !important; transform: none !important; width: 1200px !important; height: 675px !important; page-break-after: always !important; break-after: page !important; margin: 0 !important; padding: 0 !important; background: var(--bg-slide) !important; position: relative !important; }
      .slide-canvas { height: 100% !important; width: 100% !important; box-shadow: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; }
    }`;
}

// Global attachments
if (typeof window !== "undefined") {
  window.getExecutiveSlideDeckCss = getExecutiveSlideDeckCss;
}
