// Enable opening the side panel when clicking the extension icon safely
const enableSidePanelOnAction = async () => {
  try {
    if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === "function") {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    // Silently handle race condition during SW startup/reload
  }
};

chrome.runtime.onInstalled.addListener(enableSidePanelOnAction);
chrome.runtime.onStartup.addListener(enableSidePanelOnAction);
enableSidePanelOnAction();

// Track Side Panel open state across tabs
let isSidePanelOpen = false;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    isSidePanelOpen = true;
    broadcastSidePanelState(true);

    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
      broadcastSidePanelState(false);
    });
  }
});

function broadcastSidePanelState(isOpen) {
  try {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;
      tabs.forEach((t) => {
        if (t.id) {
          chrome.tabs.sendMessage(t.id, { type: "SIDEPANEL_VISIBILITY", isOpen }).catch(() => {});
        }
      });
    });
  } catch (e) {}
}

// Listen for runtime messages (e.g. from content scripts floating widget)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "CHECK_SIDEPANEL_OPEN") {
    sendResponse({ isOpen: isSidePanelOpen });
    return true;
  }

  if (message && message.type === "OPEN_SIDE_PANEL") {
    if (sender && sender.tab && sender.tab.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(err => {
        if (sender.tab.windowId) {
          chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {});
        }
      });
    }
    sendResponse({ status: "ok" });
    return true;
  }
  sendResponse({ status: "ok" });
  return true;
});

