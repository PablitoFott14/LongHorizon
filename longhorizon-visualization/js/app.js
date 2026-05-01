/* ════════════════════════════════════════════════════
   LongHorizon · OpenClaw Universe Visualizer
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
  { id:'persona_001', name:'John Doe',          email:'john.doe@email.com',          initials:'JD' },
  { id:'persona_002', name:'Marcus Johnson',    email:'marcus.johnson@email.com',    initials:'MJ' },
  { id:'persona_009', name:'William Thompson',  email:'william.thompson@email.com',  initials:'WT' },
  { id:'persona_010', name:'Sophie Laurent',    email:'sophie.laurent@email.com',    initials:'SL' },
  { id:'persona_013', name:'Carlos Mendez',     email:'carlos.mendez@email.com',     initials:'CM' },
  { id:'persona_014', name:'Lisa Park',         email:'lisa.park@email.com',         initials:'LP' },
  { id:'persona_016', name:'Priya Sharma',      email:'priya.sharma@email.com',      initials:'PS' },
  { id:'persona_022', name:'Anna Kowalczyk',    email:'anna.kowalczyk@email.com',    initials:'AK' },
  { id:'persona_023', name:'Jordan Williams',   email:'jordan.williams@email.com',   initials:'JW' },
  { id:'persona_027', name:'Patrick Murphy',    email:'patrick.murphy@email.com',    initials:'PM' },
  { id:'persona_031', name:'Jennifer Martinez', email:'jennifer.martinez@email.com', initials:'JM' },
];

const SVCMETA = {
  garmin:        { label:'Garmin Connect', icon:'🏃', color:'#007cc3' },
  whoop:         { label:'Whoop',          icon:'💚', color:'#22c55e' },
  'apple-health':{ label:'Apple Health',   icon:'❤️',  color:'#ff375f' },
  fitbit:        { label:'Fitbit',         icon:'⌚',  color:'#00b0b9' },
  'eight-sleep': { label:'Eight Sleep',    icon:'😴', color:'#818cf8' },
  strava:        { label:'Strava',         icon:'🚴', color:'#fc4c02' },
  myfitnesspal:  { label:'MyFitnessPal',   icon:'🥗', color:'#4ca2cd' },
  renpho:        { label:'Renpho',         icon:'⚖️', color:'#34d399' },
  amazon:        { label:'Amazon',         icon:'📦', color:'#ff9900' },
  walmart:       { label:'Walmart',        icon:'🛒', color:'#0071ce' },
  target:        { label:'Target',         icon:'🎯', color:'#cc0000' },
  instacart:     { label:'Instacart',      icon:'🛍️', color:'#43b02a' },
  'fresh-direct':{ label:'FreshDirect',    icon:'🥬', color:'#5b9a1a' },
  'amazon-fresh':{ label:'Amazon Fresh',   icon:'🌿', color:'#00a8e0' },
  ticketmaster:  { label:'Ticketmaster',   icon:'🎫', color:'#026cdf' },
  zillow:        { label:'Zillow',         icon:'🏠', color:'#006aff' },
  sonos:         { label:'Sonos',          icon:'🔊', color:'#14b8a6' },
  obsidian:      { label:'Obsidian',       icon:'📋', color:'#7c3aed' },
  logistics:     { label:'Logistics',      icon:'🚚', color:'#64748b' },
};

const CATEGORIES = [
  { key:'health',   label:'Health & Fitness', dot:'#22c55e', svcs:['garmin','whoop','apple-health','fitbit','eight-sleep','strava','myfitnesspal','renpho'] },
  { key:'shopping', label:'Shopping',         dot:'#f59e0b', svcs:['amazon','walmart','target','instacart','fresh-direct','amazon-fresh'] },
  { key:'lifestyle',label:'Lifestyle',        dot:'#a855f7', svcs:['ticketmaster','zillow','sonos','obsidian','logistics'] },
];

let D = {};

/* ════ GLOBAL FUNCTIONS (accessible from onclick attrs) ════ */
window.lhNav = function(pid) {
  if (!pid) { renderList(); return; }
  try { renderDetail(pid); }
  catch(e) { document.getElementById('view').innerHTML = '<div style="padding:20px;color:var(--rose)"><b>Error:</b> '+e.message+'</div>'; }
};

window.openServiceModal = function(pid, key) {
  const sm = SVCMETA[key] || {};
  const p  = PERSONAS.find(x => x.id === pid);
  document.getElementById('modal-icon').textContent    = sm.icon || '';
  document.getElementById('modal-name').textContent    = sm.label || key;
  document.getElementById('modal-persona').textContent = p ? p.name + ' · ' + pid : pid;
  document.getElementById('modal-body').innerHTML      = buildModalContent(pid, key);
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
};

window.toggleItems = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
};

/* ════ BOOTSTRAP ════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  hideSplash();
  renderList();
});

async function loadData() {
  const keys = Object.keys(DATA_PATHS);
  let done = 0;
  await Promise.all(keys.map(k =>
    fetch(DATA_PATHS[k])
      .then(r => r.ok ? r.json() : {}).then(j => { D[k] = j; })
      .catch(() => { D[k] = {}; })
      .finally(() => {
        done++;
        const bar = document.getElementById('progress-bar');
        const msg = document.getElementById('load-msg');
        if (bar) bar.style.width = Math.round(done/keys.length*100)+'%';
        if (msg) msg.textContent = 'Loading… '+Math.round(done/keys.length*100)+'%';
      })
  ));
}

function hideSplash() {
  const el = document.getElementById('loading-overlay');
  if (el) { el.classList.add('hidden'); setTimeout(() => el.remove(), 500); }
  const dot = document.getElementById('status-dot');
  if (dot) dot.classList.add('live');
  document.getElementById('status-text').textContent = PERSONAS.length+' personas · 19 services loaded';
}

/* ════ LIST VIEW ════ */
function renderList() {
  const totalOrders = PERSONAS.reduce((s,p) => s + shopOrders(p.id).length, 0);
  const garminDays  = (D.garmin?.daily_stats || []).length;
  const cards = PERSONAS.map(p => {
    const orders = shopOrders(p.id).length;
    const garmin = (D.garmin?.daily_stats || []).filter(d => d.user_id === p.id).length;
    const whoop  = (D.whoop?.cycles || []).filter(c => c.persona_id === p.id).length;
    return '<div class="persona-card" onclick="lhNav(\''+p.id+'\')" style="cursor:pointer">' +
      '<div class="persona-card-top">' +
        '<div class="avatar">'+p.initials+'</div>' +
        '<div>' +
          '<div class="persona-name">'+p.name+'</div>' +
          '<div class="persona-email">'+p.email+'</div>' +
          '<div class="persona-id">'+p.id+'</div>' +
        '</div>' +
      '</div>' +
      '<div class="persona-stats">' +
        '<span class="ps">'+orders+' orders</span>' +
        '<span class="ps">'+garmin+' Garmin days</span>' +
        '<span class="ps">'+whoop+' Whoop cycles</span>' +
      '</div>' +
    '</div>';
  }).join('');
  view(
    '<div class="list-header"><h2>LongHorizon Personas</h2>' +
    '<p>11 personas across 19 integrated services — click any card to explore</p></div>' +
    '<div class="stats-row">' +
      '<span class="stat-pill"><strong>11</strong> Personas</span>' +
      '<span class="stat-pill"><strong>'+totalOrders.toLocaleString()+'</strong> Total Orders</span>' +
      '<span class="stat-pill"><strong>'+garminDays.toLocaleString()+'</strong> Garmin Days</span>' +
      '<span class="stat-pill"><strong>19</strong> Services</span>' +
    '</div>' +
    '<div class="persona-grid">'+cards+'</div>'
  );
}

