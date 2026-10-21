"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FloodAsset } from "@/components/FloodScene";
import { downloadScenarioPdf } from "@/lib/report";
import { comparisonVerdict, decisionPriorities, decisionStatus } from "@/lib/decision";
import { estimateFloodArrival, estimateExposedPeople, type FloodSignalInputs } from "@/lib/upstream";
import { assessLiveSignalAlert, type LiveFloodSignals } from "@/lib/live-signals";
import CinematicMotion from "@/components/CinematicMotion";
import {
  calculateScenario,
  createCustomScenario,
  createExampleCustomScenario,
  createDemoScenario,
  scenarioStorageKey,
  type Scenario,
  type SimulationResult,
  validateScenario,
} from "@/lib/scenario";

const FloodScene = dynamic(() => import("@/components/FloodScene"), {
  ssr: false,
  loading: () => <div className="scene-fallback">Loading flood model…</div>,
});

const savedListKey = "cascadeos-saved-scenarios-v2";

const statuses: [string, keyof SimulationResult["statusCounts"], string][] = [
  ["SAFE", "safe", "safe"], ["IN TRANSIT", "inTransit", "transit"], ["WAITING", "waiting", "waiting"],
  ["NEED HELP", "needHelp", "danger"], ["NO RESPONSE", "noResponse", "muted"],
];

function Field({ label, value, onChange, type = "text", min }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; min?: number }) {
  const [text, setText] = useState(String(value));

  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  return (
    <label className="scenario-field">
      <span>{label}</span>
      <input
        type={type}
        min={min}
        value={editing ? text : String(value)}
        onFocus={() => setEditing(true)}
        onChange={(event) => {
          const s = event.target.value;
          setText(s);
          if (type !== "number" || (s.trim() !== "" && Number.isFinite(Number(s)) && (min === undefined || Number(s) >= min))) {
            onChange(s);
          }
        }}
        onBlur={() => {
          setEditing(false);
          setText(String(value));
        }}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="scenario-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="scenario-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function patchItem<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, i) => i === index ? { ...item, ...patch } : item);
}

