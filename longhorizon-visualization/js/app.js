/* ════════════════════════════════════════════════════
   LongHorizon · OpenClaw Universe Visualizer
   Persona-first view of 19 integrated services
════════════════════════════════════════════════════ */

const BASE = '../openclaw-long_horizon-universe/openclaw-long_horizon-universe-2frtws95/services';

const DATA_PATHS = {
  strava:         `${BASE}/strava/data.json`,
  whoop:          `${BASE}/whoop/data.json`,
  'eight-sleep':  `${BASE}/eight-sleep/data.json`,
  renpho:         `${BASE}/renpho/data.json`,
  fitbit:         `${BASE}/fitbit/data.json`,
  garmin:         `${BASE}/garmin-connect/data.json`,
  myfitnesspal:   `${BASE}/myfitnesspal/data.json`,
  'apple-health': `${BASE}/apple-health/data.json`,
  amazon:         `${BASE}/amazon/data.json`,
  walmart:        `${BASE}/walmart/data.json`,
  target:         `${BASE}/target/data.json`,
  instacart:      `${BASE}/instacart/data.json`,
  'fresh-direct': `${BASE}/fresh-direct/data.json`,
  'amazon-fresh': `${BASE}/amazon-fresh/data.json`,
  ticketmaster:   `${BASE}/ticketmaster/data.json`,
  zillow:         `${BASE}/zillow/data.json`,
  sonos:          `${BASE}/sonos/data.json`,
  obsidian:       `${BASE}/obsidian/data.json`,
  logistics:      `${BASE}/logistics-tracking/data.json`,
};

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

let D = {}; // all loaded service data

/* ════════════════════════════════════════════════════
   BOOTSTRAP
════════════════════════════════════════════════════ */
/* Global navigation — called directly from onclick attributes */
window.lhNav = function(pid) {
  if (!pid) { renderList(); return; }
  try {
    renderDetail(pid);
  } catch (err) {
    document.getElementById('view').innerHTML =
      '<div style="padding:24px;color:#f87171;font-size:13px">' +
      '<b>Error rendering persona:</b> ' + err.message +
      '<pre style="margin-top:10px;font-size:11px;color:#94a3b8">' + (err.stack||'') + '</pre>' +
      '<button onclick="renderList()" style="margin-top:12px;padding:8px 16px;cursor:pointer">← Back</button>' +
      '</div>';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  hideSplash();
  renderList();
});

/* ════════════════════════════════════════════════════
   DATA LOADING
════════════════════════════════════════════════════ */
async function loadData() {
  const keys = Object.keys(DATA_PATHS);
  let done = 0;
  await Promise.all(keys.map(key =>
    fetch(DATA_PATHS[key])
      .then(r => r.ok ? r.json() : {})
      .then(json => { D[key] = json; })
      .catch(() => { D[key] = {}; })
      .finally(() => {
        done++;
        const pct = Math.round(done / keys.length * 100);
        const bar = document.getElementById('progress-bar');
        const msg = document.getElementById('load-msg');
        if (bar) bar.style.width = pct + '%';
        if (msg) msg.textContent = 'Loading… ' + pct + '%';
      })
  ));
}

function hideSplash() {
  const el = document.getElementById('loading-overlay');
  if (el) { el.classList.add('hidden'); setTimeout(() => el.remove(), 500); }
  const dot = document.getElementById('status-dot');
  if (dot) dot.classList.add('live');
  setStatus(PERSONAS.length + ' personas · 19 services loaded');
}

function setStatus(t) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = t;
}

/* ════════════════════════════════════════════════════
   LIST VIEW
════════════════════════════════════════════════════ */
function renderList() {
  const totalOrders = PERSONAS.reduce((s, p) => s + personaOrders(p.id).length, 0);
  const garminDays  = (D.garmin?.daily_stats || []).length;

  const cards = PERSONAS.map(p => {
    const orders = personaOrders(p.id).length;
    const garmin = (D.garmin?.daily_stats || []).filter(d => d.user_id === p.id).length;
    const whoop  = (D.whoop?.cycles || []).filter(c => c.persona_id === p.id).length;
    return '<div class="persona-card" onclick="lhNav(\'' + p.id + '\')" style="cursor:pointer">' +
      '<div class="persona-card-top">' +
        '<div class="avatar">' + p.initials + '</div>' +
        '<div>' +
          '<div class="persona-name">' + p.name + '</div>' +
          '<div class="persona-email">' + p.email + '</div>' +
          '<div class="persona-id">' + p.id + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="persona-stats">' +
        '<span class="ps">' + orders + ' orders</span>' +
        '<span class="ps">' + garmin + ' Garmin days</span>' +
        '<span class="ps">' + whoop + ' Whoop cycles</span>' +
      '</div>' +
    '</div>';
  }).join('');

  view(
    '<div class="list-header">' +
      '<h2>LongHorizon Personas</h2>' +
      '<p>11 personas across 19 integrated services — click any card for the full data view</p>' +
    '</div>' +
    '<div class="stats-row">' +
      '<span class="stat-pill"><strong>11</strong> Personas</span>' +
      '<span class="stat-pill"><strong>' + totalOrders.toLocaleString() + '</strong> Total Orders</span>' +
      '<span class="stat-pill"><strong>' + garminDays.toLocaleString() + '</strong> Garmin Days</span>' +
      '<span class="stat-pill"><strong>19</strong> Services</span>' +
    '</div>' +
    '<div class="persona-grid">' + cards + '</div>'
  );
}

