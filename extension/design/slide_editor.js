// =========================================================================
// SLIDE DECK REALTIME VISUAL & TEXT EDITOR ENGINE
// In-place Moving, Multi-Selection, Scale, Rotation, Fonts & Text Styling
// =========================================================================

function getSlideDeckEditorCss() {
  return `
    /* Realtime Editor Mode Styles */
    body.deck-edit-mode-active .slide-stage-wrap,
    body.deck-edit-mode-active .deck-stage-wrap {
      user-select: none;
    }
    body.deck-edit-mode-active .slide-section.active .slide-canvas {
      position: relative;
    }
    body.deck-edit-mode-active .slide-section.active .slide-canvas [data-deck-editable="true"],
    body.deck-edit-mode-active .slide-section.active .slide-canvas h1,
    body.deck-edit-mode-active .slide-section.active .slide-canvas h2,
    body.deck-edit-mode-active .slide-section.active .slide-canvas h3,
    body.deck-edit-mode-active .slide-section.active .slide-canvas p,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .slide-col,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .split-col,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .metric-card,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .timeline-step,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .col-tag-chip,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .col-badge,
    body.deck-edit-mode-active .slide-section.active .slide-canvas .cover-badge-pill {
      cursor: move !important;
      transition: outline 0.12s, box-shadow 0.12s;
    }
    body.deck-edit-mode-active .slide-section.active .slide-canvas [contenteditable="true"] {
      cursor: text !important;
      user-select: text !important;
    }
    body.deck-edit-mode-active .slide-section.active .slide-canvas *:hover {
      outline: 1.5px dashed rgba(99, 102, 241, 0.45);
      outline-offset: 3px;
    }
    .deck-editable-selected {
      outline: 2px solid var(--accent, #6366F1) !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 14px rgba(99, 102, 241, 0.35) !important;
      position: relative;
    }
    .deck-editable-selected::after {
      content: '';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 10px;
      height: 10px;
      background: var(--accent, #6366F1);
      border: 1.5px solid #FFFFFF;
      border-radius: 50%;
      pointer-events: none;
    }

    /* Floating Realtime Editor Toolbar */
    .deck-editor-toolbar {
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%) translateY(-70px);
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 17, 23, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 9999px;
      padding: 6px 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(99, 102, 241, 0.25);
      backdrop-filter: blur(24px);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      max-width: 95vw;
      overflow-x: auto;
    }
    body.deck-edit-mode-active .deck-editor-toolbar {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .editor-tool-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .editor-tool-divider {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.14);
      margin: 0 2px;
      flex-shrink: 0;
    }
    .editor-tool-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #F1F5F9;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 28px;
      min-width: 28px;
      transition: all 0.15s;
    }
    .editor-tool-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #FFFFFF;
      border-color: rgba(255, 255, 255, 0.24);
    }
    .editor-tool-btn.active {
      background: var(--accent, #6366F1);
      color: #FFFFFF;
      border-color: var(--accent, #6366F1);
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
    }
    .editor-tool-select {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #F8FAFC;
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 11.5px;
      font-weight: 600;
      height: 28px;
      cursor: pointer;
      outline: none;
    }
    .editor-tool-select option {
      background: #111827;
      color: #F8FAFC;
    }
    .editor-color-swatch {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: transform 0.12s, border-color 0.12s;
    }
    .editor-color-swatch:hover {
      transform: scale(1.2);
      border-color: #FFFFFF;
    }
    .editor-badge-status {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 3px 8px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid var(--accent, #6366F1);
      border-radius: 9999px;
      color: var(--accent, #6366F1);
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .editor-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 6px #10B981;
    }
    .editor-btn-save {
      background: #10B981 !important;
      color: #FFFFFF !important;
      border-color: #10B981 !important;
      font-weight: 700 !important;
      padding: 4px 12px !important;
    }
    .editor-btn-save:hover {
      background: #059669 !important;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4) !important;
    }
    #dock-btn-edit.active {
      background: var(--accent, #6366F1);
      color: #FFFFFF;
      box-shadow: 0 0 12px var(--accent, #6366F1);
    }
    .editor-tool-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: none;
    }
    .editor-btn-danger:hover {
      background: rgba(239, 68, 68, 0.2) !important;
      border-color: rgba(239, 68, 68, 0.5) !important;
      color: #F87171 !important;
    }
  `;
}

