<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-User-Id, X-User-Role');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function body(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : $_POST;
}

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function currentUser(): array
{
    return [
        'id' => filter_var($_SERVER['HTTP_X_USER_ID'] ?? null, FILTER_VALIDATE_INT) ?: null,
        'role' => $_SERVER['HTTP_X_USER_ROLE'] ?? null,
    ];
}

try {
    $pdo = database();
    $resource = $_GET['resource'] ?? 'dashboard';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        switch ($resource) {
case 'dashboard':
                $today = date('Y-m-d');
                $appointments = $pdo->prepare(
                    "SELECT t.id_turno, t.id_cliente, t.id_barbero, DATE_FORMAT(t.fecha_hora, '%H:%i') AS hora,
                            c.nombre AS cliente, s.nombre AS servicio, b.nombre AS barbero,
                            t.estado, s.duracion, t.precio_cobrado
                     FROM turnos t
                     INNER JOIN clientes c ON c.id_cliente = t.id_cliente
                     INNER JOIN servicios s ON s.id_servicio = t.id_servicio
                     INNER JOIN barberos b ON b.id_barbero = t.id_barbero
                     WHERE DATE(t.fecha_hora) = ? AND t.estado <> 'Cancelado'
                     ORDER BY t.fecha_hora"
                );
                $appointments->execute([$today]);
                $stats = $pdo->prepare(
                    "SELECT COUNT(*) AS turnos_hoy,
                            COALESCE(SUM(CASE WHEN estado = 'Completado' THEN precio_cobrado ELSE 0 END), 0) AS ingresos_hoy,
                            (SELECT COUNT(*) FROM clientes WHERE DATE(fecha_registro) = ?) AS nuevos_clientes
                     FROM turnos WHERE DATE(fecha_hora) = ? AND estado <> 'Cancelado'"
                );
                $stats->execute([$today, $today]);
                respond(['appointments' => $appointments->fetchAll(), 'stats' => $stats->fetch()]);
                $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
                $userRole = $_SERVER['HTTP_X_USER_ROLE'] ?? null;
                
                // Si es CLIENTE, solo ve sus propios turnos futuros (no los de hoy del local)
                if ($userRole === 'cliente') {
                    $appointments = $pdo->prepare("
                        SELECT t.id_turno, DATE_FORMAT(t.fecha_hora, '%d/%m %H:%i') AS hora,
                               s.nombre AS servicio, b.nombre AS barbero, t.estado
                        FROM turnos t
                        INNER JOIN servicios s ON s.id_servicio = t.id_servicio
                        INNER JOIN barberos b ON b.id_barbero = t.id_barbero
                        WHERE t.id_cliente = ? AND t.fecha_hora >= CURRENT_TIMESTAMP AND t.estado <> 'Cancelado'
                        ORDER BY t.fecha_hora ASC
                    ");
                    $appointments->execute([(int)$userId]);
                    
                    respond(['appointments' => $appointments->fetchAll(), 'stats' => null]);
                } 
                // Si es ADMIN o BARBERO, ven toda la agenda del día
                else {
                    $appointments = $pdo->prepare("
                        SELECT t.id_turno, DATE_FORMAT(t.fecha_hora, '%H:%i') AS hora,
                               c.nombre AS cliente, s.nombre AS servicio, b.nombre AS barbero,
                               t.estado, s.duracion, t.precio_cobrado
                        FROM turnos t
                        INNER JOIN clientes c ON c.id_cliente = t.id_cliente
                        INNER JOIN servicios s ON s.id_servicio = t.id_servicio
                        INNER JOIN barberos b ON b.id_barbero = t.id_barbero
                        WHERE DATE(t.fecha_hora) = ? AND t.estado <> 'Cancelado'
                        ORDER BY t.fecha_hora ASC
                    ");
                    $appointments->execute([$today]);
                    
                    $stats = $pdo->prepare("
                        SELECT COUNT(*) AS turnos_hoy,
                               COALESCE(SUM(CASE WHEN estado = 'Completado' THEN precio_cobrado ELSE 0 END), 0) AS ingresos_hoy,
                               (SELECT COUNT(*) FROM clientes WHERE DATE(fecha_registro) = ?) AS nuevos_clientes
                        FROM turnos WHERE DATE(fecha_hora) = ? AND estado <> 'Cancelado'
                    ");
                    $stats->execute([$today, $today]);
                    
                    respond(['appointments' => $appointments->fetchAll(), 'stats' => $stats->fetch()]);
                }

            case 'clients':
                $stmt = $pdo->query(
                    "SELECT c.id_cliente, c.nombre, c.telefono, c.notas,
                            COUNT(t.id_turno) AS visitas,
                            COALESCE(SUM(CASE WHEN t.estado = 'Completado' THEN t.precio_cobrado ELSE 0 END), 0) AS gasto_total,
                            MAX(t.fecha_hora) AS ultima_visita,
                            s.nombre AS ultimo_servicio, b.nombre AS ultimo_barbero
                     FROM clientes c
                     LEFT JOIN turnos t ON t.id_cliente = c.id_cliente
                     LEFT JOIN servicios s ON s.id_servicio = t.id_servicio
                     LEFT JOIN barberos b ON b.id_barbero = t.id_barbero
                     GROUP BY c.id_cliente
                     ORDER BY c.fecha_registro DESC"
                );
                respond(['data' => $stmt->fetchAll()]);

            case 'barbers':
                $stmt = $pdo->query(
                    "SELECT b.id_barbero, b.nombre, b.especialidad, b.activo,
                            COUNT(CASE WHEN DATE(t.fecha_hora) = CURDATE() THEN 1 END) AS turnos_hoy
                     FROM barberos b LEFT JOIN turnos t ON t.id_barbero = b.id_barbero
                     GROUP BY b.id_barbero ORDER BY b.nombre"
                );
                respond(['data' => $stmt->fetchAll()]);

            case 'services':
                $stmt = $pdo->query("SELECT id_servicio, nombre, duracion, precio, activo FROM servicios ORDER BY activo DESC, nombre");
                respond(['data' => $stmt->fetchAll()]);

            case 'settings':
                $stmt = $pdo->query("SELECT clave, valor, descripcion FROM configuracion ORDER BY clave");
                respond(['data' => $stmt->fetchAll()]);

            case 'reviews':
                $user = currentUser();
                $where = [];
                $params = [];
                if ($user['role'] === 'cliente') {
                    if (!$user['id']) {
                        respond(['error' => 'La sesión del cliente no es válida'], 401);
                    }
                    $where[] = 'r.id_cliente = ?';
                    $params[] = $user['id'];
                } elseif (!empty($_GET['id_barbero'])) {
                    $where[] = 'r.id_barbero = ?';
                    $params[] = (int) $_GET['id_barbero'];
                }
                if (!empty($_GET['puntuacion'])) {
                    $where[] = 'r.puntuacion = ?';
                    $params[] = (int) $_GET['puntuacion'];
                }
                $filter = $where ? 'WHERE ' . implode(' AND ', $where) : '';
                $stmt = $pdo->prepare(
                    "SELECT r.id_resena, r.id_turno, r.id_cliente, r.id_barbero, r.puntuacion,
                            r.comentario, r.fecha_creacion, c.nombre AS cliente,
                            b.nombre AS barbero, s.nombre AS servicio
                     FROM resenas r
                     INNER JOIN clientes c ON c.id_cliente = r.id_cliente
                     INNER JOIN barberos b ON b.id_barbero = r.id_barbero
                     INNER JOIN turnos t ON t.id_turno = r.id_turno
                     INNER JOIN servicios s ON s.id_servicio = t.id_servicio
                     {$filter}
                     ORDER BY r.fecha_creacion DESC"
                );
                $stmt->execute($params);
                $summary = $pdo->query(
                    "SELECT b.id_barbero, b.nombre, COUNT(r.id_resena) AS total_resenas,
                            COALESCE(ROUND(AVG(r.puntuacion), 2), 0) AS nota_media
                     FROM barberos b
                     LEFT JOIN resenas r ON r.id_barbero = b.id_barbero
                     GROUP BY b.id_barbero, b.nombre
                     ORDER BY nota_media DESC, b.nombre"
                );
                $pendingWhere = $user['role'] === 'cliente' ? 'AND t.id_cliente = ?' : '';
                $pendingParams = $user['role'] === 'cliente' ? [$user['id']] : [];
                $pending = $pdo->prepare(
                    "SELECT t.id_turno, t.id_cliente, c.nombre AS cliente, s.nombre AS servicio,
                            DATE_FORMAT(t.fecha_hora, '%d/%m/%Y %H:%i') AS fecha_hora
                     FROM turnos t
                     INNER JOIN clientes c ON c.id_cliente = t.id_cliente
                     INNER JOIN servicios s ON s.id_servicio = t.id_servicio
                     WHERE t.estado = 'Completado' {$pendingWhere}
                       AND NOT EXISTS (SELECT 1 FROM resenas r WHERE r.id_turno = t.id_turno)
                     ORDER BY t.fecha_hora DESC"
                );
                $pending->execute($pendingParams);
                respond([
                    'data' => $stmt->fetchAll(),
                    'summary' => $summary->fetchAll(),
                    'pending' => $pending->fetchAll(),
                ]);

            default:
                respond(['error' => 'Recurso no encontrado'], 404);
        }
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = body();
if ($resource === 'appointments') {
            foreach (['id_cliente', 'id_barbero', 'id_servicio', 'fecha_hora'] as $required) {
                if (empty($data[$required])) {
                    respond(['error' => "Falta el campo {$required}"], 422);
                }
            }

            // 1. Obtener datos del servicio solicitado
            $stmtService = $pdo->prepare("SELECT duracion, precio FROM servicios WHERE id_servicio = ? AND activo = 1");
            $stmtService->execute([(int) $data['id_servicio']]);
            $service = $stmtService->fetch();
            
            if (!$service) {
                respond(['error' => 'El servicio no existe o está inactivo'], 422);
            }

            // 2. Validar que el barbero no tenga otro turno en ese lapso de tiempo
            $stmtConflict = $pdo->prepare("
                SELECT id_turno FROM turnos 
                WHERE id_barbero = ? 
                AND estado != 'Cancelado'
                AND (
                    fecha_hora < DATE_ADD(?, INTERVAL ? MINUTE) AND 
                    DATE_ADD(fecha_hora, INTERVAL (SELECT duracion FROM servicios WHERE servicios.id_servicio = turnos.id_servicio) MINUTE) > ?
                )
            ");
            
            $stmtConflict->execute([
                (int) $data['id_barbero'],
                $data['fecha_hora'],
                $service['duracion'],
                $data['fecha_hora']
            ]);

            if ($stmtConflict->fetch()) {
                respond(['error' => 'El barbero ya tiene un turno reservado en ese horario'], 409);
            }

            // 3. Insertar si está libre
            $stmt = $pdo->prepare(
                "INSERT INTO turnos (id_cliente, id_barbero, id_servicio, fecha_hora, precio_cobrado)
                 VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                (int) $data['id_cliente'],
                (int) $data['id_barbero'],
                (int) $data['id_servicio'],
                $data['fecha_hora'],
                $service['precio']
            ]);
            
            respond(['id_turno' => (int) $pdo->lastInsertId()], 201);
        }

        if ($resource === 'clients') {
            if (empty($data['nombre']) || empty($data['telefono'])) {
                respond(['error' => 'Nombre y teléfono son obligatorios'], 422);
            }
            $stmt = $pdo->prepare("INSERT INTO clientes (nombre, telefono, notas) VALUES (?, ?, ?)");
            $stmt->execute([$data['nombre'], $data['telefono'], $data['notas'] ?? null]);
            respond(['id_cliente' => (int) $pdo->lastInsertId()], 201);
        }

        if ($resource === 'barbers') {
            if (empty($data['nombre'])) {
                respond(['error' => 'El nombre es obligatorio'], 422);
            }
            $stmt = $pdo->prepare("INSERT INTO barberos (nombre, especialidad, horario_laboral) VALUES (?, ?, ?)");
            $stmt->execute([$data['nombre'], $data['especialidad'] ?? null, $data['horario_laboral'] ?? null]);
            respond(['id_barbero' => (int) $pdo->lastInsertId()], 201);
        }

        if ($resource === 'services') {
            if (empty($data['nombre']) || !isset($data['duracion'], $data['precio'])) {
                respond(['error' => 'Nombre, duración y precio son obligatorios'], 422);
            }
            $stmt = $pdo->prepare("INSERT INTO servicios (nombre, duracion, precio) VALUES (?, ?, ?)");
            $stmt->execute([$data['nombre'], (int) $data['duracion'], (float) $data['precio']]);
            respond(['id_servicio' => (int) $pdo->lastInsertId()], 201);
        }

        if ($resource === 'settings') {
            if (empty($data['clave']) || !isset($data['valor'])) {
                respond(['error' => 'Clave y valor son obligatorios'], 422);
            }
            $stmt = $pdo->prepare(
                "INSERT INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = COALESCE(VALUES(descripcion), descripcion)"
            );
            $stmt->execute([$data['clave'], (string) $data['valor'], $data['descripcion'] ?? null]);
            respond(['clave' => $data['clave']], 200);
        }

        if ($resource === 'reviews') {
            foreach (['id_turno', 'puntuacion'] as $required) {
                if (!isset($data[$required]) || $data[$required] === '') {
                    respond(['error' => "Falta el campo {$required}"], 422);
                }
            }
            $rating = filter_var($data['puntuacion'], FILTER_VALIDATE_INT);
            if ($rating === false || $rating < 1 || $rating > 10) {
                respond([
                    'error' => 'La puntuación debe estar entre 1 y 10'
                ], 422);
            }
            $user = currentUser();
            $turno = $pdo->prepare(
                "SELECT id_turno, id_cliente, id_barbero
                FROM turnos
                WHERE id_turno = ?
                AND estado = 'Completado'"
            );
            $turno->execute([(int) $data['id_turno']]);
            $appointment = $turno->fetch();
            if (!$appointment) {
                respond(['error' => 'Solo puedes reseñar turnos completados'], 422);
            }
            if ($user['role'] === 'cliente' && (!$user['id'] || (int) $user['id'] !== (int) $appointment['id_cliente'])) {
                respond(['error' => 'No puedes reseñar este turno'], 403);
            }
            $existing = $pdo->prepare(
                "SELECT id_resena FROM resenas WHERE id_turno = ?"
            );
            $existing->execute([$appointment['id_turno']]);

            if ($existing->fetch()) {
                respond([
                    'error' => 'Este turno ya tiene una reseña'
                ], 409);
            }
$stmt = $pdo->prepare(
                "INSERT INTO resenas (id_turno, id_cliente, id_barbero, puntuacion, comentario)
                 VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $appointment['id_turno'],
                $appointment['id_cliente'],
                $appointment['id_barbero'],
                $rating,
                trim((string) ($data['comentario'] ?? '')) ?: null,
            ]);
            
            respond(['id_resena' => (int) $pdo->lastInsertId()], 201);
        } // <--- ESTA ES LA LLAVE QUE FALTA

        if ($resource === 'login') {
            if (empty($data['email']) || empty($data['password'])) {
                respond(['error' => 'Email y contraseña son obligatorios'], 422);
            }

            $email = trim($data['email']);
            $password = (string) $data['password'];

            // 1. Buscar primero si es un Barbero / Administrador
            $stmt = $pdo->prepare("SELECT id_barbero, nombre, password, rol FROM barberos WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password'])) {
                respond([
                    'id_usuario' => $user['id_barbero'],
                    'nombre' => $user['nombre'],
                    'rol' => $user['rol'],
                    'email' => $email
                ], 200);
            }

            // 2. Si no es empleado, buscar si es un Cliente
            $stmt = $pdo->prepare("SELECT id_cliente, nombre, password FROM clientes WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $client = $stmt->fetch();

            if ($client && password_verify($password, $client['password'])) {
                respond([
                    'id_usuario' => $client['id_cliente'],
                    'nombre' => $client['nombre'],
                    'rol' => 'cliente', // Forzamos el rol para el frontend
                    'email' => $email
                ], 200);
            }

            // 3. Si no existe o la contraseña no coincide
            respond(['error' => 'Credenciales incorrectas'], 401);
        }
    }

    respond(['error' => 'Método no permitido'], 405);
} catch (Throwable $error) {
    error_log($error->getMessage());
    respond(['error' => 'No se pudo conectar con la base de datos. Revisa api/config.php y que MySQL esté iniciado.'], 500);
}
