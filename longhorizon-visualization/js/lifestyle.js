/* ════════════════════════════════════════════════════════
   LongHorizon · Lifestyle Tab
   Ticketmaster, Zillow, Logistics, Sonos, Obsidian
════════════════════════════════════════════════════════ */

let ACTIVE_SUBTAB = 'events';

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
function renderLifestylePage() {
  bindSubTabs();
  renderSubtabContent(ACTIVE_SUBTAB);
}

function bindSubTabs() {
  document.querySelectorAll('#lifestyle-sub-tabs .sub-tab').forEach(btn => {
    if (btn._lifeBound) return; btn._lifeBound = true;
    btn.addEventListener('click', () => {
      ACTIVE_SUBTAB = btn.dataset.subtab;
      document.querySelectorAll('#lifestyle-sub-tabs .sub-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.subtab === ACTIVE_SUBTAB));
      renderSubtabContent(ACTIVE_SUBTAB);
    });
  });
}

function renderSubtabContent(subtab) {
  const content = document.getElementById('lifestyle-content');
  if (!content) return;
  switch (subtab) {
    case 'events':     content.innerHTML = buildEventsContent();     break;
    case 'properties': content.innerHTML = buildPropertiesContent(); break;
    case 'packages':   content.innerHTML = buildPackagesContent();   break;
    case 'music':      content.innerHTML = buildMusicContent();      break;
    case 'notes':      content.innerHTML = buildNotesContent();      break;
    default:           content.innerHTML = buildEventsContent();
  }
  /* Bind user filter inside each sub-tab */
  const userSel = content.querySelector('.lifestyle-user-filter');
  if (userSel && !userSel.options.length > 1) {
    PERSONAS.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; userSel.appendChild(o); });
  }
  if (userSel) {
    userSel.addEventListener('change', () => renderSubtabContent(ACTIVE_SUBTAB));
  }
}

