import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsLoaderService {
  private scriptLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Carga el script de Google Maps API de forma dinámica
   * Solo carga el script una vez, llamadas subsecuentes retornan la misma promesa
   */
  load(): Promise<void> {
    // Si ya está cargado, resolver inmediatamente
    if (this.scriptLoaded) {
      return Promise.resolve();
    }

    // Si ya está en proceso de carga, retornar la misma promesa
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Cargar el script
    this.loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = async () => {
        const maps = (window as any).google?.maps;
        if (!maps) {
          const error = new Error('Google Maps script loaded, but window.google.maps is not available. Check API key restrictions and enabled APIs.');
          console.error('❌ Google Maps API cargó, pero google.maps no está disponible', error);
          reject(error);
          return;
        }

        // Ensure Places is actually ready before resolving.
        // We have seen a race on first open where script.onload fires but google.maps.places is still undefined.
        try {
          if (!maps.places && typeof maps.importLibrary === 'function') {
            await maps.importLibrary('places');
          }

          // Small retry loop as a last resort (covers cases where Places is still initializing)
          const maxWaitMs = 2000;
          const start = Date.now();
          while (!maps.places && Date.now() - start < maxWaitMs) {
            await new Promise((r) => setTimeout(r, 50));
          }
        } catch (e) {
          console.warn('⚠️ No se pudo asegurar Places via importLibrary()', e);
        }

        this.scriptLoaded = true;
        console.log('✅ Google Maps API cargada exitosamente');

        if (!maps.places) {
          console.warn(
            '⚠️ Google Maps cargó, pero la librería Places no está disponible (google.maps.places undefined). ' +
              'Revisa que Places API esté habilitada y que el API key permita el referrer (localhost/futbolify.local/IP).'
          );
        }

        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ Error al cargar Google Maps API:', error);
        reject(error);
      };

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Verifica si Google Maps API está disponible
   */
  isLoaded(): boolean {
    return this.scriptLoaded && typeof (window as any).google !== 'undefined' && !!(window as any).google.maps;
  }
}
