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
```

| Variable | Qué guarda |
|---|---|
| `PORT` | El puerto donde escucha la API (si falta, usa el 4000) |
| `DATABASE_URL` | La conexión a la base de datos PostgreSQL: usuario, contraseña, servidor, puerto y nombre |
| `API_BASE_URL` | La dirección base de la API: se muestra al arrancar y se usa para armar la dirección completa de los pósters |
| `FRONTEND_URL` | Desde dónde se permite llamar a la API (CORS). Si falta, usa `http://localhost:5173`. Admite varias direcciones separadas por coma |

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
| 2 | `psql -U postgres -d cine_tucuman -f database/schema.sql` | Crea las 15 tablas y las 2 vistas |
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
- **2FN:** las tablas con clave compuesta (`peliculas_generos`, `sucursal_enlaces` y `orden_productos`) no tienen columnas que dependan de una sola parte de su clave.
- **3FN:** ninguna columna depende de otra que no sea la clave. La ciudad y la provincia están en `ciudades`, la clasificación en `clasificaciones` y los géneros en `generos`, y lo que se calcula no se guarda: el total de una orden y la disponibilidad de una función salen de las vistas `v_ordenes` y `v_funciones`.

### Tablas

| Tabla | Para qué sirve | Registros de ejemplo |
|---|---|---|
| `usuarios` | Personas registradas, con correo único y rol (`cliente` o `admin`) | 5 |
| `generos` | Géneros cinematográficos | 5 |
| `clasificaciones` | Clasificaciones por edad | 5 |
| `peliculas` | Cartelera y próximos estrenos | 20 |
| `peliculas_generos` | Relación muchos a muchos entre películas y géneros | 6 |
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

Las películas, las sucursales con sus enlaces y el Candy Bar salen del frontend. Lo que el sitio todavía no tiene (por ejemplo, la duración de la mayoría de las películas) queda vacío, igual que el sitio muestra «Por confirmar». Los usuarios, las salas, las funciones y las órdenes son de ejemplo. La contraseña de todos los usuarios de ejemplo es `Prueba123!` y se guarda cifrada con bcrypt.

## Conexión con Prisma

Prisma es la capa que usan los services para leer y escribir en PostgreSQL. La API se conecta con el adaptador `@prisma/adapter-pg` y la dirección de la base sale de `DATABASE_URL`.

| Archivo | Qué hace |
|---|---|
| `prisma/schema.prisma` | Describe las 15 tablas como modelos de Prisma. Los nombres de los modelos van en singular (`Pelicula`) y `@@map` y `@map` los enlazan con las tablas y columnas reales (`peliculas`, `poster_archivo`) |
| `prisma.config.ts` | Le dice a la herramienta de Prisma dónde está el esquema y de dónde sacar `DATABASE_URL` |
| `prisma/migrations/0_init/` | Migración inicial: es el SQL de `database/schema.sql` sin el borrado de tablas |
| `src/modules/prisma/` | `PrismaService` (se conecta al arrancar y se desconecta al cerrar) y `PrismaModule`, que es global: cualquier service puede recibir `PrismaService` sin importar el módulo |
| `src/generated/prisma/` | El cliente que genera Prisma. No se sube a GitHub: se crea con `npm install` o con `npx prisma generate` |

**La base se crea con los scripts SQL** (pasos 1 a 3 de la sección anterior), porque así quedan también las restricciones `CHECK` y las vistas `v_ordenes` y `v_funciones`, que Prisma no genera. Por eso el esquema de Prisma está escrito a mano a partir de esas tablas, y la migración `0_init` es una línea de base: marca el estado en el que ya está la base.

Si se quiere que Prisma registre esa migración como ya aplicada (opcional: la API funciona igual sin hacerlo), con la base ya creada:

```
npx prisma migrate resolve --applied 0_init
```

Si se cambia `prisma/schema.prisma`, hay que volver a ejecutar `npx prisma generate`. Para comprobar que el esquema no tiene errores: `npx prisma validate`.

## Estructura del proyecto

