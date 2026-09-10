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

function populateAppointmentForm() {
  $("#appointment-client").innerHTML = `<option value="">Selecciona un cliente</option>${clients.map((client) => `<option value="${client.id_cliente}">${client.nombre}</option>`).join("")}`;
  $("#appointment-barber").innerHTML = `<option value="">Selecciona un barbero</option>${barbers.map((barber) => `<option value="${barber.id_barbero}">${barber.nombre}</option>`).join("")}`;
  $("#appointment-service").innerHTML = `<option value="">Selecciona un servicio</option>${services.map((service) => `<option value="${service.id_servicio}">${service.nombre} - ${money(service.precio)}</option>`).join("")}`;
  $("#modal-form input[type=date]").value = new Date().toISOString().slice(0, 10);
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
    populateAppointmentForm();
  } catch {
    renderAppointments();
    renderClients();
    renderBarbers();
    renderServices();
    populateAppointmentForm();
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
function openModal(title = "Nuevo turno") { $("#modal-title").textContent = title; $("#modal-backdrop").classList.add("open"); populateAppointmentForm(); $("#appointment-client").focus(); }
function closeModal() { $("#modal-backdrop").classList.remove("open"); }
function notify(message) { $("#toast-text").textContent = message; $("#toast").classList.add("visible"); setTimeout(() => $("#toast").classList.remove("visible"), 3000); }

$$(".nav-item").forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
$$("[data-view-link]").forEach((item) => item.addEventListener("click", () => showView(item.dataset.viewLink)));
$("#new-appointment").addEventListener("click", () => openModal());
$("#agenda-new").addEventListener("click", () => openModal());
$("#clients-new").addEventListener("click", () => openModal("Nuevo cliente"));
$("#quick-client").addEventListener("click", () => openModal("Nuevo cliente"));
$("#quick-service").addEventListener("click", () => openModal("Nuevo servicio"));
$("#modal-close").addEventListener("click", closeModal);
$("#modal-backdrop").addEventListener("click", (event) => { if (event.target === $("#modal-backdrop")) closeModal(); });
$("#modal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await apiPost("appointments", {
      id_cliente: form.get("id_cliente"), id_barbero: form.get("id_barbero"), id_servicio: form.get("id_servicio"),
      fecha_hora: `${form.get("date")} ${form.get("time")}:00`
    });
    closeModal(); notify("Turno guardado en la base de datos."); await loadData();
  } catch (error) { notify(error.message); }
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
