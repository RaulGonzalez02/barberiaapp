CREATE TABLE resenas (
    id_resena INT AUTO_INCREMENT PRIMARY KEY,
    id_turno INT NOT NULL UNIQUE,
    id_cliente INT NOT NULL,
    id_barbero INT NOT NULL,
    puntuacion TINYINT UNSIGNED NOT NULL,
    comentario VARCHAR(1000),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_resena_puntuacion
        CHECK (puntuacion BETWEEN 1 AND 10),

    CONSTRAINT fk_resena_turno
        FOREIGN KEY (id_turno)
        REFERENCES turnos(id_turno)
        ON DELETE CASCADE,

    CONSTRAINT fk_resena_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE CASCADE,

    CONSTRAINT fk_resena_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON DELETE CASCADE,

    INDEX idx_resenas_barbero (id_barbero),
    INDEX idx_resenas_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;<?php
header('Access-Control-Allow-Headers: Content-Type, X-User-Id, X-User-Role');<?php
function currentUser(): array
{
    return [
        'id' => filter_var(
            $_SERVER['HTTP_X_USER_ID'] ?? null,
            FILTER_VALIDATE_INT
        ) ?: null,

        'role' => $_SERVER['HTTP_X_USER_ROLE'] ?? null,
    ];
}t.id_turno,
t.id_cliente,
t.id_barbero<button class="nav-item" data-view="reviews">
  <span class="nav-icon">&#9733;</span>Reseñas
</button><section class="view" id="reviews-view">
  <div class="page-heading compact-heading">
    <div>
      <p class="eyebrow">CALIDAD Y REPUTACION</p>
      <h1>Reseñas</h1>
      <p class="heading-subtitle">
        Audita la experiencia y reconoce el trabajo de tu equipo.
      </p>
    </div>

    <button class="primary-button" id="new-review">
      <span>+</span> Nueva reseña
    </button>
  </div>

  <div class="stats-grid" id="review-summary"></div>

  <div class="panel full-panel">
    <div class="list-toolbar">
      <strong>Auditoría de reputación</strong>

      <select id="review-rating-filter" class="filter-button">
        <option value="">Todas las puntuaciones</option>
        <option value="10">10 puntos</option>
        <option value="9">9 puntos</option>
        <option value="8">8 puntos</option>
        <option value="7">7 puntos</option>
        <option value="6">6 puntos</option>
        <option value="5">5 puntos</option>
        <option value="4">4 puntos</option>
        <option value="3">3 puntos</option>
        <option value="2">2 puntos</option>
        <option value="1">1 punto</option>
      </select>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CLIENTE</th>
            <th>BARBERO</th>
            <th>SERVICIO</th>
            <th>NOTA</th>
            <th>RESEÑA</th>
            <th>FECHA</th>
          </tr>
        </thead>
        <tbody id="reviews-table"></tbody>
      </table>
    </div>
  </div>
</section><div class="modal-backdrop" id="review-modal-backdrop">
  <div class="modal">
    <button class="modal-close" id="review-modal-close">&times;</button>

    <p class="eyebrow">POST-SERVICIO</p>
    <h2 id="review-modal-title">Valorar servicio</h2>

    <form id="review-form">
      <label>
        Turno completado
        <select required name="id_turno" id="review-appointment"></select>
      </label>

      <label>
        Puntuación (1-10)
        <input
          required
          type="number"
          name="puntuacion"
          min="1"
          max="10"
        />
      </label>

      <label>
        Reseña
        <textarea
          name="comentario"
          maxlength="1000"
          rows="4"
          placeholder="¿Cómo fue la experiencia?"
        ></textarea>
      </label>

      <button class="primary-button modal-submit" type="submit">
        Guardar reseña
      </button>
    </form>
  </div>
</div>async function apiGetReviews(rating = "") {
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
}function renderReviews(result = { data: [], summary: [] }) {
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
    `).join("") ||
    "<p class=\"heading-subtitle\">Aún no hay valoraciones.</p>";

  $("#reviews-table").innerHTML =
    reviews.map((review) => `
      <tr>
        <td>${review.cliente}</td>
        <td>${review.barbero}</td>
        <td>${review.servicio}</td>
        <td><strong>${review.puntuacion}/10</strong></td>
        <td>${review.comentario || "-"}</td>
        <td>
          ${new Date(review.fecha_creacion).toLocaleDateString("es-ES")}
        </td>
      </tr>
    `).join("") ||
    "<tr><td colspan=\"6\">No hay reseñas con este filtro.</td></tr>";
}${item.estado === "Completado" && item.id_turno
  ? `<button
       class="text-button review-appointment"
       data-review-turno="${item.id_turno}">
       Valorar
     </button>`
  : ""}$("#review-form").addEventListener("submit", async (event) => {
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
});-- Ejecuta este archivo en phpMyAdmin dentro de la base de datos que uses
-- y configura el mismo nombre en api/config.php.

CREATE TABLE configuracion (
    id_config INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO configuracion (clave, valor, descripcion) VALUES
('hora_apertura', '09:00', 'Hora de inicio de la agenda'),
('hora_cierre', '20:00', 'Hora de fin de la agenda'),
('intervalo_turnos', '30', 'Minutos de separación visual en la agenda');

CREATE TABLE barberos (
    id_barbero INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    especialidad VARCHAR(150),
    horario_laboral JSON,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE servicios (
    id_servicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    duracion INT NOT NULL COMMENT 'En minutos',
    precio DECIMAL(10, 2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    notas TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE turnos (
    id_turno INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_barbero INT NOT NULL,
    id_servicio INT NOT NULL,
    fecha_hora DATETIME NOT NULL,
    precio_cobrado DECIMAL(10, 2) NOT NULL,
    estado ENUM('Pendiente', 'Completado', 'Cancelado', 'Ausente') DEFAULT 'Pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    CONSTRAINT fk_barbero FOREIGN KEY (id_barbero) REFERENCES barberos(id_barbero) ON DELETE CASCADE,
    CONSTRAINT fk_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) ON DELETE CASCADE,
    INDEX idx_turnos_fecha (fecha_hora),
    INDEX idx_turnos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE resenas (
    id_resena INT AUTO_INCREMENT PRIMARY KEY,
    id_turno INT NOT NULL UNIQUE,
    id_cliente INT NOT NULL,
    id_barbero INT NOT NULL,
    puntuacion TINYINT UNSIGNED NOT NULL,
    comentario VARCHAR(1000),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_resena_puntuacion
        CHECK (puntuacion BETWEEN 1 AND 10),

    CONSTRAINT fk_resena_turno
        FOREIGN KEY (id_turno)
        REFERENCES turnos(id_turno)
        ON DELETE CASCADE,

    CONSTRAINT fk_resena_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE CASCADE,

    CONSTRAINT fk_resena_barbero
        FOREIGN KEY (id_barbero)
        REFERENCES barberos(id_barbero)
        ON DELETE CASCADE,

    INDEX idx_resenas_barbero (id_barbero),
    INDEX idx_resenas_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
