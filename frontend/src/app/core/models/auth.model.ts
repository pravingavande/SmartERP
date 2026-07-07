export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: number;
  userName: string;
  displayName: string;
  roleCode: string;
}

export interface AuthUser {
  userId: number;
  userName: string;
  displayName: string;
  roleCode: string;
  token: string;
  expiresAt: string;
}