function getSlideDeckEditorHtml() {
  return `
    <nav class="deck-editor-toolbar" id="deck-editor-toolbar" aria-label="Toolbar Mode Edit Realtime">
      <div class="editor-tool-group">
        <span class="editor-badge-status">
          <span class="editor-pulse-dot"></span>
          <span>Edit Mode</span>
        </span>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Undo / Redo -->
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-undo" title="Undo (Ctrl+Z)" disabled>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button type="button" class="editor-tool-btn" id="editor-btn-redo" title="Redo (Ctrl+Y)" disabled>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
        </button>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Font Selector -->
      <div class="editor-tool-group">
        <select class="editor-tool-select" id="editor-font-family" title="Ganti Font Teks">
          <option value="">Font: Asli</option>
          <option value="'Inter', sans-serif">Inter</option>
          <option value="'Outfit', sans-serif">Outfit</option>
          <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta</option>
          <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
          <option value="'Syne', sans-serif">Syne</option>
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="Georgia, serif">Editorial Serif</option>
        </select>
      </div>

      <!-- Font Size & Formatting -->
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-size-down" title="Kecilkan Ukuran Teks">A-</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-size-up" title="Besarkan Ukuran Teks">A+</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-bold" title="Tebal (Bold / B)"><b>B</b></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-italic" title="Miring (Italic / I)"><i>I</i></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-underline" title="Garis Bawah (Underline / U)"><u>U</u></button>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Text Alignment -->
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-align-left" title="Rata Kiri">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
        </button>
        <button type="button" class="editor-tool-btn" id="editor-btn-align-center" title="Rata Tengah">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
        </button>
        <button type="button" class="editor-tool-btn" id="editor-btn-align-right" title="Rata Kanan">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
        </button>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Color Swatches -->
      <div class="editor-tool-group" title="Warna Teks">
        <span class="editor-color-swatch" data-color="#FFFFFF" style="background: #FFFFFF;"></span>
        <span class="editor-color-swatch" data-color="var(--accent)" style="background: var(--accent, #6366F1);"></span>
        <span class="editor-color-swatch" data-color="#38BDF8" style="background: #38BDF8;"></span>
        <span class="editor-color-swatch" data-color="#F59E0B" style="background: #F59E0B;"></span>
        <span class="editor-color-swatch" data-color="#F43F5E" style="background: #F43F5E;"></span>
        <span class="editor-color-swatch" data-color="#94A3B8" style="background: #94A3B8;"></span>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Scale & Rotation -->
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-scale-down" title="Perkecil Skala (Scale -)">-10%</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-scale-up" title="Perbesar Skala (Scale +)">+10%</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-rot-left" title="Putar Balik Arah Jarum Jam (↺ -15°)">↺</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-rot-right" title="Putar Searah Jarum Jam (↻ +15°)">↻</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-reset-transform" title="Atur Ulang Posisi & Skala Elemen">Reset</button>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Duplicate & Delete -->
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-duplicate" title="Duplikat Elemen Terpilih (Ctrl+D)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Duplikat</span>
        </button>
        <button type="button" class="editor-tool-btn editor-btn-danger" id="editor-btn-delete" title="Hapus Elemen Terpilih (Del / Backspace)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Hapus</span>
        </button>
      </div>

      <div class="editor-tool-divider"></div>

      <!-- Selection & Done Actions -->
      <div class="editor-tool-group">
        <span id="editor-selection-counter" style="font-size: 11px; opacity: 0.8; padding: 0 4px;">Pilih elemen</span>
        <button type="button" class="editor-tool-btn editor-btn-save" id="editor-btn-done" title="Simpan Perubahan & Selesai">Simpan</button>
      </div>
    </nav>
  `;
}

