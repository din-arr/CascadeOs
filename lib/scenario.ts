/** Deterministic scenario planning helpers. These are NOT certified safety forecasts. */
export type ScenarioMode = "demo" | "custom";
export type AssetStatus = "operational" | "warning" | "critical" | "unavailable";

export type Building = {
  id: string; name: string; type: string; occupancy: number; floors: number;
  elevation: number; accessibleExits: number;
};
export type InfrastructureAsset = {
  id: string; name: string;
  type: "electrical" | "pump" | "gate" | "road" | "communications";
  failureMinutes: number; threshold: number; dependsOn: string[]; status: AssetStatus;
};
export type Shelter = {
  id: string; name: string; beds: number; water: number; food: number;
  sanitation: number; currentOccupancy: number; accessibleCapacity: number; accommodationCapacity?: number;
};
export type Vehicle = {
  id: string; capacity: number; count: number; travelMinutes: number;
  boardingMinutes: number; unloadingMinutes: number; returnMinutes: number;
  available: boolean; accessible: boolean;
};
export type Route = {
  id: string; name: string; gate: string; travelMinutes: number;
  closureMinutes: number; available: boolean;
};
export type FloodScenario = {
  rainfallMmPerHour: number; rainfallDurationHours: number; floodDepth: number;
  waterRiseRate: number; arrivalMinutes: number | null; forecastHorizonHours: number;
  startTime: string; dataSource: string;
  arrivalMethod: "provided" | "simplified" | "insufficient";
};
export type StatusCounts = {
  safe: number; inTransit: number; waiting: number; needHelp: number; noResponse: number;
};
export type Scenario = {
  id: string; name: string; location: string; mode: ScenarioMode; updatedAt: string;
  buildings: Building[]; infrastructure: InfrastructureAsset[]; flood: FloodScenario;
  population: {
    total: number; mobilityAssistance: number; accessibleShelterRequired: number;
    evacuationDemand?: number; accommodationRequired?: number; accommodationCategory?: string;
    tracking?: StatusCounts;
  };
  shelters: Shelter[]; vehicles: Vehicle[]; routes: Route[];
  safety: { safetyBufferMinutes: number; boardingBufferMinutes: number };
};
export type SimulationResult = {
  effectiveCapacity: number; remainingCapacity: number; shelterDeficit: number;
  accessibleDeficit: number; accommodationDeficit: number; transportCapacity: number; trips: number;
  evacuationMinutes: number | null;
  infrastructure: Array<InfrastructureAsset & { status: AssetStatus; failureReason: string }>;
  route: Route | null; floodArrivalMinutes: number | null;
  lastSafeDepartureMinutes: number | null; safetyMarginMinutes: number | null;
  feasible: boolean; nextAction: string; statusCounts: StatusCounts; estimationNote: string;
};

const demo: Scenario = {
  id: "demo-iiit-lucknow", name: "Illustrative campus scenario",
  location: "IIIT Lucknow-like campus", mode: "demo",
  updatedAt: "2026-10-11T00:00:00.000Z",
  buildings: [
    { id: "learning-commons", name: "Learning Commons", type: "academic", occupancy: 260, floors: 3, elevation: 1.7, accessibleExits: 2 },
    { id: "hostel-a", name: "Student Hostel A", type: "residential", occupancy: 840, floors: 5, elevation: 1.25, accessibleExits: 2 },
  ],
  infrastructure: [
    { id: "substation", name: "Electrical systems", type: "electrical", failureMinutes: 435, threshold: 1.1, dependsOn: [], status: "warning" },
    { id: "pump", name: "Water pumps", type: "pump", failureMinutes: 435, threshold: 0.6, dependsOn: ["substation"], status: "warning" },
    { id: "gate-one", name: "Gate 1", type: "gate", failureMinutes: 402, threshold: 0.8, dependsOn: [], status: "critical" },
    { id: "gate-two", name: "Gate 2", type: "gate", failureMinutes: 558, threshold: 1.8, dependsOn: [], status: "operational" },
  ],
  flood: {
    rainfallMmPerHour: 85, rainfallDurationHours: 6, floodDepth: 0.9,
    waterRiseRate: 0.12, arrivalMinutes: 760, forecastHorizonHours: 24,
    startTime: "2026-10-11T00:00", dataSource: "Synthetic demonstration fixture", arrivalMethod: "provided",
  },
  population: {
    total: 1100, mobilityAssistance: 12, accessibleShelterRequired: 12,
    evacuationDemand: 340, accommodationRequired: 340, accommodationCategory: "female",
    tracking: { safe: 760, inTransit: 260, waiting: 62, needHelp: 12, noResponse: 6 },
  },
  shelters: [
    { id: "north-shelter", name: "North shelter", beds: 400, water: 310, food: 370, sanitation: 350, currentOccupancy: 0, accessibleCapacity: 210, accommodationCapacity: 210 },
  ],
  vehicles: [
    { id: "bus-01", capacity: 52, count: 6, travelMinutes: 18, boardingMinutes: 12, unloadingMinutes: 8, returnMinutes: 22, available: true, accessible: true },
  ],
  routes: [
    { id: "gate-one-route", name: "Gate 1 → North shelter", gate: "gate-one", travelMinutes: 18, closureMinutes: 402, available: true },
    { id: "gate-two-route", name: "Gate 2 → North shelter", gate: "gate-two", travelMinutes: 26, closureMinutes: 558, available: true },
  ],
  safety: { safetyBufferMinutes: 30, boardingBufferMinutes: 12 },
};

