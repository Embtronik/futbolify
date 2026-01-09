# Notificación Service - API REST con Autenticación JWT

## 📋 Resumen

Microservicio de notificaciones multicanal (Email, WhatsApp, SMS) con:
- ✅ **API REST** con autenticación JWT
- ✅ **Soporte multicanal**: Envío simultáneo por EMAIL + SMS + WhatsApp
- ✅ **Sistema de templates** dinámicos con Thymeleaf
- ✅ **Integración con Auth-Service** para validación de tokens
- ✅ **Múltiples proveedores**: Twilio, SendGrid
- ✅ **Persistencia en PostgreSQL** para auditoría
- ✅ **Spring Boot 3.4.1** + **Java 21**

---

## 🏗️ Arquitectura

```
Servicio Cliente (User-Service, Order-Service, etc.)
    ↓
    [Obtiene JWT del Auth-Service]
    ↓
    POST /api/v1/notifications/send
    Authorization: Bearer {jwt-token}
    ↓
Notificación-Service
    ├─ Valida JWT con Auth-Service
    ├─ Renderiza template para cada canal (si se especifica)
    ├─ Persiste en PostgreSQL (PENDING)
    ├─ Envía por múltiples canales en paralelo
    └─ Devuelve resultados agregados
```

---

## 🚀 Endpoints Principales

### 1. Enviar Notificación

**POST** `/api/v1/notifications/send`

**Headers:**
```http
Authorization: Bearer {jwt-token-del-auth-service}
Content-Type: application/json
```

**Opción A: Con Template (Un Canal)**
```json
{
  "templateType": "WELCOME_EMAIL",
  "channels": ["EMAIL"],
  "recipient": "user@example.com",
  "variables": {
    "userName": "Juan Pérez",
    "activationLink": "https://app.com/activate?token=abc123"
  }
}
```

**Opción B: Multicanal con Template**
```json
{
  "templateType": "ORDER_CONFIRMATION",
  "channels": ["EMAIL", "SMS"],
  "recipient": "user@example.com",
  "variables": {
    "userName": "Juan Pérez",
    "orderNumber": "12345",
    "orderDate": "2025-12-02",
    "totalAmount": "$150.00"
  },
  "continueOnError": true
}
```

**Opción C: Contenido Directo (Multicanal)**
```json
{
  "channels": ["EMAIL", "SMS", "WHATSAPP"],
  "recipient": "+573001234567",
  "subject": "Código de Verificación",
  "body": "Tu código de verificación es: 123456",
  "continueOnError": false
}
```

**Respuesta Exitosa (Multicanal):**
```json
{
  "success": true,
  "message": "Enviado exitosamente por 2 de 2 canales",
  "channelResults": [
    {
      "notificationId": "550e8400-e29b-41d4-a716-446655440000",
      "channel": "EMAIL",
      "provider": "SENDGRID_EMAIL",
      "status": "SENT",
      "success": true,
      "message": "Enviado exitosamente por EMAIL"
    },
    {
      "notificationId": "660e8400-e29b-41d4-a716-446655440001",
      "channel": "SMS",
      "provider": "TWILIO_SMS",
      "status": "SENT",
      "success": true,
      "message": "Enviado exitosamente por SMS"
    }
  ],
  "timestamp": "2025-12-02T23:00:00"
}
```

**Respuesta con Fallo Parcial:**
```json
{
  "success": true,
  "message": "Enviado exitosamente por 1 de 2 canales",
  "channelResults": [
    {
      "notificationId": "550e8400-e29b-41d4-a716-446655440000",
      "channel": "EMAIL",
      "provider": "SENDGRID_EMAIL",
      "status": "SENT",
      "success": true,
      "message": "Enviado exitosamente por EMAIL"
    },
    {
      "notificationId": "660e8400-e29b-41d4-a716-446655440001",
      "channel": "WHATSAPP",
      "provider": "NONE",
      "status": "FAILED",
      "success": false,
      "message": "Proveedor no configurado",
      "errorMessage": "No provider configured for channel: WHATSAPP"
    }
  ],
  "timestamp": "2025-12-02T23:00:00"
}
```

