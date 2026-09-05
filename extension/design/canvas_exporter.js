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
    notify("📑 Mengompilasi PDF layout via OpenDesign...");
    try {
      if (window.OpenDesignBridge?.exportArtifact) {
        const res = await window.OpenDesignBridge.exportArtifact({
          htmlContent: artifact.html,
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
      // Fallback: download HTML for print to PDF
      const blob = new Blob([artifact.html], { type: "text/html" });
      triggerDownloadBlob(blob, `${cleanTitle}.html`);
      notify("ℹ️ Mengunduh HTML untuk Print to PDF.");
    } catch (err) {
      notify("❌ Gagal ekspor PDF: " + (err.message || String(err)));
    }
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

// Global attachments
if (typeof window !== "undefined") {
  window.triggerDownloadBlob = triggerDownloadBlob;
  window.base64ToBlob = base64ToBlob;
  window.handleCanvasExport = handleCanvasExport;
}
