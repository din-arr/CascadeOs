import test from "node:test";
import assert from "node:assert/strict";
import { calculateUpstreamImpact, estimateExposedPeople } from "../lib/upstream.ts";

test("upstream pulse is attenuated by retention and channel loss", () => {
  const r = calculateUpstreamImpact({ localDepth: 0.9, upstreamPeakDepth: 2, retentionPercent: 25, channelLossPercent: 20, travelMinutes: 90 });
  assert.equal(r.arrivingPulseDepth, 1.2);
  assert.equal(r.downstreamDepth, 2.1);
  assert.equal(r.travelMinutes, 90);
});

test("full retention eliminates additional downstream depth", () => {
  const r = calculateUpstreamImpact({ localDepth: 0.9, upstreamPeakDepth: 5, retentionPercent: 100, channelLossPercent: 0, travelMinutes: 30 });
  assert.equal(r.downstreamDepth, 0.9);
});

test("input sanitization prevents negative water depths", () => {
  const r = calculateUpstreamImpact({ localDepth: -1, upstreamPeakDepth: -5, retentionPercent: -10, channelLossPercent: 300, travelMinutes: -2 });
  assert.equal(r.downstreamDepth, 0);
  assert.equal(r.travelMinutes, 0);
});

test("exposure screening uses building elevation and occupancy", () => {
  const b = [{ occupancy: 260, elevation: 1.7 }, { occupancy: 840, elevation: 1.25 }];
  assert.equal(estimateExposedPeople(0.9, 1100, b), 0);
  assert.equal(estimateExposedPeople(1.5, 1100, b), 840);
  assert.equal(estimateExposedPeople(2.2, 1100, b), 1100);
});

import { estimateFloodArrival } from "../lib/upstream.ts";
const example = { localDepth: 0.4, upstreamPeakDepth: 1, retentionPercent: 20, channelLossPercent: 10, travelMinutes: 0, rainfallMmPerHour: 100, rainfallHours: 2, riverRiseMeters: 0.5, distanceKm: 24, flowSpeedKmh: 12, runoffLagMinutes: 15 };

test("estimated arrival derives from distance, wave speed and rain response lag", () => {
  const r = estimateFloodArrival(example);
  assert.equal(r.estimatedArrivalMinutes, 135);
  assert.equal(r.rainfallRunoffDepth, 0.13);
  assert.equal(r.totalUpstreamPulse, 1.63);
  assert.ok(r.downstreamDepth > r.localDepth);
});

test("river-only event does not add rainfall response lag", () => {
  const r = estimateFloodArrival({ ...example, rainfallMmPerHour: 0, rainfallHours: 0 });
  assert.equal(r.estimatedArrivalMinutes, 120);
});

test("full retention gives no incoming pulse and no arrival estimate", () => {
  const r = estimateFloodArrival({ ...example, retentionPercent: 100 });
  assert.equal(r.estimatedArrivalMinutes, null);
  assert.equal(r.downstreamDepth, example.localDepth);
});

test("missing wave speed makes ETA unavailable", () => {
  const r = estimateFloodArrival({ ...example, flowSpeedKmh: 0 });
  assert.equal(r.estimatedArrivalMinutes, null);
});

test("high modeled depth raises risk level", () => {
  const r = estimateFloodArrival({ ...example, localDepth: 3.1 });
  assert.equal(r.riskLevel, "SEVERE");
});
