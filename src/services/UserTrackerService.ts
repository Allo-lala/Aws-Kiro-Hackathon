import { IUserTracker } from './interfaces/IUserTracker';
import { UserPreferences, TripRecord, SustainabilityMetrics, Milestone } from '../models/UserPreferences';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { AccessibilityRequirement } from '../models/common';
import { AccessibilityFilterService } from './AccessibilityFilterService';

export class UserTrackerService implements IUserTracker {
  private accessibilityService: AccessibilityFilterService;
  private userPreferencesStore: Map<string, UserPreferences>;
  private tripRecordsStore: Map<string, TripRecord[]>;
  private milestonesStore: Map<string, Milestone[]>;

  constructor() {
    this.accessibilityService = new AccessibilityFilterService();
    this.userPreferencesStore = new Map();
    this.tripRecordsStore = new Map();
    this.milestonesStore = new Map();
  }
  async recordTrip(
    userId: string, 
    route: RouteAlternative, 
    actualMode: TransportationMode
  ): Promise<TripRecord> {
    // Calculate actual carbon footprint based on the transportation mode used
    const actualCarbonFootprint = this.calculateActualEmissions(route, actualMode);
    
    // Calculate savings compared to conventional alternative (assuming car as baseline)
    const conventionalEmissions = this.calculateConventionalEmissions(route);
    const savedEmissions = Math.max(0, conventionalEmissions - actualCarbonFootprint);
    
    // Create trip record
    const tripRecord: TripRecord = {
      id: this.generateTripId(),
      userId,
      routeId: route.id,
      actualTransportationMode: actualMode,
      actualCarbonFootprint,
      savedEmissions,
      tripDate: new Date(),
      origin: route.origin,
      destination: route.destination
    };
    
    // Store trip record
    const userTrips = this.tripRecordsStore.get(userId) || [];
    userTrips.push(tripRecord);
    this.tripRecordsStore.set(userId, userTrips);
    
    // Check and update milestones
    await this.checkAndUpdateMilestones(userId);
    
    return tripRecord;
  }

  async calculateSavings(
    userId: string, 
    timeframe: { start: Date; end: Date }
  ): Promise<SustainabilityMetrics> {
    const userTrips = this.tripRecordsStore.get(userId) || [];
    
    // Filter trips within the specified timeframe
    const tripsInTimeframe = userTrips.filter(trip => 
      trip.tripDate >= timeframe.start && trip.tripDate <= timeframe.end
    );
    
    // Calculate cumulative metrics
    const totalSavedEmissions = tripsInTimeframe.reduce(
      (sum, trip) => sum + trip.savedEmissions, 
      0
    );
    
    const totalTrips = tripsInTimeframe.length;
    const averageSavingsPerTrip = totalTrips > 0 ? totalSavedEmissions / totalTrips : 0;
    
    // Get current milestones
    const milestones = this.milestonesStore.get(userId) || [];
    
    return {
      totalSavedEmissions,
      totalTrips,
      averageSavingsPerTrip,
      timeframe,
      milestones
    };
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const preferences = this.userPreferencesStore.get(userId);
    
    if (!preferences) {
      // Return default preferences for new users
      const defaultPreferences: UserPreferences = {
        userId,
        maxWalkingDistance: 1.0, // 1 mile
        preferredTransportationModes: [],
        accessibilityNeeds: [],
        sustainabilityPriority: 'medium',
        timeVsEnvironmentWeight: 0.7
      };
      
      this.userPreferencesStore.set(userId, defaultPreferences);
      return defaultPreferences;
    }
    
    return preferences;
  }

  async updateAccessibilityNeeds(
    userId: string, 
    needs: AccessibilityRequirement[]
  ): Promise<void> {
    const currentPreferences = await this.getUserPreferences(userId);
    
    // Use AccessibilityFilterService to validate and update preferences
    const updatedPreferences = this.accessibilityService.updateAccessibilityPreferences(
      currentPreferences,
      needs
    );
    
    this.userPreferencesStore.set(userId, updatedPreferences);
  }

