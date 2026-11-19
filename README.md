# Cine Tucumán · API

API del proyecto Cine Tucumán, hecha con [NestJS](https://nestjs.com/). Reemplaza los datos locales del frontend: toda la información vive en una base de datos PostgreSQL y se expone desde acá.

## Integrantes

- Molina Lazaro
- Lezana Juan Ignacio
- Almaraz Sintora Nahuel
- Decima Juan Cruz

**Materia:** Programación IV · **Año:** 2026

## Tecnologías

- NestJS 12 y TypeScript, con módulos ES.
- PostgreSQL como base de datos relacional, normalizada hasta la 3FN.
- `class-validator` y `class-transformer` para validar los datos que llegan en las peticiones.
- Prisma 7.10.1 (`prisma`, `@prisma/client` y el adaptador `@prisma/adapter-pg`) para conectar la API con la base de datos.
- `@nestjs/config` para las variables de entorno.
- `@nestjs/jwt` para firmar y verificar los tokens de acceso y `bcrypt` para cifrar las contraseñas.
- Vitest para las pruebas y oxlint para el análisis del código.
- Postman para probar y documentar las rutas.

## Cómo ejecutarlo

Se necesita **Node.js 22** o superior y **npm 12** o superior (con npm 10 la instalación falla con el error `Cannot read properties of null (reading 'edgesOut')`; se actualiza con `npm install -g npm@12`).

```
git clone https://github.com/<usuario>/CineTucumanBackend.git
cd CineTucumanBackend
npm install
npm run start:dev
```

`npm install` (y `npm ci`) también ejecuta `prisma generate`, que crea el cliente de Prisma en `src/generated/prisma` (esa carpeta no se sube a GitHub). Antes de levantar el servidor hay que crear la base de datos (sección *Base de datos*) y el archivo `.env` (ver la sección siguiente). La API queda escuchando en el puerto que diga ese archivo y lo avisa al arrancar.

| Comando | Para qué |
|---|---|
| `npm run start:dev` | Servidor de desarrollo, que se reinicia al guardar |
| `npm run start` | Servidor sin recarga automática |
| `npm run build` | Compila a `dist/` |
| `npm run start:prod` | Ejecuta lo compilado |
| `npm run lint` | Revisión del código |
| `npm test` | Pruebas unitarias |
| `npm run test:e2e` | Pruebas de punta a punta |

## Variables de entorno

Se guardan en un archivo `.env` en la raíz del proyecto, que **no se sube a GitHub**: figura en el `.gitignore`. El repositorio no incluye ningún archivo con credenciales, ni siquiera de ejemplo. Hay que crearlo a mano con este contenido (con el usuario y la contraseña de tu PostgreSQL):

```
PORT=4000
DATABASE_URL=postgresql://usuario:password@localhost:5432/cine_tucuman
API_BASE_URL=http://localhost:4000/
FRONTEND_URL=http://localhost:5173
JWT_SECRET=una-frase-larga-y-secreta-de-al-menos-32-caracteres
JWT_EXPIRES_IN=1h
```

| Variable | Qué guarda |
|---|---|
| `PORT` | El puerto donde escucha la API (si falta, usa el 4000) |
| `DATABASE_URL` | La conexión a la base de datos PostgreSQL: usuario, contraseña, servidor, puerto y nombre |
| `API_BASE_URL` | La dirección base de la API: se muestra al arrancar y se usa para armar la dirección completa de los pósters |
| `FRONTEND_URL` | Desde dónde se permite llamar a la API (CORS). Si falta, usa `http://localhost:5173`. Admite varias direcciones separadas por coma |
| `JWT_SECRET` | **Obligatoria.** El secreto con el que se firman los tokens de acceso, de **al menos 32 caracteres**. Si falta o es más corta, la API no arranca y lo avisa. Cada integrante usa la suya y nunca se sube a GitHub |
| `JWT_EXPIRES_IN` | Cuánto dura un token: `1h`, `30m`, `7d` o una cantidad de segundos. Si falta, dura una hora |
| `UPLOADS_DIR` | Opcional. La carpeta donde se guardan las imágenes subidas desde la API. Si falta, usa `uploads` (dentro del proyecto, fuera de Git) |

Una forma de generar un `JWT_SECRET` seguro: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Si la contraseña de PostgreSQL tiene símbolos, en `DATABASE_URL` hay que escribirlos codificados: `#` es `%23`, `/` es `%2F`, `?` es `%3F`, `@` es `%40`, `:` es `%3A`, `%` es `%25` y el espacio es `%20`. Si la dirección no se puede interpretar, la API no arranca y lo avisa con el mensaje «DATABASE_URL no es una URL válida».

El archivo lo lee `ConfigModule` de `@nestjs/config`, que se registra una sola vez en `AppModule` y queda disponible en todo el proyecto. Prisma lo lee por su cuenta desde `prisma.config.ts`.

## Validación de los datos

`main.ts` registra `ValidationPipe` como pipe global. Para validar lo que llega en el cuerpo de una petición se agregan decoradores de `class-validator` al dto del módulo, y Nest responde `400` con el detalle de lo que no cumple:

```ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePeliculaDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;
}
```

## Base de datos

Los scripts están en la carpeta [`database/`](database). Se necesita PostgreSQL instalado y `psql` disponible en la terminal.

En Windows, si la terminal no reconoce `psql`, se puede usar la aplicación **SQL Shell (psql)** que instala PostgreSQL, o agregar la carpeta `bin` de PostgreSQL (por ejemplo, `C:\Program Files\PostgreSQL\16\bin`) al `PATH`.

| Paso | Comando | Qué hace |
|---|---|---|
| 1 | `psql -U postgres -f database/00-crear-base.sql` | Crea la base `cine_tucuman` (una sola vez) |
| 2 | `psql -U postgres -d cine_tucuman -f database/schema.sql` | Crea las 16 tablas y las 2 vistas |
| 3 | `psql -U postgres -d cine_tucuman -f database/seed.sql` | Carga los datos de ejemplo |
| 4 | `psql -U postgres -d cine_tucuman -f database/verificacion.sql` | Comprueba que cada tabla tenga al menos 5 registros y que los datos sean coherentes |
| 5 | `psql -U postgres -d cine_tucuman -f database/pruebas-de-integridad.sql` | Intenta cargar datos inválidos a propósito y comprueba que la base los rechaza |

Para volver a empezar de cero basta con repetir los pasos 2 y 3: el esquema borra las tablas antes de crearlas. Las pruebas del paso 5 se deshacen solas y no dejan ningún cambio.

### Diagrama

```mermaid
erDiagram
    usuarios ||--o{ ordenes : "hace"
    ordenes ||--o{ entradas : "incluye"
    ordenes ||--o{ orden_productos : "incluye"
    productos ||--o{ orden_productos : "se vende en"
    funciones ||--o{ entradas : "se reserva en"
    butacas ||--o{ entradas : "se ocupa en"
    peliculas ||--o{ funciones : "se proyecta"
    salas ||--o{ funciones : "aloja"
    salas ||--o{ butacas : "tiene"
    sucursales ||--o{ salas : "tiene"
    ciudades ||--o{ sucursales : "ubica"
    sucursales ||--o{ sucursal_enlaces : "publica"
    clasificaciones |o--o{ peliculas : "clasifica"
    peliculas ||--o{ pelicula_reparto : "presenta"
    peliculas ||--o{ peliculas_generos : " "
    generos ||--o{ peliculas_generos : " "

    usuarios {
        int id PK
        string correo UK
        string rol
    }
    ordenes {
        int id PK
        string numero UK
        int usuario_id FK
        string estado
    }
    entradas {
        int id PK
        int orden_id FK
        int funcion_id FK
        int butaca_id FK
        numeric precio_unitario
    }
    orden_productos {
        int orden_id PK, FK
        int producto_id PK, FK
        int cantidad
    }
    productos {
        int id PK
        string slug UK
        string nombre
        numeric precio
    }
    funciones {
        int id PK
        int pelicula_id FK
        int sala_id FK
        timestamptz inicia_en
        string formato
        numeric precio
    }
    butacas {
        int id PK
        int sala_id FK
        string fila
        int numero
        boolean accesible
    }
    salas {
        int id PK
        int sucursal_id FK
        string nombre
    }
    sucursales {
        int id PK
        string slug UK
        int ciudad_id FK
        string direccion
        string referencia
    }
    ciudades {
        int id PK
        string nombre
        string provincia
    }
    sucursal_enlaces {
        int sucursal_id PK, FK
        string tipo PK
        string url
    }
    peliculas {
        int id PK
        string slug UK
        string titulo
        int clasificacion_id FK
        string estado
    }
    clasificaciones {
        int id PK
        string nombre UK
    }
    pelicula_reparto {
        int pelicula_id PK, FK
        int orden PK
        string nombre
        string foto_archivo
    }
    peliculas_generos {
        int pelicula_id PK, FK
        int genero_id PK, FK
    }
    generos {
        int id PK
        string nombre UK
    }
```

### Normalización

La base está normalizada hasta la **tercera forma normal (3FN)**. [`database/normalizacion.md`](database/normalizacion.md) lo explica tabla por tabla. En resumen:

- **1FN:** todas las columnas guardan un solo valor. La butaca se guarda como fila y número por separado, y los enlaces de una sucursal tienen su propia tabla en lugar de una columna por red social.
- **2FN:** las tablas con clave compuesta (`peliculas_generos`, `pelicula_reparto`, `sucursal_enlaces` y `orden_productos`) no tienen columnas que dependan de una sola parte de su clave.
- **3FN:** ninguna columna depende de otra que no sea la clave. La ciudad y la provincia están en `ciudades`, la clasificación en `clasificaciones` y los géneros en `generos`, y lo que se calcula no se guarda: el total de una orden y la disponibilidad de una función salen de las vistas `v_ordenes` y `v_funciones`.

### Tablas

| Tabla | Para qué sirve | Registros de ejemplo |
|---|---|---|
| `usuarios` | Personas registradas, con correo único y rol (`cliente` o `admin`) | 5 |
| `generos` | Géneros cinematográficos | 5 |
| `clasificaciones` | Clasificaciones por edad | 5 |
| `peliculas` | Cartelera y próximos estrenos | 20 |
| `peliculas_generos` | Relación muchos a muchos entre películas y géneros | 6 |
| `pelicula_reparto` | Actores de cada película, en el orden en que se muestran, con su foto | 6 |
| `ciudades` | Ciudades donde hay sucursales | 5 |
| `sucursales` | Los cines de Tucumán | 5 |
| `sucursal_enlaces` | Sitio, Instagram o Facebook de cada sucursal | 9 |
| `salas` | Salas de cada sucursal | 10 |
| `butacas` | Cada butaca de cada sala, con su fila, su número y si es accesible | 480 |
| `funciones` | Una película en una sala a una hora; no se repite sala y horario | 54 |
| `productos` | Productos del Candy Bar | 6 |
| `ordenes` | Compras de un usuario, con su estado | 5 |
| `entradas` | Una butaca de una función dentro de una orden; no se vende dos veces | 9 |
| `orden_productos` | Productos del Candy Bar de cada orden, con su cantidad | 7 |

Las películas (con el reparto de Spider-Man), las sucursales con sus enlaces y su referencia, y el Candy Bar salen del frontend. Lo que el sitio todavía no tiene (por ejemplo, la duración de la mayoría de las películas) queda vacío, igual que el sitio muestra «Por confirmar». Los usuarios, las salas, las funciones y las órdenes son de ejemplo. La contraseña de todos los usuarios de ejemplo es `Prueba123!` y se guarda cifrada con bcrypt.

## Conexión con Prisma

Prisma es la capa que usan los services para leer y escribir en PostgreSQL. La API se conecta con el adaptador `@prisma/adapter-pg` y la dirección de la base sale de `DATABASE_URL`.

| Archivo | Qué hace |
|---|---|
| `prisma/schema.prisma` | Describe las 16 tablas como modelos de Prisma. Los nombres de los modelos van en singular (`Pelicula`) y `@@map` y `@map` los enlazan con las tablas y columnas reales (`peliculas`, `poster_archivo`) |
| `prisma.config.ts` | Le dice a la herramienta de Prisma dónde está el esquema y de dónde sacar `DATABASE_URL` |
| `prisma/migrations/0_init/` | Migración inicial: es el SQL de `database/schema.sql` sin el borrado de tablas |
| `prisma/migrations/1_…` y `2_…` | Cambios posteriores a `0_init`: la referencia de las sucursales y el reparto de las películas. Sirven para actualizar una base que ya existe |
| `src/modules/prisma/` | `PrismaService` (se conecta al arrancar y se desconecta al cerrar) y `PrismaModule`, que es global: cualquier service puede recibir `PrismaService` sin importar el módulo |
| `src/generated/prisma/` | El cliente que genera Prisma. No se sube a GitHub: se crea con `npm install` o con `npx prisma generate` |

**La base se crea con los scripts SQL** (pasos 1 a 3 de la sección anterior), porque así quedan también las restricciones `CHECK` y las vistas `v_ordenes` y `v_funciones`, que Prisma no genera. Por eso el esquema de Prisma está escrito a mano a partir de esas tablas, y la migración `0_init` es una línea de base: marca el estado en el que ya está la base.

Si se quiere que Prisma registre esa migración como ya aplicada (opcional: la API funciona igual sin hacerlo), con la base ya creada:

```
npx prisma migrate resolve --applied 0_init
```

**Si la base ya existía** (se creó antes de que se agregaran la referencia de las sucursales y el reparto de las películas), no hace falta borrarla: alcanza con ejecutar, en orden, las dos migraciones. Son SQL común, no borran nada y se pueden correr más de una vez:

```
psql -U postgres -d cine_tucuman -f prisma/migrations/1_referencia_en_sucursales/migration.sql
psql -U postgres -d cine_tucuman -f prisma/migrations/2_reparto_de_peliculas/migration.sql
```

Una base nueva, creada con `schema.sql` y `seed.sql`, ya los trae.

Si se cambia `prisma/schema.prisma`, hay que volver a ejecutar `npx prisma generate`. Para comprobar que el esquema no tiene errores: `npx prisma validate`.

## Estructura del proyecto

```
database/            Scripts SQL (crear la base, esquema, datos, verificación y pruebas) y la normalización
docs/postman/        Colección y entorno de Postman
prisma/              Esquema de Prisma y migraciones
prisma.config.ts     Configuración de la herramienta de Prisma
public/imagenes/     Archivos que la API sirve por URL (pósters de películas, fotos del reparto y fotos de sucursales)
uploads/             Imágenes subidas desde la API (no se sube a GitHub); se sirven por la misma URL que las de arriba
src/
  main.ts            Punto de entrada: crea la aplicación, activa la validación y el CORS, sirve las imágenes y la pone a escuchar
  modules/           Todos los módulos del proyecto
    app/             Módulo raíz: reúne a los demás
    prisma/          Conexión con la base de datos (global)
    catalogos/       Géneros, clasificaciones y ciudades (solo lectura)
    comunes/         Utilidades compartidas, como armar la URL pública de una imagen o pasar un instante a la fecha y la hora de Tucumán
    auth/            Registro, inicio de sesión, tokens JWT y guards de acceso
    imagenes/        Guardado y borrado de las imágenes que se suben
    users/           Usuarios
    peliculas/       Películas
    funciones/       Funciones
    sucursales/      Sucursales
    productos/       Productos del Candy Bar
    ordenes/         Órdenes de compra
```

Cada módulo se creó con `npx nest g resource modules/<nombre>` y tiene su controlador, su servicio, su módulo y las carpetas `dto/` y `entities/`. **Cada módulo nuevo hay que importarlo en la propiedad `imports` de `AppModule`** (`src/modules/app/app.module.ts`); el generador de Nest no lo hace solo porque ese archivo no está en la raíz de `src`.

## Módulos y rutas

Los módulos de datos tienen las cinco rutas que genera Nest, con su nombre como prefijo: `GET /<módulo>`, `GET /<módulo>/:id`, `POST /<módulo>`, `PATCH /<módulo>/:id` y `DELETE /<módulo>/:id`. Además, `GET /` devuelve un saludo.

| Módulo | Prefijo | Estado |
|---|---|---|
| `auth` | `/auth` | Registro, inicio de sesión y perfil, con JWT y bcrypt |
| `users` | `/users` | Conectado con la base de datos mediante Prisma, con permisos por rol |
| `peliculas` | `/peliculas` | Conectado con la base de datos mediante Prisma |
| `funciones` | `/funciones` | Conectado con la base de datos mediante Prisma |
| `sucursales` | `/sucursales` | Conectado con la base de datos mediante Prisma |
| `productos` | `/productos` | Conectado con la base de datos mediante Prisma |
| `catalogos` | `/catalogos` | Solo lectura, con Prisma (géneros, clasificaciones, ciudades y salas) |
| `ordenes` | `/ordenes` | Compras de entradas y Candy Bar, con el precio calculado por el servidor y permisos por rol |

Todos los módulos leen y escriben en la base de datos.

### Películas

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /peliculas` | Lista las películas. Filtros opcionales: `estado` (`en-cartelera` o `proximamente`), `destacada` (`true` o `false`) y `q` (texto dentro del título) | 200; 400 si un filtro no es válido |
| `GET /peliculas/:id` | Una película por su número | 200; 400 si `:id` no es un número; 404 si no existe |
| `GET /peliculas/slug/:slug` | Una película por su `slug`, como el que usa el sitio en la dirección (`/peliculas/toy-story-5`) | 200; 404 si no existe |
| `POST /peliculas` | Crea una película con `CreatePeliculaDto`, con su reparto opcional (hasta 30 actores, sin nombres repetidos) | 201; 400 si falta un dato, un dato no es válido o la clasificación o un género no existen; 409 si el `slug` ya existe; 401 sin token; 403 si no es administrador |
| `PATCH /peliculas/:id` | Modifica solo los campos que se envían. Si se envía `generoIds`, reemplaza todos los géneros; con `[]` los quita. Con `reparto` pasa lo mismo con los actores. Con `null` se vacían los campos opcionales | 200; 400; 404; 409; 401 sin token; 403 si no es administrador |
| `DELETE /peliculas/:id` | Elimina la película y devuelve lo que eliminó | 200; 404; 409 si tiene funciones; 401 sin token; 403 si no es administrador |
| `POST /peliculas/:id/poster` | Reemplaza el póster de la película con la imagen enviada (ver *Imágenes*) | 200 con la película; 400 si falta el archivo o no es una imagen válida; 401; 403; 404; 413 si pesa más de 5 MB |

Cada película se devuelve así:

```json
{
  "id": 3,
  "slug": "spider-man-un-nuevo-dia",
  "titulo": "Spider-Man: Un nuevo día",
  "tituloOriginal": "Spider-Man: Brand New Day",
  "sinopsis": "…",
  "duracionMinutos": 150,
  "clasificacionId": 5,
  "clasificacion": "Supervisión parental sugerida",
  "estado": "en-cartelera",
  "destacada": true,
  "fechaEstreno": "2026-07-30",
  "posterArchivo": "spider-man-un-nuevo-dia.jpg",
  "posterUrl": "http://localhost:4000/imagenes/peliculas/spider-man-un-nuevo-dia.jpg",
  "trailerYoutube": "62bIsvRcPv0",
  "director": "Destin Daniel Cretton",
  "paisOrigen": "Estados Unidos",
  "generoIds": [1, 2, 3],
  "generos": ["Acción", "Aventuras", "Ciencia ficción"],
  "reparto": [
    {
      "nombre": "Tom Holland",
      "fotoArchivo": "tom-holland.jpg",
      "fotoUrl": "http://localhost:4000/imagenes/reparto/tom-holland.jpg"
    },
    { "nombre": "Zendaya", "fotoArchivo": "zendaya.jpg", "fotoUrl": "http://localhost:4000/imagenes/reparto/zendaya.jpg" }
  ]
}
```

`reparto` se devuelve en el orden en que se cargó. Al crear o modificar una película se envía como `[{ "nombre": "Tom Holland", "fotoArchivo": "tom-holland.jpg" }]`; `fotoArchivo` es opcional y, si falta, `fotoUrl` es `null`.

### Catálogos

Listas de solo lectura para armar los formularios (por ejemplo, los géneros y la clasificación de una película, o la ciudad de una sucursal):

| Ruta | Devuelve |
|---|---|
| `GET /catalogos/generos` | `[{ "id": 1, "nombre": "Acción" }]`, ordenados por nombre |
| `GET /catalogos/clasificaciones` | `[{ "id": 1, "nombre": "ATP" }]` |
| `GET /catalogos/ciudades` | `[{ "id": 2, "nombre": "Yerba Buena", "provincia": "Tucumán" }]`, ordenadas por nombre |
| `GET /catalogos/salas` | `[{ "id": 3, "sucursalId": 2, "sucursal": "Cine Atlas Vía 24", "nombre": "Sala 1", "capacidad": 48 }]`. Filtro opcional: `sucursalId` (400 si no es un número entero positivo) |

### Funciones

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /funciones` | Lista las funciones ordenadas por fecha y hora. Filtros opcionales: `peliculaId`, `sucursalId`, `salaId`, `fecha` (`AAAA-MM-DD`, día de Tucumán), `formato` (`2D` o `3D`) y `proximas` (`true` trae solo las que todavía no empezaron) | 200; 400 si un filtro no es válido |
| `GET /funciones/:id` | Una función por su número | 200; 400; 404 |
| `GET /funciones/:id/butacas` | Todas las butacas de la sala de la función, con cuáles están ocupadas | 200; 400; 404 |
| `POST /funciones` | Crea una función con `CreateFuncionDto` | 201; 400 si un dato no es válido o la película o la sala no existen; 409 si la sala ya tiene una función a esa hora; 401 sin token; 403 si no es administrador |
| `PATCH /funciones/:id` | Modifica los campos que se envían | 200; 400; 404; 409 si hay un choque de horario o si se cambia la sala de una función que ya vendió entradas; 401 sin token; 403 si no es administrador |
| `DELETE /funciones/:id` | Elimina la función y devuelve lo que eliminó | 200; 404; 409 si tiene entradas vendidas; 401 sin token; 403 si no es administrador |

`iniciaEn` se envía con fecha, hora y zona horaria (por ejemplo `2026-11-20T19:20:00-03:00`); sin la zona la API responde 400.

```json
{
  "id": 6,
  "peliculaId": 3,
  "pelicula": "Spider-Man: Un nuevo día",
  "salaId": 9,
  "sala": "Sala 1",
  "sucursalId": 5,
  "sucursal": "Sunstar Cinemas",
  "iniciaEn": "2026-11-20T22:20:00.000Z",
  "fecha": "2026-11-20",
  "horario": "19:20",
  "formato": "2D",
  "idioma": "Castellano",
  "precio": 8500,
  "capacidad": 48,
  "vendidas": 2,
  "estado": "disponible"
}
```

`fecha` y `horario` son la fecha y la hora en Tucumán (UTC-3), listas para mostrar. `capacidad` es la cantidad de butacas de la sala y `vendidas` la cantidad de entradas. `estado` se calcula con la misma regla de la vista `v_funciones`: `agotada` si no queda ninguna butaca, `pocos-lugares` si se vendió el 80 % o más y `disponible` en los demás casos. `precio` es un número.

`GET /funciones/:id/butacas` devuelve, ordenadas por fila y número:

```json
{
  "funcionId": 6,
  "salaId": 9,
  "sala": "Sala 1",
  "capacidad": 48,
  "vendidas": 2,
  "butacas": [
    { "id": 385, "codigo": "A1", "fila": "A", "numero": 1, "accesible": true, "ocupada": false },
    { "id": 398, "codigo": "B3", "fila": "B", "numero": 3, "accesible": false, "ocupada": true }
  ]
}
```

### Sucursales

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /sucursales` | Lista las sucursales. Filtro opcional: `destacada` (`true` o `false`) | 200; 400 si el filtro no es válido |
| `GET /sucursales/:id` | Una sucursal por su número | 200; 400 si `:id` no es un número; 404 |
| `GET /sucursales/slug/:slug` | Una sucursal por su `slug` | 200; 404 |
| `POST /sucursales` | Crea una sucursal con `CreateSucursalDto`, con sus enlaces | 201; 400 si un dato no es válido (por ejemplo, un enlace sin `https://`) o la ciudad no existe; 409 si el `slug` ya existe; 401 sin token; 403 si no es administrador |
| `PATCH /sucursales/:id` | Modifica los campos que se envían. Si se envía `enlaces`, reemplaza todos los enlaces; con `[]` los quita | 200; 400; 404; 409; 401 sin token; 403 si no es administrador |
| `DELETE /sucursales/:id` | Elimina la sucursal con sus salas y sus enlaces, y devuelve lo que eliminó | 200; 404; 409 si alguna de sus salas tiene funciones; 401 sin token; 403 si no es administrador |
| `POST /sucursales/:id/imagen` | Reemplaza la imagen de la sucursal con la imagen enviada (ver *Imágenes*) | 200 con la sucursal; 400 si falta el archivo o no es una imagen válida; 401; 403; 404; 413 si pesa más de 5 MB |

```json
{
  "id": 4,
  "slug": "sunstar-cinemas",
  "nombre": "Sunstar Cinemas",
  "ciudadId": 2,
  "ciudad": "Yerba Buena",
  "provincia": "Tucumán",
  "direccion": "Avenida Fermín Cariola 42",
  "descripcion": "Complejo Sunstar Cinemas ubicado en Yerba Buena.",
  "referencia": "Portal de Tucumán Shopping.",
  "imagenArchivo": "sunstar-cinemas.jpg",
  "imagenUrl": "http://localhost:4000/imagenes/sucursales/sunstar-cinemas.jpg",
  "destacada": true,
  "enlaces": [{ "tipo": "sitio", "url": "https://www.cinesunstar.com/" }]
}
```

`direccion` es solo la calle y el número: la ciudad y la provincia vienen aparte. `referencia` indica dónde queda el cine (por ejemplo, dentro de qué shopping) y es `null` si no se cargó. Los `enlaces` se devuelven ordenados por `tipo`.

### Autenticación

La única forma de crear un usuario es `POST /auth/register`: no existe `POST /users`. Quien se registra queda siempre como `cliente`, aunque envíe un `rol`; los administradores se cargan en la base o los promueve otro administrador.

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `POST /auth/register` | Registra un cliente con `nombre`, `apellido`, `correo` y `contrasena` (de 8 a 72 caracteres). Devuelve el token y el usuario | 201; 400 si falta un dato o no es válido; 409 si el correo ya está registrado |
| `POST /auth/login` | Inicia sesión con `correo` y `contrasena`. Devuelve el token y el usuario | 200; 400 si faltan datos; 401 si el correo no existe o la contraseña no coincide (el mensaje es el mismo en los dos casos) |
| `GET /auth/perfil` | Devuelve el usuario dueño del token | 200; 401 si falta el token, venció o no es válido |

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "usuario": {
    "id": 5,
    "nombre": "Administrador",
    "apellido": "Cine Tucumán",
    "correo": "admin@cinetucuman.test",
    "rol": "admin",
    "creadoEn": "2026-11-19T14:53:08.880Z"
  }
}
```

El `access_token` se envía en cada pedido que lo requiera, en el encabezado `Authorization: Bearer <access_token>`. Lleva el `sub` (número de usuario), el `correo` y el `rol`, y vence según `JWT_EXPIRES_IN`. La contraseña se guarda cifrada con bcrypt (10 rondas) y nunca se devuelve. El correo se guarda en minúsculas, así que `Ana@Test.com` y `ana@test.com` son el mismo.

Para probar los usuarios del seed: `admin@cinetucuman.test` (administrador) y `juan.decima@cinetucuman.test` (cliente), los dos con la contraseña `Prueba123!`.

### Usuarios

Todas las rutas piden el token (401 si falta o no es válido).

| Ruta | Quién | Qué hace | Respuestas |
|---|---|---|---|
| `GET /users` | Administrador | Lista los usuarios | 200; 403 si no es administrador |
| `GET /users/:id` | El propio usuario o un administrador | Un usuario por su número | 200; 400; 403 si es de otra persona; 404 |
| `PATCH /users/:id` | El propio usuario o un administrador | Modifica `nombre`, `apellido`, `contrasena` o `rol`. Un cliente que cambia su contraseña debe enviar también `contrasenaActual`; el `rol` solo lo cambia un administrador | 200; 400 si un dato no es válido o falta `contrasenaActual`; 401 si `contrasenaActual` no coincide; 403; 404 |
| `DELETE /users/:id` | Administrador | Elimina el usuario y devuelve lo que eliminó | 200; 403; 404; 409 si tiene órdenes |

Los permisos de administrador de las demás rutas están en la sección «Permisos».

### Productos

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /productos` | Lista los productos del Candy Bar. Filtros opcionales: `categoria` (`combo`, `snack` o `bebida`) y `activo` (`true` o `false`) | 200; 400 si un filtro no es válido |
| `GET /productos/:id` | Un producto por su número | 200; 400; 404 |
| `GET /productos/slug/:slug` | Un producto por su `slug` | 200; 404 |
| `POST /productos` | Crea un producto con `CreateProductoDto` | 201; 400 si un dato no es válido (precio negativo o con más de dos decimales, categoría inexistente, `activo` que no es `true` o `false`); 409 si el `slug` ya existe; 401 sin token; 403 si no es administrador |
| `PATCH /productos/:id` | Modifica los campos que se envían | 200; 400; 404; 409; 401 sin token; 403 si no es administrador |
| `DELETE /productos/:id` | Elimina el producto y devuelve lo que eliminó | 200; 404; 409 si figura en órdenes (en ese caso se desactiva con `"activo": false`); 401 sin token; 403 si no es administrador |

