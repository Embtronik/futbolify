# Pollas Públicas y Privadas

## Descripción General

El sistema de pollas soporta dos tipos de visibilidad y acceso:

1. **Pollas Privadas**: Solo miembros aprobados de los grupos invitados pueden participar
2. **Pollas Públicas**: Cualquier usuario puede ver y participar mediante pago de la cuota de entrada

## Tipos de Polla

### Polla Privada (`PRIVADA`)

- **Acceso**: Restringido a miembros aprobados de grupos específicos
- **Requisitos**: 
  - El administrador **debe** seleccionar al menos un grupo al crear la polla
  - Los usuarios deben ser miembros aprobados de alguno de los grupos invitados
- **Pago**: No se requiere pago para participar
- **Visibilidad**: Solo visible para usuarios con acceso

### Polla Pública (`PUBLICA`)

- **Acceso**: Abierto a cualquier usuario de la aplicación
- **Requisitos**:
  - Pago de la cuota de entrada (validado por payment-service)
  - Excepción: Miembros de grupos privilegiados (si se especifican) no requieren pago
- **Grupos Opcionales**: El administrador puede especificar grupos con acceso privilegiado (sin pago)
- **Visibilidad**: Todas las pollas públicas abiertas son visibles para todos los usuarios

## API Endpoints

### Crear Polla

**POST** `/api/pollas`

```json
{
  "nombre": "Mundial 2026",
  "descripcion": "Polla del mundial",
  "fechaInicio": "2026-06-11T10:00:00",
  "montoEntrada": 50000.00,
  "tipo": "PUBLICA",  // PRIVADA o PUBLICA
  "gruposIds": [1, 2],  // Opcional para PUBLICA, requerido para PRIVADA
  "emailsInvitados": []  // Opcional
}
```

**Validaciones**:
- Para `tipo: PRIVADA`: `gruposIds` es obligatorio y debe tener al menos un grupo
- Para `tipo: PUBLICA`: `gruposIds` es opcional
  - Si se especifican grupos, sus miembros tendrán acceso sin pago
  - Si no se especifican, todos los usuarios requieren pago

**Response**:
```json
{
  "id": 1,
  "nombre": "Mundial 2026",
  "tipo": "PUBLICA",
  "creadorEmail": "admin@example.com",
  "montoEntrada": 50000.00,
  "estado": "CREADA",
  ...
}
```

### Listar Mis Pollas

**GET** `/api/pollas/mis-pollas`

Retorna todas las pollas donde el usuario:
- Es el creador
- Es miembro de un grupo invitado
- Ha pagado (para pollas públicas)
- Es participante registrado

### Listar Pollas Públicas

**GET** `/api/pollas/publicas`

Retorna todas las pollas públicas en estados `ABIERTA`, `CERRADA` o `FINALIZADA`.

**Response**:
```json
[
  {
    "id": 1,
    "nombre": "Mundial 2026",
    "tipo": "PUBLICA",
    "montoEntrada": 50000.00,
    "estado": "ABIERTA",
    "totalParticipantes": 42,
    ...
  }
]
```

### Participar en Polla Pública

**POST** `/api/pollas/{id}/participar`

Permite a un usuario participar en una polla pública mediante pago.

**Request**:
```json
{
  "paymentReference": "TXN-123456789"
}
```

**Proceso**:
1. Verifica que la polla sea pública y esté abierta
2. Verifica si el usuario es miembro de algún grupo privilegiado
   - Si es miembro: acceso sin pago
   - Si no es miembro: valida el pago con payment-service
3. Registra al usuario como participante
4. Retorna los detalles de la polla

**Response**: `200 OK` con objeto `PollaResponse`

**Errores**:
- `404`: Polla no encontrada
- `400`: No es una polla pública o no está abierta
- `400`: Pago no válido o no aprobado
- `500`: Error comunicándose con payment-service

## Integración con Payment-Service

El sistema se integra con el servicio externo `payment-service` para validar pagos de pollas públicas.

