const DATA_PATH = "../data/tokyo_poi_raw.json";

const CATEGORY_COLORS = {
  museum: "#2563eb",
  shrine: "#dc2626",
  viewpoint: "#7c3aed",
  park: "#16a34a",
  shopping_area: "#ea580c",
  market: "#0891b2",
  amusement_park: "#db2777",
  unknown: "#4b5563",
};

const map = L.map("map", {
  zoomControl: true,
}).setView([36.2048, 138.2529], 5);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
}).addTo(map);

const siteList = document.getElementById("site-list");
const details = document.getElementById("site-details");
const selectAllBtn = document.getElementById("select-all");
const clearAllBtn = document.getElementById("clear-all");

const markers = new Map();
const selectedSites = new Set();
let siteData = [];

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function sitePhotoUrl(site) {
  return site.photo || "";
}

function renderDetails(site) {
  if (!site) {
    details.innerHTML = "<p>Select a pin to view details.</p>";
    return;
  }

  details.innerHTML = `
    <h2>${site.name}</h2>
    ${
      sitePhotoUrl(site)
        ? `<img class="site-photo" src="${sitePhotoUrl(site)}" alt="${site.name}" loading="lazy" />`
        : ""
    }
    <p><strong>Category:</strong> ${site._poi_category || "unknown"}</p>
    <p><strong>Indoor:</strong> ${site._is_indoor ? "Yes" : "No"}</p>
    <p><strong>Address:</strong> ${site.address || "N/A"}</p>
    <p><strong>Coordinates:</strong> ${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}</p>
  `;
}

function applyMapFilter() {
  const visibleMarkers = [];

  for (const site of siteData) {
    const marker = markers.get(site.name);
    if (!marker) continue;

    if (selectedSites.has(site.name)) {
      if (!map.hasLayer(marker)) marker.addTo(map);
      visibleMarkers.push(marker);
    } else if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  }

  if (visibleMarkers.length > 0) {
    const group = L.featureGroup(visibleMarkers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function buildSiteList() {
  siteList.innerHTML = "";

  for (const site of siteData) {
    const row = document.createElement("label");
    row.className = "site-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = site.name;
    checkbox.checked = true;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedSites.add(site.name);
      else selectedSites.delete(site.name);
      applyMapFilter();
    });

    const swatch = document.createElement("span");
    swatch.className = "site-swatch";
    swatch.style.background = CATEGORY_COLORS[site._poi_category] || CATEGORY_COLORS.unknown;

    const name = document.createElement("span");
    name.textContent = site.name;

    row.appendChild(checkbox);
    row.appendChild(swatch);
    row.appendChild(name);
    siteList.appendChild(row);
  }
}

function toggleAll(checked) {
  const boxes = siteList.querySelectorAll("input[type='checkbox']");
  selectedSites.clear();

  for (const box of boxes) {
    box.checked = checked;
    if (checked) selectedSites.add(box.value);
  }

  applyMapFilter();
  if (!checked) renderDetails(null);
}

async function loadSites() {
  const response = await fetch(DATA_PATH);
  if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);

  const raw = await response.json();
  siteData = raw
    .filter((site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const site of siteData) {
    selectedSites.add(site.name);

    const marker = L.marker([site.latitude, site.longitude], {
      icon: pinIcon,
    }).bindPopup(`
      <div class="popup-card">
        <strong>${site.name}</strong><br/>
        <span>${site._poi_category || "unknown"}</span><br/>
        ${sitePhotoUrl(site) ? `<img class="popup-photo" src="${sitePhotoUrl(site)}" alt="${site.name}" />` : ""}
      </div>
    `);

    marker.on("click", () => renderDetails(site));
    marker.on("mouseover", () => marker.openPopup());
    marker.on("mouseout", () => marker.closePopup());
    markers.set(site.name, marker);
  }

  buildSiteList();
  applyMapFilter();
}

selectAllBtn.addEventListener("click", () => toggleAll(true));
clearAllBtn.addEventListener("click", () => toggleAll(false));

loadSites().catch((err) => {
  details.innerHTML = `<p>Failed to load site data: ${err.message}</p>`;
});
