const BASE = "../openclaw-long_horizon-universe/openclaw-long_horizon-universe-2frtws95/services";

const SERVICES = {
  "apple-health": { label: "Apple Health", category: "health", path: `${BASE}/apple-health/data.json` },
  "amazon": { label: "Amazon", category: "shopping", path: `${BASE}/amazon/data.json` },
  "amazon-fresh": { label: "Amazon Fresh", category: "shopping", path: `${BASE}/amazon-fresh/data.json` },
  "eight-sleep": { label: "Eight Sleep", category: "health", path: `${BASE}/eight-sleep/data.json` },
  "fitbit": { label: "Fitbit", category: "health", path: `${BASE}/fitbit/data.json` },
  "fresh-direct": { label: "FreshDirect", category: "shopping", path: `${BASE}/fresh-direct/data.json` },
  "garmin-connect": { label: "Garmin", category: "health", path: `${BASE}/garmin-connect/data.json` },
  "instacart": { label: "Instacart", category: "shopping", path: `${BASE}/instacart/data.json` },
  "logistics-tracking": { label: "Logistics", category: "lifestyle", path: `${BASE}/logistics-tracking/data.json` },
  "myfitnesspal": { label: "MyFitnessPal", category: "health", path: `${BASE}/myfitnesspal/data.json` },
  "obsidian": { label: "Obsidian", category: "lifestyle", path: `${BASE}/obsidian/data.json` },
  "renpho": { label: "Renpho", category: "health", path: `${BASE}/renpho/data.json` },
  "sonos": { label: "Sonos", category: "lifestyle", path: `${BASE}/sonos/data.json` },
  "strava": { label: "Strava", category: "health", path: `${BASE}/strava/data.json` },
  "target": { label: "Target", category: "shopping", path: `${BASE}/target/data.json` },
  "ticketmaster": { label: "Ticketmaster", category: "lifestyle", path: `${BASE}/ticketmaster/data.json` },
  "walmart": { label: "Walmart", category: "shopping", path: `${BASE}/walmart/data.json` },
  "whoop": { label: "Whoop", category: "health", path: `${BASE}/whoop/data.json` },
  "zillow": { label: "Zillow", category: "lifestyle", path: `${BASE}/zillow/data.json` },
};

const PERSONA_ID = /^persona_\d+$/;
const CATALOG_DATASETS = new Set([
  "products", "product_variants", "policies", "faqs", "carts", "cart_lines", "cart_items",
  "foods", "exercises", "segments", "clubs", "venues", "attractions", "events",
  "event_attractions", "ticket_types", "properties", "market_data", "search_history",
]);

const RELATIONS = {
  amazon: [{ from: "orders", to: "order_items", parentKey: "order_id", childKey: "order_id" }],
  walmart: [{ from: "orders", to: "order_items", parentKey: "order_id", childKey: "order_id" }],
  target: [{ from: "orders", to: "order_items", parentKey: "order_id", childKey: "order_id" }],
  instacart: [{ from: "orders", to: "order_items", parentKey: "id", childKey: "order_id" }],
  "fresh-direct": [{ from: "orders", to: "order_items", parentKey: "id", childKey: "order_id" }],
  "amazon-fresh": [{ from: "orders", to: "order_items", parentKey: "id", childKey: "order_id" }],
  sonos: [{ from: "favorites", to: "favorite_tracks", parentKey: "favorite_id", childKey: "favorite_id" }],
  "logistics-tracking": [{ from: "shipments", to: "tracking_events", parentKey: "tracking_number", childKey: "tracking_number" }],
};

document.addEventListener("DOMContentLoaded", () => {
  main().catch((error) => {
    console.error(error);
    setStatus(`Failed: ${error.message}`);
    document.getElementById("personas-root").innerHTML = `<p class="empty">Failed to load JSON data.</p>`;
    hideLoading();
  });
});

