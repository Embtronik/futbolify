# Auth Service

Servicio de autenticación desarrollado con Spring Boot que soporta autenticación mediante Google OAuth2 y registro tradicional con email/contraseña con verificación por correo electrónico.

## Características

- ✅ Autenticación con Google OAuth2
- ✅ Registro con email y contraseña
- ✅ Verificación de email con tokens
- ✅ JWT para manejo de sesiones
- ✅ Refresh tokens para renovar acceso
- ✅ Integración con Servicio de Notificaciones externo
- ✅ Manejo global de excepciones
- ✅ Validación de datos con Bean Validation

## Tecnologías

- Java 21
- Spring Boot 3.2.0
- Spring Security
- Spring Data JPA
- PostgreSQL / H2
- JWT (jjwt 0.12.3)
- RestTemplate (comunicación con microservicios)
- Lombok

## Configuración Rápida

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd Auth-Service
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=authdb
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Google OAuth2 (obtener de Google Cloud Console)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# JWT Secret (genera una clave segura)
JWT_SECRET=tu-jwt-secret-key-base64

# Notification Service URL
NOTIFICATION_SERVICE_URL=http://localhost:8081

# (Opcional) Ya no se requiere JWT estático para notificaciones.
# El cliente genera un JWT efímero de servicio cuando no hay Authorization.

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. Configurar Base de Datos

Opción A: PostgreSQL (producción)
```bash
# Crear base de datos
createdb authdb

# Las tablas se crean automáticamente al iniciar la aplicación
```

Opción B: H2 (desarrollo/testing)
```yaml
# En application.yml, cambiar datasource a:
spring:
  datasource:
    url: jdbc:h2:mem:authdb
    driver-class-name: org.h2.Driver
```

### 4. Configurar Google OAuth2

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+
4. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación web
   - URI de redirección autorizada: `http://localhost:8080/login/oauth2/code/google`
5. Copia el Client ID y Client Secret al archivo `.env`

### 5. Configurar Gmail para envío de emails

**IMPORTANTE:** Este servicio ya NO envía emails directamente. Los emails son manejados por el **Servicio de Notificaciones** externo.

Para que las notificaciones funcionen:
1. Asegúrate de tener el Servicio de Notificaciones ejecutándose
2. Configura la URL correcta en `NOTIFICATION_SERVICE_URL`
3. El Servicio de Notificaciones se encargará de la configuración SMTP

### 6. Ejecutar la aplicación

```bash
# Compilar
mvn clean install

# Ejecutar
mvn spring-boot:run
```

La aplicación estará disponible en `http://localhost:8080`

## Endpoints de la API

### Autenticación Pública

#### Registro con email/contraseña
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "password123"
}
```

#### Verificar email
```http
GET /api/v1/auth/verify-email?token={token}
```

#### Reenviar email de verificación
```http
POST /api/v1/auth/resend-verification?email=usuario@example.com
```

#### Renovar token de acceso
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "uuid-refresh-token"
}
```

#### Login con Google
```http
GET /oauth2/authorization/google
# Redirige a Google para autenticación
# Después redirige a: {FRONTEND_URL}/oauth2/redirect?token={jwt}&refreshToken={refresh}
```

### Endpoints Protegidos

Requieren header: `Authorization: Bearer {jwt-token}`

#### Obtener usuario actual
```http
GET /api/v1/user/me
```

## Estructura del Proyecto

```
src/main/java/com/authservice/
├── client/             # Clientes para servicios externos
│   └── NotificationClient.java
├── config/             # Configuraciones
│   └── RestTemplateConfig.java
├── controller/          # Controladores REST
│   ├── AuthController.java
│   └── UserController.java
├── dto/                 # Data Transfer Objects
│   ├── AuthResponse.java
│   ├── LoginRequest.java
│   ├── MessageResponse.java
│   ├── RefreshTokenRequest.java
│   ├── RegisterRequest.java
│   └── notification/
│       ├── EmailNotificationRequest.java
│       └── NotificationResponse.java
├── exception/          # Manejo de excepciones
│   ├── BadRequestException.java
│   ├── ErrorResponse.java
│   ├── GlobalExceptionHandler.java
│   └── ResourceNotFoundException.java
├── model/              # Entidades JPA
│   ├── AuthProvider.java
│   ├── RefreshToken.java
│   ├── Role.java
│   ├── User.java
│   └── VerificationToken.java
├── repository/         # Repositorios JPA
│   ├── RefreshTokenRepository.java
│   ├── UserRepository.java
│   └── VerificationTokenRepository.java
├── security/           # Configuración de seguridad
│   ├── CustomOAuth2UserService.java
│   ├── JwtAuthenticationFilter.java
│   ├── OAuth2AuthenticationSuccessHandler.java
│   └── SecurityConfig.java
├── service/            # Lógica de negocio
│   ├── AuthService.java
│   ├── EmailService.java
│   └── JwtService.java
└── AuthServiceApplication.java

src/main/resources/
└── application.yml     # Configuración
```

