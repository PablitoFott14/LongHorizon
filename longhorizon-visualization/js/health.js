/* ════════════════════════════════════════════════════════
   LongHorizon · Health Tab
   Garmin, Whoop, Apple Health, Fitbit, Eight Sleep,
   Strava, MyFitnessPal, Renpho
════════════════════════════════════════════════════════ */

let HEALTH_PAGE = 1;
const HEALTH_PAGE_SIZE = 50;
let HEALTH_DATA = [];

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
function renderHealthPage() {
  populatePersonaSelects();
  bindHealthFilters();
  refreshHealth();
}

function bindHealthFilters() {
  ['health-user', 'health-service', 'health-days'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._healthBound) {
      el._healthBound = true;
      el.addEventListener('change', () => { HEALTH_PAGE = 1; refreshHealth(); });
    }
  });
}

function refreshHealth() {
  const userId  = document.getElementById('health-user')?.value || '';
  const service = document.getElementById('health-service')?.value || 'garmin';
  const days    = parseInt(document.getElementById('health-days')?.value || '30');

  HEALTH_DATA = getHealthRecords(service, userId, days);
  document.getElementById('health-count').textContent = `${HEALTH_DATA.length.toLocaleString()} records`;

  const svc = SERVICES[service] || {};
  const chartTitle = document.getElementById('health-chart-title');
  if (chartTitle) chartTitle.textContent = `${svc.icon || ''} ${svc.label || service} — ${userId ? getUserName(userId) : 'All Users'}${days ? ` (last ${days} days)` : ' (all time)'}`;

  renderHealthChart(HEALTH_DATA, service, userId);
  renderHealthTable(HEALTH_DATA, service);
  renderHealthPagination();
}

/* ──────────────────────────────────────────
   DATA NORMALIZATION
────────────────────────────────────────── */
function getHealthRecords(service, userId, days) {
  const since = days > 0
    ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    : '2000-01-01';

  switch (service) {
    case 'garmin':      return getGarminRecords(userId, since);
    case 'whoop':       return getWhoopRecords(userId, since);
    case 'apple-health':return getAppleHealthRecords(userId, since);
    case 'fitbit':      return getFitbitRecords(userId, since);
    case 'eight-sleep': return getEightSleepRecords(userId, since);
    case 'strava':      return getStravaRecords(userId, since);
    case 'myfitnesspal':return getMFPRecords(userId, since);
    case 'renpho':      return getRenphoRecords(userId, since);
    default:            return getGarminRecords(userId, since);
  }
}

