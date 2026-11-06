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
- Prisma (`@prisma/client` y `prisma`, versión 7.10.1) para conectar la API con la base en la próxima etapa.
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

Antes de levantar el servidor hay que crear el archivo `.env` (ver la sección siguiente). La API queda escuchando en el puerto que diga ese archivo y lo avisa al arrancar.

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
```

| Variable | Qué guarda |
|---|---|
| `PORT` | El puerto donde escucha la API (si falta, usa el 4000) |
| `DATABASE_URL` | La conexión a la base de datos PostgreSQL: usuario, contraseña, servidor, puerto y nombre |
| `API_BASE_URL` | La dirección base de la API, que se muestra al arrancar |

El archivo lo lee `ConfigModule` de `@nestjs/config`, que se registra una sola vez en `AppModule` y queda disponible en todo el proyecto.

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

## Estructura del proyecto

```
database/            Scripts SQL (crear la base, esquema, datos, verificación y pruebas) y la normalización
docs/postman/        Colección y entorno de Postman
src/
  main.ts            Punto de entrada: crea la aplicación, activa la validación y la pone a escuchar
  modules/           Todos los módulos del proyecto
    app/             Módulo raíz: reúne a los demás
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
| `peliculas` | `/peliculas` | Estructura generada |
| `funciones` | `/funciones` | Estructura generada |
| `sucursales` | `/sucursales` | Estructura generada |
| `productos` | `/productos` | Estructura generada |
| `ordenes` | `/ordenes` | Estructura generada |

Por ahora las rutas devuelven un texto de ejemplo: la lógica y la conexión de cada módulo con la base de datos llegan en la próxima etapa.

## Pruebas de la API con Postman

En [`docs/postman/`](docs/postman) están la colección y el entorno:

1. En Postman, **Import** y elegir `CineTucuman.postman_collection.json` y `CineTucuman.postman_environment.json`.
2. Elegir el entorno **Cine Tucumán · local** (define `baseUrl` como `http://localhost:4000`; hay que cambiarla si el puerto del `.env` es otro).
3. Con el servidor andando, ejecutar la colección: tiene una carpeta por módulo con sus cinco peticiones, y cada una comprueba el código de respuesta.

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

- Conectar los módulos con la base de datos usando Prisma, que ya está instalado (`@prisma/client` y `prisma`, versión 7.10.1), a partir del esquema ya creado: `npx prisma db pull` y `npx prisma generate`. Conviene mantener la versión fija: la etiqueta `latest` del paquete `prisma` apunta hoy a un candidato de la versión 8.
- Validar los dto de cada módulo con los decoradores de `class-validator`.
- Registro e inicio de sesión con usuarios reales.
- Lógica de películas, funciones, butacas y compras.
- Conectar el frontend a esta API en lugar de sus datos locales.
