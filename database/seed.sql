-- Cine Tucumán · Datos de ejemplo (PostgreSQL)
--
-- Carga como mínimo 5 registros en cada tabla. Los datos salen del frontend: las 20 películas,
-- las 5 sucursales con sus enlaces y el Candy Bar. Lo que el sitio todavía no tiene (por ejemplo
-- la duración de la mayoría de las películas) queda vacío (NULL), igual que el sitio muestra
-- "Por confirmar". Los usuarios, las ciudades y clasificaciones extra, las salas, las funciones,
-- los productos extra y las órdenes son de ejemplo.
--
-- Se ejecuta después de schema.sql, con las tablas vacías:
--
--   psql -U postgres -d cine_tucuman -f database/seed.sql
--
-- Contraseña de todos los usuarios de ejemplo: Prueba123!  (se guarda cifrada con bcrypt)

SET client_encoding = 'UTF8';

BEGIN;

-- Usuarios
INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, rol) VALUES
  ('Lazaro', 'Molina', 'lazaro.molina@cinetucuman.test', '$2b$10$zdHTOT13XWZat6YgXX1EwOUMQEgbN4ErgjGAGyMNkxkMsykTzjosy', 'cliente'),
  ('Juan Ignacio', 'Lezana', 'juan.lezana@cinetucuman.test', '$2b$10$mXixfGAaumMN7BfKphP76uo0uSdiM0cDYpjUIun0gFNAFxGbhUXFm', 'cliente'),
  ('Nahuel', 'Almaraz Sintora', 'nahuel.almaraz@cinetucuman.test', '$2b$10$xw5Mlk4jqhNKYaFD6OyP5.2VSALZsePWKOcNoX/CXp2diZwvOf8ZO', 'cliente'),
  ('Juan Cruz', 'Decima', 'juan.decima@cinetucuman.test', '$2b$10$pCKyIKz5gZpCrV2fpJXmOO0I70AfBNImUn/fue66iceTGNUAWEOmu', 'cliente'),
  ('Administrador', 'Cine Tucumán', 'admin@cinetucuman.test', '$2b$10$rDWSyCTg1S8FqeawD2pp3upeHyBA.ZEbtgwvmDZBJEV6S6iZeeSIa', 'admin');

-- Géneros
INSERT INTO generos (nombre) VALUES
  ('Acción'),
  ('Aventuras'),
  ('Ciencia ficción'),
  ('Animación'),
  ('Thriller');

-- Clasificaciones por edad (las tres primeras en uso son las del sitio; el resto, de ejemplo)
INSERT INTO clasificaciones (nombre) VALUES
  ('ATP'),
  ('Mayores de 13 años'),
  ('Mayores de 16 años'),
  ('Mayores de 18 años'),
  ('Supervisión parental sugerida');

