/**
 * search-patch.js — Replaces crmInput + crmSearch with correct two-path search.
 *
 * TYPING → hits GET /contacts/search?q= (simple ILIKE text match, instant, no AI)
 * ENTER  → hits POST /search (semantic vector search via embed_query)
 *
 * This file is loaded after contacts-crm.js and overwrites those two globals.
 */
(function () {
  const API_BASE = 'https://super-connector-api-production.up.railway.app';
  const _KEY     = 'sc_live_k3y_2026_scak';
  const hdrs     = () => ({ 'Content-Type': 'application/json', 'X-API-Key': _KEY });

  // Debounce helper — wait 250ms after last keystroke before firing
  let _debounceTimer = null;
  function debounce(fn, ms) {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(fn, ms);
  }

  // ── Badge helpers (fallback if not already defined) ──────────────────────
  function _showBadge(vis, label) {
    const b = document.getElementById('crm-badge');
    if (!b) return;
    b.classList.toggle('vis', !!vis);
    if (label) b.textContent = label;
  }

  function _showClear(vis) {
    const c = document.getElementById('crm-clear');
    if (c) c.classList.toggle('vis', !!vis);
  }

  function _renderGrid(cx, isSearch) {
    // Use the existing renderGrid if available, otherwise fall back
    if (typeof window._crmRenderGrid === 'function') {
      window._crmRenderGrid(cx, isSearch);
      return;
    }
    // Minimal fallback render
    const grid = document.getElementById('crm-grid');
    if (!grid) return;
    if (!cx || !cx.length) {
      grid.innerHTML = `<div class="empty-state"><h3>No matches</h3><p>Try a different search.</p></div>`;
      return;
    }
    const hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    grid.innerHTML = cx.map(c => `
      <div class="crm-card" onclick="window._openDrawerById && window._openDrawerById('${esc(c.contact_id)}')">
        <div class="crm-card-name">${esc(c.full_name)}</div>
        <div class="crm-card-role">${esc([c.title_role, c.organization].filter(Boolean).join(' · '))}</div>
        <div class="crm-card-footer">
          ${c.relationship_health ? `<span class="crm-hb ${hMap[c.relationship_health]||'crm-hb-neutral'}">${esc(c.relationship_health)}</span>` : ''}
          ${c.activation_potential ? `<span class="crm-ab">${esc(c.activation_potential)}</span>` : ''}
        </div>
      </div>`).join('');
  }

  /**
   * crmInput — fires on every keystroke in the search box.
   * Hits the simple text search endpoint (no AI, no embeddings).
   * Shows results as you type, debounced 250ms.
   */
  window.crmInput = function (val) {
    _showClear(val.length > 0);
    const pag = document.getElementById('crm-pag');
    if (pag) pag.style.display = 'none';

    if (!val || !val.trim()) {
      // Cleared — reload the browse list
      _showBadge(false);
      if (typeof window.crmLoad === 'function') window.crmLoad(0);
      return;
    }

    debounce(async function () {
      const grid = document.getElementById('crm-grid');
      if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>`;

      try {
        const resp = await fetch(
          `${API_BASE}/contacts/search?q=${encodeURIComponent(val.trim())}&limit=100`,
          { headers: hdrs() }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const results = data.data || [];
        _showBadge(false); // text search — no semantic badge
        _renderGrid(results, true);
      } catch (e) {
        const grid2 = document.getElementById('crm-grid');
        if (grid2) grid2.innerHTML = `<div class="empty-state"><h3>Search failed</h3><p>${e.message}</p></div>`;
      }
    }, 250);
  };

  /**
   * crmSearch — fires on Enter.
   * Hits the semantic vector search endpoint.
   * Use for descriptive queries like "climate tech investor in NYC".
   */
  window.crmSearch = async function (val) {
    if (!val || !val.trim()) return;

    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Semantic search…</div>`;
    const pag = document.getElementById('crm-pag');
    if (pag) pag.style.display = 'none';

    try {
      const resp = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ query: val.trim(), top_k: 20 })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const results = (data.results || []).map(r => ({ ...r, score: r.similarity }));
      _showBadge(true, `⊹ Semantic · ${results.length} results`);
      _renderGrid(results, true);
    } catch (e) {
      const grid2 = document.getElementById('crm-grid');
      if (grid2) grid2.innerHTML = `<div class="empty-state"><h3>Search failed</h3><p>${e.message}</p></div>`;
    }
  };

  /**
   * crmReset — clears the search and reloads browse.
   * Overwrites existing to ensure it works with new search flow.
   */
  window.crmReset = function () {
    const inp = document.getElementById('crm-q');
    if (inp) inp.value = '';
    _showClear(false);
    _showBadge(false);
    if (typeof window.crmLoad === 'function') window.crmLoad(0);
  };

  console.log('[SearchPatch] crmInput + crmSearch + crmReset patched — text search on type, semantic on Enter');
})();