```json
{
  "id": 1,
  "slug": "combo-clasico",
  "nombre": "Combo Clásico",
  "descripcion": "Pochoclos grande + gaseosa mediana",
  "categoria": "combo",
  "precio": 6000,
  "activo": true
}
```

`precio` se devuelve como número.

### Órdenes

Todas las rutas piden el token (401 si falta o no es válido). Una orden puede tener entradas, productos del Candy Bar o las dos cosas. Se crea ya **pagada**: todavía no hay pasarela de pago. No se puede modificar ni eliminar una orden; solo cancelarla.

| Ruta | Quién | Qué hace | Respuestas |
|---|---|---|---|
| `POST /ordenes` | Cualquier usuario | Compra `entradas` (hasta 6, cada una con `funcionId` y `butacaId`) y `productos` (hasta 20, cada uno con `productoId` y `cantidad` de 1 a 10). Hace falta al menos una de las dos listas | 201; 400 si no hay nada para comprar, un dato no es válido, hay un elemento repetido, la función no existe o ya empezó, la butaca no existe o es de otra sala, o el producto no existe o está inactivo; 409 si alguna butaca ya fue vendida |
| `GET /ordenes` | Cada usuario ve las suyas; el administrador ve todas | Lista las órdenes, de la más nueva a la más vieja. Filtros opcionales: `estado` (`pendiente`, `pagada` o `cancelada`) y `usuarioId` | 200; 400 si un filtro no es válido; 403 si un cliente filtra por otro usuario |
| `GET /ordenes/:id` | Su dueño o un administrador | Una orden por su número | 200; 400; 403 si es de otra persona; 404 |
| `PATCH /ordenes/:id/cancelar` | Su dueño o un administrador | Cancela la orden y libera sus butacas | 200; 400; 403; 404; 409 si ya estaba cancelada o alguna de sus funciones ya empezó |

