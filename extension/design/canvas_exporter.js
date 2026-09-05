// =========================================================================
// CANVAS EXPORTER (OpenDesign Bundle, Standalone HTML, PDF, PNG)
// Multi-format artifact packaging, base64 conversion & download triggering
// =========================================================================

function triggerDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64ToBlob(b64Data, contentType = "", sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}

async function handleCanvasExport(format) {
  const artifact = (typeof getActiveDesignArtifact === "function")
    ? getActiveDesignArtifact()
    : (window.getActiveDesignArtifact ? window.getActiveDesignArtifact() : window.activeDesignArtifact);

  if (!artifact?.html) return;
  const rawTitle = artifact.meta?.title || "opendesign_project";
  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "design";

  const notify = (msg) => {
    if (typeof showUniversalToast === "function") {
      showUniversalToast(msg);
    } else if (window.showUniversalToast) {
      window.showUniversalToast(msg);
    } else {
      console.log(msg);
    }
  };

  const getVFiles = (art) => {
    if (typeof generateVirtualFiles === "function") return generateVirtualFiles(art);
    if (typeof window !== "undefined" && typeof window.generateVirtualFiles === "function") return window.generateVirtualFiles(art);
    return [];
  };

  if (format === "zip") {
    notify("📦 Mengemas full project bundle ZIP...");
    const vFiles = getVFiles(artifact);
    const fileMap = {};
    vFiles.forEach(f => {
      fileMap[f.name] = f.content;
    });

    try {
      if (window.OpenDesignBridge?.exportBundleZip) {
        const res = await window.OpenDesignBridge.exportBundleZip(fileMap, cleanTitle);
        if (res?.base64_data) {
          const blob = base64ToBlob(res.base64_data, "application/zip");
          triggerDownloadBlob(blob, `${cleanTitle}-bundle.zip`);
          notify(`✅ Full Project Bundle ${cleanTitle}-bundle.zip berhasil diunduh!`);
          return;
        } else if (res?.out_path) {
          notify(`✅ Project ZIP tersimpan di: ${res.out_path}`);
          return;
        }
      }
      // Fallback: download standalone HTML
      const blob = new Blob([artifact.html], { type: "text/html" });
      triggerDownloadBlob(blob, `${cleanTitle}.html`);
      notify("✅ Standalone HTML berhasil diunduh!");
    } catch (err) {
      notify("❌ Gagal ekspor zip: " + (err.message || String(err)));
    }
    return;
  }

  if (format === "html") {
    const blob = new Blob([artifact.html], { type: "text/html" });
    triggerDownloadBlob(blob, `${cleanTitle}.html`);
    notify(`✅ File ${cleanTitle}.html berhasil diunduh!`);
    return;
  }

  if (format === "pdf") {
    await exportSlideDeckPdf(artifact.html, cleanTitle);
    return;
  }

  if (format === "image") {
    notify("🖼️ Merender snapshot gambar PNG...");
    try {
      if (window.OpenDesignBridge?.exportArtifact) {
        const res = await window.OpenDesignBridge.exportArtifact({
          htmlContent: artifact.html,
          format: "image"
        });
        if (res?.base64_data) {
          const blob = base64ToBlob(res.base64_data, "image/png");
          triggerDownloadBlob(blob, `${cleanTitle}.png`);
          notify(`✅ Snapshot gambar ${cleanTitle}.png berhasil diunduh!`);
          return;
        } else if (res?.out_path) {
          notify(`✅ Snapshot tersimpan: ${res.out_path}`);
          return;
        }
      }
      notify("ℹ️ Fitur snapshot memerlukan OpenDesign Desktop runtime.");
    } catch (err) {
      notify("❌ Gagal render snapshot: " + (err.message || String(err)));
    }
    return;
  }
}

