# ⚽ Football Team Manager - Frontend

Aplicación Angular 19 para la gestión de equipos de fútbol amateur con sistema completo de autenticación.

## 🚀 Características

### Autenticación y Seguridad
- ✅ Autenticación con email y contraseña
- ✅ Registro de usuarios con validación robusta
- ✅ Login con Google OAuth2
- ✅ Gestión automática de tokens JWT
- ✅ Refresh token automático con redirección al expirar
- ✅ Guards de rutas protegidas
- ✅ Interceptor HTTP para autorización

### Sistema de Pollas (Predicciones Deportivas)
- ✅ Pollas privadas (requieren invitación a grupos)
- ✅ Pollas públicas (acceso mediante pago)
- ✅ Integración con pasarela de pagos Wompi
- ✅ Validación automática de pagos
- ✅ Múltiples modos de pago (pago directo o confirmación con referencia)
- ✅ Sistema de predicciones de partidos
- ✅ Tabla de posiciones y ranking

### Gestión de Equipos
- ✅ CRUD completo de equipos
- ✅ Upload de logos de equipos
- ✅ Gestión de miembros y permisos

### UI/UX
- ✅ Diseño responsive y moderno
- ✅ Validación de fechas (solo fechas futuras)

## 📋 Requisitos Previos

- Node.js 18 o superior
- npm 9 o superior
- **Backend Services**:
  - Auth/User Service: `http://localhost:8080`
  - Teams Service: `http://localhost:8082`
  - Payment Service: `http://localhost:8083`

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
│   │   ├── dashboard/       # Dashboard principal
│   │   │   ├── home/
│   │   │   ├── teams/
│   │   │   ├── members/
│   │   │   ├── players/
│   │   │   ├── matches/
│   │   │   ├── polls/       # Gestión de pollas
│   │   │   ├── profile/
│   │   │   └── stats/
│   │   └── polls/           # Componentes públicos de pollas
│   │       ├── poll-create/         # Crear polla (privada/pública)
│   │       ├── poll-detail/         # Detalle y predicciones
│   │       ├── polls-list/          # Listado de pollas del usuario
│   │       ├── polls-public-list/   # Listado de pollas públicas
│   │       └── poll-participate/    # Pago y participación
│   ├── services/            # Servicios de la aplicación
│   │   ├── auth.service.ts          # Servicio de autenticación
│   │   ├── team.service.ts          # Servicio de equipos
│   │   ├── poll.service.ts          # Servicio de pollas
│   │   ├── payment.service.ts       # Servicio de pagos (Wompi)
│   │   ├── match.service.ts         # Servicio de partidos
│   │   └── statistics.service.ts    # Servicio de estadísticas
│   ├── models/              # Modelos de datos TypeScript
│   │   ├── user.model.ts
│   │   ├── auth.model.ts
│   │   └── football.model.ts        # Modelos de pollas, pagos, etc.
│   ├── guards/              # Guards de navegación
│   │   └── auth.guard.ts
│   ├── interceptors/        # Interceptores HTTP
│   │   └── auth.interceptor.ts
│   ├── app.routes.ts        # Configuración de rutas
│   ├── app.config.ts        # Configuración de la app
│   └── app.component.ts     # Componente raíz
├── environments/            # Configuración por entorno
│   ├── environment.ts       # Desarrollo
│   ├── environment.local.ts # Local
│   └── environment.prod.ts  # Producción
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
| `/` | LandingComponent | No | Página de inicio |
| `/login` | LoginComponent | No | Página de inicio de sesión |
| `/register` | RegisterComponent | No | Página de registro |
| `/oauth2/redirect` | OauthRedirectComponent | No | Captura tokens de OAuth2 |
| `/dashboard` | DashboardComponent | Sí | Dashboard principal |
| `/dashboard/polls` | PollsComponent | Sí | Mis pollas |
| `/dashboard/polls/create` | PollCreateComponent | Sí | Crear polla (privada/pública) |
| `/dashboard/polls/:id` | PollDetailComponent | Sí | Detalle de polla y predicciones |
| `/polls/public` | PollsPublicListComponent | Sí | Listado de pollas públicas |
| `/polls/public/:id/participate` | PollParticipateComponent | Sí | Pago y participación |

## 🔧 Configuración del Backend

El frontend consume los siguientes microservicios:

### API Base URLs
- **Autenticación**: `http://localhost:8080/api/v1/auth`
- **Usuarios**: `http://localhost:8080/api/v1/user`
- **Equipos**: `http://localhost:8082/api/teams`
- **Pollas**: `http://localhost:8082/api/polls`
- **Pagos**: `http://localhost:8083/api/v1/payments`
- **OAuth2**: `http://localhost:8080/oauth2/authorization`

### Endpoints de Equipos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/teams` | Crear nuevo equipo (con logo opcional) |
| GET | `/api/teams/{teamId}` | Obtener detalles de un equipo específico |
| GET | `/api/teams` | Listar equipos del usuario autenticado |
| PUT | `/api/teams/{teamId}` | Actualizar equipo (con logo opcional) |
| DELETE | `/api/teams/{teamId}` | Eliminar equipo |