---

### 2. Templates Disponibles

**GET** `/api/v1/templates/channel/{channel}`

Ejemplo: `GET /api/v1/templates/channel/EMAIL`

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "templateType": "WELCOME_EMAIL",
    "channel": "EMAIL",
    "name": "Email de Bienvenida",
    "description": "Email enviado al registrarse",
    "subject": "Bienvenido, [[${userName}]]!",
    "expectedVariables": "[\"userName\", \"activationLink\"]"
  }
]
```

---

## 🔧 Configuración

### Variables de Entorno Requeridas

#### Auth Service (CRÍTICO)
```bash
AUTH_SERVICE_URL=http://localhost:8081
AUTH_SERVICE_ENABLED=true  # false para desarrollo sin auth
```

#### Base de Datos
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notifications_db
DB_USERNAME=postgres
DB_PASSWORD=secret
```

#### Proveedores de Email
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@tuapp.com
SENDGRID_FROM_NAME=Tu Aplicación
```

#### Proveedores de WhatsApp/SMS
```bash
WHATSAPP_PROVIDER=twilio
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SMS_FROM=+1234567890
```

#### RabbitMQ (Opcional - para uso futuro)
```bash
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
```

---

## 📝 Templates Precargados

El sistema incluye 5 templates de ejemplo:

| Template Type | Canal | Descripción |
|--------------|-------|-------------|
| `WELCOME_EMAIL` | EMAIL | Email de bienvenida al registrarse |
| `ORDER_CONFIRMATION` | EMAIL | Confirmación de pedido |
| `PASSWORD_RESET` | EMAIL | Recuperación de contraseña |
| `ORDER_CONFIRMATION` | SMS | Confirmación de pedido (SMS corto) |
| `APPOINTMENT_REMINDER` | WHATSAPP | Recordatorio de cita |

### Variables por Template

**WELCOME_EMAIL:**
- `userName` - Nombre del usuario
- `activationLink` - URL de activación

**ORDER_CONFIRMATION:**
- `userName` - Nombre del usuario
- `orderNumber` - Número de pedido
- `totalAmount` - Monto total

**PASSWORD_RESET:**
- `userName` - Nombre del usuario
- `resetLink` - URL para resetear
- `expirationMinutes` - Tiempo de expiración

---

## 🔐 Integración con Auth-Service

### Flujo de Autenticación

1. **Cliente obtiene token JWT:**
```bash
POST http://auth-service:8081/api/v1/auth/login
{
  "username": "user-service",
  "password": "secret"
}

# Respuesta
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

2. **Cliente usa el token para enviar notificación:**
```bash
POST http://notification-service:8080/api/v1/notifications/send
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "templateType": "ORDER_CONFIRMATION",
  "channel": "EMAIL",
  "recipient": "cliente@example.com",
  "variables": {
    "userName": "María García",
    "orderNumber": "ORD-12345",
    "totalAmount": "149.99"
  }
}
```

3. **Notification-Service valida el token:**
   - Extrae el token del header `Authorization`
   - Llama a `POST {AUTH_SERVICE_URL}/api/v1/auth/validate`
   - Si es válido, procesa la notificación
   - Si es inválido, retorna `401 Unauthorized`

---

## 🛠️ Desarrollo Local

### 1. Iniciar Base de Datos
```bash
docker run -d \
  --name postgres-notifications \
  -e POSTGRES_DB=notifications_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Configurar Variables de Entorno
Crear archivo `.env` o configurar en `application-dev.yml`:
```yaml
auth-service:
  url: http://localhost:8081
  enabled: false  # Desactivar en desarrollo
```

### 3. Ejecutar el Servicio
```bash
mvn spring-boot:run
```

### 4. Probar sin Autenticación (Dev)
Cuando `AUTH_SERVICE_ENABLED=false`:
```bash
curl -X POST http://localhost:8080/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "EMAIL",
    "recipient": "test@example.com",
    "subject": "Test",
    "body": "Este es un mensaje de prueba"
  }'
