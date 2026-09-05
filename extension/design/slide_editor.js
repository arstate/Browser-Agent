// =========================================================================
// SLIDE DECK REALTIME VISUAL & TEXT EDITOR ENGINE
// Figma-style Visual Handles (Scale, Rotate, Move), Font & Text Styling
// =========================================================================

function getSlideDeckEditorCss() {
  return `
    body.deck-edit-mode-active, body.deck-edit-mode-active * {
      user-select: none !important; -webkit-user-select: none !important;
    }
    body.deck-edit-mode-active [contenteditable="true"], body.deck-edit-mode-active [contenteditable="true"] * {
      user-select: text !important; -webkit-user-select: text !important;
    }
    body.deck-edit-mode-active .slide-section.active .slide-canvas { position: relative; }
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
      cursor: move !important; transition: outline 0.12s, box-shadow 0.12s;
    }
    body.deck-edit-mode-active .slide-section.active .slide-canvas [contenteditable="true"] { cursor: text !important; }
    body.deck-edit-mode-active .slide-section.active .slide-canvas *:hover {
      outline: 1.5px dashed rgba(99, 102, 241, 0.45); outline-offset: 3px;
    }
    .deck-editable-selected {
      outline: 1.5px solid var(--accent, #6366F1) !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 14px rgba(99, 102, 241, 0.35) !important;
      position: relative !important;
    }
    [data-deck-transform], span[data-deck-transform], a[data-deck-transform], b[data-deck-transform], i[data-deck-transform], strong[data-deck-transform], em[data-deck-transform] {
      display: inline-block !important;
    }
    span.deck-editable-selected, a.deck-editable-selected, b.deck-editable-selected, i.deck-editable-selected, strong.deck-editable-selected {
      display: inline-block !important;
    }
    .deck-figma-box { position: absolute; inset: -5px; pointer-events: none; z-index: 10000; }
    .figma-handle {
      position: absolute; width: 9px; height: 9px; background: #FFFFFF;
      border: 1.5px solid var(--accent, #6366F1); border-radius: 2px;
      pointer-events: auto; box-shadow: 0 1px 4px rgba(0,0,0,0.35); z-index: 10002;
    }
    .figma-handle-tl { top: -5px; left: -5px; cursor: nwse-resize; }
    .figma-handle-tr { top: -5px; right: -5px; cursor: nesw-resize; }
    .figma-handle-bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
    .figma-handle-br { bottom: -5px; right: -5px; cursor: nwse-resize; }
    .figma-handle-tm { top: -5px; left: calc(50% - 4.5px); cursor: ns-resize; }
    .figma-handle-bm { bottom: -5px; left: calc(50% - 4.5px); cursor: ns-resize; }
    .figma-handle-ml { top: calc(50% - 4.5px); left: -5px; cursor: ew-resize; }
    .figma-handle-mr { top: calc(50% - 4.5px); right: -5px; cursor: ew-resize; }
    .figma-snap-guide-v { position: absolute; top: 0; bottom: 0; width: 1px; background: #EC4899; pointer-events: none; z-index: 10005; }
    .figma-snap-guide-h { position: absolute; left: 0; right: 0; height: 1px; background: #EC4899; pointer-events: none; z-index: 10005; }
    .figma-rot-stem { position: absolute; top: -22px; left: 50%; width: 1.5px; height: 18px; background: var(--accent, #6366F1); pointer-events: none; transform: translateX(-50%); }
    .figma-handle-rot { position: absolute; top: -29px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; background: #FFFFFF; border: 1.5px solid var(--accent, #6366F1); border-radius: 50%; cursor: crosshair; pointer-events: auto; box-shadow: 0 1px 4px rgba(0,0,0,0.35); z-index: 10002; }
    .figma-handle-rot:hover { background: var(--accent, #6366F1); }
    .figma-badge-dim { position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.92); color: #F8FAFC; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); white-space: nowrap; pointer-events: none; display: none; z-index: 10003; }
    .deck-editor-toolbar { position: fixed; top: 14px; left: 50%; transform: translateX(-50%) translateY(-70px); display: flex; align-items: center; gap: 6px; background: rgba(13, 17, 23, 0.94); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 9999px; padding: 6px 14px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(99, 102, 241, 0.25); backdrop-filter: blur(24px); z-index: 999999 !important; opacity: 0; pointer-events: none; transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; max-width: 95vw; overflow-x: auto; }
    body.deck-edit-mode-active .deck-editor-toolbar { transform: translateX(-50%) translateY(0) !important; opacity: 1 !important; pointer-events: auto !important; }
    .editor-tool-group { display: flex; align-items: center; gap: 4px; }
    .editor-tool-divider { width: 1px; height: 18px; background: rgba(255, 255, 255, 0.14); margin: 0 2px; flex-shrink: 0; }
    .editor-tool-btn { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); color: #F1F5F9; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 28px; min-width: 28px; transition: all 0.15s; }
    .editor-tool-btn:hover { background: rgba(255, 255, 255, 0.16); color: #FFFFFF; border-color: rgba(255, 255, 255, 0.24); }
    .editor-tool-btn.active { background: var(--accent, #6366F1); color: #FFFFFF; border-color: var(--accent, #6366F1); box-shadow: 0 0 8px rgba(99, 102, 241, 0.5); }
    .editor-tool-select { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); color: #F8FAFC; border-radius: 6px; padding: 3px 6px; font-size: 11.5px; font-weight: 600; height: 28px; cursor: pointer; outline: none; }
    .editor-tool-select option { background: #111827; color: #F8FAFC; }
    .editor-color-swatch { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.4); cursor: pointer; transition: transform 0.12s, border-color 0.12s; }
    .editor-color-swatch:hover { transform: scale(1.2); border-color: #FFFFFF; }
    .editor-badge-status { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 8px; background: rgba(99, 102, 241, 0.2); border: 1px solid var(--accent, #6366F1); border-radius: 9999px; color: var(--accent, #6366F1); display: inline-flex; align-items: center; gap: 5px; }
    .editor-pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px #10B981; }
    .editor-btn-save { background: #10B981 !important; color: #FFFFFF !important; border-color: #10B981 !important; font-weight: 700 !important; padding: 4px 12px !important; }
    .editor-btn-save:hover { background: #059669 !important; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4) !important; }
    #dock-btn-edit.active { background: var(--accent, #6366F1); color: #FFFFFF; box-shadow: 0 0 12px var(--accent, #6366F1); }
    .editor-tool-btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
    .editor-btn-danger:hover { background: rgba(239, 68, 68, 0.2) !important; border-color: rgba(239, 68, 68, 0.5) !important; color: #F87171 !important; }
  `;
}

