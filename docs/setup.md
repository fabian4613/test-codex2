#!/usr/bin/env markdown
# Setup / Inicio Rápido

## Docker (desarrollo)

SQLite + Keycloak (hot reload):

```
npm run docker:sqlite
# App: http://localhost:3000
# Keycloak: http://localhost:8080 (admin/admin)
# Usuarios: devops/devops (admin), dev/dev
```

PostgreSQL + Keycloak:

```
npm run docker:pg
```

## Local sin Docker

1) Instala dependencias

```
npm install
```

2) Driver de BD y variables

SQLite:

```
npm i better-sqlite3
```

PostgreSQL:

```
npm i pg
```

Crea `.env.local` con lo mínimo:

```
NEXT_PUBLIC_PERSIST_REMOTE=1
AUTH_REQUIRED=1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=devsecret
KEYCLOAK_ISSUER=http://localhost:8080/realms/myrealm
KEYCLOAK_CLIENT_ID=dashboard
KEYCLOAK_CLIENT_SECRET=changeme
NEXT_PUBLIC_ADMIN_GROUP=devops

# SQLite
PERSIST_DRIVER=sqlite
SQLITE_FILE=./data.sqlite

# PostgreSQL
# PERSIST_DRIVER=postgres
# DATABASE_URL=postgres://user:pass@localhost:5432/dashy
```

3) Arranca la app

```
npm run dev:sqlite
# o
npm run dev:pg
```

## Producción local

```
npm run build && npm run start:sqlite
# o
npm run start:pg
```

