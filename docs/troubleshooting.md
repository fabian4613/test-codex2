# Troubleshooting

## No aparece el botón “Admin”
- Cierra sesión y vuelve a entrar con `devops`.
- Verifica `/api/admin/keys` → debe dar 200.
- Abre `/api/me` y comprueba que `groups` incluya `"/devops"`.

## 403 en `/api/admin/identity/*`
- Asegúrate de tener:
  - `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET` correctos.
  - `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD` válidos (para llamadas admin).

## `invalid_scope` al login
- No se fuerza el scope `groups` en el cliente; asegúrate de usar el realm de ejemplo o que el cliente tenga `groups` en default client scopes.

## 500 en `/api/state`
- Falta el driver o conexión. Instala `better-sqlite3` (o `pg`) y define `PERSIST_DRIVER`.
  - En Docker ya viene configurado por perfil.

## Permisos en el directorio (Docker Compose)
- Síntoma: archivos `.next/`, `node_modules/` o `data.sqlite*` con owner `root` y errores `EACCES` al borrar/compilar.
- Causa: bind mount `.:/app` con procesos en contenedor corriendo como root.

Soluciones:
1) Ejecuta los servicios dev con tu UID/GID
   - Copia `.env.example` a `.env` y ajusta:
     - `HOST_UID=$(id -u)`
     - `HOST_GID=$(id -g)`
   - `docker compose up -d` (perfiles `pg` o `sqlite`).

2) Repara permisos locales (una vez)
   - `bash scripts/fix-perms.sh`

3) SQLite con toolchain preinstalado
   - El servicio `app-sqlite` usa `Dockerfile.dev-sqlite` para evitar `apt-get` en runtime como root.

## WSL2 y pruebas visuales
- Ejecuta `./scripts/wsl-setup.sh` para instalar Chrome y librerías.
- Corre `./scripts/run-visual.sh`.
