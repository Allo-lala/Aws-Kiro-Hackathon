/**
 * Property-based tests for Data Export Service - Data export completeness
 * **Feature: eco-friendly-route-planner, Property 7: Data export completeness**
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { DataExportService } from './DataExportService';
import { UserTrackerService } from './UserTrackerService';
import { ExportOptions } from './interfaces/IDataExportService';
import { locationArbitrary, transportationTypeArbitrary } from '../test-utils/generators';
import { TransportationMode } from '../models/TransportationMode';
import { RouteAlternative } from '../models/RouteAlternative';
import { AvailabilityStatus } from '../models/common';

// Generator for ExportOptions
const exportOptionsArbitrary = fc.record({
  format: fc.constantFrom('json', 'csv', 'pdf') as fc.Arbitrary<'json' | 'csv' | 'pdf'>,
  includeCharts: fc.boolean(),
  includeMilestones: fc.boolean(),
  includeDetailedBreakdown: fc.boolean()
});

// Generator for user IDs
const userIdArbitrary = fc.uuid();

// Generator for timeframes
const timeframeArbitrary = fc.record({
  start: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-06-30') }),
  end: fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') })
}).filter(timeframe => timeframe.start < timeframe.end);

// Generator for TransportationMode with realistic emission factors
const transportationModeArbitrary = fc.record({
  type: transportationTypeArbitrary,
  subtype: fc.option(fc.constantFrom('bus', 'train', 'subway', 'tram'), { nil: undefined }),
  emissionFactor: fc.double({ min: 0, max: 2, noNaN: true, noDefaultInfinity: true }),
  accessibilityFeatures: fc.array(fc.record({
    type: fc.constantFrom('wheelchair_accessible', 'visual_impairment', 'hearing_impairment'),
    description: fc.string({ minLength: 5, maxLength: 50 }),
    supported: fc.boolean()
  }), { maxLength: 3 }),
  availability: fc.constantFrom('available', 'limited', 'unavailable') as fc.Arbitrary<AvailabilityStatus>
}).map(mode => ({
  ...mode,
  // Ensure zero-emission modes have zero emission factors
  emissionFactor: mode.type === 'walking' || mode.type === 'cycling' ? 0 : mode.emissionFactor
}));

// Generator for RouteAlternative
const routeAlternativeArbitrary = fc.record({
  id: fc.uuid(),
  origin: locationArbitrary,
  destination: locationArbitrary,
  transportationModes: fc.array(transportationModeArbitrary, { minLength: 1, maxLength: 3 }),
  segments: fc.array(fc.record({
    id: fc.uuid(),
    startLocation: locationArbitrary,
    endLocation: locationArbitrary,
    transportationMode: transportationModeArbitrary,
    distance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    estimatedTime: fc.double({ min: 1, max: 300, noNaN: true }),
    instructions: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
  }), { minLength: 1, maxLength: 5 }),
  totalDistance: fc.double({ min: 0.1, max: 500, noNaN: true }),
  estimatedTime: fc.double({ min: 1, max: 600, noNaN: true }),
  ecoScore: fc.double({ min: 0, max: 100, noNaN: true }),
  accessibilityCompliant: fc.boolean(),
  cost: fc.option(fc.double({ min: 0, max: 200, noNaN: true }), { nil: undefined })
}).map(partial => ({
  ...partial,
  carbonFootprint: {
    totalEmissions: 0,
    emissionsBySegment: [],
    methodology: 'Test methodology',
    dataSources: ['Test source'],
    calculationTimestamp: new Date()
  }
}));

describe('DataExportService Property Tests', () => {
  let dataExportService: DataExportService;
  let userTrackerService: UserTrackerService;

  beforeEach(() => {
    userTrackerService = new UserTrackerService();
    dataExportService = new DataExportService(userTrackerService);
  });

  it('Property 7: Data export completeness', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 7: Data export completeness**
     * 
     * This property validates that for any export request, generated reports should 
     * include all sustainability metrics and environmental impact trends.
     * 
     * Validates Requirements 3.4:
     * - 3.4: When exporting data, the Route_Planner shall generate reports showing 
     *        Sustainability_Metrics and personal environmental impact trends
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        timeframeArbitrary,
        exportOptionsArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 0, maxLength: 10 }
        ),
        async (userId: string, timeframe, options: ExportOptions, trips: Array<[RouteAlternative, TransportationMode]>) => {
          // Record some trips to have data to export
          for (const [route, mode] of trips) {
            await userTrackerService.recordTrip(userId, route, mode);
          }

          // Generate report with the specified options
          const reportResult = await dataExportService.generateReport(userId, timeframe, options);

          // Requirement 3.4: Report must be generated successfully
          expect(reportResult).toBeDefined();

          if (options.format === 'json') {
            // JSON reports must be valid JSON strings
            expect(typeof reportResult).toBe('string');
            const reportData = JSON.parse(reportResult as string);

            // Must contain core sustainability metrics
            expect(reportData).toHaveProperty('metadata');
            expect(reportData).toHaveProperty('summary');
            
            // Metadata completeness
            expect(reportData.metadata).toHaveProperty('userId');
            expect(reportData.metadata).toHaveProperty('generatedAt');
            expect(reportData.metadata).toHaveProperty('timeframe');
            expect(reportData.metadata.userId).toBe(userId);
            expect(reportData.metadata.timeframe).toHaveProperty('start');
            expect(reportData.metadata.timeframe).toHaveProperty('end');

            // Summary sustainability metrics completeness
            expect(reportData.summary).toHaveProperty('totalSavedEmissions');
            expect(reportData.summary).toHaveProperty('totalTrips');
            expect(reportData.summary).toHaveProperty('averageSavingsPerTrip');
            expect(typeof reportData.summary.totalSavedEmissions).toBe('number');
            expect(typeof reportData.summary.totalTrips).toBe('number');
            expect(typeof reportData.summary.averageSavingsPerTrip).toBe('number');

            // Conditional content based on options
            if (options.includeMilestones) {
              expect(reportData).toHaveProperty('milestones');
              expect(Array.isArray(reportData.milestones)).toBe(true);
            } else {
              expect(reportData).not.toHaveProperty('milestones');
            }

            if (options.includeDetailedBreakdown) {
              expect(reportData).toHaveProperty('tripHistory');
              expect(reportData).toHaveProperty('environmentalTrends');
              expect(Array.isArray(reportData.tripHistory)).toBe(true);
              expect(Array.isArray(reportData.environmentalTrends)).toBe(true);
            } else {
              expect(reportData).not.toHaveProperty('tripHistory');
              expect(reportData).not.toHaveProperty('environmentalTrends');
            }

          } else if (options.format === 'csv') {
            // CSV reports must be valid CSV strings
            expect(typeof reportResult).toBe('string');
            const csvContent = reportResult as string;
            
            // Must contain CSV headers and data
            expect(csvContent).toContain('type,period,totalEmissionsSaved');
            expect(csvContent).toContain('Summary');
            
            // Must contain sustainability metrics in CSV format
            const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
            expect(lines.length).toBeGreaterThan(0);
            
            // First line should be headers
            const headers = lines[0].split(',');
            expect(headers).toContain('type');
            expect(headers).toContain('totalEmissionsSaved');
            expect(headers).toContain('totalTrips');

          } else if (options.format === 'pdf') {
            // PDF reports must be valid Buffer objects
            expect(reportResult).toBeInstanceOf(Buffer);
            expect((reportResult as Buffer).length).toBeGreaterThan(0);
            
            // PDF should contain PDF signature
            const pdfContent = (reportResult as Buffer).toString('latin1');
            expect(pdfContent).toMatch(/^%PDF-/);
          }

          // Verify environmental trends are generated when requested
          if (options.includeDetailedBreakdown || options.format === 'json') {
            const trends = await dataExportService.generateTrends(userId, timeframe);
            expect(Array.isArray(trends)).toBe(true);
            
            // Each trend should have complete structure
            trends.forEach(trend => {
              expect(trend).toHaveProperty('period');
              expect(trend).toHaveProperty('totalEmissionsSaved');
              expect(trend).toHaveProperty('tripCount');
              expect(trend).toHaveProperty('averageEmissionsPerTrip');
              expect(trend).toHaveProperty('mostUsedTransportMode');
              expect(typeof trend.totalEmissionsSaved).toBe('number');
              expect(typeof trend.tripCount).toBe('number');
              expect(typeof trend.averageEmissionsPerTrip).toBe('number');
              expect(typeof trend.mostUsedTransportMode).toBe('string');
            });
          }

          // Verify trip data export completeness
          const tripDataJson = await dataExportService.exportTripData(userId, timeframe, 'json');
          expect(typeof tripDataJson).toBe('string');
          const tripData = JSON.parse(tripDataJson);
          expect(Array.isArray(tripData)).toBe(true);

          const tripDataCsv = await dataExportService.exportTripData(userId, timeframe, 'csv');
          expect(typeof tripDataCsv).toBe('string');
          if (tripData.length > 0) {
            expect(tripDataCsv).toContain('Trip ID,Date,Origin,Destination');
          }

          // Verify templated reports contain all required sections
          const summaryReport = await dataExportService.generateTemplatedReport(userId, timeframe, 'summary');
          expect(typeof summaryReport).toBe('string');
          expect(summaryReport).toContain('# Sustainability Summary Report');
          expect(summaryReport).toContain('Environmental Impact');

          const detailedReport = await dataExportService.generateTemplatedReport(userId, timeframe, 'detailed');
          expect(typeof detailedReport).toBe('string');
          expect(detailedReport).toContain('# Detailed Sustainability Report');
          expect(detailedReport).toContain('Executive Summary');

          const milestonesReport = await dataExportService.generateTemplatedReport(userId, timeframe, 'milestones');
          expect(typeof milestonesReport).toBe('string');
          expect(milestonesReport).toContain('# Milestone & Achievement Report');
          expect(milestonesReport).toContain('Progress Overview');

          // Verify available templates are complete
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
            expect(typeof template.key).toBe('string');
            expect(typeof template.name).toBe('string');
            expect(typeof template.description).toBe('string');
            expect(template.key.length).toBeGreaterThan(0);
            expect(template.name.length).toBeGreaterThan(0);
            expect(template.description.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7 Extended: Export format consistency', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 7: Data export completeness**
     * 
     * This extended property validates that the same data exported in different formats
     * contains equivalent sustainability metrics and environmental impact information.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        timeframeArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 1, maxLength: 5 }
        ),
        async (userId: string, timeframe, trips: Array<[RouteAlternative, TransportationMode]>) => {
          // Record trips to have consistent data
          for (const [route, mode] of trips) {
            await userTrackerService.recordTrip(userId, route, mode);
          }

          // Export in all formats with full options
          const fullOptions = {
            includeMilestones: true,
            includeDetailedBreakdown: true
          };

          const jsonReport = await dataExportService.generateReport(userId, timeframe, {
            format: 'json',
            ...fullOptions
          });

          const csvReport = await dataExportService.generateReport(userId, timeframe, {
            format: 'csv',
            ...fullOptions
          });

          const pdfReport = await dataExportService.generateReport(userId, timeframe, {
            format: 'pdf',
            ...fullOptions
          });

          // All formats should be generated successfully
          expect(jsonReport).toBeDefined();
          expect(csvReport).toBeDefined();
          expect(pdfReport).toBeDefined();

          // JSON should contain complete data structure
          const jsonData = JSON.parse(jsonReport as string);
          expect(jsonData.summary).toHaveProperty('totalSavedEmissions');
          expect(jsonData.summary).toHaveProperty('totalTrips');
          expect(jsonData.summary).toHaveProperty('averageSavingsPerTrip');

          // CSV should contain the same summary metrics
          const csvContent = csvReport as string;
          expect(csvContent).toContain('Summary');
          expect(csvContent).toContain(jsonData.summary.totalSavedEmissions.toString());
          expect(csvContent).toContain(jsonData.summary.totalTrips.toString());

          // PDF should be a valid buffer with content
          expect(pdfReport).toBeInstanceOf(Buffer);
          expect((pdfReport as Buffer).length).toBeGreaterThan(1000); // Reasonable PDF size

          // Verify trends data consistency across formats
          const trends = await dataExportService.generateTrends(userId, timeframe);
          
          if (jsonData.environmentalTrends) {
            expect(jsonData.environmentalTrends.length).toBe(trends.length);
            
            // Verify trend data matches
            jsonData.environmentalTrends.forEach((jsonTrend: any, index: number) => {
              const originalTrend = trends[index];
              expect(jsonTrend.period).toBe(originalTrend.period);
              expect(jsonTrend.totalEmissionsSaved).toBeCloseTo(originalTrend.totalEmissionsSaved, 3);
              expect(jsonTrend.tripCount).toBe(originalTrend.tripCount);
              expect(jsonTrend.mostUsedTransportMode).toBe(originalTrend.mostUsedTransportMode);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 7 Extended: Export options filtering', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 7: Data export completeness**
     * 
     * This extended property validates that export options correctly filter
     * the included content while maintaining data integrity.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        timeframeArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 2, maxLength: 8 }
        ),
        async (userId: string, timeframe, trips: Array<[RouteAlternative, TransportationMode]>) => {
          // Record trips to have data
          for (const [route, mode] of trips) {
            await userTrackerService.recordTrip(userId, route, mode);
          }

          // Test different option combinations
          const minimalOptions: ExportOptions = {
            format: 'json',
            includeMilestones: false,
            includeDetailedBreakdown: false
          };

          const fullOptions: ExportOptions = {
            format: 'json',
            includeMilestones: true,
            includeDetailedBreakdown: true
          };

          const minimalReport = await dataExportService.generateReport(userId, timeframe, minimalOptions);
          const fullReport = await dataExportService.generateReport(userId, timeframe, fullOptions);

          const minimalData = JSON.parse(minimalReport as string);
          const fullData = JSON.parse(fullReport as string);

          // Both should have core metadata and summary
          expect(minimalData).toHaveProperty('metadata');
          expect(minimalData).toHaveProperty('summary');
          expect(fullData).toHaveProperty('metadata');
          expect(fullData).toHaveProperty('summary');

          // Core metrics should be identical
          expect(minimalData.summary.totalSavedEmissions).toBe(fullData.summary.totalSavedEmissions);
          expect(minimalData.summary.totalTrips).toBe(fullData.summary.totalTrips);
          expect(minimalData.summary.averageSavingsPerTrip).toBe(fullData.summary.averageSavingsPerTrip);

          // Minimal should not have optional sections
          expect(minimalData).not.toHaveProperty('milestones');
          expect(minimalData).not.toHaveProperty('tripHistory');
          expect(minimalData).not.toHaveProperty('environmentalTrends');

          // Full should have all optional sections
          expect(fullData).toHaveProperty('milestones');
          expect(fullData).toHaveProperty('tripHistory');
          expect(fullData).toHaveProperty('environmentalTrends');

          // Optional sections should contain valid data
          expect(Array.isArray(fullData.milestones)).toBe(true);
          expect(Array.isArray(fullData.tripHistory)).toBe(true);
          expect(Array.isArray(fullData.environmentalTrends)).toBe(true);

          // Verify milestone-only option
          const milestonesOnlyOptions: ExportOptions = {
            format: 'json',
            includeMilestones: true,
            includeDetailedBreakdown: false
          };

          const milestonesOnlyReport = await dataExportService.generateReport(userId, timeframe, milestonesOnlyOptions);
          const milestonesOnlyData = JSON.parse(milestonesOnlyReport as string);

          expect(milestonesOnlyData).toHaveProperty('milestones');
          expect(milestonesOnlyData).not.toHaveProperty('tripHistory');
          expect(milestonesOnlyData).not.toHaveProperty('environmentalTrends');

          // Verify breakdown-only option
          const breakdownOnlyOptions: ExportOptions = {
            format: 'json',
            includeMilestones: false,
            includeDetailedBreakdown: true
          };

          const breakdownOnlyReport = await dataExportService.generateReport(userId, timeframe, breakdownOnlyOptions);
          const breakdownOnlyData = JSON.parse(breakdownOnlyReport as string);

          expect(breakdownOnlyData).not.toHaveProperty('milestones');
          expect(breakdownOnlyData).toHaveProperty('tripHistory');
          expect(breakdownOnlyData).toHaveProperty('environmentalTrends');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 7 Extended: Timeframe filtering accuracy', async () => {
    /**
     * **Feature: eco-friendly-route-planner, Property 7: Data export completeness**
     * 
     * This extended property validates that exports correctly filter data
     * based on the specified timeframe while maintaining completeness.
     */
    await fc.assert(
      fc.asyncProperty(
        userIdArbitrary,
        fc.array(
          fc.tuple(routeAlternativeArbitrary, transportationModeArbitrary),
          { minLength: 1, maxLength: 6 }
        ),
        async (userId: string, trips: Array<[RouteAlternative, TransportationMode]>) => {
          // Record trips (they will have current timestamps)
          const tripRecords = [];
          for (const [route, mode] of trips) {
            const tripRecord = await userTrackerService.recordTrip(userId, route, mode);
            tripRecords.push(tripRecord);
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Test with timeframe that includes all trips
          const currentTimeframe = {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            end: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
          };

          // Test with timeframe that excludes all trips (past timeframe)
          const pastTimeframe = {
            start: new Date('2020-01-01'),
            end: new Date('2020-12-31')
          };

          const currentReport = await dataExportService.generateReport(userId, currentTimeframe, {
            format: 'json',
            includeMilestones: true,
            includeDetailedBreakdown: true
          });

          const pastReport = await dataExportService.generateReport(userId, pastTimeframe, {
            format: 'json',
            includeMilestones: true,
            includeDetailedBreakdown: true
          });

          const currentData = JSON.parse(currentReport as string);
          const pastData = JSON.parse(pastReport as string);

          // Current timeframe should include trips
          expect(currentData.summary.totalTrips).toBe(tripRecords.length);
          expect(currentData.summary.totalSavedEmissions).toBeGreaterThanOrEqual(0);

          // Past timeframe should have no trips
          expect(pastData.summary.totalTrips).toBe(0);
          expect(pastData.summary.totalSavedEmissions).toBe(0);
          expect(pastData.summary.averageSavingsPerTrip).toBe(0);

          // Both should have complete structure
          expect(currentData).toHaveProperty('metadata');
          expect(currentData).toHaveProperty('summary');
          expect(pastData).toHaveProperty('metadata');
          expect(pastData).toHaveProperty('summary');

          // Timeframes should be preserved in metadata
          expect(currentData.metadata.timeframe.start).toBe(currentTimeframe.start.toISOString());
          expect(currentData.metadata.timeframe.end).toBe(currentTimeframe.end.toISOString());
          expect(pastData.metadata.timeframe.start).toBe(pastTimeframe.start.toISOString());
          expect(pastData.metadata.timeframe.end).toBe(pastTimeframe.end.toISOString());

          // Trip history should reflect timeframe filtering
          if (currentData.tripHistory) {
            expect(currentData.tripHistory.length).toBe(tripRecords.length);
          }
          if (pastData.tripHistory) {
            expect(pastData.tripHistory.length).toBe(0);
          }

          // Environmental trends should reflect timeframe filtering
          if (currentData.environmentalTrends) {
            expect(Array.isArray(currentData.environmentalTrends)).toBe(true);
          }
          if (pastData.environmentalTrends) {
            expect(pastData.environmentalTrends.length).toBe(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});