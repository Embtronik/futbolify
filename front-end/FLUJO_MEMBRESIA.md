# 🔗 Flujo de Membresía - Unirse a Equipo

## 📋 Resumen

Este documento describe el flujo completo para que usuarios se unan a equipos existentes y los administradores gestionen las solicitudes.

---

## 🎯 Componentes Implementados

### 1. **JoinTeamComponent** (`/dashboard/join-team`)

**Responsabilidades:**
- Permitir a usuarios ingresar código de 6 caracteres
- Enviar solicitud de membresía
- Mostrar equipos donde soy miembro aprobado
- Mostrar mis solicitudes pendientes

**Características:**
- ✅ Validación de código (6 caracteres alfanuméricos)
- ✅ Manejo de errores (404, 409, 400)
- ✅ Mensajes de éxito/error
- ✅ Lista de equipos aprobados
- ✅ Lista de solicitudes pendientes

### 2. **PendingRequestsComponent** (Componente reutilizable)

**Responsabilidades:**
- Mostrar solicitudes pendientes de un equipo
- Aprobar o rechazar solicitudes
- Actualizar UI en tiempo real

**Uso:**
```html
<app-pending-requests [teamId]="team.id"></app-pending-requests>
```

---

## 🔄 Flujo Completo

### Paso 1: Administrador Crea Equipo

**Endpoint:** `POST /api/teams`

**Request:**
```typescript
const formData = new FormData();
formData.append('name', 'Barcelona FC');
formData.append('description', 'Equipo amateur de Barcelona');
formData.append('logo', fileInput.files[0]);
```

**Response:**
```json
{
  "id": 1,
  "name": "Barcelona FC",
  "code": "ABC123",  // 👈 Código generado automáticamente
  "logo": "https://...",
  "description": "Equipo amateur de Barcelona",
  "membersCount": 1,
  "pendingRequestsCount": 0,
  "createdAt": "2025-12-09T10:00:00Z",
  "updatedAt": "2025-12-09T10:00:00Z"
}
```

**UI Frontend:**
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

### Paso 2: Usuario Solicita Unirse

**Ruta:** `/dashboard/join-team`

**Endpoint:** `POST /api/teams/join`

**Request:**
```json
{
  "joinCode": "ABC123"
}
```

**Response 201 Created:**
```json
{
  "id": 10,
  "teamId": 1,
  "userId": 5,
  "userEmail": "usuario@example.com",
  "approved": false,
  "isOwner": false,
  "requestedAt": "2025-12-09T11:00:00Z"
}
```

**Posibles Respuestas de Error:**

| Código | Mensaje | Significado |
|--------|---------|-------------|
| 404 | Team not found | Código inválido |
| 409 | Pending request already exists | Ya tiene solicitud pendiente |
| 400 | Cannot join own team | El usuario es el propietario |

**UI Frontend:**
```
┌─────────────────────────────────────┐
│ ⏳ Solicitud Pendiente              │
│                                     │
│ Grupo: Barcelona FC                 │
│ Estado: Esperando aprobación        │
│ Fecha: 09/12/2025 11:00            │
│                                     │
│ El administrador revisará tu        │
│ solicitud pronto.                   │
└─────────────────────────────────────┘
```

---

### Paso 3: Administrador Ve Solicitudes

**Endpoint:** `GET /api/teams/{teamId}/pending-requests`

**Response:**
```json
[
  {
    "id": 10,
    "teamId": 1,
    "userId": 5,
    "userEmail": "usuario@example.com",
    "approved": false,
    "isOwner": false,
    "requestedAt": "2025-12-09T11:00:00Z"
  },
  {
    "id": 11,
    "teamId": 1,
    "userId": 6,
    "userEmail": "otro@example.com",
    "approved": false,
    "isOwner": false,
    "requestedAt": "2025-12-09T11:30:00Z"
  }
]
```

**UI Frontend:**
```
┌─────────────────────────────────────┐
│ Solicitudes Pendientes (2)          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 usuario@example.com          │ │
│ │ 📅 09/12/2025 11:00             │ │
│ │ ✅ Aprobar    ❌ Rechazar       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤 otro@example.com             │ │
│ │ 📅 09/12/2025 11:30             │ │
│ │ ✅ Aprobar    ❌ Rechazar       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

### Paso 4: Administrador Aprueba/Rechaza

**Endpoint:** `PUT /api/teams/{teamId}/members/{memberId}`

**Request (Aprobar):**
```json
{
  "approved": true
}
```

**Response:**
```json
{
  "id": 10,
  "teamId": 1,
  "userId": 5,
  "userEmail": "usuario@example.com",
  "approved": true,
  "isOwner": false,
  "approvedBy": 1,
  "approvedAt": "2025-12-09T12:00:00Z",
  "requestedAt": "2025-12-09T11:00:00Z"
}
```

**Request (Rechazar):**
```json
{
  "approved": false
}
```

**Response:** `204 No Content` (se elimina el TeamMember)

---

### Paso 5: Ver Miembros Aprobados

**Endpoint:** `GET /api/teams/{teamId}/members`

**Response:**
```json
[
  {
    "id": 1,
    "teamId": 1,
    "userId": 1,
    "userEmail": "admin@example.com",
    "approved": true,
    "isOwner": true,
    "requestedAt": "2025-12-01T10:00:00Z",
    "approvedAt": "2025-12-01T10:00:00Z"
  },
  {
    "id": 10,
    "teamId": 1,
    "userId": 5,
    "userEmail": "usuario@example.com",
    "approved": true,
    "isOwner": false,
    "approvedBy": 1,
    "approvedAt": "2025-12-09T12:00:00Z",
    "requestedAt": "2025-12-09T11:00:00Z"
  }
]
```

**UI Frontend:**
```
┌─────────────────────────────────────┐
│ Miembros del Grupo (2)              │
│                                     │
│ 👑 admin@example.com (Propietario)  │
│                                     │
│ ──────────────────────────────────  │
│                                     │
│ 👤 usuario@example.com              │
│    Aprobado: 09/12/2025             │
└─────────────────────────────────────┘
```

---

### Paso 6: Usuario Ve Sus Equipos

**Endpoint:** `GET /api/teams/my-memberships`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Barcelona FC",
    "code": "ABC123",
    "logo": "https://...",
    "description": "Equipo amateur de Barcelona",
    "membersCount": 2,
    "createdAt": "2025-12-01T10:00:00Z",
    "updatedAt": "2025-12-09T12:00:00Z"
  }
]
```

