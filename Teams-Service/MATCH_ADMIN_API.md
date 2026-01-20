# Match Admin API (Gestión de Partidos)

Base path: `/api/teams/{teamId}/matches`

> Todos los endpoints requieren `Authorization: Bearer <JWT>`.
> Por ahora, las acciones de **administración** están restringidas al **owner** del equipo.

## 1) Asistencia (ver / administrar)

### 1.1 Listar asistencia (para miembros aprobados u owner)

**GET** `/api/teams/{teamId}/matches/{matchId}/attendance`

Respuesta: lista de miembros aprobados con `status` en `ATTENDING | NOT_ATTENDING | PENDING`.

### 1.2 Resumen de asistencia (para owner/admin)

**GET** `/api/teams/{teamId}/matches/{matchId}/attendance/summary`

Respuesta agrupa en 3 listas + contadores.

### 1.3 Confirmar mi asistencia (jugador)

**POST** `/api/teams/{teamId}/matches/{matchId}/attendance?attending=true|false`

- `true` => `ATTENDING`
- `false` => `NOT_ATTENDING`

### 1.4 Cambiar asistencia de un jugador (admin/owner)

**PUT** `/api/teams/{teamId}/matches/{matchId}/attendance/{userId}`

Body:
```json
{ "status": "ATTENDING" }
```

Valores permitidos:
- `ATTENDING`
- `NOT_ATTENDING`
- `PENDING` (elimina la respuesta y lo deja como pendiente)

Devuelve el `summary` actualizado (útil para refrescar UI).

## 2) Equipos del partido (para armar equipos con asistentes)

Base path: `/api/teams/{teamId}/matches/{matchId}/teams`

### 2.1 Crear un equipo

**POST** `/api/teams/{teamId}/matches/{matchId}/teams`

Body:
```json
{ "name": "Equipo Rojo", "color": "#FF0000" }
```

### 2.2 Crear varios equipos (cuando el admin elige cuántos equipos conformar)

**POST** `/api/teams/{teamId}/matches/{matchId}/teams/bulk`

Body:
```json
{
  "teams": [
    { "name": "Equipo Rojo", "color": "#FF0000" },
    { "name": "Equipo Azul", "color": "#0000FF" }
  ]
}
```

### 2.3 Listar equipos con jugadores asignados

**GET** `/api/teams/{teamId}/matches/{matchId}/teams`

Respuesta:
```json
[
  {
    "id": 10,
    "matchId": 5,
    "name": "Equipo Rojo",
    "color": "#FF0000",
    "createdAt": "2026-01-16T10:00:00",
    "players": [
      {
        "userId": 123,
        "userEmail": "jugador@correo.com",
        "position": "DEFENDER",
        "userInfo": null
      }
    ]
  }
]
```

### 2.4 Editar un equipo

**PUT** `/api/teams/{teamId}/matches/{matchId}/teams/{matchTeamId}`

Body:
```json
{ "name": "Equipo Rojo", "color": "#FF0000" }
```

### 2.5 Eliminar un equipo

**DELETE** `/api/teams/{teamId}/matches/{matchId}/teams/{matchTeamId}`

## 3) Asignar jugadores a equipos (drag & drop)

### 3.1 Asignar / mover jugador a un equipo (solo si está `ATTENDING`)

**PUT** `/api/teams/{teamId}/matches/{matchId}/teams/{matchTeamId}/players/{userId}`

Body:
```json
{ "position": "GOALKEEPER" }
```

Posiciones permitidas:
- `GOALKEEPER`
- `DEFENDER`
- `MIDFIELDER`
- `FORWARD`

**Nota:** si el jugador ya estaba asignado a otro equipo del mismo partido, se mueve automáticamente.

### 3.2 Quitar jugador de un equipo

**DELETE** `/api/teams/{teamId}/matches/{matchId}/teams/{matchTeamId}/players/{userId}`

## 4) Notificar equipos del partido (correo + sms + whatsapp)

Cuando el administrador termine de armar los equipos, puede disparar una notificación a todos los jugadores que quedaron asignados en los equipos.

**POST** `/api/teams/{teamId}/matches/{matchId}/teams/notify`

Respuesta:
```json
{
  "teamId": 1,
  "matchId": 10,
  "recipients": 12,
  "recipientEmails": ["a@b.com"],
  "subject": "Futbolify | Equipos confirmados - Mi Equipo (16/01/2026 19:30)"
}
```

## Ejemplos CURL (rápidos)

### Obtener resumen de asistencia
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8082/api/teams/1/matches/10/attendance/summary
```

### Admin marca a un jugador como asistente
```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"ATTENDING"}' \
  http://localhost:8082/api/teams/1/matches/10/attendance/123
```

### Crear 2 equipos
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"teams":[{"name":"Rojo","color":"#FF0000"},{"name":"Azul","color":"#0000FF"}]}' \
  http://localhost:8082/api/teams/1/matches/10/teams/bulk
```

### Arrastrar (asignar) un jugador al equipo rojo como DEFENDER
```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"position":"DEFENDER"}' \
  http://localhost:8082/api/teams/1/matches/10/teams/55/players/123
```

## 5) Resultado del partido (goles + autogoles)

Base path: `/api/teams/{teamId}/matches/{matchId}/result`

Reglas:
- Requiere que existan **exactamente 2 equipos** del partido.
- Solo el **owner** puede registrar/editar el resultado.
- Un **autogol** suma al marcador del **equipo contrario**.

### 5.1 Guardar/editar resultado (admin/owner)

**PUT** `/api/teams/{teamId}/matches/{matchId}/result`

Body:
```json
{
  "finished": true,
  "players": [
    { "userEmail": "a@b.com", "userId": 123, "goals": 2, "ownGoals": 0 },
    { "userEmail": "c@d.com", "userId": 456, "goals": 0, "ownGoals": 1 }
  ]
}
```

Respuesta (ejemplo):
```json
{
  "teamId": 1,
  "matchId": 10,
  "finished": true,
  "finishedAt": "2026-01-19T21:10:00",
  "resultUpdatedAt": "2026-01-19T21:10:00",
  "matchAddress": "Cancha X",
  "matchDateTime": "2026-01-19T19:30:00",
  "teams": [
    {
      "matchTeamId": 55,
      "name": "Rojo",
      "color": "#FF0000",
      "goals": 3,
      "players": [
        { "userId": 123, "userEmail": "a@b.com", "goals": 2, "ownGoals": 0, "position": "DEFENDER", "userInfo": null }
      ]
    },
    {
      "matchTeamId": 56,
      "name": "Azul",
      "color": "#0000FF",
      "goals": 0,
      "players": [
        { "userId": 456, "userEmail": "c@d.com", "goals": 0, "ownGoals": 1, "position": "FORWARD", "userInfo": null }
      ]
    }
  ]
}
```

### 5.2 Consultar resultado (owner o miembro aprobado)

**GET** `/api/teams/{teamId}/matches/{matchId}/result`

Devuelve el mismo `MatchResultResponse`.

## 6) Estadísticas históricas (por equipo)

### 6.1 Goles históricos por jugador (owner o miembro aprobado)

**GET** `/api/teams/{teamId}/matches/stats/players?limit=50`

Respuesta:
```json
[
  {
    "userEmail": "a@b.com",
    "userId": 123,
    "totalGoals": 10,
    "totalOwnGoals": 1,
    "matchesFinished": 5,
    "userInfo": null
  }
]
```