export function createDemoScenario(): Scenario { return structuredClone(demo); }
export function createCustomScenario(): Scenario {
  const example = createDemoScenario();
  return {
    ...example, id: `custom-${Date.now()}`, name: "New custom scenario", location: "",
    mode: "custom", updatedAt: new Date().toISOString(), buildings: [], infrastructure: [],
    population: { total: 0, mobilityAssistance: 0, accessibleShelterRequired: 0 },
    shelters: [], vehicles: [], routes: [],
    flood: {
      rainfallMmPerHour: 0, rainfallDurationHours: 0, floodDepth: 0,
      waterRiseRate: 0, arrivalMinutes: null, forecastHorizonHours: 24,
      startTime: "", dataSource: "User-entered assumption", arrivalMethod: "insufficient",
    },
  };
}

/** Ready-to-edit, valid custom inputs for exploring the entire workflow. */
export function createExampleCustomScenario(): Scenario {
  const s = createDemoScenario();
  return {
    ...s,
    id: `example-${Date.now()}`,
    name: "Sample campus evacuation - edit me",
    location: "Illustrative campus / user editable",
    mode: "custom",
    updatedAt: new Date().toISOString(),
    population: {
      ...s.population,
      evacuationDemand: 340,
      accommodationRequired: 180,
      accommodationCategory: "designated",
      accessibleShelterRequired: 12,
      tracking: undefined,
    },
    shelters: s.shelters.map(sh => ({ ...sh, beds: 520, water: 510, food: 500, sanitation: 500, accessibleCapacity: 35, accommodationCapacity: 250 })),
  };
}

const valid = (n: number) => Number.isFinite(n) && n >= 0;
const integer = (n: number) => valid(n) && Number.isInteger(n);
const unique = (ids: string[]) => new Set(ids).size === ids.length;

