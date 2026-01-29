import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CountryService } from '../../services/country.service';
import { CountryCode } from '../../models/country.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private countryService = inject(CountryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  countryCodes: CountryCode[] = [];
  loadingCountries = true;

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      countryCode: ['+57', [Validators.required]], // Default Colombia
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Cargar códigos de país
    this.loadCountryCodes();
  }

  // Obtener returnUrl si viene en la querystring (para redirigir tras registro)
  private getReturnUrl(): string {
    try {
      return this.route.snapshot.queryParams['returnUrl'] || '';
    } catch (e) {
      return '';
    }
  }

  loadCountryCodes(): void {
    this.countryService.getCountryCodes().subscribe({
      next: (codes) => {
        this.countryCodes = codes;
        this.loadingCountries = false;
      },
      error: (error) => {
        console.error('Error loading country codes:', error);
        this.loadingCountries = false;
      }
    });
  }

  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get countryCode() {
    return this.registerForm.get('countryCode');
  }

  get phoneNumber() {
    return this.registerForm.get('phoneNumber');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  passwordValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return passwordValid ? null : { weakPassword: true };
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: () => {
        this.successMessage = 'Registro exitoso. Redirigiendo...';
        const returnUrl = this.getReturnUrl();
        setTimeout(() => {
          if (returnUrl) {
            // Navegar a la URL de retorno (ej: /dashboard/join-team?code=XXX)
            this.router.navigateByUrl(returnUrl, { replaceUrl: true });
          } else {
            this.router.navigate(['/auth/login']);
          }
        }, 1200);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error al registrarse';
        this.loading = false;
      }
    });
  }

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  hasError(field: string, error: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  hasFormError(error: string): boolean {
    return this.registerForm.hasError(error) && 
           this.registerForm.get('confirmPassword')?.touched || false;
  }
}
