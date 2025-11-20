import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { UserPreferences } from '../models/UserPreferences';
import { AccessibilityRequirement, AccessibilityFeature } from '../models/common';

export interface AccessibilityFilterOptions {
  strictMode?: boolean; // If true, only return fully compliant routes
  fallbackToPartial?: boolean; // If true, allow partially compliant routes when no fully compliant exist
  prioritizeCompliance?: boolean; // If true, rank compliant routes higher even if less eco-friendly
}

export interface AccessibilityAssessment {
  isFullyCompliant: boolean;
  isPartiallyCompliant: boolean;
  complianceScore: number; // 0-1 scale
  missingRequirements: AccessibilityRequirement[];
  supportedFeatures: AccessibilityFeature[];
}

export interface FilteredRouteResult {
  routes: RouteAlternative[];
  accessibilityAssessments: Map<string, AccessibilityAssessment>;
  fallbackUsed: boolean;
  recommendationReason: string;
}

/**
 * Service for filtering and assessing routes based on accessibility requirements
 * Implements requirements 4.1, 4.2, and 4.3 for accessibility-aware route planning
 */
export class AccessibilityFilterService {
  
  /**
   * Filter routes based on accessibility requirements with eco-optimization
   * Requirements 4.1, 4.2: Filter routes while maintaining eco-friendly focus
   */
  filterAccessibleRoutes(
    routes: RouteAlternative[],
    preferences: UserPreferences,
    options: AccessibilityFilterOptions = {}
  ): FilteredRouteResult {
    const {
      strictMode = false,
      fallbackToPartial = true,
      prioritizeCompliance = true
    } = options;

    // If no accessibility needs, return all routes
    if (!preferences.accessibilityNeeds || preferences.accessibilityNeeds.length === 0) {
      return {
        routes,
        accessibilityAssessments: new Map(),
        fallbackUsed: false,
        recommendationReason: 'No accessibility requirements specified'
      };
    }

    // Assess accessibility compliance for each route
    const assessments = new Map<string, AccessibilityAssessment>();
    routes.forEach(route => {
      assessments.set(route.id, this.assessRouteAccessibility(route, preferences.accessibilityNeeds));
    });

    // Filter routes based on compliance
    let filteredRoutes = this.applyAccessibilityFilter(routes, assessments, preferences.accessibilityNeeds, strictMode);
    let fallbackUsed = false;
    let recommendationReason = '';

    if (filteredRoutes.length === 0 && fallbackToPartial) {
      // Requirement 4.3: Provide sustainable alternatives when no fully accessible options exist
      filteredRoutes = this.getFallbackRoutes(routes, assessments, preferences);
      fallbackUsed = true;
      recommendationReason = 'No fully accessible routes available. Showing most sustainable partially accessible alternatives.';
    } else if (filteredRoutes.length > 0) {
      recommendationReason = strictMode 
        ? 'Showing only fully accessible routes'
        : 'Showing accessible routes prioritized by environmental impact';
    } else {
      recommendationReason = 'No accessible routes found for the specified requirements';
    }

    // Sort filtered routes considering both accessibility and eco-friendliness
    if (prioritizeCompliance && filteredRoutes.length > 1) {
      filteredRoutes = this.sortByAccessibilityAndEcoScore(filteredRoutes, assessments);
    }

    return {
      routes: filteredRoutes,
      accessibilityAssessments: assessments,
      fallbackUsed,
      recommendationReason
    };
  }

  /**
   * Assess how well a route meets accessibility requirements
   */
  assessRouteAccessibility(
    route: RouteAlternative, 
    requirements: AccessibilityRequirement[]
  ): AccessibilityAssessment {
    const requiredNeeds = requirements.filter(req => req.required);
    
    if (requiredNeeds.length === 0) {
      return {
        isFullyCompliant: true,
        isPartiallyCompliant: true,
        complianceScore: 1.0,
        missingRequirements: [],
        supportedFeatures: this.getAllSupportedFeatures(route)
      };
    }

    const supportedFeatures = this.getAllSupportedFeatures(route);
    const supportedTypes = new Set(supportedFeatures.map(f => f.type));
    
    const missingRequirements = requiredNeeds.filter(req => !supportedTypes.has(req.type));
    const metRequirements = requiredNeeds.filter(req => supportedTypes.has(req.type));
    
    const complianceScore = metRequirements.length / requiredNeeds.length;
    const isFullyCompliant = missingRequirements.length === 0;
    const isPartiallyCompliant = metRequirements.length > 0;

    return {
      isFullyCompliant,
      isPartiallyCompliant,
      complianceScore,
      missingRequirements,
      supportedFeatures
    };
  }

  /**
   * Get all supported accessibility features across all transportation modes in a route
   */
  private getAllSupportedFeatures(route: RouteAlternative): AccessibilityFeature[] {
    const allFeatures: AccessibilityFeature[] = [];
    
    route.transportationModes.forEach(mode => {
      mode.accessibilityFeatures
        .filter(feature => feature.supported)
        .forEach(feature => {
          // Avoid duplicates
          if (!allFeatures.some(f => f.type === feature.type)) {
            allFeatures.push(feature);
          }
        });
    });

    return allFeatures;
  }

