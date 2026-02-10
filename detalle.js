const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");
const img = document.getElementById("img");
const nombreEl = document.getElementById("nombre");
const metaEl = document.getElementById("meta");
const notasEl = document.getElementById("notas");
const badgeWrap = document.getElementById("badgeWrap");

const btnGuardar = document.getElementById("btnGuardar");
const btnEliminar = document.getElementById("btnEliminar");
const btnEditar = document.getElementById("btnEditar");

function setEstado(msg, isError = false) {
  estadoEl.textContent = msg;
  estadoEl.className = "estado" + (isError ? " error" : "");
}

function safe(v) {
  return (v === null || v === undefined || v === "") ? "-" : String(v);
}

function badgeHTML(estado) {
  if (estado === "bueno") return `<span class="badge success">Buen estado</span>`;
  if (estado === "mantenimiento") return `<span class="badge warning">Mantenimiento</span>`;
  if (estado === "urgente") return `<span class="badge danger">Urgente</span>`;
  return `<span class="badge neutral">Sin estado</span>`;
}

function getId() {
  const p = new URLSearchParams(location.search);
  const id = p.get("id");
  return id ? Number(id) : null;
}

const id = getId();

async function cargarDetalle() {
  if (!id) {
    setEstado("No se encontró el ID en la URL.", true);
    return;
  }

  btnEditar.href = `agregar.html?id=${encodeURIComponent(id)}`;

  setEstado("Cargando detalle...");

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("id, area, codigo, nombre, cantidad, ubicacion, estado, imagen_url, notas")
    .eq("id", id)
    .single();

  if (error) {
    setEstado("Error: " + error.message, true);
    return;
  }

  nombreEl.textContent = safe(data.nombre);
  badgeWrap.innerHTML = badgeHTML(data.estado);

  metaEl.innerHTML = `
    <strong>Área:</strong> ${safe(data.area)} <br/>
    <strong>Código:</strong> ${safe(data.codigo)} &nbsp; | &nbsp;
    <strong>Cantidad:</strong> ${safe(data.cantidad)} <br/>
    <strong>Ubicación:</strong> ${safe(data.ubicacion)}
  `;

  notasEl.value = data.notas || "";
  img.src = data.imagen_url || "https://via.placeholder.com/600x400?text=Sin+imagen";

  setEstado("Listo.");
}

async function guardarNotas() {
  if (!id) return;
  setEstado("Guardando notas...");

  const { error } = await supabaseClient
    .from("herramientas")
    .update({ notas: notasEl.value })
    .eq("id", id);

  if (error) {
    setEstado("No se pudo guardar: " + error.message, true);
    return;
  }

  setEstado("Notas guardadas ✅");
}

async function eliminarHerramienta() {
  if (!id) return;
  const ok = confirm("¿Eliminar esta herramienta? Esta acción no se puede deshacer.");
  if (!ok) return;

  setEstado("Eliminando...");

  const { error } = await supabaseClient
    .from("herramientas")
    .delete()
    .eq("id", id);

  if (error) {
    setEstado("No se pudo eliminar: " + error.message, true);
    return;
  }

  setEstado("✅ Eliminada. Regresando...");
  setTimeout(() => (location.href = "index.html"), 600);
}

btnGuardar.addEventListener("click", guardarNotas);
btnEliminar.addEventListener("click", eliminarHerramienta);

cargarDetalle();
