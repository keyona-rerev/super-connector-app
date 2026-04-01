// load-crm.js — bootstraps the Contacts CRM extension
// Add this to index.html: <script src="load-crm.js"></script>
// Must come AFTER config.js and the main app script.
(function() {
  function load(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = onload;
    document.head.appendChild(s);
  }
  // Load contacts-crm.js after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { load('contacts-crm.js'); });
  } else {
    load('contacts-crm.js');
  }
})();
