# Instrucciones para Agentes de IA en este Proyecto (Football Team Manager Frontend)

## Visión General
- Proyecto Angular 19 para gestión de equipos de fútbol amateur.
- Arquitectura modular: componentes, servicios, modelos, guards e interceptores.
- Autenticación robusta (JWT, refresh tokens, OAuth2 Google) y protección de rutas.
- Comunicación principal con backend REST (ver servicios en `src/app/services/`).

## Estructura Clave
- `src/app/components/`: Componentes de UI (login, dashboard, polls, etc.)
- `src/app/services/`: Servicios para lógica de negocio y acceso a API (ej: `auth.service.ts`, `team.service.ts`)
- `src/app/models/`: Modelos TypeScript para tipado fuerte de datos
- `src/app/guards/`: Guards de rutas (ej: `auth.guard.ts`)
- `src/app/interceptors/`: Interceptores HTTP (ej: `auth.interceptor.ts`)
- `src/app/app.routes.ts`: Definición de rutas y protección con guards

## Flujos y Patrones Específicos
- **Autenticación**: Tokens JWT gestionados en localStorage, refresh automático vía interceptor.
- **Protección de rutas**: Usar `AuthGuard` en rutas sensibles.
- **Interceptores**: `AuthInterceptor` agrega tokens y maneja expiración/refresh.
- **Servicios**: Cada entidad principal (usuario, equipo, polls) tiene su propio servicio.
- **Integración backend**: URLs de API configuradas como propiedades privadas en cada servicio.
- **Carga de archivos**: Upload de logos de equipos vía `multipart/form-data`.

## Comandos de Desarrollo
- `npm install` — Instala dependencias
- `npm start` — Servidor de desarrollo en `http://localhost:4200`
- `npm run build` — Build de producción
- `npm test` — Ejecuta pruebas unitarias

## Convenciones y Consejos
- Mantener separación estricta entre lógica de UI (componentes) y lógica de negocio/API (servicios).
- Usar modelos TypeScript para tipado en toda la app.
- No modificar directamente el localStorage fuera de los servicios de autenticación.
- Para nuevas rutas, proteger con guards si requieren autenticación.
- Para nuevas integraciones, seguir el patrón de servicios existentes.

## Archivos de Referencia
- `README.md`: Documentación de flujos, endpoints y estructura.
- `src/app/services/auth.service.ts`, `team.service.ts`: Ejemplo de integración API y manejo de tokens.
- `src/app/guards/auth.guard.ts`, `src/app/interceptors/auth.interceptor.ts`: Seguridad y manejo de autenticación.

---

¿Falta algún flujo, convención o integración importante? Por favor, indícalo para mejorar estas instrucciones.