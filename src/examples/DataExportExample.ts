import { DataExportController } from '../api/DataExportController';
import { UserTrackerService } from '../services/UserTrackerService';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { Location } from '../models/Location';

/**
 * Example demonstrating the data export and reporting functionality
 */
export class DataExportExample {
  private controller: DataExportController;
  private userTracker: UserTrackerService;

  constructor() {
    this.controller = new DataExportController();
    this.userTracker = new UserTrackerService();
  }

  /**
   * Demonstrate the complete data export workflow
   */
  async demonstrateDataExport(): Promise<void> {
    console.log('🌱 Rutty Data Export & Reporting Demo\n');

    // Create sample user and trip data
    const userId = 'demo-user-123';
    await this.createSampleTripData(userId);

    // Define timeframe for reports
    const startDate = '2024-01-01T00:00:00.000Z';
    const endDate = '2024-01-31T23:59:59.999Z';

    console.log('📊 Generating Reports...\n');

    // 1. Generate templated reports
    await this.demonstrateTemplatedReports(userId, startDate, endDate);

    // 2. Generate structured data exports
    await this.demonstrateDataExports(userId, startDate, endDate);

    // 3. Show available templates
    await this.demonstrateTemplateOptions();

    // 4. Generate environmental trends
    await this.demonstrateEnvironmentalTrends(userId, startDate, endDate);

    console.log('✅ Data export demonstration complete!');
  }

  private async createSampleTripData(userId: string): Promise<void> {
    console.log('🚲 Creating sample trip data...');

    // Create sample locations
    const homeLocation: Location = {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Green St, San Francisco, CA',
      city: 'San Francisco',
      country: 'USA'
    };

    const workLocation: Location = {
      latitude: 37.7849,
      longitude: -122.4094,
      address: '456 Eco Ave, San Francisco, CA',
      city: 'San Francisco',
      country: 'USA'
    };

    // Create transportation modes
    const walkingMode: TransportationMode = {
      type: 'walking',
      emissionFactor: 0,
      accessibilityFeatures: [],
      availability: { available: true }
    };

    const cyclingMode: TransportationMode = {
      type: 'cycling',
      emissionFactor: 0,
      accessibilityFeatures: [],
      availability: { available: true }
    };

    const publicTransitMode: TransportationMode = {
      type: 'public_transit',
      subtype: 'bus',
      emissionFactor: 0.12,
      accessibilityFeatures: [],
      availability: { available: true }
    };

    // Create sample routes
    const routes: RouteAlternative[] = [
      {
        id: 'route-walking-1',
        origin: homeLocation,
        destination: workLocation,
        transportationModes: [walkingMode],
        segments: [],
        totalDistance: 2.5,
        estimatedTime: 30,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: 'Zero emissions for walking',
          dataSources: ['EPA Guidelines'],
          calculationTimestamp: new Date()
        },
        ecoScore: 100,
        accessibilityCompliant: true
      },
      {
        id: 'route-cycling-1',
        origin: homeLocation,
        destination: workLocation,
        transportationModes: [cyclingMode],
        segments: [],
        totalDistance: 2.8,
        estimatedTime: 12,
        carbonFootprint: {
          totalEmissions: 0,
          emissionsBySegment: [],
          methodology: 'Zero emissions for cycling',
          dataSources: ['EPA Guidelines'],
          calculationTimestamp: new Date()
        },
        ecoScore: 95,
        accessibilityCompliant: false
      },
      {
        id: 'route-transit-1',
        origin: homeLocation,
        destination: workLocation,
        transportationModes: [publicTransitMode],
        segments: [],
        totalDistance: 3.2,
        estimatedTime: 18,
        carbonFootprint: {
          totalEmissions: 0.384, // 3.2 miles * 0.12 kg CO2/mile
          emissionsBySegment: [],
          methodology: 'Public transit emissions calculation',
          dataSources: ['EPA eGRID'],
          calculationTimestamp: new Date()
        },
        ecoScore: 85,
        accessibilityCompliant: true
      }
    ];

    // Record some sample trips
    for (let i = 0; i < 5; i++) {
      const route = routes[i % routes.length];
      const mode = route.transportationModes[0];
      await this.userTracker.recordTrip(userId, route, mode);
      
      // Add some delay to create different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('✅ Sample trip data created\n');
  }

