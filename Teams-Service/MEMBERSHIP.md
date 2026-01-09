# Team Membership System - API Documentation

## Overview

Sistema completo de membresía para equipos con código de invitación único de 6 dígitos alfanuméricos.

### Flujo de Membresía

1. **Admin crea equipo** → Sistema genera código único (ej: `ABC123`)
2. **Usuario solicita unirse** → Envía código de 6 dígitos
3. **Solicitud queda PENDING** → Esperando aprobación del admin
4. **Admin aprueba/rechaza** → Usuario queda APPROVED o REJECTED

---

## 🆕 Nuevos Endpoints

### 1. Solicitar Unirse a un Equipo

**Endpoint:** `POST /api/teams/join`

**Descripción:** Un usuario registrado solicita unirse a un equipo usando el código de 6 dígitos.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "joinCode": "ABC123"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "teamId": 5,
  "teamName": "Barcelona FC",
  "userId": 123,
  "userEmail": "user@example.com",
  "status": "PENDING",
  "requestedAt": "2025-12-09T10:30:00",
  "approvedAt": null,
  "approvedBy": null
}
```

**Errores:**
- `404 Not Found` - Código no existe
- `409 Conflict` - Ya tienes una solicitud para este equipo
- `400 Bad Request` - Eres el propietario del equipo

---

### 2. Ver Solicitudes Pendientes (Solo Owner)

**Endpoint:** `GET /api/teams/{teamId}/pending-requests`

**Descripción:** El administrador del equipo ve todas las solicitudes pendientes de aprobación.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "teamId": 5,
    "teamName": "Barcelona FC",
    "userId": 123,
    "userEmail": "user1@example.com",
    "status": "PENDING",
    "requestedAt": "2025-12-09T10:30:00",
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "id": 2,
    "teamId": 5,
    "teamName": "Barcelona FC",
    "userId": 456,
    "userEmail": "user2@example.com",
    "status": "PENDING",
    "requestedAt": "2025-12-09T11:15:00",
    "approvedAt": null,
    "approvedBy": null
  }
]
```

**Errores:**
- `403 Forbidden` - No eres el propietario del equipo
- `404 Not Found` - Equipo no existe

---

### 3. Aprobar/Rechazar Solicitud (Solo Owner)

**Endpoint:** `PUT /api/teams/{teamId}/members/{memberId}`

**Descripción:** El administrador aprueba o rechaza una solicitud de membresía.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body (Aprobar):**
```json
{
  "approved": true
}
```

**Request Body (Rechazar):**
```json
{
  "approved": false
}
```

**Response (200 OK) - Aprobado:**
```json
{
  "id": 1,
  "teamId": 5,
  "teamName": "Barcelona FC",
  "userId": 123,
  "userEmail": "user1@example.com",
  "status": "APPROVED",
  "requestedAt": "2025-12-09T10:30:00",
  "approvedAt": "2025-12-09T14:20:00",
  "approvedBy": 999
}
```

**Response (200 OK) - Rechazado:**
```json
{
  "id": 2,
  "teamId": 5,
  "teamName": "Barcelona FC",
  "userId": 456,
  "userEmail": "user2@example.com",
  "status": "REJECTED",
  "requestedAt": "2025-12-09T11:15:00",
  "approvedAt": "2025-12-09T14:25:00",
  "approvedBy": 999
}
```

**Errores:**
- `403 Forbidden` - No eres el propietario
- `404 Not Found` - Membresía no existe
- `400 Bad Request` - Solicitud no está en estado PENDING

---

### 4. Ver Miembros Aprobados

**Endpoint:** `GET /api/teams/{teamId}/members`

