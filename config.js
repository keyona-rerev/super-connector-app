// Super Connector App — Configuration
// Set your Railway API key here before deploying
const CONFIG = {
  API_BASE: "https://super-connector-api-production.up.railway.app",
  API_KEY: "sc_live_k3y_2026_scak",
};

// Load Contacts CRM extension (contacts-crm.js)
// This bootstraps the new Contacts page without modifying index.html
(function loadCrmExtension() {
  function inject() {
    if (document.getElementById('crm-extension-loaded')) return;
    var marker = document.createElement('meta');
    marker.id = 'crm-extension-loaded';
    document.head.appendChild(marker);
    var s = document.createElement('script');
    s.src = 'contacts-crm.js';
    document.body.appendChild(s);
  }
  // Wait until main app scripts have run (showPage needs to exist)
  if (document.readyState === 'complete') {
    inject();
  } else {
    window.addEventListener('load', inject);
  }
})();
