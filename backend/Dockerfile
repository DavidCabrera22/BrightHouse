# Imagen del backend para Coolify.
#
# Dos etapas para que la imagen final no cargue con las dependencias de
# compilación: la de build necesita el compilador de TypeScript y el CLI de
# Nest, la de ejecución solo necesita `dist/` y las dependencias de producción.
#
# El contexto de build es la carpeta `backend/`, así que en Coolify hay que
# poner "Base Directory" = /backend.

# ── Build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Se copian solo los manifiestos primero: mientras no cambien, Docker reutiliza
# la capa de npm ci y el despliegue no vuelve a descargar todo.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Ejecución ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Informativo: Coolify enruta al puerto que le indiques, y la app escucha en
# process.env.PORT.
EXPOSE 3000

CMD ["node", "dist/main"]
