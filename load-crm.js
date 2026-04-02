// load-crm.js — bootstraps the Contacts CRM and Info extensions
(function() {
  function load(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = onload;
    document.head.appendChild(s);
  }
  function init() {
    load('contacts-crm.js', function() {
      load('load-info.js');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
