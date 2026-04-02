/**
 * load-info.js — Renames Content Registry to Assets, adds pinning
 * v2: Info page removed. Assets is the single source of truth.
 */
(function () {
  const API   = 'https://super-connector-api-production.up.railway.app';
  const KEY   = 'sc_live_k3y_2026_scak';
  const hdrs  = () => ({ 'Content-Type': 'application/json', 'X-API-Key': KEY });
  const PINS_KEY = 'sc_pinned_assets';

  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function getPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); } catch(e) { return []; } }
  function setPins(pins) { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); }

  window.toggleAssetPin = function(contentId) {
    let pins = getPins();
    if (pins.includes(contentId)) {
      pins = pins.filter(p => p !== contentId);
    } else {
      pins.push(contentId);
    }
    setPins(pins);
    window.loadAssetsPage();
  };

  // ── Rename nav label ──
  function patchNav() {
    const navContent = document.getElementById('nav-content');
    if (navContent) navContent.innerHTML = '<span class="icon">◫</span> Assets';
    // Remove Info nav if it was previously injected
    const navInfo = document.getElementById('nav-info');
    if (navInfo) navInfo.remove();
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) pageInfo.remove();
  }

  // ── Patch showPage ──
  const origShowPage = window.showPage;
  window.showPage = function(page) {
    if (page === 'info') { origShowPage && origShowPage('content'); return; }
    if (page === 'content') {
      if (origShowPage) origShowPage('content');
      setTimeout(() => {
        const t = document.getElementById('page-title');
        if (t && (t.textContent === 'Content Registry' || t.textContent === 'Content')) {
          t.textContent = 'Assets';
        }
        const addBtn = document.getElementById('topbar-add-btn');
        if (addBtn) { addBtn.textContent = '+ Add Asset'; addBtn.onclick = openContentModal; }
        window.loadAssetsPage();
      }, 50);
      return;
    }
    if (origShowPage) origShowPage(page);
  };

  // ── Patch nav click to rename title ──
  const navContent = document.getElementById('nav-content');
  if (navContent) {
    navContent.addEventListener('click', () => {
      setTimeout(() => {
        const t = document.getElementById('page-title');
        if (t) t.textContent = 'Assets';
        const addBtn = document.getElementById('topbar-add-btn');
        if (addBtn) addBtn.textContent = '+ Add Asset';
        window.loadAssetsPage();
      }, 60);
    });
  }

  // ── Assets page loader ──
  window.loadAssetsPage = async function() {
    const grid = document.getElementById('content-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading…</div>';
    try {
      const res  = await fetch(`${API}/content`, { headers: hdrs() });
      const data = await res.json();
      const pins = getPins();
      let items  = data.data || [];

      // Pinned first, then rest sorted by name
      const pinned   = items.filter(c => pins.includes(c.content_id));
      const unpinned = items.filter(c => !pins.includes(c.content_id));
      items = [...pinned, ...unpinned];

      if (!items.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No assets yet</h3><p>Use + Add Asset to save links, docs, and reference items.</p></div>';
        return;
      }

      grid.innerHTML = items.map(c => {
        const isPinned = pins.includes(c.content_id);
        const hasLink  = !!c.asset_link;
        const note     = c.notes || c.activation_angle || '';
        return `
          <div class="content-card" style="cursor:default;position:relative">
            <button onclick="toggleAssetPin('${esc(c.content_id)}')"
              title="${isPinned ? 'Unpin' : 'Pin to top'}"
              style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;font-size:16px;color:${isPinned ? 'var(--accent)' : 'var(--border)'};transition:color .12s;padding:0;line-height:1"
              onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='${isPinned ? 'var(--accent)' : 'var(--border)'}'"
            >⊕</button>
            <div class="content-card-top" style="padding-right:28px">
              <div>
                <div class="content-card-meta">${esc(c.venture||'General')}</div>
                <div class="content-card-name">${esc(c.content_name)}</div>
              </div>
              ${isPinned ? '<span style="font-size:10px;font-weight:600;color:var(--accent);background:var(--accent-dim);padding:2px 8px;border-radius:20px;white-space:nowrap;align-self:flex-start">Pinned</span>' : ''}
            </div>
            ${note ? `<div class="content-card-angle">${esc(note)}</div>` : ''}
            ${hasLink ? `<a href="${esc(c.asset_link)}" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none;margin-top:4px">Open ↗</a>` : ''}
          </div>`;
      }).join('');
    } catch(e) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${e.message}</p></div>`;
    }
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchNav);
  } else {
    patchNav();
  }

})();
