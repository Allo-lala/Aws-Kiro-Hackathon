import { ReportData } from '../interfaces/IDataExportService';

export interface ReportTemplate {
  name: string;
  description: string;
  generateContent(data: ReportData): string;
}

export class SummaryReportTemplate implements ReportTemplate {
  name = 'Summary Report';
  description = 'A concise overview of environmental impact and achievements';

  generateContent(data: ReportData): string {
    const { sustainabilityMetrics, environmentalTrends } = data;
    const timeframeStr = `${sustainabilityMetrics.timeframe.start.toLocaleDateString()} - ${sustainabilityMetrics.timeframe.end.toLocaleDateString()}`;
    
    let content = `# Sustainability Summary Report\n\n`;
    content += `**Report Period:** ${timeframeStr}\n`;
    content += `**Generated:** ${data.generatedAt.toLocaleDateString()}\n\n`;
    
    content += `## 🌱 Environmental Impact\n\n`;
    content += `- **Total CO₂ Saved:** ${sustainabilityMetrics.totalSavedEmissions.toFixed(2)} kg\n`;
    content += `- **Eco-Friendly Trips:** ${sustainabilityMetrics.totalTrips}\n`;
    content += `- **Average Savings per Trip:** ${sustainabilityMetrics.averageSavingsPerTrip.toFixed(2)} kg CO₂\n\n`;
    
    // Add achievements
    const achievements = sustainabilityMetrics.milestones.filter(m => m.achieved);
    if (achievements.length > 0) {
      content += `## 🏆 Recent Achievements\n\n`;
      achievements.forEach(achievement => {
        content += `- ✅ ${achievement.description}\n`;
      });
      content += `\n`;
    }
    
    // Add trends if available
    if (environmentalTrends.length > 0) {
      content += `## 📈 Monthly Trends\n\n`;
      environmentalTrends.slice(-3).forEach(trend => {
        content += `**${trend.period}:**\n`;
        content += `- CO₂ Saved: ${trend.totalEmissionsSaved.toFixed(2)} kg\n`;
        content += `- Trips: ${trend.tripCount}\n`;
        content += `- Primary Mode: ${trend.mostUsedTransportMode}\n\n`;
      });
    }
    
    return content;
  }
}

export class DetailedReportTemplate implements ReportTemplate {
  name = 'Detailed Report';
  description = 'Comprehensive analysis with trends and trip breakdown';

  generateContent(data: ReportData): string {
    const { sustainabilityMetrics, environmentalTrends, tripHistory } = data;
    const timeframeStr = `${sustainabilityMetrics.timeframe.start.toLocaleDateString()} - ${sustainabilityMetrics.timeframe.end.toLocaleDateString()}`;
    
    let content = `# Detailed Sustainability Report\n\n`;
    content += `**User ID:** ${data.userId}\n`;
    content += `**Report Period:** ${timeframeStr}\n`;
    content += `**Generated:** ${data.generatedAt.toLocaleDateString()}\n\n`;
    
    // Executive Summary
    content += `## Executive Summary\n\n`;
    content += `During the reporting period, you completed ${sustainabilityMetrics.totalTrips} eco-friendly trips, `;
    content += `saving a total of ${sustainabilityMetrics.totalSavedEmissions.toFixed(2)} kg of CO₂ emissions. `;
    content += `This represents an average of ${sustainabilityMetrics.averageSavingsPerTrip.toFixed(2)} kg CO₂ saved per trip.\n\n`;
    
    // Environmental Impact Analysis
    content += `## 🌍 Environmental Impact Analysis\n\n`;
    content += `### Overall Metrics\n`;
    content += `- **Total CO₂ Emissions Saved:** ${sustainabilityMetrics.totalSavedEmissions.toFixed(2)} kg\n`;
    content += `- **Equivalent to:** ${this.getEquivalentComparison(sustainabilityMetrics.totalSavedEmissions)}\n`;
    content += `- **Total Eco-Friendly Trips:** ${sustainabilityMetrics.totalTrips}\n`;
    content += `- **Average Impact per Trip:** ${sustainabilityMetrics.averageSavingsPerTrip.toFixed(2)} kg CO₂\n\n`;
    
    // Monthly Trends
    if (environmentalTrends.length > 0) {
      content += `### 📊 Monthly Trends\n\n`;
      content += `| Month | CO₂ Saved (kg) | Trips | Avg per Trip | Primary Mode |\n`;
      content += `|-------|----------------|-------|--------------|---------------|\n`;
      environmentalTrends.forEach(trend => {
        content += `| ${trend.period} | ${trend.totalEmissionsSaved.toFixed(2)} | ${trend.tripCount} | ${trend.averageEmissionsPerTrip.toFixed(2)} | ${trend.mostUsedTransportMode} |\n`;
      });
      content += `\n`;
    }
    
    // Achievements and Milestones
    content += `## 🏆 Achievements & Milestones\n\n`;
    const achievedMilestones = sustainabilityMetrics.milestones.filter(m => m.achieved);
    const pendingMilestones = sustainabilityMetrics.milestones.filter(m => !m.achieved);
    
    if (achievedMilestones.length > 0) {
      content += `### Completed Achievements\n`;
      achievedMilestones.forEach(milestone => {
        const date = milestone.achievedDate ? milestone.achievedDate.toLocaleDateString() : 'Unknown';
        content += `- ✅ **${milestone.description}** (Achieved: ${date})\n`;
      });
      content += `\n`;
    }
    
    if (pendingMilestones.length > 0) {
      content += `### Upcoming Milestones\n`;
      pendingMilestones.slice(0, 3).forEach(milestone => {
        content += `- 🎯 ${milestone.description}\n`;
      });
      content += `\n`;
    }
    
    // Transportation Mode Analysis
    if (tripHistory.length > 0) {
      content += `## 🚲 Transportation Mode Analysis\n\n`;
      const modeStats = this.analyzeModes(tripHistory);
      content += `| Mode | Trips | Total CO₂ Saved | Avg per Trip |\n`;
      content += `|------|-------|-----------------|---------------|\n`;
      Object.entries(modeStats).forEach(([mode, stats]) => {
        content += `| ${mode} | ${stats.count} | ${stats.totalSaved.toFixed(2)} kg | ${stats.avgSaved.toFixed(2)} kg |\n`;
      });
      content += `\n`;
    }
    
    return content;
  }