/* ════ DETAIL VIEW ════ */
function renderDetail(pid) {
  const p = PERSONAS.find(x => x.id === pid);
  if (!p) { renderList(); return; }

  const rows = CATEGORIES.map(cat => {
    const cards = cat.svcs
      .filter(key => hasData(pid, key))
      .map(key => buildServiceCard(pid, key))
      .join('');
    if (!cards) return '';
    return '<div class="cat-row">' +
      '<div class="cat-row-label"><span class="cat-dot" style="background:'+cat.dot+'"></span>'+cat.label+'</div>' +
      '<div class="svc-cards">'+cards+'</div>' +
    '</div>';
  }).join('');

  view(
    '<div class="detail-back" onclick="lhNav(null)">← All Personas</div>' +
    '<div class="detail-hero">' +
      '<div class="hero-avatar">'+p.initials+'</div>' +
      '<div>' +
        '<div class="hero-name">'+p.name+'</div>' +
        '<div class="hero-email">'+p.email+'</div>' +
        '<div class="hero-id">'+p.id+'</div>' +
      '</div>' +
    '</div>' + rows
  );
}

/* ════ SERVICE CARDS ════ */
function buildServiceCard(pid, key) {
  const sm  = SVCMETA[key] || {};
  const sum = getCardSummary(pid, key);
  if (!sum) return '';

  const metrics = sum.metrics.map(m =>
    '<div class="svc-metric'+(m.wide?' wide':'')+'">'+
      '<div class="svc-metric-val" style="'+( m.accent?'color:'+m.accent:'')+'">'+ m.v +'</div>'+
      '<div class="svc-metric-lbl">'+m.l+'</div>'+
    '</div>'
  ).join('');

  const chart = sum.chart ? trendChart(sum.chart, 'card') :
    (sum.sparkValues && sum.sparkValues.length >= 2
      ? '<div class="svc-spark">'+sparkline(sum.sparkValues, sm.color)+'</div>'
      : '');

  return '<div class="svc-card" onclick="openServiceModal(\''+pid+'\',\''+key+'\')">' +
    '<div class="svc-card-hdr">' +
      '<span class="svc-card-icon">'+sm.icon+'</span>' +
      '<span class="svc-card-name">'+sm.label+'</span>' +
      '<span class="svc-card-arrow">›</span>' +
    '</div>' +
    '<div class="svc-metrics">'+metrics+'</div>' +
    chart +
  '</div>';
}