export function validateScenario(s: Scenario): string[] {
  const errors: string[] = [];
  if (!s.name.trim()) errors.push("Enter a scenario name.");
  if (!s.location.trim()) errors.push("Enter a campus/location.");
  if (!integer(s.population.total) || s.population.total === 0) errors.push("Population must be a positive whole number.");
  if (s.population.evacuationDemand !== undefined && (!integer(s.population.evacuationDemand) || s.population.evacuationDemand > s.population.total)) errors.push("Evacuation demand must be between 0 and total population.");
  if (s.population.accommodationRequired !== undefined && (!integer(s.population.accommodationRequired) || s.population.accommodationRequired > (s.population.evacuationDemand ?? s.population.total))) errors.push("Category accommodation demand must be within evacuation demand.");
  if (!integer(s.population.mobilityAssistance) || s.population.mobilityAssistance > s.population.total) errors.push("Mobility assistance count must be between 0 and total population.");
  if (!integer(s.population.accessibleShelterRequired) || s.population.accessibleShelterRequired > s.population.total) errors.push("Accessible shelter requirement must be between 0 and total population.");
  if (s.buildings.some(b => !b.id || !b.name.trim() || !integer(b.occupancy) || !integer(b.floors) || b.floors < 1 || !valid(b.elevation) || !integer(b.accessibleExits))) errors.push("Check building names, occupancy, floors and elevation.");
  if (!unique(s.buildings.map(b => b.id))) errors.push("Building IDs must be unique.");
  if (s.buildings.length && s.buildings.reduce((n, b) => n + b.occupancy, 0) !== s.population.total) errors.push("Building occupancy must add up to total population.");
  if ([s.flood.rainfallMmPerHour, s.flood.rainfallDurationHours, s.flood.floodDepth, s.flood.waterRiseRate, s.flood.forecastHorizonHours].some(n => !valid(n))) errors.push("Flood inputs must be nonnegative finite numbers.");
  if (s.flood.arrivalMinutes !== null && !valid(s.flood.arrivalMinutes)) errors.push("Flood arrival must be a nonnegative number of minutes.");
  if (s.flood.arrivalMinutes === null && (s.flood.waterRiseRate <= 0 || s.flood.floodDepth <= 0)) errors.push("Provide estimated flood arrival, or both positive depth and rise rate for a simplified estimate.");
  if (!s.shelters.length) errors.push("Add at least one shelter.");
  if (!unique(s.shelters.map(x => x.id))) errors.push("Shelter IDs must be unique.");
  if (s.shelters.some(x => !x.name.trim() || ![x.beds, x.water, x.food, x.sanitation, x.currentOccupancy, x.accessibleCapacity].every(integer) || x.currentOccupancy > Math.min(x.beds, x.water, x.food, x.sanitation) || x.accessibleCapacity > x.beds || !integer(x.accommodationCapacity ?? 0) || (x.accommodationCapacity ?? 0) > x.beds)) errors.push("Check shelter names, capacities, and current occupancy.");
  if (!s.vehicles.length) errors.push("Add at least one transport vehicle group.");
  if (!unique(s.vehicles.map(x => x.id))) errors.push("Vehicle group IDs must be unique.");
  if (s.vehicles.some(x => !integer(x.capacity) || !integer(x.count) || ![x.travelMinutes, x.boardingMinutes, x.unloadingMinutes, x.returnMinutes].every(valid))) errors.push("Check vehicle seats, counts, and travel times.");
  if (!s.routes.length) errors.push("Add at least one route.");
  if (!unique(s.routes.map(x => x.id))) errors.push("Route IDs must be unique.");
  if (s.routes.some(x => !x.name.trim() || !x.gate.trim() || !valid(x.travelMinutes) || !valid(x.closureMinutes))) errors.push("Check route names, gate IDs, and timing.");
  if (!unique(s.infrastructure.map(x => x.id))) errors.push("Infrastructure IDs must be unique.");
  const ids = new Set(s.infrastructure.map(x => x.id));
  if (s.infrastructure.some(x => !x.name.trim() || !valid(x.failureMinutes) || !valid(x.threshold) || x.dependsOn.some(dep => !ids.has(dep) || dep === x.id))) errors.push("Check infrastructure names, thresholds, failure times and dependency IDs.");
  if (![s.safety.safetyBufferMinutes, s.safety.boardingBufferMinutes].every(valid)) errors.push("Safety buffers must be nonnegative.");
  if (s.population.tracking) {
    const t = s.population.tracking;
    if (!Object.values(t).every(integer) || Object.values(t).reduce((a,b) => a+b, 0) !== s.population.total) errors.push("Tracking status counts must add up to total population.");
  }
  return errors;
}

function estimateArrival(f: FloodScenario): { minutes: number | null; note: string } {
  if (f.arrivalMinutes !== null && valid(f.arrivalMinutes)) return { minutes: f.arrivalMinutes, note: "User-provided flood-arrival assumption; not a verified forecast." };
  if (f.waterRiseRate > 0 && f.floodDepth > 0) return { minutes: f.floodDepth / f.waterRiseRate * 60, note: "Simplified depth/rise-rate scenario; not a calibrated hydrological forecast." };
  return { minutes: null, note: "Insufficient data to estimate flood arrival." };
}

