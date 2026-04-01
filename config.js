// Super Connector App — Configuration
window.SC_API_KEY = "sc_live_k3y_2026_scak";

var CONFIG = CONFIG || {};
CONFIG.API_BASE = "https://super-connector-api-production.up.railway.app";
CONFIG.API_KEY   = window.SC_API_KEY;

// ── Contacts CRM Auto-Loader ──────────────────────────────────────────────
(function() {
  var injected = false;
  function injectScript(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }
  function inject() {
    if (injected) return;
    injected = true;
    // Load contacts-crm.js first, then search-patch.js after it's ready
    injectScript('contacts-crm.js?v=20260401f', function() {
      // search-patch.js overwrites crmInput + crmSearch with correct two-path logic:
      // typing → GET /contacts/search?q= (simple ILIKE text match)
      // Enter  → POST /search (semantic vector search)
      injectScript('search-patch.js?v=20260401');
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inject();
  }
  document.addEventListener('DOMContentLoaded', inject);
  window.addEventListener('load', inject);
})();
