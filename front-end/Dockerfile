# Stage 1: Build Angular
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# Stage 2: NGINX
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cambia "front-end" por el nombre real del proyecto dentro de dist/
COPY --from=build /app/dist/front-end /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
