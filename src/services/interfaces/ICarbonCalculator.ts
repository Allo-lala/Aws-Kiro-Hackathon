import { RouteAlternative } from '../../models/RouteAlternative';
import { TransportationMode } from '../../models/TransportationMode';
import { CarbonFootprint } from '../../models/CarbonFootprint';
import { EmissionFactor } from '../../models/common';

export interface EcoScoreComparison {
  routes: RouteAlternative[];
  rankedByEcoScore: RouteAlternative[];
  bestEcoOption: RouteAlternative;
  worstEcoOption: RouteAlternative;
}

export interface ICarbonCalculator {
  /**
   * Calculate carbon emissions for a specific route and transportation mode
   * @param route Route to calculate emissions for
   * @param transportationMode Transportation mode used
   * @returns Detailed carbon footprint calculation
   */
  calculateEmissions(
    route: RouteAlternative, 
    transportationMode: TransportationMode
  ): Promise<CarbonFootprint>;

  /**
   * Get emission factor for a specific transportation mode in a region
   * @param transportationMode Transportation mode
   * @param region Geographic region for emission factors
   * @returns Emission factor data with source information
   */
  getEmissionFactor(
    transportationMode: TransportationMode, 
    region: string
  ): Promise<EmissionFactor>;

  /**
   * Compare multiple route alternatives and rank by environmental impact
   * @param routes Array of route alternatives to compare
   * @returns Comparison results with eco-score rankings
   */
  compareAlternatives(routes: RouteAlternative[]): Promise<EcoScoreComparison>;
}