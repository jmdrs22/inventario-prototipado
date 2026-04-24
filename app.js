const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");

// Screens
const areasScreen = document.getElementById("areasScreen");
const inventarioScreen = document.getElementById("inventarioScreen");
const toolbar = document.getElementById("toolbar");

// Toolbar
const btnActualizar = document.getElementById("btnActualizar");
const busqueda = document.getElementById("busqueda");
const btnToggleVista = document.getElementById("btnToggleVista");
const btnVolverAreas = document.getElementById("btnVolverAreas");
const btnAgregar = document.getElementById("btnAgregar");
const btnMostrarQR = document.getElementById("btnMostrarQR");
const btnQRGeneral = document.getElementById("btnQRGeneral");
const tituloArea = document.getElementById("tituloArea");

// Views
const grid = document.getElementById("grid");
const sheetWrap = document.getElementById("sheetWrap");
const tablaBody = document.getElementById("tablaBody");

// Modal QR
const qrModal = document.getElementById("qrModal");
const qrModalTitle = document.getElementById("qrModalTitle");
const qrCodeContainer = document.getElementById("qrCodeContainer");
const qrUrl = document.getElementById("qrUrl");
const btnDownloadQR = document.getElementById("btnDownloadQR");
const modalClose = document.querySelector(".modal-close");

// Estado
let areaActual = null;
let currentQR = null;
let cache = [];
let vista = "grid";

// ================= UTILIDADES =================

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

// ================= QR POR ÁREA =================

function getAreaUrl(area) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("area", area);
  return url.toString();
}

