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

// ── Search Patch — correct two-path search ───────────────────────────────
// Runs after page load to overwrite crmInput + crmSearch.
// TYPING  → GET /contacts/search?q=  (plain text ILIKE, instant)
// ENTER   → POST /search             (semantic vector search)
window.addEventListener('load', function() {
  var BASE = 'https://super-connector-api-production.up.railway.app';
  var KEY  = 'sc_live_k3y_2026_scak';
  var H    = { 'Content-Type': 'application/json', 'X-API-Key': KEY };

  var _dt = null;
  function debounce(fn, ms) { clearTimeout(_dt); _dt = setTimeout(fn, ms); }

  function _badge(vis, label) {
    var b = document.getElementById('crm-badge');
    if (!b) return;
    b.style.display = vis ? 'inline-flex' : 'none';
    b.className = 'crm-badge' + (vis ? ' vis' : '');
    if (label) b.textContent = label;
  }

  function _clear(vis) {
    var c = document.getElementById('crm-clear');
    if (c) { c.style.display = vis ? 'block' : 'none'; c.className = 'crm-clear' + (vis ? ' vis' : ''); }
  }

  function _grid(cx, isSemantic) {
    var grid = document.getElementById('crm-grid');
    if (!grid) return;
    if (!cx || !cx.length) {
      grid.innerHTML = '<div class="empty-state"><h3>No matches</h3><p>Try a different name or query.</p></div>';
      return;
    }
    var hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};
    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    grid.innerHTML = cx.map(function(c) {
      var hb = c.relationship_health ? '<span class="crm-hb '+(hMap[c.relationship_health]||'crm-hb-neutral')+'">'+esc(c.relationship_health)+'</span>' : '';
      var ab = c.activation_potential ? '<span class="crm-ab">'+esc(c.activation_potential)+'</span>' : '';
      var sc = (isSemantic && c.similarity) ? '<span class="crm-score">'+Math.round(c.similarity*100)+'%</span>' : '';
      var role = [c.title_role, c.organization].filter(Boolean).join(' · ');
      return '<div class="crm-card" onclick="(window.openCrmDrawer||window.openContactDrawer||function(){})(' + JSON.stringify(c) + ')">'
        + '<div class="crm-card-name">'+esc(c.full_name)+'</div>'
        + '<div class="crm-card-role">'+esc(role)+'</div>'
        + '<div class="crm-card-footer">'+hb+ab+sc+'</div>'
        + '</div>';
    }).join('');
  }

  // Overwrite crmInput — fires on every keystroke, hits text search
  window.crmInput = function(val) {
    _clear(val && val.length > 0);
    var pag = document.getElementById('crm-pag');
    if (pag) pag.style.display = 'none';
    if (!val || !val.trim()) {
      _badge(false);
      if (typeof window.crmLoad === 'function') window.crmLoad(0);
      return;
    }
    debounce(function() {
      var grid = document.getElementById('crm-grid');
      if (grid) grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>';
      fetch(BASE + '/contacts/search?q=' + encodeURIComponent(val.trim()) + '&limit=100', { headers: H })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          _badge(false);
          _grid(data.data || [], false);
        })
        .catch(function(e) {
          var g = document.getElementById('crm-grid');
          if (g) g.innerHTML = '<div class="empty-state"><h3>Search error</h3><p>'+e.message+'</p></div>';
        });
    }, 250);
  };

  // Overwrite crmSearch — fires on Enter, hits semantic search
  window.crmSearch = function(val) {
    if (!val || !val.trim()) return;
    var grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Semantic search…</div>';
    var pag = document.getElementById('crm-pag');
    if (pag) pag.style.display = 'none';
    fetch(BASE + '/search', {
      method: 'POST', headers: H,
      body: JSON.stringify({ query: val.trim(), top_k: 20 })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var results = data.results || [];
        _badge(true, '\u22b9 Semantic \u00b7 ' + results.length + ' results');
        _grid(results, true);
      })
      .catch(function(e) {
        var g = document.getElementById('crm-grid');
        if (g) g.innerHTML = '<div class="empty-state"><h3>Search error</h3><p>'+e.message+'</p></div>';
      });
  };

  // Overwrite crmReset
  window.crmReset = function() {
    var inp = document.getElementById('crm-q');
    if (inp) inp.value = '';
    _clear(false);
    _badge(false);
    if (typeof window.crmLoad === 'function') window.crmLoad(0);
  };

  console.log('[SC] Search patch active — text on type, semantic on Enter');
});