  private getEquivalentComparison(kgCO2: number): string {
    // Convert to various equivalents for better understanding
    const milesInCar = (kgCO2 / 0.404).toFixed(1); // Average car emissions
    const treesPlanted = (kgCO2 / 21.77).toFixed(1); // Trees needed to offset CO2 per year
    
    return `${milesInCar} miles of car driving avoided, or ${treesPlanted} trees planted`;
  }

  private analyzeModes(trips: any[]): Record<string, { count: number; totalSaved: number; avgSaved: number }> {
    const modeStats: Record<string, { count: number; totalSaved: number; avgSaved: number }> = {};
    
    trips.forEach(trip => {
      const mode = trip.actualTransportationMode.type;
      if (!modeStats[mode]) {
        modeStats[mode] = { count: 0, totalSaved: 0, avgSaved: 0 };
      }
      modeStats[mode].count++;
      modeStats[mode].totalSaved += trip.savedEmissions;
    });
    
    // Calculate averages
    Object.values(modeStats).forEach(stats => {
      stats.avgSaved = stats.totalSaved / stats.count;
    });
    
    return modeStats;
  }
}

export class MilestoneReportTemplate implements ReportTemplate {
  name = 'Milestone Report';
  description = 'Focus on achievements and progress tracking';

  generateContent(data: ReportData): string {
    const { sustainabilityMetrics } = data;
    const timeframeStr = `${sustainabilityMetrics.timeframe.start.toLocaleDateString()} - ${sustainabilityMetrics.timeframe.end.toLocaleDateString()}`;
    
    let content = `# Milestone & Achievement Report\n\n`;
    content += `**Report Period:** ${timeframeStr}\n`;
    content += `**Generated:** ${data.generatedAt.toLocaleDateString()}\n\n`;
    
    content += `## 🎯 Progress Overview\n\n`;
    const totalMilestones = sustainabilityMetrics.milestones.length;
    const achievedMilestones = sustainabilityMetrics.milestones.filter(m => m.achieved).length;
    const progressPercentage = totalMilestones > 0 ? (achievedMilestones / totalMilestones * 100).toFixed(1) : '0';
    
    content += `**Overall Progress:** ${achievedMilestones}/${totalMilestones} milestones (${progressPercentage}%)\n\n`;
    
    // Group milestones by type
    const milestonesByType = sustainabilityMetrics.milestones.reduce((acc, milestone) => {
      if (!acc[milestone.type]) acc[milestone.type] = [];
      acc[milestone.type].push(milestone);
      return acc;
    }, {} as Record<string, typeof sustainabilityMetrics.milestones>);
    
    Object.entries(milestonesByType).forEach(([type, milestones]) => {
      const typeTitle = this.getMilestoneTypeTitle(type);
      content += `## ${typeTitle}\n\n`;
      
      milestones.forEach(milestone => {
        const status = milestone.achieved ? '✅' : '⏳';
        const dateStr = milestone.achievedDate ? ` (${milestone.achievedDate.toLocaleDateString()})` : '';
        content += `${status} **${milestone.description}**${dateStr}\n`;
      });
      content += `\n`;
    });
    
    return content;
  }

  private getMilestoneTypeTitle(type: string): string {
    switch (type) {
      case 'emissions_saved':
        return '🌱 Emissions Reduction Milestones';
      case 'trips_completed':
        return '🚲 Trip Count Milestones';
      case 'streak':
        return '🔥 Consistency Streaks';
      default:
        return '📊 Other Milestones';
    }
  }
}

export class ReportTemplateManager {
  private templates: Map<string, ReportTemplate>;

  constructor() {
    this.templates = new Map();
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    this.registerTemplate('summary', new SummaryReportTemplate());
    this.registerTemplate('detailed', new DetailedReportTemplate());
    this.registerTemplate('milestones', new MilestoneReportTemplate());
  }

  registerTemplate(key: string, template: ReportTemplate): void {
    this.templates.set(key, template);
  }

  getTemplate(key: string): ReportTemplate | undefined {
    return this.templates.get(key);
  }

  getAvailableTemplates(): Array<{ key: string; name: string; description: string }> {
    return Array.from(this.templates.entries()).map(([key, template]) => ({
      key,
      name: template.name,
      description: template.description
    }));
  }

  generateReport(templateKey: string, data: ReportData): string {
    const template = this.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template '${templateKey}' not found`);
    }
    return template.generateContent(data);
  }
}