/* ════════════════════════════════════════════════════
   DETAIL VIEW
════════════════════════════════════════════════════ */
function renderDetail(pid) {
  const p = PERSONAS.find(x => x.id === pid);
  if (!p) { renderList(); return; }

  view(
    '<div class="detail-back" onclick="lhNav(null)">← All Personas</div>' +
    '<div class="detail-hero">' +
      '<div class="hero-avatar">' + p.initials + '</div>' +
      '<div>' +
        '<div class="hero-name">' + p.name + '</div>' +
        '<div class="hero-email">' + p.email + '</div>' +
        '<div class="hero-id">' + p.id + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="cat-section">' +
      '<div class="cat-heading"><span class="cat-dot" style="background:#22c55e"></span>Health &amp; Fitness</div>' +
      svcBlock('Garmin Connect','🏃', garminSection(pid)) +
      svcBlock('Whoop','💚', whoopSection(pid)) +
      svcBlock('Apple Health','❤️', appleHealthSection(pid)) +
      svcBlock('Fitbit','⌚', fitbitSection(pid)) +
      svcBlock('Eight Sleep','😴', eightSleepSection(pid)) +
      svcBlock('Strava','🚴', stravaSection(pid)) +
      svcBlock('MyFitnessPal','🥗', mfpSection(pid)) +
      svcBlock('Renpho','⚖️', renphoSection(pid)) +
    '</div>' +

    '<div class="cat-section">' +
      '<div class="cat-heading"><span class="cat-dot" style="background:#f59e0b"></span>Shopping</div>' +
      svcBlock('Amazon','📦', shopSection(pid,'amazon')) +
      svcBlock('Walmart','🛒', shopSection(pid,'walmart')) +
      svcBlock('Target','🎯', shopSection(pid,'target')) +
      svcBlock('Instacart','🛍️', shopSection(pid,'instacart')) +
      svcBlock('FreshDirect','🥬', shopSection(pid,'fresh-direct')) +
      svcBlock('Amazon Fresh','🌿', shopSection(pid,'amazon-fresh')) +
    '</div>' +

    '<div class="cat-section">' +
      '<div class="cat-heading"><span class="cat-dot" style="background:#a855f7"></span>Lifestyle</div>' +
      svcBlock('Ticketmaster','🎫', ticketmasterSection(pid)) +
      svcBlock('Zillow','🏠', zillowSection(pid)) +
      svcBlock('Sonos','🔊', sonosSection(pid)) +
      svcBlock('Obsidian','📋', obsidianSection(pid)) +
      svcBlock('Logistics','🚚', logisticsSection(pid)) +
    '</div>'
  );

  document.querySelectorAll('.svc-header').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
  });
  document.querySelectorAll('.svc-block').forEach(b => b.classList.add('open'));
}

function view(html) {
  document.getElementById('view').innerHTML = html;
}

/* ─────────────────────────────────────────
   SERVICE ACCORDION WRAPPER
───────────────────────────────────────── */
function svcBlock(title, icon, bodyHtml) {
  const m = bodyHtml.match(/data-count="(\d+)"/);
  const count = m ? m[1] + ' records' : '';
  return '<div class="svc-block">' +
    '<div class="svc-header">' +
      '<span class="svc-icon">' + icon + '</span>' +
      '<span class="svc-title">' + title + '</span>' +
      (count ? '<span class="svc-count">' + count + '</span>' : '') +
      '<span class="svc-chevron">▾</span>' +
    '</div>' +
    '<div class="svc-body">' + bodyHtml + '</div>' +
  '</div>';
}

