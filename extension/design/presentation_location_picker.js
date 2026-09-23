// =========================================================================
// PRESENTATION LOCATION PICKER & REVISION MANAGER (In-Chat Interactive Card)
// Allows selecting target save folder or existing presentation files to revise
// Supports Smart Proposal Confirmation Flow (Confirm Folder / Change Folder / Pick Existing)
// =========================================================================

const DEFAULT_PRESENTATIONS_DIR = "~/.browser-agent/presentations";
const DATASET_TRAINING_DIR = "/mnt/DATA/FILE/DJADI CREATIVE/DATA BRAND/DATASET TRAINING/PDF SLIDE DECK";
const DOWNLOADS_DIR = "~/Downloads";

function safeEscapeHtml(str) {
  if (typeof escapeHtml === "function") return escapeHtml(str);
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

  const topic = options.topic || options.proposedTitle || "Presentasi Slide Deck 16:9";
  const initialDir = options.initialDir || options.defaultDir || getActiveSlideDeckTargetDir() || DEFAULT_PRESENTATIONS_DIR;

  const card = document.createElement('div');
  card.className = 'presentation-loc-card';
  card.style.cssText = `
    margin: 12px 0;
    padding: 16px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
    border: 1px solid rgba(56, 189, 248, 0.28);
    border-radius: 14px;
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
  `;

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">📁</span>
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; color: #38BDF8; text-transform: uppercase;">
          KONFIRMASI LOKASI SIMPAN SLIDE DECK
        </span>
      </div>
      <span style="font-size: 10px; color: #94A3B8; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 10px; font-weight: 600;">
        Smart Proposal
      </span>
    </div>

    <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
      <span style="color: #60A5FA;">🎯</span>
      <span>${safeEscapeHtml(topic)}</span>
    </div>

    <div class="loc-existing-notice" style="display: none; margin-bottom: 12px; padding: 10px 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px;">
    </div>

    <!-- State 1: Proposal View (Default) -->
    <div class="loc-proposal-section" style="display: block;">
      <div style="font-size: 12px; color: #CBD5E1; margin-bottom: 6px; line-height: 1.5;">
        Saya akan menggunakan folder ini untuk menyimpan slide deck:
      </div>
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding: 8px 10px; background: rgba(0,0,0,0.35); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px;">
        <span style="font-size: 14px;">📂</span>
        <span class="loc-active-dir-badge" style="font-size: 11px; font-family: monospace; color: #38BDF8; font-weight: 600; word-break: break-all;">
          ${safeEscapeHtml(initialDir)}
        </span>
      </div>
      <div style="font-size: 12px; font-weight: 600; color: #F1F5F9; margin-bottom: 12px; line-height: 1.4;">
        Apakah Anda ingin langsung lanjut di folder ini, atau ingin memilih lokasi folder simpan yang berbeda?
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button type="button" class="btn-proposal-continue"
          style="width: 100%; padding: 10px 14px; background: linear-gradient(135deg, #059669, #0284C7); border: none; border-radius: 8px; color: #FFFFFF; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); transition: all 0.2s ease;">
          <span>🚀 Ya, Langsung Lanjut di Folder Ini</span>
        </button>

        <button type="button" class="btn-proposal-change-folder"
          style="width: 100%; padding: 9px 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; color: #38BDF8; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
          <span>📁 Pilih Lokasi Folder Simpan yang Berbeda...</span>
        </button>

        <button type="button" class="btn-proposal-pick-file"
          style="width: 100%; padding: 8px 12px; background: rgba(16, 185, 129, 0.08); border: 1px dashed rgba(16, 185, 129, 0.35); border-radius: 8px; color: #34D399; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>📄 Pilih File PDF/HTML Eksisting untuk Direvisi...</span>
        </button>
      </div>
    </div>

    <!-- State 2: Custom Folder Picker View (Hidden initially) -->
    <div class="loc-picker-section" style="display: none;">
      <div style="font-size: 12px; font-weight: 700; color: #38BDF8; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
        <span>📁</span>
        <span>Pilih Folder Mana yang Ingin Anda Gunakan:</span>
      </div>
      <div style="font-size: 11px; color: #94A3B8; margin-bottom: 10px; line-height: 1.4;">
        Ketik path folder di bawah ini atau klik tombol browse untuk memilih folder via dialog OS:
      </div>

      <div style="margin-bottom: 10px;">
        <div style="display: flex; gap: 6px; align-items: center;">
          <input type="text" class="loc-path-input" value="${safeEscapeHtml(initialDir)}" 
            style="flex: 1; padding: 7px 10px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: #F1F5F9; font-size: 11px; font-family: monospace; outline: none;" />
          <button type="button" class="btn-loc-browse" 
            style="padding: 7px 12px; background: #0284C7; border: none; border-radius: 8px; color: #FFFFFF; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>Pilih Folder...</span>
          </button>
        </div>
      </div>

      <div style="font-size: 10px; font-weight: 700; color: #94A3B8; margin-bottom: 5px;">PILIHAN PRESET CEPAT:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px;">
        <button type="button" class="loc-preset-pill" data-path="${safeEscapeHtml(DEFAULT_PRESENTATIONS_DIR)}"
          style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #CBD5E1; font-size: 10px; cursor: pointer;">
          Default (~/.browser-agent)
        </button>
        <button type="button" class="loc-preset-pill" data-path="${safeEscapeHtml(DATASET_TRAINING_DIR)}"
          style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #CBD5E1; font-size: 10px; cursor: pointer;">
          Dataset Training Deck
        </button>
        <button type="button" class="loc-preset-pill" data-path="${safeEscapeHtml(DOWNLOADS_DIR)}"
          style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #CBD5E1; font-size: 10px; cursor: pointer;">
          Downloads
        </button>
      </div>

      <div style="display: flex; gap: 8px; align-items: center;">
        <button type="button" class="btn-picker-confirm"
          style="flex: 1; padding: 9px 14px; background: linear-gradient(135deg, #2563EB, #1D4ED8); border: none; border-radius: 8px; color: #FFFFFF; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
          <span>✔ Gunakan Folder Ini & Lanjutkan</span>
        </button>
        <button type="button" class="btn-picker-back"
          style="padding: 9px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; color: #CBD5E1; font-size: 11px; cursor: pointer;">
          <span>⬅ Kembali</span>
        </button>
      </div>
    </div>

    <!-- Status Feedback (Confirmed or Loaded) -->
    <div class="loc-status-feedback" style="display: none; margin-top: 10px; padding: 10px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; color: #34D399; font-size: 11.5px; font-weight: 700; text-align: center;">
    </div>
  `;

  // Select key elements inside the card
  const proposalSection = card.querySelector('.loc-proposal-section');
  const pickerSection = card.querySelector('.loc-picker-section');
  const activeDirBadge = card.querySelector('.loc-active-dir-badge');
  const inputEl = card.querySelector('.loc-path-input');
  const btnBrowse = card.querySelector('.btn-loc-browse');
  const btnProposalContinue = card.querySelector('.btn-proposal-continue');
  const btnProposalChange = card.querySelector('.btn-proposal-change-folder');
  const btnProposalPickFile = card.querySelector('.btn-proposal-pick-file');
  const btnPickerConfirm = card.querySelector('.btn-picker-confirm');
  const btnPickerBack = card.querySelector('.btn-picker-back');
  const statusFeedback = card.querySelector('.loc-status-feedback');
  const existingNoticeEl = card.querySelector('.loc-existing-notice');
  const presetPills = card.querySelectorAll('.loc-preset-pill');

  // Load last saved target dir from storage if available
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local?.get) {
      chrome.storage.local.get("last_slide_deck_target_dir", (res) => {
        if (res?.last_slide_deck_target_dir) {
          const storedDir = res.last_slide_deck_target_dir;
          if (inputEl) inputEl.value = storedDir;
          if (activeDirBadge) activeDirBadge.textContent = storedDir;
          setActiveSlideDeckTargetDir(storedDir);
        }
      });
    }
  } catch (_) {}

  // Helper to complete confirmation and trigger agent
  const handleConfirmAndProceed = (targetDir) => {
    setActiveSlideDeckTargetDir(targetDir);
    if (typeof window !== "undefined") {
      window.__hasConfirmedDeckSaveLocation = true;
    }
    if (proposalSection) proposalSection.style.display = 'none';
    if (pickerSection) pickerSection.style.display = 'none';
    if (existingNoticeEl) existingNoticeEl.style.display = 'none';
    if (statusFeedback) {
      statusFeedback.style.display = 'block';
      statusFeedback.innerHTML = `<span>✔ Lokasi Simpan Terkunci: <b>${safeEscapeHtml(targetDir)}</b></span>`;
    }

    if (typeof showUniversalToast === "function") {
      showUniversalToast(`💾 Lokasi simpan terkunci: ${targetDir}`);
    }
    if (typeof options.onConfirmSave === "function") {
      options.onConfirmSave(targetDir);
    }
    if (typeof options.onConfirmed === "function") {
      options.onConfirmed(targetDir);
    }

    // Auto send prompt to chat to resume ReAct agent loop
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.value = `📁 Gunakan folder: ${targetDir}. Silakan lanjutkan perancangan slide deck sekarang.`;
      if (typeof handleSendMessage === "function") {
        setTimeout(() => handleSendMessage(), 100);
      } else {
        const sendBtn = document.getElementById("btn-send");
        if (sendBtn) setTimeout(() => sendBtn.click(), 100);
      }
    }
  };

  // 1. Button "Ya, Langsung Lanjut di Folder Ini"
  if (btnProposalContinue) {
    btnProposalContinue.addEventListener('click', () => {
      const chosenDir = inputEl?.value?.trim() || initialDir;
      handleConfirmAndProceed(chosenDir);
    });
  }

  // 2. Button "Pilih Lokasi Folder Simpan yang Berbeda..."
  if (btnProposalChange) {
    btnProposalChange.addEventListener('click', () => {
      if (proposalSection) proposalSection.style.display = 'none';
      if (pickerSection) {
        pickerSection.style.display = 'block';
        if (inputEl) inputEl.focus();
      }
    });
  }

  // 3. Button "Kembali ke Pertanyaan"
  if (btnPickerBack) {
    btnPickerBack.addEventListener('click', () => {
      if (pickerSection) pickerSection.style.display = 'none';
      if (proposalSection) proposalSection.style.display = 'block';
    });
  }

  // 4. Button "Gunakan Folder Ini & Lanjutkan" inside picker
  if (btnPickerConfirm) {
    btnPickerConfirm.addEventListener('click', () => {
      const chosenDir = inputEl?.value?.trim() || initialDir;
      handleConfirmAndProceed(chosenDir);
    });
  }

  // 5. Handle preset pills
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const p = pill.getAttribute('data-path');
      if (p) {
        if (inputEl) inputEl.value = p;
        if (activeDirBadge) activeDirBadge.textContent = p;
        setActiveSlideDeckTargetDir(p);
        presetPills.forEach(pl => pl.style.borderColor = 'rgba(255,255,255,0.12)');
        pill.style.borderColor = '#38BDF8';
        if (typeof showUniversalToast === "function") {
          showUniversalToast(`📁 Lokasi target diubah ke: ${p}`);
        }
      }
    });
  });

  // 6. Handle native folder dialog
  if (btnBrowse) {
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
            if (inputEl) inputEl.value = res.selected_directory;
            if (activeDirBadge) activeDirBadge.textContent = res.selected_directory;
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
        // Fallback
        try {
          if (window.showDirectoryPicker) {
            const dirHandle = await window.showDirectoryPicker();
            if (dirHandle && inputEl) {
              inputEl.value = dirHandle.name;
              if (activeDirBadge) activeDirBadge.textContent = dirHandle.name;
              setActiveSlideDeckTargetDir(dirHandle.name);
            }
          }
        } catch (_) {}
      }
    });
  }

  // 7. Handle native file picker for revision
  if (btnProposalPickFile) {
    btnProposalPickFile.addEventListener('click', async () => {
      const curVal = inputEl?.value?.trim() || initialDir;
      const rpcFn = (typeof sendNativeRpc === 'function')
        ? sendNativeRpc
        : (typeof window !== 'undefined' && typeof window.sendNativeRpc === 'function' ? window.sendNativeRpc : null);

      if (rpcFn) {
        btnProposalPickFile.disabled = true;
        btnProposalPickFile.innerHTML = `<span>Membuka dialog file...</span>`;
        try {
          const res = await rpcFn("select_presentation_file_dialog", { initial_dir: curVal });
          if (res?.status === "ok" && res.selected_file) {
            const filePath = res.selected_file;
            if (proposalSection) proposalSection.style.display = 'none';
            if (pickerSection) pickerSection.style.display = 'none';
            if (existingNoticeEl) existingNoticeEl.style.display = 'none';
            if (statusFeedback) {
              statusFeedback.style.display = 'block';
              statusFeedback.innerHTML = `<span>✔ File Terpilih: <b>${safeEscapeHtml(filePath.split('/').pop())}</b></span>`;
            }
            
            // Auto load file to canvas drawer
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

            if (typeof window !== "undefined") {
              window.__hasConfirmedDeckSaveLocation = true;
            }

            if (typeof showUniversalToast === "function") {
              showUniversalToast(`📖 Memuat '${filePath.split('/').pop()}' ke Canvas untuk revisi!`);
            }

            // Auto send prompt to chat
            const chatInput = document.getElementById("chat-input");
            if (chatInput) {
              chatInput.value = `📄 Tolong muat dan revisi slide dari file: ${filePath}. Silakan periksa slide yang perlu disempurnakan.`;
              if (typeof handleSendMessage === "function") {
                setTimeout(() => handleSendMessage(), 100);
              } else {
                const sendBtn = document.getElementById("btn-send");
                if (sendBtn) setTimeout(() => sendBtn.click(), 100);
              }
            }
          }
        } catch (err) {
          if (typeof showUniversalToast === "function") {
            showUniversalToast(`❌ Gagal buka dialog file: ${err.message || String(err)}`);
          }
        } finally {
          btnProposalPickFile.disabled = false;
          btnProposalPickFile.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg><span>📄 Pilih File PDF/HTML Eksisting untuk Direvisi...</span>`;
        }
      }
    });
  }

  // 8. Dynamic check for existing local slide deck
  const rpcFn = (typeof sendNativeRpc === 'function')
    ? sendNativeRpc
    : (typeof window !== 'undefined' && typeof window.sendNativeRpc === 'function' ? window.sendNativeRpc : null);

  if (rpcFn && existingNoticeEl) {
    const cleanTopic = (topic || "").replace(/Presentasi Slide Deck 16:9/i, "").trim();
    rpcFn("list_slide_decks", { query: cleanTopic }).then((res) => {
      if (res?.status === "ok" && Array.isArray(res.decks) && res.decks.length > 0) {
        const topDeck = res.decks[0];
        existingNoticeEl.style.display = 'block';
        existingNoticeEl.innerHTML = `
          <div style="font-size: 11.5px; color: #FCD34D; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>💡</span>
            <span>Saya menemukan slide deck yang sudah ada di folder ini: <b>${safeEscapeHtml(topDeck.title || topDeck.slug)}</b> (${topDeck.slide_count || 1} slide)</span>
          </div>
          <button type="button" class="btn-proposal-open-found"
            style="width: 100%; padding: 7px 12px; background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 7px; color: #FBBF24; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>📄 Buka & Revisi Deck Ini di Canvas</span>
          </button>
        `;
        const btnOpenFound = existingNoticeEl.querySelector('.btn-proposal-open-found');
        if (btnOpenFound) {
          btnOpenFound.addEventListener('click', () => {
            if (proposalSection) proposalSection.style.display = 'none';
            if (pickerSection) pickerSection.style.display = 'none';
            if (existingNoticeEl) existingNoticeEl.style.display = 'none';
            if (statusFeedback) {
              statusFeedback.style.display = 'block';
              statusFeedback.innerHTML = `<span>✔ Membuka Deck: <b>${safeEscapeHtml(topDeck.title || topDeck.slug)}</b></span>`;
            }
            if (typeof window !== "undefined") {
              window.__hasConfirmedDeckSaveLocation = true;
            }
            if (typeof executeTool === 'function') {
              executeTool("load_slide_deck_to_canvas", { slug: topDeck.slug });
            }
            const chatInput = document.getElementById("chat-input");
            if (chatInput) {
              chatInput.value = `📄 Tolong muat dan revisi slide dari deck: ${topDeck.title || topDeck.slug}. Silakan periksa slide yang perlu disempurnakan.`;
              if (typeof handleSendMessage === "function") {
                setTimeout(() => handleSendMessage(), 100);
              } else {
                const sendBtn = document.getElementById("btn-send");
                if (sendBtn) setTimeout(() => sendBtn.click(), 100);
              }
            }
          });
        }
      }
    }).catch(() => {});
  }

  containerEl.appendChild(card);
  return card;
}

// Global attachments
if (typeof window !== "undefined") {
  window.renderPresentationLocationCard = renderPresentationLocationCard;
  window.getActiveSlideDeckTargetDir = getActiveSlideDeckTargetDir;
  window.setActiveSlideDeckTargetDir = setActiveSlideDeckTargetDir;
}
