-- Cine Tucumán · Pruebas de integridad de la base de datos (PostgreSQL)
--
-- Intenta cargar datos inválidos a propósito y comprueba que la base los RECHAZA, y comprueba que
-- las vistas calculan bien. Todo ocurre dentro de una transacción que se deshace al final: no deja
-- ningún cambio. Si alguna restricción no funcionara, el script se detiene con un error que dice cuál.
--
--   psql -U postgres -d cine_tucuman -v ON_ERROR_STOP=1 -f database/pruebas-de-integridad.sql

SET client_encoding = 'UTF8';
\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  -- 1. Claves únicas
  BEGIN
    INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash) VALUES ('Repetido', 'Repetido', 'admin@cinetucuman.test', 'x');
    RAISE EXCEPTION 'FALLA: dejó cargar un correo repetido';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK  1. rechaza dos usuarios con el mismo correo';
  END;

  BEGIN
    INSERT INTO funciones (pelicula_id, sala_id, inicia_en, formato, precio)
    SELECT pelicula_id, sala_id, inicia_en, formato, precio FROM funciones LIMIT 1;
    RAISE EXCEPTION 'FALLA: dejó cargar dos funciones en la misma sala y a la misma hora';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK  2. rechaza dos funciones en la misma sala y a la misma hora';
  END;

  BEGIN
    INSERT INTO entradas (orden_id, funcion_id, butaca_id, precio_unitario)
    SELECT (SELECT id FROM ordenes WHERE numero = 'CT-EJ0003'), e.funcion_id, e.butaca_id, e.precio_unitario FROM entradas e LIMIT 1;
    RAISE EXCEPTION 'FALLA: dejó vender dos veces la misma butaca de una función';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK  3. rechaza vender dos veces la misma butaca de una función';
  END;

  BEGIN
    INSERT INTO sucursal_enlaces (sucursal_id, tipo, url) SELECT sucursal_id, tipo, 'https://otra.url' FROM sucursal_enlaces LIMIT 1;
    RAISE EXCEPTION 'FALLA: dejó cargar dos enlaces del mismo tipo para una sucursal';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK  4. rechaza dos enlaces del mismo tipo para una misma sucursal';
  END;

  -- 2. Restricciones de valores
  BEGIN
    INSERT INTO usuarios (nombre, apellido, correo, contrasena_hash, rol) VALUES ('Rol', 'Raro', 'rol@cinetucuman.test', 'x', 'invitado');
    RAISE EXCEPTION 'FALLA: dejó cargar un rol inválido';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK  5. rechaza un rol que no sea cliente o admin';
  END;

  BEGIN
    INSERT INTO peliculas (slug, titulo, estado, poster_archivo) VALUES ('prueba', 'Prueba', 'cancelada', 'x.jpg');
    RAISE EXCEPTION 'FALLA: dejó cargar un estado de película inválido';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK  6. rechaza un estado de película inválido';
  END;

  BEGIN
    INSERT INTO peliculas (slug, titulo, estado, duracion_minutos, poster_archivo) VALUES ('prueba', 'Prueba', 'en-cartelera', -5, 'x.jpg');
    RAISE EXCEPTION 'FALLA: dejó cargar una duración negativa';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK  7. rechaza una duración negativa';
  END;

  BEGIN
    UPDATE funciones SET precio = 0 WHERE id = (SELECT MIN(id) FROM funciones);
    RAISE EXCEPTION 'FALLA: dejó poner un precio en cero';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK  8. rechaza un precio de cero o negativo';
  END;

  BEGIN
    INSERT INTO butacas (sala_id, fila, numero) VALUES ((SELECT MIN(id) FROM salas), 'b', 9);
    RAISE EXCEPTION 'FALLA: dejó cargar una fila de butaca que no es una letra mayúscula';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK  9. rechaza una fila de butaca que no sea una letra mayúscula';
  END;

  BEGIN
    INSERT INTO butacas (sala_id, fila, numero) VALUES ((SELECT MIN(id) FROM salas), 'G', 0);
    RAISE EXCEPTION 'FALLA: dejó cargar un número de butaca en cero';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK 10. rechaza un número de butaca en cero o negativo';
  END;

  BEGIN
    INSERT INTO sucursal_enlaces (sucursal_id, tipo, url) VALUES ((SELECT MIN(id) FROM sucursales), 'tiktok', 'https://x.com');
    RAISE EXCEPTION 'FALLA: dejó cargar un tipo de enlace inválido';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK 11. rechaza un tipo de enlace que no sea sitio, instagram o facebook';
  END;

  BEGIN
    INSERT INTO orden_productos (orden_id, producto_id, cantidad, precio_unitario)
    SELECT (SELECT MIN(id) FROM ordenes), (SELECT MAX(id) FROM productos), 11, 100;
    RAISE EXCEPTION 'FALLA: dejó pedir más de 10 unidades de un producto';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK 12. rechaza más de 10 unidades de un producto';
  END;

  -- 3. Claves foráneas
  BEGIN
    INSERT INTO funciones (pelicula_id, sala_id, inicia_en, formato, precio)
    VALUES (999999, (SELECT MIN(id) FROM salas), now() + interval '30 days', '2D', 8500);
    RAISE EXCEPTION 'FALLA: dejó cargar una función de una película que no existe';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK 13. rechaza una función de una película que no existe';
  END;

  BEGIN
    DELETE FROM usuarios WHERE correo = 'juan.decima@cinetucuman.test';
    RAISE EXCEPTION 'FALLA: dejó borrar un usuario que tiene órdenes';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK 14. rechaza borrar un usuario que tiene órdenes (RESTRICT)';
  END;

  BEGIN
    DELETE FROM generos WHERE nombre = 'Acción';
    RAISE EXCEPTION 'FALLA: dejó borrar un género que usa una película';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK 15. rechaza borrar un género que usa una película (RESTRICT)';
  END;

  BEGIN
    DELETE FROM clasificaciones WHERE nombre = 'ATP';
    RAISE EXCEPTION 'FALLA: dejó borrar una clasificación que usa una película';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK 16. rechaza borrar una clasificación que usa una película (RESTRICT)';
  END;

  BEGIN
    DELETE FROM ciudades WHERE nombre = 'Yerba Buena';
    RAISE EXCEPTION 'FALLA: dejó borrar una ciudad que tiene sucursales';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK 17. rechaza borrar una ciudad que tiene sucursales (RESTRICT)';
  END;