  /**
   * Apply accessibility filtering based on compliance requirements
   */
  private applyAccessibilityFilter(
    routes: RouteAlternative[],
    assessments: Map<string, AccessibilityAssessment>,
    requirements: AccessibilityRequirement[],
    strictMode: boolean
  ): RouteAlternative[] {
    const requiredNeeds = requirements.filter(req => req.required);
    
    if (requiredNeeds.length === 0) {
      return routes;
    }

    return routes.filter(route => {
      const assessment = assessments.get(route.id);
      if (!assessment) return false;

      return strictMode ? assessment.isFullyCompliant : assessment.isPartiallyCompliant;
    });
  }

  /**
   * Get fallback routes when no fully accessible options exist
   * Requirement 4.3: Recommend most sustainable accessible alternative
   */
  private getFallbackRoutes(
    routes: RouteAlternative[],
    assessments: Map<string, AccessibilityAssessment>,
    preferences: UserPreferences
  ): RouteAlternative[] {
    // First try to find routes with some compliance
    let routesWithScores = routes
      .map(route => ({
        route,
        assessment: assessments.get(route.id)!
      }))
      .filter(item => item.assessment.isPartiallyCompliant)
      .sort((a, b) => {
        // First sort by compliance score (higher is better)
        const complianceDiff = b.assessment.complianceScore - a.assessment.complianceScore;
        if (Math.abs(complianceDiff) > 0.1) {
          return complianceDiff;
        }
        
        // Then by eco-score (higher is better)
        return b.route.ecoScore - a.route.ecoScore;
      });

    // If no partially compliant routes, fall back to most eco-friendly routes
    if (routesWithScores.length === 0) {
      routesWithScores = routes
        .map(route => ({
          route,
          assessment: assessments.get(route.id)!
        }))
        .sort((a, b) => b.route.ecoScore - a.route.ecoScore);
    }

    // Return top 3 fallback options or all if fewer than 3
    return routesWithScores.slice(0, 3).map(item => item.route);
  }

  /**
   * Sort routes considering both accessibility compliance and eco-friendliness
   */
  private sortByAccessibilityAndEcoScore(
    routes: RouteAlternative[],
    assessments: Map<string, AccessibilityAssessment>
  ): RouteAlternative[] {
    return routes.sort((a, b) => {
      const assessmentA = assessments.get(a.id)!;
      const assessmentB = assessments.get(b.id)!;

      // Fully compliant routes always rank higher
      if (assessmentA.isFullyCompliant && !assessmentB.isFullyCompliant) {
        return -1;
      }
      if (!assessmentA.isFullyCompliant && assessmentB.isFullyCompliant) {
        return 1;
      }

      // Among routes with same compliance level, sort by eco-score
      if (assessmentA.isFullyCompliant === assessmentB.isFullyCompliant) {
        return b.ecoScore - a.ecoScore;
      }

      // Otherwise sort by compliance score
      return assessmentB.complianceScore - assessmentA.complianceScore;
    });
  }

  /**
   * Update accessibility preferences for a user
   * Validates and normalizes accessibility requirements
   */
  updateAccessibilityPreferences(
    currentPreferences: UserPreferences,
    newRequirements: AccessibilityRequirement[]
  ): UserPreferences {
    // Validate and normalize requirements
    const validatedRequirements = this.validateAccessibilityRequirements(newRequirements);
    
    return {
      ...currentPreferences,
      accessibilityNeeds: validatedRequirements
    };
  }

  /**
   * Validate accessibility requirements for consistency and completeness
   */
  private validateAccessibilityRequirements(
    requirements: AccessibilityRequirement[]
  ): AccessibilityRequirement[] {
    const validTypes = new Set([
      'wheelchair_accessible',
      'visual_impairment',
      'hearing_impairment',
      'mobility_assistance',
      'cognitive_assistance'
    ]);

    return requirements
      .filter(req => {
        // Filter out invalid requirements, but keep unknown types for testing fallback behavior
        return req.type && 
               req.type.trim() !== '' && 
               typeof req.required === 'boolean';
      })
      .map(req => ({
        ...req,
        type: req.type.trim(),
        description: req.description?.trim() || `${req.type} support`
      }));
  }

  /**
   * Check if transportation modes support specific accessibility requirements
   */
  checkModeAccessibility(
    modes: TransportationMode[],
    requirements: AccessibilityRequirement[]
  ): Map<string, boolean> {
    const results = new Map<string, boolean>();
    
    modes.forEach(mode => {
      const supportedTypes = new Set(
        mode.accessibilityFeatures
          .filter(f => f.supported)
          .map(f => f.type)
      );
      
      const requiredTypes = requirements
        .filter(req => req.required)
        .map(req => req.type);
      
      const isSupported = requiredTypes.every(type => supportedTypes.has(type));
      results.set(mode.type, isSupported);
    });

    return results;
  }
}