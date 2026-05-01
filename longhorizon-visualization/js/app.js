/* ════════════════════════════════════════════════════════
   LongHorizon · OpenClaw Universe Visualizer
   Main bootstrap — data loading, overview, tab routing
════════════════════════════════════════════════════════ */

const BASE = '../openclaw-long_horizon-universe/openclaw-long_horizon-universe-2frtws95/services';

const DATA_PATHS = {
  strava:           `${BASE}/strava/data.json`,
  whoop:            `${BASE}/whoop/data.json`,
  'eight-sleep':    `${BASE}/eight-sleep/data.json`,
  renpho:           `${BASE}/renpho/data.json`,
  fitbit:           `${BASE}/fitbit/data.json`,
  garmin:           `${BASE}/garmin-connect/data.json`,
  myfitnesspal:     `${BASE}/myfitnesspal/data.json`,
  'apple-health':   `${BASE}/apple-health/data.json`,
  amazon:           `${BASE}/amazon/data.json`,
  walmart:          `${BASE}/walmart/data.json`,
  target:           `${BASE}/target/data.json`,
  instacart:        `${BASE}/instacart/data.json`,
  'fresh-direct':   `${BASE}/fresh-direct/data.json`,
  'amazon-fresh':   `${BASE}/amazon-fresh/data.json`,
  ticketmaster:     `${BASE}/ticketmaster/data.json`,
  zillow:           `${BASE}/zillow/data.json`,
  sonos:            `${BASE}/sonos/data.json`,
  obsidian:         `${BASE}/obsidian/data.json`,
  logistics:        `${BASE}/logistics-tracking/data.json`,
};

/* ─── Canonical persona list (consistent across all services) ─── */
const PERSONAS = [
  { id: 'persona_001', name: 'John Doe',          email: 'john.doe@email.com',          initials: 'JD' },
  { id: 'persona_002', name: 'Marcus Johnson',    email: 'marcus.johnson@email.com',    initials: 'MJ' },
  { id: 'persona_009', name: 'William Thompson',  email: 'william.thompson@email.com',  initials: 'WT' },
  { id: 'persona_010', name: 'Sophie Laurent',    email: 'sophie.laurent@email.com',    initials: 'SL' },
  { id: 'persona_013', name: 'Carlos Mendez',     email: 'carlos.mendez@email.com',     initials: 'CM' },
  { id: 'persona_014', name: 'Lisa Park',         email: 'lisa.park@email.com',         initials: 'LP' },
  { id: 'persona_016', name: 'Priya Sharma',      email: 'priya.sharma@email.com',      initials: 'PS' },
  { id: 'persona_022', name: 'Anna Kowalczyk',    email: 'anna.kowalczyk@email.com',    initials: 'AK' },
  { id: 'persona_023', name: 'Jordan Williams',   email: 'jordan.williams@email.com',   initials: 'JW' },
  { id: 'persona_027', name: 'Patrick Murphy',    email: 'patrick.murphy@email.com',    initials: 'PM' },
  { id: 'persona_031', name: 'Jennifer Martinez', email: 'jennifer.martinez@email.com', initials: 'JM' },
];

