# payment-service

Servicio en **Java 21 + Spring Boot** para recibir y registrar pagos con **Wompi**, persistir transacciones en PostgreSQL y publicar eventos a RabbitMQ.

## Funcionalidad principal

- Crear una transacción en Wompi.
- Persistir el resultado en la tabla `payment_transactions`.
- Publicar evento `payments.created` en el exchange configurado.
- Consultar pagos por id o referencia.

## Requisitos

- Java 21
- Maven 3.9+
- Docker y Docker Compose

## Variables de entorno

1. Copia `.env.example` a `.env`.
2. Ajusta valores según tu entorno.

## Ejecutar en local (sin Docker)

```bash
mvn spring-boot:run
```

## Ejecutar con Docker Compose

```bash
docker compose up --build
```

Servicio disponible en:
- `http://localhost:8083`

## Seguridad

- Todos los endpoints requieren `Authorization: Bearer <JWT>`.
- El token se valida con `JWT_SECRET` (debe coincidir con `auth-service`).

## Endpoints

### Crear pago

`POST /api/v1/payments/transactions`

Header requerido:

```http
Authorization: Bearer <tu_jwt>
```

Body ejemplo:

```json
{
  "reference": "TEAM-2026-0001",
  "amountInCents": 250000,
  "currency": "COP",
  "customerEmail": "cliente@mail.com",
  "paymentSourceId": "123456",
  "installments": 1,
  "acceptanceToken": "acceptance_token_from_wompi"
}
```

### Consultar por ID

`GET /api/v1/payments/{id}`

Header requerido:

```http
Authorization: Bearer <tu_jwt>
```

### Consultar por referencia

`GET /api/v1/payments/reference/{reference}`

Header requerido:

```http
Authorization: Bearer <tu_jwt>
```

### Validar pago para una polla

`POST /api/v1/payments/validate`

Header requerido:

```http
Authorization: Bearer <tu_jwt>
```

Body ejemplo:

```json
{
  "userEmail": "user@example.com",
  "paymentReference": "TXN-123456789",
  "expectedAmount": 50000.00,
  "concept": "Polla: Mundial 2026",
  "pollaId": 1
}
```

Response ejemplo:

```json
{
  "valid": true,
  "paymentId": "ba9ef7f8-e67a-4f20-9030-a44f5f4d2099",
  "paymentReference": "TXN-123456789",
  "amount": 50000.00,
  "status": "APPROVED",
  "paymentDate": "2026-01-15T14:30:00Z",
  "message": "Pago aprobado exitosamente"
}
```

### Verificar si usuario ya pagó una polla

`GET /api/v1/payments/check?userEmail={email}&pollaId={id}`

Header requerido:

```http
Authorization: Bearer <tu_jwt>
```

Respuesta: `true` o `false`

## Diferencia entre `check` y `validate`

- `GET /check`: responde si el usuario **ya tiene** un pago aprobado para una polla (`true/false`).
- `POST /validate`: valida una referencia de pago puntual (referencia, monto, estado aprobado y asociación a polla) y devuelve detalle.

## Flujo recomendado Front + Teams + Payment

1. Front consulta pollas públicas en `teams-service`.
2. Front intenta participar: `POST /api/pollas/{id}/participar` (teams-service).
3. Teams-service usa `GET /api/v1/payments/check`:
  - Si `true`: permite participar.
  - Si `false`: responde que debe pagar.
4. Front inicia pago con Wompi (SDK/widget) para obtener `paymentSourceId` y `acceptanceToken`.
5. Front crea pago en payment-service: `POST /api/v1/payments/transactions` con:
  - `reference` (ideal: única por usuario+polla),
  - `amountInCents`, `currency`, `customerEmail`,
  - `paymentSourceId`, `installments`, `acceptanceToken`.
6. Payment-service registra transacción y retorna estado/referencia.
7. Front reintenta participar enviando `paymentReference` a teams-service.
8. Teams-service llama `POST /api/v1/payments/validate`:
  - Si `valid=true`: registra participante.
  - Si `valid=false`: rechaza con mensaje.

### Ejemplo mínimo de consumo desde Front

Crear pago:

```http
POST /api/v1/payments/transactions
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "reference": "POLLA-1-user@example.com-20260217-001",
  "amountInCents": 5000000,
  "currency": "COP",
  "customerEmail": "user@example.com",
  "paymentSourceId": "123456",
  "installments": 1,
  "acceptanceToken": "token_wompi"
}
```

Confirmar participación en teams-service:

```http
POST /api/pollas/1/participar
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "paymentReference": "POLLA-1-user@example.com-20260217-001"
}
```

## Notas de integración

- Este servicio ya recibe URLs de `auth-service`, `notification-service` y `teams-service` por entorno para integraciones cruzadas.
- Para pasar a producción con Wompi, configura:
  - `WOMPI_USE_PROD=true`
  - llaves `WOMPI_PRIVATE_KEY_PROD` y `WOMPI_INTEGRITY_PROD`