function getSlideDeckEditorHtml() {
  return `
    <nav class="deck-editor-toolbar" id="deck-editor-toolbar" aria-label="Toolbar Mode Edit Realtime">
      <div class="editor-tool-group"><span class="editor-badge-status"><span class="editor-pulse-dot"></span><span>Edit Mode</span></span></div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-undo" title="Undo (Ctrl+Z)" disabled><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-redo" title="Redo (Ctrl+Y)" disabled><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
      </div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group">
        <select class="editor-tool-select" id="editor-font-family" title="Ganti Font Teks">
          <option value="">Font: Asli</option><option value="'Inter', sans-serif">Inter</option><option value="'Outfit', sans-serif">Outfit</option><option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta</option><option value="'Space Grotesk', sans-serif">Space Grotesk</option><option value="'Syne', sans-serif">Syne</option><option value="'JetBrains Mono', monospace">JetBrains Mono</option><option value="Georgia, serif">Editorial Serif</option>
        </select>
      </div>
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-size-down" title="Kecilkan Ukuran Teks">A-</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-size-up" title="Besarkan Ukuran Teks">A+</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-bold" title="Tebal (Bold / B)"><b>B</b></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-italic" title="Miring (Italic / I)"><i>I</i></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-underline" title="Garis Bawah (Underline / U)"><u>U</u></button>
      </div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-align-left" title="Rata Kiri"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-align-center" title="Rata Tengah"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg></button>
        <button type="button" class="editor-tool-btn" id="editor-btn-align-right" title="Rata Kanan"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg></button>
      </div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group" title="Warna Teks">
        <span class="editor-color-swatch" data-color="#FFFFFF" style="background: #FFFFFF;"></span><span class="editor-color-swatch" data-color="var(--accent)" style="background: var(--accent, #6366F1);"></span><span class="editor-color-swatch" data-color="#38BDF8" style="background: #38BDF8;"></span><span class="editor-color-swatch" data-color="#F59E0B" style="background: #F59E0B;"></span><span class="editor-color-swatch" data-color="#F43F5E" style="background: #F43F5E;"></span><span class="editor-color-swatch" data-color="#94A3B8" style="background: #94A3B8;"></span>
      </div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-scale-down" title="Perkecil Skala (Scale -)">-10%</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-scale-up" title="Perbesar Skala (Scale +)">+10%</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-rot-left" title="Putar Balik Arah Jarum Jam (↺ -15°)">↺</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-rot-right" title="Putar Searah Jarum Jam (↻ +15°)">↻</button>
        <button type="button" class="editor-tool-btn" id="editor-btn-reset-transform" title="Atur Ulang Posisi & Skala">Reset</button>
      </div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group">
        <button type="button" class="editor-tool-btn" id="editor-btn-duplicate" title="Duplikat Elemen (Ctrl+D)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Duplikat</span></button>
        <button type="button" class="editor-tool-btn editor-btn-danger" id="editor-btn-delete" title="Hapus Elemen (Del)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Hapus</span></button>
      </div>
      <div class="editor-tool-divider"></div>
      <div class="editor-tool-group">
        <span id="editor-selection-counter" style="font-size: 11px; opacity: 0.8; padding: 0 4px;">Pilih elemen</span>
        <button type="button" class="editor-tool-btn editor-btn-save" id="editor-btn-done" title="Simpan Perubahan & Selesai">Simpan</button>
      </div>
    </nav>
  `;
}

