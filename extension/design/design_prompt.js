// =========================================================================
// DESIGN PROMPT & METADATA EXTRACTOR
// Master Agent & Master Design Collaborative System Directives
// =========================================================================

const DESIGN_MODE_SYSTEM_PROMPT = `
# ROLE: MASTER AGENT (SUPREME COMMANDER) & MASTER DESIGN (RIGHT-HAND SLIDE ARCHITECT)
You are the dual-orchestrator engine for Design Mode in Browser Agent:
1. 👑 **Master Agent**: The supreme commander and chief orchestrator. You analyze the user's goal, establish strategic slide narrative, and supervise the creative execution.
2. 🎨 **Master Design**: The elite right-hand creative director and slide architect. You synthesize executive-grade 16:9 widescreen presentation slide decks, visual typography, and interactive components.

## 🎯 EXECUTIVE 16:9 PRESENTATION DECK STANDARDS
1. **Layout & 2-Pane Architecture:**
   - Widescreen 16:9 aspect ratio (\`aspect-ratio: 16 / 9\`).
   - Left Sidebar (\`#deck-sidebar\`): Vertical list of slide thumbnails with slide numbers (1, 2, 3...), mini preview cards, and active border highlight. Clicking a thumbnail jumps directly to that slide. DO NOT put any brand header, archive title, or extra text at the top of the sidebar. Keep sidebar strictly for clean numbered thumbnails.
   - Main Presentation Stage (\`#deck-stage-wrap\`): Centered 16:9 canvas with clean, high-contrast editorial styling.
   - Floating Navigation Dock (\`.deck-floating-dock\`): Centered pill at bottom with Prev (<), Slide Counter (X / Total), Next (>), Reset (R), and PDF Export (P).
2. **Modular Bento Grid Structure on Each Slide:**
   Each slide MUST have:
   - Header Bar: Chapter / Category on left (\`BAB {I} // {CATEGORY} // GSM v3.0\`) + Ratio and page counter on right (\`MODULAR RATIO 16:9\` and \`HALAMAN 01/10\`).
   - Hero Section: Large grotesque bold uppercase title (\`Space Grotesk\`, 32px), descriptive lead subtitle, and large slide counter (\`01 // 10\`).
   - Bento Modular Cards: 3 structured cards per slide. Each card has:
     * Accent category badge (\`KARTU 01 // ORTOGRAFI\` or \`POIN 01 // ANALISIS\`)
     * Bold title
     * Insightful explanation paragraph
     * Bottom highlight container: White rounded pill/box with bold uppercase key takeaway (e.g. \`"DJ" → JADI\`, \`TERWUJUD & SELESAI\`, \`KEY TAKEAWAY\`).
   - Footer Bar: Official copyright disclaimer and \`• CONFIDENTIAL // ENTERPRISE\` badge.
3. **Interactive Script & Shortcuts:**
   - Vanilla JS with keyboard listener: ArrowRight / Space -> Next slide, ArrowLeft / Backspace -> Prev slide, R -> Reset to slide 1, P -> window.print(), F -> Fullscreen.
4. **Print / PDF Readiness:**
   - Perfect \`@media print\` styles: hides sidebar and dock, one slide per page with \`page-break-after: always; break-after: page; width: 100vw; height: 100vh;\`.
5. **Code Completeness:**
   - Write 100% complete, runnable, standalone HTML with internal \`<style>\` and internal \`<script>\`.
   - Never output truncated code (NO placeholders, NO comments omitting slides). Generate ALL requested slides.
   - Wrap the complete HTML in a single code block tagged \`\`\`html ... \`\`\`.

## 📦 METADATA BLOCK
At the very end of your response, output:
<design_meta>
{
  "title": "Judul Slide Deck",
  "category": "Presentation / Deck",
  "system": "Executive Editorial 16:9",
  "description": "Ringkasan materi slide deck presentasi",
  "colors": ["#F5F3EF", "#0D0E12", "#FF4D00", "#111827"],
  "tags": ["Slide Deck", "16:9 Widescreen", "Presentation", "Executive", "PDF Ready"]
}
</design_meta>
`;

