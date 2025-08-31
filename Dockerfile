# Multi-stage Dockerfile for Next.js app with optional DB driver
# Build arg DRIVER selects which DB driver to include: 'postgres' or 'sqlite'

ARG NODE_IMAGE=node:20-bullseye-slim

FROM ${NODE_IMAGE} AS builder
ARG DRIVER=sqlite
WORKDIR /app

# System deps (needed if building native modules like better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install deps (dev included) and build
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Ensure optional directories exist so later COPY doesn't fail
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime image
FROM ${NODE_IMAGE} AS runner
ARG DRIVER=sqlite
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY package.json package-lock.json* ./
# Install only prod deps + selected DB driver
RUN npm install --omit=dev --no-audit --no-fund \
    && if [ "$DRIVER" = "postgres" ]; then npm i --no-save pg; else npm i --no-save better-sqlite3; fi

# Copy build output and minimal runtime files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
CMD ["npm","run","start"]
