const API_URL = "api/index.php";
const fallbackClients = [
  { id_cliente: 1, nombre: "Alejandro Torres", telefono: "+34 612 345 789", ultimo_servicio: "Corte clasico", ultimo_barbero: "Marco Ruiz", ultima_visita: "Hoy, 09:00", visitas: 12, gasto_total: "486,00" },
  { id_cliente: 2, nombre: "Pablo Sanchez", telefono: "+34 623 456 890", ultimo_servicio: "Fade + barba", ultimo_barbero: "Sofia Martin", ultima_visita: "Ayer, 17:30", visitas: 8, gasto_total: "296,00" },
  { id_cliente: 3, nombre: "Javier Moreno", telefono: "+34 634 567 901", ultimo_servicio: "Arreglo de barba", ultimo_barbero: "Diego Navarro", ultima_visita: "16 sep, 12:00", visitas: 15, gasto_total: "612,00" },
  { id_cliente: 4, nombre: "Carlos Martin", telefono: "+34 645 678 012", ultimo_servicio: "Corte clasico", ultimo_barbero: "Marco Ruiz", ultima_visita: "14 sep, 10:30", visitas: 6, gasto_total: "198,00" }
];
const fallbackBarbers = [
  { id_barbero: 1, nombre: "Marco Ruiz", especialidad: "Especialista en fades", turnos_hoy: 8 },
  { id_barbero: 2, nombre: "Sofia Martin", especialidad: "Cortes clasicos y color", turnos_hoy: 7 },
  { id_barbero: 3, nombre: "Diego Navarro", especialidad: "Barba y afeitado", turnos_hoy: 6 }
];
const fallbackServices = [
  { id_servicio: 1, nombre: "Corte clasico", duracion: 30, precio: "18.00" },
  { id_servicio: 2, nombre: "Fade + barba", duracion: 45, precio: "28.00" },
  { id_servicio: 3, nombre: "Arreglo de barba", duracion: 30, precio: "15.00" },
  { id_servicio: 4, nombre: "Corte infantil", duracion: 30, precio: "14.00" }
];
let clients = fallbackClients;
let barbers = fallbackBarbers;
let services = fallbackServices;
let appointments = [];
let reviews = [];
let reviewableAppointments = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const initials = (name) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const money = (value) => `€ ${Number(String(value || 0).replace(",", ".")).toFixed(2).replace(".", ",")}`;

async function apiGet(resource) {
  const headers = {};
  if (currentUser) {
    headers['X-User-Id'] = currentUser.id_usuario;
    headers['X-User-Role'] = currentUser.rol;
  }
  const response = await fetch(`${API_URL}?resource=${resource}`, { headers });
  if (!response.ok) throw new Error("API unavailable");
  return response.json();
}

async function apiGetReviews(rating = "") {
  const query = rating
    ? `&puntuacion=${encodeURIComponent(rating)}`
    : "";

  const response = await fetch(
    `${API_URL}?resource=reviews${query}`
  );

  if (!response.ok) {
    throw new Error("No se pudieron cargar las reseñas");
  }

  return response.json();
}