El cuerpo del `POST` es solo lo que se compra:

```json
{
  "entradas": [
    { "funcionId": 6, "butacaId": 398 },
    { "funcionId": 6, "butacaId": 404 }
  ],
  "productos": [{ "productoId": 1, "cantidad": 2 }]
}
```

El usuario sale del token y los precios, de la base: si el cuerpo trae `usuarioId`, `estado` o un precio, se ignora. La respuesta es la orden con su detalle:

```json
{
  "id": 6,
  "numero": "CT-7K3MQ9XD",
  "usuarioId": 4,
  "estado": "pagada",
  "creadaEn": "2026-11-19T15:12:40.000Z",
  "entradas": [
    {
      "id": 10,
      "funcionId": 6,
      "pelicula": "Spider-Man: Un nuevo día",
      "sucursal": "Sunstar Cinemas",
      "sala": "Sala 1",
      "iniciaEn": "2026-11-20T22:20:00.000Z",
      "fecha": "2026-11-20",
      "horario": "19:20",
      "butacaId": 398,
      "butaca": "B3",
      "precioUnitario": 8500
    }
  ],
  "productos": [
    { "productoId": 1, "nombre": "Combo Clásico", "cantidad": 2, "precioUnitario": 6000, "subtotal": 12000 }
  ],
  "total": 20500
}
```

