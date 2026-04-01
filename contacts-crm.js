/**
 * Contacts CRM + Activation Hub — Super Connector App v20260401i
 * - API key hardcoded as a module-level constant
 * - openContactDrawer fully overridden — no longer depends on index.html's broken version
 * - index.html's native contact-drawer suppressed via CSS + window override
 */
(function () {
  const API_BASE = 'https://super-connector-api-production.up.railway.app';
  const _KEY     = 'sc_live_k3y_2026_scak'; // update here if key ever rotates

  const hdrs = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': _KEY,
  });

  const PAGE_SIZE = 50;
  let crmContacts = [];
  let crmOffset   = 0;
  let crmMode     = 'browse';
  let crmEditing  = null;

  /* ── CSS ────────────────────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
    /* Suppress index.html's native contact drawer entirely */
    #contact-drawer, .contact-drawer, .drawer-overlay { display: none !important; }

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
    .activ-tabs{display:flex;gap:4px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;width:fit-content}
    .activ-tab{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);transition:background .12s,color .12s}
    .activ-tab.active{background:var(--accent);color:#fff}
    .activ-tab:not(.active):hover{background:var(--surface2);color:var(--text)}
    .activ-panel{display:none}
    .activ-panel.active{display:block}
    /* ── CRM Drawer ── */
    #crm-drawer{position:fixed;top:0;right:0;height:100%;width:420px;max-width:95vw;background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow-lg);z-index:1000;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);overflow-y:auto;display:flex !important;flex-direction:column}
    #crm-drawer.open{transform:translateX(0)}
    .crm-drawer-header{display:flex;align-items:flex-start;justify-content:space-between;padding:24px 24px 0;gap:12px}
    .crm-drawer-name{font-family:var(--font-serif);font-size:22px;font-weight:400;color:var(--text);line-height:1.2;flex:1}
    .crm-drawer-close{background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0;line-height:1;flex-shrink:0}
    .crm-drawer-close:hover{color:var(--text)}
    .crm-drawer-meta{padding:6px 24px 16px;font-size:13px;color:var(--text2)}
    .crm-drawer-badges{display:flex;flex-wrap:wrap;gap:5px;padding:0 24px 16px}
    .crm-drawer-body{padding:0 24px 24px;flex:1}
    .crm-drawer-section{margin-bottom:20px}
    .crm-drawer-section-label{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin-bottom:6px}
    .crm-drawer-section-value{font-size:13px;color:var(--text);line-height:1.6}
    .crm-drawer-section-value.empty{color:var(--text3);font-style:italic}
    .crm-drawer-actions{display:flex;gap:8px;padding:16px 24px 24px;border-top:1px solid var(--border-soft)}
    .crm-drawer-edit-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:7px 14px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface2);color:var(--text2);cursor:pointer;transition:all .12s}
    .crm-drawer-edit-btn:hover{background:var(--border);color:var(--text)}
    #crm-drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:999}
    #crm-drawer-overlay.open{display:block}
  `;
  document.head.appendChild(css);

  /* ── CRM Drawer (fully self-contained) ──────────────────── */
  function injectDrawer() {
    if (document.getElementById('crm-drawer')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="crm-drawer-overlay" onclick="crmCloseDrawer()"></div>
      <div id="crm-drawer">
        <div class="crm-drawer-header">
          <div class="crm-drawer-name" id="crm-drawer-name">—</div>
          <button class="crm-drawer-close" onclick="crmCloseDrawer()">×</button>
        </div>
        <div class="crm-drawer-meta" id="crm-drawer-meta"></div>
        <div class="crm-drawer-badges" id="crm-drawer-badges"></div>
        <div class="crm-drawer-body" id="crm-drawer-body"></div>
        <div class="crm-drawer-actions">
          <button class="crm-drawer-edit-btn" onclick="if(window._crmDrawerContact)crmOpenModal(window._crmDrawerContact)">✎ Edit Contact</button>
        </div>
      </div>`);
  }

  function openCrmDrawer(c) {
    if (!c) return;
    window._crmDrawerContact = c;

    // Make sure index.html's drawer stays hidden
    const oldDrawer = document.getElementById('contact-drawer');
    if (oldDrawer) oldDrawer.style.setProperty('display', 'none', 'important');

    const hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};

    sv('crm-drawer-name', c.full_name || '—');

    const meta = [c.title_role, c.organization].filter(Boolean).join(' · ');
    sv('crm-drawer-meta', meta);

    const badges = [];
    if (c.relationship_health) badges.push(`<span class="crm-hb ${hMap[c.relationship_health]||'crm-hb-neutral'}">${esc(c.relationship_health)}</span>`);
    if (c.activation_potential) badges.push(`<span class="crm-ab">${esc(c.activation_potential)} activation</span>`);
    if (c.venture) badges.push(`<span class="crm-sb">${esc(c.venture)}</span>`);
    if (c.source) badges.push(`<span class="crm-sb">${esc(c.source)}</span>`);
    const bd = document.getElementById('crm-drawer-badges');
    if (bd) bd.innerHTML = badges.join('');

    const sections = [
      { label: 'How We Met',            value: c.how_we_met },
      { label: "What They're Building", value: c.what_building },
      { label: 'What They Need',        value: c.what_need },
      { label: 'What They Offer',       value: c.what_offer },
      { label: 'Notes',                 value: c.notes },
      { label: 'Contact ID',            value: c.contact_id },
    ];

    const body = document.getElementById('crm-drawer-body');
    if (body) {
      body.innerHTML = sections
        .filter(s => s.value)
        .map(s => `
          <div class="crm-drawer-section">
            <div class="crm-drawer-section-label">${esc(s.label)}</div>
            <div class="crm-drawer-section-value">${esc(s.value)}</div>
          </div>`)
        .join('') || '<div class="crm-drawer-section"><div class="crm-drawer-section-value empty">No additional details on file.</div></div>';
    }

    document.getElementById('crm-drawer').classList.add('open');
    document.getElementById('crm-drawer-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  window.crmCloseDrawer = function () {
    const d = document.getElementById('crm-drawer');
    const o = document.getElementById('crm-drawer-overlay');
    if (d) d.classList.remove('open');
    if (o) o.classList.remove('open');
    document.body.style.overflow = '';
  };

  /* ── DOM Injection ──────────────────────────────────────── */
  function injectDOM() {
    injectDrawer();

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
            <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading contacts…</div>
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
      if (queueInner) { queueInner.parentNode.insertBefore(queuePanel, queueInner); queuePanel.appendChild(queueInner); }
      const anglesPanel = document.createElement('div');
      anglesPanel.className = 'activ-panel';
      anglesPanel.id = 'activ-panel-angles';
      if (pageAngles) { while (pageAngles.firstChild) anglesPanel.appendChild(pageAngles.firstChild); pageAngles.style.display = 'none'; }
      pageQueue.insertBefore(tabBar, pageQueue.firstChild);
      pageQueue.appendChild(anglesPanel);
    }

    if (!document.getElementById('crm-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
<div class="modal-overlay" id="crm-modal">
  <div class="modal" style="max-width:600px">
    <h3 id="crm-modal-title">New Contact</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="field-group" style="grid-column:1/-1"><label>Full Name *</label><input id="cm-name" type="text" placeholder="Jane Smith"></div>
      <div class="field-group"><label>Title / Role</label><input id="cm-role" type="text" placeholder="Co-founder &amp; CEO"></div>
      <div class="field-group"><label>Organization</label><input id="cm-org" type="text" placeholder="Acme Inc."></div>
      <div class="field-group"><label>Venture</label><select id="cm-ven"><option value="">None</option><option>ReRev Labs</option><option>Prismm</option><option>Black Tech Capital</option><option>Sekhmetic</option><option>DO GOOD X</option><option>NYC PIVOT</option><option>Personal</option></select></div>
      <div class="field-group"><label>Source — where we met</label><input id="cm-src" type="text" placeholder="SXSW 2026, BTC Summit…"></div>
      <div class="field-group"><label>How We Met</label><input id="cm-hwm" type="text" placeholder="Panel intro, warm referral…"></div>
      <div class="field-group"><label>Relationship Health</label><select id="cm-hlth"><option value="">Unknown</option><option>Strong</option><option>Good</option><option>Neutral</option><option>Dormant</option><option>Cold</option></select></div>
      <div class="field-group"><label>Activation Potential</label><select id="cm-act"><option value="">Unknown</option><option>High</option><option>Medium</option><option>Low</option><option>None</option></select></div>
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

    crmLoad(0);
  }

  window.activTab = function (which) {
    ['queue','angles'].forEach(t => {
      const isActive = t === which;
      const tab = document.getElementById('activ-tab-'+t);
      const panel = document.getElementById('activ-panel-'+t);
      if (tab) tab.classList.toggle('active', isActive);
      if (panel) panel.classList.toggle('active', isActive);
    });
    if (which === 'angles' && window.loadAngles) window.loadAngles();
  };

  function goContacts() {
    document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; });
    const pg = document.getElementById('page-contacts'); if (pg) pg.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nc = document.getElementById('nav-contacts'); if (nc) nc.classList.add('active');
    const title = document.getElementById('page-title'); if (title) title.textContent = 'Contacts';
    const addBtn = document.getElementById('topbar-add-btn');
    if (addBtn) { addBtn.textContent = '+ New Contact'; addBtn.onclick = () => crmOpenModal(null); }
    if (crmContacts.length === 0) crmLoad(0);
  }

  function patchShowPage() {
    const orig = window.showPage;
    window.showPage = function (page) {
      const pg = document.getElementById('page-contacts'); if (pg) pg.style.display = 'none';
      if (page === 'contacts' || page === 'search') { goContacts(); return; }
      if (page === 'angles') { if (orig) orig('queue'); activTab('angles'); return; }
      if (orig) orig(page);
    };
  }

  /* Nuke index.html's openContactDrawer and closeContactDrawer.
     Both are replaced with our versions so nothing leaks through. */
  function patchDrawer() {
    window.openContactDrawer  = openCrmDrawer;
    window.closeContactDrawer = window.crmCloseDrawer;
  }

  async function crmLoad(offset) {
    offset = offset || 0;
    crmOffset = offset; crmMode = 'browse'; showBadge(false);
    const grid = document.getElementById('crm-grid'); if (!grid) return;
    const fv = gv('crm-fv'), fh = gv('crm-fh'), fa = gv('crm-fa');
    grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading contacts…</div>`;
    try {
      const resp = await fetch(`${API_BASE}/contacts?limit=${PAGE_SIZE}&offset=${offset}`, { headers: hdrs() });
      if (!resp.ok) { const b = await resp.text(); throw new Error(`HTTP ${resp.status}: ${b}`); }
      const data = await resp.json();
      let cx = data.data || [];
      if (fv) cx = cx.filter(c => (c.venture||'').toLowerCase().includes(fv.toLowerCase()));
      if (fh) cx = cx.filter(c => (c.relationship_health||'') === fh);
      if (fa) cx = cx.filter(c => (c.activation_potential||'') === fa);
      crmContacts = cx; renderGrid(cx, false); updatePag(offset, data.count);
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Could not load contacts</h3><p>${e.message}</p></div>`;
    }
  }
  window.crmLoad = crmLoad;

  function renderGrid(cx, isSearch) {
    const grid = document.getElementById('crm-grid'); if (!grid) return;
    if (!cx.length) { grid.innerHTML = `<div class="empty-state"><h3>${isSearch?'No matches':'No contacts'}</h3><p>${isSearch?'Try a different query.':'Use + New Contact to add one.'}</p></div>`; grid._contacts=[]; return; }
    const hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};
    grid.innerHTML = cx.map((c,i) => {
      const hb = c.relationship_health?`<span class="crm-hb ${hMap[c.relationship_health]||'crm-hb-neutral'}">${esc(c.relationship_health)}</span>`:'';
      const ab = c.activation_potential?`<span class="crm-ab">${esc(c.activation_potential)}</span>`:'';
      const sb = c.source?`<span class="crm-sb">${esc(c.source)}</span>`:'';
      const sc = (isSearch&&c.score)?`<span class="crm-score">${Math.round(c.score*100)}%</span>`:'';
      const role = [c.title_role,c.organization].filter(Boolean).join(' · ');
      return `<div class="crm-card" data-cidx="${i}" onclick="crmCardClick(this)"><div class="crm-card-name">${esc(c.full_name)}</div><div class="crm-card-role">${esc(role)}</div><div class="crm-card-footer">${hb}${ab}${sb}${sc}</div></div>`;
    }).join('');
    grid._contacts = cx;
  }

  window.crmCardClick = function (el) {
    // Stop any propagation so index.html event listeners can't intercept
    if (el && el.stopPropagation) el.stopPropagation && el.stopPropagation();
    const grid = document.getElementById('crm-grid'); if (!grid||!grid._contacts) return;
    const c = grid._contacts[parseInt(el.dataset.cidx,10)]; if (!c) return;
    openCrmDrawer(c);
  };

  window.crmInput = function (v) {
    const cl = document.getElementById('crm-clear'); if (cl) cl.classList.toggle('vis', v.length>0);
    if (!v) { crmLoad(crmOffset); return; }
    if (v.length < 4) {
      const q = v.toLowerCase();
      renderGrid(crmContacts.filter(c=>(c.full_name||'').toLowerCase().includes(q)||(c.organization||'').toLowerCase().includes(q)||(c.title_role||'').toLowerCase().includes(q)), false);
      const p = document.getElementById('crm-pag'); if (p) p.style.display='none';
    }
  };

  window.crmSearch = async function (q) {
    if (!q||!q.trim()) { crmLoad(0); return; }
    crmMode='search'; showBadge(true);
    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML=`<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>`;
    const p = document.getElementById('crm-pag'); if (p) p.style.display='none';
    try {
      const resp = await fetch(`${API_BASE}/search`,{method:'POST',headers:hdrs(),body:JSON.stringify({query:q.trim(),top_k:30})});
      const data = await resp.json(); renderGrid(data.results||[],true);
    } catch(e) { if(grid) grid.innerHTML=`<div class="empty-state"><h3>Search error</h3><p>${e.message}</p></div>`; }
  };

  window.crmReset = function () {
    const inp=document.getElementById('crm-q'); if(inp) inp.value='';
    const cl=document.getElementById('crm-clear'); if(cl) cl.classList.remove('vis');
    crmMode='browse'; showBadge(false); crmLoad(0);
  };
  window.crmFilter = function () { if(crmMode==='browse') crmLoad(0); };

  function updatePag(offset,total) {
    const p=document.getElementById('crm-pag'),info=document.getElementById('crm-pag-info'),prev=document.getElementById('crm-prev'),next=document.getElementById('crm-next');
    if(!p) return; p.style.display='flex';
    if(info) info.textContent=`${offset+1}–${Math.min(offset+crmContacts.length, total||999)}${total?' of '+total:''}`;
    if(prev) prev.disabled=offset===0; if(next) next.disabled=crmContacts.length<PAGE_SIZE;
  }
  window.crmPage = function(dir) { const n=crmOffset+dir*PAGE_SIZE; if(n<0) return; crmLoad(n); const g=document.getElementById('crm-grid'); if(g) g.scrollIntoView({behavior:'smooth',block:'start'}); };

  function crmOpenModal(c) {
    crmEditing=c||null;
    sv('crm-modal-title',c?'Edit Contact':'New Contact'); sv('crm-save-btn',c?'Save Changes':'Save Contact');
    sv2('cm-name',c?.full_name||''); sv2('cm-role',c?.title_role||''); sv2('cm-org',c?.organization||'');
    sv2('cm-ven',c?.venture||''); sv2('cm-src',c?.source||''); sv2('cm-hwm',c?.how_we_met||'');
    sv2('cm-hlth',c?.relationship_health||''); sv2('cm-act',c?.activation_potential||'');
    sv2('cm-bld',c?.what_building||''); sv2('cm-need',c?.what_need||''); sv2('cm-offer',c?.what_offer||''); sv2('cm-notes',c?.notes||'');
    const m=document.getElementById('crm-modal'); if(m) m.classList.add('open');
  }
  window.crmOpenModal = crmOpenModal;
  window.crmCloseModal = function () { const m=document.getElementById('crm-modal'); if(m) m.classList.remove('open'); crmEditing=null; };

  window.crmSave = async function () {
    const name=(gv('cm-name')||'').trim(); if(!name){toast('Full name is required');return;}
    const sb=document.getElementById('crm-save-btn'); if(sb){sb.disabled=true;sb.textContent='Saving…';}
    const isEdit=!!crmEditing, id=isEdit?crmEditing.contact_id:'C'+Date.now();
    const payload={contact_id:id,full_name:name,title_role:gv('cm-role'),organization:gv('cm-org'),venture:gv('cm-ven'),source:gv('cm-src'),how_we_met:gv('cm-hwm'),relationship_health:gv('cm-hlth'),activation_potential:gv('cm-act'),what_building:gv('cm-bld'),what_need:gv('cm-need'),what_offer:gv('cm-offer'),notes:gv('cm-notes')};
    try {
      const resp=await fetch(isEdit?`${API_BASE}/contact/${id}`:`${API_BASE}/contact`,{method:isEdit?'PUT':'POST',headers:hdrs(),body:JSON.stringify(payload)});
      const data=await resp.json();
      if(data.success){
        toast(`Contact ${isEdit?'updated':'saved'} ✓`);
        window.crmCloseModal();
        window.crmCloseDrawer();
        if(isEdit) openCrmDrawer({...crmEditing,...payload});
        crmLoad(isEdit?crmOffset:0);
      } else {
        toast('Error saving contact');
      }
    } catch(e){toast('Save failed: '+e.message);}
    finally{if(sb){sb.disabled=false;sb.textContent=isEdit?'Save Changes':'Save Contact';}}
  };

  function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function gv(id){const e=document.getElementById(id);return e?e.value:'';}
  function sv(id,t){const e=document.getElementById(id);if(e)e.textContent=t;}
  function sv2(id,v){const e=document.getElementById(id);if(e)e.value=v;}
  function showBadge(on){const b=document.getElementById('crm-badge');if(b)b.classList.toggle('vis',on);}
  function toast(msg){if(window.showToast)window.showToast(msg);else console.log('[CRM]',msg);}

  let attempts=0;
  (function tryInit(){
    if(window.showPage||attempts>30){injectDOM();patchShowPage();patchDrawer();}
    else{attempts++;setTimeout(tryInit,100);}
  })();
})();
