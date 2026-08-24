// =========================================================================
// Browser Agent - Full-Screen New Tab Utilities
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const recentSitesGrid = document.getElementById('recent-sites-grid');
  const chatInput = document.getElementById('chat-input');

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

  // Preload settings iframe in background for instant cut
  if (settingsIframe && !settingsIframe.src) {
    settingsIframe.src = 'options.html#ai';
  }

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

  // Home Button (Back to Chat / Reset to Clean Welcome Screen)
  document.getElementById('btn-header-new-chat')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeFullscreenSettings();
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
    openFullscreenSettings('ai');
  }, true);

  if (btnCloseSettingsOverlay) {
    btnCloseSettingsOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      closeFullscreenSettings();
    });
  }

  // Auto-open settings overlay if opened with hash (e.g. newtab.html#settings)
  function checkUrlForAutoSettings() {
    const hash = window.location.hash;
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
        }
      });
    }
  } catch (e) {}

  window.addEventListener('message', (e) => {
    if (e.data?.action === 'closeSettings') {
      closeFullscreenSettings();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsOverlay && settingsOverlay.style.display !== 'none') {
      closeFullscreenSettings();
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