- **Número de orden:** `CT-` y ocho caracteres al azar, sin letras ni números que se confundan (`O`, `0`, `I`, `1`). Es el que se le muestra a la persona.
- **Butacas:** cada butaca de una función se vende una sola vez; la base lo garantiza con una restricción única. Si dos personas compran la misma butaca al mismo tiempo, una recibe 201 y la otra 409.
- **Todo o nada:** la orden, sus entradas y sus productos se guardan en una sola operación: si algo falla, no se guarda nada.
- **Cancelación:** pasa la orden a `cancelada` y elimina sus entradas y productos, así que las butacas vuelven a quedar libres y el `total` es 0. No se puede cancelar una orden con una función que ya empezó.
- `fecha` y `horario` son la hora de Tucumán (UTC-3) y `total` se calcula con los precios guardados en la orden, como la vista `v_ordenes`.

### Imágenes

`posterUrl` se arma con `API_BASE_URL` y apunta a un archivo de `public/imagenes/peliculas/`, que la API sirve directamente. `posterArchivo` es el nombre que se guarda en la base y el que se envía al crear o editar una película. Las sucursales funcionan igual con `imagenArchivo` e `imagenUrl`, con los archivos de `public/imagenes/sucursales/`, y el reparto con `fotoArchivo` y `fotoUrl`, con los de `public/imagenes/reparto/`.

