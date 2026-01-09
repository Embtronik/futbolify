export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  countryCode?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  provider: 'LOCAL' | 'GOOGLE';
  role?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