function ScenarioBuilder({ scenario, onChange, onRun, onSave, onExample, onClose, errors }: {
  scenario: Scenario;
  onChange: (scenario: Scenario) => void;
  onRun: () => void;
  onSave: () => void;
  onExample: () => void;
  onClose: () => void;
  errors: string[];
}) {
  const [step, setStep] = useState(0);
  const steps = ["CAMPUS", "FLOOD", "INFRASTRUCTURE", "SHELTERS", "TRANSPORT", "ROUTES", "SAFETY & TRACKING"];
  const update = (patch: Partial<Scenario>) => onChange({ ...scenario, ...patch, updatedAt: new Date().toISOString() });
  const flood = (patch: Partial<Scenario["flood"]>) => update({ flood: { ...scenario.flood, ...patch } });
  const num = (value: string) => value === "" ? 0 : Number(value);
  const count = (value: string) => Math.max(0, Math.floor(num(value)));
  const addId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const group = (title: string, content: ReactNode, onRemove: () => void, id: string) => <div className="scenario-group" key={id}><div className="scenario-group-head"><strong>{title}</strong><button type="button" onClick={onRemove}>REMOVE ×</button></div><div className="scenario-fields">{content}</div></div>;
  const tracking = scenario.population.tracking ?? { safe: 0, inTransit: 0, waiting: scenario.population.total, needHelp: 0, noResponse: 0 };
  return <section className="scenario-builder" aria-label="Custom scenario builder">
    <div className="builder-heading"><div><p className="eyebrow glacier">CUSTOM SCENARIO / {steps[step]}</p><h2>Build the inputs.</h2></div><button type="button" className="builder-close" onClick={onClose}>CLOSE ×</button></div>
    {errors.length > 0 && <div className="scenario-errors scenario-errors-top" role="alert"><strong>CHECK THESE INPUTS BEFORE RUNNING</strong>{errors.map((error, i) => <p key={`${i}-${error}`}>{error}</p>)}</div>}
    <div className="builder-quickstart"><span>START HERE / Load realistic editable example values, or fill each tab manually.</span><button type="button" onClick={onExample}>LOAD EXAMPLE INPUTS ↗</button></div>
    <div className="builder-progress">{steps.map((name, index) => <button type="button" className={index === step ? "active" : ""} key={name} onClick={() => setStep(index)}>{String(index + 1).padStart(2, "0")} / {name}</button>)}</div>
    {step === 0 && <>
      <div className="scenario-fields"><Field label="Scenario name" value={scenario.name} onChange={value => update({ name: value })} /><Field label="Campus / city" value={scenario.location} onChange={value => update({ location: value })} /><Field label="Total population" type="number" min={0} value={scenario.population.total} onChange={value => update({ population: { ...scenario.population, total: count(value), tracking: undefined } })} /><Field label="People needing evacuation" type="number" min={0} value={scenario.population.evacuationDemand ?? scenario.population.total} onChange={value => update({ population: { ...scenario.population, evacuationDemand: count(value) } })} /><Field label="Category accommodation demand (optional)" type="number" min={0} value={scenario.population.accommodationRequired ?? 0} onChange={value => update({ population: { ...scenario.population, accommodationRequired: count(value) } })} /><Field label="Accommodation category label" value={scenario.population.accommodationCategory ?? ""} onChange={value => update({ population: { ...scenario.population, accommodationCategory: value } })} /><Field label="Mobility assistance required" type="number" min={0} value={scenario.population.mobilityAssistance} onChange={value => update({ population: { ...scenario.population, mobilityAssistance: count(value) } })} /><Field label="Accessible shelter places required" type="number" min={0} value={scenario.population.accessibleShelterRequired} onChange={value => update({ population: { ...scenario.population, accessibleShelterRequired: count(value) } })} /></div>
      <p className="scenario-note">Buildings are optional for an aggregate scenario. If entered, their occupancy must add up to total population.</p>
      {scenario.buildings.map((b, i) => group(`BUILDING ${i + 1}`, <><Field label="Building name" value={b.name} onChange={value => update({ buildings: patchItem(scenario.buildings, i, { name: value }) })} /><Field label="Occupancy" type="number" min={0} value={b.occupancy} onChange={value => update({ buildings: patchItem(scenario.buildings, i, { occupancy: count(value) }) })} /><Field label="Floors" type="number" min={1} value={b.floors} onChange={value => update({ buildings: patchItem(scenario.buildings, i, { floors: count(value) }) })} /><Field label="Elevation (m)" type="number" min={0} value={b.elevation} onChange={value => update({ buildings: patchItem(scenario.buildings, i, { elevation: num(value) }) })} /><Field label="Accessible exits" type="number" min={0} value={b.accessibleExits} onChange={value => update({ buildings: patchItem(scenario.buildings, i, { accessibleExits: count(value) }) })} /></>, () => update({ buildings: scenario.buildings.filter((_, j) => i !== j) }), b.id))}
      <button className="scenario-add" type="button" onClick={() => update({ buildings: [...scenario.buildings, { id: addId(), name: `Building ${scenario.buildings.length + 1}`, type: "campus", occupancy: 0, floors: 1, elevation: 1, accessibleExits: 1 }] })}>+ ADD BUILDING</button>
    </>}
    {step === 1 && <div className="scenario-fields"><Field label="Rainfall (mm/hour)" type="number" min={0} value={scenario.flood.rainfallMmPerHour} onChange={value => flood({ rainfallMmPerHour: num(value) })} /><Field label="Rainfall duration (hours)" type="number" min={0} value={scenario.flood.rainfallDurationHours} onChange={value => flood({ rainfallDurationHours: num(value) })} /><Field label="Flood depth (m)" type="number" min={0} value={scenario.flood.floodDepth} onChange={value => flood({ floodDepth: num(value) })} /><Field label="Water rise rate (m/hour)" type="number" min={0} value={scenario.flood.waterRiseRate} onChange={value => flood({ waterRiseRate: num(value) })} /><Field label="Estimated arrival (minutes; blank for simplified)" type="number" min={0} value={scenario.flood.arrivalMinutes ?? ""} onChange={value => flood({ arrivalMinutes: value === "" ? null : num(value), arrivalMethod: value === "" ? "simplified" : "provided" })} /><Field label="Source / assumption" value={scenario.flood.dataSource} onChange={value => flood({ dataSource: value })} /><Field label="Forecast horizon (hours)" type="number" min={0} value={scenario.flood.forecastHorizonHours} onChange={value => flood({ forecastHorizonHours: num(value) })} /></div>}
    {step === 2 && <>
      <p className="scenario-note">Enter failure times in minutes from scenario start. Dependencies are comma-separated asset IDs (shown below). An asset can only depend on configured IDs.</p>
      {scenario.infrastructure.map((a, i) => group(`${a.name} / ID: ${a.id}`, <><Field label="Asset name" value={a.name} onChange={value => update({ infrastructure: patchItem(scenario.infrastructure, i, { name: value }) })} /><SelectField label="Type" value={a.type} options={["electrical", "pump", "gate", "road", "communications"]} onChange={value => update({ infrastructure: patchItem(scenario.infrastructure, i, { type: value as typeof a.type }) })} /><Field label="Failure time (minutes)" type="number" min={0} value={a.failureMinutes} onChange={value => update({ infrastructure: patchItem(scenario.infrastructure, i, { failureMinutes: num(value) }) })} /><Field label="Depth threshold (m)" type="number" min={0} value={a.threshold} onChange={value => update({ infrastructure: patchItem(scenario.infrastructure, i, { threshold: num(value) }) })} /><Field label="Depends on IDs (comma-separated)" value={a.dependsOn.join(", ")} onChange={value => update({ infrastructure: patchItem(scenario.infrastructure, i, { dependsOn: value.split(",").map(x => x.trim()).filter(Boolean) }) })} /></>, () => update({ infrastructure: scenario.infrastructure.filter((_, j) => j !== i) }), a.id))}
      <button className="scenario-add" type="button" onClick={() => update({ infrastructure: [...scenario.infrastructure, { id: addId(), name: "New asset", type: "gate", failureMinutes: 600, threshold: 1, dependsOn: [], status: "operational" }] })}>+ ADD INFRASTRUCTURE ASSET</button>
    </>}
    {step === 3 && <>
      {scenario.shelters.map((s, i) => group(`SHELTER ${i + 1}`, <><Field label="Shelter name" value={s.name} onChange={value => update({ shelters: patchItem(scenario.shelters, i, { name: value }) })} />{(["beds", "water", "food", "sanitation", "currentOccupancy", "accessibleCapacity", "accommodationCapacity"] as const).map(key => <Field key={key} label={`${key} (persons)`} type="number" min={0} value={s[key] ?? 0} onChange={value => update({ shelters: patchItem(scenario.shelters, i, { [key]: count(value) }) })} />)}</>, () => update({ shelters: scenario.shelters.filter((_, j) => j !== i) }), s.id))}
      <button className="scenario-add" type="button" onClick={() => update({ shelters: [...scenario.shelters, { id: addId(), name: `Shelter ${scenario.shelters.length + 1}`, beds: 0, water: 0, food: 0, sanitation: 0, currentOccupancy: 0, accessibleCapacity: 0, accommodationCapacity: 0 }] })}>+ ADD SHELTER</button>
    </>}
    {step === 4 && <>
      {scenario.vehicles.map((v, i) => group(`VEHICLE GROUP ${i + 1}`, <><Field label="Number of vehicles" type="number" min={0} value={v.count} onChange={value => update({ vehicles: patchItem(scenario.vehicles, i, { count: count(value) }) })} /><Field label="Seats per vehicle" type="number" min={0} value={v.capacity} onChange={value => update({ vehicles: patchItem(scenario.vehicles, i, { capacity: count(value) }) })} />{(["travelMinutes", "boardingMinutes", "unloadingMinutes", "returnMinutes"] as const).map(key => <Field key={key} label={key.replace("Minutes", " time (min)")} type="number" min={0} value={v[key]} onChange={value => update({ vehicles: patchItem(scenario.vehicles, i, { [key]: num(value) }) })} />)}<CheckField label="Available" checked={v.available} onChange={value => update({ vehicles: patchItem(scenario.vehicles, i, { available: value }) })} /><CheckField label="Accessible vehicle" checked={v.accessible} onChange={value => update({ vehicles: patchItem(scenario.vehicles, i, { accessible: value }) })} /></>, () => update({ vehicles: scenario.vehicles.filter((_, j) => j !== i) }), v.id))}
      <button className="scenario-add" type="button" onClick={() => update({ vehicles: [...scenario.vehicles, { id: addId(), capacity: 40, count: 1, travelMinutes: 20, boardingMinutes: 10, unloadingMinutes: 8, returnMinutes: 20, available: true, accessible: false }] })}>+ ADD VEHICLE GROUP</button>
    </>}
    {step === 5 && <>
      <p className="scenario-note">Route times and gate IDs are user-entered assumptions. This simplified planner does not infer road connectivity from maps.</p>
      {scenario.routes.map((r, i) => group(`ROUTE ${i + 1}`, <><Field label="Route name" value={r.name} onChange={value => update({ routes: patchItem(scenario.routes, i, { name: value }) })} /><Field label="Gate ID" value={r.gate} onChange={value => update({ routes: patchItem(scenario.routes, i, { gate: value }) })} /><Field label="One-way travel (minutes)" type="number" min={0} value={r.travelMinutes} onChange={value => update({ routes: patchItem(scenario.routes, i, { travelMinutes: num(value) }) })} /><Field label="Closure time (minutes from start)" type="number" min={0} value={r.closureMinutes} onChange={value => update({ routes: patchItem(scenario.routes, i, { closureMinutes: num(value) }) })} /><CheckField label="Route available" checked={r.available} onChange={value => update({ routes: patchItem(scenario.routes, i, { available: value }) })} /></>, () => update({ routes: scenario.routes.filter((_, j) => j !== i) }), r.id))}
      <button className="scenario-add" type="button" onClick={() => update({ routes: [...scenario.routes, { id: addId(), name: `Route ${scenario.routes.length + 1}`, gate: "gate-one", travelMinutes: 20, closureMinutes: 600, available: true }] })}>+ ADD ROUTE</button>
    </>}
    {step === 6 && <>
      <div className="scenario-fields"><Field label="Safety buffer (minutes)" type="number" min={0} value={scenario.safety.safetyBufferMinutes} onChange={value => update({ safety: { ...scenario.safety, safetyBufferMinutes: num(value) } })} /><Field label="Boarding buffer (minutes)" type="number" min={0} value={scenario.safety.boardingBufferMinutes} onChange={value => update({ safety: { ...scenario.safety, boardingBufferMinutes: num(value) } })} /></div>
      <p className="scenario-note">Tracking is optional. Leave it empty to show everyone as waiting, or enter actual aggregate statuses whose total equals the campus population.</p>
      <div className="scenario-fields">{(["safe", "inTransit", "waiting", "needHelp", "noResponse"] as const).map(key => <Field key={key} label={`Tracked: ${key}`} type="number" min={0} value={tracking[key]} onChange={value => update({ population: { ...scenario.population, tracking: { ...tracking, [key]: count(value) } } })} />)}</div>
      <button className="scenario-add" type="button" onClick={() => update({ population: { ...scenario.population, tracking: undefined } })}>RESET TRACKING TO ALL WAITING</button>
    </>}
    <div className="builder-actions"><button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>BACK</button><button type="button" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}>NEXT</button><button type="button" className="builder-secondary" onClick={onSave}>SAVE DRAFT</button><button type="button" className="builder-primary" onClick={onRun}>RUN SIMULATION</button></div>
    <p className="scenario-note">Saved locally on this device only. Inputs and derived results are illustrative, not certified flood forecasts or evacuation instructions.</p>
  </section>;
}