/* ════════════════════════════════════════════════════
   HEALTH SECTIONS
════════════════════════════════════════════════════ */

function garminSection(pid) {
  const rows = (D.garmin?.daily_stats || [])
    .filter(d => d.user_id === pid)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) return empty();
  const body = rows.map(d =>
    '<tr>' +
      '<td>' + d.date + '</td>' +
      '<td class="num">' + fmt(d.steps) + '</td>' +
      '<td class="num">' + fmt(d.calories_total) + '</td>' +
      '<td class="num">' + (d.distance_meters ? (d.distance_meters/1000).toFixed(1) : '—') + '</td>' +
      '<td class="num">' + nvl(d.floors_climbed) + '</td>' +
      '<td class="num">' + nvl(d.intensity_minutes) + '</td>' +
    '</tr>'
  ).join('');
  return '<span data-count="' + rows.length + '"></span>' +
    tableWrap(['Date','Steps','Calories','Dist (km)','Floors','Intensity Min'], body);
}

function whoopSection(pid) {
  const recovery = (D.whoop?.recovery || []).filter(r => r.persona_id === pid);
  const cycles   = (D.whoop?.cycles || []).filter(c => c.persona_id === pid);
  const cycleMap = {};
  cycles.forEach(c => { cycleMap[c.cycle_id] = c; });
  const rows = recovery
    .map(r => Object.assign({}, r, { _c: cycleMap[r.cycle_id] || {} }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (!rows.length) return empty();
  const body = rows.map(r => {
    const score = r.recovery_score;
    const col = score >= 67 ? 'var(--green)' : score >= 34 ? 'var(--amber)' : 'var(--rose)';
    return '<tr>' +
      '<td>' + r.timestamp.slice(0,10) + '</td>' +
      '<td class="num"><strong style="color:' + col + '">' + score + '%</strong></td>' +
      '<td class="num">' + nvl(r.hrv_rmssd) + '</td>' +
      '<td class="num">' + nvl(r.resting_heart_rate) + '</td>' +
      '<td class="num">' + nvl(r.spo2_percentage) + '</td>' +
      '<td class="num">' + nvl(r.skin_temp_celsius) + '</td>' +
      '<td class="num">' + nvl(r._c.strain) + '</td>' +
      '<td class="num">' + nvl(r._c.kilojoules) + '</td>' +
    '</tr>';
  }).join('');
  return '<span data-count="' + rows.length + '"></span>' +
    tableWrap(['Date','Recovery %','HRV (ms)','RHR (bpm)','SpO₂ %','Skin Temp °C','Strain','kJ'], body);
}

function appleHealthSection(pid) {
  const ah = D['apple-health'] || {};
  let totalRecs = 0;
  let out = '';

  function subTable(label, arr, cols, rowFn) {
    const recs = arr.filter(r => r.user_id === pid).sort((a,b) => (b.start_date??'').localeCompare(a.start_date??''));
    if (!recs.length) return '';
    totalRecs += recs.length;
    return '<div style="padding:8px 12px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3)">' + label + ' (' + recs.length + ')</div>' +
      tableWrap(cols, recs.map(rowFn).join(''));
  }

  out += subTable('Step Records', ah.step_records || [],
    ['Date','Steps','Unit'],
    r => '<tr><td>' + (r.start_date||'').slice(0,10) + '</td><td class="num">' + fmt(r.value) + '</td><td>' + (r.unit||'count') + '</td></tr>');

  out += subTable('Resting Heart Rate', ah.resting_heart_rate_records || [],
    ['Date','Value','Unit'],
    r => '<tr><td>' + (r.start_date||'').slice(0,10) + '</td><td class="num">' + nvl(r.value) + '</td><td>' + (r.unit||'bpm') + '</td></tr>');

  out += subTable('HRV', ah.hrv_records || [],
    ['Date','Value','Unit'],
    r => '<tr><td>' + (r.start_date||'').slice(0,10) + '</td><td class="num">' + nvl(r.value) + '</td><td>' + (r.unit||'ms') + '</td></tr>');

  out += subTable('Body Mass', ah.body_mass_records || [],
    ['Date','Value','Unit'],
    r => '<tr><td>' + (r.start_date||'').slice(0,10) + '</td><td class="num">' + nvl(r.value) + '</td><td>' + (r.unit||'kg') + '</td></tr>');

  out += subTable('VO₂ Max', ah.vo2max_records || [],
    ['Date','Value','Unit'],
    r => '<tr><td>' + (r.start_date||'').slice(0,10) + '</td><td class="num">' + nvl(r.value) + '</td><td>' + (r.unit||'mL/kg/min') + '</td></tr>');

  if (!totalRecs) return empty();
  return '<span data-count="' + totalRecs + '"></span>' + out;
}

function fitbitSection(pid) {
  const profile = (D.fitbit?.user_profiles || []).find(u => u.user_id === pid);
  const rows    = (D.fitbit?.daily_stats || [])
    .filter(d => d.user_id === pid)
    .sort((a, b) => (b.date||'').localeCompare(a.date||''));
  let out = '';
  if (profile) {
    out += '<div class="fields-grid">' +
      field('Display Name', profile.display_name) +
      field('Gender', profile.gender) +
      field('DOB', profile.date_of_birth) +
      field('Height', profile.height ? profile.height + ' cm' : null) +
      field('Weight', profile.weight ? profile.weight + ' kg' : null) +
      field('Member Since', profile.member_since) +
    '</div>';
  }
  if (!rows.length) return out + empty('No daily stats');
  const body = rows.map(d =>
    '<tr>' +
      '<td>' + (d.date||'—') + '</td>' +
      '<td class="num">' + fmt(d.steps) + '</td>' +
      '<td class="num">' + fmt(d.calories_total ?? d.calories) + '</td>' +
      '<td class="num">' + nvl(d.active_zone_minutes ?? d.minutes_fairly_active) + '</td>' +
      '<td class="num">' + nvl(d.resting_heart_rate) + '</td>' +
    '</tr>'
  ).join('');
  return '<span data-count="' + rows.length + '"></span>' + out +
    tableWrap(['Date','Steps','Calories','Active Zone Min','Rest HR (bpm)'], body);
}

function eightSleepSection(pid) {
  const profile  = (D['eight-sleep']?.users || []).find(u => u.persona_id === pid);
  const device   = (D['eight-sleep']?.devices || []).find(d => d.persona_id === pid);
  const sessions = (D['eight-sleep']?.sleep_sessions || [])
    .filter(s => s.persona_id === pid)
    .sort((a, b) => (b.start_time ?? b.session_date ?? '').localeCompare(a.start_time ?? a.session_date ?? ''));
  let out = '';
  if (profile || device) {
    out += '<div class="fields-grid">' +
      (profile ? field('Timezone', profile.timezone) : '') +
      (profile ? field('Temp Unit', profile.temperature_unit?.toUpperCase()) : '') +
      (profile ? field('Bed Side', profile.bed_side) : '') +
      (device  ? field('Pod Model', device.model) : '') +
      (device  ? field('Firmware', device.firmware_version) : '') +
      (device  ? field('Water Level', device.water_level_pct != null ? device.water_level_pct + '%' : null) : '') +
    '</div>';
  }
  if (!sessions.length) return out + empty('No sleep sessions');
  const body = sessions.map(s => {
    const date  = (s.start_time ?? s.session_date ?? '').slice(0, 10);
    const score = s.sleep_fitness_score ?? s.sleep_score;
    const col   = score != null ? (score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--rose)') : '';
    const hrv   = s.hrv_ms ?? s.hrv;
    return '<tr>' +
      '<td>' + date + '</td>' +
      '<td class="num">' + (score != null ? '<strong style="color:' + col + '">' + score + '</strong>' : '—') + '</td>' +
      '<td class="num">' + nvl(hrv) + '</td>' +
      '<td class="num">' + nvl(s.respiratory_rate) + '</td>' +
    '</tr>';
  }).join('');
  return '<span data-count="' + sessions.length + '"></span>' + out +
    tableWrap(['Date','Sleep Score','HRV (ms)','Resp Rate'], body);
}

function stravaSection(pid) {
  const athlete    = (D.strava?.athletes || []).find(a => a.user_id === pid);
  const activities = (D.strava?.activities || [])
    .filter(a => a.user_id === pid)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  let out = '';
  if (athlete) {
    out += '<div class="fields-grid">' +
      field('Location', athlete.city + ', ' + athlete.state) +
      field('Premium', athlete.premium ? 'Yes' : 'No') +
      field('FTP', athlete.ftp ? athlete.ftp + ' W' : null) +
      field('Weight', athlete.weight ? athlete.weight + ' kg' : null) +
    '</div>';
  }
  if (!activities.length) return out + empty('No activities');
  const body = activities.map(a =>
    '<tr>' +
      '<td>' + a.start_date.slice(0,10) + '</td>' +
      '<td>' + esc(a.name ?? '') + '</td>' +
      '<td><span class="badge badge-teal">' + (a.type||'') + '</span></td>' +
      '<td class="num">' + (a.distance ? (a.distance/1000).toFixed(2) : '—') + '</td>' +
      '<td class="num">' + (a.moving_time ? Math.round(a.moving_time/60) + ' min' : '—') + '</td>' +
      '<td class="num">' + nvl(a.average_heartrate) + '</td>' +
      '<td class="num">' + nvl(a.total_elevation_gain) + '</td>' +
      '<td class="num">' + nvl(a.average_watts) + '</td>' +
      '<td class="num">' + nvl(a.kilojoules) + '</td>' +
    '</tr>'
  ).join('');
  return '<span data-count="' + activities.length + '"></span>' + out +
    tableWrap(['Date','Name','Type','Dist (km)','Duration','Avg HR','Elev (m)','Avg W','kJ'], body);
}

function mfpSection(pid) {
  const profile = (D.myfitnesspal?.user_profiles || []).find(u => u.persona_id === pid);
  const foodMap = {};
  (D.myfitnesspal?.foods || []).forEach(f => { foodMap[f.food_id] = f; });
  const logs = (D.myfitnesspal?.food_logs || [])
    .filter(l => l.user_id === pid || l.persona_id === pid)
    .sort((a, b) => (b.log_date ?? b.date ?? '').localeCompare(a.log_date ?? a.date ?? ''));
  let out = '';
  if (profile) {
    out += '<div class="fields-grid">' +
      field('Calorie Goal', profile.calorie_goal ? profile.calorie_goal + ' kcal' : null) +
      field('Protein Goal', profile.protein_goal_g ? profile.protein_goal_g + ' g' : null) +
      field('Carbs Goal',   profile.carbs_goal_g   ? profile.carbs_goal_g   + ' g' : null) +
      field('Fat Goal',     profile.fat_goal_g     ? profile.fat_goal_g     + ' g' : null) +
      field('Activity Level', profile.activity_level) +
      field('Goal', profile.goal) +
    '</div>';
  }
  if (!logs.length) return out + empty('No food logs');
  const body = logs.map(l => {
    const food = foodMap[l.food_id] || {};
    const srv  = Number(l.servings ?? 1);
    const cal  = food.calories  != null ? Math.round(food.calories  * srv) : nvl(l.calories);
    const pro  = food.protein_g != null ? (food.protein_g * srv).toFixed(1)  : nvl(l.protein_g);
    const carb = food.carbs_g   != null ? (food.carbs_g   * srv).toFixed(1)  : nvl(l.carbs_g);
    const fat  = food.fat_g     != null ? (food.fat_g     * srv).toFixed(1)  : nvl(l.fat_g);
    return '<tr>' +
      '<td>' + (l.log_date ?? l.date ?? '—') + '</td>' +
      '<td>' + esc(food.name ?? l.food_id ?? '—') + '</td>' +
      '<td class="num">' + (l.servings ?? 1) + '</td>' +
      '<td class="num">' + cal + '</td>' +
      '<td class="num">' + pro + '</td>' +
      '<td class="num">' + carb + '</td>' +
      '<td class="num">' + fat + '</td>' +
    '</tr>';
  }).join('');
  return '<span data-count="' + logs.length + '"></span>' + out +
    tableWrap(['Date','Food','Servings','Cal','Protein (g)','Carbs (g)','Fat (g)'], body);
}

function renphoSection(pid) {
  const rows = (D.renpho?.measurements || [])
    .filter(m => m.persona_id === pid)
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  if (!rows.length) return empty();
  const body = rows.map(m =>
    '<tr>' +
      '<td>' + (m.timestamp ?? '').slice(0,10) + '</td>' +
      '<td class="num">' + nvl(m.weight) + '</td>' +
      '<td class="num">' + nvl(m.bmi) + '</td>' +
      '<td class="num">' + nvl(m.body_fat) + '</td>' +
      '<td class="num">' + nvl(m.muscle_mass) + '</td>' +
      '<td class="num">' + nvl(m.water_percentage) + '</td>' +
      '<td class="num">' + nvl(m.bone_mass) + '</td>' +
      '<td class="num">' + nvl(m.visceral_fat) + '</td>' +
      '<td class="num">' + nvl(m.bmr) + '</td>' +
    '</tr>'
  ).join('');
  return '<span data-count="' + rows.length + '"></span>' +
    tableWrap(['Date','Weight (kg)','BMI','Body Fat %','Muscle (kg)','Water %','Bone (kg)','Visceral Fat','BMR'], body);
}

/* ════════════════════════════════════════════════════
   SHOPPING SECTION (shared for all 6 services)
════════════════════════════════════════════════════ */
function shopSection(pid, svcKey) {
  const sd       = D[svcKey] || {};
  const orders   = (sd.orders || []).filter(o => o.user_id === pid)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const products = sd.products || [];
  const variants = sd.product_variants || [];
  const itemsMap = {};
  (sd.order_items || []).forEach(i => {
    if (!itemsMap[i.order_id]) itemsMap[i.order_id] = [];
    itemsMap[i.order_id].push(i);
  });
  if (!orders.length) return empty();

  const rows = orders.map(o => {
    const items = itemsMap[o.order_id] || [];
    const rowId = 'items-' + o.order_id.replace(/[^a-z0-9]/gi, '-');
    const itemRows = items.map(item => {
      const prod = products.find(p =>
        p.asin === item.asin || p.product_id === item.product_id ||
        p.item_id === item.item_id || p.sku === item.sku
      ) || variants.find(v =>
        v.variant_id === item.variant_id || v.product_id === item.product_id
      ) || {};
      const name  = prod.title ?? prod.name ?? item.product_title ?? item.name ?? item.item_name ?? String(item.product_id ?? item.variant_id ?? item.asin ?? '—');
      const price = item.price_at_purchase ?? item.unit_price ?? item.price;
      const qty   = item.quantity ?? 1;
      return '<tr>' +
        '<td>' + esc(name) + '</td>' +
        '<td class="num">' + qty + '</td>' +
        '<td class="num">' + (price != null ? '$' + Number(price).toFixed(2) : '—') + '</td>' +
        '<td class="num">' + (price != null ? '$' + (Number(price)*qty).toFixed(2) : '—') + '</td>' +
      '</tr>';
    }).join('');

    return '<tr style="cursor:' + (items.length ? 'pointer' : 'default') + '"' +
        (items.length ? ' onclick="toggleItems(\'' + rowId + '\')"' : '') + '>' +
      '<td>' + (o.created_at ?? '—').slice(0,10) + '</td>' +
      '<td class="mono dim">' + esc(o.order_id) + '</td>' +
      '<td class="num">$' + Number(o.total ?? o.total_amount ?? o.subtotal ?? 0).toFixed(2) + '</td>' +
      '<td>' + statusBadge(o.status ?? o.order_status ?? '') + '</td>' +
      '<td>' + (o.carrier ?? '—') + '</td>' +
      '<td>' + (items.length ? '<span style="color:var(--teal);font-size:11px">▸ ' + items.length + ' item' + (items.length !== 1 ? 's' : '') + '</span>' : '<span class="dim">—</span>') + '</td>' +
    '</tr>' +
    (items.length ? '<tr id="' + rowId + '" class="items-row" style="display:none"><td colspan="6"><div class="items-inner"><table class="data-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>' + itemRows + '</tbody></table></div></td></tr>' : '');
  }).join('');

  return '<span data-count="' + orders.length + '"></span>' +
    tableWrap(['Date','Order ID','Total','Status','Carrier','Items'], rows);
}

function toggleItems(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

/* ════════════════════════════════════════════════════
   LIFESTYLE SECTIONS
════════════════════════════════════════════════════ */

function ticketmasterSection(pid) {
  const tm     = D.ticketmaster || {};
  const orders = (tm.orders || []).filter(o => o.user_id === pid)
    .sort((a, b) => b.purchased_at.localeCompare(a.purchased_at));
  if (!orders.length) return empty();
  const evtMap = {};
  (tm.events || []).forEach(e => { evtMap[e.id] = e; });
  const venMap = {};
  (tm.venues || []).forEach(v => { venMap[v.id] = v; });

  const body = orders.map(o => {
    const evt = evtMap[o.event_id] || {};
    const ven = venMap[evt.venue_id] || {};
    return '<tr>' +
      '<td>' + o.purchased_at.slice(0,10) + '</td>' +
      '<td>' + esc(evt.name ?? '—') + '</td>' +
      '<td>' + (evt.date ?? '—') + (evt.time ? ' ' + evt.time : '') + '</td>' +
      '<td>' + esc(ven.name ?? '—') + '</td>' +
      '<td>' + (ven.city ? ven.city + ', ' + ven.state : '—') + '</td>' +
      '<td class="num">' + (o.quantity ?? '—') + '</td>' +
      '<td class="num">$' + Number(o.total_price ?? o.subtotal ?? 0).toFixed(2) + '</td>' +
      '<td class="mono dim">' + esc(o.confirmation_code ?? '—') + '</td>' +
    '</tr>';
  }).join('');
  return '<span data-count="' + orders.length + '"></span>' +
    tableWrap(['Purchased','Event','Event Date','Venue','Location','Qty','Total','Confirmation'], body);
}

function zillowSection(pid) {
  const zd      = D.zillow || {};
  const propMap = {};
  (zd.properties || []).forEach(p => { propMap[p.id] = p; });
  const saved = (zd.saved_properties || []).filter(s => s.user_id === pid)
    .sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  if (!saved.length) return empty();

  const body = saved.map(s => {
    const p = propMap[s.property_id] || {};
    return '<tr>' +
      '<td>' + esc(p.address ?? String(s.property_id)) + '</td>' +
      '<td>' + (p.city ? p.city + ', ' + p.state : '—') + '</td>' +
      '<td class="num">' + (p.price ? '$' + Number(p.price).toLocaleString() : '—') + '</td>' +
      '<td class="num">' + nvl(p.bedrooms) + '</td>' +
      '<td class="num">' + nvl(p.bathrooms) + '</td>' +
      '<td class="num">' + (p.sqft ? Number(p.sqft).toLocaleString() : '—') + '</td>' +
      '<td>' + (p.home_type ?? '—') + '</td>' +
      '<td>' + (p.property_status ?? '—') + '</td>' +
      '<td>' + s.saved_at.slice(0,10) + '</td>' +
      '<td style="font-size:11px;color:var(--text3)">' + esc(s.notes ?? '') + '</td>' +
    '</tr>';
  }).join('');
  return '<span data-count="' + saved.length + '"></span>' +
    tableWrap(['Address','City','Price','Beds','Baths','Sqft','Type','Status','Saved','Notes'], body);
}

function sonosSection(pid) {
  const sn       = D.sonos || {};
  const speakers = (sn.speakers || []).filter(s => s.user_id === pid);
  const favs     = (sn.favorites || []).filter(f => f.user_id === pid);
  const tracks   = (sn.favorite_tracks || []).filter(t => t.user_id === pid);
  const total    = speakers.length + favs.length + tracks.length;
  if (!total) return empty();
  let out = '<span data-count="' + total + '"></span>';

  if (speakers.length) {
    const body = speakers.map(s =>
      '<tr>' +
        '<td>' + esc(s.room ?? '—') + '</td>' +
        '<td>' + esc(s.model ?? '—') + '</td>' +
        '<td class="num">' + nvl(s.volume) + '%</td>' +
        '<td>' + statusBadge(s.playback_state ?? '') + '</td>' +
        '<td>' + esc(s.now_playing_title ?? '—') + '</td>' +
        '<td>' + esc(s.now_playing_artist ?? '—') + '</td>' +
        '<td>' + (s.now_playing_source ?? '—') + '</td>' +
      '</tr>'
    ).join('');
    out += tableWrap(['Room','Model','Vol','State','Now Playing','Artist','Source'], body);
  }

  if (favs.length) {
    out += '<div style="padding:8px 12px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3)">Favorites (' + favs.length + ')</div>';
    const body = favs.map(f =>
      '<tr><td>' + esc(f.name ?? f.title ?? '—') + '</td><td>' + (f.type ?? '—') + '</td><td>' + (f.added_at ?? '').slice(0,10) + '</td></tr>'
    ).join('');
    out += tableWrap(['Name','Type','Added'], body);
  }

  if (tracks.length) {
    out += '<div style="padding:8px 12px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3)">Favorite Tracks (' + tracks.length + ')</div>';
    const body = tracks.map(t =>
      '<tr><td>' + esc(t.title ?? t.track_name ?? '—') + '</td><td>' + esc(t.artist ?? '—') + '</td><td>' + esc(t.album ?? '—') + '</td><td>' + (t.service ?? t.source ?? '—') + '</td></tr>'
    ).join('');
    out += tableWrap(['Track','Artist','Album','Service'], body);
  }

  return out;
}

function obsidianSection(pid) {
  const notes = (D.obsidian?.notes || [])
    .filter(n => n.user_id === pid)
    .sort((a, b) => (b.modified_at ?? '').localeCompare(a.modified_at ?? ''));
  if (!notes.length) return empty();
  const body = notes.map(n => {
    const tags    = (n.tags || []).map(t => '<span style="background:rgba(168,85,247,.12);color:var(--violet);border-radius:4px;padding:1px 5px;font-size:9px">' + esc(t) + '</span>').join(' ');
    const preview = (n.content ?? '').replace(/[#\[\]]/g, '').trim().slice(0, 80);
    return '<tr>' +
      '<td>' + (n.created_at ?? n.modified_at ?? '').slice(0,10) + '</td>' +
      '<td>' + esc(n.folder ?? '—') + '</td>' +
      '<td><strong>' + esc(n.title ?? n.path ?? '—') + '</strong></td>' +
      '<td style="font-size:11px;color:var(--text3)">' + esc(preview) + (n.content?.length > 80 ? '…' : '') + '</td>' +
      '<td>' + tags + '</td>' +
    '</tr>';
  }).join('');
  return '<span data-count="' + notes.length + '"></span>' +
    tableWrap(['Date','Folder','Title','Preview','Tags'], body);
}

function logisticsSection(pid) {
  const lg    = D.logistics || {};
  const ships = (lg.shipments || []).filter(s => s.user_id === pid)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!ships.length) return empty();
  const evtIdx = {};
  (lg.tracking_events || []).forEach(e => {
    const k = e.tracking_number;
    if (!evtIdx[k]) evtIdx[k] = [];
    evtIdx[k].push(e);
  });

  const rows = ships.map(s => {
    const events = evtIdx[s.tracking_number] || [];
    const rowId  = 'pkg-' + s.tracking_number.replace(/[^a-z0-9]/gi, '-');
    const evtRows = events
      .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
      .map(e => '<tr><td>' + (e.timestamp ?? '').slice(0,16).replace('T',' ') + '</td><td>' + esc(e.location ?? '—') + '</td><td>' + esc(e.status ?? e.description ?? '—') + '</td></tr>')
      .join('');
    return '<tr style="cursor:' + (events.length ? 'pointer' : 'default') + '"' +
        (events.length ? ' onclick="toggleItems(\'' + rowId + '\')"' : '') + '>' +
      '<td>' + s.created_at.slice(0,10) + '</td>' +
      '<td class="mono dim" style="font-size:10px">' + esc(s.tracking_number) + '</td>' +
      '<td>' + (s.carrier ?? '—') + '</td>' +
      '<td>' + statusBadge(s.status ?? '') + '</td>' +
      '<td>' + (s.origin ?? '—') + '</td>' +
      '<td style="font-size:11px">' + esc(s.destination ?? '—') + '</td>' +
      '<td>' + ((s.actual_delivery ?? s.estimated_delivery ?? '').slice(0,10) || '—') + '</td>' +
      '<td>' + (events.length ? '<span style="color:var(--teal);font-size:11px">▸ ' + events.length + ' events</span>' : '<span class="dim">—</span>') + '</td>' +
    '</tr>' +
    (events.length ? '<tr id="' + rowId + '" class="items-row" style="display:none"><td colspan="8"><div class="items-inner"><table class="data-table"><thead><tr><th>Timestamp</th><th>Location</th><th>Status</th></tr></thead><tbody>' + evtRows + '</tbody></table></div></td></tr>' : '');
  }).join('');

  return '<span data-count="' + ships.length + '"></span>' +
    tableWrap(['Created','Tracking #','Carrier','Status','Origin','Destination','Delivered','Events'], rows);
}

/* ════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════ */
function personaOrders(pid) {
  return ['amazon','walmart','target','instacart','fresh-direct','amazon-fresh']
    .flatMap(k => (D[k]?.orders || []).filter(o => o.user_id === pid));
}

function tableWrap(headers, body) {
  const ths = headers.map(h => '<th>' + h + '</th>').join('');
  return '<div class="table-wrap"><table class="data-table"><thead><tr>' + ths + '</tr></thead><tbody>' +
    (body || '<tr><td colspan="' + headers.length + '" class="empty">No records</td></tr>') +
    '</tbody></table></div>';
}

function empty(msg) {
  return '<div class="empty">' + (msg ?? 'No data for this persona.') + '</div>';
}

function field(key, val) {
  return '<div class="field"><div class="field-key">' + key + '</div><div class="field-val">' + (val ?? '—') + '</div></div>';
}

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function nvl(n) { return n != null ? n : '—'; }

function statusBadge(s) {
  if (!s) return '<span class="dim">—</span>';
  const m = {
    delivered:'badge-green', active:'badge-green', completed:'badge-green',
    cancelled:'badge-rose',  canceled:'badge-rose',
    shipped:'badge-sky',     processing:'badge-sky', on_sale:'badge-green',
    pending:'badge-amber',   placed:'badge-amber',   limited:'badge-amber',
    paused:'badge-normal',   playing:'badge-green',
  };
  const cls = m[s.toLowerCase()] || 'badge-normal';
  return '<span class="badge ' + cls + '">' + s + '</span>';
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
