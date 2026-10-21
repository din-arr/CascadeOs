import { calculateScenario, validateScenario, type Scenario } from "../../lib/scenario";
import { estimateFloodArrival, type FloodSignalInputs } from "../../lib/upstream";
type GatewayEvent = { body?: string | null; requestContext?: { http?: { method?: string } } };
const json = (statusCode: number, data: unknown) => ({
  statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(data),
});
export async function handler(event: GatewayEvent) {
  if (event.requestContext?.http?.method && event.requestContext.http.method !== "POST")
    return json(405, { error: "Method not allowed" });
  if (!event.body || event.body.length > 250_000) return json(400, { error: "Missing or oversized request" });
  let request: { scenario?: Scenario; upstream?: FloodSignalInputs };
  try { request = JSON.parse(event.body); } catch { return json(400, { error: "Invalid JSON" }); }
  if (!request || !request.scenario || typeof request.scenario !== "object")
    return json(400, { error: "Scenario required" });
  let errors: string[];
  try { errors = validateScenario(request.scenario); }
  catch { return json(400, { error: "Malformed scenario" }); }
  if (errors.length) return json(422, { error: "Invalid scenario", details: errors });
  const scenario = request.scenario;
  const disruptedGateId = scenario.infrastructure.find(asset => asset.type === "gate")?.id ?? "gate-one";
  const baseline = calculateScenario(scenario);
  const earlierGate = calculateScenario(scenario, { gateOneEarlier: true, disruptedGateId });
  let upstream = null;
  if (request.upstream) {
    const values = Object.values(request.upstream);
    if (values.some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0))
      return json(422, { error: "Upstream inputs must be finite nonnegative numbers" });
    upstream = estimateFloodArrival(request.upstream);
  }
  return json(200, {
    engine: "aws-lambda", modelVersion: "illustrative-v1",
    calculatedAt: new Date().toISOString(), baseline, earlierGate, upstream,
    disclaimer: "Illustrative model only. Not an official flood forecast or operational evacuation instruction.",
  });
}