### Configuración

En `application.yml`:

```yaml
app:
  payment-service:
    url: ${PAYMENT_SERVICE_URL:http://localhost:8083}
    enabled: ${PAYMENT_SERVICE_ENABLED:false}
```

**Modo Desarrollo**: Si `enabled: false`, los pagos se auto-aprueban para facilitar el desarrollo.

**Modo Producción**: Configurar `enabled: true` y URL del servicio real.

### Validación de Pago

El servicio valida pagos mediante:

**Request a Payment-Service**:
```http
POST /api/v1/payments/validate
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "paymentReference": "TXN-123456789",
  "expectedAmount": 50000.00,
  "concept": "Polla: Mundial 2026",
  "pollaId": 1
}
```

**Response Esperada**:
```json
{
  "valid": true,
  "paymentId": "PAY-987654321",
  "paymentReference": "TXN-123456789",
  "amount": 50000.00,
  "status": "APPROVED",
  "paymentDate": "2026-01-15T14:30:00",
  "message": "Pago aprobado exitosamente"
}
```

### Verificación de Pago Existente

Para verificar si un usuario ya pagó:

**Request**:
```http
GET /api/v1/payments/check?userEmail={email}&pollaId={id}
```

**Response**: `true` o `false`

## Lógica de Acceso

### Validación de Acceso a Polla

El sistema valida el acceso según esta lógica:

```
┌─────────────────────────────────────┐
│ Usuario intenta acceder a polla    │
└──────────────┬──────────────────────┘
               │
               ▼
        ¿Es el creador?
               │
        ┌──────┴──────┐
        NO            SÍ → ACCESO PERMITIDO
        │
        ▼
  ¿Tipo de polla?
        │
   ┌────┴────┐
   │         │
PRIVADA   PUBLICA
   │         │
   ▼         ▼
¿Miembro    ¿Miembro de
de grupo    grupo privilegiado?
invitado?    │
   │      ┌──┴──┐
   │      NO   SÍ → ACCESO PERMITIDO
   │      │
   ▼      ▼
   SÍ  ¿Tiene pago
   │    aprobado?
   │      │
   │   ┌──┴──┐
   │   NO   SÍ → ACCESO PERMITIDO
   │   │
   ▼   ▼
ACCESO  ACCESO DENEGADO
PERMITIDO "Debes realizar el pago..."
```

## Flujo de Usuario

### Crear Polla Privada

1. Admin selecciona "Crear Polla"
2. Completa formulario básico
3. Selecciona `tipo: PRIVADA`
4. **Selecciona grupos** (obligatorio, mínimo 1)
5. Guarda polla
6. Solo miembros de esos grupos pueden acceder

### Crear Polla Pública

1. Admin selecciona "Crear Polla"
2. Completa formulario básico
3. Selecciona `tipo: PUBLICA`
4. **Opcionalmente** selecciona grupos privilegiados
5. Guarda polla
6. Todos los usuarios pueden ver la polla en lista pública

### Participar en Polla Pública

#### Como Usuario Regular

1. Usuario ve la lista de pollas públicas (`/publicas`)
2. Selecciona una polla de interés
3. Sistema verifica si tiene acceso:
   - Si no tiene pago: muestra mensaje "Debe pagar $X para participar"
4. Usuario realiza el pago fuera de la app
5. Usuario obtiene referencia de pago (`TXN-XXXXXX`)
6. Usuario ingresa la referencia y confirma
7. Sistema valida con payment-service
8. Si es válido: acceso concedido, puede hacer pronósticos

#### Como Miembro de Grupo Privilegiado

1. Usuario ve la lista de pollas públicas
2. Selecciona una polla donde su grupo está invitado
3. Sistema detecta que es miembro privilegiado
4. **Acceso inmediato sin pago**
5. Puede hacer pronósticos

## Estados de Polla

Los estados son los mismos para ambos tipos:

