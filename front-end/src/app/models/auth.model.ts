import { User } from './user.model';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  phoneNumber: string;
  acceptTerms?: boolean;
  dataProcessingAccepted?: boolean;
  termsVersion?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}
