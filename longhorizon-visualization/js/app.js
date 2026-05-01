const BASE = "../openclaw-long_horizon-universe/openclaw-long_horizon-universe-2frtws95/services";

const SERVICES = {
  amazon: { label: "Amazon", category: "shopping", path: `${BASE}/amazon/data.json` },
  "amazon-fresh": { label: "Amazon Fresh", category: "shopping", path: `${BASE}/amazon-fresh/data.json` },
  "apple-health": { label: "Apple Health", category: "health", path: `${BASE}/apple-health/data.json` },
  "eight-sleep": { label: "Eight Sleep", category: "health", path: `${BASE}/eight-sleep/data.json` },
  fitbit: { label: "Fitbit", category: "health", path: `${BASE}/fitbit/data.json` },
  "fresh-direct": { label: "FreshDirect", category: "shopping", path: `${BASE}/fresh-direct/data.json` },
  "garmin-connect": { label: "Garmin", category: "health", path: `${BASE}/garmin-connect/data.json` },
  instacart: { label: "Instacart", category: "shopping", path: `${BASE}/instacart/data.json` },
  "logistics-tracking": { label: "Logistics", category: "lifestyle", path: `${BASE}/logistics-tracking/data.json` },
  myfitnesspal: { label: "MyFitnessPal", category: "health", path: `${BASE}/myfitnesspal/data.json` },
  obsidian: { label: "Obsidian", category: "lifestyle", path: `${BASE}/obsidian/data.json` },
  renpho: { label: "Renpho", category: "health", path: `${BASE}/renpho/data.json` },
  sonos: { label: "Sonos", category: "lifestyle", path: `${BASE}/sonos/data.json` },
  strava: { label: "Strava", category: "health", path: `${BASE}/strava/data.json` },
  target: { label: "Target", category: "shopping", path: `${BASE}/target/data.json` },
  ticketmaster: { label: "Ticketmaster", category: "lifestyle", path: `${BASE}/ticketmaster/data.json` },
  walmart: { label: "Walmart", category: "shopping", path: `${BASE}/walmart/data.json` },
  whoop: { label: "Whoop", category: "health", path: `${BASE}/whoop/data.json` },
  zillow: { label: "Zillow", category: "lifestyle", path: `${BASE}/zillow/data.json` },
};

const CATEGORY_LABELS = { health: "Health", shopping: "Shopping", lifestyle: "Lifestyle" };
const PERSONA_ID_PATTERN = /^persona_\d+$/;
const SHOPPING_SERVICES = Object.keys(SERVICES).filter((key) => SERVICES[key].category === "shopping");

const SHARED_DATASETS = new Set([
  "products", "product_variants", "policies", "faqs", "cart_items", "carts", "cart_lines",
  "venues", "attractions", "events", "event_attractions", "ticket_types",
  "properties", "market_data", "search_history",
  "foods", "exercises", "segments", "clubs",
]);

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch((error) => {
    console.error(error);
    setText("load-state", `Failed to load data: ${error.message}`);
    document.getElementById("personas-root").innerHTML =
      `<div class="empty">Failed to load data: ${escapeHtml(error.message)}</div>`;
  });
});

async function initialize() {
  const data = await loadAllData();
  const model = buildModel(data);
  render(model);
  setText("load-state", "Loaded from source JSON");
}

async function loadAllData() {
  const entries = await Promise.all(Object.entries(SERVICES).map(async ([key, service]) => {
    const response = await fetch(service.path);
    if (!response.ok) throw new Error(`${service.label}: HTTP ${response.status}`);
    return [key, await response.json()];
  }));
  return Object.fromEntries(entries);
}

