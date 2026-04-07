// load-crm.js — bootstraps app-core, Contacts CRM, and Info extensions
(function() {
  function load(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }
  function init() {
    // Load app-core.js first (showPage, renderBoard, all page logic)
    load('app-core.js?v=20260407a', function() {
      // Then load CRM on top
      load('contacts-crm.js?v=20260407e', function() {
        load('load-info.js?v=20260407a');
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
