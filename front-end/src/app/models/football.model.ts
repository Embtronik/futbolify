export interface Team {
  id: number;
  name: string;
  joinCode: string; // Código alfanumérico único generado por el backend
  logoUrl?: string;
  description?: string;
  ownerUserId: number; // ID del usuario propietario del equipo
  ownerEmail?: string; // Email del usuario propietario del equipo (creador)
  memberCount?: number; // Total de miembros aprobados
  pendingRequestsCount?: number; // Solicitudes pendientes (solo para admin)
  members?: TeamMember[]; // Cached members for UI purposes
  // Ubicación
  address?: string; // Dirección completa formateada
  latitude?: number; // Latitud
  longitude?: number; // Longitud
  placeId?: string; // Google Place ID
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Respuesta paginada genérica del backend
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  photo?: string;
  teamId?: number;
  teamName?: string;
  teamCode?: string; // Para almacenar el código del grupo al que pertenece
  position: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
  jerseyNumber?: number;
  birthDate?: Date;
  height?: number; // cm
  weight?: number; // kg
  nationality?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request para unirse a un equipo con código
export interface JoinTeamRequest {
  joinCode: string; // Código del grupo para unirse (6 caracteres)
}

// Miembro de un equipo con estado de aprobación
export interface TeamMember {
  id: number;
  teamId: number;
  teamName?: string;
  joinCode?: string; // Código del grupo para unirse (opcional para TeamMember)
  userId: number;
  userEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; // Estado de la membresía
  requestedAt: Date | string; // Fecha de solicitud
  approvedAt?: Date | string; // Fecha de aprobación
  approvedBy?: number; // ID del admin que aprobó
  userInfo?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    countryCode?: string;
    phoneNumber?: string;
    provider: 'GOOGLE' | 'LOCAL';
    emailVerified: boolean;
  };
}

// Request para aprobar/rechazar miembro
export interface ApproveMemberRequest {
  approved: boolean;
}

export interface Match {
  id: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  matchDate: Date;
  location?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  homeScore?: number;
  awayScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Partidos regulares asociados a un team (TeamMatchResponse en el backend)
export interface TeamMatch {
  id: number;
  teamId: number;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  matchDateTime: string; // ISO string (ej: 2026-02-01T20:00:00)
  createdByUserId?: number; // ID del usuario que creó el partido
  // Estado opcional del partido (para UI)
  status?: 'SCHEDULED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  // Resultado / finalización (opcionales según payload backend)
  finished?: boolean;
  finishedAt?: string;
  resultUpdatedAt?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Request para crear un partido regular de equipo
export interface CreateTeamMatchRequest {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  matchDateTime: string; // ISO string
}
 
export type MatchAttendanceStatus = 'ATTENDING' | 'NOT_ATTENDING' | 'PENDING';

export interface TeamMatchAttendance {
  userId: number;
  userEmail: string;
  userInfo?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
  };
  status: MatchAttendanceStatus;
}

// Resumen agrupado de asistencia (para admin/owner)
export interface TeamMatchAttendanceSummary {
  attending: TeamMatchAttendance[];
  notAttending: TeamMatchAttendance[];
  pending: TeamMatchAttendance[];
  counts?: {
    attending: number;
    notAttending: number;
    pending: number;
    total?: number;
  };
}

export type PlayerPosition = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

export interface MatchTeamPlayer {
  userId: number;
  userEmail: string;
  position: PlayerPosition;
  userInfo?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

// Equipo creado para un partido (match team)
export interface MatchTeam {
  id: number;
  matchId: number;
  name: string;
  color: string;
  createdAt?: string;
  players: MatchTeamPlayer[];
}

// ==============================
// RESULTADO DEL PARTIDO (MATCH RESULT)
// ==============================

export interface TeamMatchPlayerResultInput {
  userEmail: string;
  goals: number;
  ownGoals: number;
}

export interface TeamMatchResultUpsertRequest {
  finished: boolean;
  players: TeamMatchPlayerResultInput[];
}

export interface TeamMatchResultPlayer {
  userEmail: string;
  goals: number;
  ownGoals: number;
  userInfo?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

export interface TeamMatchResultTeam {
  id: number;
  name: string;
  color: string;
  goals: number;
  players: TeamMatchResultPlayer[];
}

export interface TeamMatchResult {
  finished: boolean;
  finishedAt?: string;
  resultUpdatedAt?: string;
  teams: TeamMatchResultTeam[];
}

export interface MatchNotifyResponse {
  teamId: number;
  matchId: number;
  recipients: number;
  recipientEmails: string[];
  subject: string;
}

// Equipos profesionales de API-Football
export interface FootballTeam {
  id: number;              // ID de la API
  name: string;            // Nombre del equipo
  logo: string;            // URL del logo
  country: string;         // País
  founded?: number;        // Año de fundación
  national: boolean;       // Si es selección nacional
}

// Ligas/Competiciones de API-Football
export interface FootballLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
}

// Partido de la API externa (API-Football)
export interface FootballFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue?: {
      name: string;
      city: string;
    };
    status: {
      short: string; // NS, LIVE, FT, etc.
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season?: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals?: {
    home: number | null;
    away: number | null;
  };
}

// ==========================================
// POLLAS (Sistema de apuestas de marcadores)
// ==========================================

// Polla de apuestas
export interface Poll {
    emailUsuarioAutenticado?: string;
  id: number;
  nombre: string;
  descripcion?: string;
  creadorEmail: string;
  fechaInicio: Date | string;
  montoEntrada: number;
  estado: 'CREADA' | 'ABIERTA' | 'CERRADA' | 'FINALIZADA';
  gruposInvitados?: number[]; // IDs de grupos seleccionados

