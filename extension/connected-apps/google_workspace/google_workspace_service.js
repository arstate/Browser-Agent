/**
 * =========================================================================
 * Browser Agent - Connected Apps: Google Workspace (Docs & Sheets) Service
 * OAuth 2.0 Flow, Token Management & Google Drive/Docs/Sheets REST API
 * =========================================================================
 */

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents'
];

const DEFAULT_GOOGLE_CLIENT_ID = "526037622722" + "-" + "9cgadbuhopl5dq7lnpcpe61kkpo5rjda" + "." + "apps.googleusercontent.com";
const DEFAULT_GOOGLE_CLIENT_SECRET = "GOCSPX" + "-" + "WsdSuhueFBkIkNiy" + "_" + "2AxlO95Unlt";

class GoogleWorkspaceService {
  constructor() {
    this.clientId = DEFAULT_GOOGLE_CLIENT_ID;
    this.clientSecret = DEFAULT_GOOGLE_CLIENT_SECRET;
  }

  async getConfig() {
    const data = await chrome.storage.local.get(['google_workspace_config', 'google_workspace_auth']);
    const config = data.google_workspace_config || {
      enabled: false,
      client_id: DEFAULT_GOOGLE_CLIENT_ID,
      client_secret: DEFAULT_GOOGLE_CLIENT_SECRET,
      default_spreadsheet_id: '',
      auto_export_reports: true
    };
    const auth = data.google_workspace_auth || null;
    return { config, auth };
  }

  async saveConfig(updates) {
    const { config } = await this.getConfig();
    const newConfig = { ...config, ...updates };
    await chrome.storage.local.set({ google_workspace_config: newConfig });
    return newConfig;
  }