function buildModel(data) {
  const personas = buildPersonaIndex(data);
  const personaIds = new Set(Object.keys(personas));
  const distribution = seedDistribution(personas);
  const unmapped = {};
  const shared = {};
  const categoryTotals = { health: 0, shopping: 0, lifestyle: 0 };
  let mappedRecords = 0;
  let unmappedRecords = 0;

  for (const [serviceKey, serviceData] of Object.entries(data)) {
    const arrays = Object.entries(serviceData)
      .filter(([, value]) => Array.isArray(value))
      .map(([datasetKey, rows]) => [datasetKey, rows.filter(isObjectRecord)]);

    const personaSetsByDataset = inferPersonaSets(arrays);

    for (const [datasetKey, rows] of arrays) {
      if (SHARED_DATASETS.has(datasetKey)) {
        addDatasetCount(shared, serviceKey, datasetKey, rows.length);
        continue;
      }

      rows.forEach((row, index) => {
        const linked = Array.from(personaSetsByDataset[datasetKey][index]).filter((pid) => personaIds.has(pid));
        if (!linked.length) {
          addDatasetCount(unmapped, serviceKey, datasetKey, 1);
          unmappedRecords += 1;
          return;
        }

        mappedRecords += 1;
        linked.forEach((personaId) => {
          addPersonaRecord(distribution[personaId], serviceKey, datasetKey, row);
          categoryTotals[SERVICES[serviceKey].category] += 1;
        });
      });
    }
  }

  const personaRows = Object.values(distribution)
    .map(finalizePersona)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    personas: personaRows,
    categoryTotals,
    totalOrders: personaRows.reduce((sum, p) => sum + p.ordersCount, 0),
    mappedRecords,
    unmappedRecords,
    unmapped,
    shared,
  };
}

function buildPersonaIndex(data) {
  const personas = {};

  Object.values(data).forEach((serviceData) => {
    Object.values(serviceData).forEach((rows) => {
      if (!Array.isArray(rows)) return;
      rows.filter(isObjectRecord).forEach((record) => {
        const id = getPersonaId(record);
        if (!id) return;
        if (!personas[id]) personas[id] = { id, name: id, email: "", location: "", interests: "" };
        mergePersonaMetadata(personas[id], record);
      });
    });
  });

  const homeNotes = data.obsidian?.notes?.filter((note) => note.title === "Home") || [];
  homeNotes.forEach((note) => {
    const persona = personas[note.user_id];
    if (persona) persona.interests = extractInterests(note.content);
  });

  return personas;
}

function mergePersonaMetadata(persona, record) {
  const name = firstPresent(record.name, record.full_name, record.display_name);
  const email = firstPresent(record.email);
  const location = joinLocation(record.city, firstPresent(record.state, record.region));

  if (name && persona.name === persona.id) persona.name = normalizeName(name);
  if (email && !persona.email) persona.email = email;
  if (location) persona.location = location;
}

function seedDistribution(personas) {
  return Object.fromEntries(Object.values(personas).map((persona) => [
    persona.id,
    {
      ...persona,
      serviceCounts: {},
      categoryCounts: { health: 0, shopping: 0, lifestyle: 0 },
      serviceSet: new Set(),
      healthServiceSet: new Set(),
      ordersCount: 0,
      totalSpend: 0,
      notesCount: 0,
      latestOrderDate: "",
      latestNoteDate: "",
      recordsCount: 0,
    },
  ]));
}

function inferPersonaSets(arrays) {
  const personaSetsByDataset = {};

  arrays.forEach(([datasetKey, rows]) => {
    personaSetsByDataset[datasetKey] = rows.map((row) => {
      const direct = getPersonaId(row);
      return direct ? new Set([direct]) : new Set();
    });
  });

  let changed = true;
  while (changed) {
    changed = false;
    const idToPersonas = new Map();

    arrays.forEach(([datasetKey, rows]) => {
      rows.forEach((row, index) => {
        const personas = personaSetsByDataset[datasetKey][index];
        if (!personas.size) return;
        getIdentifierPairs(datasetKey, row).forEach(([idKey, idValue]) => {
          const key = `${idKey}::${String(idValue)}`;
          if (!idToPersonas.has(key)) idToPersonas.set(key, new Set());
          personas.forEach((pid) => idToPersonas.get(key).add(pid));
        });
      });
    });

    arrays.forEach(([datasetKey, rows]) => {
      rows.forEach((row, index) => {
        if (personaSetsByDataset[datasetKey][index].size) return;
        const inferred = new Set();
        getIdentifierPairs(datasetKey, row).forEach(([idKey, idValue]) => {
          const source = idToPersonas.get(`${idKey}::${String(idValue)}`);
          if (source) source.forEach((pid) => inferred.add(pid));
        });
        if (inferred.size) {
          personaSetsByDataset[datasetKey][index] = inferred;
          changed = true;
        }
      });
    });
  }

  return personaSetsByDataset;
}

