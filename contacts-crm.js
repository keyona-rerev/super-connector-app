/**
 * Contacts CRM Extension — Super Connector App
 * Steps 2-5 of the Contacts CRM rebuild (handoff 2026-04-01)
 *
 * Adds: browse grid, inline search (short=client-side, Enter=vector),
 * pagination, + New Contact modal, Edit from drawer, source field.
 *
 * Loaded via <script src="contacts-crm.js"></script> in index.html
 * (must come AFTER config.js so CONFIG.API_KEY is available).
 */

(function () {
  /* ── Constants ─────────────────────────────────────────── */
  const API_BASE = (window.CONFIG && window.CONFIG.API_BASE) ||
    'https://super-connector-api-production.up.railway.app';
  const hdrs = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': (window.CONFIG && window.CONFIG.API_KEY) || '',
  });

  const PAGE_SIZE = 50;

  /* ── State ─────────────────────────────────────────────── */
  let crmContacts = [];
  let crmOffset = 0;
  let crmMode = 'browse';      // 'browse' | 'search'
  let crmEditingContact = null;
  let crmLoaded = false;

  /* ── CSS Injection ─────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    /* ══ CONTACTS CRM ══ */
    .crm-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
    .crm-search-wrap { position:relative; flex:1; min-width:220px; max-width:420px; }
    .crm-search-input { width:100%; background:var(--surface); border:1.5px solid var(--border); color:var(--text); font-family:var(--font-sans); font-size:13px; padding:8px 36px 8px 12px; border-radius:var(--radius-lg); outline:none; transition:border-color .15s; }
    .crm-search-input::placeholder { color:var(--text3); }
    .crm-search-input:focus { border-color:var(--accent); }
    .crm-search-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text3); cursor:pointer; font-size:16px; padding:0; line-height:1; display:none; }
    .crm-search-clear.visible { display:block; }
    .crm-mode-badge { font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; background:var(--accent-dim); color:var(--accent); display:none; }
    .crm-mode-badge.visible { display:inline-flex; }
    .crm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(268px,1fr)); gap:12px; }
    .crm-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:15px 17px; cursor:pointer; transition:box-shadow .15s,transform .1s,border-color .15s; }
    .crm-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:var(--accent); }
    .crm-card-name { font-family:var(--font-serif); font-size:15px; font-weight:400; color:var(--text); line-height:1.3; margin-bottom:2px; }
    .crm-card-role { font-size:12px; color:var(--text2); margin-bottom:10px; }
    .crm-card-footer { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
    .crm-health-badge { display:inline-flex; font-size:10px; font-weight:600; padding:2px 8px; border-radius:20px; }
    .crm-health-strong  { background:#EDF7ED; color:var(--complete-border); }
    .crm-health-good    { background:var(--accent-dim); color:var(--accent); }
    .crm-health-neutral { background:var(--medium-bg); color:var(--medium); }
    .crm-health-dormant { background:var(--surface2); color:var(--text3); }
    .crm-health-cold    { background:var(--critical-bg); color:var(--critical); }
    .crm-activation-badge { display:inline-flex; font-size:10px; font-weight:500; padding:2px 8px; border-radius:20px; background:var(--surface2); color:var(--text2); border:1px solid var(--border-soft); }
    .crm-source-badge { display:inline-flex; font-size:10px; padding:2px 8px; border-radius:20px; background:var(--medium-bg); color:var(--medium); }
    .crm-score-badge { display:inline-flex; font-size:10px; font-weight:600; padding:2px 8px; border-radius:20px; background:var(--accent-dim); color:var(--accent); }
    .crm-pagination { display:flex; align-items:center; justify-content:space-between; margin-top:24px; padding-top:20px; border-top:1px solid var(--border-soft); }
    .crm-page-info { font-size:12px; color:var(--text3); }
    .crm-page-controls { display:flex; gap:8px; }
    .drawer-edit-btn { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:500; padding:5px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--surface2); color:var(--text2); cursor:pointer; transition:all .12s; margin-top:8px; }
    .drawer-edit-btn:hover { background:var(--border); color:var(--text); }
  `;
  document.head.appendChild(style);

  /* ── DOM Injection ─────────────────────────────────────── */
  function injectDOM() {
    // 1. Nav item — insert before existing "Search Contacts" nav item
    const navSearch = document.getElementById('nav-search');
    if (navSearch && !document.getElementById('nav-contacts')) {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.id = 'nav-contacts';
      btn.innerHTML = '<span class="icon">⊞</span> Contacts';
      btn.onclick = () => window.showPage('contacts');
      navSearch.parentNode.insertBefore(btn, navSearch);
    }

    // 2. Contacts page div — insert before Search page
    const pageSearch = document.getElementById('page-search');
    if (pageSearch && !document.getElementById('page-contacts')) {
      const div = document.createElement('div');
      div.className = 'page';
      div.id = 'page-contacts';
      div.style.display = 'none';
      div.innerHTML = `
        <div class="crm-toolbar">
          <div class="crm-search-wrap">
            <input class="crm-search-input" id="crm-search-input" type="text"
              placeholder="Type to filter · Enter for vector search…"
              oninput="crmOnInput(this.value)"
              onkeydown="if(event.key==='Enter') crmRunSearch(this.value)">
            <button class="crm-search-clear" id="crm-search-clear" onclick="crmClearSearch()">×</button>
          </div>
          <span class="crm-mode-badge" id="crm-mode-badge">Vector results</span>
          <select class="filter-select" id="crm-filter-venture" onchange="crmFilterChanged()">
            <option value="">All Ventures</option>
            <option>ReRev Labs</option><option>Prismm</option>
            <option>Black Tech Capital</option><option>Sekhmetic</option>
          </select>
          <select class="filter-select" id="crm-filter-health" onchange="crmFilterChanged()">
            <option value="">All Health</option>
            <option>Strong</option><option>Good</option>
            <option>Neutral</option><option>Dormant</option><option>Cold</option>
          </select>
          <select class="filter-select" id="crm-filter-activation" onchange="crmFilterChanged()">
            <option value="">All Activation</option>
            <option>High</option><option>Medium</option><option>Low</option><option>None</option>
          </select>
        </div>
        <div class="crm-grid" id="crm-grid">
          <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading contacts…</div>
        </div>
        <div class="crm-pagination" id="crm-pagination" style="display:none">
          <span class="crm-page-info" id="crm-page-info"></span>
          <div class="crm-page-controls">
            <button class="btn btn-ghost btn-sm" id="crm-prev-btn" onclick="crmPaginate(-1)" disabled>← Previous</button>
            <button class="btn btn-ghost btn-sm" id="crm-next-btn" onclick="crmPaginate(1)">Next →</button>
          </div>
        </div>`;
      pageSearch.parentNode.insertBefore(div, pageSearch);
    }

    // 3. Contact add/edit modal — append to body (only once)
    if (!document.getElementById('contact-modal-overlay')) {
      document.body.insertAdjacentHTML('beforeend', `
<div class="modal-overlay" id="contact-modal-overlay">
  <div class="modal" style="max-width:600px">
    <h3 id="contact-modal-title">New Contact</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="field-group" style="grid-column:1/-1"><label>Full Name *</label><input type="text" id="cm-full-name" placeholder="Jane Smith"></div>
      <div class="field-group"><label>Title / Role</label><input type="text" id="cm-title-role" placeholder="Co-founder &amp; CEO"></div>
      <div class="field-group"><label>Organization</label><input type="text" id="cm-organization" placeholder="Acme Inc."></div>
      <div class="field-group"><label>Venture</label>
        <select id="cm-venture"><option value="">None</option><option>ReRev Labs</option><option>Prismm</option><option>Black Tech Capital</option><option>Sekhmetic</option><option>DO GOOD X</option><option>NYC PIVOT</option><option>Personal</option></select>
      </div>
      <div class="field-group"><label>Source (where we met)</label><input type="text" id="cm-source" placeholder="SXSW 2026, BTC Summit…"></div>
      <div class="field-group"><label>How We Met</label><input type="text" id="cm-how-we-met" placeholder="Panel intro, warm referral…"></div>
      <div class="field-group"><label>Relationship Health</label>
        <select id="cm-health"><option value="">Unknown</option><option>Strong</option><option>Good</option><option>Neutral</option><option>Dormant</option><option>Cold</option></select>
      </div>
      <div class="field-group"><label>Activation Potential</label>
        <select id="cm-activation"><option value="">Unknown</option><option>High</option><option>Medium</option><option>Low</option><option>None</option></select>
      </div>
      <div class="field-group" style="grid-column:1/-1"><label>What They're Building</label><input type="text" id="cm-what-building" placeholder="…"></div>
      <div class="field-group" style="grid-column:1/-1"><label>What They Need</label><input type="text" id="cm-what-need" placeholder="…"></div>
      <div class="field-group" style="grid-column:1/-1"><label>What They Offer</label><input type="text" id="cm-what-offer" placeholder="…"></div>
      <div class="field-group" style="grid-column:1/-1"><label>Notes</label><textarea id="cm-notes" placeholder="Context, follow-up ideas, anything…" style="min-height:72px"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="crmCloseModal()">Cancel</button>
      <button class="btn btn-primary" id="cm-save-btn" onclick="crmSaveContact()">Save Contact</button>
    </div>
  </div>
</div>`);
    }

    // 4. Add Edit button to existing contact drawer (below the subtitle div)
    if (!document.getElementById('drawer-edit-btn')) {
      const drawerHeader = document.querySelector('#contact-drawer .drawer-header');
      if (drawerHeader) {
        const editBtn = document.createElement('button');
        editBtn.className = 'drawer-edit-btn';
        editBtn.id = 'drawer-edit-btn';
        editBtn.innerHTML = '✎ Edit Contact';
        editBtn.onclick = () => {
          if (window._currentDrawerContact) crmOpenModal(window._currentDrawerContact);
        };
        drawerHeader.appendChild(editBtn);
      }
    }
  }

  /* ── Load contacts from Railway ────────────────────────── */
  async function crmLoadContacts(offset) {
    offset = offset || 0;
    crmOffset = offset;
    crmMode = 'browse';
    updateModeUI();

    const grid = document.getElementById('crm-grid');
    if (!grid) return;

    const venture = document.getElementById('crm-filter-venture')?.value || '';
    const health  = document.getElementById('crm-filter-health')?.value || '';
    const activ   = document.getElementById('crm-filter-activation')?.value || '';

    grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading contacts…</div>`;

    try {
      const resp = await fetch(
        `${API_BASE}/contacts?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: hdrs() }
      );
      const data = await resp.json();
      let contacts = data.data || [];

      if (venture) contacts = contacts.filter(c =>
        (c.venture || '').toLowerCase().includes(venture.toLowerCase()));
      if (health)  contacts = contacts.filter(c => (c.relationship_health || '') === health);
      if (activ)   contacts = contacts.filter(c => (c.activation_potential || '') === activ);

      crmContacts = contacts;
      renderCrmGrid(contacts, false);
      updatePagination(offset, data.count);
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><h3>Connection error</h3><p>${e.message}</p></div>`;
    }
  }

  /* ── Render grid ───────────────────────────────────────── */
  function renderCrmGrid(contacts, isSearch) {
    const grid = document.getElementById('crm-grid');
    if (!grid) return;
    if (!contacts.length) {
      grid.innerHTML = `<div class="empty-state"><h3>${isSearch ? 'No matches' : 'No contacts yet'}</h3><p>${isSearch ? 'Try a different query.' : 'Add your first contact above.'}</p></div>`;
      return;
    }
    grid.innerHTML = contacts.map(c => {
      const healthCls   = crmHealthClass(c.relationship_health);
      const healthBadge = c.relationship_health
        ? `<span class="crm-health-badge ${healthCls}">${escHtml(c.relationship_health)}</span>` : '';
      const activBadge  = c.activation_potential
        ? `<span class="crm-activation-badge">${escHtml(c.activation_potential)}</span>` : '';
      const srcBadge    = c.source
        ? `<span class="crm-source-badge">${escHtml(c.source)}</span>` : '';
      const scoreBadge  = (isSearch && c.score)
        ? `<span class="crm-score-badge">${Math.round(c.score * 100)}%</span>` : '';
      const role = [c.title_role, c.organization].filter(Boolean).join(' · ');
      // Serialize contact for onclick — escape quotes
      const contactJson = JSON.stringify(c).replace(/'/g, "\\'");
      return `<div class="crm-card" onclick='crmOpenDrawer(${contactJson})'>
        <div class="crm-card-name">${escHtml(c.full_name)}</div>
        <div class="crm-card-role">${escHtml(role)}</div>
        <div class="crm-card-footer">${healthBadge}${activBadge}${srcBadge}${scoreBadge}</div>
      </div>`;
    }).join('');
  }

  // Wrapper so onclick in grid can call openContactDrawer safely
  window.crmOpenDrawer = function(contact) {
    window._currentDrawerContact = contact;
    if (window.openContactDrawer) window.openContactDrawer(contact);
  };

  /* ── Search ─────────────────────────────────────────────── */
  window.crmOnInput = function(val) {
    const clearBtn = document.getElementById('crm-search-clear');
    if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);

    if (val.length === 0) { crmLoadContacts(crmOffset); return; }

    if (val.length < 4) {
      const q = val.toLowerCase();
      const filtered = crmContacts.filter(c =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.organization || '').toLowerCase().includes(q) ||
        (c.title_role || '').toLowerCase().includes(q)
      );
      renderCrmGrid(filtered, false);
      const pag = document.getElementById('crm-pagination');
      if (pag) pag.style.display = 'none';
    }
  };

  window.crmRunSearch = async function(query) {
    if (!query || !query.trim()) { crmLoadContacts(0); return; }
    crmMode = 'search';
    updateModeUI();
    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>`;
    const pag = document.getElementById('crm-pagination');
    if (pag) pag.style.display = 'none';
    try {
      const resp = await fetch(`${API_BASE}/search`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ query: query.trim(), top_k: 30 }),
      });
      const data = await resp.json();
      renderCrmGrid(data.results || [], true);
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Search error</h3><p>${e.message}</p></div>`;
    }
  };

  window.crmClearSearch = function() {
    const inp = document.getElementById('crm-search-input');
    if (inp) inp.value = '';
    const clearBtn = document.getElementById('crm-search-clear');
    if (clearBtn) clearBtn.classList.remove('visible');
    crmMode = 'browse';
    updateModeUI();
    crmLoadContacts(0);
  };

  window.crmFilterChanged = function() {
    if (crmMode === 'browse') crmLoadContacts(0);
  };

  /* ── Pagination ─────────────────────────────────────────── */
  function updatePagination(offset, total) {
    const pag  = document.getElementById('crm-pagination');
    const info = document.getElementById('crm-page-info');
    const prev = document.getElementById('crm-prev-btn');
    const next = document.getElementById('crm-next-btn');
    if (!pag) return;
    pag.style.display = 'flex';
    if (info) info.textContent = `Showing ${offset + 1}–${offset + crmContacts.length} · ${total ? '~' + total + ' total' : ''}`;
    if (prev) prev.disabled = offset === 0;
    if (next) next.disabled = crmContacts.length < PAGE_SIZE;
  }

  window.crmPaginate = function(dir) {
    const newOffset = crmOffset + dir * PAGE_SIZE;
    if (newOffset < 0) return;
    crmLoadContacts(newOffset);
    const grid = document.getElementById('crm-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Modal ──────────────────────────────────────────────── */
  function crmOpenModal(contactData) {
    crmEditingContact = contactData || null;
    const title   = document.getElementById('contact-modal-title');
    const saveBtn = document.getElementById('cm-save-btn');
    if (title)   title.textContent   = contactData ? 'Edit Contact' : 'New Contact';
    if (saveBtn) saveBtn.textContent = contactData ? 'Save Changes' : 'Save Contact';

    const map = {
      'cm-full-name':     contactData?.full_name || '',
      'cm-title-role':    contactData?.title_role || '',
      'cm-organization':  contactData?.organization || '',
      'cm-venture':       contactData?.venture || '',
      'cm-source':        contactData?.source || '',
      'cm-how-we-met':    contactData?.how_we_met || '',
      'cm-health':        contactData?.relationship_health || '',
      'cm-activation':    contactData?.activation_potential || '',
      'cm-what-building': contactData?.what_building || '',
      'cm-what-need':     contactData?.what_need || '',
      'cm-what-offer':    contactData?.what_offer || '',
      'cm-notes':         contactData?.notes || '',
    };
    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }
    const overlay = document.getElementById('contact-modal-overlay');
    if (overlay) overlay.classList.add('open');
  }

  window.crmOpenModal = crmOpenModal;

  window.crmCloseModal = function() {
    const overlay = document.getElementById('contact-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    crmEditingContact = null;
  };

  window.crmSaveContact = async function() {
    const fullName = (document.getElementById('cm-full-name')?.value || '').trim();
    if (!fullName) {
      if (window.showToast) window.showToast('Full name is required');
      return;
    }
    const saveBtn = document.getElementById('cm-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    const isEdit    = !!crmEditingContact;
    const contactId = isEdit ? crmEditingContact.contact_id : `C${Date.now()}`;

    const payload = {
      contact_id:           contactId,
      full_name:            fullName,
      title_role:           document.getElementById('cm-title-role')?.value || '',
      organization:         document.getElementById('cm-organization')?.value || '',
      venture:              document.getElementById('cm-venture')?.value || '',
      source:               document.getElementById('cm-source')?.value || '',
      how_we_met:           document.getElementById('cm-how-we-met')?.value || '',
      relationship_health:  document.getElementById('cm-health')?.value || '',
      activation_potential: document.getElementById('cm-activation')?.value || '',
      what_building:        document.getElementById('cm-what-building')?.value || '',
      what_need:            document.getElementById('cm-what-need')?.value || '',
      what_offer:           document.getElementById('cm-what-offer')?.value || '',
      notes:                document.getElementById('cm-notes')?.value || '',
    };

    const url    = isEdit ? `${API_BASE}/contact/${contactId}` : `${API_BASE}/contact`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const resp = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(payload) });
      const data = await resp.json();
      if (data.success) {
        if (window.showToast) window.showToast(`Contact ${isEdit ? 'updated' : 'saved'} ✓`);
        window.crmCloseModal();
        if (window.closeContactDrawer) window.closeContactDrawer();
        crmLoadContacts(isEdit ? crmOffset : 0);
      } else {
        if (window.showToast) window.showToast('Error saving contact');
      }
    } catch (e) {
      if (window.showToast) window.showToast('Save failed: ' + e.message);
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Save Changes' : 'Save Contact'; }
    }
  };

  /* ── Helpers ────────────────────────────────────────────── */
  function crmHealthClass(h) {
    return { Strong: 'crm-health-strong', Good: 'crm-health-good', Neutral: 'crm-health-neutral', Dormant: 'crm-health-dormant', Cold: 'crm-health-cold' }[h] || 'crm-health-neutral';
  }

  function escHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function updateModeUI() {
    const badge = document.getElementById('crm-mode-badge');
    if (badge) badge.classList.toggle('visible', crmMode === 'search');
  }

  /* ── Patch showPage to handle 'contacts' ────────────────── */
  const _origShowPage = window.showPage;
  window.showPage = function(page) {
    _origShowPage && _origShowPage(page);
    if (page === 'contacts') {
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = 'Contacts';
      const addBtn = document.getElementById('topbar-add-btn');
      if (addBtn) { addBtn.textContent = '+ New Contact'; addBtn.onclick = () => crmOpenModal(null); }
      if (!crmLoaded) { crmLoaded = true; crmLoadContacts(0); }
    }
  };

  /* ── Patch openContactDrawer to track current contact ───── */
  const _origOpenDrawer = window.openContactDrawer;
  window.openContactDrawer = function(contact) {
    window._currentDrawerContact = contact;
    _origOpenDrawer && _origOpenDrawer(contact);
  };

  window.crmLoadContacts = crmLoadContacts;

  /* ── Init ───────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDOM);
  } else {
    injectDOM();
  }

})();
