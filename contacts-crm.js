/**
 * Contacts CRM + Activation Hub — Super Connector App v20260407c
 * 2026-04-07 change: removed grid/list display toggle buttons from browse and bucket views
 */
(function () {
  const API_BASE = 'https://super-connector-api-production.up.railway.app';
  const _KEY     = 'sc_live_k3y_2026_scak';

  const hdrs = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': _KEY,
  });

  const PAGE_SIZE = 50;
  let crmContacts  = [];
  let crmOffset    = 0;
  let crmMode      = 'browse';
  let crmEditing   = null;
  let crmView      = 'dashboard';
  let allBuckets   = [];
  let crmDisplayMode = 'list';
  let _currentBucketId = null;

  const css = document.createElement('style');
  css.textContent = `
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
    .crm-view-tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;width:fit-content;margin-bottom:24px}
    .crm-view-tab{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);transition:background .12s,color .12s}
    .crm-view-tab.active{background:var(--accent);color:#fff}
    .crm-view-tab:not(.active):hover{background:var(--surface2);color:var(--text)}
    .crm-dashboard-panel{display:none}
    .crm-dashboard-panel.active{display:block}
    .crm-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .crm-section-title{font-family:var(--font-serif);font-size:17px;font-weight:400;color:var(--text)}
    .crm-section-action{font-size:12px;color:var(--accent);cursor:pointer;background:none;border:none;font-family:var(--font-sans);padding:0}
    .crm-section-action:hover{text-decoration:underline}
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
    .crm-em{display:inline-flex;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;background:#EDF7ED;color:#2d7a3a;border:1px solid #c3e6cb}
    .crm-pag{display:flex;align-items:center;justify-content:space-between;margin-top:24px;padding-top:20px;border-top:1px solid var(--border-soft)}
    .crm-pag-info{font-size:12px;color:var(--text3)}
    .crm-pag-btns{display:flex;gap:8px}
    .activ-tabs{display:flex;gap:4px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:4px;width:fit-content}
    .activ-tab{padding:7px 18px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font-sans);transition:background .12s,color .12s}
    .activ-tab.active{background:var(--accent);color:#fff}
    .activ-tab:not(.active):hover{background:var(--surface2);color:var(--text)}
    .activ-panel{display:none}
    .activ-panel.active{display:block}
    #crm-drawer{position:fixed;top:0;right:0;height:100%;width:440px;max-width:95vw;background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow-lg);z-index:1000;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);overflow-y:auto;display:flex !important;flex-direction:column}
    #crm-drawer.open{transform:translateX(0)}
    .crm-drawer-header{display:flex;align-items:flex-start;justify-content:space-between;padding:24px 24px 0;gap:12px}
    .crm-drawer-name{font-family:var(--font-serif);font-size:22px;font-weight:400;color:var(--text);line-height:1.2;flex:1}
    .crm-drawer-close{background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;padding:0;line-height:1;flex-shrink:0}
    .crm-drawer-close:hover{color:var(--text)}
    .crm-drawer-meta{padding:6px 24px 12px;font-size:13px;color:var(--text2)}
    .crm-drawer-badges{padding:0 24px 16px}
    .crm-drawer-body{padding:0 24px 8px;flex:1}
    .crm-drawer-section{margin-bottom:20px}
    .crm-drawer-section-label{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin-bottom:6px}
    .crm-drawer-section-value{font-size:13px;color:var(--text);line-height:1.6}
    .crm-drawer-section-value.empty{color:var(--text3);font-style:italic}
    .crm-drawer-actions{display:flex;gap:8px;padding:16px 24px 24px;border-top:1px solid var(--border-soft)}
    #crm-drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:999}
    #crm-drawer-overlay.open{display:block}
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
    .crm-bucket-detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:8px}
    .crm-bucket-detail-title{display:flex;align-items:center;gap:10px;margin-bottom:4px}
    .crm-bucket-detail-name{font-family:var(--font-serif);font-size:22px;font-weight:400;color:var(--text)}
    .crm-bucket-detail-count{font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:var(--accent-dim);color:var(--accent)}
    .crm-bucket-detail-desc{font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6}
    .crm-bucket-detail-actions{display:flex;gap:8px;flex-shrink:0;padding-top:4px}
    .crm-bucket-edit-form{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px;display:none}
    .crm-bucket-edit-form.open{display:block}
    .crm-bucket-edit-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .crm-breadcrumb{font-size:12px;color:var(--accent);cursor:pointer;background:none;border:none;font-family:var(--font-sans);padding:0;margin-bottom:16px;display:inline-flex;align-items:center;gap:4px}
    .crm-breadcrumb:hover{text-decoration:underline}
  `;
  document.head.appendChild(css);

  const BUCKET_COLORS = ['#6B7FF0','#F06B9D','#F0A06B','#6BC47F','#A06BF0','#6BC4C4','#F0D06B'];
  function bucketColor(b) { return (b && b.color) ? b.color : BUCKET_COLORS[(b && b.bucket_id ? b.bucket_id.charCodeAt(4) : 0) % BUCKET_COLORS.length]; }
  const hMap = {Strong:'crm-hb-strong',Good:'crm-hb-good',Neutral:'crm-hb-neutral',Dormant:'crm-hb-dormant',Cold:'crm-hb-cold'};

  function hasEmail(c) {
    const rx = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
    return rx.test(c.notes||'') || rx.test(c.how_we_met||'') || rx.test(c.what_offer||'');
  }

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
          <button class="btn btn-primary btn-sm" onclick="if(window._crmDrawerContact)crmOpenModal(window._crmDrawerContact)" style="flex:1">✎ Edit All Fields</button>
        </div>
      </div>`);
  }

  function openCrmDrawer(c) {
    if (!c) return;
    window._crmDrawerContact = c;
    const oldDrawer = document.getElementById('contact-drawer');
    if (oldDrawer) oldDrawer.style.setProperty('display', 'none', 'important');
    sv('crm-drawer-name', c.full_name || '—');
    sv('crm-drawer-meta', [c.title_role, c.organization].filter(Boolean).join(' · '));
    const bd = document.getElementById('crm-drawer-badges');
    if (bd) bd.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%">
        <div style="display:flex;flex-direction:column;gap:3px">
          <label style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3)">Health</label>
          <select id="crm-quick-health" onchange="crmQuickSave('relationship_health',this.value)"
            style="font-size:12px;font-weight:600;padding:4px 8px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-family:var(--font-sans);cursor:pointer;outline:none">
            <option value="">— unknown —</option>
            <option>Strong</option><option>Good</option><option>Neutral</option><option>Dormant</option><option>Cold</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px">
          <label style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3)">Activation</label>
          <select id="crm-quick-activation" onchange="crmQuickSave('activation_potential',this.value)"
            style="font-size:12px;font-weight:500;padding:4px 8px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-family:var(--font-sans);cursor:pointer;outline:none">
            <option value="">— unknown —</option>
            <option>High</option><option>Medium</option><option>Low</option><option>None</option>
          </select>
        </div>
        ${c.venture ? `<span class="crm-sb" style="align-self:flex-end;margin-bottom:2px">${esc(c.venture)}</span>` : ''}
        ${c.source ? `<span class="crm-sb" style="align-self:flex-end;margin-bottom:2px">${esc(c.source)}</span>` : ''}
        ${hasEmail(c) ? `<span class="crm-em" style="align-self:flex-end;margin-bottom:2px" title="Email on file">✉ email</span>` : ''}
      </div>`;
    const qh = document.getElementById('crm-quick-health');
    const qa = document.getElementById('crm-quick-activation');
    if (qh) qh.value = c.relationship_health || '';
    if (qa) qa.value = c.activation_potential || '';
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

  async function renderDrawerBuckets(contactId) {
    const tagsEl = document.getElementById('crm-drawer-bucket-tags');
    const selEl  = document.getElementById('crm-drawer-bucket-select');
    if (!tagsEl || !selEl) return;
    let memberOf = [];
    try {
      const r = await fetch(`${API_BASE}/contact/${contactId}/buckets`, { headers: hdrs() });
      const d = await r.json();
      memberOf = d.data || [];
    } catch(e) { }
    tagsEl.innerHTML = memberOf.length
      ? memberOf.map(b => `
          <span class="crm-drawer-bucket-tag" data-bucket-id="${esc(b.bucket_id)}">
            <span class="crm-drawer-bucket-tag-dot" style="background:${bucketColor(b)}"></span>
            ${esc(b.name||b.bucket_id)}
            <button class="crm-drawer-bucket-tag-remove" onclick="crmDrawerRemoveBucket('${esc(b.bucket_id)}')" title="Remove">×</button>
          </span>`).join('')
      : '<span style="font-size:11px;color:var(--text3);font-style:italic">Not in any bucket yet</span>';
    const memberIds = new Set(memberOf.map(b => b.bucket_id));
    const available = allBuckets.filter(b => !memberIds.has(b.bucket_id));
    selEl.innerHTML = '<option value="">Add to bucket…</option>' +
      available.map(b => `<option value="${esc(b.bucket_id)}">${esc(b.name||b.bucket_id)}</option>`).join('');
  }

  window.crmDrawerAddBucket = async function () {
    const c = window._crmDrawerContact; if (!c) return;
    const sel = document.getElementById('crm-drawer-bucket-select');
    const bucketId = sel && sel.value; if (!bucketId) return;
    try {
      await fetch(`${API_BASE}/bucket/${bucketId}/members`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ contact_id: c.contact_id }) });
      await loadBuckets(); renderDrawerBuckets(c.contact_id); renderBucketCards();
    } catch(e) { toast('Failed to add to bucket'); }
  };

  window.crmDrawerRemoveBucket = async function (bucketId) {
    const c = window._crmDrawerContact; if (!c) return;
    try {
      await fetch(`${API_BASE}/bucket/${bucketId}/members/${c.contact_id}`, { method: 'DELETE', headers: hdrs() });
      await loadBuckets(); renderDrawerBuckets(c.contact_id); renderBucketCards();
      if (crmView === 'bucket' && _currentBucketId === bucketId) {
        const r2 = await fetch(`${API_BASE}/bucket/${bucketId}/contacts`, { headers: hdrs() });
        const d2 = await r2.json();
        const contacts = d2.data || [];
        document.getElementById('crm-bucket-detail-count').textContent = contacts.length;
        renderBucketGrid(contacts);
      }
    } catch(e) { toast('Failed to remove from bucket'); }
  };

  window.crmDrawerCreateBucket = async function () {
    const inp = document.getElementById('crm-drawer-new-bucket-name');
    const name = inp && inp.value.trim(); if (!name) return;
    try {
      await fetch(`${API_BASE}/bucket`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ name }) });
      if (inp) inp.value = '';
      await loadBuckets(); renderDrawerBuckets(window._crmDrawerContact && window._crmDrawerContact.contact_id); renderBucketCards();
      toast('Bucket created ✓');
    } catch(e) { toast('Failed to create bucket'); }
  };

  function injectDOM() {
    injectDrawer();
    injectHelpPanel();

    const navSearch = document.getElementById('nav-search');
    if (navSearch && !document.getElementById('nav-contacts')) {
      const btn = document.createElement('button');
      btn.className = 'nav-item'; btn.id = 'nav-contacts';
      btn.innerHTML = '<span class="icon">⊞</span> Contacts';
      btn.onclick = () => goContacts();
      navSearch.parentNode.insertBefore(btn, navSearch);
      navSearch.style.display = 'none';
    }

    if (!document.getElementById('page-contacts')) {
      const ref = document.getElementById('page-search');
      if (ref) {
        const div = document.createElement('div');
        div.className = 'page'; div.id = 'page-contacts'; div.style.display = 'none';
        div.innerHTML = `
          <div class="crm-view-tabs">
            <button class="crm-view-tab active" id="crm-tab-dashboard" onclick="crmSwitchView('dashboard')">Overview</button>
            <button class="crm-view-tab" id="crm-tab-browse" onclick="crmSwitchView('browse')">Browse All</button>
          </div>
          <div class="crm-dashboard-panel active" id="crm-panel-dashboard">
            <div class="crm-section-head">
              <span class="crm-section-title">Buckets</span>
              <button class="crm-section-action" onclick="crmNewBucketModal()">+ New Bucket</button>
            </div>
            <div class="crm-buckets-grid" id="crm-buckets-grid">
              <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading buckets…</div>
            </div>
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
          <div class="crm-dashboard-panel" id="crm-panel-bucket">
            <button class="crm-breadcrumb" onclick="crmSwitchView('dashboard')">← Buckets</button>
            <div class="crm-bucket-detail-header">
              <div>
                <div class="crm-bucket-detail-title">
                  <span id="crm-bucket-dot" style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:var(--accent)"></span>
                  <span class="crm-bucket-detail-name" id="crm-bucket-detail-name">—</span>
                  <span class="crm-bucket-detail-count" id="crm-bucket-detail-count">0</span>
                </div>
                <div class="crm-bucket-detail-desc" id="crm-bucket-detail-desc"></div>
              </div>
              <div class="crm-bucket-detail-actions">
                <button class="btn btn-ghost btn-sm" onclick="crmToggleBucketEdit()">✎ Edit</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--critical)" onclick="crmDeleteBucketCurrent()">Delete</button>
              </div>
            </div>
            <div class="crm-bucket-edit-form" id="crm-bucket-edit-form">
              <div class="crm-bucket-edit-row">
                <div class="field-group"><label style="font-size:11px">Name</label><input id="cbe-name" type="text" style="font-size:13px"></div>
                <div class="field-group"><label style="font-size:11px">Description</label><input id="cbe-desc" type="text" style="font-size:13px"></div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px" id="cbe-colors"></div>
              <input type="hidden" id="cbe-color">
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" onclick="crmSaveBucketEdit()">Save</button>
                <button class="btn btn-ghost btn-sm" onclick="crmToggleBucketEdit()">Cancel</button>
              </div>
            </div>
            <div class="crm-grid" id="crm-bucket-grid">
              <div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading…</div>
            </div>
          </div>
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
                <option>Strong</option><option>Good</option><option>Neutral</option><option>Dormant</option><option>Cold</option>
              </select>
              <select class="filter-select" id="crm-fa" onchange="crmFilter()">
                <option value="">All Activation</option>
                <option>High</option><option>Medium</option><option>Low</option><option>None</option>
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

    const navAngles = document.getElementById('nav-angles');
    if (navAngles) navAngles.style.display = 'none';
    const pageQueue = document.getElementById('page-queue');
    const pageAngles = document.getElementById('page-angles');
    if (pageQueue && !document.getElementById('activ-tab-bar')) {
      const tabBar = document.createElement('div');
      tabBar.className = 'activ-tabs'; tabBar.id = 'activ-tab-bar';
      tabBar.innerHTML = `
        <button class="activ-tab active" id="activ-tab-queue" onclick="activTab('queue')">Activation Queue</button>
        <button class="activ-tab" id="activ-tab-angles" onclick="activTab('angles')">Activation Angles</button>`;
      const queuePanel = document.createElement('div');
      queuePanel.className = 'activ-panel active'; queuePanel.id = 'activ-panel-queue';
      const queueInner = document.getElementById('queue-list');
      if (queueInner) { queueInner.parentNode.insertBefore(queuePanel, queueInner); queuePanel.appendChild(queueInner); }
      const anglesPanel = document.createElement('div');
      anglesPanel.className = 'activ-panel'; anglesPanel.id = 'activ-panel-angles';
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

  // ── VIEW SWITCHING ───────────────────────────────────────────────────────────
  window.crmSwitchView = function (view) {
    crmView = view;
    ['dashboard','browse','bucket'].forEach(v => {
      const tab = document.getElementById('crm-tab-'+v);
      const panel = document.getElementById('crm-panel-'+v);
      const active = v === view;
      if (tab) tab.classList.toggle('active', active);
      if (panel) panel.classList.toggle('active', active);
    });
    if (view === 'browse' && crmContacts.length === 0) crmLoad(0);
    if (view === 'dashboard') loadDashboard();
  };

  async function loadDashboard() {
    await Promise.all([loadBuckets(), loadFollowUps()]);
    renderBucketCards();
    renderFollowUpStrip();
  }

  async function loadBuckets() {
    try {
      const r = await fetch(`${API_BASE}/buckets`, { headers: hdrs() });
      const d = await r.json();
      allBuckets = d.data || [];
    } catch(e) { allBuckets = []; }
  }

  async function renderBucketCards() {
    const grid = document.getElementById('crm-buckets-grid'); if (!grid) return;
    if (!allBuckets.length) {
      grid.innerHTML = `<div class="crm-buckets-empty">No buckets yet. Create one to start grouping your contacts.</div>`;
      return;
    }
    const cards = await Promise.all(allBuckets.map(async b => {
      let previewNames = '';
      if (b.count > 0) {
        try {
          const r = await fetch(`${API_BASE}/bucket/${b.bucket_id}/contacts`, { headers: hdrs() });
          const d = await r.json();
          const names = (d.data || []).slice(0, 3).map(c => c.full_name).filter(Boolean);
          previewNames = names.join(', ') + (b.count > 3 ? ` +${b.count - 3} more` : '');
        } catch(e) { }
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

  // ── BUCKET DETAIL PAGE ───────────────────────────────────────────────────────
  window.crmOpenBucket = async function (bucketId) {
    _currentBucketId = bucketId;
    const bucket = allBuckets.find(b => b.bucket_id === bucketId) || {};
    const color = bucketColor(bucket);

    sv('crm-bucket-detail-name', bucket.name || bucketId);
    const descEl = document.getElementById('crm-bucket-detail-desc');
    if (descEl) descEl.textContent = bucket.description || '';
    const dotEl = document.getElementById('crm-bucket-dot');
    if (dotEl) dotEl.style.background = color;

    sv2('cbe-name', bucket.name || '');
    sv2('cbe-desc', bucket.description || '');
    const cbeColor = document.getElementById('cbe-color');
    if (cbeColor) cbeColor.value = color;
    const cbeColors = document.getElementById('cbe-colors');
    if (cbeColors) {
      cbeColors.innerHTML = BUCKET_COLORS.map(c =>
        `<span onclick="crmBucketPickEditColor('${c}')" data-ecolor="${c}" style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c===color?'#333':'transparent'};transition:border-color .12s"></span>`
      ).join('');
    }
    const ef = document.getElementById('crm-bucket-edit-form');
    if (ef) ef.classList.remove('open');

    crmSwitchView('bucket');

    const grid = document.getElementById('crm-bucket-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading…</div>`;
    try {
      const r = await fetch(`${API_BASE}/bucket/${bucketId}/contacts`, { headers: hdrs() });
      const d = await r.json();
      const contacts = d.data || [];
      const countEl = document.getElementById('crm-bucket-detail-count');
      if (countEl) countEl.textContent = contacts.length;
      renderBucketGrid(contacts);
    } catch(e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Could not load bucket</h3><p>${e.message}</p></div>`;
    }
  };

  function renderBucketGrid(contacts) {
    const grid = document.getElementById('crm-bucket-grid');
    if (!grid) return;
    if (!contacts.length) {
      grid.innerHTML = `<div class="empty-state"><h3>Empty bucket</h3><p>Add contacts from their drawer.</p></div>`;
      grid._contacts = []; return;
    }
    renderList(contacts, false, grid);
  }

  window.crmBucketCardClick = function (el) {
    const grid = document.getElementById('crm-bucket-grid'); if (!grid||!grid._contacts) return;
    const c = grid._contacts[parseInt(el.dataset.cidx, 10)]; if (!c) return;
    openCrmDrawer(c);
  };

  window.crmToggleBucketEdit = function () {
    const ef = document.getElementById('crm-bucket-edit-form');
    if (ef) ef.classList.toggle('open');
  };

  window.crmBucketPickEditColor = function (color) {
    const cbeColor = document.getElementById('cbe-color');
    if (cbeColor) cbeColor.value = color;
    document.querySelectorAll('[data-ecolor]').forEach(s => {
      s.style.borderColor = s.dataset.ecolor === color ? '#333' : 'transparent';
    });
  };

  window.crmSaveBucketEdit = async function () {
    if (!_currentBucketId) return;
    const name = (gv('cbe-name')||'').trim();
    if (!name) { toast('Name is required'); return; }
    const desc = gv('cbe-desc');
    const color = gv('cbe-color') || BUCKET_COLORS[0];
    try {
      await fetch(`${API_BASE}/bucket/${_currentBucketId}`, {
        method: 'PUT', headers: hdrs(),
        body: JSON.stringify({ name, description: desc, color })
      });
      toast('Bucket updated ✓');
      await loadBuckets();
      sv('crm-bucket-detail-name', name);
      const descEl = document.getElementById('crm-bucket-detail-desc');
      if (descEl) descEl.textContent = desc || '';
      const dotEl = document.getElementById('crm-bucket-dot');
      if (dotEl) dotEl.style.background = color;
      const ef = document.getElementById('crm-bucket-edit-form');
      if (ef) ef.classList.remove('open');
    } catch(e) { toast('Failed to save: ' + e.message); }
  };

  window.crmDeleteBucketCurrent = async function () {
    if (!_currentBucketId) return;
    const bucket = allBuckets.find(b => b.bucket_id === _currentBucketId);
    const name = bucket ? bucket.name : 'this bucket';
    if (!confirm(`Delete "${name}"? This removes the bucket and all membership links. Contacts are not deleted.`)) return;
    try {
      await fetch(`${API_BASE}/bucket/${_currentBucketId}`, { method: 'DELETE', headers: hdrs() });
      _currentBucketId = null;
      await loadBuckets();
      crmSwitchView('dashboard');
      toast('Bucket deleted');
    } catch(e) { toast('Failed to delete: ' + e.message); }
  };

  let openFollowUps = [];
  async function loadFollowUps() {
    try {
      const r = await fetch(`${API_BASE}/follow-ups/open`, { headers: hdrs() });
      const d = await r.json();
      openFollowUps = d.data || [];
    } catch(e) { openFollowUps = []; }
  }

  function renderFollowUpStrip() {
    const el = document.getElementById('crm-fu-list'); if (!el) return;
    if (!openFollowUps.length) {
      el.innerHTML = '<div class="crm-fu-empty">No open follow-ups. You\'re all caught up ✓</div>';
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    el.innerHTML = openFollowUps.slice(0, 10).map(f => {
      const date = f.next_action_date || '';
      const overdue = date && date < today;
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
      el.innerHTML += `<div style="font-size:12px;color:var(--text3);padding:8px 0 0">${openFollowUps.length - 10} more — switch to Browse All</div>`;
    }
  }

  window.crmFollowUpClick = async function (contactId) {
    if (!contactId) return;
    let c = crmContacts.find(x => x.contact_id === contactId);
    if (!c) {
      try {
        const r = await fetch(`${API_BASE}/contact/${contactId}`, { headers: hdrs() });
        const d = await r.json(); c = d.data;
      } catch(e) { return; }
    }
    if (c) openCrmDrawer(c);
  };

  window.crmNewBucketModal = function () {
    sv2('cbm-name', ''); sv2('cbm-desc', '');
    const hiddenColor = document.getElementById('cbm-color');
    if (hiddenColor) hiddenColor.value = BUCKET_COLORS[0];
    document.querySelectorAll('[data-color]').forEach(s => s.style.borderColor = 'transparent');
    const first = document.querySelector(`[data-color="${BUCKET_COLORS[0]}"]`);
    if (first) first.style.borderColor = '#333';
    const m = document.getElementById('crm-bucket-modal'); if (m) m.classList.add('open');
  };
  window.crmCloseBucketModal = function () { const m = document.getElementById('crm-bucket-modal'); if (m) m.classList.remove('open'); };
  window.crmBucketPickColor = function (color) {
    const hiddenColor = document.getElementById('cbm-color');
    if (hiddenColor) hiddenColor.value = color;
    document.querySelectorAll('[data-color]').forEach(s => { s.style.borderColor = s.dataset.color === color ? '#333' : 'transparent'; });
  };
  window.crmSaveBucket = async function () {
    const name = (gv('cbm-name')||'').trim();
    if (!name) { toast('Bucket name is required'); return; }
    const btn = document.getElementById('crm-bucket-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      await fetch(`${API_BASE}/bucket`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ name, description: gv('cbm-desc'), color: gv('cbm-color') }) });
      window.crmCloseBucketModal(); await loadBuckets(); renderBucketCards(); toast('Bucket created ✓');
    } catch(e) { toast('Failed to create bucket'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Create Bucket'; } }
  };

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
          <button class="help-tab" onclick="helpTab('search')">Search Tips</button>
        </div>
        <div class="help-body">
          <div class="help-panel-content active" id="help-contacts">
            <h4>Contact Fields</h4>
            <table class="help-field-table">
              <tr><td>Full Name</td><td>Required. Used in all matching and search.</td></tr>
              <tr><td>Title / Role</td><td>Job title or role. Informs contact type classification.</td></tr>
              <tr><td>Organization</td><td>Company or institution. Links to org profile when enriched.</td></tr>
              <tr><td>How We Met</td><td>Context on the connection origin.</td></tr>
              <tr><td>What I Can Offer</td><td>Enriched field: what Keyona can bring to this person.</td></tr>
              <tr><td>What They Offer Me</td><td>Enriched field: what this person brings to the network.</td></tr>
              <tr><td>Relationship Health</td><td>Strong / Good / Neutral / Dormant / Cold</td></tr>
              <tr><td>Activation Potential</td><td>High / Medium / Low / None</td></tr>
              <tr><td>Outreach Candidacy</td><td>Tracks whether contact is a candidate for outreach.</td></tr>
              <tr><td>Venture</td><td>Which of Keyona's ventures this contact is relevant to.</td></tr>
            </table>
            <h4>Buckets</h4>
            <p>Buckets are flexible groups for organizing contacts by campaign, cohort, or outreach intent. A contact can be in multiple buckets.</p>
          </div>
          <div class="help-panel-content" id="help-initiatives">
            <h4>Initiatives</h4>
            <p>Initiatives are active projects or goals. Contacts can be linked to initiatives as stakeholders with a role and action needed.</p>
            <h4>Stakeholder Roles</h4>
            <p>Warm Path · Interview Subject · Advisor · Sponsor Prospect · Customer · Collaborator · Perspective Only</p>
          </div>
          <div class="help-panel-content" id="help-search">
            <h4>Search Tips</h4>
            <p>Type a name to filter locally. Press Enter to run a semantic search — this finds contacts by meaning, not just keyword.</p>
            <p>Examples: "climate tech founders who have exited" or "accelerator operators in the midwest"</p>
          </div>
        </div>
      </div>`);
  }

  window.helpToggle = function () { document.getElementById('help-panel').classList.toggle('open'); };
  window.helpClose  = function () { document.getElementById('help-panel').classList.remove('open'); };
  window.helpTab    = function (tab) {
    document.querySelectorAll('.help-tab').forEach((t,i) => t.classList.toggle('active', ['contacts','initiatives','search'][i]===tab));
    ['contacts','initiatives','search'].forEach(t => {
      const el = document.getElementById('help-'+t); if (el) el.classList.toggle('active', t===tab);
    });
  };

  // ── CONTACTS LOAD / RENDER ───────────────────────────────────────────────────
  window.crmLoad = async function (offset = 0) {
    crmOffset = offset; crmMode = 'browse';
    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading contacts…</div>`;
    try {
      const r = await fetch(`${API_BASE}/contacts?limit=${PAGE_SIZE}&offset=${offset}`, { headers: hdrs() });
      const d = await r.json();
      crmContacts = d.data || [];
      renderGrid(crmContacts);
      renderPag(d.count || 0, offset);
    } catch(e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Could not load contacts</h3><p>${e.message}</p></div>`;
    }
  };

  function renderGrid(contacts) {
    const grid = document.getElementById('crm-grid');
    if (!grid) return;
    if (!contacts.length) {
      grid.innerHTML = `<div class="empty-state"><h3>No contacts found</h3><p>Try a different search or filter.</p></div>`;
      grid._contacts = []; return;
    }
    renderList(contacts, true, grid);
  }

  window.crmSetDisplay = function (mode) {
    crmDisplayMode = mode;
    if (crmView === 'browse') renderGrid(crmContacts);
    if (crmView === 'bucket') {
      fetch(`${API_BASE}/bucket/${_currentBucketId}/contacts`, { headers: hdrs() })
        .then(r => r.json()).then(d => renderBucketGrid(d.data || [])).catch(() => {});
    }
  };

  function renderList(contacts, isPrimary, targetGrid) {
    const grid = targetGrid || document.getElementById('crm-grid');
    if (!grid) return;
    grid.style.display = 'block';
    grid.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:0 12px 10px 0">Name</th>
            <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:0 12px 10px 0">Role / Org</th>
            <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:0 12px 10px 0">Health</th>
            <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:0 0 10px 0">Activation</th>
            <th style="width:24px"></th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map((c, i) => {
            const hb = c.relationship_health ? `<span class="crm-hb ${hMap[c.relationship_health]||'crm-hb-neutral'}">${esc(c.relationship_health)}</span>` : '<span style="color:var(--text3);font-size:12px">—</span>';
            const ab = c.activation_potential ? `<span class="crm-ab">${esc(c.activation_potential)}</span>` : '<span style="color:var(--text3);font-size:12px">—</span>';
            const role = [c.title_role, c.organization].filter(Boolean).join(' · ');
            const em = hasEmail(c) ? `<span class="crm-em" title="Email on file" style="font-size:10px">✉</span>` : '';
            return `<tr data-cidx="${i}" onclick="crmCardClick(this)" style="border-bottom:0.5px solid var(--border-soft);cursor:pointer;transition:background .1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
              <td style="padding:11px 12px 11px 0;font-size:13px;font-weight:500;color:var(--text)">${esc(c.full_name)}</td>
              <td style="padding:11px 12px 11px 0;font-size:12px;color:var(--text2);max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(role)}</td>
              <td style="padding:11px 12px 11px 0">${hb}</td>
              <td style="padding:11px 0 11px 0">${ab}</td>
              <td style="padding:11px 0;text-align:right">${em}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    grid._contacts = contacts;
  }

  function renderPag(total, offset) {
    const pag = document.getElementById('crm-pag'); if (!pag) return;
    const hasPrev = offset > 0;
    const hasNext = offset + PAGE_SIZE < total;
    pag.style.display = total > PAGE_SIZE ? 'flex' : 'none';
    sv('crm-pag-info', `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`);
    const prev = document.getElementById('crm-prev');
    const next = document.getElementById('crm-next');
    if (prev) prev.disabled = !hasPrev;
    if (next) next.disabled = !hasNext;
  }

  window.crmPage = function (dir) { crmLoad(crmOffset + dir * PAGE_SIZE); };

  window.crmCardClick = function (el) {
    const grid = document.getElementById('crm-grid'); if (!grid||!grid._contacts) return;
    const c = grid._contacts[parseInt(el.dataset.cidx, 10)]; if (!c) return;
    openCrmDrawer(c);
  };

  // ── FILTER / SEARCH ──────────────────────────────────────────────────────────
  let _filterTimer = null;
  window.crmInput = function (val) {
    const clearBtn = document.getElementById('crm-clear');
    if (clearBtn) clearBtn.classList.toggle('vis', val.length > 0);
    clearTimeout(_filterTimer);
    _filterTimer = setTimeout(() => crmFilter(), 220);
  };

  window.crmFilter = function () {
    const q  = (gv('crm-q')||'').toLowerCase();
    const fv = gv('crm-fv')||'';
    const fh = gv('crm-fh')||'';
    const fa = gv('crm-fa')||'';
    const badge = document.getElementById('crm-badge');
    if (badge) badge.classList.remove('vis');
    const filtered = crmContacts.filter(c => {
      const text = [c.full_name,c.title_role,c.organization,c.notes,c.how_we_met].join(' ').toLowerCase();
      return (!q || text.includes(q))
        && (!fv || c.venture === fv)
        && (!fh || c.relationship_health === fh)
        && (!fa || c.activation_potential === fa);
    });
    renderGrid(filtered);
    renderPag(filtered.length, 0);
  };

  window.crmSearch = async function (q) {
    if (!q || !q.trim()) { crmFilter(); return; }
    const grid = document.getElementById('crm-grid');
    if (grid) grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Searching…</div>`;
    try {
      const r = await fetch(`${API_BASE}/search`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ query: q, top_k: 20 }) });
      const d = await r.json();
      const results = d.results || [];
      const badge = document.getElementById('crm-badge');
      if (badge) badge.classList.toggle('vis', results.length > 0);
      renderGrid(results);
      renderPag(results.length, 0);
    } catch(e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Search failed</h3><p>${e.message}</p></div>`;
    }
  };

  window.crmReset = function () {
    sv2('crm-q',''); sv2('crm-fv',''); sv2('crm-fh',''); sv2('crm-fa','');
    const clearBtn = document.getElementById('crm-clear'); if (clearBtn) clearBtn.classList.remove('vis');
    const badge = document.getElementById('crm-badge'); if (badge) badge.classList.remove('vis');
    crmLoad(0);
  };

  // ── QUICK SAVE ───────────────────────────────────────────────────────────────
  window.crmQuickSave = async function (field, value) {
    const c = window._crmDrawerContact; if (!c) return;
    c[field] = value;
    try {
      await fetch(`${API_BASE}/contact/${c.contact_id}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(c) });
      toast(`${field === 'relationship_health' ? 'Health' : 'Activation'} updated ✓`);
      const idx = crmContacts.findIndex(x => x.contact_id === c.contact_id);
      if (idx >= 0) crmContacts[idx] = { ...crmContacts[idx], [field]: value };
      renderGrid(crmContacts);
    } catch(e) { toast('Save failed'); }
  };

  // ── CONTACT MODAL ────────────────────────────────────────────────────────────
  window.crmOpenModal = function (contact) {
    crmEditing = contact || null;
    const title = document.getElementById('crm-modal-title');
    if (title) title.textContent = contact ? 'Edit Contact' : 'New Contact';
    sv2('cm-name',  contact?.full_name || '');
    sv2('cm-role',  contact?.title_role || '');
    sv2('cm-org',   contact?.organization || '');
    sv2('cm-src',   contact?.source || '');
    sv2('cm-hwm',   contact?.how_we_met || '');
    sv2('cm-bld',   contact?.what_building || '');
    sv2('cm-need',  contact?.what_need || '');
    sv2('cm-offer', contact?.what_offer || '');
    sv2('cm-notes', contact?.notes || '');
    const venSel  = document.getElementById('cm-ven');  if (venSel)  venSel.value  = contact?.venture || '';
    const hlthSel = document.getElementById('cm-hlth'); if (hlthSel) hlthSel.value = contact?.relationship_health || '';
    const actSel  = document.getElementById('cm-act');  if (actSel)  actSel.value  = contact?.activation_potential || '';
    const m = document.getElementById('crm-modal'); if (m) m.classList.add('open');
  };

  window.crmCloseModal = function () {
    const m = document.getElementById('crm-modal'); if (m) m.classList.remove('open');
    crmEditing = null;
  };

  window.crmSave = async function () {
    const name = (gv('cm-name')||'').trim();
    if (!name) { toast('Full name is required'); return; }
    const btn = document.getElementById('crm-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const payload = {
      contact_id:          crmEditing?.contact_id || `C${Date.now()}`,
      full_name:           name,
      title_role:          gv('cm-role')  || '',
      organization:        gv('cm-org')   || '',
      venture:             gv('cm-ven')   || '',
      source:              gv('cm-src')   || '',
      how_we_met:          gv('cm-hwm')   || '',
      what_building:       gv('cm-bld')   || '',
      what_need:           gv('cm-need')  || '',
      what_offer:          gv('cm-offer') || '',
      relationship_health: gv('cm-hlth')  || '',
      activation_potential:gv('cm-act')   || '',
      notes:               gv('cm-notes') || '',
    };
    try {
      await fetch(`${API_BASE}/contact/${payload.contact_id}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(payload) });
      window.crmCloseModal();
      crmLoad(crmOffset);
      toast(crmEditing ? 'Contact updated ✓' : 'Contact saved ✓');
    } catch(e) { toast('Save failed: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Save Contact'; } }
  };

  // ── UTILS ────────────────────────────────────────────────────────────────────
  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function gv(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function sv(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function sv2(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function toast(msg) {
    let t = document.getElementById('crm-toast');
    if (!t) { t = document.createElement('div'); t.id = 'crm-toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ── ACTIVATION TABS ──────────────────────────────────────────────────────────
  window.activTab = function (tab) {
    ['queue','angles'].forEach(t => {
      const btn = document.getElementById('activ-tab-'+t); if (btn) btn.classList.toggle('active', t===tab);
      const panel = document.getElementById('activ-panel-'+t); if (panel) panel.classList.toggle('active', t===tab);
    });
  };

  // ── TOPBAR + PAGE INIT ───────────────────────────────────────────────────────
  function goContacts() {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const cp = document.getElementById('page-contacts'); if (cp) cp.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nc = document.getElementById('nav-contacts'); if (nc) nc.classList.add('active');
    const tt = document.getElementById('page-title'); if (tt) tt.textContent = 'Contacts';
    const addBtn = document.getElementById('topbar-add-btn');
    if (addBtn) { addBtn.textContent = '+ New Contact'; addBtn.onclick = () => crmOpenModal(null); }
  }

  function patchShowPage() {
    const orig = window.showPage;
    window.showPage = function (page) {
      if (page === 'contacts' || page === 'search') { goContacts(); return; }
      if (orig) orig(page);
    };
  }

  function waitForShowPage(attempts = 0) {
    if (window.showPage || attempts > 80) { patchShowPage(); injectDOM(); }
    else setTimeout(() => waitForShowPage(attempts + 1), 100);
  }

  waitForShowPage();
})();
