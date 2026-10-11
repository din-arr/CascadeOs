import test from "node:test";
import assert from "node:assert/strict";
import { createDemoScenario, calculateScenario } from "../lib/scenario.ts";
import { comparisonVerdict, decisionPriorities, decisionStatus } from "../lib/decision.ts";

test("decision status and priorities reflect actual modeled constraints", () => {
  const s = createDemoScenario();
  const result = calculateScenario(s);
  assert.equal(decisionStatus(result).tone, result.feasible ? "ready" : "review");
  assert.ok(decisionPriorities(s, result).length > 0);
  if (result.shelterDeficit) assert.match(decisionPriorities(s, result).join(" "), /shelter/i);
});

test("comparison verdict reports route and timing changes from results", () => {
  const s = createDemoScenario();
  const baseline = calculateScenario(s);
  const modified = calculateScenario(s, { gateOneEarlier: true, disruptedGateId: "gate-one" });
  const verdict = comparisonVerdict(baseline, modified);
  assert.ok(verdict.includes(modified.route?.name ?? "No available route"));
  assert.match(verdict, /Shelter shortfall/);
  assert.match(verdict, /departure/);
});

test("unverified departure never invents a timing difference", () => {
  const s = createDemoScenario();
  const base = calculateScenario(s);
  const modified = { ...base, lastSafeDepartureMinutes: null, feasible: false };
  assert.match(comparisonVerdict(base, modified), /unavailable/);
});
