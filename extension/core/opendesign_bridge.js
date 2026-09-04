/**
 * Browser Agent - OpenDesign Native Bridge
 * Seamless, Zero-Config Integration with OpenDesign Daemon & Engine
 * 
 * Features:
 * 1. Zero-Config Daemon Supervisor: Auto-detects port 7456 and auto-wakes background daemon.
 * 2. 152 Brand Design Systems: Directly access tokens.css, DESIGN.md, and manifests.
 * 3. 5 Built-in Posture Directions: Retrieve font stacks, palettes, and posture rules.
 * 4. Headless Anti-Slop Linter: Audit HTML artifacts for contrast, a11y, and hierarchy.
 * 5. Programmatic Exporter: Export projects to standalone HTML, PDF, image, or PPTX.
 */

(function(global) {
  'use strict';

  class OpenDesignBridgeClient {
    constructor() {
      this.defaultPort = 7456;
      this.cachedStatus = null;
      this.cachedDesignSystems = null;
    }

    /**
     * Checks if sendNativeRpc is available in current context.
     * @returns {boolean}
     */
    isNativeRpcAvailable() {
      return typeof global.sendNativeRpc === 'function';
    }

    /**
     * Get real-time status of OpenDesign CLI & Daemon
     * @param {number} port
     * @returns {Promise<Object>}
     */
    async getStatus(port = this.defaultPort) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        const res = await global.sendNativeRpc('od_get_status', { port });
        this.cachedStatus = res;
        return res;
      } catch (err) {
        console.warn('[OpenDesignBridge] getStatus error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Ensure OpenDesign daemon is running. Auto-starts if down.
     * @param {number} port
     * @returns {Promise<Object>}
     */
    async ensureDaemon(port = this.defaultPort) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        const res = await global.sendNativeRpc('od_ensure_daemon', { port });
        if (res?.status === 'ok') {
          this.cachedStatus = { ...this.cachedStatus, daemon_running: true, port };
        }
        return res;
      } catch (err) {
        console.warn('[OpenDesignBridge] ensureDaemon error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * List all 152 bundled design systems categorized
     * @returns {Promise<Object>}
     */
    async listDesignSystems() {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      if (this.cachedDesignSystems && Array.isArray(this.cachedDesignSystems.systems)) {
        return this.cachedDesignSystems;
      }
      try {
        const res = await global.sendNativeRpc('od_list_design_systems', {});
        if (res?.status === 'ok') {
          this.cachedDesignSystems = res;
        }
        return res;
      } catch (err) {
        console.warn('[OpenDesignBridge] listDesignSystems error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Get specific design system detail (DESIGN.md, tokens.css, manifest)
     * @param {string} slug E.g. 'luxury', 'linear-app', 'apple'
     * @returns {Promise<Object>}
     */
    async getDesignSystem(slug) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      if (!slug) {
        return { status: 'error', error: 'Slug is required' };
      }
      try {
        return await global.sendNativeRpc('od_get_design_system', { slug });
      } catch (err) {
        console.warn(`[OpenDesignBridge] getDesignSystem (${slug}) error:`, err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Get top-level design posture directions or single direction detail
     * @param {string|null} directionId E.g. 'modern-minimal', 'editorial-monocle'
     * @returns {Promise<Object>}
     */
    async getDirections(directionId = null) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        return await global.sendNativeRpc('od_get_directions', { direction_id: directionId });
      } catch (err) {
        console.warn('[OpenDesignBridge] getDirections error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Run headless anti-slop linter against HTML string or file
     * @param {string|Object} htmlOrParams
     * @param {string|null} filePath
     * @returns {Promise<Object>}
     */
    async lintArtifact(htmlOrParams, filePath = null) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        let html_content = '';
        let file_path = filePath;
        if (typeof htmlOrParams === 'object' && htmlOrParams !== null) {
          html_content = htmlOrParams.htmlContent || htmlOrParams.html_content || '';
          file_path = htmlOrParams.filePath || htmlOrParams.file_path || null;
        } else {
          html_content = htmlOrParams || '';
        }
        return await global.sendNativeRpc('od_lint_artifact', {
          html_content,
          file_path
        });
      } catch (err) {
        console.warn('[OpenDesignBridge] lintArtifact error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Export an artifact to HTML, PDF, image, or PPTX
     * @param {string|Object} paramsOrFilePath
     * @param {string} format 'html' | 'pdf' | 'image' | 'pptx'
     * @param {string} projectId
     * @param {string|null} outPath
     * @returns {Promise<Object>}
     */
    async exportArtifact(paramsOrFilePath, format = 'html', projectId = 'browser-agent-workspace', outPath = null) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        let file_path = '';
        let html_content = '';
        let fmt = format;
        let pid = projectId;
        let out = outPath;

        if (typeof paramsOrFilePath === 'object' && paramsOrFilePath !== null) {
          file_path = paramsOrFilePath.filePath || paramsOrFilePath.file_path || '';
          html_content = paramsOrFilePath.htmlContent || paramsOrFilePath.html_content || '';
          fmt = paramsOrFilePath.format || 'html';
          pid = paramsOrFilePath.projectId || paramsOrFilePath.project_id || 'browser-agent-workspace';
          out = paramsOrFilePath.outPath || paramsOrFilePath.out_path || null;
        } else {
          file_path = paramsOrFilePath || '';
        }

        return await global.sendNativeRpc('od_export_artifact', {
          file_path,
          html_content,
          format: fmt,
          project_id: pid,
          out_path: out
        });
      } catch (err) {
        console.warn('[OpenDesignBridge] exportArtifact error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Export all project virtual files into a single production ZIP bundle
     * @param {Object} files Map of filename -> file content string
     * @param {string} title
     * @param {string|null} outPath
     * @returns {Promise<Object>}
     */
    async exportBundleZip(files = {}, title = 'opendesign_project', outPath = null) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        return await global.sendNativeRpc('od_export_bundle_zip', {
          files,
          title,
          out_path: outPath
        });
      } catch (err) {
        console.warn('[OpenDesignBridge] exportBundleZip error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }

    /**
     * Generic safe CLI runner for OpenDesign subcommands
     * @param {Array<string>} args
     * @param {number} timeout
     * @returns {Promise<Object>}
     */
    async runCli(args = [], timeout = 30) {
      if (!this.isNativeRpcAvailable()) {
        return { status: 'error', error: 'sendNativeRpc is not available in this context' };
      }
      try {
        return await global.sendNativeRpc('od_run_cli', { args, timeout });
      } catch (err) {
        console.warn('[OpenDesignBridge] runCli error:', err);
        return { status: 'error', error: err?.message || String(err) };
      }
    }
  }

  const instance = new OpenDesignBridgeClient();
  global.OpenDesignBridge = instance;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
