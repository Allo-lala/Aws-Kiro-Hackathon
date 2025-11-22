import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { UserEntity, UserPreferencesEntity, TripEntity } from '../models/entities';

export interface UserPreferencesInput {
  maxWalkingDistance?: number | null;
  preferredModes?: string[] | null;
  accessibilityNeeds?: Record<string, any> | null;
  sustainabilityPriority?: string | null;
  timeVsEnvironmentWeight?: number | null;
}

export interface TripInput {
  originLat: number;
  originLng: number;
  originName?: string | null;
  destinationLat: number;
  destinationLng: number;
  destinationName?: string | null;
  selectedRoute: Record<string, any>;
  actualTransportationMode: string;
  carbonSavings?: number | null;
  distance?: number | null;
  duration?: number | null;
  completedAt: Date;
}

export interface TripFilters {
  startDate?: Date;
  endDate?: Date;
  transportationMode?: string;
  limit?: number;
  offset?: number;
}

export interface UserStatistics {
  totalTrips: number;
  totalCarbonSavings: number;
  totalDistance: number;
  averageCarbonSavingsPerTrip: number;
  mostUsedTransportationMode: string | null;
}

export interface IUserService {
  getUserById(userId: string): Promise<UserEntity | null>;
  createUserPreferences(userId: string, preferences: UserPreferencesInput): Promise<UserPreferencesEntity>;
  getUserPreferences(userId: string): Promise<UserPreferencesEntity | null>;
  updateUserPreferences(userId: string, preferences: UserPreferencesInput): Promise<UserPreferencesEntity>;
  deleteUserPreferences(userId: string): Promise<void>;
  createTrip(userId: string, trip: TripInput): Promise<TripEntity>;
  getTripHistory(userId: string, filters?: TripFilters): Promise<TripEntity[]>;
  getTripById(tripId: string, userId: string): Promise<TripEntity | null>;
  deleteUserData(userId: string): Promise<void>;
  getUserStats(userId: string): Promise<UserStatistics>;
}

export class UserService implements IUserService {
  private userRepository: Repository<UserEntity>;
  private preferencesRepository: Repository<UserPreferencesEntity>;
  private tripRepository: Repository<TripEntity>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
    this.preferencesRepository = AppDataSource.getRepository(UserPreferencesEntity);
    this.tripRepository = AppDataSource.getRepository(TripEntity);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences', 'trips'],
    });
  }

  /**
   * Create user preferences
   * Requirements: 3.1
   */
  async createUserPreferences(userId: string, preferences: UserPreferencesInput): Promise<UserPreferencesEntity> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if preferences already exist
    const existing = await this.preferencesRepository.findOne({ where: { userId } });
    if (existing) {
      throw new Error('User preferences already exist. Use update instead.');
    }

    const userPreferences = this.preferencesRepository.create({
      userId,
      ...preferences,
    });

    return await this.preferencesRepository.save(userPreferences);
  }

  /**
   * Get user preferences with data isolation
   * Requirements: 3.4
   */
  async getUserPreferences(userId: string): Promise<UserPreferencesEntity | null> {
    return await this.preferencesRepository.findOne({
      where: { userId },
    });
  }

  /**
   * Update user preferences with immediate persistence
   * Requirements: 3.1
   */
  async updateUserPreferences(userId: string, preferences: UserPreferencesInput): Promise<UserPreferencesEntity> {
    let userPreferences = await this.preferencesRepository.findOne({ where: { userId } });

    if (!userPreferences) {
      // Create if doesn't exist
      return await this.createUserPreferences(userId, preferences);
    }

    // Update fields
    if (preferences.maxWalkingDistance !== undefined) {
      userPreferences.maxWalkingDistance = preferences.maxWalkingDistance;
    }
    if (preferences.preferredModes !== undefined) {
      userPreferences.preferredModes = preferences.preferredModes;
    }
    if (preferences.accessibilityNeeds !== undefined) {
      userPreferences.accessibilityNeeds = preferences.accessibilityNeeds;
    }
    if (preferences.sustainabilityPriority !== undefined) {
      userPreferences.sustainabilityPriority = preferences.sustainabilityPriority;
    }
    if (preferences.timeVsEnvironmentWeight !== undefined) {
      userPreferences.timeVsEnvironmentWeight = preferences.timeVsEnvironmentWeight;
    }

    return await this.preferencesRepository.save(userPreferences);
  }

  /**
   * Delete user preferences
   */
  async deleteUserPreferences(userId: string): Promise<void> {
    await this.preferencesRepository.delete({ userId });
  }

  /**
   * Create and store a trip with immediate persistence
   * Requirements: 3.2
   */
  async createTrip(userId: string, trip: TripInput): Promise<TripEntity> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const tripEntity = this.tripRepository.create({
      userId,
      ...trip,
    });

    return await this.tripRepository.save(tripEntity);
  }

  /**
   * Get trip history with data isolation
   * Requirements: 3.4
   */
  async getTripHistory(userId: string, filters?: TripFilters): Promise<TripEntity[]> {
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId })
      .orderBy('trip.completedAt', 'DESC');

    if (filters?.startDate) {
      queryBuilder.andWhere('trip.completedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('trip.completedAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.transportationMode) {
      queryBuilder.andWhere('trip.actualTransportationMode = :mode', { mode: filters.transportationMode });
    }

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get a specific trip by ID with data isolation
   * Requirements: 3.4
   */
  async getTripById(tripId: string, userId: string): Promise<TripEntity | null> {
    return await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });
  }

  /**
   * Delete all user data (preferences and trips)
   * Requirements: 3.5
   */
  async deleteUserData(userId: string): Promise<void> {
    // Delete preferences
    await this.preferencesRepository.delete({ userId });
    
    // Delete trips (cascade should handle this, but explicit is safer)
    await this.tripRepository.delete({ userId });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStatistics> {
    const trips = await this.tripRepository.find({ where: { userId } });

    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalCarbonSavings: 0,
        totalDistance: 0,
        averageCarbonSavingsPerTrip: 0,
        mostUsedTransportationMode: null,
      };
    }

    const totalCarbonSavings = trips.reduce((sum, trip) => sum + (trip.carbonSavings || 0), 0);
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);

    // Find most used transportation mode
    const modeCount: Record<string, number> = {};
    trips.forEach(trip => {
      modeCount[trip.actualTransportationMode] = (modeCount[trip.actualTransportationMode] || 0) + 1;
    });

    const mostUsedMode = Object.entries(modeCount).reduce((max, [mode, count]) => {
      return count > max.count ? { mode, count } : max;
    }, { mode: null as string | null, count: 0 }).mode;

    return {
      totalTrips: trips.length,
      totalCarbonSavings,
      totalDistance,
      averageCarbonSavingsPerTrip: totalCarbonSavings / trips.length,
      mostUsedTransportationMode: mostUsedMode,
    };
  }
}

// Export singleton instance
export const userService = new UserService();
