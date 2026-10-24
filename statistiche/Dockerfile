# syntax=docker/dockerfile:1
# Il servizio delle statistiche anonime: Node, senza dipendenze. I contatori stanno sul volume /data.
FROM node:24-alpine
WORKDIR /app
COPY conteggi.mjs server.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
ENV DATI=/data/conteggi.json
CMD ["node", "server.mjs"]
