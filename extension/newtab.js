// =========================================================================
// Browser Agent - Full-Screen New Tab Utilities
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const recentSitesGrid = document.getElementById('recent-sites-grid');
  const btnSwitchDefault = document.getElementById('btn-switch-default-tab');
  const chatInput = document.getElementById('chat-input');

  // Google Search quick switch
  if (btnSwitchDefault) {
    btnSwitchDefault.addEventListener('click', () => {
      window.location.href = "https://www.google.com";
    });
  }

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
    openFullscreenSettings('ai');
  });

  if (btnCloseSettingsOverlay) {
    btnCloseSettingsOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      closeFullscreenSettings();
    });
  }

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
});
