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

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const initials = (name) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const money = (value) => `€ ${Number(String(value || 0).replace(",", ".")).toFixed(2).replace(".", ",")}`;

async function apiGet(resource) {
  const response = await fetch(`${API_URL}?resource=${resource}`);
  if (!response.ok) throw new Error("API unavailable");
  return response.json();
}

async function apiPost(resource, payload) {
  const response = await fetch(`${API_URL}?resource=${resource}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo guardar");
  return result;
}

function renderAppointments(appointments = []) {
  const rows = appointments.length ? appointments : [
    { hora: "09:00", cliente: "Alejandro Torres", servicio: "Corte clasico", barbero: "Marco Ruiz", estado: "Pendiente" },
    { hora: "10:30", cliente: "Pablo Sanchez", servicio: "Fade + barba", barbero: "Sofia Martin", estado: "Completado" },
    { hora: "12:00", cliente: "Javier Moreno", servicio: "Arreglo de barba", barbero: "Diego Navarro", estado: "Pendiente" }
  ];
  $("#today-timeline").innerHTML = rows.map((item, index) => `
    <div class="appointment"><div class="appointment-time">${item.hora}</div><span class="appointment-dot"></span>
      <div class="appointment-card ${index % 3 === 1 ? "green-card" : index % 3 === 2 ? "purple-card" : ""}">
        <div><strong>${item.cliente}</strong><small>${item.servicio} &middot; ${item.barbero}</small></div>
        <span class="appointment-status">${item.estado}</span>
      </div>
    </div>`).join("");
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
    const [clientResponse, barberResponse, serviceResponse, dashboardResponse] = await Promise.all([
      apiGet("clients"), apiGet("barbers"), apiGet("services"), apiGet("dashboard")
    ]);
    clients = clientResponse.data;
    barbers = barberResponse.data;
    services = serviceResponse.data;
    renderAppointments(dashboardResponse.appointments);
    renderClients();
    renderBarbers();
    renderServices();
  } catch {
    renderAppointments();
    renderClients();
    renderBarbers();
    renderServices();
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
$("#modal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const actionType = form.get("action_type"); // Sabe si está guardando un turno, barbero, etc.

  try {
    let payload = {};
    
if (actionType === "appointments") {
      const idCliente = form.get("id_cliente");
      
      // Añade esta comprobación:
      if (!idCliente) {
        notify("Por favor, selecciona un cliente válido de la lista.");
        return; // Detiene el envío
      }

      payload = {
        id_cliente: idCliente, 
        id_barbero: form.get("id_barbero"), 
        id_servicio: form.get("id_servicio"),
        fecha_hora: `${form.get("date")} ${form.get("time")}:00`
      };
    }

    await apiPost(actionType, payload);
    closeModal(); 
    
    // Mensaje de éxito dinámico
    const successMessages = {
      appointments: "Turno guardado",
      barbers: "Barbero añadido",
      clients: "Cliente añadido",
      services: "Servicio añadido"
    };
    notify(`${successMessages[actionType]} correctamente.`); 
    
    await loadData(); // Refresca las vistas con el nuevo dato
  } catch (error) { 
    notify(error.message); 
  }
});

$("#client-search").addEventListener("input", (event) => {
  const term = event.target.value.toLowerCase();
  renderClients(clients.filter((client) => `${client.nombre} ${client.telefono || ""}`.toLowerCase().includes(term)));
});
$(".mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

renderAppointments();
renderClients();
renderBarbers();
renderServices();
loadData();