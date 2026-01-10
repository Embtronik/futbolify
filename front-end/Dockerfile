# Stage 1: Build de la aplicación Angular
FROM node:20-alpine AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar el código fuente
COPY . .

# Construir la aplicación para producción
RUN npm run build -- --configuration production

# Stage 2: Servir con Nginx
FROM nginx:1.29-alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados desde el stage de build
COPY --from=build /app/dist/front-end/browser /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
