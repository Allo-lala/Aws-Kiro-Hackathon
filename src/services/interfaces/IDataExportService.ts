import { SustainabilityMetrics, TripRecord } from '../../models/UserPreferences';

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeCharts?: boolean;
  includeMilestones?: boolean;
  includeDetailedBreakdown?: boolean;
}

export interface ReportData {
  userId: string;
  generatedAt: Date;
  sustainabilityMetrics: SustainabilityMetrics;
  tripHistory: TripRecord[];
  environmentalTrends: EnvironmentalTrend[];
}

export interface EnvironmentalTrend {
  period: string; // e.g., "2024-01", "Week 1"
  totalEmissionsSaved: number;
  tripCount: number;
  averageEmissionsPerTrip: number;
  mostUsedTransportMode: string;
}

export interface IDataExportService {
  /**
   * Generate a sustainability report for a user
   * @param userId User identifier
   * @param timeframe Time period for the report
   * @param options Export format and options
   * @returns Generated report data or file buffer
   */
  generateReport(
    userId: string,
    timeframe: { start: Date; end: Date },
    options: ExportOptions
  ): Promise<string | Buffer>;

  /**
   * Export trip data in specified format
   * @param userId User identifier
   * @param timeframe Time period for export
   * @param format Export format
   * @returns Exported data as string or buffer
   */
  exportTripData(
    userId: string,
    timeframe: { start: Date; end: Date },
    format: 'json' | 'csv'
  ): Promise<string>;

  /**
   * Generate environmental impact trends analysis
   * @param userId User identifier
   * @param timeframe Time period for analysis
   * @returns Trend analysis data
   */
  generateTrends(
    userId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<EnvironmentalTrend[]>;

  /**
   * Generate a templated report
   * @param userId User identifier
   * @param timeframe Time period for the report
   * @param templateKey Template to use ('summary', 'detailed', 'milestones')
   * @returns Generated report content
   */
  generateTemplatedReport(
    userId: string,
    timeframe: { start: Date; end: Date },
    templateKey?: string
  ): Promise<string>;

  /**
   * Get available report templates
   * @returns List of available templates
   */
  getAvailableTemplates(): Array<{ key: string; name: string; description: string }>;
}