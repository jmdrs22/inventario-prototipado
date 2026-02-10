const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const estadoEl = document.getElementById("estado");
const form = document.getElementById("form");

const areaSel = document.getElementById("areaSel");
const nombre = document.getElementById("nombre");
const codigo = document.getElementById("codigo");
const cantidad = document.getElementById("cantidad");
const ubicacion = document.getElementById("ubicacion");

const estadoValor = document.getElementById("estadoValor");
const estadoBtns = Array.from(document.querySelectorAll(".estado-btn"));

const inputImagen = document.getElementById("imagen");
const fileName = document.getElementById("fileName");
const preview = document.getElementById("preview");

const btnGuardar = document.getElementById("btnGuardarTool");

let modo = "crear";
let idEditar = null;
let imagenActual = null;

function setEstado(msg, tipo = "info") {
  if (!estadoEl) return;
  estadoEl.className = `estado ${tipo}`;
  estadoEl.textContent = msg || "";
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function setEstadoActivo(valor) {
  estadoValor.value = valor;
  estadoBtns.forEach((b) => b.classList.toggle("active", b.dataset.estado === valor));
}

async function codigoDisponible(cod, idActual = null) {
  if (!cod) return true; // vacío / null => permitido
  let q = supabaseClient.from("herramientas").select("id").eq("codigo", cod).limit(1);
  if (idActual) q = q.neq("id", idActual);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).length === 0;
}

async function subirImagen(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("herramientas") // nombre EXACTO del bucket
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from("herramientas").getPublicUrl(path);
  return data.publicUrl;
}

async function cargarParaEditar(id) {
  const { data, error } = await supabaseClient
    .from("herramientas")
    .select("id, area, nombre, codigo, cantidad, ubicacion, estado, imagen_url")
    .eq("id", id)
    .single();

  if (error) throw error;

  areaSel.value = data.area || "";
  nombre.value = data.nombre || "";
  codigo.value = data.codigo || "";
  cantidad.value = data.cantidad ?? 1;
  ubicacion.value = data.ubicacion || "";
  setEstadoActivo(data.estado || "bueno");

  imagenActual = data.imagen_url || null;
  if (imagenActual) {
    preview.src = imagenActual;
    preview.style.display = "block";
    fileName.textContent = "Imagen existente (se conserva si no eliges otra)";
  }
}

estadoBtns.forEach((btn) => {
  btn.addEventListener("click", () => setEstadoActivo(btn.dataset.estado));
});

inputImagen?.addEventListener("change", () => {
  const file = inputImagen.files?.[0];
  if (!file) {
    fileName.textContent = "Ningún archivo seleccionado";
    preview.style.display = "none";
    return;
  }
  fileName.textContent = file.name;
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

async function init() {
  // precargar área si viene desde index.html?area=...
  const areaUrl = getParam("area");
  if (areaUrl && areaSel) areaSel.value = areaUrl;

  const id = getParam("id");
  if (id) {
    modo = "editar";
    idEditar = id;
    setEstado("Editando herramienta…", "info");
    try {
      await cargarParaEditar(idEditar);
      setEstado("", "info");
      btnGuardar.textContent = "Guardar cambios";
    } catch (e) {
      console.error(e);
      setEstado("No se pudo cargar la herramienta para editar.", "error");
    }
  } else {
    setEstadoActivo("bueno");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setEstado("Guardando…", "info");
  btnGuardar.disabled = true;

  try {
    const area = (areaSel.value || "").trim();
    const nombreVal = (nombre.value || "").trim();
    const codigoVal = (codigo.value || "").trim().toUpperCase() || null;

    if (!area) throw new Error("Selecciona un área.");
    if (!nombreVal) throw new Error("El nombre es obligatorio.");

    // 1) Validar código único ANTES de subir imagen
    if (codigoVal) {
      const ok = await codigoDisponible(codigoVal, modo === "editar" ? Number(idEditar) : null);
      if (!ok) throw new Error(`El código "${codigoVal}" ya existe. Usa otro código.`);
    }

    // 2) Subir imagen (si hay archivo nuevo)
    let imagen_url = imagenActual;
    const file = inputImagen.files?.[0];
    if (file) {
      imagen_url = await subirImagen(file);
    }

    const payload = {
      area,
      nombre: nombreVal,
      codigo: codigoVal,
      cantidad: Number(cantidad.value || 1),
      ubicacion: (ubicacion.value || "").trim() || null,
      estado: estadoValor.value || "bueno",
      imagen_url
    };

    if (modo === "crear") {
      const { error } = await supabaseClient.from("herramientas").insert(payload);
      if (error) throw error;
      setEstado(" Herramienta guardada.", "ok");
      form.reset();
      cantidad.value = 1;
      imagenActual = null;
      fileName.textContent = "Ningún archivo seleccionado";
      preview.style.display = "none";
      setEstadoActivo("bueno");
    } else {
      const { error } = await supabaseClient.from("herramientas").update(payload).eq("id", idEditar);
      if (error) throw error;
      setEstado("Cambios guardados.", "ok");
    }
  } catch (err) {
    console.error(err);
    setEstado(`${err.message || "Error al guardar."}`, "error");
  } finally {
    btnGuardar.disabled = false;
  }
});

init();







