/** A transparent, user-adjustable routing *illustration*, not a hydrological forecast. */
export type UpstreamInputs = {
  localDepth: number;
  upstreamPeakDepth: number;
  retentionPercent: number;
  channelLossPercent: number;
  travelMinutes: number;
};

export type UpstreamImpact = {
  localDepth: number;
  arrivingPulseDepth: number;
  downstreamDepth: number;
  travelMinutes: number;
  retainedDepth: number;
  channelLossDepth: number;
};

const finite = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const percent = (value: number) => Math.min(100, finite(value)) / 100;

/** Simple attenuated upstream pulse: downstream = local + upstream × (1 - retention) × (1 - channel loss). */
export function calculateUpstreamImpact(inputs: UpstreamInputs): UpstreamImpact {
  const localDepth = finite(inputs.localDepth);
  const peak = finite(inputs.upstreamPeakDepth);
  const retainedDepth = peak * percent(inputs.retentionPercent);
  const afterRetention = peak - retainedDepth;
  const channelLossDepth = afterRetention * percent(inputs.channelLossPercent);
  const arrivingPulseDepth = Math.max(0, afterRetention - channelLossDepth);
  return {
    localDepth,
    retainedDepth,
    channelLossDepth,
    arrivingPulseDepth,
    downstreamDepth: localDepth + arrivingPulseDepth,
    travelMinutes: finite(inputs.travelMinutes),
  };
}

/** Coarse exposure-screening proxy, based on provided building elevations or an aggregate depth ratio. */
export function estimateExposedPeople(depth: number, population: number, buildings: { occupancy: number; elevation: number }[]): number {
  if (buildings.length) return Math.min(population, buildings.reduce((total, b) => total + (depth >= b.elevation ? b.occupancy : 0), 0));
  return Math.min(population, Math.round(population * Math.min(1, Math.max(0, depth) / 3)));
}

/** Inputs for a transparent scenario-only upstream warning estimate; no live gauges or weather feed. */
export type FloodSignalInputs = UpstreamInputs & {
  rainfallMmPerHour: number;
  rainfallHours: number;
  riverRiseMeters: number;
  distanceKm: number;
  flowSpeedKmh: number;
  runoffLagMinutes: number;
};

export type FloodArrivalEstimate = UpstreamImpact & {
  estimatedArrivalMinutes: number | null;
  totalUpstreamPulse: number;
  rainfallRunoffDepth: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  alertMessage: string;
};

/**
 * Educational screening proxy: runoff depth = rainfall (mm/h) × duration (h) × 0.65 / 1000.
 * Wave arrival = distance / assumed wave speed + response lag (only if rain is present).
 * This is NOT calibrated hydrology, measured rainfall, a sensor alert, or an operational ETA.
 */
export function estimateFloodArrival(inputs: FloodSignalInputs): FloodArrivalEstimate {
  const rainfall = finite(inputs.rainfallMmPerHour);
  const duration = finite(inputs.rainfallHours);
  const riverRise = finite(inputs.riverRiseMeters);
  const distance = finite(inputs.distanceKm);
  const speed = finite(inputs.flowSpeedKmh);
  const runoffLag = finite(inputs.runoffLagMinutes);
  const rainfallRunoffDepth = rainfall * duration * 0.65 / 1000;
  const totalUpstreamPulse = finite(inputs.upstreamPeakDepth) + riverRise + rainfallRunoffDepth;
  const impact = calculateUpstreamImpact({ ...inputs, upstreamPeakDepth: totalUpstreamPulse });
  const arriving = impact.arrivingPulseDepth > 0;
  const estimatedArrivalMinutes = arriving && speed > 0 && distance > 0
    ? Math.round(distance / speed * 60 + (rainfall > 0 && duration > 0 ? runoffLag : 0))
    : null;
  const depth = impact.downstreamDepth;
  const riskLevel = depth >= 3 ? "SEVERE" : depth >= 2 ? "HIGH" : depth >= 1 ? "MODERATE" : "LOW";
  const alertMessage = estimatedArrivalMinutes === null
    ? "No valid arrival estimate: enter positive distance and wave speed, with a nonzero arriving pulse."
    : riskLevel === "SEVERE" || riskLevel === "HIGH"
      ? "High modeled exposure: review evacuation routes, shelter capacity and official alerts."
      : riskLevel === "MODERATE"
        ? "Moderate modeled exposure: prepare a response plan and verify local conditions."
        : "Lower modeled exposure: continue monitoring official information.";
  return { ...impact, estimatedArrivalMinutes, totalUpstreamPulse, rainfallRunoffDepth, riskLevel, alertMessage };
}
