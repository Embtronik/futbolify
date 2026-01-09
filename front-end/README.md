# ⚽ Football Team Manager - Frontend

Aplicación Angular 19 para la gestión de equipos de fútbol amateur con sistema completo de autenticación.

## 🚀 Características

- ✅ Autenticación con email y contraseña
- ✅ Registro de usuarios con validación robusta
- ✅ Login con Google OAuth2
- ✅ Gestión automática de tokens JWT
- ✅ Refresh token automático
- ✅ Guards de rutas protegidas
- ✅ Interceptor HTTP para autorización
- ✅ Diseño responsive y moderno

## 📋 Requisitos Previos

- Node.js 18 o superior
- npm 9 o superior
- Backend API corriendo en `http://localhost:8082`

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor de desarrollo:
```bash
npm start
```

3. Abrir en el navegador:
```
http://localhost:4200
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/
│   ├── components/           # Componentes de la aplicación
│   │   ├── login/           # Componente de inicio de sesión
│   │   ├── register/        # Componente de registro
│   │   ├── oauth-redirect/  # Manejo de redirección OAuth2
│   │   └── dashboard/       # Dashboard principal
│   ├── services/            # Servicios de la aplicación
│   │   └── auth.service.ts  # Servicio de autenticación
│   ├── models/              # Modelos de datos TypeScript
│   │   ├── user.model.ts
│   │   └── auth.model.ts
│   ├── guards/              # Guards de navegación
│   │   └── auth.guard.ts
│   ├── interceptors/        # Interceptores HTTP
│   │   └── auth.interceptor.ts
│   ├── app.routes.ts        # Configuración de rutas
│   ├── app.config.ts        # Configuración de la app
│   └── app.component.ts     # Componente raíz
├── styles.css               # Estilos globales
└── index.html              # HTML principal
```

## 🔐 Funcionalidades de Autenticación

### Registro de Usuario
- **Endpoint**: `POST /api/v1/auth/register`
- **Validaciones**:
  - Email válido
  - Contraseña mínimo 8 caracteres
  - Debe incluir: mayúscula, minúscula, número y carácter especial
  - Confirmación de contraseña

### Login con Credenciales
- **Endpoint**: `POST /api/v1/auth/login`
- Almacenamiento seguro de tokens en localStorage
- Redirección automática al dashboard

### Login con Google OAuth2
- **Flujo**:
  1. Click en "Continuar con Google"
  2. Redirección a `GET /oauth2/authorization/google`
  3. Google autentica al usuario
  4. Redirección a `http://localhost:4200/oauth2/redirect?token={jwt}&refreshToken={refresh}`
  5. Captura de tokens y navegación al dashboard

### Refresh Token Automático
- **Endpoint**: `POST /api/v1/auth/refresh-token`
- Interceptor detecta tokens expirados (401)
- Refresco automático antes de reintentar la petición
- Logout automático si el refresh falla

### Obtener Usuario Actual
- **Endpoint**: `GET /api/v1/user/me`
- Headers: `Authorization: Bearer {accessToken}`
- Actualización del estado del usuario

## 🛡️ Guards y Seguridad

### AuthGuard
Protege rutas que requieren autenticación:
```typescript
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [authGuard]
}
```

### AuthInterceptor
- Agrega automáticamente el token JWT a todas las peticiones
- Maneja errores 401 con refresh automático
- Excluye endpoints de autenticación

## 🎨 Estilos y UI

- Diseño moderno con gradientes
- Sistema de variables CSS
- Responsive design (mobile-first)
- Animaciones suaves
- Feedback visual en formularios
- Estados de carga

## 📱 Rutas de la Aplicación

| Ruta | Componente | Protegida | Descripción |
|------|-----------|-----------|-------------|
| `/` | - | No | Redirige a `/auth/login` |
| `/auth/login` | LoginComponent | No | Página de inicio de sesión |
| `/auth/register` | RegisterComponent | No | Página de registro |
| `/oauth2/redirect` | OauthRedirectComponent | No | Captura tokens de OAuth2 |
| `/dashboard` | DashboardComponent | Sí | Dashboard principal |

## 🔧 Configuración del Backend

El frontend consume los siguientes servicios del backend:

### API Base URLs
- **Autenticación**: `http://localhost:8080/api/v1/auth`
- **Usuarios**: `http://localhost:8080/api/v1/user`
- **Equipos**: `http://localhost:8082/api/teams`
- **OAuth2**: `http://localhost:8080/oauth2/authorization`

### Endpoints de Equipos Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/teams` | Crear nuevo equipo (con logo opcional) |
| GET | `/api/teams/{teamId}` | Obtener detalles de un equipo específico |
| GET | `/api/teams` | Listar equipos del usuario autenticado |
| PUT | `/api/teams/{teamId}` | Actualizar equipo (con logo opcional) |
| DELETE | `/api/teams/{teamId}` | Eliminar equipo |

**Nota**: Los endpoints de equipos aceptan `multipart/form-data` para el upload de logos.

Para cambiar estas URLs, modifica los servicios correspondientes:
- **AuthService** (`src/app/services/auth.service.ts`):
  ```typescript
  private readonly API_URL = 'http://localhost:8080/api/v1';
  private readonly OAUTH_URL = 'http://localhost:8080/oauth2/authorization';
  ```
- **TeamService** (`src/app/services/team.service.ts`):
  ```typescript
  private readonly API_URL = 'http://localhost:8082/api';
  ```

## 📦 Scripts Disponibles

```bash
npm start          # Inicia el servidor de desarrollo
npm run build      # Construye la aplicación para producción
npm test           # Ejecuta las pruebas unitarias
npm run watch      # Construye en modo watch
```

## 🚧 Próximas Funcionalidades

- [x] Gestión de equipos (CRUD básico implementado)
- [x] Upload de logos para equipos
- [ ] Gestión de jugadores
- [ ] Sistema de pollas (apuestas deportivas)
- [ ] Calendario de partidos
- [ ] Estadísticas de jugadores
- [ ] Torneos y ligas
- [ ] Ranking y leaderboard
- [ ] Notificaciones en tiempo real
- [ ] Chat entre equipos

## 🐛 Troubleshooting

### Error de CORS
Si ves errores de CORS, asegúrate de que el backend permita peticiones desde `http://localhost:4200`.

### Tokens no se guardan
Verifica que localStorage esté habilitado en tu navegador.

### Google OAuth no funciona
Asegúrate de que:
1. El backend tenga configuradas las credenciales de Google
2. La URL de redirección esté registrada en Google Cloud Console
3. El backend esté corriendo y accesible

## 📄 Licencia

Este proyecto es privado y está desarrollado para gestión de equipos de fútbol amateur.

## 👨‍💻 Autor

Proyecto desarrollado con Angular 19 y TypeScript.