-- Películas (20): las de la cartelera y los próximos estrenos
INSERT INTO peliculas (slug, titulo, titulo_original, sinopsis, duracion_minutos, clasificacion_id, estado, destacada, fecha_estreno, poster_archivo, trailer_youtube, director, pais_origen)
SELECT v.slug, v.titulo, v.titulo_original, v.sinopsis, v.duracion, c.id, v.estado, v.destacada, v.estreno::date, v.poster, v.trailer, v.director, v.pais
FROM (VALUES
  ('spider-man-un-nuevo-dia', 'Spider-Man: Un nuevo día', 'Spider-Man: Brand New Day', 'Cuatro años después de los acontecimientos de Spider-Man: Sin regreso a casa, Peter Parker vive solo y dedica su vida por completo a combatir el crimen en una Nueva York que ya no recuerda su identidad. Mientras un nuevo patrón de delitos amenaza la ciudad, una transformación inesperada pone en riesgo al propio Spider-Man y lo enfrenta a una de las amenazas más peligrosas de su vida.', 150, 'Supervisión parental sugerida', 'en-cartelera', TRUE, '2026-07-30', 'spider-man-un-nuevo-dia.jpg', '62bIsvRcPv0', 'Destin Daniel Cretton', 'Estados Unidos'),
  ('toy-story-5', 'Toy Story 5', NULL, NULL, 107, 'ATP', 'en-cartelera', TRUE, NULL, 'toy-story-5.jpg', NULL, NULL, NULL),
  ('la-guerra-de-los-ultimos', 'La guerra de los últimos', NULL, NULL, 118, 'Mayores de 13 años', 'en-cartelera', TRUE, NULL, 'la-guerra-de-los-ultimos.jpg', NULL, NULL, NULL),
  ('yo-narciso', 'Yo, Narciso', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'yo-narciso.jpg', NULL, NULL, NULL),
  ('minions-monsters', 'Minions & Monsters', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'minions-monsters.jpg', NULL, NULL, NULL),
  ('la-odisea', 'La Odisea', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'la-odisea.jpg', NULL, NULL, NULL),
  ('paw-patrol-la-dino-pelicula', 'Paw Patrol: La Dino Película', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'paw-patrol-la-dino-pelicula.jpg', NULL, NULL, NULL),
  ('la-noche-del-demonio-estan-entre-nosotros', 'La noche del demonio: Están entre nosotros', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'la-noche-del-demonio-estan-entre-nosotros.jpg', NULL, NULL, NULL),
  ('coyote-vs-acme', 'Coyote vs. ACME', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'coyote-vs-acme.jpg', NULL, NULL, NULL),
  ('solo-por-una-noche', 'Solo por una noche', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'solo-por-una-noche.jpg', NULL, NULL, NULL),
  ('harry-potter-y-la-piedra-filosofal', 'Harry Potter y la piedra filosofal', NULL, NULL, NULL, NULL, 'en-cartelera', FALSE, NULL, 'harry-potter-y-la-piedra-filosofal.jpg', NULL, NULL, NULL),
  ('pepita-la-pistolera', 'Pepita, la pistolera', NULL, NULL, NULL, NULL, 'proximamente', FALSE, '2026-09-03', 'pepita-la-pistolera.jpg', NULL, NULL, NULL),
  ('hechizo-de-amor', 'Hechizo de Amor: La magia continúa', NULL, NULL, NULL, NULL, 'proximamente', FALSE, '2026-09-10', 'hechizo-de-amor.jpg', NULL, NULL, NULL),
  ('codigo-venganza', 'Código: Venganza', NULL, NULL, NULL, NULL, 'proximamente', FALSE, '2026-09-10', 'codigo-venganza.jpg', NULL, NULL, NULL),
  ('esa-cosa-con-alas', 'Esa cosa con alas', NULL, NULL, NULL, NULL, 'proximamente', FALSE, NULL, 'esa-cosa-con-alas.jpg', NULL, NULL, NULL),
  ('oasis-dont-look-back-in-anger', 'Oasis: Don''t Look Back in Anger', NULL, NULL, NULL, NULL, 'proximamente', FALSE, NULL, 'oasis-dont-look-back-in-anger.jpg', NULL, NULL, NULL),
  ('tadeo-el-explorador', 'Tadeo El Explorador y la Lámpara Maravillosa', NULL, NULL, NULL, NULL, 'proximamente', FALSE, NULL, 'tadeo-el-explorador.jpg', NULL, NULL, NULL),
  ('bajo-tus-pies', 'Bajo tus pies', NULL, NULL, NULL, NULL, 'proximamente', FALSE, NULL, 'bajo-tus-pies.jpg', NULL, NULL, NULL),
  ('romeo-y-ofelia', 'Romeo y Ofelia', NULL, NULL, NULL, NULL, 'proximamente', FALSE, NULL, 'romeo-y-ofelia.jpg', NULL, NULL, NULL),
  ('el-heladero', 'El heladero', NULL, NULL, NULL, NULL, 'proximamente', FALSE, NULL, 'el-heladero.jpg', NULL, NULL, NULL)
) AS v (slug, titulo, titulo_original, sinopsis, duracion, clasificacion, estado, destacada, estreno, poster, trailer, director, pais)
LEFT JOIN clasificaciones c ON c.nombre = v.clasificacion;

-- Géneros de cada película (relación muchos a muchos)
INSERT INTO peliculas_generos (pelicula_id, genero_id)
SELECT p.id, g.id
FROM (VALUES
  ('spider-man-un-nuevo-dia', 'Acción'),
  ('spider-man-un-nuevo-dia', 'Aventuras'),
  ('spider-man-un-nuevo-dia', 'Ciencia ficción'),
  ('toy-story-5', 'Animación'),
  ('la-guerra-de-los-ultimos', 'Ciencia ficción'),
  ('la-guerra-de-los-ultimos', 'Thriller')
) AS v (slug, genero)
JOIN peliculas p ON p.slug = v.slug
JOIN generos g ON g.nombre = v.genero;

