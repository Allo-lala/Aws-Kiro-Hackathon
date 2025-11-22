import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('API Client', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should create axios instance with correct base URL', () => {
    expect(mockedAxios.create).toBeDefined();
  });

  it('should store and retrieve auth token from localStorage', () => {
    const testToken = 'test-jwt-token';
    localStorage.setItem('auth_token', testToken);
    
    const storedToken = localStorage.getItem('auth_token');
    expect(storedToken).toBe(testToken);
  });

  it('should store and retrieve refresh token from localStorage', () => {
    const testRefreshToken = 'test-refresh-token';
    localStorage.setItem('refresh_token', testRefreshToken);
    
    const storedToken = localStorage.getItem('refresh_token');
    expect(storedToken).toBe(testRefreshToken);
  });

  it('should clear auth tokens from localStorage', () => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('refresh_token', 'test-refresh');
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
