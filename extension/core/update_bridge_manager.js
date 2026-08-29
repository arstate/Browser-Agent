/**
 * Browser Agent - Update & Universal PC Bridge Manager
 * Features:
 * 1. Automatic & On-Demand GitHub Update Checking (arstate/Browser-Agent)
 * 2. 1-Click Auto-Update (Native Host git pull + chrome.runtime.reload)
 * 3. Universal PC Bridge Diagnostic & Fixer Modal (Linux, Windows, macOS)
 * 4. Zero-Emoji High-Contrast Dark Luxury Architecture
 */

(function(global) {
  'use strict';

  class UpdateBridgeManager {
    constructor() {
      this.repoOwner = "arstate";
      this.repoName = "Browser-Agent";
      this.currentVersion = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) 
        ? chrome.runtime.getManifest().version 
        : "2.150.109";
      this.latestVersion = this.currentVersion;
      this.hasUpdate = false;
      this.isChecking = false;
      this.isUpdating = false;
      this.detectedOS = this.detectOS();
      this.pollInterval = null;

      this.init();
    }

    detectOS() {
      if (typeof navigator === 'undefined') return 'linux';
      const ua = (navigator.userAgent || '').toLowerCase();
      const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
      
      if (platform.includes('win') || ua.includes('windows')) return 'windows';
      if (platform.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) return 'mac';
      return 'linux';
    }

    init() {
      // Auto-check updates on startup after 2 seconds
      setTimeout(() => {
        this.checkUpdates(false);
      }, 2000);

      // Bind global event listeners when DOM is ready
      if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.bindUI());
        } else {
          this.bindUI();
        }
      }
    }

    bindUI() {
      this.injectModalsIfNeeded();

      // Check Update Pill click
      const updatePill = document.getElementById('chip-check-update');
      if (updatePill) {
        updatePill.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.hasUpdate) {
            this.openUpdateModal();
          } else {
            this.checkUpdates(true);
          }
        });
      }

      // PC Bridge Chip click (when offline, acts as fix button)
      const pcBridgeChip = document.getElementById('chip-pc-bridge');
      if (pcBridgeChip) {
        pcBridgeChip.addEventListener('click', (e) => {
          if (pcBridgeChip.classList.contains('disconnected') || pcBridgeChip.classList.contains('is-clickable-fix')) {
            e.preventDefault();
            e.stopPropagation();
            this.openFixPCBridgeModal();
          }
        });
      }

      const hostStatusChip = document.getElementById('host-status-indicator');
      if (hostStatusChip) {
        hostStatusChip.addEventListener('click', (e) => {
          if (hostStatusChip.classList.contains('disconnected')) {
            e.preventDefault();
            e.stopPropagation();
            this.openFixPCBridgeModal();
          }
        });
      }
    }

    // Compare semver: returns 1 if v2 > v1, -1 if v2 < v1, 0 if equal
    compareVersions(v1, v2) {
      const p1 = (v1 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
      const p2 = (v2 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
      const maxLen = Math.max(p1.length, p2.length);
      for (let i = 0; i < maxLen; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num2 > num1) return 1;
        if (num2 < num1) return -1;
      }
      return 0;
    }

    async checkUpdates(isManual = false) {
      if (this.isChecking) return;
      this.isChecking = true;

      const updateLabel = document.getElementById('check-update-label');
      const updatePill = document.getElementById('chip-check-update');
      const spinIcon = updatePill?.querySelector('.update-spin-icon');

      if (spinIcon) spinIcon.style.animation = 'spin 0.8s linear infinite';
      if (isManual && updateLabel) updateLabel.innerText = "Memeriksa...";

      try {
        // 1. Fetch remote manifest from GitHub raw master
        const manifestUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/master/extension/manifest.json?_t=${Date.now()}`;
        const res = await fetch(manifestUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const manifestJson = await res.json();
        const remoteVersion = manifestJson.version || this.currentVersion;
        this.latestVersion = remoteVersion;

        const isNewer = this.compareVersions(this.currentVersion, remoteVersion) > 0;

        if (isNewer) {
          this.hasUpdate = true;
          this.updatePillUI(true, `Update v${remoteVersion}`);
          if (isManual) {
            this.openUpdateModal();
          }
        } else {
          this.hasUpdate = false;
          this.updatePillUI(false, `v${this.currentVersion} • Up to Date`);
          if (isManual) {
            this.showToast(`Browser Agent sudah menggunakan versi paling mutakhir (v${this.currentVersion}).`);
          }
        }
      } catch (err) {
        console.warn("[UpdateManager] Error checking updates:", err.message);
        this.updatePillUI(false, `v${this.currentVersion}`);
        if (isManual) {
          this.showToast(`Gagal memeriksa update: ${err.message}`);
        }
      } finally {
        this.isChecking = false;
        if (spinIcon) spinIcon.style.animation = 'none';
      }
    }

    updatePillUI(hasUpdate, text) {
      const updatePill = document.getElementById('chip-check-update');
      const updateLabel = document.getElementById('check-update-label');
      if (!updatePill || !updateLabel) return;

      if (hasUpdate) {
        updatePill.className = 'bento-status-chip chip-update has-update';
        updatePill.title = `Update baru v${this.latestVersion} tersedia! Klik untuk melakukan 1-Klik Auto Update.`;
        updateLabel.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><polyline points="18 15 12 9 6 15"/></svg>${text}`;
      } else {
        updatePill.className = 'bento-status-chip chip-update';
        updatePill.title = `Versi aktif: v${this.currentVersion}. Klik untuk memeriksa update dari GitHub.`;
        updateLabel.innerHTML = `<svg class="update-spin-icon" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>${text}`;
      }
    }

    injectModalsIfNeeded() {
      // 1. Modal Auto Update
      if (!document.getElementById('modal-update-available')) {
        const updateModalHtml = `
          <div id="modal-update-available" class="universal-glass-modal-backdrop" style="display: none;">
            <div class="universal-glass-modal-card">
              <div class="modal-card-header">
                <div class="modal-header-brand">
                  <div class="modal-header-icon update-icon-glow">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </div>
                  <div>
                    <h2 class="modal-header-title">Pembaruan Browser Agent Tersedia</h2>
                    <p class="modal-header-desc">Versi baru siap dipasang secara otomatis ke sistem lokal Anda.</p>
                  </div>
                </div>
                <button type="button" class="btn-modal-close" id="btn-close-update-modal">&times;</button>
              </div>

              <div class="modal-card-body">
                <div class="update-version-comparison">
                  <div class="version-box current-box">
                    <span class="version-label">Versi Saat Ini</span>
                    <span class="version-num" id="modal-current-version">v${this.currentVersion}</span>
                  </div>
                  <div class="version-arrow">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#CEF128" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  <div class="version-box latest-box">
                    <span class="version-label">Versi Terbaru</span>
                    <span class="version-num" id="modal-latest-version">v${this.latestVersion}</span>
                  </div>
                </div>

                <div class="update-changelog-container">
                  <div class="changelog-header">Catatan Rilis &amp; Changelog:</div>
                  <div class="changelog-content" id="modal-changelog-content">
                    Memuat catatan rilis dari GitHub...
                  </div>
                </div>

                <div id="update-progress-bar-container" style="display: none; margin-top: 14px;">
                  <div class="update-progress-status" id="update-progress-status">Menarik update dari GitHub...</div>
                  <div class="update-progress-track">
                    <div class="update-progress-fill" id="update-progress-fill"></div>
                  </div>
                </div>
              </div>

              <div class="modal-card-footer">
                <a href="https://github.com/${this.repoOwner}/${this.repoName}" target="_blank" class="btn-modal-secondary" id="btn-open-github-repo">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                  <span>Buka GitHub</span>
                </a>
                <button type="button" class="btn-modal-primary" id="btn-do-auto-update">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Update Sekarang (1-Klik Auto Pull)</span>
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', updateModalHtml);

        document.getElementById('btn-close-update-modal')?.addEventListener('click', () => {
          document.getElementById('modal-update-available').style.display = 'none';
        });
        document.getElementById('btn-do-auto-update')?.addEventListener('click', () => {
          this.executeAutoUpdate();
        });
      }

      // 2. Modal Universal Fix PC Bridge
      if (!document.getElementById('modal-fix-pc-bridge')) {
        const fixModalHtml = `
          <div id="modal-fix-pc-bridge" class="universal-glass-modal-backdrop" style="display: none;">
            <div class="universal-glass-modal-card fix-pc-bridge-card">
              <div class="modal-card-header">
                <div class="modal-header-brand">
                  <div class="modal-header-icon fix-icon-glow">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  </div>
                  <div>
                    <h2 class="modal-header-title">Universal PC Bridge Quick Fix</h2>
                    <p class="modal-header-desc">Hubungkan kembali daemon lokal Chrome Native Messaging di sistem operasi Anda.</p>
                  </div>
                </div>
                <button type="button" class="btn-modal-close" id="btn-close-fix-bridge-modal">&times;</button>
              </div>

              <div class="modal-card-body">
                <!-- OS Selector Tabs -->
                <div class="fix-os-tabs-bar">
                  <button type="button" class="fix-os-tab ${this.detectedOS === 'linux' ? 'active' : ''}" data-os="linux" id="tab-os-linux">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg>
                    <span>Linux / Ubuntu</span>
                  </button>
                  <button type="button" class="fix-os-tab ${this.detectedOS === 'windows' ? 'active' : ''}" data-os="windows" id="tab-os-windows">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 4 10 3 10 11 3 11 3 4"/><polygon points="11 3 21 2 21 11 11 11 11 3"/><polygon points="3 13 10 13 10 21 3 20 3 13"/><polygon points="11 13 21 13 21 22 11 21 11 13"/></svg>
                    <span>Windows (PowerShell)</span>
                  </button>
                  <button type="button" class="fix-os-tab ${this.detectedOS === 'mac' ? 'active' : ''}" data-os="mac" id="tab-os-mac">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/></svg>
                    <span>macOS</span>
                  </button>
                </div>

                <!-- OS Instructions Container -->
                <div class="fix-os-instructions-box">
                  <div id="fix-inst-linux" class="fix-inst-panel" style="${this.detectedOS === 'linux' ? 'display:block;' : 'display:none;'}">
                    <p class="fix-step-desc">Buka terminal di folder repository Browser Agent, lalu jalankan perintah 1-baris ini:</p>
                    <div class="fix-command-box">
                      <code id="cmd-text-linux">./install.sh</code>
                      <button type="button" class="btn-copy-cmd" data-target="cmd-text-linux" title="Salin Perintah">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Salin</span>
                      </button>
                    </div>
                  </div>

                  <div id="fix-inst-windows" class="fix-inst-panel" style="${this.detectedOS === 'windows' ? 'display:block;' : 'display:none;'}">
                    <p class="fix-step-desc">Buka PowerShell / Command Prompt di folder Browser Agent, lalu jalankan:</p>
                    <div class="fix-command-box">
                      <code id="cmd-text-windows">powershell -ExecutionPolicy Bypass -File install_windows.ps1</code>
                      <button type="button" class="btn-copy-cmd" data-target="cmd-text-windows" title="Salin Perintah">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Salin</span>
                      </button>
                    </div>
                  </div>

                  <div id="fix-inst-mac" class="fix-inst-panel" style="${this.detectedOS === 'mac' ? 'display:block;' : 'display:none;'}">
                    <p class="fix-step-desc">Buka Terminal di macOS pada folder Browser Agent, lalu jalankan:</p>
                    <div class="fix-command-box">
                      <code id="cmd-text-mac">bash install_mac.sh</code>
                      <button type="button" class="btn-copy-cmd" data-target="cmd-text-mac" title="Salin Perintah">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Salin</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Live Auto-Detection Status Banner -->
                <div class="fix-live-status-card" id="fix-live-status-banner">
                  <div class="fix-live-dot" id="fix-live-dot"></div>
                  <div class="fix-live-text">
                    <strong id="fix-live-title">Memantau Koneksi PC Bridge...</strong>
                    <span id="fix-live-subtitle">Jalankan installer di atas. Sistem mendeteksi koneksi secara otomatis.</span>
                  </div>
                </div>
              </div>

              <div class="modal-card-footer">
                <button type="button" class="btn-modal-secondary" id="btn-retry-pc-bridge">
                  <svg class="retry-spin-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  <span>Cek Ulang Koneksi</span>
                </button>
                <button type="button" class="btn-modal-primary" id="btn-close-fix-modal-ok">
                  <span>Selesai / Tutup</span>
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', fixModalHtml);

        // Bind Fix Modal Events
        document.getElementById('btn-close-fix-bridge-modal')?.addEventListener('click', () => this.closeFixPCBridgeModal());
        document.getElementById('btn-close-fix-modal-ok')?.addEventListener('click', () => this.closeFixPCBridgeModal());
        
        // Tab OS click handler
        document.querySelectorAll('.fix-os-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            document.querySelectorAll('.fix-os-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetOs = tab.getAttribute('data-os');
            document.querySelectorAll('.fix-inst-panel').forEach(p => p.style.display = 'none');
            const targetPanel = document.getElementById(`fix-inst-${targetOs}`);
            if (targetPanel) targetPanel.style.display = 'block';
          });
        });

        // Copy buttons
        document.querySelectorAll('.btn-copy-cmd').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const text = document.getElementById(targetId)?.innerText;
            if (text) {
              navigator.clipboard.writeText(text);
              const label = btn.querySelector('span');
              if (label) {
                const oldText = label.innerText;
                label.innerText = 'Tersalin!';
                setTimeout(() => { label.innerText = oldText; }, 1500);
              }
            }
          });
        });

        // Manual Retry Connection Button
        document.getElementById('btn-retry-pc-bridge')?.addEventListener('click', () => {
          this.testPCBridgeConnection(true);
        });
      }
    }

    openUpdateModal() {
      this.injectModalsIfNeeded();
      const modal = document.getElementById('modal-update-available');
      if (!modal) return;

      document.getElementById('modal-current-version').innerText = `v${this.currentVersion}`;
      document.getElementById('modal-latest-version').innerText = `v${this.latestVersion}`;

      modal.style.display = 'flex';
      this.fetchGitHubChangelog();
    }

    async fetchGitHubChangelog() {
      const changelogEl = document.getElementById('modal-changelog-content');
      if (!changelogEl) return;

      try {
        const res = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits?per_page=4`);
        if (!res.ok) throw new Error("Changelog fetch failed");
        const commits = await res.json();
        
        let html = '<ul class="changelog-list">';
        commits.forEach(c => {
          const msg = c.commit?.message?.split('\n')[0] || 'Pembaruan kode';
          const author = c.commit?.author?.name || 'Developer';
          const date = new Date(c.commit?.author?.date || Date.now()).toLocaleDateString('id-ID');
          html += `<li><strong>${this.escapeHtml(msg)}</strong> <span class="commit-meta">(${date})</span></li>`;
        });
        html += '</ul>';
        changelogEl.innerHTML = html;
      } catch(e) {
        changelogEl.innerHTML = `<p style="color:#94a3b8; font-size:12px;">Pembaruan arsitektur terbaru, perbaikan performa, sinkronisasi model AI &amp; persistent memory.</p>`;
      }
    }

    async executeAutoUpdate() {
      if (this.isUpdating) return;
      this.isUpdating = true;

      const progressContainer = document.getElementById('update-progress-bar-container');
      const progressStatus = document.getElementById('update-progress-status');
      const progressFill = document.getElementById('update-progress-fill');
      const btnUpdate = document.getElementById('btn-do-auto-update');

      if (progressContainer) progressContainer.style.display = 'block';
      if (btnUpdate) {
        btnUpdate.disabled = true;
        btnUpdate.textContent = "Sedang Memperbarui...";
      }

      const setProgress = (percent, msg) => {
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressStatus) progressStatus.innerText = msg;
      };

      setProgress(25, "Menghubungi Native Host PC Bridge...");

      try {
        // Step 1: Send auto-update RPC to native host
        let updateSuccess = false;
        let updateMsg = "";

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendNativeMessage) {
          try {
            const resp = await new Promise((resolve) => {
              chrome.runtime.sendNativeMessage('com.antigravity.chrome.agent', { action: 'auto_update' }, (r) => {
                resolve(r || null);
              });
            });

            if (resp && resp.status === 'ok') {
              updateSuccess = true;
              updateMsg = resp.output || "Git pull berhasil.";
            }
          } catch(e) {}
        }

        // Fallback via run_command if direct RPC returned unhandled
        if (!updateSuccess) {
          setProgress(50, "Menjalankan git pull origin master...");
          const runRes = await new Promise((resolve) => {
            chrome.runtime.sendNativeMessage('com.antigravity.chrome.agent', { 
              action: 'run_command', 
              command: 'git pull origin master && python3 build_crx.py' 
            }, (r) => resolve(r || null));
          });
          if (runRes && runRes.status === 'ok' && runRes.exit_code === 0) {
            updateSuccess = true;
          }
        }

        if (updateSuccess) {
          setProgress(85, "Sinkronisasi selesai! Memuat ulang ekstensi...");
          setTimeout(() => {
            setProgress(100, "Update Berhasil! Refreshing...");
            setTimeout(() => {
              if (chrome.runtime?.reload) {
                chrome.runtime.reload();
              } else {
                location.reload();
              }
            }, 800);
          }, 800);
        } else {
          // If PC Bridge is offline, download the latest CRX directly
          setProgress(70, "PC Bridge offline, mengunduh file release terbaru...");
          const downloadUrl = `https://github.com/${this.repoOwner}/${this.repoName}/releases/latest/download/extension.crx`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = 'extension.crx';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setProgress(100, "Berkas extension.crx berhasil diunduh ke folder Downloads.");
          setTimeout(() => {
            this.showToast("Silakan buka chrome://extensions dan drag file extension.crx untuk memasang.");
          }, 1500);
        }
      } catch (err) {
        setProgress(100, `Gagal update: ${err.message}`);
      } finally {
        this.isUpdating = false;
        if (btnUpdate) {
          btnUpdate.disabled = false;
          btnUpdate.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Update Selesai</span>`;
        }
      }
    }

    openFixPCBridgeModal() {
      this.injectModalsIfNeeded();
      const modal = document.getElementById('modal-fix-pc-bridge');
      if (!modal) return;

      modal.style.display = 'flex';
      this.startPCBridgePolling();
    }

    closeFixPCBridgeModal() {
      const modal = document.getElementById('modal-fix-pc-bridge');
      if (modal) modal.style.display = 'none';
      this.stopPCBridgePolling();
    }

    startPCBridgePolling() {
      this.stopPCBridgePolling();
      this.testPCBridgeConnection(false);
      this.pollInterval = setInterval(() => {
        this.testPCBridgeConnection(false);
      }, 2500);
    }

    stopPCBridgePolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }

    async testPCBridgeConnection(isManual = false) {
      const liveDot = document.getElementById('fix-live-dot');
      const liveTitle = document.getElementById('fix-live-title');
      const liveSubtitle = document.getElementById('fix-live-subtitle');
      const btnRetry = document.getElementById('btn-retry-pc-bridge');
      const spinIcon = btnRetry?.querySelector('.retry-spin-icon');

      if (spinIcon) spinIcon.style.animation = 'spin 0.8s linear infinite';

      try {
        let isConnected = false;
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendNativeMessage) {
          const resp = await new Promise((resolve) => {
            chrome.runtime.sendNativeMessage('com.antigravity.chrome.agent', { action: 'ping' }, (r) => {
              resolve(r || null);
            });
          });
          if (resp && resp.status === 'ok') isConnected = true;
        }

        if (isConnected) {
          if (liveDot) {
            liveDot.className = 'fix-live-dot connected';
            liveDot.style.background = '#10B981';
            liveDot.style.boxShadow = '0 0 12px #10B981';
          }
          if (liveTitle) {
            liveTitle.innerHTML = '<span style="color: #34d399; font-weight: 700;">PC Bridge Berhasil Terhubung!</span>';
          }
          if (liveSubtitle) {
            liveSubtitle.innerText = 'Daemon native host aktif dan tersinkronisasi. Menutup jendela otomatis...';
          }

          // Update header chips
          const pcChip = document.getElementById('chip-pc-bridge');
          const pcText = document.getElementById('pc-bridge-text');
          if (pcChip) pcChip.className = 'bento-status-chip chip-dark connected';
          if (pcText) pcText.textContent = 'Online';

          const hostChip = document.getElementById('host-status-indicator');
          const hostText = document.getElementById('host-status-text');
          if (hostChip) hostChip.className = 'bento-status-chip chip-dark connected';
          if (hostText) hostText.textContent = 'PC Bridge: Online';

          this.stopPCBridgePolling();
          setTimeout(() => {
            this.closeFixPCBridgeModal();
            this.showToast("PC Bridge siap digunakan!");
          }, 1500);
        } else {
          if (liveDot) {
            liveDot.className = 'fix-live-dot disconnected';
            liveDot.style.background = '#EF4444';
            liveDot.style.boxShadow = 'none';
          }
          if (liveTitle) {
            liveTitle.innerHTML = '<span style="color: #F87171;">PC Bridge Belum Terdeteksi</span>';
          }
          if (liveSubtitle) {
            liveSubtitle.innerText = 'Jalankan perintah instalasi di atas pada terminal Anda.';
          }
        }
      } catch (err) {
        console.warn("[PCBridgeFix] Test error:", err.message);
      } finally {
        if (spinIcon) spinIcon.style.animation = 'none';
      }
    }

    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'universal-action-toast';
      toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
  }

  // Expose globally
  global.updateBridgeManager = new UpdateBridgeManager();

})(typeof window !== 'undefined' ? window : this);
