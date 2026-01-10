# Stage 1: Build de Angular
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build --configuration production

# Stage 2: Servir con Nginx
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# COPIAR EL BUILD CORRECTO
COPY --from=build /app/dist/football-team-manager/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