```
database/            Scripts SQL (crear la base, esquema, datos, verificación y pruebas) y la normalización
docs/postman/        Colección y entorno de Postman
prisma/              Esquema de Prisma y migraciones
prisma.config.ts     Configuración de la herramienta de Prisma
public/imagenes/     Archivos que la API sirve por URL (pósters de películas y fotos de sucursales)
src/
  main.ts            Punto de entrada: crea la aplicación, activa la validación y el CORS, sirve las imágenes y la pone a escuchar
  modules/           Todos los módulos del proyecto
    app/             Módulo raíz: reúne a los demás
    prisma/          Conexión con la base de datos (global)
    catalogos/       Géneros, clasificaciones y ciudades (solo lectura)
    comunes/         Utilidades compartidas, como armar la URL pública de una imagen o pasar un instante a la fecha y la hora de Tucumán
    auth/            Registro e inicio de sesión
    users/           Usuarios
    peliculas/       Películas
    funciones/       Funciones
    sucursales/      Sucursales
    productos/       Productos del Candy Bar
    ordenes/         Órdenes de compra
```

Cada módulo se creó con `npx nest g resource modules/<nombre>` y tiene su controlador, su servicio, su módulo y las carpetas `dto/` y `entities/`. **Cada módulo nuevo hay que importarlo en la propiedad `imports` de `AppModule`** (`src/modules/app/app.module.ts`); el generador de Nest no lo hace solo porque ese archivo no está en la raíz de `src`.

## Módulos y rutas

Cada módulo tiene las cinco rutas que genera Nest, con su nombre como prefijo: `GET /<módulo>`, `GET /<módulo>/:id`, `POST /<módulo>`, `PATCH /<módulo>/:id` y `DELETE /<módulo>/:id`. Además, `GET /` devuelve un saludo.

| Módulo | Prefijo | Estado |
|---|---|---|
| `auth` | `/auth` | Estructura generada |
| `users` | `/users` | Estructura generada |
| `peliculas` | `/peliculas` | Conectado con la base de datos mediante Prisma |
| `funciones` | `/funciones` | Conectado con la base de datos mediante Prisma |
| `sucursales` | `/sucursales` | Conectado con la base de datos mediante Prisma |
| `productos` | `/productos` | Conectado con la base de datos mediante Prisma |
| `catalogos` | `/catalogos` | Solo lectura, con Prisma (géneros, clasificaciones, ciudades y salas) |
| `ordenes` | `/ordenes` | Estructura generada |

Las rutas de `peliculas`, `funciones`, `sucursales`, `productos` y `catalogos` ya leen y escriben en la base de datos. Las de los demás módulos todavía devuelven un texto de ejemplo: se conectan en las próximas etapas.

