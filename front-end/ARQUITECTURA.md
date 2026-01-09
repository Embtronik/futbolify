# Arquitectura de Servicios - Football Team Manager

## 📋 Resumen

La aplicación sigue una arquitectura de servicios consolidada donde cada servicio tiene una responsabilidad clara y única. Esto facilita el mantenimiento, las pruebas y la escalabilidad.

---

## 🏗️ Servicios Principales

### 1️⃣ **TeamService** (`src/app/services/team.service.ts`)

**Responsabilidad:** Toda la lógica administrativa relacionada con grupos, jugadores, pollas, partidos y predicciones.

**Base URL:** `http://localhost:8082/api/teams`

#### ✅ Métodos de Grupos Implementados (6)

Los siguientes métodos están conectados a endpoints reales del backend:

```typescript
getAll(): Observable<Team[]>                    // GET /api/teams
getMyTeams(): Observable<Team[]>                // GET /api/teams (temporal, mismo que getAll)
getById(id: number): Observable<Team>           // GET /api/teams/{id}
create(teamData: FormData): Observable<Team>    // POST /api/teams (con logo opcional)
update(id: number, teamData: FormData): Observable<Team>  // PUT /api/teams/{id} (con logo opcional)
delete(id: number): Observable<void>            // DELETE /api/teams/{id}
```

**Formato de FormData para create/update:**
- `name` (string, requerido)
- `description` (string, opcional)
- `foundationDate` (string ISO, opcional)
- `logo` (File, opcional - imagen)

**Nota:** El backend genera automáticamente el código alfanumérico único de 6 caracteres.

#### ⏳ Métodos Pendientes de Implementación en Backend

Los siguientes métodos están definidos en el frontend pero **aún no tienen endpoints en el backend**:
```typescript
getAll(): Observable<Team[]>                    // GET /api/v1/teams
getMyTeams(): Observable<Team[]>                // GET /api/v1/teams/my-teams
getById(id: number): Observable<Team>           // GET /api/v1/teams/{id}
create(team: CreateTeamRequest): Observable<Team>  // POST /api/v1/teams
update(id: number, team: UpdateTeamRequest): Observable<Team>  // PUT /api/v1/teams/{id}
delete(id: number): Observable<void>            // DELETE /api/v1/teams/{id}
getTeamStats(teamId: number): Observable<TeamStats>  // GET /api/v1/teams/{id}/stats
```

#### ⏳ Métodos Pendientes de Implementación en Backend

Los siguientes métodos están definidos en el frontend pero **aún no tienen endpoints en el backend**:

**Grupos (2 pendientes):**
```typescript
getMyTeams(): Observable<Team[]>                // Pendiente: GET /api/teams/my-teams
getTeamStats(teamId: number): Observable<TeamStats>  // Pendiente: GET /api/teams/{id}/stats
```

#### Métodos de Jugadores (6 pendientes)
```typescript
getPlayers(teamId: number): Observable<Player[]>  // Pendiente: GET /api/teams/{id}/players
getMyPlayers(): Observable<Player[]>            // Pendiente: GET /api/teams/players/me
registerPlayer(player: CreatePlayerRequest): Observable<Player>  // Pendiente: POST /api/teams/players
joinTeam(playerId: number, teamCode: string): Observable<Player>  // Pendiente: POST /api/teams/players/{id}/join
updatePlayer(id: number, player: UpdatePlayerRequest): Observable<Player>  // Pendiente: PUT /api/teams/players/{id}
deletePlayer(id: number): Observable<void>      // Pendiente: DELETE /api/teams/players/{id}
```

