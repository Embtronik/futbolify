# Stage 1: Build Angular
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN npm ci --legacy-peer-deps

# Copiar todo el código fuente
COPY . .

# Build para producción
RUN npm run build -- --configuration production

# Stage 2: Serve with NGINX
FROM nginx:1.27-alpine

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos del build de Angular
COPY --from=build /app/dist/football-team-manager/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