  private async demonstrateTemplatedReports(userId: string, startDate: string, endDate: string): Promise<void> {
    console.log('📝 Generating Templated Reports...\n');

    // Generate summary report
    const summaryReport = await this.controller.generateTemplatedReport(userId, startDate, endDate, 'summary');
    console.log('📋 Summary Report:');
    console.log('─'.repeat(50));
    console.log(summaryReport.content.substring(0, 300) + '...\n');

    // Generate detailed report
    const detailedReport = await this.controller.generateTemplatedReport(userId, startDate, endDate, 'detailed');
    console.log('📊 Detailed Report Preview:');
    console.log('─'.repeat(50));
    console.log(detailedReport.content.substring(0, 400) + '...\n');

    // Generate milestones report
    const milestonesReport = await this.controller.generateTemplatedReport(userId, startDate, endDate, 'milestones');
    console.log('🏆 Milestones Report Preview:');
    console.log('─'.repeat(50));
    console.log(milestonesReport.content.substring(0, 300) + '...\n');
  }

  private async demonstrateDataExports(userId: string, startDate: string, endDate: string): Promise<void> {
    console.log('💾 Generating Data Exports...\n');

    // Generate JSON sustainability report
    const jsonReport = await this.controller.generateSustainabilityReport(
      userId, startDate, endDate, 'json', { includeMilestones: true, includeDetailedBreakdown: true }
    );
    console.log('📄 JSON Report Generated:');
    console.log(`   Filename: ${jsonReport.filename}`);
    console.log(`   Content Type: ${jsonReport.contentType}`);
    console.log(`   Size: ${(jsonReport.data as string).length} characters\n`);

    // Generate CSV sustainability report
    const csvReport = await this.controller.generateSustainabilityReport(
      userId, startDate, endDate, 'csv', { includeMilestones: true }
    );
    console.log('📊 CSV Report Generated:');
    console.log(`   Filename: ${csvReport.filename}`);
    console.log(`   Content Type: ${csvReport.contentType}`);
    console.log(`   Preview: ${(csvReport.data as string).split('\n').slice(0, 3).join('\n')}\n`);

    // Generate PDF sustainability report
    const pdfReport = await this.controller.generateSustainabilityReport(
      userId, startDate, endDate, 'pdf', { includeMilestones: true, includeDetailedBreakdown: true }
    );
    console.log('📑 PDF Report Generated:');
    console.log(`   Filename: ${pdfReport.filename}`);
    console.log(`   Content Type: ${pdfReport.contentType}`);
    console.log(`   Size: ${(pdfReport.data as Buffer).length} bytes\n`);

    // Export trip data
    const tripDataJson = await this.controller.exportTripData(userId, startDate, endDate, 'json');
    console.log('🚗 Trip Data Export (JSON):');
    console.log(`   Filename: ${tripDataJson.filename}`);
    console.log(`   Records: ${JSON.parse(tripDataJson.data).length} trips\n`);
  }

  private async demonstrateTemplateOptions(): Promise<void> {
    console.log('📋 Available Report Templates:\n');

    const templates = await this.controller.getAvailableTemplates();
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   Key: ${template.key}`);
      console.log(`   Description: ${template.description}\n`);
    });
  }

  private async demonstrateEnvironmentalTrends(userId: string, startDate: string, endDate: string): Promise<void> {
    console.log('📈 Environmental Trends Analysis:\n');

    const trends = await this.controller.getEnvironmentalTrends(userId, startDate, endDate);
    
    console.log(`User: ${trends.userId}`);
    console.log(`Analysis Period: ${trends.timeframe.start} to ${trends.timeframe.end}`);
    console.log(`Trend Data Points: ${trends.trends.length}\n`);

    if (trends.trends.length > 0) {
      console.log('Monthly Breakdown:');
      trends.trends.forEach(trend => {
        console.log(`  ${trend.period}:`);
        console.log(`    CO₂ Saved: ${trend.totalEmissionsSaved.toFixed(2)} kg`);
        console.log(`    Trips: ${trend.tripCount}`);
        console.log(`    Primary Mode: ${trend.mostUsedTransportMode}`);
      });
    } else {
      console.log('No trend data available for the specified period.');
    }
    console.log();
  }
}

// Example usage
if (require.main === module) {
  const example = new DataExportExample();
  example.demonstrateDataExport().catch(console.error);
}