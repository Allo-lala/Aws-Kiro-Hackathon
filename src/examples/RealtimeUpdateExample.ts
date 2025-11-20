import { RealtimeUpdaterService } from '../services/RealtimeUpdaterService';
import { RealtimeController } from '../api/RealtimeController';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationDisruption } from '../services/interfaces/IRealtimeUpdater';
import { Location } from '../models/Location';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';

/**
 * Example demonstrating the real-time update and disruption handling system
 * This shows how the system handles transportation disruptions and provides
 * eco-friendly alternatives in real-time.
 */
export class RealtimeUpdateExample {
  private service: RealtimeUpdaterService;
  private controller: RealtimeController;

  constructor() {
    this.service = new RealtimeUpdaterService();
    this.controller = new RealtimeController(this.service);
  }

  async demonstrateRealtimeUpdates(): Promise<void> {
    console.log('🌱 Eco-Friendly Route Planner - Real-time Update Demo\n');

    // Create sample routes
    const routes = this.createSampleRoutes();
    
    console.log('📍 Sample Routes Created:');
    routes.forEach((route, index) => {
      console.log(`  ${index + 1}. ${route.transportationModes[0].type} route (${route.totalDistance} miles, ${route.estimatedTime} min)`);
      console.log(`     Carbon footprint: ${route.carbonFootprint.totalEmissions.toFixed(2)} kg CO2`);
      console.log(`     Eco-score: ${route.ecoScore}/100\n`);
    });

    // Subscribe to real-time updates
    console.log('🔔 Subscribing to real-time updates...');
    const subscription = await this.controller.subscribeToUpdates({
      routes,
      userId: 'demo-user'
    });
    console.log(`✅ Subscribed with ID: ${subscription.subscriptionId}\n`);

    // Simulate a transportation disruption
    console.log('⚠️  Simulating transportation disruption...');
    const disruption: TransportationDisruption = {
      id: 'demo-disruption-001',
      type: 'service_interruption',
      affectedRoutes: [routes[1].id], // Affect the public transit route
      severity: 'high',
      startTime: new Date(),
      estimatedEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      description: 'Bus service suspended due to road construction on Main Street',
      alternativeOptions: ['walking', 'cycling', 'electric_vehicle']
    };

    const disruptionResponse = await this.controller.handleDisruption({
      disruption
    });

    console.log(`🚨 Disruption processed affecting ${disruptionResponse.affectedRoutes} routes`);
    console.log(`📝 ${disruptionResponse.message}\n`);

    // Show alternative routes provided
    if (disruptionResponse.updates.length > 0) {
      const update = disruptionResponse.updates[0];
      console.log('🔄 Alternative eco-friendly routes found:');
      
      if (update.alternativeRoutes && update.alternativeRoutes.length > 0) {
        update.alternativeRoutes.forEach((altRoute, index) => {
          console.log(`  ${index + 1}. ${altRoute.transportationModes[0].type}`);
          console.log(`     Distance: ${altRoute.totalDistance} miles`);
          console.log(`     Time: ${altRoute.estimatedTime} minutes`);
          console.log(`     Carbon footprint: ${altRoute.carbonFootprint.totalEmissions.toFixed(2)} kg CO2`);
          console.log(`     Eco-score: ${altRoute.ecoScore}/100\n`);
        });
      }
    }

    // Refresh route data to get real-time updates
    console.log('🔄 Refreshing route data with real-time information...');
    const refreshResponse = await this.controller.refreshRouteData({
      routeId: routes[0].id
    });

    console.log(`✅ Route refreshed: ${refreshResponse.message}`);
    if (refreshResponse.hasUpdates) {
      console.log(`⏱️  Updated estimated time: ${refreshResponse.route.estimatedTime} minutes\n`);
    }

    // Demonstrate unsubscribing
    console.log('🔕 Unsubscribing from updates...');
    const unsubscribeResponse = await this.controller.unsubscribe(subscription.subscriptionId);
    console.log(`✅ ${unsubscribeResponse.message}\n`);

    console.log('🎉 Real-time update demonstration completed!');
    console.log('💡 Key features demonstrated:');
    console.log('   • Real-time subscription management');
    console.log('   • Automatic disruption handling');
    console.log('   • Eco-friendly alternative calculation');
    console.log('   • Route data refresh with delays');
    console.log('   • User notification system');
  }

