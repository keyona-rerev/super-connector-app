/**
 * contacts-crm-fix.js — Patches drawer-overlay CSS conflict
 * contacts-crm.js hides all .drawer-overlay elements which breaks the
 * content drawer, orgs drawer, and event drawer. This file overrides
 * the rule immediately after contacts-crm.js loads.
 *
 * Load order in index.html: contacts-crm.js → contacts-crm-fix.js
 */
(function() {
  function applyFix() {
    var fix = document.createElement('style');
    // contacts-crm.js has: #contact-drawer, .contact-drawer, .drawer-overlay { display: none !important; }
    // That hides ALL drawer-overlay divs including #content-drawer-overlay and #drawer-overlay
    // We restore them here. The crm module uses #crm-drawer-overlay (its own element, not this class).
    fix.textContent = [
      '#drawer-overlay { display: block !important; }',
      '#content-drawer-overlay { display: block !important; }',
      // But only show them when they have the .open class — default is opacity:0,pointer-events:none
      // which is handled by index.html inline styles. We just need them not display:none.
      '',
      // Also ensure the old #contact-drawer stays hidden (it's replaced by crm-drawer)
      '#contact-drawer { display: none !important; }',
    ].join('\n');
    fix.id = 'crm-css-fix';
    document.head.appendChild(fix);
    console.log('[SC] contacts-crm-fix.js applied — drawer-overlay CSS conflict resolved');
  }

  // Apply immediately and also after load to ensure we override
  applyFix();
  window.addEventListener('load', applyFix);
})();
