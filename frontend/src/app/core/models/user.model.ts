export type Role = 'USER' | 'ADMIN';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  fullName: string;
}