function addPersonaRecord(persona, serviceKey, datasetKey, row) {
  const category = SERVICES[serviceKey].category;
  persona.recordsCount += 1;
  persona.categoryCounts[category] += 1;
  persona.serviceCounts[serviceKey] = (persona.serviceCounts[serviceKey] || 0) + 1;
  persona.serviceSet.add(serviceKey);
  if (category === "health") persona.healthServiceSet.add(serviceKey);

  if (datasetKey === "orders" && SHOPPING_SERVICES.includes(serviceKey)) {
    persona.ordersCount += 1;
    persona.totalSpend += getOrderTotal(row);
    const orderDate = getOrderDate(row);
    if (orderDate > persona.latestOrderDate) persona.latestOrderDate = orderDate;
  }

  if (serviceKey === "obsidian" && datasetKey === "notes") {
    persona.notesCount += 1;
    const noteDate = firstPresent(row.modified_at, row.created_at);
    if (noteDate > persona.latestNoteDate) persona.latestNoteDate = noteDate;
  }
}

function finalizePersona(persona) {
  return {
    ...persona,
    linkedServices: persona.serviceSet.size,
    healthSources: persona.healthServiceSet.size,
    serviceCounts: Object.entries(persona.serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([serviceKey, count]) => ({ serviceKey, count })),
  };
}

function render(model) {
  setText("metric-personas", model.personas.length.toLocaleString());
  setText("metric-orders", model.totalOrders.toLocaleString());
  setText("metric-services", Object.keys(SERVICES).length.toLocaleString());
  setText("metric-unmapped", model.unmappedRecords.toLocaleString());

  renderCategoryBars(model);
  renderCoverageBars(model.personas);
  renderPersonaNav(model.personas);
  renderPersonas(model.personas);
  renderUnmapped(model);
}

function renderCategoryBars(model) {
  const total = Object.values(model.categoryTotals).reduce((sum, value) => sum + value, 0) || 1;
  document.getElementById("category-bars").innerHTML = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const value = model.categoryTotals[key] || 0;
    return renderBar(label, value, value / total);
  }).join("");
}

function renderCoverageBars(personas) {
  const max = Math.max(...personas.map((p) => p.linkedServices), 1);
  document.getElementById("coverage-bars").innerHTML = personas
    .slice()
    .sort((a, b) => b.linkedServices - a.linkedServices || a.name.localeCompare(b.name))
    .map((persona) => renderBar(persona.name, persona.linkedServices, persona.linkedServices / max, `${persona.linkedServices}/19 services`))
    .join("");
}

function renderBar(label, value, ratio, valueLabel) {
  const width = Math.max(2, Math.round(ratio * 100));
  return `
    <div class="bar-row">
      <div class="bar-meta"><span>${escapeHtml(label)}</span><strong>${escapeHtml(valueLabel || value.toLocaleString())}</strong></div>
      <div class="bar-track"><span style="width:${width}%"></span></div>
    </div>
  `;
}

function renderPersonaNav(personas) {
  document.getElementById("persona-nav").innerHTML = personas.map((persona) => `
    <a href="#${escapeHtml(persona.id)}">
      <span>${escapeHtml(getInitials(persona.name, persona.id))}</span>
      <strong>${escapeHtml(persona.name)}</strong>
    </a>
  `).join("");
}

