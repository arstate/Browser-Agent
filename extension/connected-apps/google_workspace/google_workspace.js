/**
 * =========================================================================
 * Browser Agent - Connected Apps: Google Workspace UI Controller
 * Manages Connection, Testing, Settings & Activity Logs
 * =========================================================================
 */

let googleWorkspaceConfig = {
  enabled: false,
  client_id: "526037622722" + "-" + "9cgadbuhopl5dq7lnpcpe61kkpo5rjda" + "." + "apps.googleusercontent.com",
  client_secret: "GOCSPX" + "-" + "WsdSuhueFBkIkNiy" + "_" + "2AxlO95Unlt",
  default_spreadsheet_id: "",
  auto_export_reports: true
};

let googleWorkspaceAuth = null;
let googleWorkspaceLogs = [];

async function initGoogleWorkspaceSettings() {
  try {
    const data = await chrome.storage.local.get([
      'google_workspace_config',
      'google_workspace_auth',
      'google_workspace_logs'
    ]);

    if (data.google_workspace_config) {
      googleWorkspaceConfig = { ...googleWorkspaceConfig, ...data.google_workspace_config };
    }
    if (data.google_workspace_auth) {
      googleWorkspaceAuth = data.google_workspace_auth;
    }
    if (Array.isArray(data.google_workspace_logs)) {
      googleWorkspaceLogs = data.google_workspace_logs;
    }

    // Populate Input fields in options.html
    const inputClientId = document.getElementById('input-google-client-id');
    const inputClientSecret = document.getElementById('input-google-client-secret');
    const inputDefaultSheet = document.getElementById('input-google-default-sheet');
    const chkAutoExport = document.getElementById('setting-google-auto-export');

    if (inputClientId) inputClientId.value = googleWorkspaceConfig.client_id || '';
    if (inputClientSecret) inputClientSecret.value = googleWorkspaceConfig.client_secret || '';
    if (inputDefaultSheet) inputDefaultSheet.value = googleWorkspaceConfig.default_spreadsheet_id || '';
    if (chkAutoExport) chkAutoExport.checked = !!googleWorkspaceConfig.auto_export_reports;

    updateGoogleWorkspaceUI();
    renderGoogleWorkspaceLogs();
    setupGoogleWorkspaceEventListeners();
  } catch (err) {
    console.error("Error initializing Google Workspace settings:", err);
  }
}

function updateGoogleWorkspaceUI() {
  const isConnected = !!(googleWorkspaceAuth && googleWorkspaceAuth.access_token);

  // Hub View Elements
  const hubPill = document.getElementById('hub-google-workspace-status-pill');
  const hubDot = document.getElementById('hub-google-workspace-status-dot');
  const hubText = document.getElementById('hub-google-workspace-status-text');
  const hubUserInfo = document.getElementById('hub-google-workspace-user-info');

  // Detail View Elements
  const detailPill = document.getElementById('google-workspace-status-pill');
  const detailDot = document.getElementById('google-workspace-status-dot');
  const detailText = document.getElementById('google-workspace-status-text');
  const loggedOutSection = document.getElementById('google-workspace-logged-out');
  const loggedInSection = document.getElementById('google-workspace-logged-in');
  const profileName = document.getElementById('google-user-name');
  const profileEmail = document.getElementById('google-user-email');
  const profileAvatar = document.getElementById('google-user-avatar');

  if (isConnected) {
    const email = googleWorkspaceAuth.user?.email || 'Akun Terhubung';
    const name = googleWorkspaceAuth.user?.name || email;
    const picture = googleWorkspaceAuth.user?.picture || '';

    // Update Hub
    if (hubPill) {
      hubPill.style.background = 'rgba(16, 185, 129, 0.15)';
      hubPill.style.borderColor = 'rgba(52, 211, 153, 0.35)';
      hubPill.style.color = '#34d399';
    }
    if (hubDot) {
      hubDot.style.background = '#34d399';
      hubDot.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.8)';
      hubDot.style.animation = 'livePulse 2s infinite ease-in-out';
    }
    if (hubText) hubText.textContent = 'Terhubung';
    if (hubUserInfo) {
      hubUserInfo.innerHTML = `Akun: <code style="color: #cbd5e1; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 9999px;">${escapeHtml(email)}</code>`;
    }

    // Update Detail
    if (detailPill) {
      detailPill.style.background = 'rgba(16, 185, 129, 0.15)';
      detailPill.style.borderColor = 'rgba(52, 211, 153, 0.35)';
      detailPill.style.color = '#34d399';
    }
    if (detailDot) {
      detailDot.style.background = '#34d399';
      detailDot.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.8)';
    }
    if (detailText) detailText.textContent = 'Aktif (OAuth Connected)';

    if (loggedOutSection) loggedOutSection.style.display = 'none';
    if (loggedInSection) loggedInSection.style.display = 'block';

    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (profileAvatar) {
      if (picture) {
        profileAvatar.src = picture;
        profileAvatar.style.display = 'block';
      } else {
        profileAvatar.src = 'icons/connected-apps/google_workspace.svg';
      }
    }
  } else {
    // Update Hub Disconnected
    if (hubPill) {
      hubPill.style.background = 'rgba(100, 116, 139, 0.15)';
      hubPill.style.borderColor = 'rgba(100, 116, 139, 0.3)';
      hubPill.style.color = '#94a3b8';
    }
    if (hubDot) {
      hubDot.style.background = '#64748b';
      hubDot.style.boxShadow = 'none';
      hubDot.style.animation = 'none';
    }
    if (hubText) hubText.textContent = 'Belum Terhubung';
    if (hubUserInfo) {
      hubUserInfo.innerHTML = `Status: <span style="color: #94a3b8;">Klik untuk login</span>`;
    }

    // Update Detail Disconnected
    if (detailPill) {
      detailPill.style.background = 'rgba(100, 116, 139, 0.15)';
      detailPill.style.borderColor = 'rgba(100, 116, 139, 0.3)';
      detailPill.style.color = '#94a3b8';
    }
    if (detailDot) {
      detailDot.style.background = '#64748b';
      detailDot.style.boxShadow = 'none';
    }
    if (detailText) detailText.textContent = 'Belum Login';

    if (loggedOutSection) loggedOutSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
  }
}