async function main() {
  setupTabs();
  const data = await loadServices();
  const model = buildModel(data);
  window.LH_MODEL = model;
  render(model);
  setStatus(`${model.totals.personas} personas · ${formatNumber(model.totals.mapped)} mapped records · ${model.totals.unmapped} unmapped`);
  document.getElementById("status-dot")?.classList.add("live");
  hideLoading();
}

async function loadServices() {
  const entries = await Promise.all(Object.entries(SERVICES).map(async ([key, service]) => {
    const response = await fetch(service.path);
    if (!response.ok) throw new Error(`${service.label} returned ${response.status}`);
    return [key, await response.json()];
  }));
  return Object.fromEntries(entries);
}

function buildModel(data) {
  const personas = buildPersonaIndex(data);
  const personaIds = new Set(Object.keys(personas));
  const shared = {};
  const unmapped = {};

  for (const [serviceKey, serviceData] of Object.entries(data)) {
    const arrays = arrayDatasets(serviceData);
    const personaSets = inferServiceOwnership(serviceKey, arrays, personaIds);

    for (const [datasetKey, rows] of arrays) {
      if (CATALOG_DATASETS.has(datasetKey)) {
        addDatasetCount(shared, serviceKey, datasetKey, rows.length);
        continue;
      }

      for (const row of rows) {
        const owners = [...(personaSets.get(row) || [])].filter((id) => personaIds.has(id));
        if (!owners.length) {
          addDatasetCount(unmapped, serviceKey, datasetKey, 1);
          continue;
        }
        for (const personaId of owners) {
          addRecord(personas[personaId], serviceKey, datasetKey, row);
        }
      }
    }
  }

  const personaList = Object.values(personas)
    .map(finalizePersona)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    personas: personaList,
    shared,
    unmapped,
    totals: {
      personas: personaList.length,
      services: Object.keys(SERVICES).length,
      mapped: sum(personaList.map((p) => p.totalRecords)),
      unmapped: sumNestedCounts(unmapped),
      shared: sumNestedCounts(shared),
      orders: sum(personaList.map((p) => p.summary.orderCount)),
      spend: sum(personaList.map((p) => p.summary.spend)),
      healthRecords: sum(personaList.map((p) => p.summary.healthRecords)),
    },
    categoryTotals: categoryTotals(personaList),
    serviceTotals: serviceTotals(personaList),
  };
}

function buildPersonaIndex(data) {
  const personas = {};
  for (const [serviceKey, serviceData] of Object.entries(data)) {
    for (const [, rows] of arrayDatasets(serviceData)) {
      for (const row of rows) {
        const id = directPersonaId(row);
        if (!id) continue;
        if (!personas[id]) personas[id] = createPersona(id);
        mergeIdentity(personas[id], serviceKey, row);
      }
    }
  }
  return personas;
}

function inferServiceOwnership(serviceKey, arrays, personaIds) {
  const rowOwners = new Map();
  const byDataset = new Map(arrays);

  for (const [, rows] of arrays) {
    for (const row of rows) {
      const id = directPersonaId(row);
      if (!id || !personaIds.has(id)) continue;
      setOwner(rowOwners, row, id);
    }
  }

  for (const relation of RELATIONS[serviceKey] || []) {
    const parents = byDataset.get(relation.from) || [];
    const children = byDataset.get(relation.to) || [];
    const ownersByParentValue = new Map();
    for (const parent of parents) {
      const value = parent[relation.parentKey];
      if (value === null || value === undefined) continue;
      const owners = rowOwners.get(parent);
      if (!owners?.size) continue;
      if (!ownersByParentValue.has(String(value))) ownersByParentValue.set(String(value), new Set());
      for (const owner of owners) ownersByParentValue.get(String(value)).add(owner);
    }
    for (const child of children) {
      const value = child[relation.childKey];
      const owners = ownersByParentValue.get(String(value));
      if (!owners?.size) continue;
      for (const owner of owners) setOwner(rowOwners, child, owner);
    }
  }

  if (serviceKey === "obsidian") {
    const notes = byDataset.get("notes") || [];
    const tags = byDataset.get("tags") || [];
    const ownersByNote = new Map();
    for (const note of notes) {
      const owners = rowOwners.get(note);
      if (!owners?.size) continue;
      ownersByNote.set(String(note.note_id), new Set(owners));
    }
    for (const tag of tags) {
      const owners = ownersByNote.get(String(tag.note_id));
      if (!owners?.size) continue;
      for (const owner of owners) {
        if (directPersonaId(tag) === owner || !directPersonaId(tag)) setOwner(rowOwners, tag, owner);
      }
    }
  }
  return rowOwners;
}

