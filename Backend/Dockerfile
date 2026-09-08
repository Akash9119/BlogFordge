# BlogForge API — Express 5 on Node 22.
# Multi-arch: builds on both x86_64 and the ARM64 Ampere shapes OCI gives away.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first, so a code-only change reuses this layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# Never run the API as root. The node image already ships an unprivileged user.
USER node

EXPOSE 5050

# Compose waits on this before it starts the frontend; /health reports 503
# while Mongo is unreachable, which is exactly the signal we want.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-5050}/health >/dev/null || exit 1

CMD ["node", "src/server.js"]