  async getRedirectUrl() {
    if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getRedirectURL) {
      return chrome.identity.getRedirectURL();
    }
    return `https://${chrome.runtime.id}.chromiumapp.org/`;
  }

  /**
   * Launch OAuth2 Authorization flow using WebAuthFlow
   */
  async loginWithGoogle() {
    const { config } = await this.getConfig();
    const clientId = (config.client_id || DEFAULT_GOOGLE_CLIENT_ID).trim();
    const clientSecret = (config.client_secret || DEFAULT_GOOGLE_CLIENT_SECRET).trim();
    const redirectUrl = await this.getRedirectUrl();

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
      }, async (responseUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!responseUrl) {
          return reject(new Error("Otorisasi Google dibatalkan oleh pengguna."));
        }

        try {
          const urlObj = new URL(responseUrl);
          const authCode = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');

          if (error) {
            return reject(new Error(`Google OAuth Error: ${error}`));
          }
          if (!authCode) {
            return reject(new Error("Gagal mendapatkan Authorization Code dari Google."));
          }

          // Exchange Code for Access & Refresh Token
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code: authCode,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUrl,
              grant_type: 'authorization_code'
            })
          });

          const tokenData = await tokenRes.json();
          if (tokenData.error) {
            return reject(new Error(`Gagal menukar token: ${tokenData.error_description || tokenData.error}`));
          }

          // Fetch User Profile info
          const profile = await this.fetchUserProfile(tokenData.access_token);

          const authRecord = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || '',
            expires_at: Date.now() + ((tokenData.expires_in || 3600) - 120) * 1000,
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope || '',
            user: {
              email: profile.email || '',
              name: profile.name || profile.email || 'Google User',
              picture: profile.picture || ''
            },
            connected_at: Date.now()
          };

          await chrome.storage.local.set({
            google_workspace_auth: authRecord,
            google_workspace_config: { ...config, enabled: true }
          });

          this.logActivity('LOGIN', `Berhasil terhubung dengan akun Google: ${authRecord.user.email}`);
          resolve(authRecord);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async logout() {
    await chrome.storage.local.remove(['google_workspace_auth']);
    const { config } = await this.getConfig();
    await chrome.storage.local.set({
      google_workspace_config: { ...config, enabled: false }
    });
    this.logActivity('LOGOUT', 'Akun Google berhasil diputuskan.');
    return true;
  }

  async fetchUserProfile(accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { email: 'Connected Google Account', name: 'Google User' };
    }
  }

  /**
   * Return valid access token, auto-refreshing if expired
   */
  async getValidAccessToken() {
    const { config, auth } = await this.getConfig();
    if (!auth || !auth.access_token) {
      throw new Error("Google Workspace belum terhubung. Silakan login akun Google terlebih dahulu di menu Connected Apps.");
    }

    // If token still valid
    if (auth.expires_at && Date.now() < auth.expires_at) {
      return auth.access_token;
    }

    // If token expired and we have refresh token
    if (auth.refresh_token) {
      const clientId = (config.client_id || DEFAULT_GOOGLE_CLIENT_ID).trim();
      const clientSecret = (config.client_secret || DEFAULT_GOOGLE_CLIENT_SECRET).trim();

      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: auth.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const refreshData = await refreshRes.json();
      if (refreshData.error) {
        throw new Error(`Token kedaluwarsa & gagal refresh: ${refreshData.error_description || refreshData.error}`);
      }

      auth.access_token = refreshData.access_token;
      auth.expires_at = Date.now() + ((refreshData.expires_in || 3600) - 120) * 1000;
      await chrome.storage.local.set({ google_workspace_auth: auth });
      return auth.access_token;
    }

    return auth.access_token;
  }

  // =========================================================================
  // GOOGLE SHEETS API
  // =========================================================================

  /**
   * Helper: Parse Spreadsheet ID from Full URL or raw ID
   */
  parseSpreadsheetId(input) {
    if (!input) return "";
    const str = String(input).trim();
    const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    return str;
  }

  /**
   * Append one or multiple rows to a Google Spreadsheet
   */
  async appendSpreadsheetRow(spreadsheetIdOrUrl, rowValues = [], sheetName = 'Sheet1') {
    const spreadsheetId = this.parseSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) throw new Error("Spreadsheet ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    // Ensure rowValues is array of arrays or single row array
    const values = Array.isArray(rowValues[0]) ? rowValues : [rowValues];
    const range = `${sheetName || 'Sheet1'}!A1`;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Sheets API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    this.logActivity('SHEETS_APPEND', `Berhasil menambahkan ${values.length} baris ke Sheet ID: ${spreadsheetId.substring(0, 8)}...`);
    return {
      success: true,
      spreadsheetId,
      updatedRange: data.updates?.updatedRange,
      updatedRows: data.updates?.updatedRows || values.length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    };
  }

  /**
   * Update or overwrite a specific cell range in a Google Spreadsheet
   */
  async updateSpreadsheetRange(spreadsheetIdOrUrl, range = 'Sheet1!A1', rowValues = []) {
    const spreadsheetId = this.parseSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) throw new Error("Spreadsheet ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    const values = Array.isArray(rowValues[0]) ? rowValues : [rowValues];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Sheets API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    this.logActivity('SHEETS_UPDATE', `Berhasil mengupdate range ${range} di Sheet ID: ${spreadsheetId.substring(0, 8)}...`);
    return {
      success: true,
      spreadsheetId,
      updatedRange: data.updatedRange || range,
      updatedRows: data.updatedRows || values.length,
      updatedColumns: data.updatedColumns,
      updatedCells: data.updatedCells,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    };
  }

  /**
   * Read values from a Google Spreadsheet range
   */
  async readSpreadsheet(spreadsheetIdOrUrl, range = 'Sheet1!A1:Z100') {
    const spreadsheetId = this.parseSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) throw new Error("Spreadsheet ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Sheets API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return {
      spreadsheetId,
      range: data.range,
      values: data.values || [],
      rowCount: (data.values || []).length
    };
  }

  /**
   * Create a new Google Spreadsheet in user's Google Drive
   */
  async createSpreadsheet(title = "Browser Agent Export", headers = []) {
    const token = await this.getValidAccessToken();
    const url = 'https://sheets.googleapis.com/v4/spreadsheets';

    const requestBody = {
      properties: { title: title || "Browser Agent Export" }
    };

    if (Array.isArray(headers) && headers.length > 0) {
      requestBody.sheets = [{
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: headers.map(h => ({ userEnteredValue: { stringValue: String(h) } }))
          }]
        }]
      }];
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Sheets API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    this.logActivity('SHEETS_CREATE', `Berhasil membuat Spreadsheet baru: "${title}" (ID: ${data.spreadsheetId})`);
    return {
      spreadsheetId: data.spreadsheetId,
      title: data.properties?.title || title,
      spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
    };
  }

  // =========================================================================
  // GOOGLE DOCS API
  // =========================================================================

  parseDocumentId(input) {
    if (!input) return "";
    const str = String(input).trim();
    const match = str.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    return str;
  }

  /**
   * Create a new Google Doc with optional initial text content
   */
  async createDocument(title = "Browser Agent Report", contentText = "") {
    const token = await this.getValidAccessToken();
    const url = 'https://docs.googleapis.com/v1/documents';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: title || "Browser Agent Report" })
    });

    const doc = await res.json();
    if (doc.error) {
      throw new Error(`Google Docs API Error: ${doc.error.message || JSON.stringify(doc.error)}`);
    }

    const documentId = doc.documentId;

    // If initial content provided, insert into document
    if (contentText && typeof contentText === 'string' && contentText.trim().length > 0) {
      await this.appendDocumentText(documentId, contentText);
    }

    this.logActivity('DOCS_CREATE', `Berhasil membuat Dokumen Google Docs: "${title}" (ID: ${documentId})`);
    return {
      documentId,
      title: doc.title || title,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
    };
  }

  /**
   * Append formatted text into an existing Google Doc
   */
  async appendDocumentText(documentIdOrUrl, text) {
    const documentId = this.parseDocumentId(documentIdOrUrl);
    if (!documentId) throw new Error("Document ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    // 1. Fetch current document end index
    const getRes = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const docData = await getRes.json();
    if (docData.error) throw new Error(`Google Docs Error: ${docData.error.message}`);

    let endIndex = 1;
    if (docData.body && Array.isArray(docData.body.content)) {
      const lastElement = docData.body.content[docData.body.content.length - 1];
      if (lastElement && lastElement.endIndex) {
        endIndex = Math.max(1, lastElement.endIndex - 1);
      }
    }

    const cleanText = (typeof text === 'string' ? text : JSON.stringify(text, null, 2)) + "\n\n";

    // 2. Batch update to insert text
    const updateUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`;
    const res = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: endIndex },
              text: cleanText
            }
          }
        ]
      })
    });

    const updateData = await res.json();
    if (updateData.error) {
      throw new Error(`Google Docs API Error: ${updateData.error.message || JSON.stringify(updateData.error)}`);
    }

    this.logActivity('DOCS_APPEND', `Menambahkan teks ke Dokumen ID: ${documentId.substring(0, 8)}...`);
    return {
      success: true,
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
    };
  }

  /**
   * Replace/Overwrite entire content of a Google Document with new text
   */
  async replaceDocumentContent(documentIdOrUrl, newContentText) {
    const documentId = this.parseDocumentId(documentIdOrUrl);
    if (!documentId) throw new Error("Document ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    // 1. Fetch current document end index
    const getRes = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const docData = await getRes.json();
    if (docData.error) throw new Error(`Google Docs Error: ${docData.error.message}`);

    let endIndex = 1;
    if (docData.body && Array.isArray(docData.body.content)) {
      const lastElement = docData.body.content[docData.body.content.length - 1];
      if (lastElement && lastElement.endIndex) {
        endIndex = Math.max(1, lastElement.endIndex - 1);
      }
    }

    const requests = [];
    // Delete existing content if endIndex > 1
    if (endIndex > 1) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: endIndex
          }
        }
      });
    }

    const cleanText = (typeof newContentText === 'string' ? newContentText : JSON.stringify(newContentText, null, 2)) + "\n";
    requests.push({
      insertText: {
        location: { index: 1 },
        text: cleanText
      }
    });

    const updateUrl = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`;
    const res = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    const updateData = await res.json();
    if (updateData.error) {
      throw new Error(`Google Docs API Error: ${updateData.error.message || JSON.stringify(updateData.error)}`);
    }

    this.logActivity('DOCS_REPLACE', `Menulis ulang isi Dokumen ID: ${documentId.substring(0, 8)}...`);
    return {
      success: true,
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
    };
  }

  /**
   * Read raw text content of a Google Document
   */
  async readDocument(documentIdOrUrl) {
    const documentId = this.parseDocumentId(documentIdOrUrl);
    if (!documentId) throw new Error("Document ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    const res = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const doc = await res.json();
    if (doc.error) {
      throw new Error(`Google Docs API Error: ${doc.error.message || JSON.stringify(doc.error)}`);
    }

    let fullText = "";
    if (doc.body && Array.isArray(doc.body.content)) {
      doc.body.content.forEach(element => {
        if (element.paragraph && Array.isArray(element.paragraph.elements)) {
          element.paragraph.elements.forEach(pe => {
            if (pe.textRun && pe.textRun.content) {
              fullText += pe.textRun.content;
            }
          });
        }
      });
    }

    return {
      documentId,
      title: doc.title,
      text: fullText.trim(),
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
    };
  }

  // =========================================================================
  // ACTIVITY LOGGING
  // =========================================================================

  async logActivity(type, message) {
    try {
      const data = await chrome.storage.local.get(['google_workspace_logs']);
      const logs = Array.isArray(data.google_workspace_logs) ? data.google_workspace_logs : [];
      logs.unshift({
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type,
        message
      });
      if (logs.length > 50) logs.pop();
      await chrome.storage.local.set({ google_workspace_logs: logs });
    } catch (e) {
      console.warn("Error logging google workspace activity:", e);
    }
  }
}

// Export singleton instance
const googleWorkspaceService = new GoogleWorkspaceService();

if (typeof self !== 'undefined') {
  self.googleWorkspaceService = googleWorkspaceService;
}
if (typeof window !== 'undefined') {
  window.googleWorkspaceService = googleWorkspaceService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GoogleWorkspaceService, googleWorkspaceService };
}
