# 🔐 Configuración de API Keys

Este proyecto utiliza API keys de servicios externos que deben ser configuradas correctamente.

## Google Maps API Key

### Desarrollo Local

La API key está configurada en:
```
src/environments/environment.ts
```

**⚠️ IMPORTANTE:** La API key actual es solo para desarrollo. NO la uses en producción.

### Producción

1. Ve a [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Places API
   - Maps JavaScript API
4. Crea credenciales (API Key)
5. **Configura restricciones de seguridad:**
   - Restricciones de aplicación: Sitios web
   - Agrega tu dominio de producción (ej: `futbolify.com/*`)
   - Restricciones de API: Selecciona solo Places API y Maps JavaScript API

6. Actualiza la clave en:
   ```typescript
   // src/environments/environment.prod.ts
   export const environment = {
     ...
     googleMapsApiKey: 'TU_CLAVE_DE_PRODUCCION_AQUI'
   };
   ```

## Mejores Prácticas de Seguridad

### ✅ Lo que SÍ debes hacer:

1. **Restringir por dominio** (producción):
   - Limita la API key a tu dominio específico
   - Evita usar `*` o dominios amplios

2. **Restringir por API**:
   - Solo habilita las APIs que necesitas
   - En este caso: Places API y Maps JavaScript API

3. **Monitorear uso**:
   - Configura alertas de cuota en Google Cloud Console
   - Revisa el uso regularmente

4. **Rotar claves**:
   - Cambia las API keys periódicamente
   - Especialmente si sospechas que fueron expuestas

### ❌ Lo que NO debes hacer:

1. **NO** compartas las API keys en:
   - Repositorios públicos de Git
   - Capturas de pantalla
   - Documentación pública
   - Mensajes de chat/email

2. **NO** uses la misma clave para desarrollo y producción

3. **NO** dejes las claves sin restricciones

## Nota sobre Frontend

**⚠️ Limitación inherente**: Las API keys en aplicaciones frontend (Angular, React, Vue) **SIEMPRE** son visibles en el código del navegador, incluso si las colocas en archivos de entorno.

**Solución**: La seguridad real viene de:
- ✅ Restricciones por dominio en Google Cloud Console
- ✅ Restricciones por API
- ✅ Monitoreo de uso y alertas de cuota
- ✅ Backend proxy (opcional, para máxima seguridad)

## Alternativa: Backend Proxy (Opcional)

Para máxima seguridad, puedes crear un endpoint en tu backend:

```
Backend: GET /api/geocode?address=...
↓
Backend hace la llamada a Google Maps con API key secreta
↓
Backend retorna resultado al frontend
```

De esta forma, la API key nunca se expone al navegador.

## Variables de Entorno Actuales

```typescript
// environment.ts (desarrollo)
{
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  oauthUrl: 'http://localhost:8080/oauth2/authorization',
  googleMapsApiKey: 'AIzaSyD1b5MGfkcYRB20XdbsvrBdST5gA51pZpI' // ⚠️ Solo desarrollo
}

// environment.prod.ts (producción)
{
  production: true,
  apiUrl: 'https://your-api-url.com/api/v1',
  oauthUrl: 'https://your-api-url.com/oauth2/authorization',
  googleMapsApiKey: 'TU_CLAVE_DE_PRODUCCION_AQUI' // ⚠️ Actualizar antes de desplegar
}
```

## Checklist Antes de Desplegar a Producción

- [ ] Crear nueva API key de Google Maps para producción
- [ ] Configurar restricciones por dominio
- [ ] Configurar restricciones por API
- [ ] Actualizar `environment.prod.ts`
- [ ] Configurar alertas de cuota en Google Cloud Console
- [ ] Verificar que `.gitignore` excluye archivos sensibles
- [ ] Revisar que no hay API keys en el historial de Git

---

**Última actualización**: Diciembre 2025
