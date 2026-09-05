// =========================================================================
// EXECUTIVE SLIDE DECK ENGINE (16:9 Widescreen Presentation Processor)
// Parsing, HTML Extraction, Upgrader Pipeline & Interactive Normalizer
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

function resolveSlideDeckTheme(promptOrTopic = "", rawMeta = {}) {
  if (typeof detectOptimalSlideTheme === "function") {
    return detectOptimalSlideTheme(promptOrTopic, rawMeta);
  }
  if (typeof window !== "undefined" && typeof window.detectOptimalSlideTheme === "function") {
    return window.detectOptimalSlideTheme(promptOrTopic, rawMeta);
  }
  return {
    id: "dark_luxury_cyber",
    name: "Dark Luxury Cyber Editorial",
    bgSlide: "#0E1117",
    accent: "#38BDF8",
    subHeader: "STRATEGI & WAWASAN UTAMA",
    badge: "INSIGHT"
  };
}

function renderSlideDeckHtml(slidesData, deckMeta = {}) {
  if (typeof buildExecutiveSlideDeckHtml === "function") {
    return buildExecutiveSlideDeckHtml(slidesData, deckMeta);
  }
  if (typeof window !== "undefined" && typeof window.buildExecutiveSlideDeckHtml === "function") {
    return window.buildExecutiveSlideDeckHtml(slidesData, deckMeta);
  }
  console.warn("buildExecutiveSlideDeckHtml not found in runtime scope");
  return "";
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

  const totalSlides = validSlides.length;
  return validSlides.map((raw, idx) => {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    let title = `Slide ${idx + 1}`;
    let subtitle = "";
    let explicitLayout = "";
    const cards = [];
    let quoteText = "";
    let quoteAuthor = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && (line.startsWith("#") || /^slide\s+\d+/i.test(line))) {
        title = line.replace(/^#+\s*/, "").replace(/^slide\s+\d+[:\s-]*/i, "").trim() || title;
      } else if (!subtitle && (line.toLowerCase().startsWith("subjudul:") || line.toLowerCase().startsWith("subtitle:"))) {
        subtitle = line.replace(/^(subjudul|subtitle)[:\s-]*/i, "").trim();
      } else if (line.toLowerCase().startsWith("layout:") || line.toLowerCase().startsWith("tipe:")) {
        explicitLayout = line.replace(/^(layout|tipe)[:\s-]*/i, "").trim().toLowerCase();
      } else if (line.startsWith(">") || line.startsWith("“") || line.startsWith('"')) {
        quoteText = line.replace(/^[>“"'\s]+|[”"'\s]+$/g, "").trim();
      } else if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•") || /^\d+\./.test(line)) {
        const itemText = line.replace(/^[-*•\d.]+\s*/, "").trim();
        const colonIdx = itemText.indexOf(":");
        if (colonIdx > 0 && colonIdx < 40) {
          const cardTitle = itemText.slice(0, colonIdx).replace(/\*\*/g, "").trim();
          const cardDesc = itemText.slice(colonIdx + 1).trim();
          const statMatch = cardTitle.match(/^(\d+(?:[.,]\d+)?%?|\d+x|\d+\s*(?:jam|hari|bln|thn))/i) || cardDesc.match(/^(\d+(?:[.,]\d+)?%?|\d+x)/i);
          cards.push({
            badge: `POIN 0${cards.length + 1} // ANALISIS`,
            title: cardTitle,
            desc: cardDesc,
            stat: statMatch ? statMatch[1] : `0${cards.length + 1}`,
            metricValue: statMatch ? statMatch[1] : `0${cards.length + 1}`,
            footerHighlight: cardTitle.toUpperCase().slice(0, 32)
          });
        } else {
          cards.push({
            badge: `POIN 0${cards.length + 1} // ANALISIS`,
            title: itemText.slice(0, 32),
            desc: itemText,
            stat: `0${cards.length + 1}`,
            metricValue: `0${cards.length + 1}`,
            footerHighlight: "KEY TAKEAWAY"
          });
        }
      } else if (line.length > 0 && !line.startsWith("<design_meta>") && !line.startsWith("```")) {
        if (!subtitle && cards.length === 0) {
          subtitle = line;
        } else {
          cards.push({
            badge: `POIN 0${cards.length + 1} // INSIGHT`,
            title: `Insight 0${cards.length + 1}`,
            desc: line,
            stat: `0${cards.length + 1}`,
            metricValue: `0${cards.length + 1}`,
            footerHighlight: "STRATEGIC VALUE"
          });
        }
      }
    }

    // Determine layout
    let layout = explicitLayout;
    if (!layout) {
      if (idx === 0) {
        layout = 'cover';
      } else if (idx === totalSlides - 1 && totalSlides >= 4) {
        layout = 'conclusion';
      } else if (quoteText) {
        layout = 'quote';
      } else if (cards.length === 2) {
        layout = 'split';
      } else if (/tahap|langkah|step|alur|proses|roadmap|jadwal/i.test(title)) {
        layout = 'timeline';
      } else if (cards.length === 4) {
        layout = 'metrics';
      } else {
        const cycle = (idx - 1) % 4;
        if (cycle === 0) layout = 'split';
        else if (cycle === 1) layout = 'bento';
        else if (cycle === 2) layout = 'metrics';
        else layout = 'timeline';
      }
    }

    if (layout === 'split') {
      while (cards.length < 2) {
        const cIdx = cards.length + 1;
        cards.push({
          badge: `PILAR 0${cIdx} // ANALISIS`,
          title: `Fokus Strategis 0${cIdx}`,
          desc: `Analisis mendalam dan panduan eksekusi pada pilar utama.`,
          footerHighlight: `OPTIMASI 0${cIdx}`
        });
      }
    } else if (layout === 'metrics') {
      while (cards.length < 4) {
        const cIdx = cards.length + 1;
        cards.push({
          badge: `METRIK 0${cIdx} // KPI`,
          title: `Indikator 0${cIdx}`,
          desc: `Tolak ukur kinerja kunci dengan akurasi teruji.`,
          stat: `0${cIdx}`,
          metricValue: `${cIdx * 25}%`,
          footerHighlight: `INDIKATOR 0${cIdx}`
        });
      }
    } else if (layout === 'bento') {
      while (cards.length < 3) {
        const cIdx = cards.length + 1;
        cards.push({
          badge: `POIN 0${cIdx} // ANALISIS`,
          title: `Pilar Eksekusi 0${cIdx}`,
          desc: `Implementasi terukur dengan standar akurasi tinggi dan efisiensi maksimal pada tahap operasional.`,
          footerHighlight: `OPTIMASI 0${cIdx}`
        });
      }
    } else if (layout === 'timeline') {
      while (cards.length < 4) {
        const cIdx = cards.length + 1;
        cards.push({
          badge: `TAHAP 0${cIdx}`,
          title: `Langkah 0${cIdx}`,
          desc: `Aktivasi proses operasional secara berurutan dan terstandarisasi.`,
          footerHighlight: `EKSEKUSI 0${cIdx}`
        });
      }
    }

    return {
      title,
      subtitle,
      layout,
      quoteText,
      quoteAuthor,
      cards,
      index: idx + 1
    };
  });
}