-- Ciudades (las dos primeras tienen sucursales; las otras son de ejemplo). La provincia es Tucumán.
INSERT INTO ciudades (nombre) VALUES
  ('San Miguel de Tucumán'),
  ('Yerba Buena'),
  ('Tafí Viejo'),
  ('Banda del Río Salí'),
  ('Concepción');

-- Sucursales (5). La dirección es solo la calle y el número: la ciudad sale de la tabla ciudades.
INSERT INTO sucursales (slug, nombre, ciudad_id, direccion, descripcion, imagen_archivo, destacada)
SELECT v.slug, v.nombre, c.id, v.direccion, v.descripcion, v.imagen, v.destacada
FROM (VALUES
  ('cine-atlas-monteagudo', 'Cine Atlas Monteagudo', 'San Miguel de Tucumán', 'Monteagudo 250', 'Complejo Cine Atlas ubicado en San Miguel de Tucumán.', 'cine-atlas-monteagudo.jpg', TRUE),
  ('cine-atlas-via-24', 'Cine Atlas Vía 24', 'San Miguel de Tucumán', '24 de Septiembre 757', 'Complejo Cine Atlas ubicado en una zona céntrica de San Miguel de Tucumán.', 'cine-atlas-via-24.jpg', FALSE),
  ('cinemacenter-tucuman', 'Cinemacenter Tucumán', 'San Miguel de Tucumán', 'Avenida Roca 3450', 'Complejo Cinemacenter ubicado en la zona de Avenida Roca de San Miguel de Tucumán.', 'cinemacenter-tucuman.jpg', TRUE),
  ('sunstar-cinemas', 'Sunstar Cinemas', 'Yerba Buena', 'Avenida Fermín Cariola 42', 'Complejo Sunstar Cinemas ubicado en Yerba Buena.', 'sunstar-cinemas.jpg', TRUE),
  ('cines-del-solar', 'Cines del Solar', 'Yerba Buena', 'Avenida Aconquija 1300', 'Complejo Cines del Solar ubicado en Yerba Buena.', 'cines-del-solar.jpg', FALSE)
) AS v (slug, nombre, ciudad, direccion, descripcion, imagen, destacada)
JOIN ciudades c ON c.nombre = v.ciudad;

-- Enlaces de las sucursales (uno por tipo)
INSERT INTO sucursal_enlaces (sucursal_id, tipo, url)
SELECT su.id, v.tipo, v.url
FROM (VALUES
  ('cine-atlas-monteagudo', 'sitio', 'https://www.cineatlasweb.com.ar/'),
  ('cine-atlas-monteagudo', 'instagram', 'https://www.instagram.com/cine.atlas/'),
  ('cine-atlas-via-24', 'sitio', 'https://www.cineatlasweb.com.ar/'),
  ('cine-atlas-via-24', 'instagram', 'https://www.instagram.com/cine.atlas/'),
  ('cinemacenter-tucuman', 'sitio', 'https://www.cinemacenter.com.ar/'),
  ('sunstar-cinemas', 'sitio', 'https://www.cinesunstar.com/'),
  ('cines-del-solar', 'sitio', 'https://yerbabuena.tur.ar/producto/cines-del-solar/'),
  ('cines-del-solar', 'instagram', 'https://www.instagram.com/cinesdelsolar/'),
  ('cines-del-solar', 'facebook', 'https://www.facebook.com/cinesdelsolar/')
) AS v (slug, tipo, url)
JOIN sucursales su ON su.slug = v.slug;

-- Salas: dos por sucursal
INSERT INTO salas (sucursal_id, nombre)
SELECT s.id, n.nombre
FROM sucursales s
CROSS JOIN (VALUES ('Sala 1'), ('Sala 2')) AS n (nombre);

