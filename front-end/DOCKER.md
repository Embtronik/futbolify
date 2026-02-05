# 🐳 Docker - Football Team Manager Frontend

## Construcción de la Imagen

### Opción 1: Usando scripts automatizados

**Windows:**
```bash
docker-build.bat
```

**Linux/Mac:**
```bash
chmod +x docker-build.sh
./docker-build.sh
```

### Opción 2: Comando directo
```bash
docker build -t football-team-manager-frontend:latest .
```

## Ejecución del Contenedor

### Desarrollo/Pruebas locales
```bash
docker run -d -p 80:80 --name football-frontend football-team-manager-frontend:latest
```

Acceder en: http://localhost

### Con variables de entorno
```bash
docker run -d -p 80:80 \
  --name football-frontend \
  -e API_URL=http://tu-backend:8080 \
  football-team-manager-frontend:latest
```

## Comandos Útiles

### Ver logs del contenedor
```bash
docker logs -f football-frontend
```

### Detener el contenedor
```bash
docker stop football-frontend
```

### Eliminar el contenedor
```bash
docker rm football-frontend
```

### Detener y eliminar (en un comando)
```bash
docker stop football-frontend && docker rm football-frontend
```

### Ver contenedores en ejecución
```bash
docker ps
```

### Ver todas las imágenes
```bash
docker images
```

### Eliminar la imagen
```bash
docker rmi football-team-manager-frontend:latest
```

## Docker Compose

Si tienes un `docker-compose.yml`:

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reconstruir y reiniciar
docker-compose up -d --build
```

## Estructura de la Imagen

La imagen se construye en 2 etapas:

1. **Build Stage**: Usa Node.js 20 Alpine para compilar la aplicación Angular
2. **Runtime Stage**: Usa Nginx 1.27 Alpine para servir los archivos estáticos

### Ventajas:
- ✅ Imagen final muy ligera (~25MB)
- ✅ Solo contiene archivos necesarios para producción
- ✅ Nginx optimizado para servir SPAs
- ✅ Configuración de seguridad incluida

## Configuración de Nginx

El archivo `nginx.conf` incluye:
- Compresión GZIP
- Cabeceras de seguridad
- Cache optimizado para assets estáticos
- Fallback a index.html para rutas de Angular

## Troubleshooting

### Error: Cannot find module '@angular/...'
**Solución**: Asegúrate de que `package.json` y `package-lock.json` estén presentes y actualizados.

### Error: Budget exceeded
**Solución**: Ya está corregido en `angular.json` con budgets más amplios.

### Error: EACCES permission denied
**Solución**: En Linux/Mac, ejecuta con `sudo` o agrega tu usuario al grupo docker:
```bash
sudo usermod -aG docker $USER
```

### La aplicación no carga en el navegador
**Verificar**:
1. El contenedor está corriendo: `docker ps`
2. Los logs no muestran errores: `docker logs football-frontend`
3. El puerto no está ocupado: `netstat -an | grep :80`

## Optimizaciones Aplicadas

1. ✅ **npm ci** en lugar de npm install (más rápido y confiable)
2. ✅ **Multi-stage build** para reducir tamaño de imagen
3. ✅ **Alpine Linux** como base (imagen mínima)
4. ✅ **.dockerignore** para excluir archivos innecesarios
5. ✅ **Budgets aumentados** para evitar errores de build
6. ✅ **fileReplacements** configurado para producción
7. ✅ **Optimización y minificación** habilitadas en build de producción

## Notas Importantes

- ⚠️ La imagen usa `environment.prod.ts` para la configuración de producción
- ⚠️ Asegúrate de que las URLs del backend estén correctamente configuradas
- ⚠️ En producción, considera usar variables de entorno o ConfigMaps (Kubernetes)