**Subir una imagen nueva.** Un administrador envía el archivo en el campo `archivo` de un formulario `multipart/form-data` a `POST /peliculas/:id/poster` (póster de una película) o a `POST /sucursales/:id/imagen` (imagen de una sucursal), con el token en `Authorization: Bearer <access_token>`. Por ejemplo, desde Git Bash:

```
curl -X POST http://localhost:4000/peliculas/1/poster -H "Authorization: Bearer $ADMIN" -F "archivo=@poster.jpg"
```

- **Qué se acepta:** JPG, PNG y WebP, de hasta 5 MB. El tipo se decide por el contenido del archivo y no por su nombre ni por el `Content-Type` que declare el cliente, así que un texto o un SVG renombrado a `.png` se rechaza con 400.
- **Dónde queda:** en `uploads/peliculas/` o `uploads/sucursales/` (o en la carpeta de `UPLOADS_DIR`), que no se sube a GitHub. La API la sirve en la misma dirección que las demás imágenes: `/imagenes/peliculas/<archivo>` y `/imagenes/sucursales/<archivo>`.
- **Cómo se llama:** el servidor le pone un nombre propio, `<slug>-<12 caracteres al azar>.<extensión>`, sin usar el nombre que traía el archivo. Como cada subida tiene un nombre distinto, el navegador nunca muestra una versión vieja guardada en caché.
- **Qué devuelve:** la película o la sucursal ya actualizada, con su `posterArchivo` o `imagenArchivo` nuevo y la URL completa en `posterUrl` o `imagenUrl`.
- **Limpieza:** al subir una imagen nueva se borra la subida anterior, y al eliminar la película o la sucursal se borra la suya. Los archivos de `public/imagenes/` (los del proyecto) nunca se tocan.
- **Errores:** 400 si falta el archivo, si llega en otro campo o si no es una imagen válida; 413 si pesa más de 5 MB; 404 si la película o la sucursal no existe. Los mensajes del 413 y del campo equivocado los genera la librería de subida y salen en inglés.
- Los archivos subidos viven en el disco del servidor: si la API se publica en un servicio que borra el disco al reiniciar, hay que guardarlos en otro lado.

