import { apiClient } from './apiClient';
import { SystemMetrics, AdminUser, UserDetails, AuditLog, PaginatedResponse } from '../types/models';

export const adminService = {
  // Get system metrics
  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const response = await apiClient.get('/admin/metrics');
    // Backend might wrap response in a data object
    return response.data.data || response.data;
  },

  // List all users with pagination and filters
  listUsers: async (
    page: number = 1,
    pageSize: number = 20,
    filters?: { search?: string; isActive?: boolean }
  ): Promise<PaginatedResponse<AdminUser>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive.toString() })
    });
    const response = await apiClient.get(`/admin/users?${params}`);
    // Backend might wrap response in a data object
    return response.data.data || response.data;
  },

  // Get user details
  getUserDetails: async (userId: string): Promise<UserDetails> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    // Backend might wrap response in a data object
    return response.data.data || response.data;
  },

  // Disable user account
  disableUser: async (userId: string, reason: string): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/disable`, { reason });
  },

  // Enable user account
  enableUser: async (userId: string): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/enable`);
  },

  // Reset user password
  resetPassword: async (userId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/reset-password`);
  },

  // Get audit logs
  getAuditLogs: async (
    page: number = 1,
    pageSize: number = 50,
    filters?: { action?: string; adminId?: string; startDate?: Date; endDate?: Date }
  ): Promise<PaginatedResponse<AuditLog>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.adminId && { adminId: filters.adminId }),
      ...(filters?.startDate && { startDate: filters.startDate.toISOString() }),
      ...(filters?.endDate && { endDate: filters.endDate.toISOString() })
    });
    const response = await apiClient.get(`/admin/audit-logs?${params}`);
    // Backend might wrap response in a data object
    return response.data.data || response.data;
  }
};
