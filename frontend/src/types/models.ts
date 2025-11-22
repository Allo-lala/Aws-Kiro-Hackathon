// Type definitions for frontend application
// These mirror the backend models but are frontend-specific

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface TransportationMode {
  type: string;
  subtype?: string;
  provider?: string;
  emissionFactor?: number;
  accessibilityFeatures?: any[];
  availability?: any;
  [key: string]: any; // Allow additional properties
}

export interface CarbonFootprint {
  totalEmissions: number;
  emissionsPerMile?: number;
  comparisonToBaseline?: number;
  breakdown?: {
    transportation: number;
    infrastructure: number;
    other: number;
  };
  emissionsBySegment?: any[];
  methodology?: string;
  dataSources?: any[];
  [key: string]: any; // Allow additional properties
}

export interface RouteAlternative {
  id: string;
  origin: Location;
  destination: Location;
  transportationModes: TransportationMode[];
  distance?: number;
  duration?: number;
  carbonFootprint: CarbonFootprint;
  cost?: number;
  accessibilityCompliant?: boolean;
  ecoScore?: number;
  steps?: any[];
  totalDistance?: number;
  totalDuration?: number;
  [key: string]: any; // Allow additional properties
}

export interface UserPreferences {
  maxWalkingDistance: number;
  preferredTransportationModes: TransportationMode[];
  accessibilityNeeds: string[];
  sustainabilityPriority: 'low' | 'medium' | 'high';
  timeVsEnvironmentWeight: number;
  userId?: string;
  [key: string]: any; // Allow additional properties
}

export interface SustainabilityMetrics {
  totalTrips: number;
  totalSavedEmissions: number;
  totalDistance?: number;
  averageEcoScore?: number;
  milestones: Array<{
    id?: string;
    type: string;
    threshold: number;
    achieved: boolean;
    description: string;
    [key: string]: any;
  }>;
  [key: string]: any; // Allow additional properties
}

// Admin-specific types
export interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  apiCallsToday: number;
  apiQuotaRemaining: number;
  errorRate: number;
  averageResponseTime: number;
  databaseConnections: number;
  cacheHitRate: number;
  timestamp: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
}

export interface UserDetails extends AdminUser {
  trips: Trip[];
  preferences?: UserPreferences;
}

export interface Trip {
  id: string;
  userId: string;
  origin: Location;
  destination: Location;
  selectedRoute: RouteAlternative;
  actualTransportationMode: string;
  carbonSavings: number;
  distance: number;
  duration: number;
  completedAt: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string | null;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
