/**
 * load-info.js — Info page (quick reference) + renames Content Registry to Assets
 * Injected after index.html loads
 */
(function() {

  // ── Rename "Content Registry" nav label to "Assets" ──
  const navContent = document.getElementById('nav-content');
  if (navContent) navContent.innerHTML = '<span class="icon">◫</span> Assets';

  // ── Inject Info nav item ──
  if (!document.getElementById('nav-info')) {
    const navEvents = document.getElementById('nav-events');
    if (navEvents) {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.id = 'nav-info';
      btn.innerHTML = '<span class="icon">ℹ</span> Info';
      btn.onclick = () => goInfo();
      navEvents.parentNode.insertBefore(btn, navEvents);
    }
  }

  // ── Inject Info page ──
  if (!document.getElementById('page-info')) {
    const ref = document.getElementById('page-events');
    if (ref) {
      const div = document.createElement('div');
      div.className = 'page';
      div.id = 'page-info';
      div.style.display = 'none';
      div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <div style="font-family:var(--font-serif);font-size:17px;font-weight:400;color:var(--text)">Quick Reference</div>
          <button class="btn btn-primary btn-sm" onclick="openInfoModal()">+ Add Info</button>
        </div>
        <div id="info-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
          <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading…</div>
        </div>`;
      ref.parentNode.insertBefore(div, ref);
    }
  }

  // ── Inject Info modal ──
  if (!document.getElementById('info-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="info-modal">
        <div class="modal" style="max-width:480px">
          <h3>New Info Item</h3>
          <div class="field-group"><label>Name *</label><input type="text" id="inf-name" placeholder="BTC Scheduling Link"></div>
          <div class="field-group"><label>Venture</label>
            <select id="inf-venture">
              <option value="">All</option><option>ReRev Labs</option><option>Prismm</option>
              <option>Black Tech Capital</option><option>Sekhmetic</option><option>Personal</option>
            </select>
          </div>
          <div class="field-group"><label>Notes</label><textarea id="inf-notes" placeholder="What is this for?" style="min-height:60px"></textarea></div>
          <div class="field-group"><label>Link / URL</label><input type="text" id="inf-link" placeholder="https://..."></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeInfoModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveInfo()">Save</button>
          </div>
        </div>
      </div>`);
  }

  // ── Info page functions ──
  window.goInfo = function() {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const pg = document.getElementById('page-info'); if (pg) pg.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const ni = document.getElementById('nav-info'); if (ni) ni.classList.add('active');
    const title = document.getElementById('page-title'); if (title) title.textContent = 'Info';
    const addBtn = document.getElementById('topbar-add-btn');
    if (addBtn) { addBtn.textContent = '+ Add Info'; addBtn.onclick = openInfoModal; addBtn.style.display = ''; }
    loadInfoPage();
  };

  window.openInfoModal = function() { document.getElementById('info-modal').classList.add('open'); };
  window.closeInfoModal = function() { document.getElementById('info-modal').classList.remove('open'); };

  window.loadInfoPage = async function() {
    const grid = document.getElementById('info-grid'); if (!grid) return;
    grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading…</div>';
    try {
      const res = await fetch('https://super-connector-api-production.up.railway.app/content', {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sc_live_k3y_2026_scak' }
      });
      const data = await res.json();
      const items = (data.data || []).filter(c => c.asset_link && c.status === 'Active');
      if (!items.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No info items yet</h3><p>Add scheduling links, docs, or anything you want quick access to.</p></div>';
        return;
      }
      function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      grid.innerHTML = items.map(c => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 18px;">
          <div style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);margin-bottom:4px">${esc(c.venture||'General')}</div>
          <div style="font-family:var(--font-serif);font-size:16px;font-weight:400;color:var(--text);margin-bottom:6px;line-height:1.3">${esc(c.content_name)}</div>
          ${c.activation_angle ? `<div style="font-size:12px;color:var(--text2);margin-bottom:10px">${esc(c.activation_angle)}</div>` : ''}
          ${c.asset_link ? `<a href="${esc(c.asset_link)}" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none">Open ↗</a>` : ''}
        </div>`).join('');
    } catch(e) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${e.message}</p></div>`;
    }
  };

  window.saveInfo = async function() {
    const name = (document.getElementById('inf-name').value||'').trim();
    if (!name) { alert('Name is required'); return; }
    try {
      await fetch('https://super-connector-api-production.up.railway.app/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sc_live_k3y_2026_scak' },
        body: JSON.stringify({
          content_name: name,
          content_type: 'Asset',
          venture: document.getElementById('inf-venture').value,
          status: 'Active',
          activation_angle: document.getElementById('inf-notes').value,
          asset_link: document.getElementById('inf-link').value,
          notes: document.getElementById('inf-notes').value
        })
      });
      window.closeInfoModal();
      window.loadInfoPage();
    } catch(e) { alert('Error: ' + e.message); }
  };

  // ── Patch showPage to handle 'info' ──
  const origShowPage = window.showPage;
  window.showPage = function(page) {
    if (page === 'info') { window.goInfo(); return; }
    if (origShowPage) origShowPage(page);
  };

})();