function createPersona(id) {
  return {
    id,
    name: humanize(id),
    email: "",
    location: "",
    sources: new Set(),
    records: {},
    datasetCounts: {},
    totalRecords: 0,
    summary: {
      orderCount: 0,
      spend: 0,
      healthRecords: 0,
      activityCount: 0,
      sleepRecords: 0,
      notes: 0,
      shipments: 0,
    },
  };
}

function mergeIdentity(persona, serviceKey, row) {
  persona.sources.add(serviceKey);
  const name = row.name || row.full_name || row.display_name || joinName(row.first_name, row.last_name);
  if (name && persona.name === humanize(persona.id)) persona.name = name;
  if (!persona.email && row.email) persona.email = row.email;
  if (!persona.location && row.city && (row.state || row.region)) {
    persona.location = `${row.city}, ${row.state || row.region}`;
  }
}

function addRecord(persona, serviceKey, datasetKey, row) {
  if (!persona.records[serviceKey]) persona.records[serviceKey] = {};
  if (!persona.records[serviceKey][datasetKey]) persona.records[serviceKey][datasetKey] = [];
  persona.records[serviceKey][datasetKey].push(row);

  if (!persona.datasetCounts[serviceKey]) persona.datasetCounts[serviceKey] = {};
  persona.datasetCounts[serviceKey][datasetKey] = (persona.datasetCounts[serviceKey][datasetKey] || 0) + 1;
  persona.totalRecords += 1;

  const service = SERVICES[serviceKey];
  if (service.category === "health") persona.summary.healthRecords += 1;
  if (datasetKey.includes("sleep")) persona.summary.sleepRecords += 1;
  if (datasetKey.includes("activit") || datasetKey.includes("workout") || datasetKey === "exercise_logs") persona.summary.activityCount += 1;
  if (datasetKey === "notes") persona.summary.notes += 1;
  if (datasetKey === "shipments") persona.summary.shipments += 1;
  if (datasetKey === "orders") {
    persona.summary.orderCount += 1;
    persona.summary.spend += Number(row.total ?? row.total_price ?? 0);
  }
}

function finalizePersona(persona) {
  persona.sources = [...persona.sources].sort((a, b) => SERVICES[a].label.localeCompare(SERVICES[b].label));
  persona.sections = buildPersonaSections(persona);
  return persona;
}

function buildPersonaSections(persona) {
  return {
    health: healthSection(persona.records),
    shopping: shoppingSection(persona.records),
    lifestyle: lifestyleSection(persona.records),
    datasets: datasetRows(persona.datasetCounts),
  };
}