export default function SimulationPage() {
  const [mode, setMode] = useState<"demo" | "custom">("demo");
  const [scenario, setScenario] = useState<Scenario>(() => createDemoScenario());
  const [result, setResult] = useState<SimulationResult>(() => calculateScenario(createDemoScenario()));
  const [builderOpen, setBuilderOpen] = useState(false);
  const [demoChooserOpen, setDemoChooserOpen] = useState(false);
  const [showAllMonitors, setShowAllMonitors] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [gateOneEarlier, setGateOneEarlier] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0.9);
  const [timelineProgress, setTimelineProgress] = useState(0.28);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<"orbit" | "top">("orbit");
  const [resetKey, setResetKey] = useState(0);
  const [selected, setSelected] = useState<FloodAsset | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [notice, setNotice] = useState("");
  const [inputsPending, setInputsPending] = useState(false);
  const [cloudCompute, setCloudCompute] = useState<{ status: "idle" | "running" | "success" | "error"; message: string }>({ status: "idle", message: "" });
  const [cloudSave, setCloudSave] = useState<{ status: "idle" | "saving" | "saved" | "error"; message: string; id: string | null }>({ status: "idle", message: "", id: null });
  const [upstream, setUpstream] = useState<FloodSignalInputs>({
    localDepth: 0.9, upstreamPeakDepth: 1.2, retentionPercent: 25,
    channelLossPercent: 20, travelMinutes: 90,
    rainfallMmPerHour: 80, rainfallHours: 3, riverRiseMeters: 0.5,
    distanceKm: 18, flowSpeedKmh: 12, runoffLagMinutes: 20,
  });
  const [upstreamApplied, setUpstreamApplied] = useState(false);
  const [liveLocation, setLiveLocation] = useState({ lat: "26.8467", lon: "80.9462", site: "" });
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveFloodSignals | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [browserAlerts, setBrowserAlerts] = useState(false);
  const notifiedKey = useRef("");
  const state = result;
  const resourceTotals = { beds: 0, water: 0, food: 0, sanitation: 0 };
  for (const shelter of scenario.shelters) for (const key of ["beds", "water", "food", "sanitation"] as const) resourceTotals[key] += shelter[key];
  const visualDepth = Math.max(0, waterLevel * timelineProgress);
  const selectedDepth = selected ? Math.max(0, visualDepth - selected.elevation) : 0;
  const disruptedGate = scenario.infrastructure.find(asset => asset.type === "gate");
  const disruptedGateId = disruptedGate?.id ?? "gate-one";
  const disruptedGateName = disruptedGate?.name ?? "Gate 1";
  const upstreamImpact = useMemo(() => estimateFloodArrival(upstream), [upstream]);
  const liveAlert = useMemo(() => {
    if (!liveEnabled || !liveSignals) return null;
    const isFresh = (date: string) => Number.isFinite(Date.parse(date)) && Math.abs(Date.now() - Date.parse(date)) < 90 * 60 * 1000;
    const fresh = { ...liveSignals,
      rain: liveSignals.rain && isFresh(liveSignals.rain.observedAt) ? liveSignals.rain : null,
      river: liveSignals.river && isFresh(liveSignals.river.observedAt) ? liveSignals.river : null,
    };
    return assessLiveSignalAlert(fresh, upstreamImpact.estimatedArrivalMinutes);
  }, [liveEnabled, liveSignals, upstreamImpact.estimatedArrivalMinutes]);
  const upstreamScenario = useMemo(() => ({ ...scenario, flood: { ...scenario.flood, floodDepth: upstreamImpact.downstreamDepth, arrivalMinutes: upstreamImpact.estimatedArrivalMinutes ?? scenario.flood.arrivalMinutes } }), [scenario, upstreamImpact.downstreamDepth, upstreamImpact.estimatedArrivalMinutes]);
  const upstreamResult = useMemo(() => calculateScenario(upstreamScenario, { gateOneEarlier, disruptedGateId }), [upstreamScenario, gateOneEarlier, disruptedGateId]);
  const beforeExposure = estimateExposedPeople(upstreamImpact.localDepth, scenario.population.total, scenario.buildings);
  const afterExposure = estimateExposedPeople(upstreamImpact.downstreamDepth, scenario.population.total, scenario.buildings);
  const baseResult = useMemo(() => calculateScenario(scenario), [scenario]);
  const earlyGateResult = calculateScenario(scenario, {
    gateOneEarlier: true,
    disruptedGateId
    });
  const modelAssets = useMemo<FloodAsset[]>(() => {
    if (mode === "demo") return [];
    const fmt = (n: number) => `${Math.floor(n / 60)}h ${Math.round(n % 60)}m`;
    return [
      ...scenario.buildings.map(b => ({ id: b.id, name: b.name, type: "building" as const, elevation: b.elevation, risk: "warning" as const, deadline: "User-entered building" })),
      ...scenario.infrastructure.map(a => ({ id: a.id, name: a.name, type: (a.type === "electrical" ? "electrical" : a.type === "pump" ? "pump" : "gate") as FloodAsset["type"], elevation: a.threshold, risk: a.status === "critical" ? "critical" as const : "warning" as const, deadline: fmt(a.failureMinutes) })),
      ...scenario.shelters.map(sh => ({ id: sh.id, name: sh.name, type: "shelter" as const, elevation: 2.8, risk: "safe" as const, deadline: "Shelter resource assumption" })),
    ];
  }, [mode, scenario]);
  const selectedStatus = selected && gateOneEarlier && selected.id === "gate-one" ? "UNAVAILABLE" : selectedDepth > 0.7 ? "CRITICAL" : selectedDepth > 0.1 ? "AT RISK" : "OPERATIONAL";

  const refreshLive = async () => {
    const lat = Number(liveLocation.lat);
    const lon = Number(liveLocation.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setLiveError("Enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }
    setLiveLoading(true);
    setLiveError("");
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      if (liveLocation.site.trim()) params.set("site", liveLocation.site.trim());
      const response = await fetch(`/api/flood-signals?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load signals");
      setLiveSignals(data as LiveFloodSignals);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Live data is unavailable");
      setLiveSignals(null);
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    if (!liveEnabled) return;
    const refresh = async () => {
      const params = new URLSearchParams({ lat: liveLocation.lat, lon: liveLocation.lon });
      if (liveLocation.site.trim()) params.set("site", liveLocation.site.trim());
      try {
        const response = await fetch(`/api/flood-signals?${params}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Live data unavailable");
        setLiveSignals(data as LiveFloodSignals);
        setLiveError("");
      } catch (error) {
        setLiveSignals(null);
        setLiveError(error instanceof Error ? error.message : "Live data unavailable");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [liveEnabled, liveLocation.lat, liveLocation.lon, liveLocation.site]);

  useEffect(() => {
    if (!browserAlerts || !liveEnabled || !liveAlert || liveAlert.level !== "elevated") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `${liveSignals?.rain?.observedAt ?? ""}|${liveSignals?.river?.observedAt ?? ""}|${liveAlert.level}`;
    if (notifiedKey.current === key) return;
    notifiedKey.current = key;
    new Notification("CascadeOS upstream signal watch", { body: liveAlert.message });
  }, [browserAlerts, liveEnabled, liveAlert, liveSignals]);

  const enableBrowserAlerts = async () => {
    if (typeof Notification === "undefined") {
      setLiveError("Browser notifications are unavailable on this device. In-page alerts still work.");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserAlerts(permission === "granted");
    if (permission !== "granted") setLiveError("Browser notifications were not allowed; in-page alerts remain available.");
  };

  const useObservedSignals = () => {
    if (!liveSignals?.rain && !liveSignals?.river) {
      setLiveError("No available observations to apply.");
      return;
    }
    updateUpstream({
      ...(liveSignals.rain ? { rainfallMmPerHour: liveSignals.rain.mmPerHour } : {}),
      ...(liveSignals.river ? { riverRiseMeters: liveSignals.river.recentRiseMeters } : {}),
    });
    setNotice("Available observed/model-assisted signals applied as inputs to the illustrative flood scenario; wave speed and ETA remain assumptions.");
  };

  useEffect(() => { if (!playing) return; const interval = window.setInterval(() => setTimelineProgress((value) => (value + 0.004 * speed) % 1), 120); return () => window.clearInterval(interval); }, [playing, speed]);
  
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(scenarioStorageKey);

        if (saved) {
          const loaded = JSON.parse(saved) as Scenario;

          if (
            loaded?.mode === "custom" &&
            loaded.flood &&
            loaded.population &&
            Array.isArray(loaded.shelters) &&
            Array.isArray(loaded.routes) &&
            Array.isArray(loaded.vehicles) &&
            Array.isArray(loaded.infrastructure)
          ) {
            setScenario(loaded);
            setMode("custom");
            setWaterLevel(loaded.flood.floodDepth);
            setResult(calculateScenario(loaded));
            setUpstream(previous => ({ ...previous, localDepth: loaded.flood.floodDepth }));
            setUpstreamApplied(false);
            setBuilderOpen(false);
          }
        }
      } catch {
        // Demo remains available if browser storage cannot be read.
      }

      try {
        const raw = window.localStorage.getItem(savedListKey);

        if (raw) {
          const parsed: unknown = JSON.parse(raw);

          if (Array.isArray(parsed)) {
            setSavedScenarios(
              parsed.filter(
                (item): item is Scenario =>
                  Boolean(
                    item &&
                    typeof item === "object" &&
                    "id" in item &&
                    "flood" in item &&
                    "population" in item
                  )
              )
            );
          }
        }
      } catch {
        setNotice(
          "Saved scenario list could not be read; the demo is still available."
        );
      }
    });

  return () => window.cancelAnimationFrame(frame);
}, []);