function generarQR(area) {
  const areaUrl = getAreaUrl(area);
  qrUrl.textContent = areaUrl;

  qrCodeContainer.innerHTML = "";

  new QRCode(qrCodeContainer, {
    text: areaUrl,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  return areaUrl;
}

// ================= QR GENERAL (CORREGIDO) =================

function getHomeUrl() {
  // 🔥 URL LIMPIA SIN PARAMETROS
  return window.location.origin + window.location.pathname;
}

function generarQRGeneral() {
  const homeUrl = getHomeUrl();
  qrUrl.textContent = homeUrl;

  qrCodeContainer.innerHTML = "";

  new QRCode(qrCodeContainer, {
    text: homeUrl,
    width: 256,
    height: 256,
    colorDark: "#1e4a6f",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  return homeUrl;
}

// ================= MODAL =================

function mostrarModalQR(area) {
  qrModalTitle.textContent = `QR - ${area}`;
  generarQR(area);
  qrModal.style.display = "block";
  currentQR = area;
}

function mostrarModalQRGeneral() {
  qrModalTitle.textContent = "QR - Página de Inicio";
  generarQRGeneral();
  qrModal.style.display = "block";
  currentQR = null;
}

function cerrarModal() {
  qrModal.style.display = "none";
}

// ================= DESCARGA =================

function descargarQR(area) {
  const canvas = qrCodeContainer.querySelector("canvas");
  if (!canvas) return setEstado("Error al generar QR", true);

  const link = document.createElement("a");
  link.download = `qr-${area.replace(/\s+/g, "-").toLowerCase()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function descargarQRGeneral() {
  const canvas = qrCodeContainer.querySelector("canvas");
  if (!canvas) return setEstado("Error al generar QR", true);

  const link = document.createElement("a");
  link.download = "qr-inicio-inventario.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ================= EVENTOS MODAL =================

if (modalClose) modalClose.addEventListener("click", cerrarModal);

window.addEventListener("click", (e) => {
  if (e.target === qrModal) cerrarModal();
});

if (btnDownloadQR) {
  btnDownloadQR.addEventListener("click", () => {
    currentQR ? descargarQR(currentQR) : descargarQRGeneral();
  });
}

// ================= EVENTOS QR =================

if (btnMostrarQR) {
  btnMostrarQR.addEventListener("click", () => {
    if (areaActual) mostrarModalQR(areaActual);
  });
}

if (btnQRGeneral) {
  btnQRGeneral.addEventListener("click", mostrarModalQRGeneral);
}

const btnQRGeneralAreas = document.getElementById("btnQRGeneralAreas");
const btnQRGeneralCard = document.getElementById("btnQRGeneralCard");

if (btnQRGeneralAreas) {
  btnQRGeneralAreas.addEventListener("click", mostrarModalQRGeneral);
}

if (btnQRGeneralCard) {
  btnQRGeneralCard.addEventListener("click", (e) => {
    e.stopPropagation();
    mostrarModalQRGeneral();
  });
}

// ================= RENDER =================

function renderGrid(lista) {
  grid.innerHTML = "";

  if (!lista.length) {
    setEstado(areaActual ? `No hay herramientas en: ${areaActual}` : "Inventario vacío");
    return;
  }

  setEstado(
    areaActual
      ? `Área: ${areaActual} · ${lista.length} herramienta(s)`
      : `Inventario general · ${lista.length} herramienta(s)`
  );

  for (const h of lista) {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <a class="card-link" href="detalle.html?id=${encodeURIComponent(h.id)}">
        <div class="card-img">
          <img src="${imgOrPlaceholder(h.imagen_url)}" loading="lazy"/>
        </div>
        <div class="card-body">
          <h2>${safe(h.nombre)}</h2>
          ${badgeHTML(h.estado)}
          <p>
            <strong>Código:</strong> ${safe(h.codigo)} |
            <strong>Cantidad:</strong> ${safe(h.cantidad)} <br/>
            <strong>Ubicación:</strong> ${safe(h.ubicacion)}
          </p>
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
      <td><a href="detalle.html?id=${encodeURIComponent(h.id)}">Ver</a></td>
    `;
    tablaBody.appendChild(tr);
  }
}

function aplicarFiltroYRender() {
  const q = (busqueda.value || "").toLowerCase();

  const lista = !q
    ? cache
    : cache.filter(h =>
        (h.nombre || "").toLowerCase().includes(q) ||
        (h.codigo || "").toLowerCase().includes(q)
      );

  if (vista === "grid") {
    sheetWrap.style.display = "none";
    grid.style.display = "grid";
    renderGrid(lista);
  } else {
    grid.style.display = "none";
    sheetWrap.style.display = "block";
    renderList(lista);
  }
}

// ================= DATA =================

async function cargar() {
  if (!areaActual) return;

  setEstado("Cargando...");

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("*")
    .eq("area", areaActual);

  if (error) return setEstado(error.message, true);

  cache = data || [];
  aplicarFiltroYRender();
}

async function cargarGeneral() {
  setEstado("Cargando inventario general...");

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("*");

  if (error) return setEstado(error.message, true);

  cache = data || [];
  aplicarFiltroYRender();
}

// ================= NAVEGACIÓN =================

function abrirArea(area) {
  areaActual = area;

  areasScreen.style.display = "none";
  inventarioScreen.style.display = "block";
  toolbar.style.display = "flex";

  btnAgregar.href = `agregar.html?area=${encodeURIComponent(area)}`;

  cargar();
}

function volverAreas() {
  areaActual = null;

  areasScreen.style.display = "grid";
  inventarioScreen.style.display = "none";
  toolbar.style.display = "none";

  setEstado("Selecciona un área.");
}

// ================= EVENTOS GENERALES =================

document.querySelectorAll(".area-card").forEach(card => {
  card.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-qr-area")) return;
    const area = card.dataset.area;
    if (area) abrirArea(area);
  });
});

document.querySelectorAll(".btn-qr-area").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    mostrarModalQR(btn.dataset.area);
  });
});

if (btnActualizar) {
  btnActualizar.addEventListener("click", () => {
    areaActual ? cargar() : cargarGeneral();
  });
}

if (busqueda) busqueda.addEventListener("input", aplicarFiltroYRender);

if (btnToggleVista) {
  btnToggleVista.addEventListener("click", () => {
    vista = vista === "grid" ? "list" : "grid";
    aplicarFiltroYRender();
  });
}

if (btnVolverAreas) btnVolverAreas.addEventListener("click", volverAreas);

// ================= INICIO =================

const params = new URLSearchParams(location.search);
const areaFromUrl = params.get("area");

if (areaFromUrl) {
  abrirArea(areaFromUrl);
} else {
  // QR GENERAL → INVENTARIO COMPLETO
  areaActual = null;

  areasScreen.style.display = "none";
  inventarioScreen.style.display = "block";
  toolbar.style.display = "flex";

  cargarGeneral();
}