function healthSection(records) {
  const rows = [];
  addHealthRow(rows, "Apple Health", records["apple-health"], [
    ["Steps", "step_records", "total_steps", "sum"],
    ["Workouts", "workout_records", "duration_minutes", "count"],
    ["Sleep stages", "sleep_records", "stage", "count"],
    ["Latest body mass", "body_mass_records", "value", "latest"],
  ]);
  addHealthRow(rows, "Garmin", records["garmin-connect"], [
    ["Steps", "daily_stats", "steps", "sum"],
    ["Activities", "activities", "distance_meters", "sumDistanceM"],
    ["Sleep", "sleep", "sleep_score", "avg"],
    ["Body comp", "body_composition", "weight_kg", "latest"],
  ]);
  addHealthRow(rows, "Fitbit", records.fitbit, [
    ["Steps", "daily_stats", "steps", "sum"],
    ["Activities", "activities", "duration_minutes", "count"],
    ["Sleep", "sleep_logs", "efficiency", "avg"],
    ["Food logs", "food_logs", "calories", "sum"],
  ]);
  addHealthRow(rows, "Whoop", records.whoop, [
    ["Cycles", "cycles", "strain", "avg"],
    ["Recovery", "recovery", "recovery_score", "avg"],
    ["Sleep", "sleep", "score_sleep_performance", "avg"],
    ["Workouts", "workouts", "score_strain", "count"],
  ]);
  addHealthRow(rows, "Eight Sleep", records["eight-sleep"], [
    ["Sleep sessions", "sleep_sessions", "avg_sleep_quality_score", "count"],
    ["Alarms", "alarms", "alarm_id", "count"],
    ["Schedules", "temperature_schedules", "schedule_id", "count"],
  ]);
  addHealthRow(rows, "Renpho", records.renpho, [
    ["Measurements", "measurements", "weight", "count"],
    ["Latest weight", "measurements", "weight", "latest"],
    ["Latest BMI", "measurements", "bmi", "latest"],
  ]);
  addHealthRow(rows, "MyFitnessPal", records.myfitnesspal, [
    ["Food logs", "food_logs", "servings", "count"],
    ["Exercise logs", "exercise_logs", "calories_burned", "sum"],
    ["Water", "water_logs", "amount_ml", "sumMl"],
  ]);
  addHealthRow(rows, "Strava", records.strava, [
    ["Activities", "activities", "distance", "sumDistanceM"],
    ["Personal records", "personal_records", "value", "count"],
    ["Routes", "routes", "distance", "sumDistanceM"],
  ]);
  return rows;
}

function addHealthRow(rows, label, serviceRecords, metrics) {
  if (!serviceRecords) return;
  const facts = metrics.map(([name, dataset, field, mode]) => {
    const values = serviceRecords[dataset] || [];
    return { name, value: metricValue(values, field, mode) };
  });
  rows.push({ label, count: countServiceRecords(serviceRecords), facts });
}

function shoppingSection(records) {
  const serviceKeys = ["amazon", "walmart", "target", "instacart", "fresh-direct", "amazon-fresh"];
  return serviceKeys.map((serviceKey) => {
    const serviceRecords = records[serviceKey] || {};
    const orders = serviceRecords.orders || [];
    const items = serviceRecords.order_items || [];
    return {
      label: SERVICES[serviceKey].label,
      orders: orders.length,
      items: items.length,
      spend: sum(orders.map((order) => Number(order.total || 0))),
      recent: recentRows(orders, (row) => row.created_at || row.delivery_date, 4).map((order) => ({
        id: order.order_id || order.id,
        date: shortDate(order.created_at || order.delivery_date),
        status: order.status || "unknown",
        total: money(order.total),
      })),
    };
  }).filter((row) => row.orders || row.items);
}

