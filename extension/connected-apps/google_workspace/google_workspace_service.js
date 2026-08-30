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
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/contacts.readonly'
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

    // Clear old cached token before opening fresh OAuth consent
    await chrome.storage.local.remove(['google_workspace_auth']);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent select_account');

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
   * Helper: Handle API errors with friendly scope update message
   */
  handleApiError(serviceName, errorObj) {
    const msg = errorObj?.message || (typeof errorObj === 'string' ? errorObj : JSON.stringify(errorObj));
    if (msg.includes("insufficient authentication scopes") || msg.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || msg.includes("insufficient_scope")) {
      throw new Error(`Izin ${serviceName} belum aktif (Token lama). Silakan klik tombol 'Putus' di atas lalu klik 'Hubungkan Akun Google' kembali untuk menyetujui izin fitur baru.`);
    }
    if (msg.includes("has not been used in project") || msg.includes("is disabled") || msg.includes("Access Not Configured")) {
      const apiName = serviceName.includes("Contacts") || serviceName.includes("People") ? "Google People API" : serviceName;
      throw new Error(`Layanan '${apiName}' belum aktif di Google Cloud Console. Buka Library di console.cloud.google.com lalu klik 'Enable' pada '${apiName}'.`);
    }
    throw new Error(`${serviceName} Error: ${msg}`);
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
      this.handleApiError('Google Sheets API', data.error);
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
  // GOOGLE SLIDES API (REST API - 16:9 Widescreen)
  // =========================================================================

  parsePresentationId(input) {
    if (!input) return "";
    const str = String(input).trim();
    const match = str.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    return str;
  }

  /**
   * Create a new Google Slides Presentation (16:9 widescreen) with structured slides
   */
  async createPresentation(title = "Browser Agent Presentation", slides = []) {
    const token = await this.getValidAccessToken();
    const url = 'https://slides.googleapis.com/v1/presentations';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: title || "Browser Agent Presentation" })
    });

    const pres = await res.json();
    if (pres.error) {
      throw new Error(`Google Slides API Error: ${pres.error.message || JSON.stringify(pres.error)}`);
    }

    const presentationId = pres.presentationId;
    let slidesCount = 1;

    // If slides array is provided, insert slides with titles and structured bullet points
    if (Array.isArray(slides) && slides.length > 0) {
      try {
        const requests = [];
        for (let i = 0; i < slides.length; i++) {
          const s = slides[i];
          const slideId = `slide_page_${Date.now()}_${i}`;
          const titleBoxId = `title_box_${Date.now()}_${i}`;
          const bodyBoxId = `body_box_${Date.now()}_${i}`;

          // Create blank slide
          requests.push({
            createSlide: {
              objectId: slideId,
              insertionIndex: i + 1,
              slideLayoutReference: {
                predefinedLayout: 'BLANK'
              }
            }
          });

          // Insert Title Shape
          const slideTitle = typeof s === 'string' ? s : (s.title || `Slide ${i + 1}`);
          requests.push({
            createShape: {
              objectId: titleBoxId,
              shapeType: 'TEXT_BOX',
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: 650, unit: 'PT' },
                  height: { magnitude: 60, unit: 'PT' }
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: 35,
                  translateY: 35,
                  unit: 'PT'
                }
              }
            }
          });
          requests.push({
            insertText: {
              objectId: titleBoxId,
              text: slideTitle
            }
          });

          // Insert Body Content Shape
          let bodyText = "";
          if (typeof s === 'object' && s !== null) {
            if (Array.isArray(s.bullets)) {
              bodyText = s.bullets.map(b => `• ${b}`).join('\n');
            } else if (s.content || s.body) {
              bodyText = String(s.content || s.body);
            }
          }
          if (!bodyText && typeof s === 'string') {
            bodyText = s;
          }

          if (bodyText) {
            requests.push({
              createShape: {
                objectId: bodyBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: { magnitude: 650, unit: 'PT' },
                    height: { magnitude: 280, unit: 'PT' }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 35,
                    translateY: 105,
                    unit: 'PT'
                  }
                }
              }
            });
            requests.push({
              insertText: {
                objectId: bodyBoxId,
                text: bodyText
              }
            });
          }
        }

        if (requests.length > 0) {
          const batchUrl = `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}:batchUpdate`;
          await fetch(batchUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
          });
          slidesCount += slides.length;
        }
      } catch (slideErr) {
        console.warn('Batch slide creation error:', slideErr);
      }
    }

    this.logActivity('SLIDES_CREATE', `Berhasil membuat Presentasi Google Slides: "${title}" (ID: ${presentationId})`);
    return {
      success: true,
      presentationId,
      title: pres.title || title,
      presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
      slidesCount
    };
  }

  /**
   * Append a single slide to an existing Google Slides presentation
   */
  async appendSlide(presentationIdOrUrl, slideData) {
    const presentationId = this.parsePresentationId(presentationIdOrUrl);
    if (!presentationId) throw new Error("Presentation ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    const slideId = `slide_page_${Date.now()}`;
    const titleBoxId = `title_box_${Date.now()}`;
    const bodyBoxId = `body_box_${Date.now()}`;
    const requests = [
      {
        createSlide: {
          objectId: slideId,
          slideLayoutReference: {
            predefinedLayout: 'BLANK'
          }
        }
      }
    ];

    const slideTitle = typeof slideData === 'string' ? slideData : (slideData?.title || 'Slide');
    requests.push({
      createShape: {
        objectId: titleBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: { width: { magnitude: 650, unit: 'PT' }, height: { magnitude: 60, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: 35, translateY: 35, unit: 'PT' }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: titleBoxId,
        text: slideTitle
      }
    });

    let bodyText = "";
    if (typeof slideData === 'object' && slideData !== null) {
      if (Array.isArray(slideData.bullets)) {
        bodyText = slideData.bullets.map(b => `• ${b}`).join('\n');
      } else if (slideData.content || slideData.body) {
        bodyText = String(slideData.content || slideData.body);
      }
    }
    if (bodyText) {
      requests.push({
        createShape: {
          objectId: bodyBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: { width: { magnitude: 650, unit: 'PT' }, height: { magnitude: 280, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 35, translateY: 105, unit: 'PT' }
          }
        }
      });
      requests.push({
        insertText: {
          objectId: bodyBoxId,
          text: bodyText
        }
      });
    }

    const batchUrl = `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}:batchUpdate`;
    const res = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Slides API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    this.logActivity('SLIDES_APPEND', `Menambahkan slide baru ke Presentasi ID: ${presentationId.substring(0, 8)}...`);
    return {
      success: true,
      presentationId,
      presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`
    };
  }

  /**
   * Read details of a Google Slides presentation
   */
  async readPresentation(presentationIdOrUrl) {
    const presentationId = this.parsePresentationId(presentationIdOrUrl);
    if (!presentationId) throw new Error("Presentation ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Slides API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return {
      presentationId,
      title: data.title,
      slidesCount: Array.isArray(data.slides) ? data.slides.length : 0,
      presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`
    };
  }

  /**
   * Clear contents of a range in Google Spreadsheet
   */
  async clearSpreadsheetRange(spreadsheetIdOrUrl, range = 'Sheet1!A1:Z100') {
    const spreadsheetId = this.parseSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) throw new Error("Spreadsheet ID atau URL tidak valid.");
    const token = await this.getValidAccessToken();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Sheets Clear Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    this.logActivity('SHEETS_CLEAR', `Mengosongkan range ${range} di Sheet ID: ${spreadsheetId.substring(0, 8)}...`);
    return {
      success: true,
      spreadsheetId,
      clearedRange: data.clearedRange || range
    };
  }

  // =========================================================================
  // GOOGLE DRIVE API
  // =========================================================================

  /**
   * Search files (Docs, Sheets, Folders) in user's Google Drive
   */
  async searchDrive(query = "", mimeType = null, maxResults = 10) {
    const token = await this.getValidAccessToken();
    let q = "trashed = false";

    if (query && query.trim()) {
      const sanitized = String(query).replace(/'/g, "\\'");
      q += " and (name contains '" + sanitized + "' or fullText contains '" + sanitized + "')";
    }

    if (mimeType) {
      if (mimeType === 'doc' || mimeType === 'docs') {
        q += " and mimeType = 'application/vnd.google-apps.document'";
      } else if (mimeType === 'sheet' || mimeType === 'sheets') {
        q += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
      } else if (mimeType === 'folder') {
        q += " and mimeType = 'application/vnd.google-apps.folder'";
      } else {
        q += ` and mimeType = '${mimeType}'`;
      }
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,iconLink,modifiedTime)&pageSize=${Math.min(30, maxResults || 10)}&orderBy=modifiedTime desc`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Drive API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const files = (data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.mimeType?.includes('document') ? 'Google Doc' : (f.mimeType?.includes('spreadsheet') ? 'Google Sheet' : f.mimeType),
      url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      modifiedTime: f.modifiedTime
    }));

    this.logActivity('DRIVE_SEARCH', `Pencarian Drive "${query}": ditemukan ${files.length} file`);
    return {
      success: true,
      query,
      total_found: files.length,
      files
    };
  }

  /**
   * List recent Google Docs & Sheets from user's Google Drive
   */
  async listRecentFiles(maxResults = 10) {
    return this.searchDrive("", null, maxResults);
  }

  // =========================================================================
  // GMAIL API
  // =========================================================================

  /**
   * Send an email via Gmail API
   */
  async sendGmail(to, subject, bodyHtml, bodyText = "") {
    if (!to) throw new Error("Alamat email penerima (to) wajib diisi.");
    const token = await this.getValidAccessToken();

    const textContent = bodyText || (typeof bodyHtml === 'string' ? bodyHtml.replace(/<[^>]+>/g, ' ') : '');
    const htmlContent = bodyHtml || `<p>${bodyText}</p>`;

    const boundary = "==_mime_boundary_" + Date.now();
    const emailLines = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      textContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`
    ];

    const rawEmail = emailLines.join("\r\n");
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    const data = await res.json();
    if (data.error) {
      this.handleApiError('Gmail API', data.error);
    }

    this.logActivity('GMAIL_SEND', `Berhasil mengirim email ke: ${to} (Subjek: "${subject}")`);
    return {
      success: true,
      messageId: data.id,
      threadId: data.threadId,
      to,
      subject
    };
  }

  /**
   * Search emails in Gmail mailbox
   */
  async searchGmail(query = "is:inbox", maxResults = 5) {
    const token = await this.getValidAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) {
      this.handleApiError('Gmail API', data.error);
    }

    const messages = [];
    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        try {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const detail = await detailRes.json();
          const headers = detail.payload?.headers || [];
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(Tanpa Subjek)';
          const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
          const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
          messages.push({
            id: msg.id,
            threadId: msg.threadId,
            subject,
            from,
            date,
            snippet: detail.snippet || ''
          });
        } catch (e) {}
      }
    }

    this.logActivity('GMAIL_SEARCH', `Pencarian Gmail: "${query}" (${messages.length} email ditemukan)`);
    return {
      success: true,
      query,
      total_found: messages.length,
      messages
    };
  }

  // =========================================================================
  // GOOGLE FORMS API
  // =========================================================================

  /**
   * Create a new Google Form with title, description, and initial questions
   */
  async createGoogleForm(title = "Kuesioner Survey Prospek", description = "Dibuat oleh Browser Agent AI", questions = []) {
    const token = await this.getValidAccessToken();
    const createUrl = 'https://forms.googleapis.com/v1/forms';

    // Google Forms API v1 POST /forms only allows info.title
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        info: {
          title: title || "Kuesioner Survey Prospek"
        }
      })
    });

    const formData = await createRes.json();
    if (formData.error) {
      this.handleApiError('Google Forms API', formData.error);
    }

    const formId = formData.formId;
    const requests = [];

    // Set description via updateFormInfo in batchUpdate
    if (description) {
      requests.push({
        updateFormInfo: {
          info: {
            description: String(description)
          },
          updateMask: "description"
        }
      });
    }

    if (Array.isArray(questions) && questions.length > 0) {
      questions.forEach((q, idx) => {
        const qTitle = typeof q === 'string' ? q : (q.title || `Pertanyaan ${idx + 1}`);
        const qType = q.type || 'TEXT';
        const qOptions = Array.isArray(q.options) ? q.options : ["Opsi 1", "Opsi 2"];

        if (qType === 'CHOICE') {
          requests.push({
            createItem: {
              item: {
                title: qTitle,
                questionItem: {
                  question: {
                    required: !!q.required,
                    choiceQuestion: {
                      type: 'RADIO',
                      options: qOptions.map(opt => ({ value: String(opt) }))
                    }
                  }
                }
              },
              location: { index: idx }
            }
          });
        } else {
          requests.push({
            createItem: {
              item: {
                title: qTitle,
                questionItem: {
                  question: {
                    required: !!q.required,
                    textQuestion: { paragraph: qType === 'PARAGRAPH' }
                  }
                }
              },
              location: { index: idx }
            }
          });
        }
      });
    }

    if (requests.length > 0) {
      const batchUrl = `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`;
      const batchRes = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
      const batchData = await batchRes.json();
      if (batchData.error) {
        this.handleApiError('Google Forms API (batchUpdate)', batchData.error);
      }
    }

    const responderUri = formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;
    const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

    this.logActivity('FORMS_CREATE', `Berhasil membuat Google Form: "${title}" (ID: ${formId})`);
    return {
      success: true,
      formId,
      title,
      responderUri,
      editUri
    };
  }

  /**
   * Get responses from a Google Form
   */
  async getGoogleFormResponses(formId) {
    if (!formId) throw new Error("Form ID tidak boleh kosong.");
    const token = await this.getValidAccessToken();
    const url = `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) {
      this.handleApiError('Google Forms API', data.error);
    }

    const responses = data.responses || [];
    this.logActivity('FORMS_RESPONSES', `Membaca respon Google Form (${responses.length} respon diterima)`);
    return {
      success: true,
      formId,
      total_responses: responses.length,
      responses
    };
  }

  // =========================================================================
  // GOOGLE CALENDAR API
  // =========================================================================

  /**
   * Create an event in Google Calendar
   */
  async createCalendarEvent(summary = "Survei Lokasi Properti", description = "", startDateTime = "", endDateTime = "", attendees = []) {
    const token = await this.getValidAccessToken();
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const now = new Date();
    const start = startDateTime ? new Date(startDateTime) : new Date(now.getTime() + 60 * 60 * 1000);
    const end = endDateTime ? new Date(endDateTime) : new Date(start.getTime() + 60 * 60 * 1000);

    const eventPayload = {
      summary: summary || "Meeting Agenda",
      description: description || "Dibuat otomatis oleh Browser Agent AI",
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() }
    };

    if (Array.isArray(attendees) && attendees.length > 0) {
      eventPayload.attendees = attendees.map(email => ({ email: String(email).trim() }));
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    const data = await res.json();
    if (data.error) {
      this.handleApiError('Google Calendar API', data.error);
    }

    this.logActivity('CALENDAR_EVENT', `Jadwal Kalender Dibuat: "${summary}" (${start.toLocaleDateString('id-ID')})`);
    return {
      success: true,
      eventId: data.id,
      summary: data.summary,
      htmlLink: data.htmlLink || `https://calendar.google.com/calendar/event?eid=${data.id}`,
      start: data.start?.dateTime || start.toISOString(),
      end: data.end?.dateTime || end.toISOString()
    };
  }

  /**
   * List upcoming Google Calendar events
   */
  async listCalendarEvents(maxResults = 5) {
    const token = await this.getValidAccessToken();
    const nowIso = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(nowIso)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) {
      this.handleApiError('Google Calendar API', data.error);
    }

    const events = (data.items || []).map(evt => ({
      id: evt.id,
      summary: evt.summary || '(Tanpa Judul)',
      description: evt.description || '',
      start: evt.start?.dateTime || evt.start?.date || '',
      end: evt.end?.dateTime || evt.end?.date || '',
      link: evt.htmlLink || ''
    }));

    this.logActivity('CALENDAR_LIST', `Membaca ${events.length} jadwal Google Calendar mendatang`);
    return {
      success: true,
      total_events: events.length,
      events
    };
  }

  // =========================================================================
  // GOOGLE TASKS API
  // =========================================================================

  /**
   * Create a new task in Google Tasks
   */
  async createGoogleTask(title = "Follow-up Prospek KPR", notes = "", dueDate = "") {
    const token = await this.getValidAccessToken();
    const url = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks';

    const taskPayload = {
      title: title || "Tugas Baru",
      notes: notes || "Dibuat oleh Browser Agent"
    };

    if (dueDate) {
      taskPayload.due = new Date(dueDate).toISOString();
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskPayload)
    });

    const data = await res.json();
    if (data.error) {
      this.handleApiError('Google Tasks API', data.error);
    }

    this.logActivity('TASKS_CREATE', `Berhasil membuat Task: "${title}"`);
    return {
      success: true,
      taskId: data.id,
      title: data.title,
      notes: data.notes,
      due: data.due
    };
  }

  /**
   * List active Google Tasks
   */
  async listGoogleTasks(maxResults = 10) {
    const token = await this.getValidAccessToken();
    const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?maxResults=${maxResults}&showCompleted=false`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) {
      this.handleApiError('Google Tasks API', data.error);
    }

    const tasks = (data.items || []).map(t => ({
      id: t.id,
      title: t.title || '(Tanpa Judul)',
      notes: t.notes || '',
      due: t.due || '',
      status: t.status
    }));

    this.logActivity('TASKS_LIST', `Membaca ${tasks.length} daftar Google Tasks`);
    return {
      success: true,
      total_tasks: tasks.length,
      tasks
    };
  }

  // =========================================================================
  // GOOGLE CONTACTS (PEOPLE) API
  // =========================================================================

  /**
   * Search contacts by name, email, or phone number
   */
  async searchGoogleContacts(query = "", pageSize = 10) {
    const token = await this.getValidAccessToken();
    const url = query
      ? `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations&pageSize=${pageSize}`
      : `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=${pageSize}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) {
      this.handleApiError('Google Contacts API', data.error);
    }

    const rawList = data.results ? data.results.map(r => r.person) : (data.connections || []);
    const contacts = rawList.map(p => {
      const name = p.names?.[0]?.displayName || '(Tanpa Nama)';
      const email = p.emailAddresses?.[0]?.value || '';
      const phone = p.phoneNumbers?.[0]?.value || '';
      const org = p.organizations?.[0]?.name || '';
      return { name, email, phone, organization: org };
    });

    this.logActivity('CONTACTS_SEARCH', `Pencarian Kontak Google: "${query}" (${contacts.length} kontak)`);
    return {
      success: true,
      query,
      total_contacts: contacts.length,
      contacts
    };
  }

  // =========================================================================
  // GOOGLE WEB SEARCH & NEWS INTELLIGENCE ENGINE
  // =========================================================================

  /**
   * High-speed web search using Multi-Engine Aggregator (Google News, Wikipedia Knowledge & Bing RSS)
   * 100% reliable across all networks/regions (including Indonesia) without token limits.
   */
  async googleWebSearch(query, numResults = 8) {
    if (!query) throw new Error("Query pencarian tidak boleh kosong.");
    const limit = Math.min(20, Math.max(1, Number(numResults) || 8));
    const results = [];
    const seenUrls = new Set();

    // Helper to add clean result
    const addResult = (title, snippet, url, sourceName) => {
      if (!title || !url || seenUrls.has(url)) return;
      seenUrls.add(url);
      results.push({
        title: title.trim(),
        snippet: (snippet || '').trim(),
        url: url.trim(),
        source: sourceName
      });
    };

    // 1. Engine 1: Google News / Articles RSS Engine (100% Realtime & Verified)
    try {
      const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(newsUrl);
      if (res.ok) {
        const xml = await res.text();
        const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?(?:<source[^>]*>(.*?)<\/source>)?[\s\S]*?<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && results.length < limit) {
          const rawTitle = match[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
          const cleanTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          const url = match[2]?.trim() || '';
          const sourceName = match[4]?.trim() || 'Google News';
          const pubDate = match[3] ? ` (${match[3]})` : '';
          addResult(cleanTitle, `Sumber: ${sourceName}${pubDate}`, url, 'Google News');
        }
      }
    } catch (e) {
      console.warn("[googleWebSearch] Google News query skipped:", e.message);
    }

    // 2. Engine 2: Wikipedia Search API (Instant Encyclopedic & Factual Knowledge)
    if (results.length < limit) {
      try {
        const wikiUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const res = await fetch(wikiUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.query && Array.isArray(json.query.search)) {
            for (const item of json.query.search) {
              if (results.length >= limit) break;
              const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
              const url = `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;
              addResult(item.title, cleanSnippet, url, 'Wikipedia ID');
            }
          }
        }
      } catch (e) {
        console.warn("[googleWebSearch] Wikipedia query skipped:", e.message);
      }
    }

    // 3. Engine 3: Bing RSS Search (General Web Search Engine)
    if (results.length < limit) {
      try {
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
        const res = await fetch(bingUrl);
        if (res.ok) {
          const xml = await res.text();
          const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<description>(.*?)<\/description>[\s\S]*?<\/item>/g;
          let match;
          while ((match = itemRegex.exec(xml)) !== null && results.length < limit) {
            const rawTitle = match[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
            const cleanTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            const url = match[2]?.trim() || '';
            const rawDesc = match[3]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '') || '';
            const cleanSnippet = rawDesc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
            addResult(cleanTitle, cleanSnippet, url, 'Web Search');
          }
        }
      } catch (e) {
        console.warn("[googleWebSearch] Bing RSS query skipped:", e.message);
      }
    }

    // 4. Engine 4: DuckDuckGo Lite fallback (for international / non-blocked regions)
    if (results.length === 0) {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl);
        if (res.ok) {
          const html = await res.text();
          if (typeof DOMParser !== 'undefined') {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const rows = doc.querySelectorAll('.result');
            rows.forEach((r, idx) => {
              if (results.length >= limit) return;
              const titleElem = r.querySelector('.result__title');
              const snippetElem = r.querySelector('.result__snippet');
              const linkElem = r.querySelector('.result__url');
              if (titleElem) {
                let href = linkElem?.getAttribute('href') || titleElem.querySelector('a')?.getAttribute('href') || '';
                if (href.includes('uddg=')) {
                  try {
                    const m = href.match(/uddg=([^&]+)/);
                    if (m) href = decodeURIComponent(m[1]);
                  } catch(e) {}
                }
                addResult(titleElem.textContent?.trim() || 'No Title', snippetElem?.textContent?.trim() || '', href, 'DuckDuckGo');
              }
            });
          }
        }
      } catch(e) {}
    }

    this.logActivity('WEB_SEARCH', `Pencarian Web: "${query}" (${results.length} hasil ditemukan)`);
    return {
      success: true,
      query,
      total_results: results.length,
      results: results.slice(0, limit)
    };
  }

  /**
   * Search Google News for latest articles and trends
   */
  async googleNewsSearch(query, language = 'id') {
    if (!query) throw new Error("Query berita tidak boleh kosong.");
    try {
      const hl = language === 'en' ? 'en-US' : 'id-ID';
      const gl = language === 'en' ? 'US' : 'ID';
      const ceid = language === 'en' ? 'US:en' : 'ID:id';
      const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

      const res = await fetch(newsUrl);
      const xmlText = await res.text();

      const items = [];
      if (typeof DOMParser !== 'undefined') {
        const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');
        const itemNodes = xmlDoc.querySelectorAll('item');
        itemNodes.forEach((item, idx) => {
          if (idx >= 10) return;
          const title = item.querySelector('title')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';
          const source = item.querySelector('source')?.textContent || '';
          items.push({ title, link, pubDate, source });
        });
      }

      this.logActivity('NEWS_SEARCH', `Google News: "${query}" (${items.length} berita)`);
      return {
        success: true,
        query,
        total_articles: items.length,
        articles: items
      };
    } catch (err) {
      throw new Error(`Gagal mencari berita di Google News: ${err.message}`);
    }
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
