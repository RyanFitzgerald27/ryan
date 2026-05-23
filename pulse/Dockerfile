# syntax=docker/dockerfile:1.6

# ---------- Build the Angular client ----------
FROM node:20 AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---------- Build the server ----------
FROM node:20 AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ---------- Runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app/server

ENV NODE_ENV=production

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist /app/client/dist

RUN mkdir -p /app/server/data

EXPOSE 4000
CMD ["node", "dist/index.js"]
