# --- Étape 1 : build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Étape 2 : dépendances de production uniquement ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Étape 3 : image d'exécution ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json ./
# Dossier des images uploadées (monté en volume par docker-compose)
RUN mkdir -p uploads/spaces && chown -R node:node uploads
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