/* ════ CARD SUMMARIES (one per service) ════ */
function getCardSummary(pid, key) {
  switch(key) {
    case 'garmin': {
      const rows = (D.garmin?.daily_stats || []).filter(d => d.user_id === pid)
        .sort((a,b) => a.date.localeCompare(b.date));
      if (!rows.length) return null;
      const avgSteps = Math.round(rows.reduce((s,d)=>s+(d.steps||0),0)/rows.length);
      const avgCal   = Math.round(rows.reduce((s,d)=>s+(d.calories_total||0),0)/rows.length);
      return { metrics:[
        {l:'Days tracked', v:rows.length},
        {l:'Avg steps',    v:avgSteps.toLocaleString()},
        {l:'Avg calories', v:avgCal.toLocaleString()+' kcal'},
        {l:'Last record',  v:rows[rows.length-1].date},
      ], chart: lineChartConfig('Steps by day', [
        {label:'Steps', color:'#22c55e', points:rows.slice(-14).map(d=>({x:d.date, y:d.steps||0}))},
      ]) };
    }
    case 'whoop': {
      const rec = (D.whoop?.recovery || []).filter(r=>r.persona_id===pid)
        .sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
      if (!rec.length) return null;
      const avgRec = Math.round(rec.reduce((s,r)=>s+(r.recovery_score||0),0)/rec.length);
      const avgHRV = (rec.reduce((s,r)=>s+(r.hrv_rmssd||0),0)/rec.length).toFixed(1);
      const last   = rec[rec.length-1];
      const col    = last.recovery_score>=67?'var(--green)':last.recovery_score>=34?'var(--amber)':'var(--rose)';
      return { metrics:[
        {l:'Cycles',      v:rec.length},
        {l:'Avg recovery',v:avgRec+'%'},
        {l:'Avg HRV',     v:avgHRV+' ms'},
        {l:'Latest',      v:last.recovery_score+'%', accent:col},
      ], chart: lineChartConfig('Recovery and HRV by day', [
        {label:'Recovery', color:'#22c55e', points:rec.slice(-14).map(r=>({x:(r.timestamp||'').slice(0,10), y:r.recovery_score||0}))},
        {label:'HRV', color:'#818cf8', points:rec.slice(-14).map(r=>({x:(r.timestamp||'').slice(0,10), y:r.hrv_rmssd||0}))},
      ]) };
    }
    case 'apple-health': {
      const ah    = D['apple-health']||{};
      /* step_records: date (YYYY-MM-DD), total_steps */
      const steps = (ah.step_records||[]).filter(r=>r.user_id===pid)
        .sort((a,b)=>a.date.localeCompare(b.date));
      /* resting_heart_rate_records: date (datetime), value */
      const rhr   = (ah.resting_heart_rate_records||[]).filter(r=>r.user_id===pid)
        .sort((a,b)=>a.date.localeCompare(b.date));
      /* hrv_records: date (datetime), value */
      const hrv   = (ah.hrv_records||[]).filter(r=>r.user_id===pid);
      /* activity_summaries: date (YYYY-MM-DD), active_energy_kcal */
      const act   = (ah.activity_summaries||[]).filter(r=>r.user_id===pid);
      const wkts  = (ah.workout_records||[]).filter(r=>r.user_id===pid);
      const bm    = (ah.body_mass_records||[]).filter(r=>r.user_id===pid);

      if (!steps.length && !rhr.length && !hrv.length && !act.length && !wkts.length && !bm.length) return null;

      const avgSteps     = steps.length ? Math.round(steps.reduce((s,r)=>s+(r.total_steps||0),0)/steps.length) : null;
      const latestRHR    = rhr.length ? rhr[rhr.length-1].value : null;
      const avgHRV       = hrv.length ? (hrv.reduce((s,r)=>s+(r.value||0),0)/hrv.length).toFixed(1) : null;
      const avgActiveKcal= act.length ? Math.round(act.reduce((s,r)=>s+(r.active_energy_kcal||0),0)/act.length) : null;

      const metrics = [];
      if (avgSteps!=null)      metrics.push({l:'Avg daily steps',    v:avgSteps.toLocaleString()});
      if (latestRHR!=null)     metrics.push({l:'Latest RHR',         v:latestRHR+' bpm'});
      if (avgHRV!=null)        metrics.push({l:'Avg HRV',            v:avgHRV+' ms'});
      if (avgActiveKcal!=null) metrics.push({l:'Avg active energy',  v:avgActiveKcal+' kcal'});
      if (wkts.length)         metrics.push({l:'Workouts',           v:wkts.length});
      if (!metrics.length) return null;

      const series = [];
      if (steps.length) series.push({label:'Steps', color:'#ff375f', points:steps.slice(-14).map(r=>({x:r.date, y:r.total_steps||0}))});
      if (rhr.length) series.push({label:'RHR', color:'#f87171', points:rhr.slice(-14).map(r=>({x:(r.date||'').slice(0,10), y:r.value||0}))});
      if (hrv.length) series.push({label:'HRV', color:'#818cf8', points:hrv.slice(-14).map(r=>({x:(r.date||'').slice(0,10), y:r.value||0}))});
      return { metrics, chart: lineChartConfig('Steps, RHR, HRV by day', series) };
    }
    case 'fitbit': {
      const rows = (D.fitbit?.daily_stats||[]).filter(d=>d.user_id===pid)
        .sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      if (!rows.length) return null;
      const avgSteps = Math.round(rows.reduce((s,d)=>s+(d.steps||0),0)/rows.length);
      const avgMin   = Math.round(rows.reduce((s,d)=>s+(d.active_zone_minutes||d.minutes_fairly_active||0),0)/rows.length);
      return { metrics:[
        {l:'Days tracked',   v:rows.length},
        {l:'Avg steps',      v:avgSteps.toLocaleString()},
        {l:'Avg active min', v:avgMin+' min'},
        {l:'Last record',    v:rows[rows.length-1].date||'—'},
      ], chart: lineChartConfig('Steps by day', [
        {label:'Steps', color:'#00b0b9', points:rows.slice(-14).map(d=>({x:d.date||'', y:d.steps||0}))},
      ]) };
    }
    case 'eight-sleep': {
      const sess = (D['eight-sleep']?.sleep_sessions||[]).filter(s=>s.persona_id===pid)
        .sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
      if (!sess.length) return null;
      const scores = sess.map(s=>s.sleep_fitness_score??s.sleep_score).filter(v=>v!=null);
      const avg    = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
      const hrvVals= sess.map(s=>s.hrv_ms??s.hrv).filter(v=>v!=null);
      const avgHRV = hrvVals.length ? (hrvVals.reduce((a,b)=>a+b,0)/hrvVals.length).toFixed(1) : null;
      return { metrics:[
        {l:'Sleep sessions', v:sess.length},
        {l:'Avg sleep score',v:avg!=null?avg:'—'},
        {l:'Avg HRV',        v:avgHRV!=null?avgHRV+' ms':'—'},
        {l:'Last session',   v:(sess[sess.length-1].start_time||'').slice(0,10)},
      ], chart: lineChartConfig('Sleep score by day', [
        {label:'Sleep score', color:'#818cf8', points:sess.slice(-14).map(s=>({x:(s.start_time||s.session_date||'').slice(0,10), y:s.sleep_fitness_score??s.sleep_score}))},
      ]) };
    }
    case 'strava': {
      const acts = (D.strava?.activities||[]).filter(a=>a.user_id===pid);
      if (!acts.length) return null;
      const totalKm = (acts.reduce((s,a)=>s+(a.distance||0),0)/1000).toFixed(1);
      const types   = [...new Set(acts.map(a=>a.type).filter(Boolean))].join(', ');
      const ath     = (D.strava?.athletes||[]).find(a=>a.user_id===pid);
      const sortedActs = acts.slice().sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||''));
      return { metrics:[
        {l:'Activities',  v:acts.length},
        {l:'Total km',    v:Number(totalKm).toLocaleString()+' km'},
        {l:'Types',       v:types||'—', wide:true},
        ...(ath?.ftp ? [{l:'FTP',v:ath.ftp+' W'}] : []),
      ], chart: lineChartConfig('Distance by activity', [
        {label:'Distance km', color:'#fc4c02', points:sortedActs.slice(-14).map(a=>({x:(a.start_date||'').slice(0,10), y:(a.distance||0)/1000}))},
      ]) };
    }
    case 'myfitnesspal': {
      const prof = (D.myfitnesspal?.user_profiles||[]).find(u=>u.persona_id===pid);
      const fMap = {}; (D.myfitnesspal?.foods||[]).forEach(f=>{ fMap[f.food_id]=f; });
      const logs = (D.myfitnesspal?.food_logs||[]).filter(l=>l.user_id===pid||l.persona_id===pid)
        .sort((a,b)=>(a.log_date||a.date||'').localeCompare(b.log_date||b.date||''));
      if (!logs.length) return null;
      const byDate = {};
      logs.forEach(l => {
        const d = l.log_date||l.date; if(!d) return;
        const f = fMap[l.food_id]||{};
        byDate[d] = (byDate[d]||0) + (f.calories!=null ? f.calories*(l.servings??1) : (l.calories||0));
      });
      const days = Object.keys(byDate).sort();
      const avgCal = days.length ? Math.round(Object.values(byDate).reduce((a,b)=>a+b,0)/days.length) : null;
      return { metrics:[
        {l:'Log entries',   v:logs.length},
        {l:'Days logged',   v:days.length},
        {l:'Avg daily cal', v:avgCal!=null?avgCal.toLocaleString()+' kcal':'—'},
        ...(prof?.calorie_goal?[{l:'Daily goal',v:prof.calorie_goal+' kcal'}]:[]),
      ], chart: lineChartConfig('Food calories by day', [
        {label:'Calories', color:'#4ca2cd', points:days.slice(-14).map(d=>({x:d, y:Math.round(byDate[d])}))},
      ]) };
    }
    case 'renpho': {
      const rows = (D.renpho?.measurements||[]).filter(m=>m.persona_id===pid)
        .sort((a,b)=>(a.timestamp||'').localeCompare(b.timestamp||''));
      if (!rows.length) return null;
      const last = rows[rows.length-1];
      return { metrics:[
        {l:'Measurements', v:rows.length},
        {l:'Latest weight',v:last.weight!=null?last.weight+' kg':'—'},
        {l:'BMI',          v:nvl(last.bmi)},
        {l:'Body fat',     v:last.body_fat!=null?last.body_fat+'%':'—'},
      ], chart: lineChartConfig('Weight by date', [
        {label:'Weight', color:'#34d399', points:rows.slice(-14).map(r=>({x:(r.timestamp||'').slice(0,10), y:r.weight}))},
      ]) };
    }
    /* Shopping — all 6 share same logic */
    case 'amazon': case 'walmart': case 'target':
    case 'instacart': case 'fresh-direct': case 'amazon-fresh': {
      const orders = (D[key]?.orders||[]).filter(o=>o.user_id===pid)
        .sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
      if (!orders.length) return null;
      const total = orders.reduce((s,o)=>s+(o.total??o.total_amount??o.subtotal??0),0);
      const last  = orders[orders.length-1];
      return { metrics:[
        {l:'Orders',      v:orders.length},
        {l:'Total spend', v:'$'+Math.round(total).toLocaleString()},
        {l:'Avg order',   v:'$'+(total/orders.length).toFixed(2)},
        {l:'Last order',  v:(last.created_at||'').slice(0,10)},
      ], chart: lineChartConfig('Order total by date', [
        {label:'Order total', color:SVCMETA[key].color, points:orders.slice(-12).map(o=>({x:(o.created_at||'').slice(0,10), y:o.total??o.total_amount??o.subtotal??0}))},
      ]) };
    }
    case 'ticketmaster': {
      const orders = (D.ticketmaster?.orders||[]).filter(o=>o.user_id===pid);
      if (!orders.length) return null;
      const total   = orders.reduce((s,o)=>s+(o.total_price||0),0);
      const evtMap  = {}; (D.ticketmaster?.events||[]).forEach(e=>{evtMap[e.id]=e;});
      const upcoming= orders.filter(o=>{ const e=evtMap[o.event_id]; return e&&e.date>new Date().toISOString().slice(0,10); }).length;
      return { metrics:[
        {l:'Ticket orders',  v:orders.length},
        {l:'Total spend',    v:'$'+Math.round(total).toLocaleString()},
        {l:'Upcoming events',v:upcoming},
        {l:'Past events',    v:orders.length-upcoming},
      ]};
    }
    case 'zillow': {
      const propMap = {}; (D.zillow?.properties||[]).forEach(p=>{propMap[p.id]=p;});
      const saved   = (D.zillow?.saved_properties||[]).filter(s=>s.user_id===pid);
      if (!saved.length) return null;
      const props   = saved.map(s=>propMap[s.property_id]).filter(Boolean);
      const prices  = props.map(p=>p.price).filter(v=>v!=null);
      const minP    = prices.length ? '$'+Math.round(Math.min(...prices)/1000)+'K' : '—';
      const maxP    = prices.length ? '$'+Math.round(Math.max(...prices)/1000)+'K' : '—';
      return { metrics:[
        {l:'Saved properties',v:saved.length},
        {l:'Min price',       v:minP},
        {l:'Max price',       v:maxP},
        {l:'Scheduled tours', v:(D.zillow?.scheduled_tours||[]).filter(t=>t.user_id===pid).length},
      ]};
    }
    case 'sonos': {
      const spks = (D.sonos?.speakers||[]).filter(s=>s.user_id===pid);
      if (!spks.length) return null;
      const playing = spks.find(s=>s.playback_state==='PLAYING'||s.playback_state==='playing');
      const favs = (D.sonos?.favorites||[]).filter(f=>f.user_id===pid).length;
      const trks = (D.sonos?.favorite_tracks||[]).filter(t=>t.user_id===pid).length;
      return { metrics:[
        {l:'Speakers',  v:spks.length},
        {l:'Favorites', v:favs},
        {l:'Tracks',    v:trks},
        ...(playing?[{l:'Now playing',v:esc(playing.now_playing_title||'—'),wide:true}]:[]),
      ]};
    }
    case 'obsidian': {
      const notes = (D.obsidian?.notes||[]).filter(n=>n.user_id===pid)
        .sort((a,b)=>(b.modified_at||'').localeCompare(a.modified_at||''));
      if (!notes.length) return null;
      const tags = (D.obsidian?.tags||[]).filter(t=>t.user_id===pid).length;
      return { metrics:[
        {l:'Notes',        v:notes.length},
        {l:'Tags',         v:tags},
        {l:'Last modified',v:(notes[0]?.modified_at||'').slice(0,10)},
        {l:'Latest note',  v:esc(notes[0]?.title||'—'), wide:true},
      ]};
    }
    case 'logistics': {
      const ships = (D.logistics?.shipments||[]).filter(s=>s.user_id===pid);
      if (!ships.length) return null;
      const delivered  = ships.filter(s=>(s.status||'').toLowerCase()==='delivered').length;
      const inTransit  = ships.length - delivered;
      return { metrics:[
        {l:'Shipments',  v:ships.length},
        {l:'Delivered',  v:delivered, accent:'var(--green)'},
        {l:'In transit', v:inTransit, accent:inTransit?'var(--amber)':undefined},
        {l:'Last ship',  v:(ships.sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]?.created_at||'').slice(0,10)},
      ]};
    }
    default: return null;
  }
}

