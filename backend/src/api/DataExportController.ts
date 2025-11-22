import { DataExportService } from '../services/DataExportService';
import { UserTrackerService } from '../services/UserTrackerService';
import { ExportOptions } from '../services/interfaces/IDataExportService';

export class DataExportController {
  private dataExportService: DataExportService;

  constructor() {
    const userTrackerService = new UserTrackerService();
    this.dataExportService = new DataExportService(userTrackerService);
  }

  /**
   * Generate a sustainability report for a user
   * @param userId User identifier
   * @param startDate Start date for the report (ISO string)
   * @param endDate End date for the report (ISO string)
   * @param format Export format ('json', 'csv', 'pdf')
   * @param options Additional export options
   * @returns Generated report
   */
  async generateSustainabilityReport(
    userId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    options: Partial<ExportOptions> = {}
  ): Promise<{ data: string | Buffer; contentType: string; filename: string }> {
    const timeframe = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const exportOptions: ExportOptions = {
      format,
      includeCharts: options.includeCharts ?? false,
      includeMilestones: options.includeMilestones ?? true,
      includeDetailedBreakdown: options.includeDetailedBreakdown ?? true
    };

    const reportData = await this.dataExportService.generateReport(
      userId,
      timeframe,
      exportOptions
    );

    // Determine content type and filename based on format
    let contentType: string;
    let filename: string;
    const dateRange = `${startDate.split('T')[0]}_to_${endDate.split('T')[0]}`;

    switch (format) {
      case 'json':
        contentType = 'application/json';
        filename = `sustainability_report_${userId}_${dateRange}.json`;
        break;
      case 'csv':
        contentType = 'text/csv';
        filename = `sustainability_report_${userId}_${dateRange}.csv`;
        break;
      case 'pdf':
        contentType = 'application/pdf';
        filename = `sustainability_report_${userId}_${dateRange}.pdf`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return {
      data: reportData,
      contentType,
      filename
    };
  }

  /**
   * Export trip data for a user
   * @param userId User identifier
   * @param startDate Start date for the export (ISO string)
   * @param endDate End date for the export (ISO string)
   * @param format Export format ('json' or 'csv')
   * @returns Exported trip data
   */
  async exportTripData(
    userId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const timeframe = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const tripData = await this.dataExportService.exportTripData(
      userId,
      timeframe,
      format
    );

    const dateRange = `${startDate.split('T')[0]}_to_${endDate.split('T')[0]}`;
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `trip_data_${userId}_${dateRange}.${format}`;

    return {
      data: tripData,
      contentType,
      filename
    };
  }

  /**
   * Get environmental trends for a user
   * @param userId User identifier
   * @param startDate Start date for the analysis (ISO string)
   * @param endDate End date for the analysis (ISO string)
   * @returns Environmental trends data
   */
  async getEnvironmentalTrends(
    userId: string,
    startDate: string,
    endDate: string
  ) {
    const timeframe = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const trends = await this.dataExportService.generateTrends(userId, timeframe);

    return {
      userId,
      timeframe,
      trends
    };
  }

  /**
   * Generate a templated report for a user
   * @param userId User identifier
   * @param startDate Start date for the report (ISO string)
   * @param endDate End date for the report (ISO string)
   * @param templateKey Template to use ('summary', 'detailed', 'milestones')
   * @returns Generated templated report
   */
  async generateTemplatedReport(
    userId: string,
    startDate: string,
    endDate: string,
    templateKey: string = 'summary'
  ): Promise<{ content: string; template: string; filename: string }> {
    const timeframe = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const content = await this.dataExportService.generateTemplatedReport(
      userId,
      timeframe,
      templateKey
    );

    const dateRange = `${startDate.split('T')[0]}_to_${endDate.split('T')[0]}`;
    const filename = `${templateKey}_report_${userId}_${dateRange}.md`;

    return {
      content,
      template: templateKey,
      filename
    };
  }

  /**
   * Get available report templates
   * @returns List of available templates
   */
  async getAvailableTemplates() {
    return this.dataExportService.getAvailableTemplates();
  }
}