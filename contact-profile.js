/**
 * contact-profile.js — Full contact profile page
 *
 * Two modes:
 *   Panel mode (default): full-screen overlay with left/right split
 *   Expanded mode: centered modal with more breathing room
 *
 * Tabs: Activity | Context | Org Profile | Initiatives | Candidacy
 *
 * Notes field rendered as bullet points.
 * Activity timeline left unchanged.
 *
 * Context tab renders from real Railway fields:
 *   what_they_offer_me, what_building, what_offer, what_need, notes
 */
(function () {
  const API_BASE = 'https://super-connector-api-production.up.railway.app';
  const _KEY = 'sc_live_k3y_2026_scak';
  const hdrs = () => ({ 'Content-Type': 'application/json', 'X-API-Key': _KEY });

  const HEALTH_COLORS = { Strong: '#2d7a3a', Good: '#534AB7', Neutral: '#888780', Dormant: '#b4b2a9', Cold: '#A32D2D' };
  const HEALTH_BG = { Strong: '#EDF7ED', Good: '#EEEDFE', Neutral: '#F1EFE8', Dormant: '#F1EFE8', Cold: '#FCEBEB' };
  const SOURCE_COLORS = { manual: '#888780', transcript: '#534AB7', enrichment: '#185FA5', system: '#b4b2a9' };
  const SOURCE_LABELS = { manual: 'Note', transcript: 'Meeting transcript', enrichment: 'Enrichment', system: 'System' };

  const CANDIDACY_STATUSES = [
    'Candidate - Not Yet Qualified',
    'Candidate - Qualified',
    'Candidate - Passed',
    'Candidate - Contacted',
    'Candidate - Responded',
  ];

  const CANDIDACY_COLORS = {
    'Candidate - Not Yet Qualified': { bg: '#F1EFE8', color: '#5F5E5A' },
    'Candidate - Qualified':         { bg: '#EDF7ED', color: '#2d7a3a' },
    'Candidate - Passed':            { bg: '#FCEBEB', color: '#A32D2D' },
    'Candidate - Contacted':         { bg: '#EEEDFE', color: '#534AB7' },
    'Candidate - Responded':         { bg: '#E1F5EE', color: '#0F6E56' },
  };

  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function initials(name) { if (!name) return '?'; return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function formatDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  function renderBullets(text) {
    if (!text) return '';
    const lines = text
      .split(/\n/)
      .map(l => l.replace(/^\s*[-•]\s*/, '').trim())
      .filter(Boolean);
    if (lines.length <= 1) return `<div class="cp-field">${esc(lines[0] || text)}</div>`;
    return `<ul class="cp-bullet-list">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
  }

  // ── INJECT STYLES ──────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
    #cp-overlay{position:fixed;inset:0;background:rgba(26,25,22,0.6);z-index:2000;display:none;align-items:center;justify-content:center;overflow:hidden}
    #cp-overlay.open{display:flex}
    #cp-panel{background:var(--bg,#F5F4EF);width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;transition:all .2s}
    #cp-overlay.expanded #cp-panel{width:88vw;max-width:1200px;height:90vh;border-radius:14px;box-shadow:0 8px 40px rgba(26,25,22,0.18)}
    .cp-topbar{display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:0.5px solid var(--border,#e5e5e5);flex-shrink:0;background:var(--surface,#FDFCF8)}
    .cp-back{background:none;border:none;font-size:12px;color:#534AB7;cursor:pointer;padding:0;font-family:inherit;display:flex;align-items:center;gap:4px}
    .cp-back:hover{text-decoration:underline}
    .cp-topbar-name{font-size:14px;font-weight:500;color:var(--text,#1a1a1a);flex:1}
    .cp-expand-btn{background:none;border:0.5px solid var(--border,#e5e5e5);border-radius:6px;font-size:11px;color:var(--text-secondary,#888);cursor:pointer;padding:4px 10px;font-family:inherit}
    .cp-expand-btn:hover{background:var(--surface2,#F0EFE9);color:var(--text,#1a1a1a)}
    .cp-body{display:grid;grid-template-columns:300px 1fr;flex:1;min-height:0;overflow:hidden}
    #cp-overlay.expanded .cp-body{grid-template-columns:320px 1fr}
    .cp-left{border-right:0.5px solid var(--border,#e5e5e5);overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;background:var(--surface,#FDFCF8)}
    .cp-avatar{width:52px;height:52px;border-radius:50%;background:#EEEDFE;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500;color:#3C3489;flex-shrink:0}
    .cp-name{font-size:18px;font-weight:500;color:var(--text,#1a1a1a);line-height:1.2}
    .cp-role{font-size:12px;color:var(--text-secondary,#666)}
    .cp-org-link{font-size:12px;color:#534AB7;font-weight:500;cursor:pointer;background:none;border:none;padding:0;font-family:inherit;text-align:left}
    .cp-org-link:hover{text-decoration:underline}
    .cp-badges{display:flex;flex-wrap:wrap;gap:5px}
    .cp-badge{font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px}
    .cp-divider{height:0.5px;background:var(--border,#e5e5e5)}
    .cp-section-label{font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary,#888);margin-bottom:5px}
    .cp-field{font-size:12px;color:var(--text,#1a1a1a);line-height:1.6}
    .cp-field-empty{font-size:12px;color:var(--text-secondary,#aaa);font-style:italic}
    .cp-bullet-list{font-size:12px;color:var(--text,#1a1a1a);line-height:1.7;padding-left:16px;margin:0}
    .cp-bullet-list li{margin-bottom:3px}
    .cp-qs{display:flex;flex-direction:column;gap:3px}
    .cp-qs-label{font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary,#888)}
    .cp-qs select{font-size:12px;padding:4px 8px;border-radius:20px;border:0.5px solid var(--border,#e5e5e5);background:var(--surface,#fafafa);color:var(--text,#1a1a1a);font-family:inherit;cursor:pointer;outline:none}
    .cp-bucket-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:20px;background:var(--surface,#f5f5f5);border:0.5px solid var(--border,#e5e5e5);color:var(--text-secondary,#666);margin:2px}
    .cp-bucket-dot{width:7px;height:7px;border-radius:50%}
    .cp-actions{display:flex;gap:6px;flex-wrap:wrap}
    .cp-btn{font-size:11px;padding:5px 12px;border-radius:6px;border:0.5px solid var(--border,#e5e5e5);background:transparent;color:var(--text-secondary,#666);cursor:pointer;font-family:inherit}
    .cp-btn:hover{background:var(--surface,#f5f5f5)}
    .cp-btn-primary{background:#534AB7;color:#fff;border-color:#534AB7}
    .cp-btn-primary:hover{background:#3C3489}
    .cp-btn-danger{color:#A32D2D;border-color:#F7C1C1}
    .cp-btn-danger:hover{background:#FCEBEB}
    .cp-btn-sm{font-size:10px;padding:3px 9px}
    .cp-right{display:flex;flex-direction:column;overflow:hidden;background:var(--bg,#F5F4EF)}
    .cp-tabs{display:flex;gap:0;border-bottom:0.5px solid var(--border,#e5e5e5);flex-shrink:0;padding:0 20px;background:var(--surface,#FDFCF8);overflow-x:auto}
    .cp-tab{padding:10px 14px;font-size:12px;font-weight:500;color:var(--text-secondary,#888);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;font-family:inherit;transition:color .12s,border-color .12s;white-space:nowrap}
    .cp-tab.active{color:#534AB7;border-bottom-color:#534AB7}
    .cp-tab:hover:not(.active){color:var(--text,#1a1a1a)}
    .cp-tab-body{flex:1;overflow-y:auto;padding:20px}
    .cp-timeline{display:flex;flex-direction:column;gap:0}
    .cp-tentry{display:grid;grid-template-columns:64px 24px 1fr;gap:0;align-items:start}
    .cp-tdate{font-size:10px;color:var(--text-secondary,#999);text-align:right;padding-right:10px;padding-top:3px;line-height:1.4}
    .cp-ttrack-wrap{display:flex;flex-direction:column;align-items:center;padding-top:3px}
    .cp-tdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .cp-tline{width:1px;background:var(--border,#e5e5e5);flex:1;min-height:16px;margin-top:4px}
    .cp-tcontent{padding:0 0 20px 12px}
    .cp-tsource{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
    .cp-tbody{font-size:13px;color:var(--text,#1a1a1a);line-height:1.6}
    .cp-tdelete{background:none;border:none;color:var(--text-secondary,#ccc);cursor:pointer;font-size:11px;padding:0;margin-left:6px;line-height:1}
    .cp-tdelete:hover{color:#A32D2D}
    .cp-log-bar{display:flex;gap:8px;margin-top:8px;padding-top:16px;border-top:0.5px solid var(--border,#e5e5e5)}
    .cp-log-bar textarea{flex:1;font-size:12px;padding:8px 10px;border-radius:8px;border:0.5px solid var(--border,#e5e5e5);background:var(--surface,#fafafa);color:var(--text,#1a1a1a);font-family:inherit;resize:none;min-height:64px;outline:none}
    .cp-log-bar textarea:focus{border-color:#534AB7}
    .cp-log-bar button{align-self:flex-end;font-size:11px;padding:7px 16px;border-radius:6px;border:none;background:#534AB7;color:#fff;cursor:pointer;font-family:inherit;white-space:nowrap}
    .cp-log-bar button:hover{background:#3C3489}
    .cp-empty{font-size:12px;color:var(--text-secondary,#aaa);font-style:italic;padding:20px 0}
    .cp-org-card{background:var(--surface,#fafafa);border:0.5px solid var(--border,#e5e5e5);border-radius:8px;padding:16px;margin-bottom:16px}
    .cp-org-name{font-size:14px;font-weight:500;margin-bottom:4px}
    .cp-org-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
    .cp-org-pill{font-size:10px;padding:2px 8px;border-radius:20px;background:#EEEDFE;color:#3C3489}
    .cp-org-desc{font-size:12px;color:var(--text-secondary,#666);line-height:1.6;margin-bottom:8px}
    .cp-org-hook{font-size:12px;color:#534AB7;line-height:1.5}
    .cp-ini-row{background:var(--surface,#fafafa);border:0.5px solid var(--border,#e5e5e5);border-radius:8px;padding:12px 16px;margin-bottom:8px}
    .cp-ini-name{font-size:13px;font-weight:500;color:var(--text,#1a1a1a);margin-bottom:3px}
    .cp-ini-meta{font-size:11px;color:var(--text-secondary,#888);display:flex;gap:8px;flex-wrap:wrap}
    .cp-ini-badge{font-size:10px;padding:2px 7px;border-radius:20px;background:#EEEDFE;color:#3C3489}
    .cp-ini-select-list{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;max-height:300px;overflow-y:auto}
    .cp-ini-select-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:var(--surface,#fafafa);border:0.5px solid var(--border,#e5e5e5);cursor:pointer;font-size:12px}
    .cp-ini-select-item:hover{border-color:#534AB7;background:#EEEDFE}
    .cp-ini-select-item.selected{border-color:#534AB7;background:#EEEDFE}
    .cp-ini-select-item input[type=checkbox]{accent-color:#534AB7;width:14px;height:14px;flex-shrink:0}
    .cp-candidacy-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
    .cp-candidacy-option{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:0.5px solid var(--border,#e5e5e5);cursor:pointer;font-size:13px;transition:all .12s}
    .cp-candidacy-option:hover{border-color:#534AB7}
    .cp-candidacy-option.active{border-width:1.5px}
    .cp-candidacy-option input[type=radio]{accent-color:#534AB7;width:14px;height:14px;flex-shrink:0}
    .cp-context-block{background:var(--surface,#fafafa);border:0.5px solid var(--border,#e5e5e5);border-radius:8px;padding:14px 16px;margin-bottom:12px}
    .cp-context-label{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .cp-context-dot{width:7px;height:7px;border-radius:50%}
    #cp-loading{display:flex;align-items:center;justify-content:center;height:100%;font-size:13px;color:var(--text-secondary,#999)}
  `;
  document.head.appendChild(css);

  function injectProfileOverlay() {
    if (document.getElementById('cp-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="cp-overlay" onclick="cpOverlayClick(event)">
        <div id="cp-panel">
          <div class="cp-topbar">
            <button class="cp-back" id="cp-back">← Contacts</button>
            <span class="cp-topbar-name" id="cp-topbar-name"></span>
            <button class="cp-expand-btn" id="cp-expand-btn" onclick="cpToggleExpand()">⤢ Expand</button>
          </div>
          <div class="cp-body">
            <div class="cp-left" id="cp-left">
              <div id="cp-loading">Loading…</div>
            </div>
            <div class="cp-right">
              <div class="cp-tabs" id="cp-tabs">
                <button class="cp-tab active" id="cp-tab-activity"    onclick="cpTab('activity')">Activity</button>
                <button class="cp-tab"        id="cp-tab-context"     onclick="cpTab('context')">Context</button>
                <button class="cp-tab"        id="cp-tab-org"         onclick="cpTab('org')">Org Profile</button>
                <button class="cp-tab"        id="cp-tab-initiatives" onclick="cpTab('initiatives')">Initiatives</button>
                <button class="cp-tab"        id="cp-tab-candidacy"   onclick="cpTab('candidacy')">Candidacy</button>
              </div>
              <div class="cp-tab-body" id="cp-tab-body">
                <div id="cp-loading">Loading…</div>
              </div>
            </div>
          </div>
        </div>
      </div>`);
    document.getElementById('cp-back').onclick = closeProfile;
  }

  let _cpContact = null;
  let _cpFull = null;
  let _cpNotes = [];
  let _cpTab = 'activity';
  let _cpBuckets = [];
  let _cpExpanded = false;
  let _cpAllInitiatives = [];

  window.cpToggleExpand = function () {
    _cpExpanded = !_cpExpanded;
    const overlay = document.getElementById('cp-overlay');
    const btn = document.getElementById('cp-expand-btn');
    if (_cpExpanded) { overlay.classList.add('expanded'); btn.textContent = '⤡ Collapse'; }
    else { overlay.classList.remove('expanded'); btn.textContent = '⤢ Expand'; }
  };

  window.cpOverlayClick = function (e) {
    if (_cpExpanded && e.target === document.getElementById('cp-overlay')) closeProfile();
  };

  window.openContactProfile = async function (contact) {
    if (!contact) return;
    injectProfileOverlay();
    _cpContact = contact;
    _cpTab = 'activity';
    _cpExpanded = false;
    const overlay = document.getElementById('cp-overlay');
    overlay.classList.remove('expanded');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('cp-topbar-name').textContent = contact.full_name || '';
    document.getElementById('cp-expand-btn').textContent = '⤢ Expand';
    document.getElementById('cp-left').innerHTML = '<div id="cp-loading">Loading…</div>';
    document.getElementById('cp-tab-body').innerHTML = '<div id="cp-loading">Loading…</div>';

    const [fullResp, notesResp, inisResp] = await Promise.all([
      fetch(`${API_BASE}/contact/${contact.contact_id}`, { headers: hdrs() }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/contact/${contact.contact_id}/notes`, { headers: hdrs() }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_BASE}/initiatives`, { headers: hdrs() }).then(r => r.json()).catch(() => ({ data: [] })),
    ]);

    _cpFull = { ...contact, ...fullResp.data };
    _cpNotes = notesResp.data || [];
    _cpBuckets = fullResp.buckets || [];
    _cpAllInitiatives = (inisResp.data || []).filter(i => i.status !== 'Complete' && i.status !== 'Paused');

    if (_cpNotes.length === 0 && _cpFull.notes) {
      _cpNotes = [{ note_id: '_legacy', body: _cpFull.notes, source: 'system', note_date: null }];
    }

    renderLeft(_cpFull, fullResp.org_profile, _cpBuckets);
    renderTab(_cpTab, fullResp.org_profile, fullResp.initiative_links || []);
  };

  window.closeProfile = function () {
    const o = document.getElementById('cp-overlay');
    if (o) { o.classList.remove('open'); o.classList.remove('expanded'); }
    document.body.style.overflow = '';
    _cpContact = null; _cpFull = null; _cpExpanded = false;
  };

  function renderLeft(c, orgProfile, buckets) {
    const left = document.getElementById('cp-left');
    if (!left) return;
    const health = c.relationship_health || '';
    const hc = HEALTH_COLORS[health] || '#888780';
    const hbg = HEALTH_BG[health] || '#f5f5f5';
    const cand = c.outreach_candidacy || '';
    const candStyle = CANDIDACY_COLORS[cand] || null;
    const notesText = c.notes || '';
    const notesHtml = notesText ? renderBullets(notesText) : '';

    left.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div class="cp-avatar">${esc(initials(c.full_name))}</div>
        <div>
          <div class="cp-name">${esc(c.full_name || '—')}</div>
          <div class="cp-role">${esc(c.title_role || '')}</div>
          ${c.organization ? `<button class="cp-org-link" onclick="cpTab('org')">${esc(c.organization)}</button>` : ''}
        </div>
      </div>
      <div class="cp-badges">
        ${health ? `<span class="cp-badge" style="background:${hbg};color:${hc}">${esc(health)}</span>` : ''}
        ${c.contact_type ? `<span class="cp-badge" style="background:#F1EFE8;color:#5F5E5A;border:0.5px solid #E5E3DA">${esc(c.contact_type)}</span>` : ''}
        ${c.activation_potential ? `<span class="cp-badge" style="background:#EEEDFE;color:#3C3489;border:0.5px solid #CECBF6">${esc(c.activation_potential)}</span>` : ''}
        ${candStyle ? `<span class="cp-badge" style="background:${candStyle.bg};color:${candStyle.color}">${esc(cand)}</span>` : ''}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="cp-qs">
          <div class="cp-qs-label">Health</div>
          <select id="cp-qs-health" onchange="cpQuickSave('relationship_health',this.value)">
            <option value="">— unknown —</option>
            ${['Strong','Good','Neutral','Dormant','Cold'].map(v => `<option ${health===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="cp-qs">
          <div class="cp-qs-label">Activation</div>
          <select id="cp-qs-act" onchange="cpQuickSave('activation_potential',this.value)">
            <option value="">— unknown —</option>
            ${['High','Medium','Low','None'].map(v => `<option ${c.activation_potential===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="cp-divider"></div>
      <div>
        <div class="cp-section-label">How We Met</div>
        ${c.how_we_met ? `<div class="cp-field">${esc(c.how_we_met)}</div>` : `<div class="cp-field-empty">Not recorded</div>`}
      </div>
      ${notesHtml ? `
      <div class="cp-divider"></div>
      <div>
        <div class="cp-section-label">Notes</div>
        ${notesHtml}
      </div>` : ''}
      <div class="cp-divider"></div>
      <div>
        <div class="cp-section-label" style="margin-bottom:8px">Buckets</div>
        <div id="cp-bucket-tags">
          ${buckets.length
            ? buckets.map(b => `<span class="cp-bucket-tag"><span class="cp-bucket-dot" style="background:${b.color||'#6B7FF0'}"></span>${esc(b.name||b.bucket_id)}</span>`).join('')
            : '<span style="font-size:11px;color:var(--text-secondary,#aaa);font-style:italic">No buckets</span>'}
        </div>
      </div>
      <div class="cp-divider"></div>
      <div class="cp-actions">
        <button class="cp-btn cp-btn-primary" onclick="cpOpenFullEdit()">✎ Edit</button>
        <button class="cp-btn" onclick="cpAddToBucket()">+ Bucket</button>
        <button class="cp-btn cp-btn-danger" onclick="cpDeleteContact()">Delete</button>
      </div>
      <div style="font-size:10px;color:var(--text-secondary,#bbb);margin-top:auto">${esc(c.contact_id || '')}</div>`;
  }

  const ALL_TABS = ['activity','context','org','initiatives','candidacy'];

  window.cpTab = function (tab) {
    _cpTab = tab;
    ALL_TABS.forEach(t => {
      const el = document.getElementById(`cp-tab-${t}`);
      if (el) el.classList.toggle('active', t === tab);
    });
    if (!_cpFull) return;
    if (tab === 'activity' || tab === 'context' || tab === 'candidacy') {
      renderTab(tab, null, []); return;
    }
    fetch(`${API_BASE}/contact/${_cpFull.contact_id}`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => renderTab(tab, d.org_profile, d.initiative_links || []))
      .catch(() => renderTab(tab, null, []));
  };

  function renderTab(tab, orgProfile, initiativeLinks) {
    const body = document.getElementById('cp-tab-body');
    if (!body) return;
    if (tab === 'activity')         renderActivity(body);
    else if (tab === 'context')     renderContext(body);
    else if (tab === 'org')         renderOrg(body, orgProfile);
    else if (tab === 'initiatives') renderInitiatives(body, initiativeLinks);
    else if (tab === 'candidacy')   renderCandidacy(body);
  }

  function renderActivity(body) {
    const entries = _cpNotes;
    body.innerHTML = `
      <div class="cp-timeline" id="cp-timeline">
        ${entries.length === 0
          ? '<div class="cp-empty">No activity yet. Log a note below.</div>'
          : entries.map((n, i) => timelineEntry(n, i === entries.length - 1)).join('')}
      </div>
      <div class="cp-log-bar">
        <textarea id="cp-log-input" placeholder="Log a note, meeting takeaway, or context…" rows="3"></textarea>
        <button onclick="cpLogNote()">Log note</button>
      </div>`;
  }

  function timelineEntry(n, isLast) {
    const color = SOURCE_COLORS[n.source] || '#888780';
    const label = SOURCE_LABELS[n.source] || n.source || 'Note';
    const date = n.note_date ? formatDateShort(n.note_date) : (n.created_at ? formatDateShort(n.created_at) : '');
    const isLegacy = n.note_id === '_legacy';
    return `
      <div class="cp-tentry">
        <div class="cp-tdate">${esc(date)}</div>
        <div class="cp-ttrack-wrap">
          <div class="cp-tdot" style="background:${color}"></div>
          ${!isLast ? '<div class="cp-tline"></div>' : ''}
        </div>
        <div class="cp-tcontent">
          <div class="cp-tsource" style="color:${color}">${esc(label)}${!isLegacy ? `<button class="cp-tdelete" title="Delete" onclick="cpDeleteNote('${esc(n.note_id)}')">✕</button>` : ''}</div>
          <div class="cp-tbody">${esc(n.body)}</div>
        </div>
      </div>`;
  }

  window.cpLogNote = async function () {
    const inp = document.getElementById('cp-log-input');
    const body = inp && inp.value.trim();
    if (!body || !_cpFull) return;
    inp.value = '';
    try {
      const r = await fetch(`${API_BASE}/contact/${_cpFull.contact_id}/notes`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ body, source: 'manual' })
      });
      const d = await r.json();
      _cpNotes.unshift({ note_id: d.note_id, body, source: 'manual', note_date: new Date().toISOString(), created_at: new Date().toISOString() });
      const tabBody = document.getElementById('cp-tab-body');
      if (tabBody) renderActivity(tabBody);
    } catch(e) { if (window.showToast) window.showToast('Failed to log note'); }
  };

  window.cpDeleteNote = async function (noteId) {
    if (!_cpFull || !noteId || noteId === '_legacy') return;
    try {
      await fetch(`${API_BASE}/contact/${_cpFull.contact_id}/notes/${noteId}`, { method: 'DELETE', headers: hdrs() });
      _cpNotes = _cpNotes.filter(n => n.note_id !== noteId);
      const tabBody = document.getElementById('cp-tab-body');
      if (tabBody) renderActivity(tabBody);
    } catch(e) { }
  };

  // ── CONTEXT TAB ────────────────────────────────────────────────────────────
  // Renders from real Railway fields only. No invented fields.
  function renderContext(body) {
    const c = _cpFull || {};
    const theyOffer  = (c.what_they_offer_me || '').trim();
    const whatOffer  = (c.what_offer || '').trim();
    const whatBuild  = (c.what_building || '').trim();
    const whatNeed   = (c.what_need || '').trim();
    const canOffer   = (c.what_i_can_offer || '').trim();

    const hasAny = theyOffer || whatOffer || whatBuild || whatNeed || canOffer;

    body.innerHTML = `
      ${!hasAny ? `<div class="cp-empty">No context data yet for this contact. Open their drawer and run enrichment, or edit the contact to add details.</div>` : ''}

      ${theyOffer ? `
      <div class="cp-context-block">
        <div class="cp-context-label">
          <span class="cp-context-dot" style="background:#2d7a3a"></span>
          What They Offer
        </div>
        ${renderBullets(theyOffer)}
      </div>` : ''}

      ${whatBuild ? `
      <div class="cp-context-block">
        <div class="cp-context-label">
          <span class="cp-context-dot" style="background:#534AB7"></span>
          What They're Building
        </div>
        <div class="cp-field">${esc(whatBuild)}</div>
      </div>` : ''}

      ${whatOffer ? `
      <div class="cp-context-block">
        <div class="cp-context-label">
          <span class="cp-context-dot" style="background:#888780"></span>
          What They Offer (Self-Reported)
        </div>
        <div class="cp-field">${esc(whatOffer)}</div>
      </div>` : ''}

      ${whatNeed ? `
      <div class="cp-context-block">
        <div class="cp-context-label">
          <span class="cp-context-dot" style="background:#D97757"></span>
          What They Need
        </div>
        <div class="cp-field">${esc(whatNeed)}</div>
      </div>` : ''}

      ${canOffer ? `
      <div class="cp-context-block">
        <div class="cp-context-label">
          <span class="cp-context-dot" style="background:#185FA5"></span>
          What I Can Offer Them
        </div>
        ${renderBullets(canOffer)}
      </div>` : ''}

      <div style="margin-top:${hasAny ? '16px' : '0'};padding-top:16px;border-top:0.5px solid var(--border,#e5e5e5)">
        <button class="cp-btn cp-btn-primary" onclick="cpGenerateDraft()">Generate outreach draft</button>
      </div>`;
  }

  window.cpGenerateDraft = async function () {
    if (!_cpFull) return;
    const campaign = prompt('Campaign context (or leave blank for default):',
      'I built an AI-powered relationship intelligence CRM specifically designed for connectors like me who regularly make introductions between founders, operators, and investors.');
    if (campaign === null) return;
    const goal = prompt('Your specific goal for this outreach (optional):', '');
    if (goal === null) return;
    if (window.showToast) window.showToast('Generating draft…');
    try {
      const r = await fetch(`${API_BASE}/contact/${_cpFull.contact_id}/draft-outreach`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ campaign_context: campaign, your_goal: goal })
      });
      const d = await r.json();
      if (d.draft) {
        const body = document.getElementById('cp-tab-body');
        if (body) {
          body.innerHTML = `
            <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
              <div class="cp-section-label">Draft outreach</div>
              <button class="cp-btn cp-btn-sm" onclick="cpTab('context')">← Back</button>
            </div>
            <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.7;color:var(--text,#1a1a1a);background:var(--surface,#fafafa);border:0.5px solid var(--border,#e5e5e5);border-radius:8px;padding:16px">${esc(d.draft)}</pre>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="cp-btn cp-btn-primary" onclick="navigator.clipboard.writeText(${JSON.stringify(d.draft)});window.showToast&&window.showToast('Copied')">Copy draft</button>
              <button class="cp-btn" onclick="cpTab('context')">Discard</button>
            </div>`;
        }
      }
    } catch(e) { if (window.showToast) window.showToast('Draft failed'); }
  };

  function renderOrg(body, orgProfile) {
    if (!orgProfile) {
      body.innerHTML = `
        <div class="cp-org-card">
          <div class="cp-section-label" style="margin-bottom:8px">No org profile linked</div>
          <div class="cp-field-empty" style="margin-bottom:12px">Create an org profile for ${esc(_cpFull?.organization || 'this organization')} to share context across all contacts there.</div>
          <button class="cp-btn cp-btn-primary" onclick="cpCreateOrg()">Create org profile</button>
        </div>`;
      return;
    }
    body.innerHTML = `
      <div class="cp-org-card">
        <div class="cp-org-name">${esc(orgProfile.name || '')}</div>
        <div class="cp-org-meta">
          ${orgProfile.org_type ? `<span class="cp-org-pill">${esc(orgProfile.org_type)}</span>` : ''}
          ${orgProfile.org_focus ? `<span class="cp-org-pill" style="background:#E1F5EE;color:#0F6E56">${esc(orgProfile.org_focus)}</span>` : ''}
          ${orgProfile.last_enriched ? `<span class="cp-org-pill" style="background:#F1EFE8;color:#5F5E5A">Enriched ${esc(orgProfile.last_enriched)}</span>` : ''}
        </div>
        ${orgProfile.description ? `<div class="cp-org-desc">${esc(orgProfile.description)}</div>` : ''}
        ${orgProfile.recent_activity ? `<div style="margin-bottom:8px"><div class="cp-section-label" style="margin-bottom:3px">Recent activity</div><div class="cp-field">${esc(orgProfile.recent_activity)}</div></div>` : ''}
        ${orgProfile.conversation_hook ? `<div><div class="cp-section-label" style="margin-bottom:3px">Conversation hook</div><div class="cp-org-hook">${esc(orgProfile.conversation_hook)}</div></div>` : ''}
        ${orgProfile.website ? `<div style="margin-top:10px"><a href="${esc(orgProfile.website)}" style="font-size:11px;color:#534AB7" target="_blank">${esc(orgProfile.website)}</a></div>` : ''}
      </div>
      <button class="cp-btn" onclick="cpResearchOrg('${esc(orgProfile.org_id)}')">↻ Re-research org</button>`;
  }

  window.cpCreateOrg = async function () {
    if (!_cpFull?.organization) return;
    try {
      const r = await fetch(`${API_BASE}/organization`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ name: _cpFull.organization })
      });
      const d = await r.json();
      if (d.org_id) { if (window.showToast) window.showToast(`Org profile created`); await cpResearchOrg(d.org_id); }
    } catch(e) { if (window.showToast) window.showToast('Failed to create org'); }
  };

  window.cpResearchOrg = async function (orgId) {
    if (window.showToast) window.showToast('Researching org…');
    try {
      await fetch(`${API_BASE}/organization/${orgId}/research`, { method: 'POST', headers: hdrs() });
      if (window.showToast) window.showToast('Org profile updated');
      cpTab('org');
    } catch(e) { if (window.showToast) window.showToast('Research failed'); }
  };

  function renderInitiatives(body, links) {
    const linkedIds = new Set((links || []).map(l => l.initiative_id));
    const available = _cpAllInitiatives.filter(i => !linkedIds.has(i.initiative_id));
    body.innerHTML = `
      ${links && links.length ? `
        <div class="cp-section-label" style="margin-bottom:10px">Linked initiatives</div>
        ${links.map(l => `
          <div class="cp-ini-row">
            <div class="cp-ini-name">${esc(l.initiative_name || l.initiative_id || '—')}</div>
            <div class="cp-ini-meta">
              ${l.role ? `<span class="cp-ini-badge">${esc(l.role)}</span>` : ''}
              ${l.action_needed ? `<span>${esc(l.action_needed)}</span>` : ''}
              ${l.engagement_status ? `<span style="color:#888">${esc(l.engagement_status)}</span>` : ''}
            </div>
          </div>`).join('')}
        <div class="cp-divider" style="margin:16px 0"></div>` : ''}
      <div class="cp-section-label" style="margin-bottom:10px">Link to initiatives</div>
      ${available.length === 0
        ? `<div class="cp-empty">All active initiatives are already linked.</div>`
        : `
          <div class="cp-ini-select-list" id="cp-ini-select-list">
            ${available.map(i => `
              <label class="cp-ini-select-item" id="cp-ini-item-${esc(i.initiative_id)}">
                <input type="checkbox" value="${esc(i.initiative_id)}" onchange="cpToggleIniSelection('${esc(i.initiative_id)}',this)">
                <div>
                  <div style="font-size:12px;font-weight:500">${esc(i.initiative_name)}</div>
                  <div style="font-size:10px;color:var(--text-secondary,#888)">${esc(i.venture||'')} · ${esc(i.status||'')}</div>
                </div>
              </label>`).join('')}
          </div>
          <button class="cp-btn cp-btn-primary" id="cp-ini-link-btn" style="display:none" onclick="cpLinkInitiatives()">Link selected</button>`}`;
  }

  let _cpSelectedInis = new Set();

  window.cpToggleIniSelection = function (id, checkbox) {
    if (checkbox.checked) { _cpSelectedInis.add(id); } else { _cpSelectedInis.delete(id); }
    const btn = document.getElementById('cp-ini-link-btn');
    if (btn) btn.style.display = _cpSelectedInis.size > 0 ? 'inline-flex' : 'none';
    const item = document.getElementById(`cp-ini-item-${id}`);
    if (item) item.classList.toggle('selected', checkbox.checked);
  };

  window.cpLinkInitiatives = async function () {
    if (!_cpFull || _cpSelectedInis.size === 0) return;
    try {
      const r = await fetch(`${API_BASE}/contact/${_cpFull.contact_id}/link-initiatives`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ initiative_ids: [..._cpSelectedInis] })
      });
      const d = await r.json();
      _cpSelectedInis.clear();
      if (window.showToast) window.showToast(`Linked to ${d.linked?.length || 0} initiative(s)`);
      cpTab('initiatives');
    } catch(e) { if (window.showToast) window.showToast('Link failed'); }
  };

  function renderCandidacy(body) {
    const current = _cpFull?.outreach_candidacy || '';
    body.innerHTML = `
      <div class="cp-section-label" style="margin-bottom:14px">Outreach candidacy</div>
      <div class="cp-candidacy-grid">
        <label class="cp-candidacy-option ${current===''?'active':''}" style="${current===''?'border-color:#888;background:#F5F4EF':''}">
          <input type="radio" name="candidacy" value="" ${current===''?'checked':''} onchange="cpSaveCandidacy('')">
          <span style="color:var(--text-secondary,#888)">Not set</span>
        </label>
        ${CANDIDACY_STATUSES.map(s => {
          const st = CANDIDACY_COLORS[s] || { bg: '#f5f5f5', color: '#888' };
          const isActive = current === s;
          return `
            <label class="cp-candidacy-option ${isActive?'active':''}" style="${isActive?`border-color:${st.color};background:${st.bg}`:''}">
              <input type="radio" name="candidacy" value="${esc(s)}" ${isActive?'checked':''} onchange="cpSaveCandidacy('${esc(s)}')">
              <span style="color:${isActive?st.color:'var(--text,#1a1a1a)'}">${esc(s)}</span>
            </label>`;
        }).join('')}
      </div>
      <div id="cp-candidacy-status" style="font-size:11px;color:var(--text-secondary,#888);margin-top:8px"></div>`;
  }

  window.cpSaveCandidacy = async function (value) {
    if (!_cpFull) return;
    const statusEl = document.getElementById('cp-candidacy-status');
    if (statusEl) statusEl.textContent = 'Saving…';
    try {
      await fetch(`${API_BASE}/contact/${_cpFull.contact_id}/candidacy`, {
        method: 'PATCH', headers: hdrs(), body: JSON.stringify({ outreach_candidacy: value })
      });
      _cpFull.outreach_candidacy = value;
      if (statusEl) statusEl.textContent = 'Saved.';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
      renderLeft(_cpFull, null, _cpBuckets);
      if (window.showToast) window.showToast(value ? `Set to: ${value}` : 'Candidacy cleared');
    } catch(e) { if (statusEl) statusEl.textContent = 'Save failed.'; }
  };

  window.cpQuickSave = async function (field, value) {
    if (!_cpFull) return;
    _cpFull[field] = value;
    try {
      await fetch(`${API_BASE}/contact/${_cpFull.contact_id}`, {
        method: 'PUT', headers: hdrs(), body: JSON.stringify(_cpFull)
      });
      if (window.showToast) window.showToast(`${field === 'relationship_health' ? 'Health' : 'Activation'} updated`);
    } catch(e) { if (window.showToast) window.showToast('Save error'); }
  };

  window.cpOpenFullEdit = function () {
    if (!_cpFull) return;
    if (window.crmOpenModal) window.crmOpenModal(_cpFull);
  };

  window.cpAddToBucket = function () {
    if (_cpFull && window.openCrmDrawer) window.openCrmDrawer(_cpFull);
    else if (_cpFull && window.openContactDrawer) window.openContactDrawer(_cpFull);
  };

  window.cpDeleteContact = async function () {
    if (!_cpFull) return;
    if (!confirm(`Delete ${_cpFull.full_name}? This cannot be undone.`)) return;
    try {
      await fetch(`${API_BASE}/contact/${_cpFull.contact_id}`, { method: 'DELETE', headers: hdrs() });
      closeProfile();
      if (window.crmLoad) window.crmLoad(0);
      if (window.showToast) window.showToast('Contact deleted');
    } catch(e) { if (window.showToast) window.showToast('Delete failed'); }
  };

  function patchCardClicks() {
    const origCard = window.crmCardClick;
    window.crmCardClick = function (el) {
      const grid = document.getElementById('crm-grid');
      if (grid && grid._contacts) {
        const c = grid._contacts[parseInt(el.dataset.cidx, 10)];
        if (c) { window.openContactProfile(c); return; }
      }
      if (origCard) origCard(el);
    };
    const origBucketCard = window.crmBucketCardClick;
    window.crmBucketCardClick = function (el) {
      const grid = document.getElementById('crm-bucket-grid');
      if (grid && grid._contacts) {
        const c = grid._contacts[parseInt(el.dataset.cidx, 10)];
        if (c) { window.openContactProfile(c); return; }
      }
      if (origBucketCard) origBucketCard(el);
    };
    const origFU = window.crmFollowUpClick;
    window.crmFollowUpClick = async function (contactId) {
      if (!contactId) return;
      try {
        const r = await fetch(`${API_BASE}/contact/${contactId}`, { headers: hdrs() });
        const d = await r.json();
        if (d.data) { window.openContactProfile(d.data); return; }
      } catch(e) { }
      if (origFU) origFU(contactId);
    };
  }

  let patchAttempts = 0;
  (function tryPatch() {
    if (window.crmCardClick || patchAttempts > 50) { patchCardClicks(); }
    else { patchAttempts++; setTimeout(tryPatch, 100); }
  })();
})();
