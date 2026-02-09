const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");
const pageTitle = document.getElementById("pageTitle");
const btnGuardarTool = document.getElementById("btnGuardarTool");
const form = document.getElementById("form");

const areaSel = document.getElementById("area");
const nombre = document.getElementById("nombre");
const codigo = document.getElementById("codigo");
const cantidad = document.getElementById("cantidad");
const ubicacion = document.getElementById("ubicacion");

const estadoValor = document.getElementById("estadoValor");
const estadoBtns = document.querySelectorAll(".estado-btn");

const imagenInput = document.getElementById("imagen");
const preview = document.getElementById("preview");
const fileName = document.getElementById("fileName");

let modo = "crear";
let id = null;
let imagenActual = null;

function setEstado(msg, isError = false) {
  estadoEl.textContent = msg;
  estadoEl.className = "estado" + (isError ? " error" : "");
}

function params() {
  return new URLSearchParams(location.search);
}

function getId() {
  const v = params().get("id");
  return v ? Number(v) : null;
}

function getAreaFromUrl() {
  return params().get("area");
}

function setEstadoActivo(valor) {
  estadoBtns.forEach(b => b.classList.remove("active"));
  const btn = Array.from(estadoBtns).find(b => b.dataset.estado === valor);
  (btn || document.querySelector(".estado-btn.success"))?.classList.add("active");
  estadoValor.value = valor || "bueno";
}

estadoBtns.forEach(btn => {
  btn.addEventListener("click", () => setEstadoActivo(btn.dataset.estado));
});

// Preview imagen
imagenInput?.addEventListener("change", () => {
  const file = imagenInput.files?.[0];
  if (!file) {
    fileName.textContent = "Ningún archivo seleccionado";
    preview.style.display = "none";
    preview.src = "";
    return;
  }
  fileName.textContent = file.name;
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

async function subirImagen(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("herramientas")
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient
    .storage
    .from("herramientas")
    .getPublicUrl(path);

  return data.publicUrl;
}

// Cargar si es edición o precargar área si viene desde index
async function init() {
  // precargar área si viene desde index.html?area=...
  const areaUrl = getAreaFromUrl();
  if (areaUrl && !getId()) {
    areaSel.value = areaUrl;
  }

  id = getId();
  if (!id) {
    modo = "crear";
    setEstadoActivo("bueno");
    return;
  }

  modo = "editar";
  pageTitle.textContent = "Editar herramienta";
  btnGuardarTool.textContent = "Guardar cambios";

  setEstado("Cargando herramienta...");

  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("id, area, nombre, codigo, cantidad, ubicacion, estado, imagen_url")
    .eq("id", id)
    .single();

  if (error) {
    setEstado("Error: " + error.message, true);
    return;
  }

  areaSel.value = data.area || "";
  nombre.value = data.nombre || "";
  codigo.value = data.codigo || "";
  cantidad.value = data.cantidad ?? 1;
  ubicacion.value = data.ubicacion || "";
  imagenActual = data.imagen_url || null;

  setEstadoActivo(data.estado || "bueno");

  if (imagenActual) {
    preview.src = imagenActual;
    preview.style.display = "block";
    fileName.textContent = "Imagen actual (sin cambiar)";
  }

  setEstado("Listo para editar.");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setEstado(modo === "crear" ? "Guardando..." : "Guardando cambios...");

  try {
    if (!areaSel.value) {
      setEstado("Selecciona un área.", true);
      return;
    }

    let imagen_url = imagenActual;
    const file = imagenInput?.files?.[0];
    if (file) {
      setEstado("Subiendo imagen...");
      imagen_url = await subirImagen(file);
    }

    const payload = {
      area: areaSel.value,
      nombre: nombre.value.trim(),
      codigo: (codigo.value || "").trim() || null,
      cantidad: Number(cantidad.value),
      ubicacion: (ubicacion.value || "").trim() || null,
      estado: estadoValor.value || null,
      imagen_url
    };

    if (modo === "crear") {
      const { error } = await supabaseClient
        .from("herramientas")
        .insert(payload);

      if (error) throw error;

      setEstado("✅ Herramienta guardada correctamente");
      form.reset();
      cantidad.value = 1;
      imagenActual = null;
      setEstadoActivo("bueno");
      fileName.textContent = "Ningún archivo seleccionado";
      preview.style.display = "none";
      preview.src = "";
      return;
    }

    const { error } = await supabaseClient
      .from("herramientas")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    setEstado("✅ Cambios guardados correctamente");
    setTimeout(() => (location.href = `detalle.html?id=${encodeURIComponent(id)}`), 600);

  } catch (err) {
    console.error(err);
    setEstado("❌ Error: " + (err?.message || String(err)), true);
  }

  const form = document.getElementById("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alert("✅ Submit detectado (JS sí está funcionando)");
});

init();

});