/* ════ DATA AVAILABILITY CHECK ════ */
function hasData(pid, key) {
  switch(key) {
    case 'garmin':        return (D.garmin?.daily_stats||[]).some(d=>d.user_id===pid);
    case 'whoop':         return (D.whoop?.recovery||[]).some(r=>r.persona_id===pid);
    case 'apple-health': {
      const ah=D['apple-health']||{};
      return ['step_records','resting_heart_rate_records','hrv_records','sleep_records',
              'workout_records','body_mass_records','activity_summaries'].some(t=>(ah[t]||[]).some(r=>r.user_id===pid));
    }
    case 'fitbit':        return (D.fitbit?.daily_stats||[]).some(d=>d.user_id===pid);
    case 'eight-sleep':   return (D['eight-sleep']?.sleep_sessions||[]).some(s=>s.persona_id===pid);
    case 'strava':        return (D.strava?.activities||[]).some(a=>a.user_id===pid);
    case 'myfitnesspal':  return (D.myfitnesspal?.food_logs||[]).some(l=>l.user_id===pid||l.persona_id===pid);
    case 'renpho':        return (D.renpho?.measurements||[]).some(m=>m.persona_id===pid);
    case 'amazon': case 'walmart': case 'target':
    case 'instacart': case 'fresh-direct': case 'amazon-fresh':
                          return (D[key]?.orders||[]).some(o=>o.user_id===pid);
    case 'ticketmaster':  return (D.ticketmaster?.orders||[]).some(o=>o.user_id===pid);
    case 'zillow':        return (D.zillow?.saved_properties||[]).some(s=>s.user_id===pid);
    case 'sonos':         return (D.sonos?.speakers||[]).some(s=>s.user_id===pid);
    case 'obsidian':      return (D.obsidian?.notes||[]).some(n=>n.user_id===pid);
    case 'logistics':     return (D.logistics?.shipments||[]).some(s=>s.user_id===pid);
    default:              return false;
  }
}

/* ════ SVG SPARKLINE ════ */
function sparkline(vals, color) {
  if (!vals || vals.length < 2) return '';
  const W=160, H=40;
  const max=Math.max(...vals), min=Math.min(...vals), range=max-min||1;
  const pts = vals.map((v,i) =>
    ((i/(vals.length-1))*W).toFixed(1)+','+(H-4-((v-min)/range)*(H-8)).toFixed(1)
  ).join(' ');
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">' +
    '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
}

/* ════ MODAL CONTENT ROUTER ════ */
function lineChartConfig(title, series) {
  const cleaned = (series||[]).map(s => ({
    label: s.label,
    color: s.color,
    points: (s.points||[]).filter(p => p && p.y != null && Number.isFinite(Number(p.y)))
  })).filter(s => s.points.length >= 2);
  return cleaned.length ? { title, series: cleaned } : null;
}