function infrastructureResults(s: Scenario, gateOneEarlier: boolean, disruptedGateId: string): SimulationResult["infrastructure"] {
  const failure = new Map(s.infrastructure.map(x => [x.id, Math.max(0, x.failureMinutes - (gateOneEarlier && x.id === disruptedGateId ? 120 : 0))]));
  // Relax dependency graph at most N times; cycles are not treated as verified forecasts.
  for (let i = 0; i < s.infrastructure.length; i++) {
    let changed = false;
    for (const asset of s.infrastructure) {
      const dependentFailure = asset.dependsOn.reduce((n, dep) => Math.min(n, failure.get(dep) ?? Infinity), failure.get(asset.id) ?? Infinity);
      if (dependentFailure < (failure.get(asset.id) ?? Infinity)) { failure.set(asset.id, dependentFailure); changed = true; }
    }
    if (!changed) break;
  }
  return s.infrastructure.map(asset => {
    const failureMinutes = failure.get(asset.id) ?? asset.failureMinutes;
    const upstream = asset.dependsOn.some(dep => (failure.get(dep) ?? Infinity) <= failureMinutes);
    const status: AssetStatus = asset.status === "unavailable" ? "unavailable" : s.flood.floodDepth >= asset.threshold ? "critical" : failureMinutes <= 120 ? "warning" : "operational";
    return { ...asset, failureMinutes, status, failureReason: upstream ? "Dependent on an upstream asset deadline." : status === "critical" ? "Configured depth threshold reached (illustrative)." : "Configured scenario assumption." };
  });
}

