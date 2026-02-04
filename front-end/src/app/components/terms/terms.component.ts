import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TermsService } from '../../services/terms.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="terms-page">
      <div class="terms-card">
        <h2>Términos y Condiciones</h2>
        <div *ngIf="loading">Cargando...</div>
        <div *ngIf="!loading">
          <div class="terms-version">Versión: {{ termsVersion }}</div>
          <div class="terms-meta" *ngIf="publishedAt || active">
            <small *ngIf="publishedAt">Publicado: {{ publishedAt }}</small>
            <small *ngIf="active"> · Activo</small>
          </div>
          <div class="terms-required" *ngIf="requiredVersion" style="margin-top:8px;color:#a00;">
            Atención: Debes aceptar la versión {{ requiredVersion }} para continuar
          </div>
          <div class="terms-content" [innerHTML]="termsContent"></div>

          <div class="actions">
            <label>
              <input type="checkbox" [(ngModel)]="dataProcessingAccepted" /> Acepto el tratamiento de datos personales
            </label>
            <button class="btn btn-primary" (click)="accept()" [disabled]="accepting">Aceptar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TermsComponent implements OnInit {
  private termsService = inject(TermsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  termsVersion = '';
  termsContent = '';
  publishedAt: string | null = null;
  active = false;
  requiredVersion: string | null = null;
  loading = false;
  accepting = false;
  dataProcessingAccepted = true;

  ngOnInit(): void {
    this.loading = true;
    // read required version from query params (optional)
    try {
      const qv = this.route.snapshot.queryParams['requiredTermsVersion'];
      if (qv) this.requiredVersion = qv;
    } catch (e) { /* ignore */ }

    this.termsService.getActiveTerms().subscribe({
      next: (res) => {
        this.termsVersion = res.version || '';
        this.termsContent = res.content || '';
        this.publishedAt = (res as any).publishedAt || null;
        this.active = !!(res as any).active;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  accept(): void {
    if (!this.dataProcessingAccepted) return;
    this.accepting = true;
    this.termsService.acceptTerms(this.dataProcessingAccepted, this.termsVersion).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      },
      error: () => {
        this.accepting = false;
      }
    });
  }
}
