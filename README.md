Dashy-Style Dashboard en Next.js

Panel personalizable inspirado en Dashy, hecho con Next.js (App Router). Soporta persistencia local y remota (SQLite/PostgreSQL), autenticación con Keycloak y un panel de administración.

Documentación (tipo wiki)
- docs/setup.md: inicio rápido con Docker y local
- docs/admin.md: cómo usar el panel de administración
- docs/auth.md: NextAuth + Keycloak y control de acceso
- docs/persistencia.md: almacenamiento local/remoto y variables
- docs/troubleshooting.md: errores habituales y soluciones

Scripts útiles
- Desarrollo local: `npm run dev:sqlite` | `npm run dev:pg`
- Producción local: `npm run build && npm run start:sqlite` | `npm run start:pg`
- Docker Compose: `npm run docker:sqlite` | `npm run docker:pg` | `:down`

Inicio rápido
- Docker + SQLite + Keycloak: `npm run docker:sqlite`
- Abrí http://localhost:3000. Usuarios de prueba en Keycloak: `devops/devops` (admin) y `dev/dev`.
- El botón “Admin” aparece en la toolbar (en móvil dentro de “⋯”) tras iniciar sesión como `devops`.

Ejecución con Docker Compose
- `docker compose --profile sqlite up` (desarrollo con SQLite + Keycloak)
- App: http://localhost:3000 — Keycloak: http://localhost:8080 (admin/admin)
- Más opciones en docs/setup.md

Producción (imágenes optimizadas)
- SQLite:
  - `docker compose --profile sqlite-prod build web-sqlite`
  - `docker compose --profile sqlite-prod up web-sqlite`
- PostgreSQL:
  - `docker compose --profile pg-prod build web-pg`
  - `docker compose --profile pg-prod up web-pg`

Keycloak presembrado (seed)
- Realm: `myrealm`; cliente OIDC: `dashboard` (secret `changeme`), grupos `devops`/`dev`.
- Usuarios de prueba: `devops/devops` y `dev/dev`.

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
