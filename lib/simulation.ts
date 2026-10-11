export type WhatIfState = { gateOneEarlier: boolean };

export const baseline = {
  total: 1100,
  safe: 760,
  inTransit: 260,
  waiting: 62,
  needHelp: 12,
  noResponse: 6,
  resources: { beds: 400, water: 310, food: 370, sanitation: 350 },
  femaleRequiringShelter: 340,
  verifiedFemaleCapacity: 210,
};

export function simulationState({ gateOneEarlier }: WhatIfState) {
  const safeCapacity = Math.min(...Object.values(baseline.resources));
  const shortage = baseline.femaleRequiringShelter - baseline.verifiedFemaleCapacity;
  return {
    safeCapacity,
    shortage,
    route: gateOneEarlier ? "Gate 2 → North shelter" : "Gate 1 → North shelter",
    duration: gateOneEarlier ? "5h 54m" : "5h 20m",
    margin: gateOneEarlier ? "22m" : "56m",
    recommendation: gateOneEarlier ? "START EVACUATION IMMEDIATELY" : "Reserve capacity before the next checkpoint",
  };
}
