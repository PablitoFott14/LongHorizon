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
const RECORD_CACHE = {};

document.addEventListener("DOMContentLoaded", () => {
  initialize().catch((error) => {
    console.error(error);
    document.getElementById("personas-root").innerHTML = `<div class="error-box">Failed to load data: ${escapeHtml(error.message)}</div>`;
  });
});

async function initialize() {
  const loadedData = await loadAllData();
  const personas = buildPersonas(loadedData);
  const linked = buildPersonaLinks(loadedData, personas.map((p) => p.id));
  renderSummary(personas, linked);
  renderPersonas(personas, linked);
  renderUnmapped(linked.unmapped);
  wireJsonLoaders(personas, linked);
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
        if (nameCandidate && current.name === id) current.name = nameCandidate;
        if (emailCandidate && !current.email) current.email = emailCandidate;
      }
    }
  }

  return Array.from(personaMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildPersonaLinks(allData, personaIds) {
  const byPersona = {};
  const unmapped = {};
  let mappedRecordCount = 0;
  let unmappedRecordCount = 0;

  for (const personaId of personaIds) {
    byPersona[personaId] = {};
  }

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
        const linkedPersonas = personaSets[idx];
        if (!linkedPersonas.size) {
          if (!unmapped[serviceKey]) unmapped[serviceKey] = {};
          if (!unmapped[serviceKey][datasetKey]) unmapped[serviceKey][datasetKey] = [];
          unmapped[serviceKey][datasetKey].push(row);
          unmappedRecordCount += 1;
          return;
        }

        for (const personaId of linkedPersonas) {
          if (!byPersona[personaId][serviceKey]) byPersona[personaId][serviceKey] = {};
          if (!byPersona[personaId][serviceKey][datasetKey]) byPersona[personaId][serviceKey][datasetKey] = [];
          byPersona[personaId][serviceKey][datasetKey].push(row);
        }
        mappedRecordCount += 1;
      });
    }
  }

  return { byPersona, unmapped, mappedRecordCount, unmappedRecordCount };
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

function renderSummary(personas, linked) {
  document.getElementById("metric-personas").textContent = personas.length.toLocaleString();
  document.getElementById("metric-services").textContent = Object.keys(SERVICES).length.toLocaleString();
  document.getElementById("metric-mapped").textContent = linked.mappedRecordCount.toLocaleString();
  document.getElementById("metric-unmapped").textContent = linked.unmappedRecordCount.toLocaleString();
}

function renderPersonas(personas, linked) {
  const root = document.getElementById("personas-root");
  root.innerHTML = "";

  personas.forEach((persona) => {
    const serviceData = linked.byPersona[persona.id] || {};
    const serviceKeys = Object.keys(serviceData).sort((a, b) => SERVICES[a].label.localeCompare(SERVICES[b].label));

    let personaTotal = 0;
    serviceKeys.forEach((serviceKey) => {
      const datasets = serviceData[serviceKey];
      personaTotal += Object.values(datasets).reduce((sum, rows) => sum + rows.length, 0);
    });

    const card = document.createElement("article");
    card.className = "persona-card";
    card.innerHTML = `
      <header class="persona-header">
        <div>
          <h3>${escapeHtml(persona.name)}</h3>
          <div class="persona-meta">${escapeHtml(persona.id)}${persona.email ? ` · ${escapeHtml(persona.email)}` : ""}</div>
        </div>
        <div class="persona-stats">
          <span>${serviceKeys.length} services</span>
          <span>${personaTotal.toLocaleString()} records</span>
        </div>
      </header>
      <div class="service-list" id="persona-${escapeHtml(persona.id)}"></div>
    `;
    root.appendChild(card);

    const serviceList = card.querySelector(".service-list");
    if (!serviceKeys.length) {
      serviceList.innerHTML = `<div class="empty">No linked records.</div>`;
      return;
    }

    serviceKeys.forEach((serviceKey) => {
      const datasets = serviceData[serviceKey];
      const datasetRows = Object.entries(datasets).sort(([a], [b]) => a.localeCompare(b));
      const serviceTotal = datasetRows.reduce((sum, [, rows]) => sum + rows.length, 0);
      const serviceSection = document.createElement("section");
      serviceSection.className = "service-block";
      serviceSection.innerHTML = `
        <div class="service-heading">
          <strong>${escapeHtml(SERVICES[serviceKey].label)}</strong>
          <span>${escapeHtml(SERVICES[serviceKey].category)} · ${serviceTotal.toLocaleString()} records</span>
        </div>
      `;

      datasetRows.forEach(([datasetKey, rows]) => {
        const detailKey = `persona|${persona.id}|${serviceKey}|${datasetKey}`;
        RECORD_CACHE[detailKey] = rows;
        const details = document.createElement("details");
        details.className = "dataset-details";
        details.dataset.cacheKey = detailKey;
        details.innerHTML = `
          <summary>${escapeHtml(datasetKey)} (${rows.length.toLocaleString()})</summary>
          <pre class="json-block">Open to load records...</pre>
        `;
        serviceSection.appendChild(details);
      });

      serviceList.appendChild(serviceSection);
    });
  });
}

function renderUnmapped(unmapped) {
  const root = document.getElementById("unmapped-root");
  root.innerHTML = "";

  const serviceKeys = Object.keys(unmapped).sort((a, b) => SERVICES[a].label.localeCompare(SERVICES[b].label));
  if (!serviceKeys.length) {
    root.innerHTML = `<div class="empty">No unmapped records.</div>`;
    return;
  }

  serviceKeys.forEach((serviceKey) => {
    const datasets = unmapped[serviceKey];
    const datasetRows = Object.entries(datasets).sort(([a], [b]) => a.localeCompare(b));
    const section = document.createElement("section");
    section.className = "service-block";
    section.innerHTML = `
      <div class="service-heading">
        <strong>${escapeHtml(SERVICES[serviceKey].label)}</strong>
        <span>${escapeHtml(SERVICES[serviceKey].category)} · strict-unmapped</span>
      </div>
    `;

    datasetRows.forEach(([datasetKey, rows]) => {
      const detailKey = `unmapped|${serviceKey}|${datasetKey}`;
      RECORD_CACHE[detailKey] = rows;
      const details = document.createElement("details");
      details.className = "dataset-details";
      details.dataset.cacheKey = detailKey;
      details.innerHTML = `
        <summary>${escapeHtml(datasetKey)} (${rows.length.toLocaleString()})</summary>
        <pre class="json-block">Open to load records...</pre>
      `;
      section.appendChild(details);
    });

    root.appendChild(section);
  });
}

function wireJsonLoaders(personas, linked) {
  document.querySelectorAll("details.dataset-details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open || details.dataset.loaded === "true") return;
      const cacheKey = details.dataset.cacheKey;
      const rows = RECORD_CACHE[cacheKey] || [];
      const pre = details.querySelector(".json-block");
      pre.textContent = JSON.stringify(rows, null, 2);
      details.dataset.loaded = "true";
    });
  });
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
