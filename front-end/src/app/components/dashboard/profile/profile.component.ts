import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CountryService } from '../../../services/country.service';
import { User } from '../../../models/user.model';
import { CountryCode } from '../../../models/country.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div class="profile-content">
        <div class="profile-card">
          <div class="avatar-section">
            <div class="avatar-large">
              {{ user?.firstName?.charAt(0) }}{{ user?.lastName?.charAt(0) }}
            </div>
            <h2>{{ user?.firstName }} {{ user?.lastName }}</h2>
            <p class="email">{{ user?.email }}</p>
            <span class="badge" [class.badge-local]="user?.provider === 'LOCAL'" 
                  [class.badge-google]="user?.provider === 'GOOGLE'">
              {{ user?.provider }}
            </span>
          </div>

          <div class="info-section">
            <h3>Información de la Cuenta</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Nombre</label>
                <p>{{ user?.firstName || 'No especificado' }}</p>
              </div>
              <div class="info-item">
                <label>Apellido</label>
                <p>{{ user?.lastName || 'No especificado' }}</p>
              </div>
              <div class="info-item">
                <label>Email</label>
                <p>{{ user?.email }}</p>
              </div>
              <div class="info-item">
                <label>Teléfono</label>
                <p>{{ (user?.countryCode && user?.phoneNumber) ? (user?.countryCode + ' ' + user?.phoneNumber) : 'No especificado' }}</p>
              </div>
              <div class="info-item">
                <label>Estado del Email</label>
                <p [class.verified]="user?.emailVerified" [class.not-verified]="!user?.emailVerified">
                  {{ user?.emailVerified ? '✓ Verificado' : '✗ No verificado' }}</p>
              </div>
              <div class="info-item">
                <label>Método de Autenticación</label>
                <p>{{ user?.provider === 'GOOGLE' ? 'Google OAuth2' : 'Email y Contraseña' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="actions-card">
          <h3>Acciones de Cuenta</h3>
          <button class="btn btn-outline" (click)="openEditModal()">Editar Perfil</button>
          <button class="btn btn-outline" (click)="openPasswordModal()" 
                  [disabled]="user?.provider === 'GOOGLE'"
                  [title]="user?.provider === 'GOOGLE' ? 'No disponible para usuarios de Google' : 'Cambiar contraseña'">
            Cambiar Contraseña
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Editar Perfil -->
    <div class="modal-overlay" *ngIf="showEditModal" (click)="closeEditModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Editar Perfil</h2>
          <button class="close-btn" (click)="closeEditModal()">&times;</button>
        </div>
        
        <form [formGroup]="editForm" (ngSubmit)="onSubmitEdit()">
          <div class="modal-body">
            <!-- Usuarios locales pueden editar nombre y apellido -->
            <div class="form-group" *ngIf="user?.provider === 'LOCAL'">
              <label>Nombre</label>
              <input type="text" formControlName="firstName" placeholder="Ingresa tu nombre">
              <div class="error" *ngIf="editForm.get('firstName')?.invalid && editForm.get('firstName')?.touched">
                El nombre es requerido
              </div>
            </div>

            <div class="form-group" *ngIf="user?.provider === 'LOCAL'">
              <label>Apellido</label>
              <input type="text" formControlName="lastName" placeholder="Ingresa tu apellido">
              <div class="error" *ngIf="editForm.get('lastName')?.invalid && editForm.get('lastName')?.touched">
                El apellido es requerido
              </div>
            </div>

            <!-- Todos pueden editar teléfono -->
            <div class="form-group">
              <label>Código de País</label>
              <select formControlName="countryCode">
                <option value="">Selecciona un país</option>
                <option *ngFor="let country of countryCodes" [value]="country.code">
                  {{ country.code }} {{ country.country }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Número de Teléfono</label>
              <input type="tel" formControlName="phoneNumber" placeholder="3001234567">
              <div class="error" *ngIf="editForm.get('phoneNumber')?.invalid && editForm.get('phoneNumber')?.touched">
                Ingresa un número válido (7-15 dígitos)
              </div>
            </div>

            <div class="info-message" *ngIf="user?.provider === 'GOOGLE'">
              ℹ️ Los usuarios de Google solo pueden actualizar su información de teléfono
            </div>
            
            <div class="info-message" *ngIf="user?.provider === 'LOCAL'">
              ℹ️ El email no puede ser modificado porque ya ha sido verificado
            </div>

            <div class="success" *ngIf="editSuccess">{{ editSuccess }}</div>
            <div class="error" *ngIf="editError">{{ editError }}</div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeEditModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="editForm.invalid || editLoading">
              {{ editLoading ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Cambiar Contraseña -->
    <div class="modal-overlay" *ngIf="showPasswordModal" (click)="closePasswordModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Cambiar Contraseña</h2>
          <button class="close-btn" (click)="closePasswordModal()">&times;</button>
        </div>
        
        <form [formGroup]="passwordForm" (ngSubmit)="onSubmitPassword()">
          <div class="modal-body">
            <div class="form-group">
              <label>Contraseña Actual</label>
              <input type="password" formControlName="currentPassword" placeholder="Ingresa tu contraseña actual">
              <div class="error" *ngIf="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched">
                La contraseña actual es requerida
              </div>
            </div>

            <div class="form-group">
              <label>Nueva Contraseña</label>
              <input type="password" formControlName="newPassword" placeholder="Mínimo 8 caracteres">
              <div class="error" *ngIf="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched">
                <div *ngIf="passwordForm.get('newPassword')?.errors?.['required']">La nueva contraseña es requerida</div>
                <div *ngIf="passwordForm.get('newPassword')?.errors?.['minlength']">Mínimo 8 caracteres</div>
                <div *ngIf="passwordForm.get('newPassword')?.errors?.['pattern']">
                  Debe contener mayúsculas, minúsculas, números y caracteres especiales
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Confirmar Nueva Contraseña</label>
              <input type="password" formControlName="confirmPassword" placeholder="Confirma tu nueva contraseña">
              <div class="error" *ngIf="passwordForm.errors?.['passwordMismatch'] && passwordForm.get('confirmPassword')?.touched">
                Las contraseñas no coinciden
              </div>
            </div>

            <div class="success" *ngIf="passwordSuccess">{{ passwordSuccess }}</div>
            <div class="error" *ngIf="passwordError">{{ passwordError }}</div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closePasswordModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="passwordForm.invalid || passwordLoading">
              {{ passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0;
    }

    .profile-content {
      display: grid;
      gap: 24px;
    }

    .profile-card {
      background: white;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .avatar-section {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      padding: 48px;
      text-align: center;
      color: white;
    }

    .avatar-large {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 48px;
      font-weight: 700;
      border: 4px solid white;
    }

    .avatar-section h2 {
      font-size: 28px;
      margin: 0 0 8px 0;
    }

    .email {
      margin: 0 0 16px 0;
      opacity: 0.9;
    }

    .badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-local {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .badge-google {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .info-section {
      padding: 32px;
    }

    .info-section h3 {
      font-size: 20px;
      color: var(--dark-color);
      margin-bottom: 24px;
      font-weight: 600;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }

    .info-item label {
      display: block;
      font-size: 12px;
      color: var(--gray-color);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .info-item p {
      font-size: 16px;
      color: var(--dark-color);
      margin: 0;
    }

    .verified {
      color: var(--primary-color);
      font-weight: 600;
    }

    .not-verified {
      color: var(--warning-color);
      font-weight: 600;
    }

    .actions-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      border: 1px solid var(--border-color);
    }

    .actions-card h3 {
      font-size: 20px;
      color: var(--dark-color);
      margin-bottom: 24px;
      font-weight: 600;
    }

    .actions-card button {
      display: block;
      width: 100%;
      margin-bottom: 12px;
    }

    .actions-card button:last-child {
      margin-bottom: 0;
    }

    .btn-outline {
      background: transparent;
      border: 2px solid var(--border-color);
      color: var(--dark-color);
    }

    .btn-outline:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      border: none;
    }

    .btn-danger:hover {
      background: #dc2626;
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
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 24px;
      color: var(--dark-color);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 32px;
      color: var(--gray-color);
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: var(--dark-color);
    }

    .modal-body {
      padding: 24px;
    }

    .modal-footer {
      padding: 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--dark-color);
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .info-message {
      padding: 12px;
      background: #e0f2fe;
      border-left: 4px solid #0284c7;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #0c4a6e;
    }

    .success {
      padding: 12px;
      background: #dcfce7;
      border-left: 4px solid var(--primary-color);
      border-radius: 4px;
      margin-bottom: 16px;
      color: #166534;
    }

    .error {
      padding: 8px 12px;
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 14px;
      color: #991b1b;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private countryService = inject(CountryService);
  private fb = inject(FormBuilder);
  
  user: User | null = null;
  countryCodes: CountryCode[] = [];
  
  // Modal states
  showEditModal = false;
  showPasswordModal = false;
  
  // Forms
  editForm!: FormGroup;
  passwordForm!: FormGroup;
  
  // Loading and messages
  editLoading = false;
  editSuccess = '';
  editError = '';
  
  passwordLoading = false;
  passwordSuccess = '';
  passwordError = '';

  ngOnInit(): void {
    // Suscribirse al usuario actual
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.initializeForms();
    });
    
    // Cargar códigos de país
    this.countryService.getCountryCodes().subscribe(codes => {
      this.countryCodes = codes;
    });
  }

  initializeForms(): void {
    // Formulario de edición - campos dinámicos según el provider
    const editFormConfig: any = {
      countryCode: [this.user?.countryCode || ''],
      phoneNumber: [this.user?.phoneNumber || '', [
        Validators.pattern(/^[0-9]{7,15}$/)
      ]]
    };

    // Solo usuarios locales pueden editar nombre y apellido
    if (this.user?.provider === 'LOCAL') {
      editFormConfig.firstName = [this.user?.firstName || '', Validators.required];
      editFormConfig.lastName = [this.user?.lastName || '', Validators.required];
    }

    this.editForm = this.fb.group(editFormConfig);

    // Formulario de cambio de contraseña (solo para usuarios locales)
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  openEditModal(): void {
    this.showEditModal = true;
    this.editSuccess = '';
    this.editError = '';
    this.initializeForms();
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  openPasswordModal(): void {
    if (this.user?.provider === 'GOOGLE') return;
    this.showPasswordModal = true;
    this.passwordSuccess = '';
    this.passwordError = '';
    this.passwordForm.reset();
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  onSubmitEdit(): void {
    if (this.editForm.invalid) return;

    this.editLoading = true;
    this.editSuccess = '';
    this.editError = '';

    const updateData = this.editForm.value;

    this.authService.updateUser(updateData).subscribe({
      next: (updatedUser) => {
        this.editLoading = false;
        this.editSuccess = '✓ Perfil actualizado correctamente';
        setTimeout(() => {
          this.closeEditModal();
        }, 1500);
      },
      error: (error) => {
        this.editLoading = false;
        this.editError = error.error?.message || 'Error al actualizar el perfil';
      }
    });
  }

  onSubmitPassword(): void {
    if (this.passwordForm.invalid) return;

    this.passwordLoading = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (response) => {
        this.passwordLoading = false;
        this.passwordSuccess = '✓ Contraseña actualizada correctamente';
        setTimeout(() => {
          this.closePasswordModal();
        }, 1500);
      },
      error: (error) => {
        this.passwordLoading = false;
        this.passwordError = error.error?.message || 'Error al cambiar la contraseña';
      }
    });
  }
}