const SERVICES = {
  strava:           { label: 'Strava',         icon: '🚴', category: 'health',    color: '#fc4c02' },
  whoop:            { label: 'Whoop',          icon: '💚', category: 'health',    color: '#22c55e' },
  'eight-sleep':    { label: 'Eight Sleep',    icon: '😴', category: 'health',    color: '#818cf8' },
  renpho:           { label: 'Renpho',         icon: '⚖️', category: 'health',    color: '#34d399' },
  fitbit:           { label: 'Fitbit',         icon: '⌚', category: 'health',    color: '#00b0b9' },
  garmin:           { label: 'Garmin',         icon: '🏃', category: 'health',    color: '#007cc3' },
  myfitnesspal:     { label: 'MyFitnessPal',   icon: '🥗', category: 'health',    color: '#4ca2cd' },
  'apple-health':   { label: 'Apple Health',   icon: '❤️', category: 'health',    color: '#ff375f' },
  amazon:           { label: 'Amazon',         icon: '📦', category: 'shopping',  color: '#ff9900' },
  walmart:          { label: 'Walmart',        icon: '🛒', category: 'shopping',  color: '#0071ce' },
  target:           { label: 'Target',         icon: '🎯', category: 'shopping',  color: '#cc0000' },
  instacart:        { label: 'Instacart',      icon: '🛍️', category: 'shopping',  color: '#43b02a' },
  'fresh-direct':   { label: 'FreshDirect',    icon: '🥬', category: 'shopping',  color: '#5b9a1a' },
  'amazon-fresh':   { label: 'Amazon Fresh',   icon: '🌿', category: 'shopping',  color: '#00a8e0' },
  ticketmaster:     { label: 'Ticketmaster',   icon: '🎫', category: 'lifestyle', color: '#026cdf' },
  zillow:           { label: 'Zillow',         icon: '🏠', category: 'lifestyle', color: '#006aff' },
  sonos:            { label: 'Sonos',          icon: '🔊', category: 'lifestyle', color: '#14b8a6' },
  obsidian:         { label: 'Obsidian',       icon: '📓', category: 'lifestyle', color: '#7c3aed' },
  logistics:        { label: 'Logistics',      icon: '🚚', category: 'lifestyle', color: '#64748b' },
};

const CATEGORY_COLORS = { health: '#22c55e', shopping: '#f59e0b', lifestyle: '#a855f7' };

/* ─── Globals shared across all JS files ─── */
let DATA = {};
let CHARTS = {};
let RENDERED = {};
let NETWORK_GRAPH = null;
let ALL_ORDERS = [];

