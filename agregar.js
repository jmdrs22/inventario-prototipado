document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://vvoilctmowzfsjpbtxcw.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_CB3EcmLwEIyeLgORI8xQZg_NGFlXsy3";

  // Inicializar Supabase de forma directa y segura
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

  const btnElegirImagen = document.getElementById("btnElegirImagen");
  const btnTomarFoto = document.getElementById("btnTomarFoto");
  const btnCapturarFoto = document.getElementById("btnCapturarFoto");
  const btnCancelarFoto = document.getElementById("btnCancelarFoto");

  const cameraBox = document.getElementById("cameraBox");
  const cameraVideo = document.getElementById("cameraVideo");
  const cameraCanvas = document.getElementById("cameraCanvas");

  let modo = "crear";
  let id = null;
  let imagenActual = null;
  let cameraStream = null;
  let fotoCapturada = null;

  function setEstado(msg, isError = false) {
    if (!estadoEl) return;
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
    estadoBtns.forEach((b) => b.classList.remove("active"));
    const btn = Array.from(estadoBtns).find((b) => b.dataset.estado === valor);
    if (btn) btn.classList.add("active");
    estadoValor.value = valor || "bueno";
  }

  estadoBtns.forEach((btn) => {
    btn.addEventListener("click", () => setEstadoActivo(btn.dataset.estado));
  });

  function mostrarPreviewArchivo(file) {
    if (!file) {
      fileName.textContent = "Ningún archivo seleccionado";
      preview.style.display = "none";
      preview.removeAttribute("src");
      return;
    }

    fileName.textContent = file.name;
    const objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    preview.style.display = "block";
    
    // Liberar la URL cuando ya no se necesite
    preview.onload = () => URL.revokeObjectURL(objectUrl);
  }

  if (imagenInput) {
    imagenInput.addEventListener("change", () => {
      const file = imagenInput.files && imagenInput.files[0] ? imagenInput.files[0] : null;
      fotoCapturada = null;
      mostrarPreviewArchivo(file);
      setEstado(file ? "Imagen seleccionada." : "No se seleccionó imagen.");
    });
  }

  if (btnElegirImagen) {
    btnElegirImagen.addEventListener("click", () => {
      setEstado("Abriendo selector de imágenes...");
      imagenInput.click();
    });
  }

  async function abrirCamara() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setEstado("Tu navegador no soporta la cámara.", true);
        return;
      }

      cerrarCamara();

      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        },
        audio: false
      });

      cameraVideo.srcObject = cameraStream;
      cameraBox.style.display = "block";
      setEstado("Cámara abierta. Presiona Capturar.");
    } catch (err) {
      console.error("Error al abrir cámara:", err);
      setEstado("No se pudo abrir la cámara: " + (err?.message || String(err)), true);
    }
  }

  function cerrarCamara() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
    cameraBox.style.display = "none";
  }

  async function capturarFoto() {
    try {
      if (!cameraStream) {
        setEstado("La cámara no está activa.", true);
        return;
      }

      const vw = cameraVideo.videoWidth;
      const vh = cameraVideo.videoHeight;

      if (!vw || !vh) {
        setEstado("La cámara todavía no está lista.", true);
        return;
      }

      cameraCanvas.width = vw;
      cameraCanvas.height = vh;

      const ctx = cameraCanvas.getContext("2d");
      ctx.drawImage(cameraVideo, 0, 0, vw, vh);

      const blob = await new Promise((resolve) => {
        cameraCanvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        setEstado("No se pudo capturar la foto.", true);
        return;
      }

      const file = new File([blob], `foto-${Date.now()}.jpg`, {
        type: "image/jpeg"
      });

      fotoCapturada = file;
      mostrarPreviewArchivo(file);
      cerrarCamara();
      setEstado("Foto capturada correctamente.");
    } catch (err) {
      console.error("Error al capturar foto:", err);
      setEstado("Error al capturar foto: " + (err?.message || String(err)), true);
    }
  }

  if (btnTomarFoto) {
    btnTomarFoto.addEventListener("click", () => {
      abrirCamara();
    });
  }

  if (btnCapturarFoto) {
    btnCapturarFoto.addEventListener("click", () => {
      capturarFoto();
    });
  }

  if (btnCancelarFoto) {
    btnCancelarFoto.addEventListener("click", () => {
      cerrarCamara();
      setEstado("Captura cancelada.");
    });
  }

  function makeUUID() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return (
      "id-" +
      Date.now().toString(16) +
      "-" +
      Math.random().toString(16).slice(2) +
      "-" +
      Math.random().toString(16).slice(2)
    );
  }

  async function subirImagen(file) {
    if (!supabaseClient) {
      throw new Error("Supabase no está disponible.");
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${makeUUID()}.${safeExt}`;

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

  async function init() {
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

    if (!supabaseClient) {
      setEstado("Supabase no cargó correctamente.", true);
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

    try {
      if (!supabaseClient) {
        setEstado("Supabase no cargó correctamente.", true);
        return;
      }

      if (!areaSel.value) {
        setEstado("Selecciona un área.", true);
        return;
      }

      setEstado(modo === "crear" ? "Guardando..." : "Guardando cambios...");

      let imagen_url = imagenActual;
      const file = fotoCapturada || (imagenInput.files && imagenInput.files[0] ? imagenInput.files[0] : null);

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
        const { error } = await supabaseClient.from("herramientas").insert(payload);
        if (error) throw error;

        setEstado("Herramienta guardada correctamente. Redirigiendo...");
        setTimeout(() => {
          location.href = "index.html";
        }, 700);
        return;
      }

      const { error } = await supabaseClient.from("herramientas").update(payload).eq("id", id);
      if (error) throw error;

      setEstado("Cambios guardados correctamente. Redirigiendo...");
      setTimeout(() => {
        location.href = "index.html";
      }, 700);
    } catch (err) {
      console.error("Error al guardar:", err);
      setEstado("Error: " + (err?.message || String(err)), true);
    }
  });

  init();
});