async function exportSlideDeckPdf(htmlContent, title = "presentation") {
  const notify = (msg) => {
    if (typeof showUniversalToast === "function") {
      showUniversalToast(msg);
    } else if (typeof window !== "undefined" && window.showUniversalToast) {
      window.showUniversalToast(msg);
    } else {
      console.log(msg);
    }
  };

  if (!htmlContent) return;
  notify("📑 Mengompilasi PDF Slide Vektor 16:9 di background...");

  let sanitizedHtml = String(htmlContent || '')
    .replace(/<style\b[^>]*id=["']slide-deck-controller-style["'][^>]*>[\s\S]*?<\/style>/gi, '');

  const printPaginationCss = `<style id="bulletproof-pdf-print-pagination">
@page { size: 1200px 675px !important; margin: 0 !important; }
@media print {
  *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { background: var(--bg-slide, #0b0f19) !important; color: var(--text-main, #ffffff) !important; overflow: visible !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
  .presentation-workspace { display: block !important; width: 100% !important; height: auto !important; overflow: visible !important; position: static !important; }
  .deck-sidebar, .deck-floating-dock, nav, aside, button, .deck-dock-wrap { display: none !important; }
  .deck-stage-wrap { padding: 0 !important; margin: 0 !important; height: auto !important; display: block !important; overflow: visible !important; background: var(--bg-slide, #0b0f19) !important; position: static !important; }
  .slide-section { display: flex !important; opacity: 1 !important; visibility: visible !important; transform: none !important; width: 1200px !important; height: 675px !important; min-width: 1200px !important; min-height: 675px !important; max-width: 1200px !important; max-height: 675px !important; page-break-after: always !important; page-break-inside: avoid !important; break-after: page !important; break-inside: avoid !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; background: var(--bg-slide, #0b0f19) !important; position: relative !important; }
  .slide-canvas { height: 100% !important; width: 100% !important; box-shadow: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; box-sizing: border-box !important; }
}
</style>`;

  if (sanitizedHtml.includes('</head>')) {
    sanitizedHtml = sanitizedHtml.replace('</head>', printPaginationCss + '\n</head>');
  } else {
    sanitizedHtml = printPaginationCss + sanitizedHtml;
  }

  const rawTitle = title || "slide_deck";
  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "presentation";

  try {
    const rpcFn = (typeof sendNativeRpc === "function")
      ? sendNativeRpc
      : (typeof window !== "undefined" && typeof window.sendNativeRpc === "function" ? window.sendNativeRpc : null);

    if (rpcFn) {
      const res = await rpcFn("export_slide_deck_pdf", {
        html_content: sanitizedHtml,
        title: cleanTitle
      });

      if (res?.status === "ok" && res?.base64_data) {
        const blob = base64ToBlob(res.base64_data, "application/pdf");
        const finalFilename = res.filename || `${cleanTitle}.pdf`;
        triggerDownloadBlob(blob, finalFilename);
        notify(`✅ Berhasil mengunduh ${finalFilename} (Vektor 16:9)!`);
        return;
      }
    }

    // Fallback: OpenDesignBridge
    if (typeof window !== "undefined" && window.OpenDesignBridge?.exportArtifact) {
      const res = await window.OpenDesignBridge.exportArtifact({
        htmlContent: sanitizedHtml,
        format: "pdf"
      });
      if (res?.base64_data) {
        const blob = base64ToBlob(res.base64_data, "application/pdf");
        triggerDownloadBlob(blob, `${cleanTitle}.pdf`);
        notify(`✅ File PDF ${cleanTitle}.pdf berhasil diunduh!`);
        return;
      } else if (res?.out_path) {
        notify(`✅ File PDF tersimpan: ${res.out_path}`);
        return;
      }
    }

    // Fallback: download standalone HTML
    const blob = new Blob([sanitizedHtml], { type: "text/html" });
    triggerDownloadBlob(blob, `${cleanTitle}.html`);
    notify("ℹ️ Mengunduh HTML untuk Print to PDF.");
  } catch (err) {
    notify("❌ Gagal ekspor PDF slide: " + (err.message || String(err)));
  }
}

// Listen to postMessage from iframe
if (typeof window !== "undefined" && typeof window.addEventListener === "function" && !window.__slideDeckExportListenerAdded) {
  window.__slideDeckExportListenerAdded = true;
  window.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.type === "EXPORT_SLIDE_DECK_PDF") {
      exportSlideDeckPdf(e.data.html, e.data.title);
    } else if (e.data.type === "EDIT_MODE_TOGGLED") {
      const btn = document.getElementById("btn-canvas-edit-mode");
      if (btn) {
        btn.classList.toggle("active", Boolean(e.data.active));
        btn.title = e.data.active ? "Keluar Mode Edit" : "Mode Edit Realtime";
      }
    } else if (e.data.type === "SLIDE_DECK_CONTENT_CHANGED" && e.data.html) {
      if (window.activeDesignArtifact) {
        window.activeDesignArtifact.html = e.data.html;
      }
      const codeDisplay = document.getElementById("canvas-code-display");
      if (codeDisplay) {
        codeDisplay.textContent = e.data.html;
      }
      if (typeof showUniversalToast === "function") {
        showUniversalToast("💾 Perubahan slide tersimpan");
      }
    }
  });
}

// Global attachments
if (typeof window !== "undefined") {
  window.triggerDownloadBlob = triggerDownloadBlob;
  window.base64ToBlob = base64ToBlob;
  window.handleCanvasExport = handleCanvasExport;
  window.exportSlideDeckPdf = exportSlideDeckPdf;
}