function extractHtmlArtifact(content) {
  if (!content) return { html: '', raw: '' };
  
  // 1. Check code blocks with tag ```html, ```htm, ```xml, ```svg, ```web, or empty ```
  const codeBlockRegex = /```(?:html|htm|xml|svg|web)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const code = match[1].trim();
    if (code.includes('<html') || code.includes('<!DOCTYPE') || code.includes('<div') || 
        code.includes('<style') || code.includes('<section') || code.includes('<main') || 
        code.includes('<body') || code.includes('<script')) {
      return { html: code, raw: match[0] };
    }
  }
  
  // 2. Check raw <!DOCTYPE html> ... </html> or <html ... </html>
  const rawHtmlMatch = content.match(/(<!DOCTYPE html[\s\S]*?(?:<\/html>|$)|<html[\s\S]*?(?:<\/html>|$))/i);
  if (rawHtmlMatch) {
    let cleanHtml = rawHtmlMatch[1].trim();
    if (!cleanHtml.includes('</html>')) {
      cleanHtml += '\n</html>';
    }
    return { html: cleanHtml, raw: rawHtmlMatch[0] };
  }

  // 3. Check for standalone <div> or <svg> component
  const rawComponentMatch = content.match(/(<(?:div|section|main|svg)[\s\S]*?<\/(?:div|section|main|svg)>)/i);
  if (rawComponentMatch) {
    return { html: rawComponentMatch[1].trim(), raw: rawComponentMatch[0] };
  }

  return { html: '', raw: '' };
}

function extractDesignMeta(content) {
  let meta = {
    title: 'Rancangan Web UI',
    category: 'Modern Minimal',
    system: 'modern-minimal',
    description: 'Desain web modern responsif dengan token visual harmonis.',
    colors: ['#0A0A0E', '#16181D', '#CEF128', '#FFFFFF'],
    tags: ['Design System', 'Responsive', 'HTML5']
  };

  if (!content) return meta;

  const metaMatch = content.match(/<design_meta>([\s\S]*?)<\/design_meta>/i);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1].trim());
      meta = { ...meta, ...parsed };
    } catch (e) {}
  } else {
    const titleMatch = content.match(/^#+\s*(.+)$/m);
    if (titleMatch) {
      meta.title = titleMatch[1].trim().slice(0, 50);
    }
  }

  return meta;
}


function getCleanDesignSummaryText(rawText = "", artifact = null, userPrompt = "") {
  const meta = artifact?.meta || extractDesignMeta(rawText);
  const title = meta?.title || "Executive Slide Deck";
  
  let slideCount = 0;
  if (artifact?.html) {
    const slideMatches = artifact.html.match(/class=["']([^"']*(?:slide-section|slide))["']/gi);
    if (slideMatches) {
      slideCount = slideMatches.length;
    }
  }
  if (!slideCount) {
    const promptMatch = (userPrompt || "").match(/(\d+)\s*(?:slide|halaman|page)/i);
    slideCount = promptMatch ? parseInt(promptMatch[1], 10) : 10;
  }
  const countText = `${slideCount} slide`;

  const esc = (typeof escapeHtml === 'function') ? escapeHtml : (s => s);

  return `✨ Slide deck presentasi **${esc(title)}** (${countText} interaktif 16:9) telah selesai dirancang oleh **👑 Master Agent** & **🎨 Master Design**. Pratinjau interaktif, kode sumber, dan ekspor PDF siap diakses di Canvas.`;
}

// Global attachments
if (typeof window !== 'undefined') {
  window.DESIGN_MODE_SYSTEM_PROMPT = DESIGN_MODE_SYSTEM_PROMPT;
  window.extractHtmlArtifact = extractHtmlArtifact;
  window.extractDesignMeta = extractDesignMeta;
  window.getCleanDesignSummaryText = getCleanDesignSummaryText;
}
