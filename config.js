// Super Connector App — Configuration
// NOTE: The real API key is defined in index.html's <script> block as `const API_KEY`.
// This file's CONFIG.API_KEY is a fallback only — contacts-crm.js prefers window.API_KEY.
const CONFIG = {
  API_BASE: "https://super-connector-api-production.up.railway.app",
  API_KEY: "sc_live_k3y_2026_scak",
};

// ── Contacts CRM Auto-Loader ──────────────────────────────────────────────
(function() {
  var injected = false;
  function inject() {
    if (injected) return;
    injected = true;
    var s = document.createElement('script');
    s.src = 'contacts-crm.js?v=20260401e';
    document.head.appendChild(s);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inject();
  }
  document.addEventListener('DOMContentLoaded', inject);
  window.addEventListener('load', inject);
})();