function renderPersonas(personas) {
  document.getElementById("personas-root").innerHTML = personas.map((persona) => {
    const maxCategory = Math.max(...Object.values(persona.categoryCounts), 1);
    const serviceCounts = persona.serviceCounts;
    return `
      <article class="persona-card" id="${escapeHtml(persona.id)}">
        <header class="persona-header">
          <div class="persona-ident">
            <div class="persona-initials">${escapeHtml(getInitials(persona.name, persona.id))}</div>
            <div>
              <h3>${escapeHtml(persona.name)}</h3>
              <p>${escapeHtml(persona.location || "No source location")}</p>
            </div>
          </div>
          <div class="persona-summary">
            <strong>${persona.ordersCount.toLocaleString()} orders</strong>
            <span>${persona.healthSources.toLocaleString()} health sources · ${persona.notesCount.toLocaleString()} notes</span>
          </div>
        </header>

        <div class="persona-body">
          <div class="facts">
            <span>${escapeHtml(persona.id)}</span>
            ${persona.email ? `<span>${escapeHtml(persona.email)}</span>` : ""}
            <span>${persona.linkedServices}/19 linked services</span>
            <span>${persona.recordsCount.toLocaleString()} mapped records</span>
            <span>$${Math.round(persona.totalSpend).toLocaleString()} shopping spend</span>
          </div>

          ${persona.interests ? `<p class="interests"><strong>Profile notes:</strong> ${escapeHtml(persona.interests)}</p>` : ""}

          <div class="mini-grid">
            ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
              <div class="mini-stat">
                <div class="mini-stat-top"><span>${label}</span><strong>${persona.categoryCounts[key].toLocaleString()}</strong></div>
                <div class="bar-track small"><span style="width:${Math.max(2, Math.round((persona.categoryCounts[key] / maxCategory) * 100))}%"></span></div>
              </div>
            `).join("")}
          </div>

          <div class="service-chips">
            ${serviceCounts.map(({ serviceKey, count }) => `
              <span>${escapeHtml(SERVICES[serviceKey].label)} <strong>${count.toLocaleString()}</strong></span>
            `).join("")}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderUnmapped(model) {
  const root = document.getElementById("unmapped-root");
  const unmappedHtml = renderDatasetPanel("Unmapped Persona Records", model.unmapped, "These records had no valid persona_id/user_id and could not be joined from a persona-owned record.");
  const sharedHtml = renderDatasetPanel("Shared Reference Data", model.shared, "Catalogs, events, properties, foods, and other reference rows are intentionally not counted as persona records.");
  root.innerHTML = unmappedHtml + sharedHtml;
}

function renderDatasetPanel(title, grouped, note) {
  const serviceKeys = Object.keys(grouped).sort((a, b) => SERVICES[a].label.localeCompare(SERVICES[b].label));
  const body = serviceKeys.length
    ? serviceKeys.map((serviceKey) => {
        const rows = Object.entries(grouped[serviceKey]).sort(([a], [b]) => a.localeCompare(b));
        const total = rows.reduce((sum, [, count]) => sum + count, 0);
        return `
          <div class="dataset-row">
            <strong>${escapeHtml(SERVICES[serviceKey].label)}</strong>
            <span>${total.toLocaleString()} rows · ${rows.map(([key, count]) => `${escapeHtml(key)} ${count.toLocaleString()}`).join(", ")}</span>
          </div>
        `;
      }).join("")
    : `<div class="empty">No records in this group.</div>`;

  return `<article class="panel"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(note)}</p><div class="dataset-list">${body}</div></article>`;
}

function addDatasetCount(target, serviceKey, datasetKey, amount) {
  if (!target[serviceKey]) target[serviceKey] = {};
  target[serviceKey][datasetKey] = (target[serviceKey][datasetKey] || 0) + amount;
}

function getIdentifierPairs(datasetKey, record) {
  const pairs = [];
  Object.entries(record).forEach(([key, value]) => {
    if (!isIdentifierValue(value)) return;
    const lower = key.toLowerCase();
    if (lower === "id") {
      pairs.push([`${singularize(datasetKey)}_id`, value]);
    } else if (lower.endsWith("_id") || lower === "tracking_number" || lower === "asin") {
      pairs.push([lower, value]);
    }
  });
  return pairs;
}

function getPersonaId(record) {
  const candidate = firstPresent(record.user_id, record.persona_id);
  return typeof candidate === "string" && PERSONA_ID_PATTERN.test(candidate) ? candidate : "";
}

function getOrderDate(order) {
  return firstPresent(order.created_at, order.placed_at, order.order_date, order.purchased_at, order.purchase_date, order.delivery_date);
}

function getOrderTotal(order) {
  return Number(firstPresent(order.total, order.total_amount, order.total_price, order.subtotal, 0)) || 0;
}

function extractInterests(content) {
  const match = String(content || "").match(/## Interests\s+([\s\S]*?)(?:\n---|\n##|$)/);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function singularize(word) {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function normalizeName(name) {
  return String(name).replaceAll("_", " ").replace(/\s+/g, " ").trim()
    .split(" ").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
}

function getInitials(name, fallbackId) {
  const clean = String(name || "").trim();
  if (!clean) return String(fallbackId || "??").slice(0, 2).toUpperCase();
  return clean.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function joinLocation(city, stateOrRegion) {
  if (city && stateOrRegion) return `${city}, ${stateOrRegion}`;
  return city || stateOrRegion || "";
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") || "";
}

function isIdentifierValue(value) {
  return typeof value === "string" || typeof value === "number";
}

function isObjectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