function trendChart(chart, size) {
  if (!chart || !chart.series || !chart.series.length) return '';
  const W = 180, H = size === 'modal' ? 70 : 48;
  const pad = 4;
  const paths = chart.series.map(series => {
    const values = series.points.map(p => Number(p.y));
    const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
    const pts = series.points.map((p, i) => {
      const x = pad + (i / (series.points.length - 1)) * (W - pad * 2);
      const y = H - pad - ((Number(p.y) - min) / range) * (H - pad * 2);
      return { x, y, raw: p.y, label: p.x };
    });
    const d = pts.map(p => p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
    const dots = size === 'modal' ? pts.map(p =>
      '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="2" fill="'+series.color+'"><title>'+esc(series.label+' - '+p.label+': '+p.raw)+'</title></circle>'
    ).join('') : '';
    return '<polyline points="'+d+'" fill="none" stroke="'+series.color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><title>'+esc(series.label)+'</title></polyline>'+dots;
  }).join('');
  const legend = chart.series.map(s =>
    '<span style="--legend-color:'+s.color+'">'+esc(s.label)+'</span>'
  ).join('');
  return '<div class="trend-chart '+(size === 'modal' ? 'modal-chart' : '')+'">' +
    '<div class="trend-chart-title">'+esc(chart.title)+'</div>' +
    '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+paths+'</svg>' +
    (size === 'modal' && chart.series.length > 1 ? '<div class="trend-chart-legend">'+legend+'</div>' : '') +
  '</div>';
}

function buildModalContent(pid, key) {
  const sm = SVCMETA[key]||{};
  const sum = getCardSummary(pid, key);
  const summaryBar = sum ? '<div class="modal-summary">' +
    sum.metrics.map(m =>
      '<div class="modal-stat">' +
        '<div class="modal-stat-val" style="'+(m.accent?'color:'+m.accent:'')+'">'+(m.v??'—')+'</div>' +
        '<div class="modal-stat-lbl">'+m.l+'</div>' +
      '</div>'
    ).join('') +
    (sum.chart ? trendChart(sum.chart, 'modal') :
      (sum.sparkValues && sum.sparkValues.length >= 2
        ? '<div style="flex:1;min-width:160px;display:flex;align-items:center;padding:0 4px">'+sparkline(sum.sparkValues, sm.color)+'</div>'
        : '')) +
  '</div>' : '';

  let detail = '';
  switch(key) {
    case 'garmin':        detail = modalGarmin(pid);        break;
    case 'whoop':         detail = modalWhoop(pid);         break;
    case 'apple-health':  detail = modalAppleHealth(pid);   break;
    case 'fitbit':        detail = modalFitbit(pid);        break;
    case 'eight-sleep':   detail = modalEightSleep(pid);    break;
    case 'strava':        detail = modalStrava(pid);        break;
    case 'myfitnesspal':  detail = modalMFP(pid);           break;
    case 'renpho':        detail = modalRenpho(pid);        break;
    case 'amazon': case 'walmart': case 'target':
    case 'instacart': case 'fresh-direct': case 'amazon-fresh':
                          detail = modalShop(pid, key);     break;
    case 'ticketmaster':  detail = modalTicketmaster(pid);  break;
    case 'zillow':        detail = modalZillow(pid);        break;
    case 'sonos':         detail = modalSonos(pid);         break;
    case 'obsidian':      detail = modalObsidian(pid);      break;
    case 'logistics':     detail = modalLogistics(pid);     break;
    default:              detail = empty();
  }
  return summaryBar + detail;
}

/* ════ MODAL DATA BUILDERS ════ */
function modalGarmin(pid) {
  const rows = (D.garmin?.daily_stats||[]).filter(d=>d.user_id===pid)
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (!rows.length) return empty();
  const body = rows.map(d =>
    '<tr><td>'+d.date+'</td><td class="num">'+fmt(d.steps)+'</td>' +
    '<td class="num">'+fmt(d.calories_total)+'</td>' +
    '<td class="num">'+(d.distance_meters?(d.distance_meters/1000).toFixed(1):'—')+'</td>' +
    '<td class="num">'+nvl(d.floors_climbed)+'</td>' +
    '<td class="num">'+nvl(d.intensity_minutes)+'</td></tr>'
  ).join('');
  return tableWrap(['Date','Steps','Calories','Dist (km)','Floors','Intensity Min'], body);
}

function modalWhoop(pid) {
  const recovery = (D.whoop?.recovery||[]).filter(r=>r.persona_id===pid);
  const cycles   = (D.whoop?.cycles||[]).filter(c=>c.persona_id===pid);
  const cMap = {}; cycles.forEach(c=>{cMap[c.cycle_id]=c;});
  const rows = recovery.map(r=>Object.assign({},r,{_c:cMap[r.cycle_id]||{}}))
    .sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  if (!rows.length) return empty();
  const body = rows.map(r => {
    const col = r.recovery_score>=67?'var(--green)':r.recovery_score>=34?'var(--amber)':'var(--rose)';
    return '<tr><td>'+r.timestamp.slice(0,10)+'</td>' +
      '<td class="num"><strong style="color:'+col+'">'+r.recovery_score+'%</strong></td>' +
      '<td class="num">'+nvl(r.hrv_rmssd)+'</td><td class="num">'+nvl(r.resting_heart_rate)+'</td>' +
      '<td class="num">'+nvl(r.spo2_percentage)+'</td><td class="num">'+nvl(r.skin_temp_celsius)+'</td>' +
      '<td class="num">'+nvl(r._c.strain)+'</td><td class="num">'+nvl(r._c.kilojoules)+'</td></tr>';
  }).join('');
  return tableWrap(['Date','Recovery %','HRV (ms)','RHR (bpm)','SpO₂ %','Skin Temp °C','Strain','kJ'], body);
}

function modalAppleHealth(pid) {
  const ah   = D['apple-health']||{};
  const prof = (ah.user_profiles||[]).find(u=>u.user_id===pid);
  let out    = '';

  if (prof) {
    out += fields([
      ['Height',prof.height_cm?prof.height_cm+' cm':null],
      ['Weight',prof.weight_kg?prof.weight_kg+' kg':null],
      ['Date of Birth',prof.date_of_birth],['Sex',prof.sex],
    ]);
  }

  /* Daily Steps — step_records: date (YYYY-MM-DD), total_steps */
  const steps = (ah.step_records||[]).filter(r=>r.user_id===pid)
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (steps.length) {
    const sv = steps.slice(0,30).reverse().map(r=>r.total_steps||0);
    out += '<div class="sub-heading">Daily Steps ('+steps.length+' days)</div>';
    if (sv.length>=2) out += '<div style="padding:6px 12px 2px">'+sparkline(sv,'#ff375f')+'</div>';
    out += tableWrap(['Date','Total Steps'],
      steps.map(r=>'<tr><td>'+r.date+'</td><td class="num">'+fmt(r.total_steps)+'</td></tr>').join(''));
  }

  /* Activity Summaries — date (YYYY-MM-DD), active_energy_kcal, exercise_minutes, stand_hours, distance_km, flights_climbed */
  const act = (ah.activity_summaries||[]).filter(r=>r.user_id===pid)
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (act.length) {
    const sv = act.slice(0,30).reverse().map(r=>r.active_energy_kcal||0);
    out += '<div class="sub-heading" style="margin-top:14px">Activity Summaries ('+act.length+' days)</div>';
    if (sv.length>=2) out += '<div style="padding:6px 12px 2px">'+sparkline(sv,'#ff9900')+'</div>';
    out += tableWrap(['Date','Active Energy (kcal)','Basal (kcal)','Exercise Min','Stand Hours','Distance (km)','Flights'],
      act.map(r=>'<tr><td>'+r.date+'</td>' +
        '<td class="num">'+nvl(r.active_energy_kcal)+'</td>' +
        '<td class="num">'+nvl(r.basal_energy_kcal)+'</td>' +
        '<td class="num">'+nvl(r.exercise_minutes)+'</td>' +
        '<td class="num">'+nvl(r.stand_hours)+'</td>' +
        '<td class="num">'+(r.distance_km!=null?r.distance_km.toFixed(2):'—')+'</td>' +
        '<td class="num">'+nvl(r.flights_climbed)+'</td></tr>').join(''));
  }

  /* Resting Heart Rate — date (datetime), value (bpm) */
  const rhr = (ah.resting_heart_rate_records||[]).filter(r=>r.user_id===pid)
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (rhr.length) {
    const sv = rhr.slice(0,30).reverse().map(r=>r.value||0);
    out += '<div class="sub-heading" style="margin-top:14px">Resting Heart Rate ('+rhr.length+' records)</div>';
    if (sv.length>=2) out += '<div style="padding:6px 12px 2px">'+sparkline(sv,'#f87171')+'</div>';
    out += tableWrap(['Date','RHR (bpm)'],
      rhr.map(r=>'<tr><td>'+r.date.slice(0,10)+'</td><td class="num">'+r.value+'</td></tr>').join(''));
  }

  /* HRV — date (datetime), value (ms) */
  const hrv = (ah.hrv_records||[]).filter(r=>r.user_id===pid)
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (hrv.length) {
    const sv = hrv.slice(0,30).reverse().map(r=>r.value||0);
    out += '<div class="sub-heading" style="margin-top:14px">HRV ('+hrv.length+' records)</div>';
    if (sv.length>=2) out += '<div style="padding:6px 12px 2px">'+sparkline(sv,'#818cf8')+'</div>';
    out += tableWrap(['Date','HRV (ms)'],
      hrv.map(r=>'<tr><td>'+r.date.slice(0,10)+'</td><td class="num">'+r.value.toFixed(1)+'</td></tr>').join(''));
  }

  /* Heart Rate — aggregated by day (raw records too dense to show individually) */
  const hrRecs = (ah.heart_rate_records||[]).filter(r=>r.user_id===pid);
  if (hrRecs.length) {
    const byDay = {};
    hrRecs.forEach(r=>{ const d=r.date.slice(0,10); if(!byDay[d])byDay[d]=[]; byDay[d].push(r.value); });
    const days  = Object.keys(byDay).sort().reverse();
    const avgByDay = days.map(d=>{ const v=byDay[d]; return Math.round(v.reduce((s,x)=>s+x,0)/v.length); });
    out += '<div class="sub-heading" style="margin-top:14px">Heart Rate — Daily Aggregated ('+days.length+' days · '+hrRecs.length.toLocaleString()+' samples)</div>';
    if (avgByDay.slice(0,30).length>=2) out += '<div style="padding:6px 12px 2px">'+sparkline(avgByDay.slice(0,30).reverse(),'#f87171')+'</div>';
    out += tableWrap(['Date','Samples','Min (bpm)','Avg (bpm)','Max (bpm)'],
      days.map(d=>{
        const vals=byDay[d], mn=Math.min(...vals), mx=Math.max(...vals);
        const avg=Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
        return '<tr><td>'+d+'</td><td class="num">'+vals.length+'</td>' +
          '<td class="num">'+mn+'</td><td class="num">'+avg+'</td><td class="num">'+mx+'</td></tr>';
      }).join(''));
  }

  /* Sleep — aggregated per night from segments (start, end, stage) */
  const sleepRecs = (ah.sleep_records||[]).filter(r=>r.user_id===pid);
  if (sleepRecs.length) {
    const nights = {};
    sleepRecs.forEach(r=>{
      const d = r.start.slice(0,10);
      if (!nights[d]) nights[d]={};
      const mins = (new Date(r.end)-new Date(r.start))/60000;
      nights[d][r.stage] = (nights[d][r.stage]||0)+mins;
    });
    const sortedNights = Object.keys(nights).sort().reverse();
    out += '<div class="sub-heading" style="margin-top:14px">Sleep ('+sortedNights.length+' nights · '+sleepRecs.length+' segments)</div>';
    out += tableWrap(['Date','Deep (min)','REM (min)','Other (min)','Total (min)'],
      sortedNights.map(d=>{
        const n=nights[d];
        const deep =Math.round(n.asleepDeep||0);
        const rem  =Math.round(n.asleepREM||0);
        const other=Math.round(Object.entries(n).filter(([k])=>k!=='asleepDeep'&&k!=='asleepREM').reduce((s,[,v])=>s+v,0));
        const tot  =deep+rem+other;
        return '<tr><td>'+d+'</td><td class="num">'+deep+'</td><td class="num">'+rem+'</td>' +
          '<td class="num">'+other+'</td><td class="num"><strong>'+tot+'</strong></td></tr>';
      }).join(''));
  }

  /* Workouts — start (datetime), activity_type, duration_minutes, total_energy_kcal, total_distance_km */
  const wkts = (ah.workout_records||[]).filter(r=>r.user_id===pid)
    .sort((a,b)=>b.start.localeCompare(a.start));
  if (wkts.length) {
    out += '<div class="sub-heading" style="margin-top:14px">Workouts ('+wkts.length+' sessions)</div>';
    out += tableWrap(['Date','Type','Duration (min)','Energy (kcal)','Distance (km)'],
      wkts.map(r=>'<tr><td>'+r.start.slice(0,10)+'</td>' +
        '<td><span class="badge badge-teal">'+esc(r.activity_type||'—')+'</span></td>' +
        '<td class="num">'+(r.duration_minutes!=null?r.duration_minutes.toFixed(1):'—')+'</td>' +
        '<td class="num">'+(r.total_energy_kcal!=null?r.total_energy_kcal.toFixed(1):'—')+'</td>' +
        '<td class="num">'+(r.total_distance_km!=null?r.total_distance_km.toFixed(2):'—')+'</td></tr>').join(''));
  }

  /* Body Mass — date (datetime), value (kg) */
  const bm = (ah.body_mass_records||[]).filter(r=>r.user_id===pid)
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (bm.length) {
    const sv = bm.slice(0,20).reverse().map(r=>r.value||0);
    out += '<div class="sub-heading" style="margin-top:14px">Body Mass ('+bm.length+' records)</div>';
    if (sv.length>=2) out += '<div style="padding:6px 12px 2px">'+sparkline(sv,'#34d399')+'</div>';
    out += tableWrap(['Date','Weight (kg)'],
      bm.map(r=>'<tr><td>'+r.date.slice(0,10)+'</td><td class="num">'+r.value+'</td></tr>').join(''));
  }

  return out || empty('No Apple Health data for this persona.');
}

function modalFitbit(pid) {
  const prof = (D.fitbit?.user_profiles||[]).find(u=>u.user_id===pid);
  const rows = (D.fitbit?.daily_stats||[]).filter(d=>d.user_id===pid)
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  let out = '';
  if (prof) out += fields([
    ['Display Name',prof.display_name], ['Gender',prof.gender],
    ['DOB',prof.date_of_birth], ['Height',prof.height?prof.height+' cm':null],
    ['Weight',prof.weight?prof.weight+' kg':null], ['Member Since',prof.member_since],
  ]);
  if (!rows.length) return out + empty('No daily stats');
  const body = rows.map(d =>
    '<tr><td>'+(d.date||'—')+'</td><td class="num">'+fmt(d.steps)+'</td>' +
    '<td class="num">'+fmt(d.calories_total??d.calories)+'</td>' +
    '<td class="num">'+nvl(d.active_zone_minutes??d.minutes_fairly_active)+'</td>' +
    '<td class="num">'+nvl(d.resting_heart_rate)+' bpm</td></tr>'
  ).join('');
  return out + tableWrap(['Date','Steps','Calories','Active Zone Min','Rest HR'], body);
}

function modalEightSleep(pid) {
  const prof = (D['eight-sleep']?.users||[]).find(u=>u.persona_id===pid);
  const dev  = (D['eight-sleep']?.devices||[]).find(d=>d.persona_id===pid);
  const sess = (D['eight-sleep']?.sleep_sessions||[]).filter(s=>s.persona_id===pid)
    .sort((a,b)=>(b.start_time||b.session_date||'').localeCompare(a.start_time||a.session_date||''));
  let out = '';
  if (prof||dev) out += fields([
    ...(prof?[['Timezone',prof.timezone],['Temp Unit',prof.temperature_unit?.toUpperCase()],['Bed Side',prof.bed_side]]:[]),
    ...(dev?[['Pod Model',dev.model],['Firmware',dev.firmware_version],['Water Level',dev.water_level_pct!=null?dev.water_level_pct+'%':null]]:[]),
  ]);
  if (!sess.length) return out + empty('No sleep sessions');
  const body = sess.map(s => {
    const score = s.sleep_fitness_score??s.sleep_score;
    const col   = score!=null?(score>=80?'var(--green)':score>=60?'var(--amber)':'var(--rose)'):'';
    return '<tr><td>'+(s.start_time||s.session_date||'').slice(0,10)+'</td>' +
      '<td class="num">'+(score!=null?'<strong style="color:'+col+'">'+score+'</strong>':'—')+'</td>' +
      '<td class="num">'+nvl(s.hrv_ms??s.hrv)+'</td>' +
      '<td class="num">'+nvl(s.respiratory_rate)+'</td></tr>';
  }).join('');
  return out + tableWrap(['Date','Sleep Score','HRV (ms)','Resp Rate'], body);
}

function modalStrava(pid) {
  const ath  = (D.strava?.athletes||[]).find(a=>a.user_id===pid);
  const acts = (D.strava?.activities||[]).filter(a=>a.user_id===pid)
    .sort((a,b)=>b.start_date.localeCompare(a.start_date));
  let out = '';
  if (ath) out += fields([
    ['Location',ath.city+', '+ath.state], ['Premium',ath.premium?'Yes':'No'],
    ['FTP',ath.ftp?ath.ftp+' W':null], ['Weight',ath.weight?ath.weight+' kg':null],
  ]);
  if (!acts.length) return out + empty('No activities');
  const body = acts.map(a =>
    '<tr><td>'+a.start_date.slice(0,10)+'</td><td>'+esc(a.name||'')+'</td>' +
    '<td><span class="badge badge-teal">'+esc(a.type||'')+'</span></td>' +
    '<td class="num">'+(a.distance?(a.distance/1000).toFixed(2):'—')+' km</td>' +
    '<td class="num">'+(a.moving_time?Math.round(a.moving_time/60)+' min':'—')+'</td>' +
    '<td class="num">'+nvl(a.average_heartrate)+' bpm</td>' +
    '<td class="num">'+nvl(a.total_elevation_gain)+' m</td>' +
    '<td class="num">'+nvl(a.average_watts)+' W</td>' +
    '<td class="num">'+nvl(a.kilojoules)+' kJ</td></tr>'
  ).join('');
  return out + tableWrap(['Date','Name','Type','Distance','Duration','Avg HR','Elevation','Avg W','kJ'], body);
}

function modalMFP(pid) {
  const prof = (D.myfitnesspal?.user_profiles||[]).find(u=>u.persona_id===pid);
  const fMap = {}; (D.myfitnesspal?.foods||[]).forEach(f=>{fMap[f.food_id]=f;});
  const logs = (D.myfitnesspal?.food_logs||[]).filter(l=>l.user_id===pid||l.persona_id===pid)
    .sort((a,b)=>(b.log_date||b.date||'').localeCompare(a.log_date||a.date||''));
  let out = '';
  if (prof) out += fields([
    ['Calorie Goal',prof.calorie_goal?prof.calorie_goal+' kcal':null],
    ['Protein Goal',prof.protein_goal_g?prof.protein_goal_g+' g':null],
    ['Carbs Goal',prof.carbs_goal_g?prof.carbs_goal_g+' g':null],
    ['Fat Goal',prof.fat_goal_g?prof.fat_goal_g+' g':null],
    ['Activity Level',prof.activity_level], ['Goal',prof.goal],
  ]);
  if (!logs.length) return out + empty('No food logs');
  const body = logs.map(l => {
    const f=fMap[l.food_id]||{}, srv=Number(l.servings??1);
    const cal =(f.calories!=null?Math.round(f.calories*srv):(l.calories??'—'));
    const pro =(f.protein_g!=null?(f.protein_g*srv).toFixed(1):(l.protein_g??'—'));
    const carb=(f.carbs_g!=null?(f.carbs_g*srv).toFixed(1):(l.carbs_g??'—'));
    const fat =(f.fat_g!=null?(f.fat_g*srv).toFixed(1):(l.fat_g??'—'));
    return '<tr><td>'+(l.log_date||l.date||'—')+'</td><td>'+esc(f.name||l.food_id||'—')+'</td>' +
      '<td class="num">'+srv+'</td><td class="num">'+cal+' kcal</td>' +
      '<td class="num">'+pro+' g</td><td class="num">'+carb+' g</td><td class="num">'+fat+' g</td></tr>';
  }).join('');
  return out + tableWrap(['Date','Food','Servings','Calories','Protein','Carbs','Fat'], body);
}

function modalRenpho(pid) {
  const rows = (D.renpho?.measurements||[]).filter(m=>m.persona_id===pid)
    .sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||''));
  if (!rows.length) return empty();
  const body = rows.map(m =>
    '<tr><td>'+(m.timestamp||'').slice(0,10)+'</td>' +
    '<td class="num">'+nvl(m.weight)+' kg</td><td class="num">'+nvl(m.bmi)+'</td>' +
    '<td class="num">'+nvl(m.body_fat)+'%</td><td class="num">'+nvl(m.muscle_mass)+' kg</td>' +
    '<td class="num">'+nvl(m.water_percentage)+'%</td><td class="num">'+nvl(m.bone_mass)+' kg</td>' +
    '<td class="num">'+nvl(m.visceral_fat)+'</td><td class="num">'+nvl(m.bmr)+'</td></tr>'
  ).join('');
  return tableWrap(['Date','Weight','BMI','Body Fat %','Muscle','Water %','Bone','Visceral Fat','BMR'], body);
}