  // Back-compat (older backend payloads)
  participantesCount?: number; // Participantes que aceptaron
  invitadosCount?: number; // Total de invitados (incluyendo pendientes)
  partidosCount?: number;

  // Current backend payloads
  totalPartidos?: number;
  totalParticipantes?: number;
  partidos?: PollMatch[];
  participantes?: PollParticipant[];

  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Participante de una polla
export interface PollParticipant {
  id: number;
  pollaId: number;
  emailUsuario: string;
  nombreUsuario?: string;
  estado: 'INVITADO' | 'ACEPTADO' | 'RECHAZADO';
  fechaRespuesta?: Date | string;
  createdAt?: Date | string;
}

// Partido dentro de una polla
export interface PollMatch {
    golesLocalPronosticado?: number;
    golesVisitantePronosticado?: number;
  id: number;
  pollaId: number;
  idPartidoExterno?: string; // ID del partido en API externa
  equipoLocal: string;
  equipoLocalLogo?: string;
  equipoVisitante: string;
  equipoVisitanteLogo?: string;
  fechaHoraPartido: Date | string;
  fechaLimitePronostico: Date | string; // fechaHoraPartido - 5 minutos
  // Algunos backends exponen flags adicionales
  partidoFinalizado?: boolean;
  puedePronosticar?: boolean;
  // Respuesta enriquecida puede incluir los pronósticos existentes
  pronosticos?: PollPrediction[];
  golesLocal?: number; // Resultado real
  golesVisitante?: number; // Resultado real
  liga?: string;
  estado?: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO';
  createdAt?: Date | string;
}

// Marcador real/estado real de un partido de una polla
export type PollMatchScoreServedFrom = 'DB' | 'API';

export interface PartidoMarcadorResponse {
  pollaId: number;
  pollaPartidoId: number;
  idPartidoExterno: string;
  apiStatusShort: string;
  apiStatusLong: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  partidoFinalizado: boolean;
  lastApiSyncAt: string | null;
  servedFrom: PollMatchScoreServedFrom;
  ttlSeconds: number | null;
}

// Tabla de posiciones de una polla
export interface PollaTablaPosicionesEntry {
  email?: string;
  emailUsuario?: string;
  emailParticipante?: string;
  nombre?: string;
  nombreUsuario?: string;
  nombreParticipante?: string;
  puntos?: number;
  puntosTotales?: number;
  userInfo?: {
    email?: string;
    // Newer AuthServiceClient payloads
    firstName?: string;
    lastName?: string;
    // Back-compat payloads
    nombre?: string;
    apellido?: string;
    fotoUrl?: string;
  } | null;
}

export interface PollaTablaPosicionesResponse {
  pollaId?: number;
  estadoPolla?: string;
  definitivo?: boolean;
  tabla?: PollaTablaPosicionesEntry[];
  posiciones?: PollaTablaPosicionesEntry[];
  ranking?: PollaTablaPosicionesEntry[];
}

// Pronóstico de un participante para un partido
export interface PollPrediction {
  id: number;
  pollaPartidoId: number;
  emailParticipante: string;
  nombreParticipante?: string;
  golesLocalPronosticado: number;
  golesVisitantePronosticado: number;
  // Campos opcionales en payloads nuevos
  fechaActualizacion?: Date | string;
  puntosObtenidos?: number;
  userInfo?: {
    id: number;
    email: string;
    nombre?: string;
    avatarUrl?: string;
  };
  puntos?: number; // Puntos obtenidos (calculado después del partido)
  fechaRegistro: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Request para crear una polla
export interface CreatePollRequest {
  nombre: string;
  descripcion?: string;
  fechaInicio: string; // ISO string
  montoEntrada: number;
  gruposIds: number[]; // IDs de los grupos
  emailsInvitados: string[]; // Emails de miembros seleccionados
}

// Request para agregar un partido a una polla
export interface AddPollMatchRequest {
  pollaId: number;
  idPartidoExterno?: string;
  equipoLocal: string;
  equipoLocalLogo?: string;
  equipoVisitante: string;
  equipoVisitanteLogo?: string;
  fechaHoraPartido: string; // ISO string
  liga?: string;
}

// Request para crear/actualizar un pronóstico
export interface CreatePredictionRequest {
  pollaPartidoId: number;
  golesLocalPronosticado: number;
  golesVisitantePronosticado: number;
}

// Invitación a polla
export interface PollInvitation {
  id: number;
  pollaId: number;
  pollaNombre: string;
  emailUsuario: string;
  estado: 'INVITADO' | 'ACEPTADO' | 'RECHAZADO';
  fechaRespuesta?: Date | string;
  createdAt?: Date | string;
}

export interface Statistics {
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  totalPolls: number;
  upcomingMatches: number;
  activePolls: number;
}

// ==============================
// ESTADÍSTICAS (MENÚ LATERAL)
// ==============================

export type StatsTeamRole = 'OWNER' | 'MEMBER';

export interface StatsTeamAccess {
  teamId: number;
  teamName: string;
  role: StatsTeamRole;
}

export interface StatsMatchTeamScore {
  matchTeamId: number;
  name: string;
  color: string;
  goals: number;
}

export interface StatsMatchHistoryItem {
  matchId: number;
  matchDateTime: string;
  matchAddress?: string;
  teamA: StatsMatchTeamScore;
  teamB: StatsMatchTeamScore;
  winnerMatchTeamId?: number | null;
}

export interface StatsTopScorer {
  userEmail: string;
  userId: number;
  goals: number;
  ownGoals: number;
  userInfo?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    countryCode?: string;
    phoneNumber?: string;
    provider: 'GOOGLE' | 'LOCAL';
    emailVerified: boolean;
  };
}

export interface StatsMatchTeamWinner {
  name: string;
  color: string;
  wins: number;
}
