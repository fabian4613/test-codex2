# Perfiles y Persistencia

La app guarda el estado del dashboard en localStorage y, opcionalmente, en servidor. Los “Perfiles” permiten guardar/cargar diferentes versiones del tablero y compartirlas mediante una clave.

## Local
- Siempre se guarda en `localStorage` con la clave `dashy_next_dashboard_state_v1`.

## Remota (opcional)
Requiere `NEXT_PUBLIC_PERSIST_REMOTE=1` y configurar un driver:

```
PERSIST_DRIVER=sqlite  # o postgres
SQLITE_FILE=./data.sqlite
# DATABASE_URL=postgres://user:pass@host:5432/db
```

API:
- `GET /api/state?key=<perfil>`
- `PUT /api/state?key=<perfil>`

Si faltan dependencias o conexión, el servidor degrada la persistencia remota a no-op (no rompe la app).

## Uso como usuario
- En la toolbar, usa “Perfil” para cambiar entre opciones personales y de grupo. Las acciones de perfil están agrupadas como iconos (+, 💾, 🔗, ⤓, ⤴).
- “Nuevo perfil” (+) crea una clave nueva (ej: `team:marketing`) y la aplica.
- “Guardar ahora” (💾) persiste el estado actual en el perfil activo.
- “Compartir” (🔗) copia un enlace con el perfil para abrirlo en otro navegador.
- “Exportar/Importar” (⤓/⤴) manejan un archivo JSON del tablero.

Controles menos usados (Tema, Estilo y Cuenta) están dentro del botón “⋯”.

Enlaces compartibles: añade `?profile=<clave>` a la URL. Al abrirlo, se aplica ese perfil automáticamente.