async function apiPost(resource, payload) {
  const headers = { "Content-Type": "application/json" };
  if (currentUser) {
    headers['X-User-Id'] = currentUser.id_usuario;
    headers['X-User-Role'] = currentUser.rol;
  }
  const response = await fetch(`${API_URL}?resource=${resource}`, {
    method: "POST", headers, body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo guardar");
  return result;
}

function renderAppointments(appointments = []) {
  window.completedAppointments = appointments.filter((item) => item.estado === "Completado" && item.id_turno);
  const rows = appointments.length ? appointments : [
    { hora: "09:00", cliente: "Alejandro Torres", servicio: "Corte clasico", barbero: "Marco Ruiz", estado: "Pendiente" },
    { hora: "10:30", cliente: "Pablo Sanchez", servicio: "Fade + barba", barbero: "Sofia Martin", estado: "Completado" },
    { hora: "12:00", cliente: "Javier Moreno", servicio: "Arreglo de barba", barbero: "Diego Navarro", estado: "Pendiente" }
  ];
  $("#today-timeline").innerHTML = rows.map((item, index) => `
    <div class="appointment"><div class="appointment-time">${item.hora}</div><span class="appointment-dot"></span>
  const container = $("#today-timeline");
  
  if (!appointments || appointments.length === 0) {
    container.innerHTML = `<p style="color: var(--muted); font-size: 12px; margin-top: 15px;">No hay turnos próximos.</p>`;
    return;
  }

  container.innerHTML = appointments.map((item, index) => {
    const title = item.cliente ? item.cliente : "Mi reserva";
    
    return `
    <div class="appointment">
      <div class="appointment-time">${item.hora}</div><span class="appointment-dot"></span>
      <div class="appointment-card ${index % 3 === 1 ? "green-card" : index % 3 === 2 ? "purple-card" : ""}">
        <div>
          <strong>${title}</strong>
          <small>${item.servicio || ''} &middot; ${item.barbero || ''}</small>
        </div>
        <span class="appointment-status">${item.estado}</span>
        ${item.estado === "Completado" && item.id_turno ? `<button class="text-button review-appointment" data-review-turno="${item.id_turno}">Valorar</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

function renderReviews(result = { data: [], summary: [] }) {
  reviews = result.data || [];
  reviewableAppointments = result.pending || [];

  $("#review-summary").innerHTML =
    (result.summary || []).map((item) => `
      <article class="stat-card">
        <div class="stat-top">
          <span>${item.nombre}</span>
          <span class="stat-icon purple">&#9733;</span>
        </div>

        <div class="stat-value">
          ${Number(item.nota_media || 0).toFixed(2)}
          <span class="unit">/10</span>
        </div>

        <div class="stat-foot neutral">
          ${item.total_resenas} reseña(s)
        </div>
      </article>
    `).join("");

  $("#reviews-table").innerHTML =
    reviews.map((review) => `
      <tr>
        <td>${review.cliente}</td>
        <td>${review.barbero}</td>
        <td>${review.servicio}</td>
        <td><strong>${review.puntuacion}/10</strong></td>
        <td>${review.comentario || "-"}</td>
        <td>
          ${new Date(review.fecha_creacion)
            .toLocaleDateString("es-ES")}
        </td>
      </tr>
    `).join("");
}

function populateReviewForm() {
  const completed = reviewableAppointments.length ? reviewableAppointments : (window.completedAppointments || []);
  $("#review-appointment").innerHTML = completed.length
    ? completed.map((item) => `<option value="${item.id_turno}">${item.cliente} - ${item.servicio} (${item.hora || item.fecha_hora})</option>`).join("")
    : '<option value="">No hay turnos completados disponibles</option>';
}

function openReviewModal(turnoId = "") {
  populateReviewForm();
  if (turnoId) $("#review-appointment").value = turnoId;
  $("#review-modal-backdrop").classList.add("open");
}

function clientRow(client, detailed = false) {
  const avatarClass = `a${(client.id_cliente || 1) % 4 + 1}`;
  return `<tr><td><div class="client-cell"><span class="client-avatar ${avatarClass}">${initials(client.nombre)}</span>${client.nombre}</div></td>
    ${detailed ? `<td>${client.telefono || "-"}</td>` : ""}<td><span class="service-tag">${client.ultimo_servicio || "Sin visitas"}</span></td>
    <td>${client.ultimo_barbero || "-"}</td>${detailed ? `<td>${client.visitas || 0}</td><td>${money(client.gasto_total)}</td>` : `<td>${client.ultima_visita || "Sin visitas"}</td>`}
    <td><button class="action-dots">&hellip;</button></td></tr>`;
}

function renderClients(list = clients) {
  $("#recent-clients").innerHTML = list.slice(0, 4).map((client) => clientRow(client)).join("");
  $("#clients-table").innerHTML = list.map((client) => clientRow(client, true)).join("");
}

function renderBarbers() {
  $("#barber-cards").innerHTML = barbers.map((barber, index) => `
    <article class="barber-card"><div class="person-avatar photo-${index + 1}">${initials(barber.nombre)}</div><h3>${barber.nombre}</h3><p>${barber.especialidad || "Barbero"}</p>
      <div class="barber-meta"><span>Turnos hoy<strong>${barber.turnos_hoy || 0}</strong></span><span>Estado<strong>${barber.activo === 0 ? "Inactivo" : "Activo"}</strong></span></div></article>`).join("");
}

function renderServices() {
  $("#service-grid").innerHTML = services.map((service, index) => `
    <article class="service-card"><div class="service-icon">${["✂", "✦", "⌁", "★"][index % 4]}</div><h3>${service.nombre}</h3><p>${service.duracion} minutos de servicio.</p><span class="service-price">${money(service.precio)}</span></article>`).join("");
}

function renderModalContent(type) {
  const form = $("#modal-form");
  
  if (type === "appointments") {
    form.innerHTML = `
      <input type="hidden" name="action_type" value="appointments">
      
      <label>Cliente
        <div class="autocomplete-wrapper">
          <input type="text" id="client-search-input" placeholder="Escribe el nombre o teléfono..." autocomplete="off" required />
          <input type="hidden" name="id_cliente" id="appointment-client-id" />
          <div id="client-dropdown" class="autocomplete-dropdown"></div>
        </div>
      </label>
      
      <label>Servicio<select name="id_servicio" id="appointment-service" required></select></label>
      <div class="form-row">
        <label>Fecha<input required type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
        <label>Hora<input required type="time" name="time" value="15:00" /></label>
      </div>
      <label>Barbero<select name="id_barbero" id="appointment-barber" required></select></label>
      <button class="primary-button modal-submit" type="submit">Crear turno</button>
    `;
    populateAppointmentForm();
    setupClientAutocomplete(); // Inicializa el buscador interactivo
  } 
  else if (type === "barbers") {
    form.innerHTML = `
      <input type="hidden" name="action_type" value="barbers">
      <label>Nombre completo<input required name="nombre" placeholder="Ej. Juan Pérez" autocomplete="off" /></label>
      <label>Especialidad<input name="especialidad" placeholder="Ej. Fade y perfilado" autocomplete="off" /></label>
      <button class="primary-button modal-submit" type="submit">Guardar barbero</button>
    `;
  }
  else if (type === "clients") {
    form.innerHTML = `
      <input type="hidden" name="action_type" value="clients">
      <label>Nombre completo<input required name="nombre" placeholder="Ej. Alejandro Torres" autocomplete="off" /></label>
      <label>Teléfono<input required name="telefono" placeholder="Ej. +34 600 000 000" autocomplete="off" /></label>
      <label>Notas (opcional)<input name="notas" placeholder="Preferencias del cliente..." autocomplete="off" /></label>
      <button class="primary-button modal-submit" type="submit">Guardar cliente</button>
    `;
  }
  else if (type === "services") {
    form.innerHTML = `
      <input type="hidden" name="action_type" value="services">
      <label>Nombre del Servicio<input required name="nombre" placeholder="Ej. Corte Clásico" autocomplete="off" /></label>
      <div class="form-row">
        <label>Duración (minutos)<input required type="number" name="duracion" value="30" min="5" step="5" /></label>
        <label>Precio (€)<input required type="number" name="precio" value="15.00" min="0" step="0.50" /></label>
      </div>
      <button class="primary-button modal-submit" type="submit">Guardar servicio</button>
    `;
  }
}

// Ya no metemos a los clientes en un select, solo barberos y servicios
function populateAppointmentForm() {
  const barberSelect = $("#appointment-barber");
  if(barberSelect) barberSelect.innerHTML = `<option value="">Selecciona un barbero</option>${barbers.map((barber) => `<option value="${barber.id_barbero}">${barber.nombre}</option>`).join("")}`;
  
  const serviceSelect = $("#appointment-service");
  if(serviceSelect) serviceSelect.innerHTML = `<option value="">Selecciona un servicio</option>${services.map((service) => `<option value="${service.id_servicio}">${service.nombre} - ${money(service.precio)}</option>`).join("")}`;
}

// NUEVA FUNCIÓN: Lógica del autocompletado
function setupClientAutocomplete() {
  const searchInput = $("#client-search-input");
  const hiddenInput = $("#appointment-client-id");
  const dropdown = $("#client-dropdown");

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    dropdown.innerHTML = ""; 
    hiddenInput.value = ""; // Resetea el ID si el usuario empieza a escribir otra vez

    if (!term) {
      dropdown.style.display = "none";
      return;
    }

    // Filtra por nombre o por teléfono
    const matches = clients.filter(c => 
      c.nombre.toLowerCase().includes(term) || 
      (c.telefono && c.telefono.includes(term))
    );

    if (matches.length > 0) {
      matches.forEach(client => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.innerHTML = `<strong>${client.nombre}</strong> <small>${client.telefono || ''}</small>`;
        
        // Al hacer click en un cliente de la lista...
        div.addEventListener("click", () => {
          searchInput.value = client.nombre;       // Rellena el input visible
          hiddenInput.value = client.id_cliente;   // Guarda el ID real para la base de datos
          dropdown.style.display = "none";         // Cierra la lista
        });
        dropdown.appendChild(div);
      });
    } else {
      dropdown.innerHTML = `<div class="autocomplete-item"><small>No se encontraron clientes</small></div>`;
    }
    
    dropdown.style.display = "block";
  });

  // Ocultar la lista si se hace clic fuera del buscador
  document.addEventListener("click", (e) => {
    if (e.target !== searchInput && e.target !== dropdown) {
      dropdown.style.display = "none";
    }
  });
}

async function loadData() {
  try {
    const [clientResponse, barberResponse, serviceResponse, dashboardResponse, reviewResponse] = await Promise.all([
      apiGet("clients"), apiGet("barbers"), apiGet("services"), apiGet("dashboard"), apiGetReviews()
    ]);
    clients = clientResponse.data;
    barbers = barberResponse.data;
    services = serviceResponse.data;
    appointments = dashboardResponse.appointments || [];
    renderAppointments(appointments);
    renderClients();
    renderBarbers();
    renderServices();
    populateAppointmentForm();
    renderReviews(reviewResponse);
  } catch {
    renderAppointments();
    renderClients();
    renderBarbers();
    renderServices();
    populateAppointmentForm();
    renderReviews();
    notify("Modo demo: inicia Apache y MySQL para conectar phpMyAdmin.");
  }
}

function showView(view) {
  $$(".view").forEach((section) => section.classList.remove("active-view"));
  $(`#${view}-view`).classList.add("active-view");
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $("#page-title").textContent = view === "dashboard" ? "Resumen" : view.charAt(0).toUpperCase() + view.slice(1);
  $(".sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ----------------------------------------------------
// NUEVO: openModal ahora recibe el 'type'
// ----------------------------------------------------
function openModal(type = "appointments", title = "Nuevo turno") { 
  $("#modal-title").textContent = title; 
  renderModalContent(type);
  $("#modal-backdrop").classList.add("open"); 
  
  // Auto-foco en el primer input visible
  const firstInput = $("#modal-form").querySelector("input:not([type=hidden]), select");
  if(firstInput) firstInput.focus();
}

function closeModal() { $("#modal-backdrop").classList.remove("open"); }
function notify(message) { $("#toast-text").textContent = message; $("#toast").classList.add("visible"); setTimeout(() => $("#toast").classList.remove("visible"), 3000); }

$$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
$$("[data-view-link]").forEach((item) => item.addEventListener("click", () => showView(item.dataset.viewLink)));
$("#new-appointment").addEventListener("click", () => openModal());
$("#agenda-new").addEventListener("click", () => openModal());
$("#clients-new").addEventListener("click", () => openModal("Nuevo cliente"));
$("#quick-client").addEventListener("click", () => openModal("Nuevo cliente"));
$("#quick-service").addEventListener("click", () => openModal("Nuevo servicio"));
$("#new-review").addEventListener("click", () => openReviewModal());
$("#review-modal-close").addEventListener("click", () => $("#review-modal-backdrop").classList.remove("open"));
$("#review-modal-backdrop").addEventListener("click", (event) => {
  if (event.target === $("#review-modal-backdrop")) $("#review-modal-backdrop").classList.remove("open");
});
$("#review-rating-filter").addEventListener("change", async (event) => {
  try { renderReviews(await apiGetReviews(event.target.value)); } catch (error) { notify(error.message); }
});
$("#today-timeline").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-turno]");
  if (button) openReviewModal(button.dataset.reviewTurno);
});

// ----------------------------------------------------
// NUEVO: Conectar botones con sus respectivos modals
// ----------------------------------------------------
$("#new-appointment").addEventListener("click", () => openModal("appointments", "Nuevo turno"));
$("#agenda-new").addEventListener("click", () => openModal("appointments", "Nuevo turno"));
$("#clients-new").addEventListener("click", () => openModal("clients", "Nuevo cliente"));
$("#quick-client").addEventListener("click", () => openModal("clients", "Nuevo cliente"));
$("#quick-service").addEventListener("click", () => openModal("services", "Nuevo servicio"));
$("#barbers-view .primary-button").addEventListener("click", () => openModal("barbers", "Añadir barbero"));
$("#services-view .primary-button").addEventListener("click", () => openModal("services", "Nuevo servicio"));

$("#modal-close").addEventListener("click", closeModal);
$("#modal-backdrop").addEventListener("click", (event) => { if (event.target === $("#modal-backdrop")) closeModal(); });

// ----------------------------------------------------
// NUEVO: Procesamiento dinámico del form (submit)
// ----------------------------------------------------
// ----------------------------------------------------
// NUEVO: Procesamiento dinámico del form (submit)
// ----------------------------------------------------
$("#modal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const actionType = form.get("action_type"); // Sabe si está guardando un turno, barbero, etc.

  try {
    let payload = {};
    
    // Construimos los datos según el formulario que esté abierto
    if (actionType === "appointments") {
      const idCliente = form.get("id_cliente");
      if (!idCliente) {
        notify("Por favor, selecciona un cliente válido de la lista.");
        return; 
      }
      payload = {
        id_cliente: idCliente, 
        id_barbero: form.get("id_barbero"), 
        id_servicio: form.get("id_servicio"),
        fecha_hora: `${form.get("date")} ${form.get("time")}:00`
      };
    } 
    else if (actionType === "barbers") {
      payload = { nombre: form.get("nombre"), especialidad: form.get("especialidad") };
    } 
    else if (actionType === "clients") {
      payload = { nombre: form.get("nombre"), telefono: form.get("telefono"), notas: form.get("notas") };
    } 
    else if (actionType === "services") {
      payload = { nombre: form.get("nombre"), duracion: form.get("duracion"), precio: form.get("precio") };
    }

    await apiPost(actionType, payload);
    closeModal(); 
    
    const successMessages = {
      appointments: "Turno guardado",
      barbers: "Barbero añadido",
      clients: "Cliente añadido",
      services: "Servicio añadido"
    };
    notify(`${successMessages[actionType]} correctamente.`); 
    
    await loadData(); // Refresca las vistas
  } catch (error) { 
    notify(error.message); 
  }
});

$("#client-search").addEventListener("input", (event) => {
  const term = event.target.value.toLowerCase();
  renderClients(clients.filter((client) => `${client.nombre} ${client.telefono || ""}`.toLowerCase().includes(term)));
});
$(".mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

$("#review-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);

  try {
    await apiPost("reviews", {
      id_turno: form.get("id_turno"),
      puntuacion: form.get("puntuacion"),
      comentario: form.get("comentario")
    });

    $("#review-modal-backdrop").classList.remove("open");
    event.target.reset();

    notify("Reseña guardada correctamente.");

    renderReviews(
      await apiGetReviews($("#review-rating-filter").value)
    );
  } catch (error) {
    notify(error.message);
  }
});

renderAppointments();
renderClients();
renderBarbers();
renderServices();
renderReviews();
loadData();

// ====================================================
// AUTENTICACIÓN Y ROLES (Login, Permisos, Logout)
// ====================================================

let currentUser = null;
const loginScreen = $("#login-screen");
const appShell = $("#app-shell");
const loginForm = $("#login-form");

// 1. Inicializar la app: comprobar si ya hay sesión guardada
function checkAuth() {
  const storedUser = localStorage.getItem("barberly_user");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    showAppShell();
  } else {
    loginScreen.style.display = "flex";
    appShell.style.display = "none";
  }
}

// 2. Mostrar la interfaz principal y aplicar restricciones
function showAppShell() {
  loginScreen.style.display = "none";
  appShell.style.display = "flex";
  
  applyRolePermissions();
  
  // Redirigir según el rol
  if (currentUser.rol === 'cliente') {
    showView('agenda'); // El cliente no tiene dashboard, va directo a sus citas
  } else {
    showView('dashboard');
  }
}

// 3. Modificar el DOM (menú) según quién entra
function applyRolePermissions() {
  const role = currentUser.rol;
  
  // 1. Actualizar avatares (Protegido por si los elementos no existen en el HTML)
  const userAvatar = $(".user-avatar");
  if (userAvatar) userAvatar.textContent = initials(currentUser.nombre);
  
  const userStrong = $(".user-card strong");
  if (userStrong) userStrong.textContent = currentUser.nombre;
  
  const userSmall = $(".user-card small");
  if (userSmall) userSmall.textContent = role === 'admin' ? 'Administrador' : (role === 'barbero' ? 'Barbero' : 'Cliente');

  // 2. Restablecer visibilidad de todos los botones por si hubo un cambio de cuenta
  $$(".nav-item").forEach(btn => btn.style.display = "flex");
  $$(".nav-label").forEach(label => label.style.display = "block");
  const quickPanel = $(".quick-panel");
  if (quickPanel) quickPanel.style.display = "block";

  // 3. Aplicar restricciones según el rol
  if (role === 'cliente') {
    // Modo Cliente: Ocultar casi todo el menú de forma segura
    const viewsToHide = ['dashboard', 'clients', 'barbers', 'services', 'reports', 'settings'];
    viewsToHide.forEach(v => {
      const btn = $("[data-view='" + v + "']");
      if (btn) btn.style.display = "none";
    });
    
    $$(".nav-label").forEach(label => label.style.display = "none");
    if (quickPanel) quickPanel.style.display = "none";
    
    // Cambiar el texto del botón Agenda
    const agendaBtn = $("[data-view='agenda']");
    if (agendaBtn) agendaBtn.innerHTML = `<span class="nav-icon">&#9719;</span>Mis Citas`;
  } 
  else if (role === 'barbero') {
    // Modo Barbero: Ocultar reportes globales y ajustes de negocio
    const settingsBtn = $("[data-view='settings']");
    if (settingsBtn) settingsBtn.style.display = "none";
    
    const reportsBtn = $("[data-view='reports']");
    if (reportsBtn) reportsBtn.style.display = "none";
  }
}

// 4. Cerrar sesión
function logout() {
  localStorage.removeItem("barberly_user");
  currentUser = null;
  appShell.style.display = "none";
  loginScreen.style.display = "flex";
  loginForm.reset();
}

// ====================================================
// EVENTOS PRINCIPALES
// ====================================================

// Enviar el formulario de Login
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;
  
  try {
    // 1. Llamada real al backend enviando credenciales
    const user = await apiPost("login", { email, password });
    
    // 2. Si es exitoso, guardar los datos devueltos por PHP
    currentUser = user;
    localStorage.setItem("barberly_user", JSON.stringify(currentUser));
    
    showAppShell();
    notify(`Bienvenido/a, ${currentUser.nombre}`);
    
  } catch (error) {
    // Mostrará "Credenciales incorrectas" en el toast si falla
    notify(error.message); 
  }
});

// Botón de cerrar sesión (Detecta clic en el menú lateral o en el header)
$("#btn-logout")?.addEventListener("click", () => {
  if (confirm("¿Seguro que quieres cerrar sesión?")) {
    logout();
  }
});

// (Mantén aquí el resto de tus eventos: modal, buscador, etc.)
$$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
$$("[data-view-link]").forEach((item) => item.addEventListener("click", () => showView(item.dataset.viewLink)));

// ... (Resto de tus addEventListeners del modal que ya tenías) ...

// ====================================================
// INICIO AUTOMÁTICO
// ====================================================
renderAppointments();
renderClients();
renderBarbers();
renderServices();
loadData();

// Arrancar comprobando la sesión
checkAuth();