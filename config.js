// Super Connector App — Configuration
window.SC_API_KEY = "sc_live_k3y_2026_scak";

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

// ── Search + UI Patch ────────────────────────────────────────────────────
// Fixes: card click, Enter key, adds grid/list toggle
// TYPING  → GET /contacts/search?q=  (plain ILIKE text match, as-you-type)
// ENTER   → same text search (names are not descriptive queries)
// Semantic search is now a dedicated button only
window.addEventListener('load', function() {
  var BASE = 'https://super-connector-api-production.up.railway.app';
  var KEY  = 'sc_live_k3y_2026_scak';
  var H    = { 'Content-Type': 'application/json', 'X-API-Key': KEY };

  // In-memory store so card clicks can look up by ID safely
  var _contactStore = {};
  var _listMode = false;
  var _dt = null;

  function debounce(fn, ms) { clearTimeout(_dt); _dt = setTimeout(fn, ms); }

  function _badge(vis, label) {
    var b = document.getElementById('crm-badge');
    if (!b) return;
    b.className = 'crm-badge' + (vis ? ' vis' : '');
    if (label) b.textContent = label;
  }

  function _clear(vis) {
    var c = document.getElementById('crm-clear');
    if (c) c.className = 'crm-clear' + (vis ? ' vis' : '');
  }

  // Safe card click — store contact in memory, reference by ID
  window._scOpenContact = function(id) {
    var c = _contactStore[id];
    if (!c) return;
    if (typeof window.openCrmDrawer === 'function') { window.openCrmDrawer(c); return; }
    if (typeof window.openContactDrawer === 'function') { window.openContactDrawer(c); return; }
  };

  var hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _renderCard(c, isSemantic) {
    var hb = c.relationship_health ? '<span class="crm-hb '+(hMap[c.relationship_health]||'crm-hb-neutral')+'">'+esc(c.relationship_health)+'</span>' : '';
    var ab = c.activation_potential ? '<span class="crm-ab">'+esc(c.activation_potential)+'</span>' : '';
    var sc = (isSemantic && c.similarity) ? '<span class="crm-score">'+Math.round(c.similarity*100)+'%</span>' : '';
    var role = esc([c.title_role, c.organization].filter(Boolean).join(' · '));
    var id = esc(c.contact_id);
    return '<div class="crm-card sc-card" onclick="window._scOpenContact(\''+id+'\')">'
      + '<div class="crm-card-name">'+esc(c.full_name)+'</div>'
      + '<div class="crm-card-role">'+role+'</div>'
      + '<div class="crm-card-footer">'+hb+ab+sc+'</div>'
      + '</div>';
  }

  function _renderRow(c, isSemantic) {
    var hb = c.relationship_health ? '<span class="crm-hb '+(hMap[c.relationship_health]||'crm-hb-neutral')+'">'+esc(c.relationship_health)+'</span>' : '';
    var ab = c.activation_potential ? '<span class="crm-ab">'+esc(c.activation_potential)+'</span>' : '';
    var id = esc(c.contact_id);
    return '<div class="sc-list-row" onclick="window._scOpenContact(\''+id+'\')">'
      + '<div class="sc-list-name">'+esc(c.full_name)+'</div>'
      + '<div class="sc-list-role">'+esc(c.title_role||'')+'</div>'
      + '<div class="sc-list-org">'+esc(c.organization||'')+'</div>'
      + '<div class="sc-list-badges">'+hb+ab+'</div>'
      + '</div>';
  }

  function _renderContacts(cx, isSemantic) {
    var grid = document.getElementById('crm-grid');
    if (!grid) return;
    if (!cx || !cx.length) {
      grid.innerHTML = '<div class="empty-state"><h3>No matches</h3><p>Try a different name.</p></div>';
      return;
    }
    // Store all contacts for safe click lookup
    cx.forEach(function(c) { if (c.contact_id) _contactStore[c.contact_id] = c; });

    if (_listMode) {
      grid.className = 'sc-list-view';
      grid.innerHTML = '<div class="sc-list-header">'
        + '<span>Name</span><span>Role</span><span>Organization</span><span>Status</span>'
        + '</div>'
        + cx.map(function(c) { return _renderRow(c, isSemantic); }).join('');
    } else {
      grid.className = 'crm-grid';
      grid.innerHTML = cx.map(function(c) { return _renderCard(c, isSemantic); }).join('');
    }
  }

  // ── Grid/List Toggle ──────────────────────────────────────────────────
  function _injectToggle() {
    if (document.getElementById('sc-view-toggle')) return;
    var toolbar = document.querySelector('.crm-toolbar');
    if (!toolbar) return;

    // Inject CSS for list view
    var style = document.createElement('style');
    style.textContent = [
      '.sc-list-view{display:flex;flex-direction:column;gap:0}',
      '.sc-list-header{display:grid;grid-template-columns:2fr 2fr 2fr 1.5fr;padding:8px 14px;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border)}',
      '.sc-list-row{display:grid;grid-template-columns:2fr 2fr 2fr 1.5fr;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border-soft);cursor:pointer;transition:background .1s}',
      '.sc-list-row:hover{background:var(--surface2)}',
      '.sc-list-name{font-size:13px;font-weight:500;color:var(--text)}',
      '.sc-list-role{font-size:12px;color:var(--text2)}',
      '.sc-list-org{font-size:12px;color:var(--text2)}',
      '.sc-list-badges{display:flex;gap:4px;flex-wrap:wrap}',
      '#sc-view-toggle{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:3px}',
      '.sc-toggle-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;background:none;border-radius:6px;cursor:pointer;color:var(--text3);font-size:14px;transition:background .12s,color .12s}',
      '.sc-toggle-btn.active{background:var(--accent);color:#fff}',
      '.sc-toggle-btn:not(.active):hover{background:var(--surface2);color:var(--text)}'
    ].join('');
    document.head.appendChild(style);

    // Add toggle button to toolbar
    var toggle = document.createElement('div');
    toggle.id = 'sc-view-toggle';
    toggle.innerHTML = '<button class="sc-toggle-btn active" id="sc-btn-grid" title="Grid view" onclick="window._scSetView(\'grid\')">⊞</button>'
      + '<button class="sc-toggle-btn" id="sc-btn-list" title="List view" onclick="window._scSetView(\'list\')">☰</button>';
    toolbar.appendChild(toggle);
  }

  window._scSetView = function(mode) {
    _listMode = (mode === 'list');
    var gb = document.getElementById('sc-btn-grid');
    var lb = document.getElementById('sc-btn-list');
    if (gb) gb.className = 'sc-toggle-btn' + (_listMode ? '' : ' active');
    if (lb) lb.className = 'sc-toggle-btn' + (_listMode ? ' active' : '');
    // Re-render current contacts in new mode
    var ids = Object.keys(_contactStore);
    if (ids.length) _renderContacts(Object.values(_contactStore), false);
  };

  // Try injecting toggle now, and also after contacts page renders
  _injectToggle();
  setTimeout(_injectToggle, 1500);
  setTimeout(_injectToggle, 3000);

  // ── Text search (both type and Enter) ────────────────────────────────
  function _doTextSearch(val) {
    var grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>';
    var pag = document.getElementById('crm-pag');
    if (pag) pag.style.display = 'none';
    fetch(BASE + '/contacts/search?q=' + encodeURIComponent(val.trim()) + '&limit=100', { headers: H })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _badge(false);
        _renderContacts(data.data || [], false);
      })
      .catch(function(e) {
        var g = document.getElementById('crm-grid');
        if (g) g.innerHTML = '<div class="empty-state"><h3>Search error</h3><p>'+e.message+'</p></div>';
      });
  }

  // crmInput — debounced as-you-type text search
  window.crmInput = function(val) {
    _clear(val && val.length > 0);
    if (!val || !val.trim()) {
      _badge(false);
      if (typeof window.crmLoad === 'function') window.crmLoad(0);
      return;
    }
    debounce(function() { _doTextSearch(val); }, 250);
  };

  // crmSearch — Enter key, also text search (names aren't semantic queries)
  window.crmSearch = function(val) {
    if (!val || !val.trim()) return;
    _doTextSearch(val);
  };

  // crmReset — clear and reload
  window.crmReset = function() {
    var inp = document.getElementById('crm-q');
    if (inp) inp.value = '';
    _clear(false);
    _badge(false);
    _contactStore = {};
    if (typeof window.crmLoad === 'function') window.crmLoad(0);
  };

  console.log('[SC] Search patch v2 active — text search on type + Enter, grid/list toggle');
});
