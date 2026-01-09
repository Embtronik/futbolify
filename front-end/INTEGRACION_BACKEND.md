# 🔌 Guía de Integración con el Backend

## 📡 Estado Actual de la Integración

### ✅ Servicios Conectados

#### 1. **AuthService** - Puerto 8080
**Estado:** ✅ Totalmente integrado

| Endpoint | Método | Estado |
|----------|--------|--------|
| `/api/v1/auth/login` | POST | ✅ Funcionando |
| `/api/v1/auth/register` | POST | ✅ Funcionando |
| `/api/v1/auth/refresh` | POST | ✅ Funcionando |
| `/oauth2/authorization/google` | GET | ✅ Funcionando |
| `/api/v1/auth/oauth/google/callback` | POST | ✅ Funcionando |
| `/api/v1/user/me` | GET | ✅ Funcionando |
| `/api/v1/user/me` | PUT | ✅ Funcionando |
| `/api/v1/user/me/password` | PUT | ✅ Funcionando |

#### 2. **TeamService** - Puerto 8082
**Estado:** ⚠️ Parcialmente integrado (6/40 endpoints)

| Endpoint | Método | Estado | Descripción |
|----------|--------|--------|-------------|
| `/api/teams` | POST | ✅ Funcionando | Crear equipo con logo |
| `/api/teams` | GET | ✅ Funcionando | Listar equipos del usuario |
| `/api/teams/{id}` | GET | ✅ Funcionando | Obtener equipo por ID |
| `/api/teams/{id}` | PUT | ✅ Funcionando | Actualizar equipo con logo |
| `/api/teams/{id}` | DELETE | ✅ Funcionando | Eliminar equipo |
| `/api/teams/my-teams` | GET | ⏳ Pendiente | Equipos donde soy admin |
| `/api/teams/{id}/stats` | GET | ⏳ Pendiente | Estadísticas del equipo |
| **Jugadores** | - | ⏳ Pendiente | 6 endpoints |
| **Pollas** | - | ⏳ Pendiente | 10 endpoints |
| **Partidos de Pollas** | - | ⏳ Pendiente | 4 endpoints |
| **Predicciones** | - | ⏳ Pendiente | 4 endpoints |
| **Invitaciones** | - | ⏳ Pendiente | 3 endpoints |
| **Partidos Regulares** | - | ⏳ Pendiente | 4 endpoints |

---

## 🛠️ Configuración de URLs

### Frontend (`src/app/services/`)

```typescript
// auth.service.ts
private readonly API_URL = 'http://localhost:8080/api/v1';
private readonly OAUTH_URL = 'http://localhost:8080/oauth2/authorization';

// team.service.ts
private readonly API_URL = 'http://localhost:8082/api';
```

### Backend Esperado

- **Puerto 8080:** Autenticación y usuarios
- **Puerto 8082:** Equipos y gestión deportiva

---

## 📋 Formato de Datos

### 1. Crear/Actualizar Equipo

**Content-Type:** `multipart/form-data`

**Campos:**
```typescript
{
  name: string;           // Requerido: Nombre del equipo
  description?: string;   // Opcional: Descripción
  foundationDate?: Date;  // Opcional: Fecha de fundación
  logo?: File;           // Opcional: Imagen del logo (jpg, png)
}
```

**Ejemplo de envío desde el frontend:**
```typescript
const formData = new FormData();
formData.append('name', 'Mi Equipo');
formData.append('description', 'Descripción del equipo');
formData.append('logo', fileInput.files[0]); // Si hay archivo

this.teamService.create(formData).subscribe(...);
```

**Respuesta esperada:**
```json
{
  "id": 1,
  "name": "Mi Equipo",
  "code": "ABC123",
  "description": "Descripción del equipo",
  "logo": "https://example.com/logos/team-1.jpg",
  "foundationDate": "2025-01-01T00:00:00Z",
  "playersCount": 0,
  "createdAt": "2025-12-09T10:00:00Z",
  "updatedAt": "2025-12-09T10:00:00Z"
}
```

### 2. Autenticación

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Auth Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "provider": "LOCAL"
  }
}
```

### 3. Registro de Usuario

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "countryCode": "+57",
  "phoneNumber": "3001234567"
}
```

**Validaciones en frontend:**
- Email válido
- Contraseña: mínimo 8 caracteres, mayúscula, minúscula, número, carácter especial
- Las contraseñas deben coincidir
- Teléfono con código de país

---

## 🔐 Autenticación HTTP

### Headers Enviados

