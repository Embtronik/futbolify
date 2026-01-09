# Notificacion-Service – AI Agent Quickstart

## Big Picture
- Spring Boot 3.4 + Java 21 microservice for multichannel notifications (EMAIL, SMS, WHATSAPP).
- Orchestrates send + persistence per channel; optional RabbitMQ consumer.
- Security via JWT validated against Auth-Service; templates rendered with Thymeleaf.

## Key Files (jump here first)
- App entry: [src/main/java/io/github/giovanny/notifications/NotificationServiceApplication.java](src/main/java/io/github/giovanny/notifications/NotificationServiceApplication.java)
- REST: [controller/NotificationController.java](src/main/java/io/github/giovanny/notifications/controller/NotificationController.java), [controller/TemplateController.java](src/main/java/io/github/giovanny/notifications/controller/TemplateController.java)
- Orchestrator: [service/NotificationService.java](src/main/java/io/github/giovanny/notifications/service/NotificationService.java)
- Persistence: [service/NotificationPersistenceService.java](src/main/java/io/github/giovanny/notifications/service/NotificationPersistenceService.java), [repository/NotificationLogRepository.java](src/main/java/io/github/giovanny/notifications/repository/NotificationLogRepository.java), [repository/NotificationTemplateRepository.java](src/main/java/io/github/giovanny/notifications/repository/NotificationTemplateRepository.java)
- Templates: [service/TemplateService.java](src/main/java/io/github/giovanny/notifications/service/TemplateService.java), [config/ThymeleafConfig.java](src/main/java/io/github/giovanny/notifications/config/ThymeleafConfig.java)
- Providers: [service/provider](src/main/java/io/github/giovanny/notifications/service/provider), factory, sendgrid, twilio
- Messaging: [consumer/NotificationConsumer.java](src/main/java/io/github/giovanny/notifications/consumer/NotificationConsumer.java), [config/RabbitMQConfig.java](src/main/java/io/github/giovanny/notifications/config/RabbitMQConfig.java), [config/RabbitMQProperties.java](src/main/java/io/github/giovanny/notifications/config/RabbitMQProperties.java)
- Security: [config/SecurityConfig.java](src/main/java/io/github/giovanny/notifications/config/SecurityConfig.java), [security/JwtAuthenticationFilter.java](src/main/java/io/github/giovanny/notifications/security/JwtAuthenticationFilter.java), [security/AuthServiceClient.java](src/main/java/io/github/giovanny/notifications/security/AuthServiceClient.java), [config/AuthServiceProperties.java](src/main/java/io/github/giovanny/notifications/config/AuthServiceProperties.java)
- Config: [resources/application.yml](src/main/resources/application.yml), [resources/application-dev.yml](src/main/resources/application-dev.yml), [resources/application-prod.yml](src/main/resources/application-prod.yml)
- DB migrations: [V1…V5](src/main/resources/db/migration) (log, templates, defaults, fixes)

## Build & Run (Windows)
- Build: `mvn clean install`
- Dev run: `mvn spring-boot:run -Dspring-boot.run.profiles=dev`
- Docs: see [README-API-REST.md](README-API-REST.md) and [RABBITMQ-SETUP.md](RABBITMQ-SETUP.md)

## Configuration (env)
- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
- RabbitMQ: `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`
- Email: `EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY`, optional SMTP fallback
- WhatsApp/SMS: `WHATSAPP_PROVIDER`, `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_SMS_FROM`
- Auth: `AUTH_SERVICE_URL`, `AUTH_SERVICE_ENABLED` (disable in dev to test without JWT)

## REST & Security
- Main endpoint: `POST /api/v1/notifications/send` with JWT `Authorization: Bearer <token>`.
- Templates: `GET /api/v1/templates/channel/{channel}`.
- JWT flow and example payloads live in [README-API-REST.md](README-API-REST.md).

## Message & Persistence Pattern
- Request → optional template rendering → persist `PENDING` per channel → provider send → update `SENT/FAILED`.
- Retry: transient failures should be retried; DLQ for exhausted retries (see RabbitMQ setup doc).
- Entity/table: `NotificationLog` maps to `notification_log` with indexes; templates stored via `NotificationTemplate`.

## RabbitMQ Development
- Quick start with docker compose: see commands and expected exchanges/queues in [RABBITMQ-SETUP.md](RABBITMQ-SETUP.md).
- Consumer is in [consumer/NotificationConsumer.java](src/main/java/io/github/giovanny/notifications/consumer/NotificationConsumer.java).

## Conventions & Patterns
- Providers implement `NotificationProvider` with `send()`, `supports()`, `getProviderName()`; selected via factory by env.
- Request structure supports multichannel and templates; follow examples in README.
- Use SLF4J; prefer MDC keys like `notificationId`, `channel` for traceability.
- Package prefix: `io.github.giovanny.notifications`.

## Gotchas
- Don’t hardcode secrets; use `${VAR}` in yml and env.
- If `AUTH_SERVICE_ENABLED=true`, JWT is required; disable for local dev.
- Ensure DB and RabbitMQ are up before running; health at `/actuator/health`.

Feedback: If anything here is unclear or missing (e.g., provider setup nuances, RabbitMQ routing keys, or auth toggles), tell me which section to refine and I’ll update it.
