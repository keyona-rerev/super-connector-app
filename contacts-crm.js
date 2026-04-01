/**
 * Contacts CRM + Activation Hub — Super Connector App v20260401e
 *
 * KEY FIX: reads API key from window.API_KEY (set by index.html's script block)
 * which is the same key already working for Initiatives, Events, etc.
 * Falls back to CONFIG.API_KEY if window.API_KEY isn't set.
 */
(function () {
  const API_BASE = 'https://super-connector-api-production.up.railway.app';

  // index.html defines `const API_KEY = "..."` in its own <script> block.
  // We read it at call-time so it's available even if our script runs first.
  const getKey = () =>
    window.API_KEY ||
    (window.CONFIG && window.CONFIG.API_KEY) ||
    '';

  const hdrs = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': getKey(),
  });

  const PAGE_SIZE = 50;
  let crmContacts = [];
  let crmOffset   = 0;
  let crmMode     = 'browse';
  let crmEditing  = null;

  /* ── CSS ────────────────────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
    .crm-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
    .crm-search-wrap{position:relative;flex:1;min-width:220px;max-width:400px}
    .crm-search-input{width:100%;background:var(--surface);border:1.5px solid var(--border);color:var(--text);font-family:var(--font-sans);font-size:13px;padding:8px 34px 8px 12px;border-radius:var(--radius-lg);outline:none;transition:border-color .15s}
    .crm-search-input::placeholder{color:var(--text3)}
    .crm-search-input:focus{border-color:var(--accent)}
    .crm-clear{position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:17px;padding:0;line-height:1;display:none}
    .crm-clear.vis{display:block}
    .crm-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:var(--accent-dim);color:var(--accent);display:none}
    .crm-badge.vis{display:inline-flex}
    .crm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:12px}
    .crm-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;cursor:pointer;transition:box-shadow .15s,transform .1s,border-color .15s}
    .crm-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px);border-color:var(--accent)}
    .crm-card-name{font-family:var(--font-serif);font-size:15px;font-weight:400;color:var(--text);line-height:1.3;margin-bottom:2px}
    .crm-card-role{font-size:12px;color:var(--text2);margin-bottom:9px}
    .crm-card-footer{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
    .crm-hb{display:inline-flex;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px}
    .crm-hb-strong{background:#EDF7ED;color:var(--complete-border)}
    .crm-hb-good{background:var(--accent-dim);color:var(--accent)}
    .crm-hb-neutral{background:var(--medium-bg);color:var(--medium)}
    .crm-hb-dormant{background:var(--surface2);color:var(--text3)}
    .crm-hb-cold{background:var(--critical-bg);color:var(--critical)}
    .crm-ab{display:inline-flex;font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px;background:var(--surface2);color:var(--text2);border:1px solid var(--border-soft)}
    .crm-sb{display:inline-flex;font-size:10px;padding:2px 8px;border-radius:20px;background:var(--medium-bg);color:var(--medium)}
    .crm-score{display:inline-flex;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;background:var(--accent-dim);color:var(--accent)}
    .crm-pag{display:flex;align-items:center;justify-content:space-between;margin-top:24px;padding-top:20px;border-top:1px solid var(--border-soft)}
    .crm-pag-info{font-size:12px;color:var(--text3)}
    .crm-pag-btns{display:flex;gap:8px}
    .drawer-edit-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:5px 12px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface2);color:var(--text2);cursor:pointer;transition:all .12s;margin-top:8px}
    .drawer-edit-btn:hover{background:var(--border);color:var(--text)}
    .activ-tabs{display:flex;gap:4px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;width:fit-content}
    .activ-tab{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);transition:background .12s,color .12s}
    .activ-tab.active{background:var(--accent);color:#fff}
    .activ-tab:not(.active):hover{background:var(--surface2);color:var(--text)}
    .activ-panel{display:none}
    .activ-panel.active{display:block}
  `;
  document.head.appendChild(css);

  /* ── DOM Injection ──────────────────────────────────────── */
  function injectDOM() {
    /* 1. Contacts nav — replace "Search Contacts" */
    const navSearch = document.getElementById('nav-search');
    if (navSearch && !document.getElementById('nav-contacts')) {
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.id = 'nav-contacts';
      btn.innerHTML = '<span class="icon">⊞</span> Contacts';
      btn.onclick = () => goContacts();
      navSearch.parentNode.insertBefore(btn, navSearch);
      navSearch.style.display = 'none';
    }

    /* 2. Contacts page */
    if (!document.getElementById('page-contacts')) {
      const ref = document.getElementById('page-search');
      if (ref) {
        const div = document.createElement('div');
        div.className = 'page';
        div.id = 'page-contacts';
        div.style.display = 'none';
        div.innerHTML = `
          <div class="crm-toolbar">
            <div class="crm-search-wrap">
              <input class="crm-search-input" id="crm-q" type="text"
                placeholder="Filter by name · Enter for semantic search…"
                oninput="crmInput(this.value)"
                onkeydown="if(event.key==='Enter')crmSearch(this.value)">
              <button class="crm-clear" id="crm-clear" onclick="crmReset()" title="Clear">×</button>
            </div>
            <span class="crm-badge" id="crm-badge">⊹ Semantic results</span>
            <select class="filter-select" id="crm-fv" onchange="crmFilter()">
              <option value="">All Ventures</option>
              <option>ReRev Labs</option><option>Prismm</option>
              <option>Black Tech Capital</option><option>Sekhmetic</option>
            </select>
            <select class="filter-select" id="crm-fh" onchange="crmFilter()">
              <option value="">All Health</option>
              <option>Strong</option><option>Good</option>
              <option>Neutral</option><option>Dormant</option><option>Cold</option>
            </select>
            <select class="filter-select" id="crm-fa" onchange="crmFilter()">
              <option value="">All Activation</option>
              <option>High</option><option>Medium</option>
              <option>Low</option><option>None</option>
            </select>
          </div>
          <div class="crm-grid" id="crm-grid">
            <div class="loading-state" style="grid-column:1/-1">
              <div class="spinner"></div>Loading contacts…
            </div>
          </div>
          <div class="crm-pag" id="crm-pag" style="display:none">
            <span class="crm-pag-info" id="crm-pag-info"></span>
            <div class="crm-pag-btns">
              <button class="btn btn-ghost btn-sm" id="crm-prev" onclick="crmPage(-1)" disabled>← Prev</button>
              <button class="btn btn-ghost btn-sm" id="crm-next" onclick="crmPage(1)">Next →</button>
            </div>
          </div>`;
        ref.parentNode.insertBefore(div, ref);
      }
    }

    /* 3. Activation Hub — merge Angles into Queue as sub-tab */
    const navAngles = document.getElementById('nav-angles');
    if (navAngles) navAngles.style.display = 'none';

    const pageQueue  = document.getElementById('page-queue');
    const pageAngles = document.getElementById('page-angles');
    if (pageQueue && !document.getElementById('activ-tab-bar')) {
      const tabBar = document.createElement('div');
      tabBar.className = 'activ-tabs';
      tabBar.id = 'activ-tab-bar';
      tabBar.innerHTML = `
        <button class="activ-tab active" id="activ-tab-queue"  onclick="activTab('queue')">Activation Queue</button>
        <button class="activ-tab"        id="activ-tab-angles" onclick="activTab('angles')">Activation Angles</button>`;

      const queuePanel = document.createElement('div');
      queuePanel.className = 'activ-panel active';
      queuePanel.id = 'activ-panel-queue';
      const queueInner = document.getElementById('queue-list');
      if (queueInner) {
        queueInner.parentNode.insertBefore(queuePanel, queueInner);
        queuePanel.appendChild(queueInner);
      }

      const anglesPanel = document.createElement('div');
      anglesPanel.className = 'activ-panel';
      anglesPanel.id = 'activ-panel-angles';
      if (pageAngles) {
        while (pageAngles.firstChild) anglesPanel.appendChild(pageAngles.firstChild);
        pageAngles.style.display = 'none';
      }

      pageQueue.insertBefore(tabBar, pageQueue.firstChild);
      pageQueue.appendChild(anglesPanel);
    }

    /* 4. Contact modal */
    if (!document.getElementById('crm-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
<div class="modal-overlay" id="crm-modal">
  <div class="modal" style="max-width:600px">
    <h3 id="crm-modal-title">New Contact</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="field-group" style="grid-column:1/-1"><label>Full Name *</label><input id="cm-name" type="text" placeholder="Jane Smith"></div>
      <div class="field-group"><label>Title / Role</label><input id="cm-role" type="text" placeholder="Co-founder &amp; CEO"></div>
      <div class="field-group"><label>Organization</label><input id="cm-org" type="text" placeholder="Acme Inc."></div>
      <div class="field-group"><label>Venture</label>
        <select id="cm-ven"><option value="">None</option><option>ReRev Labs</option><option>Prismm</option><option>Black Tech Capital</option><option>Sekhmetic</option><option>DO GOOD X</option><option>NYC PIVOT</option><option>Personal</option></select>
      </div>
      <div class="field-group"><label>Source — where we met</label><input id="cm-src" type="text" placeholder="SXSW 2026, BTC Summit…"></div>
      <div class="field-group"><label>How We Met</label><input id="cm-hwm" type="text" placeholder="Panel intro, warm referral…"></div>
      <div class="field-group"><label>Relationship Health</label>
        <select id="cm-hlth"><option value="">Unknown</option><option>Strong</option><option>Good</option><option>Neutral</option><option>Dormant</option><option>Cold</option></select>
      </div>
      <div class="field-group"><label>Activation Potential</label>
        <select id="cm-act"><option value="">Unknown</option><option>High</option><option>Medium</option><option>Low</option><option>None</option></select>
      </div>
      <div class="field-group" style="grid-column:1/-1"><label>What They're Building</label><input id="cm-bld" type="text"></div>
      <div class="field-group" style="grid-column:1/-1"><label>What They Need</label><input id="cm-need" type="text"></div>
      <div class="field-group" style="grid-column:1/-1"><label>What They Offer</label><input id="cm-offer" type="text"></div>
      <div class="field-group" style="grid-column:1/-1"><label>Notes</label><textarea id="cm-notes" style="min-height:72px"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="crmCloseModal()">Cancel</button>
      <button class="btn btn-primary" id="crm-save-btn" onclick="crmSave()">Save Contact</button>
    </div>
  </div>
</div>`);
    }

    /* 5. Edit button in drawer */
    if (!document.getElementById('drawer-edit-btn')) {
      const dh = document.querySelector('#contact-drawer .drawer-header');
      if (dh) {
        const b = document.createElement('button');
        b.className = 'drawer-edit-btn';
        b.id = 'drawer-edit-btn';
        b.innerHTML = '✎ Edit Contact';
        b.onclick = () => { if (window._crmDrawerContact) crmOpenModal(window._crmDrawerContact); };
        dh.appendChild(b);
      }
    }

    /* 6. Kick off background load */
    crmLoad(0);
  }

  /* ── Activation sub-tabs ────────────────────────────────── */
  window.activTab = function (which) {
    ['queue', 'angles'].forEach(t => {
      const isActive = t === which;
      const tab   = document.getElementById('activ-tab-' + t);
      const panel = document.getElementById('activ-panel-' + t);
      if (tab)   tab.classList.toggle('active', isActive);
      if (panel) panel.classList.toggle('active', isActive);
    });
    if (which === 'angles' && window.loadAngles) window.loadAngles();
  };

  /* ── Navigation ─────────────────────────────────────────── */
  function goContacts() {
    document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; });
    const pg = document.getElementById('page-contacts');
    if (pg) pg.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nc = document.getElementById('nav-contacts');
    if (nc) nc.classList.add('active');
    const title = document.getElementById('page-title');
    if (title) title.textContent = 'Contacts';
    const addBtn = document.getElementById('topbar-add-btn');
    if (addBtn) { addBtn.textContent = '+ New Contact'; addBtn.onclick = () => crmOpenModal(null); }
    if (crmContacts.length === 0) crmLoad(0);
  }

  function patchShowPage() {
    const orig = window.showPage;
    window.showPage = function (page) {
      // Always hide contacts page when navigating away
      const pg = document.getElementById('page-contacts');
      if (pg) pg.style.display = 'none';

      if (page === 'contacts' || page === 'search') { goContacts(); return; }
      if (page === 'angles') { if (orig) orig('queue'); activTab('angles'); return; }
      if (orig) orig(page);
    };
  }

  function patchDrawer() {
    const orig = window.openContactDrawer;
    window.openContactDrawer = function (c) {
      window._crmDrawerContact = c;
      if (orig) orig(c);
    };
  }

  /* ── Load ───────────────────────────────────────────────── */
  async function crmLoad(offset) {
    offset = offset || 0;
    crmOffset = offset;
    crmMode = 'browse';
    showBadge(false);
    const grid = document.getElementById('crm-grid');
    if (!grid) return;
    const fv = gv('crm-fv'), fh = gv('crm-fh'), fa = gv('crm-fa');
    grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading contacts…</div>`;

    const key = getKey();
    console.log('[CRM] key source: window.API_KEY=' + !!window.API_KEY + ' CONFIG.API_KEY=' + !!(window.CONFIG && window.CONFIG.API_KEY) + ' key[:8]=' + key.slice(0,8));

    try {
      const resp = await fetch(
        `${API_BASE}/contacts?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: hdrs() }
      );
      if (!resp.ok) {
        const body = await resp.text();
        console.error('[CRM] 403 body:', body);
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      const data = await resp.json();
      let cx = data.data || [];
      if (fv) cx = cx.filter(c => (c.venture||'').toLowerCase().includes(fv.toLowerCase()));
      if (fh) cx = cx.filter(c => (c.relationship_health||'') === fh);
      if (fa) cx = cx.filter(c => (c.activation_potential||'') === fa);
      crmContacts = cx;
      renderGrid(cx, false);
      updatePag(offset, data.count);
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Could not load contacts</h3><p>${e.message}</p></div>`;
    }
  }
  window.crmLoad = crmLoad;

  function renderGrid(cx, isSearch) {
    const grid = document.getElementById('crm-grid');
    if (!grid) return;
    if (!cx.length) {
      grid.innerHTML = `<div class="empty-state"><h3>${isSearch?'No matches':'No contacts'}</h3><p>${isSearch?'Try a different query.':'Use + New Contact to add one.'}</p></div>`;
      grid._contacts = []; return;
    }
    const hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};
    grid.innerHTML = cx.map((c, i) => {
      const hb = c.relationship_health ? `<span class="crm-hb ${hMap[c.relationship_health]||'crm-hb-neutral'}">${esc(c.relationship_health)}</span>` : '';
      const ab = c.activation_potential ? `<span class="crm-ab">${esc(c.activation_potential)}</span>` : '';
      const sb = c.source ? `<span class="crm-sb">${esc(c.source)}</span>` : '';
      const sc = (isSearch && c.score) ? `<span class="crm-score">${Math.round(c.score*100)}%</span>` : '';
      const role = [c.title_role, c.organization].filter(Boolean).join(' · ');
      return `<div class="crm-card" data-cidx="${i}" onclick="crmCardClick(this)">
        <div class="crm-card-name">${esc(c.full_name)}</div>
        <div class="crm-card-role">${esc(role)}</div>
        <div class="crm-card-footer">${hb}${ab}${sb}${sc}</div>
      </div>`;
    }).join('');
    grid._contacts = cx;
  }

  window.crmCardClick = function (el) {
    const grid = document.getElementById('crm-grid');
    if (!grid || !grid._contacts) return;
    const c = grid._contacts[parseInt(el.dataset.cidx, 10)];
    if (!c) return;
    window._crmDrawerContact = c;
    if (window.openContactDrawer) window.openContactDrawer(c);
  };

  window.crmInput = function (v) {
    const cl = document.getElementById('crm-clear');
    if (cl) cl.classList.toggle('vis', v.length > 0);
    if (!v) { crmLoad(crmOffset); return; }
    if (v.length < 4) {
      const q = v.toLowerCase();
      renderGrid(crmContacts.filter(c =>
        (c.full_name||'').toLowerCase().includes(q) ||
        (c.organization||'').toLowerCase().includes(q) ||
        (c.title_role||'').toLowerCase().includes(q)
      ), false);
      const p = document.getElementById('crm-pag');
      if (p) p.style.display = 'none';
    }
  };

  window.crmSearch = async function (q) {
    if (!q || !q.trim()) { crmLoad(0); return; }
    crmMode = 'search'; showBadge(true);
    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>`;
    const p = document.getElementById('crm-pag');
    if (p) p.style.display = 'none';
    try {
      const resp = await fetch(`${API_BASE}/search`, {
        method:'POST', headers:hdrs(),
        body: JSON.stringify({query:q.trim(), top_k:30}),
      });
      const data = await resp.json();
      renderGrid(data.results||[], true);
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Search error</h3><p>${e.message}</p></div>`;
    }
  };

  window.crmReset = function () {
    const inp = document.getElementById('crm-q'); if (inp) inp.value='';
    const cl  = document.getElementById('crm-clear'); if (cl) cl.classList.remove('vis');
    crmMode='browse'; showBadge(false); crmLoad(0);
  };

  window.crmFilter = function () { if (crmMode==='browse') crmLoad(0); };

  function updatePag(offset, total) {
    const p = document.getElementById('crm-pag');
    const info = document.getElementById('crm-pag-info');
    const prev = document.getElementById('crm-prev');
    const next = document.getElementById('crm-next');
    if (!p) return;
    p.style.display = 'flex';
    if (info) info.textContent = `${offset+1}–${offset+crmContacts.length}${total?' of ~'+total:''}`;
    if (prev) prev.disabled = offset===0;
    if (next) next.disabled = crmContacts.length < PAGE_SIZE;
  }

  window.crmPage = function (dir) {
    const n = crmOffset + dir * PAGE_SIZE; if (n<0) return;
    crmLoad(n);
    const g = document.getElementById('crm-grid');
    if (g) g.scrollIntoView({behavior:'smooth',block:'start'});
  };

  /* ── Modal ──────────────────────────────────────────────── */
  function crmOpenModal(c) {
    crmEditing = c||null;
    sv('crm-modal-title', c?'Edit Contact':'New Contact');
    sv('crm-save-btn',    c?'Save Changes':'Save Contact');
    sv2('cm-name',  c?.full_name||'');    sv2('cm-role',  c?.title_role||'');
    sv2('cm-org',   c?.organization||''); sv2('cm-ven',   c?.venture||'');
    sv2('cm-src',   c?.source||'');       sv2('cm-hwm',   c?.how_we_met||'');
    sv2('cm-hlth',  c?.relationship_health||'');
    sv2('cm-act',   c?.activation_potential||'');
    sv2('cm-bld',   c?.what_building||''); sv2('cm-need',  c?.what_need||'');
    sv2('cm-offer', c?.what_offer||'');   sv2('cm-notes', c?.notes||'');
    const m = document.getElementById('crm-modal'); if (m) m.classList.add('open');
  }
  window.crmOpenModal = crmOpenModal;

  window.crmCloseModal = function () {
    const m = document.getElementById('crm-modal'); if (m) m.classList.remove('open');
    crmEditing = null;
  };

  window.crmSave = async function () {
    const name = (gv('cm-name')||'').trim();
    if (!name) { toast('Full name is required'); return; }
    const sb = document.getElementById('crm-save-btn');
    if (sb) { sb.disabled=true; sb.textContent='Saving…'; }
    const isEdit = !!crmEditing;
    const id = isEdit ? crmEditing.contact_id : 'C'+Date.now();
    const payload = {
      contact_id:id, full_name:name,
      title_role:gv('cm-role'), organization:gv('cm-org'),
      venture:gv('cm-ven'), source:gv('cm-src'),
      how_we_met:gv('cm-hwm'), relationship_health:gv('cm-hlth'),
      activation_potential:gv('cm-act'), what_building:gv('cm-bld'),
      what_need:gv('cm-need'), what_offer:gv('cm-offer'), notes:gv('cm-notes'),
    };
    try {
      const resp = await fetch(
        isEdit ? `${API_BASE}/contact/${id}` : `${API_BASE}/contact`,
        {method:isEdit?'PUT':'POST', headers:hdrs(), body:JSON.stringify(payload)}
      );
      const data = await resp.json();
      if (data.success) {
        toast(`Contact ${isEdit?'updated':'saved'} ✓`);
        window.crmCloseModal();
        if (window.closeContactDrawer) window.closeContactDrawer();
        crmLoad(isEdit?crmOffset:0);
      } else { toast('Error saving contact'); }
    } catch(e) { toast('Save failed: '+e.message); }
    finally { if(sb){sb.disabled=false; sb.textContent=isEdit?'Save Changes':'Save Contact';} }
  };

  /* ── Helpers ────────────────────────────────────────────── */
  function esc(s)     { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function gv(id)     { const e=document.getElementById(id); return e?e.value:''; }
  function sv(id,t)   { const e=document.getElementById(id); if(e) e.textContent=t; }
  function sv2(id,v)  { const e=document.getElementById(id); if(e) e.value=v; }
  function showBadge(on){ const b=document.getElementById('crm-badge'); if(b) b.classList.toggle('vis',on); }
  function toast(msg) { if(window.showToast) window.showToast(msg); else console.log('[CRM]',msg); }

  /* ── Init ───────────────────────────────────────────────── */
  let attempts = 0;
  (function tryInit() {
    if (window.showPage || attempts > 30) {
      injectDOM();
      patchShowPage();
      patchDrawer();
    } else {
      attempts++;
      setTimeout(tryInit, 100);
    }
  })();

})();
