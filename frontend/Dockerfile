# --- Étape 1 : build Angular ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

# --- Étape 2 : Nginx sert les fichiers statiques ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/coworking-frontend/browser /usr/share/nginx/html
EXPOSE 80