#### Métodos de Pollas (10 pendientes)
```typescript
getPlayers(teamId: number): Observable<Player[]>  // GET /api/v1/teams/{id}/players
getMyPlayers(): Observable<Player[]>            // GET /api/v1/teams/players/me
registerPlayer(player: CreatePlayerRequest): Observable<Player>  // POST /api/v1/teams/players
joinTeam(playerId: number, teamCode: string): Observable<Player>  // POST /api/v1/teams/players/{id}/join
updatePlayer(id: number, player: UpdatePlayerRequest): Observable<Player>  // PUT /api/v1/teams/players/{id}
deletePlayer(id: number): Observable<void>      // DELETE /api/v1/teams/players/{id}
```

#### Métodos de Pollas (10 pendientes)
```typescript
getPolls(): Observable<Poll[]>                  // Pendiente: GET /api/teams/polls
getMyPolls(): Observable<Poll[]>                // Pendiente: GET /api/teams/polls/my-polls
getInvitedPolls(): Observable<Poll[]>           // Pendiente: GET /api/teams/polls/invitations
getPollById(id: number): Observable<Poll>       // Pendiente: GET /api/teams/polls/{id}
createPoll(poll: CreatePollRequest): Observable<Poll>  // Pendiente: POST /api/teams/polls
updatePoll(id: number, poll: UpdatePollRequest): Observable<Poll>  // Pendiente: PUT /api/teams/polls/{id}
deletePoll(id: number): Observable<void>        // Pendiente: DELETE /api/teams/polls/{id}
activatePoll(pollId: number): Observable<Poll>  // Pendiente: PUT /api/teams/polls/{id}/activate
finishPoll(pollId: number): Observable<Poll>    // Pendiente: PUT /api/teams/polls/{id}/finish
getPollRanking(pollId: number): Observable<PollRanking[]>  // Pendiente: GET /api/teams/polls/{id}/ranking
getUserPollStats(pollId: number, userId: number): Observable<UserPollStats>  // Pendiente: GET /api/teams/polls/{id}/users/{userId}/stats
```

#### Métodos de Partidos de Pollas (4 pendientes)
```typescript
getPolls(): Observable<Poll[]>                  // GET /api/v1/teams/polls
getMyPolls(): Observable<Poll[]>                // GET /api/v1/teams/polls/my-polls
getInvitedPolls(): Observable<Poll[]>           // GET /api/v1/teams/polls/invitations
getPollById(id: number): Observable<Poll>       // GET /api/v1/teams/polls/{id}
createPoll(poll: CreatePollRequest): Observable<Poll>  // POST /api/v1/teams/polls
updatePoll(id: number, poll: UpdatePollRequest): Observable<Poll>  // PUT /api/v1/teams/polls/{id}
deletePoll(id: number): Observable<void>        // DELETE /api/v1/teams/polls/{id}
activatePoll(pollId: number): Observable<Poll>  // PUT /api/v1/teams/polls/{id}/activate
finishPoll(pollId: number): Observable<Poll>    // PUT /api/v1/teams/polls/{id}/finish
getPollRanking(pollId: number): Observable<PollRanking[]>  // GET /api/v1/teams/polls/{id}/ranking
getUserPollStats(pollId: number, userId: number): Observable<UserPollStats>  // GET /api/v1/teams/polls/{id}/users/{userId}/stats
```

#### Métodos de Partidos de Pollas (4 pendientes)
```typescript
getPollMatches(pollId: number): Observable<PollMatch[]>  // Pendiente: GET /api/teams/polls/{id}/matches
addPollMatch(match: AddPollMatchRequest): Observable<PollMatch>  // Pendiente: POST /api/teams/polls/matches
updatePollMatch(pollId: number, matchId: number, match: UpdatePollMatchRequest): Observable<PollMatch>  // Pendiente: PUT /api/teams/polls/{pollId}/matches/{matchId}
deletePollMatch(pollId: number, matchId: number): Observable<void>  // Pendiente: DELETE /api/teams/polls/{pollId}/matches/{matchId}
```

