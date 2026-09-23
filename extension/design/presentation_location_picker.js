// =========================================================================
// PRESENTATION LOCATION PICKER & REVISION MANAGER (In-Chat Interactive Card)
// Allows selecting target save folder or existing presentation files to revise
// =========================================================================

const DEFAULT_PRESENTATIONS_DIR = "~/.browser-agent/presentations";
const DATASET_TRAINING_DIR = "/mnt/DATA/FILE/DJADI CREATIVE/DATA BRAND/DATASET TRAINING/PDF SLIDE DECK";
const DOWNLOADS_DIR = "~/Downloads";

function getActiveSlideDeckTargetDir() {
  if (typeof window !== "undefined" && window.__activeSlideDeckTargetDir) {
    return window.__activeSlideDeckTargetDir;
  }
  return DEFAULT_PRESENTATIONS_DIR;
}

function setActiveSlideDeckTargetDir(dir) {
  if (!dir) return;
  if (typeof window !== "undefined") {
    window.__activeSlideDeckTargetDir = dir;
  }
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local?.set) {
      chrome.storage.local.set({ last_slide_deck_target_dir: dir });
    }
  } catch (_) {}
}

function renderPresentationLocationCard(containerEl, options = {}) {
  if (!containerEl) return null;

  const existingCard = containerEl.querySelector('.presentation-loc-card');
  if (existingCard) {
    existingCard.remove();
  }

  const topic = options.topic || "Presentasi Slide Deck 16:9";
  const initialDir = options.initialDir || getActiveSlideDeckTargetDir();

  const card = document.createElement('div');
  card.className = 'presentation-loc-card';
  card.style.cssText = `
    margin: 12px 0;
    padding: 16px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92));
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
  `;

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">📁</span>
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; color: #38BDF8; text-transform: uppercase;">
          LOKASI SIMPAN & REVISI SLIDE DECK
        </span>
      </div>
      <span style="font-size: 10px; color: #94A3B8; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 10px;">
        Interactive Dialog
      </span>
    </div>

    <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-bottom: 4px;">
      ${escapeHtml(topic)}
    </div>
    <div style="font-size: 11.5px; color: #94A3B8; margin-bottom: 12px; line-height: 1.4;">
      Tentukan folder penyimpanan PDF/HTML agar terorganisir rapi di komputer Anda, atau pilih file eksisting untuk langsung direvisi:
    </div>

    <div style="margin-bottom: 10px;">
      <label style="display: block; font-size: 10.5px; font-weight: 700; color: #CBD5E1; margin-bottom: 5px;">
        FALSAFAH FOLDER TARGET SIMPAN:
      </label>
      <div style="display: flex; gap: 6px; align-items: center;">
        <input type="text" class="loc-path-input" value="${escapeHtml(initialDir)}" 
          style="flex: 1; padding: 7px 10px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: #F1F5F9; font-size: 11px; font-family: monospace; outline: none;" />
        <button type="button" class="btn-loc-browse" 
          style="padding: 7px 12px; background: #0284C7; hover:background:#0369A1; border: none; border-radius: 8px; color: #FFFFFF; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>Pilih Folder...</span>
        </button>
      </div>
    </div>

    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px;">
      <button type="button" class="loc-preset-pill" data-path="${escapeHtml(DEFAULT_PRESENTATIONS_DIR)}"
        style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #CBD5E1; font-size: 10px; cursor: pointer;">
        Default (~/.browser-agent)
      </button>
      <button type="button" class="loc-preset-pill" data-path="${escapeHtml(DATASET_TRAINING_DIR)}"
        style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #CBD5E1; font-size: 10px; cursor: pointer;">
        Dataset Training Deck
      </button>
      <button type="button" class="loc-preset-pill" data-path="${escapeHtml(DOWNLOADS_DIR)}"
        style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #CBD5E1; font-size: 10px; cursor: pointer;">
        Downloads
      </button>
    </div>

    <div style="position: relative; text-align: center; margin: 12px 0; border-top: 1px dashed rgba(255,255,255,0.12);">
      <span style="position: relative; top: -8px; background: #0F172A; padding: 0 8px; font-size: 9.5px; font-weight: 700; color: #64748B; letter-spacing: 0.5px;">
        ATAU PILIH FILE UNTUK DIREVISI
      </span>
    </div>

    <div style="margin-bottom: 12px;">
      <button type="button" class="btn-loc-pick-file"
        style="width: 100%; padding: 8px 12px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 8px; color: #34D399; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all 0.2s ease;">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <span>📄 Pilih File PDF/HTML Eksisting untuk Direvisi...</span>
      </button>
      <div class="loc-file-selected-info" style="display: none; margin-top: 6px; font-size: 10.5px; color: #34D399; word-break: break-all;"></div>
    </div>

    <div style="display: flex; gap: 8px; align-items: center;">
      <button type="button" class="btn-loc-confirm"
        style="flex: 1; padding: 9px 14px; background: linear-gradient(135deg, #2563EB, #1D4ED8); border: none; border-radius: 8px; color: #FFFFFF; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
        <span>🚀 Simpan ke Folder Ini & Buka Canvas</span>
      </button>
    </div>
  `;

  const inputEl = card.querySelector('.loc-path-input');
  const btnBrowse = card.querySelector('.btn-loc-browse');
  const btnPickFile = card.querySelector('.btn-loc-pick-file');
  const btnConfirm = card.querySelector('.btn-loc-confirm');
  const fileSelectedInfo = card.querySelector('.loc-file-selected-info');
  const presetPills = card.querySelectorAll('.loc-preset-pill');

  // Load last saved target dir from storage if available
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local?.get) {
      chrome.storage.local.get("last_slide_deck_target_dir", (res) => {
        if (res?.last_slide_deck_target_dir && inputEl) {
          inputEl.value = res.last_slide_deck_target_dir;
          setActiveSlideDeckTargetDir(res.last_slide_deck_target_dir);
        }
      });
    }
  } catch (_) {}

  // Handle preset pills
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const p = pill.getAttribute('data-path');
      if (p && inputEl) {
        inputEl.value = p;
        setActiveSlideDeckTargetDir(p);
        presetPills.forEach(pl => pl.style.borderColor = 'rgba(255,255,255,0.12)');
        pill.style.borderColor = '#38BDF8';
        if (typeof showUniversalToast === "function") {
          showUniversalToast(`📁 Lokasi target diubah ke: ${p}`);
        }
      }
    });
  });

  // Handle native folder dialog
  btnBrowse.addEventListener('click', async () => {
    const curVal = inputEl?.value?.trim() || initialDir;
    const rpcFn = (typeof sendNativeRpc === 'function')
      ? sendNativeRpc
      : (typeof window !== 'undefined' && typeof window.sendNativeRpc === 'function' ? window.sendNativeRpc : null);

    if (rpcFn) {
      btnBrowse.disabled = true;
      btnBrowse.innerHTML = `<span>Membuka...</span>`;
      try {
        const res = await rpcFn("select_save_directory_dialog", { initial_dir: curVal });
        if (res?.status === "ok" && res.selected_directory) {
          inputEl.value = res.selected_directory;
          setActiveSlideDeckTargetDir(res.selected_directory);
          if (typeof showUniversalToast === "function") {
            showUniversalToast(`✅ Folder terpilih: ${res.selected_directory}`);
          }
        }
      } catch (err) {
        if (typeof showUniversalToast === "function") {
          showUniversalToast(`❌ Gagal buka dialog folder: ${err.message || String(err)}`);
        }
      } finally {
        btnBrowse.disabled = false;
        btnBrowse.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>Pilih Folder...</span>`;
      }
    } else {
      // Browser fallback (showDirectoryPicker)
      try {
        if (window.showDirectoryPicker) {
          const dirHandle = await window.showDirectoryPicker();
          if (dirHandle && inputEl) {
            inputEl.value = dirHandle.name;
            setActiveSlideDeckTargetDir(dirHandle.name);
          }
        }
      } catch (_) {}
    }
  });

  // Handle native file picker for revision
  btnPickFile.addEventListener('click', async () => {
    const curVal = inputEl?.value?.trim() || initialDir;
    const rpcFn = (typeof sendNativeRpc === 'function')
      ? sendNativeRpc
      : (typeof window !== 'undefined' && typeof window.sendNativeRpc === 'function' ? window.sendNativeRpc : null);

    if (rpcFn) {
      btnPickFile.disabled = true;
      btnPickFile.innerHTML = `<span>Membuka dialog file...</span>`;
      try {
        const res = await rpcFn("select_presentation_file_dialog", { initial_dir: curVal });
        if (res?.status === "ok" && res.selected_file) {
          const filePath = res.selected_file;
          fileSelectedInfo.style.display = 'block';
          fileSelectedInfo.textContent = `✔ Terpilih: ${filePath}`;
          
          // Auto load file to canvas drawer!
          if (typeof executeTool === 'function') {
            executeTool("load_slide_deck_to_canvas", { slug: filePath });
          } else {
            rpcFn("load_slide_deck", { slug: filePath }).then((loadRes) => {
              if (loadRes?.status === "ok" && loadRes.html_content) {
                if (typeof openOpenDesignCanvas === "function") {
                  openOpenDesignCanvas({
                    id: `loaded-${Date.now()}`,
                    type: "slide_deck",
                    html: loadRes.html_content,
                    slideCount: loadRes.slide_count || 1,
                    meta: { title: loadRes.title, slug: loadRes.slug }
                  });
                }
              }
            });
          }

          if (typeof showUniversalToast === "function") {
            showUniversalToast(`📖 Memuat '${filePath.split('/').pop()}' ke Canvas untuk revisi!`);
          }

          // Suggest revision question in prompt
          const chatInput = document.getElementById("chat-input");
          if (chatInput && !chatInput.value.trim()) {
            chatInput.value = `Tolong revisi slide dari file ${filePath.split('/').pop()}: `;
            chatInput.focus();
          }
        }
      } catch (err) {
        if (typeof showUniversalToast === "function") {
          showUniversalToast(`❌ Gagal buka dialog file: ${err.message || String(err)}`);
        }
      } finally {
        btnPickFile.disabled = false;
        btnPickFile.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg><span>📄 Pilih File PDF/HTML Eksisting untuk Direvisi...</span>`;
      }
    }
  });

  // Handle confirm save target
  btnConfirm.addEventListener('click', () => {
    const selectedPath = inputEl?.value?.trim() || initialDir;
    setActiveSlideDeckTargetDir(selectedPath);
    btnConfirm.disabled = true;
    btnConfirm.style.background = '#10B981';
    btnConfirm.innerHTML = `<span>✔ Lokasi Simpan Terkunci</span>`;
    if (typeof showUniversalToast === "function") {
      showUniversalToast(`💾 Lokasi simpan terkunci: ${selectedPath}`);
    }
    if (typeof options.onConfirmSave === "function") {
      options.onConfirmSave(selectedPath);
    }
  });

  containerEl.appendChild(card);
  return card;
}

// Global attachments
if (typeof window !== "undefined") {
  window.renderPresentationLocationCard = renderPresentationLocationCard;
  window.getActiveSlideDeckTargetDir = getActiveSlideDeckTargetDir;
  window.setActiveSlideDeckTargetDir = setActiveSlideDeckTargetDir;
}
