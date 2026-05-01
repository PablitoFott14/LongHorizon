/* ════════════════════════════════════════════════════════
   LongHorizon · Shopping Tab
   Amazon, Walmart, Target, Instacart, FreshDirect, Amazon Fresh
════════════════════════════════════════════════════════ */

let SHOP_PAGE = 1;
const SHOP_PAGE_SIZE = 50;
let SHOP_FILTERED = [];

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
function renderShoppingPage() {
  populatePersonaSelects();
  populateShopStatusFilter();
  renderShoppingKPIs();
  bindShopFilters();
  refreshShopping();
}

function populateShopStatusFilter() {
  const sel = document.getElementById('shop-status');
  if (!sel || sel.options.length > 1) return;
  const statuses = [...new Set(ALL_ORDERS.map(o => o.status).filter(Boolean))].sort();
  statuses.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    sel.appendChild(opt);
  });
}

function bindShopFilters() {
  const ids = ['shop-service','shop-user','shop-status'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._shopBound) {
      el._shopBound = true;
      el.addEventListener('change', () => { SHOP_PAGE = 1; refreshShopping(); });
    }
  });

  ['shop-search','shop-min','shop-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._shopBound) {
      el._shopBound = true;
      el.addEventListener('input', () => { SHOP_PAGE = 1; refreshShopping(); });
    }
  });

  const clearBtn = document.getElementById('shop-clear-btn');
  if (clearBtn && !clearBtn._bound) {
    clearBtn._bound = true;
    clearBtn.addEventListener('click', () => {
      ['shop-search','shop-min','shop-max'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      ['shop-service','shop-user','shop-status'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      SHOP_PAGE = 1; refreshShopping();
    });
  }
}

function refreshShopping() {
  const q       = (document.getElementById('shop-search')?.value || '').toLowerCase();
  const service = document.getElementById('shop-service')?.value || '';
  const userId  = document.getElementById('shop-user')?.value   || '';
  const status  = document.getElementById('shop-status')?.value  || '';
  const minAmt  = parseFloat(document.getElementById('shop-min')?.value || '') || null;
  const maxAmt  = parseFloat(document.getElementById('shop-max')?.value || '') || null;

  SHOP_FILTERED = ALL_ORDERS.filter(o => {
    if (service && o.service !== service) return false;
    if (userId  && o.user_id !== userId)   return false;
    if (status  && o.status  !== status)   return false;
    if (minAmt  != null && o.total < minAmt) return false;
    if (maxAmt  != null && o.total > maxAmt) return false;
    if (q && !o.order_id?.toLowerCase().includes(q) && !o.address?.toLowerCase().includes(q) && !getUserName(o.user_id).toLowerCase().includes(q)) return false;
    return true;
  });

  document.getElementById('shop-count').textContent = `${SHOP_FILTERED.length.toLocaleString()} orders`;
  renderShopTable();
  renderShopPagination();
}

/* ──────────────────────────────────────────
   KPI CARDS
────────────────────────────────────────── */
function renderShoppingKPIs() {
  const kpiRow = document.getElementById('shopping-kpi-row');
  if (!kpiRow) return;

  const serviceKeys = ['amazon','walmart','target','instacart','fresh-direct','amazon-fresh'];
  const cards = serviceKeys.map(key => {
    const orders = ALL_ORDERS.filter(o => o.service === key);
    const spend  = orders.reduce((s, o) => s + (o.total || 0), 0);
    const svc    = SERVICES[key];
    return `<div class="kpi-card" style="--accent:${svc.color}" onclick="document.getElementById('shop-service').value='${key}';SHOP_PAGE=1;refreshShopping()">
      <div class="kpi-icon">${svc.icon}</div>
      <div>
        <div class="kpi-value">${orders.length}</div>
        <div class="kpi-label">${svc.label}</div>
        <div class="kpi-sub">$${Math.round(spend).toLocaleString()} total</div>
      </div>
    </div>`;
  });

  const totalOrders = ALL_ORDERS.length;
  const totalSpend  = ALL_ORDERS.reduce((s, o) => s + (o.total || 0), 0);
  cards.unshift(`<div class="kpi-card" style="--accent:#14b8a6" onclick="document.getElementById('shop-service').value='';SHOP_PAGE=1;refreshShopping()">
    <div class="kpi-icon">🛒</div>
    <div>
      <div class="kpi-value">${totalOrders.toLocaleString()}</div>
      <div class="kpi-label">All Orders</div>
      <div class="kpi-sub">$${Math.round(totalSpend).toLocaleString()} total</div>
    </div>
  </div>`);

  kpiRow.innerHTML = cards.join('');
}

/* ──────────────────────────────────────────
   ORDERS TABLE
────────────────────────────────────────── */
function renderShopTable() {
  const start = (SHOP_PAGE - 1) * SHOP_PAGE_SIZE;
  const page  = SHOP_FILTERED.slice(start, start + SHOP_PAGE_SIZE);

  const rows = page.map(o => `
    <tr class="clickable" onclick="openOrderModal('${o.service}', '${o.order_id}')">
      <td>${fmtDate(o.date)}</td>
      <td>${svcBadge(o.service)}</td>
      <td><button class="link-btn" onclick="event.stopPropagation();openUserModal('${o.user_id}')">${getUserName(o.user_id)}</button></td>
      <td><span style="font-family:var(--mono);font-size:11px;color:var(--text3)">${o.order_id}</span></td>
      <td class="amt-pos">$${(o.total||0).toFixed(2)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:11px;color:var(--text3);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.address || '—'}</td>
      <td><button class="link-btn" onclick="event.stopPropagation();openOrderModal('${o.service}','${o.order_id}')">Details →</button></td>
    </tr>`).join('');

  const wrap = document.getElementById('shop-table-wrap');
  if (wrap) wrap.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Service</th><th>User</th><th>Order ID</th>
        <th>Total</th><th>Status</th><th>Address</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="empty-state">No orders match the current filters.</td></tr>'}</tbody>
    </table>`;
}

/* ──────────────────────────────────────────
   PAGINATION
────────────────────────────────────────── */
function renderShopPagination() {
  const total = SHOP_FILTERED.length;
  const pages = Math.ceil(total / SHOP_PAGE_SIZE);
  const pag   = document.getElementById('shop-pag');
  if (!pag) return;
  if (pages <= 1) { pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="shopGoPage(${SHOP_PAGE-1})" ${SHOP_PAGE===1?'disabled':''}>‹ Prev</button>`;
  pagRange(SHOP_PAGE, pages).forEach(p => {
    if (p === '…') { html += `<span class="page-info">…</span>`; return; }
    html += `<button class="page-btn ${p===SHOP_PAGE?'current':''}" onclick="shopGoPage(${p})">${p}</button>`;
  });
  html += `<button class="page-btn" onclick="shopGoPage(${SHOP_PAGE+1})" ${SHOP_PAGE===pages?'disabled':''}>Next ›</button>`;
  html += `<span class="page-info" style="margin-left:6px">${((SHOP_PAGE-1)*SHOP_PAGE_SIZE+1).toLocaleString()}–${Math.min(SHOP_PAGE*SHOP_PAGE_SIZE,total).toLocaleString()} of ${total.toLocaleString()}</span>`;
  pag.innerHTML = html;
}

function shopGoPage(p) {
  const pages = Math.ceil(SHOP_FILTERED.length / SHOP_PAGE_SIZE);
  if (p < 1 || p > pages) return;
  SHOP_PAGE = p;
  renderShopTable();
  renderShopPagination();
}
