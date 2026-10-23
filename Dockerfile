# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# fornita da Railway: diventa la versione del sito (vite.config.ts)
ARG RAILWAY_GIT_COMMIT_SHA
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
# porta > 1024 e config non persistita: Caddy non ha bisogno di root
USER nobody