function lifestyleSection(records) {
  return [
    {
      label: "Obsidian",
      facts: [
        ["Notes", count(records.obsidian?.notes)],
        ["Tags", count(records.obsidian?.tags)],
        ["Latest note", latestTitle(records.obsidian?.notes, "modified_at")],
      ],
    },
    {
      label: "Sonos",
      facts: [
        ["Speakers", count(records.sonos?.speakers)],
        ["Queue items", count(records.sonos?.queue_items)],
        ["Favorites", count(records.sonos?.favorites)],
        ["Favorite tracks", count(records.sonos?.favorite_tracks)],
      ],
    },
    {
      label: "Ticketmaster",
      facts: [
        ["Orders", count(records.ticketmaster?.orders)],
        ["Spend", money(sum((records.ticketmaster?.orders || []).map((row) => Number(row.total_price || 0))))],
        ["Latest purchase", latestTitle(records.ticketmaster?.orders, "purchased_at", "confirmation_code")],
      ],
    },
    {
      label: "Zillow",
      facts: [
        ["Saved properties", count(records.zillow?.saved_properties)],
        ["Scheduled tours", count(records.zillow?.scheduled_tours)],
        ["Latest tour", latestTitle(records.zillow?.scheduled_tours, "tour_date", "status")],
      ],
    },
    {
      label: "Logistics",
      facts: [
        ["Shipments", count(records["logistics-tracking"]?.shipments)],
        ["Tracking events", count(records["logistics-tracking"]?.tracking_events)],
        ["Latest status", latestTitle(records["logistics-tracking"]?.tracking_events, "timestamp", "status")],
      ],
    },
  ].filter((section) => section.facts.some(([, value]) => value && value !== "0" && value !== "$0.00"));
}

function render(model) {
  renderOverview(model);
  renderPersonaTable(model.personas);
  setupPersonaSearch(model.personas);
  renderPersonas(model.personas);
  renderAudit(model);
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.tab));
  });
}

