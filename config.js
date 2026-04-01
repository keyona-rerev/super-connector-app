// Super Connector App — Configuration
// Sets the Railway API key as a plain window global so contacts-crm.js can always read it,
// regardless of what const declarations exist in index.html's script block.
window.SC_API_KEY = "sc_live_k3y_2026_scak";

// Keep CONFIG for any legacy references
var CONFIG = CONFIG || {};
CONFIG.API_BASE = "https://super-connector-api-production.up.railway.app";
CONFIG.API_KEY   = window.SC_API_KEY;

// ── Contacts CRM Auto-Loader ──────────────────────────────────────────────
(function() {
  var injected = false;
  function inject() {
    if (injected) return;
    injected = true;
    var s = document.createElement('script');
    s.src = 'contacts-crm.js?v=20260401f';
    document.head.appendChild(s);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inject();
  }
  document.addEventListener('DOMContentLoaded', inject);
  window.addEventListener('load', inject);
})();
