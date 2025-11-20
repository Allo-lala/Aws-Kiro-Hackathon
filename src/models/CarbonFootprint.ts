import { SegmentEmission } from './common';

export interface CarbonFootprint {
  totalEmissions: number; // kg CO2 equivalent
  emissionsBySegment: SegmentEmission[];
  methodology: string;
  dataSources: string[];
  calculationTimestamp: Date;
}