**Descripción:** Ver todos los miembros aprobados de un equipo. Accesible por el owner o miembros aprobados.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "teamId": 5,
    "teamName": "Barcelona FC",
    "userId": 123,
    "userEmail": "user1@example.com",
    "status": "APPROVED",
    "requestedAt": "2025-12-09T10:30:00",
    "approvedAt": "2025-12-09T14:20:00",
    "approvedBy": 999
  },
  {
    "id": 3,
    "teamId": 5,
    "teamName": "Barcelona FC",
    "userId": 789,
    "userEmail": "user3@example.com",
    "status": "APPROVED",
    "requestedAt": "2025-12-09T12:00:00",
    "approvedAt": "2025-12-09T14:30:00",
    "approvedBy": 999
  }
]
```

**Errores:**
- `403 Forbidden` - No eres miembro del equipo
- `404 Not Found` - Equipo no existe

---

### 5. Ver Mis Membresías

**Endpoint:** `GET /api/teams/my-memberships`

**Descripción:** Ver todos los equipos a los que el usuario autenticado pertenece (solo aprobados).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "teamId": 5,
    "teamName": "Barcelona FC",
    "userId": 123,
    "userEmail": "user@example.com",
    "status": "APPROVED",
    "requestedAt": "2025-12-09T10:30:00",
    "approvedAt": "2025-12-09T14:20:00",
    "approvedBy": 999
  },
  {
    "id": 4,
    "teamId": 8,
    "teamName": "Real Madrid",
    "userId": 123,
    "userEmail": "user@example.com",
    "status": "APPROVED",
    "requestedAt": "2025-12-08T09:15:00",
    "approvedAt": "2025-12-08T10:00:00",
    "approvedBy": 777
  }
]
```

---

## 🔄 Endpoints Actualizados

### Crear Equipo (Modificado)

**Endpoint:** `POST /api/teams`

**Cambios:** Ahora incluye `joinCode` en la respuesta.

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Barcelona FC",
  "description": "Professional soccer team",
  "logoUrl": null,
  "joinCode": "ABC123",
  "ownerUserId": 999,
  "memberCount": 0,
  "createdAt": "2025-12-09T10:30:00",
  "updatedAt": "2025-12-09T10:30:00"
}
```

### Listar Equipos (Modificado)

**Endpoint:** `GET /api/teams`

**Cambios:** Incluye `joinCode` y `memberCount`.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Barcelona FC",
    "description": "Professional soccer team",
    "logoUrl": "teams/logos/1/1-20251209103045.png",
    "joinCode": "ABC123",
    "ownerUserId": 999,
    "memberCount": 5,
    "createdAt": "2025-12-09T10:30:00",
    "updatedAt": "2025-12-09T10:30:00"
  }
]
```

---

## 📝 Estados de Membresía

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Solicitud enviada, esperando aprobación del admin |
| `APPROVED` | Solicitud aprobada, usuario es miembro activo |
| `REJECTED` | Solicitud rechazada por el admin |

---

## 🔐 Permisos

| Acción | Quien puede hacerlo |
|--------|---------------------|
| Crear equipo | Usuario autenticado |
| Ver código del equipo | Owner del equipo |
| Solicitar unirse | Usuario autenticado (no owner) |
| Ver solicitudes pendientes | Owner del equipo |
| Aprobar/Rechazar | Owner del equipo |
| Ver miembros | Owner o miembros aprobados |
| Ver mis membresías | Usuario autenticado |

---

## 🧪 Ejemplos con PowerShell

### Solicitar unirse a un equipo

```powershell
$token = "your-jwt-token"
$body = @{
    joinCode = "ABC123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8082/api/teams/join" `
    -Method Post `
    -Headers @{"Authorization" = "Bearer $token"} `
    -ContentType "application/json" `
    -Body $body
```

### Ver solicitudes pendientes (Owner)

```powershell
$token = "owner-jwt-token"
Invoke-RestMethod -Uri "http://localhost:8082/api/teams/5/pending-requests" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}
```

### Aprobar una solicitud

```powershell
$token = "owner-jwt-token"
$body = @{
    approved = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8082/api/teams/5/members/1" `
    -Method Put `
    -Headers @{"Authorization" = "Bearer $token"} `
    -ContentType "application/json" `
    -Body $body
```

### Ver miembros del equipo

```powershell
$token = "your-jwt-token"
Invoke-RestMethod -Uri "http://localhost:8082/api/teams/5/members" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}
```

### Ver mis membresías

```powershell
$token = "your-jwt-token"
Invoke-RestMethod -Uri "http://localhost:8082/api/teams/my-memberships" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $token"}
```

---

## 📊 Esquema de Base de Datos

### Tabla: teams
```sql
- id (PK)
- name
- description
- logo_path
- join_code (UNIQUE, 6 chars)  <-- NUEVO
- owner_user_id
- created_at
- updated_at
```

### Tabla: team_members (NUEVA)
```sql
- id (PK)
- team_id (FK -> teams.id)
- user_id
- user_email
- status (PENDING/APPROVED/REJECTED)
- requested_at
- updated_at
- approved_at
- approved_by
- UNIQUE(team_id, user_id)
```

---

## 🎨 Guía para el Frontend - Agregar Miembro a un Grupo

### Flujo de Usuario Completo

