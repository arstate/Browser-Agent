/**
 * Apps Registry - Catalog of Integrated Web Applications & Embedded In-App Tools
 * Part of Browser Agent Apps Integration Feature
 * @version 2.150.259
 */

(function (window) {
  'use strict';

  const DEFAULT_INTEGRATED_APPS = [
    {
      id: 'flow',
      name: 'Google Flow',
      shortName: 'Flow',
      url: 'https://flow.google.com/',
      category: 'Agentic AI & Workflow',
      featured: true,
      tag: 'flow.google.com',
      badge: 'HERO APP',
      desc: 'Workflow Automation & Agentic AI Orchestration by Google. Terintegrasi penuh tanpa reload tab.',
      gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 100%)',
      iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>`,
      dnrRule: {
        id: 9902,
        priority: 2,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'sec-fetch-site', operation: 'set', value: 'same-origin' },
            { header: 'sec-fetch-dest', operation: 'set', value: 'document' },
            { header: 'sec-fetch-mode', operation: 'set', value: 'navigate' },
            { header: 'sec-fetch-user', operation: 'set', value: '?1' },
            { header: 'referer', operation: 'set', value: 'https://flow.google.com/' }
          ],
          responseHeaders: [
            { header: 'x-frame-options', operation: 'remove' },
            { header: 'content-security-policy', operation: 'remove' },
            { header: 'frame-options', operation: 'remove' },
            { header: 'cross-origin-opener-policy', operation: 'set', value: 'unsafe-none' },
            { header: 'cross-origin-embedder-policy', operation: 'remove' },
            { header: 'cross-origin-resource-policy', operation: 'set', value: 'cross-origin' }
          ]
        },
        condition: {
          urlFilter: '*flow.google.com*',
          resourceTypes: ['sub_frame', 'xmlhttprequest', 'script', 'other']
        }
      }
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      shortName: 'Gemini',
      url: 'https://gemini.google.com/',
      category: 'Multimodal AI & Search',
      featured: false,
      tag: 'gemini.google.com',
      badge: 'AI ASSISTANT',
      desc: 'Asisten percakapan cerdas multimodal dari Google DeepMind dengan Deep Research.',
      gradient: 'linear-gradient(135deg, #1E88E5 0%, #7E57C2 100%)',
      iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>`
    },
    {
      id: 'aistudio',
      name: 'Google AI Studio',
      shortName: 'AI Studio',
      url: 'https://aistudio.google.com/',
      category: 'Prototyping & Developer',
      featured: false,
      tag: 'aistudio.google.com',
      badge: 'PROTOTYPE',
      desc: 'Workspace prototyping prompt engineering, system instruction, dan API sandbox.',
      gradient: 'linear-gradient(135deg, #EA4335 0%, #FBBC05 100%)',
      iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
    },
    {
      id: 'metaads',
      name: 'Meta Ads Manager',
      shortName: 'Meta Ads',
      url: 'https://adsmanager.facebook.com/',
      category: 'Marketing & Analytics',
      featured: false,
      tag: 'adsmanager.facebook.com',
      badge: 'ADS & CRM',
      desc: 'Dashboard kampanye Facebook & Instagram Ads untuk monitoring CPA & lead real estate.',
      gradient: 'linear-gradient(135deg, #0081FB 0%, #0064E0 100%)',
      iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`
    },
    {
      id: 'cloudnotes',
      name: 'Cloud Notes',
      shortName: 'Notes',
      url: 'https://cloudnotes-wheat.vercel.app/',
      category: 'Productivity & Notes',
      featured: false,
      tag: 'cloudnotes-wheat.vercel.app',
      badge: 'PRODUCTIVITY',
      desc: 'Digital cloud notepad untuk quick thoughts, daily tasks, formatting markdown, dan sinkronisasi instan.',
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
    }
  ];

  const AppsRegistry = {
    DEFAULT_APPS: DEFAULT_INTEGRATED_APPS,

    getAllApps() {
      return [...DEFAULT_INTEGRATED_APPS];
    },

    getAppById(id) {
      if (!id) return null;
      return DEFAULT_INTEGRATED_APPS.find(app => app.id.toLowerCase() === id.toLowerCase()) || null;
    },

    getAppByUrl(url) {
      if (!url) return null;
      const cleanUrl = url.toLowerCase().trim();
      return DEFAULT_INTEGRATED_APPS.find(app => {
        const appUrl = app.url.toLowerCase();
        return cleanUrl.includes(app.tag.toLowerCase()) || cleanUrl === appUrl || cleanUrl.startsWith(appUrl);
      }) || null;
    },

    getDisplayNameForUrl(url, fallbackName = 'Aplikasi') {
      if (!url) return fallbackName;
      const matched = this.getAppByUrl(url);
      if (matched) return matched.shortName || matched.name;
      try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
      } catch (e) {
        return fallbackName;
      }
    },

    getGlobalDnrRules() {
      const RULE_ID_STRIP_HEADERS = 9901;
      const defaultRules = [
        {
          id: RULE_ID_STRIP_HEADERS,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'sec-fetch-site', operation: 'set', value: 'same-origin' },
              { header: 'sec-fetch-dest', operation: 'set', value: 'document' },
              { header: 'sec-fetch-mode', operation: 'set', value: 'navigate' },
              { header: 'sec-fetch-user', operation: 'set', value: '?1' }
            ],
            responseHeaders: [
              { header: 'x-frame-options', operation: 'remove' },
              { header: 'content-security-policy', operation: 'remove' },
              { header: 'frame-options', operation: 'remove' },
              { header: 'cross-origin-opener-policy', operation: 'set', value: 'unsafe-none' },
              { header: 'cross-origin-embedder-policy', operation: 'remove' },
              { header: 'cross-origin-resource-policy', operation: 'set', value: 'cross-origin' }
            ]
          },
          condition: {
            urlFilter: '*',
            resourceTypes: ['sub_frame']
          }
        }
      ];

      DEFAULT_INTEGRATED_APPS.forEach(app => {
        if (app.dnrRule) {
          defaultRules.push(app.dnrRule);
        }
      });

      return defaultRules;
    },

    getAllRuleIds() {
      const ids = [9901];
      DEFAULT_INTEGRATED_APPS.forEach(app => {
        if (app.dnrRule && app.dnrRule.id) {
          ids.push(app.dnrRule.id);
        }
      });
      return ids;
    }
  };

  window.AppsRegistry = AppsRegistry;
  if (!window.AppsIntegration) {
    window.AppsIntegration = {};
  }
  window.AppsIntegration.registry = AppsRegistry;

})(typeof window !== 'undefined' ? window : globalThis);
