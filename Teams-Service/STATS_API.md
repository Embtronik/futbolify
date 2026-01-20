# Estadísticas (menú lateral) — API

Este documento describe los endpoints para el menú **Estadísticas**.

## Reglas de acceso
- Puede ver estadísticas el **OWNER (administrador)** del equipo.
- También pueden ver estadísticas los **miembros APROBADOS** del equipo.
- Todas las llamadas requieren JWT (`Authorization: Bearer <token>`).

---

## 1) Listar equipos disponibles para “Estadísticas”

### GET `/api/stats/teams`
Devuelve los equipos donde el usuario autenticado puede ver estadísticas.

**Respuesta (200)**
```json
[
  {"teamId": 1, "teamName": "Los Tigres", "role": "OWNER"},
  {"teamId": 2, "teamName": "Barrio FC", "role": "MEMBER"}
]
```

---

## 2) Años disponibles (solo partidos finalizados)

### GET `/api/teams/{teamId}/stats/years`
Devuelve los años donde existen partidos **finalizados** (`finished=true`).

**Respuesta (200)**
```json
[2024, 2025, 2026]
```

---

## 3) Meses disponibles por año

### GET `/api/teams/{teamId}/stats/months?year=2026`
Devuelve los meses (1-12) con partidos finalizados en ese año.

**Respuesta (200)**
```json
[1, 2, 5, 12]
```

---

## 4) Histórico de marcadores (por año/mes)

### GET `/api/teams/{teamId}/stats/matches?year=2026&month=1&page=0&size=20`
- `month` es opcional: si no se envía, trae **todo el año** paginado.
- Devuelve cada partido con el marcador de los 2 equipos del partido.

**Respuesta (200)**
```json
{
  "page": 0,
  "size": 20,
  "totalElements": 3,
  "totalPages": 1,
  "last": true,
  "content": [
    {
      "matchId": 10,
      "matchDateTime": "2026-01-19T20:00:00",
      "matchAddress": "Cancha Central",
      "teamA": {"matchTeamId": 100, "name": "Rojo", "color": "#ff0000", "goals": 3},
      "teamB": {"matchTeamId": 101, "name": "Azul", "color": "#0000ff", "goals": 2},
      "winnerMatchTeamId": 100
    }
  ]
}
```

---

## 5) Top goleadores por período (año/mes)

### GET `/api/teams/{teamId}/stats/top-scorers?year=2026&month=1&limit=20`
- `month` es opcional.
- Suma **goles** (`goals`) y **autogoles** (`ownGoals`) de partidos finalizados.

**Respuesta (200)**
```json
[
  {
    "userEmail": "galopezi@gmail.com",
    "userId": 123,
    "goals": 5,
    "ownGoals": 1,
    "userInfo": {
      "id": 123,
      "email": "galopezi@gmail.com",
      "firstName": "Giovanny",
      "lastName": "López",
      "countryCode": "+57",
      "phoneNumber": "3000000000",
      "provider": "GOOGLE",
      "emailVerified": true
    }
  }
]
```

> Nota: para mostrar “por nombre”, el front puede usar `userInfo.fullName` (o `firstName + lastName`).

---

## 6) ¿Cuál equipo ganó más partidos? (leaderboard)

### GET `/api/teams/{teamId}/stats/match-teams/winners?year=2026&month=1`
- `month` es opcional.
- Agrupa por `(name,color)` de los equipos del partido.

**Respuesta (200)**
```json
[
  {"name": "Rojo", "color": "#ff0000", "wins": 4},
  {"name": "Azul", "color": "#0000ff", "wins": 2}
]
```

---

# Secuencia recomendada para el Front (menú lateral “Estadísticas”)

1. **Cargar equipos** del usuario:
   - Llamar `GET /api/stats/teams`
   - Mostrar lista de equipos (con rol OWNER/MEMBER).

2. **Seleccionar un equipo** (teamId):
   - Llamar `GET /api/teams/{teamId}/stats/years`

3. **Seleccionar año**:
   - Llamar `GET /api/teams/{teamId}/stats/months?year=YYYY`

4. **Seleccionar mes (opcional)**:
   - Histórico de marcadores:
     - `GET /api/teams/{teamId}/stats/matches?year=YYYY&month=MM&page=0&size=20`
   - Top goleadores:
     - `GET /api/teams/{teamId}/stats/top-scorers?year=YYYY&month=MM&limit=20`
   - Equipo con más victorias:
     - `GET /api/teams/{teamId}/stats/match-teams/winners?year=YYYY&month=MM`

5. (Opcional) Si el usuario quiere ver **todo el año**:
   - Repetir `matches` con `month` vacío y paginar.

