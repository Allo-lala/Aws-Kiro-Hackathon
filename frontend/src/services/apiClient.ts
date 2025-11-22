import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getErrorMessage } from '../utils/errorMessages';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add JWT token to request headers
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Request logging for debugging
        if (DEBUG_MODE) {
          console.log('[API Request]', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            data: config.data,
            params: config.params,
          });
        }

        return config;
      },
      (error) => {
        if (DEBUG_MODE) {
          console.error('[API Request Error]', error);
        }
        return Promise.reject(error);
      }
    );
  }

  private setupResponseInterceptor() {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Response logging for debugging
        if (DEBUG_MODE) {
          console.log('[API Response]', {
            status: response.status,
            url: response.config.url,
            data: response.data,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log error for debugging
        if (DEBUG_MODE) {
          console.error('[API Response Error]', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
            data: error.response?.data,
          });
        }

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Attempt to refresh the token
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken
            });

            const { token: newToken } = response.data;
            
            // Store new token
            localStorage.setItem('auth_token', newToken);
            
            // Update the failed request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            // Process queued requests
            processQueue(null, newToken);
            
            isRefreshing = false;

            // Retry the original request
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear auth and redirect to login
            processQueue(refreshError as Error, null);
            isRefreshing = false;
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            
            // Only redirect if not already on login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
          }
        }

        // Get user-friendly error message
        const userMessage = getErrorMessage(error);
        
        // Log error with user-friendly message
        if (DEBUG_MODE) {
          console.error('[API Error]', userMessage);
        }

        // Attach user-friendly message to error for UI display
        (error as any).userMessage = userMessage;

        return Promise.reject(error);
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  // Helper method to clear authentication
  public clearAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  // Helper method to set authentication
  public setAuth(token: string, refreshToken?: string): void {
    localStorage.setItem('auth_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  }
}

export const apiClient = new ApiClient().getClient();
