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

      script.onload = () => {
        this.scriptLoaded = true;
        console.log('✅ Google Maps API cargada exitosamente');
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