function convertMarkdownOrTextToInteractiveSlideDeck(content, userPrompt = "") {
  if (!content || typeof content !== 'string') return '';
  const slides = parseMarkdownToSlides(content, userPrompt);
  if (slides.length >= 2) {
    const rawTitle = (userPrompt || "Executive Presentation Deck").slice(0, 40);
    const theme = resolveSlideDeckTheme(userPrompt || content);
    const deckMeta = {
      title: rawTitle,
      brand: rawTitle,
      categoryTitle: rawTitle.toUpperCase(),
      subCategory: theme.subHeader,
      accentColor: theme.accent,
      themeObj: theme,
      userPrompt: userPrompt
    };
    return renderSlideDeckHtml(slides, deckMeta);
  }
  return '';
}

function extractSlidesFromRawHtml(html) {
  if (!html || typeof html !== "string") return [];

  // Browser DOMParser path
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sidebar = doc.querySelector("#deck-sidebar, .deck-sidebar, aside");
      if (sidebar) sidebar.remove();
      const dock = doc.querySelector(".deck-floating-dock, #deck-floating-dock, nav");
      if (dock) dock.remove();

      let slideNodes = Array.from(doc.querySelectorAll("section.slide-section, section.slide, .slide-section, .deck-slide, section[id^='slide-'], div[id^='slide-']"));
      if (slideNodes.length === 0) {
        slideNodes = Array.from(doc.querySelectorAll("section"));
      }

      if (slideNodes.length > 0) {
        const totalNodes = slideNodes.length;
        return slideNodes.map((el, idx) => {
          const titleEl = el.querySelector("h1, h2, .slide-main-title, .cover-main-title, .title");
          const title = titleEl ? titleEl.textContent.trim() : `Slide ${idx + 1}`;

          const subEl = el.querySelector(".slide-lead-desc, .cover-lead-subtitle, .subtitle, p.lead, p");
          const subtitle = subEl ? subEl.textContent.trim() : "";

          // Preserve rawCanvasHtml if the slide already has rich custom canvas
          const canvasEl = el.querySelector(".slide-canvas");
          const rawCanvasHtml = canvasEl ? canvasEl.outerHTML : "";

          // Detect layout from classes
          let layout = "";
          const classStr = (el.className || "") + " " + (canvasEl ? canvasEl.className : "");
          if (/slide-layout-cover|layout-cover/i.test(classStr) || idx === 0) {
            layout = "cover";
          } else if (/slide-layout-split|layout-split|split-grid/i.test(classStr)) {
            layout = "split";
          } else if (/slide-layout-metrics|layout-metrics|metrics-grid/i.test(classStr)) {
            layout = "metrics";
          } else if (/slide-layout-quote|layout-quote|quote-wrap/i.test(classStr)) {
            layout = "quote";
          } else if (/slide-layout-timeline|layout-timeline|timeline-grid/i.test(classStr)) {
            layout = "timeline";
          } else if (/slide-layout-conclusion|layout-conclusion|conclusion-grid/i.test(classStr)) {
            layout = "conclusion";
          } else if (/slide-layout-bento|layout-bento|slide-columns-grid/i.test(classStr)) {
            layout = "bento";
          }

          let quoteEl = el.querySelector("blockquote, .quote-text");
          let quoteText = quoteEl ? quoteEl.textContent.trim() : "";
          let quoteAuthorEl = el.querySelector(".quote-author");
          let quoteAuthor = quoteAuthorEl ? quoteAuthorEl.textContent.trim().replace(/^[—-\s]+/, "") : "";

          let colNodes = Array.from(el.querySelectorAll(".slide-col, .bento-col, .split-col, .metric-card, .timeline-step, .col, .bento-card, .card"));
          let cards = [];
          if (colNodes.length > 0) {
            cards = colNodes.map((col, cIdx) => {
              const badgeEl = col.querySelector(".col-badge, .badge, .tag, .timeline-step-badge");
              const titleNode = col.querySelector(".col-title, .split-col-title, .metric-title, .timeline-step-title, h3, h4, strong");
              const descEl = col.querySelector(".col-desc, .split-col-desc, .metric-desc, .timeline-step-desc, p");
              const hlEl = col.querySelector(".col-highlight-text, .highlight, .pill");
              const statEl = col.querySelector(".metric-val, .stat");

              const cTitle = titleNode ? titleNode.textContent.trim() : `Poin 0${cIdx + 1}`;
              let rawHl = hlEl ? hlEl.textContent.trim() : cTitle.slice(0, 24).toUpperCase();
              if (/"DJ" → JADI|TERWUJUD & SELESAI/i.test(rawHl)) {
                rawHl = cTitle.slice(0, 24).toUpperCase();
              }
              let rawBadge = badgeEl ? badgeEl.textContent.trim() : `POIN 0${cIdx + 1}`;
              if (/ORTOGRAFI|FILOSOFI|DIFERENSIASI/i.test(rawBadge) && !/ortografi|filosofi/i.test(cTitle)) {
                rawBadge = `POIN 0${cIdx + 1} // ANALISIS`;
              }

              return {
                badge: rawBadge,
                title: cTitle,
                desc: descEl ? descEl.textContent.trim() : "",
                stat: statEl ? statEl.textContent.trim() : `0${cIdx + 1}`,
                metricValue: statEl ? statEl.textContent.trim() : `0${cIdx + 1}`,
                footerHighlight: rawHl
              };
            });
          } else {
            const h3s = Array.from(el.querySelectorAll("h3"));
            cards = h3s.map((h, cIdx) => {
              const cTitle = h.textContent.trim();
              const nextP = h.nextElementSibling && h.nextElementSibling.tagName.toLowerCase() === "p" ? h.nextElementSibling.textContent.trim() : "";
              return {
                badge: `POIN 0${cIdx + 1} // ANALISIS`,
                title: cTitle,
                desc: nextP,
                stat: `0${cIdx + 1}`,
                metricValue: `0${cIdx + 1}`,
                footerHighlight: cTitle.slice(0, 24).toUpperCase()
              };
            });
          }

          if (!layout) {
            if (idx === 0) layout = 'cover';
            else if (idx === totalNodes - 1 && totalNodes >= 4) layout = 'conclusion';
            else if (quoteText) layout = 'quote';
            else if (cards.length === 2) layout = 'split';
            else if (cards.length === 4) layout = 'metrics';
            else if (/tahap|langkah|step|alur|proses/i.test(title)) layout = 'timeline';
            else layout = 'bento';
          }

          if (layout === 'split' && cards.length < 2) {
            while (cards.length < 2) {
              const cIdx = cards.length + 1;
              cards.push({ badge: `PILAR 0${cIdx}`, title: `Pilar 0${cIdx}`, desc: '', footerHighlight: `POIN 0${cIdx}` });
            }
          } else if (layout === 'bento' && cards.length < 3) {
            while (cards.length < 3) {
              const cIdx = cards.length + 1;
              cards.push({ badge: `POIN 0${cIdx} // ANALISIS`, title: `Pilar Eksekusi 0${cIdx}`, desc: '', footerHighlight: `OPTIMASI 0${cIdx}` });
            }
          }

          return {
            title,
            subtitle,
            layout,
            rawCanvasHtml,
            quoteText,
            quoteAuthor,
            cards,
            index: idx + 1
          };
        });
      }
    } catch (e) {
      console.warn("DOMParser failed in extractSlidesFromRawHtml:", e);
    }
  }

  // Regex fallback (Node or environments without DOMParser)
  let cleanHtml = html
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<div\b[^>]*class=["']?[^"'>]*deck-sidebar[^"'>]*["']?[^>]*>[\s\S]*?<\/div>/gi)
    .replace(/<nav\b[^>]*class=["']?[^"'>]*deck-floating-dock[^"'>]*["']?[^>]*>[\s\S]*?<\/nav>/gi);

  let rawSections = [];
  const sectionRegex = /<section\b[^>]*>([\s\S]*?)<\/section>/gi;
  let sMatch;
  while ((sMatch = sectionRegex.exec(cleanHtml)) !== null) {
    rawSections.push(sMatch[1]);
  }

  if (rawSections.length === 0) {
    const boundaryRegex = /(?=<div\b[^>]*class=["']?[^"'>]*(?:slide-section|slide\b|deck-slide|presentation-slide)[^"'>]*["']?[^>]*>)/gi;
    const parts = cleanHtml.split(boundaryRegex);
    for (const p of parts) {
      if (/class=["']?[^"'>]*(?:slide-section|slide\b|deck-slide|presentation-slide)/i.test(p)) {
        rawSections.push(p);
      }
    }
  }

  if (rawSections.length === 0) return [];

  const extracted = [];
  const totalSections = rawSections.length;
  for (let i = 0; i < totalSections; i++) {
    const sContent = rawSections[i];
    const titleMatch = sContent.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : `Slide ${i + 1}`;

    let subtitle = "";
    const pLeadMatch = sContent.match(/<p\b[^>]*class=["']?[^"'>]*(?:lead|subtitle|desc)[^"'>]*["']?[^>]*>([\s\S]*?)<\/p>/i);
    if (pLeadMatch) {
      subtitle = pLeadMatch[1].replace(/<[^>]+>/g, "").trim();
    } else {
      const anyP = sContent.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      if (anyP) subtitle = anyP[1].replace(/<[^>]+>/g, "").trim();
    }

    let layout = "";
    if (/slide-layout-cover|layout-cover/i.test(sContent) || i === 0) layout = "cover";
    else if (/slide-layout-split|layout-split|split-grid/i.test(sContent)) layout = "split";
    else if (/slide-layout-metrics|layout-metrics|metrics-grid/i.test(sContent)) layout = "metrics";
    else if (/slide-layout-quote|layout-quote|quote-wrap/i.test(sContent)) layout = "quote";
    else if (/slide-layout-timeline|layout-timeline|timeline-grid/i.test(sContent)) layout = "timeline";
    else if (/slide-layout-conclusion|layout-conclusion|conclusion-grid/i.test(sContent)) layout = "conclusion";

    const cards = [];
    const h3Matches = [...sContent.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<\/section|$)/gi)];
    if (h3Matches.length > 0) {
      h3Matches.forEach((hm, cIdx) => {
        const cTitle = hm[1].replace(/<[^>]+>/g, "").trim();
        const rest = hm[2];
        const pDesc = rest.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
        const desc = pDesc ? pDesc[1].replace(/<[^>]+>/g, "").trim() : "";
        const hlMatch = rest.match(/<(?:span|div)\b[^>]*class=["']?[^"'>]*(?:highlight|pill|tag)[^"'>]*["']?[^>]*>([\s\S]*?)<\/(?:span|div)>/i);
        let hl = hlMatch ? hlMatch[1].replace(/<[^>]+>/g, "").trim() : cTitle;
        if (/"DJ" → JADI|TERWUJUD & SELESAI/i.test(hl)) {
          hl = cTitle.slice(0, 24).toUpperCase();
        }
        cards.push({
          badge: `POIN 0${cIdx + 1} // ANALISIS`,
          title: cTitle,
          desc: desc,
          stat: `0${cIdx + 1}`,
          metricValue: `0${cIdx + 1}`,
          footerHighlight: hl
        });
      });
    }

    if (!layout) {
      if (i === 0) layout = 'cover';
      else if (i === totalSections - 1 && totalSections >= 4) layout = 'conclusion';
      else if (cards.length === 2) layout = 'split';
      else if (cards.length === 4) layout = 'metrics';
      else layout = 'bento';
    }

    extracted.push({
      title,
      subtitle,
      layout,
      cards,
      index: i + 1
    });
  }

  return extracted;
}

function upgradeSlideDeckHtmlIfNeeded(html, userPrompt = "", meta = {}) {
  if (!html || typeof html !== "string") return html;
  
  // Check if existing deck contains legacy Djadi spill when user prompt is NOT about Djadi
  const hasLegacyDjadiSpill = /DJADI CREATIVE|STANDAR IDENTITAS VISUAL RESMI|CONFIDENTIAL \/\/ ENTERPRISE/i.test(html) && !/djadi/i.test(userPrompt);

  // If already has miniature preview, floating dock, delegation, realtime editor toolbar, and no legacy spill, return as-is
  const hasEditor = html.includes("dock-btn-edit") && html.includes("deck-editor-toolbar") && html.includes("initSlideDeckRealtimeEditor");
  if (!hasLegacyDjadiSpill && hasEditor && html.includes("thumb-mini-slide") && html.includes("deck-floating-dock") && html.includes("classList.toggle('active'")) {
    return html;
  }

  // If HTML contains slide elements, upgrade to full executive layout
  const extractedSlides = extractSlidesFromRawHtml(html);
  if (extractedSlides.length >= 1) {
    const rawTitle = meta?.title || (userPrompt || extractedSlides[0]?.title || "Executive Presentation Deck").slice(0, 40);
    const theme = resolveSlideDeckTheme(userPrompt || rawTitle, meta);
    const deckMeta = {
      title: rawTitle,
      brand: rawTitle,
      categoryTitle: rawTitle.toUpperCase(),
      subCategory: theme.subHeader,
      accentColor: meta?.colors?.[2] || theme.accent,
      themeObj: theme,
      userPrompt: userPrompt
    };
    return renderSlideDeckHtml(extractedSlides, deckMeta);
  }

  // Fallback: try parsing markdown/text to interactive slide deck
  const mdConverted = convertMarkdownOrTextToInteractiveSlideDeck(html, userPrompt);
  if (mdConverted) return mdConverted;

  return html;
}


// Global attachments
if (typeof window !== "undefined") {
  window.toRoman = toRoman;
  window.parseMarkdownToSlides = parseMarkdownToSlides;
  window.convertMarkdownOrTextToInteractiveSlideDeck = convertMarkdownOrTextToInteractiveSlideDeck;
  window.extractSlidesFromRawHtml = extractSlidesFromRawHtml;
  window.upgradeSlideDeckHtmlIfNeeded = upgradeSlideDeckHtmlIfNeeded;
}