const timelineLabel = `${Math.round(timelineProgress * 12)}h / 12h`;

  const useExample = () => {
    resetCloudSave();
    const next = createExampleCustomScenario();
    setScenario(next);
    setMode("custom");
    setResult(calculateScenario(next));
    setWaterLevel(next.flood.floodDepth);
    setUpstream(previous => ({ ...previous, localDepth: next.flood.floodDepth }));
    setUpstreamApplied(false);
    setGateOneEarlier(false);
    setErrors([]);
    setInputsPending(true);
    setNotice("Example inputs loaded. Review and run the simulation.");
  };

  const startGuidedDemo = () => {
    resetCloudSave();
    const next = createExampleCustomScenario();
    const issues = validateScenario(next);
    if (issues.length) {
      setNotice("The example scenario needs review before it can be demonstrated.");
      setErrors(issues);
      setBuilderOpen(true);
      return;
    }
    setScenario(next);
    setMode("custom");
    setResult(calculateScenario(next));
    setWaterLevel(next.flood.floodDepth);
    setUpstream(previous => ({ ...previous, localDepth: next.flood.floodDepth }));
    setUpstreamApplied(false);
    setGateOneEarlier(false);
    setPlaying(false);
    setTimelineProgress(0.28);
    setBuilderOpen(false);
    setSelected(null);
    setErrors([]);
    setInputsPending(false);
    setDemoChooserOpen(false);
    setWalkthroughActive(true);
    setNotice("Guided example ready. Explore the flood model, compare gate failure, and review the relocation plan below.");
    window.requestAnimationFrame(() => document.getElementById("simulation-model")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const loadSaved = (id: string) => {
    resetCloudSave();
    const found = savedScenarios.find(item => item.id === id);
    if (!found) return;
    const loaded = structuredClone(found);
    setScenario(loaded); setMode("custom"); setResult(calculateScenario(loaded));
    setWaterLevel(loaded.flood.floodDepth); setUpstream(previous => ({ ...previous, localDepth: loaded.flood.floodDepth })); setUpstreamApplied(false); setGateOneEarlier(false); setBuilderOpen(false);
    setSelected(null); setInputsPending(false); setNotice(`Loaded saved scenario: ${loaded.name}`);
  };
  const deleteSaved = () => {
    if (mode !== "custom") return;
    const next = savedScenarios.filter(item => item.id !== scenario.id);
    try { window.localStorage.setItem(savedListKey, JSON.stringify(next)); setSavedScenarios(next); setNotice("Scenario removed from saved drafts on this device."); }
    catch { setNotice("Could not update local storage."); }
  };
  const activateCustom = () => {
    resetCloudSave();
    setWalkthroughActive(false);
    if (mode === "custom") { setBuilderOpen(true); return; }
    const next = createCustomScenario();
    setMode("custom"); setScenario(next); setResult(calculateScenario(next));
    setGateOneEarlier(false); setWaterLevel(0); setUpstream(previous => ({ ...previous, localDepth: 0 })); setUpstreamApplied(false); setBuilderOpen(true); setErrors([]); setInputsPending(true);
  };
  const runCustom = () => {
    const nextErrors = validateScenario(scenario);
    setErrors(nextErrors);
    if (nextErrors.length) { setNotice(`${nextErrors.length} input issue(s) need correction. Review the highlighted validation summary in the builder.`); document.querySelector(".scenario-builder")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    setGateOneEarlier(false);
    setResult(calculateScenario(scenario));
    setWaterLevel(scenario.flood.floodDepth);
    setUpstream(previous => ({ ...previous, localDepth: scenario.flood.floodDepth })); setUpstreamApplied(false);
    setBuilderOpen(false); setInputsPending(false); setNotice("Custom scenario validated and recalculated. All results are illustrative.");
  };
  const saveScenario = () => {
    try {
      const draft = { ...scenario, updatedAt: new Date().toISOString(), mode: "custom" as const };
      const next = [draft, ...savedScenarios.filter(item => item.id !== draft.id)].slice(0, 15);
      window.localStorage.setItem(scenarioStorageKey, JSON.stringify(draft));
      window.localStorage.setItem(savedListKey, JSON.stringify(next));
      setSavedScenarios(next); setErrors([]);
      setNotice(`Saved "${draft.name}" locally on this device.`);
    }
    catch { setErrors(["Could not save locally. Check browser storage permissions or available space."]); }
  };
  const saveToCloud = async () => {
    if (mode !== "custom" || inputsPending || cloudSave.status === "saving") return;
    const issues = validateScenario(scenario);
    if (issues.length) {
      setCloudSave({ status: "error", message: "Validate and run this scenario before saving to AWS.", id: null });
      setErrors(issues);
      setBuilderOpen(true);
      return;
    }
    setCloudSave({ status: "saving", message: "Saving through API Gateway and Lambda…", id: null });
    try {
      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", scenario }),
      });
      const payload: unknown = await response.json();
      const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
      const nested = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {};
      const rawId = body.scenarioId ?? body.scenario_id ?? body.id ?? nested.scenarioId ?? nested.id;
      const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : null;
      if (!response.ok || body.error || body.success === false || (typeof body.statusCode === "number" && body.statusCode >= 400)) {
        throw new Error(typeof body.error === "string" ? body.error : `AWS request failed (${response.status}).`);
      }
      setCloudSave({ status: "saved", message: id ? "Scenario saved through AWS API." : "AWS API returned success (no scenario ID in response).", id });
    } catch (error) {
      setCloudSave({ status: "error", message: error instanceof Error ? error.message : "AWS save failed. Check server credentials and API availability.", id: null });
    }
  };
  const runOnAws = async () => {
    if (inputsPending || cloudCompute.status === "running") {
      setCloudCompute({ status: "error", message: "Run or validate the current inputs before invoking AWS." });
      return;
    }
    const issues = validateScenario(scenario);
    if (issues.length) {
      setCloudCompute({ status: "error", message: "Resolve scenario validation issues before invoking AWS." });
      return;
    }
    setCloudCompute({ status: "running", message: "Running planning calculations on AWS Lambda…" });
    try {
      const response = await fetch("/api/aws-simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, upstream }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const reason = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : "Cloud compute failed";
        throw new Error(reason);
      }
      if (!payload || typeof payload !== "object" || !("engine" in payload) || payload.engine !== "aws-lambda"
        || !("baseline" in payload) || !("earlierGate" in payload)) throw new Error("Invalid cloud result");
      const output = payload as { baseline: SimulationResult; earlierGate: SimulationResult };
      const computed = gateOneEarlier ? output.earlierGate : output.baseline;
      if (!computed || typeof computed.feasible !== "boolean" || !Array.isArray(computed.infrastructure))
        throw new Error("Incomplete cloud result");
      setResult(computed);
      setCloudCompute({ status: "success", message: "Computed on AWS Lambda. Dashboard updated with cloud results (illustrative)." });
    } catch (error) {
      setCloudCompute({ status: "error", message: error instanceof Error ? error.message : "AWS simulation failed" });
    }
  };
  const resetCloudSave = () => {
    setCloudSave({ status: "idle", message: "", id: null });
    setCloudCompute({ status: "idle", message: "" });
  };
  const resetDemo = () => {
    resetCloudSave();
    const next = createDemoScenario();
    setMode("demo"); setScenario(next); setResult(calculateScenario(next));
    setBuilderOpen(false); setGateOneEarlier(false); setWaterLevel(.9); setUpstream(previous => ({ ...previous, localDepth: .9 })); setUpstreamApplied(false); setSelected(null); setErrors([]); setInputsPending(false); setDemoChooserOpen(false); setWalkthroughActive(false); setNotice("Illustrative campus demo restored.");
  };
  const toggleWhatIf = () => {
    const next = !gateOneEarlier;
    setGateOneEarlier(next);
    setResult(calculateScenario(scenario, { gateOneEarlier: next, disruptedGateId }));
  };
  const changeWaterLevel = (value: number) => {
    resetCloudSave();
    setWaterLevel(value);
    const next = { ...scenario, flood: { ...scenario.flood, floodDepth: value } };
    setScenario(next);
    setResult(calculateScenario(next, { gateOneEarlier, disruptedGateId }));
    setUpstream(previous => ({ ...previous, localDepth: value }));
    setUpstreamApplied(false);
  };
  const applyUpstream = () => {
    resetCloudSave();
    const next = { ...scenario, updatedAt: new Date().toISOString(), flood: { ...scenario.flood, floodDepth: upstreamImpact.downstreamDepth, arrivalMinutes: upstreamImpact.estimatedArrivalMinutes ?? scenario.flood.arrivalMinutes, arrivalMethod: upstreamImpact.estimatedArrivalMinutes === null ? scenario.flood.arrivalMethod : "simplified" as const, dataSource: "Synthetic upstream rainfall and river-rise what-if (not a live forecast)" } };
    setScenario(next);
    setWaterLevel(upstreamImpact.downstreamDepth);
    setResult(calculateScenario(next, { gateOneEarlier, disruptedGateId }));
    setUpstreamApplied(true);
    setNotice("Synthetic upstream flood depth and estimated arrival time applied to the dashboard. Not live sensor data or a verified forecast.");
  };
  const updateUpstream = (patch: Partial<FloodSignalInputs>) => {
    setUpstream(current => ({ ...current, ...patch }));
    setUpstreamApplied(false);
  };
  const comparison = [
    { label: "ORIGINAL", value: baseResult, kind: "baseline" },
    { label: `${disruptedGateName.toUpperCase()} - 2 HOURS`, value: earlyGateResult, kind: "changed" },
  ];
  const fmtTime = (n: number | null) => n === null ? "UNVERIFIED" : `${Math.floor(Math.max(0, n) / 60)}h ${Math.round(Math.max(0, n) % 60)}m`;
  const departureDelta = baseResult.lastSafeDepartureMinutes !== null && earlyGateResult.lastSafeDepartureMinutes !== null
    ? earlyGateResult.lastSafeDepartureMinutes - baseResult.lastSafeDepartureMinutes : null;
  const routeChanged = baseResult.route?.id !== earlyGateResult.route?.id;
  const decision = decisionStatus(state);
  const priorities = decisionPriorities(scenario, state);
  const comparisonSummary = comparisonVerdict(baseResult, earlyGateResult);
  return <main className="simulation-command">
    <CinematicMotion />
    <header className="command-header"><Link href="/" className="dark-brand">CASCADE<span>OS</span></Link><div className="command-context"><strong>FLOOD SIMULATION</strong><span>{scenario.location || "CUSTOM CAMPUS"} / {mode === "demo" ? "ILLUSTRATIVE DEMO" : "LOCAL CUSTOM MODEL"}</span></div><div className="command-status"><i /> {mode === "demo" ? "DEMO MODE" : "CUSTOM MODE"} <Link href="/">BACK TO HOME ↗</Link></div></header>
    <div className="command-shell">
      <div className="command-disclaimer">ILLUSTRATIVE DECISION SUPPORT · OPTIONAL NEAR-REAL-TIME WEATHER / US GAUGE INPUTS · NOT AN OFFICIAL FLOOD WARNING</div>
      <div className="scenario-topbar" aria-label="Scenario navigation">
        <div className="scenario-topbar-title"><span>ACTIVE SCENARIO</span><strong>{scenario.name}</strong><small>INPUT → SIMULATE → COMPARE → EXPORT</small></div>
        <div className="scenario-topbar-actions">
          <button type="button" className={demoChooserOpen ? "active" : ""} aria-expanded={demoChooserOpen} aria-controls="demo-choices" onClick={() => setDemoChooserOpen(open => !open)}>EXPLORE DEMO {demoChooserOpen ? "−" : "+"}</button>
          <button type="button" className={mode === "custom" ? "active" : ""} onClick={() => { setDemoChooserOpen(false); activateCustom(); }}>CREATE CUSTOM SCENARIO</button>
          {mode === "custom" && <button type="button" onClick={() => setBuilderOpen(open => !open)}>{builderOpen ? "HIDE INPUTS" : "EDIT INPUTS"}</button>}
        </div>
      </div>
      {demoChooserOpen && <section id="demo-choices" className="demo-choices" aria-label="Choose a demonstration">
        <div><strong>Choose how to explore</strong><p>Nothing changes until you select a demo. Both examples use illustrative inputs.</p></div>
        <div className="demo-choice-actions"><button type="button" className="demo-choice-primary" onClick={startGuidedDemo}>START GUIDED EXAMPLE ↗</button><button type="button" onClick={resetDemo}>RESET CAMPUS DEMO ↺</button></div>
      </section>}
      <details className="scenario-tools"><summary>Saved scenarios &amp; draft tools <span>OPTIONAL</span></summary>
        <div className="scenario-tools-content">
          {savedScenarios.length > 0 && <label className="saved-picker"><span>LOAD SAVED</span><select aria-label="Load a saved scenario" value="" onChange={e => loadSaved(e.target.value)}><option value="">Choose a draft…</option>{savedScenarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <button type="button" disabled={inputsPending || cloudCompute.status === "running"} onClick={() => void runOnAws()}>{cloudCompute.status === "running" ? "RUNNING ON AWS…" : "RUN ON AWS LAMBDA ↗"}</button>
          {cloudCompute.status !== "idle" && <div className={`cloud-feedback cloud-${cloudCompute.status === "success" ? "saved" : cloudCompute.status === "error" ? "error" : "saving"}`} role="status"><strong>{cloudCompute.status === "success" ? "AWS COMPUTE CONFIRMED" : cloudCompute.status === "error" ? "AWS COMPUTE NOT CONFIRMED" : "AWS COMPUTE IN PROGRESS"}</strong><span>{cloudCompute.message}</span></div>}
          {mode === "custom" && <button type="button" onClick={saveScenario}>SAVE LOCAL DRAFT</button>
          {mode === "custom" && <button type="button" disabled={inputsPending || cloudSave.status === "saving"} onClick={() => void saveToCloud()}>{cloudSave.status === "saving" ? "SAVING TO AWS…" : "SAVE SCENARIO TO AWS ↗"}</button>}
          {mode === "custom" && <p className="cloud-explainer">Cloud save is separate from local drafts. Clicking sends this scenario to the configured AWS API.</p>}
          {cloudSave.status !== "idle" && <div className={`cloud-feedback cloud-${cloudSave.status}`} role="status"><strong>{cloudSave.status === "saved" ? "AWS API CONFIRMED" : cloudSave.status === "error" ? "AWS SAVE NOT CONFIRMED" : "AWS REQUEST IN PROGRESS"}</strong><span>{cloudSave.message}</span>{cloudSave.status === "saved" && cloudSave.id && <code>Scenario ID: {cloudSave.id}</code>}</div>}
          {mode === "custom" && savedScenarios.some(item => item.id === scenario.id) && <button type="button" onClick={deleteSaved}>DELETE LOCAL DRAFT</button>}
          {savedScenarios.length === 0 && mode === "demo" && <span>No local drafts yet. Create a scenario to save one.</span>}
        </div>
      </details>
      {notice && <div className="scenario-notice compact-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}
      {walkthroughActive && <nav className="guided-route" aria-label="Guided demo steps"><span>GUIDED EXAMPLE</span><a href="#simulation-model">01 · SIMULATE ↓</a><a href="#scenario-comparison">02 · COMPARE ↓</a><a href="#relocation-summary">03 · DECIDE ↓</a><button type="button" onClick={() => setWalkthroughActive(false)} aria-label="Close guided navigation">×</button></nav>}
      {inputsPending && mode === "custom" && <div className="scenario-notice" role="status">Inputs have changed since the last simulation. Run Simulation to update the main dashboard and departure estimate.</div>}
      {builderOpen && <ScenarioBuilder scenario={scenario} onChange={value => { setScenario(value); setErrors([]); setInputsPending(true); resetCloudSave(); }} onRun={runCustom} onSave={saveScenario} onExample={useExample} onClose={() => setBuilderOpen(false)} errors={errors} />}
      <section id="simulation-model" className="command-viewport"><div className="viewport-main"><div className="viewport-heading"><div><p className="eyebrow glacier">ILLUSTRATIVE 3D MODEL / {mode === "demo" ? "DEMO" : "CUSTOM SCHEMATIC"}</p><h1>Campus flood state</h1>{mode === "custom" && modelAssets.length === 0 && <p className="model-explainer">Add buildings, infrastructure and shelters in the builder to populate this schematic 3D scene.</p>}</div><span>DRAG TO ORBIT · SCROLL TO ZOOM · SELECT AN ASSET</span></div><FloodScene waterLevel={visualDepth} assets={mode === "custom" ? modelAssets : undefined} custom={mode === "custom"} timelineProgress={timelineProgress} playing={playing} speed={speed} alternateRoute={gateOneEarlier} cameraMode={cameraMode} resetKey={resetKey} onSelect={setSelected} /><div className="scene-controls command-controls"><label><span>SCENARIO PEAK WATER DEPTH <b>{waterLevel.toFixed(1)}M</b></span><input aria-label="Water level" type="range" min="0" max="10" step="0.1" value={waterLevel} onChange={(event) => changeWaterLevel(Number(event.target.value))} /></label><div className="timeline-control"><div className="timeline-control-heading"><span>ILLUSTRATIVE FLOOD PROGRESSION / {timelineLabel} · CURRENT DEPTH {visualDepth.toFixed(1)}M</span><span>{playing ? "RUNNING" : "PAUSED"}</span></div><input aria-label="FLOOD PROGRESSION" type="range" min="0" max="1" step="0.01" value={timelineProgress} onChange={(event) => setTimelineProgress(Number(event.target.value))} /></div><p className="model-explainer">The progression slider animates a simplified rise from 0 to the scenario peak depth over a 12-hour visualization. It is not a measured flood forecast. The Cascade Clock uses the scenario assumptions above, not the animation position.</p><div className="scene-buttons"><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? "PAUSE" : "PLAY"} TIMELINE</button><button type="button" onClick={() => { setPlaying(false); setTimelineProgress(0); }}>RESET</button><button type="button" onClick={() => setSpeed((value) => value === 2 ? 0.5 : value + 0.5)}>SPEED {speed}×</button><button type="button" onClick={() => setCameraMode((value) => value === "orbit" ? "top" : "orbit")}>{cameraMode === "orbit" ? "TOP VIEW" : "ORBIT VIEW"}</button><button type="button" onClick={() => setResetKey((value) => value + 1)}>RESET CAMERA</button></div></div></div>
        <aside className="clock-panel"><div className="panel-kicker">CASCADE CLOCK <span>STATUS / {state.feasible ? "ACTIVE" : "REVIEW"}</span></div><div className="clock-deadline"><small>LAST SAFE DEPARTURE / SCENARIO ESTIMATE</small><strong className={state.lastSafeDepartureMinutes === null ? "unverified-clock" : ""}>{state.lastSafeDepartureMinutes === null ? "UNVERIFIED" : `${Math.floor(Math.max(0, state.lastSafeDepartureMinutes) / 60)}h ${Math.max(0, state.lastSafeDepartureMinutes) % 60}m`}</strong><span>estimated departure margin / <b>{state.safetyMarginMinutes === null ? "—" : `${Math.max(0, state.safetyMarginMinutes)}m`}</b></span></div><div className="deadline-list command-deadlines"><div><span>Flood arrival</span><b>{state.floodArrivalMinutes === null ? "INSUFFICIENT DATA" : `${Math.floor(state.floodArrivalMinutes / 60)}h ${Math.round(state.floodArrivalMinutes % 60)}m`}</b></div>{state.infrastructure.slice(0, 3).map((asset) => <div key={asset.id}><span>{asset.name}</span><b className={asset.status === "critical" ? "critical-value" : ""}>{`${Math.floor(asset.failureMinutes / 60)}h ${asset.failureMinutes % 60}m`}</b></div>)}</div><div className="command-action"><small>NEXT RECOMMENDED ACTION</small><strong>{state.nextAction}</strong></div><div className="clock-state"><span>MODEL STATUS</span><b><i /> {state.estimationNote}</b></div>{selected ? <div className="asset-inspector command-inspector"><div className="inspector-heading"><span>SELECTED ASSET</span><button type="button" aria-label="Close selected asset" onClick={() => setSelected(null)}>×</button></div><h3>{selected.name}</h3><dl><div><dt>GROUND ELEVATION</dt><dd>{selected.elevation.toFixed(1)}M</dd></div><div><dt>WATER DEPTH</dt><dd>{selectedDepth.toFixed(1)}M</dd></div><div><dt>STATUS</dt><dd className={`status-${selectedStatus.toLowerCase().replace(" ", "-")}`}>{selectedStatus}</dd></div><div><dt>FAILURE DEADLINE</dt><dd>{selected.deadline}</dd></div></dl></div> : <div className="command-hint">SELECT A BUILDING, GATE, PUMP, OR ELECTRICAL ASSET IN THE MODEL TO INSPECT ITS CURRENT STATE.</div>}</aside></section>
      <section className="decision-brief" aria-label="Evacuation decision summary">
        <div className="decision-brief-head"><div><span>SCENARIO DECISION BRIEF / ILLUSTRATIVE</span><h2>What needs attention first?</h2></div><span className={`decision-status decision-${inputsPending ? "unknown" : decision.tone}`}>{inputsPending ? "RECALCULATION NEEDED" : decision.label}</span></div>
        {inputsPending ? <div className="decision-pending">Inputs have changed. Run Simulation to generate an updated decision brief.</div> : <>
          <div className="decision-stats">
            <div><span>FLOOD ARRIVAL ESTIMATE</span><strong>{fmtTime(state.floodArrivalMinutes)}</strong></div>
            <div><span>LAST SAFE DEPARTURE</span><strong>{fmtTime(state.lastSafeDepartureMinutes)}</strong></div>
            <div><span>PEOPLE TO EVACUATE</span><strong>{scenario.population.evacuationDemand ?? scenario.population.total}</strong></div>
            <div><span>SHELTER SHORTFALL</span><strong className={state.shelterDeficit > 0 ? "decision-alert" : ""}>{state.shelterDeficit}</strong></div>
          </div>
          <div className="decision-brief-action"><div><span>PRIORITY PLANNING ACTION</span><p>{state.nextAction}</p></div><a href="#relocation-summary">VIEW RELOCATION PLAN ↓</a></div>
          {!state.feasible && <div className="decision-constraints"><strong>CONSTRAINTS TO REVIEW</strong><ul>{priorities.map(item => <li key={item}>{item}</li>)}</ul><p>A departure time is not shown as safe unless route, transport, shelter and timing constraints are all satisfied.</p></div>}
        </>}
      </section>
      <div className="monitor-heading"><div><span>DECISION DASHBOARD</span><h2>What the scenario means.</h2></div><button type="button" aria-expanded={showAllMonitors} onClick={() => setShowAllMonitors(value => !value)}>{showAllMonitors ? "SHOW ESSENTIALS −" : "SHOW ALL MONITORS +"}</button></div>
      <section className={`ops-grid ${showAllMonitors ? "show-details" : ""}`}><div className="ops-panel risk-monitor"><div className="panel-kicker">01 / INFRASTRUCTURE RISK MONITOR <span>{mode === "demo" ? "SYNTHETIC MODEL" : "CALCULATED"}</span></div><div className="risk-list">{state.infrastructure.slice(0, 3).map((asset) => <div key={asset.id}><i className={asset.status === "critical" ? "critical" : "warning"} /><span><b>{asset.name}</b><small>{asset.failureReason}</small></span><strong className={asset.status === "critical" ? "critical-value" : ""}>{Math.floor(asset.failureMinutes / 60)}h {asset.failureMinutes % 60}m</strong></div>)}</div></div><div className="ops-panel capacity-monitor"><div className="panel-kicker">02 / SHELTER CAPACITY <span>LIMITING RESOURCE</span></div><div className="capacity-card">{["beds", "water", "food", "sanitation"].map((name) => <div className="capacity-row" key={name}><span>{name}</span><i><u style={{ width: `${Math.min(100, (resourceTotals[name as keyof typeof resourceTotals] / Math.max(1, scenario.population.total)) * 100)}%` }} /></i><b>{resourceTotals[name as keyof typeof resourceTotals]}</b></div>)}<div className="capacity-total"><span>EFFECTIVE REMAINING CAPACITY</span><strong>{state.remainingCapacity}</strong></div></div></div><div className="ops-panel shortage-monitor"><div className="shortage-photo"><Image src="/images/cascade-emergency-shelter.jpg" alt="Illustrative emergency storm shelter facility" fill sizes="(max-width: 650px) 100vw, 150px" /></div><div><div className="panel-kicker">03 / CAPACITY DEFICIT</div><strong className="shortage-number">{state.shelterDeficit}</strong><span>people without available shelter capacity</span><small>{state.accessibleDeficit} accessible places still required · {state.accommodationDeficit} category-specific accommodation places required</small></div></div><div className="ops-panel route-monitor"><div className="panel-kicker">04 / EVACUATION ROUTE PLANNER <span>{state.route ? "ROUTE AVAILABLE" : "NO ROUTE"}</span></div><div className="route-strip"><b>TO EVACUATE<br /><strong>{scenario.population.evacuationDemand ?? scenario.population.total}</strong></b><i /><span>{state.route?.name ?? "UNREACHABLE"}</span><i /><b>SHELTER<br /><strong>{state.effectiveCapacity} SAFE</strong></b></div><div className="route-meta"><span>{state.trips} TRIPS REQUIRED</span><span className="safe-text">{state.feasible ? "FEASIBLE PLAN" : "REVIEW CONSTRAINTS"}</span></div></div><div className="ops-panel tracking-monitor"><div className="panel-kicker">05 / STUDENT SAFETY TRACKING <span>{mode === "demo" ? "SYNTHETIC COHORT" : "AGGREGATE INPUT"}</span></div><div className="tracking-grid">{statuses.map(([label, key, kind]) => <div className={kind} key={label}><span>{label}</span><strong>{state.statusCounts[key]}</strong><small>of {scenario.population.total}</small></div>)}</div></div><div className="ops-panel what-if command-what-if"><div className="panel-kicker">06 / WHAT IF? SCENARIO SIMULATOR</div><button type="button" className={`scenario-toggle ${gateOneEarlier ? "active" : ""}`} disabled={mode === "custom" && !disruptedGate} onClick={toggleWhatIf}><span className="toggle-dot" /> {disruptedGateName} closes 2 hours earlier</button><div className="scenario-result"><div><small>ROUTE</small><strong>{state.route?.name ?? "No feasible route"}</strong></div><div><small>LAST SAFE DEPARTURE / SCENARIO ESTIMATE</small><strong className={state.lastSafeDepartureMinutes === null ? "unverified-clock" : ""}>{state.lastSafeDepartureMinutes === null ? "UNVERIFIED" : `${state.lastSafeDepartureMinutes}m`}</strong></div><div><small>RECOMMENDATION</small><strong className={gateOneEarlier ? "alert-text" : ""}>{state.nextAction}</strong></div></div></div></section>
      <details className="advanced-panel" id="upstream-tools"><summary><span><small>OPTIONAL · ADVANCED MODEL</small><strong>Upstream rainfall, river gauges &amp; flood-arrival what-if</strong><em>Explore optional environmental readings and synthetic flood-wave assumptions</em></span><b>EXPAND +</b></summary>
      <section id="upstream" className="upstream-panel" aria-label="Upstream rainfall river rise and downstream flood arrival estimator">
        <div className="live-monitor" aria-label="Near-real-time upstream rainfall and river gauge monitoring">
          <div className="live-monitor-heading"><div><p className="eyebrow glacier">LIVE DATA CONNECTOR / PUBLIC SOURCES</p><h3>Upstream rainfall and river gauge monitor</h3><p>Fetch near-real-time rainfall for any coordinates. Optional USGS gauge readings are available for US stations. Live inputs are separate from the synthetic flood-travel model.</p></div><span className={liveEnabled ? "live-indicator live-on" : "live-indicator"}>{liveEnabled ? "MONITORING / 5 MIN" : "MONITOR OFF"}</span></div>
          <div className="live-monitor-fields">
            <label>Upstream latitude<input aria-label="Upstream latitude" type="number" min="-90" max="90" step="0.0001" value={liveLocation.lat} onChange={event => setLiveLocation(previous => ({ ...previous, lat: event.target.value }))} /></label>
            <label>Upstream longitude<input aria-label="Upstream longitude" type="number" min="-180" max="180" step="0.0001" value={liveLocation.lon} onChange={event => setLiveLocation(previous => ({ ...previous, lon: event.target.value }))} /></label>
            <label>USGS station ID (optional; US only)<input aria-label="USGS station ID" type="text" inputMode="numeric" placeholder="e.g. 01646500" value={liveLocation.site} onChange={event => setLiveLocation(previous => ({ ...previous, site: event.target.value }))} /></label>
          </div>
          <div className="live-monitor-actions">
            <button type="button" onClick={() => { setLiveEnabled(!liveEnabled); if (liveEnabled) setLiveSignals(null); }}>{liveEnabled ? "STOP MONITORING" : "START LIVE MONITORING"}</button>
            <button type="button" onClick={() => void refreshLive()} disabled={liveLoading}>{liveLoading ? "FETCHING…" : "REFRESH NOW"}</button>
            <button type="button" onClick={useObservedSignals} disabled={!liveSignals?.rain && !liveSignals?.river}>USE AVAILABLE READINGS IN SIMULATION</button>
            <button type="button" onClick={() => void enableBrowserAlerts()} disabled={browserAlerts}>{browserAlerts ? "BROWSER ALERTS ON" : "ENABLE BROWSER ALERTS"}</button>
          </div>
          {liveError && <p className="live-error" role="status">{liveError}</p>}
          {liveSignals && <>
            <div className="live-readings">
              <div><span>NEAR-REAL-TIME RAINFALL</span><strong>{liveSignals.rain ? `${liveSignals.rain.mmPerHour.toFixed(1)} mm/h` : "UNAVAILABLE"}</strong><small>{liveSignals.rain ? `Open-Meteo · ${liveSignals.rain.observedAt}` : "Provider unavailable"}</small></div>
              <div><span>OBSERVED RIVER GAUGE</span><strong>{liveSignals.river ? `${liveSignals.river.stageMeters.toFixed(2)} m` : "NOT CONNECTED"}</strong><small>{liveSignals.river ? `USGS ${liveSignals.river.siteId} · recent rise ${liveSignals.river.recentRiseMeters.toFixed(2)} m · ${liveSignals.river.observedAt}` : "Optional: enter a valid USGS station ID (US only). India gauge feed not connected."}</small></div>
              <div><span>LAST FETCHED</span><strong>{new Date(liveSignals.fetchedAt).toLocaleTimeString()}</strong><small>Checks every 5 minutes while this tab is open. Data may lag provider updates.</small></div>
            </div>
            {liveSignals.warnings.map(message => <p key={message} className="live-warning">{message}</p>)}
            {liveEnabled && <div className={liveAlert?.level === "elevated" ? "live-signal-alert live-alert-high" : "live-signal-alert"} role="status" aria-live="polite">{liveAlert ? liveAlert.message : "No elevated signal detected in currently available, recent public data. This is not an all-clear; follow official warnings."}</div>}
          </>}
          <p className="live-disclaimer">Demo-only monitoring: rainfall is a weather-model/observation blend, not a direct rain sensor; USGS gauge data is US-only. Alerts appear in this open browser tab; optional notifications require permission. No background SMS, push service, Indian river-gauge integration, or certified flood forecast. Assumed wave speed and distance make the ETA illustrative, not a verified arrival prediction.</p>
        </div>
        <div className="upstream-heading">
          <div>
            <p className="eyebrow glacier">UPSTREAM EARLY WARNING / SCENARIO SIMULATOR</p>
            <h2>If heavy rain or river levels rise upstream, when could flooding reach us?</h2>
            <p>Enter a hypothetical rainfall event, river rise, distance and assumed flood-wave speed. Compare the estimated arrival time, downstream water depth, risk and people potentially exposed.</p>
          </div>
          <span className="upstream-label">ILLUSTRATIVE ETA + OPTIONAL LIVE SIGNALS</span>
        </div>
        <div className="upstream-controls upstream-signal-controls">
          {([
            ["Upstream rainfall intensity", "rainfallMmPerHour", 0, 300, 5, "mm/h"],
            ["Rainfall duration", "rainfallHours", 0, 24, 0.5, "h"],
            ["River level rise", "riverRiseMeters", 0, 5, 0.1, "m"],
            ["Upstream flood pulse", "upstreamPeakDepth", 0, 5, 0.1, "m"],
            ["Distance downstream", "distanceKm", 1, 150, 1, "km"],
            ["Assumed flood-wave speed", "flowSpeedKmh", 1, 30, 0.5, "km/h"],
            ["Rainfall response lag", "runoffLagMinutes", 0, 180, 5, "min"],
            ["Current local flood depth", "localDepth", 0, 5, 0.1, "m"],
            ["Upstream retention", "retentionPercent", 0, 100, 5, "%"],
            ["Channel attenuation", "channelLossPercent", 0, 100, 5, "%"],
          ] as const).map(([label, key, min, max, step, unit]) => (
            <label className="upstream-control" key={key}>
              <span>{label}<strong>{upstream[key].toFixed(step < 1 ? 1 : 0)} {unit}</strong></span>
              <input type="range" min={min} max={max} step={step} value={upstream[key]}
                onChange={event => updateUpstream({ [key]: Number(event.target.value) })} aria-label={label} />
            </label>
          ))}
        </div>
        <div className="upstream-flow" aria-label="Illustrative flood-wave movement">
          <div className="upstream-flow-node"><span>01 / UPSTREAM EVENT</span><strong>{upstreamImpact.totalUpstreamPulse.toFixed(2)}m</strong><small>Pulse + river rise + rainfall-runoff proxy</small></div>
          <div className="upstream-flow-arrow">→<small>{upstream.distanceKm.toFixed(0)} km</small></div>
          <div className="upstream-flow-node"><span>02 / RIVER CHANNEL</span><strong>{upstreamImpact.arrivingPulseDepth.toFixed(2)}m</strong><small>Estimated arriving pulse after retention and losses</small></div>
          <div className="upstream-flow-arrow">→</div>
          <div className="upstream-flow-node upstream-downstream"><span>03 / DOWNSTREAM</span><strong>{upstreamImpact.downstreamDepth.toFixed(2)}m</strong><small>Current local water + incoming pulse</small></div>
        </div>
        <div className="upstream-alert" role="status" aria-live="polite">
          <div><span>ESTIMATED ARRIVAL FROM UPSTREAM EVENT</span><strong>{upstreamImpact.estimatedArrivalMinutes === null ? "UNAVAILABLE" : `${Math.floor(upstreamImpact.estimatedArrivalMinutes / 60)}h ${upstreamImpact.estimatedArrivalMinutes % 60}m`}</strong><small>Distance ÷ assumed wave speed + rainfall response lag. Time relative to hypothetical event, not current clock time.</small></div>
          <div><span>DOWNSTREAM RISK SCREENING</span><strong className={`upstream-risk upstream-risk-${upstreamImpact.riskLevel.toLowerCase()}`}>{upstreamImpact.riskLevel}</strong><small>Based on illustrative depth thresholds, not a government warning level</small></div>
          <div><span>POTENTIALLY EXPOSED PEOPLE</span><strong>{beforeExposure} → {afterExposure}</strong><small>Building-elevation or aggregate depth screening proxy</small></div>
        </div>
        <div className="upstream-alert-message">{upstreamImpact.alertMessage}</div>
        <div className="upstream-results">
          <div><span>RAIN-DRIVEN RUNOFF PROXY</span><strong>{upstreamImpact.rainfallRunoffDepth.toFixed(3)}m</strong><small>Rainfall × hours × 0.65 / 1000</small></div>
          <div><span>DOWNSTREAM DEPTH</span><strong>{upstreamImpact.downstreamDepth.toFixed(2)}m</strong><small>After retention and channel attenuation</small></div>
          <div><span>SCENARIO ARRIVAL</span><strong>{upstreamImpact.estimatedArrivalMinutes === null ? "NOT ESTIMATED" : `${upstreamImpact.estimatedArrivalMinutes} min`}</strong><small>Estimated from synthetic inputs</small></div>
          <div><span>RELOCATION CHECK</span><strong>{upstreamResult.feasible ? "CONSTRAINTS MET" : "REVIEW REQUIRED"}</strong><small>{upstreamResult.nextAction}</small></div>
        </div>
        <div className="upstream-footer">
          <p>Illustrative only: upstream pulse = entered pulse + river rise + rainfall runoff proxy; arriving pulse is reduced by retention and channel attenuation. Arrival time assumes constant wave speed and optional rainfall response lag. Optional public weather and USGS gauge inputs can populate the sliders, but the downstream ETA and depth remain an uncalibrated scenario estimate. Do not use for real evacuation decisions.</p>
          <button type="button" onClick={applyUpstream}>{upstreamApplied ? "APPLIED ✓ · REAPPLY" : "APPLY DEPTH + ARRIVAL TO DASHBOARD ↗"}</button>
        </div>
      </section>
      </details>
      <section id="scenario-comparison" className="scenario-compare" aria-label="Before and after scenario comparison">
        <div className="compare-heading"><div><p className="eyebrow glacier">08 / INTERACTIVE SCENARIO COMPARISON</p><h2>See what changes when a gate fails.</h2><p>Same input assumptions, one infrastructure disruption. The comparison is calculated, not live emergency guidance.</p></div><button type="button" className={gateOneEarlier ? "active" : ""} disabled={mode === "custom" && !disruptedGate} onClick={toggleWhatIf}>{gateOneEarlier ? "RESTORE ORIGINAL ↺" : "APPLY EARLY FAILURE ↗"}</button></div>
        <div className="comparison-grid">{comparison.map(item => <div className={`comparison-card ${item.kind === (gateOneEarlier ? "changed" : "baseline") ? "selected" : ""}`} key={item.kind}>
          <div className="comparison-label"><span>{item.label}</span><small>{item.value.feasible ? "CONSTRAINTS MET" : "CONSTRAINTS NOT MET"}</small></div>
          <div className="comparison-stat"><span>LAST SAFE DEPARTURE</span><strong>{fmtTime(item.value.lastSafeDepartureMinutes)}</strong></div>
          <div className="comparison-meter"><span style={{ width: `${Math.min(100, Math.max(0, (item.value.lastSafeDepartureMinutes ?? 0) / 760 * 100))}%` }} /></div>
          <dl><div><dt>Selected route</dt><dd>{item.value.route?.name ?? "No route"}</dd></div><div><dt>Evacuation duration</dt><dd>{fmtTime(item.value.evacuationMinutes)}</dd></div><div><dt>Shelter shortage</dt><dd>{item.value.shelterDeficit} people</dd></div><div><dt>Accessible shortage</dt><dd>{item.value.accessibleDeficit} places</dd></div></dl>
        </div>)}</div>
        <div className="comparison-insight" role="status">
          <div><span>DEPARTURE WINDOW CHANGE</span><strong>{departureDelta === null ? "NOT COMPARABLE" : departureDelta === 0 ? "NO CHANGE" : `${departureDelta > 0 ? "+" : "−"}${Math.abs(departureDelta)} MIN`}</strong><small>{departureDelta === null ? "At least one scenario does not satisfy all planning constraints." : "Difference in calculated last safe departure time."}</small></div>
          <div><span>ROUTE IMPACT</span><strong>{routeChanged ? "ALTERNATIVE ROUTE" : "SAME ROUTE"}</strong><small>{routeChanged ? `${baseResult.route?.name ?? "No route"} → ${earlyGateResult.route?.name ?? "No route"}` : "The configured route selection did not change."}</small></div>
          <div><span>FEASIBILITY</span><strong>{baseResult.feasible && earlyGateResult.feasible ? "BOTH FEASIBLE" : baseResult.feasible ? "EARLY FAILURE AT RISK" : earlyGateResult.feasible ? "BASELINE AT RISK" : "REVIEW BOTH"}</strong><small>Based on synthetic timing, shelter and transport constraints.</small></div>
        </div>
        <div className="comparison-verdict"><span>WHAT CHANGED / CALCULATED VERDICT</span><p>{inputsPending ? "Inputs have changed. Run Simulation before using this comparison." : comparisonSummary}</p></div>
        <p className="comparison-warning">{!baseResult.feasible || !earlyGateResult.feasible ? "Both departure values are intentionally marked UNVERIFIED when shelter, transport or timing constraints prevent a complete plan. Fix deficits in Custom Scenario to obtain a feasible departure estimate." : (earlyGateResult.lastSafeDepartureMinutes !== null && baseResult.lastSafeDepartureMinutes !== null && earlyGateResult.lastSafeDepartureMinutes > baseResult.lastSafeDepartureMinutes ? "In these synthetic assumptions the alternative gate stays open longer, so the computed departure window can increase even though travel takes longer. Check gate closure inputs carefully." : "The gate closure changes the route and timing estimate. Verify every input before considering any real-world action.")}</p>
      </section>
      <section id="relocation-summary" className="relocation-plan" aria-label="Evacuation planning summary">
        <div><p className="eyebrow glacier">09 / PLAN AT A GLANCE</p><h2>From risk to relocation.</h2><p>Automatically recalculated from the current scenario. These are planning estimates, not real-world dispatch instructions.</p></div>
        <div className="plan-metrics"><div><span>EVACUATION DEMAND</span><strong>{scenario.population.evacuationDemand ?? scenario.population.total}</strong><small>people</small></div><div><span>AVAILABLE SEATS / WAVE</span><strong>{state.transportCapacity}</strong><small>seats</small></div><div><span>ESTIMATED BUS TRIPS</span><strong>{state.trips}</strong><small>waves</small></div><div><span>REMAINING SHELTER SPACE</span><strong>{state.remainingCapacity}</strong><small>places</small></div></div>
        <div className="plan-recommendation"><b>RECOMMENDED NEXT STEP</b><span>{state.nextAction}</span></div>
      </section>
      <details className="methodology-notes">
        <summary>How these estimates work <span>MODEL ASSUMPTIONS &amp; LIMITATIONS +</span></summary>
        <div className="methodology-grid">
          <div><strong>Flood arrival</strong><p>Uses the provided arrival-time assumption, or estimates time as flood depth ÷ rise rate when possible. Neither method is a calibrated forecast.</p></div>
          <div><strong>Infrastructure &amp; routes</strong><p>Configured failure times and dependencies affect route closures. The early-gate what-if shifts the selected gate failure by two hours.</p></div>
          <div><strong>Shelter &amp; transport</strong><p>Effective shelter places are limited by beds, water, food, sanitation and occupancy. Trip estimates use available vehicle seats and route timing.</p></div>
          <div><strong>Safe departure constraint</strong><p>The displayed departure estimate requires all modeled constraints to be satisfied. Unverified means the prototype cannot establish a feasible planning window.</p></div>
        </div>
        <p className="methodology-warning">Synthetic, deterministic planning estimates only. Not a live warning, certified hydrological forecast or operational evacuation instruction.</p>
      </details>
      <section className="action-timeline"><div className="panel-kicker">07 / EMERGENCY ACTION TIMELINE <span>{state.estimationNote}</span></div><div className="action-steps">{["FLOOD PULSE DETECTED", "INFRASTRUCTURE FAILURES PREDICTED", "SAFE DEADLINE CALCULATED", "SHELTER CAPACITY VERIFIED", "ROUTES + BUSES ALLOCATED", "STUDENTS ACCOUNTED FOR"].map((step, index) => <div key={step} className={index < 3 ? "current" : ""}><i>{String(index + 1).padStart(2, "0")}</i><span>{step}</span></div>)}</div></section>
      <section className="final-report" aria-label="Download completed scenario report">
        <div><span>FINAL STEP / REPORT</span><h2>Ready to share your scenario?</h2><p>Export the calculated baseline and early-gate-failure comparison as an illustrative planning PDF.</p></div>
        <button type="button" disabled={inputsPending} onClick={() => downloadScenarioPdf(scenario, baseResult, earlyGateResult)}>{inputsPending ? "RUN SIMULATION BEFORE EXPORT" : "DOWNLOAD PDF REPORT ↓"}</button>
      </section>
    </div>
  </main>;
}
