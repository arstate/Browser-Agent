/**
 * Apps Manager - Controller for In-App Webview, DeclarativeNetRequest, and Embedded Apps Hub
 * Part of Browser Agent Apps Integration Feature
 * @version 2.150.259
 */

(function (window) {
  'use strict';

  class AppsIntegrationManager {
    constructor() {
      this.currentAppUrl = '';
      this.currentAppName = '';
      this.isInitialized = false;

      // DOM Elements Cache
      this.appsOverlay = null;
      this.btnOpenApps = null;
      this.appsIframe = null;
      this.appsActiveTitle = null;
      this.appsCurrentUrlText = null;
      this.btnToggleAppsCatalog = null;
      this.appsCatalogOverlay = null;
      this.btnCloseCatalogDrawer = null;
      this.btnAppsReload = null;
      this.inputCustomAppUrl = null;
      this.btnLaunchCustomApp = null;
      this.appCards = [];
      this.appsUrlPill = null;
    }

    async init(options = {}) {
      if (this.isInitialized) return;

      this.cacheDOMElements();
      this.bindEventListeners();
      await this.ensureInAppDnrRules();

      this.isInitialized = true;
      console.log('[AppsIntegration] Manager successfully initialized.');
    }

    cacheDOMElements() {
      this.appsOverlay = document.getElementById('fullscreen-apps-overlay');
      this.btnOpenApps = document.getElementById('btn-open-apps');
      this.appsIframe = document.getElementById('apps-embedded-iframe');
      this.appsActiveTitle = document.getElementById('apps-active-title');
      this.appsCurrentUrlText = document.getElementById('apps-current-url-text');
      this.btnToggleAppsCatalog = document.getElementById('btn-toggle-apps-catalog');
      this.appsCatalogOverlay = document.getElementById('apps-catalog-overlay');
      this.btnCloseCatalogDrawer = document.getElementById('btn-close-catalog-drawer');
      this.btnAppsReload = document.getElementById('btn-apps-reload');
      this.inputCustomAppUrl = document.getElementById('input-custom-app-url');
      this.btnLaunchCustomApp = document.getElementById('btn-launch-custom-app');
      this.appCards = Array.from(document.querySelectorAll('.apps-bento-card'));
      this.appsUrlPill = document.getElementById('apps-url-display-pill');
    }

    async ensureInAppDnrRules() {
      if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
        try {
          const registry = window.AppsRegistry || (window.AppsIntegration && window.AppsIntegration.registry);
          const rules = registry ? registry.getGlobalDnrRules() : [];
          const ruleIds = registry ? registry.getAllRuleIds() : [9901, 9902];

          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIds,
            addRules: rules
          });
        } catch (e) {
          console.warn('[AppsIntegration] Dynamic rules registration notice:', e);
        }
      }
    }

    openAppsView(appUrl = null, appName = null) {
      if (!this.appsOverlay) this.cacheDOMElements();
      if (window.closeFullscreenSettings) {
        window.closeFullscreenSettings();
      }
      if (this.appsOverlay) {
        this.appsOverlay.style.display = 'flex';
        if (window.updateActiveSidebarTab) {
          window.updateActiveSidebarTab('apps');
        }
        if (appUrl && appName) {
          this.launchApp(appUrl, appName, false);
        } else {
          if (this.appsIframe && (!this.appsIframe.src || this.appsIframe.src !== 'about:blank')) {
            this.appsIframe.src = 'about:blank';
          }
          this.currentAppUrl = '';
          this.currentAppName = '';
          if (this.appsCatalogOverlay) this.appsCatalogOverlay.style.display = 'flex';
          this.btnToggleAppsCatalog?.classList.add('active');
          if (this.appsActiveTitle) this.appsActiveTitle.textContent = 'Aplikasi';
          if (this.appsCurrentUrlText) this.appsCurrentUrlText.textContent = 'Aplikasi';
          this.appCards.forEach(card => card.classList.remove('active'));
        }
      }
    }

    closeAppsView() {
      if (!this.appsOverlay) this.cacheDOMElements();
      if (this.appsOverlay) {
        this.appsOverlay.style.display = 'none';
        if (this.appsCatalogOverlay) this.appsCatalogOverlay.style.display = 'none';
        this.btnToggleAppsCatalog?.classList.remove('active');
        if (this.appsIframe) {
          this.appsIframe.src = 'about:blank';
        }
        this.currentAppUrl = '';
        this.currentAppName = '';
        if (this.appsCurrentUrlText) this.appsCurrentUrlText.textContent = 'Aplikasi';
        this.appCards.forEach(card => card.classList.remove('active'));
        if (window.updateActiveSidebarTab) {
          window.updateActiveSidebarTab('home');
        }
        const chatInput = document.getElementById('chat-input');
        chatInput?.focus();
      }
      if (typeof window !== 'undefined' && window.location?.hash && (window.location.hash.startsWith('#apps') || window.location.hash.startsWith('#flow'))) {
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch (e) {}
      }
    }

    toggleAppsCatalog() {
      if (!this.appsCatalogOverlay) this.cacheDOMElements();
      if (!this.appsCatalogOverlay) return;
      const isHidden = this.appsCatalogOverlay.style.display === 'none' || !this.appsCatalogOverlay.style.display;
      if (isHidden) {
        this.appsCatalogOverlay.style.display = 'flex';
        this.btnToggleAppsCatalog?.classList.add('active');
      } else {
        // Jika belum ada aplikasi yang dibuka, menutup katalog drawer berarti menutup seluruh Apps view!
        if (!this.currentAppUrl) {
          this.closeAppsView();
          return;
        }
        this.appsCatalogOverlay.style.display = 'none';
        this.btnToggleAppsCatalog?.classList.remove('active');
      }
    }

    async launchApp(url, name, forceReload = false) {
      if (!this.appsOverlay) this.cacheDOMElements();
      await this.ensureInAppDnrRules();
      this.currentAppUrl = url;
      this.currentAppName = name;

      if (this.appsOverlay) {
        this.appsOverlay.style.display = 'flex';
      }
      if (window.updateActiveSidebarTab) {
        window.updateActiveSidebarTab('apps');
      }

      const registry = window.AppsRegistry || (window.AppsIntegration && window.AppsIntegration.registry);
      const displayName = registry ? registry.getDisplayNameForUrl(url, name) : (name || 'Aplikasi');

      if (this.appsActiveTitle) this.appsActiveTitle.textContent = displayName;
      if (this.appsCurrentUrlText) this.appsCurrentUrlText.textContent = displayName;
      if (this.appsUrlPill) this.appsUrlPill.title = `${displayName} (${url})`;

      if (this.appsIframe) {
        if (forceReload || !this.appsIframe.src || !this.appsIframe.src.startsWith('http') || this.appsIframe.src !== url) {
          this.appsIframe.src = 'about:blank';
          setTimeout(() => {
            if (this.appsIframe) this.appsIframe.src = url;
          }, 50);
        }
      }

      this.appCards.forEach(card => {
        if (card.getAttribute('data-app-url') === url) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });

      if (this.appsCatalogOverlay) this.appsCatalogOverlay.style.display = 'none';
      this.btnToggleAppsCatalog?.classList.remove('active');
    }

    handleCustomAppLaunch() {
      let val = this.inputCustomAppUrl?.value?.trim();
      if (!val) return;
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        val = 'https://' + val;
      }
      try {
        const parsed = new URL(val);
        this.launchApp(parsed.href, parsed.hostname);
      } catch (err) {
        this.launchApp(val, 'Custom Web App');
      }
      if (this.inputCustomAppUrl) this.inputCustomAppUrl.value = '';
    }

    bindEventListeners() {
      this.btnOpenApps?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.appsOverlay && this.appsOverlay.style.display === 'flex') {
          this.closeAppsView();
        } else {
          this.openAppsView();
        }
      });

      this.btnToggleAppsCatalog?.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleAppsCatalog();
      });

      this.btnCloseCatalogDrawer?.addEventListener('click', (e) => {
        e.preventDefault();
        // Jika belum ada aplikasi yang dibuka, tombol close [x] menutup seluruh Apps overlay dan kembali ke chat
        if (!this.currentAppUrl) {
          this.closeAppsView();
        } else {
          if (this.appsCatalogOverlay) this.appsCatalogOverlay.style.display = 'none';
          this.btnToggleAppsCatalog?.classList.remove('active');
        }
      });

      // Klik backdrop di luar konten katalog menutup katalog / apps view
      this.appsCatalogOverlay?.addEventListener('click', (e) => {
        if (e.target === this.appsCatalogOverlay) {
          e.preventDefault();
          if (!this.currentAppUrl) {
            this.closeAppsView();
          } else {
            this.appsCatalogOverlay.style.display = 'none';
            this.btnToggleAppsCatalog?.classList.remove('active');
          }
        }
      });

      this.btnAppsReload?.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentAppUrl) {
          this.launchApp(this.currentAppUrl, this.currentAppName, true);
        }
      });

      this.appCards.forEach(card => {
        card.addEventListener('click', () => {
          const url = card.getAttribute('data-app-url');
          const name = card.getAttribute('data-app-name');
          if (url && name) {
            this.launchApp(url, name);
          }
        });
      });

      this.btnLaunchCustomApp?.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCustomAppLaunch();
      });

      this.inputCustomAppUrl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleCustomAppLaunch();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.appsOverlay && this.appsOverlay.style.display !== 'none') {
            if (this.appsCatalogOverlay && this.appsCatalogOverlay.style.display !== 'none') {
              if (!this.currentAppUrl) {
                this.closeAppsView();
              } else {
                this.appsCatalogOverlay.style.display = 'none';
                this.btnToggleAppsCatalog?.classList.remove('active');
              }
            } else {
              this.closeAppsView();
            }
          }
        }
      });
    }
  }

  const manager = new AppsIntegrationManager();

  window.AppsManager = manager;
  if (!window.AppsIntegration) {
    window.AppsIntegration = {};
  }
  window.AppsIntegration.manager = manager;

})(typeof window !== 'undefined' ? window : globalThis);