/* ──────────────────────────────────────────
   EVENTS (Ticketmaster)
────────────────────────────────────────── */
function buildEventsContent() {
  const venues      = DATA.ticketmaster?.venues      || [];
  const attractions = DATA.ticketmaster?.attractions  || [];
  const events      = DATA.ticketmaster?.events       || [];
  const orders      = DATA.ticketmaster?.orders       || [];
  const ticketTypes = DATA.ticketmaster?.ticket_types || [];

  if (!orders.length && !events.length) {
    return `<div class="empty-state">No Ticketmaster data loaded.</div>`;
  }

  /* KPIs */
  const totalOrders = orders.length;
  const totalSpend  = orders.reduce((s, o) => s + getOrderTotal(o), 0);
  const uniqueEvents= [...new Set(orders.map(o => o.event_id).filter(Boolean))].length;
  const uniqueVenues= [...new Set(events.map(e => e.venue_id).filter(Boolean))].length;

  const kpis = `<div class="kpi-row" style="margin-bottom:14px">
    <div class="kpi-card" style="--accent:#026cdf"><div class="kpi-icon">🎫</div><div><div class="kpi-value">${totalOrders}</div><div class="kpi-label">Ticket Orders</div><div class="kpi-sub">$${Math.round(totalSpend).toLocaleString()} total</div></div></div>
    <div class="kpi-card" style="--accent:#a855f7"><div class="kpi-icon">🎭</div><div><div class="kpi-value">${events.length}</div><div class="kpi-label">Total Events</div><div class="kpi-sub">${uniqueVenues} venues</div></div></div>
    <div class="kpi-card" style="--accent:#22c55e"><div class="kpi-icon">⭐</div><div><div class="kpi-value">${attractions.length}</div><div class="kpi-label">Attractions</div><div class="kpi-sub">Artists &amp; performers</div></div></div>
    <div class="kpi-card" style="--accent:#f59e0b"><div class="kpi-icon">🏟️</div><div><div class="kpi-value">${venues.length}</div><div class="kpi-label">Venues</div><div class="kpi-sub">Across the US</div></div></div>
  </div>`;

  /* Orders table */
  const rows = orders.map(o => {
    const evt  = events.find(e => e.id === o.event_id || e.event_id === o.event_id);
    const attr = evt ? attractions.find(a => (DATA.ticketmaster?.event_attractions || []).some(ea => ea.event_id === evt.id && ea.attraction_id === a.id)) : null;
    const venue= evt ? venues.find(v => v.id === evt.venue_id) : null;
    const tt   = ticketTypes.find(t => t.id === o.ticket_type_id);
    return `<tr class="clickable" onclick="openEventModal('${o.order_id || o.id}')">
      <td>${fmtDate(getOrderDate(o))}</td>
      <td><button class="link-btn" onclick="event.stopPropagation();openUserModal('${o.user_id}')">${getUserName(o.user_id)}</button></td>
      <td style="font-weight:500;color:var(--text)">${evt?.name || evt?.title || '—'}</td>
      <td>${attr?.name || '—'}</td>
      <td>${venue?.name || '—'}</td>
      <td>${fmtDate(evt?.start_datetime || evt?.date)}</td>
      <td>${o.quantity ?? 1}× ${tt?.name || ''}</td>
      <td class="amt-pos">$${getOrderTotal(o).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const table = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Purchased</th><th>User</th><th>Event</th><th>Artist</th><th>Venue</th><th>Event Date</th><th>Tickets</th><th>Total</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8" class="empty-state">No orders</td></tr>'}</tbody>
  </table></div>`;

  /* Events list */
  const evtRows = events.slice(0, 30).map(e => {
    const venue = venues.find(v => v.id === e.venue_id);
    const attrIds = (DATA.ticketmaster?.event_attractions || []).filter(ea => ea.event_id === e.id).map(ea => ea.attraction_id);
    const eventAttrs = attractions.filter(a => attrIds.includes(a.id));
    return `<tr>
      <td style="font-weight:500;color:var(--text)">${e.name || e.title || '—'}</td>
      <td>${eventAttrs.map(a => a.name).join(', ') || '—'}</td>
      <td>${venue?.name || '—'}</td>
      <td>${venue ? `${venue.city}, ${venue.state}` : '—'}</td>
      <td>${fmtDate(e.start_datetime || e.date)}</td>
      <td>${e.status || '—'}</td>
    </tr>`;
  }).join('');

  const evtTable = `<div class="section-label" style="margin-top:18px">All Events (${events.length})</div>
  <div class="table-wrap" style="margin-top:8px"><table class="data-table">
    <thead><tr><th>Event</th><th>Attraction</th><th>Venue</th><th>Location</th><th>Date</th><th>Status</th></tr></thead>
    <tbody>${evtRows || '<tr><td colspan="6" class="empty-state">No events</td></tr>'}</tbody>
  </table></div>`;

  return kpis + `<div class="section-label">Ticket Orders (${orders.length})</div><div style="margin-top:8px">` + table + `</div>` + evtTable;
}

function openEventModal(orderId) {
  const orders = DATA.ticketmaster?.orders || [];
  const events = DATA.ticketmaster?.events || [];
  const venues = DATA.ticketmaster?.venues || [];
  const attractions = DATA.ticketmaster?.attractions || [];
  const ticketTypes = DATA.ticketmaster?.ticket_types || [];

  const order = orders.find(o => (o.order_id || o.id) === orderId);
  if (!order) return;

  const evt   = events.find(e => e.id === order.event_id || e.event_id === order.event_id);
  const venue = evt ? venues.find(v => v.id === evt.venue_id) : null;
  const tt    = ticketTypes.find(t => t.id === order.ticket_type_id);
  const attrIds = evt ? (DATA.ticketmaster?.event_attractions || []).filter(ea => ea.event_id === evt.id).map(ea => ea.attraction_id) : [];
  const eventAttrs = attractions.filter(a => attrIds.includes(a.id));

  const html = chainBlock('TICKET ORDER', [
    { k: 'Order ID',    v: order.order_id || order.id, mono: true },
    { k: 'User',        v: getUserName(order.user_id) },
    { k: 'Event',       v: evt?.name || evt?.title || '—' },
    { k: 'Artist',      v: eventAttrs.map(a => a.name).join(', ') || '—' },
    { k: 'Venue',       v: venue?.name || '—' },
    { k: 'Location',    v: venue ? `${venue.address}, ${venue.city}, ${venue.state}` : '—' },
    { k: 'Capacity',    v: venue?.capacity?.toLocaleString() },
    { k: 'Event Date',  v: fmtDate(evt?.start_datetime || evt?.date) },
    { k: 'Ticket Type', v: tt?.name || '—' },
    { k: 'Quantity',    v: order.quantity },
    { k: 'Unit Price',  v: order.unit_price ? `$${order.unit_price}` : '—' },
    { k: 'Total',       v: `$${getOrderTotal(order).toFixed(2)}` },
    { k: 'Purchase Date',v: fmtDate(getOrderDate(order)) },
    { k: 'Status',      v: order.status || '—' },
  ], 'cb-lifestyle');

  openModal('🎫 EVENT ORDER', evt?.name || orderId, html);
}

/* ──────────────────────────────────────────
   PROPERTIES (Zillow)
────────────────────────────────────────── */
function buildPropertiesContent() {
  const properties    = DATA.zillow?.properties     || [];
  const savedProps    = DATA.zillow?.saved_properties|| [];
  const tours         = DATA.zillow?.scheduled_tours || [];
  const searchHistory = DATA.zillow?.search_history  || [];

  if (!properties.length) return `<div class="empty-state">No Zillow data loaded.</div>`;

  const totalValue = properties.reduce((s, p) => s + (p.price || p.zestimate || 0), 0);
  const avgPrice   = properties.length ? totalValue / properties.length : 0;

  const kpis = `<div class="kpi-row" style="margin-bottom:14px">
    <div class="kpi-card" style="--accent:#006aff"><div class="kpi-icon">🏠</div><div><div class="kpi-value">${properties.length}</div><div class="kpi-label">Properties</div><div class="kpi-sub">Avg $${Math.round(avgPrice/1000)}K</div></div></div>
    <div class="kpi-card" style="--accent:#a855f7"><div class="kpi-icon">❤️</div><div><div class="kpi-value">${savedProps.length}</div><div class="kpi-label">Saved Props</div><div class="kpi-sub">Across ${PERSONAS.length} users</div></div></div>
    <div class="kpi-card" style="--accent:#22c55e"><div class="kpi-icon">📅</div><div><div class="kpi-value">${tours.length}</div><div class="kpi-label">Tours Scheduled</div><div class="kpi-sub"></div></div></div>
    <div class="kpi-card" style="--accent:#f59e0b"><div class="kpi-icon">🔍</div><div><div class="kpi-value">${searchHistory.length}</div><div class="kpi-label">Searches</div><div class="kpi-sub"></div></div></div>
  </div>`;

  /* Property cards */
  const propCards = properties.map(p => {
    const saved = savedProps.filter(s => s.property_id === p.property_id || s.property_id === p.id || s.zpid === p.zpid);
    const savedUsers = saved.map(s => getUserName(s.user_id)).join(', ');
    const priceStr = p.price ? `$${Number(p.price).toLocaleString()}` : p.zestimate ? `$${Number(p.zestimate).toLocaleString()} (est)` : '—';
    return `<div class="property-card" onclick="openPropertyModal('${p.property_id || p.id || p.zpid}')">
      <div class="prop-price">${priceStr}</div>
      <div class="prop-addr">${p.address || '—'}</div>
      <div class="prop-meta">
        ${p.bedrooms ? `<span class="prop-tag">${p.bedrooms} bd</span>` : ''}
        ${p.bathrooms ? `<span class="prop-tag">${p.bathrooms} ba</span>` : ''}
        ${p.sqft || p.square_feet ? `<span class="prop-tag">${(p.sqft || p.square_feet)?.toLocaleString()} sqft</span>` : ''}
        ${p.property_type || p.home_type ? `<span class="prop-tag">${p.property_type || p.home_type}</span>` : ''}
        ${p.year_built ? `<span class="prop-tag">Built ${p.year_built}</span>` : ''}
      </div>
      ${savedUsers ? `<div class="prop-user">❤️ Saved by: ${savedUsers}</div>` : ''}
    </div>`;
  }).join('');

  /* Tours table */
  let toursHtml = '';
  if (tours.length) {
    const tourRows = tours.map(t => {
      const prop = properties.find(p => p.property_id === t.property_id || p.id === t.property_id);
      return `<tr>
        <td>${fmtDate(t.tour_date || t.scheduled_at)}</td>
        <td><button class="link-btn" onclick="openUserModal('${t.user_id}')">${getUserName(t.user_id)}</button></td>
        <td>${prop?.address || t.property_id || '—'}</td>
        <td>${prop?.price ? `$${Number(prop.price).toLocaleString()}` : '—'}</td>
        <td>${t.status || t.tour_type || '—'}</td>
      </tr>`;
    }).join('');
    toursHtml = `<div class="section-label" style="margin-top:18px">Scheduled Tours (${tours.length})</div>
    <div class="table-wrap" style="margin-top:8px"><table class="data-table">
      <thead><tr><th>Date</th><th>User</th><th>Property</th><th>Price</th><th>Status</th></tr></thead>
      <tbody>${tourRows}</tbody>
    </table></div>`;
  }

  return kpis + `<div class="section-label">Properties (${properties.length})</div><div class="property-grid" style="margin-top:8px">${propCards}</div>` + toursHtml;
}

function openPropertyModal(propId) {
  const properties = DATA.zillow?.properties    || [];
  const savedProps = DATA.zillow?.saved_properties || [];
  const tours      = DATA.zillow?.scheduled_tours  || [];
  const marketData = DATA.zillow?.market_data      || [];

  const prop = properties.find(p => p.property_id === propId || p.id === propId || String(p.zpid) === String(propId));
  if (!prop) return;

  const saved = savedProps.filter(s => s.property_id === propId || s.property_id === prop.id);
  const propTours = tours.filter(t => t.property_id === propId || t.property_id === prop.id);
  const mktData = marketData.find(m => m.property_id === propId || m.zip === prop.zip);

  let html = chainBlock('PROPERTY', [
    { k: 'Address',       v: prop.address },
    { k: 'Price',         v: prop.price ? `$${Number(prop.price).toLocaleString()}` : '—' },
    { k: 'Zestimate',     v: prop.zestimate ? `$${Number(prop.zestimate).toLocaleString()}` : '—' },
    { k: 'Type',          v: prop.property_type || prop.home_type },
    { k: 'Bedrooms',      v: prop.bedrooms },
    { k: 'Bathrooms',     v: prop.bathrooms },
    { k: 'Sq Ft',         v: (prop.sqft || prop.square_feet)?.toLocaleString() },
    { k: 'Year Built',    v: prop.year_built },
    { k: 'Lot Size',      v: prop.lot_size ? `${prop.lot_size?.toLocaleString()} sqft` : '—' },
    { k: 'Annual Tax',    v: prop.annual_tax ? `$${Number(prop.annual_tax).toLocaleString()}` : '—' },
    { k: 'HOA/Month',     v: prop.hoa_monthly ? `$${prop.hoa_monthly}` : '—' },
    { k: 'Listing Agent', v: prop.listing_agent || '—' },
    { k: 'Listing Date',  v: fmtDate(prop.listed_date || prop.listing_date) },
    { k: 'Status',        v: prop.status || prop.listing_status },
  ], 'cb-lifestyle');

  if (mktData) {
    html += chainBlock('MARKET DATA', [
      { k: 'Median List Price',   v: mktData.median_list_price   ? `$${Number(mktData.median_list_price).toLocaleString()}`   : '—' },
      { k: 'Median Sale Price',   v: mktData.median_sale_price   ? `$${Number(mktData.median_sale_price).toLocaleString()}`   : '—' },
      { k: 'Price/Sqft',          v: mktData.price_per_sqft      ? `$${mktData.price_per_sqft}`                               : '—' },
      { k: 'Days on Market',      v: mktData.days_on_market },
      { k: 'Inventory',           v: mktData.inventory_count },
    ], 'cb-lifestyle');
  }

  if (saved.length) {
    const rows = saved.map(s => `<tr>
      <td>${getUserName(s.user_id)}</td>
      <td>${fmtDate(s.saved_at || s.created_at)}</td>
    </tr>`).join('');
    html += `<div class="chain-block cb-lifestyle" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">❤️ Saved By (${saved.length})</span></div>
      <table class="chain-mini-table"><thead><tr><th>User</th><th>Saved Date</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  if (propTours.length) {
    const rows = propTours.map(t => `<tr>
      <td>${getUserName(t.user_id)}</td>
      <td>${fmtDate(t.tour_date || t.scheduled_at)}</td>
      <td>${t.status || t.tour_type || '—'}</td>
    </tr>`).join('');
    html += `<div class="chain-block cb-lifestyle" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">📅 Tours (${propTours.length})</span></div>
      <table class="chain-mini-table"><thead><tr><th>User</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  openModal('🏠 PROPERTY', prop.address || propId, html);
}

/* ──────────────────────────────────────────
   PACKAGES (Logistics)
────────────────────────────────────────── */
function buildPackagesContent() {
  const shipments      = DATA.logistics?.shipments       || [];
  const trackingEvents = DATA.logistics?.tracking_events || [];

  if (!shipments.length) return `<div class="empty-state">No logistics data loaded.</div>`;

  const delivered = shipments.filter(s => s.status?.toLowerCase() === 'delivered').length;
  const pending   = shipments.length - delivered;
  const carriers  = [...new Set(shipments.map(s => s.carrier).filter(Boolean))];

  const kpis = `<div class="kpi-row" style="margin-bottom:14px">
    <div class="kpi-card" style="--accent:#64748b"><div class="kpi-icon">📦</div><div><div class="kpi-value">${shipments.length}</div><div class="kpi-label">Total Packages</div><div class="kpi-sub">${carriers.length} carriers</div></div></div>
    <div class="kpi-card" style="--accent:#22c55e"><div class="kpi-icon">✅</div><div><div class="kpi-value">${delivered}</div><div class="kpi-label">Delivered</div><div class="kpi-sub">${Math.round(delivered/shipments.length*100)}%</div></div></div>
    <div class="kpi-card" style="--accent:#f59e0b"><div class="kpi-icon">🚚</div><div><div class="kpi-value">${pending}</div><div class="kpi-label">In Transit / Pending</div><div class="kpi-sub"></div></div></div>
    <div class="kpi-card" style="--accent:#a855f7"><div class="kpi-icon">📍</div><div><div class="kpi-value">${trackingEvents.length}</div><div class="kpi-label">Tracking Events</div><div class="kpi-sub">Across all shipments</div></div></div>
  </div>`;

  const rows = shipments.map(s => {
    const events = trackingEvents.filter(e => e.tracking_number === s.tracking_number);
    return `<tr class="clickable" onclick="openPackageModal('${s.tracking_number}')">
      <td>${fmtDate(s.created_at)}</td>
      <td><button class="link-btn" onclick="event.stopPropagation();openUserModal('${s.user_id}')">${getUserName(s.user_id)}</button></td>
      <td><span style="font-family:var(--mono);font-size:10px">${s.tracking_number?.slice(0,20)}${s.tracking_number?.length > 20 ? '…' : ''}</span></td>
      <td>${s.carrier || '—'}</td>
      <td>${s.origin || '—'}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.destination || '—'}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${fmtDate(s.actual_delivery || s.estimated_delivery)}</td>
      <td>${events.length}</td>
    </tr>`;
  }).join('');

  const table = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Date</th><th>User</th><th>Tracking #</th><th>Carrier</th><th>Origin</th><th>Destination</th><th>Status</th><th>Delivered</th><th>Events</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="9" class="empty-state">No packages</td></tr>'}</tbody>
  </table></div>`;

  return kpis + `<div class="section-label">Shipments (${shipments.length})</div><div style="margin-top:8px">${table}</div>`;
}

function openPackageModal(trackingNum) {
  const shipment = (DATA.logistics?.shipments || []).find(s => s.tracking_number === trackingNum);
  if (!shipment) return;

  const events = (DATA.logistics?.tracking_events || []).filter(e => e.tracking_number === trackingNum);

  let html = chainBlock('SHIPMENT', [
    { k: 'Tracking #',   v: shipment.tracking_number, mono: true },
    { k: 'User',         v: getUserName(shipment.user_id) },
    { k: 'Carrier',      v: shipment.carrier },
    { k: 'Status',       v: shipment.status },
    { k: 'Origin',       v: shipment.origin },
    { k: 'Destination',  v: shipment.destination },
    { k: 'Created',      v: fmtDate(shipment.created_at) },
    { k: 'Est. Delivery',v: fmtDate(shipment.estimated_delivery) },
    { k: 'Delivered',    v: fmtDate(shipment.actual_delivery) },
  ], 'cb-lifestyle');

  if (events.length) {
    const evtRows = events.sort((a,b) => (a.timestamp||'').localeCompare(b.timestamp||'')).map(e => `
      <tr>
        <td>${fmtDate(e.timestamp)}</td>
        <td>${e.location || '—'}</td>
        <td style="color:var(--text)">${e.status || e.description || '—'}</td>
      </tr>`).join('');
    html += `<div class="chain-block cb-lifestyle" style="margin-bottom:12px">
      <div class="chain-block-hdr"><span class="chain-block-label">📍 Tracking Events (${events.length})</span></div>
      <table class="chain-mini-table"><thead><tr><th>Timestamp</th><th>Location</th><th>Status</th></tr></thead>
      <tbody>${evtRows}</tbody></table></div>`;
  }

  openModal('📦 PACKAGE', shipment.tracking_number, html);
}

/* ──────────────────────────────────────────
   MUSIC (Sonos)
────────────────────────────────────────── */
function buildMusicContent() {
  const speakers      = DATA.sonos?.speakers       || [];
  const favorites     = DATA.sonos?.favorites      || [];
  const favTracks     = DATA.sonos?.favorite_tracks || [];
  const groups        = DATA.sonos?.speaker_groups  || [];
  const groupMembers  = DATA.sonos?.group_members   || [];

  if (!speakers.length && !favorites.length) return `<div class="empty-state">No Sonos data loaded.</div>`;

  const kpis = `<div class="kpi-row" style="margin-bottom:14px">
    <div class="kpi-card" style="--accent:#14b8a6"><div class="kpi-icon">🔊</div><div><div class="kpi-value">${speakers.length}</div><div class="kpi-label">Speakers</div><div class="kpi-sub">${groups.length} groups</div></div></div>
    <div class="kpi-card" style="--accent:#a855f7"><div class="kpi-icon">❤️</div><div><div class="kpi-value">${favorites.length}</div><div class="kpi-label">Favorites</div><div class="kpi-sub">Playlists &amp; stations</div></div></div>
    <div class="kpi-card" style="--accent:#22c55e"><div class="kpi-icon">🎵</div><div><div class="kpi-value">${favTracks.length}</div><div class="kpi-label">Favorite Tracks</div><div class="kpi-sub"></div></div></div>
  </div>`;

  /* Speakers table */
  const spkRows = speakers.map(s => {
    const speakerId = s.speaker_id || s.id;
    const memberGroups = groups.filter(g => groupMembers.some(m => m.speaker_id === speakerId && m.group_id === g.id));
    return `<tr>
      <td><button class="link-btn" onclick="openUserModal('${s.user_id}')">${getUserName(s.user_id)}</button></td>
      <td style="font-weight:500;color:var(--text)">${s.room || s.name || s.model || '—'}</td>
      <td>${s.model || s.device_model || '—'}</td>
      <td>${s.room || s.zone || '—'}</td>
      <td>${memberGroups.map(g => g.name).join(', ') || '—'}</td>
      <td>${s.volume != null ? s.volume + '%' : '—'}</td>
      <td>${statusBadge(s.playback_state || s.status || (s.is_playing ? 'active' : 'idle'))}</td>
    </tr>`;
  }).join('');

  /* Favorites table */
  const favRows = favorites.slice(0, 30).map(f => `<tr>
    <td><button class="link-btn" onclick="openUserModal('${f.user_id}')">${getUserName(f.user_id)}</button></td>
    <td style="font-weight:500;color:var(--text)">${f.name || f.title || '—'}</td>
    <td>${f.type || f.service || '—'}</td>
    <td>${fmtDate(f.added_at || f.created_at)}</td>
  </tr>`).join('');

  /* Tracks table */
  const favoriteUserMap = {};
  favorites.forEach(f => { favoriteUserMap[f.favorite_id || f.id] = f.user_id; });
  const trackRows = favTracks.slice(0, 20).map(t => {
    const uid = t.user_id || favoriteUserMap[t.favorite_id];
    return `<tr>
    <td>${uid ? `<button class="link-btn" onclick="openUserModal('${uid}')">${getUserName(uid)}</button>` : '—'}</td>
    <td style="font-weight:500;color:var(--text)">${t.title || t.track_name || '—'}</td>
    <td>${t.artist || '—'}</td>
    <td>${t.album || '—'}</td>
    <td>${t.service || t.source || '—'}</td>
  </tr>`;
  }).join('');

  return kpis +
    `<div class="section-label">Speakers (${speakers.length})</div>
    <div class="table-wrap" style="margin-top:8px"><table class="data-table">
      <thead><tr><th>User</th><th>Name</th><th>Model</th><th>Room</th><th>Groups</th><th>Volume</th><th>Status</th></tr></thead>
      <tbody>${spkRows || '<tr><td colspan="7" class="empty-state">No speakers</td></tr>'}</tbody>
    </table></div>` +
    (favorites.length ? `<div class="section-label" style="margin-top:18px">Favorites (${favorites.length})</div>
    <div class="table-wrap" style="margin-top:8px"><table class="data-table">
      <thead><tr><th>User</th><th>Name</th><th>Type</th><th>Added</th></tr></thead>
      <tbody>${favRows}</tbody>
    </table></div>` : '') +
    (favTracks.length ? `<div class="section-label" style="margin-top:18px">Favorite Tracks (${favTracks.length})</div>
    <div class="table-wrap" style="margin-top:8px"><table class="data-table">
      <thead><tr><th>User</th><th>Track</th><th>Artist</th><th>Album</th><th>Service</th></tr></thead>
      <tbody>${trackRows}</tbody>
    </table></div>` : '');
}

/* ──────────────────────────────────────────
   NOTES (Obsidian)
────────────────────────────────────────── */
function buildNotesContent() {
  const notes = DATA.obsidian?.notes || [];
  const tags  = DATA.obsidian?.tags  || [];

  if (!notes.length) return `<div class="empty-state">No Obsidian data loaded.</div>`;

  const kpis = `<div class="kpi-row" style="margin-bottom:14px">
    <div class="kpi-card" style="--accent:#7c3aed"><div class="kpi-icon">📓</div><div><div class="kpi-value">${notes.length}</div><div class="kpi-label">Notes</div><div class="kpi-sub">Across all vaults</div></div></div>
    <div class="kpi-card" style="--accent:#a855f7"><div class="kpi-icon">🏷️</div><div><div class="kpi-value">${tags.length}</div><div class="kpi-label">Tags</div><div class="kpi-sub"></div></div></div>
  </div>`;

  const tagsByNote = {};
  tags.forEach(t => {
    if (!tagsByNote[t.note_id]) tagsByNote[t.note_id] = [];
    tagsByNote[t.note_id].push(t.tag);
  });

  const rows = notes.map(n => {
    const noteTags = n.tags || tagsByNote[n.note_id || n.id] || [];
    return `<tr class="clickable" onclick="openNoteModal('${n.note_id || n.id}')">
    <td><button class="link-btn" onclick="event.stopPropagation();openUserModal('${n.user_id || n.persona_id}')">${getUserName(n.user_id || n.persona_id)}</button></td>
    <td style="font-weight:500;color:var(--text);max-width:240px">${n.title || n.name || '—'}</td>
    <td style="font-size:11px;color:var(--text3);max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(n.content || n.body || '').slice(0,100)}</td>
    <td>${noteTags.map(t => `<span style="background:rgba(124,58,237,0.12);color:#a78bfa;border-radius:4px;padding:1px 6px;font-size:10px;margin-right:3px">${t}</span>`).join('')}</td>
    <td>${fmtDate(n.created_at || n.modified_at)}</td>
  </tr>`;
  }).join('');

  return kpis + `<div class="section-label">Notes (${notes.length})</div>
  <div class="table-wrap" style="margin-top:8px"><table class="data-table">
    <thead><tr><th>User</th><th>Title</th><th>Preview</th><th>Tags</th><th>Date</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="empty-state">No notes</td></tr>'}</tbody>
  </table></div>`;
}

function openNoteModal(noteId) {
  const note = (DATA.obsidian?.notes || []).find(n => (n.note_id || n.id) === noteId);
  if (!note) return;
  const noteTags = note.tags || (DATA.obsidian?.tags || []).filter(t => t.note_id === (note.note_id || note.id)).map(t => t.tag);

  const html = chainBlock('NOTE', [
    { k: 'Title',   v: note.title || note.name },
    { k: 'User',    v: getUserName(note.user_id || note.persona_id) },
    { k: 'Tags',    v: noteTags.join(', ') || '—' },
    { k: 'Created', v: fmtDate(note.created_at) },
    { k: 'Modified',v: fmtDate(note.modified_at) },
  ], 'cb-lifestyle') +
  `<div class="chain-block cb-lifestyle">
    <div class="chain-block-hdr"><span class="chain-block-label">Content</span></div>
    <div style="padding:14px;font-size:12px;color:var(--text2);line-height:1.7;white-space:pre-wrap;font-family:var(--mono)">${note.content || note.body || '(no content)'}</div>
  </div>`;

  openModal('📓 NOTE', note.title || noteId, html);
}
