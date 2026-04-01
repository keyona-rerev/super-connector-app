/**
 * Contacts CRM + Activation Hub — Super Connector App v20260401j
 * Session 5 additions:
 * - Dashboard view (default): buckets + follow-up strip
 * - Browse All as secondary tab
 * - Bucket management in contact drawer (membership, add/remove, new bucket)
 * - Help panel (? button, slide-in, tabbed)
 */
(function () {
  const API_BASE = 'https://super-connector-api-production.up.railway.app';
  const _KEY     = 'sc_live_k3y_2026_scak'; // update here if key ever rotates

  const hdrs = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': _KEY,
  });

  const PAGE_SIZE = 50;
  let crmContacts  = [];
  let crmOffset    = 0;
  let crmMode      = 'browse';
  let crmEditing   = null;
  let crmView      = 'dashboard'; // 'dashboard' | 'browse'
  let allBuckets   = [];

  /* ─────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
    /* Suppress index.html's native contact drawer entirely */
    #contact-drawer, .contact-drawer, .drawer-overlay { display: none !important; }

    /* ── Toolbar ── */
    .crm-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
    .crm-search-wrap{position:relative;flex:1;min-width:220px;max-width:400px}
    .crm-search-input{width:100%;background:var(--surface);border:1.5px solid var(--border);color:var(--text);font-family:var(--font-sans);font-size:13px;padding:8px 34px 8px 12px;border-radius:var(--radius-lg);outline:none;transition:border-color .15s}
    .crm-search-input::placeholder{color:var(--text3)}
    .crm-search-input:focus{border-color:var(--accent)}
    .crm-clear{position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:17px;padding:0;line-height:1;display:none}
    .crm-clear.vis{display:block}
    .crm-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:var(--accent-dim);color:var(--accent);display:none}
    .crm-badge.vis{display:inline-flex}

    /* ── View tabs ── */
    .crm-view-tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;width:fit-content;margin-bottom:24px}
    .crm-view-tab{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);transition:background .12s,color .12s}
    .crm-view-tab.active{background:var(--accent);color:#fff}
    .crm-view-tab:not(.active):hover{background:var(--surface2);color:var(--text)}

    /* ── Dashboard panels ── */
    .crm-dashboard-panel{display:none}
    .crm-dashboard-panel.active{display:block}

    /* ── Section headers ── */
    .crm-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .crm-section-title{font-family:var(--font-serif);font-size:17px;font-weight:400;color:var(--text)}
    .crm-section-action{font-size:12px;color:var(--accent);cursor:pointer;background:none;border:none;font-family:var(--font-sans);padding:0}
    .crm-section-action:hover{text-decoration:underline}

    /* ── Bucket cards ── */
    .crm-buckets-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:32px}
    .crm-bucket-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;cursor:pointer;transition:box-shadow .15s,transform .1s,border-color .15s;position:relative}
    .crm-bucket-card:hover{box-shadow:var(--shadow-md);transform:translateY(-2px);border-color:var(--accent)}
    .crm-bucket-card-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .crm-bucket-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .crm-bucket-name{font-size:14px;font-weight:600;color:var(--text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .crm-bucket-count{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--accent-dim);color:var(--accent)}
    .crm-bucket-members{font-size:11px;color:var(--text3);line-height:1.5;min-height:16px}
    .crm-bucket-desc{font-size:11px;color:var(--text3);margin-top:6px;line-height:1.4}
    .crm-new-bucket-card{background:var(--surface2);border:1.5px dashed var(--border);border-radius:var(--radius-lg);padding:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text3);font-size:13px;transition:border-color .15s,color .15s;min-height:90px}
    .crm-new-bucket-card:hover{border-color:var(--accent);color:var(--accent)}
    .crm-buckets-empty{color:var(--text3);font-size:13px;padding:20px 0 32px;font-style:italic}

    /* ── Follow-up strip ── */
    .crm-fu-strip{margin-bottom:32px}
    .crm-fu-list{display:flex;flex-direction:column;gap:8px}
    .crm-fu-row{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 16px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
    .crm-fu-row:hover{border-color:var(--accent);box-shadow:var(--shadow-sm)}
    .crm-fu-overdue{border-left:3px solid var(--critical)!important}
    .crm-fu-name{font-size:13px;font-weight:600;color:var(--text);min-width:140px}
    .crm-fu-action{font-size:12px;color:var(--text2);flex:1}
    .crm-fu-date{font-size:11px;color:var(--text3);white-space:nowrap}
    .crm-fu-date.overdue{color:var(--critical);font-weight:600}
    .crm-fu-venture{font-size:10px;padding:2px 8px;border-radius:20px;background:var(--surface2);color:var(--text3);border:1px solid var(--border-soft)}
    .crm-fu-empty{color:var(--text3);font-size:13px;padding:16px 0;font-style:italic}

    /* ── Browse grid ── */
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

    /* ── Activation tabs ── */
    .activ-tabs{display:flex;gap:4px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;width:fit-content}
    .activ-tab{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);transition:background .12s,color .12s}
    .activ-tab.active{background:var(--accent);color:#fff}
    .activ-tab:not(.active):hover{background:var(--surface2);color:var(--text)}
    .activ-panel{display:none}
    .activ-panel.active{display:block}

    /* ── CRM Drawer ── */
    #crm-drawer{position:fixed;top:0;right:0;height:100%;width:440px;max-width:95vw;background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow-lg);z-index:1000;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);overflow-y:auto;display:flex !important;flex-direction:column}
    #crm-drawer.open{transform:translateX(0)}
    .crm-drawer-header{display:flex;align-items:flex-start;justify-content:space-between;padding:24px 24px 0;gap:12px}
    .crm-drawer-name{font-family:var(--font-serif);font-size:22px;font-weight:400;color:var(--text);line-height:1.2;flex:1}
    .crm-drawer-close{background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0;line-height:1;flex-shrink:0}
    .crm-drawer-close:hover{color:var(--text)}
    .crm-drawer-meta{padding:6px 24px 16px;font-size:13px;color:var(--text2)}
    .crm-drawer-badges{display:flex;flex-wrap:wrap;gap:5px;padding:0 24px 16px}
    .crm-drawer-body{padding:0 24px 8px;flex:1}
    .crm-drawer-section{margin-bottom:20px}
    .crm-drawer-section-label{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin-bottom:6px}
    .crm-drawer-section-value{font-size:13px;color:var(--text);line-height:1.6}
    .crm-drawer-section-value.empty{color:var(--text3);font-style:italic}
    .crm-drawer-actions{display:flex;gap:8px;padding:16px 24px 24px;border-top:1px solid var(--border-soft)}
    .crm-drawer-edit-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:7px 14px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface2);color:var(--text2);cursor:pointer;transition:all .12s}
    .crm-drawer-edit-btn:hover{background:var(--border);color:var(--text)}
    #crm-drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:999}
    #crm-drawer-overlay.open{display:block}

    /* ── Drawer bucket panel ── */
    .crm-drawer-buckets{padding:0 24px 20px;border-top:1px solid var(--border-soft);margin-top:4px}
    .crm-drawer-buckets-title{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin:16px 0 10px}
    .crm-drawer-bucket-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
    .crm-drawer-bucket-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;padding:3px 10px 3px 8px;border-radius:20px;background:var(--surface2);border:1px solid var(--border);color:var(--text2)}
    .crm-drawer-bucket-tag-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
    .crm-drawer-bucket-tag-remove{background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0;line-height:1;margin-left:2px}
    .crm-drawer-bucket-tag-remove:hover{color:var(--critical)}
    .crm-drawer-bucket-add{display:flex;gap:6px;align-items:center;margin-top:4px}
    .crm-drawer-bucket-select{flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:var(--font-sans);font-size:12px;padding:6px 10px;border-radius:var(--radius);outline:none}
    .crm-drawer-bucket-select:focus{border-color:var(--accent)}
    .crm-drawer-bucket-add-btn{font-size:12px;padding:6px 12px;white-space:nowrap}
    .crm-drawer-new-bucket-row{display:flex;gap:6px;align-items:center;margin-top:8px}
    .crm-drawer-new-bucket-input{flex:1;background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:var(--font-sans);font-size:12px;padding:6px 10px;border-radius:var(--radius);outline:none}
    .crm-drawer-new-bucket-input:focus{border-color:var(--accent)}
    .crm-drawer-new-bucket-input::placeholder{color:var(--text3)}

    /* ── Help panel ── */
    #help-panel{position:fixed;top:0;right:0;height:100%;width:400px;max-width:95vw;background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow-lg);z-index:1001;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
    #help-panel.open{transform:translateX(0)}
    .help-header{display:flex;align-items:center;justify-content:space-between;padding:24px 24px 0}
    .help-title{font-family:var(--font-serif);font-size:20px;font-weight:400;color:var(--text)}
    .help-close{background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0;line-height:1}
    .help-close:hover{color:var(--text)}
    .help-tabs{display:flex;gap:4px;padding:16px 24px 0;border-bottom:1px solid var(--border-soft)}
    .help-tab{padding:7px 14px;font-size:12px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);border-bottom:2px solid transparent;transition:color .12s,border-color .12s;margin-bottom:-1px}
    .help-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
    .help-body{flex:1;overflow-y:auto;padding:20px 24px 32px}
    .help-panel-content{display:none}
    .help-panel-content.active{display:block}
    .help-panel-content h4{font-size:13px;font-weight:600;color:var(--text);margin:18px 0 6px}
    .help-panel-content h4:first-child{margin-top:0}
    .help-panel-content p,.help-panel-content li{font-size:12px;color:var(--text2);line-height:1.7;margin:0 0 6px}
    .help-panel-content ul{padding-left:16px;margin:0 0 12px}
    .help-field-table{width:100%;border-collapse:collapse;margin-bottom:16px}
    .help-field-table td{font-size:11px;padding:5px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
    .help-field-table td:first-child{font-weight:600;color:var(--text);width:38%;white-space:nowrap}
    .help-field-table td:last-child{color:var(--text2)}
    #help-fab{position:fixed;bottom:28px;right:28px;width:42px;height:42px;border-radius:50%;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow-md);color:var(--text2);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:998;transition:background .12s,color .12s,box-shadow .12s}
    #help-fab:hover{background:var(--accent);color:#fff;box-shadow:var(--shadow-lg)}
  `;
  document.head.appendChild(css);

  /* ─────────────────────────────────────────────────────────
     COLOUR HELPERS
  ───────────────────────────────────────────────────────── */
  const BUCKET_COLORS = ['#6B7FF0','#F06B9D','#F0A06B','#6BC47F','#A06BF0','#6BC4C4','#F0D06B'];
  function bucketColor(b) { return (b && b.color) ? b.color : BUCKET_COLORS[(b && b.bucket_id ? b.bucket_id.charCodeAt(4) : 0) % BUCKET_COLORS.length]; }
  const hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};

  /* ─────────────────────────────────────────────────────────
     INJECT DRAWER
  ───────────────────────────────────────────────────────── */
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
        <div class="crm-drawer-buckets">
          <div class="crm-drawer-buckets-title">Buckets</div>
          <div class="crm-drawer-bucket-tags" id="crm-drawer-bucket-tags"></div>
          <div class="crm-drawer-bucket-add">
            <select class="crm-drawer-bucket-select" id="crm-drawer-bucket-select">
              <option value="">Add to bucket…</option>
            </select>
            <button class="btn btn-ghost btn-sm crm-drawer-bucket-add-btn" onclick="crmDrawerAddBucket()">Add</button>
          </div>
          <div class="crm-drawer-new-bucket-row">
            <input class="crm-drawer-new-bucket-input" id="crm-drawer-new-bucket-name" type="text" placeholder="New bucket name…" onkeydown="if(event.key==='Enter')crmDrawerCreateBucket()">
            <button class="btn btn-ghost btn-sm" onclick="crmDrawerCreateBucket()">+ Create</button>
          </div>
        </div>
        <div class="crm-drawer-actions">
          <button class="crm-drawer-edit-btn" onclick="if(window._crmDrawerContact)crmOpenModal(window._crmDrawerContact)">✎ Edit Contact</button>
        </div>
      </div>`);
  }

  /* ─────────────────────────────────────────────────────────
     DRAWER OPEN / CLOSE
  ───────────────────────────────────────────────────────── */
  function openCrmDrawer(c) {
    if (!c) return;
    window._crmDrawerContact = c;

    const oldDrawer = document.getElementById('contact-drawer');
    if (oldDrawer) oldDrawer.style.setProperty('display', 'none', 'important');

    sv('crm-drawer-name', c.full_name || '—');
    sv('crm-drawer-meta', [c.title_role, c.organization].filter(Boolean).join(' · '));

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
      body.innerHTML = sections.filter(s => s.value)
        .map(s => `<div class="crm-drawer-section"><div class="crm-drawer-section-label">${esc(s.label)}</div><div class="crm-drawer-section-value">${esc(s.value)}</div></div>`)
        .join('') || '<div class="crm-drawer-section"><div class="crm-drawer-section-value empty">No additional details on file.</div></div>';
    }

    // Render bucket membership
    renderDrawerBuckets(c.contact_id);

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

  /* ─────────────────────────────────────────────────────────
     DRAWER BUCKET PANEL
  ───────────────────────────────────────────────────────── */
  async function renderDrawerBuckets(contactId) {
    const tagsEl  = document.getElementById('crm-drawer-bucket-tags');
    const selEl   = document.getElementById('crm-drawer-bucket-select');
    if (!tagsEl || !selEl) return;

    // Fetch membership for this contact
    let memberOf = [];
    try {
      const r = await fetch(`${API_BASE}/contact/${contactId}/buckets`, { headers: hdrs() });
      const d = await r.json();
      memberOf = d.data || [];
    } catch(e) { /* silent */ }

    // Render tags
    tagsEl.innerHTML = memberOf.length
      ? memberOf.map(b => `
          <span class="crm-drawer-bucket-tag" data-bucket-id="${esc(b.bucket_id)}">
            <span class="crm-drawer-bucket-tag-dot" style="background:${bucketColor(b)}"></span>
            ${esc(b.name||b.bucket_id)}
            <button class="crm-drawer-bucket-tag-remove" onclick="crmDrawerRemoveBucket('${esc(b.bucket_id)}')" title="Remove from bucket">×</button>
          </span>`).join('')
      : '<span style="font-size:11px;color:var(--text3);font-style:italic">Not in any bucket yet</span>';

    // Populate dropdown with buckets NOT already a member
    const memberIds = new Set(memberOf.map(b => b.bucket_id));
    const available = allBuckets.filter(b => !memberIds.has(b.bucket_id));
    selEl.innerHTML = '<option value="">Add to bucket…</option>' +
      available.map(b => `<option value="${esc(b.bucket_id)}">${esc(b.name||b.bucket_id)}</option>`).join('');
  }

  window.crmDrawerAddBucket = async function () {
    const c = window._crmDrawerContact; if (!c) return;
    const sel = document.getElementById('crm-drawer-bucket-select');
    const bucketId = sel && sel.value;
    if (!bucketId) return;
    try {
      await fetch(`${API_BASE}/bucket/${bucketId}/members`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ contact_id: c.contact_id })
      });
      await loadBuckets();
      renderDrawerBuckets(c.contact_id);
      renderBucketCards();
    } catch(e) { toast('Failed to add to bucket'); }
  };

  window.crmDrawerRemoveBucket = async function (bucketId) {
    const c = window._crmDrawerContact; if (!c) return;
    try {
      await fetch(`${API_BASE}/bucket/${bucketId}/members/${c.contact_id}`, { method: 'DELETE', headers: hdrs() });
      await loadBuckets();
      renderDrawerBuckets(c.contact_id);
      renderBucketCards();
    } catch(e) { toast('Failed to remove from bucket'); }
  };

  window.crmDrawerCreateBucket = async function () {
    const inp = document.getElementById('crm-drawer-new-bucket-name');
    const name = inp && inp.value.trim();
    if (!name) return;
    try {
      await fetch(`${API_BASE}/bucket`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ name })
      });
      if (inp) inp.value = '';
      await loadBuckets();
      renderDrawerBuckets(window._crmDrawerContact && window._crmDrawerContact.contact_id);
      renderBucketCards();
      toast('Bucket created ✓');
    } catch(e) { toast('Failed to create bucket'); }
  };

  /* ─────────────────────────────────────────────────────────
     INJECT MAIN DOM
  ───────────────────────────────────────────────────────── */
  function injectDOM() {
    injectDrawer();
    injectHelpPanel();

    // Nav button
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

    // Page scaffold
    if (!document.getElementById('page-contacts')) {
      const ref = document.getElementById('page-search');
      if (ref) {
        const div = document.createElement('div');
        div.className = 'page';
        div.id = 'page-contacts';
        div.style.display = 'none';
        div.innerHTML = `
          <!-- View tabs -->
          <div class="crm-view-tabs">
            <button class="crm-view-tab active" id="crm-tab-dashboard" onclick="crmSwitchView('dashboard')">Overview</button>
            <button class="crm-view-tab"        id="crm-tab-browse"    onclick="crmSwitchView('browse')">Browse All</button>
          </div>

          <!-- DASHBOARD PANEL -->
          <div class="crm-dashboard-panel active" id="crm-panel-dashboard">
            <!-- Buckets section -->
            <div class="crm-section-head">
              <span class="crm-section-title">Buckets</span>
              <button class="crm-section-action" onclick="crmNewBucketModal()">+ New Bucket</button>
            </div>
            <div class="crm-buckets-grid" id="crm-buckets-grid">
              <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading buckets…</div>
            </div>

            <!-- Follow-up strip -->
            <div class="crm-fu-strip">
              <div class="crm-section-head">
                <span class="crm-section-title">Open Follow-Ups</span>
                <button class="crm-section-action" onclick="crmSwitchView('browse')">Browse all contacts →</button>
              </div>
              <div class="crm-fu-list" id="crm-fu-list">
                <div class="loading-state"><div class="spinner"></div>Loading follow-ups…</div>
              </div>
            </div>
          </div>

          <!-- BROWSE PANEL -->
          <div class="crm-dashboard-panel" id="crm-panel-browse">
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
                <option>DO GOOD X</option><option>NYC PIVOT</option><option>Personal</option>
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
            </div>
          </div>`;
        ref.parentNode.insertBefore(div, ref);
      }
    }

    // Activation tabs
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

    // Edit modal
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

    // New bucket modal
    if (!document.getElementById('crm-bucket-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
<div class="modal-overlay" id="crm-bucket-modal">
  <div class="modal" style="max-width:420px">
    <h3>New Bucket</h3>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="field-group"><label>Name *</label><input id="cbm-name" type="text" placeholder="e.g. BTC Climate Advisors"></div>
      <div class="field-group"><label>Description</label><input id="cbm-desc" type="text" placeholder="What's this group for?"></div>
      <div class="field-group"><label>Color</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          ${BUCKET_COLORS.map(c=>`<span onclick="crmBucketPickColor('${c}')" data-color="${c}" style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:border-color .12s" title="${c}"></span>`).join('')}
        </div>
        <input type="hidden" id="cbm-color" value="${BUCKET_COLORS[0]}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="crmCloseBucketModal()">Cancel</button>
      <button class="btn btn-primary" id="crm-bucket-save-btn" onclick="crmSaveBucket()">Create Bucket</button>
    </div>
  </div>
</div>`);
    }

    loadDashboard();
  }

  /* ─────────────────────────────────────────────────────────
     VIEW SWITCHING
  ───────────────────────────────────────────────────────── */
  window.crmSwitchView = function (view) {
    crmView = view;
    ['dashboard','browse'].forEach(v => {
      const tab   = document.getElementById('crm-tab-'+v);
      const panel = document.getElementById('crm-panel-'+v);
      const active = v === view;
      if (tab)   tab.classList.toggle('active', active);
      if (panel) panel.classList.toggle('active', active);
    });
    if (view === 'browse' && crmContacts.length === 0) crmLoad(0);
  };

  /* ─────────────────────────────────────────────────────────
     DASHBOARD LOAD
  ───────────────────────────────────────────────────────── */
  async function loadDashboard() {
    await Promise.all([loadBuckets(), loadFollowUps()]);
    renderBucketCards();
    renderFollowUpStrip();
  }

  /* ─────────────────────────────────────────────────────────
     BUCKETS
  ───────────────────────────────────────────────────────── */
  async function loadBuckets() {
    try {
      const r = await fetch(`${API_BASE}/buckets`, { headers: hdrs() });
      const d = await r.json();
      allBuckets = d.data || [];
    } catch(e) { allBuckets = []; }
  }

  async function renderBucketCards() {
    const grid = document.getElementById('crm-buckets-grid');
    if (!grid) return;

    if (!allBuckets.length) {
      grid.innerHTML = `<div class="crm-buckets-empty">No buckets yet. Create one to start grouping your contacts.</div>`;
      return;
    }

    // For each bucket, fetch first few member names if count > 0
    const cards = await Promise.all(allBuckets.map(async b => {
      let previewNames = '';
      if (b.count > 0) {
        try {
          const r = await fetch(`${API_BASE}/bucket/${b.bucket_id}/contacts`, { headers: hdrs() });
          const d = await r.json();
          const names = (d.data || []).slice(0, 3).map(c => c.full_name).filter(Boolean);
          previewNames = names.join(', ') + (b.count > 3 ? ` +${b.count - 3} more` : '');
        } catch(e) { /* silent */ }
      }
      const color = bucketColor(b);
      return `
        <div class="crm-bucket-card" onclick="crmOpenBucket('${esc(b.bucket_id)}')">
          <div class="crm-bucket-card-header">
            <span class="crm-bucket-dot" style="background:${color}"></span>
            <span class="crm-bucket-name">${esc(b.name||b.bucket_id)}</span>
            <span class="crm-bucket-count">${b.count}</span>
          </div>
          ${b.description ? `<div class="crm-bucket-desc">${esc(b.description)}</div>` : ''}
          <div class="crm-bucket-members">${previewNames || (b.count === 0 ? 'Empty' : '')}</div>
        </div>`;
    }));

    grid.innerHTML = cards.join('') + `<div class="crm-new-bucket-card" onclick="crmNewBucketModal()">+ New Bucket</div>`;
  }

  window.crmOpenBucket = async function (bucketId) {
    // Switch to browse, filter to bucket members
    crmSwitchView('browse');
    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading bucket…</div>`;
    const pag = document.getElementById('crm-pag'); if (pag) pag.style.display = 'none';
    try {
      const r = await fetch(`${API_BASE}/bucket/${bucketId}/contacts`, { headers: hdrs() });
      const d = await r.json();
      const bucket = allBuckets.find(b => b.bucket_id === bucketId);
      crmContacts = d.data || [];
      crmMode = 'bucket';
      renderGrid(crmContacts, false);
      // Show bucket name as badge
      showBadge(true, bucket ? `Bucket: ${bucket.name}` : 'Bucket view');
    } catch(e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Could not load bucket</h3><p>${e.message}</p></div>`;
    }
  };

  /* ─────────────────────────────────────────────────────────
     FOLLOW-UPS
  ───────────────────────────────────────────────────────── */
  let openFollowUps = [];

  async function loadFollowUps() {
    try {
      const r = await fetch(`${API_BASE}/follow-ups/open`, { headers: hdrs() });
      const d = await r.json();
      openFollowUps = d.data || [];
    } catch(e) { openFollowUps = []; }
  }

  function renderFollowUpStrip() {
    const el = document.getElementById('crm-fu-list');
    if (!el) return;
    if (!openFollowUps.length) {
      el.innerHTML = '<div class="crm-fu-empty">No open follow-ups. You\'re all caught up ✓</div>';
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    el.innerHTML = openFollowUps.slice(0, 10).map(f => {
      const date     = f.next_action_date || '';
      const overdue  = date && date < today;
      const dateLabel = date ? (overdue ? `Overdue · ${date}` : date) : '';
      return `
        <div class="crm-fu-row ${overdue ? 'crm-fu-overdue' : ''}" onclick="crmFollowUpClick('${esc(f.contact_id||'')}')">
          <span class="crm-fu-name">${esc(f.contact_name || f.contact_id || '—')}</span>
          <span class="crm-fu-action">${esc(f.next_action || f.notes || '')}</span>
          ${f.venture ? `<span class="crm-fu-venture">${esc(f.venture)}</span>` : ''}
          ${dateLabel ? `<span class="crm-fu-date ${overdue ? 'overdue' : ''}">${esc(dateLabel)}</span>` : ''}
        </div>`;
    }).join('');
    if (openFollowUps.length > 10) {
      el.innerHTML += `<div style="font-size:12px;color:var(--text3);padding:8px 0 0">${openFollowUps.length - 10} more — switch to Browse All to see contacts</div>`;
    }
  }

  window.crmFollowUpClick = async function (contactId) {
    if (!contactId) return;
    // Try to find in already-loaded contacts, else fetch
    let c = crmContacts.find(x => x.contact_id === contactId);
    if (!c) {
      try {
        const r = await fetch(`${API_BASE}/contact/${contactId}`, { headers: hdrs() });
        const d = await r.json();
        c = d.data;
      } catch(e) { return; }
    }
    if (c) openCrmDrawer(c);
  };

  /* ─────────────────────────────────────────────────────────
     BUCKET MODAL
  ───────────────────────────────────────────────────────── */
  window.crmNewBucketModal = function () {
    sv2('cbm-name', ''); sv2('cbm-desc', '');
    const hiddenColor = document.getElementById('cbm-color');
    if (hiddenColor) hiddenColor.value = BUCKET_COLORS[0];
    // Reset color swatches
    document.querySelectorAll('[data-color]').forEach(s => s.style.borderColor = 'transparent');
    const first = document.querySelector(`[data-color="${BUCKET_COLORS[0]}"]`);
    if (first) first.style.borderColor = '#333';
    const m = document.getElementById('crm-bucket-modal'); if (m) m.classList.add('open');
  };
  window.crmCloseBucketModal = function () {
    const m = document.getElementById('crm-bucket-modal'); if (m) m.classList.remove('open');
  };
  window.crmBucketPickColor = function (color) {
    const hiddenColor = document.getElementById('cbm-color');
    if (hiddenColor) hiddenColor.value = color;
    document.querySelectorAll('[data-color]').forEach(s => {
      s.style.borderColor = s.dataset.color === color ? '#333' : 'transparent';
    });
  };
  window.crmSaveBucket = async function () {
    const name = (gv('cbm-name')||'').trim();
    if (!name) { toast('Bucket name is required'); return; }
    const btn = document.getElementById('crm-bucket-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      await fetch(`${API_BASE}/bucket`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ name, description: gv('cbm-desc'), color: gv('cbm-color') })
      });
      window.crmCloseBucketModal();
      await loadBuckets();
      renderBucketCards();
      toast('Bucket created ✓');
    } catch(e) { toast('Failed to create bucket'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Create Bucket'; } }
  };

  /* ─────────────────────────────────────────────────────────
     HELP PANEL
  ───────────────────────────────────────────────────────── */
  function injectHelpPanel() {
    if (document.getElementById('help-panel')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button id="help-fab" onclick="helpToggle()" title="Help & Reference">?</button>
      <div id="help-panel">
        <div class="help-header">
          <span class="help-title">Help & Reference</span>
          <button class="help-close" onclick="helpClose()">×</button>
        </div>
        <div class="help-tabs">
          <button class="help-tab active" onclick="helpTab('contacts')">Contacts</button>
          <button class="help-tab" onclick="helpTab('initiatives')">Initiatives</button>
          <button class="help-tab" onclick="helpTab('input')">Input Channels</button>
        </div>
        <div class="help-body">
          <div class="help-panel-content active" id="help-contacts">
            <h4>Adding a contact</h4>
            <p>Use <strong>+ New Contact</strong> in the top bar, or let T018 auto-create contacts from meeting transcripts.</p>
            <p>Only add <strong>warm contacts</strong> here — people you've actually met or been introduced to. Cold outreach targets go in Apollo / Pipedrive only.</p>
            <h4>Field standards</h4>
            <table class="help-field-table">
              <tr><td>Full Name</td><td>Required. First + Last.</td></tr>
              <tr><td>Venture</td><td>Must match exactly: <em>ReRev Labs · Prismm · Black Tech Capital · Sekhmetic · DO GOOD X · NYC PIVOT · Personal</em></td></tr>
              <tr><td>Relationship Health</td><td>Strong → Good → Neutral → Dormant → Cold. Be honest.</td></tr>
              <tr><td>Activation Potential</td><td>How likely to act on an outreach now. High = reach out this week.</td></tr>
              <tr><td>Source</td><td>Where you met — event name, platform, referral name. T018 fills this from transcripts.</td></tr>
              <tr><td>How We Met</td><td>Narrative context — "panel intro", "warm intro via Bryan".</td></tr>
              <tr><td>What Building / Need / Offer</td><td>Powers semantic search. The more detail, the better the matches.</td></tr>
            </table>
            <h4>Buckets</h4>
            <p>Buckets are your custom groupings — "BTC Advisors", "Prismm Warm Leads", "Follow Up This Week". A contact can be in multiple buckets. Add/remove from the contact drawer.</p>
            <h4>Semantic search</h4>
            <p>Type a query and press <strong>Enter</strong> to run a semantic search across all contacts. Try "climate tech founder in NYC" or "someone who needs AI training".</p>
          </div>
          <div class="help-panel-content" id="help-initiatives">
            <h4>What is an initiative?</h4>
            <p>An initiative is any project, goal, or campaign you're running — e.g. "BTC Climate Exit Lab Q2", "Prismm Credit Union Pilot", "ReRev AI Workshop Series".</p>
            <h4>Sub-projects</h4>
            <p>Scoped workstreams under an initiative. Each can have its own status, owner, and dependencies. Examples: "Outreach to 10 advisors", "Build demo deck", "Set up data room".</p>
            <h4>Stakeholders</h4>
            <p>A stakeholder is a contact linked to a specific initiative with a role (Advisor, Interview Subject, Sponsor Prospect, etc.) and an action needed. Use the Initiatives page to manage these.</p>
            <h4>Status values</h4>
            <p>Brain Dump → Planning → Active → Paused → Complete</p>
            <h4>Priority values</h4>
            <p>Critical → High → Medium → Low → Parked</p>
          </div>
          <div class="help-panel-content" id="help-input">
            <h4>T018 — Post-Meeting Intelligence Engine</h4>
            <p>Drop a meeting transcript or Gemini notes doc into the <strong>Transcripts folder</strong> in Google Drive. T018 runs every 5 minutes and automatically:</p>
            <ul>
              <li>Extracts action items → Google Tasks (routed by venture)</li>
              <li>Creates or updates contact records → Railway</li>
              <li>Drafts follow-up emails → Gmail Drafts</li>
              <li>Writes follow-up records → Railway</li>
              <li>Sends a digest email to keyona@rerev.io</li>
            </ul>
            <h4>Direct API</h4>
            <p>All Railway endpoints accept <code>POST /contact</code> for upserting contacts and <code>POST /follow-up</code> for follow-ups. Use <code>X-API-Key</code> header for auth.</p>
            <h4>Manual entry</h4>
            <p>Use the <strong>+ New Contact</strong> button in the top bar. The contact is vectorized and stored to Railway immediately on save.</p>
            <h4>Google Contacts import</h4>
            <p>Use the <em>GoogleImport</em> tab in the Super Connector sheet as a staging area, then bulk-push via the GAS bridge or direct API bulk endpoint.</p>
          </div>
        </div>
      </div>`);
  }

  window.helpToggle = function () {
    const p = document.getElementById('help-panel');
    if (p) p.classList.toggle('open');
  };
  window.helpClose = function () {
    const p = document.getElementById('help-panel'); if (p) p.classList.remove('open');
  };
  window.helpTab = function (tab) {
    document.querySelectorAll('.help-tab').forEach((t, i) => {
      const tabs = ['contacts','initiatives','input'];
      t.classList.toggle('active', tabs[i] === tab);
    });
    ['contacts','initiatives','input'].forEach(t => {
      const el = document.getElementById('help-'+t);
      if (el) el.classList.toggle('active', t === tab);
    });
  };

  /* ─────────────────────────────────────────────────────────
     NAV / PAGE ROUTING
  ───────────────────────────────────────────────────────── */
  function goContacts() {
    document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; });
    const pg = document.getElementById('page-contacts'); if (pg) pg.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nc = document.getElementById('nav-contacts'); if (nc) nc.classList.add('active');
    const title = document.getElementById('page-title'); if (title) title.textContent = 'Contacts';
    const addBtn = document.getElementById('topbar-add-btn');
    if (addBtn) { addBtn.textContent = '+ New Contact'; addBtn.onclick = () => crmOpenModal(null); }
    // Refresh dashboard data each time we land on the page
    loadDashboard();
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

  function patchDrawer() {
    window.openContactDrawer  = openCrmDrawer;
    window.closeContactDrawer = window.crmCloseDrawer;
  }

  /* ─────────────────────────────────────────────────────────
     BROWSE — LOAD / RENDER / PAGINATE
  ───────────────────────────────────────────────────────── */
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
    if (!cx.length) {
      grid.innerHTML = `<div class="empty-state"><h3>${isSearch?'No matches':'No contacts'}</h3><p>${isSearch?'Try a different query.':'Use + New Contact to add one.'}</p></div>`;
      grid._contacts = []; return;
    }
    grid.innerHTML = cx.map((c,i) => {
      const hb = c.relationship_health ? `<span class="crm-hb ${hMap[c.relationship_health]||'crm-hb-neutral'}">${esc(c.relationship_health)}</span>` : '';
      const ab = c.activation_potential ? `<span class="crm-ab">${esc(c.activation_potential)}</span>` : '';
      const sb = c.source ? `<span class="crm-sb">${esc(c.source)}</span>` : '';
      const sc = (isSearch && c.score) ? `<span class="crm-score">${Math.round(c.score*100)}%</span>` : '';
      const role = [c.title_role, c.organization].filter(Boolean).join(' · ');
      return `<div class="crm-card" data-cidx="${i}" onclick="crmCardClick(this)"><div class="crm-card-name">${esc(c.full_name)}</div><div class="crm-card-role">${esc(role)}</div><div class="crm-card-footer">${hb}${ab}${sb}${sc}</div></div>`;
    }).join('');
    grid._contacts = cx;
  }

  window.crmCardClick = function (el) {
    if (el && el.stopPropagation) el.stopPropagation();
    const grid = document.getElementById('crm-grid'); if (!grid||!grid._contacts) return;
    const c = grid._contacts[parseInt(el.dataset.cidx, 10)]; if (!c) return;
    openCrmDrawer(c);
  };

  window.crmInput = function (v) {
    const cl = document.getElementById('crm-clear'); if (cl) cl.classList.toggle('vis', v.length>0);
    if (!v) { crmLoad(crmOffset); return; }
    if (v.length < 4) {
      const q = v.toLowerCase();
      renderGrid(crmContacts.filter(c => (c.full_name||'').toLowerCase().includes(q)||(c.organization||'').toLowerCase().includes(q)||(c.title_role||'').toLowerCase().includes(q)), false);
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
      const data = await resp.json(); renderGrid(data.results||[], true);
    } catch(e) { if(grid) grid.innerHTML=`<div class="empty-state"><h3>Search error</h3><p>${e.message}</p></div>`; }
  };

  window.crmReset = function () {
    const inp=document.getElementById('crm-q'); if(inp) inp.value='';
    const cl=document.getElementById('crm-clear'); if(cl) cl.classList.remove('vis');
    crmMode='browse'; showBadge(false); crmLoad(0);
  };
  window.crmFilter = function () { if (crmMode==='browse') crmLoad(0); };

  function updatePag(offset, total) {
    const p=document.getElementById('crm-pag'),info=document.getElementById('crm-pag-info'),prev=document.getElementById('crm-prev'),next=document.getElementById('crm-next');
    if(!p) return; p.style.display='flex';
    if(info) info.textContent=`${offset+1}–${Math.min(offset+crmContacts.length, total||999)}${total?' of '+total:''}`;
    if(prev) prev.disabled=offset===0; if(next) next.disabled=crmContacts.length<PAGE_SIZE;
  }
  window.crmPage = function(dir) { const n=crmOffset+dir*PAGE_SIZE; if(n<0) return; crmLoad(n); const g=document.getElementById('crm-grid'); if(g) g.scrollIntoView({behavior:'smooth',block:'start'}); };

  /* ─────────────────────────────────────────────────────────
     CONTACT MODAL (new / edit)
  ───────────────────────────────────────────────────────── */
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
        window.crmCloseModal(); window.crmCloseDrawer();
        if(isEdit) openCrmDrawer({...crmEditing,...payload});
        crmLoad(isEdit?crmOffset:0);
      } else { toast('Error saving contact'); }
    } catch(e){toast('Save failed: '+e.message);}
    finally{if(sb){sb.disabled=false;sb.textContent=isEdit?'Save Changes':'Save Contact';}}
  };

  /* ─────────────────────────────────────────────────────────
     ACTIVATION TABS
  ───────────────────────────────────────────────────────── */
  window.activTab = function (which) {
    ['queue','angles'].forEach(t => {
      const isActive = t === which;
      const tab   = document.getElementById('activ-tab-'+t);
      const panel = document.getElementById('activ-panel-'+t);
      if (tab)   tab.classList.toggle('active', isActive);
      if (panel) panel.classList.toggle('active', isActive);
    });
    if (which === 'angles' && window.loadAngles) window.loadAngles();
  };

  /* ─────────────────────────────────────────────────────────
     UTILS
  ───────────────────────────────────────────────────────── */
  function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function gv(id){const e=document.getElementById(id);return e?e.value:'';}
  function sv(id,t){const e=document.getElementById(id);if(e)e.textContent=t;}
  function sv2(id,v){const e=document.getElementById(id);if(e)e.value=v;}
  function showBadge(on,label){const b=document.getElementById('crm-badge');if(b){b.classList.toggle('vis',on);if(label)b.textContent=label;else if(!on)b.textContent='⊹ Semantic results';}}
  function toast(msg){if(window.showToast)window.showToast(msg);else console.log('[CRM]',msg);}

  /* ─────────────────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────────────────── */
  let attempts=0;
  (function tryInit(){
    if(window.showPage||attempts>30){injectDOM();patchShowPage();patchDrawer();}
    else{attempts++;setTimeout(tryInit,100);}
  })();
})();
