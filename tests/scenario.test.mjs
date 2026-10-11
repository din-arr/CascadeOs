import test from "node:test";
import assert from "node:assert/strict";
import { createDemoScenario, createCustomScenario, validateScenario, calculateScenario } from "../lib/scenario.ts";

test("demo scenario returns a deterministic result", () => {
  const scenario = createDemoScenario();
  const a = calculateScenario(scenario);
  const b = calculateScenario(scenario);
  assert.deepEqual(a, b);
});

test("custom scenario starts with user-entered fields", () => {
  const scenario = createCustomScenario();
  assert.equal(scenario.mode, "custom");
  assert.equal(scenario.population.total, 0);
  assert.ok(validateScenario(scenario).length > 0);
});
