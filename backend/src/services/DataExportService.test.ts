import { describe, it, expect, beforeEach } from 'vitest';
import { DataExportService } from './DataExportService';
import { UserTrackerService } from './UserTrackerService';
import { ExportOptions } from './interfaces/IDataExportService';

describe('DataExportService', () => {
  let dataExportService: DataExportService;
  let userTrackerService: UserTrackerService;

  beforeEach(() => {
    userTrackerService = new UserTrackerService();
    dataExportService = new DataExportService(userTrackerService);
  });

  describe('generateReport', () => {
    it('should generate JSON report with basic data', async () => {
      const userId = 'test-user-1';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      const options: ExportOptions = {
        format: 'json',
        includeMilestones: true,
        includeDetailedBreakdown: false
      };

      const result = await dataExportService.generateReport(userId, timeframe, options);
      
      expect(typeof result).toBe('string');
      const reportData = JSON.parse(result as string);
      
      expect(reportData).toHaveProperty('metadata');
      expect(reportData).toHaveProperty('summary');
      expect(reportData.metadata.userId).toBe(userId);
      expect(reportData.summary).toHaveProperty('totalSavedEmissions');
      expect(reportData.summary).toHaveProperty('totalTrips');
      expect(reportData.summary).toHaveProperty('averageSavingsPerTrip');
    });

    it('should generate CSV report', async () => {
      const userId = 'test-user-2';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      const options: ExportOptions = {
        format: 'csv',
        includeMilestones: false,
        includeDetailedBreakdown: false
      };

      const result = await dataExportService.generateReport(userId, timeframe, options);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('type,period,totalEmissionsSaved');
      expect(result).toContain('Summary');
    });

    it('should generate PDF report', async () => {
      const userId = 'test-user-3';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      const options: ExportOptions = {
        format: 'pdf',
        includeMilestones: true,
        includeDetailedBreakdown: true
      };

      const result = await dataExportService.generateReport(userId, timeframe, options);
      
      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });
  });

  describe('exportTripData', () => {
    it('should export trip data as JSON', async () => {
      const userId = 'test-user-4';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await dataExportService.exportTripData(userId, timeframe, 'json');
      
      expect(typeof result).toBe('string');
      const tripData = JSON.parse(result);
      expect(Array.isArray(tripData)).toBe(true);
    });

    it('should export trip data as CSV', async () => {
      const userId = 'test-user-5';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await dataExportService.exportTripData(userId, timeframe, 'csv');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Trip ID,Date,Origin,Destination');
    });
  });

  describe('generateTrends', () => {
    it('should generate environmental trends', async () => {
      const userId = 'test-user-6';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-03-31')
      };

      const trends = await dataExportService.generateTrends(userId, timeframe);
      
      expect(Array.isArray(trends)).toBe(true);
      // With no trip data, trends should be empty
      expect(trends.length).toBe(0);
    });
  });

  describe('generateTemplatedReport', () => {
    it('should generate summary template report', async () => {
      const userId = 'test-user-7';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await dataExportService.generateTemplatedReport(userId, timeframe, 'summary');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('# Sustainability Summary Report');
      expect(result).toContain('Environmental Impact');
    });

    it('should generate detailed template report', async () => {
      const userId = 'test-user-8';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await dataExportService.generateTemplatedReport(userId, timeframe, 'detailed');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('# Detailed Sustainability Report');
      expect(result).toContain('Executive Summary');
      expect(result).toContain('Environmental Impact Analysis');
    });

    it('should generate milestones template report', async () => {
      const userId = 'test-user-9';
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const result = await dataExportService.generateTemplatedReport(userId, timeframe, 'milestones');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('# Milestone & Achievement Report');
      expect(result).toContain('Progress Overview');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return available templates', () => {
      const templates = dataExportService.getAvailableTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      const templateKeys = templates.map(t => t.key);
      expect(templateKeys).toContain('summary');
      expect(templateKeys).toContain('detailed');
      expect(templateKeys).toContain('milestones');
      
      templates.forEach(template => {
        expect(template).toHaveProperty('key');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
      });
    });
  });
});