Todos los requests autenticados incluyen:
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Excepto** para endpoints de equipos con logo:
```http
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

### Manejo de Tokens Expirados

1. Request falla con **401 Unauthorized**
2. Interceptor detecta el error
3. Intenta refresh automático: `POST /api/v1/auth/refresh`
4. Si el refresh tiene éxito, reintenta el request original
5. Si el refresh falla, redirige a `/auth/login`

---

## 🚧 Endpoints Pendientes por Implementar

### Prioridad Alta

#### 1. Jugadores
```
GET    /api/teams/{id}/players        # Listar jugadores de un equipo
GET    /api/teams/players/me          # Mis jugadores
POST   /api/teams/players             # Registrar jugador
POST   /api/teams/players/{id}/join   # Unirse a equipo con código
PUT    /api/teams/players/{id}        # Actualizar jugador
DELETE /api/teams/players/{id}        # Eliminar jugador
```

**Modelo Player:**
```typescript
{
  id: number;
  firstName: string;
  lastName: string;
  photo?: string;
  teamId?: number;
  teamName?: string;
  teamCode?: string;
  position: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
  jerseyNumber?: number;
  birthDate?: Date;
  height?: number;  // cm
  weight?: number;  // kg
  nationality?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Pollas (Apuestas)
```
GET    /api/teams/polls               # Listar todas las pollas
GET    /api/teams/polls/my-polls      # Mis pollas creadas
GET    /api/teams/polls/invitations   # Pollas a las que fui invitado
GET    /api/teams/polls/{id}          # Detalles de una polla
POST   /api/teams/polls               # Crear polla
PUT    /api/teams/polls/{id}          # Actualizar polla
DELETE /api/teams/polls/{id}          # Eliminar polla
PUT    /api/teams/polls/{id}/activate # Activar polla (DRAFT → ACTIVE)
PUT    /api/teams/polls/{id}/finish   # Finalizar polla (ACTIVE → FINISHED)
```

**Modelo Poll:**
```typescript
{
  id: number;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'FINISHED';
  startDate: Date;
  endDate: Date;
  prize?: string;
  teamIds: number[];          // Equipos invitados
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Estados de Polla:**
- **DRAFT:** Administrador agrega partidos, no se aceptan predicciones
- **ACTIVE:** Usuarios hacen predicciones, no se modifican partidos
- **FINISHED:** Se calculan puntos y ranking, no se aceptan predicciones

#### 3. Partidos de Pollas
```
GET    /api/teams/polls/{id}/matches            # Partidos de una polla
POST   /api/teams/polls/matches                 # Agregar partido a polla
PUT    /api/teams/polls/{pollId}/matches/{id}   # Actualizar partido
DELETE /api/teams/polls/{pollId}/matches/{id}   # Eliminar partido
```

**Modelo PollMatch:**
```typescript
{
  id: number;
  pollId: number;
  homeTeamId: number;      // ID del FootballTeam
  awayTeamId: number;      // ID del FootballTeam
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  matchDate: Date;
  league?: string;
  homeScore?: number;      // null hasta que termine el partido
  awayScore?: number;      // null hasta que termine el partido
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  createdAt: Date;
}
```

### Prioridad Media

#### 4. Predicciones
```
GET    /api/teams/polls/{id}/predictions     # Todas las predicciones de una polla
GET    /api/teams/polls/{id}/predictions/me  # Mis predicciones
POST   /api/teams/polls/predictions          # Crear/actualizar predicción
DELETE /api/teams/polls/predictions/{id}     # Eliminar predicción
```

**Modelo PollPrediction:**
```typescript
{
  id: number;
  pollId: number;
  matchId: number;
  userId: number;
  homeScore: number;
  awayScore: number;
  points?: number;         // Calculado después del partido
  submittedAt: Date;
}
```

**Sistema de Puntos (sugerido):**
- Resultado exacto: 5 puntos
- Ganador correcto: 3 puntos
- Empate correcto: 2 puntos
- Diferencia de goles correcta: +1 punto extra

#### 5. Invitaciones y Rankings
```
GET    /api/teams/invitations/me                      # Mis invitaciones pendientes
POST   /api/teams/invitations/{id}/accept             # Aceptar invitación
POST   /api/teams/invitations/{id}/reject             # Rechazar invitación
GET    /api/teams/polls/{id}/ranking                  # Ranking de la polla
GET    /api/teams/polls/{id}/users/{userId}/stats     # Estadísticas de usuario
```

---

## 🔄 Flujo de Trabajo Completo

### Crear y Ejecutar una Polla

```
1. Administrador crea polla (POST /api/teams/polls)
   Estado: DRAFT

2. Administrador invita equipos
   - Selecciona equipos de su lista
   - Backend crea invitaciones

3. Administrador agrega partidos (POST /api/teams/polls/matches)
   - Busca equipos profesionales (FootballApiService - mock)
   - Agrega partidos con fecha y hora

4. Administrador activa la polla (PUT /api/teams/polls/{id}/activate)
   Estado: DRAFT → ACTIVE
   - Ya no se pueden agregar/modificar partidos
   - Usuarios pueden empezar a predecir

5. Usuarios hacen predicciones (POST /api/teams/polls/predictions)
   - Solo antes de que inicie cada partido
   - Pueden modificar hasta la fecha límite

6. Partidos finalizan
   - Se actualizan los resultados reales
   - Se calculan puntos automáticamente

7. Administrador finaliza la polla (PUT /api/teams/polls/{id}/finish)
   Estado: ACTIVE → FINISHED
   - Se genera ranking final
   - No se aceptan más predicciones
```

---

## 🧪 Testing de Integración

### Endpoints que puedes probar ahora

#### 1. Crear Equipo con Logo
```bash
curl -X POST http://localhost:8082/api/teams \
  -H "Authorization: Bearer {token}" \
  -F "name=Mi Equipo" \
  -F "description=Equipo de prueba" \
  -F "logo=@/path/to/image.jpg"
```

#### 2. Listar Equipos
```bash
curl -X GET http://localhost:8082/api/teams \
  -H "Authorization: Bearer {token}"
```

#### 3. Obtener Equipo por ID
```bash
curl -X GET http://localhost:8082/api/teams/1 \
  -H "Authorization: Bearer {token}"
```

#### 4. Actualizar Equipo
```bash
curl -X PUT http://localhost:8082/api/teams/1 \
  -H "Authorization: Bearer {token}" \
  -F "name=Nuevo Nombre" \
  -F "description=Nueva descripción"
```

#### 5. Eliminar Equipo
```bash
curl -X DELETE http://localhost:8082/api/teams/1 \
  -H "Authorization: Bearer {token}"
```

---

## 📊 Resumen de Estado

| Funcionalidad | Frontend | Backend | Estado |
|---------------|----------|---------|--------|
| Autenticación Local | ✅ | ✅ | ✅ Completo |
| OAuth Google | ✅ | ✅ | ✅ Completo |
| Perfil de Usuario | ✅ | ✅ | ✅ Completo |
| CRUD Equipos | ✅ | ✅ | ✅ Completo |
| Upload Logo | ✅ | ✅ | ✅ Completo |
| Gestión Jugadores | ✅ | ⏳ | ⚠️ Solo frontend |
| Sistema de Pollas | ✅ | ⏳ | ⚠️ Solo frontend |
| Partidos de Pollas | ✅ | ⏳ | ⚠️ Solo frontend |
| Predicciones | ✅ | ⏳ | ⚠️ Solo frontend |
| Rankings | ✅ | ⏳ | ⚠️ Solo frontend |

**Progreso total:** 40% (10/25 features principales)

---

## 🎯 Próximos Pasos Recomendados

### Para el Backend

1. **Implementar endpoints de Jugadores** (prioridad alta)
   - Permitir registro y gestión de jugadores
   - Sistema de unirse a equipo con código

2. **Implementar endpoints de Pollas** (prioridad alta)
   - CRUD de pollas
   - Sistema de estados (DRAFT/ACTIVE/FINISHED)
   - Invitaciones a equipos

3. **Implementar Partidos de Pollas** (prioridad media)
   - Agregar/modificar partidos solo en estado DRAFT
   - Actualizar resultados reales

4. **Implementar Predicciones** (prioridad media)
   - Guardar predicciones de usuarios
   - Validar fechas límite
   - Calcular puntos automáticamente

5. **Implementar Rankings** (prioridad baja)
   - Calcular puntos por polla
   - Generar estadísticas de usuario

### Para el Frontend

1. **Implementar UI de Predicciones**
   - Formulario para predecir resultados
   - Countdown hasta fecha límite
   - Visualización de predicciones guardadas

2. **Implementar UI de Rankings**
   - Tabla de posiciones
   - Gráficos de rendimiento
   - Estadísticas detalladas

3. **Integración con API-Football** (cuando se tenga API key)
   - Reemplazar datos mock con API real
   - Actualización automática de resultados

---

## 📞 Contacto y Soporte

Si necesitas ayuda con la integración, revisa:
- `ARQUITECTURA.md` - Arquitectura completa del sistema
- `README.md` - Configuración básica
- Este archivo - Detalles de integración

**Última actualización:** 2025-12-09