#### Métodos de Predicciones (4 pendientes)
```typescript
getPollMatches(pollId: number): Observable<PollMatch[]>  // GET /api/v1/teams/polls/{id}/matches
addPollMatch(match: AddPollMatchRequest): Observable<PollMatch>  // POST /api/v1/teams/polls/matches
updatePollMatch(pollId: number, matchId: number, match: UpdatePollMatchRequest): Observable<PollMatch>  // PUT /api/v1/teams/polls/{pollId}/matches/{matchId}
deletePollMatch(pollId: number, matchId: number): Observable<void>  // DELETE /api/v1/teams/polls/{pollId}/matches/{matchId}
```

#### Métodos de Predicciones (4 pendientes)
```typescript
getPollPredictions(pollId: number): Observable<PollPrediction[]>  // Pendiente: GET /api/teams/polls/{id}/predictions
getMyPredictions(pollId: number): Observable<PollPrediction[]>  // Pendiente: GET /api/teams/polls/{id}/predictions/me
savePrediction(prediction: CreatePredictionRequest): Observable<PollPrediction>  // Pendiente: POST /api/teams/polls/predictions
deletePrediction(predictionId: number): Observable<void>  // Pendiente: DELETE /api/teams/polls/predictions/{id}
```

#### Métodos de Invitaciones (3 pendientes)
```typescript
getPollPredictions(pollId: number): Observable<PollPrediction[]>  // GET /api/v1/teams/polls/{id}/predictions
getMyPredictions(pollId: number): Observable<PollPrediction[]>  // GET /api/v1/teams/polls/{id}/predictions/me
savePrediction(prediction: CreatePredictionRequest): Observable<PollPrediction>  // POST /api/v1/teams/polls/predictions
deletePrediction(predictionId: number): Observable<void>  // DELETE /api/v1/teams/polls/predictions/{id}
```

#### Métodos de Invitaciones (3 pendientes)
```typescript
getMyInvitations(): Observable<PollInvitation[]>  // Pendiente: GET /api/teams/invitations/me
acceptInvitation(invitationId: number): Observable<void>  // Pendiente: POST /api/teams/invitations/{id}/accept
rejectInvitation(invitationId: number): Observable<void>  // Pendiente: POST /api/teams/invitations/{id}/reject
```

#### Métodos de Partidos Regulares (4 pendientes)
```typescript
getMyInvitations(): Observable<PollInvitation[]>  // GET /api/v1/teams/invitations/me
acceptInvitation(invitationId: number): Observable<void>  // POST /api/v1/teams/invitations/{id}/accept
rejectInvitation(invitationId: number): Observable<void>  // POST /api/v1/teams/invitations/{id}/reject
```

#### Métodos de Partidos Regulares (4 pendientes)
```typescript
getMatches(teamId: number): Observable<Match[]>  // Pendiente: GET /api/teams/{id}/matches
createMatch(match: CreateMatchRequest): Observable<Match>  // Pendiente: POST /api/teams/matches
updateMatch(id: number, match: UpdateMatchRequest): Observable<Match>  // Pendiente: PUT /api/teams/matches/{id}
deleteMatch(id: number): Observable<void>        // Pendiente: DELETE /api/teams/matches/{id}
```

**Total:** 
- ✅ **6 métodos implementados** (CRUD básico de equipos)
- ⏳ **34+ métodos pendientes** (jugadores, pollas, partidos, predicciones, invitaciones)

---

### 2️⃣ **AuthService** (`src/app/services/auth.service.ts`)

**Responsabilidad:** Autenticación, gestión de sesión y perfil de usuario.

**Base URL:** `/api/v1/auth` y `/api/v1/user`

