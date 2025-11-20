import { ICarbonCalculator, EcoScoreComparison } from './interfaces/ICarbonCalculator';
import { RouteAlternative } from '../models/RouteAlternative';
import { TransportationMode } from '../models/TransportationMode';
import { CarbonFootprint } from '../models/CarbonFootprint';
import { EmissionFactor } from '../models/common';

export class CarbonCalculatorService implements ICarbonCalculator {
  async calculateEmissions(
    _route: RouteAlternative, 
    _transportationMode: TransportationMode
  ): Promise<CarbonFootprint> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async getEmissionFactor(
    _transportationMode: TransportationMode, 
    _region: string
  ): Promise<EmissionFactor> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }

  async compareAlternatives(_routes: RouteAlternative[]): Promise<EcoScoreComparison> {
    // Implementation will be added in subsequent tasks
    throw new Error('Method not implemented');
  }
}