END
$$;

-- 4. El borrado en cascada: al borrar una orden se borran sus entradas y sus productos
DO $$
DECLARE
  antes_entradas INT; despues_entradas INT; antes_prod INT; despues_prod INT;
BEGIN
  SELECT COUNT(*) INTO antes_entradas FROM entradas;
  SELECT COUNT(*) INTO antes_prod FROM orden_productos;
  DELETE FROM ordenes WHERE numero = 'CT-EJ0002';
  SELECT COUNT(*) INTO despues_entradas FROM entradas;
  SELECT COUNT(*) INTO despues_prod FROM orden_productos;
  IF antes_entradas - despues_entradas = 3 AND antes_prod - despues_prod = 2 THEN
    RAISE NOTICE 'OK 18. al borrar una orden se borran en cascada sus 3 entradas y sus 2 productos';
  ELSE
    RAISE EXCEPTION 'FALLA: el borrado en cascada no borró lo esperado (% entradas, % productos)', antes_entradas - despues_entradas, antes_prod - despues_prod;
  END IF;
END
$$;

-- 5. Las vistas calculan bien lo que no se guarda en las tablas
DO $$
DECLARE
  total_orden NUMERIC; estado_funcion TEXT; funcion INT; orden INT;
BEGIN
  -- La orden CT-EJ0001 tiene 2 entradas de 8500 y 1 combo de 6000: 23000
  SELECT total INTO total_orden FROM v_ordenes WHERE numero = 'CT-EJ0001';
  IF total_orden = 23000 THEN
    RAISE NOTICE 'OK 19. v_ordenes calcula el total de una orden (2 entradas + 1 combo = %)', total_orden;
  ELSE
    RAISE EXCEPTION 'FALLA: v_ordenes calculó % y tenía que ser 23000', total_orden;
  END IF;

  -- Se venden butacas de una función sin ventas, de a una cantidad, y se mira qué dice la vista
  SELECT id INTO funcion FROM funciones
  WHERE pelicula_id = (SELECT id FROM peliculas WHERE slug = 'spider-man-un-nuevo-dia')
  ORDER BY inicia_en DESC LIMIT 1;
  INSERT INTO ordenes (numero, usuario_id, estado)
  VALUES ('CT-PRUEBA', (SELECT id FROM usuarios WHERE rol = 'admin'), 'pagada') RETURNING id INTO orden;

  INSERT INTO entradas (orden_id, funcion_id, butaca_id, precio_unitario)
  SELECT orden, funcion, b.id, 8500 FROM butacas b WHERE b.sala_id = (SELECT sala_id FROM funciones WHERE id = funcion)
  ORDER BY b.fila, b.numero LIMIT 38;
  SELECT estado INTO estado_funcion FROM v_funciones WHERE id = funcion;
  IF estado_funcion <> 'disponible' THEN RAISE EXCEPTION 'FALLA: con 38 de 48 butacas vendidas tenía que decir disponible y dice %', estado_funcion; END IF;

  INSERT INTO entradas (orden_id, funcion_id, butaca_id, precio_unitario)
  SELECT orden, funcion, b.id, 8500 FROM butacas b WHERE b.sala_id = (SELECT sala_id FROM funciones WHERE id = funcion)
  ORDER BY b.fila, b.numero OFFSET 38 LIMIT 1;
  SELECT estado INTO estado_funcion FROM v_funciones WHERE id = funcion;
  IF estado_funcion <> 'pocos-lugares' THEN RAISE EXCEPTION 'FALLA: con 39 de 48 butacas vendidas tenía que decir pocos-lugares y dice %', estado_funcion; END IF;

  INSERT INTO entradas (orden_id, funcion_id, butaca_id, precio_unitario)
  SELECT orden, funcion, b.id, 8500 FROM butacas b WHERE b.sala_id = (SELECT sala_id FROM funciones WHERE id = funcion)
  ORDER BY b.fila, b.numero OFFSET 39;
  SELECT estado INTO estado_funcion FROM v_funciones WHERE id = funcion;
  IF estado_funcion <> 'agotada' THEN RAISE EXCEPTION 'FALLA: con las 48 butacas vendidas tenía que decir agotada y dice %', estado_funcion; END IF;
  RAISE NOTICE 'OK 20. v_funciones pasa de disponible (38 vendidas) a pocos-lugares (39) y a agotada (48)';
END
$$;

ROLLBACK;

\echo
\echo 'Las 20 pruebas pasaron y se deshizo todo: la base quedó como estaba.'