#### Métodos
```typescript
// Autenticación
login(credentials: LoginRequest): Observable<AuthResponse>  // POST /api/v1/auth/login
register(userData: RegisterRequest): Observable<AuthResponse>  // POST /api/v1/auth/register
logout(): void                                   // Limpia localStorage

// OAuth
handleOAuthCallback(code: string): Observable<AuthResponse>  // POST /api/v1/auth/oauth/google/callback

// Tokens
refreshToken(): Observable<AuthResponse>         // POST /api/v1/auth/refresh

// Perfil
updateUser(data: UpdateUserRequest): Observable<User>  // PUT /api/v1/user/me
changePassword(data: ChangePasswordRequest): Observable<void>  // PUT /api/v1/user/me/password

// Estado
getCurrentUser(): User | null                    // Obtiene usuario de localStorage
isAuthenticated(): boolean                       // Verifica si hay sesión activa
getToken(): string | null                        // Obtiene JWT token
```

---

### 3️⃣ **NotificationService** (`src/app/services/notification.service.ts`)

**Responsabilidad:** Gestión de notificaciones y alertas al usuario.

**Base URL:** `/api/v1/notifications`

#### Métodos (planificados)
```typescript
getNotifications(): Observable<Notification[]>   // GET /api/v1/notifications
markAsRead(id: number): Observable<void>         // PUT /api/v1/notifications/{id}/read
deleteNotification(id: number): Observable<void> // DELETE /api/v1/notifications/{id}
```

---

### 4️⃣ **FootballApiService** (`src/app/services/football-api.service.ts`)

**Responsabilidad:** Integración con API de datos de fútbol profesional.

**Estado:** Actualmente usa **datos mock** de 30+ equipos profesionales.

#### Métodos
```typescript
searchTeams(query: string): FootballTeam[]       // Buscar equipos por nombre
getTeamsByLeague(leagueId: number): FootballTeam[]  // Filtrar por liga
getLeagues(): FootballLeague[]                   // Obtener todas las ligas
```

#### Equipos Incluidos (Mock)
- **La Liga:** Barcelona, Real Madrid, Atlético Madrid, Sevilla, Valencia
- **Premier League:** Manchester United, Liverpool, Chelsea, Arsenal, Manchester City
- **Serie A:** Juventus, Inter Milan, AC Milan, Napoli, Roma
- **Bundesliga:** Bayern Munich, Borussia Dortmund, RB Leipzig
- **Ligue 1:** PSG, Lyon, Marseille
- **Liga BetPlay:** Atlético Nacional, Millonarios, América de Cali
- **Selecciones:** Brasil, Argentina, Alemania, Francia, España, Colombia

#### Ligas Incluidas
- Premier League, La Liga, Serie A, Bundesliga, Ligue 1
- Liga BetPlay Dimayor
- Copa Mundial FIFA, UEFA Champions League, Copa América

**Nota:** Cuando se tenga una **API key de API-Football**, se puede integrar la API real sustituyendo los datos mock.

---

## 🔄 Flujo de Trabajo - Pollas

### Estado de una Polla
```
DRAFT (Borrador)
   ↓
   - Administrador crea polla
   - Administrador invita equipos/usuarios
   - Administrador agrega partidos
   ↓
ACTIVE (Activa)
   ↓
   - Usuarios hacen predicciones
   - No se pueden agregar/modificar partidos
   - Plazo de predicciones según fecha del partido
   ↓
FINISHED (Finalizada)
   ↓
   - Se calculan puntos
   - Se genera ranking
   - No se aceptan más predicciones
```

---

## 📁 Estructura de Componentes

```
src/app/components/dashboard/
├── dashboard.component.ts         # Layout principal
├── home/home.component.ts         # Inicio del dashboard
├── teams/teams.component.ts       # Gestión de grupos (usa TeamService)
├── players/players.component.ts   # Gestión de jugadores (usa TeamService)
├── polls/polls.component.ts       # Gestión de pollas (usa TeamService + FootballApiService)
├── matches/matches.component.ts   # Gestión de partidos (usa TeamService)
├── stats/stats.component.ts       # Estadísticas (usa TeamService)
└── profile/profile.component.ts   # Perfil de usuario (usa AuthService)
```

---

## 🔐 Gestión de Permisos