function modalShop(pid, key) {
  const sd      = D[key]||{};
  const orders  = (sd.orders||[]).filter(o=>o.user_id===pid)
    .sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  const prods   = sd.products||[];
  const vars    = sd.product_variants||[];
  const iMap    = {};
  (sd.order_items||[]).forEach(i=>{ const k=i.order_id??i.id; if(k==null)return; if(!iMap[k])iMap[k]=[]; iMap[k].push(i); });
  if (!orders.length) return empty();

  const rows = orders.map((o,idx) => {
    const oid   = o.order_id??o.id??('o'+idx);
    const items = iMap[oid]||[];
    const rowId = 'itm-'+String(oid).replace(/[^a-z0-9]/gi,'-');
    const iRows = items.map(item => {
      const p = prods.find(x=>x.asin===item.asin||x.product_id===item.product_id)||
                vars.find(v=>v.variant_id===item.variant_id||v.product_id===item.product_id)||{};
      const nm  = p.title??p.name??item.product_title??item.name??String(item.asin??item.product_id??item.variant_id??'—');
      const pr  = item.price_at_purchase??item.unit_price??item.price;
      const qty = item.quantity??1;
      return '<tr><td>'+esc(nm)+'</td><td class="num">'+qty+'</td>' +
        '<td class="num">'+(pr!=null?'$'+Number(pr).toFixed(2):'—')+'</td>' +
        '<td class="num">'+(pr!=null?'$'+(Number(pr)*qty).toFixed(2):'—')+'</td></tr>';
    }).join('');
    return '<tr style="cursor:'+(items.length?'pointer':'default')+'"'+(items.length?' onclick="toggleItems(\''+rowId+'\')"':'')+'>'+
      '<td>'+(o.created_at||'—').slice(0,10)+'</td>' +
      '<td class="mono dim">'+esc(String(oid))+'</td>' +
      '<td class="num">$'+Number(o.total??o.total_amount??o.subtotal??0).toFixed(2)+'</td>' +
      '<td>'+statusBadge(o.status??o.order_status??'')+'</td>' +
      '<td>'+(o.carrier||'—')+'</td>' +
      '<td>'+(items.length?'<span style="color:var(--teal);font-size:11px">▸ '+items.length+' item'+(items.length!==1?'s':'')+'</span>':'<span class="dim">—</span>')+'</td>' +
    '</tr>' +
    (items.length?'<tr id="'+rowId+'" class="items-row" style="display:none"><td colspan="6"><div class="items-inner"><table class="data-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>'+iRows+'</tbody></table></div></td></tr>':'');
  }).join('');
  return tableWrap(['Date','Order ID','Total','Status','Carrier','Items'], rows);
}

