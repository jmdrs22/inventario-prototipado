const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");
const card = document.getElementById("card");
const notas = document.getElementById("notas");

const btnGuardarNotas = document.getElementById("btnGuardarNotas");
const btnEliminar = document.getElementById("btnEliminar");
const btnVolver = document.getElementById("btnVolver");
const btnEditar = document.getElementById("btnEditar");

function setEstado(msg, tipo = "info") {
  estadoEl.className = `estado ${tipo}`;
  estadoEl.textContent = msg || "";
}

function safe(v) {
  return (v ?? "").toString().replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

const id = getParam("id");
const area = getParam("area");

if (area) btnVolver.href = `index.html?area=${encodeURIComponent(area)}`;
btnEditar.href = `agregar.html?id=${encodeURIComponent(id)}&area=${encodeURIComponent(area || "")}`;

async function cargar() {
  setEstado("Cargando…", "info");

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("id, area, nombre, codigo, cantidad, ubicacion, estado, imagen_url, notas, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    setEstado(`Error: ${error.message}`, "error");
    return;
  }

  const img = data.imagen_url
    ? `<img src="${data.imagen_url}" alt="${safe(data.nombre)}" />`
    : `<div class="img-empty">Sin imagen</div>`;

  card.innerHTML = `
    <div class="detail-img">${img}</div>
    <div class="detail-body">
      <h2>${safe(data.nombre)}</h2>
      <div class="meta">
        <div><b>Área:</b> ${safe(data.area || "-")}</div>
        <div><b>Código:</b> ${safe(data.codigo || "-")}</div>
        <div><b>Cantidad:</b> ${safe(data.cantidad ?? "-")}</div>
        <div><b>Ubicación:</b> ${safe(data.ubicacion || "-")}</div>
        <div><b>Estado:</b> ${safe(data.estado || "-")}</div>
      </div>
    </div>
  `;

  notas.value = data.notas || "";
  setEstado("", "ok");
}

btnGuardarNotas.addEventListener("click", async () => {
  try {
    setEstado("Guardando notas…", "info");
    const { error } = await supabaseClient
      .from("herramientas")
      .update({ notas: notas.value })
      .eq("id", id);

    if (error) throw error;
    setEstado(" Notas guardadas.", "ok");
  } catch (e) {
    console.error(e);
    setEstado(`${e.message}`, "error");
  }
});

btnEliminar.addEventListener("click", async () => {
  if (!confirm("¿Seguro que deseas eliminar esta herramienta?")) return;

  try {
    setEstado("Eliminando…", "info");
    const { error } = await supabaseClient.from("herramientas").delete().eq("id", id);
    if (error) throw error;

    setEstado("Eliminada.", "ok");
    setTimeout(() => (location.href = btnVolver.href), 700);
  } catch (e) {
    console.error(e);
    setEstado(` ${e.message}`, "error");
  }
});

cargar();

