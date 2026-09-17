FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run audit:content

FROM nginx:stable-alpine
RUN apk add --no-cache nodejs supervisor
COPY server /app/server
COPY deploy/supervisord.conf /etc/supervisord.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz && wget -q -O /dev/null http://127.0.0.1:3001/healthz || exit 1

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