#### 1️⃣ **Creación del Grupo (Admin/Owner)**

**Vista:** Formulario de Crear Grupo

**Acciones del Frontend:**
1. Mostrar formulario con campos: Nombre, Descripción, Logo (opcional)
2. Enviar `POST /api/teams` con JWT token
3. Recibir respuesta con `joinCode` (6 dígitos alfanuméricos)
4. **Mostrar código en un modal o tarjeta destacada**:
   - Ejemplo: "Código de invitación: **ABC123**"
   - Botón "Copiar código" (copiar al portapapeles)
   - Mensaje: "Comparte este código con tus miembros para que puedan unirse"

**Ejemplo UI:**
```
┌─────────────────────────────────────┐
│ ✅ Grupo creado exitosamente        │
│                                     │
│ Código de invitación:               │
│ ┏━━━━━━━━━━┓                        │
│ ┃  ABC123  ┃  📋 Copiar             │
│ ┗━━━━━━━━━━┛                        │
│                                     │
│ Comparte este código con los        │
│ usuarios que quieres que se unan    │
└─────────────────────────────────────┘
```

---

#### 2️⃣ **Solicitud de Unirse (Miembro nuevo)**

**Vista:** Pantalla "Unirse a un Grupo" o "Buscar Grupos"

**Acciones del Frontend:**
1. Mostrar input para ingresar código de 6 dígitos
2. Validar formato (exactamente 6 caracteres alfanuméricos)
3. Enviar `POST /api/teams/join` con `{ "joinCode": "ABC123" }`
4. **Manejar respuestas:**
   - ✅ **201 Created** → Mostrar mensaje: "Solicitud enviada. Esperando aprobación del administrador"
   - ❌ **404 Not Found** → "Código inválido. Verifica e intenta nuevamente"
   - ❌ **409 Conflict** → "Ya tienes una solicitud pendiente para este grupo"
   - ❌ **400 Bad Request** → "Eres el propietario de este grupo"

**Ejemplo UI:**
```
┌─────────────────────────────────────┐
│ Unirse a un Grupo                   │
│                                     │
│ Ingresa el código de invitación:    │
│ ┌───────────────────┐               │
│ │ [A][B][C][1][2][3]│  🔍 Buscar    │
│ └───────────────────┘               │
│                                     │
│ Nota: El administrador debe aprobar │
│ tu solicitud antes de que puedas    │
│ acceder al grupo.                   │
└─────────────────────────────────────┘
```

**Estado después de enviar solicitud:**
```
┌─────────────────────────────────────┐
│ ⏳ Solicitud Pendiente              │
│                                     │
│ Grupo: Barcelona FC                 │
│ Estado: Esperando aprobación        │
│ Fecha: 09/12/2025 10:30            │
│                                     │
│ El administrador revisará tu        │
│ solicitud pronto.                   │
└─────────────────────────────────────┘
```

---

#### 3️⃣ **Gestión de Solicitudes (Admin/Owner)**

**Vista:** Panel de Administración del Grupo

**Acciones del Frontend:**
1. Llamar `GET /api/teams/{teamId}/pending-requests` al cargar la vista
2. Mostrar lista de solicitudes pendientes con:
   - Email del usuario
   - Fecha de solicitud
   - Botones "Aprobar" y "Rechazar"
3. **Al hacer clic en "Aprobar":**
   - Enviar `PUT /api/teams/{teamId}/members/{memberId}` con `{ "approved": true }`
   - Actualizar UI inmediatamente (mover a lista de miembros aprobados)
   - Mostrar notificación: "Usuario aprobado exitosamente"
4. **Al hacer clic en "Rechazar":**
   - Enviar `PUT /api/teams/{teamId}/members/{memberId}` con `{ "approved": false }`
   - Remover de lista de pendientes
   - Mostrar notificación: "Solicitud rechazada"

