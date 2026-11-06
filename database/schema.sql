-- Cine Tucumán · Esquema de la base de datos (PostgreSQL), normalizado hasta la 3FN
--
-- Crea las 15 tablas con sus tipos, claves primarias, claves foráneas y restricciones, y dos
-- vistas para lo que se calcula (el total de una orden y la disponibilidad de una función).
-- La explicación de la normalización está en database/normalizacion.md.
--
-- Se ejecuta sobre la base cine_tucuman (ver 00-crear-base.sql):
--
--   psql -U postgres -d cine_tucuman -f database/schema.sql
--
-- Atención: al empezar BORRA las tablas si ya existen, así se puede volver a correr
-- para empezar de cero. Usarlo solo en la base de desarrollo.

SET client_encoding = 'UTF8';

BEGIN;

DROP TABLE IF EXISTS orden_productos, entradas, ordenes, productos, funciones, butacas, salas,
  sucursal_enlaces, sucursales, ciudades, peliculas_generos, peliculas, clasificaciones, generos,
  usuarios CASCADE;

-- ---------------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre          VARCHAR(60)  NOT NULL,
  apellido        VARCHAR(60)  NOT NULL,
  correo          VARCHAR(120) NOT NULL,
  contrasena_hash VARCHAR(100) NOT NULL,
  rol             VARCHAR(10)  NOT NULL DEFAULT 'cliente',
  creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_correo_key UNIQUE (correo),
  CONSTRAINT usuarios_rol_check CHECK (rol IN ('cliente', 'admin'))
);

-- ---------------------------------------------------------------------------
-- Películas, géneros y clasificaciones
-- ---------------------------------------------------------------------------
CREATE TABLE generos (
  id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  CONSTRAINT generos_nombre_key UNIQUE (nombre)
);

CREATE TABLE clasificaciones (
  id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  CONSTRAINT clasificaciones_nombre_key UNIQUE (nombre)
);

CREATE TABLE peliculas (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug             VARCHAR(80)  NOT NULL,
  titulo           VARCHAR(150) NOT NULL,
  titulo_original  VARCHAR(150),
  sinopsis         TEXT,
  duracion_minutos SMALLINT,
  clasificacion_id INTEGER,
  estado           VARCHAR(15)  NOT NULL,
  destacada        BOOLEAN      NOT NULL DEFAULT FALSE,
  fecha_estreno    DATE,
  poster_archivo   VARCHAR(120) NOT NULL,
  trailer_youtube  VARCHAR(20),
  director         VARCHAR(100),
  pais_origen      VARCHAR(60),
  CONSTRAINT peliculas_slug_key UNIQUE (slug),
  CONSTRAINT peliculas_clasificacion_fkey FOREIGN KEY (clasificacion_id)
    REFERENCES clasificaciones (id) ON DELETE RESTRICT,
  CONSTRAINT peliculas_estado_check CHECK (estado IN ('en-cartelera', 'proximamente')),
  CONSTRAINT peliculas_duracion_check CHECK (duracion_minutos IS NULL OR duracion_minutos > 0)
);