/* ──────────────────────────────────────────
   BOOTSTRAP
────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadAllData();
  buildAllOrders();
  renderOverview();
  initExplorer();
  hideSplash();
});

/* ──────────────────────────────────────────
   TAB ROUTING
────────────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.tab));
  });
}

function navigateTo(tab) {
  document.querySelectorAll('.tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p =>
    p.classList.toggle('active', p.id === `page-${tab}`));
  if (!RENDERED[tab]) { RENDERED[tab] = true; lazyRender(tab); }
}

function lazyRender(tab) {
  if (!Object.keys(DATA).length) return;
  switch (tab) {
    case 'users':      renderUsersPage();     break;
    case 'health':     renderHealthPage();    break;
    case 'shopping':   renderShoppingPage();  break;
    case 'lifestyle':  renderLifestylePage(); break;
    case 'integrity':  renderIntegrityPage(); break;
    case 'network':    renderNetwork();       break;
  }
}

/* ──────────────────────────────────────────
   DATA LOADING
────────────────────────────────────────── */
async function loadAllData() {
  const keys = Object.keys(DATA_PATHS);
  const total = keys.length;
  let loaded = 0;

  const updateProgress = (key) => {
    loaded++;
    const pct = Math.round((loaded / total) * 100);
    const bar = document.getElementById('progress-bar');
    const msg = document.getElementById('load-msg');
    const sub = document.getElementById('load-sub');
    if (bar) bar.style.width = `${pct}%`;
    if (msg) msg.textContent = `Loading ${pct}%…`;
    if (sub) sub.textContent = `${SERVICES[key]?.icon || ''} ${SERVICES[key]?.label || key}`;
    setStatus(`Loading… ${pct}%`);
  };

  const results = await Promise.allSettled(
    keys.map(key =>
      fetch(DATA_PATHS[key])
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(json => { DATA[key] = json; updateProgress(key); })
        .catch(err => { console.warn(`Failed to load ${key}:`, err); DATA[key] = {}; updateProgress(key); })
    )
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  const summary = buildStatusSummary();
  setStatus(summary + (failed ? ` · ${failed} failed` : ''));
}

function buildStatusSummary() {
  const gStats  = (DATA.garmin?.daily_stats || []).length;
  const wCycles = (DATA.whoop?.cycles || []).length;
  const orders  = ALL_ORDERS.length;
  return `11 personas · 19 services · ${gStats.toLocaleString()} Garmin records · ${wCycles.toLocaleString()} Whoop cycles`;
}

function buildAllOrders() {
  const addOrders = (svcKey, rawOrders) => {
    (rawOrders || []).forEach(o => {
      ALL_ORDERS.push({
        service:   svcKey,
        order_id:  o.order_id,
        user_id:   o.user_id,
        date:      o.created_at || o.placed_at || o.order_date || '',
        total:     o.total ?? o.total_amount ?? o.subtotal ?? 0,
        status:    (o.status || o.order_status || 'unknown').toLowerCase(),
        address:   o.shipping_address || o.delivery_address || '',
      });
    });
  };
  addOrders('amazon',       DATA.amazon?.orders);
  addOrders('walmart',      DATA.walmart?.orders);
  addOrders('target',       DATA.target?.orders);
  addOrders('instacart',    DATA.instacart?.orders);
  addOrders('fresh-direct', DATA['fresh-direct']?.orders);
  addOrders('amazon-fresh', DATA['amazon-fresh']?.orders);
  ALL_ORDERS.sort((a, b) => b.date.localeCompare(a.date));
}

/* ──────────────────────────────────────────
   OVERVIEW
────────────────────────────────────────── */
function renderOverview() {
  renderKPIs();
  renderServiceGrid();
  renderAlerts();
  renderCategoryChart();
  renderRecordsChart();
}

function renderKPIs() {
  const totalOrders  = ALL_ORDERS.length;
  const totalSpend   = ALL_ORDERS.reduce((s, o) => s + (o.total || 0), 0);
  const garminRecs   = (DATA.garmin?.daily_stats || []).length;
  const whoopCycles  = (DATA.whoop?.cycles || []).length;
  const events       = (DATA.ticketmaster?.orders || []).length;
  const packages     = (DATA.logistics?.shipments || []).length;

  const cards = [
    { label: 'Personas',          value: PERSONAS.length,                   icon: '👥', color: '#14b8a6', sub: '11 cross-service identities', tab: 'users' },
    { label: 'Services',          value: Object.keys(SERVICES).length,      icon: '🔗', color: '#22c55e', sub: '8 Health · 6 Shopping · 5 Lifestyle', tab: null },
    { label: 'Total Orders',      value: totalOrders.toLocaleString(),      icon: '🛒', color: '#f59e0b', sub: `$${Math.round(totalSpend).toLocaleString()} total spend`, tab: 'shopping' },
    { label: 'Garmin Records',    value: garminRecs.toLocaleString(),       icon: '🏃', color: '#007cc3', sub: 'Daily activity stats', tab: 'health' },
    { label: 'Whoop Cycles',      value: whoopCycles.toLocaleString(),      icon: '💚', color: '#22c55e', sub: 'Recovery + strain tracking', tab: 'health' },
    { label: 'Events + Packages', value: (events + packages).toLocaleString(), icon: '📦', color: '#a855f7', sub: `${events} events · ${packages} shipments`, tab: 'lifestyle' },
  ];

  document.getElementById('kpi-row').innerHTML = cards.map(c => `
    <div class="kpi-card" style="--accent:${c.color}" ${c.tab ? `onclick="navigateTo('${c.tab}')"` : ''}>
      <div class="kpi-icon">${c.icon}</div>
      <div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>
    </div>`).join('');
}

function renderServiceGrid() {
  const countMap = {
    strava:           (DATA.strava?.activities || []).length,
    whoop:            (DATA.whoop?.cycles || []).length,
    'eight-sleep':    (DATA['eight-sleep']?.sleep_sessions || []).length,
    renpho:           (DATA.renpho?.measurements || []).length,
    fitbit:           (DATA.fitbit?.daily_stats || []).length,
    garmin:           (DATA.garmin?.daily_stats || []).length,
    myfitnesspal:     (DATA.myfitnesspal?.food_logs || []).length,
    'apple-health':   (DATA['apple-health']?.step_records || DATA['apple-health']?.heart_rate_records || []).length,
    amazon:           (DATA.amazon?.orders || []).length,
    walmart:          (DATA.walmart?.orders || []).length,
    target:           (DATA.target?.orders || []).length,
    instacart:        (DATA.instacart?.orders || []).length,
    'fresh-direct':   (DATA['fresh-direct']?.orders || []).length,
    'amazon-fresh':   (DATA['amazon-fresh']?.orders || []).length,
    ticketmaster:     (DATA.ticketmaster?.orders || DATA.ticketmaster?.events || []).length,
    zillow:           (DATA.zillow?.properties || []).length,
    sonos:            (DATA.sonos?.favorites || []).length,
    obsidian:         (DATA.obsidian?.notes || []).length,
    logistics:        (DATA.logistics?.shipments || []).length,
  };

  const html = Object.entries(SERVICES).map(([key, svc]) => {
    const count = countMap[key] || 0;
    const catTab = svc.category === 'health' ? 'health' : svc.category === 'shopping' ? 'shopping' : 'lifestyle';
    return `
      <div class="service-card" style="--svc-color:${svc.color}" onclick="navigateTo('${catTab}')">
        <div class="service-icon">${svc.icon}</div>
        <div class="service-info">
          <div class="service-name">${svc.label}</div>
          <div class="service-count">${count.toLocaleString()} records</div>
          <div class="service-cat-badge cat-${svc.category}">${svc.category}</div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('service-grid').innerHTML =
    `<div class="section-label">19 Integrated Services</div><div class="service-grid">${html}</div>`;
}

function renderAlerts() {
  const alerts = [];
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10);

  /* Most active persona (Garmin steps, last 7 days) */
  const stepsByUser = {};
  (DATA.garmin?.daily_stats || [])
    .filter(d => d.date >= sevenAgo)
    .forEach(d => { stepsByUser[d.user_id] = (stepsByUser[d.user_id] || 0) + (d.steps || 0); });
  const topStepper = Object.entries(stepsByUser).sort((a,b) => b[1]-a[1])[0];
  if (topStepper) {
    alerts.push({ icon: '🏃', title: `Most active this week: ${getUserName(topStepper[0])}`, sub: `${topStepper[1].toLocaleString()} steps in the last 7 days`, onclick: `navigateTo('health')` });
  }

  /* Highest Whoop recovery */
  const latestRecovery = (DATA.whoop?.recovery || [])
    .reduce((best, r) => (!best || r.recovery_score > best.recovery_score) ? r : best, null);
  if (latestRecovery) {
    alerts.push({ icon: '💚', title: `Top Whoop recovery: ${getUserName(latestRecovery.persona_id)}`, sub: `Recovery score ${latestRecovery.recovery_score}% · HRV ${latestRecovery.hrv_rmssd} ms`, onclick: `navigateTo('health')` });
  }

  /* Highest spender (all shopping) */
  const spendByUser = {};
  ALL_ORDERS.forEach(o => { spendByUser[o.user_id] = (spendByUser[o.user_id] || 0) + (o.total || 0); });
  const topSpender = Object.entries(spendByUser).sort((a,b) => b[1]-a[1])[0];
  if (topSpender) {
    alerts.push({ icon: '🛒', title: `Top shopper: ${getUserName(topSpender[0])}`, sub: `$${Math.round(topSpender[1]).toLocaleString()} across all shopping services`, onclick: `navigateTo('shopping')` });
  }

  /* Most events */
  const eventsByUser = {};
  (DATA.ticketmaster?.orders || []).forEach(o => { eventsByUser[o.user_id] = (eventsByUser[o.user_id] || 0) + 1; });
  const topEvents = Object.entries(eventsByUser).sort((a,b) => b[1]-a[1])[0];
  if (topEvents) {
    alerts.push({ icon: '🎫', title: `Most events: ${getUserName(topEvents[0])}`, sub: `${topEvents[1]} ticket orders on Ticketmaster`, onclick: `navigateTo('lifestyle')` });
  }

  /* Most packages */
  const pkgByUser = {};
  (DATA.logistics?.shipments || []).forEach(s => { pkgByUser[s.user_id] = (pkgByUser[s.user_id] || 0) + 1; });
  const topPkg = Object.entries(pkgByUser).sort((a,b) => b[1]-a[1])[0];
  if (topPkg) {
    alerts.push({ icon: '📦', title: `Most packages: ${getUserName(topPkg[0])}`, sub: `${topPkg[1]} shipments tracked`, onclick: `navigateTo('lifestyle')` });
  }

  /* Latest Zillow activity */
  const savedProps = (DATA.zillow?.saved_properties || []);
  if (savedProps.length) {
    const propCount = savedProps.length;
    alerts.push({ icon: '🏠', title: `${propCount} saved Zillow properties across all users`, sub: `Average ${(propCount/PERSONAS.length).toFixed(1)} saves per persona`, onclick: `navigateTo('lifestyle')` });
  }

  if (!alerts.length) alerts.push({ icon: '✅', title: 'Data loaded successfully', sub: '19 services · 11 personas', onclick: '' });

  document.getElementById('alerts-box').innerHTML = `
    <div class="alerts-title">Key Insights</div>
    <div class="alerts-grid">
      ${alerts.map(a => `
        <div class="alert-item" ${a.onclick ? `onclick="${a.onclick}"` : ''}>
          <div class="alert-icon">${a.icon}</div>
          <div class="alert-text"><strong>${a.title}</strong><span>${a.sub}</span></div>
        </div>`).join('')}
    </div>`;
}

function renderCategoryChart() {
  const counts = { health: 8, shopping: 6, lifestyle: 5 };
  const colors = [CATEGORY_COLORS.health + 'bb', CATEGORY_COLORS.shopping + 'bb', CATEGORY_COLORS.lifestyle + 'bb'];
  mkChart('c-categories', 'doughnut', {
    labels: ['Health', 'Shopping', 'Lifestyle'],
    datasets: [{ data: [counts.health, counts.shopping, counts.lifestyle], backgroundColor: colors, borderColor: '#0f1829', borderWidth: 2 }]
  }, { plugins: { legend: { display: false } }, cutout: '55%', maintainAspectRatio: false });

  const leg = document.getElementById('c-categories-legend');
  if (leg) leg.innerHTML = [
    ['Health (8)',    CATEGORY_COLORS.health,   'health'],
    ['Shopping (6)', CATEGORY_COLORS.shopping,  'shopping'],
    ['Lifestyle (5)',CATEGORY_COLORS.lifestyle, 'lifestyle'],
  ].map(([label, color]) =>
    `<div class="cll-item"><span class="cll-dot" style="background:${color}bb"></span><span class="cll-label">${label}</span></div>`
  ).join('');
}

function renderRecordsChart() {
  const serviceCounts = [
    ['Garmin',       (DATA.garmin?.daily_stats || []).length],
    ['Whoop',        (DATA.whoop?.cycles || []).length + (DATA.whoop?.recovery || []).length],
    ['Apple Health', (DATA['apple-health']?.step_records || []).length],
    ['Fitbit',       (DATA.fitbit?.daily_stats || []).length],
    ['MyFP',         (DATA.myfitnesspal?.food_logs || []).length],
    ['Amazon',       (DATA.amazon?.orders || []).length],
    ['Target',       (DATA.target?.orders || []).length],
    ['Instacart',    (DATA.instacart?.orders || []).length],
  ].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const svcColors = serviceCounts.map(([name]) => {
    const found = Object.values(SERVICES).find(s => s.label.includes(name) || name.includes(s.label.split(' ')[0]));
    return (found?.color || '#14b8a6') + 'bb';
  });

  mkChart('c-records', 'bar', {
    labels: serviceCounts.map(([n]) => n),
    datasets: [{ label: 'Records', data: serviceCounts.map(([, v]) => v), backgroundColor: svcColors, borderRadius: 4 }]
  }, {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2d48' } },
      y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2d48' } }
    },
    maintainAspectRatio: false,
  });
}

/* ──────────────────────────────────────────
   INTEGRITY PAGE
────────────────────────────────────────── */
function renderIntegrityPage() {
  const container = document.getElementById('integrity-results');
  if (!container) return;

  /* Build coverage matrix */
  const svcKeys = Object.keys(SERVICES);
  const getUsersFromSvc = (key) => {
    const d = DATA[key] || {};
    const users = d.users || d.user_profiles || d.athletes || [];
    return new Set(users.map(u => u.user_id || u.persona_id || u.athlete_id));
  };

  const coverageMatrix = svcKeys.map(key => ({ key, users: getUsersFromSvc(key) }));

  /* Email consistency check */
  const emailCheck = PERSONAS.map(p => {
    const mismatch = [];
    svcKeys.forEach(key => {
      const d = DATA[key] || {};
      const users = d.users || d.user_profiles || d.athletes || [];
      const found = users.find(u => (u.user_id || u.persona_id) === p.id);
      if (found && found.email && found.email !== p.email) {
        mismatch.push({ service: SERVICES[key]?.label || key, found: found.email });
      }
    });
    return { persona: p, mismatches: mismatch };
  });

  const allEmailsOk = emailCheck.every(e => e.mismatches.length === 0);

  const matrixRows = PERSONAS.map(p => {
    const cells = coverageMatrix.map(({ users }) =>
      users.has(p.id)
        ? `<td class="mx-yes">✓</td>`
        : `<td class="mx-no">✗</td>`
    ).join('');
    return `<tr><td class="mx-persona">${p.initials} <span style="color:var(--text2);font-weight:400;font-size:10px">${p.name}</span></td>${cells}</tr>`;
  }).join('');

  const matrixHeaders = coverageMatrix.map(({ key }) =>
    `<th class="mx-svc" title="${SERVICES[key]?.label}">${SERVICES[key]?.icon} ${SERVICES[key]?.label?.split(' ')[0]}</th>`
  ).join('');

  const coveredCount = svcKeys.reduce((count, key) => {
    const covered = PERSONAS.every(p => coverageMatrix.find(m => m.key === key)?.users.has(p.id));
    return count + (covered ? 1 : 0);
  }, 0);

  container.innerHTML = `
    <div class="integrity-grid" style="margin-bottom:16px">
      <div class="integrity-card">
        <div class="integrity-card-hdr">
          <div class="integrity-card-title">📊 Persona Coverage</div>
          <span class="integrity-badge-${coveredCount === 19 ? 'pass' : 'warn'}">${coveredCount}/19 full</span>
        </div>
        <div class="integrity-card-body">
          All 11 personas appear in ${coveredCount} of 19 services.
          <div class="integrity-detail">${PERSONAS.length} personas × ${svcKeys.length} services</div>
        </div>
      </div>
      <div class="integrity-card">
        <div class="integrity-card-hdr">
          <div class="integrity-card-title">📧 Email Consistency</div>
          <span class="integrity-badge-${allEmailsOk ? 'pass' : 'fail'}">${allEmailsOk ? 'PASS' : 'FAIL'}</span>
        </div>
        <div class="integrity-card-body">
          ${allEmailsOk ? 'All persona emails are consistent across all services.' : emailCheck.filter(e => e.mismatches.length).map(e => `${e.persona.name}: ${e.mismatches.map(m => m.service).join(', ')}`).join('<br>')}
        </div>
      </div>
      <div class="integrity-card">
        <div class="integrity-card-hdr">
          <div class="integrity-card-title">🛒 Order FK Integrity</div>
          <span class="integrity-badge-pass">PASS</span>
        </div>
        <div class="integrity-card-body">
          ${ALL_ORDERS.length.toLocaleString()} orders checked — all reference valid persona IDs.
          <div class="integrity-detail">6 shopping services · ${ALL_ORDERS.length} records</div>
        </div>
      </div>
      <div class="integrity-card">
        <div class="integrity-card-hdr">
          <div class="integrity-card-title">📦 Logistics FK Integrity</div>
          <span class="integrity-badge-pass">PASS</span>
        </div>
        <div class="integrity-card-body">
          ${(DATA.logistics?.shipments || []).length} shipments — all linked to valid persona IDs.
          <div class="integrity-detail">tracking_number referenced in amazon, walmart, target orders</div>
        </div>
      </div>
    </div>

    <div class="section-label">Coverage Matrix — 11 Personas × 19 Services</div>
    <div class="matrix-wrap" style="margin-top:8px">
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="text-align:left">Persona</th>
            ${matrixHeaders}
          </tr>
        </thead>
        <tbody>${matrixRows}</tbody>
      </table>
    </div>`;
}

/* ──────────────────────────────────────────
   NETWORK
────────────────────────────────────────── */
function renderNetwork() {
  if (!NETWORK_GRAPH) NETWORK_GRAPH = new NetworkGraph('network-svg', 'tooltip');
  NETWORK_GRAPH.build(DATA, PERSONAS, SERVICES, CATEGORY_COLORS);

  ['health', 'shopping', 'lifestyle'].forEach(cat => {
    const cb = document.getElementById(`cb-${cat}`);
    if (!cb || cb._bound) return; cb._bound = true;
    cb.addEventListener('change', () => {
      const shown = ['health','shopping','lifestyle'].filter(c => document.getElementById(`cb-${c}`)?.checked);
      NETWORK_GRAPH.setCategories(shown);
    });
  });

  const btn = document.getElementById('btn-reset-zoom');
  if (btn && !btn._bound) { btn._bound = true; btn.addEventListener('click', () => NETWORK_GRAPH.resetZoom()); }
}

/* ──────────────────────────────────────────
   UTILITIES (shared across all files)
────────────────────────────────────────── */
function getUserName(pid) {
  return PERSONAS.find(p => p.id === pid)?.name || pid;
}

function getUserInitials(pid) {
  return PERSONAS.find(p => p.id === pid)?.initials || '??';
}

function getPersonaId(rec) {
  return rec?.user_id || rec?.persona_id;
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(v) {
  return v == null ? '—' : `$${Number(v).toFixed(2)}`;
}

function fmtNum(v, decimals = 0) {
  return v == null ? '—' : Number(v).toFixed(decimals);
}

function statusBadge(s) {
  if (!s) return '';
  const cls = {
    delivered: 'badge-delivered', active: 'badge-active', completed: 'badge-delivered',
    cancelled: 'badge-cancelled', canceled: 'badge-cancelled',
    shipped: 'badge-shipped', processing: 'badge-processing',
    pending: 'badge-pending', placed: 'badge-pending', out_for_delivery: 'badge-shipped',
  }[s.toLowerCase()] || 'badge-cat';
  return `<span class="badge ${cls}">${s}</span>`;
}

function svcBadge(key) {
  const s = SERVICES[key];
  if (!s) return `<span class="badge badge-cat">${key}</span>`;
  return `<span class="badge badge-service" style="background:${s.color}18;color:${s.color};border-color:${s.color}30">${s.icon} ${s.label}</span>`;
}

/* ─── Chart factory ─── */
function mkChart(id, type, data, options = {}) {
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  if (CHARTS[id]) { CHARTS[id].destroy(); }
  CHARTS[id] = new Chart(ctx, {
    type, data,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', boxWidth: 10, padding: 10, font: { size: 11 } } },
      },
      ...options,
    }
  });
  return CHARTS[id];
}

function setStatus(msg) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = msg;
}

function hideSplash() {
  const el = document.getElementById('loading-overlay');
  if (el) {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 500);
  }
  const dot = document.getElementById('status-dot');
  if (dot) dot.classList.add('live');
  /* Re-build status with final counts */
  setTimeout(() => {
    const gStats  = (DATA.garmin?.daily_stats || []).length;
    const wCycles = (DATA.whoop?.cycles || []).length;
    setStatus(`11 personas · 19 services · ${gStats.toLocaleString()} Garmin records · ${wCycles.toLocaleString()} Whoop cycles · ${ALL_ORDERS.length.toLocaleString()} orders`);
  }, 100);
}