-- Butacas: 6 filas (A a F) por 8 columnas en cada sala, o sea 48 butacas por sala.
-- Las accesibles son las mismas cuatro que marca el sitio: A1, A8, B1 y B8.
INSERT INTO butacas (sala_id, fila, numero, accesible)
SELECT sa.id, f.fila, n.numero, (f.fila || n.numero) IN ('A1', 'A8', 'B1', 'B8')
FROM salas sa
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) AS f (fila)
CROSS JOIN generate_series(1, 8) AS n (numero);

-- Funciones
-- Las fechas son relativas al día en que se carga el script, así siempre quedan en el futuro.
-- Spider-Man: 7 días con 5 horarios por día en la Sala 1 de Sunstar Cinemas (igual que el sitio).
-- Otras tres películas, con pocas funciones, para que haya variedad.
-- La disponibilidad (disponible, pocos lugares o agotada) no se guarda: la calcula la vista v_funciones.
CREATE TEMP TABLE horario_ejemplo (hora TIME, formato VARCHAR(2));
INSERT INTO horario_ejemplo VALUES
  ('19:20', '2D'),
  ('22:10', '2D'),
  ('16:00', '3D'),
  ('19:00', '3D'),
  ('22:00', '3D');

INSERT INTO funciones (pelicula_id, sala_id, inicia_en, formato, idioma, precio)
SELECT p.id, sa.id,
       ((hoy.dia + dia.n) + h.hora) AT TIME ZONE 'America/Argentina/Tucuman',
       h.formato, 'Castellano', 8500
FROM peliculas p
JOIN sucursales su ON su.slug = 'sunstar-cinemas'
JOIN salas sa ON sa.sucursal_id = su.id AND sa.nombre = 'Sala 1'
CROSS JOIN (SELECT (now() AT TIME ZONE 'America/Argentina/Tucuman')::date AS dia) AS hoy
CROSS JOIN generate_series(0, 6) AS dia (n)
CROSS JOIN horario_ejemplo h
WHERE p.slug = 'spider-man-un-nuevo-dia';

INSERT INTO funciones (pelicula_id, sala_id, inicia_en, formato, idioma, precio)
SELECT p.id, sa.id,
       ((hoy.dia + dia.n) + v.hora) AT TIME ZONE 'America/Argentina/Tucuman',
       '2D', 'Castellano', v.precio
FROM (VALUES
  ('toy-story-5',              'cinemacenter-tucuman',  'Sala 1', 0, 2, TIME '16:00', 7000),
  ('toy-story-5',              'cinemacenter-tucuman',  'Sala 1', 0, 2, TIME '18:30', 7000),
  ('toy-story-5',              'cinemacenter-tucuman',  'Sala 1', 0, 2, TIME '21:00', 8000),
  ('la-guerra-de-los-ultimos', 'cine-atlas-monteagudo', 'Sala 1', 0, 2, TIME '19:00', 8000),
  ('la-guerra-de-los-ultimos', 'cine-atlas-monteagudo', 'Sala 1', 0, 2, TIME '22:00', 8000),
  ('minions-monsters',         'cines-del-solar',       'Sala 2', 0, 1, TIME '15:30', 6500),
  ('minions-monsters',         'cines-del-solar',       'Sala 2', 0, 1, TIME '17:45', 6500)
) AS v (pelicula, sucursal, sala, desde, hasta, hora, precio)
JOIN peliculas p ON p.slug = v.pelicula
JOIN sucursales su ON su.slug = v.sucursal
JOIN salas sa ON sa.sucursal_id = su.id AND sa.nombre = v.sala
CROSS JOIN (SELECT (now() AT TIME ZONE 'America/Argentina/Tucuman')::date AS dia) AS hoy
CROSS JOIN generate_series(0, 2) AS dia (n)
WHERE dia.n BETWEEN v.desde AND v.hasta;

DROP TABLE horario_ejemplo;

-- Productos del Candy Bar (el primero es el del sitio; los otros cinco son de ejemplo)
INSERT INTO productos (slug, nombre, descripcion, categoria, precio) VALUES
  ('combo-clasico', 'Combo Clásico', 'Pochoclos grande + gaseosa mediana', 'combo', 6000),
  ('pochoclos-grandes', 'Pochoclos grandes', 'Balde de pochoclos con manteca', 'snack', 4500),
  ('pochoclos-medianos', 'Pochoclos medianos', 'Pochoclos dulces o salados', 'snack', 3500),
  ('nachos-con-queso', 'Nachos con queso', 'Nachos con salsa de queso cheddar', 'snack', 4000),
  ('gaseosa-mediana', 'Gaseosa mediana', 'Vaso de 500 ml a elección', 'bebida', 2500),
  ('agua-mineral', 'Agua mineral', 'Botella de 500 ml', 'bebida', 1800);