```

---

## 📊 Monitoreo

### Health Check
```bash
GET http://localhost:8080/actuator/health
```

**Respuesta:**
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "rabbitmq": { "status": "UP" }
  }
}
```

### Métricas
```bash
GET http://localhost:8080/actuator/metrics
GET http://localhost:8080/actuator/prometheus
```

---

## 🧪 Ejemplos de Uso desde Otros Servicios

### Ejemplo en Java (Spring) - Multicanal
```java
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final RestTemplate restTemplate;
    private final AuthServiceClient authClient;
    
    public void sendOrderConfirmation(Order order) {
        // 1. Obtener token del auth service
        String token = authClient.getServiceToken();
        
        // 2. Preparar request MULTICANAL
        NotificationRequest request = NotificationRequest.builder()
            .templateType(TemplateType.ORDER_CONFIRMATION)
            .channels(List.of(Channel.EMAIL, Channel.SMS))  // Multicanal
            .recipient(order.getCustomerEmail())
            .variables(Map.of(
                "userName", order.getCustomerName(),
                "orderNumber", order.getOrderNumber(),
                "orderDate", order.getCreatedAt().toString(),
                "totalAmount", order.getTotal().toString()
            ))
            .continueOnError(true)  // Continuar aunque un canal falle
            .build();
        
        // 3. Enviar a notification service
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        
        HttpEntity<NotificationRequest> entity = new HttpEntity<>(request, headers);
        
        ResponseEntity<NotificationResponse> response = restTemplate.postForEntity(
            "http://notification-service:8080/api/v1/notifications/send",
            entity,
            NotificationResponse.class
        );
        
        // 4. Procesar respuesta multicanal
        if (response.getBody().isSuccess()) {
            log.info("Notification sent successfully to {} channels", 
                response.getBody().getChannelResults().size());
            
            // Verificar resultado de cada canal
            for (var result : response.getBody().getChannelResults()) {
                if (result.isSuccess()) {
                    log.info("Channel {} sent successfully: {}", 
                        result.getChannel(), result.getNotificationId());
                } else {
                    log.warn("Channel {} failed: {}", 
                        result.getChannel(), result.getErrorMessage());
                }
            }
        }
    }
}
```

### Ejemplo Simple - Un Canal
```java
public void sendPasswordReset(User user) {
    String token = authClient.getServiceToken();
    
    NotificationRequest request = NotificationRequest.builder()
        .templateType(TemplateType.PASSWORD_RESET)
        .channels(List.of(Channel.EMAIL))  // Solo email
        .recipient(user.getEmail())
        .variables(Map.of(
            "userName", user.getName(),
            "resetLink", generateResetLink(user),
            "expirationMinutes", "30"
        ))
        .build();
    
    // ... enviar request
}
```

---

## 📁 Estructura del Proyecto

```
src/main/java/io/github/giovanny/notifications/
├── config/
│   ├── AuthServiceProperties.java      # Configuración Auth Service
│   ├── SecurityConfig.java             # Spring Security
│   ├── WebClientConfig.java            # Cliente HTTP
│   ├── RabbitMQConfig.java             # RabbitMQ (opcional)
│   └── ProviderProperties.java         # Proveedores externos
├── controller/
│   ├── NotificationController.java     # API REST principal (multicanal)
│   └── TemplateController.java         # Gestión de templates
├── domain/
│   ├── entity/
│   │   ├── NotificationLog.java        # Auditoría
│   │   └── NotificationTemplate.java   # Templates
│   ├── enums/
│   │   ├── Channel.java                # EMAIL, SMS, WHATSAPP
│   │   ├── TemplateType.java
│   │   ├── NotificationStatus.java
│   │   └── ProviderType.java
│   └── model/
│       ├── NotificationRequest.java    # Soporta List<Channel>
│       └── NotificationResponse.java   # Devuelve List<ChannelResult>
├── security/
│   ├── JwtAuthenticationFilter.java    # Filtro JWT
│   └── AuthServiceClient.java          # Cliente Auth Service
├── service/
│   ├── NotificationService.java        # Orquestador multicanal
│   ├── TemplateService.java            # Renderizado templates
│   ├── NotificationPersistenceService.java
│   └── provider/
│       ├── NotificationProvider.java
│       ├── factory/NotificationProviderFactory.java
│       ├── twilio/
│       └── sendgrid/
└── repository/
    ├── NotificationLogRepository.java
    └── NotificationTemplateRepository.java
```