function getSlideDeckEditorScript() {
  return `
    (function initSlideDeckRealtimeEditor() {
      let isEditMode = false;
      let selectedElements = new Set();
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialTransforms = new Map();
      let historyStack = [];
      let futureStack = [];
      const MAX_HISTORY = 30;

      function getSlidesState() {
        return Array.from(document.querySelectorAll('.slide-section')).map(s => s.innerHTML);
      }

      function restoreSlidesState(state) {
        if (!Array.isArray(state)) return;
        const slides = Array.from(document.querySelectorAll('.slide-section'));
        state.forEach((html, i) => {
          if (slides[i]) slides[i].innerHTML = html;
        });
      }

      function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('editor-btn-undo');
        const redoBtn = document.getElementById('editor-btn-redo');
        if (undoBtn) undoBtn.disabled = (historyStack.length <= 1);
        if (redoBtn) redoBtn.disabled = (futureStack.length === 0);
      }

      function takeSnapshot() {
        selectedElements.forEach(el => el.classList.remove('deck-editable-selected'));
        const stateJson = JSON.stringify(getSlidesState());
        selectedElements.forEach(el => el.classList.add('deck-editable-selected'));

        if (historyStack.length > 0 && historyStack[historyStack.length - 1] === stateJson) {
          return;
        }
        historyStack.push(stateJson);
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
        futureStack = [];
        updateUndoRedoButtons();
      }

      function applyUndo() {
        if (historyStack.length <= 1) return;
        selectedElements.forEach(el => el.classList.remove('deck-editable-selected'));
        futureStack.push(JSON.stringify(getSlidesState()));
        historyStack.pop();
        const prevStateJson = historyStack[historyStack.length - 1];
        clearSelection();
        restoreSlidesState(JSON.parse(prevStateJson));
        updateUndoRedoButtons();
        notifyParentContentChanged();
      }

      function applyRedo() {
        if (futureStack.length === 0) return;
        const nextStateJson = futureStack.pop();
        selectedElements.forEach(el => el.classList.remove('deck-editable-selected'));
        historyStack.push(JSON.stringify(getSlidesState()));
        clearSelection();
        restoreSlidesState(JSON.parse(nextStateJson));
        updateUndoRedoButtons();
        notifyParentContentChanged();
      }

      function duplicateSelectedElements() {
        if (selectedElements.size === 0) return;
        const newSelected = [];
        selectedElements.forEach(el => {
          if (!el || el.classList.contains('slide-section')) return;
          const clone = el.cloneNode(true);
          clone.classList.remove('deck-editable-selected');
          const t = getParsedTransform(el);
          applyTransform(clone, { x: t.x + 20, y: t.y + 20, scale: t.scale, rotate: t.rotate });
          el.parentNode.insertBefore(clone, el.nextSibling);
          newSelected.push(clone);
        });
        clearSelection();
        newSelected.forEach(c => selectElement(c, true));
        takeSnapshot();
        notifyParentContentChanged();
      }

      function deleteSelectedElements() {
        if (selectedElements.size === 0) return;
        selectedElements.forEach(el => {
          if (el && !el.classList.contains('slide-section') && el.parentNode) {
            el.remove();
          }
        });
        selectedElements.clear();
        updateSelectionCounter();
        takeSnapshot();
        notifyParentContentChanged();
      }

      function notifyParentContentChanged() {
        const selected = Array.from(selectedElements);
        selected.forEach(el => el.classList.remove('deck-editable-selected'));
        const html = document.documentElement.outerHTML;
        selected.forEach(el => el.classList.add('deck-editable-selected'));

        window.parent.postMessage({
          type: 'SLIDE_DECK_CONTENT_CHANGED',
          html: html,
          title: document.title || 'Slide Deck'
        }, '*');
      }

      function updateSelectionCounter() {
        const countEl = document.getElementById('editor-selection-counter');
        if (!countEl) return;
        const count = selectedElements.size;
        countEl.textContent = count === 0 ? 'Pilih elemen' : (count === 1 ? '1 terpilih' : count + ' terpilih');
      }

      function getParsedTransform(el) {
        let x = 0, y = 0, scale = 1, rotate = 0;
        const transformStr = el.dataset.deckTransform || '';
        const matchT = transformStr.match(/translate\\(([-0-9.]+)px,\\s*([-0-9.]+)px\\)/i);
        if (matchT) { x = parseFloat(matchT[1]) || 0; y = parseFloat(matchT[2]) || 0; }
        const matchS = transformStr.match(/scale\\(([-0-9.]+)\\)/i);
        if (matchS) { scale = parseFloat(matchS[1]) || 1; }
        const matchR = transformStr.match(/rotate\\(([-0-9.]+)deg\\)/i);
        if (matchR) { rotate = parseFloat(matchR[1]) || 0; }
        return { x, y, scale, rotate };
      }

      function applyTransform(el, { x, y, scale, rotate }) {
        const transformStr = \`translate(\${x.toFixed(1)}px, \${y.toFixed(1)}px) scale(\${scale.toFixed(2)}) rotate(\${rotate.toFixed(1)}deg)\`;
        el.dataset.deckTransform = transformStr;
        el.style.transform = transformStr;
        el.style.transformOrigin = 'center center';
      }

      function toggleEditMode(forceState) {
        isEditMode = (typeof forceState === 'boolean') ? forceState : !isEditMode;
        document.body.classList.toggle('deck-edit-mode-active', isEditMode);
        const dockBtn = document.getElementById('dock-btn-edit');
        if (dockBtn) dockBtn.classList.toggle('active', isEditMode);

        if (isEditMode) {
          if (historyStack.length === 0) takeSnapshot();
          updateUndoRedoButtons();
        } else {
          clearSelection();
          notifyParentContentChanged();
        }

        window.parent.postMessage({
          type: 'EDIT_MODE_TOGGLED',
          active: isEditMode
        }, '*');
      }

      function clearSelection() {
        selectedElements.forEach(el => {
          el.classList.remove('deck-editable-selected');
          if (el.hasAttribute('contenteditable')) el.removeAttribute('contenteditable');
        });
        selectedElements.clear();
        updateSelectionCounter();
      }

      function selectElement(el, isMulti = false) {
        if (!el || el === document.body || el.closest('#deck-editor-toolbar') || el.closest('.deck-floating-dock')) return;

        if (!isMulti) {
          clearSelection();
        }

        if (selectedElements.has(el)) {
          if (isMulti) {
            el.classList.remove('deck-editable-selected');
            selectedElements.delete(el);
          }
        } else {
          el.classList.add('deck-editable-selected');
          selectedElements.add(el);
        }
        updateSelectionCounter();
      }

      function findEditableTarget(target) {
        if (!target) return null;
        if (target.closest('#deck-editor-toolbar') || target.closest('.deck-floating-dock') || target.closest('#deck-sidebar')) {
          return null;
        }
        return target.closest(
          '[data-deck-editable="true"], .slide-main-title, .slide-lead-desc, .col-title, .col-desc, ' +
          '.col-badge, .col-tag-chip, .col-highlight-text, .cover-main-title, .cover-lead-subtitle, ' +
          '.cover-badge-pill, .metric-val, .metric-title, .metric-desc, .quote-text, .quote-author, ' +
          '.timeline-step-title, .timeline-step-desc, .conclusion-card-title, .conclusion-card-desc, ' +
          '.slide-col, .split-col, .metric-card, .timeline-step, .conclusion-card, h1, h2, h3, p'
        );
      }

      // Drag & selection interaction
      document.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        if (e.target.closest('#deck-editor-toolbar') || e.target.closest('.deck-floating-dock')) return;

        const target = findEditableTarget(e.target);
        if (!target) {
          clearSelection();
          return;
        }

        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!selectedElements.has(target)) {
          selectElement(target, isMulti);
        } else if (isMulti) {
          selectElement(target, true);
          return;
        }

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialTransforms.clear();

        selectedElements.forEach(el => {
          initialTransforms.set(el, getParsedTransform(el));
        });
      });

      document.addEventListener('mousemove', (e) => {
        if (!isEditMode || !isDragging || selectedElements.size === 0) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        selectedElements.forEach(el => {
          const init = initialTransforms.get(el) || { x: 0, y: 0, scale: 1, rotate: 0 };
          applyTransform(el, {
            x: init.x + dx,
            y: init.y + dy,
            scale: init.scale,
            rotate: init.rotate
          });
        });
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          initialTransforms.clear();
          takeSnapshot();
          notifyParentContentChanged();
        }
      });

      // Double-click inline text editing
      document.addEventListener('dblclick', (e) => {
        if (!isEditMode) return;
        const target = findEditableTarget(e.target);
        if (!target) return;

        let textTarget = target;
        if (target.classList.contains('slide-col') || target.classList.contains('split-col') || target.classList.contains('metric-card')) {
          textTarget = target.querySelector('h1, h2, h3, p, .col-title, .col-desc') || target;
        }

        textTarget.setAttribute('contenteditable', 'true');
        textTarget.focus();

        const initialText = textTarget.innerHTML;
        const onBlur = () => {
          textTarget.removeAttribute('contenteditable');
          textTarget.removeEventListener('blur', onBlur);
          if (textTarget.innerHTML !== initialText) {
            takeSnapshot();
            notifyParentContentChanged();
          }
        };
        textTarget.addEventListener('blur', onBlur);
      });

      // Toolbar Controls Hookup
      const fontSelect = document.getElementById('editor-font-family');
      fontSelect?.addEventListener('change', (e) => {
        const val = e.target.value;
        selectedElements.forEach(el => {
          if (val) el.style.fontFamily = val;
          else el.style.fontFamily = '';
        });
        takeSnapshot();
        notifyParentContentChanged();
      });

      function adjustFontSize(delta) {
        selectedElements.forEach(el => {
          const curr = window.getComputedStyle(el).fontSize;
          const num = parseFloat(curr) || 14;
          el.style.fontSize = Math.max(8, num + delta) + 'px';
        });
        takeSnapshot();
        notifyParentContentChanged();
      }
      document.getElementById('editor-btn-size-up')?.addEventListener('click', () => adjustFontSize(2));
      document.getElementById('editor-btn-size-down')?.addEventListener('click', () => adjustFontSize(-2));

      document.getElementById('editor-btn-bold')?.addEventListener('click', (e) => {
        selectedElements.forEach(el => {
          const isBold = el.style.fontWeight === '800' || el.style.fontWeight === 'bold';
          el.style.fontWeight = isBold ? 'normal' : '800';
        });
        e.currentTarget.classList.toggle('active');
        takeSnapshot();
        notifyParentContentChanged();
      });

      document.getElementById('editor-btn-italic')?.addEventListener('click', (e) => {
        selectedElements.forEach(el => {
          const isItalic = el.style.fontStyle === 'italic';
          el.style.fontStyle = isItalic ? 'normal' : 'italic';
        });
        e.currentTarget.classList.toggle('active');
        takeSnapshot();
        notifyParentContentChanged();
      });

      document.getElementById('editor-btn-underline')?.addEventListener('click', (e) => {
        selectedElements.forEach(el => {
          const isU = el.style.textDecoration === 'underline';
          el.style.textDecoration = isU ? 'none' : 'underline';
        });
        e.currentTarget.classList.toggle('active');
        takeSnapshot();
        notifyParentContentChanged();
      });

      document.querySelectorAll('.editor-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          const color = swatch.getAttribute('data-color');
          selectedElements.forEach(el => {
            el.style.color = color;
          });
          takeSnapshot();
          notifyParentContentChanged();
        });
      });

      function setAlignment(align) {
        selectedElements.forEach(el => {
          el.style.textAlign = align;
        });
        takeSnapshot();
        notifyParentContentChanged();
      }
      document.getElementById('editor-btn-align-left')?.addEventListener('click', () => setAlignment('left'));
      document.getElementById('editor-btn-align-center')?.addEventListener('click', () => setAlignment('center'));
      document.getElementById('editor-btn-align-right')?.addEventListener('click', () => setAlignment('right'));

      function adjustScale(factor) {
        selectedElements.forEach(el => {
          const t = getParsedTransform(el);
          t.scale = Math.max(0.2, Math.min(3.0, t.scale + factor));
          applyTransform(el, t);
        });
        takeSnapshot();
        notifyParentContentChanged();
      }
      document.getElementById('editor-btn-scale-up')?.addEventListener('click', () => adjustScale(0.1));
      document.getElementById('editor-btn-scale-down')?.addEventListener('click', () => adjustScale(-0.1));

      function adjustRotation(deg) {
        selectedElements.forEach(el => {
          const t = getParsedTransform(el);
          t.rotate = (t.rotate + deg) % 360;
          applyTransform(el, t);
        });
        takeSnapshot();
        notifyParentContentChanged();
      }
      document.getElementById('editor-btn-rot-left')?.addEventListener('click', () => adjustRotation(-15));
      document.getElementById('editor-btn-rot-right')?.addEventListener('click', () => adjustRotation(15));

      document.getElementById('editor-btn-reset-transform')?.addEventListener('click', () => {
        selectedElements.forEach(el => {
          el.removeAttribute('data-deck-transform');
          el.style.transform = '';
          el.style.transformOrigin = '';
        });
        takeSnapshot();
        notifyParentContentChanged();
      });

      // Undo, Redo, Duplicate, Delete Buttons
      document.getElementById('editor-btn-undo')?.addEventListener('click', applyUndo);
      document.getElementById('editor-btn-redo')?.addEventListener('click', applyRedo);
      document.getElementById('editor-btn-duplicate')?.addEventListener('click', duplicateSelectedElements);
      document.getElementById('editor-btn-delete')?.addEventListener('click', deleteSelectedElements);

      // Keyboard Shortcuts (Capture phase to override slide navigation)
      window.addEventListener('keydown', (e) => {
        if (!isEditMode) return;
        const activeTag = document.activeElement?.tagName;
        const isEditingText = document.activeElement?.isContentEditable || activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA';

        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          if (!isEditingText) { e.preventDefault(); e.stopPropagation(); applyUndo(); return; }
        }
        if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          if (!isEditingText) { e.preventDefault(); e.stopPropagation(); applyRedo(); return; }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
          if (!isEditingText && selectedElements.size > 0) { e.preventDefault(); e.stopPropagation(); duplicateSelectedElements(); return; }
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (!isEditingText && selectedElements.size > 0) { e.preventDefault(); e.stopPropagation(); deleteSelectedElements(); return; }
        }
        if (e.key === 'Escape') {
          if (selectedElements.size > 0) clearSelection();
          else toggleEditMode(false);
        }
      }, true);

      document.getElementById('editor-btn-done')?.addEventListener('click', () => {
        toggleEditMode(false);
      });

      // Hook up dock buttons
      document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('#dock-btn-edit');
        if (editBtn) {
          e.preventDefault();
          toggleEditMode();
          return;
        }
        const fsBtn = e.target.closest('#dock-btn-fullscreen');
        if (fsBtn) {
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
      });

      // Window Message Listener (from Parent iframe bridge)
      window.addEventListener('message', (e) => {
        if (!e.data) return;
        if (e.data.type === 'TOGGLE_EDIT_MODE') {
          toggleEditMode();
        } else if (e.data.type === 'SET_EDIT_MODE') {
          toggleEditMode(Boolean(e.data.active));
        }
      });
    })();
  `;
}

// Global attachments
if (typeof window !== 'undefined') {
  window.getSlideDeckEditorCss = getSlideDeckEditorCss;
  window.getSlideDeckEditorHtml = getSlideDeckEditorHtml;
  window.getSlideDeckEditorScript = getSlideDeckEditorScript;
}