-- Órdenes de ejemplo (cinco compras de cinco usuarios)
CREATE TEMP TABLE funcion_ejemplo AS
SELECT p.slug || '|' || ((f.inicia_en AT TIME ZONE 'America/Argentina/Tucuman')::date
                         - (now() AT TIME ZONE 'America/Argentina/Tucuman')::date)
       || '|' || to_char(f.inicia_en AT TIME ZONE 'America/Argentina/Tucuman', 'HH24:MI') AS clave,
       f.id, f.sala_id, f.precio
FROM funciones f
JOIN peliculas p ON p.id = f.pelicula_id;

INSERT INTO ordenes (numero, usuario_id, estado)
SELECT v.numero, u.id, v.estado
FROM (VALUES
  ('CT-EJ0001', 'juan.decima@cinetucuman.test', 'pagada'),
  ('CT-EJ0002', 'juan.lezana@cinetucuman.test', 'pagada'),
  ('CT-EJ0003', 'nahuel.almaraz@cinetucuman.test', 'pagada'),
  ('CT-EJ0004', 'lazaro.molina@cinetucuman.test', 'pendiente'),
  ('CT-EJ0005', 'admin@cinetucuman.test', 'cancelada')
) AS v (numero, correo, estado)
JOIN usuarios u ON u.correo = v.correo;

-- Entradas: cada fila es una butaca de una función. La orden cancelada (CT-EJ0005) no tiene
-- entradas: al cancelar una orden se borran sus entradas para liberar las butacas.
INSERT INTO entradas (orden_id, funcion_id, butaca_id, precio_unitario)
SELECT o.id, f.id, b.id, f.precio
FROM (VALUES
  ('CT-EJ0001', 'spider-man-un-nuevo-dia|1|19:20', 'B', 3),
  ('CT-EJ0001', 'spider-man-un-nuevo-dia|1|19:20', 'B', 4),
  ('CT-EJ0002', 'spider-man-un-nuevo-dia|1|22:10', 'C', 5),
  ('CT-EJ0002', 'spider-man-un-nuevo-dia|1|22:10', 'C', 6),
  ('CT-EJ0002', 'spider-man-un-nuevo-dia|1|22:10', 'C', 7),
  ('CT-EJ0003', 'toy-story-5|0|18:30', 'D', 2),
  ('CT-EJ0003', 'toy-story-5|0|18:30', 'D', 3),
  ('CT-EJ0004', 'la-guerra-de-los-ultimos|1|22:00', 'E', 4),
  ('CT-EJ0004', 'la-guerra-de-los-ultimos|1|22:00', 'E', 5)
) AS v (numero, funcion, fila, asiento)
JOIN ordenes o ON o.numero = v.numero
JOIN funcion_ejemplo f ON f.clave = v.funcion
JOIN butacas b ON b.sala_id = f.sala_id AND b.fila = v.fila AND b.numero = v.asiento;

-- Productos del Candy Bar de cada orden (el precio es el del momento de la compra)
INSERT INTO orden_productos (orden_id, producto_id, cantidad, precio_unitario)
SELECT o.id, p.id, v.cantidad, p.precio
FROM (VALUES
  ('CT-EJ0001', 'combo-clasico', 1),
  ('CT-EJ0002', 'pochoclos-grandes', 1),
  ('CT-EJ0002', 'gaseosa-mediana', 3),
  ('CT-EJ0003', 'nachos-con-queso', 1),
  ('CT-EJ0004', 'combo-clasico', 2),
  ('CT-EJ0004', 'agua-mineral', 2),
  ('CT-EJ0005', 'gaseosa-mediana', 1)
) AS v (numero, producto, cantidad)
JOIN ordenes o ON o.numero = v.numero
JOIN productos p ON p.slug = v.producto;

DROP TABLE funcion_ejemplo;

COMMIT;
