const BASE = "../openclaw-long_horizon-universe/openclaw-long_horizon-universe-2frtws95/services";

const SERVICES = {
  "amazon": { label: "Amazon", category: "shopping", path: `${BASE}/amazon/data.json` },
  "amazon-fresh": { label: "Amazon Fresh", category: "shopping", path: `${BASE}/amazon-fresh/data.json` },
  "apple-health": { label: "Apple Health", category: "health", path: `${BASE}/apple-health/data.json` },
  "eight-sleep": { label: "Eight Sleep", category: "health", path: `${BASE}/eight-sleep/data.json` },
  "fitbit": { label: "Fitbit", category: "health", path: `${BASE}/fitbit/data.json` },
  "fresh-direct": { label: "Fresh Direct", category: "shopping", path: `${BASE}/fresh-direct/data.json` },
  "garmin-connect": { label: "Garmin Connect", category: "health", path: `${BASE}/garmin-connect/data.json` },
  "instacart": { label: "Instacart", category: "shopping", path: `${BASE}/instacart/data.json` },
  "logistics-tracking": { label: "Logistics Tracking", category: "lifestyle", path: `${BASE}/logistics-tracking/data.json` },
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

const PERSONA_ID_PATTERN = /^persona_\d+$/;

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch((error) => {
    console.error(error);
    document.getElementById("personas-root").innerHTML = `<div class="error-box">Failed to load data: ${escapeHtml(error.message)}</div>`;
  });
});

async function initialize() {
  const loadedData = await loadAllData();
  const personas = buildPersonas(loadedData);
  const distribution = buildDistribution(loadedData, personas);
  renderSummary(personas, distribution);
  renderPersonas(distribution.personas);
  renderUnmappedSummary(distribution.unmapped);
}

async function loadAllData() {
  const entries = await Promise.all(
    Object.entries(SERVICES).map(async ([serviceKey, service]) => {
      const response = await fetch(service.path);
      if (!response.ok) {
        throw new Error(`${serviceKey}: HTTP ${response.status}`);
      }
      const json = await response.json();
      return [serviceKey, json];
    })
  );
  return Object.fromEntries(entries);
}