### Películas

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /peliculas` | Lista las películas. Filtros opcionales: `estado` (`en-cartelera` o `proximamente`), `destacada` (`true` o `false`) y `q` (texto dentro del título) | 200; 400 si un filtro no es válido |
| `GET /peliculas/:id` | Una película por su número | 200; 400 si `:id` no es un número; 404 si no existe |
| `GET /peliculas/slug/:slug` | Una película por su `slug`, como el que usa el sitio en la dirección (`/peliculas/toy-story-5`) | 200; 404 si no existe |
| `POST /peliculas` | Crea una película con `CreatePeliculaDto` | 201; 400 si falta un dato, un dato no es válido o la clasificación o un género no existen; 409 si el `slug` ya existe |
| `PATCH /peliculas/:id` | Modifica solo los campos que se envían. Si se envía `generoIds`, reemplaza todos los géneros; con `[]` los quita. Con `null` se vacían los campos opcionales | 200; 400; 404; 409 |
| `DELETE /peliculas/:id` | Elimina la película y devuelve lo que eliminó | 200; 404; 409 si tiene funciones |

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
  "generos": ["Acción", "Aventuras", "Ciencia ficción"]
}
```

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
| `POST /funciones` | Crea una función con `CreateFuncionDto` | 201; 400 si un dato no es válido o la película o la sala no existen; 409 si la sala ya tiene una función a esa hora |
| `PATCH /funciones/:id` | Modifica los campos que se envían | 200; 400; 404; 409 si hay un choque de horario o si se cambia la sala de una función que ya vendió entradas |
| `DELETE /funciones/:id` | Elimina la función y devuelve lo que eliminó | 200; 404; 409 si tiene entradas vendidas |

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
| `POST /sucursales` | Crea una sucursal con `CreateSucursalDto`, con sus enlaces | 201; 400 si un dato no es válido (por ejemplo, un enlace sin `https://`) o la ciudad no existe; 409 si el `slug` ya existe |
| `PATCH /sucursales/:id` | Modifica los campos que se envían. Si se envía `enlaces`, reemplaza todos los enlaces; con `[]` los quita | 200; 400; 404; 409 |
| `DELETE /sucursales/:id` | Elimina la sucursal con sus salas y sus enlaces, y devuelve lo que eliminó | 200; 404; 409 si alguna de sus salas tiene funciones |

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
  "imagenArchivo": "sunstar-cinemas.jpg",
  "imagenUrl": "http://localhost:4000/imagenes/sucursales/sunstar-cinemas.jpg",
  "destacada": true,
  "enlaces": [{ "tipo": "sitio", "url": "https://www.cinesunstar.com/" }]
}
```

`direccion` es solo la calle y el número: la ciudad y la provincia vienen aparte. Los `enlaces` se devuelven ordenados por `tipo`.

### Productos

| Ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /productos` | Lista los productos del Candy Bar. Filtros opcionales: `categoria` (`combo`, `snack` o `bebida`) y `activo` (`true` o `false`) | 200; 400 si un filtro no es válido |
| `GET /productos/:id` | Un producto por su número | 200; 400; 404 |
| `GET /productos/slug/:slug` | Un producto por su `slug` | 200; 404 |
| `POST /productos` | Crea un producto con `CreateProductoDto` | 201; 400 si un dato no es válido (precio negativo o con más de dos decimales, categoría inexistente, `activo` que no es `true` o `false`); 409 si el `slug` ya existe |
| `PATCH /productos/:id` | Modifica los campos que se envían | 200; 400; 404; 409 |
| `DELETE /productos/:id` | Elimina el producto y devuelve lo que eliminó | 200; 404; 409 si figura en órdenes (en ese caso se desactiva con `"activo": false`) |

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

### Imágenes

`posterUrl` se arma con `API_BASE_URL` y apunta a un archivo de `public/imagenes/peliculas/`, que la API sirve directamente. `posterArchivo` es el nombre que se guarda en la base y el que se envía al crear o editar una película. Las sucursales funcionan igual con `imagenArchivo` e `imagenUrl`, con los archivos de `public/imagenes/sucursales/`.

## Pruebas de la API con Postman

En [`docs/postman/`](docs/postman) están la colección y el entorno:

1. En Postman, **Import** y elegir `CineTucuman.postman_collection.json` y `CineTucuman.postman_environment.json`.
2. Elegir el entorno **Cine Tucumán · local** (define `baseUrl` como `http://localhost:4000`; hay que cambiarla si el puerto del `.env` es otro).
3. Con el servidor andando, ejecutar la colección: tiene una carpeta por módulo con sus peticiones, y cada una comprueba el código de respuesta. Las carpetas `peliculas`, `funciones`, `sucursales` y `productos` incluyen además los filtros, la búsqueda por `slug` y los casos de error (400, 404 y 409). Cada carpeta se ejecuta completa y en orden: crea un registro de prueba, lo modifica y lo elimina, así que la base queda como estaba.

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

- Conectar con Prisma el módulo que falta: órdenes (con el precio calculado por el servidor y las butacas de cada entrada). Conviene mantener fija la versión 7.10.1 de `prisma`: la etiqueta `latest` del paquete apunta hoy a un candidato de la versión 8.
- Registro e inicio de sesión con usuarios reales (`auth` y `users`).
- Subida de pósters nuevos desde el panel de administración.
- Conectar el frontend a esta API en lugar de sus datos locales.
