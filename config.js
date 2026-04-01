// Super Connector App — Configuration
const CONFIG = {
  API_BASE: "https://super-connector-api-production.up.railway.app",
  API_KEY: "sc_live_k3y_2026_scak",
};

// ── Contacts CRM Auto-Loader ──────────────────────────────────────────────
// Injects contacts-crm.js after the main app script has run.
// Tries immediately, then on DOMContentLoaded, then on load — whichever fires.
(function() {
  var injected = false;
  function inject() {
    if (injected) return;
    injected = true;
    var s = document.createElement('script');
    s.src = 'contacts-crm.js?v=' + Date.now(); // cache-bust
    document.head.appendChild(s);
  }
  // Try all three timing hooks so we never miss
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inject();
  }
  document.addEventListener('DOMContentLoaded', inject);
  window.addEventListener('load', inject);
})();