function navigateTo(tab) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${tab}`);
  });
}

function renderOverview(model) {
  const cards = [
    { label: "Personas", value: formatNumber(model.totals.personas), sub: `${model.totals.services} services loaded`, color: "#818cf8", icon: "P" },
    { label: "Mapped Records", value: formatNumber(model.totals.mapped), sub: "Persona-owned rows", color: "#34d399", icon: "R" },
    { label: "Orders", value: formatNumber(model.totals.orders), sub: money(model.totals.spend), color: "#fbbf24", icon: "$" },
    { label: "Health Records", value: formatNumber(model.totals.healthRecords), sub: "Activity, sleep, body, nutrition", color: "#22d3ee", icon: "H" },
    { label: "Shared Catalog Rows", value: formatNumber(model.totals.shared), sub: "Products, events, properties, foods", color: "#a78bfa", icon: "C" },
    { label: "Unmapped Records", value: formatNumber(model.totals.unmapped), sub: "Should be zero", color: model.totals.unmapped ? "#f87171" : "#34d399", icon: "!" },
  ];

  document.getElementById("kpi-row").innerHTML = cards.map((card) => `
    <div class="kpi-card" style="--accent:${card.color}">
      <div class="kpi-icon">${escapeHtml(card.icon)}</div>
      <div>
        <div class="kpi-value">${escapeHtml(card.value)}</div>
        <div class="kpi-label">${escapeHtml(card.label)}</div>
        <div class="kpi-sub">${escapeHtml(card.sub)}</div>
      </div>
    </div>
  `).join("");

  renderBars("category-bars", Object.entries(model.categoryTotals)
    .map(([key, value]) => [titleCase(key), value])
    .sort((a, b) => b[1] - a[1]));
  renderBars("service-bars", Object.entries(model.serviceTotals)
    .map(([key, value]) => [SERVICES[key].label, value])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12));
  renderCoverageTable(model.personas);
}

function renderBars(id, rows) {
  const max = Math.max(...rows.map(([, value]) => value), 1);
  document.getElementById(id).innerHTML = rows.map(([label, value], index) => `
    <div class="bar-row">
      <strong>${escapeHtml(label)}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (value / max) * 100)}%;background:${barColor(index)}"></div></div>
      <span class="bar-value">${formatNumber(value)}</span>
    </div>
  `).join("");
}

function renderCoverageTable(personas) {
  document.getElementById("coverage-table").innerHTML = `
    <table class="data-table">
      <thead><tr><th>Persona</th><th>ID</th><th>Services</th><th>Mapped Records</th><th>Orders</th><th>Health Records</th><th>Notes</th></tr></thead>
      <tbody>${personas.map((persona) => `
        <tr>
          <td><a href="#${persona.id}" onclick="navigateTo('personas')"><strong>${escapeHtml(persona.name)}</strong></a></td>
          <td class="mono">${escapeHtml(persona.id)}</td>
          <td>${persona.sources.length}/${Object.keys(SERVICES).length}</td>
          <td class="num">${formatNumber(persona.totalRecords)}</td>
          <td class="num">${formatNumber(persona.summary.orderCount)}</td>
          <td class="num">${formatNumber(persona.summary.healthRecords)}</td>
          <td class="num">${formatNumber(persona.summary.notes)}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function setupPersonaSearch(personas) {
  const input = document.getElementById("persona-search");
  input.addEventListener("input", () => renderPersonaTable(personas, input.value));
}

function renderPersonaTable(personas, query = "") {
  const q = query.trim().toLowerCase();
  const filtered = personas.filter((persona) =>
    [persona.name, persona.email, persona.id, persona.location].some((value) => String(value || "").toLowerCase().includes(q))
  );
  setText("persona-count", `${filtered.length} of ${personas.length} personas`);
  document.getElementById("personas-table").innerHTML = `
    <table class="data-table">
      <thead><tr><th>Persona</th><th>Email</th><th>Location</th><th>Services</th><th>Records</th><th>Orders</th><th>Spend</th><th>Health</th><th>Notes</th></tr></thead>
      <tbody>${filtered.map((persona) => `
        <tr>
          <td><a href="#${persona.id}"><strong>${escapeHtml(persona.name)}</strong><div class="mono">${escapeHtml(persona.id)}</div></a></td>
          <td>${escapeHtml(persona.email || "")}</td>
          <td>${escapeHtml(persona.location || "")}</td>
          <td>${persona.sources.length}/${Object.keys(SERVICES).length}</td>
          <td class="num">${formatNumber(persona.totalRecords)}</td>
          <td class="num">${formatNumber(persona.summary.orderCount)}</td>
          <td class="num">${money(persona.summary.spend)}</td>
          <td class="num">${formatNumber(persona.summary.healthRecords)}</td>
          <td class="num">${formatNumber(persona.summary.notes)}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderPersonas(personas) {
  document.getElementById("personas-root").innerHTML = personas.map(renderPersona).join("");
}

function renderPersona(persona) {
  return `
    <article class="persona-card" id="${persona.id}">
      <header class="persona-header">
        <div class="avatar">${escapeHtml(initials(persona.name))}</div>
        <div>
          <h3>${escapeHtml(persona.name)}</h3>
          <p>${escapeHtml([persona.id, persona.email, persona.location].filter(Boolean).join(" · "))}</p>
        </div>
        <div class="persona-mini">${formatNumber(persona.totalRecords)} records<br>${persona.sources.length}/${Object.keys(SERVICES).length} services</div>
      </header>

      <div class="chain">
        <section class="persona-section full-span">
          <h4>Persona Summary</h4>
          <div class="metric-grid">
        ${stat("Mapped records", formatNumber(persona.totalRecords))}
        ${stat("Services", `${persona.sources.length}/${Object.keys(SERVICES).length}`)}
        ${stat("Orders", formatNumber(persona.summary.orderCount))}
        ${stat("Spend", money(persona.summary.spend))}
        ${stat("Health records", formatNumber(persona.summary.healthRecords))}
        ${stat("Notes", formatNumber(persona.summary.notes))}
          </div>
        </section>

        <section class="persona-section">
          <h4>Data Coverage</h4>
          <div class="source-list">${persona.sources.map((key) => `<span class="source-pill">${escapeHtml(SERVICES[key].label)}</span>`).join("")}</div>
        </section>

        <section class="persona-section">
          <h4>Source Record Counts</h4>
          <div class="dataset-list">${persona.sections.datasets.map(renderDatasetRow).join("")}</div>
        </section>

        <section class="persona-section full-span">
          <h4>Health and Activity</h4>
          ${renderHealthTable(persona.sections.health)}
        </section>

        <section class="persona-section full-span">
          <h4>Purchases</h4>
          ${renderShoppingTable(persona.sections.shopping)}
        </section>

        <section class="persona-section full-span">
          <h4>Lifestyle, Housing, Events, Notes, Media</h4>
          ${renderLifestyleTable(persona.sections.lifestyle)}
        </section>
      </div>
    </article>
  `;
}

function renderDatasetRow(row) {
  return `
    <div class="dataset-line">
      <strong>${escapeHtml(row.service)}</strong>
      <span>${row.datasets.map(([name, value]) => `${escapeHtml(name)} ${formatNumber(value)}`).join(" · ")}</span>
    </div>
  `;
}

function renderHealthTable(rows) {
  if (!rows.length) return `<p class="empty">No health records.</p>`;
  return `
    <table class="mini-table">
      <thead><tr><th>Service</th><th>Mapped Records</th><th>Metrics</th></tr></thead>
      <tbody>${rows.map((section) => `
        <tr>
          <td><span class="badge badge-health">${escapeHtml(section.label)}</span></td>
          <td class="num">${formatNumber(section.count)}</td>
          <td>${section.facts.map((fact) => `${escapeHtml(fact.name)}: <strong>${escapeHtml(String(fact.value))}</strong>`).join(" · ")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderShoppingTable(rows) {
  if (!rows.length) return `<p class="empty">No purchase records.</p>`;
  return `
    <table class="mini-table">
      <thead><tr><th>Service</th><th>Orders</th><th>Items</th><th>Spend</th><th>Recent Orders</th></tr></thead>
      <tbody>${rows.map((section) => `
        <tr>
          <td><span class="badge badge-shopping">${escapeHtml(section.label)}</span></td>
          <td class="num">${formatNumber(section.orders)}</td>
          <td class="num">${formatNumber(section.items)}</td>
          <td class="num">${money(section.spend)}</td>
          <td>${section.recent.map((row) => `${escapeHtml(row.date)} ${escapeHtml(row.total)} ${escapeHtml(row.status)}`).join(" · ")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderLifestyleTable(rows) {
  if (!rows.length) return `<p class="empty">No lifestyle records.</p>`;
  return `
    <table class="mini-table">
      <thead><tr><th>Service</th><th>Details</th></tr></thead>
      <tbody>${rows.map((section) => `
        <tr>
          <td><span class="badge badge-lifestyle">${escapeHtml(section.label)}</span></td>
          <td>${section.facts.map(([name, value]) => `${escapeHtml(name)}: <strong>${escapeHtml(String(value))}</strong>`).join(" · ")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderAudit(model) {
  const audit = document.getElementById("audit-root");
  audit.innerHTML = `
    <article class="audit-card">
      <h3>Mapping Rules</h3>
      <p>Rows map to a persona only through direct <code>user_id</code>/<code>persona_id</code> values or service-local foreign keys inherited from directly-owned rows.</p>
    </article>
    <article class="audit-card">
      <h3>Unmapped Persona Records</h3>
      ${renderCountGroups(model.unmapped) || "<p class=\"empty\">None found.</p>"}
    </article>
    <article class="audit-card">
      <h3>Shared Catalog Data</h3>
      ${renderCountGroups(model.shared) || "<p class=\"empty\">None found.</p>"}
    </article>
  `;
}

function renderCountGroups(groups) {
  return Object.entries(groups).map(([serviceKey, datasets]) => `
    <div class="audit-row">
      <strong>${escapeHtml(SERVICES[serviceKey].label)}</strong>
      <span>${Object.entries(datasets).map(([key, value]) => `${escapeHtml(key)} ${formatNumber(value)}`).join(" · ")}</span>
    </div>
  `).join("");
}

function datasetRows(datasetCounts) {
  return Object.entries(datasetCounts)
    .sort(([a], [b]) => SERVICES[a].label.localeCompare(SERVICES[b].label))
    .map(([serviceKey, datasets]) => ({
      service: SERVICES[serviceKey].label,
      datasets: Object.entries(datasets).sort(([a], [b]) => a.localeCompare(b)),
    }));
}

function metricValue(rows, field, mode) {
  if (!rows?.length) return "0";
  if (mode === "count") return formatNumber(rows.length);
  if (mode === "latest") return formatValue(latestRow(rows)?.[field]);
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  if (!values.length) return "0";
  if (mode === "sum") return formatNumber(sum(values));
  if (mode === "sumMl") return `${formatNumber(Math.round(sum(values) / 1000))} L`;
  if (mode === "sumDistanceM") return `${formatNumber(Math.round(sum(values) / 1000))} km`;
  if (mode === "avg") return round(sum(values) / values.length);
  return formatNumber(values.length);
}

function recentRows(rows, dateSelector, limit) {
  return [...(rows || [])]
    .sort((a, b) => String(dateSelector(b) || "").localeCompare(String(dateSelector(a) || "")))
    .slice(0, limit);
}

function latestRow(rows) {
  return recentRows(rows, (row) => row.date || row.timestamp || row.created_at || row.start_time || row.modified_at, 1)[0];
}

function latestTitle(rows, dateKey, titleKey = "title") {
  const row = recentRows(rows || [], (item) => item[dateKey], 1)[0];
  return row ? formatValue(row[titleKey] || row[dateKey]) : "0";
}

function arrayDatasets(serviceData) {
  return Object.entries(serviceData)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, rows]) => [key, rows.filter((row) => row && typeof row === "object" && !Array.isArray(row))]);
}

function directPersonaId(row) {
  const id = row.user_id || row.persona_id;
  return PERSONA_ID.test(String(id || "")) ? String(id) : "";
}

function addDatasetCount(target, serviceKey, datasetKey, countValue) {
  if (!target[serviceKey]) target[serviceKey] = {};
  target[serviceKey][datasetKey] = (target[serviceKey][datasetKey] || 0) + countValue;
}

function setOwner(map, key, owner) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(owner);
}

function countServiceRecords(serviceRecords) {
  return sum(Object.values(serviceRecords || {}).map((rows) => rows.length));
}

function count(rows) {
  return formatNumber((rows || []).length);
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function sumNestedCounts(groups) {
  return sum(Object.values(groups).flatMap((datasets) => Object.values(datasets)));
}

function stat(label, value) {
  return `<div class="metric-tile"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
}

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function joinName(first, last) {
  return [first, last].filter(Boolean).join(" ");
}

function humanize(id) {
  return id.replace("_", " ");
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "0";
  return typeof value === "number" ? round(value) : String(value);
}

function round(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function shortDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setStatus(value) {
  setText("status-text", value);
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  setTimeout(() => overlay.remove(), 300);
}

function categoryTotals(personas) {
  const totals = { health: 0, shopping: 0, lifestyle: 0 };
  for (const persona of personas) {
    for (const [serviceKey, datasets] of Object.entries(persona.datasetCounts)) {
      totals[SERVICES[serviceKey].category] += sum(Object.values(datasets));
    }
  }
  return totals;
}

function serviceTotals(personas) {
  const totals = {};
  for (const persona of personas) {
    for (const [serviceKey, datasets] of Object.entries(persona.datasetCounts)) {
      totals[serviceKey] = (totals[serviceKey] || 0) + sum(Object.values(datasets));
    }
  }
  return totals;
}

function barColor(index) {
  return ["#818cf8", "#34d399", "#fbbf24", "#a78bfa", "#22d3ee", "#f87171"][index % 6];
}

function titleCase(value) {
  return String(value).replace(/(^|-)([a-z])/g, (match) => match.toUpperCase()).replaceAll("-", " ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
