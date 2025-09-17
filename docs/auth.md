# Autenticación y Control de Acceso

La app usa NextAuth con Keycloak. El acceso al panel de administración se concede a miembros del grupo definido en `NEXT_PUBLIC_ADMIN_GROUP` (por defecto `devops`).

## Variables

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=devsecret
KEYCLOAK_ISSUER=http://localhost:8080/realms/myrealm
KEYCLOAK_CLIENT_ID=dashboard
KEYCLOAK_CLIENT_SECRET=changeme
NEXT_PUBLIC_ADMIN_GROUP=devops
AUTH_REQUIRED=1
```

## Notas
- El realm de ejemplo ya incluye el scope/grant de `groups` por defecto en el cliente `dashboard`.
- Si el token no trae grupos, el servidor intenta recuperarlos desde `userinfo` y, en última instancia, desde la API de administración de Keycloak.
- El botón “Admin” puede aparecer tras el primer ping a `/api/admin/keys` (proba que esa ruta devuelva 200).