- **CREADA**: Recién creada, solo visible para el creador
- **ABIERTA**: Visible y aceptando participantes
- **CERRADA**: No acepta nuevos participantes
- **FINALIZADA**: Todos los partidos finalizados

## Base de Datos

### Tabla `pollas`

```sql
CREATE TABLE pollas (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(500),
  creador_email VARCHAR(255) NOT NULL,
  fecha_inicio TIMESTAMP NOT NULL,
  monto_entrada DECIMAL(10,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'PRIVADA',  -- Nueva columna
  estado VARCHAR(20) NOT NULL DEFAULT 'CREADA',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT chk_polla_tipo CHECK (tipo IN ('PRIVADA', 'PUBLICA'))
);

CREATE INDEX idx_pollas_tipo ON pollas(tipo);
```

### Migración

Archivo: `V3__add_tipo_to_pollas.sql`

```sql
ALTER TABLE pollas
ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'PRIVADA';

ALTER TABLE pollas
ADD CONSTRAINT chk_polla_tipo CHECK (tipo IN ('PRIVADA', 'PUBLICA'));

CREATE INDEX idx_pollas_tipo ON pollas(tipo);
```

## Desarrollo Sin Payment-Service

Para desarrollo local sin el servicio de pagos:

```yaml
# application.yml o variables de entorno
PAYMENT_SERVICE_ENABLED=false
```

Con esta configuración:
- Todos los pagos se auto-aprueban
- No se requiere payment-service corriendo
- Logs indican "Auto-approved in development mode"

## Consideraciones de Seguridad

1. **Validación de Pagos**: En producción, siempre validar con payment-service real
2. **Grupos Privilegiados**: Solo permitir agregar grupos donde el usuario sea miembro
3. **Referencias de Pago**: Validar formato y unicidad
4. **Estados**: Una vez cerrada, no permitir nuevos pagos
5. **Auditoría**: Registrar todos los intentos de validación de pago

## Testing

### Unit Tests

```java
@Test
void crearPollaPublicaSinGrupos() {
    // Crear polla pública sin grupos (todos requieren pago)
}

@Test
void crearPollaPublicaConGruposPrivilegiados() {
    // Crear polla con grupos que no requieren pago
}

@Test
void participarConPagoValido() {
    // Usuario paga y participa exitosamente
}

@Test
void participarSinPago() {
    // Usuario intenta acceder sin pagar -> error
}

@Test
void miembroPrivilegiadoSinPago() {
    // Miembro de grupo accede sin pago
}
```

### Integration Tests

Probar con payment-service mock o real según el ambiente.

## Ejemplos de Uso

### Ejemplo 1: Polla Privada de Amigos

```json
POST /api/pollas
{
  "nombre": "Polla Amigos 2026",
  "tipo": "PRIVADA",
  "montoEntrada": 20000,
  "gruposIds": [5]  // Grupo "Amigos"
}
```

Solo miembros del grupo 5 pueden acceder.

### Ejemplo 2: Polla Pública Abierta

```json
POST /api/pollas
{
  "nombre": "Copa América Abierta",
  "tipo": "PUBLICA",
  "montoEntrada": 10000,
  "gruposIds": []  // Sin grupos privilegiados
}
```

Todos los usuarios pueden participar pagando $10,000.

### Ejemplo 3: Polla Pública con Grupo VIP

```json
POST /api/pollas
{
  "nombre": "Mundial VIP",
  "tipo": "PUBLICA",
  "montoEntrada": 100000,
  "gruposIds": [3]  // Grupo "VIP"
}
```

- Miembros del grupo 3: acceso gratis
- Otros usuarios: pagan $100,000

## Roadmap

Funcionalidades futuras:

- [ ] Múltiples métodos de pago
- [ ] Descuentos por código promocional
- [ ] Reembolsos automáticos si la polla se cancela
- [ ] Notificaciones de pago pendiente
- [ ] Dashboard de pagos para el administrador
- [ ] Integración con más pasarelas de pago

## Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.
