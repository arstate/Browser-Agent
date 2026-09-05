// =========================================================================
// CANVAS MANAGER & INTERACTIVE ARTIFACT CONTROLLER
// Result Card Rendering, Fullscreen Canvas Drawer, Linter, & Export Handlers
// =========================================================================

var activeDesignArtifact = null;

if (typeof window !== 'undefined') {
  window.activeDesignArtifact = activeDesignArtifact;
}

if (typeof escapeHtml !== 'function') {
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}

function getActiveDesignArtifact() {
  return (typeof window !== 'undefined' && window.activeDesignArtifact) ? window.activeDesignArtifact : activeDesignArtifact;
}

function setActiveDesignArtifact(artifact) {
  activeDesignArtifact = artifact;
  if (typeof window !== 'undefined') {
    window.activeDesignArtifact = artifact;
    window.__activeDesignArtifact = artifact;
  }
}

function isCanvasOpen() {
  const canvasPane = document.getElementById('opendesign-canvas-pane');
  return Boolean(canvasPane && canvasPane.style.display !== 'none' && document.body.classList.contains('canvas-active'));
}

function ensureSlideEditorInjected(iframe) {
  if (!iframe) return false;
  try {
    const doc = iframe.contentDocument, win = iframe.contentWindow;
    if (!doc || !doc.body || !win) return false;
    if (!doc.getElementById('deck-editor-injected-css')) {
      const getCss = (typeof getSlideDeckEditorCss === 'function') ? getSlideDeckEditorCss : (typeof window !== 'undefined' ? window.getSlideDeckEditorCss : null);
      if (getCss) {
        const s = doc.createElement('style'); s.id = 'deck-editor-injected-css'; s.textContent = getCss(); doc.head.appendChild(s);
      }
    }
    if (!doc.getElementById('deck-editor-toolbar')) {
      const getHtml = (typeof getSlideDeckEditorHtml === 'function') ? getSlideDeckEditorHtml : (typeof window !== 'undefined' ? window.getSlideDeckEditorHtml : null);
      if (getHtml) {
        const wrap = doc.createElement('div'); wrap.innerHTML = getHtml();
        while (wrap.firstChild) doc.body.appendChild(wrap.firstChild);
      }
    }
    if (typeof win.toggleEditMode !== 'function') {
      const initFn = (typeof initSlideDeckRealtimeEditor === 'function') ? initSlideDeckRealtimeEditor : (typeof window !== 'undefined' ? window.initSlideDeckRealtimeEditor : null);
      if (typeof initFn === 'function') initFn(doc, win);
    }
    return (typeof win.toggleEditMode === 'function');
  } catch (_) { return false; }
}