**UI Frontend:**
```
┌─────────────────────────────────────┐
│ Mis Equipos (1)                     │
│                                     │
│ ┌───────────────┐                   │
│ │ 🏆 Barcelona  │                   │
│ │ FC            │                   │
│ │ 2 miembros    │                   │
│ │ ✅ Miembro    │                   │
│ └───────────────┘                   │
└─────────────────────────────────────┘
```

---

## 🎨 Modelos TypeScript

### TeamMember
```typescript
export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  userEmail: string;
  approved: boolean;          // false = pendiente, true = aprobado
  isOwner: boolean;           // true si es el propietario del equipo
  approvedBy?: number;        // ID del admin que aprobó
  approvedAt?: Date;          // Fecha de aprobación
  requestedAt: Date;          // Fecha de solicitud
}
```

### JoinTeamRequest
```typescript
export interface JoinTeamRequest {
  joinCode: string;  // Código de 6 caracteres (ABC123)
}
```

### ApproveMemberRequest
```typescript
export interface ApproveMemberRequest {
  approved: boolean;  // true = aprobar, false = rechazar
}
```

---

## 📱 Navegación en el Dashboard

```
Dashboard
├── Mis Grupos (/dashboard/teams)
│   └── Crear grupo → genera código
│   └── Ver solicitudes pendientes (PendingRequestsComponent)
│
├── Unirse a Equipo (/dashboard/join-team) 👈 NUEVO
│   ├── Ingresar código
│   ├── Ver solicitudes pendientes
│   └── Ver equipos aprobados
│
└── Jugadores (/dashboard/players)
    └── Gestión de jugadores (sin opción de unirse)
```

---

## 🔐 Permisos y Validaciones

### Backend debe validar:

1. **POST /api/teams/join:**
   - ✅ Código existe en la BD
   - ✅ Usuario no es el owner del equipo
   - ✅ Usuario no tiene solicitud pendiente
   - ✅ Usuario no es miembro aprobado ya

2. **GET /api/teams/{teamId}/pending-requests:**
   - ✅ Usuario es owner o admin del equipo
   
3. **PUT /api/teams/{teamId}/members/{memberId}:**
   - ✅ Usuario es owner o admin del equipo
   - ✅ El miembro existe y está pendiente
   - ✅ Si approved=true, marcar como aprobado
   - ✅ Si approved=false, eliminar registro

4. **GET /api/teams/{teamId}/members:**
   - ✅ Usuario es owner, admin o miembro aprobado

5. **GET /api/teams/my-memberships:**
   - ✅ Retornar solo equipos donde `approved=true`

---

## 🔔 Notificaciones Recomendadas

### Para el Usuario:
- ✅ "Solicitud enviada exitosamente"
- 📩 "Tu solicitud a Barcelona FC fue aprobada"
- ❌ "Tu solicitud a Barcelona FC fue rechazada" (opcional)

### Para el Admin:
- 🔔 "Tienes 2 solicitudes pendientes en Barcelona FC"
- Badge con número en la tarjeta del equipo

---

## 🧪 Testing Manual

### Caso 1: Unirse a equipo exitosamente
```
1. Admin crea equipo → obtiene código "ABC123"
2. Usuario va a /dashboard/join-team
3. Ingresa "ABC123"
4. Ve mensaje "Solicitud enviada"
5. Admin ve solicitud en lista de pendientes
6. Admin aprueba
7. Usuario ve el equipo en "Mis Equipos"
```

### Caso 2: Código inválido
```
1. Usuario va a /dashboard/join-team
2. Ingresa "XYZ999"
3. Ve error "Código inválido"
```

### Caso 3: Solicitud duplicada
```
1. Usuario envía solicitud a "ABC123"
2. Intenta enviar otra vez
3. Ve error "Ya tienes una solicitud pendiente"
```

### Caso 4: Intentar unirse a propio equipo
```
1. Admin intenta unirse con su propio código
2. Ve error "No puedes unirte a tu propio grupo"
```

---

## 📊 Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| JoinTeamComponent | ✅ Completo | Listo para backend |
| PendingRequestsComponent | ✅ Completo | Reutilizable |
| TeamService (join) | ✅ Completo | 5 métodos nuevos |
| Modelos TypeScript | ✅ Completo | TeamMember, requests |
| Rutas | ✅ Completo | /dashboard/join-team |
| Navegación | ✅ Completo | Link en sidebar |
| Backend endpoints | ⏳ Pendiente | 5 endpoints |

**Progreso total:** Frontend 100% ✅ | Backend 0% ⏳

---

**Última actualización:** 2025-12-09