function buildPersonas(allData) {
  const personaMap = new Map();

  for (const serviceData of Object.values(allData)) {
    for (const value of Object.values(serviceData)) {
      if (!Array.isArray(value)) continue;
      for (const record of value) {
        if (!isObjectRecord(record)) continue;
        const id = getDirectPersonaId(record);
        if (!id) continue;
        if (!personaMap.has(id)) {
          personaMap.set(id, { id, name: id, email: "" });
        }

        const current = personaMap.get(id);
        const nameCandidate = firstPresent(record.name, record.full_name, record.username);
        const emailCandidate = firstPresent(record.email);
        if (nameCandidate && current.name === id) current.name = normalizeName(nameCandidate);
        if (emailCandidate && !current.email) current.email = emailCandidate;
      }
    }
  }

  return Array.from(personaMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildDistribution(allData, personas) {
  const shoppingServices = Object.keys(SERVICES).filter((k) => SERVICES[k].category === "shopping");
  const healthServices = Object.keys(SERVICES).filter((k) => SERVICES[k].category === "health");
  const allPersonaIds = new Set(personas.map((p) => p.id));

  const rowsByPersona = {};
  const unmapped = {};
  let mappedRecords = 0;
  let unmappedRecords = 0;

  personas.forEach((persona) => {
    rowsByPersona[persona.id] = {
      ...persona,
      location: "",
      ordersCount: 0,
      healthSources: 0,
      notesCount: 0,
      linkedServices: 0,
      linkedRecords: 0,
    };
  });

  for (const serviceData of Object.values(allData)) {
    for (const userArrayKey of ["users", "user_profiles", "athletes"]) {
      const records = serviceData[userArrayKey];
      if (!Array.isArray(records)) continue;
      records.forEach((record) => {
        if (!isObjectRecord(record)) return;
        const personaId = getDirectPersonaId(record);
        if (!personaId || !rowsByPersona[personaId]) return;
        const current = rowsByPersona[personaId];
        const nameCandidate = firstPresent(record.name, record.full_name, record.username);
        const emailCandidate = firstPresent(record.email);
        const locationCandidate = joinLocation(record.city, firstPresent(record.state, record.region));
        if (nameCandidate && current.name === current.id) current.name = normalizeName(nameCandidate);
        if (emailCandidate && !current.email) current.email = emailCandidate;
        if (locationCandidate && !current.location) current.location = locationCandidate;
      });
    }
  }

  const perPersonaServiceCoverage = {};
  personas.forEach((p) => {
    perPersonaServiceCoverage[p.id] = new Set();
  });

  for (const [serviceKey, serviceData] of Object.entries(allData)) {
    const arrays = Object.entries(serviceData)
      .filter(([, value]) => Array.isArray(value))
      .map(([datasetKey, rows]) => [datasetKey, rows.filter(isObjectRecord)]);

    const personaSetsByDataset = {};
    const idToPersonaSet = new Map();

    for (const [datasetKey, rows] of arrays) {
      personaSetsByDataset[datasetKey] = rows.map((row) => {
        const direct = getDirectPersonaId(row);
        return direct ? new Set([direct]) : new Set();
      });
    }

    let changed = true;
    while (changed) {
      changed = false;
      idToPersonaSet.clear();

      for (const [datasetKey, rows] of arrays) {
        const personaSets = personaSetsByDataset[datasetKey];
        rows.forEach((row, idx) => {
          const linkedPersonas = personaSets[idx];
          if (!linkedPersonas.size) return;
          for (const [idKey, idValue] of getIdentifierPairs(datasetKey, row)) {
            const indexKey = `${idKey}::${String(idValue)}`;
            if (!idToPersonaSet.has(indexKey)) {
              idToPersonaSet.set(indexKey, new Set());
            }
            for (const pid of linkedPersonas) {
              idToPersonaSet.get(indexKey).add(pid);
            }
          }
        });
      }

      for (const [datasetKey, rows] of arrays) {
        const personaSets = personaSetsByDataset[datasetKey];
        rows.forEach((row, idx) => {
          if (personaSets[idx].size) return;
          const inferred = new Set();
          for (const [idKey, idValue] of getIdentifierPairs(datasetKey, row)) {
            const source = idToPersonaSet.get(`${idKey}::${String(idValue)}`);
            if (!source) continue;
            for (const pid of source) inferred.add(pid);
          }
          if (inferred.size) {
            personaSets[idx] = inferred;
            changed = true;
          }
        });
      }
    }

    for (const [datasetKey, rows] of arrays) {
      const personaSets = personaSetsByDataset[datasetKey];
      rows.forEach((row, idx) => {
        const linkedPersonas = Array.from(personaSets[idx]).filter((pid) => allPersonaIds.has(pid));
        if (!linkedPersonas.length) {
          if (!unmapped[serviceKey]) unmapped[serviceKey] = {};
          if (!unmapped[serviceKey][datasetKey]) unmapped[serviceKey][datasetKey] = [];
          unmapped[serviceKey][datasetKey].push(row);
          unmappedRecords += 1;
          return;
        }

        for (const personaId of linkedPersonas) {
          const current = rowsByPersona[personaId];
          if (!current) continue;
          current.linkedRecords += 1;
          perPersonaServiceCoverage[personaId].add(serviceKey);
          if (datasetKey === "notes" && serviceKey === "obsidian") {
            current.notesCount += 1;
          }
          if (datasetKey === "orders" && shoppingServices.includes(serviceKey)) {
            current.ordersCount += 1;
          }
        }
        mappedRecords += 1;
      });
    }
  }

  personas.forEach((persona) => {
    const row = rowsByPersona[persona.id];
    row.healthSources = healthServices.reduce((count, serviceKey) => (
      perPersonaServiceCoverage[persona.id].has(serviceKey) ? count + 1 : count
    ), 0);
    row.linkedServices = perPersonaServiceCoverage[persona.id].size;
  });

  const totalOrders = shoppingServices.reduce((sum, serviceKey) => {
    return sum + ((allData[serviceKey]?.orders || []).length);
  }, 0);

  const personasOut = Object.values(rowsByPersona)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    personas: personasOut,
    totalOrders,
    stores: shoppingServices.length,
    mappedRecords,
    unmappedRecords,
    unmapped,
  };
}

function getIdentifierPairs(datasetKey, record) {
  const pairs = [];
  for (const [key, value] of Object.entries(record)) {
    if (!isIdentifierValue(value)) continue;
    const lower = key.toLowerCase();
    const idLike =
      lower === "id" ||
      lower.endsWith("_id") ||
      lower === "tracking_number" ||
      lower === "asin";
    if (!idLike) continue;
    if (lower !== "id") {
      pairs.push([lower, value]);
    }

    // Bridge tables where primary key is `id` but foreign keys are `<singular>_id`.
    if (lower === "id") {
      const alias = `${singularize(datasetKey).toLowerCase()}_id`;
      pairs.push([alias, value]);
    }
  }
  return pairs;
}

function renderSummary(personas, distribution) {
  document.getElementById("metric-personas").textContent = personas.length.toLocaleString();
  document.getElementById("metric-services").textContent = distribution.totalOrders.toLocaleString();
  document.getElementById("metric-mapped").textContent = distribution.stores.toLocaleString();
  document.getElementById("metric-unmapped").textContent = distribution.unmappedRecords.toLocaleString();

  const labels = document.querySelectorAll(".metric-label");
  if (labels.length >= 4) {
    labels[1].textContent = "Total Orders";
    labels[2].textContent = "Stores";
    labels[3].textContent = "Unmapped Records";
  }
}

function renderPersonas(personas) {
  const root = document.getElementById("personas-root");
  root.innerHTML = "";

  personas.forEach((persona) => {
    const initials = getInitials(persona.name, persona.id);

    const card = document.createElement("article");
    card.className = "persona-card";
    card.innerHTML = `
      <header class="persona-header">
        <div class="persona-ident">
          <div class="persona-initials">${escapeHtml(initials)}</div>
          <div>
            <h3>${escapeHtml(persona.name)}</h3>
            <div class="persona-meta">${escapeHtml(persona.location || "Location not available")}</div>
          </div>
        </div>
        <div class="persona-stats">
          <span>${persona.ordersCount.toLocaleString()} orders</span>
          <span>${persona.healthSources.toLocaleString()} health sources</span>
          <span>${persona.notesCount.toLocaleString()} notes</span>
        </div>
      </header>
      <div class="persona-meta-row">
        <span>${escapeHtml(persona.id)}</span>
        ${persona.email ? `<span>${escapeHtml(persona.email)}</span>` : ""}
        <span>${persona.linkedServices.toLocaleString()} linked services</span>
        <span>${persona.linkedRecords.toLocaleString()} linked records</span>
      </div>
    `;
    root.appendChild(card);
  });
}

function renderUnmappedSummary(unmapped) {
  const root = document.getElementById("unmapped-root");
  root.innerHTML = "";

  const serviceKeys = Object.keys(unmapped).sort((a, b) => SERVICES[a].label.localeCompare(SERVICES[b].label));
  if (!serviceKeys.length) {
    root.innerHTML = `<div class="empty">No unmapped records.</div>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "unmapped-summary-list";

  serviceKeys.forEach((serviceKey) => {
    const datasets = unmapped[serviceKey];
    const datasetRows = Object.entries(datasets).sort(([a], [b]) => a.localeCompare(b));
    const total = datasetRows.reduce((sum, [, rows]) => sum + rows.length, 0);
    const item = document.createElement("div");
    item.className = "unmapped-summary-item";
    item.innerHTML = `
      <strong>${escapeHtml(SERVICES[serviceKey].label)}</strong>
      <span>${total.toLocaleString()} records across ${datasetRows.length.toLocaleString()} datasets</span>
    `;
    list.appendChild(item);
  });

  root.appendChild(list);
}

function getDirectPersonaId(record) {
  const candidate = firstPresent(record.user_id, record.persona_id);
  return typeof candidate === "string" && PERSONA_ID_PATTERN.test(candidate) ? candidate : "";
}

function singularize(word) {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function normalizeName(name) {
  return String(name)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part ? (part[0].toUpperCase() + part.slice(1)) : part)
    .join(" ");
}

function getInitials(name, fallbackId) {
  const clean = String(name || "").trim();
  if (!clean) return String(fallbackId || "??").slice(0, 2).toUpperCase();
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function joinLocation(city, stateOrRegion) {
  if (!city && !stateOrRegion) return "";
  if (city && stateOrRegion) return `${city}, ${stateOrRegion}`;
  return city || stateOrRegion || "";
}

function isIdentifierValue(value) {
  return typeof value === "string" || typeof value === "number";
}

function isObjectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
