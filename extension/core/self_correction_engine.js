/**
 * =========================================================================
 * Browser Agent - Self-Correction & Reflection Engine (Option 1)
 * Evaluator-Optimizer & Reflexion Pattern for Autonomous Error Recovery
 * =========================================================================
 */

(function(global) {
  'use strict';

  const MAX_ACTION_RETRIES = 3;

  /**
   * Evaluates if a tool execution resulted in a failure, error, or incomplete state
   */
  function isToolExecutionFailure(toolName, toolResult) {
    if (!toolResult) return true;

    // Direct error flags
    if (toolResult.status === 'error' || toolResult.success === false) return true;
    if (toolResult.error !== undefined && toolResult.error !== null && toolResult.error !== false && toolResult.error !== '') return true;

    // String content failure heuristics
    const resultStr = typeof toolResult === 'string' 
      ? toolResult 
      : (typeof toolResult.message === 'string' ? toolResult.message : JSON.stringify(toolResult));

    const lower = resultStr.toLowerCase();
    
    // Explicit failure keywords
    const failureKeywords = [
      'element not found',
      'node not found',
      'not clickable',
      'is not visible',
      'could not be scrolled into view',
      'execution failed',
      'command failed',
      'command not found',
      'syntaxerror',
      'typeerror',
      'referenceerror',
      'permission denied',
      'connection refused',
      'net::err_',
      'target closed',
      'timeout exceeded',
      'timed out',
      'failed to fetch',
      'gagal',
      'tidak ditemukan',
      'error code:',
      'exit status 1',
      'exit status 2',
      'exit status 127',
      'exit status 255'
    ];

    for (const kw of failureKeywords) {
      if (lower.includes(kw)) return true;
    }

    return false;
  }

  /**
   * Generates a context-aware diagnostic reflection prompt for the LLM to guide self-correction
   */
  function generateReflectionPrompt(toolName, toolArgs, toolResult, retryCount = 1) {
    const errText = typeof toolResult === 'string' 
      ? toolResult 
      : (toolResult.error || toolResult.message || JSON.stringify(toolResult));

    let specificDiagnosis = '';
    let recommendedStrategies = [];

    const lowerTool = (toolName || '').toLowerCase();
    const lowerErr = (errText || '').toLowerCase();

    if (lowerTool.includes('click')) {
      specificDiagnosis = 'Aksi klik gagal atau elemen tidak dapat diinteraksi secara langsung.';
      recommendedStrategies = [
        '1. Periksa apakah elemen berada di luar viewport (Gunakan scroll atau cari selector alternatif).',
        '2. Periksa apakah ada modal, pop-up, atau cookie consent banner yang menutupi elemen (Tutup banner terlebih dahulu).',
        '3. Ambil snapshot DOM terbaru via `browser_snapshot` untuk memperbarui indeks elemen.',
        '4. Coba gunakan simulasi ketuk/klik alternatif atau evaluasi JavaScript jika selector berubah.'
      ];
    } else if (lowerTool.includes('type') || lowerTool.includes('input')) {
      specificDiagnosis = 'Gagal mengetikkan teks ke dalam kolom input form.';
      recommendedStrategies = [
        '1. Pastikan elemen input difokuskan terlebih dahulu via `browser_click`.',
        '2. Periksa apakah form memerlukan klik langsung pada placeholder atau dropdown.',
        '3. Bersihkan isi input sebelumnya jika ada validasi form.'
      ];
    } else if (lowerTool.includes('navigate') || lowerTool.includes('switch_tab')) {
      specificDiagnosis = 'Gagal memuat URL atau berpindah tab browser.';
      recommendedStrategies = [
        '1. Periksa format protokol URL (pastikan menyertakan https://).',
        '2. Pastikan tab browser masih terbuka dan aktif.',
        '3. Coba muat ulang (refresh) atau buka kembali halaman target.'
      ];
    } else if (lowerTool.includes('bash') || lowerTool.includes('command') || lowerTool.includes('python')) {
      specificDiagnosis = 'Eksekusi script / perintah CLI Linux mengembalikan kode error non-zero.';
      recommendedStrategies = [
        '1. Periksa pesan error output CLI secara teliti.',
        '2. Gunakan perintah alternatif (contoh: curl vs wget, pdftoppm vs ghostscript, python vs bash).',
        '3. Verifikasi ketersediaan file input di path yang dituju sebelum memproses.'
      ];
    } else {
      specificDiagnosis = `Tool '${toolName}' mengembalikan status error atau respon tidak valid.`;
      recommendedStrategies = [
        '1. Analisis detail pesan error yang dikembalikan.',
        '2. Evaluasi parameter input yang dikirim dan perbaiki formatnya.',
        '3. Gunakan tool alternatif yang sesuai untuk mencapai tujuan yang sama.'
      ];
    }

    const stratText = recommendedStrategies.join('\n');

    return `⚠️ [SYSTEM SELF-CORRECTION & REFLECTION (Percobaan Koreksi #${retryCount}/${MAX_ACTION_RETRIES})]:
• Tool Target: ${toolName}
• Diagnosis: ${specificDiagnosis}
• Detail Error: ${errText.slice(0, 400)}

PANDUAN KOREKSI MANDIRI (RECOVERY STRATEGY):
${stratText}

MANDAT EVALUASI:
1. JANGAN MENYERAH dan DILARANG menghentikan tugas hanya karena error satu langkah!
2. Analisis akar penyebab error di atas secara kritis pada pemikiran Anda (Reasoning).
3. Rumuskan rencana perbaikan alternatif dan eksekusi tool korektif pada langkah ini sekarang!`;
  }

  /**
   * Action failure tracker instance to prevent infinite loops
   */
  function createFailureTracker(maxRetries = MAX_ACTION_RETRIES) {
    const actionFailures = new Map();

    return {
      recordFailure(toolName, toolArgs) {
        const key = `${toolName}_${JSON.stringify(toolArgs || {})}`;
        const count = (actionFailures.get(key) || 0) + 1;
        actionFailures.set(key, count);
        return count;
      },
      getRetryCount(toolName, toolArgs) {
        const key = `${toolName}_${JSON.stringify(toolArgs || {})}`;
        return actionFailures.get(key) || 0;
      },
      hasExceededMaxRetries(toolName, toolArgs) {
        const count = this.getRetryCount(toolName, toolArgs);
        return count >= maxRetries;
      },
      reset(toolName, toolArgs) {
        if (toolName) {
          const key = `${toolName}_${JSON.stringify(toolArgs || {})}`;
          actionFailures.delete(key);
        } else {
          actionFailures.clear();
        }
      }
    };
  }

  const SelfCorrectionEngine = {
    MAX_ACTION_RETRIES,
    isToolExecutionFailure,
    generateReflectionPrompt,
    createFailureTracker
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelfCorrectionEngine;
  } else {
    global.SelfCorrectionEngine = SelfCorrectionEngine;
  }
})(typeof self !== 'undefined' ? self : this);
