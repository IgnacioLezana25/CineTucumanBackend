-- Cine Tucumán · Verificación de la base de datos (PostgreSQL)
--
-- Comprueba que las tablas existen, que cada una tiene como mínimo 5 registros y que los datos
-- son coherentes entre sí. Solo hace consultas: no modifica nada.
--
--   psql -U postgres -d cine_tucuman -f database/verificacion.sql

SET client_encoding = 'UTF8';

\echo
\echo '== 1. Cantidad de registros por tabla (el mínimo pedido es 5)'
SELECT tabla, registros, registros >= 5 AS cumple_minimo
FROM (
  SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios
  UNION ALL SELECT 'generos', COUNT(*) FROM generos
  UNION ALL SELECT 'clasificaciones', COUNT(*) FROM clasificaciones
  UNION ALL SELECT 'peliculas', COUNT(*) FROM peliculas
  UNION ALL SELECT 'peliculas_generos', COUNT(*) FROM peliculas_generos
  UNION ALL SELECT 'ciudades', COUNT(*) FROM ciudades
  UNION ALL SELECT 'sucursales', COUNT(*) FROM sucursales
  UNION ALL SELECT 'sucursal_enlaces', COUNT(*) FROM sucursal_enlaces
  UNION ALL SELECT 'salas', COUNT(*) FROM salas
  UNION ALL SELECT 'butacas', COUNT(*) FROM butacas
  UNION ALL SELECT 'funciones', COUNT(*) FROM funciones
  UNION ALL SELECT 'productos', COUNT(*) FROM productos
  UNION ALL SELECT 'ordenes', COUNT(*) FROM ordenes
  UNION ALL SELECT 'entradas', COUNT(*) FROM entradas
  UNION ALL SELECT 'orden_productos', COUNT(*) FROM orden_productos
) AS cuenta
ORDER BY tabla;

\echo
\echo '== 2. Claves foráneas: qué tabla apunta a cuál y qué pasa al borrar'
SELECT conrelid::regclass AS tabla,
       a.attname AS columna,
       confrelid::regclass AS referencia,
       CASE confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' WHEN 'a' THEN 'NO ACTION' END AS al_borrar
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.contype = 'f'
ORDER BY conrelid::regclass::text, a.attname;

\echo
\echo '== 3. Películas en cartelera con su clasificación y sus géneros'
SELECT p.titulo, p.duracion_minutos AS minutos, COALESCE(c.nombre, 'Por confirmar') AS clasificacion,
       COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), 'Por confirmar') AS generos
FROM peliculas p
LEFT JOIN clasificaciones c ON c.id = p.clasificacion_id
LEFT JOIN peliculas_generos pg ON pg.pelicula_id = p.id
LEFT JOIN generos g ON g.id = pg.genero_id
WHERE p.estado = 'en-cartelera'
GROUP BY p.id, c.nombre
ORDER BY p.id;

\echo
\echo '== 4. Sucursales con su ciudad y sus enlaces'
SELECT su.nombre, su.direccion, ci.nombre AS ciudad, ci.provincia,
       string_agg(e.tipo, ', ' ORDER BY e.tipo) AS enlaces
FROM sucursales su
JOIN ciudades ci ON ci.id = su.ciudad_id
LEFT JOIN sucursal_enlaces e ON e.sucursal_id = su.id
GROUP BY su.id, ci.id
ORDER BY su.id;

\echo
\echo '== 5. Salas, butacas y butacas accesibles'
SELECT su.nombre AS sucursal, sa.nombre AS sala, COUNT(b.id) AS butacas,
       COUNT(b.id) FILTER (WHERE b.accesible) AS accesibles
FROM sucursales su
JOIN salas sa ON sa.sucursal_id = su.id
JOIN butacas b ON b.sala_id = sa.id
GROUP BY su.id, sa.id
ORDER BY su.id, sa.id;

\echo
\echo '== 6. Funciones por sala, con la disponibilidad que calcula la vista v_funciones'
SELECT su.nombre AS sucursal, sa.nombre AS sala, COUNT(f.id) AS funciones,
       MAX(f.capacidad) AS capacidad, COALESCE(SUM(f.vendidas), 0) AS entradas_vendidas,
       MIN(f.inicia_en) AS primera, MAX(f.inicia_en) AS ultima
FROM sucursales su
JOIN salas sa ON sa.sucursal_id = su.id
LEFT JOIN v_funciones f ON f.sala_id = sa.id
GROUP BY su.id, sa.id
ORDER BY su.id, sa.id;

\echo
\echo '== 7. Órdenes con su usuario y su total, que calcula la vista v_ordenes'
SELECT o.numero, u.correo, o.estado,
       (SELECT COUNT(*) FROM entradas e WHERE e.orden_id = o.id) AS entradas,
       (SELECT COALESCE(SUM(op.cantidad), 0) FROM orden_productos op WHERE op.orden_id = o.id) AS productos,
       o.total
FROM v_ordenes o
JOIN usuarios u ON u.id = o.usuario_id
ORDER BY o.numero;

\echo
\echo '== 8. Coherencia de los datos: cada consulta tiene que devolver 0 filas'

\echo '-- 8.1 Entradas con una butaca que no es de la sala de su función'
SELECT e.id, b.sala_id AS sala_de_la_butaca, f.sala_id AS sala_de_la_funcion
FROM entradas e
JOIN funciones f ON f.id = e.funcion_id
JOIN butacas b ON b.id = e.butaca_id
WHERE b.sala_id <> f.sala_id;

\echo '-- 8.2 Funciones de películas que todavía no se estrenaron'
SELECT f.id, p.titulo
FROM funciones f
JOIN peliculas p ON p.id = f.pelicula_id
WHERE p.estado <> 'en-cartelera';

\echo '-- 8.3 Entradas de órdenes canceladas (al cancelar se tienen que liberar las butacas)'
SELECT e.id, o.numero
FROM entradas e
JOIN ordenes o ON o.id = e.orden_id
WHERE o.estado = 'cancelada';

\echo '-- 8.4 Salas sin ninguna butaca'
SELECT sa.id, sa.nombre
FROM salas sa
WHERE NOT EXISTS (SELECT 1 FROM butacas b WHERE b.sala_id = sa.id);

\echo '-- 8.5 Películas en cartelera sin ninguna función (informativo: todavía no se cargaron)'
SELECT p.titulo, p.estado
FROM peliculas p
WHERE p.estado = 'en-cartelera' AND NOT EXISTS (SELECT 1 FROM funciones f WHERE f.pelicula_id = p.id)
ORDER BY p.id;
