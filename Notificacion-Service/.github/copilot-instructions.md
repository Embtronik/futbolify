# Notificacion-Service - AI Agent Instructions

## Project Overview
Microservicio de notificaciones multicanal (Email, WhatsApp, SMS) construido con Spring Boot 3.x y Java 21. Diseñado para ser consumido por otros servicios mediante colas RabbitMQ, con persistencia en PostgreSQL para auditoría de notificaciones. Desplegado en Fly.io como contenedor Docker.

**Package Naming Convention**: `io.github.giovanny.notifications` (recomendado para proyectos personales/open source)
- Alternativa empresarial: `com.empresa.notifications` si es para una organización

## Architecture & Key Components

### Core Structure
```
src/main/java/io/github/giovanny/notifications/
├── config/           # RabbitMQ, PostgreSQL, provider configurations
├── domain/           
│   ├── entity/       # NotificationLog (JPA entity para auditoría)
│   ├── enums/        # Channel, NotificationStatus, ProviderType
│   └── model/        # NotificationRequest, NotificationResponse (DTOs)
├── repository/       # NotificationLogRepository (Spring Data JPA)
├── service/          
│   ├── NotificationService.java        # Orchestrator principal
│   ├── NotificationPersistenceService.java  # Manejo de persistencia
│   └── provider/     # EmailProvider, WhatsAppProvider, SmsProvider (Strategy)
│       ├── NotificationProvider.java   # Interface común
│       ├── twilio/   # TwilioWhatsAppProvider, TwilioSmsProvider
│       ├── sendgrid/ # SendGridEmailProvider
│       └── factory/  # ProviderFactory (selecciona según env vars)
├── consumer/         # RabbitMQ message consumers
└── exception/        # ProviderNotConfiguredException, NotificationException
```

### Design Patterns in Use
- **Strategy Pattern**: Para proveedores de notificación intercambiables (implementar `NotificationProvider` interface)
- **Factory Pattern**: `NotificationProviderFactory` selecciona proveedor según variables de entorno
- **Message Queue**: RabbitMQ como bus de eventos asíncrono

## Configuration Management

### Environment Variables (Critical)
Todas las configuraciones sensibles y de proveedores deben ser externalizadas:

```properties
# PostgreSQL (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notifications_db
DB_USERNAME=postgres
DB_PASSWORD=secret
# Connection pool (HikariCP)
DB_POOL_SIZE=10
DB_MAX_LIFETIME=1800000

# RabbitMQ (REQUIRED)
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE_NAME=notifications.queue
RABBITMQ_EXCHANGE=notifications.exchange

# Email Provider (flexible, actualmente Twilio SendGrid recomendado)
EMAIL_PROVIDER=sendgrid  # Options: sendgrid, ses, smtp, mailgun
SENDGRID_API_KEY=${SENDGRID_API_KEY}
# Fallback SMTP genérico
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USERNAME=${SMTP_USERNAME}
SMTP_PASSWORD=${SMTP_PASSWORD}

# WhatsApp Provider (Twilio por defecto, pero arquitectura soporta WABA)
WHATSAPP_PROVIDER=twilio  # Options: twilio, whatsapp-business-api
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Twilio sandbox o número real

# SMS Provider (Twilio por defecto, pero soporta SNS, Vonage)
SMS_PROVIDER=twilio  # Options: twilio, sns, vonage
TWILIO_SMS_FROM=+1234567890  # Número Twilio verificado
```

**Pattern**: Usar `@ConfigurationProperties` para agrupar configs por proveedor:
```java
@ConfigurationProperties(prefix = "rabbitmq")
@Validated
public class RabbitMQProperties {
    @NotBlank private String host;
    private int port = 5672;
    @NotBlank private String username;
    @NotBlank private String password;
    private String queueName = "notifications.queue";
    // getters/setters
}
```

### Database Schema Pattern
Tabla `notification_log` para auditoría persistente:
```sql
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(20) NOT NULL,  -- EMAIL, WHATSAPP, SMS
    provider VARCHAR(50) NOT NULL,  -- TWILIO, SENDGRID, etc.
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,  -- PENDING, SENT, FAILED, RETRYING
    error_message TEXT,
    metadata JSONB,  -- Información adicional flexible
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP
);

CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX idx_notification_log_recipient ON notification_log(recipient);
```

**Entity Naming Convention**:
- Entidades JPA: `NotificationLog` (singular, PascalCase)
- Tablas DB: `notification_log` (snake_case)
- Columnas: `created_at`, `error_message` (snake_case)
- Usar `@Table(name = "notification_log")` explícitamente

