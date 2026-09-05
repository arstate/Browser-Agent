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

function isSchemaOrMetaLine(str) {
  if (!str) return false;
  const clean = str.replace(/^[-*•\d.\s]+/, "").replace(/[*_~`#]/g, "").trim().toLowerCase();
  if (/^(?:\d+\s+)?(?:stat\s*cards?|summary\s*cards?|balanced\s*summary(?:\s*cards?)?|balanced\s*cards?|grid\s*cards?|pilar\s*cards?|cards?)\b/i.test(clean)) return true;
  if (/^(?:page\s*number|slide\s*number|nomor\s*slide|halaman|page|slide)\s*[:=-]/i.test(clean)) return true;
  if (/^(?:badge|kategori|tag|title|judul|subjudul|subtitle|layout|tipe)\s*[:=-]/i.test(clean)) return true;
  return false;
}

function isPlaceholderCard(cardTitle, cardDesc) {
  const t = (cardTitle || "").replace(/[*_~`]/g, "").trim().toLowerCase();
  const d = (cardDesc || "").replace(/[*_~`]/g, "").trim().toLowerCase();
  if (/^(?:\d+\s+)?(?:stat\s*cards?|summary\s*cards?|balanced\s*summary(?:\s*cards?)?|page\s*number|slide\s*number|badge|title|subtitle|subjudul|judul)$/i.test(t)) return true;
  if (/^(?:\d+\s+)?(?:stat\s*cards?|summary\s*cards?|balanced\s*summary(?:\s*cards?)?)$/i.test(d)) return true;
  if (/^page\s*number\s*\d+$/i.test(d)) return true;
  if (t === d && /cards?|summary|badge|page/i.test(t)) return true;
  return false;
}

    let slideBadge = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.replace(/^[-*•\d.\s]+/, "").replace(/[*_~`]/g, "").trim();
      const lower = cleanLine.toLowerCase();

      // Check header / metadata markers
      if (lower.startsWith("badge:") || lower.startsWith("kategori:") || lower.startsWith("tag:")) {
        slideBadge = cleanLine.replace(/^(?:badge|kategori|tag)[:\s-]*/i, "").trim();
        continue;
      }
      if (lower.startsWith("title:") || lower.startsWith("judul:")) {
        const extTitle = cleanLine.replace(/^(?:title|judul)[:\s-]*/i, "").trim();
        if (extTitle && (!title || title.startsWith("Slide "))) title = extTitle;
        continue;
      }
      if (lower.startsWith("subtitle:") || lower.startsWith("subjudul:")) {
        subtitle = cleanLine.replace(/^(?:subtitle|subjudul)[:\s-]*/i, "").trim();
        continue;
      }
      if (lower.startsWith("layout:") || lower.startsWith("tipe:")) {
        explicitLayout = cleanLine.replace(/^(?:layout|tipe)[:\s-]*/i, "").trim().toLowerCase();
        continue;
      }
      if (/^(?:page\s*number|slide\s*number|nomor\s*slide|halaman)\s*[:=-]/i.test(lower)) {
        continue;
      }
      if (isSchemaOrMetaLine(cleanLine)) {
        continue;
      }

      if (i === 0 && (line.startsWith("#") || /^slide\s+\d+/i.test(line))) {
        title = line.replace(/^#+\s*/, "").replace(/^slide\s+\d+[:\s-]*/i, "").trim() || title;
      } else if (line.startsWith(">") || line.startsWith("“") || line.startsWith('"')) {
        quoteText = line.replace(/^[>“"'\s]+|[”"'\s]+$/g, "").trim();
      } else if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•") || /^\d+\./.test(line)) {
        const itemText = line.replace(/^[-*•\d.]+\s*/, "").trim();
        const colonIdx = itemText.indexOf(":");
        if (colonIdx > 0 && colonIdx < 40) {
          const rawTitle = itemText.slice(0, colonIdx).replace(/\*\*/g, "").trim();
          const rawDesc = itemText.slice(colonIdx + 1).trim();
          if (isPlaceholderCard(rawTitle, rawDesc)) continue;

          if (/^(?:badge|kategori|tag)$/i.test(rawTitle)) {
            slideBadge = rawDesc.replace(/^(?:badge|kategori|tag)[:\s-]*/i, "").trim();
            continue;
          }
          if (/^(?:title|judul)$/i.test(rawTitle)) {
            if (!title || title.startsWith("Slide ")) title = rawDesc;
            continue;
          }
          if (/^(?:subtitle|subjudul)$/i.test(rawTitle)) {
            if (!subtitle) subtitle = rawDesc;
            continue;
          }

          const cardTitle = rawTitle.replace(/^(?:badge|title|subtitle|point|poin)\s+/i, "").trim() || rawTitle;
          const cardDesc = rawDesc.replace(/^(?:badge|title|subtitle)\s+/i, "").trim() || rawDesc;
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
          if (isSchemaOrMetaLine(itemText)) continue;
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
        if (isSchemaOrMetaLine(line)) continue;
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
      badge: slideBadge || "",
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
              const cDesc = descEl ? descEl.textContent.trim() : "";
              if (isPlaceholderCard(cTitle, cDesc)) return null;

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
                desc: cDesc,
                stat: statEl ? statEl.textContent.trim() : `0${cIdx + 1}`,
                metricValue: statEl ? statEl.textContent.trim() : `0${cIdx + 1}`,
                footerHighlight: rawHl
              };
            }).filter(Boolean);
          } else {
            const h3s = Array.from(el.querySelectorAll("h3"));
            cards = h3s.map((h, cIdx) => {
              const cTitle = h.textContent.trim();
              const nextP = h.nextElementSibling && h.nextElementSibling.tagName.toLowerCase() === "p" ? h.nextElementSibling.textContent.trim() : "";
              if (isPlaceholderCard(cTitle, nextP)) return null;
              return {
                badge: `POIN 0${cIdx + 1} // ANALISIS`,
                title: cTitle,
                desc: nextP,
                stat: `0${cIdx + 1}`,
                metricValue: `0${cIdx + 1}`,
                footerHighlight: cTitle.slice(0, 24).toUpperCase()
              };
            }).filter(Boolean);
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

  // If already a complete slide deck with floating dock/editor/stage, NEVER overwrite manual edits; return as-is
  const isCompleteDeck = (html.includes("deck-floating-dock") || html.includes("dock-btn-edit") || html.includes("deck-editor-toolbar")) && (html.includes("slide-section") || html.includes("slide-stage-wrap"));
  if (!hasLegacyDjadiSpill && isCompleteDeck) {
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


function getSlideDeckRuntimeScript() {
  return `
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

        for (let i = 0; i < slides.length; i++) slides[i].classList.toggle('active', i === idx);
        for (let i = 0; i < thumbs.length; i++) {
          const isActive = (i === idx);
          thumbs[i].classList.toggle('active', isActive);
          if (isActive) {
            try { thumbs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
          }
        }
        if (currSlideEl) currSlideEl.textContent = String(idx + 1);
      }
      window.goToSlide = goToSlide;

      document.addEventListener('click', function(e) {
        const thumb = e.target.closest('.thumb-item');
        if (thumb) {
          e.preventDefault();
          goToSlide(thumb.getAttribute('data-target') || thumb.id.replace('thumb-', ''));
          return;
        }
        if (e.target.closest('#dock-btn-prev')) { e.preventDefault(); goToSlide(currentIndex - 1); return; }
        if (e.target.closest('#dock-btn-next')) { e.preventDefault(); goToSlide(currentIndex + 1); return; }
        if (e.target.closest('#dock-btn-reset')) { e.preventDefault(); goToSlide(0); return; }
        if (e.target.closest('#dock-btn-fullscreen')) {
          e.preventDefault();
          if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
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
          window.parent.postMessage({ type: 'EXPORT_SLIDE_DECK_PDF', html: document.documentElement.outerHTML, title: document.title || 'Slide Deck' }, '*');
          return;
        }
        const exportWrapper = document.getElementById('dock-export-wrapper');
        if (exportWrapper && exportWrapper.classList.contains('open') && !e.target.closest('#dock-export-wrapper')) {
          exportWrapper.classList.remove('open');
        }
      });

      window.addEventListener('keydown', (e) => {
        if (document.body?.classList?.contains('deck-edit-mode-active') || e.target?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') goToSlide(currentIndex + 1);
        else if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
        else if (e.key === 'r' || e.key === 'R') goToSlide(0);
        else if (e.key === 'e' || e.key === 'E') {
          const wrapper = document.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.toggle('open');
        } else if (e.key === 'p' || e.key === 'P') {
          window.parent.postMessage({ type: 'EXPORT_SLIDE_DECK_PDF', html: document.documentElement.outerHTML, title: document.title || 'Slide Deck' }, '*');
        } else if (e.key === 'f' || e.key === 'F') {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
        }
      });

      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'GO_TO_SLIDE') goToSlide(e.data.index);
      });
    })();
  `;
}

function replaceImagePlaceholdersInHtml(html, userImages = []) {
  if (!html || typeof html !== 'string') return html;
  let res = html;
  if (Array.isArray(userImages) && userImages.length > 0) {
    userImages.forEach((img, idx) => {
      const ph = `__USER_IMG_${idx}__`;
      const url = img.dataUrl || img.thumbnailUrl || '';
      if (url) res = res.split(ph).join(url);
    });
  }
  return res;
}

function injectImagesIntoSlideDeckHtml(html, userImages = []) {
  if (!html || typeof html !== 'string' || !Array.isArray(userImages) || userImages.length === 0) return html;
  let res = replaceImagePlaceholdersInHtml(html, userImages);
  if (userImages.some(img => img.dataUrl && res.includes(img.dataUrl.slice(0, 40)))) return res;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(res, 'text/html');
    const activeSlide = doc.querySelector('.slide-section.active') || doc.querySelectorAll('.slide-section')[1] || doc.querySelector('.slide-section');
    if (activeSlide) {
      const cards = Array.from(activeSlide.querySelectorAll('.split-col, .slide-col, .metric-card, .conclusion-card, .timeline-step'));
      if (cards.length > 0) {
        userImages.forEach((img, idx) => {
          const card = cards[idx % cards.length];
          if (card && !card.querySelector('.card-image-wrap')) {
            const wrap = doc.createElement('div');
            wrap.className = 'card-image-wrap';
            wrap.innerHTML = `<img class="card-image" src="${img.dataUrl}" alt="${escapeHtml(img.name || 'Foto')}">`;
            card.insertBefore(wrap, card.firstChild);
          }
        });
      } else {
        const canvas = activeSlide.querySelector('.slide-canvas');
        if (canvas) {
          const gallery = doc.createElement('div');
          gallery.className = 'slide-image-gallery';
          gallery.style.cssText = 'display:flex;gap:14px;margin:16px 0;width:100%;height:180px;justify-content:center;';
          gallery.innerHTML = userImages.map(img => `
            <div class="card-image-wrap" style="flex:1;height:100%;margin-bottom:0;">
              <img class="card-image" src="${img.dataUrl}" alt="${escapeHtml(img.name || 'Foto')}">
            </div>
          `).join('');
          const footer = canvas.querySelector('.slide-footer-bar');
          if (footer) canvas.insertBefore(gallery, footer);
          else canvas.appendChild(gallery);
        }
      }
      return doc.documentElement.outerHTML;
    }
  } catch (e) {
    console.warn('[OpenDesign] injectImagesIntoSlideDeckHtml error:', e);
  }
  return res;
}

// Global attachments
if (typeof window !== "undefined") {
  window.toRoman = toRoman;
  window.parseMarkdownToSlides = parseMarkdownToSlides;
  window.convertMarkdownOrTextToInteractiveSlideDeck = convertMarkdownOrTextToInteractiveSlideDeck;
  window.extractSlidesFromRawHtml = extractSlidesFromRawHtml;
  window.upgradeSlideDeckHtmlIfNeeded = upgradeSlideDeckHtmlIfNeeded;
  window.getSlideDeckRuntimeScript = getSlideDeckRuntimeScript;
  window.replaceImagePlaceholdersInHtml = replaceImagePlaceholdersInHtml;
  window.injectImagesIntoSlideDeckHtml = injectImagesIntoSlideDeckHtml;
}