## Flujo de Autenticación

### Registro con Email

1. Usuario se registra con email/contraseña
2. Se crea el usuario con `emailVerified=false`
3. Se genera un token de verificación (válido 24h)
4. Se envía solicitud al Servicio de Notificaciones
5. El Servicio de Notificaciones envía el email
6. Se devuelven JWT tokens (el usuario puede usar la app)
7. Usuario hace clic en el link del email
8. Email se marca como verificado
9. El Servicio de Notificaciones envía email de bienvenida

### Login con Google

1. Usuario hace clic en "Login with Google"
2. Redirige a Google para autenticación
3. Google redirige de vuelta con código
4. Se crea/actualiza usuario con `emailVerified=true` y `provider=GOOGLE`
5. Se generan JWT tokens
6. Redirige al frontend con tokens en query params

## Configuración de Seguridad

- **Encriptación de contraseñas**: BCrypt con fuerza 10
- **JWT**:
  - Access Token: 24 horas
  - Refresh Token: 7 días
  - Algoritmo: HS256
- **CORS**: Configurado para localhost:3000 y localhost:5173
- **Sesiones**: Stateless (sin almacenamiento en servidor)
- **Notificaciones**: Delegadas a servicio externo (sin credenciales SMTP en Auth Service)

## Desarrollo

### Ejecutar con perfil de desarrollo

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Habilitar logs de debugging

En `application.yml`:
```yaml
logging:
  level:
    com.authservice: DEBUG
    org.springframework.security: DEBUG
```

### Probar endpoints

Usa Postman, cURL o cualquier cliente HTTP:

```bash
# Registro
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'`
```

## Integración con Servicio de Notificaciones

Este servicio **NO envía emails directamente**. En su lugar, se comunica con un **Servicio de Notificaciones** externo que maneja:

- 📧 Envío de emails (SMTP)
- 📱 WhatsApp (futuro)
- 💬 SMS (futuro)

### ¿Cómo funciona?

1. Auth Service crea una solicitud de notificación
2. Envía HTTP POST a `{NOTIFICATION_SERVICE_URL}/api/v1/notifications/email`
3. El Servicio de Notificaciones:
   - Renderiza el template HTML
   - Envía el email vía SMTP
   - Retorna confirmación

### Estructura de la solicitud

```json
{
  "to": "user@example.com",
  "subject": "Verifica tu dirección de email",
  "template": "email-verification",
  "data": {
    "name": "Juan",
    "verificationUrl": "http://localhost:3000/verify?token=xxx"
  }
}
```

### Templates soportados (en Servicio de Notificaciones)

- `email-verification`: Email de verificación con link
- `welcome-email`: Email de bienvenida después de verificar

**Nota:** Los templates HTML se encuentran en el Servicio de Notificaciones, no en este proyecto.

### ¿Qué pasa si el Servicio de Notificaciones no está disponible?

- El registro/login **sí funcionará**
- El error se registra en logs
- El usuario puede solicitar reenvío del email más tarde

## Próximas Mejoras

- [ ] Rate limiting en endpoints de autenticación
- [ ] Limpieza automática de tokens expirados
- [ ] Reset de contraseña
- [ ] Múltiples roles por usuario
- [ ] Soporte para más proveedores OAuth2 (Facebook, GitHub)
- [ ] Circuit breaker para llamadas al Servicio de Notificaciones
- [ ] Health check endpoint que verifique disponibilidad del Servicio de Notificaciones

## Despliegue con Docker

### Desarrollo Local con Docker Compose

El proyecto incluye `docker-compose.yml` para ejecutar toda la infraestructura localmente:

```bash
# Crear archivo .env con las variables necesarias
cp .env.example .env

