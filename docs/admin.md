# Panel de Administración

Esta guía explica el panel en `/admin`, qué puede hacer un usuario administrador y cómo resolver problemas comunes. El acceso se concede a quienes pertenezcan al grupo configurado en `NEXT_PUBLIC_ADMIN_GROUP` (por defecto `devops`). En móvil el botón aparece dentro del menú “⋯” de la toolbar.

## Acceso rápido
- Docker (recomendado): `npm run docker:sqlite` e inicia sesión con `devops/devops`.
- Local sin Docker: sigue `docs/setup.md`.
- ¿No ves el botón “Admin”? Abre `/api/me` y comprueba que `groups` contiene `"/devops"` (o tu grupo admin). También puedes ir directo a `/admin`.

## Conceptos clave
- Perfil: una versión del tablero. Permite guardar y cargar el estado por `user:<id>` o `group:<nombre>` para compartir.
- Identidad: gestión de grupos y usuarios en Keycloak usando credenciales de administrador.

## Flujos habituales

### Crear y usar un perfil
1. En la pestaña “Perfiles”, escribe un nombre, por ejemplo `group:devops` o `user:<tu-sub>`.
2. Pulsa “Crear”. Aparecerá en la lista con su fecha de actualización.
3. Pulsa “Usar” para activar ese perfil en el dashboard. A partir de ese momento, leerás/guardarás el panel en ese perfil.
4. Opcional: pulsa el icono ⤓ para exportar el JSON o 🗑️ para eliminarlo.

Notas:
- Verás sugerencias rápidas basadas en tu usuario y grupos actuales.
- Si la lista está vacía, crea tu primer perfil con el campo de arriba.

Importante: cualquier usuario puede crear y compartir perfiles desde la toolbar del dashboard (botones “Nuevo perfil”, “Guardar ahora” y “Compartir”). La sección de “Perfiles” en Admin es un plus para gestionar todos los perfiles del servidor, pero no es necesaria para compartir.

### Gestionar grupos (Identidad)
Requisitos: variables de Keycloak correctamente configuradas y credenciales admin (`KEYCLOAK_ADMIN_USER` / `KEYCLOAK_ADMIN_PASSWORD`).

1. Ve a la pestaña “Identidad”.
2. En “Nuevo grupo”, escribe el nombre (p.ej. `devops`) y pulsa “Crear”.
3. Para renombrar, edita el campo y sal del input; se guardará automáticamente.
4. Para eliminar, pulsa 🗑️. Si hay usuarios, puedes indicar un grupo “target” adonde moverlos.

### Gestionar usuarios (Identidad)
1. Usa “Buscar usuarios” para filtrar (paginación incluida).
2. Crea un usuario indicando `username`, contraseña y, opcionalmente, email y grupos iniciales.
3. En cada fila de usuario:
   - “✎” abre los detalles para asignar/quitar grupos.
   - “Reset password” permite establecer una nueva contraseña.
   - 🗑️ elimina el usuario.

## Permisos y detección de admin
Cada ruta `/api/admin/**` valida permisos. Si el token no trae `groups`, el servidor hará fallback a:
1. Pedir `userinfo` usando tu `access_token`.
2. Consultar la API de administración de Keycloak para inferir grupos por `sub`.

Configura el grupo admin con `NEXT_PUBLIC_ADMIN_GROUP` (y/o `ADMIN_GROUP`). Por defecto es `devops`.

## Solución de problemas
- No aparece “Admin”: cierra sesión y vuelve con `devops`. Comprueba que `/api/admin/keys` responde 200 y que `/api/me` lista tu grupo.
- 403 en Identidad: revisa `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD` y `KEYCLOAK_ISSUER`.
- `invalid_scope`: el cliente Keycloak debe tener los client scopes por defecto que incluyen grupos; no fuerces `scope` en la app.

## Seguridad
- Las operaciones de Identidad requieren credenciales de administrador de Keycloak. Mantén estas variables fuera del cliente y limita su uso a backend.
- Revisa periódicamente los grupos con acceso admin para evitar privilegios excesivos.
