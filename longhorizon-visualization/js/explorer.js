/* ════════════════════════════════════════════════════════
   LongHorizon · Explorer
   Users table, user modal, global search
════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   INIT (called from app.js after data load)
────────────────────────────────────────── */
function initExplorer() {
  setupGlobalSearch();
}

/* ──────────────────────────────────────────
   USERS PAGE
────────────────────────────────────────── */
function renderUsersPage() {
  populateUserFilter('users-sort');
  buildUsersTable();

  document.getElementById('users-search')?.addEventListener('input', buildUsersTable);
  document.getElementById('users-sort')?.addEventListener('change', buildUsersTable);
}

function buildUsersTable() {
  const q    = (document.getElementById('users-search')?.value || '').toLowerCase();
  const sort = document.getElementById('users-sort')?.value || 'name';

  /* Compute per-persona stats */
  const stats = PERSONAS.map(p => {
    const orders = ALL_ORDERS.filter(o => o.user_id === p.id);
    const spend  = orders.reduce((s, o) => s + (o.total || 0), 0);
    const garmin = (DATA.garmin?.daily_stats || []).filter(d => d.user_id === p.id);
    const whoop  = (DATA.whoop?.recovery || []).filter(r => r.persona_id === p.id);
    const stravaAth = (DATA.strava?.athletes || []).find(a => a.user_id === p.id);
    return { ...p, orders: orders.length, spend, garminRecs: garmin.length, whoopRecs: whoop.length, stravaFTP: stravaAth?.ftp };
  });

  let filtered = stats.filter(u =>
    !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.includes(q)
  );

  filtered.sort((a, b) => {
    if (sort === 'orders') return b.orders - a.orders;
    if (sort === 'health') return b.garminRecs - a.garminRecs;
    if (sort === 'id')   return a.id.localeCompare(b.id);
    return a.name.localeCompare(b.name);
  });

  document.getElementById('users-count').textContent = `${filtered.length} of ${PERSONAS.length} personas`;

  const rows = filtered.map(u => `
    <tr class="clickable" onclick="openUserModal('${u.id}')">
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="avatar">${u.initials}</div>
        <div>
          <div style="font-weight:600;color:var(--text)">${u.name}</div>
          <div style="font-size:10px;color:var(--text3)">${u.id}</div>
        </div>
      </div></td>
      <td style="font-size:11px;color:var(--text3)">${u.email}</td>
      <td>${u.orders.toLocaleString()} <span style="color:var(--text3);font-size:10px">($${Math.round(u.spend).toLocaleString()})</span></td>
      <td>${u.garminRecs.toLocaleString()} <span style="color:var(--text3);font-size:10px">days</span></td>
      <td>${u.whoopRecs.toLocaleString()} <span style="color:var(--text3);font-size:10px">cycles</span></td>
      <td>${u.stravaFTP ? `${u.stravaFTP} W FTP` : '<span style="color:var(--text3)">—</span>'}</td>
      <td><button class="link-btn" onclick="event.stopPropagation();openUserModal('${u.id}')">View profile →</button></td>
    </tr>`).join('');

  const wrap = document.getElementById('users-table-wrap');
  if (wrap) wrap.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Persona</th><th>Email</th><th>Orders / Spend</th>
        <th>Garmin Days</th><th>Whoop Cycles</th><th>Strava FTP</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="empty-state">No results</td></tr>'}</tbody>
    </table>`;
}

/* ──────────────────────────────────────────
   USER MODAL
────────────────────────────────────────── */
function openUserModal(pid) {
  const persona = PERSONAS.find(p => p.id === pid);
  if (!persona) return;

  /* Collect cross-service data */
  const garminStats  = (DATA.garmin?.daily_stats || []).filter(d => d.user_id === pid).sort((a,b) => b.date.localeCompare(a.date));
  const whoopRec     = (DATA.whoop?.recovery || []).filter(r => r.persona_id === pid).sort((a,b) => b.timestamp?.localeCompare(a.timestamp))[0];
  const whoopCycles  = (DATA.whoop?.cycles || []).filter(c => c.persona_id === pid).sort((a,b) => b.start_time?.localeCompare(a.start_time));
  const renphoMeas   = (DATA.renpho?.measurements || []).filter(m => m.persona_id === pid).sort((a,b) => (b.measured_at||'').localeCompare(a.measured_at||''))[0];
  const stravaAth    = (DATA.strava?.athletes || []).find(a => a.user_id === pid);
  const stravaActs   = (DATA.strava?.activities || []).filter(a => a.user_id === pid || a.athlete_id === stravaAth?.athlete_id).slice(0, 8);
  const fitbitStats  = (DATA.fitbit?.daily_stats || []).filter(d => d.user_id === pid).sort((a,b) => b.date?.localeCompare(a.date)).slice(0, 7);
  const eightSleep   = (DATA['eight-sleep']?.sleep_sessions || []).filter(s => s.user_id === pid).sort((a,b) => b.start_time?.localeCompare(a.start_time)).slice(0, 7);
  const mfpLogs      = (DATA.myfitnesspal?.food_logs || []).filter(l => l.user_id === pid || l.persona_id === pid).slice(0, 7);
  const renphoAll    = (DATA.renpho?.measurements || []).filter(m => m.persona_id === pid).sort((a,b) => (b.measured_at||'').localeCompare(a.measured_at||'')).slice(0,5);
  const appleSteps   = (DATA['apple-health']?.step_records || []).filter(r => r.user_id === pid || r.source_name).slice(0, 5);

  const orders = ALL_ORDERS.filter(o => o.user_id === pid);
  const ordersByService = {};
  orders.forEach(o => {
    if (!ordersByService[o.service]) ordersByService[o.service] = { count: 0, total: 0 };
    ordersByService[o.service].count++;
    ordersByService[o.service].total += o.total || 0;
  });

  const tmOrders   = (DATA.ticketmaster?.orders || []).filter(o => o.user_id === pid);
  const zillowSaved= (DATA.zillow?.saved_properties || []).filter(s => s.user_id === pid);
  const packages   = (DATA.logistics?.shipments || []).filter(s => s.user_id === pid);
  const sonosFavs  = (DATA.sonos?.favorites || []).filter(f => f.user_id === pid);
  const obsNotes   = (DATA.obsidian?.notes || []).filter(n => n.user_id === pid || n.persona_id === pid);

  /* Address from first service with it */
  const garminUser  = (DATA.garmin?.users || []).find(u => u.user_id === pid);
  const amazonUser  = (DATA.amazon?.users || []).find(u => u.user_id === pid);
  const address     = garminUser?.address || amazonUser?.default_address || '—';
  const phone       = garminUser?.phone || amazonUser?.phone || '—';

  /* Latest Garmin record (last 7 days) */
  const last7  = garminStats.slice(0, 7);
  const avgSteps = last7.length ? Math.round(last7.reduce((s,d) => s + d.steps, 0) / last7.length) : null;
  const latestGarmin = garminStats[0];

  /* Build body */
  let html = '';

  /* ── Profile block ── */
  html += chainBlock('USER PROFILE', [
    { k: 'Name',        v: persona.name },
    { k: 'Persona ID',  v: persona.id, mono: true },
    { k: 'Email',       v: persona.email },
    { k: 'Phone',       v: phone },
    { k: 'Address',     v: address },
    { k: 'Strava FTP',  v: stravaAth ? `${stravaAth.ftp} W (${stravaAth.premium ? 'Premium' : 'Free'})` : '—' },
  ], 'cb-user');

  /* ── Health summary ── */
  const healthFields = [];
  if (latestGarmin) {
    healthFields.push({ k: `Garmin (${latestGarmin.date})`, v: `${latestGarmin.steps?.toLocaleString()} steps · ${latestGarmin.calories_total} kcal · ${(latestGarmin.distance_meters/1000).toFixed(1)} km` });
  }
  if (avgSteps) healthFields.push({ k: '7-day avg steps', v: avgSteps.toLocaleString() });
  if (whoopRec) {
    healthFields.push({ k: `Whoop Recovery (${fmtDate(whoopRec.timestamp)})`, v: `${whoopRec.recovery_score}% recovery · HRV ${whoopRec.hrv_rmssd} ms · RHR ${whoopRec.resting_heart_rate} bpm · SpO₂ ${whoopRec.spo2_percentage}%` });
  }
  if (whoopCycles[0]) {
    healthFields.push({ k: `Whoop Strain (${fmtDate(whoopCycles[0].start_time)})`, v: `${whoopCycles[0].strain} strain · ${whoopCycles[0].kilojoules} kJ · Avg HR ${whoopCycles[0].average_heart_rate} bpm` });
  }
  if (renphoMeas) {
    healthFields.push({ k: `Renpho (${fmtDate(renphoMeas.measured_at)})`, v: [
      renphoMeas.weight_kg && `${renphoMeas.weight_kg} kg`,
      renphoMeas.bmi && `BMI ${renphoMeas.bmi}`,
      renphoMeas.body_fat_percentage && `${renphoMeas.body_fat_percentage}% body fat`,
      renphoMeas.muscle_mass_kg && `${renphoMeas.muscle_mass_kg} kg muscle`,
    ].filter(Boolean).join(' · ') || '—' });
  }
  if (fitbitStats[0]) {
    healthFields.push({ k: `Fitbit (${fitbitStats[0].date})`, v: `${fitbitStats[0].steps?.toLocaleString()} steps · ${fitbitStats[0].calories_total || fitbitStats[0].calories} kcal` });
  }
  if (eightSleep[0]) {
    healthFields.push({ k: `Eight Sleep (${fmtDate(eightSleep[0].start_time)})`, v: [
      eightSleep[0].sleep_score != null && `Score ${eightSleep[0].sleep_score}`,
      eightSleep[0].hrv && `HRV ${eightSleep[0].hrv} ms`,
      eightSleep[0].respiratory_rate && `Resp ${eightSleep[0].respiratory_rate}`,
    ].filter(Boolean).join(' · ') || '—' });
  }
  if (mfpLogs[0]) {
    healthFields.push({ k: `MyFitnessPal (${fmtDate(mfpLogs[0].date)})`, v: `${mfpLogs[0].calories} kcal · ${mfpLogs[0].protein_g}g protein · ${mfpLogs[0].carbs_g}g carbs · ${mfpLogs[0].fat_g}g fat` });
  }
  if (healthFields.length) html += chainBlock('HEALTH SUMMARY', healthFields, 'cb-health');

  /* ── Strava activities ── */
  if (stravaActs.length) {
    const actRows = stravaActs.map(a => `
      <tr>
        <td>${fmtDate(a.start_date || a.created_at)}</td>
        <td>${a.type || a.activity_type || '—'}</td>
        <td>${a.distance_meters ? (a.distance_meters/1000).toFixed(1) + ' km' : '—'}</td>
        <td>${a.moving_time ? (a.moving_time/60).toFixed(0) + ' min' : a.elapsed_time ? (a.elapsed_time/60).toFixed(0) + ' min' : '—'}</td>
        <td>${a.average_heartrate || a.average_hr || '—'} bpm</td>
      </tr>`).join('');
    html += `<div class="chain-block cb-health" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">🚴 Strava Activities</span><span class="chain-block-count">${stravaActs.length} shown</span></div>
      <table class="chain-mini-table"><thead><tr><th>Date</th><th>Type</th><th>Distance</th><th>Duration</th><th>Avg HR</th></tr></thead>
      <tbody>${actRows}</tbody></table></div>`;
  }

  /* ── Shopping summary ── */
  const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0);
  const shopFields = [
    { k: 'Total Orders',      v: orders.length.toLocaleString() },
    { k: 'Total Spend',       v: `$${totalSpend.toFixed(2)}` },
  ];
  html += chainBlock('SHOPPING SUMMARY', shopFields, 'cb-shopping');

  if (Object.keys(ordersByService).length) {
    const rows = Object.entries(ordersByService).map(([svc, { count, total }]) => `
      <tr>
        <td>${svcBadge(svc)}</td>
        <td>${count}</td>
        <td>$${total.toFixed(2)}</td>
      </tr>`).join('');
    html += `<div class="chain-block cb-shopping" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">Orders by Service</span><span class="chain-block-count">${orders.length} total</span></div>
      <table class="chain-mini-table"><thead><tr><th>Service</th><th>Orders</th><th>Total Spend</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  /* Recent orders */
  const recentOrders = orders.slice(0, 8);
  if (recentOrders.length) {
    const rows = recentOrders.map(o => `
      <tr class="linkable" onclick="openOrderModal('${o.service}', '${o.order_id}')">
        <td>${fmtDate(o.date)}</td>
        <td>${svcBadge(o.service)}</td>
        <td>${o.order_id}</td>
        <td class="amt-pos">$${(o.total||0).toFixed(2)}</td>
        <td>${statusBadge(o.status)}</td>
      </tr>`).join('');
    html += `<div class="chain-block cb-shopping" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">Recent Orders</span><span class="chain-block-count">${orders.length} total — showing last ${recentOrders.length}</span></div>
      <table class="chain-mini-table"><thead><tr><th>Date</th><th>Service</th><th>Order ID</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  /* ── Lifestyle block ── */
  const lifeFields = [
    { k: 'Ticketmaster Orders',  v: tmOrders.length.toLocaleString() },
    { k: 'Zillow Saved Props',   v: zillowSaved.length.toLocaleString() },
    { k: 'Packages (Logistics)', v: packages.length.toLocaleString() },
    { k: 'Sonos Favorites',      v: sonosFavs.length.toLocaleString() },
    { k: 'Obsidian Notes',       v: obsNotes.length.toLocaleString() },
  ];
  html += chainBlock('LIFESTYLE', lifeFields, 'cb-lifestyle');

  /* Zillow saved properties */
  if (zillowSaved.length) {
    const zillowProps = (DATA.zillow?.properties || []);
    const rows = zillowSaved.slice(0,5).map(sp => {
      const prop = zillowProps.find(p => p.property_id === sp.property_id || p.zpid === sp.zpid || p.id === sp.property_id);
      return `<tr>
        <td>${prop?.address || sp.property_id || '—'}</td>
        <td>${prop?.price ? `$${Number(prop.price).toLocaleString()}` : '—'}</td>
        <td>${prop ? [prop.bedrooms, 'bd', prop.bathrooms, 'ba'].filter(Boolean).join(' ') : '—'}</td>
        <td>${fmtDate(sp.saved_at || sp.created_at)}</td>
      </tr>`;
    }).join('');
    html += `<div class="chain-block cb-lifestyle" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">🏠 Zillow Saved Properties</span></div>
      <table class="chain-mini-table"><thead><tr><th>Address</th><th>Price</th><th>Size</th><th>Saved</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  /* Recent packages */
  if (packages.length) {
    const rows = packages.slice(0,5).map(p => `
      <tr>
        <td><span style="font-family:var(--mono);font-size:10px">${p.tracking_number?.slice(0,18)}…</span></td>
        <td>${p.carrier || '—'}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${fmtDate(p.created_at)}</td>
      </tr>`).join('');
    html += `<div class="chain-block cb-lifestyle" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">📦 Recent Packages</span><span class="chain-block-count">${packages.length} total</span></div>
      <table class="chain-mini-table"><thead><tr><th>Tracking</th><th>Carrier</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  /* ── Service coverage ── */
  const coveredServices = Object.keys(SERVICES).filter(key => {
    const d = DATA[key] || {};
    const users = d.users || d.user_profiles || d.athletes || [];
    return users.some(u => (u.user_id || u.persona_id) === pid);
  });
  html += `<div class="chain-block cb-integrity" style="margin-bottom:12px">
    <div class="chain-block-hdr"><span class="chain-block-label">Data Coverage</span><span class="chain-block-count">${coveredServices.length}/19 services</span></div>
    <div style="padding:12px 14px;display:flex;flex-wrap:wrap;gap:6px">
      ${Object.keys(SERVICES).map(key => {
        const covered = coveredServices.includes(key);
        const s = SERVICES[key];
        return `<span style="padding:3px 9px;border-radius:8px;font-size:10px;font-weight:600;background:${covered ? s.color+'18' : 'var(--surface2)'};color:${covered ? s.color : 'var(--text3)'};border:1px solid ${covered ? s.color+'30' : 'var(--border)'}">${s.icon} ${s.label}</span>`;
      }).join('')}
    </div>
  </div>`;

  openModal('USER', persona.name, html);
}

/* ──────────────────────────────────────────
   ORDER MODAL
────────────────────────────────────────── */
function openOrderModal(serviceKey, orderId) {
  const d = DATA[serviceKey] || {};
  const order = (d.orders || []).find(o => o.order_id === orderId);
  if (!order) return;

  const items = (d.order_items || []).filter(i => i.order_id === orderId);
  const products = d.products || [];

  let html = chainBlock('ORDER DETAILS', [
    { k: 'Order ID',       v: order.order_id, mono: true },
    { k: 'Service',        v: `${SERVICES[serviceKey]?.icon} ${SERVICES[serviceKey]?.label}` },
    { k: 'User',           v: getUserName(order.user_id) },
    { k: 'Date',           v: fmtDate(order.created_at || order.order_date) },
    { k: 'Status',         v: order.status },
    { k: 'Total',          v: `$${(order.total || order.total_amount || 0).toFixed(2)}` },
    { k: 'Carrier',        v: order.carrier || '—' },
    { k: 'Tracking',       v: order.tracking_number || '—' },
    { k: 'Ship Address',   v: order.shipping_address || order.delivery_address || '—' },
  ], 'cb-shopping');

  if (items.length) {
    const rows = items.map(item => {
      const prod = products.find(p =>
        p.asin === item.asin || p.product_id === item.product_id ||
        p.item_id === item.item_id || p.sku === item.sku
      );
      const name = prod?.title || prod?.name || item.product_title || item.name || item.item_name || item.product_id || '—';
      const price = item.unit_price ?? item.price ?? item.item_price ?? 0;
      return `<tr>
        <td style="max-width:280px;white-space:normal;line-height:1.4">${name}</td>
        <td>${item.quantity ?? 1}</td>
        <td>$${Number(price).toFixed(2)}</td>
        <td>$${(Number(price) * (item.quantity ?? 1)).toFixed(2)}</td>
      </tr>`;
    }).join('');
    html += `<div class="chain-block cb-shopping" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">Order Items</span><span class="chain-block-count">${items.length} items</span></div>
      <table class="chain-mini-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  openModal('ORDER', `${SERVICES[serviceKey]?.icon} ${orderId}`, html);
}

/* ──────────────────────────────────────────
   MODAL SYSTEM
────────────────────────────────────────── */
function openModal(badge, title, bodyHtml) {
  document.getElementById('modal-badge').textContent = badge;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function handleModalClick(e) {
  if (e.target.id === 'modal-overlay') closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ──────────────────────────────────────────
   CHAIN BLOCK BUILDER
────────────────────────────────────────── */
function chainBlock(label, fields, typeClass) {
  const cells = fields.map(f => `
    <div class="chain-field">
      <div class="cf-key">${f.k}</div>
      <div class="cf-val${f.mono ? ' mono' : ''}">${f.v || '—'}</div>
    </div>`).join('');
  return `
    <div class="chain-block ${typeClass}" style="margin-bottom:12px">
      <div class="chain-block-hdr">
        <span class="chain-block-label">${label}</span>
        <span class="chain-block-count">${fields.length} fields</span>
      </div>
      <div class="chain-fields">${cells}</div>
    </div>`;
}

/* ──────────────────────────────────────────
   GLOBAL SEARCH
────────────────────────────────────────── */
function setupGlobalSearch() {
  const input = document.getElementById('global-search');
  const dropdown = document.getElementById('search-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { dropdown.classList.add('hidden'); return; }
    renderSearchResults(q, dropdown);
    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target))
      dropdown.classList.add('hidden');
  });
}

function renderSearchResults(q, dropdown) {
  const results = [];

  /* Users */
  PERSONAS.filter(p =>
    p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.id.includes(q)
  ).slice(0, 4).forEach(p => {
    results.push({ group: 'Users', icon: '👤', main: p.name, sub: p.email, action: `openUserModal('${p.id}')` });
  });

  /* Orders */
  ALL_ORDERS.filter(o =>
    o.order_id?.toLowerCase().includes(q) || o.address?.toLowerCase().includes(q)
  ).slice(0, 4).forEach(o => {
    results.push({ group: 'Orders', icon: SERVICES[o.service]?.icon || '📦', main: o.order_id, sub: `${SERVICES[o.service]?.label} · ${getUserName(o.user_id)} · $${(o.total||0).toFixed(2)}`, action: `openOrderModal('${o.service}','${o.order_id}')` });
  });

  /* Events */
  const events = DATA.ticketmaster?.events || [];
  const attractions = DATA.ticketmaster?.attractions || [];
  events.filter(e =>
    (e.name || e.title || '').toLowerCase().includes(q)
  ).slice(0, 3).forEach(e => {
    const attr = attractions.find(a => a.id === e.attraction_id);
    results.push({ group: 'Events', icon: '🎫', main: e.name || e.title, sub: `${attr?.name || ''} · ${fmtDate(e.start_datetime || e.date)}`, action: `navigateTo('lifestyle')` });
  });

  /* Properties */
  (DATA.zillow?.properties || []).filter(p =>
    p.address?.toLowerCase().includes(q)
  ).slice(0, 3).forEach(p => {
    results.push({ group: 'Properties', icon: '🏠', main: p.address, sub: `$${Number(p.price).toLocaleString()} · ${p.bedrooms}bd ${p.bathrooms}ba`, action: `navigateTo('lifestyle')` });
  });

  if (!results.length) {
    dropdown.innerHTML = `<div class="sd-empty">No results for "${q}"</div>`;
    return;
  }

  let html = '';
  let lastGroup = '';
  results.forEach(r => {
    if (r.group !== lastGroup) {
      html += `<div class="sd-group-title">${r.group}</div>`;
      lastGroup = r.group;
    }
    const hiMain = highlight(r.main, q);
    const hiSub  = highlight(r.sub, q);
    html += `<div class="sd-item" onclick="${r.action}; document.getElementById('search-dropdown').classList.add('hidden'); document.getElementById('global-search').value=''">
      <div class="sd-icon">${r.icon}</div>
      <div><div class="sd-main">${hiMain}</div><div class="sd-sub">${hiSub}</div></div>
    </div>`;
  });
  dropdown.innerHTML = html;
}

function highlight(text, q) {
  if (!text || !q) return text || '';
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

/* ──────────────────────────────────────────
   POPULATE SELECT HELPERS
────────────────────────────────────────── */
function populateUserFilter(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  /* already populated */
}

function populatePersonaSelects() {
  ['health-user', 'shop-user'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    PERSONAS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      sel.appendChild(opt);
    });
  });
}
