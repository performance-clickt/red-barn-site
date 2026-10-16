FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1
ARG EMDASH_SITE_URL
ENV EMDASH_SITE_URL=$EMDASH_SITE_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run test:cms

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends nginx supervisor ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=127.0.0.1 PORT=4321 EMDASH_DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/seed ./seed
COPY --from=build /app/package.json ./package.json
COPY scripts/emdash/import-content.mjs ./scripts/emdash/import-content.mjs
COPY server ./server
COPY deploy/supervisord.conf /etc/supervisord.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default && mkdir -p /app/data && chown -R node:node /app/data
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD ["node", "/app/server/healthcheck.mjs"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
