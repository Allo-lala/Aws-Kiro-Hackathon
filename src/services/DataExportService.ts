import { IDataExportService, ExportOptions, ReportData, EnvironmentalTrend } from './interfaces/IDataExportService';
import { IUserTracker } from './interfaces/IUserTracker';
import { SustainabilityMetrics, TripRecord } from '../models/UserPreferences';
import { ReportTemplateManager } from './templates/ReportTemplates';
import { jsPDF } from 'jspdf';
import * as csvWriter from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';

export class DataExportService implements IDataExportService {
  private userTracker: IUserTracker;
  private templateManager: ReportTemplateManager;

  constructor(userTracker: IUserTracker) {
    this.userTracker = userTracker;
    this.templateManager = new ReportTemplateManager();
  }

  async generateReport(
    userId: string,
    timeframe: { start: Date; end: Date },
    options: ExportOptions
  ): Promise<string | Buffer> {
    // Gather all necessary data
    const sustainabilityMetrics = await this.userTracker.calculateSavings(userId, timeframe);
    const tripHistory = await this.getTripHistory(userId, timeframe);
    const environmentalTrends = await this.generateTrends(userId, timeframe);

    const reportData: ReportData = {
      userId,
      generatedAt: new Date(),
      sustainabilityMetrics,
      tripHistory,
      environmentalTrends
    };

    switch (options.format) {
      case 'json':
        return this.generateJSONReport(reportData, options);
      case 'csv':
        return this.generateCSVReport(reportData, options);
      case 'pdf':
        return this.generatePDFReport(reportData, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  async exportTripData(
    userId: string,
    timeframe: { start: Date; end: Date },
    format: 'json' | 'csv'
  ): Promise<string> {
    const tripHistory = await this.getTripHistory(userId, timeframe);

    if (format === 'json') {
      return JSON.stringify(tripHistory, null, 2);
    } else if (format === 'csv') {
      return this.convertTripsToCSV(tripHistory);
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  async generateTrends(
    userId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<EnvironmentalTrend[]> {
    const tripHistory = await this.getTripHistory(userId, timeframe);
    
    // Group trips by month for trend analysis
    const monthlyData = new Map<string, TripRecord[]>();
    
    tripHistory.forEach(trip => {
      const monthKey = `${trip.tripDate.getFullYear()}-${String(trip.tripDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)!.push(trip);
    });

    // Generate trends for each month
    const trends: EnvironmentalTrend[] = [];
    
    for (const [period, trips] of monthlyData.entries()) {
      const totalEmissionsSaved = trips.reduce((sum, trip) => sum + trip.savedEmissions, 0);
      const tripCount = trips.length;
      const averageEmissionsPerTrip = tripCount > 0 ? totalEmissionsSaved / tripCount : 0;
      
      // Find most used transportation mode
      const modeCount = new Map<string, number>();
      trips.forEach(trip => {
        const mode = trip.actualTransportationMode.type;
        modeCount.set(mode, (modeCount.get(mode) || 0) + 1);
      });
      
      const mostUsedTransportMode = Array.from(modeCount.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

      trends.push({
        period,
        totalEmissionsSaved,
        tripCount,
        averageEmissionsPerTrip,
        mostUsedTransportMode
      });
    }

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Generate a templated report
   * @param userId User identifier
   * @param timeframe Time period for the report
   * @param templateKey Template to use ('summary', 'detailed', 'milestones')
   * @returns Generated report content
   */
  async generateTemplatedReport(
    userId: string,
    timeframe: { start: Date; end: Date },
    templateKey: string = 'summary'
  ): Promise<string> {
    const sustainabilityMetrics = await this.userTracker.calculateSavings(userId, timeframe);
    const tripHistory = await this.getTripHistory(userId, timeframe);
    const environmentalTrends = await this.generateTrends(userId, timeframe);

    const reportData: ReportData = {
      userId,
      generatedAt: new Date(),
      sustainabilityMetrics,
      tripHistory,
      environmentalTrends
    };

    return this.templateManager.generateReport(templateKey, reportData);
  }

  /**
   * Get available report templates
   * @returns List of available templates
   */
  getAvailableTemplates(): Array<{ key: string; name: string; description: string }> {
    return this.templateManager.getAvailableTemplates();
  }

  private async getTripHistory(
    userId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<TripRecord[]> {
    return await this.userTracker.getTripHistory(userId, timeframe);
  }

  private generateJSONReport(reportData: ReportData, options: ExportOptions): string {
    const report = {
      metadata: {
        userId: reportData.userId,
        generatedAt: reportData.generatedAt.toISOString(),
        timeframe: {
          start: reportData.sustainabilityMetrics.timeframe.start.toISOString(),
          end: reportData.sustainabilityMetrics.timeframe.end.toISOString()
        }
      },
      summary: {
        totalSavedEmissions: reportData.sustainabilityMetrics.totalSavedEmissions,
        totalTrips: reportData.sustainabilityMetrics.totalTrips,
        averageSavingsPerTrip: reportData.sustainabilityMetrics.averageSavingsPerTrip
      },
      ...(options.includeMilestones && {
        milestones: reportData.sustainabilityMetrics.milestones
      }),
      ...(options.includeDetailedBreakdown && {
        tripHistory: reportData.tripHistory,
        environmentalTrends: reportData.environmentalTrends
      })
    };

    return JSON.stringify(report, null, 2);
  }

  private async generateCSVReport(reportData: ReportData, options: ExportOptions): Promise<string> {
    const csvData = [];
    
    // Add summary row
    csvData.push({
      type: 'Summary',
      period: `${reportData.sustainabilityMetrics.timeframe.start.toISOString().split('T')[0]} to ${reportData.sustainabilityMetrics.timeframe.end.toISOString().split('T')[0]}`,
      totalEmissionsSaved: reportData.sustainabilityMetrics.totalSavedEmissions,
      totalTrips: reportData.sustainabilityMetrics.totalTrips,
      averageSavingsPerTrip: reportData.sustainabilityMetrics.averageSavingsPerTrip,
      description: 'Overall sustainability metrics'
    });

    // Add trend data if requested
    if (options.includeDetailedBreakdown) {
      reportData.environmentalTrends.forEach(trend => {
        csvData.push({
          type: 'Trend',
          period: trend.period,
          totalEmissionsSaved: trend.totalEmissionsSaved,
          totalTrips: trend.tripCount,
          averageSavingsPerTrip: trend.averageEmissionsPerTrip,
          description: `Most used mode: ${trend.mostUsedTransportMode}`
        });
      });
    }

    // Add milestone data if requested
    if (options.includeMilestones) {
      reportData.sustainabilityMetrics.milestones
        .filter(milestone => milestone.achieved)
        .forEach(milestone => {
          csvData.push({
            type: 'Milestone',
            period: milestone.achievedDate?.toISOString().split('T')[0] || '',
            totalEmissionsSaved: milestone.type === 'emissions_saved' ? milestone.threshold : 0,
            totalTrips: milestone.type === 'trips_completed' ? milestone.threshold : 0,
            averageSavingsPerTrip: 0,
            description: milestone.description
          });
        });
    }

    return this.convertToCSVString(csvData);
  }

  private generatePDFReport(reportData: ReportData, options: ExportOptions): Buffer {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Sustainability Report', 20, yPosition);
    yPosition += 20;

    // Metadata
    doc.setFontSize(12);
    doc.text(`User ID: ${reportData.userId}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Generated: ${reportData.generatedAt.toLocaleDateString()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Period: ${reportData.sustainabilityMetrics.timeframe.start.toLocaleDateString()} - ${reportData.sustainabilityMetrics.timeframe.end.toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;

    // Summary section
    doc.setFontSize(16);
    doc.text('Summary', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.text(`Total CO2 Saved: ${reportData.sustainabilityMetrics.totalSavedEmissions.toFixed(2)} kg`, 20, yPosition);
    yPosition += 10;
    doc.text(`Total Eco-Friendly Trips: ${reportData.sustainabilityMetrics.totalTrips}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Average Savings per Trip: ${reportData.sustainabilityMetrics.averageSavingsPerTrip.toFixed(2)} kg CO2`, 20, yPosition);
    yPosition += 20;

    // Milestones section
    if (options.includeMilestones && reportData.sustainabilityMetrics.milestones.length > 0) {
      doc.setFontSize(16);
      doc.text('Achievements', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(12);
      const achievedMilestones = reportData.sustainabilityMetrics.milestones.filter(m => m.achieved);
      achievedMilestones.forEach(milestone => {
        if (yPosition > 250) { // Start new page if needed
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`✓ ${milestone.description}`, 25, yPosition);
        if (milestone.achievedDate) {
          doc.text(`   Achieved: ${milestone.achievedDate.toLocaleDateString()}`, 25, yPosition + 8);
          yPosition += 16;
        } else {
          yPosition += 10;
        }
      });
      yPosition += 10;
    }

    // Environmental trends section
    if (options.includeDetailedBreakdown && reportData.environmentalTrends.length > 0) {
      if (yPosition > 200) { // Start new page if needed
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.text('Environmental Trends', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(12);
      reportData.environmentalTrends.forEach(trend => {
        if (yPosition > 250) { // Start new page if needed
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${trend.period}:`, 20, yPosition);
        yPosition += 10;
        doc.text(`  CO2 Saved: ${trend.totalEmissionsSaved.toFixed(2)} kg`, 25, yPosition);
        yPosition += 8;
        doc.text(`  Trips: ${trend.tripCount}`, 25, yPosition);
        yPosition += 8;
        doc.text(`  Most Used Mode: ${trend.mostUsedTransportMode}`, 25, yPosition);
        yPosition += 15;
      });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private convertTripsToCSV(trips: TripRecord[]): string {
    const headers = [
      'Trip ID',
      'Date',
      'Origin',
      'Destination',
      'Transportation Mode',
      'Carbon Footprint (kg CO2)',
      'Emissions Saved (kg CO2)'
    ];

    const rows = trips.map(trip => [
      trip.id,
      trip.tripDate.toISOString().split('T')[0],
      `"${trip.origin.address || `${trip.origin.latitude}, ${trip.origin.longitude}`}"`,
      `"${trip.destination.address || `${trip.destination.latitude}, ${trip.destination.longitude}`}"`,
      trip.actualTransportationMode.type,
      trip.actualCarbonFootprint.toFixed(3),
      trip.savedEmissions.toFixed(3)
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private convertToCSVString(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}