## Permisos

Cada ruta es pública, pide el token de cualquier usuario o pide el token de un administrador. El token se envía en `Authorization: Bearer <access_token>` (ver *Autenticación*).

| Rutas | Quién puede usarlas |
|---|---|
| `GET` de `/peliculas`, `/funciones` (incluida `/funciones/:id/butacas`), `/sucursales`, `/productos` y `/catalogos`; `POST /auth/register` y `POST /auth/login` | Todos, sin token |
| `GET /auth/perfil` y las rutas de `/ordenes` | Cualquier usuario con token (cada uno ve solo lo suyo; el administrador ve todo) |
| `GET /users/:id` y `PATCH /users/:id` | El propio usuario o un administrador |
| `GET /users` y `DELETE /users/:id` | Solo un administrador |
| `POST`, `PATCH` y `DELETE` de `/peliculas`, `/funciones`, `/sucursales` y `/productos`, y la subida de imágenes (`POST /peliculas/:id/poster` y `POST /sucursales/:id/imagen`) | Solo un administrador |

Estas últimas responden **401** si falta el token, venció o no es válido, y **403** si el token es de un cliente. Los permisos se revisan antes que el cuerpo del pedido, así que un cliente recibe 403 aunque los datos sean inválidos. Los demás códigos de cada módulo (400, 404, 409) no cambian.

