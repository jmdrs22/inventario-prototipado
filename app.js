const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");

const areasScreen = document.getElementById("areasScreen");
const inventarioScreen = document.getElementById("inventarioScreen");
const tituloArea = document.getElementById("tituloArea");

const grid = document.getElementById("grid");
const sheetWrap = document.getElementById("sheetWrap");
const sheetBody = document.getElementById("sheetBody");

const q = document.getElementById("q");
const btnRefresh = document.getElementById("btnRefresh");
const btnVista = document.getElementById("btnVista");
const btnAgregar = document.getElementById("btnAgregar");
const btnVolverAreas = document.getElementById("btnVolverAreas");

let areaActual = null;
let vista = "grid"; // grid | list
let cache = [];

function setEstado(msg, tipo = "info") {
  estadoEl.className = `estado ${tipo}`;
  estadoEl.textContent = msg || "";
}

function badgeEstado(estado) {
  const v = (estado || "bueno").toLowerCase();
  if (v === "urgente") return `<span class="badge danger">Urgente</span>`;
  if (v === "mantenimiento") return `<span class="badge warning">Mantenimiento</span>`;
  return `<span class="badge success">Buen estado</span>`;
}

function safe(v) {
  return (v ?? "").toString().replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function getAreaFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get("area");
}

function setUrlArea(area) {
  const u = new URL(location.href);
  if (area) u.searchParams.set("area", area);
  else u.searchParams.delete("area");
  history.replaceState({}, "", u.toString());
}

function abrirArea(area) {
  areaActual = area;
  setUrlArea(area);

  areasScreen.style.display = "none";
  inventarioScreen.style.display = "block";
  tituloArea.textContent = `Área: ${area}`;

  // link a agregar con area
  btnAgregar.href = `agregar.html?area=${encodeURIComponent(area)}`;

  cargar();
}

function volverAreas() {
  areaActual = null;
  setUrlArea(null);
  areasScreen.style.display = "grid";
  inventarioScreen.style.display = "none";
  setEstado("");
}

async function cargar() {
  if (!areaActual) return;

  setEstado("Cargando herramientas…", "info");

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("id, area, nombre, codigo, cantidad, ubicacion, estado, imagen_url, created_at")
    .eq("area", areaActual)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    setEstado(`Error: ${error.message}`, "error");
    return;
  }

  cache = data || [];
  aplicarFiltroYRender();
}

function aplicarFiltroYRender() {
  const term = (q.value || "").trim().toLowerCase();

  const lista = (cache || []).filter((h) => {
    if (!term) return true;
    const s =
      `${h.nombre || ""} ${h.codigo || ""} ${h.ubicacion || ""}`.toLowerCase();
    return s.includes(term);
  });

  if (vista === "grid") {
    sheetWrap.style.display = "none";
    grid.style.display = "grid";
    renderGrid(lista);
    btnVista.textContent = "Vista lista";
  } else {
    grid.style.display = "none";
    sheetWrap.style.display = "block";
    renderList(lista);
    btnVista.textContent = "Vista cuadriculas";
  }
}

function renderGrid(lista) {
  grid.innerHTML = "";
  setEstado(`Mostrando ${lista.length} herramienta(s).`, "ok");

  for (const h of lista) {
    const card = document.createElement("article");
    card.className = "card";

    const img = h.imagen_url
      ? `<img src="${h.imagen_url}" alt="${safe(h.nombre)}" />`
      : `<div class="img-empty">Sin imagen</div>`;

    card.innerHTML = `
      <div class="card-img">${img}</div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${safe(h.nombre)}</h3>
          ${badgeEstado(h.estado)}
        </div>
        <div class="meta">
          <div><b>Código:</b> ${safe(h.codigo || "-")}</div>
          <div><b>Cantidad:</b> ${safe(h.cantidad ?? "-")}</div>
          <div><b>Ubicación:</b> ${safe(h.ubicacion || "-")}</div>
        </div>
        <div class="hint">Click para ver detalle y agregar notas</div>
      </div>
    `;

    card.addEventListener("click", () => {
      location.href = `detalle.html?id=${encodeURIComponent(h.id)}&area=${encodeURIComponent(areaActual)}`;
    });

    grid.appendChild(card);
  }
}

function renderList(lista) {
  sheetBody.innerHTML = "";
  setEstado(`Mostrando ${lista.length} herramienta(s).`, "ok");

  for (const h of lista) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safe(h.id)}</td>
      <td>${safe(h.nombre)}</td>
      <td>${safe(h.codigo || "-")}</td>
      <td>${safe(h.cantidad ?? "-")}</td>
      <td>${safe(h.ubicacion || "-")}</td>
      <td>${badgeEstado(h.estado)}</td>
    `;
    tr.addEventListener("click", () => {
      location.href = `detalle.html?id=${encodeURIComponent(h.id)}&area=${encodeURIComponent(areaActual)}`;
    });
    sheetBody.appendChild(tr);
  }
}

// Eventos
document.querySelectorAll(".area-card").forEach((btn) => {
  btn.addEventListener("click", () => abrirArea(btn.dataset.area));
});

btnVolverAreas.addEventListener("click", (e) => {
  e.preventDefault();
  volverAreas();
});

btnRefresh.addEventListener("click", () => cargar());
btnVista.addEventListener("click", () => {
  vista = vista === "grid" ? "list" : "grid";
  aplicarFiltroYRender();
});

q.addEventListener("input", () => aplicarFiltroYRender());

// Auto-abrir área por URL
const areaUrl = getAreaFromUrl();
if (areaUrl) abrirArea(areaUrl);
else volverAreas();


