# Chrome Web Store Listing — Antigravity CLI Agent

> Last Updated: 2026-06-11

## Store Listing

**Extension Name** [REQUIRED]
Antigravity CLI Agent Sidebar

**Short Description** [REQUIRED]
Runs the Antigravity CLI agent inside your browser sidebar and enables automatic web page automation via Browser MCP.

**Detailed Description** [REQUIRED]
Antigravity CLI Agent Sidebar brings the power of the Antigravity autonomous AI agent directly into your browser's side panel. 

Key Features:
* Full Terminal Access: Control the Antigravity CLI (agy) natively from a premium terminal container in your side panel.
* Zero-Configuration Browser Control: Automatically connects to the active browser tab without requiring any external extension.
* Real-Time Synchronization: The AI agent automatically follows tab changes, page reloads, and window focus changes.
* CDP-Powered Automation: High-performance click, scroll, drag, type, and hover actions simulating natural human interactions.
* Debugging Log Integration: Automatically pipes webpage console logs and exceptions back to the agent for fast troubleshooting.

How to use:
1. Open the sidebar by clicking the Antigravity extension icon.
2. The sidebar will automatically launch your local Antigravity CLI session and establish a WebSockets link for browser automation.
3. Chat with the agent or ask it to navigate and run tasks. It will perform them on the active tab you are viewing!

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Integrates the Antigravity CLI terminal in the sidebar and automates active browser tab interactions.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |

### Screenshot Notes
* Screenshot 1: Sidebar terminal open beside a Google page showing terminal text.
* Screenshot 2: Visual highlights and cursor indicator showing active tab control.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| sidePanel | permissions | Required to render the interactive terminal user interface directly within Chrome's side panel. |
| nativeMessaging | permissions | Required to run the local Python bridge (native messaging host) that launches and communicates with the `agy` CLI binary. |
| cookies | permissions | Allows the helper tools to retrieve and set site-specific settings (e.g., forcing Dark Mode on YouTube). |
| scripting | permissions | Used to inject helper scripts (`content.js`) into pages for rendering visual focus highlights and calculating elements. |
| tabs | permissions | Needed to read the current tab URL and Title to decide which page to attach the control debugger to. |
| debugger | permissions | Required to send native mouse clicks, drags, hovers, scroll events, and keystrokes using the Chrome DevTools Protocol. |
| storage | permissions | Stores user preferences and connection states. |
| webNavigation | permissions | Listens to page loading progress to coordinate automation actions safely. |
| <all_urls> | host_permissions | Allows the agent's content scripts and debugger to execute automation tasks on any webpage you choose to visit. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No (It runs completely locally on your machine, connecting to your local CLI server on port 9009 via WebSockets).

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
https://github.com/arya/antigravity-chrome-extension/blob/main/PRIVACY.md

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
Arya Dev

**Contact Email** [REQUIRED]
arstatedrive4@gmail.com

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-11 | Initial release with built-in PTY terminal and integrated Browser MCP. | Draft |
