const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");

// Screens
const areasScreen = document.getElementById("areasScreen");
const inventarioScreen = document.getElementById("inventarioScreen");
const toolbar = document.getElementById("toolbar");

// Toolbar controls
const btnActualizar = document.getElementById("btnActualizar");
const busqueda = document.getElementById("busqueda");
const btnToggleVista = document.getElementById("btnToggleVista");
const btnVolverAreas = document.getElementById("btnVolverAreas");
const btnAgregar = document.getElementById("btnAgregar");
const tituloArea = document.getElementById("tituloArea");

// Views
const grid = document.getElementById("grid");
const sheetWrap = document.getElementById("sheetWrap");
const tablaBody = document.getElementById("tablaBody");

// Área actual
let areaActual = null;

// Data
let cache = [];
let vista = "grid"; // grid | list

function setEstado(msg, isError = false) {
  estadoEl.textContent = msg;
  estadoEl.className = "estado" + (isError ? " error" : "");
}

function safe(v) {
  return (v === null || v === undefined || v === "") ? "-" : String(v);
}

function imgOrPlaceholder(url) {
  return url || "https://via.placeholder.com/800x500?text=Sin+imagen";
}

function badgeHTML(estado) {
  if (estado === "bueno") return `<span class="badge success">Buen estado</span>`;
  if (estado === "mantenimiento") return `<span class="badge warning">Mantenimiento</span>`;
  if (estado === "urgente") return `<span class="badge danger">Urgente</span>`;
  return `<span class="badge neutral">Sin estado</span>`;
}

function renderGrid(lista) {
  grid.innerHTML = "";

  if (!lista.length) {
    setEstado(`No hay herramientas en: ${areaActual}`);
    return;
  }

  setEstado(`Área: ${areaActual} · ${lista.length} herramienta(s)`);

  for (const h of lista) {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <a class="card-link" href="detalle.html?id=${encodeURIComponent(h.id)}">
        <div class="card-img">
          <img src="${imgOrPlaceholder(h.imagen_url)}" alt="Imagen" loading="lazy" />
        </div>

        <div class="card-body">
          <div class="card-title">
            <h2>${safe(h.nombre)}</h2>
          </div>

          ${badgeHTML(h.estado)}

          <p class="meta">
            <strong>Código:</strong> ${safe(h.codigo)} &nbsp; | &nbsp;
            <strong>Cantidad:</strong> ${safe(h.cantidad)} <br/>
            <strong>Ubicación:</strong> ${safe(h.ubicacion)}
          </p>

          <div class="hint">Click para ver detalle, editar y notas</div>
        </div>
      </a>
    `;

    grid.appendChild(card);
  }
}

function renderList(lista) {
  tablaBody.innerHTML = "";

  for (const h of lista) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safe(h.id)}</td>
      <td>${safe(h.nombre)}</td>
      <td>${safe(h.codigo)}</td>
      <td>${safe(h.cantidad)}</td>
      <td>${safe(h.ubicacion)}</td>
      <td>${badgeHTML(h.estado)}</td>
      <td><a class="link" href="detalle.html?id=${encodeURIComponent(h.id)}">Ver</a></td>
    `;
    tablaBody.appendChild(tr);
  }
}

function aplicarFiltroYRender() {
  const q = (busqueda.value || "").toLowerCase().trim();

  const lista = !q
    ? cache
    : cache.filter(h =>
        (h.nombre || "").toLowerCase().includes(q) ||
        (h.codigo || "").toLowerCase().includes(q) ||
        (h.ubicacion || "").toLowerCase().includes(q) ||
        (h.estado || "").toLowerCase().includes(q)
      );

  if (vista === "grid") {
    sheetWrap.style.display = "none";
    grid.style.display = "grid";
    renderGrid(lista);
  } else {
    grid.style.display = "none";
    sheetWrap.style.display = "block";
    tituloArea.textContent = `Vista lista · ${areaActual}`;
    setEstado(`Área: ${areaActual} · ${lista.length} herramienta(s)`);
    renderList(lista);
  }
}

async function cargar() {
  if (!areaActual) return;

  setEstado("Cargando inventario...");
  grid.innerHTML = "";
  tablaBody.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("id, codigo, nombre, cantidad, ubicacion, estado, imagen_url, area")
    .eq("area", areaActual)
    .order("id", { ascending: true });

  if (error) {
    setEstado("Error: " + error.message, true);
    return;
  }

  cache = data || [];
  aplicarFiltroYRender();
}

function abrirArea(area) {
  areaActual = area;

  // UI: cambia screens
  areasScreen.style.display = "none";
  inventarioScreen.style.display = "block";
  toolbar.style.display = "flex";

  // set links
  btnAgregar.href = `agregar.html?area=${encodeURIComponent(areaActual)}`;

  // reset
  busqueda.value = "";
  vista = "grid";
  btnToggleVista.textContent = "Vista lista";

  // carga
  cargar();

  // guarda en URL (útil para QR por área)
  const url = new URL(location.href);
  url.searchParams.set("area", areaActual);
  history.replaceState({}, "", url.toString());
}

function volverAreas() {
  areaActual = null;
  cache = [];

  areasScreen.style.display = "grid";
  inventarioScreen.style.display = "none";
  toolbar.style.display = "none";

  setEstado("Selecciona un área.");

  const url = new URL(location.href);
  url.searchParams.delete("area");
  history.replaceState({}, "", url.toString());
}

// Click en cards de área
document.querySelectorAll(".area-card").forEach(btn => {
  btn.addEventListener("click", () => abrirArea(btn.dataset.area));
});

// Toolbar
btnActualizar.addEventListener("click", cargar);
busqueda.addEventListener("input", aplicarFiltroYRender);

btnToggleVista.addEventListener("click", () => {
  vista = (vista === "grid") ? "list" : "grid";
  btnToggleVista.textContent = (vista === "grid") ? "Vista lista" : "Vista cuadrícula";
  aplicarFiltroYRender();
});

btnVolverAreas.addEventListener("click", volverAreas);

// Si viene desde un QR por área (URL con ?area=...)
const params = new URLSearchParams(location.search);
const areaFromUrl = params.get("area");
if (areaFromUrl) {
  abrirArea(areaFromUrl);
} else {
  setEstado("Selecciona un área.");
}

