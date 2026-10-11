import type { Scenario, SimulationResult } from "./scenario";

/** Human-readable planning interpretation of the deterministic scenario outputs. */
export function decisionStatus(result: SimulationResult): { label: string; tone: "ready" | "review" | "unknown" } {
  if (result.feasible) return { label: "Constraints satisfied", tone: "ready" };
  if (result.floodArrivalMinutes === null) return { label: "Arrival unverified", tone: "unknown" };
  return { label: "Planning gaps detected", tone: "review" };
}

export function comparisonVerdict(base: SimulationResult, changed: SimulationResult): string {
  const baseRoute = base.route?.name ?? "No available route";
  const changedRoute = changed.route?.name ?? "No available route";
  const routeText = baseRoute === changedRoute
    ? `The selected route remains ${baseRoute}.`
    : `The selected route changes from ${baseRoute} to ${changedRoute}.`;

  let timingText: string;
  if (base.lastSafeDepartureMinutes === null || changed.lastSafeDepartureMinutes === null) {
    timingText = "A verified departure comparison is unavailable because at least one plan fails the modeled constraints.";
  } else {
    const delta = changed.lastSafeDepartureMinutes - base.lastSafeDepartureMinutes;
    timingText = delta === 0
      ? "The calculated departure window is unchanged."
      : delta < 0
        ? `The calculated last safe departure becomes ${Math.abs(delta)} minutes earlier.`
        : `The calculated last safe departure becomes ${delta} minutes later under these assumptions.`;
  }

  const shortageText = changed.shelterDeficit > base.shelterDeficit
    ? `Shelter shortfall increases by ${changed.shelterDeficit - base.shelterDeficit} people.`
    : changed.shelterDeficit < base.shelterDeficit
      ? `Shelter shortfall decreases by ${base.shelterDeficit - changed.shelterDeficit} people.`
      : `Shelter shortfall remains ${changed.shelterDeficit} people.`;

  return `${routeText} ${timingText} ${shortageText} ${changed.feasible ? "The modified plan satisfies the modeled constraints." : "The modified plan needs review."}`;
}

export function decisionPriorities(scenario: Scenario, result: SimulationResult): string[] {
  const priorities: string[] = [];
  if (result.shelterDeficit > 0) priorities.push(`Identify ${result.shelterDeficit} additional shelter places.`);
  if (result.accessibleDeficit > 0) priorities.push(`Address ${result.accessibleDeficit} accessible shelter place(s).`);
  if (result.accommodationDeficit > 0) priorities.push(`Address ${result.accommodationDeficit} category-specific accommodation place(s).`);
  if (result.transportCapacity === 0 && (scenario.population.evacuationDemand ?? scenario.population.total) > 0) priorities.push("Add available evacuation transport.");
  if (!result.route) priorities.push("Review route availability and closure assumptions.");
  if (result.floodArrivalMinutes === null) priorities.push("Supply an assumed flood-arrival time or rise rate to calculate a planning window.");
  if (!priorities.length) priorities.push(result.nextAction);
  return priorities.slice(0, 3);
}