function modalTicketmaster(pid) {
  const tm     = D.ticketmaster||{};
  const orders = (tm.orders||[]).filter(o=>o.user_id===pid)
    .sort((a,b)=>b.purchased_at.localeCompare(a.purchased_at));
  if (!orders.length) return empty();
  const eMap={}, vMap={};
  (tm.events||[]).forEach(e=>{eMap[e.id]=e;});
  (tm.venues||[]).forEach(v=>{vMap[v.id]=v;});
  const body = orders.map(o => {
    const e=eMap[o.event_id]||{}, v=vMap[e.venue_id]||{};
    return '<tr><td>'+o.purchased_at.slice(0,10)+'</td><td>'+esc(e.name||'—')+'</td>' +
      '<td>'+(e.date||'—')+(e.time?' '+e.time:'')+'</td>' +
      '<td>'+esc(v.name||'—')+'</td>' +
      '<td>'+(v.city?v.city+', '+v.state:'—')+'</td>' +
      '<td class="num">'+nvl(o.quantity)+'</td>' +
      '<td class="num">$'+Number(o.total_price||o.subtotal||0).toFixed(2)+'</td>' +
      '<td class="mono dim">'+esc(o.confirmation_code||'—')+'</td></tr>';
  }).join('');
  return tableWrap(['Purchased','Event','Event Date','Venue','Location','Qty','Total','Confirmation'], body);
}

function modalZillow(pid) {
  const zd   = D.zillow||{};
  const pMap = {}; (zd.properties||[]).forEach(p=>{pMap[p.id]=p;});
  const saved = (zd.saved_properties||[]).filter(s=>s.user_id===pid)
    .sort((a,b)=>b.saved_at.localeCompare(a.saved_at));
  if (!saved.length) return empty();

  let out = '';
  const tours = (zd.scheduled_tours||[]).filter(t=>t.user_id===pid);

  const propRows = saved.map(s => {
    const p=pMap[s.property_id]||{};
    return '<tr><td>'+esc(p.address||String(s.property_id))+'</td>' +
      '<td>'+(p.city?p.city+', '+p.state:'—')+'</td>' +
      '<td class="num">'+(p.price?'$'+Number(p.price).toLocaleString():'—')+'</td>' +
      '<td class="num">'+nvl(p.bedrooms)+'</td><td class="num">'+nvl(p.bathrooms)+'</td>' +
      '<td class="num">'+(p.sqft?Number(p.sqft).toLocaleString():'—')+'</td>' +
      '<td>'+(p.home_type||'—')+'</td><td>'+(p.property_status||'—')+'</td>' +
      '<td>'+s.saved_at.slice(0,10)+'</td>' +
      '<td style="font-size:11px;color:var(--text3)">'+esc(s.notes||'')+'</td></tr>';
  }).join('');
  out += tableWrap(['Address','City','Price','Beds','Baths','Sqft','Type','Status','Saved','Notes'], propRows);

  if (tours.length) {
    out += '<div class="sub-heading" style="margin-top:16px">Scheduled Tours ('+tours.length+')</div>';
    const tRows = tours.map(t => {
      const p=pMap[t.property_id]||{};
      return '<tr><td>'+esc(p.address||String(t.property_id))+'</td>' +
        '<td>'+(t.tour_date||t.scheduled_at||'—').slice(0,10)+'</td>' +
        '<td>'+(t.status||t.tour_type||'—')+'</td></tr>';
    }).join('');
    out += tableWrap(['Property','Date','Status'], tRows);
  }
  return out;
}