  /**
   * Get trip history for a user within a timeframe
   * @param userId User identifier
   * @param timeframe Time period to filter trips
   * @returns Array of trip records
   */
  async getTripHistory(
    userId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<TripRecord[]> {
    const userTrips = this.tripRecordsStore.get(userId) || [];
    
    // Filter trips within the specified timeframe
    return userTrips.filter(trip => 
      trip.tripDate >= timeframe.start && trip.tripDate <= timeframe.end
    );
  }

  /**
   * Calculate actual emissions based on the transportation mode used
   */
  private calculateActualEmissions(route: RouteAlternative, actualMode: TransportationMode): number {
    // Use the emission factor from the transportation mode and route distance
    return route.totalDistance * actualMode.emissionFactor;
  }

  /**
   * Calculate conventional emissions (baseline for savings calculation)
   * Assumes conventional car as baseline with average emission factor
   */
  private calculateConventionalEmissions(route: RouteAlternative): number {
    const conventionalCarEmissionFactor = 0.404; // kg CO2 per mile (average car)
    return route.totalDistance * conventionalCarEmissionFactor;
  }

  /**
   * Generate unique trip ID
   */
  private generateTripId(): string {
    return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check and update milestones for a user
   */
  private async checkAndUpdateMilestones(userId: string): Promise<void> {
    const userTrips = this.tripRecordsStore.get(userId) || [];
    const currentMilestones = this.milestonesStore.get(userId) || this.initializeDefaultMilestones();
    
    // Calculate current totals
    const totalSavedEmissions = userTrips.reduce((sum, trip) => sum + trip.savedEmissions, 0);
    const totalTrips = userTrips.length;
    
    // Check emission savings milestones
    const emissionMilestones = currentMilestones.filter(m => m.type === 'emissions_saved');
    for (const milestone of emissionMilestones) {
      if (!milestone.achieved && totalSavedEmissions >= milestone.threshold) {
        milestone.achieved = true;
        milestone.achievedDate = new Date();
      }
    }
    
    // Check trip count milestones
    const tripMilestones = currentMilestones.filter(m => m.type === 'trips_completed');
    for (const milestone of tripMilestones) {
      if (!milestone.achieved && totalTrips >= milestone.threshold) {
        milestone.achieved = true;
        milestone.achievedDate = new Date();
      }
    }
    
    // Check streak milestones (consecutive eco-friendly trips)
    const streakMilestones = currentMilestones.filter(m => m.type === 'streak');
    const currentStreak = this.calculateCurrentStreak(userTrips);
    for (const milestone of streakMilestones) {
      if (!milestone.achieved && currentStreak >= milestone.threshold) {
        milestone.achieved = true;
        milestone.achievedDate = new Date();
      }
    }
    
    this.milestonesStore.set(userId, currentMilestones);
  }

  /**
   * Initialize default milestones for new users
   */
  private initializeDefaultMilestones(): Milestone[] {
    return [
      {
        id: 'emissions_1kg',
        type: 'emissions_saved',
        threshold: 1.0,
        achieved: false,
        description: 'Saved 1 kg of CO2 emissions'
      },
      {
        id: 'emissions_10kg',
        type: 'emissions_saved',
        threshold: 10.0,
        achieved: false,
        description: 'Saved 10 kg of CO2 emissions'
      },
      {
        id: 'emissions_50kg',
        type: 'emissions_saved',
        threshold: 50.0,
        achieved: false,
        description: 'Saved 50 kg of CO2 emissions'
      },
      {
        id: 'trips_5',
        type: 'trips_completed',
        threshold: 5,
        achieved: false,
        description: 'Completed 5 eco-friendly trips'
      },
      {
        id: 'trips_25',
        type: 'trips_completed',
        threshold: 25,
        achieved: false,
        description: 'Completed 25 eco-friendly trips'
      },
      {
        id: 'trips_100',
        type: 'trips_completed',
        threshold: 100,
        achieved: false,
        description: 'Completed 100 eco-friendly trips'
      },
      {
        id: 'streak_7',
        type: 'streak',
        threshold: 7,
        achieved: false,
        description: '7-day eco-friendly streak'
      },
      {
        id: 'streak_30',
        type: 'streak',
        threshold: 30,
        achieved: false,
        description: '30-day eco-friendly streak'
      }
    ];
  }

  /**
   * Calculate current streak of eco-friendly trips
   */
  private calculateCurrentStreak(trips: TripRecord[]): number {
    if (trips.length === 0) return 0;
    
    // Sort trips by date (most recent first)
    const sortedTrips = [...trips].sort((a, b) => b.tripDate.getTime() - a.tripDate.getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const trip of sortedTrips) {
      // Check if trip was eco-friendly (saved emissions > 0)
      if (trip.savedEmissions > 0) {
        // Check if trip is within consecutive days
        const daysDiff = Math.floor((currentDate.getTime() - trip.tripDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= streak + 1) {
          streak++;
          currentDate = trip.tripDate;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return streak;
  }
}