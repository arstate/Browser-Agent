#!/usr/bin/env bash
# =============================================================================
# Script: Push Update Global Shadows ON/OFF Performance Mode to GitHub
# Repository: https://github.com/arstate/Browser-Agent
# =============================================================================

set -e

REPO_DIR="/home/arya/browser-agent"
cd "$REPO_DIR"

echo "📦 Menyiapkan perubahan untuk staging git..."
git add \
  "CORE SKILLS/" \
  "extension/icons/plugins/" \
  "extension/plugins/" \
  "extension/background.js" \
  "extension/sidepanel.js" \
  "extension/sidepanel.css" \
  "extension/newtab.js" \
  "extension/newtab.css" \
  "extension/options.html" \
  "extension/options.js" \
  "extension/options.css" \
  "push_to_github.sh"

COMMIT_MSG="feat(ui): add global shadows ON/OFF toggle for ultra-lightweight performance

- Add 'Efek Bayangan (Box Shadows & Glow)' toggle switch in Tampilan & UI settings
- Add global .no-shadows styling eliminating all GPU box-shadow, text-shadow, and drop-shadows
- Synchronize shadow preference real-time across Options, New Tab, and Sidepanel
- Persist setting_enable_shadows in chrome.storage.local"

echo "💾 Melakukan commit: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG" || echo "Tidak ada perubahan baru untuk dicommit."

echo "🚀 Melakukan push ke origin master..."
git push origin master

echo "✅ Berhasil push update ke https://github.com/arstate/Browser-Agent!"