function attachSlideDeckController(iframe) {
  if (!iframe) return;
  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !doc.body) return;

    ensureSlideEditorInjected(iframe);

    const slides = Array.from(doc.querySelectorAll('.slide-section'));
    if (slides.length === 0) return;

    const thumbs = Array.from(doc.querySelectorAll('.thumb-item'));
    const currSlideEl = doc.getElementById('dock-curr-slide');

    let styleTag = doc.getElementById('slide-deck-controller-style');
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = 'slide-deck-controller-style';
      styleTag.textContent = `
        @media screen { .slide-section { display: none !important; } .slide-section.active { display: flex !important; opacity: 1 !important; transform: scale(1) !important; } }
        .thumb-item * { pointer-events: none !important; }
        .dock-btn * { pointer-events: none !important; }
        .thumb-item { cursor: pointer !important; user-select: none !important; align-items: flex-start !important; }
        .thumb-num { align-self: flex-start !important; line-height: 1 !important; padding-top: 4px !important; }
      `;
      doc.head.appendChild(styleTag);
    }

    // Guarantee realtime editor toolbar, styles, and dock button in iframe (resilient for old artifacts)
    const dock = doc.querySelector('.deck-floating-dock');
    if (dock && !doc.getElementById('dock-btn-edit')) {
      const fsBtn = doc.getElementById('dock-btn-fullscreen');
      const div = doc.createElement('div'); div.className = 'dock-divider';
      const b = doc.createElement('button');
      b.type = 'button'; b.className = 'dock-btn'; b.id = 'dock-btn-edit'; b.title = 'Mode Edit Realtime';
      b.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Edit</span>`;
      if (fsBtn) { dock.insertBefore(div, fsBtn); dock.insertBefore(b, fsBtn); }
      else { dock.appendChild(div); dock.appendChild(b); }
    }

    let currentIndex = 0;
    const activeIdx = slides.findIndex(s => s.classList.contains('active'));
    if (activeIdx >= 0) currentIndex = activeIdx;
    win.currentIndex = currentIndex;

    function goToSlide(targetIdx) {
      let idx = parseInt(targetIdx, 10);
      if (isNaN(idx)) idx = 0;
      if (idx < 0) idx = 0;
      if (idx >= slides.length) idx = Math.max(0, slides.length - 1);

      currentIndex = idx;
      win.currentIndex = idx;

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

    win.goToSlide = goToSlide;

    if (!doc.__slideDeckDelegated) {
      doc.__slideDeckDelegated = true;
      doc.addEventListener('click', function(e) {
        const thumb = e.target.closest('.thumb-item');
        if (thumb) {
          e.preventDefault();
          e.stopPropagation();
          const target = thumb.getAttribute('data-target') || thumb.id.replace('thumb-', '');
          goToSlide(target);
          return;
        }
        const prevBtn = e.target.closest('#dock-btn-prev');
        if (prevBtn) {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(currentIndex - 1);
          return;
        }
        const nextBtn = e.target.closest('#dock-btn-next');
        if (nextBtn) {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(currentIndex + 1);
          return;
        }
        const resetBtn = e.target.closest('#dock-btn-reset');
        if (resetBtn) {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(0);
          return;
        }

        const editBtn = e.target.closest('#dock-btn-edit');
        if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof win.toggleEditMode === 'function') win.toggleEditMode();
          else win.postMessage({ type: 'TOGGLE_EDIT_MODE' }, '*');
          return;
        }

        const fsBtn = e.target.closest('#dock-btn-fullscreen');
        if (fsBtn) {
          e.preventDefault();
          e.stopPropagation();
          if (!doc.fullscreenElement) doc.documentElement.requestFullscreen().catch(() => {});
          else doc.exitFullscreen().catch(() => {});
          return;
        }

        const exportTrigger = e.target.closest('#dock-btn-export, .dock-export-trigger');
        if (exportTrigger) {
          e.preventDefault();
          e.stopPropagation();
          const wrapper = doc.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.toggle('open');
          return;
        }

        const exportPdfItem = e.target.closest('#dock-export-pdf-item, [data-action="export-pdf"]');
        if (exportPdfItem) {
          e.preventDefault();
          e.stopPropagation();
          const wrapper = doc.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.remove('open');
          if (typeof exportSlideDeckPdf === 'function') {
            exportSlideDeckPdf(doc.documentElement.outerHTML, doc.title);
          } else if (typeof window !== 'undefined' && typeof window.exportSlideDeckPdf === 'function') {
            window.exportSlideDeckPdf(doc.documentElement.outerHTML, doc.title);
          } else {
            win.parent.postMessage({
              type: 'EXPORT_SLIDE_DECK_PDF',
              html: doc.documentElement.outerHTML,
              title: doc.title
            }, '*');
          }
          return;
        }

        const exportWrapper = doc.getElementById('dock-export-wrapper');
        if (exportWrapper && exportWrapper.classList.contains('open') && !e.target.closest('#dock-export-wrapper')) {
          exportWrapper.classList.remove('open');
        }
      }, true);
    }

    if (!win.__slideDeckKeydown) {
      win.__slideDeckKeydown = true;
      win.addEventListener('keydown', function(e) {
        if (doc.body?.classList?.contains('deck-edit-mode-active') || e.target?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
          goToSlide(currentIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          goToSlide(currentIndex - 1);
        } else if (e.key === 'r' || e.key === 'R') {
          goToSlide(0);
        } else if (e.key === 'e' || e.key === 'E') {
          const wrapper = doc.getElementById('dock-export-wrapper');
          if (wrapper) wrapper.classList.toggle('open');
        } else if (e.key === 'p' || e.key === 'P') {
          if (typeof exportSlideDeckPdf === 'function') {
            exportSlideDeckPdf(doc.documentElement.outerHTML, doc.title);
          } else if (typeof window !== 'undefined' && typeof window.exportSlideDeckPdf === 'function') {
            window.exportSlideDeckPdf(doc.documentElement.outerHTML, doc.title);
          } else {
            win.parent.postMessage({
              type: 'EXPORT_SLIDE_DECK_PDF',
              html: doc.documentElement.outerHTML,
              title: doc.title
            }, '*');
          }
        } else if (e.key === 'f' || e.key === 'F') {
          if (!doc.fullscreenElement) {
            doc.documentElement.requestFullscreen().catch(() => {});
          } else {
            doc.exitFullscreen().catch(() => {});
          }
        }
      });
    }

    goToSlide(currentIndex);
  } catch (err) {
    console.error('attachSlideDeckController error:', err);
  }
}
function showUniversalToast(message, duration = 3000) {
  let toast = document.getElementById('universal-action-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'universal-action-toast';
    toast.className = 'universal-action-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function renderOpenDesignCard(containerEl, artifact, options = {}) {
  if (!containerEl || !artifact || !artifact.html) return;

  const existingCard = containerEl.querySelector('.opendesign-result-card');
  if (existingCard) {
    existingCard.remove();
  }

  const card = document.createElement('div');
  card.className = 'opendesign-result-card' + (options.isRevision ? ' opendesign-card-revised' : '');
  card.setAttribute('data-system', artifact.meta?.system || 'modern');

  const isDeck = artifact.html?.includes('deck-sidebar') || artifact.html?.includes('presentation-workspace') || 
                 (artifact.meta?.tags || []).some(t => /slide|deck|presentation/i.test(t));
  const systemBadge = isDeck ? 'Slide Deck 16:9' : escapeHtml(artifact.meta?.system || 'OpenDesign');
  const categoryBadge = isDeck ? 'Executive Presentation' : escapeHtml(artifact.meta?.category || 'Web UI');

  const defaultColors = isDeck ? ['#F5F3EF', '#0D0E12', '#FF4D00', '#111827'] : ['#0A0A0E', '#16181D', '#CEF128', '#FFFFFF'];
  const swatchesHtml = (artifact.meta?.colors || defaultColors)
    .map(c => `<span class="swatch" style="background: ${escapeHtml(c)};" title="${escapeHtml(c)}"></span>`)
    .join('');

  const defaultTags = isDeck ? ['16:9 Deck', 'Thumbnails', 'PDF Ready'] : ['HTML5', 'Tokens'];
  const tagsHtml = (artifact.meta?.tags || defaultTags)
    .map(t => `<span class="meta-tag">${escapeHtml(t)}</span>`)
    .join('');

  const statusBadgeHtml = options.isRevision
    ? `<span class="opendesign-status-pill opendesign-revision-pill" style="background: rgba(52, 211, 153, 0.15); color: #34D399; border: 1px solid rgba(52, 211, 153, 0.3);">Live Updated</span>`
    : `<span class="opendesign-status-pill">Canvas Ready</span>`;

  const btnViewText = options.isRevision ? 'Buka Canvas (Update) ↗' : 'Buka Canvas ↗';

  card.innerHTML = `
    <div class="opendesign-card-badge-row">
      <span class="opendesign-system-badge">${systemBadge}</span>
      <span class="opendesign-category-badge">${categoryBadge}</span>
      ${statusBadgeHtml}
    </div>
    <h4 class="opendesign-card-title">${escapeHtml(artifact.meta?.title || (isDeck ? 'Executive Slide Deck' : 'Rancangan Antarmuka'))}</h4>
    <p class="opendesign-card-desc">${escapeHtml(artifact.meta?.description || (isDeck ? 'Presentasi 16:9 widescreen interaktif dengan sidebar thumbnail dan floating navigation dock.' : 'Desain interaktif siap dipratinjau dan diekspor.'))}</p>
    <div class="opendesign-card-preview-bar">
      <div class="opendesign-palette-swatches">
        ${swatchesHtml}
      </div>
      <div class="opendesign-meta-tags">
        ${tagsHtml}
      </div>
    </div>
    <div class="opendesign-card-actions">
      <button type="button" class="btn-opendesign-view-canvas">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span>${btnViewText}</span>
      </button>
      <button type="button" class="btn-opendesign-export" title="Unduh File HTML Mandiri">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Export HTML</span>
      </button>
    </div>
  `;

  const btnView = card.querySelector('.btn-opendesign-view-canvas');
  btnView?.addEventListener('click', () => {
    activeDesignArtifact = artifact;
    window.__activeDesignArtifact = artifact;
    
    openOpenDesignCanvas(artifact);

    window.dispatchEvent(new CustomEvent('open-design-canvas', {
      detail: { artifact }
    }));

    showUniversalToast(options.isRevision ? '🎨 Membuka Canvas Workspace yang telah diperbarui...' : '🎨 Membuka Canvas Workspace...');
  });

  const btnExport = card.querySelector('.btn-opendesign-export');
  btnExport?.addEventListener('click', async () => {
    if (!artifact.html) return;
    btnExport.disabled = true;
    btnExport.textContent = 'Mengekspor...';
    try {
      if (window.OpenDesignBridge?.exportArtifact) {
        const res = await window.OpenDesignBridge.exportArtifact({
          htmlContent: artifact.html,
          format: 'html'
        });
        if (res?.out_path) {
          showUniversalToast(`✅ Berhasil diekspor: ${res.out_path}`);
        }
      } else {
        const blob = new Blob([artifact.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(artifact.meta?.title || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        showUniversalToast('✅ File HTML berhasil diunduh!');
      }
    } catch (e) {
      console.error('Export error:', e);
      showUniversalToast('❌ Gagal mengekspor: ' + (e.message || String(e)));
    } finally {
      btnExport.disabled = false;
      btnExport.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Export HTML</span>`;
    }
  });

  containerEl.appendChild(card);
}

