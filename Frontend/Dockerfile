# The SPA and the public edge in one image.
#
# Stage 1 compiles the React app; stage 2 is Caddy, which serves the static
# build *and* reverse-proxies /api to the Node container. One process on the
# edge means one place that terminates TLS and one origin for the browser —
# so the app's default same-origin `/api/v1` base URL just works and the API's
# CORS allowlist is never in the request path.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Left empty on purpose: the app falls back to the relative `/api/v1`, which
# Caddy proxies. Only set this if you ever split the API onto its own hostname.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM caddy:2-alpine

COPY --from=build /app/dist /srv

EXPOSE 80 443