export function calculateScenario(s: Scenario, options: { gateOneEarlier?: boolean; disruptedGateId?: string } = {}): SimulationResult {
  const arrival = estimateArrival(s.flood);
  const disruptedGateId = options.disruptedGateId ?? "gate-one";
  const infrastructure = infrastructureResults(s, Boolean(options.gateOneEarlier), disruptedGateId);
  const effectiveCapacity = s.shelters.reduce((sum, sh) => sum + Math.max(0, Math.min(sh.beds, sh.water, sh.food, sh.sanitation)), 0);
  const remainingCapacity = s.shelters.reduce((sum, sh) => sum + Math.max(0, Math.min(sh.beds, sh.water, sh.food, sh.sanitation) - sh.currentOccupancy), 0);
  const demand = s.population.evacuationDemand ?? s.population.total;
  const shelterDeficit = Math.max(0, demand - remainingCapacity);
  const accessibleRemaining = s.shelters.reduce((sum, sh) => sum + Math.min(sh.accessibleCapacity, Math.max(0, Math.min(sh.beds, sh.water, sh.food, sh.sanitation) - sh.currentOccupancy)), 0);
  const accessibleDeficit = Math.max(0, s.population.accessibleShelterRequired - accessibleRemaining);
  const accommodationRemaining = s.shelters.reduce((sum, sh) => sum + Math.min(sh.accommodationCapacity ?? 0, Math.max(0, Math.min(sh.beds, sh.water, sh.food, sh.sanitation) - sh.currentOccupancy)), 0);
  const accommodationDeficit = Math.max(0, (s.population.accommodationRequired ?? 0) - accommodationRemaining);
  const activeVehicles = s.vehicles.filter(v => v.available && v.capacity > 0 && v.count > 0);
  const transportCapacity = activeVehicles.reduce((sum, v) => sum + v.capacity * v.count, 0);
  const trips = transportCapacity > 0 ? Math.ceil(demand / transportCapacity) : 0;
  const routes = s.routes.filter(r => r.available).map(r => {
    const gate = infrastructure.find(a => a.id === r.gate);
    const adjustedClosure = Math.max(0, r.closureMinutes - (options.gateOneEarlier && r.gate === disruptedGateId ? 120 : 0));
    return { ...r, closureMinutes: Math.min(adjustedClosure, gate?.failureMinutes ?? Infinity), blocked: gate?.status === "unavailable" };
  }).filter(r => !r.blocked);
  // When testing an early Gate 1 closure, prefer a configured alternative route.
  const orderedRoutes = options.gateOneEarlier ? [...routes.filter(r => r.gate !== disruptedGateId), ...routes.filter(r => r.gate === "gate-one")] : routes;
  const electrical = infrastructure.filter(a => a.type === "electrical").map(a => a.failureMinutes);
  const routeOptions = orderedRoutes.map(candidate => {
    const travel = candidate.travelMinutes;
    const firstWave = activeVehicles.length ? Math.max(...activeVehicles.map(v => v.boardingMinutes + travel + v.unloadingMinutes)) : 0;
    const cycle = activeVehicles.length ? Math.max(...activeVehicles.map(v => v.boardingMinutes + travel + v.unloadingMinutes + v.returnMinutes)) : 0;
    const duration = transportCapacity > 0 && demand > 0 ? firstWave + Math.max(0, trips - 1) * cycle : null;
    const constraints = [arrival.minutes, candidate.closureMinutes, ...electrical].filter((n): n is number => n !== null && Number.isFinite(n));
    const cutoff = constraints.length ? Math.min(...constraints) : null;
    const departure = cutoff !== null && duration !== null ? Math.floor(cutoff - duration - s.safety.safetyBufferMinutes - s.safety.boardingBufferMinutes) : null;
    return { route: candidate, duration, departure };
  });
  const selected = routeOptions.find(option => option.departure !== null && option.departure >= 0) ?? routeOptions[0];
  const route = selected?.route ?? null;
  const evacuationMinutes = selected?.duration ?? null;
  const rawDeparture = selected?.departure ?? null;
  const capacityOkay = shelterDeficit === 0 && accessibleDeficit === 0 && accommodationDeficit === 0;
  const accessibleTransportOkay = s.population.mobilityAssistance === 0 || activeVehicles.some(v => v.accessible);
  const feasible = Boolean(route && arrival.minutes !== null && capacityOkay && accessibleTransportOkay && transportCapacity > 0 && rawDeparture !== null && rawDeparture >= 0);
  // Never label a time as "last safe departure" if the full population cannot be accommodated.
  const lastSafeDepartureMinutes = feasible ? rawDeparture : null;
  const safetyMarginMinutes = feasible ? rawDeparture : null;
  let nextAction = "Review missing inputs and planning constraints before relying on this scenario.";
  if (accommodationDeficit > 0) nextAction = `Secure ${accommodationDeficit} additional ${s.population.accommodationCategory || "category-specific"} accommodation places.`;
  else if (shelterDeficit > 0) nextAction = `Add shelter resources for ${shelterDeficit} more people before a complete plan is possible.`;
  else if (accessibleDeficit > 0) nextAction = `Provide ${accessibleDeficit} additional accessible shelter places.`;
  else if (!transportCapacity) nextAction = "Configure available buses and seats before planning transport.";
  else if (!accessibleTransportOkay) nextAction = "Provide accessible transport for people requiring mobility assistance.";
  else if (!route) nextAction = "Configure an available evacuation route; no route is currently usable.";
  else if (arrival.minutes === null) nextAction = "Provide a flood-arrival assumption to evaluate departure feasibility.";
  else if (!feasible) nextAction = "No feasible full-population departure window under the current timing assumptions.";
  else if (lastSafeDepartureMinutes !== null && lastSafeDepartureMinutes < 60) nextAction = "Estimated departure window is under one hour; review the plan urgently.";
  else nextAction = "Scenario constraints currently fit the estimated window; review assumptions and assignments.";
  const statusCounts: StatusCounts = s.population.tracking ?? { safe: 0, inTransit: 0, waiting: Math.max(0, s.population.total - s.population.mobilityAssistance), needHelp: Math.min(s.population.total, s.population.mobilityAssistance), noResponse: 0 };
  return {
    effectiveCapacity, remainingCapacity, shelterDeficit, accessibleDeficit, accommodationDeficit, transportCapacity,
    trips, evacuationMinutes, infrastructure, route, floodArrivalMinutes: arrival.minutes,
    lastSafeDepartureMinutes, safetyMarginMinutes, feasible, nextAction, statusCounts,
    estimationNote: `${arrival.note} Fleet-wave and route timing are simplified planning estimates.`,
  };
}

export const scenarioStorageKey = "cascadeos-scenarios-v1";
