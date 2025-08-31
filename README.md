Dashy-Style Dashboard en Next.js

Este proyecto crea un panel tipo “home page” inspirado en Dashy, construido con Next.js (App Router). Se puede personalizar desde la UI, con persistencia local (localStorage) o en servidor (SQLite/PostgreSQL), autenticación con Keycloak y un panel de administración para gestionar ámbitos (perfiles), grupos y usuarios.

Índice
- Requisitos y scripts
- Ejecución local (sin Docker)
- Ejecución con Docker Compose (desarrollo y producción)
- Autenticación y panel de administración
- Variables de entorno (resumen)
- Detalles técnicos

Requisitos y scripts
- Node.js 18+ y npm
- Instalar dependencias: `npm install`
- Scripts útiles:
  - Desarrollo local con SQLite: `npm run dev:sqlite`
  - Desarrollo local con PostgreSQL: `npm run dev:pg`
  - Producción local: `npm run build && npm run start:sqlite` o `npm run start:pg`
  - Docker Compose (atajos): `npm run docker:sqlite`, `npm run docker:pg` y sus variantes `:down`

Ejecución local (sin Docker)
1) Elige driver de BD e instala el paquete:
   - SQLite: `npm i better-sqlite3` (puede requerir toolchain nativo)
   - PostgreSQL: `npm i pg`
2) Crea `.env.local` con las variables mínimas:
   - Común:
     - `NEXT_PUBLIC_PERSIST_REMOTE=1`
     - `NEXTAUTH_URL=http://localhost:3000`
     - `NEXTAUTH_SECRET=devsecret` (cámbiala en prod)
     - `KEYCLOAK_ISSUER=http://localhost:8080/realms/myrealm`
     - `KEYCLOAK_CLIENT_ID=dashboard`
     - `KEYCLOAK_CLIENT_SECRET=changeme` (si el cliente es confidencial)
     - `AUTH_REQUIRED=1` (obliga a iniciar sesión)
     - `NEXT_PUBLIC_ADMIN_GROUP=devops`
   - SQLite:
     - `PERSIST_DRIVER=sqlite`
     - `SQLITE_FILE=./data.sqlite`
   - PostgreSQL:
     - `PERSIST_DRIVER=postgres`
     - `DATABASE_URL=postgres://user:pass@localhost:5432/dbname`
3) Arranca Keycloak por tu cuenta (puedes usar el perfil de docker-compose de Keycloak) o apunta a uno existente.
4) Ejecuta la app:
   - SQLite: `npm run dev:sqlite`
   - Postgres: `npm run dev:pg`
5) Abre http://localhost:3000

Ejecución con Docker Compose
El archivo `docker-compose.yml` incluye perfiles para desarrollo (montando el código) y producción (imágenes construidas). Incluye Keycloak con import automático de un realm de ejemplo.

Desarrollo (hot reload)
- SQLite + Keycloak:
  - `docker compose --profile sqlite up`
  - App: http://localhost:3000
  - Keycloak: http://localhost:8080 (admin/admin)
- PostgreSQL + Keycloak:
  - `docker compose --profile pg up`
  - App: http://localhost:3000
  - DB: localhost:5432 (usuario/clave/db: dashy)

Producción (imágenes optimizadas)
- SQLite:
  - `docker compose --profile sqlite-prod build web-sqlite`
  - `docker compose --profile sqlite-prod up web-sqlite`
- PostgreSQL:
  - `docker compose --profile pg-prod build web-pg`
  - `docker compose --profile pg-prod up web-pg`

Keycloak presembrado (seed)
- Archivo: `keycloak/myrealm-realm.json` con:
  - Realm: `myrealm`
  - Client OIDC: `dashboard` (confidential, secret `changeme`, redirects/origins para `http://localhost:3000/*`), incluye scope `groups`
  - Grupos: `devops`, `dev`
  - Usuarios de prueba:
    - devops / devops (grupo devops, verá botón “Admin”)
    - dev / dev (grupo dev)
- Compose monta y ejecuta Keycloak con `start-dev --import-realm` para importar automáticamente.

Autenticación y panel de administración
- La app exige login si `AUTH_REQUIRED=1`.
- Selector “Ámbito” en la Toolbar: guarda/carga el estado por clave
  - Personal: `user:<sub>`
  - Grupo: `group:<nombre>`
  - También puedes crear ámbitos personalizados en el panel.
- Panel de administración (`/admin`), visible si perteneces a `NEXT_PUBLIC_ADMIN_GROUP` (por defecto `devops`):
  - Ámbitos: crear/usar/exportar/eliminar claves de estado del dashboard.
  - Identidad (Keycloak):
    - Grupos: crear, renombrar, eliminar (con opción para mover usuarios a otro grupo antes de borrar).
    - Usuarios: buscar con paginación, crear (con grupos y password), eliminar, asignar/quitar grupos y resetear password.

Variables de entorno (resumen)
- Persistencia
  - `NEXT_PUBLIC_PERSIST_REMOTE=1`
  - `PERSIST_DRIVER=sqlite|postgres`
  - `SQLITE_FILE=./data.sqlite`
  - `DATABASE_URL=postgres://user:pass@host:5432/dbname`
- Autenticación (NextAuth + Keycloak)
  - `AUTH_REQUIRED=1`
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `KEYCLOAK_ISSUER=http://host:8080/realms/<realm>`
  - `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
  - `NEXT_PUBLIC_ADMIN_GROUP=devops`
- (Opcional) Credenciales admin para API de Keycloak (usadas desde el servidor):
  - `KEYCLOAK_ADMIN_USER=admin`
  - `KEYCLOAK_ADMIN_PASSWORD=admin`

Detalles técnicos
- API estado: `GET/PUT /api/state?key=...` (SQLite/Postgres)
- Esquemas
  - Postgres: `dashboard_state(key text primary key, content jsonb, updated_at timestamptz)`
  - SQLite: `dashboard_state(key text primary key, content text, updated_at text)`