function initSlideDeckRealtimeEditor(targetDoc, targetWin) {
  const doc = targetDoc || (typeof document !== "undefined" ? document : null);
  const win = targetWin || (typeof window !== "undefined" ? window : null);
  if (!doc || !win) return;
  if (win.__slideDeckEditorInited) return;
  win.__slideDeckEditorInited = true;

      let isEditMode = false;
      let selectedElements = new Set();
      let isDragging = false;
      let activeAction = null;
      let activeDir = null;
      let activeElement = null;
      let startX = 0, startY = 0;
      let centerX = 0, centerY = 0;
      let initialTransform = { x: 0, y: 0, scale: 1, rotate: 0 };
      let initialDistance = 1;
      let initialAngle = 0;
      let initialWidth = 0, initialHeight = 0;
      let primaryStartBox = null, snapCandidatesX = [], snapCandidatesY = [];
      let initialTransforms = new Map();
      let historyStack = [];
      let futureStack = [];
      const MAX_HISTORY = 30;

      function getSlidesState() {
        return Array.from(doc.querySelectorAll('.slide-section')).map(s => s.innerHTML);
      }

      function restoreSlidesState(state) {
        if (!Array.isArray(state)) return;
        const slides = Array.from(doc.querySelectorAll('.slide-section'));
        state.forEach((html, i) => {
          if (slides[i]) slides[i].innerHTML = html;
        });
      }

      function updateUndoRedoButtons() {
        const undoBtn = doc.getElementById('editor-btn-undo');
        const redoBtn = doc.getElementById('editor-btn-redo');
        if (undoBtn) undoBtn.disabled = (historyStack.length <= 1);
        if (redoBtn) redoBtn.disabled = (futureStack.length === 0);
      }

      function removeSnapGuides() { doc.querySelectorAll('.figma-snap-guide-v, .figma-snap-guide-h').forEach(g => g.remove()); }
      function showSnapGuideV(c, x) { let g = c.querySelector('.figma-snap-guide-v') || doc.createElement('div'); g.className = 'figma-snap-guide-v'; g.style.left = x + 'px'; if (!g.parentNode) c.appendChild(g); }
      function showSnapGuideH(c, y) { let g = c.querySelector('.figma-snap-guide-h') || doc.createElement('div'); g.className = 'figma-snap-guide-h'; g.style.top = y + 'px'; if (!g.parentNode) c.appendChild(g); }
      function removeSnapGuideV(c) { c.querySelectorAll('.figma-snap-guide-v').forEach(g => g.remove()); }
      function removeSnapGuideH(c) { c.querySelectorAll('.figma-snap-guide-h').forEach(g => g.remove()); }
      function removeFigmaBoxes() { doc.querySelectorAll('.deck-figma-box').forEach(b => b.remove()); removeSnapGuides(); }
      function initSnapCandidates(el) {
        const canvas = el?.closest('.slide-canvas');
        if (!canvas || !el) return;
        const cRect = canvas.getBoundingClientRect(), pRect = el.getBoundingClientRect();
        primaryStartBox = { left: pRect.left - cRect.left, top: pRect.top - cRect.top, right: pRect.right - cRect.left, bottom: pRect.bottom - cRect.top, width: pRect.width, height: pRect.height };
        snapCandidatesX = [cRect.width / 2, 48, cRect.width - 48];
        snapCandidatesY = [cRect.height / 2, 36, cRect.height - 36];
        canvas.querySelectorAll('[data-deck-editable="true"], h1, h2, h3, p, .slide-col, .metric-card, .timeline-step, .col-badge, .cover-badge-pill').forEach(sib => {
          if (sib === el || selectedElements.has(sib) || sib.closest('.deck-figma-box')) return;
          const sR = sib.getBoundingClientRect(), sL = sR.left - cRect.left, sT = sR.top - cRect.top;
          snapCandidatesX.push(sL, sL + sR.width / 2, sL + sR.width, primaryStartBox.left + sR.width);
          snapCandidatesY.push(sT, sT + sR.height / 2, sT + sR.height, primaryStartBox.top + sR.height);
        });
      }

      function updateFigmaHandles() {
        removeFigmaBoxes();
        if (!isEditMode) return;
        selectedElements.forEach(el => {
          if (!el || !el.parentNode || el.classList.contains('slide-section')) return;
          const box = doc.createElement('div');
          box.className = 'deck-figma-box';
          box.innerHTML = '<div class="figma-handle figma-handle-tl" data-handle="scale" data-dir="tl"></div>' +
            '<div class="figma-handle figma-handle-tr" data-handle="scale" data-dir="tr"></div>' +
            '<div class="figma-handle figma-handle-bl" data-handle="scale" data-dir="bl"></div>' +
            '<div class="figma-handle figma-handle-br" data-handle="scale" data-dir="br"></div>' +
            '<div class="figma-handle figma-handle-tm" data-handle="resize-h" data-dir="tm" title="Tarik untuk atur tinggi"></div>' +
            '<div class="figma-handle figma-handle-bm" data-handle="resize-h" data-dir="bm" title="Tarik untuk atur tinggi"></div>' +
            '<div class="figma-handle figma-handle-ml" data-handle="resize-w" data-dir="ml" title="Tarik untuk atur lebar/panjang"></div>' +
            '<div class="figma-handle figma-handle-mr" data-handle="resize-w" data-dir="mr" title="Tarik untuk atur lebar/panjang"></div>' +
            '<div class="figma-rot-stem"></div>' +
            '<div class="figma-handle-rot" data-handle="rotate" title="Tarik untuk memutar elemen"></div>' +
            '<div class="figma-badge-dim"></div>';
          try { el.appendChild(box); } catch(err) {}
        });
      }

      function takeSnapshot() {
        removeFigmaBoxes();
        selectedElements.forEach(el => el.classList.remove('deck-editable-selected'));
        const stateJson = JSON.stringify(getSlidesState());
        selectedElements.forEach(el => el.classList.add('deck-editable-selected'));
        updateFigmaHandles();

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
        removeFigmaBoxes();
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
        removeFigmaBoxes();
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
        removeFigmaBoxes();
        const newSelected = [];
        selectedElements.forEach(el => {
          if (!el || el.classList.contains('slide-section')) return;
          const clone = el.cloneNode(true);
          clone.classList.remove('deck-editable-selected');
          clone.querySelectorAll('.deck-figma-box').forEach(b => b.remove());
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
        removeFigmaBoxes();
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
        removeFigmaBoxes();
        const selected = Array.from(selectedElements);
        selected.forEach(el => el.classList.remove('deck-editable-selected'));
        const html = doc.documentElement.outerHTML;
        selected.forEach(el => el.classList.add('deck-editable-selected'));
        updateFigmaHandles();

        win.parent.postMessage({
          type: 'SLIDE_DECK_CONTENT_CHANGED',
          html: html,
          title: doc.title || 'Slide Deck'
        }, '*');
      }

      function updateSelectionCounter() {
        const countEl = doc.getElementById('editor-selection-counter');
        if (!countEl) return;
        const count = selectedElements.size;
        countEl.textContent = count === 0 ? 'Pilih elemen' : (count === 1 ? '1 terpilih' : count + ' terpilih');
      }

      function getParsedTransform(el) {
        let x = 0, y = 0, scale = 1, rotate = 0;
        const transformStr = el.dataset.deckTransform || '';
        const matchT = transformStr.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/i);
        if (matchT) { x = parseFloat(matchT[1]) || 0; y = parseFloat(matchT[2]) || 0; }
        const matchS = transformStr.match(/scale\(([-0-9.]+)\)/i);
        if (matchS) { scale = parseFloat(matchS[1]) || 1; }
        const matchR = transformStr.match(/rotate\(([-0-9.]+)deg\)/i);
        if (matchR) { rotate = parseFloat(matchR[1]) || 0; }
        return { x, y, scale, rotate };
      }

      function applyTransform(el, { x, y, scale, rotate }) {
        const transformStr = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) scale(' + scale.toFixed(2) + ') rotate(' + rotate.toFixed(1) + 'deg)';
        el.dataset.deckTransform = transformStr;
        el.style.transform = transformStr;
        el.style.transformOrigin = 'center center';
        if (['SPAN', 'A', 'B', 'I', 'STRONG', 'EM'].includes(el.tagName) || win.getComputedStyle(el).display === 'inline') {
          el.style.display = 'inline-block';
        }
      }

      let lastToggleTime = 0;
      function toggleEditMode(forceState) {
        const now = Date.now();
        if (typeof forceState !== 'boolean' && (now - lastToggleTime < 80)) return;
        lastToggleTime = now;
        isEditMode = (typeof forceState === 'boolean') ? forceState : !isEditMode;
        doc.body.classList.toggle('deck-edit-mode-active', isEditMode);
        const dockBtn = doc.getElementById('dock-btn-edit');
        if (dockBtn) {
          dockBtn.classList.toggle('active', isEditMode);
          dockBtn.style.background = isEditMode ? 'var(--accent, #6366F1)' : '';
          dockBtn.style.color = isEditMode ? '#FFFFFF' : '';
        }
        const toolbar = doc.getElementById('deck-editor-toolbar');
        if (toolbar) {
          toolbar.style.opacity = isEditMode ? '1' : '0';
          toolbar.style.pointerEvents = isEditMode ? 'auto' : 'none';
          toolbar.style.transform = isEditMode ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-70px)';
        }

        if (isEditMode) {
          if (historyStack.length === 0) takeSnapshot();
          updateUndoRedoButtons();
        } else {
          clearSelection();
          notifyParentContentChanged();
        }

        win.parent.postMessage({ type: 'DECK_EDIT_MODE_CHANGED', active: isEditMode }, '*');
        win.parent.postMessage({ type: 'EDIT_MODE_TOGGLED', active: isEditMode }, '*');
      }
      win.toggleEditMode = toggleEditMode;

      function clearSelection() {
        removeFigmaBoxes();
        selectedElements.forEach(el => {
          el.classList.remove('deck-editable-selected');
          if (el.hasAttribute('contenteditable')) el.removeAttribute('contenteditable');
        });
        selectedElements.clear();
        updateSelectionCounter();
      }

      function selectElement(el, isMulti = false) {
        if (!el || el === doc.body || el.closest('#deck-editor-toolbar') || el.closest('.deck-floating-dock')) return;

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
        updateFigmaHandles();
        updateSelectionCounter();
      }

      function findEditableTarget(target) {
        if (!target) return null;
        if (target.closest('#deck-editor-toolbar') || target.closest('.deck-floating-dock') || target.closest('#deck-sidebar')) {
          return null;
        }
        let el = target.closest(
          '[data-deck-editable="true"], .slide-main-title, .slide-lead-desc, .col-title, .col-desc, ' +
          '.col-badge, .col-tag-chip, .col-highlight-text, .cover-main-title, .cover-lead-subtitle, ' +
          '.cover-badge-pill, .cover-meta-item, .cover-meta-val, .metric-val, .metric-title, .metric-desc, .quote-text, .quote-author, ' +
          '.timeline-step-title, .timeline-step-desc, .conclusion-card-title, .conclusion-card-desc, ' +
          '.slide-col, .split-col, .metric-card, .timeline-step, .conclusion-card, h1, h2, h3, h4, p, span, strong, em, b, i'
        );
        if (el && !el.classList.contains('slide-section') && !el.classList.contains('slide-stage-wrap') && !el.classList.contains('deck-stage-wrap') && !el.classList.contains('slide-canvas')) {
          if (['IMG', 'INPUT', 'HR'].includes(el.tagName) && el.parentElement) el = el.parentElement;
          return el;
        }
        const canvas = target.closest('.slide-canvas');
        if (canvas && target !== canvas && !target.classList.contains('slide-header-bar') && !target.classList.contains('slide-footer-bar')) {
          return target;
        }
        return null;
      }

      // Interaction: Selection, Move Drag, and Figma Transform Handles
      doc.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        if (e.target.closest('#deck-editor-toolbar') || e.target.closest('.deck-floating-dock')) return;

        const handleEl = e.target.closest('[data-handle]');
        if (handleEl) {
          e.preventDefault();
          e.stopPropagation();
          const handleType = handleEl.getAttribute('data-handle');
          const parentSelected = handleEl.closest('.deck-editable-selected');
          if (!parentSelected) return;

          activeAction = handleType;
          activeDir = handleEl.getAttribute('data-dir');
          activeElement = parentSelected;
          startX = e.clientX;
          startY = e.clientY;
          const rect = parentSelected.getBoundingClientRect();
          centerX = rect.left + rect.width / 2;
          centerY = rect.top + rect.height / 2;
          initialTransform = getParsedTransform(parentSelected);
          initialDistance = Math.hypot(startX - centerX, startY - centerY) || 1;
          initialAngle = Math.atan2(startY - centerY, startX - centerX) * (180 / Math.PI);
          initialWidth = parentSelected.offsetWidth || rect.width;
          initialHeight = parentSelected.offsetHeight || rect.height;
          if (handleType === 'resize-w' || handleType === 'resize-h') {
            initSnapCandidates(parentSelected);
          }
          return;
        }

        const target = findEditableTarget(e.target);
        if (!target) {
          clearSelection();
          return;
        }

        if (!target.isContentEditable) {
          e.preventDefault();
        }

        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!selectedElements.has(target)) {
          selectElement(target, isMulti);
        } else if (isMulti) {
          selectElement(target, true);
          return;
        }

        activeAction = 'move';
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialTransforms.clear();
        selectedElements.forEach(el => {
          initialTransforms.set(el, getParsedTransform(el));
        });
        initSnapCandidates(Array.from(selectedElements)[0]);
      });

      doc.addEventListener('mousemove', (e) => {
        if (!isEditMode || !activeAction) return;

        if (activeAction === 'rotate' && activeElement) {
          e.preventDefault();
          const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
          const deltaAngle = currentAngle - initialAngle;
          let newRot = Math.round((initialTransform.rotate + deltaAngle) % 360);
          if (e.shiftKey) newRot = Math.round(newRot / 15) * 15;
          applyTransform(activeElement, {
            x: initialTransform.x,
            y: initialTransform.y,
            scale: initialTransform.scale,
            rotate: newRot
          });
          const badge = activeElement.querySelector('.figma-badge-dim');
          if (badge) {
            badge.style.display = 'block';
            badge.textContent = newRot + '°';
          }
          return;
        }

        if (activeAction === 'scale' && activeElement) {
          e.preventDefault();
          const currentDist = Math.hypot(e.clientY - centerY, e.clientX - centerX);
          const ratio = currentDist / initialDistance;
          const newScale = Math.max(0.2, Math.min(3.5, Number((initialTransform.scale * ratio).toFixed(2))));
          applyTransform(activeElement, {
            x: initialTransform.x,
            y: initialTransform.y,
            scale: newScale,
            rotate: initialTransform.rotate
          });
          const badge = activeElement.querySelector('.figma-badge-dim');
          if (badge) {
            badge.style.display = 'block';
            badge.textContent = Math.round(newScale * 100) + '%';
          }
          return;
        }

        if (activeAction === 'resize-w' && activeElement) {
          e.preventDefault();
          const s = initialTransform.scale || 1;
          const dx = (e.clientX - startX) / s;
          let newW = Math.max(20, Math.round(initialWidth + (activeDir === 'mr' ? dx : -dx)));
          const canvas = activeElement.closest('.slide-canvas');
          if (canvas && primaryStartBox) {
            const edge = (activeDir === 'mr') ? (primaryStartBox.left + newW * s) : (primaryStartBox.right - newW * s);
            let snapX = null;
            for (const c of snapCandidatesX) {
              if (Math.abs(edge - c) <= 7) {
                newW = Math.max(20, Math.round(activeDir === 'mr' ? ((c - primaryStartBox.left) / s) : ((primaryStartBox.right - c) / s)));
                snapX = c;
                break;
              }
            }
            if (snapX !== null) showSnapGuideV(canvas, snapX); else removeSnapGuideV(canvas);
          }
          activeElement.style.maxWidth = 'none';
          activeElement.style.flexShrink = '0';
          activeElement.style.width = newW + 'px';
          const badge = activeElement.querySelector('.figma-badge-dim');
          if (badge) { badge.style.display = 'block'; badge.textContent = 'P: ' + newW + 'px'; }
          return;
        }

        if (activeAction === 'resize-h' && activeElement) {
          e.preventDefault();
          const s = initialTransform.scale || 1;
          const dy = (e.clientY - startY) / s;
          let newH = Math.max(16, Math.round(initialHeight + (activeDir === 'bm' ? dy : -dy)));
          const canvas = activeElement.closest('.slide-canvas');
          if (canvas && primaryStartBox) {
            const edge = (activeDir === 'bm') ? (primaryStartBox.top + newH * s) : (primaryStartBox.bottom - newH * s);
            let snapY = null;
            for (const c of snapCandidatesY) {
              if (Math.abs(edge - c) <= 7) {
                newH = Math.max(16, Math.round(activeDir === 'bm' ? ((c - primaryStartBox.top) / s) : ((primaryStartBox.bottom - c) / s)));
                snapY = c;
                break;
              }
            }
            if (snapY !== null) showSnapGuideH(canvas, snapY); else removeSnapGuideH(canvas);
          }
          activeElement.style.minHeight = 'auto';
          activeElement.style.flexShrink = '0';
          activeElement.style.height = newH + 'px';
          const badge = activeElement.querySelector('.figma-badge-dim');
          if (badge) { badge.style.display = 'block'; badge.textContent = 'T: ' + newH + 'px'; }
          return;
        }

        if (activeAction === 'move' && isDragging && selectedElements.size > 0) {
          e.preventDefault();
          let dx = e.clientX - startX, dy = e.clientY - startY;
          const primary = Array.from(selectedElements)[0];
          const canvas = primary?.closest('.slide-canvas');
          if (canvas && primaryStartBox) {
            const targetL = primaryStartBox.left + dx, targetC = targetL + primaryStartBox.width / 2, targetR = targetL + primaryStartBox.width;
            let snapX = null;
            for (const c of snapCandidatesX) {
              if (Math.abs(targetC - c) <= 7) { dx += (c - targetC); snapX = c; break; }
              if (Math.abs(targetL - c) <= 7) { dx += (c - targetL); snapX = c; break; }
              if (Math.abs(targetR - c) <= 7) { dx += (c - targetR); snapX = c; break; }
            }
            if (snapX !== null) showSnapGuideV(canvas, snapX); else removeSnapGuideV(canvas);

            const targetT = primaryStartBox.top + dy, targetM = targetT + primaryStartBox.height / 2, targetB = targetT + primaryStartBox.height;
            let snapY = null;
            for (const c of snapCandidatesY) {
              if (Math.abs(targetM - c) <= 7) { dy += (c - targetM); snapY = c; break; }
              if (Math.abs(targetT - c) <= 7) { dy += (c - targetT); snapY = c; break; }
              if (Math.abs(targetB - c) <= 7) { dy += (c - targetB); snapY = c; break; }
            }
            if (snapY !== null) showSnapGuideH(canvas, snapY); else removeSnapGuideH(canvas);
          }
          selectedElements.forEach(el => {
            const init = initialTransforms.get(el) || { x: 0, y: 0, scale: 1, rotate: 0 };
            applyTransform(el, { x: init.x + dx, y: init.y + dy, scale: init.scale, rotate: init.rotate });
          });
        }
      });

      doc.addEventListener('mouseup', () => {
        if (activeAction) {
          if (activeElement) {
            const badge = activeElement.querySelector('.figma-badge-dim');
            if (badge) badge.style.display = 'none';
          }
          removeSnapGuides();
          activeAction = null;
          activeDir = null;
          activeElement = null;
          isDragging = false;
          primaryStartBox = null;
          snapCandidatesX = [];
          snapCandidatesY = [];
          initialTransforms.clear();
          takeSnapshot();
          notifyParentContentChanged();
        }
      });

      // Double-click inline text editing
      doc.addEventListener('dblclick', (e) => {
        if (!isEditMode) return;
        const target = findEditableTarget(e.target);
        if (!target) return;

        removeFigmaBoxes();
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
          updateFigmaHandles();
          if (textTarget.innerHTML !== initialText) {
            takeSnapshot();
            notifyParentContentChanged();
          }
        };
        textTarget.addEventListener('blur', onBlur);
      });

      // Toolbar Controls Hookup
      const fontSelect = doc.getElementById('editor-font-family');
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
          const curr = win.getComputedStyle(el).fontSize;
          const num = parseFloat(curr) || 14;
          el.style.fontSize = Math.max(8, num + delta) + 'px';
        });
        takeSnapshot();
        notifyParentContentChanged();
      }
      doc.getElementById('editor-btn-size-up')?.addEventListener('click', () => adjustFontSize(2));
      doc.getElementById('editor-btn-size-down')?.addEventListener('click', () => adjustFontSize(-2));

      const toggleStyle = (prop, val1, val2) => (e) => {
        selectedElements.forEach(el => { el.style[prop] = (el.style[prop] === val1 ? val2 : val1); });
        e.currentTarget.classList.toggle('active');
        takeSnapshot(); notifyParentContentChanged();
      };
      doc.getElementById('editor-btn-bold')?.addEventListener('click', toggleStyle('fontWeight', '800', 'normal'));
      doc.getElementById('editor-btn-italic')?.addEventListener('click', toggleStyle('fontStyle', 'italic', 'normal'));
      doc.getElementById('editor-btn-underline')?.addEventListener('click', toggleStyle('textDecoration', 'underline', 'none'));

      doc.querySelectorAll('.editor-color-swatch').forEach(sw => sw.addEventListener('click', () => {
        selectedElements.forEach(el => el.style.color = sw.getAttribute('data-color'));
        takeSnapshot(); notifyParentContentChanged();
      }));

      ['left', 'center', 'right'].forEach(align => {
        doc.getElementById('editor-btn-align-' + align)?.addEventListener('click', () => {
          selectedElements.forEach(el => el.style.textAlign = align);
          takeSnapshot(); notifyParentContentChanged();
        });
      });

      const adjustTransformProp = (fn) => {
        selectedElements.forEach(el => { const t = getParsedTransform(el); fn(t); applyTransform(el, t); });
        takeSnapshot(); notifyParentContentChanged();
      };
      doc.getElementById('editor-btn-scale-up')?.addEventListener('click', () => adjustTransformProp(t => { t.scale = Math.max(0.2, Math.min(3.0, t.scale + 0.1)); }));
      doc.getElementById('editor-btn-scale-down')?.addEventListener('click', () => adjustTransformProp(t => { t.scale = Math.max(0.2, Math.min(3.0, t.scale - 0.1)); }));
      doc.getElementById('editor-btn-rot-left')?.addEventListener('click', () => adjustTransformProp(t => { t.rotate = (t.rotate - 15) % 360; }));
      doc.getElementById('editor-btn-rot-right')?.addEventListener('click', () => adjustTransformProp(t => { t.rotate = (t.rotate + 15) % 360; }));

      doc.getElementById('editor-btn-reset-transform')?.addEventListener('click', () => {
        selectedElements.forEach(el => {
          el.removeAttribute('data-deck-transform');
          el.style.transform = el.style.transformOrigin = el.style.width = el.style.height = el.style.maxWidth = el.style.minHeight = el.style.flexShrink = el.style.display = '';
        });
        takeSnapshot(); notifyParentContentChanged();
      });

      [['undo', applyUndo], ['redo', applyRedo], ['duplicate', duplicateSelectedElements], ['delete', deleteSelectedElements]].forEach(([id, fn]) => {
        doc.getElementById('editor-btn-' + id)?.addEventListener('click', fn);
      });

      win.addEventListener('keydown', (e) => {
        if (!isEditMode) return;
        const isEditing = doc.activeElement?.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(doc.activeElement?.tagName);
        const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
        if (isEditing) return;
        if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); applyUndo(); }
        else if ((mod && k === 'y') || (mod && e.shiftKey && k === 'z')) { e.preventDefault(); e.stopPropagation(); applyRedo(); }
        else if (mod && k === 'd' && selectedElements.size > 0) { e.preventDefault(); e.stopPropagation(); duplicateSelectedElements(); }
        else if ((k === 'delete' || k === 'backspace') && selectedElements.size > 0) { e.preventDefault(); e.stopPropagation(); deleteSelectedElements(); }
        else if (k === 'escape') { if (selectedElements.size > 0) clearSelection(); else toggleEditMode(false); }
      }, true);

      doc.getElementById('editor-btn-done')?.addEventListener('click', () => toggleEditMode(false));

      doc.addEventListener('click', (e) => {
        if (e.target.closest('#dock-btn-edit')) { e.preventDefault(); e.stopImmediatePropagation(); toggleEditMode(); }
        else if (e.target.closest('#dock-btn-fullscreen')) {
          e.preventDefault();
          if (!doc.fullscreenElement) doc.documentElement.requestFullscreen().catch(() => {});
          else doc.exitFullscreen().catch(() => {});
        }
      });

      // Window Message Listener (from Parent iframe bridge)
      win.addEventListener('message', (e) => {
        if (!e.data) return;
        if (e.data.type === 'TOGGLE_EDIT_MODE') {
          toggleEditMode();
        } else if (e.data.type === 'SET_EDIT_MODE') {
          toggleEditMode(Boolean(e.data.active));
        }
      });
}

function getSlideDeckEditorScript() {
  return `(${initSlideDeckRealtimeEditor.toString()})(document, window);`;
}

// Global attachments
if (typeof window !== "undefined") {
  window.getSlideDeckEditorCss = getSlideDeckEditorCss;
  window.getSlideDeckEditorHtml = getSlideDeckEditorHtml;
  window.getSlideDeckEditorScript = getSlideDeckEditorScript;
  window.initSlideDeckRealtimeEditor = initSlideDeckRealtimeEditor;
}
