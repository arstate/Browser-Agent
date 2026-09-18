/**
 * ============================================================================
 * BROWSER AGENT - LICENSING & SUBSCRIPTION MANAGER
 * File: extension/core/licensing_manager.js
 * Rule: Sub-800 lines modular core architecture
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'browser_agent_license_data';
  const DEFAULT_MOCK_SERVER = 'http://127.0.0.1:8787';
  const DEFAULT_TOPUP_BASE_URL = 'https://tiarproperty.mayar.link/topup-browser-agent';

  // Default initial license state (Active 30 days demo fallback if newly installed)
  const defaultState = {
    licenseKey: 'BA-PRO-ACTIVE-DEMO',
    status: 'active', // 'active' | 'trial' | 'expired' | 'device_limit_reached' | 'unregistered'
    tier: 'pro',
    customerName: 'Browser Agent User',
    deviceId: '',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    daysRemaining: 30,
    lastCheckedAt: Date.now(),
    serverUrl: DEFAULT_MOCK_SERVER,
    topupUrl: DEFAULT_TOPUP_BASE_URL
  };

  class LicensingManagerClass {
    constructor() {
      this.state = Object.assign({}, defaultState);
      this.isInitialized = false;
      this.onStateChangeCallbacks = [];
    }

    /**
     * Subscribe to license state mutations
     */
    onStateChange(cb) {
      if (typeof cb === 'function') {
        this.onStateChangeCallbacks.push(cb);
      }
    }

    _notifyChange() {
      this.onStateChangeCallbacks.forEach((cb) => {
        try {
          cb(this.getLicense());
        } catch (e) {
          console.warn('[LicensingManager] Callback error:', e);
        }
      });
    }

    /**
     * Initialize licensing manager, load storage, fetch device id, and check expiration
     */
    async init() {
      if (this.isInitialized) return this.state;

      try {
        const stored = await new Promise((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([STORAGE_KEY], (res) => resolve(res ? res[STORAGE_KEY] : null));
          } else {
            resolve(null);
          }
        });

        if (stored) {
          this.state = Object.assign({}, defaultState, stored);
        } else {
          this.state = Object.assign({}, defaultState);
          await this._saveState();
        }

        // Fetch hardware bound device ID if not already cached
        if (!this.state.deviceId) {
          await this.fetchDeviceId();
        }

        // Compute days remaining
        this._updateDaysRemaining();

        // If last checked > 12 hours ago, run background verify
        const now = Date.now();
        if (now - (this.state.lastCheckedAt || 0) > 12 * 60 * 60 * 1000) {
          this.checkStatus(false).catch(() => {});
        }

        this.isInitialized = true;
        this._notifyChange();
        return this.state;
      } catch (err) {
        console.error('[LicensingManager] Initialization failed:', err);
        return this.state;
      }
    }

    /**
     * Get unique hardware-bound Device ID from Native Host
     */
    async fetchDeviceId() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendNativeMessage) {
          try {
            chrome.runtime.sendNativeMessage(
              'com.antigravity.chrome.agent',
              { action: 'get_machine_fingerprint' },
              (response) => {
                if (chrome.runtime.lastError || !response || response.status !== 'ok') {
                  // Fallback: Generate stable browser client UUID
                  const fallbackId = 'BA-BRW-' + Math.random().toString(36).substring(2, 10).toUpperCase();
                  this.state.deviceId = fallbackId;
                } else {
                  this.state.deviceId = response.device_id || response.fingerprint?.substring(0, 16).toUpperCase();
                }
                this._saveState().then(() => resolve(this.state.deviceId));
              }
            );
          } catch (e) {
            const fallbackId = 'BA-BRW-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            this.state.deviceId = fallbackId;
            this._saveState().then(() => resolve(this.state.deviceId));
          }
        } else {
          const fallbackId = 'BA-WEB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
          this.state.deviceId = fallbackId;
          this._saveState().then(() => resolve(this.state.deviceId));
        }
      });
    }

    _updateDaysRemaining() {
      if (!this.state.expiresAt) {
        this.state.daysRemaining = 0;
        this.state.status = 'expired';
        return;
      }
      const expTime = new Date(this.state.expiresAt).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      this.state.daysRemaining = Math.max(0, diffDays);

      if (diffDays <= 0) {
        this.state.status = 'expired';
      }
    }

    /**
     * Returns current snapshot of license data
     */
    getLicense() {
      this._updateDaysRemaining();
      return Object.assign({}, this.state);
    }

    /**
     * Check whether agent is allowed to execute tasks
     */
    isUsable() {
      this._updateDaysRemaining();
      return (this.state.status === 'active' || this.state.status === 'trial') && this.state.daysRemaining > 0;
    }

    isExpired() {
      return !this.isUsable();
    }

    /**
     * Activate a new License Key
     */
    async activateKey(licenseKey, customServerUrl) {
      if (!licenseKey || !licenseKey.trim()) {
        return { success: false, message: 'License key tidak boleh kosong.' };
      }

      const key = licenseKey.trim().toUpperCase();
      const server = customServerUrl || this.state.serverUrl || DEFAULT_MOCK_SERVER;

      if (!this.state.deviceId) {
        await this.fetchDeviceId();
      }

      try {
        const resp = await fetch(`${server}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_key: key,
            device_id: this.state.deviceId
          })
        });

        const data = await resp.json();

        if (resp.ok && (data.status === 'active' || data.status === 'trial')) {
          this.state.licenseKey = key;
          this.state.status = data.status;
          this.state.tier = data.tier || 'pro';
          this.state.customerName = data.customer_name || 'User';
          this.state.expiresAt = data.expires_at;
          this.state.lastCheckedAt = Date.now();
          this.state.topupUrl = data.topup_url || `${DEFAULT_TOPUP_BASE_URL}?key=${key}`;
          this._updateDaysRemaining();
          await this._saveState();
          this._notifyChange();

          return {
            success: true,
            status: this.state.status,
            daysRemaining: this.state.daysRemaining,
            message: `Aktivasi Berhasil! Paket ${this.state.tier.toUpperCase()} aktif (${this.state.daysRemaining} hari tersisa).`
          };
        } else {
          return {
            success: false,
            status: data.status || 'invalid',
            message: data.message || 'Gagal mengaktifkan lisensi. Periksa kembali License Key Anda.'
          };
        }
      } catch (err) {
        console.warn('[LicensingManager] Network verification failed:', err);
        // If server unreachable, check if key is formatted properly and allow offline fallback
        return {
          success: false,
          status: 'network_error',
          message: `Tidak dapat menghubungi server lisensi (${server}). Pastikan internet aktif atau server mock berjalan.`
        };
      }
    }

    /**
     * Force verify / refresh status with remote server
     */
    async checkStatus(force = false) {
      if (!this.state.licenseKey) return this.getLicense();
      const now = Date.now();
      if (!force && now - (this.state.lastCheckedAt || 0) < 60 * 1000) {
        return this.getLicense();
      }

      const server = this.state.serverUrl || DEFAULT_MOCK_SERVER;

      try {
        const resp = await fetch(`${server}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_key: this.state.licenseKey,
            device_id: this.state.deviceId
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          this.state.status = data.status;
          this.state.tier = data.tier || this.state.tier;
          this.state.expiresAt = data.expires_at;
          this.state.lastCheckedAt = Date.now();
          if (data.topup_url) this.state.topupUrl = data.topup_url;
          this._updateDaysRemaining();
          await this._saveState();
          this._notifyChange();
        }
      } catch (e) {
        // Keep existing cached state on connection error
        this._updateDaysRemaining();
      }

      return this.getLicense();
    }

    /**
     * Simulate top-up (useful for dev testing / quick balance addition)
     */
    async simulateTopup(days = 30) {
      const server = this.state.serverUrl || DEFAULT_MOCK_SERVER;
      try {
        const resp = await fetch(`${server}/topup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_key: this.state.licenseKey,
            duration_days: days
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          await this.checkStatus(true);
          return { success: true, data };
        }
      } catch (e) {
        // Local fallback calculation if mock server is down
        const curExp = new Date(this.state.expiresAt).getTime();
        const now = Date.now();
        const baseTime = curExp < now ? now : curExp;
        const newExp = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
        this.state.expiresAt = newExp;
        this.state.status = 'active';
        this._updateDaysRemaining();
        await this._saveState();
        this._notifyChange();
        return { success: true, local: true };
      }
      return { success: false };
    }

    getTopupUrl() {
      const base = this.state.topupUrl || DEFAULT_TOPUP_BASE_URL;
      const key = encodeURIComponent(this.state.licenseKey || '');
      return base.includes('?') ? `${base}&key=${key}` : `${base}?key=${key}`;
    }

    async _saveState() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise((resolve) => {
          chrome.storage.local.set({ [STORAGE_KEY]: this.state }, resolve);
        });
      }
    }
  }

  window.LicensingManager = new LicensingManagerClass();
})();