---

## 🔀 Características Multicanal

### Cómo Funciona

El servicio soporta envío simultáneo por múltiples canales:

```json
{
  "channels": ["EMAIL", "SMS", "WHATSAPP"],
  "recipient": "user@example.com",
  "templateType": "ORDER_CONFIRMATION"
}
```

**Proceso:**
1. Se valida el JWT
2. Se renderiza el template apropiado para cada canal
3. Se persiste un log por cada canal en PostgreSQL
4. Se envía por cada proveedor en paralelo
5. Se devuelve un array con el resultado de cada canal

### Campo `continueOnError`

```json
{
  "channels": ["EMAIL", "SMS"],
  "continueOnError": true  // Default: false
}
```

- **`true`**: Continúa enviando por otros canales aunque uno falle
- **`false`**: Se detiene al primer fallo

### Resultado por Canal

La respuesta incluye `channelResults` con el detalle de cada canal:

```json
{
  "success": true,
  "message": "Enviado exitosamente por 2 de 3 canales",
  "channelResults": [
    {
      "notificationId": "uuid-1",
      "channel": "EMAIL",
      "provider": "SENDGRID_EMAIL",
      "status": "SENT",
      "success": true,
      "message": "Enviado exitosamente por EMAIL"
    },
    {
      "notificationId": "uuid-2",
      "channel": "SMS",
      "provider": "TWILIO_SMS",
      "status": "SENT",
      "success": true,
      "message": "Enviado exitosamente por SMS"
    },
    {
      "notificationId": "uuid-3",
      "channel": "WHATSAPP",
      "provider": "NONE",
      "status": "FAILED",
      "success": false,
      "message": "Proveedor no configurado",
      "errorMessage": "No provider configured for channel: WHATSAPP"
    }
  ]
}
```

### Templates por Canal

Cada template puede tener una versión diferente por canal:

- **EMAIL**: Template completo con HTML, subject, etc.
- **SMS**: Versión corta (160 caracteres)
- **WHATSAPP**: Formato intermedio con markdown

Ejemplo:
```json
{
  "templateType": "ORDER_CONFIRMATION",
  "channels": ["EMAIL", "SMS"],
  "variables": {
    "orderNumber": "12345"
  }
}
```

El servicio automáticamente renderiza:
- **EMAIL**: Subject + Body HTML completo
- **SMS**: Body corto (ej: "Pedido #12345 confirmado")

---

## ✅ Checklist de Implementación

- [x] Actualizar Spring Boot a 3.4.1
- [x] Agregar Spring Security + JWT
- [x] Crear sistema de templates con Thymeleaf
- [x] Implementar autenticación con Auth-Service
- [x] Crear REST Controllers
- [x] Migraciones de base de datos (Flyway)
- [x] Templates de ejemplo precargados
- [x] Documentación completa

---

## 🎯 Próximos Pasos Sugeridos

1. **Crear tests de integración** con Testcontainers
2. **Agregar Swagger/OpenAPI** para documentación interactiva
3. **Implementar rate limiting** por servicio/usuario
4. **Agregar circuit breaker** (Resilience4j) para proveedores externos
5. **Implementar consumer RabbitMQ** para notificaciones asíncronas
6. **Agregar métricas custom** de notificaciones enviadas

---

## 📞 Contacto y Soporte

Para dudas o problemas, revisar:
- Logs del servicio: `logging.level.io.github.giovanny.notifications=DEBUG`
- Health check: `/actuator/health`
- Verificar conectividad con Auth-Service y proveedores

---

**Versión:** 1.0.0  
**Spring Boot:** 3.4.1  
**Java:** 21  
**Última actualización:** Diciembre 2025
