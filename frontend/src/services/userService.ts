import { apiClient } from './apiClient';
import { UserPreferences, Trip } from '../types/models';

export interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  preferences?: UserPreferences;
}

export interface UpdateProfileRequest {
  email?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface UserStatistics {
  totalTrips: number;
  totalCarbonSavings: number;
  totalDistance: number;
  averageEcoScore: number;
  mostUsedMode: string;
}

export interface TripFilters {
  startDate?: Date;
  endDate?: Date;
  transportationMode?: string;
  page?: number;
  pageSize?: number;
}

export interface TripsResponse {
  trips: Trip[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * User service for managing user profile, preferences, and trip history
 */
export const userService = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me');
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.put<UserProfile>('/users/me', data);
    return response.data;
  },

  /**
   * Get user preferences
   */
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get<UserPreferences>('/users/me/preferences');
    return response.data;
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
    const response = await apiClient.put<UserPreferences>('/users/me/preferences', preferences);
    return response.data;
  },

  /**
   * Get trip history with optional filters
   */
  getTrips: async (filters?: TripFilters): Promise<TripsResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.startDate) {
      params.append('startDate', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate.toISOString());
    }
    if (filters?.transportationMode) {
      params.append('transportationMode', filters.transportationMode);
    }
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    if (filters?.pageSize) {
      params.append('pageSize', filters.pageSize.toString());
    }

    const response = await apiClient.get<TripsResponse>(`/users/me/trips?${params.toString()}`);
    return response.data;
  },

  /**
   * Get user statistics
   */
  getStatistics: async (): Promise<UserStatistics> => {
    const response = await apiClient.get<UserStatistics>('/users/me/statistics');
    return response.data;
  },

  /**
   * Request account deletion
   */
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/users/me');
  },
};
