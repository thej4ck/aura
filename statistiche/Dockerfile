# syntax=docker/dockerfile:1
# Il servizio delle statistiche anonime: Node, senza dipendenze. I contatori stanno sul volume /data.
FROM node:24-alpine
WORKDIR /app
COPY conteggi.mjs server.mjs ./
ENV DATI=/data/conteggi.json
# ponytail: gira come root perché Railway monta i volumi di root e un utente normale non ci scriverebbe.
# Il servizio non ha un dominio pubblico: lo raggiunge solo Caddy dalla rete privata. Se servirà, un
# entrypoint che fa chown di /data e poi passa a `node` (su-exec)
CMD ["node", "server.mjs"]
