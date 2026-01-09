import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Country, CountryCode } from '../models/country.model';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private readonly API_URL = 'https://restcountries.com/v3.1';
  private http = inject(HttpClient);

  /**
   * Obtener todos los países con códigos telefónicos
   */
  getCountryCodes(): Observable<CountryCode[]> {
    return this.http.get<Country[]>(`${this.API_URL}/all?fields=name,idd,flags,cca2`)
      .pipe(
        map(countries => {
          const countryCodes: CountryCode[] = [];
          
          countries.forEach(country => {
            if (country.idd?.root) {
              const root = country.idd.root;
              
              // Si hay sufijos, crear una entrada por cada sufijo
              if (country.idd.suffixes && country.idd.suffixes.length > 0) {
                country.idd.suffixes.forEach(suffix => {
                  countryCodes.push({
                    code: `${root}${suffix}`,
                    country: country.name.common,
                    flag: country.flags.svg || country.flags.png,
                    iso2: country.cca2
                  });
                });
              } else {
                // Si no hay sufijos, solo usar el root
                countryCodes.push({
                  code: root,
                  country: country.name.common,
                  flag: country.flags.svg || country.flags.png,
                  iso2: country.cca2
                });
              }
            }
          });

          // Ordenar por código
          return countryCodes.sort((a, b) => {
            const numA = parseInt(a.code.replace('+', ''));
            const numB = parseInt(b.code.replace('+', ''));
            return numA - numB;
          });
        }),
        catchError(error => {
          console.error('Error loading country codes:', error);
          // Fallback con códigos comunes
          return of(this.getFallbackCountryCodes());
        })
      );
  }

  /**
   * Códigos de país de respaldo en caso de fallo de la API
   */
  private getFallbackCountryCodes(): CountryCode[] {
    return [
      { code: '+1', country: 'United States', flag: '', iso2: 'US' },
      { code: '+1', country: 'Canada', flag: '', iso2: 'CA' },
      { code: '+52', country: 'Mexico', flag: '', iso2: 'MX' },
      { code: '+54', country: 'Argentina', flag: '', iso2: 'AR' },
      { code: '+55', country: 'Brazil', flag: '', iso2: 'BR' },
      { code: '+56', country: 'Chile', flag: '', iso2: 'CL' },
      { code: '+57', country: 'Colombia', flag: '', iso2: 'CO' },
      { code: '+58', country: 'Venezuela', flag: '', iso2: 'VE' },
      { code: '+591', country: 'Bolivia', flag: '', iso2: 'BO' },
      { code: '+593', country: 'Ecuador', flag: '', iso2: 'EC' },
      { code: '+595', country: 'Paraguay', flag: '', iso2: 'PY' },
      { code: '+598', country: 'Uruguay', flag: '', iso2: 'UY' },
      { code: '+34', country: 'Spain', flag: '', iso2: 'ES' },
      { code: '+44', country: 'United Kingdom', flag: '', iso2: 'GB' },
    ];
  }
}