function getGarminRecords(userId, since) {
  return (DATA.garmin?.daily_stats || [])
    .filter(d => (!userId || d.user_id === userId) && d.date >= since)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getWhoopRecords(userId, since) {
  const recovery = (DATA.whoop?.recovery || [])
    .filter(r => (!userId || r.persona_id === userId) && (r.timestamp || '').slice(0,10) >= since);
  const cycles = (DATA.whoop?.cycles || [])
    .filter(c => (!userId || c.persona_id === userId) && (c.start_time || '').slice(0,10) >= since);

  const cycleMap = {};
  cycles.forEach(c => { cycleMap[c.cycle_id] = c; });

  return recovery.map(r => ({
    ...r,
    date: (r.timestamp || '').slice(0, 10),
    strain: cycleMap[r.cycle_id]?.strain,
    kilojoules: cycleMap[r.cycle_id]?.kilojoules,
    max_heart_rate: cycleMap[r.cycle_id]?.max_heart_rate,
  })).sort((a, b) => b.date.localeCompare(a.date));
}

function getAppleHealthRecords(userId, since) {
  const d = DATA['apple-health'] || {};
  const steps = (d.step_records || [])
    .filter(r => (!userId || r.user_id === userId) && (r.start_date || r.date || '').slice(0,10) >= since)
    .map(r => ({ ...r, date: (r.start_date || r.date || '').slice(0,10), source: 'steps' }));

  const rhr = (d.resting_heart_rate_records || [])
    .filter(r => (!userId || r.user_id === userId) && (r.start_date || r.date || '').slice(0,10) >= since)
    .map(r => ({ ...r, date: (r.start_date || r.date || '').slice(0,10), source: 'rhr' }));

  return [...steps, ...rhr].sort((a, b) => b.date.localeCompare(a.date));
}

function getFitbitRecords(userId, since) {
  return (DATA.fitbit?.daily_stats || [])
    .filter(d => (!userId || d.user_id === userId) && (d.date || '') >= since)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function getEightSleepRecords(userId, since) {
  return (DATA['eight-sleep']?.sleep_sessions || [])
    .filter(s => (!userId || s.persona_id === userId) && (s.start_time || s.session_date || '').slice(0,10) >= since)
    .map(s => ({
      ...s,
      user_id: s.persona_id,
      date: (s.start_time || s.session_date || '').slice(0, 10),
      sleep_score: s.sleep_fitness_score,
      hrv: s.hrv_ms,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getStravaRecords(userId, since) {
  const athleteMap = {};
  (DATA.strava?.athletes || []).forEach(a => { if (a.athlete_id) athleteMap[a.athlete_id] = a.user_id; });

  return (DATA.strava?.activities || [])
    .filter(a => {
      const actUserId = a.user_id || athleteMap[a.athlete_id];
      const matchUser = !userId || actUserId === userId;
      const date = (a.start_date || a.created_at || '').slice(0, 10);
      return matchUser && date >= since;
    })
    .map(a => ({
      ...a,
      user_id: a.user_id || athleteMap[a.athlete_id] || '',
      date:    (a.start_date || a.created_at || '').slice(0, 10),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getMFPRecords(userId, since) {
  const foodMap = {};
  (DATA.myfitnesspal?.foods || []).forEach(f => { foodMap[f.food_id] = f; });

  return (DATA.myfitnesspal?.food_logs || [])
    .filter(l => (!userId || l.user_id === userId || l.persona_id === userId) && (l.log_date || l.date || '') >= since)
    .map(l => {
      const food = foodMap[l.food_id] || {};
      const servings = Number(l.servings ?? 1);
      return {
        ...l,
        date: l.log_date || l.date,
        name: food.name,
        calories: food.calories != null ? Math.round(food.calories * servings) : l.calories,
        protein_g: food.protein_g != null ? +(food.protein_g * servings).toFixed(1) : l.protein_g,
        carbs_g: food.carbs_g != null ? +(food.carbs_g * servings).toFixed(1) : l.carbs_g,
        fat_g: food.fat_g != null ? +(food.fat_g * servings).toFixed(1) : l.fat_g,
        sodium_mg: food.sodium_mg != null ? Math.round(food.sodium_mg * servings) : l.sodium_mg,
      };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function getRenphoRecords(userId, since) {
  return (DATA.renpho?.measurements || [])
    .filter(m => (!userId || m.persona_id === userId) && (m.timestamp || m.measured_at || m.date || '').slice(0, 10) >= since)
    .map(m => ({
      ...m,
      date: (m.timestamp || m.measured_at || m.date || '').slice(0, 10),
      user_id: m.persona_id,
      weight_kg: m.weight,
      body_fat_percentage: m.body_fat,
      muscle_mass_kg: m.muscle_mass,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ──────────────────────────────────────────
   CHART
────────────────────────────────────────── */
function renderHealthChart(records, service, selectedUser) {
  const PALETTE_HEALTH = ['#14b8a6','#22c55e','#f59e0b','#a855f7','#f87171','#38bdf8','#818cf8','#34d399','#fbbf24','#60a5fa','#e879f9'];

  const metricFn = getChartMetric(service);
  const labelFn  = (r) => r.date || (r.timestamp || '').slice(0, 10) || (r.start_time || '').slice(0, 10);

  /* Group by user */
  const byUser = {};
  records.forEach(r => {
    const uid = r.persona_id || r.user_id || 'unknown';
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(r);
  });

  /* Collect sorted unique dates */
  const allDates = [...new Set(records.map(r => labelFn(r)))].filter(Boolean).sort();

  /* Build datasets */
  const users = Object.keys(byUser);
  const datasets = users.slice(0, 11).map((uid, i) => {
    const userRecs = byUser[uid];
    const dateMap = {};
    userRecs.forEach(r => { dateMap[labelFn(r)] = metricFn(r); });
    return {
      label: getUserName(uid),
      data: allDates.map(d => dateMap[d] ?? null),
      borderColor: PALETTE_HEALTH[i % PALETTE_HEALTH.length],
      backgroundColor: PALETTE_HEALTH[i % PALETTE_HEALTH.length] + '18',
      tension: 0.35,
      fill: users.length === 1,
      spanGaps: true,
      pointRadius: allDates.length > 30 ? 0 : 3,
      borderWidth: 1.5,
    };
  });

  mkChart('c-health-main', 'line', { labels: allDates, datasets }, {
    plugins: {
      legend: { labels: { color: '#94a3b8', boxWidth: 10, font: { size: 11 }, padding: 8 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: '#1e2d48' } },
      y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e2d48' } },
    },
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
  });
}

function getChartMetric(service) {
  switch (service) {
    case 'garmin':       return r => r.steps;
    case 'whoop':        return r => r.recovery_score;
    case 'apple-health': return r => r.value ?? r.total_steps ?? r.step_count ?? r.resting_heart_rate;
    case 'fitbit':       return r => r.steps ?? r.calories_total ?? r.calories;
    case 'eight-sleep':  return r => r.sleep_score ?? r.sleep_fitness_score ?? r.hrv ?? r.hrv_ms;
    case 'strava':       return r => (r.distance_meters ?? r.distance) ? +((r.distance_meters ?? r.distance) / 1000).toFixed(2) : null;
    case 'myfitnesspal': return r => r.calories;
    case 'renpho':       return r => r.weight_kg;
    default:             return r => r.steps ?? r.value ?? null;
  }
}

/* ──────────────────────────────────────────
   TABLE
────────────────────────────────────────── */
function renderHealthTable(records, service) {
  const start = (HEALTH_PAGE - 1) * HEALTH_PAGE_SIZE;
  const page  = records.slice(start, start + HEALTH_PAGE_SIZE);

  const tableHtml = SERVICE_TABLE_BUILDERS[service]?.(page) || buildGarminTable(page);

  const wrap = document.getElementById('health-table-wrap');
  if (wrap) wrap.innerHTML = tableHtml;
}

const SERVICE_TABLE_BUILDERS = {
  garmin: buildGarminTable,
  whoop: buildWhoopTable,
  'apple-health': buildAppleTable,
  fitbit: buildFitbitTable,
  'eight-sleep': buildEightSleepTable,
  strava: buildStravaTable,
  myfitnesspal: buildMFPTable,
  renpho: buildRenphoTable,
};

function buildGarminTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Steps</th><th>Distance</th><th>Calories</th><th>Floors</th><th>Intensity Min</th></tr>`;
  const body = rows.map(d => `<tr>
    <td>${d.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${d.user_id}')">${getUserName(d.user_id)}</button></td>
    <td>${(d.steps || 0).toLocaleString()}</td>
    <td>${d.distance_meters ? (d.distance_meters / 1000).toFixed(1) + ' km' : '—'}</td>
    <td>${d.calories_total?.toLocaleString() || '—'} kcal</td>
    <td>${d.floors_climbed ?? '—'}</td>
    <td>${d.intensity_minutes ?? d.vigorous_intensity_minutes ?? '—'}</td>
  </tr>`).join('');
  return tableWrap(header, body, 7);
}

function buildWhoopTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Recovery %</th><th>HRV (ms)</th><th>Resting HR</th><th>SpO₂ %</th><th>Strain</th><th>kJ</th></tr>`;
  const body = rows.map(r => `<tr>
    <td>${r.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${r.persona_id}')">${getUserName(r.persona_id)}</button></td>
    <td><span style="color:${r.recovery_score >= 67 ? 'var(--health)' : r.recovery_score >= 34 ? 'var(--amber)' : 'var(--rose)'};font-weight:600">${r.recovery_score ?? '—'}%</span></td>
    <td>${r.hrv_rmssd ?? '—'}</td>
    <td>${r.resting_heart_rate ?? '—'} bpm</td>
    <td>${r.spo2_percentage ?? '—'}</td>
    <td>${r.strain ?? '—'}</td>
    <td>${r.kilojoules ?? '—'}</td>
  </tr>`).join('');
  return tableWrap(header, body, 8);
}

function buildAppleTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Type</th><th>Value</th><th>Unit</th></tr>`;
  const body = rows.map(r => {
    const typeLabel = r.source === 'rhr' ? 'Resting HR' : r.source === 'steps' ? 'Steps' : (r.type || r.source || '—');
    const value = r.value?.toLocaleString() ?? r.total_steps?.toLocaleString() ?? r.step_count?.toLocaleString() ?? r.resting_heart_rate?.toLocaleString() ?? '—';
    const unit  = r.unit || (r.source === 'rhr' ? 'bpm' : r.source === 'steps' ? 'steps' : '—');
    const uid   = r.user_id || r.source_user_id;
    return `<tr>
      <td>${r.date}</td>
      <td>${uid ? `<button class="link-btn" onclick="openUserModal('${uid}')">${getUserName(uid)}</button>` : '—'}</td>
      <td>${typeLabel}</td>
      <td>${value}</td>
      <td>${unit}</td>
    </tr>`;
  }).join('');
  return tableWrap(header, body, 5);
}

function buildFitbitTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Steps</th><th>Calories</th><th>Distance</th><th>Active Zone Min</th><th>Rest HR</th></tr>`;
  const body = rows.map(d => `<tr>
    <td>${d.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${d.user_id}')">${getUserName(d.user_id)}</button></td>
    <td>${(d.steps || 0).toLocaleString()}</td>
    <td>${(d.calories_total || d.calories || 0).toLocaleString()} kcal</td>
    <td>${d.distance_km ? d.distance_km + ' km' : d.distance_meters ? (d.distance_meters/1000).toFixed(1) + ' km' : '—'}</td>
    <td>${d.active_zone_minutes ?? d.minutes_fairly_active ?? '—'}</td>
    <td>${d.rest_heart_rate ?? d.resting_heart_rate ?? '—'} bpm</td>
  </tr>`).join('');
  return tableWrap(header, body, 7);
}

function buildEightSleepTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Sleep Score</th><th>HRV (ms)</th><th>Resp Rate</th><th>Fitness Score</th></tr>`;
  const body = rows.map(s => `<tr>
    <td>${s.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${s.user_id}')">${getUserName(s.user_id)}</button></td>
    <td><span style="color:${s.sleep_score >= 80 ? 'var(--health)' : s.sleep_score >= 60 ? 'var(--amber)' : 'var(--rose)'};font-weight:600">${s.sleep_score ?? '—'}</span></td>
    <td>${s.hrv ?? '—'}</td>
    <td>${s.respiratory_rate ?? '—'}</td>
    <td>${s.fitness_score ?? '—'}</td>
  </tr>`).join('');
  return tableWrap(header, body, 6);
}

function buildStravaTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Activity Type</th><th>Distance</th><th>Duration</th><th>Avg HR</th><th>Elevation</th></tr>`;
  const body = rows.map(a => `<tr>
    <td>${a.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${a.user_id}')">${getUserName(a.user_id)}</button></td>
    <td>${a.type || a.activity_type || '—'}</td>
    <td>${(a.distance_meters ?? a.distance) ? ((a.distance_meters ?? a.distance)/1000).toFixed(2) + ' km' : '—'}</td>
    <td>${a.moving_time ? (a.moving_time/60).toFixed(0) + ' min' : a.elapsed_time ? (a.elapsed_time/60).toFixed(0) + ' min' : '—'}</td>
    <td>${a.average_heartrate || a.average_hr || '—'}</td>
    <td>${a.total_elevation_gain ? a.total_elevation_gain + ' m' : '—'}</td>
  </tr>`).join('');
  return tableWrap(header, body, 7);
}

function buildMFPTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Sodium</th></tr>`;
  const body = rows.map(l => `<tr>
    <td>${l.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${l.user_id || l.persona_id}')">${getUserName(l.user_id || l.persona_id)}</button></td>
    <td>${l.calories?.toLocaleString() ?? '—'} kcal</td>
    <td>${l.protein_g ?? l.protein ?? '—'} g</td>
    <td>${l.carbs_g ?? l.carbohydrates ?? '—'} g</td>
    <td>${l.fat_g ?? l.fat ?? '—'} g</td>
    <td>${l.sodium_mg ?? l.sodium ?? '—'} mg</td>
  </tr>`).join('');
  return tableWrap(header, body, 7);
}

function buildRenphoTable(rows) {
  const header = `<tr><th>Date</th><th>User</th><th>Weight (kg)</th><th>BMI</th><th>Body Fat %</th><th>Muscle Mass (kg)</th><th>Water %</th></tr>`;
  const body = rows.map(m => `<tr>
    <td>${m.date}</td>
    <td><button class="link-btn" onclick="openUserModal('${m.persona_id}')">${getUserName(m.persona_id)}</button></td>
    <td>${m.weight_kg ?? '—'}</td>
    <td>${m.bmi ?? '—'}</td>
    <td>${m.body_fat_percentage ?? m.body_fat ?? '—'}</td>
    <td>${m.muscle_mass_kg ?? m.muscle_mass ?? '—'}</td>
    <td>${m.water_percentage ?? m.body_water ?? '—'}</td>
  </tr>`).join('');
  return tableWrap(header, body, 7);
}

function tableWrap(header, body, cols) {
  if (!body) return `<div class="empty-state">No records found for this filter combination.</div>`;
  return `<table class="data-table"><thead>${header}</thead><tbody>${body || `<tr><td colspan="${cols}" class="empty-state">No records found</td></tr>`}</tbody></table>`;
}

/* ──────────────────────────────────────────
   PAGINATION
────────────────────────────────────────── */
function renderHealthPagination() {
  const total = HEALTH_DATA.length;
  const pages = Math.ceil(total / HEALTH_PAGE_SIZE);
  const pag   = document.getElementById('health-pag');
  if (!pag) return;
  if (pages <= 1) { pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="healthGoPage(${HEALTH_PAGE-1})" ${HEALTH_PAGE===1?'disabled':''}>‹ Prev</button>`;
  const range = pagRange(HEALTH_PAGE, pages);
  range.forEach(p => {
    if (p === '…') { html += `<span class="page-info">…</span>`; return; }
    html += `<button class="page-btn ${p===HEALTH_PAGE?'current':''}" onclick="healthGoPage(${p})">${p}</button>`;
  });
  html += `<button class="page-btn" onclick="healthGoPage(${HEALTH_PAGE+1})" ${HEALTH_PAGE===pages?'disabled':''}>Next ›</button>`;
  html += `<span class="page-info" style="margin-left:6px">${((HEALTH_PAGE-1)*HEALTH_PAGE_SIZE+1).toLocaleString()}–${Math.min(HEALTH_PAGE*HEALTH_PAGE_SIZE,total).toLocaleString()} of ${total.toLocaleString()}</span>`;
  pag.innerHTML = html;
}

function healthGoPage(p) {
  const pages = Math.ceil(HEALTH_DATA.length / HEALTH_PAGE_SIZE);
  if (p < 1 || p > pages) return;
  HEALTH_PAGE = p;
  const service = document.getElementById('health-service')?.value || 'garmin';
  renderHealthTable(HEALTH_DATA, service);
  renderHealthPagination();
}

function pagRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i+1);
  if (current <= 4) return [1,2,3,4,5,'…',total];
  if (current >= total - 3) return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',current-1,current,current+1,'…',total];
}
