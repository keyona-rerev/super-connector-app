// Super Connector — Core page logic
// v20260407e — showPage uses display:block not '' to fix blank pages
const API_BASE = window.SC_API_BASE || 'https://super-connector-api-production.up.railway.app';
const API_KEY = window.SC_API_KEY || 'sc_live_k3y_2026_scak';
const hdrs = () => ({ 'Content-Type': 'application/json', 'X-API-Key': API_KEY });

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

let allInitiatives = [];
let currentVenture = '';

async function loadBoard() {
  try {
    const r = await fetch(`${API_BASE}/initiatives`, { headers: hdrs() });
    const d = await r.json();
    allInitiatives = d.data || [];
    renderBoard();
  } catch(e) {
    document.getElementById('board-columns').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Could not load</h3><p>${e.message}</p></div>`;
  }
}

function renderBoard() {
  const q = (document.getElementById('board-search')?.value || '').toLowerCase();
  const p = document.getElementById('board-priority')?.value || '';
  let data = allInitiatives;
  if (currentVenture) data = data.filter(i => i.venture === currentVenture);
  if (q) data = data.filter(i => (i.initiative_name||'').toLowerCase().includes(q) || (i.goal||'').toLowerCase().includes(q));
  if (p) data = data.filter(i => i.priority === p);
  const cols = { 'Brain Dump': [], 'Planning': [], 'Active': [], 'Paused': [], 'Complete': [] };
  data.forEach(i => { const s = i.status || 'Brain Dump'; if (cols[s]) cols[s].push(i); else cols['Brain Dump'].push(i); });
  const colDefs = [
    { key: 'Brain Dump', label: 'Brain Dump', cls: 'col-dump' },
    { key: 'Planning',   label: 'Planning',   cls: 'col-planning' },
    { key: 'Active',     label: 'Active',     cls: 'col-active' },
    { key: 'Paused',     label: 'Paused',     cls: 'col-blocked' },
    { key: 'Complete',   label: 'Complete',   cls: 'col-complete' },
  ];
  document.getElementById('board-columns').innerHTML = colDefs.map(col => `
    <div>
      <div class="board-col-header">
        <div class="board-col-title"><span class="status-dot dot-${col.cls.replace('col-','')}" style="background:var(--${col.cls.replace('col-','')}-border,var(--dump-border))"></span>${col.label}</div>
        <span class="board-col-count">${cols[col.key].length}</span>
      </div>
      ${cols[col.key].map(i => `
        <div class="initiative-card ${col.cls}" onclick="openIModal('${i.initiative_id}')">
          ${i.venture ? `<div class="card-venture">${i.venture}</div>` : ''}
          <div class="card-name">${i.initiative_name}</div>
          ${i.goal ? `<div class="card-goal">${i.goal}</div>` : ''}
          <div class="card-footer">
            <span class="badge badge-${(i.priority||'medium').toLowerCase()}">${i.priority||'Medium'}</span>
            ${i.phoebe_cadence && i.phoebe_cadence !== 'None' ? `<span style="font-size:10px;color:var(--text3)">${i.phoebe_cadence}</span>` : ''}
          </div>
        </div>`).join('')}
    </div>`).join('');
  const total = data.length;
  document.getElementById('topbar-meta').textContent = `${total} initiative${total !== 1 ? 's' : ''}${currentVenture ? ' · ' + currentVenture : ''}`;
}

function filterVenture(v) {
  currentVenture = v;
  renderBoard();
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-board').classList.add('active');
}

function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // Show the target page — use explicit 'block' so removal of display:none actually works
  const pg = document.getElementById('page-' + page);
  if (pg) pg.style.display = 'block';
  const nav = document.getElementById('nav-' + page);
  if (nav) nav.classList.add('active');
  const addBtn = document.getElementById('topbar-add-btn');
  const titles = {
    board: 'Initiatives Board', search: 'Search Contacts', orgs: 'Organizations',
    queue: 'Activation Queue', angles: 'Activation Angles',
    content: 'Assets', events: 'Events'
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  if (page === 'board')   { addBtn.textContent = '+ New Initiative'; addBtn.onclick = openAddModal; }
  else if (page === 'content') { addBtn.textContent = '+ New Asset'; addBtn.onclick = openContentModal; }
  else if (page === 'events')  { addBtn.textContent = '+ New Event'; addBtn.onclick = openEventModal; }
  else { addBtn.textContent = ''; addBtn.onclick = null; }
  // Per-page loaders
  if (page === 'orgs'    && typeof window.orgsLoad === 'function') window.orgsLoad();
  if (page === 'content') renderContent();
  if (page === 'events')  renderEvents();
  if (page === 'queue')   renderQueue();
  if (page === 'angles')  renderAngles();
}

// ── ACTIVATION QUEUE ──────────────────────────────────────────────────────────
async function renderQueue() {
  const el = document.getElementById('queue-list') || document.getElementById('activ-panel-queue');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading follow-ups...</div>';
  try {
    const r = await fetch(`${API_BASE}/follow-ups/open`, { headers: hdrs() });
    const d = await r.json();
    const items = d.data || [];
    if (!items.length) {
      el.innerHTML = '<div class="empty-state"><h3>All caught up</h3><p>No open follow-ups right now.</p></div>';
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    el.innerHTML = items.map(f => {
      const date = f.next_action_date || '';
      const overdue = date && date < today;
      const isToday = date === today;
      const urgencyColor = overdue ? 'var(--critical)' : isToday ? 'var(--high)' : 'var(--border)';
      return `<div class="queue-item">
        <div class="queue-urgency" style="background:${urgencyColor}"></div>
        <div class="queue-info">
          <div class="queue-name">${f.contact_name || f.contact_id || '—'}</div>
          <div class="queue-meta">${f.venture || ''}</div>
          <div class="queue-action">${f.next_action || f.notes || ''}</div>
        </div>
        ${date ? `<div style="font-size:11px;color:${overdue?'var(--critical)':'var(--text3)'};font-weight:${overdue?'600':'400'};white-space:nowrap">${overdue?'Overdue · ':''}${date}</div>` : ''}
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><h3>Could not load</h3><p>${e.message}</p></div>`;
  }
}

// ── ACTIVATION ANGLES ─────────────────────────────────────────────────────────
async function renderAngles() {
  const el = document.getElementById('angles-list');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading angles...</div>';
  try {
    const r = await fetch(`${API_BASE}/activation-angles`, { headers: hdrs() });
    const d = await r.json();
    const angles = d.data || [];
    if (!angles.length) {
      el.innerHTML = '<div class="empty-state"><h3>No angles yet</h3><p>Create your first activation angle.</p></div>';
      return;
    }
    el.innerHTML = angles.map(a => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:10px">
        <div style="font-family:var(--font-serif);font-size:15px;font-weight:400;color:var(--text);margin-bottom:4px">${a.angle_name}</div>
        ${a.best_for ? `<div style="font-size:11px;color:var(--accent);margin-bottom:8px">Best for: ${a.best_for}</div>` : ''}
        ${a.description ? `<div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:8px">${a.description}</div>` : ''}
        ${a.template ? `<div style="font-size:12px;color:var(--text2);background:var(--surface2);border-radius:var(--radius);padding:10px 12px;white-space:pre-wrap;line-height:1.5">${a.template}</div>` : ''}
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><h3>Could not load</h3><p>${e.message}</p></div>`;
  }
}

// ── INITIATIVES MODAL ─────────────────────────────────────────────────────────
let currentIModal = null;
async function openIModal(initiativeId) {
  currentIModal = initiativeId;
  document.getElementById('imodal-overlay').classList.add('open');
  document.getElementById('imodal-title').textContent = 'Loading...';
  document.getElementById('imodal-goal').textContent = '';
  document.getElementById('imodal-venture').textContent = '';
  document.getElementById('imodal-meta').innerHTML = '';
  document.getElementById('pipeline-track').innerHTML = '<div class="loading-state" style="padding:20px"><div class="spinner"></div></div>';
  document.getElementById('module-detail').className = 'module-detail empty';
  document.getElementById('module-detail').innerHTML = '<span>Select a module to see details and matched contacts</span>';
  try {
    const r = await fetch(`${API_BASE}/initiative/${initiativeId}`, { headers: hdrs() });
    const d = await r.json();
    const ini = d.data || {};
    document.getElementById('imodal-title').textContent = ini.initiative_name || '';
    document.getElementById('imodal-goal').textContent = ini.goal || '';
    document.getElementById('imodal-venture').textContent = ini.venture || '';
    const statusColors = { Active: 'var(--active-border)', Planning: 'var(--planning-border)', 'Brain Dump': 'var(--dump-border)', Paused: 'var(--critical)', Complete: 'var(--complete-border)' };
    document.getElementById('imodal-meta').innerHTML = `
      <div class="imodal-meta-chip"><span class="dot" style="background:${statusColors[ini.status]||'var(--dump-border)'}"></span>${ini.status||'Brain Dump'}</div>
      <div class="imodal-meta-chip">${ini.priority||'Medium'} priority</div>
      ${ini.phoebe_cadence && ini.phoebe_cadence !== 'None' ? `<div class="imodal-meta-chip">Phoebe: ${ini.phoebe_cadence}</div>` : ''}
      ${ini.timeline ? `<div class="imodal-meta-chip">${ini.timeline}</div>` : ''}`;
    renderPipeline(d.sub_projects || [], d.stakeholders || []);
  } catch(e) {
    document.getElementById('imodal-title').textContent = 'Error loading initiative';
  }
}

function handleIModalOverlayClick(e) { if (e.target === document.getElementById('imodal-overlay')) closeIModal(); }
function closeIModal() { document.getElementById('imodal-overlay').classList.remove('open'); currentIModal = null; }

function renderPipeline(subProjects, stakeholders) {
  const track = document.getElementById('pipeline-track');
  if (!subProjects.length) { track.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--text3);font-style:italic">No sub-projects yet.</div>'; return; }
  const statusMap = { 'Not Started': '', 'In Progress': 'ns-active', 'Blocked': '', 'Complete': 'ns-complete' };
  track.innerHTML = subProjects.map((sp, i) => `
    ${i > 0 ? '<div class="pipeline-arrow"><div class="arrow-line"></div><div class="arrow-head"></div></div>' : ''}
    <div class="pipeline-node" onclick="openModuleDetail('${sp.sub_project_id}', ${JSON.stringify(subProjects).replace(/'/g,"&#39;")}, ${JSON.stringify(stakeholders).replace(/'/g,"&#39;")})">
      <div class="node-number">${i + 1}</div>
      <div class="node-name">${sp.sub_project_name}</div>
      <div class="node-status"><div class="node-status-dot ${statusMap[sp.status]||''}"></div>${sp.status||'Not Started'}</div>
    </div>`).join('');
}

function togglePipeline() {
  const section = document.getElementById('pipeline-section');
  const label = document.getElementById('pipeline-toggle-label');
  section.classList.toggle('collapsed');
  label.textContent = section.classList.contains('collapsed') ? 'Expand' : 'Collapse';
}

async function openModuleDetail(subProjectId, subProjects, stakeholders) {
  document.querySelectorAll('.pipeline-node').forEach(n => n.classList.remove('active'));
  event.currentTarget.classList.add('active');
  const sp = subProjects.find(s => s.sub_project_id === subProjectId);
  if (!sp) return;
  const detail = document.getElementById('module-detail');
  detail.className = 'module-detail';
  detail.innerHTML = `<div class="module-detail-inner"><div class="module-info-panel"><div class="module-info-title">${sp.sub_project_name}</div>
    ${sp.description ? `<div class="module-info-section"><div class="module-info-label">Description</div><div class="module-info-text">${sp.description}</div></div>` : ''}
    ${sp.dependencies ? `<div class="module-info-section"><div class="module-info-label">Dependencies</div><div class="module-info-text">${sp.dependencies}</div></div>` : ''}
    ${sp.notes ? `<div class="module-info-section"><div class="module-info-label">Notes</div><div class="module-info-text">${sp.notes}</div></div>` : ''}
    <div class="module-info-section"><div class="module-info-label">Status</div>
    <select onchange="updateSubProjectStatus('${sp.sub_project_id}', this.value, ${JSON.stringify(sp).replace(/'/g,"&#39;")})" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:var(--font-sans);cursor:pointer">
      ${['Not Started','In Progress','Blocked','Complete'].map(s => `<option ${sp.status===s?'selected':''}>${s}</option>`).join('')}
    </select></div>
    </div>
    <div class="module-actions"><div class="module-actions-header"><div class="module-actions-title">Matched contacts</div></div>
    <div id="module-matches"><div class="contacts-loading"><div class="spinner"></div>Finding matches...</div></div></div></div>`;
  loadModuleMatches(sp, stakeholders);
}

async function loadModuleMatches(sp, stakeholders) {
  try {
    const query = [sp.sub_project_name, sp.description, sp.notes].filter(Boolean).join(' ');
    const r = await fetch(`${API_BASE}/search`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ query, top_k: 6 }) });
    const d = await r.json();
    const results = d.results || [];
    const container = document.getElementById('module-matches');
    if (!container) return;
    if (!results.length) { container.innerHTML = '<div class="contacts-empty">No strong matches found</div>'; return; }
    container.innerHTML = results.map(c => {
      const stk = stakeholders.find(s => s.contact_id === c.contact_id);
      return `<div class="match-result-card">
        <div class="match-result-top">
          <div class="match-result-identity">
            <div class="match-result-name">${c.full_name||'Unknown'}</div>
            <div class="match-result-role">${[c.title_role, c.organization].filter(Boolean).join(' · ')}</div>
          </div>
          <span class="match-result-score">${Math.round((c.score||c.similarity||0)*100)}%</span>
        </div>
        ${c.what_building ? `<div class="match-result-why">${c.what_building}</div>` : ''}
        ${stk ? `<div style="font-size:11px;color:var(--complete-border);margin-bottom:8px">Already linked: ${stk.role||'Stakeholder'}</div>` : ''}
        <div class="action-chips">
          <button class="action-chip outreach" onclick="showToast('Draft outreach coming soon')">Outreach</button>
          ${!stk ? `<button class="action-chip advisor" onclick="showToast('Link as stakeholder coming soon')">Link</button>` : ''}
        </div></div>`;
    }).join('');
  } catch(e) {
    const c = document.getElementById('module-matches');
    if (c) c.innerHTML = `<div class="contacts-empty">Error: ${e.message}</div>`;
  }
}

async function updateSubProjectStatus(spId, status, spData) {
  try {
    const updated = { ...spData, status };
    await fetch(`${API_BASE}/sub-project/${spId}`, { method: 'PUT', headers: hdrs(), body: JSON.stringify(updated) });
    showToast(`Status updated to ${status}`);
  } catch(e) { showToast('Failed to update status'); }
}

async function runSearch() {
  const q = document.getElementById('search-input')?.value?.trim();
  if (!q) return;
  document.getElementById('search-results').innerHTML = '<div class="loading-state"><div class="spinner"></div>Searching...</div>';
  try {
    const r = await fetch(`${API_BASE}/search`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ query: q, top_k: 12 }) });
    const d = await r.json();
    const results = d.results || [];
    if (!results.length) { document.getElementById('search-results').innerHTML = '<div class="empty-state"><h3>No results</h3><p>Try different keywords.</p></div>'; return; }
    document.getElementById('search-results').innerHTML = `<div class="results-grid">${results.map(c => `
      <div class="contact-card" onclick="openContactProfile && openContactProfile(${JSON.stringify(c).replace(/"/g,'&quot;')})">
        <div class="contact-name">${c.full_name||'Unknown'}</div>
        <div class="contact-role">${[c.title_role,c.organization].filter(Boolean).join(' · ')}</div>
        ${c.what_building ? `<div style="font-size:12px;color:var(--text2);margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${c.what_building}</div>` : ''}
        <div class="contact-tags">
          <span class="contact-score">${Math.round((c.score||c.similarity||0)*100)}%</span>
          ${c.relationship_health ? `<span class="tag">${c.relationship_health}</span>` : ''}
          ${c.venture ? `<span class="tag">${c.venture}</span>` : ''}
        </div>
      </div>`).join('')}</div>`;
  } catch(e) {
    document.getElementById('search-results').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
  }
}

function openAddModal() { document.getElementById('add-modal').classList.add('open'); }
function closeAddModal() { document.getElementById('add-modal').classList.remove('open'); }
async function saveInitiative() {
  const name = document.getElementById('new-name')?.value?.trim();
  if (!name) { showToast('Name is required'); return; }
  const payload = { initiative_name: name, venture: document.getElementById('new-venture')?.value||'', priority: document.getElementById('new-priority')?.value||'Medium', status: document.getElementById('new-status')?.value||'Brain Dump', phoebe_cadence: document.getElementById('new-cadence')?.value||'Weekly', goal: document.getElementById('new-goal')?.value||'', brain_dump: document.getElementById('new-braindump')?.value||'' };
  try {
    await fetch(`${API_BASE}/initiative`, { method: 'POST', headers: hdrs(), body: JSON.stringify(payload) });
    closeAddModal(); showToast('Initiative created'); await loadBoard();
  } catch(e) { showToast('Error: ' + e.message); }
}

function openContactDrawer(contact) {
  if (window.openContactProfile) { window.openContactProfile(contact); return; }
  const d = document.getElementById('contact-drawer');
  const o = document.getElementById('drawer-overlay');
  document.getElementById('contact-drawer-title').textContent = contact.full_name || 'Contact';
  document.getElementById('contact-drawer-sub').textContent = [contact.title_role, contact.organization].filter(Boolean).join(' · ');
  const body = document.getElementById('contact-drawer-body');
  const fields = [['How We Met', contact.how_we_met], ['What Building', contact.what_building], ['What Need', contact.what_need], ['What Offer', contact.what_offer], ['Notes', contact.notes], ['Health', contact.relationship_health], ['Activation', contact.activation_potential]];
  body.innerHTML = fields.filter(([,v]) => v).map(([k,v]) => `<div class="detail-field"><label>${k}</label><p>${v}</p></div>`).join('');
  d.classList.add('open'); o.classList.add('open');
}
function closeContactDrawer() { document.getElementById('contact-drawer')?.classList.remove('open'); document.getElementById('drawer-overlay')?.classList.remove('open'); }

function openContentModal() { document.getElementById('content-modal').classList.add('open'); }
function closeContentModal() { document.getElementById('content-modal').classList.remove('open'); }
async function saveContent() {
  const name = document.getElementById('cnt-name')?.value?.trim();
  if (!name) { showToast('Name is required'); return; }
  const payload = { content_name: name, content_type: document.getElementById('cnt-type')?.value||'', venture: document.getElementById('cnt-venture')?.value||'', status: document.getElementById('cnt-status')?.value||'Idea', prismm_sync: document.getElementById('cnt-sync')?.value||'', approval_required: document.getElementById('cnt-approval')?.value||'No', initiative_tags: document.getElementById('cnt-tags')?.value||'', activation_angle: document.getElementById('cnt-angle')?.value||'', asset_link: document.getElementById('cnt-link')?.value||'', notes: document.getElementById('cnt-notes')?.value||'' };
  try {
    await fetch(`${API_BASE}/content`, { method: 'POST', headers: hdrs(), body: JSON.stringify(payload) });
    closeContentModal(); showToast('Asset saved'); allContent = []; renderContent();
  } catch(e) { showToast('Error: ' + e.message); }
}

function openAngleModal() { document.getElementById('angle-modal').classList.add('open'); }
function closeAngleModal() { document.getElementById('angle-modal').classList.remove('open'); }
async function saveAngle() {
  const name = document.getElementById('ang-name')?.value?.trim();
  if (!name) { showToast('Name is required'); return; }
  const payload = { angle_name: name, description: document.getElementById('ang-desc')?.value||'', template: document.getElementById('ang-template')?.value||'', best_for: document.getElementById('ang-best')?.value||'' };
  try {
    await fetch(`${API_BASE}/activation-angle`, { method: 'POST', headers: hdrs(), body: JSON.stringify(payload) });
    closeAngleModal(); showToast('Angle saved'); renderAngles();
  } catch(e) { showToast('Error: ' + e.message); }
}

function openEventModal() { document.getElementById('event-modal').classList.add('open'); }
function closeEventModal() { document.getElementById('event-modal').classList.remove('open'); }
async function saveEvent() {
  const name = document.getElementById('evt-name')?.value?.trim();
  if (!name) { showToast('Name is required'); return; }
  const payload = { event_name: name, event_type: document.getElementById('evt-type')?.value||'Hosting', venture: document.getElementById('evt-venue')?.value||'', date: document.getElementById('evt-date')?.value||null, status: document.getElementById('evt-status')?.value||'Planning', description: document.getElementById('evt-desc')?.value||'' };
  try {
    await fetch(`${API_BASE}/event`, { method: 'POST', headers: hdrs(), body: JSON.stringify(payload) });
    closeEventModal(); showToast('Event created');
    if (document.getElementById('page-events').style.display !== 'none') renderEvents();
  } catch(e) { showToast('Error: ' + e.message); }
}

function openContentDrawer(content) {
  const d = document.getElementById('content-drawer');
  const o = document.getElementById('content-drawer-overlay');
  document.getElementById('content-drawer-title').textContent = content.content_name || 'Content';
  const sub = document.getElementById('content-drawer-sub');
  const syncClass = { Pending: 'sync-pending', Synced: 'sync-synced', 'Needs Update': 'sync-needs-update' };
  sub.innerHTML = [
    content.content_type ? `<span class="type-badge">${content.content_type}</span>` : '',
    content.status ? `<span class="content-status-badge cs-${(content.status||'').toLowerCase().replace(/\s+/g,'-')}">${content.status}</span>` : '',
    content.prismm_sync ? `<span class="sync-badge ${syncClass[content.prismm_sync]||'sync-none'}">${content.prismm_sync}</span>` : '',
  ].filter(Boolean).join('');
  const body = document.getElementById('content-drawer-body');
  const sections = [['Venture', content.venture], ['Initiative Tags', content.initiative_tags], ['Activation Angle', content.activation_angle], ['Asset Link', content.asset_link ? `<a href="${content.asset_link}" target="_blank">${content.asset_link}</a>` : ''], ['Notes', content.notes]];
  body.innerHTML = sections.filter(([,v]) => v).map(([k,v]) => `<div class="content-detail-section"><div class="content-detail-label">${k}</div><div class="content-detail-value">${v}</div></div>`).join('');
  d.classList.add('open'); o.classList.add('open');
}
function closeContentDrawer() { document.getElementById('content-drawer')?.classList.remove('open'); document.getElementById('content-drawer-overlay')?.classList.remove('open'); }

let allContent = [];
async function renderContent() {
  if (!allContent.length) {
    try { const r = await fetch(`${API_BASE}/content`, { headers: hdrs() }); const d = await r.json(); allContent = d.data || []; } catch(e) { allContent = []; }
  }
  const q = (document.getElementById('content-search')?.value||'').toLowerCase();
  const v = document.getElementById('content-venture')?.value||'';
  const t = document.getElementById('content-type')?.value||'';
  const s = document.getElementById('content-sync')?.value||'';
  let data = allContent;
  if (q) data = data.filter(c => (c.content_name||'').toLowerCase().includes(q)||(c.activation_angle||'').toLowerCase().includes(q));
  if (v) data = data.filter(c => c.venture === v);
  if (t) data = data.filter(c => c.content_type === t);
  if (s) data = data.filter(c => c.prismm_sync === s);
  const grid = document.getElementById('content-grid');
  if (!grid) return;
  if (!data.length) { grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No assets yet</h3><p>Add your first asset.</p></div>'; return; }
  const syncClass = { Pending: 'sync-pending', Synced: 'sync-synced', 'Needs Update': 'sync-needs-update' };
  grid.innerHTML = data.map(c => `
    <div class="content-card prismm-sync-${(c.prismm_sync||'').toLowerCase().replace(/\s+/g,'-')}" onclick="openContentDrawer(${JSON.stringify(c).replace(/"/g,'&quot;')})">
      <div class="content-card-top">
        <div><div class="content-card-meta">${c.venture||''}${c.content_type?' · '+c.content_type:''}</div><div class="content-card-name">${c.content_name}</div></div>
        <span class="content-status-badge cs-${(c.status||'idea').toLowerCase().replace(/\s+/g,'-')}">${c.status||'Idea'}</span>
      </div>
      ${c.activation_angle ? `<div class="content-card-angle">${c.activation_angle}</div>` : ''}
      <div class="content-card-footer">
        ${c.prismm_sync ? `<span class="sync-badge ${syncClass[c.prismm_sync]||'sync-none'}">${c.prismm_sync}</span>` : ''}
        ${c.initiative_tags ? `<span class="type-badge">${c.initiative_tags}</span>` : ''}
      </div>
    </div>`).join('');
}

let currentEventType = 'Hosting';
async function switchEventsTab(type) {
  currentEventType = type;
  ['Hosting','Attending','Workshop'].forEach(t => {
    const tab = document.getElementById(`etab-${t.toLowerCase()}`);
    if (tab) tab.classList.toggle('active', t === type);
  });
  renderEvents();
}

async function renderEvents() {
  const grid = document.getElementById('events-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div>Loading events...</div>';
  try {
    const r = await fetch(`${API_BASE}/events?type=${encodeURIComponent(currentEventType)}`, { headers: hdrs() });
    const d = await r.json();
    const events = d.data || [];
    if (!events.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>No events yet</h3><p>Create your first event.</p></div>';
      return;
    }
    grid.innerHTML = events.map(e => {
      const statusCls = { Planning: 'es-planning', Confirmed: 'es-confirmed', Complete: 'es-complete', Cancelled: 'es-cancelled' };
      return `<div class="event-card ${statusCls[e.status]||'es-planning'}" onclick="showToast('Event detail coming soon')">
        <div class="event-card-top"><div><div class="event-card-meta">${e.venture||''}</div><div class="event-card-name">${e.event_name}</div></div>
        <span class="event-status-badge evs-${(e.status||'planning').toLowerCase()}">${e.status||'Planning'}</span></div>
        ${e.date ? `<div class="event-card-date">&#128197; ${new Date(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` : ''}
        <div class="event-card-footer"></div>
      </div>`;
    }).join('');
  } catch(e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Error loading events</h3><p>${e.message}</p></div>`;
  }
}

loadBoard();