  private createSampleRoutes(): RouteAlternative[] {
    const origin: Location = {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Main St, New York, NY',
      city: 'New York',
      country: 'USA'
    };

    const destination: Location = {
      latitude: 40.7589,
      longitude: -73.9851,
      address: '456 Broadway, New York, NY',
      city: 'New York',
      country: 'USA'
    };

    // Walking route (zero emissions)
    const walkingRoute: RouteAlternative = {
      id: 'route-walking-001',
      origin,
      destination,
      transportationModes: [{
        type: 'walking',
        emissionFactor: 0,
        accessibilityFeatures: [
          { type: 'wheelchair_accessible', description: 'Sidewalk accessibility', supported: true }
        ],
        availability: 'available'
      }],
      segments: [{
        id: 'segment-walk-1',
        startLocation: origin,
        endLocation: destination,
        transportationMode: {
          type: 'walking',
          emissionFactor: 0,
          accessibilityFeatures: [],
          availability: 'available'
        },
        distance: 3.2,
        estimatedTime: 45,
        instructions: 'Walk north on Main St, then east on Broadway'
      }],
      totalDistance: 3.2,
      estimatedTime: 45,
      carbonFootprint: {
        totalEmissions: 0,
        emissionsBySegment: [{
          segmentId: 'segment-walk-1',
          distance: 3.2,
          transportationMode: 'walking',
          emissions: 0
        }],
        methodology: 'Zero emissions for walking',
        dataSources: ['EPA Guidelines'],
        calculationTimestamp: new Date()
      },
      ecoScore: 100,
      accessibilityCompliant: true,
      cost: 0
    };

    // Public transit route
    const transitRoute: RouteAlternative = {
      id: 'route-transit-001',
      origin,
      destination,
      transportationModes: [{
        type: 'public_transit',
        subtype: 'bus',
        emissionFactor: 0.2,
        accessibilityFeatures: [
          { type: 'wheelchair_accessible', description: 'ADA compliant buses', supported: true }
        ],
        availability: 'available'
      }],
      segments: [{
        id: 'segment-bus-1',
        startLocation: origin,
        endLocation: destination,
        transportationMode: {
          type: 'public_transit',
          subtype: 'bus',
          emissionFactor: 0.2,
          accessibilityFeatures: [],
          availability: 'available'
        },
        distance: 2.8,
        estimatedTime: 15,
        instructions: 'Take Bus #42 from Main St to Broadway'
      }],
      totalDistance: 2.8,
      estimatedTime: 15,
      carbonFootprint: {
        totalEmissions: 0.56,
        emissionsBySegment: [{
          segmentId: 'segment-bus-1',
          distance: 2.8,
          transportationMode: 'public_transit',
          emissions: 0.56
        }],
        methodology: 'EPA emission factors for public transit',
        dataSources: ['EPA eGRID'],
        calculationTimestamp: new Date()
      },
      ecoScore: 85,
      accessibilityCompliant: true,
      cost: 2.50
    };

    // Electric vehicle route
    const evRoute: RouteAlternative = {
      id: 'route-ev-001',
      origin,
      destination,
      transportationModes: [{
        type: 'electric_vehicle',
        emissionFactor: 0.1,
        accessibilityFeatures: [
          { type: 'wheelchair_accessible', description: 'Accessible vehicle available', supported: true }
        ],
        availability: 'available'
      }],
      segments: [{
        id: 'segment-ev-1',
        startLocation: origin,
        endLocation: destination,
        transportationMode: {
          type: 'electric_vehicle',
          emissionFactor: 0.1,
          accessibilityFeatures: [],
          availability: 'available'
        },
        distance: 2.5,
        estimatedTime: 8,
        instructions: 'Drive via FDR Drive to Broadway'
      }],
      totalDistance: 2.5,
      estimatedTime: 8,
      carbonFootprint: {
        totalEmissions: 0.25,
        emissionsBySegment: [{
          segmentId: 'segment-ev-1',
          distance: 2.5,
          transportationMode: 'electric_vehicle',
          emissions: 0.25
        }],
        methodology: 'EPA emission factors for electric vehicles',
        dataSources: ['EPA eGRID'],
        calculationTimestamp: new Date()
      },
      ecoScore: 90,
      accessibilityCompliant: true,
      cost: 5.00
    };

    return [walkingRoute, transitRoute, evRoute];
  }
}

// Example usage
if (require.main === module) {
  const example = new RealtimeUpdateExample();
  example.demonstrateRealtimeUpdates().catch(console.error);
}