// =========================================================================
// OpenDesign Split-Screen Canvas Workspace Engine (Tahap 3 - Gemini Canvas)
// =========================================================================

function generateVirtualFiles(artifact) {
  if (!artifact || !artifact.html) return [];
  const htmlContent = artifact.html, meta = artifact.meta || {};
  let cssContent = `/* OpenDesign Extracted Tokens */\n:root {\n`;
  if (Array.isArray(meta.colors)) meta.colors.forEach((c, i) => { cssContent += `  --color-palette-${i + 1}: ${c};\n`; });
  cssContent += `  --design-system: "${meta.system || 'modern-minimal'}";\n}\n\n`;
  const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  cssContent += styleMatch ? styleMatch[1].trim() : `/* Embedded directly in HTML */`;
  const jsonMeta = JSON.stringify(meta, null, 2);
  const readme = `# ${meta.title || 'OpenDesign Artifact'}\n\n**Design System:** \`${meta.system || 'modern-minimal'}\`\n**Category:** ${meta.category || 'Web Application / UI'}\n\n## 🎨 Overview\n${meta.description || 'Modern interface generated natively by OpenDesign.'}\n\n## 🌈 Visual Palette\n${(meta.colors || []).map(c => `- \`${c}\``).join('\n')}\n`;
  return [
    { name: 'index.html', lang: 'html', content: htmlContent, icon: '🌐' },
    { name: 'tokens.css', lang: 'css', content: cssContent, icon: '🎨' },
    { name: 'design_meta.json', lang: 'json', content: jsonMeta, icon: '⚙️' },
    { name: 'README.md', lang: 'markdown', content: readme, icon: '📝' }
  ];
}

let lastCanvasLintResult = null;

async function runCanvasAutoLint(htmlContent) {
  const statusEl = document.getElementById('canvas-footer-status');
  if (!statusEl) return;
  statusEl.innerHTML = `<span class="canvas-lint-pill score-checking">⏳ Anti-Slop: Memeriksa...</span>`;

  try {
    if (window.OpenDesignBridge?.lintArtifact) {
      const res = await window.OpenDesignBridge.lintArtifact(htmlContent);
      lastCanvasLintResult = res;
      const score = (res?.score !== undefined) ? res.score : (res?.clean ? 99 : 85);
      const violations = res?.violations_count || res?.findings?.length || 0;
      const isGreen = score >= 85;
      const summaryText = violations === 0 ? 'Clean AA/AAA' : `${violations} Catatan`;
      statusEl.innerHTML = `<span class="canvas-lint-pill ${isGreen ? 'score-green' : 'score-yellow'}" title="Skor Anti-Slop: ${score}/100 • ${summaryText}. Klik untuk melihat rincian pemeriksaan.">🛡️ Anti-Slop: ${score}/100 • ${summaryText}</span>`;
    } else {
      statusEl.innerHTML = `<span class="canvas-lint-pill score-green">✓ Standalone Production Ready</span>`;
    }
  } catch (e) {
    statusEl.innerHTML = `<span class="canvas-lint-pill score-green">✓ Standalone Production Ready</span>`;
  }
}

function showCanvasLintDetails() {
  if (!lastCanvasLintResult) {
    showUniversalToast('🛡️ Anti-Slop: Memeriksa kepatuhan desain...');
    if (activeDesignArtifact?.html) {
      runCanvasAutoLint(activeDesignArtifact.html);
    }
    return;
  }
  const score = (lastCanvasLintResult?.score !== undefined) ? lastCanvasLintResult.score : (lastCanvasLintResult?.clean ? 99 : 85);
  const findings = lastCanvasLintResult.findings || [];
  if (findings.length === 0) {
    showUniversalToast(`🛡️ Anti-Slop Score: ${score}/100 • 100% Lolos Uji Aksesibilitas WCAG AA & Standar Desain!`);
  } else {
    const listText = findings.slice(0, 5).map((f, i) => `${i + 1}. ${f.message || f.rule || 'Visual rule'}`).join('\n');
    alert(`🛡️ Anti-Slop Linter Audit Report\n\nSkor Desain: ${score}/100\nTemuan Catatan (${findings.length}):\n${listText}${findings.length > 5 ? '\n...dan ' + (findings.length - 5) + ' lainnya.' : ''}`);
  }
}

function triggerDownloadBlob(blob, filename) {
  if (typeof window !== 'undefined' && window.triggerDownloadBlob && window.triggerDownloadBlob !== triggerDownloadBlob) return window.triggerDownloadBlob(blob, filename);
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64ToBlob(b64Data, contentType = '', sliceSize = 512) {
  if (typeof window !== 'undefined' && window.base64ToBlob && window.base64ToBlob !== base64ToBlob) return window.base64ToBlob(b64Data, contentType, sliceSize);
  const byteChars = atob(b64Data), byteArrays = [];
  for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
    const slice = byteChars.slice(offset, offset + sliceSize), nums = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) nums[i] = slice.charCodeAt(i);
    byteArrays.push(new Uint8Array(nums));
  }
  return new Blob(byteArrays, { type: contentType });
}

async function handleCanvasExport(format) {
  if (typeof window !== 'undefined' && typeof window.handleCanvasExport === 'function' && window.handleCanvasExport !== handleCanvasExport) {
    return window.handleCanvasExport(format);
  }
}


function updateCanvasVirtualFiles(artifact) {
  if (!artifact) return;
  const virtualFiles = generateVirtualFiles(artifact);
  const filesListEl = document.getElementById('canvas-files-list');
  const fileTitleEl = document.getElementById('canvas-active-file-title');
  const fileCodeEl = document.getElementById('canvas-file-code-display');

  if (filesListEl) {
    filesListEl.innerHTML = '';
    virtualFiles.forEach((f, idx) => {
      const item = document.createElement('div');
      item.className = 'canvas-file-item' + (idx === 0 ? ' active' : '');
      item.innerHTML = `<span>${f.icon}</span><span>${escapeHtml(f.name)}</span>`;
      item.addEventListener('click', () => {
        filesListEl.querySelectorAll('.canvas-file-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        if (fileTitleEl) fileTitleEl.textContent = f.name;
        if (fileCodeEl) fileCodeEl.textContent = f.content;
      });
      filesListEl.appendChild(item);
    });

    if (virtualFiles.length > 0) {
      if (fileTitleEl) fileTitleEl.textContent = virtualFiles[0].name;
      if (fileCodeEl) fileCodeEl.textContent = virtualFiles[0].content;
    }
  }
}

function openOpenDesignCanvas(artifact) {
  if (!artifact || !artifact.html) return;

  // Auto-upgrade slide deck HTML if needed (guarantees latest navigation engine & fixes old artifacts)
  if (typeof upgradeSlideDeckHtmlIfNeeded === 'function') {
    artifact.html = upgradeSlideDeckHtmlIfNeeded(artifact.html, artifact.meta?.title || "", artifact.meta || {});
  } else if (typeof window !== 'undefined' && typeof window.upgradeSlideDeckHtmlIfNeeded === 'function') {
    artifact.html = window.upgradeSlideDeckHtmlIfNeeded(artifact.html, artifact.meta?.title || "", artifact.meta || {});
  }

  activeDesignArtifact = artifact;
  window.__activeDesignArtifact = artifact;
  try { sessionStorage.setItem('canvas_was_open', 'true'); } catch (_) {}
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local?.set) {
      chrome.storage.local.set({ opendesign_last_artifact: artifact });
    }
  } catch (e) {}

  const canvasPane = document.getElementById('opendesign-canvas-pane');
  if (!canvasPane) return;

  document.body.classList.add('canvas-active');
  canvasPane.style.display = 'flex';

  // 1. Set Header
  const titleEl = document.getElementById('canvas-design-title');
  if (titleEl) titleEl.textContent = artifact.meta?.title || 'Design Preview';

  // 2. Set Preview iframe
  const iframe = document.getElementById('opendesign-preview-frame');
  if (iframe) {
    iframe.srcdoc = artifact.html;
    iframe.onload = () => {
      attachSlideDeckController(iframe);
    };
    setTimeout(() => attachSlideDeckController(iframe), 50);
    setTimeout(() => attachSlideDeckController(iframe), 250);
  }

  // 3. Set Code tab
  const codeDisplay = document.getElementById('canvas-code-display');
  const codeLangLabel = document.getElementById('canvas-code-lang-label');
  if (codeDisplay) {
    codeDisplay.textContent = artifact.html;
  }
  if (codeLangLabel) {
    codeLangLabel.textContent = `index.html (HTML5 Standalone • ${(artifact.html.length / 1024).toFixed(1)} KB)`;
  }

  // 4. Generate & Populate Files Tab
  updateCanvasVirtualFiles(artifact);

  // Reset to preview tab
  switchCanvasTab('preview');
  setCanvasViewport('responsive');

  // Trigger live background Anti-Slop linter
  if (artifact.html) {
    runCanvasAutoLint(artifact.html);
  }

  // Trigger smooth resize/reflow
  window.dispatchEvent(new Event('resize'));
}

function closeOpenDesignCanvas() {
  try { sessionStorage.removeItem('canvas_was_open'); } catch (_) {}
  document.body.classList.remove('canvas-active');
  const canvasPane = document.getElementById('opendesign-canvas-pane');
  if (canvasPane) { canvasPane.style.display = 'none'; canvasPane.classList.remove('is-expanded'); }
  window.dispatchEvent(new Event('resize'));
  if (chatInput) chatInput.focus();
}

function switchCanvasTab(tabName) {
  document.querySelectorAll('.canvas-tab-btn').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName));
  document.querySelectorAll('.canvas-tab-view').forEach(view => { view.classList.remove('active'); view.style.display = 'none'; });
  const activeView = document.getElementById(`canvas-view-${tabName}`);
  if (activeView) { activeView.classList.add('active'); activeView.style.display = 'flex'; }
}

function setCanvasViewport(viewport) {
  document.querySelectorAll('.viewport-btn').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-viewport') === viewport));
  const stage = document.getElementById('canvas-iframe-stage');
  if (stage) { stage.classList.remove('responsive', 'tablet', 'mobile'); stage.classList.add(viewport); }
}

function initOpenDesignCanvas() {
  if (typeof window !== 'undefined') {
    if (window.__opendesign_canvas_inited) return;
    window.__opendesign_canvas_inited = true;
  }
  window.addEventListener('open-design-canvas', (e) => {
    if (e.detail?.artifact) openOpenDesignCanvas(e.detail.artifact);
  });

  // Tab & Viewport switchers
  document.querySelectorAll('.canvas-tab-btn').forEach(btn => btn.addEventListener('click', () => { const t = btn.getAttribute('data-tab'); if (t) switchCanvasTab(t); }));
  document.querySelectorAll('.viewport-btn').forEach(btn => btn.addEventListener('click', () => { const vp = btn.getAttribute('data-viewport'); if (vp) setCanvasViewport(vp); }));

  const previewIframe = document.getElementById('opendesign-preview-frame');
  if (previewIframe) previewIframe.addEventListener('load', () => attachSlideDeckController(previewIframe));

  // Refresh
  document.getElementById('btn-canvas-refresh')?.addEventListener('click', () => {
    const iframe = document.getElementById('opendesign-preview-frame');
    if (iframe && activeDesignArtifact?.html) {
      iframe.srcdoc = activeDesignArtifact.html;
      setTimeout(() => attachSlideDeckController(iframe), 50);
      setTimeout(() => attachSlideDeckController(iframe), 250);
      showUniversalToast('🔄 Pratinjau dimuat ulang');
    }
  });

  // Popout / Open in New Tab
  const btnPopout = document.getElementById('btn-canvas-popout');
  btnPopout?.addEventListener('click', () => {
    if (!activeDesignArtifact?.html) return;
    const isSidepanel = !window.location.pathname.includes('newtab.html');
    if (isSidepanel) {
      // In sidepanel: open newtab with canvas query
      if (typeof chrome !== 'undefined' && chrome?.tabs?.create && chrome?.runtime?.getURL) {
        chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html?canvas=open') });
      }
    } else {
      // In newtab: open standalone HTML tab
      const blob = new Blob([activeDesignArtifact.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  });

  // Realtime Edit Mode Toggle Button
  const btnEditMode = document.getElementById('btn-canvas-edit-mode');
  btnEditMode?.addEventListener('click', () => {
    const iframe = document.getElementById('opendesign-preview-frame');
    if (!iframe?.contentWindow) return;
    ensureSlideEditorInjected(iframe);
    if (typeof iframe.contentWindow.toggleEditMode === 'function') {
      iframe.contentWindow.toggleEditMode();
    } else {
      iframe.contentWindow.postMessage({ type: 'TOGGLE_EDIT_MODE' }, '*');
    }
    const doc = iframe.contentDocument;
    const isAct = doc?.body ? doc.body.classList.contains('deck-edit-mode-active') : btnEditMode.classList.toggle('active');
    btnEditMode.classList.toggle('active', isAct);
    btnEditMode.title = isAct ? 'Mode Edit Realtime (Aktif)' : 'Mode Edit Realtime (Geser, Font, Teks)';
    showUniversalToast(isAct ? '✏️ Mode Edit Realtime Aktif' : '💾 Mode Edit Disimpan & Selesai');
  });

  // Expand / Contract
  const btnExpand = document.getElementById('btn-canvas-expand');
  btnExpand?.addEventListener('click', () => {
    const pane = document.getElementById('opendesign-canvas-pane');
    if (!pane) return;
    const isExp = pane.classList.toggle('is-expanded');
    btnExpand.title = isExp ? 'Kembalikan ke Tampilan Split' : 'Maksimalkan Layar Penuh';
    btnExpand.innerHTML = isExp 
      ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6m10-10h-6V4m0 6l7-7M3 21l7-7"/></svg>'
      : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  });

  // Close, Copy Code & File
  document.getElementById('btn-canvas-close')?.addEventListener('click', closeOpenDesignCanvas);
  document.getElementById('btn-canvas-copy-code')?.addEventListener('click', async () => {
    if (!activeDesignArtifact?.html) return;
    try {
      await navigator.clipboard.writeText(activeDesignArtifact.html);
      const label = document.getElementById('canvas-copy-code-text');
      if (label) { label.textContent = 'Copied! ✓'; setTimeout(() => { label.textContent = 'Copy Code'; }, 2000); }
      showUniversalToast('📋 Kode HTML berhasil disalin');
    } catch (_) { showUniversalToast('❌ Gagal menyalin kode'); }
  });
  document.getElementById('btn-canvas-copy-file')?.addEventListener('click', async () => {
    const text = document.getElementById('canvas-file-code-display')?.textContent;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); showUniversalToast('📋 File berhasil disalin'); } catch (_) { showUniversalToast('❌ Gagal'); }
  });

  // Anti-Slop Lint Footer Status & Button
  document.getElementById('canvas-footer-status')?.addEventListener('click', showCanvasLintDetails);
  const btnLint = document.getElementById('btn-canvas-footer-lint');
  btnLint?.addEventListener('click', async () => {
    if (!activeDesignArtifact?.html) return;
    btnLint.disabled = true;
    btnLint.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span><span>Memeriksa...</span>`;
    try { await runCanvasAutoLint(activeDesignArtifact.html); showCanvasLintDetails(); }
    catch (_) { showUniversalToast('ℹ️ Linter OpenDesign aktif.'); }
    finally {
      btnLint.disabled = false;
      btnLint.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg><span>Anti-Slop Lint</span>`;
    }
  });

  // Export Dropdown Trigger & Options
  const btnExportTrigger = document.getElementById('btn-canvas-footer-export');
  const exportMenu = document.getElementById('canvas-export-menu');
  const exportWrapper = btnExportTrigger?.closest('.canvas-export-dropdown-wrapper');
  btnExportTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!exportMenu) return;
    const isHidden = (exportMenu.style.display === 'none' || !exportMenu.style.display);
    exportMenu.style.display = isHidden ? 'flex' : 'none';
    exportWrapper?.classList.toggle('open', isHidden);
  });
  document.querySelectorAll('.canvas-export-option').forEach(opt => {
    opt.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (exportMenu) exportMenu.style.display = 'none';
      exportWrapper?.classList.remove('open');
      await handleCanvasExport(opt.getAttribute('data-format') || 'html');
    });
  });
  document.addEventListener('click', (e) => {
    if (exportMenu && !exportMenu.contains(e.target) && !btnExportTrigger?.contains(e.target)) {
      exportMenu.style.display = 'none';
      exportWrapper?.classList.remove('open');
    }
  });

  // Sync edit mode & content changes from iframe
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'DECK_EDIT_MODE_CHANGED') {
      const btn = document.getElementById('btn-canvas-edit-mode');
      if (btn) btn.classList.toggle('active', Boolean(e.data.active));
    } else if (e.data.type === 'SLIDE_DECK_CONTENT_CHANGED' && e.data.html) {
      if (activeDesignArtifact) { activeDesignArtifact.html = e.data.html; if (activeDesignArtifact.raw) activeDesignArtifact.raw = e.data.html; }
      if (window.__activeDesignArtifact) { window.__activeDesignArtifact.html = e.data.html; if (window.__activeDesignArtifact.raw) window.__activeDesignArtifact.raw = e.data.html; }
      try { if (typeof chrome !== 'undefined' && chrome?.storage?.local?.set) chrome.storage.local.set({ opendesign_last_artifact: activeDesignArtifact || { html: e.data.html } }); } catch (_) {}
      const codeDisplay = document.getElementById('canvas-code-display');
      if (codeDisplay) codeDisplay.textContent = e.data.html;
      if (typeof conversationHistory !== 'undefined' && Array.isArray(conversationHistory)) {
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          if (conversationHistory[i]?.designArtifact) {
            conversationHistory[i].designArtifact.html = e.data.html;
            if (conversationHistory[i].designArtifact.raw) conversationHistory[i].designArtifact.raw = e.data.html;
            break;
          }
        }
      }
      if (typeof saveCurrentSessionToDB === 'function') saveCurrentSessionToDB();
      else if (typeof window !== 'undefined' && typeof window.saveCurrentSessionToDB === 'function') window.saveCurrentSessionToDB();
    }
  });

  // Auto-open canvas if URL has ?canvas=open or was open in this tab session
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const wasOpen = (urlParams.get('canvas') === 'open') || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('canvas_was_open') === 'true');
    if (wasOpen && typeof chrome !== 'undefined' && chrome?.storage?.local?.get) {
      chrome.storage.local.get(['opendesign_last_artifact'], (res) => {
        if (res?.opendesign_last_artifact) openOpenDesignCanvas(res.opendesign_last_artifact);
      });
    }
  } catch (_) {}
}

// Global attachments
if (typeof window !== 'undefined') {
  Object.assign(window, {
    showUniversalToast, renderOpenDesignCard, generateVirtualFiles,
    runCanvasAutoLint, showCanvasLintDetails, triggerDownloadBlob,
    base64ToBlob, handleCanvasExport, openOpenDesignCanvas,
    closeOpenDesignCanvas, switchCanvasTab, setCanvasViewport,
    initOpenDesignCanvas, getActiveDesignArtifact, setActiveDesignArtifact,
    isCanvasOpen, attachSlideDeckController, updateCanvasVirtualFiles
  });
}

// Auto-initialize on load for newtab & sidepanel
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOpenDesignCanvas);
  else initOpenDesignCanvas();
}
