import { apiClient } from './apiClient';

export interface RegisterRequest {
  email: string;
  password: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
    isAdmin: boolean;
  };
  token: string;
  refreshToken?: string;
}

export interface VerifyEmailResponse {
  message: string;
  success: boolean;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface CompletePasswordResetRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
}

/**
 * Authentication service for user registration, login, and session management
 */
export const authService = {
  /**
   * Register a new user account
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Logout and invalidate current session
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * Verify email address with token
   */
  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const response = await apiClient.get<VerifyEmailResponse>(`/auth/verify-email/${token}`);
    return response.data;
  },

  /**
   * Request password reset email
   */
  requestPasswordReset: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Complete password reset with token
   */
  completePasswordReset: async (data: CompletePasswordResetRequest): Promise<void> => {
    await apiClient.post(`/auth/reset-password/${data.token}`, {
      newPassword: data.newPassword
    });
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', data);
    return response.data;
  },
};