## Development Workflows

### Building & Running Locally
```bash
# Con Maven
./mvnw clean install
./mvnw spring-boot:run

# Con Docker (local testing)
docker build -t notificacion-service:latest .
docker run -p 8080:8080 --env-file .env notificacion-service:latest
```

### Testing Strategy
- **Unit Tests**: Mockear proveedores externos (`@MockBean` para `NotificationProvider`)
- **Integration Tests**: Usar Testcontainers para RabbitMQ real
- **Test Files**: `src/test/java/.../service/NotificationServiceTest.java`

Ejemplo:
```java
@SpringBootTest
@Testcontainers
class NotificationServiceIntegrationTest {
    @Container
    static RabbitMQContainer rabbitMQ = new RabbitMQContainer("rabbitmq:3.12-management");
    // ...
}
```

## Critical Patterns & Conventions

### 1. Provider Interface Contract
Todos los proveedores (Email/WhatsApp/SMS) implementan esta interfaz para permitir intercambio sin cambiar código:
```java
public interface NotificationProvider {
    NotificationResponse send(NotificationRequest request) throws NotificationException;
    boolean supports(Channel channel);
    String getProviderName();  // "TWILIO_SMS", "SENDGRID_EMAIL", etc.
}
```

**Factory Pattern**: `ProviderFactory` lee variables de entorno y devuelve el provider correcto:
```java
@Component
public class NotificationProviderFactory {
    private final Map<Channel, NotificationProvider> providers;
    
    public NotificationProvider getProvider(Channel channel) {
        NotificationProvider provider = providers.get(channel);
        if (provider == null) {
            throw new ProviderNotConfiguredException(
                "No provider configured for channel: " + channel
            );
        }
        return provider;
    }
}
```

### 2. RabbitMQ Message Structure
Mensajes entrantes deben seguir este formato JSON:
```json
{
  "channel": "EMAIL",  // EMAIL | WHATSAPP | SMS
  "recipient": "user@example.com",
  "subject": "Optional subject",
  "body": "Message content",
  "metadata": {
    "templateId": "welcome-email",
    "priority": "HIGH"
  }
}
```

### 3. Error Handling & Persistence Pattern
Flujo completo: RabbitMQ → Service → Provider → PostgreSQL

```java
@Transactional
public NotificationResponse processNotification(NotificationRequest request) {
    // 1. Persistir con status PENDING
    NotificationLog log = persistenceService.createPending(request);
    
    try {
        // 2. Enviar vía provider
        NotificationProvider provider = providerFactory.getProvider(request.getChannel());
        NotificationResponse response = provider.send(request);
        
        // 3. Actualizar a SENT
        persistenceService.markAsSent(log.getId(), response);
        return response;
        
    } catch (ProviderNotConfiguredException e) {
        // No reintentar, provider no configurado
        persistenceService.markAsFailed(log.getId(), e.getMessage());
        throw e;
        
    } catch (Exception e) {
        // Marcar como FAILED, permitir retry de RabbitMQ
        persistenceService.markAsFailed(log.getId(), e.getMessage());
        throw new NotificationException("Failed to send notification", e);
    }
}
```

**Retry Strategy**:
- Fallos temporales (HTTP 429, 503) → RabbitMQ reintenta automáticamente (max 3 veces)
- Configurar `@Retryable` en provider con backoff exponencial
- Después de 3 fallos → mover a DLQ y status `FAILED` en DB

### 4. Logging & Naming Conventions
**Logging**: Usar SLF4J con MDC para trazabilidad:
```java
MDC.put("notificationId", log.getId().toString());
MDC.put("channel", request.getChannel().name());
log.info("Sending {} notification to {} via {}", 
    channel, maskRecipient(recipient), provider.getProviderName());
```

**Code Naming Conventions**:
- **Clases**: `PascalCase` - `NotificationService`, `TwilioSmsProvider`
- **Métodos**: `camelCase` - `sendNotification()`, `markAsSent()`
- **Constantes**: `UPPER_SNAKE_CASE` - `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT`
- **Packages**: `lowercase.separated` - `io.github.giovanny.notifications.service.provider.twilio`
- **Variables**: `camelCase` - `notificationRequest`, `rabbitTemplate`
- **DTOs/Records**: Sufijo claro - `NotificationRequest`, `NotificationResponse`
- **Exceptions**: Sufijo `Exception` - `ProviderNotConfiguredException`
- **Repositories**: Sufijo `Repository` - `NotificationLogRepository`

## Docker & Deployment (Fly.io)