### Usuarios OAuth (Google)
- ✅ Pueden actualizar `countryCode` y `phoneNumber`
- ❌ NO pueden cambiar nombre, apellido o contraseña
- Razón: Datos sincronizados con proveedor OAuth

### Usuarios Locales
- ✅ Pueden actualizar `firstName`, `lastName`, `countryCode`, `phoneNumber`
- ✅ Pueden cambiar contraseña
- Validación: Contraseña debe tener 8+ caracteres, mayúsculas, minúsculas, números y caracteres especiales

---

## 🎯 Backend - Endpoints Implementados y Pendientes

### ✅ Endpoints Implementados (Puerto 8082)

El backend actualmente tiene estos endpoints funcionando:

```
POST   /api/teams              # Crear equipo con logo opcional (multipart/form-data)
GET    /api/teams              # Listar equipos del usuario autenticado
GET    /api/teams/{teamId}     # Obtener detalles de un equipo
PUT    /api/teams/{teamId}     # Actualizar equipo con logo opcional (multipart/form-data)
DELETE /api/teams/{teamId}     # Eliminar equipo
```

**Campos soportados:**
- `name` (string, requerido)
- `description` (string, opcional)
- `foundationDate` (date, opcional)
- `logo` (File, opcional - multipart/form-data)
- `code` (string, generado automáticamente por el backend)

### ⏳ Endpoints Pendientes de Implementación

La estructura recomendada para los próximos endpoints es:

```
/api/v1/teams                        # Grupos
/api/v1/teams/{id}/players          # Jugadores de un grupo
/api/v1/teams/players/me            # Mis jugadores
/api/v1/teams/polls                 # Pollas
/api/v1/teams/polls/{id}/matches    # Partidos de una polla
/api/v1/teams/polls/{id}/predictions # Predicciones
/api/v1/teams/invitations           # Invitaciones
```

### Validaciones Importantes en Backend

1. **Código de Grupo:**
   - Generar código alfanumérico único de 6 caracteres
   - Validar unicidad antes de crear grupo

2. **Invitaciones a Pollas:**
   - Validar que los equipos invitados existan
   - Notificar a los administradores de los equipos

3. **Estado de Pollas:**
   - DRAFT: Solo administrador puede agregar/editar partidos
   - ACTIVE: Usuarios pueden predecir, no se modifican partidos
   - FINISHED: Calcular puntos automáticamente

4. **Predicciones:**
   - Validar que el partido no haya iniciado
   - Validar que el usuario esté invitado a la polla
   - Permitir modificación hasta fecha límite

5. **Ranking:**
   - Calcular puntos según sistema definido
   - Actualizar al finalizar cada partido

---

## 🚀 Próximos Pasos

### Frontend
- [ ] Implementar UI de predicciones
- [ ] Implementar UI de ranking/leaderboard
- [ ] Conectar con API real de football cuando se tenga API key
- [ ] Agregar notificaciones en tiempo real

### Backend
- [ ] Implementar todos los endpoints de TeamService (40+ endpoints)
- [ ] Configurar sistema de notificaciones
- [ ] Implementar cálculo automático de puntos
- [ ] Crear jobs para actualización de partidos desde API externa

---

## 📝 Notas de Desarrollo

1. **No crear servicios adicionales** para pollas, jugadores o partidos. Todo debe ir en `TeamService`.
2. **Usar TypeScript estricto** para evitar errores de tipo.
3. **Lazy loading** está configurado para todos los componentes del dashboard.
4. **Reactive Forms** para todos los formularios con validación.
5. **Standalone Components** - Angular 19 no usa módulos tradicionales.

---

## 🛠️ Comandos Útiles

```bash
# Iniciar frontend
npm start

# Build para producción
npm run build

# Ejecutar tests
npm test

# Lint
npm run lint
```

---

**Última actualización:** ${new Date().toISOString().split('T')[0]}
