import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActiveTerms {
  version: string;
  content: string;
  publishedAt?: string; // backend provides publishedAt (ISO string)
  active?: boolean;
}

export interface TermsStatus {
  accepted: boolean;
  acceptedAt?: string | null;
  // backend fields: requiredTermsVersion, acceptedTermsVersion
  requiredTermsVersion?: string | null;
  acceptedTermsVersion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TermsService {
  private readonly API = environment.apiUrl;
  private http = inject(HttpClient);

  getActiveTerms(): Observable<ActiveTerms> {
    return this.http.get<ActiveTerms>(`${this.API}/v1/terms/active`);
  }

  getMyStatus(): Observable<TermsStatus> {
    return this.http.get<TermsStatus>(`${this.API}/v1/terms/me/status`);
  }

  acceptTerms(dataProcessingAccepted: boolean, termsVersion: string): Observable<any> {
    return this.http.post(`${this.API}/v1/terms/me/accept`, { dataProcessingAccepted, termsVersion });
  }
}
