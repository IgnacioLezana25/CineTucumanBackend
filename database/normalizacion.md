# Normalización de la base de datos (hasta la 3FN)

Este documento explica por qué el esquema de [`schema.sql`](schema.sql) cumple la primera, la segunda y la tercera forma normal, y qué decisiones se tomaron.

## Las tres formas normales, en una línea

| Forma normal | Qué pide | Cómo se cumple en este esquema |
|---|---|---|
| **1FN** | Cada columna guarda **un solo valor** (atómico) y no hay columnas repetidas | La butaca se guarda como fila y número por separado, y los enlaces de una sucursal están en su propia tabla en lugar de una columna por red social |
| **2FN** | Cumple la 1FN y **cada columna depende de toda la clave primaria**, no de una parte | Las tres tablas con clave compuesta (`peliculas_generos`, `sucursal_enlaces` y `orden_productos`) no tienen columnas que dependan de una sola parte de su clave. Las demás tienen clave simple, así que la cumplen sin más |
| **3FN** | Cumple la 2FN y **ninguna columna depende de otra columna que no sea la clave** (no hay dependencias transitivas) | La ciudad y la provincia no están en `sucursales`, la clasificación no está en `peliculas`, y lo que se calcula (el total de una orden y la disponibilidad de una función) no se guarda |

## Tabla por tabla

| Tabla | Clave primaria | De qué depende cada columna | Por qué cumple la 3FN |
|---|---|---|---|
| `usuarios` | `id` (y `correo`, única) | Del usuario: nombre, apellido, contraseña, rol, fecha de alta | Ninguna columna se deduce de otra que no sea la clave |
| `generos` | `id` (y `nombre`, única) | Del género: su nombre | Una sola columna además de la clave |
| `clasificaciones` | `id` (y `nombre`, única) | De la clasificación: su nombre | Una sola columna además de la clave |
| `peliculas` | `id` (y `slug`, única) | De la película: título, sinopsis, duración, estreno, póster, tráiler, director, país y estado | El nombre de la clasificación **no está acá**: solo su `clasificacion_id` |
| `peliculas_generos` | (`pelicula_id`, `genero_id`) | No tiene más columnas | Tabla de relación muchos a muchos |
| `ciudades` | `id` (y `nombre` + `provincia`) | De la ciudad: su provincia | La provincia depende de la ciudad, que es la clave de esta tabla |
| `sucursales` | `id` (y `slug`, única) | De la sucursal: nombre, calle y número, descripción, imagen | La ciudad y la provincia **no están acá**: solo su `ciudad_id` |
| `sucursal_enlaces` | (`sucursal_id`, `tipo`) | De la sucursal y el tipo: la dirección web | Depende de **toda** la clave (el enlace de Instagram de esa sucursal) |
| `salas` | `id` (y `sucursal_id` + `nombre`) | De la sala: su nombre y a qué sucursal pertenece | La cantidad de butacas se obtiene contando en `butacas` |
| `butacas` | `id` (y `sala_id` + `fila` + `numero`) | De la butaca: si es accesible | La fila y el número son valores atómicos, no un código como «B3» |
| `funciones` | `id` (y `sala_id` + `inicia_en`) | De la función: película, formato, idioma y precio | La disponibilidad **no se guarda**: se calcula en `v_funciones` |
| `productos` | `id` (y `slug`, única) | Del producto: nombre, descripción, categoría, precio y si está activo | Ninguna columna se deduce de otra |
| `ordenes` | `id` (y `numero`, única) | De la orden: usuario, estado y fecha | El total **no se guarda**: se calcula en `v_ordenes` |
| `entradas` | `id` (y `funcion_id` + `butaca_id`) | De la entrada: a qué orden pertenece y cuánto costó | Ver «El precio al momento de la compra» más abajo |
| `orden_productos` | (`orden_id`, `producto_id`) | De la orden y el producto: cantidad y precio | Depende de **toda** la clave |

## Del primer diseño a la 3FN

El primer esquema tenía cinco problemas, que se corrigieron:

| Problema | Forma normal que rompía | Cómo se resolvió |
|---|---|---|
| `sucursales` tenía `ciudad` y también una `direccion` que ya incluía la ciudad: la ciudad se podía deducir de la dirección | **3FN** (dependencia transitiva) | Tabla `ciudades`. La dirección es solo la calle y el número, y la sucursal apunta a su ciudad con `ciudad_id` |
| Los enlaces eran columnas fijas (`sitio_web` e `instagram`), y una sucursal tiene además Facebook | **1FN** (grupo repetido) | Tabla `sucursal_enlaces`, con una fila por enlace y su tipo |
| La butaca de una entrada era un código como «B3», que junta dos datos, y no existían las butacas accesibles | **1FN** (valor no atómico) | Tabla `butacas`, con fila, número y si es accesible. La entrada apunta a la butaca con `butaca_id` |
| La orden guardaba su `total` y la función su `estado`, que se calculan de otras filas | Redundancia: dos fuentes de verdad que se pueden desincronizar | Se sacaron de las tablas y se calculan en las vistas `v_ordenes` y `v_funciones` |
| La clasificación era un texto repetido en muchas películas | Anomalía de actualización: cambiar un nombre exigía tocar muchas filas | Tabla `clasificaciones` |

## Decisiones que conviene saber explicar

**Las vistas.** `v_ordenes` suma las entradas y los productos de cada orden, y `v_funciones` cuenta las butacas vendidas de cada función y dice si está disponible, con pocos lugares (80 % vendido o más) o agotada. Así el total y la disponibilidad nunca quedan desactualizados.

**El precio al momento de la compra.** `entradas.precio_unitario` y `orden_productos.precio_unitario` guardan lo que costó cuando se compró. No son una copia redundante de `funciones.precio` ni de `productos.precio`: si el precio de la función cambia mañana, la entrada ya vendida tiene que seguir mostrando lo que se pagó.

**Los valores con pocas opciones fijas** (el rol de un usuario, el estado de una película o de una orden, el formato de una función, la categoría de un producto y el tipo de enlace) se controlan con una restricción `CHECK`. Ninguno determina otra columna, así que no rompen la 3FN. En cambio, los géneros, las clasificaciones y las ciudades tienen su propia tabla porque pueden crecer y, en el caso de las ciudades, tienen un dato propio (la provincia).

**Una butaca no se vende dos veces.** La clave única (`funcion_id`, `butaca_id`) de `entradas` lo impide. Al cancelar una orden se borran sus entradas, y así las butacas quedan libres.

**El estado de una película.** `peliculas.estado` (en cartelera o próximamente) lo define el cine al programar. No se calcula solo de la fecha de estreno, porque una película estrenada puede no estar en cartelera todavía.

## Cómo comprobarlo

- `verificacion.sql` muestra las claves foráneas, el contenido de cada tabla y las consultas de coherencia, que tienen que devolver 0 filas.
- `pruebas-de-integridad.sql` intenta cargar datos inválidos y comprueba que la base los rechaza, y que las vistas calculan bien.