### Dockerfile Requirements
- **Base image**: `eclipse-temurin:21-jre-alpine` (Java 21 runtime)
- **Multi-stage build**: Compilar con Maven en stage 1, copiar JAR en stage 2
- **Non-root user**: Crear usuario `appuser` para ejecutar la app
- **Health check**: Exponer `/actuator/health` en puerto 8080

Ejemplo esperado:
```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Fly.io Configuration (`fly.toml`)
- Variables de entorno en `[env]` section (no-sensibles)
- Secrets via `fly secrets set` (RABBITMQ_PASSWORD, API keys)
- Health check apuntando a `/actuator/health`

## Integration Points

### Consuming Services
Otros servicios deben publicar mensajes a la cola RabbitMQ configurada:
```java
// Ejemplo desde otro servicio
rabbitTemplate.convertAndSend(
    "notifications.exchange", 
    "notification.email", 
    notificationRequest
);
```

### External Dependencies
- **PostgreSQL**: Database para auditoría (requerido para iniciar el servicio)
- **RabbitMQ**: Message broker (debe estar corriendo antes del servicio)
- **Provider APIs**: Twilio (WhatsApp, SMS), SendGrid (Email) - configurables por env vars
- Spring Boot Actuator para health checks y métricas

### Data Flow
```
Servicio Externo 
    → RabbitMQ Queue (notifications.queue)
    → NotificationConsumer
    → NotificationService (persiste PENDING en PostgreSQL)
    → ProviderFactory → Specific Provider (Twilio/SendGrid)
    → Actualiza PostgreSQL (SENT/FAILED)
    → Log/Metrics
```

## Common Pitfalls & Gotchas

1. **No hardcodear credenciales**: Siempre usar `${VAR}` en `application.yml`
2. **Connection pooling**: RabbitMQ ConnectionFactory debe configurar pool size apropiado
3. **Timeouts**: Configurar timeouts en RestTemplate/WebClient para llamadas a providers
4. **Retry logic**: No reintentar indefinidamente, usar `@Retryable` con `maxAttempts=3`
5. **Fly.io volumes**: No son necesarios para este servicio (stateless)

## Quick Start Checklist

### Dependencies (pom.xml)
- [ ] `spring-boot-starter-data-jpa` (PostgreSQL integration)
- [ ] `spring-boot-starter-amqp` (RabbitMQ)
- [ ] `spring-boot-starter-web` (REST endpoints opcionales)
- [ ] `spring-boot-starter-validation` (Bean validation)
- [ ] `spring-boot-starter-actuator` (Health checks)
- [ ] `postgresql` driver
- [ ] `lombok` (reduce boilerplate)
- [ ] `twilio-java` SDK (para WhatsApp/SMS)
- [ ] `sendgrid-java` SDK (para Email)

### Configuration Files
- [ ] `application.yml` con placeholders: `${DB_HOST:localhost}`, `${RABBITMQ_HOST:localhost}`
- [ ] `application-dev.yml` para desarrollo local (H2 opcional para tests)
- [ ] `application-prod.yml` para producción (sin defaults)

### Core Implementation
- [ ] `RabbitMQConfig.java` con Queue, Exchange, Binding y DLQ
- [ ] `PostgreSQLConfig.java` (opcional, Spring Boot auto-configura)
- [ ] Interface `NotificationProvider` + Factory
- [ ] Implementaciones: `TwilioWhatsAppProvider`, `TwilioSmsProvider`, `SendGridEmailProvider`
- [ ] `NotificationLog` entity con índices apropiados
- [ ] `NotificationLogRepository` con queries custom (findByRecipient, findByStatus)
- [ ] `NotificationService` orquestador principal
- [ ] `NotificationPersistenceService` para manejo de DB
- [ ] `NotificationConsumer` escuchando RabbitMQ

### Database
- [ ] Schema migration con Flyway o Liquibase (recomendado: Flyway)
- [ ] `V1__create_notification_log.sql` en `src/main/resources/db/migration/`

### Docker & Deployment
- [ ] Dockerfile multi-stage optimizado para Java 21
- [ ] `.dockerignore` excluyendo `target/`, `.git/`, `*.log`
- [ ] `docker-compose.yml` para desarrollo local (PostgreSQL + RabbitMQ)
- [ ] `fly.toml` configurado con secrets y health check
- [ ] Health check endpoint: `/actuator/health` incluye DB y RabbitMQ

## References
- Spring AMQP: https://spring.io/projects/spring-amqp
- Fly.io Java Deployment: https://fly.io/docs/languages-and-frameworks/java/
- Testcontainers RabbitMQ: https://testcontainers.com/modules/rabbitmq/
