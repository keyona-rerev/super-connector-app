// ── DEEP LINK: ?contact=C123 ──────────────────────────────────────────────────
// Replaces the version in app-core.js — loaded after all other scripts
(async function () {
  const params = new URLSearchParams(window.location.search);
  const contactId = params.get('contact');
  if (!contactId) return;

  try {
    // Fetch the contact data immediately
    const API_BASE = 'https://super-connector-api-production.up.railway.app';
    const API_KEY  = 'sc_live_k3y_2026_scak';
    const r = await fetch(`${API_BASE}/contact/${contactId}`, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }
    });
    if (!r.ok) { window.showToast && showToast('Contact not found: ' + contactId); return; }
    const d = await r.json();
    const contact = d.data || d;
    if (!contact || !contact.contact_id) { window.showToast && showToast('Contact not found'); return; }

    // Navigate to search page
    if (window.showPage) showPage('search');

    // Poll until openContactProfile is ready — waits up to 5 seconds
    let attempts = 0;
    const tryOpen = () => {
      if (window.openContactProfile) {
        window.openContactProfile(contact);
      } else if (attempts < 50) {
        attempts++;
        setTimeout(tryOpen, 100);
      } else {
        // Fallback: use basic drawer
        if (window.openContactDrawer) openContactDrawer(contact);
      }
    };

    // Initial delay so contact-profile.js IIFE has time to run
    setTimeout(tryOpen, 300);

  } catch(e) {
    window.showToast && showToast('Error loading contact: ' + e.message);
  }
})();