-- Relación muchos a muchos: una película tiene varios géneros y un género, varias películas.
CREATE TABLE peliculas_generos (
  pelicula_id INTEGER NOT NULL,
  genero_id   INTEGER NOT NULL,
  PRIMARY KEY (pelicula_id, genero_id),
  CONSTRAINT peliculas_generos_pelicula_fkey FOREIGN KEY (pelicula_id)
    REFERENCES peliculas (id) ON DELETE CASCADE,
  CONSTRAINT peliculas_generos_genero_fkey FOREIGN KEY (genero_id)
    REFERENCES generos (id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------------
-- Ciudades, sucursales y sus enlaces
-- ---------------------------------------------------------------------------
CREATE TABLE ciudades (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre    VARCHAR(60) NOT NULL,
  provincia VARCHAR(60) NOT NULL DEFAULT 'Tucumán',
  CONSTRAINT ciudades_nombre_provincia_key UNIQUE (nombre, provincia)
);

-- La dirección es solo la calle y el número: la ciudad y la provincia salen de ciudades.
CREATE TABLE sucursales (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           VARCHAR(60)  NOT NULL,
  nombre         VARCHAR(80)  NOT NULL,
  ciudad_id      INTEGER      NOT NULL,
  direccion      VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  imagen_archivo VARCHAR(120),
  destacada      BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT sucursales_slug_key UNIQUE (slug),
  CONSTRAINT sucursales_ciudad_fkey FOREIGN KEY (ciudad_id)
    REFERENCES ciudades (id) ON DELETE RESTRICT
);

-- Una sucursal puede tener un enlace de cada tipo (en lugar de una columna por red social).
CREATE TABLE sucursal_enlaces (
  sucursal_id INTEGER      NOT NULL,
  tipo        VARCHAR(10)  NOT NULL,
  url         VARCHAR(200) NOT NULL,
  PRIMARY KEY (sucursal_id, tipo),
  CONSTRAINT sucursal_enlaces_sucursal_fkey FOREIGN KEY (sucursal_id)
    REFERENCES sucursales (id) ON DELETE CASCADE,
  CONSTRAINT sucursal_enlaces_tipo_check CHECK (tipo IN ('sitio', 'instagram', 'facebook'))
);

-- ---------------------------------------------------------------------------
-- Salas y butacas
-- ---------------------------------------------------------------------------
CREATE TABLE salas (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sucursal_id INTEGER     NOT NULL,
  nombre      VARCHAR(30) NOT NULL,
  CONSTRAINT salas_sucursal_nombre_key UNIQUE (sucursal_id, nombre),
  CONSTRAINT salas_sucursal_fkey FOREIGN KEY (sucursal_id)
    REFERENCES sucursales (id) ON DELETE CASCADE
);

-- Cada butaca de cada sala es una fila. La fila y el número van separados (valores atómicos).
CREATE TABLE butacas (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sala_id   INTEGER  NOT NULL,
  fila      CHAR(1)  NOT NULL,
  numero    SMALLINT NOT NULL,
  accesible BOOLEAN  NOT NULL DEFAULT FALSE,
  CONSTRAINT butacas_sala_fila_numero_key UNIQUE (sala_id, fila, numero),
  CONSTRAINT butacas_sala_fkey FOREIGN KEY (sala_id)
    REFERENCES salas (id) ON DELETE CASCADE,
  CONSTRAINT butacas_fila_check CHECK (fila ~ '^[A-Z]$'),
  CONSTRAINT butacas_numero_check CHECK (numero > 0)
);

-- ---------------------------------------------------------------------------
-- Funciones (una película, en una sala, a una hora)
-- ---------------------------------------------------------------------------
CREATE TABLE funciones (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pelicula_id INTEGER       NOT NULL,
  sala_id     INTEGER       NOT NULL,
  inicia_en   TIMESTAMPTZ   NOT NULL,
  formato     VARCHAR(2)    NOT NULL,
  idioma      VARCHAR(30)   NOT NULL DEFAULT 'Castellano',
  precio      NUMERIC(10,2) NOT NULL,
  CONSTRAINT funciones_sala_inicio_key UNIQUE (sala_id, inicia_en),
  CONSTRAINT funciones_pelicula_fkey FOREIGN KEY (pelicula_id)
    REFERENCES peliculas (id) ON DELETE RESTRICT,
  CONSTRAINT funciones_sala_fkey FOREIGN KEY (sala_id)
    REFERENCES salas (id) ON DELETE RESTRICT,
  CONSTRAINT funciones_formato_check CHECK (formato IN ('2D', '3D')),
  CONSTRAINT funciones_precio_check CHECK (precio > 0)
);

-- ---------------------------------------------------------------------------
-- Candy Bar
-- ---------------------------------------------------------------------------
CREATE TABLE productos (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        VARCHAR(60)   NOT NULL,
  nombre      VARCHAR(80)   NOT NULL,
  descripcion VARCHAR(200),
  categoria   VARCHAR(10)   NOT NULL,
  precio      NUMERIC(10,2) NOT NULL,
  activo      BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT productos_slug_key UNIQUE (slug),
  CONSTRAINT productos_categoria_check CHECK (categoria IN ('combo', 'snack', 'bebida')),
  CONSTRAINT productos_precio_check CHECK (precio > 0)
);

-- ---------------------------------------------------------------------------
-- Compras: una orden agrupa las entradas y los productos de una compra.
-- El total NO se guarda: se calcula en la vista v_ordenes.
-- ---------------------------------------------------------------------------
CREATE TABLE ordenes (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero     VARCHAR(20) NOT NULL,
  usuario_id INTEGER     NOT NULL,
  estado     VARCHAR(10) NOT NULL DEFAULT 'pendiente',
  creada_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ordenes_numero_key UNIQUE (numero),
  CONSTRAINT ordenes_usuario_fkey FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT ordenes_estado_check CHECK (estado IN ('pendiente', 'pagada', 'cancelada'))
);

-- Una butaca de una función no se puede vender dos veces (clave única compuesta).
-- precio_unitario es el precio al momento de la compra: puede cambiar después en funciones.
-- Al cancelar una orden se borran sus entradas, y así las butacas quedan libres.
CREATE TABLE entradas (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_id        INTEGER       NOT NULL,
  funcion_id      INTEGER       NOT NULL,
  butaca_id       INTEGER       NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  CONSTRAINT entradas_funcion_butaca_key UNIQUE (funcion_id, butaca_id),
  CONSTRAINT entradas_orden_fkey FOREIGN KEY (orden_id)
    REFERENCES ordenes (id) ON DELETE CASCADE,
  CONSTRAINT entradas_funcion_fkey FOREIGN KEY (funcion_id)
    REFERENCES funciones (id) ON DELETE RESTRICT,
  CONSTRAINT entradas_butaca_fkey FOREIGN KEY (butaca_id)
    REFERENCES butacas (id) ON DELETE RESTRICT,
  CONSTRAINT entradas_precio_check CHECK (precio_unitario > 0)
);

CREATE TABLE orden_productos (
  orden_id        INTEGER       NOT NULL,
  producto_id     INTEGER       NOT NULL,
  cantidad        SMALLINT      NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (orden_id, producto_id),
  CONSTRAINT orden_productos_orden_fkey FOREIGN KEY (orden_id)
    REFERENCES ordenes (id) ON DELETE CASCADE,
  CONSTRAINT orden_productos_producto_fkey FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE RESTRICT,
  CONSTRAINT orden_productos_cantidad_check CHECK (cantidad BETWEEN 1 AND 10),
  CONSTRAINT orden_productos_precio_check CHECK (precio_unitario > 0)
);

-- ---------------------------------------------------------------------------
-- Índices sobre las claves foráneas (PostgreSQL no los crea solo)
-- ---------------------------------------------------------------------------
CREATE INDEX peliculas_clasificacion_idx ON peliculas (clasificacion_id);
CREATE INDEX peliculas_generos_genero_idx ON peliculas_generos (genero_id);
CREATE INDEX sucursales_ciudad_idx ON sucursales (ciudad_id);
CREATE INDEX funciones_pelicula_idx ON funciones (pelicula_id, inicia_en);
CREATE INDEX ordenes_usuario_idx ON ordenes (usuario_id);
CREATE INDEX entradas_orden_idx ON entradas (orden_id);
CREATE INDEX entradas_butaca_idx ON entradas (butaca_id);
CREATE INDEX orden_productos_producto_idx ON orden_productos (producto_id);

-- ---------------------------------------------------------------------------
-- Vistas: lo que se calcula no se guarda en las tablas
-- ---------------------------------------------------------------------------

-- Cada orden con su total: la suma de sus entradas y de sus productos.
CREATE VIEW v_ordenes AS
SELECT o.id, o.numero, o.usuario_id, o.estado, o.creada_en,
       COALESCE(e.subtotal, 0) + COALESCE(p.subtotal, 0) AS total
FROM ordenes o
LEFT JOIN (SELECT orden_id, SUM(precio_unitario) AS subtotal
           FROM entradas GROUP BY orden_id) e ON e.orden_id = o.id
LEFT JOIN (SELECT orden_id, SUM(cantidad * precio_unitario) AS subtotal
           FROM orden_productos GROUP BY orden_id) p ON p.orden_id = o.id;

-- Cada función con su capacidad, sus entradas vendidas y su disponibilidad:
-- agotada si no queda ninguna butaca y pocos lugares si se vendió el 80 % o más.
CREATE VIEW v_funciones AS
SELECT f.id, f.pelicula_id, f.sala_id, f.inicia_en, f.formato, f.idioma, f.precio,
       c.capacidad,
       COALESCE(v.vendidas, 0) AS vendidas,
       CASE WHEN COALESCE(v.vendidas, 0) >= c.capacidad THEN 'agotada'
            WHEN COALESCE(v.vendidas, 0) >= c.capacidad * 0.8 THEN 'pocos-lugares'
            ELSE 'disponible'
       END AS estado
FROM funciones f
JOIN (SELECT sala_id, COUNT(*) AS capacidad FROM butacas GROUP BY sala_id) c ON c.sala_id = f.sala_id
LEFT JOIN (SELECT funcion_id, COUNT(*) AS vendidas FROM entradas GROUP BY funcion_id) v ON v.funcion_id = f.id;

-- ---------------------------------------------------------------------------
-- Descripción de cada tabla (se ve con \dt+ en psql)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE usuarios          IS 'Personas que se registran en el sitio';
COMMENT ON TABLE generos           IS 'Géneros cinematográficos';
COMMENT ON TABLE clasificaciones   IS 'Clasificaciones por edad de las películas';
COMMENT ON TABLE peliculas         IS 'Cartelera y próximos estrenos';
COMMENT ON TABLE peliculas_generos IS 'Relación muchos a muchos entre películas y géneros';
COMMENT ON TABLE ciudades          IS 'Ciudades donde hay sucursales';
COMMENT ON TABLE sucursales        IS 'Cines de Tucumán';
COMMENT ON TABLE sucursal_enlaces  IS 'Enlaces de cada sucursal: sitio, Instagram o Facebook';
COMMENT ON TABLE salas             IS 'Salas de cada sucursal';
COMMENT ON TABLE butacas           IS 'Cada butaca de cada sala, con su fila, su número y si es accesible';
COMMENT ON TABLE funciones         IS 'Una película proyectada en una sala a una hora';
COMMENT ON TABLE productos         IS 'Productos del Candy Bar';
COMMENT ON TABLE ordenes           IS 'Compras: agrupan las entradas y los productos de una persona';
COMMENT ON TABLE entradas          IS 'Una butaca de una función dentro de una orden';
COMMENT ON TABLE orden_productos   IS 'Productos del Candy Bar de una orden, con su cantidad';
COMMENT ON VIEW v_ordenes          IS 'Órdenes con su total calculado';
COMMENT ON VIEW v_funciones        IS 'Funciones con su capacidad, entradas vendidas y disponibilidad calculadas';

COMMIT;