function modalSonos(pid) {
  const sn  = D.sonos||{};
  const spks= (sn.speakers||[]).filter(s=>s.user_id===pid);
  const favs= (sn.favorites||[]).filter(f=>f.user_id===pid);
  const trks= (sn.favorite_tracks||[]).filter(t=>t.user_id===pid);
  let out = '';
  if (spks.length) {
    const body = spks.map(s =>
      '<tr><td>'+esc(s.room||'—')+'</td><td>'+esc(s.model||'—')+'</td>' +
      '<td class="num">'+nvl(s.volume)+'%</td>' +
      '<td>'+statusBadge(s.playback_state||'')+'</td>' +
      '<td>'+esc(s.now_playing_title||'—')+'</td>' +
      '<td>'+esc(s.now_playing_artist||'—')+'</td>' +
      '<td>'+(s.now_playing_source||'—')+'</td></tr>'
    ).join('');
    out += tableWrap(['Room','Model','Vol','State','Now Playing','Artist','Source'], body);
  }
  if (favs.length) {
    out += '<div class="sub-heading" style="margin-top:16px">Favorites ('+favs.length+')</div>';
    out += tableWrap(['Name','Type','Added'],
      favs.map(f=>'<tr><td>'+esc(f.name??f.title??'—')+'</td><td>'+(f.type||'—')+'</td><td>'+(f.added_at||'').slice(0,10)+'</td></tr>').join(''));
  }
  if (trks.length) {
    out += '<div class="sub-heading" style="margin-top:16px">Favorite Tracks ('+trks.length+')</div>';
    out += tableWrap(['Track','Artist','Album','Service'],
      trks.map(t=>'<tr><td>'+esc(t.title??t.track_name??'—')+'</td><td>'+esc(t.artist||'—')+'</td><td>'+esc(t.album||'—')+'</td><td>'+(t.service||t.source||'—')+'</td></tr>').join(''));
  }
  return out || empty();
}

function modalObsidian(pid) {
  const notes = (D.obsidian?.notes||[]).filter(n=>n.user_id===pid)
    .sort((a,b)=>(b.modified_at||'').localeCompare(a.modified_at||''));
  if (!notes.length) return empty();
  const body = notes.map(n => {
    const tags    = (n.tags||[]).map(t=>'<span style="background:rgba(124,58,237,.12);color:var(--violet);border-radius:3px;padding:1px 5px;font-size:9px">'+esc(t)+'</span>').join(' ');
    const preview = (n.content||'').replace(/[#\[\]]/g,'').trim().slice(0,80);
    return '<tr><td>'+(n.created_at||n.modified_at||'').slice(0,10)+'</td>' +
      '<td>'+esc(n.folder||'—')+'</td>' +
      '<td><strong>'+esc(n.title||n.path||'—')+'</strong></td>' +
      '<td style="font-size:11px;color:var(--text3)">'+esc(preview)+(n.content?.length>80?'…':'')+'</td>' +
      '<td>'+tags+'</td></tr>';
  }).join('');
  return tableWrap(['Date','Folder','Title','Preview','Tags'], body);
}

function modalLogistics(pid) {
  const lg   = D.logistics||{};
  const ships= (lg.shipments||[]).filter(s=>s.user_id===pid)
    .sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if (!ships.length) return empty();
  const eIdx = {};
  (lg.tracking_events||[]).forEach(e=>{ if(!eIdx[e.tracking_number])eIdx[e.tracking_number]=[]; eIdx[e.tracking_number].push(e); });
  const rows = ships.map(s => {
    const evts = eIdx[s.tracking_number]||[];
    const rid  = 'pkg-'+s.tracking_number.replace(/[^a-z0-9]/gi,'-');
    const eRows= evts.sort((a,b)=>(a.timestamp||'').localeCompare(b.timestamp||''))
      .map(e=>'<tr><td>'+(e.timestamp||'').slice(0,16).replace('T',' ')+'</td><td>'+esc(e.location||'—')+'</td><td>'+esc(e.status||e.description||'—')+'</td></tr>').join('');
    return '<tr style="cursor:'+(evts.length?'pointer':'default')+'"'+(evts.length?' onclick="toggleItems(\''+rid+'\')"':'')+'>'+
      '<td>'+s.created_at.slice(0,10)+'</td>' +
      '<td class="mono dim" style="font-size:10px">'+esc(s.tracking_number)+'</td>' +
      '<td>'+(s.carrier||'—')+'</td>'+
      '<td>'+statusBadge(s.status||'')+'</td>' +
      '<td>'+(s.origin||'—')+'</td>' +
      '<td style="font-size:11px">'+esc(s.destination||'—')+'</td>' +
      '<td>'+((s.actual_delivery||s.estimated_delivery||'').slice(0,10)||'—')+'</td>' +
      '<td>'+(evts.length?'<span style="color:var(--teal);font-size:11px">▸ '+evts.length+'</span>':'<span class="dim">—</span>')+'</td></tr>' +
      (evts.length?'<tr id="'+rid+'" class="items-row" style="display:none"><td colspan="8"><div class="items-inner"><table class="data-table"><thead><tr><th>Timestamp</th><th>Location</th><th>Status</th></tr></thead><tbody>'+eRows+'</tbody></table></div></td></tr>':'');
  }).join('');
  return tableWrap(['Created','Tracking #','Carrier','Status','Origin','Destination','Delivered','Events'], rows);
}

/* ════ UTILITIES ════ */
function shopOrders(pid) {
  return ['amazon','walmart','target','instacart','fresh-direct','amazon-fresh']
    .flatMap(k=>(D[k]?.orders||[]).filter(o=>o.user_id===pid));
}
function view(html) { document.getElementById('view').innerHTML = html; }
function tableWrap(headers, body) {
  return '<div class="table-wrap"><table class="data-table"><thead><tr>'+
    headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+
    (body||'<tr><td colspan="'+headers.length+'" class="empty">No records</td></tr>')+
  '</tbody></table></div>';
}
function fields(pairs) {
  const cells = pairs.filter(([,v])=>v!=null)
    .map(([k,v])=>'<div class="field"><div class="field-key">'+k+'</div><div class="field-val">'+esc(String(v))+'</div></div>').join('');
  return cells ? '<div class="fields-grid">'+cells+'</div>' : '';
}
function empty(msg) { return '<div class="empty">'+(msg||'No data for this persona.')+'</div>'; }
function fmt(n) { return n!=null?Number(n).toLocaleString():'—'; }
function nvl(n) { return n!=null?n:'—'; }
function statusBadge(s) {
  if (!s) return '<span class="dim">—</span>';
  const m={delivered:'badge-green',active:'badge-green',completed:'badge-green',cancelled:'badge-rose',canceled:'badge-rose',shipped:'badge-sky',processing:'badge-sky',on_sale:'badge-green',pending:'badge-amber',placed:'badge-amber',limited:'badge-amber',paused:'badge-normal',playing:'badge-green'};
  return '<span class="badge '+(m[s.toLowerCase()]||'badge-normal')+'">'+s+'</span>';
}
function esc(str) {
  if (str==null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