## Pruebas de la API con Postman

En [`docs/postman/`](docs/postman) están la colección y el entorno:

1. En Postman, **Import** y elegir `CineTucuman.postman_collection.json` y `CineTucuman.postman_environment.json`.
2. Elegir el entorno **Cine Tucumán · local** (define `baseUrl` como `http://localhost:4000`; hay que cambiarla si el puerto del `.env` es otro).
3. Con el servidor andando y la base cargada con los datos de ejemplo, ejecutar la colección: tiene una carpeta por módulo con sus peticiones, y cada una comprueba el código de respuesta. Las carpetas `auth` y `users` guardan solas el token que devuelve el login (variables `tokenCliente` y `tokenAdmin` de la colección) y lo usan en las peticiones siguientes. Las carpetas `peliculas`, `funciones`, `sucursales` y `productos` inician sesión por su cuenta como administrador (para crear, modificar y eliminar) y como cliente, comprueban los 401 y 403 de esas rutas, e incluyen además los filtros, la búsqueda por `slug` y los casos de error (400, 404 y 409). La subida de imágenes se prueba a mano (Postman no guarda archivos de la computadora en la colección): la colección comprueba solo sus errores. Cada carpeta se ejecuta completa y en orden: crea un registro de prueba, lo modifica y lo elimina, así que la base queda como estaba. La carpeta `ordenes` crea su propia función lejana en el tiempo (así no depende de las fechas de los datos de ejemplo), compra, consulta y cancela, y elimina la función; como una orden no se puede eliminar, cada corrida deja una orden `cancelada` en la base.

## Estrategia de ramas

| Rama | Para qué |
|---|---|
| `main` | Rama estable del proyecto |
| `dev` | Rama de integración del desarrollo |
| `feature/nombre-funcionalidad` | Nuevas funcionalidades |
| `fix/nombre-correccion` | Correcciones |
| `refactor/nombre-cambio` | Reorganización o mejora del código |
| `docs/nombre-documentacion` | Cambios en la documentación |

Cada rama sale de `dev`. Los cambios entran por un pull request con base `dev`, documentado y revisado por otro integrante, y se mergean con merge commit. Cuando `dev` está verificado, otro pull request lo integra en `main`. Los mensajes de commit empiezan con su tipo (`feat:`, `fix:`, `refactor:` o `docs:`) y describen qué cambió.

## Próximas etapas

- Conviene mantener fija la versión 7.10.1 de `prisma`: la etiqueta `latest` del paquete apunta hoy a un candidato de la versión 8.
- Subir también las fotos del reparto de cada película (hoy solo se suben los pósters y las imágenes de sucursales).
- Conectar el frontend a esta API en lugar de sus datos locales.
