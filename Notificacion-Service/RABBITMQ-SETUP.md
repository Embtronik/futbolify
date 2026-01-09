# Notificacion-Service - Development Environment

Este documento describe cómo levantar el ambiente de desarrollo local con RabbitMQ y PostgreSQL.

## Prerequisitos

- Docker y Docker Compose instalados
- Java 21
- Maven 3.9+

## Levantar Servicios con Docker Compose

```bash
# Iniciar RabbitMQ y PostgreSQL
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar estado
docker-compose ps

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (limpieza completa)
docker-compose down -v
```

## URLs de Acceso

- **RabbitMQ Management UI**: http://localhost:15672
  - Usuario: `admin`
  - Contraseña: `admin123`

- **PostgreSQL**:
  - Host: `localhost:5432`
  - Database: `proyectos_dev`
  - User: `dev_user`
  - Password: `Dev2025!`

- **Notification Service**: http://localhost:8081
  - Health: http://localhost:8081/actuator/health

## Ejecutar el Servicio

```bash
# Con Maven
mvn spring-boot:run

# O con perfil específico
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

## Probar RabbitMQ

### 1. Acceder al Management UI
Ve a http://localhost:15672 y verifica:
- **Exchanges**: Debe existir `notifications.exchange.dev`
- **Queues**: Debe existir `notifications.queue.dev` y `notifications.queue.dev.dlq`
- **Bindings**: La cola debe estar vinculada al exchange con routing key `notification.#`

### 2. Publicar Mensaje de Prueba

Puedes usar el Management UI para publicar un mensaje manualmente:
1. Ve a **Queues** → `notifications.queue.dev`
2. Expande **Publish message**
3. Payload (formato JSON):

```json
{
  "channels": ["EMAIL", "WHATSAPP"],
  "recipient": "test@example.com",
  "recipientPhone": "+573157020535",
  "subject": "Prueba RabbitMQ",
  "body": "Este es un mensaje de prueba desde RabbitMQ",
  "variables": {}
}
```

4. Click en **Publish message**
5. Revisa los logs del servicio, deberías ver:
   ```
   Received notification from RabbitMQ: channels=[EMAIL, WHATSAPP], recipient=te****@example.com
   Notification processed successfully from RabbitMQ
   ```

### 3. Publicar desde Código (otro servicio)

```java
@Autowired
private RabbitTemplate rabbitTemplate;

public void sendNotification() {
    NotificationRequest request = NotificationRequest.builder()
        .channels(List.of(Channel.EMAIL, Channel.WHATSAPP))
        .recipient("test@example.com")
        .recipientPhone("+573157020535")
        .subject("Prueba")
        .body("Mensaje de prueba")
        .build();
    
    rabbitTemplate.convertAndSend(
        "notifications.exchange.dev",
        "notification.email",
        request
    );
}
```

## Ambientes

### Development (`dev`)
- Perfil activo por defecto
- RabbitMQ: `localhost:5672` (admin/admin123)
- PostgreSQL: `localhost:5432` (dev_user/Dev2025!)
- Queues: `notifications.queue.dev`
- Logs: DEBUG level

### Production (`prod`)
- Variables de entorno obligatorias:
  - `RABBITMQ_HOST`
  - `RABBITMQ_USERNAME`
  - `RABBITMQ_PASSWORD`
  - `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`
- Queues: `notifications.queue`
- Logs: INFO level
- Retry: 5 intentos máximo

## Troubleshooting

### RabbitMQ no conecta
```bash
# Verificar que el contenedor esté corriendo
docker ps | grep rabbitmq

# Ver logs de RabbitMQ
docker logs notificacion-rabbitmq

# Reiniciar RabbitMQ
docker-compose restart rabbitmq
```

### PostgreSQL no conecta
```bash
# Verificar contenedor
docker ps | grep postgres

# Probar conexión manual
docker exec -it notificacion-postgres psql -U dev_user -d proyectos_dev
```

### Servicio no consume mensajes
1. Verifica que la queue exista en http://localhost:15672
2. Revisa los logs: `org.springframework.amqp: DEBUG`
3. Verifica que `@EnableRabbit` esté presente (configurado automáticamente)
4. Comprueba que el consumidor esté registrado:
   ```
   Twilio SMS provider initialized successfully
   Twilio WhatsApp provider initialized successfully
   ```

## Configuración de Retry

El servicio está configurado con retry automático:
- **Desarrollo**: 3 intentos, intervalo inicial 3s
- **Producción**: 5 intentos, intervalo inicial 5s
- Después de agotar reintentos → mensaje va a DLQ (Dead Letter Queue)

Para revisar mensajes fallidos, ve a la DLQ en el Management UI.