# Iniciar servicios (PostgreSQL + Auth Service)
docker-compose up -d

# Ver logs
docker-compose logs -f auth-service

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (limpia la base de datos)
docker-compose down -v
```

La aplicación estará disponible en `http://localhost:8080` y PostgreSQL en `localhost:5432`.

### Construcción de Imagen Docker

```bash
# Construir imagen
docker build -t auth-service:latest .

# Ejecutar contenedor (requiere PostgreSQL corriendo)
docker run -d \
  --name auth-service \
  -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=authdb \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  -e GOOGLE_CLIENT_ID=tu-client-id \
  -e GOOGLE_CLIENT_SECRET=tu-secret \
  -e JWT_SECRET=tu-jwt-secret \
  -e NOTIFICATION_SERVICE_URL=http://notification-service:8081 \
  -e FRONTEND_URL=http://localhost:3000 \
  auth-service:latest
```

### Características del Dockerfile

- ✅ **Multi-stage build**: Reduce tamaño de imagen final
- ✅ **Maven cache**: Cachea dependencias para builds más rápidas
- ✅ **Usuario no-root**: Ejecuta la aplicación con usuario `spring` (seguridad)
- ✅ **Health check**: Verificación automática del estado del contenedor
- ✅ **Optimización JVM**: Configuración de memoria (256MB-512MB)

## Despliegue en Fly.io

### Requisitos Previos

1. Instalar [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Crear cuenta en [Fly.io](https://fly.io)
3. Login: `flyctl auth login`

### Configurar Base de Datos PostgreSQL

```bash
# Crear aplicación PostgreSQL en Fly.io
flyctl postgres create --name auth-service-db --region mia

# Conectar la base de datos a tu app (opcional, o usar connection string)
flyctl postgres attach auth-service-db --app auth-service
```

### Configurar Secrets

```bash
# Configurar variables sensibles como secrets
flyctl secrets set \
  DB_HOST=auth-service-db.internal \
  DB_PORT=5432 \
  DB_NAME=auth_service \
  DB_USERNAME=postgres \
  DB_PASSWORD=tu-password-seguro \
  GOOGLE_CLIENT_ID=tu-google-client-id \
  GOOGLE_CLIENT_SECRET=tu-google-secret \
  JWT_SECRET=tu-jwt-secret-base64 \
  NOTIFICATION_SERVICE_URL=https://tu-notification-service.fly.dev \
  FRONTEND_URL=https://tu-frontend.com
```

### Desplegar Aplicación

```bash
# Primera vez: Inicializar app (fly.toml ya está incluido)
flyctl launch --no-deploy

# Desplegar
flyctl deploy

# Ver logs
flyctl logs

# Abrir aplicación en navegador
flyctl open

# Ver estado
flyctl status

# Escalar recursos (si es necesario)
flyctl scale vm shared-cpu-1x --memory 512
```

### Actualizar URI de Redirección de Google OAuth2

Después del despliegue, agrega la URI de redirección en Google Cloud Console:

```
https://tu-app.fly.dev/login/oauth2/code/google
```

### Configuración en fly.toml

El archivo `fly.toml` incluye:
- ✅ Región: `mia` (Miami) - Cambiar según necesidad
- ✅ Health checks en `/actuator/health`
- ✅ Auto-scaling: Escala a 0 cuando no hay tráfico
- ✅ HTTPS forzado
- ✅ Recursos: 1 CPU, 512MB RAM

### Comandos Útiles

```bash
# Ver aplicaciones
flyctl apps list

# SSH al contenedor
flyctl ssh console

# Reiniciar app
flyctl apps restart auth-service

# Destruir app
flyctl apps destroy auth-service
```

### Costos

- **Free tier** de Fly.io incluye:
  - 3 VMs compartidas con 256MB RAM
  - 160GB de tráfico saliente
  - Suficiente para desarrollo/staging

- PostgreSQL tiene costo adicional (~$2/mes para instancia pequeña)

## Licencia

MIT

## Autor

Giovanny - Auth Service
