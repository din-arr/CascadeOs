import test from "node:test";
import assert from "node:assert/strict";
import { createExampleCustomScenario, validateScenario, calculateScenario } from "../lib/scenario.ts";
import { scenarioReportLines, buildScenarioPdf } from "../lib/report.ts";

test("example custom scenario passes all seven-stage input validations", () => {
  const scenario = createExampleCustomScenario();
  assert.deepEqual(validateScenario(scenario), []);
  assert.equal(scenario.mode, "custom");
  assert.ok(calculateScenario(scenario).feasible);
});

test("what-if changes selected route and never changes original scenario", () => {
  const scenario = createExampleCustomScenario();
  const before = JSON.stringify(scenario);
  const base = calculateScenario(scenario);
  const disrupted = calculateScenario(scenario, { gateOneEarlier: true, disruptedGateId: "gate-one" });
  assert.notEqual(base.route?.name, disrupted.route?.name);
  assert.equal(JSON.stringify(scenario), before);
});

test("what-if can target custom gate IDs", () => {
  const scenario = createExampleCustomScenario();
  scenario.infrastructure = scenario.infrastructure.map(asset => asset.id === "gate-one" ? { ...asset, id: "south-gate" } : asset);
  scenario.routes = scenario.routes.map(route => route.gate === "gate-one" ? { ...route, gate: "south-gate" } : route);
  const base = calculateScenario(scenario);
  const disrupted = calculateScenario(scenario, { gateOneEarlier: true, disruptedGateId: "south-gate" });
  assert.notEqual(base.route?.name, disrupted.route?.name);
});

test("report contains assumptions, action, routes and constraints", () => {
  const scenario = createExampleCustomScenario();
  const base = calculateScenario(scenario);
  const changed = calculateScenario(scenario, { gateOneEarlier: true });
  const text = scenarioReportLines(scenario, base, changed).map(line => line.text).join("\n");
  for (const key of ["Scenario details", "Infrastructure failure windows", "Shelters, transport and routes", "What-if", "Model limitations", "Recommended action"]) assert.ok(text.includes(key));
  assert.ok(buildScenarioPdf(scenarioReportLines(scenario, base, changed)).length > 1000);
});