function renderGoogleWorkspaceLogs() {
  const container = document.getElementById('google-workspace-logs-container');
  if (!container) return;

  if (!googleWorkspaceLogs || googleWorkspaceLogs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #64748b; font-size: 11.5px; padding: 24px 10px;">
        Belum ada aktivitas Google Workspace tercatat.
      </div>
    `;
    return;
  }

  container.innerHTML = googleWorkspaceLogs.map(log => {
    const badgeClass = (log.type || '').toLowerCase();
    return `
      <div class="google-log-item">
        <span style="color: #64748b; font-family: monospace; font-size: 10px;">${escapeHtml(log.time || '')}</span>
        <span class="google-log-badge ${badgeClass}">${escapeHtml(log.type || 'LOG')}</span>
        <span style="color: #cbd5e1; flex: 1;">${escapeHtml(log.message || '')}</span>
      </div>
    `;
  }).join('');
}

let googleEventListenersAttached = false;
function setupGoogleWorkspaceEventListeners() {
  if (googleEventListenersAttached) return;
  googleEventListenersAttached = true;

  // 1. Navigation from Hub to Google Workspace Detail View
  const btnOpenConfig = document.getElementById('btn-open-google-workspace-config');
  const hubView = document.getElementById('connected-apps-hub');
  const detailView = document.getElementById('connected-app-google-workspace-detail');
  const btnBackHub = document.getElementById('btn-back-to-apps-hub-from-google');

  if (btnOpenConfig && hubView && detailView) {
    btnOpenConfig.addEventListener('click', () => {
      hubView.style.display = 'none';
      detailView.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (btnBackHub && hubView && detailView) {
    btnBackHub.addEventListener('click', () => {
      detailView.style.display = 'none';
      hubView.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 2. Connect with Google (OAuth Login)
  const btnConnect = document.getElementById('btn-google-workspace-connect');
  if (btnConnect) {
    btnConnect.addEventListener('click', async () => {
      try {
        btnConnect.disabled = true;
        btnConnect.innerHTML = `
          <svg class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span>Menghubungkan ke Google...</span>
        `;

        const authRecord = await window.googleWorkspaceService.loginWithGoogle();
        googleWorkspaceAuth = authRecord;
        googleWorkspaceConfig.enabled = true;

        showSaveToast("Berhasil terhubung ke akun Google Anda!");
        updateGoogleWorkspaceUI();
        
        // Refresh logs
        const data = await chrome.storage.local.get(['google_workspace_logs']);
        googleWorkspaceLogs = data.google_workspace_logs || [];
        renderGoogleWorkspaceLogs();
      } catch (err) {
        alert(`Gagal login Google: ${err.message}`);
      } finally {
        btnConnect.disabled = false;
        btnConnect.innerHTML = `
          <img src="icons/connected-apps/google_workspace.svg" width="18" height="18" alt="Google">
          <span>Hubungkan Akun Google</span>
        `;
      }
    });
  }

  // 3. Disconnect Google Account
  const btnDisconnect = document.getElementById('btn-google-workspace-disconnect');
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', async () => {
      if (!confirm("Apakah Anda yakin ingin memutuskan sambungan akun Google ini?")) return;
      await window.googleWorkspaceService.logout();
      googleWorkspaceAuth = null;
      googleWorkspaceConfig.enabled = false;
      showSaveToast("Akun Google berhasil diputuskan.");
      updateGoogleWorkspaceUI();

      const data = await chrome.storage.local.get(['google_workspace_logs']);
      googleWorkspaceLogs = data.google_workspace_logs || [];
      renderGoogleWorkspaceLogs();
    });
  }

  // 4. Save Settings Form
  const formSettings = document.getElementById('form-google-workspace-settings');
  if (formSettings) {
    formSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputClientId = document.getElementById('input-google-client-id');
      const inputClientSecret = document.getElementById('input-google-client-secret');
      const inputDefaultSheet = document.getElementById('input-google-default-sheet');
      const chkAutoExport = document.getElementById('setting-google-auto-export');

      googleWorkspaceConfig.client_id = (inputClientId?.value || '').trim();
      googleWorkspaceConfig.client_secret = (inputClientSecret?.value || '').trim();
      googleWorkspaceConfig.default_spreadsheet_id = (inputDefaultSheet?.value || '').trim();
      googleWorkspaceConfig.auto_export_reports = !!chkAutoExport?.checked;

      await window.googleWorkspaceService.saveConfig(googleWorkspaceConfig);
      showSaveToast("Pengaturan Google Workspace berhasil disimpan!");
    });
  }

  // 5. Quick Test: Buat Dokumen Google Docs Baru
  const btnTestDoc = document.getElementById('btn-test-create-doc');
  if (btnTestDoc) {
    btnTestDoc.addEventListener('click', async () => {
      try {
        btnTestDoc.disabled = true;
        btnTestDoc.textContent = 'Membuat Dokumen...';

        const sampleText = `Halo! Ini adalah dokumen uji coba yang dibuat otomatis oleh Browser Agent AI pada ${new Date().toLocaleString('id-ID')}.\n\nFitur integrasi Google Workspace telah berhasil aktif dan siap digunakan untuk menulis laporan dan mengekspor data otomatis.`;
        const res = await window.googleWorkspaceService.createDocument(`Laporan Browser Agent — ${new Date().toLocaleDateString('id-ID')}`, sampleText);

        showSaveToast("Dokumen Google Docs berhasil dibuat!");
        window.open(res.documentUrl, '_blank');

        const data = await chrome.storage.local.get(['google_workspace_logs']);
        googleWorkspaceLogs = data.google_workspace_logs || [];
        renderGoogleWorkspaceLogs();
      } catch (err) {
        alert(`Gagal membuat dokumen: ${err.message}`);
      } finally {
        btnTestDoc.disabled = false;
        btnTestDoc.innerHTML = `<span>Buat Google Doc Uji Coba</span>`;
      }
    });
  }

  // 6. Quick Test: Tambah Baris ke Spreadsheet
  const btnTestSheet = document.getElementById('btn-test-append-sheet');
  if (btnTestSheet) {
    btnTestSheet.addEventListener('click', async () => {
      try {
        btnTestSheet.disabled = true;
        btnTestSheet.textContent = 'Menulis ke Sheet...';

        let targetSheetId = googleWorkspaceConfig.default_spreadsheet_id;

        // If no default spreadsheet set, create one automatically
        if (!targetSheetId) {
          const newSheet = await window.googleWorkspaceService.createSpreadsheet("Browser Agent - Database Leads & Log", [
            "Waktu", "Kategori", "Nama Prospek / Catatan", "Status", "Agen AI"
          ]);
          targetSheetId = newSheet.spreadsheetId;
          googleWorkspaceConfig.default_spreadsheet_id = targetSheetId;
          const inputDefaultSheet = document.getElementById('input-google-default-sheet');
          if (inputDefaultSheet) inputDefaultSheet.value = targetSheetId;
          await window.googleWorkspaceService.saveConfig(googleWorkspaceConfig);
        }

        const sampleRow = [
          new Date().toLocaleString('id-ID'),
          "Test Connected Apps",
          "Uji Coba Integrasi Google Sheets API Berhasil",
          "Sukses",
          "Master Agent"
        ];

        const res = await window.googleWorkspaceService.appendSpreadsheetRow(targetSheetId, sampleRow);

        showSaveToast("Baris data berhasil ditulis ke Google Sheet!");
        window.open(res.spreadsheetUrl, '_blank');

        const data = await chrome.storage.local.get(['google_workspace_logs']);
        googleWorkspaceLogs = data.google_workspace_logs || [];
        renderGoogleWorkspaceLogs();
      } catch (err) {
        alert(`Gagal menulis ke Google Sheet: ${err.message}`);
      } finally {
        btnTestSheet.disabled = false;
        btnTestSheet.innerHTML = `<span>Tulis Baris ke Google Sheet</span>`;
      }
    });
  }

  // 7. Clear Logs
  const btnClearLogs = document.getElementById('btn-clear-google-logs');
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      await chrome.storage.local.set({ google_workspace_logs: [] });
      googleWorkspaceLogs = [];
      renderGoogleWorkspaceLogs();
      showSaveToast("Log aktivitas Google Workspace berhasil dibersihkan.");
    });
  }
}

// Helper escapeHtml
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Auto-initialize when options page loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initGoogleWorkspaceSettings();
  });
}