**Ejemplo UI:**
```
┌─────────────────────────────────────┐
│ Solicitudes Pendientes (2)          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 user1@example.com            │ │
│ │ 📅 09/12/2025 10:30             │ │
│ │ ✅ Aprobar    ❌ Rechazar       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 user2@example.com            │ │
│ │ 📅 09/12/2025 11:15             │ │
│ │ ✅ Aprobar    ❌ Rechazar       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

#### 4️⃣ **Ver Miembros del Grupo**

**Vista:** Detalles del Grupo o Pestaña "Miembros"

**Acciones del Frontend:**
1. Llamar `GET /api/teams/{teamId}/members`
2. Mostrar lista de miembros aprobados:
   - Email del usuario
   - Fecha de aprobación
   - Quién aprobó (si es relevante)
3. **Permisos:** Solo el owner o miembros aprobados pueden ver esta lista

**Ejemplo UI:**
```
┌─────────────────────────────────────┐
│ Miembros del Grupo (5)              │
│                                     │
│ 👑 admin@example.com (Propietario)  │
│                                     │
│ ──────────────────────────────────  │
│                                     │
│ 👤 user1@example.com                │
│    Aprobado: 09/12/2025             │
│                                     │
│ 👤 user2@example.com                │
│    Aprobado: 09/12/2025             │
│                                     │
│ 👤 user3@example.com                │
│    Aprobado: 08/12/2025             │
└─────────────────────────────────────┘
```

---

#### 5️⃣ **Mis Grupos (Vista del Usuario)**

**Vista:** Panel Principal o "Mis Grupos"

**Acciones del Frontend:**
1. Llamar `GET /api/teams/my-memberships`
2. Mostrar tarjetas/lista de grupos donde el usuario es miembro aprobado
3. Cada tarjeta debe mostrar:
   - Nombre del grupo
   - Logo (si existe)
   - Cantidad de miembros
   - Botón "Ver Detalles"

**Ejemplo UI:**
```
┌─────────────────────────────────────┐
│ Mis Grupos                          │
│                                     │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ 🏆 Barcelona  │ │ ⚽ Real Madrid│ │
│ │ FC            │ │               │ │
│ │ 12 miembros   │ │ 8 miembros    │ │
│ │ Ver Detalles  │ │ Ver Detalles  │ │
│ └───────────────┘ └───────────────┘ │
└─────────────────────────────────────┘
```

---

### 🔔 Notificaciones Recomendadas

**Para el Usuario que solicita unirse:**
- ✅ "Solicitud enviada exitosamente"
- 📩 "Tu solicitud a [Nombre Grupo] fue aprobada" (cuando sea aprobado)
- ❌ "Tu solicitud a [Nombre Grupo] fue rechazada" (opcional)

**Para el Admin/Owner:**
- 🔔 "Tienes [N] solicitudes pendientes en [Nombre Grupo]"
- Badge con número en ícono del grupo

---

### 📱 Estados de UI para el Usuario

| Estado | Indicador Visual |
|--------|-----------------|
| No miembro | Botón "Unirse con código" |
| Solicitud PENDING | Badge amarillo "⏳ Pendiente" |
| Miembro APPROVED | Badge verde "✅ Miembro" + acceso completo |
| Solicitud REJECTED | Mensaje "Solicitud rechazada" + opción de reintentar |
| Owner | Badge dorado "👑 Propietario" |

---

### 🔧 Manejo de Errores en Frontend

```javascript
// Ejemplo en JavaScript/TypeScript
async function joinTeam(joinCode) {
  try {
    const response = await fetch('/api/teams/join', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ joinCode })
    });

    if (response.status === 201) {
      showSuccess('Solicitud enviada. Esperando aprobación.');
    } else if (response.status === 404) {
      showError('Código inválido. Verifica e intenta nuevamente.');
    } else if (response.status === 409) {
      showWarning('Ya tienes una solicitud pendiente para este grupo.');
    } else if (response.status === 400) {
      showError('No puedes unirte a tu propio grupo.');
    }
  } catch (error) {
    showError('Error de conexión. Intenta nuevamente.');
  }
}
```

---

## 🔄 Flujo Completo de Ejemplo

### Paso 1: Admin crea equipo
```bash
POST /api/teams
Response: { "joinCode": "XYZ789", ... }
```

### Paso 2: Admin comparte código
```
Admin comparte "XYZ789" con usuarios
```

### Paso 3: Usuario solicita unirse
```bash
POST /api/teams/join
Body: { "joinCode": "XYZ789" }
Response: { "status": "PENDING", ... }
```

### Paso 4: Admin ve solicitudes
```bash
GET /api/teams/5/pending-requests
Response: [{ "userId": 123, "status": "PENDING", ... }]
```

### Paso 5: Admin aprueba
```bash
PUT /api/teams/5/members/1
Body: { "approved": true }
Response: { "status": "APPROVED", ... }
```

### Paso 6: Usuario ve sus equipos
```bash
GET /api/teams/my-memberships
Response: [{ "teamName": "Barcelona FC", "status": "APPROVED", ... }]
```
