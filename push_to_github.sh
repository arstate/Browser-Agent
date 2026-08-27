#!/usr/bin/env bash
# =============================================================================
# Script: Push Update Caveman, KV Cache & Ponytail Plugins to GitHub
# Repository: https://github.com/arstate/Browser-Agent
# =============================================================================

set -e

REPO_DIR="/home/arya/browser-agent"
cd "$REPO_DIR"

echo "📦 Menyiapkan perubahan untuk staging git..."
git add \
  "CORE SKILLS/" \
  "extension/icons/plugins/" \
  "extension/plugins/ponytail/" \
  "extension/plugins/kvcache/" \
  "extension/plugins/caveman/" \
  "extension/background.js" \
  "extension/sidepanel.js" \
  "extension/options.html" \
  "push_to_github.sh"

COMMIT_MSG="feat(plugins): add Caveman output compressor plugin & ensure KV Cache visibility

- Add Caveman Plugin (JuliusBrussee/caveman) with telegraphic speak, zero fluff, and byte-exact code preservation
- Add Caveman sub-skills: /investigate-first, /surgical-patch, /safe-refactor, /verify-and-stop, /lean-build, /migration
- Register Skill 18: Caveman Output Compressor in CORE SKILLS
- Ensure KV Cache & Caveman cards and modals are seamlessly rendered in options.html
- Add glowing Caveman icon and dark luxury amber modal UI"

echo "💾 Melakukan commit: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG" || echo "Tidak ada perubahan baru untuk dicommit."

echo "🚀 Melakukan push ke origin master..."
git push origin master

echo "✅ Berhasil push update ke https://github.com/arstate/Browser-Agent!"
