// =========================================================================
// Browser Agent - Full-Screen New Tab Utilities
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const recentSitesGrid = document.getElementById('recent-sites-grid');
  const chatInput = document.getElementById('chat-input');

  // Synchronize Global Shadows Performance Mode
  function applyShadowModeToNewtab(enabled) {
    if (enabled === false) {
      document.body.classList.add('no-shadows');
      document.documentElement.classList.add('no-shadows');
    } else {
      document.body.classList.remove('no-shadows');
      document.documentElement.classList.remove('no-shadows');
    }
  }

  function applyGlassModeToNewtab(enabled) {
    if (enabled === false) {
      document.body.classList.add('no-glass-blur');
      document.documentElement.classList.add('no-glass-blur');
    } else {
      document.body.classList.remove('no-glass-blur');
      document.documentElement.classList.remove('no-glass-blur');
    }
  }

  chrome.storage.local.get(['setting_enable_shadows', 'setting_enable_glass_blur', 'browser_agent_config'], (res) => {
    const shadowsEnabled = res?.setting_enable_shadows !== undefined
      ? res.setting_enable_shadows
      : (res?.browser_agent_config?.enableShadows !== false);
    applyShadowModeToNewtab(shadowsEnabled !== false);

    const glassEnabled = res?.setting_enable_glass_blur !== undefined
      ? res.setting_enable_glass_blur
      : (res?.browser_agent_config?.enableGlassBlur !== false);
    applyGlassModeToNewtab(glassEnabled !== false);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.setting_enable_shadows !== undefined) {
        applyShadowModeToNewtab(changes.setting_enable_shadows.newValue !== false);
      } else if (changes.browser_agent_config?.newValue?.enableShadows !== undefined) {
        applyShadowModeToNewtab(changes.browser_agent_config.newValue.enableShadows !== false);
      }
      if (changes.setting_enable_glass_blur !== undefined) {
        applyGlassModeToNewtab(changes.setting_enable_glass_blur.newValue !== false);
      } else if (changes.browser_agent_config?.newValue?.enableGlassBlur !== undefined) {
        applyGlassModeToNewtab(changes.browser_agent_config.newValue.enableGlassBlur !== false);
      }
    }
  });

  // Populate dynamic version badge from manifest
  try {
    const manifestVersion = chrome?.runtime?.getManifest?.()?.version;
    if (manifestVersion) {
      const versionEl = document.getElementById('sidebar-app-version');
      if (versionEl) versionEl.textContent = `v${manifestVersion}`;
    }
  } catch (e) {}

  // Populate Recent Sites Grid
  function renderRecentSites() {
    if (!recentSitesGrid) return;
    
    const defaultSites = [
      { title: "Meta Ads", url: "https://adsmanager.facebook.com/" },
      { title: "Google", url: "https://www.google.com/" },
      { title: "YouTube", url: "https://www.youtube.com/" },
      { title: "ChatGPT", url: "https://chatgpt.com/" },
      { title: "WhatsApp", url: "https://web.whatsapp.com/" },
      { title: "GitHub", url: "https://github.com/" },
      { title: "Netflix", url: "https://www.netflix.com/" },
      { title: "Instagram", url: "https://www.instagram.com/" }
    ];

    if (typeof chrome !== 'undefined' && chrome.topSites && chrome.topSites.get) {
      try {
        chrome.topSites.get((sites) => {
          if (chrome.runtime.lastError || !sites || sites.length === 0) {
            renderSitesList(defaultSites);
            return;
          }
          renderSitesList(sites.slice(0, 8));
        });
      } catch (e) {
        renderSitesList(defaultSites);
      }
    } else {
      renderSitesList(defaultSites);
    }
  }

  function renderSitesList(list) {
    if (!recentSitesGrid) return;
    recentSitesGrid.innerHTML = '';
    list.forEach(site => {
      let hostname = "";
      try {
        hostname = new URL(site.url).hostname.replace('www.', '');
      } catch(e) {
        hostname = site.title || "Site";
      }

      const iconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

      const tile = document.createElement('a');
      tile.className = 'site-tile';
      tile.href = site.url;
      tile.target = '_blank';
      tile.innerHTML = `
        <div class="site-icon-box">
          <img src="${iconUrl}" width="24" height="24" onerror="this.src='icons/icon48.png'" alt="${site.title}">
        </div>
        <span class="site-title" title="${site.title || hostname}">${site.title || hostname}</span>
      `;
      recentSitesGrid.appendChild(tile);
    });
  }

  renderRecentSites();
  chatInput?.focus();

  // In-Tab Fullscreen Settings Handler (No separate browser tab)
  const settingsOverlay = document.getElementById('fullscreen-settings-overlay');
  const btnCloseSettingsOverlay = document.getElementById('btn-close-settings-overlay');
  const settingsIframe = document.getElementById('settings-embedded-iframe');
  const sidebarItems = document.querySelectorAll('.app-sidebar .sidebar-nav-item');

  function updateActiveSidebarTab(tabName) {
    sidebarItems.forEach(item => {
      const itemTab = item.getAttribute('data-tab');
      if (itemTab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function openFullscreenSettings(tabName = 'ai') {
    if (settingsOverlay) {
      settingsOverlay.style.display = 'flex';
      updateActiveSidebarTab(tabName);
      if (settingsIframe) {
        const targetUrl = 'options.html#' + tabName;
        if (!settingsIframe.src || !settingsIframe.src.includes('options.html')) {
          settingsIframe.src = targetUrl;
        } else {
          try {
            settingsIframe.contentWindow?.postMessage({ action: 'switchTab', tab: tabName }, '*');
          } catch (e) {}
        }
      }
    }
  }

  function closeFullscreenSettings() {
    if (settingsOverlay) {
      settingsOverlay.style.display = 'none';
      updateActiveSidebarTab('home');
      chatInput?.focus();
    }
  }

  // --- Integrated Apps Hub & In-App Webview Logic (Google Flow, etc.) ---
  const appsOverlay = document.getElementById('fullscreen-apps-overlay');
  const btnOpenApps = document.getElementById('btn-open-apps');
  const appsIframe = document.getElementById('apps-embedded-iframe');
  const appsActiveTitle = document.getElementById('apps-active-title');
  const appsCurrentUrlText = document.getElementById('apps-current-url-text');
  const btnToggleAppsCatalog = document.getElementById('btn-toggle-apps-catalog');
  const appsCatalogOverlay = document.getElementById('apps-catalog-overlay');
  const btnCloseCatalogDrawer = document.getElementById('btn-close-catalog-drawer');
  const btnAppsReload = document.getElementById('btn-apps-reload');
  const inputCustomAppUrl = document.getElementById('input-custom-app-url');
  const btnLaunchCustomApp = document.getElementById('btn-launch-custom-app');
  const appCards = document.querySelectorAll('.apps-bento-card');

  let currentAppUrl = '';
  let currentAppName = '';

  // Ensure In-App DeclarativeNetRequest dynamic rules are registered with requestHeaders
  async function ensureInAppDnrRules() {
    if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
      const RULE_ID_STRIP_HEADERS = 9901;
      const RULE_ID_GOOGLE_FLOW = 9902;
      const rules = [
        {
          id: RULE_ID_STRIP_HEADERS,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "sec-fetch-site", operation: "set", value: "same-origin" },
              { header: "sec-fetch-dest", operation: "set", value: "document" },
              { header: "sec-fetch-mode", operation: "set", value: "navigate" },
              { header: "sec-fetch-user", operation: "set", value: "?1" }
            ],
            responseHeaders: [
              { header: "x-frame-options", operation: "remove" },
              { header: "content-security-policy", operation: "remove" },
              { header: "frame-options", operation: "remove" },
              { header: "cross-origin-opener-policy", operation: "set", value: "unsafe-none" },
              { header: "cross-origin-embedder-policy", operation: "remove" },
              { header: "cross-origin-resource-policy", operation: "set", value: "cross-origin" }
            ]
          },
          condition: {
            urlFilter: "*",
            resourceTypes: ["sub_frame"]
          }
        },
        {
          id: RULE_ID_GOOGLE_FLOW,
          priority: 2,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "sec-fetch-site", operation: "set", value: "same-origin" },
              { header: "sec-fetch-dest", operation: "set", value: "document" },
              { header: "sec-fetch-mode", operation: "set", value: "navigate" },
              { header: "sec-fetch-user", operation: "set", value: "?1" },
              { header: "referer", operation: "set", value: "https://flow.google.com/" }
            ],
            responseHeaders: [
              { header: "x-frame-options", operation: "remove" },
              { header: "content-security-policy", operation: "remove" },
              { header: "frame-options", operation: "remove" },
              { header: "cross-origin-opener-policy", operation: "set", value: "unsafe-none" },
              { header: "cross-origin-embedder-policy", operation: "remove" },
              { header: "cross-origin-resource-policy", operation: "set", value: "cross-origin" }
            ]
          },
          condition: {
            urlFilter: "*flow.google.com*",
            resourceTypes: ["sub_frame", "xmlhttprequest", "script", "other"]
          }
        }
      ];
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [RULE_ID_STRIP_HEADERS, RULE_ID_GOOGLE_FLOW],
          addRules: rules
        });
      } catch (e) {}
    }
  }

  function openAppsView(appUrl = null, appName = null) {
    closeFullscreenSettings();
    if (appsOverlay) {
      appsOverlay.style.display = 'flex';
      updateActiveSidebarTab('apps');
      if (appUrl && appName) {
        launchApp(appUrl, appName, false);
      } else {
        // Pure empty / blank state so no heavy web is loaded in background
        if (appsIframe && (!appsIframe.src || appsIframe.src !== 'about:blank')) {
          appsIframe.src = 'about:blank';
        }
        currentAppUrl = '';
        currentAppName = '';
        if (appsCatalogOverlay) appsCatalogOverlay.style.display = 'flex';
        btnToggleAppsCatalog?.classList.add('active');
        if (appsActiveTitle) appsActiveTitle.textContent = 'Aplikasi Terintegrasi';
        if (appsCurrentUrlText) appsCurrentUrlText.textContent = 'browser-agent://apps';
        appCards.forEach(card => card.classList.remove('active'));
      }
    }
  }

  function closeAppsView() {
    if (appsOverlay) {
      appsOverlay.style.display = 'none';
      if (appsCatalogOverlay) appsCatalogOverlay.style.display = 'none';
      // Free iframe memory when closing Apps
      if (appsIframe) {
        appsIframe.src = 'about:blank';
      }
      currentAppUrl = '';
      currentAppName = '';
      appCards.forEach(card => card.classList.remove('active'));
      updateActiveSidebarTab('home');
      chatInput?.focus();
    }
  }

  function toggleAppsCatalog() {
    if (!appsCatalogOverlay) return;
    const isHidden = appsCatalogOverlay.style.display === 'none' || !appsCatalogOverlay.style.display;
    if (isHidden) {
      appsCatalogOverlay.style.display = 'flex';
      btnToggleAppsCatalog?.classList.add('active');
    } else {
      appsCatalogOverlay.style.display = 'none';
      btnToggleAppsCatalog?.classList.remove('active');
    }
  }

  async function launchApp(url, name, forceReload = false) {
    await ensureInAppDnrRules();
    currentAppUrl = url;
    currentAppName = name;
    if (appsActiveTitle) appsActiveTitle.textContent = name;
    if (appsCurrentUrlText) appsCurrentUrlText.textContent = url;
    if (appsIframe) {
      if (forceReload || !appsIframe.src || !appsIframe.src.startsWith('http') || appsIframe.src !== url) {
        appsIframe.src = 'about:blank';
        setTimeout(() => {
          if (appsIframe) appsIframe.src = url;
        }, 50);
      }
    }
    // Update card selection highlight
    appCards.forEach(card => {
      if (card.getAttribute('data-app-url') === url) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
    // Hide catalog drawer once app is selected
    if (appsCatalogOverlay) appsCatalogOverlay.style.display = 'none';
    btnToggleAppsCatalog?.classList.remove('active');
  }

  // Sidebar Apps Button Trigger
  btnOpenApps?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAppsView();
  });

  // Apps Header Controls
  btnToggleAppsCatalog?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAppsCatalog();
  });

  btnCloseCatalogDrawer?.addEventListener('click', (e) => {
    e.preventDefault();
    if (appsCatalogOverlay) appsCatalogOverlay.style.display = 'none';
    btnToggleAppsCatalog?.classList.remove('active');
  });

  btnAppsReload?.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentAppUrl) {
      launchApp(currentAppUrl, currentAppName, true);
    }
  });

  // Apps Catalog Cards Selection
  appCards.forEach(card => {
    card.addEventListener('click', () => {
      const url = card.getAttribute('data-app-url');
      const name = card.getAttribute('data-app-name');
      if (url && name) {
        launchApp(url, name);
      }
    });
  });

  // Custom App URL Launcher
  function handleCustomAppLaunch() {
    let val = inputCustomAppUrl?.value?.trim();
    if (!val) return;
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      val = 'https://' + val;
    }
    try {
      const parsed = new URL(val);
      launchApp(parsed.href, parsed.hostname);
    } catch (err) {
      launchApp(val, 'Custom Web App');
    }
    if (inputCustomAppUrl) inputCustomAppUrl.value = '';
  }

  btnLaunchCustomApp?.addEventListener('click', handleCustomAppLaunch);
  inputCustomAppUrl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCustomAppLaunch();
  });

  // Home Button (Back to Chat / Reset to Clean Welcome Screen)
  document.getElementById('btn-header-new-chat')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeFullscreenSettings();
    closeAppsView();
    const welcomeCardEl = document.getElementById('welcome-card');
    if (welcomeCardEl) {
      welcomeCardEl.style.display = 'flex';
      welcomeCardEl.style.opacity = '1';
    }
    document.body.classList.remove('has-messages');
    updateActiveSidebarTab('home');
  });

  // Settings Button in Sidebar (Opens in-page Settings Overlay)
  document.getElementById('btn-open-settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeAppsView();
    openFullscreenSettings('ai');
  }, true);

  if (btnCloseSettingsOverlay) {
    btnCloseSettingsOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      closeFullscreenSettings();
    });
  }

  // Auto-open settings or apps overlay if opened with hash (e.g. newtab.html#settings or newtab.html#apps)
  function checkUrlForAutoSettings() {
    const hash = window.location.hash;
    if (hash && (hash.startsWith('#apps') || hash.startsWith('#flow'))) {
      if (hash.startsWith('#flow')) {
        openAppsView('https://flow.google.com/', 'Google Flow');
      } else {
        openAppsView();
      }
      return;
    }
    if (hash && (hash.startsWith('#settings') || hash.startsWith('#ai') || hash.startsWith('#models') || hash.startsWith('#agents') || hash.startsWith('#skills') || hash.startsWith('#memory'))) {
      let tab = 'ai';
      if (hash.includes('models')) tab = 'models';
      else if (hash.includes('agents')) tab = 'agents';
      else if (hash.includes('skills')) tab = 'skills';
      else if (hash.includes('memory')) tab = 'memory';
      openFullscreenSettings(tab);
    }
  }
  checkUrlForAutoSettings();
  window.addEventListener('hashchange', checkUrlForAutoSettings);

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'openSettingsOverlay') {
          openFullscreenSettings(msg.tab || 'ai');
        } else if (msg && msg.action === 'openAppsOverlay') {
          openAppsView(msg.url || null, msg.name || null);
        }
      });
    }
  } catch (e) {}

  window.addEventListener('message', (e) => {
    if (e.data?.action === 'closeSettings') {
      closeFullscreenSettings();
    } else if (e.data?.action === 'openApps') {
      openAppsView(e.data?.url || null, e.data?.name || null);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (appsCatalogOverlay && appsCatalogOverlay.style.display !== 'none') {
        appsCatalogOverlay.style.display = 'none';
        btnToggleAppsCatalog?.classList.remove('active');
      } else if (appsOverlay && appsOverlay.style.display !== 'none') {
        closeAppsView();
      } else if (settingsOverlay && settingsOverlay.style.display !== 'none') {
        closeFullscreenSettings();
      }
    }
  });

  // Smooth & Natural Background Grid Parallax with Organic Delay / Inertia
  let currentParallaxY = 0;
  let targetParallaxY = 0;
  let parallaxAnimFrame = null;

  function renderGridParallax() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    // Same direction as chat (moves up with chat), subtle 10% depth ratio
    targetParallaxY = -scrollY * 0.10;

    // Organic Lerp easing for silky delay (0.07 dampening factor)
    currentParallaxY += (targetParallaxY - currentParallaxY) * 0.07;
    document.documentElement.style.setProperty('--parallax-grid-y', `${currentParallaxY.toFixed(2)}px`);

    if (Math.abs(targetParallaxY - currentParallaxY) > 0.05) {
      parallaxAnimFrame = window.requestAnimationFrame(renderGridParallax);
    } else {
      currentParallaxY = targetParallaxY;
      document.documentElement.style.setProperty('--parallax-grid-y', `${currentParallaxY.toFixed(2)}px`);
      parallaxAnimFrame = null;
    }
  }

  window.addEventListener('scroll', () => {
    if (!parallaxAnimFrame) {
      parallaxAnimFrame = window.requestAnimationFrame(renderGridParallax);
    }
  }, { passive: true });
});
