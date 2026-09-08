/**
 * =========================================================================
 * Browser Agent - Semantic Critic & Autonomous Quality Evaluation Engine
 * Actor-Critic / Evaluator-Optimizer Pattern for Ground-Truth & Completeness
 * =========================================================================
 */

(function(global) {
  "use strict";

  const MAX_CRITIC_REFINE_TURNS = 2; // Maksimal 2x iterasi perbaikan mandiri demi mencegah infinite loop

  /**
   * Mengecek apakah respon teks asisten merupakan jawaban substantif yang bermakna
   * (bukan placeholder, bukan sekadar kalimat tunggu, dan bukan string kosong)
   */
  function isSubstantiveResponse(text) {
    if (!text || typeof text !== "string") return false;
    const clean = text.trim();
    if (clean.length < 20) return false;

    // Deteksi jika hanya teks transit / pembuka aksi tool
    const transitionalPatterns = [
      /^(?:baik|oke|siap|tunggu|mohon tunggu|sedang memproses|sedang mencari|sebentar ya|akan saya periksa)[^\n\.\!]{0,60}[\.\!\s]*$/i,
      /^(?:saya akan membuka|mari kita telusuri|saya bantu cek)[^\n\.\!]{0,60}[\.\!\s]*$/i
    ];

    for (const pat of transitionalPatterns) {
      if (pat.test(clean)) return false;
    }

    return true;
  }

  /**
   * Deteksi apakah respon merupakan jawaban mengelak / cop-out padahal ada data/tool
   */
  function isCopOutOrVague(text) {
    if (!text || typeof text !== "string") return false;
    const lower = text.toLowerCase();

    const copOutPhrases = [
      "saya tidak dapat mengakses",
      "saya tidak memiliki akses",
      "maaf saya tidak tahu",
      "sebagai ai, saya tidak dapat",
      "saya tidak bisa membantu",
      "tidak ada informasi yang tersedia sama sekali"
    ];

    return copOutPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Ekstraksi batasan / kontrak eksplisit dari prompt pengguna
   * (misal: "buatkan 5 contoh", "tampilkan dalam tabel", "cantumkan harga")
   */
  function extractPromptConstraints(userPrompt) {
    if (!userPrompt || typeof userPrompt !== "string") return [];
    const constraints = [];
    const lower = userPrompt.toLowerCase();

    // 1. Ekstraksi kuantitas angka: "5 contoh", "3 perumahan", "10 ide"
    const countMatch = lower.match(/\b(\d+)\s*(?:rekomendasi|contoh|poin|ide|opsi|nama|perumahan|unit|judul|langkah|strategi)\b/);
    if (countMatch) {
      constraints.push({
        type: "count",
        targetCount: parseInt(countMatch[1], 10),
        description: `Minimal ${countMatch[1]} item/entitas yang diminta`
      });
    }

    // 2. Ekstraksi format tabel
    if (lower.includes("tabel") || lower.includes("dalam bentuk tabel") || lower.includes("format tabel")) {
      constraints.push({
        type: "format_table",
        description: "Format output berupa tabel Markdown (| Kolom |)"
      });
    }

    // 3. Ekstraksi kebutuhan finansial / harga jika diminta eksplisit
    if (lower.includes("harga") || lower.includes("biaya") || lower.includes("cicilan") || lower.includes("angsuran") || lower.includes("nominal")) {
      constraints.push({
        type: "price_details",
        description: "Informasi rincian nominal harga / estimasi biaya / angsuran"
      });
    }

    // 4. Ekstraksi kontak / nomor telepon / link jika diminta
    if (lower.includes("nomor") || lower.includes("telepon") || lower.includes("kontak") || lower.includes("wa ") || lower.includes("whatsapp")) {
      constraints.push({
        type: "contact_info",
        description: "Informasi nomor kontak / narahubung"
      });
    }

    return constraints;
  }

  /**
   * Mengevaluasi apakah draft jawaban asisten memenuhi kriteria dan batasan dari user
   */
  function evaluateDraftAgainstConstraints(userPrompt, assistantDraft) {
    const constraints = extractPromptConstraints(userPrompt);
    const missing = [];
    const text = assistantDraft || "";

    for (const c of constraints) {
      if (c.type === "count") {
        const listItems = text.match(/(?:^|\n)\s*(?:\d+[\.\)]|[-*•])\s+[^\n]+/g) || [];
        if (listItems.length < Math.min(c.targetCount, 3) && text.length < 300) {
          missing.push(`Kuantitas poin belum lengkap (diminta ${c.targetCount}, terdeteksi ${listItems.length})`);
        }
      } else if (c.type === "format_table") {
        const hasTable = /\|(?:[^\n\|]+\|)+\n\|(?:\s*[-:]+[-| :]*)\|\n(?:\|(?:[^\n\|]+\|)+\n?)+/.test(text);
        if (!hasTable) {
          missing.push("Format tabel belum tersedia (pengguna meminta format tabel Markdown)");
        }
      } else if (c.type === "price_details") {
        const hasNumbersOrCurrency = /(?:rp|idr|\$|\bjt\b|\bjuta\b|\bribu\b|\d{1,3}(?:\.\d{3})+)/i.test(text);
        if (!hasNumbersOrCurrency && text.length > 50) {
          missing.push("Rincian nominal harga/angsuran belum dicantumkan secara konkret");
        }
      }
    }

    return missing;
  }

  /**
   * Fungsi Evaluator Utama: Menilai kualitas jawaban secara komprehensif
   * Returns: { passed: boolean, shouldRefine: boolean, reason: string, actionableGuidance: string }
   */
  function evaluateResponseQuality(userPrompt, assistantDraft, executionContext = {}) {
    const retryCount = executionContext.criticRetryCount || 0;

    // Circuit Breaker: Jika sudah 2x revisi atau mendekati batas maxSteps, WAJIB loloskan agar tidak looping!
    if (retryCount >= MAX_CRITIC_REFINE_TURNS) {
      return {
        passed: true,
        shouldRefine: false,
        reason: "Circuit breaker reached (Max refine turns reached). Releasing response cleanly."
      };
    }

    if (executionContext.currentStep && executionContext.maxSteps && executionContext.currentStep >= executionContext.maxSteps - 2) {
      return {
        passed: true,
        shouldRefine: false,
        reason: "Max steps safety threshold reached. Releasing response cleanly."
      };
    }

    // 1. Cek Kekosongan Teks
    if (!isSubstantiveResponse(assistantDraft)) {
      return {
        passed: false,
        shouldRefine: true,
        reason: "Respon belum memiliki konten substantif yang menjawab pertanyaan pengguna.",
        actionableGuidance: "Sajikan jawaban final yang lengkap, jelas, dan langsung menjawab inti permintaan pengguna tanpa kata-kata penundaan."
      };
    }

    // 2. Cek jika ada tool error di akhir yang belum ditangani
    if (executionContext.lastToolFailed && !assistantDraft.toLowerCase().includes("kendala") && !assistantDraft.toLowerCase().includes("alternatif")) {
      return {
        passed: false,
        shouldRefine: true,
        reason: "Tool pendukung sebelumnya mengalami error dan belum dimitigasi pada jawaban.",
        actionableGuidance: "Jelaskan hasil mitigasi atau gunakan tool alternatif yang relevan."
      };
    }

    // 3. Cek Cop-Out (Mengelak tanpa alasan jelas padahal ada tool)
    if (isCopOutOrVague(assistantDraft) && (executionContext.toolCount || 0) === 0) {
      return {
        passed: false,
        shouldRefine: true,
        reason: "Jawaban terindikasi mengelak (cop-out) padahal tool pencarian/dokumen tersedia.",
        actionableGuidance: "Gunakan tool browser, baca dokumen, atau perintah sistem untuk menemukan fakta nyata sebelum menyimpulkan."
      };
    }

    // 4. Cek Kontrak Permintaan Pengguna
    const missingConstraints = evaluateDraftAgainstConstraints(userPrompt, assistantDraft);
    if (missingConstraints.length > 0) {
      return {
        passed: false,
        shouldRefine: true,
        reason: `Ditemukan poin yang belum terpenuhi: ${missingConstraints.join("; ")}`,
        actionableGuidance: `Pertahankan teks yang sudah benar di atas. Lengkapi kekurangan berikut: ${missingConstraints.join(", ")}.`
      };
    }

    // Lolos seluruh kriteria evaluasi!
    return {
      passed: true,
      shouldRefine: false,
      reason: "Semua kriteria substantif dan kontrak pengguna terpenuhi 100%."
    };
  }

  /**
   * Menyusun prompt panduan koreksi terarah (Targeted Guidance)
   * Bebas dari kata-kata intimidatif/bentakan agar tidak memicu sycophancy atau halusinasi!
   */
  function generateTargetedCriticPrompt(evalResult, retryCount = 1) {
    return `📋 [AUTONOMOUS QUALITY AUDIT & TARGETED REFINEMENT (#${retryCount}/${MAX_CRITIC_REFINE_TURNS})]:
Evaluasi kualitas sistem mendeteksi ada poin yang dapat disempurnakan:
• Catatan: ${evalResult.reason}
• Arahan Presisi: ${evalResult.actionableGuidance || "Lengkapi bagian yang kurang secara akurat."}

MANDAT PENYEMPURNAAN (ANTI-OVERTHINKING):
1. PERTAHANKAN seluruh data, angka, dan analisa yang sudah benar pada draft sebelumnya.
2. FOKUS HANYA melengkapi atau menyempurnakan poin yang disebutkan di atas secara ringkas dan presisi.
3. Begitu selesai dilengkapi, sajikan jawaban akhir yang utuh tanpa perlu meminta izin lagi.`;
  }

  /**
   * Factory untuk pelacak revisi kritik per pesan percakapan
   */
  function createCriticTracker() {
    let retries = 0;
    return {
      getRetries() { return retries; },
      increment() { return ++retries; },
      hasExceeded() { return retries >= MAX_CRITIC_REFINE_TURNS; },
      reset() { retries = 0; }
    };
  }

  const SemanticCriticEngine = {
    MAX_CRITIC_REFINE_TURNS,
    isSubstantiveResponse,
    isCopOutOrVague,
    extractPromptConstraints,
    evaluateDraftAgainstConstraints,
    evaluateResponseQuality,
    generateTargetedCriticPrompt,
    createCriticTracker
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SemanticCriticEngine;
  } else {
    global.SemanticCriticEngine = SemanticCriticEngine;
  }
})(typeof self !== "undefined" ? self : this);