**Nota**: Los endpoints de equipos aceptan `multipart/form-data` para el upload de logos.

### Endpoints de Pollas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/polls` | Crear polla (privada/pública) |
| GET | `/api/polls/{id}` | Obtener detalles de una polla |
| GET | `/api/polls` | Listar pollas del usuario |
| GET | `/api/polls/public` | Listar pollas públicas disponibles |
| POST | `/api/polls/{id}/participate` | Participar en polla pública (con pago) |
| POST | `/api/polls/{id}/predictions` | Crear/actualizar predicciones |
| GET | `/api/polls/{id}/standings` | Obtener tabla de posiciones |

### Endpoints de Pagos (Wompi Integration)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/payments/transactions` | Crear transacción de pago |
| GET | `/api/v1/payments/transactions/{id}` | Obtener transacción por ID |
| GET | `/api/v1/payments/transactions/reference/{ref}` | Obtener transacción por referencia |
| POST | `/api/v1/payments/transactions/validate` | Validar pago |
| GET | `/api/v1/payments/polls/{pollId}/check` | Verificar pago para polla |

**Formato de referencia de pago**: `POLLA-{pollId}-{email}-{timestamp}-{random}`

### Configuración de URLs

Para cambiar estas URLs, modifica los archivos de entorno:
- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (producción)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  teamsApiUrl: 'http://localhost:8082/api',
  paymentApiUrl: 'http://localhost:8083/api/v1/payments',
  oauthUrl: 'http://localhost:8080/oauth2/authorization'
};
```

## 📦 Scripts Disponibles

```bash
npm start          # Inicia el servidor de desarrollo
npm run build      # Construye la aplicación para producción
npm test           # Ejecuta las pruebas unitarias
npm run watch      # Construye en modo watch
```

## 🎯 Sistema de Pollas

### Tipos de Pollas

#### Pollas Privadas
- Requieren ser parte de grupos específicos
- Validación automática de grupos en la creación
- Sin costo de entrada
- Ideal para competencias entre amigos

#### Pollas Públicas
- Abiertas a cualquier usuario autenticado
- Requieren pago de entrada
- Integración con Wompi para pagos en línea
- Los grupos son opcionales (acceso privilegiado)

### Flujo de Pago para Pollas Públicas

1. **Usuario selecciona polla pública**: Navega a `/polls/public` y selecciona una polla
2. **Modo de pago**:
   - **Pagar Ahora**: Ingresa datos de tarjeta (Wompi)
     - `paymentSourceId`: ID del método de pago
     - `acceptanceToken`: Token de aceptación de términos
     - `installments`: Número de cuotas
   - **Ya Pagué**: Ingresa referencia de pago existente
3. **Procesamiento**:
   - Sistema genera referencia única `POLLA-{id}-{email}-{timestamp}-{random}`
   - Crea transacción en payment-service
   - Valida pago con Wompi
4. **Confirmación**:
   - Si pago es aprobado → Participación automática
   - Si pago es pendiente → Verificación periódica
   - Si pago es rechazado → Mensaje de error
5. **Acceso**: Usuario puede hacer predicciones y ver rankings

### Validación de Pagos

- Payment-service integrado con Wompi (Colombia)
- Almacenamiento de transacciones en PostgreSQL
- Eventos de pago vía RabbitMQ
- Sincronización automática con teams-service

## 🚧 Próximas Funcionalidades

- [x] Gestión de equipos (CRUD básico implementado)
- [x] Upload de logos para equipos
- [x] Sistema de pollas privadas y públicas
- [x] Integración con pasarela de pagos
- [x] Validación de fechas futuras
- [x] Manejo de expiración de JWT con redirect
- [ ] Gestión de jugadores
- [ ] Calendario de partidos integrado
- [ ] Estadísticas avanzadas de usuarios
- [ ] Torneos y ligas
- [ ] Notificaciones push en tiempo real
- [ ] Chat entre equipos
- [ ] Integración con más pasarelas de pago

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

### JWT Expirado
- El sistema detecta automáticamente tokens expirados
- Intenta refrescar el token automáticamente
- Si el refresh falla, redirige a `/login?expired=true`
- Se muestra un mensaje de sesión expirada

### Errores de Pago
- **"Usuario no autenticado"**: Refresca la página o vuelve a iniciar sesión
- **"Pago no válido"**: Verifica que la referencia sea correcta
- **"Pago pendiente"**: Espera unos minutos y vuelve a intentar con la referencia
- **"Error al procesar el pago"**: Verifica tus datos de tarjeta o contacta soporte

### Payment Service no responde
Asegúrate de que:
1. El payment-service esté corriendo en `http://localhost:8083`
2. PostgreSQL esté disponible para el servicio
3. Las credenciales de Wompi estén configuradas correctamente
4. RabbitMQ esté activo para events

### Fecha de inicio no válida
- Las pollas solo pueden crearse con fechas futuras
- Verifica la zona horaria de tu navegador
- El campo usa `datetime-local` con validación `min`

## 📄 Licencia

Este proyecto es privado y está desarrollado para gestión de equipos de fútbol amateur.

## 👨‍💻 Autor

Proyecto desarrollado con Angular 19 y TypeScript.
