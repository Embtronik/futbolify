import { Component, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';
import { Team } from '../../../models/football.model';

declare var google: any;

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="teams-container">
      <div class="page-header">
        <h1>Gestión de Grupos de Fútbol</h1>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <span>➕</span> Crear Grupo de Fútbol
        </button>
      </div>

      <!-- Lista de grupos -->
      <div *ngIf="teams.length > 0" class="teams-grid">
        <div *ngFor="let team of teams" class="team-card">
          <div class="team-logo">
            <img *ngIf="team.logoUrl" [src]="team.logoUrl" [alt]="team.name">
            <span *ngIf="!team.logoUrl" class="default-logo">⚽</span>
          </div>
          <div class="team-info">
            <h3>{{ team.name }}</h3>
            <div class="team-code">
              <span class="code-label">Código:</span>
              <span class="code-value">{{ team.joinCode }}</span>
              <button class="copy-btn" (click)="copyCode(team.joinCode)" title="Copiar código">
                📋
              </button>
            </div>
            <p class="team-players">👥 {{ team.memberCount || 0 }} miembros</p>
          </div>
          <div class="team-actions">
            <button class="btn-icon" (click)="viewTeam(team)" title="Ver detalles">👁️</button>
            <button class="btn-icon" (click)="openEditModal(team)" title="Editar">✏️</button>
            <button class="btn-icon danger" (click)="confirmDelete(team)" title="Eliminar">🗑️</button>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div *ngIf="teams.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">👥</div>
        <h2>No tienes grupos de fútbol registrados</h2>
        <p>Crea tu primer grupo para gestionar jugadores y partidos</p>
        <button class="btn btn-primary" (click)="openCreateModal()">
          Crear mi primer grupo
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando grupos...</p>
      </div>

      <!-- Modal para ver detalles -->
      <div class="modal-overlay" *ngIf="showViewModal" (click)="closeViewModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Detalles del Grupo</h2>
            <button class="close-btn" (click)="closeViewModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="team-details" *ngIf="selectedTeam">
              <div class="detail-logo">
                <img *ngIf="selectedTeam.logoUrl" [src]="selectedTeam.logoUrl" [alt]="selectedTeam.name">
                <span *ngIf="!selectedTeam.logoUrl" class="default-logo-big">⚽</span>
              </div>
              <h3>{{ selectedTeam.name }}</h3>
              <div class="detail-row">
                <span class="label">Código de Invitación:</span>
                <div class="code-display-inline">
                  <span class="code">{{ selectedTeam.joinCode }}</span>
                  <button class="btn btn-sm" (click)="copyCode(selectedTeam.joinCode)">📋 Copiar</button>
                </div>
              </div>
              <div class="detail-row" *ngIf="selectedTeam.description">
                <span class="label">Descripción:</span>
                <p>{{ selectedTeam.description }}</p>
              </div>
              <div class="detail-row">
                <span class="label">Miembros:</span>
                <span>{{ selectedTeam.memberCount || 0 }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedTeam.pendingRequestsCount">
                <span class="label">Solicitudes Pendientes:</span>
                <span class="badge-warning">{{ selectedTeam.pendingRequestsCount }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="closeViewModal()">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- Modal para editar grupo -->
      <div class="modal-overlay" *ngIf="showEditModal" (click)="closeEditModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Editar Grupo de Fútbol</h2>
            <button class="close-btn" (click)="closeEditModal()">✕</button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="updateTeam()">
            <div class="form-group">
              <label for="edit-name">Nombre del Grupo *</label>
              <input 
                type="text" 
                id="edit-name" 
                formControlName="name"
                placeholder="Ej: Los Cracks FC"
                class="form-control"
              >
              <span class="error" *ngIf="editForm.get('name')?.touched && editForm.get('name')?.hasError('required')">
                El nombre es obligatorio
              </span>
            </div>

            <div class="form-group">
              <label for="edit-description">Descripción (opcional)</label>
              <textarea 
                id="edit-description" 
                formControlName="description"
                placeholder="Describe tu grupo de fútbol..."
                class="form-control"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="edit-address">📍 Ubicación (opcional)</label>
              <input 
                type="text" 
                id="edit-address" 
                formControlName="address"
                placeholder="Ingresa la dirección del grupo..."
                class="form-control"
                #editAddressInput
              >
              <small class="form-hint">Selecciona una sugerencia de Google o escribe tu dirección manualmente</small>
            </div>

            <div class="form-group">
              <label for="edit-logo">Logo del Grupo (opcional)</label>
              <div class="file-upload">
                <input 
                  type="file" 
                  id="edit-logo" 
                  accept="image/*"
                  (change)="onFileSelected($event)"
                  #editFileInput
                >
                <button type="button" class="btn btn-outline" (click)="editFileInput.click()">
                  📁 Cambiar Logo
                </button>
                <span *ngIf="selectedFileName" class="file-name">{{ selectedFileName }}</span>
              </div>
              <div *ngIf="logoPreview" class="logo-preview">
                <img [src]="logoPreview" alt="Preview">
              </div>
              <div *ngIf="!logoPreview && selectedTeam?.logoUrl" class="logo-preview">
                <img [src]="selectedTeam!.logoUrl" alt="Logo actual">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeEditModal()">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                [disabled]="editForm.invalid || updating"
              >
                {{ updating ? 'Actualizando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal para crear grupo -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Crear Nuevo Grupo de Fútbol</h2>
            <button class="close-btn" (click)="closeCreateModal()">✕</button>
          </div>

          <form [formGroup]="createForm" (ngSubmit)="createTeam()">
            <div class="form-group">
              <label for="name">Nombre del Grupo *</label>
              <input 
                type="text" 
                id="name" 
                formControlName="name"
                placeholder="Ej: Los Cracks FC"
                class="form-control"
              >
              <span class="error" *ngIf="createForm.get('name')?.touched && createForm.get('name')?.hasError('required')">
                El nombre es obligatorio
              </span>
            </div>

            <div class="form-group">
              <label for="description">Descripción (opcional)</label>
              <textarea 
                id="description" 
                formControlName="description"
                placeholder="Describe tu grupo de fútbol..."
                class="form-control"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="address">📍 Ubicación (opcional)</label>
              <input 
                type="text" 
                id="address" 
                formControlName="address"
                placeholder="Ingresa la dirección del grupo..."
                class="form-control"
                #addressInput
              >
              <small class="form-hint">Selecciona una sugerencia de Google o escribe tu dirección manualmente</small>
            </div>

            <div class="form-group">
              <label for="logo">Logo del Grupo (opcional)</label>
              <div class="file-upload">
                <input 
                  type="file" 
                  id="logo" 
                  accept="image/*"
                  (change)="onFileSelected($event)"
                  #fileInput
                >
                <button type="button" class="btn btn-outline" (click)="fileInput.click()">
                  📁 Seleccionar Logo
                </button>
                <span *ngIf="selectedFileName" class="file-name">{{ selectedFileName }}</span>
              </div>
              <div *ngIf="logoPreview" class="logo-preview">
                <img [src]="logoPreview" alt="Preview">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeCreateModal()">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                [disabled]="createForm.invalid || creating"
              >
                {{ creating ? 'Creando...' : 'Crear Grupo' }}
              </button>
            </div>
          </form>

          <!-- Mostrar código después de crear -->
          <div *ngIf="createdTeam" class="success-message">
            <div class="success-icon">✅</div>
            <h3>¡Grupo creado exitosamente!</h3>
            <p>Comparte este código con los jugadores para que se unan:</p>
            <div class="code-display">
              <span class="code">{{ createdTeam.joinCode }}</span>
              <button class="btn btn-primary" (click)="copyCode(createdTeam.joinCode)">
                📋 Copiar Código
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .teams-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .team-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border-color);
      display: flex;
      gap: 16px;
      align-items: start;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .team-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .team-logo {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-logo {
      font-size: 40px;
    }

    .team-info {
      flex: 1;
    }

    .team-info h3 {
      font-size: 20px;
      color: var(--dark-color);
      margin: 0 0 8px 0;
      font-weight: 600;
    }

    .team-code {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .code-label {
      font-size: 12px;
      color: var(--gray-color);
      text-transform: uppercase;
      font-weight: 600;
    }

    .code-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--primary-color);
      font-family: 'Courier New', monospace;
      background: rgba(34, 197, 94, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .copy-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      transition: transform 0.2s;
    }

    .copy-btn:hover {
      transform: scale(1.2);
    }

    .team-players {
      font-size: 14px;
      color: var(--gray-color);
      margin: 0;
    }

    .team-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--border-color);
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: var(--light-color);
      border-color: var(--primary-color);
    }

    .btn-icon.danger:hover {
      background: #fee;
      border-color: #f44;
      color: #f44;
    }

    .empty-state {
      background: white;
      border-radius: 16px;
      padding: 80px 40px;
      text-align: center;
      border: 2px dashed var(--border-color);
    }

    .empty-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }

    .empty-state h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 16px;
      color: var(--gray-color);
      margin-bottom: 32px;
    }

    .loading-state {
      text-align: center;
      padding: 60px;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin: 0;
      font-weight: 700;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: var(--gray-color);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--light-color);
      color: var(--dark-color);
    }

    .modal-body {
      padding: 24px;
    }

    form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--dark-color);
      margin-bottom: 8px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      font-size: 15px;
      transition: border-color 0.2s;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-hint {
      display: block;
      font-size: 12px;
      color: var(--gray-color);
      margin-top: 6px;
      font-style: italic;
    }

    .error {
      display: block;
      color: #ef4444;
      font-size: 13px;
      margin-top: 6px;
    }

    .file-upload {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-upload input[type="file"] {
      display: none;
    }

    .file-name {
      font-size: 14px;
      color: var(--gray-color);
    }

    .logo-preview {
      margin-top: 16px;
      width: 120px;
      height: 120px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid var(--border-color);
    }

    .logo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 0 24px 24px 24px;
    }

    .success-message {
      padding: 24px;
      text-align: center;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(249, 115, 22, 0.05));
      margin: 24px;
      border-radius: 12px;
      border: 2px solid var(--primary-color);
    }

    .success-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .success-message h3 {
      color: var(--dark-color);
      margin: 0 0 12px 0;
      font-size: 22px;
    }

    .success-message p {
      color: var(--gray-color);
      margin: 0 0 20px 0;
    }

    .code-display {
      background: white;
      padding: 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .code-display .code {
      font-size: 32px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      color: var(--primary-color);
    }

    .team-details {
      padding: 0;
    }

    .detail-logo {
      width: 100px;
      height: 100px;
      margin: 0 auto 16px;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .detail-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-logo-big {
      font-size: 50px;
    }

    .team-details h3 {
      text-align: center;
      font-size: 22px;
      margin-bottom: 16px;
      color: var(--dark-color);
      font-weight: 600;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
      gap: 12px;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-weight: 600;
      color: var(--gray-color);
      font-size: 14px;
      flex-shrink: 0;
    }

    .detail-row p {
      margin: 0;
      color: var(--dark-color);
      text-align: right;
      font-size: 14px;
    }

    .code-display-inline {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .code-display-inline .code {
      font-size: 16px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      color: var(--primary-color);
      background: rgba(34, 197, 94, 0.1);
      padding: 4px 10px;
      border-radius: 6px;
    }

    .btn-sm {
      padding: 6px 10px;
      font-size: 13px;
      white-space: nowrap;
    }

    .badge-warning {
      background: #f59e0b;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .teams-grid {
        grid-template-columns: 1fr;
      }

      .team-card {
        flex-direction: column;
        text-align: center;
      }

      .team-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class TeamsComponent implements AfterViewInit {
  private teamService = inject(TeamService);
  private fb = inject(FormBuilder);
  private googleMapsLoader = inject(GoogleMapsLoaderService);

  @ViewChild('addressInput') addressInput!: ElementRef;
  @ViewChild('editAddressInput') editAddressInput!: ElementRef;

  teams: Team[] = [];
  loading = false;
  showCreateModal = false;
  showEditModal = false;
  showViewModal = false;
  creating = false;
  updating = false;
  createdTeam: Team | null = null;
  selectedTeam: Team | null = null;
  selectedFileName = '';
  logoPreview = '';
  selectedFile: File | null = null;
  
  // Google Places Autocomplete
  autocomplete: any;
  editAutocomplete: any;
  selectedPlace: { address: string; lat: number; lng: number; placeId: string } | null = null;

  createForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    address: [''],
    logo: ['']
  });

  editForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    address: [''],
    logo: ['']
  });

  ngOnInit(): void {
    this.loadTeamsUnified();
  }

  ngAfterViewInit(): void {
    // Inicializar cuando se abran los modales
  }

  initAutocomplete(inputElement: ElementRef, isEdit: boolean = false): void {
    console.log('🗺️ Iniciando autocomplete...', { isEdit, inputElement: inputElement?.nativeElement });
    
    // Cargar Google Maps API si no está cargada
    this.googleMapsLoader.load().then(async () => {
      if (!this.googleMapsLoader.isLoaded()) {
        console.error('Google Maps API no está disponible después de cargar');
        return;
      }

      if (!inputElement || !inputElement.nativeElement) {
        console.error('Input element no está disponible');
        return;
      }

      console.log('Google Maps API cargada correctamente');

      // Asegurar que Places esté disponible (Autocomplete depende de Places)
      const maps = (window as any).google?.maps;
      if (maps?.importLibrary) {
        try {
          await maps.importLibrary('places');
        } catch (e) {
          console.warn('No se pudo cargar la librería Places via importLibrary', e);
        }
      }

      if (!maps?.places?.Autocomplete) {
        console.error(
          'Google Places Autocomplete no está disponible. ' +
            'Causas típicas: Places API no habilitada en Google Cloud o restricciones del API key (HTTP referrers) ' +
            'para este dominio (localhost/futbolify.com.co/IP).'
        );
        return;
      }

      const autocomplete = new google.maps.places.Autocomplete(inputElement.nativeElement, {
        types: ['address'],
        fields: ['formatted_address', 'geometry', 'place_id']
      });

      console.log('Autocomplete creado exitosamente');

      // Escuchar cuando el usuario selecciona una sugerencia de Google
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('📍 Lugar seleccionado:', place);
        
        if (!place.geometry) {
          console.warn('⚠️ No se encontró información de ubicación para este lugar');
          // Permitir que el usuario use el texto ingresado manualmente
          const manualAddress = inputElement.nativeElement.value;
          if (manualAddress) {
            this.selectedPlace = {
              address: manualAddress,
              lat: 0,
              lng: 0,
              placeId: ''
            };
            console.log('✏️ Usando dirección manual:', this.selectedPlace);
          }
          return;
        }

        this.selectedPlace = {
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id
        };

        console.log('✅ Ubicación guardada:', this.selectedPlace);

        if (isEdit) {
          this.editForm.patchValue({ address: place.formatted_address });
        } else {
          this.createForm.patchValue({ address: place.formatted_address });
        }
      });

      // Escuchar cuando el usuario escribe manualmente (sin seleccionar sugerencia)
      inputElement.nativeElement.addEventListener('blur', () => {
        const manualAddress = inputElement.nativeElement.value;
        if (manualAddress && (!this.selectedPlace || this.selectedPlace.address !== manualAddress)) {
          this.selectedPlace = {
            address: manualAddress,
            lat: 0,
            lng: 0,
            placeId: ''
          };
          console.log('✏️ Dirección manual guardada:', this.selectedPlace);
        }
      });

      if (isEdit) {
        this.editAutocomplete = autocomplete;
      } else {
        this.autocomplete = autocomplete;
      }
    }).catch(error => {
      console.error('❌ Error al cargar Google Maps API:', error);
    });
  }

  loadTeamsUnified(): void {
    this.loading = true;
    import('rxjs').then(rxjs => {
      rxjs.forkJoin({
        owned: this.teamService.getAll(),
        memberships: this.teamService.getMyMemberships()
      }).subscribe({
        next: ({ owned, memberships }) => {
          // Deduplicar equipos por id
          const safeOwned = (owned || []).filter((t: any): t is Team => !!t && typeof t.id === 'number');
          const ownedIds = new Set<number>(safeOwned.map(t => t.id));
          const memberTeams = (memberships || [])
            .filter((m) => m.status === 'APPROVED')
            .map((m) => ({
              id: m.teamId,
              name: m.teamName || '',
              joinCode: m.joinCode || '',
              logoUrl: undefined,
              description: '',
              ownerUserId: 0,
              memberCount: 0,
              pendingRequestsCount: 0,
              address: '',
              latitude: undefined,
              longitude: undefined,
              placeId: '',
              createdAt: '',
              updatedAt: ''
            }));
          // Unir y deduplicar
          const allTeams: Team[] = [...safeOwned, ...memberTeams].reduce((acc, curr) => {
            if (!acc.some(t => t.id === curr.id)) acc.push(curr as Team);
            return acc;
          }, [] as Team[]);
          // Consultar miembros reales para cada equipo
          const memberRequests = allTeams.map(team =>
            this.teamService.getMembers(team.id).pipe(
              rxjs.catchError(() => rxjs.of([]))
            )
          );
          rxjs.forkJoin(memberRequests).subscribe({
            next: (membersArr) => {
              allTeams.forEach((team, idx) => {
                team.memberCount = (membersArr[idx] || []).filter((m: any) => m.status === 'APPROVED').length;
              });
              this.teams = allTeams;
              this.loading = false;
            },
            error: (err) => {
              console.error('Error cargando miembros:', err);
              this.teams = allTeams;
              this.loading = false;
            }
          });
        },
        error: (err) => {
          console.error('Error cargando equipos:', err);
          this.teams = [];
          this.loading = false;
        }
      });
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.createdTeam = null;
    this.createForm.reset();
    this.selectedFile = null;
    this.selectedFileName = '';
    this.logoPreview = '';
    this.selectedPlace = null;
    
    console.log('🚀 Abriendo modal de crear, esperando DOM...');
    
    // Inicializar autocomplete después de que el DOM esté listo
    setTimeout(() => {
      console.log('⏰ Timeout ejecutado, verificando addressInput:', this.addressInput);
      if (this.addressInput) {
        this.initAutocomplete(this.addressInput, false);
      } else {
        console.error('❌ addressInput no está disponible después del timeout');
      }
    }, 300);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm.reset();
    this.createdTeam = null;
    this.selectedFile = null;
    this.selectedFileName = '';
    this.logoPreview = '';
    this.selectedPlace = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
        this.createForm.patchValue({ logo: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  createTeam(): void {
    if (this.createForm.invalid) return;

    this.creating = true;
    
    // Construir el payload base que usa tanto JSON como multipart
    const teamData: any = {
      name: this.createForm.value.name,
      description: this.createForm.value.description || ''
    };

    if (this.selectedPlace) {
      teamData.address = this.selectedPlace.address;
      teamData.latitude = this.selectedPlace.lat;
      teamData.longitude = this.selectedPlace.lng;
      teamData.placeId = this.selectedPlace.placeId;
    }

    // Si NO hay logo, enviamos JSON puro
    if (!this.selectedFile) {
      this.teamService.createJson(teamData).subscribe({
        next: (team) => {
          this.createdTeam = team;
          this.teams.unshift(team);
          this.creating = false;
          
          setTimeout(() => {
            if (this.createdTeam?.joinCode === team.joinCode) {
              this.closeCreateModal();
            }
          }, 5000);
        },
        error: (error) => {
          console.error('Error creating team (JSON):', error);
          alert('Error al crear el grupo. Por favor intenta de nuevo.');
          this.creating = false;
        }
      });
      return;
    }

    // Si hay logo, usamos multipart/form-data
    const formData = new FormData();
    formData.append('team', new Blob([JSON.stringify(teamData)], { type: 'application/json' }));
    formData.append('logo', this.selectedFile);

    this.teamService.create(formData).subscribe({
      next: (team) => {
        this.createdTeam = team;
        this.teams.unshift(team);
        this.creating = false;
        
        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => {
          if (this.createdTeam?.joinCode === team.joinCode) {
            this.closeCreateModal();
          }
        }, 5000);
      },
      error: (error) => {
        console.error('Error creating team:', error);
        alert('Error al crear el grupo. Por favor intenta de nuevo.');
        this.creating = false;
      }
    });
  }

  copyCode(code: string): void {
    try {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
      const joinUrl = `${origin}/dashboard/join-team?code=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(joinUrl).then(() => {
        alert('¡Enlace de invitación copiado! Pégalo para compartir.');
      }).catch(() => {
        // Fallback: copiar solo el código
        navigator.clipboard.writeText(code).then(() => {
          alert('¡Código copiado al portapapeles!');
        }).catch(() => {
          alert('No se pudo copiar al portapapeles. Copia manualmente: ' + joinUrl);
        });
      });
    } catch (e) {
      alert('Error al copiar el enlace. Copia manualmente el código: ' + code);
    }
  }

  viewTeam(team: Team): void {
    this.selectedTeam = team;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedTeam = null;
  }

  openEditModal(team: Team): void {
    this.selectedTeam = team;
    this.editForm.patchValue({
      name: team.name,
      description: team.description || '',
      address: team.address || ''
    });
    this.logoPreview = '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.showEditModal = true;
    this.selectedPlace = team.address && team.latitude && team.longitude ? {
      address: team.address,
      lat: team.latitude,
      lng: team.longitude,
      placeId: team.placeId || ''
    } : null;
    
    // Inicializar autocomplete después de que el DOM esté listo
    setTimeout(() => {
      if (this.editAddressInput) {
        this.initAutocomplete(this.editAddressInput, true);
      }
    }, 100);
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedTeam = null;
    this.editForm.reset();
    this.selectedFile = null;
    this.selectedFileName = '';
    this.logoPreview = '';
    this.selectedPlace = null;
  }

  updateTeam(): void {
    if (this.editForm.invalid || !this.selectedTeam) return;

    this.updating = true;
    
    const formData = new FormData();
    
    // Parte 1: JSON del equipo (como Blob)
    const teamData: any = {
      name: this.editForm.value.name,
      description: this.editForm.value.description || ''
    };
    
    // Agregar ubicación si fue seleccionada
    if (this.selectedPlace) {
      teamData.address = this.selectedPlace.address;
      teamData.latitude = this.selectedPlace.lat;
      teamData.longitude = this.selectedPlace.lng;
      teamData.placeId = this.selectedPlace.placeId;
    }
    
    formData.append('team', new Blob([JSON.stringify(teamData)], { type: 'application/json' }));
    
    // Parte 2: Logo (si existe)
    if (this.selectedFile) {
      formData.append('logo', this.selectedFile);
    }

    this.teamService.update(this.selectedTeam.id, formData).subscribe({
      next: (updatedTeam) => {
        const index = this.teams.findIndex(t => t.id === updatedTeam.id);
        if (index !== -1) {
          this.teams[index] = updatedTeam;
        }
        this.updating = false;
        this.closeEditModal();
        alert('¡Grupo actualizado exitosamente!');
      },
      error: (error) => {
        console.error('Error updating team:', error);
        alert('Error al actualizar el grupo. Por favor intenta de nuevo.');
        this.updating = false;
      }
    });
  }

  confirmDelete(team: Team): void {
    if (confirm(`¿Estás seguro de que deseas eliminar el grupo "${team.name}"? Esta acción no se puede deshacer.`)) {
      this.deleteTeam(team.id);
    }
  }

  deleteTeam(teamId: number): void {
    this.teamService.delete(teamId).subscribe({
      next: () => {
        this.teams = this.teams.filter(t => t.id !== teamId);
        alert('¡Grupo eliminado exitosamente!');
      },
      error: (error) => {
        console.error('Error deleting team:', error);
        alert('Error al eliminar el grupo. Por favor intenta de nuevo.');
      }
    });
  }
}
