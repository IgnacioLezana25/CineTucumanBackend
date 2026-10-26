# Cine Tucumán · API

API del proyecto Cine Tucumán, hecha con [NestJS](https://nestjs.com/). Reemplaza los datos locales del frontend: toda la información vive en una base de datos PostgreSQL y se expone desde acá.

## Integrantes

- Molina Lazaro
- Lezana Juan Ignacio
- Almaraz Sintora Nahuel
- Decima Juan Cruz

**Materia:** Programación IV · **Año:** 2026

## Cómo ejecutarlo

Se necesita **Node.js 22** o superior y **npm 12** o superior (con npm 10 la instalación falla con el error `Cannot read properties of null (reading 'edgesOut')`; se actualiza con `npm install -g npm@12`).

```
git clone https://github.com/<usuario>/CineTucumanBackend.git
cd CineTucumanBackend
npm install
npm run start:dev
```

Antes de levantar el servidor hay que crear el archivo `.env` (ver la sección siguiente). La API queda escuchando en el puerto que diga ese archivo.

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

Se guardan en un archivo `.env` en la raíz del proyecto, que **no se sube a GitHub**: figura en el `.gitignore`. El repositorio no incluye ningún archivo con credenciales, ni siquiera de ejemplo. Hay que crearlo a mano con este contenido:

```
PORT=3100
DATABASE_URL="postgresql://usuario:contrasena@localhost:5432/cine_tucuman?schema=public"
```

| Variable | Qué guarda |
|---|---|
| `PORT` | El puerto donde escucha la API |
| `DATABASE_URL` | La conexión a PostgreSQL que usará Prisma |

El archivo lo lee `ConfigModule` de `@nestjs/config`, que se registra una sola vez en `AppModule` y queda disponible en todo el proyecto.

## Estructura del proyecto

```
src/
  main.ts            Punto de entrada: crea la aplicación y la pone a escuchar
  modules/           Todos los módulos del proyecto
    app/             Módulo raíz: reúne a los demás
    auth/            Registro e inicio de sesión
    user/            Usuarios
```

Cada funcionalidad nueva se agrega como un módulo dentro de `src/modules/` y se registra en `AppModule`. Fuera de `src/` no se trabaja: `dist/` es el resultado de compilar y `test/` guarda las pruebas de punta a punta.

## Tecnologías

- NestJS 12 y TypeScript, con módulos ES.
- PostgreSQL como base de datos y Prisma para acceder a ella.
- `@nestjs/config` para las variables de entorno.
- Vitest para las pruebas y oxlint para el análisis del código.

## Próximas etapas

- Conexión a PostgreSQL con Prisma y el esquema de datos.
- Registro e inicio de sesión con usuarios reales.
- Endpoints de películas, funciones, butacas y compras.
- Conectar el frontend a esta API en lugar de sus datos locales.
