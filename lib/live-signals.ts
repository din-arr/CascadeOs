/** Near-real-time public weather and optional observed USGS gauge inputs.
 * Not a calibrated flood warning system. */
export type LiveFloodSignals = {
  fetchedAt: string;
  rain: { mmPerHour: number; observedAt: string; source: string } | null;
  river: { siteId: string; stageMeters: number; recentRiseMeters: number; observedAt: string; source: string } | null;
  warnings: string[];
};

export type SignalAlert = { level: "watch" | "elevated"; message: string } | null;

/** Thresholds are demo screening triggers, NOT official flood thresholds. */
export function assessLiveSignalAlert(signals: LiveFloodSignals | null, estimatedMinutes: number | null): SignalAlert {
  if (!signals) return null;
  const rain = signals.rain?.mmPerHour ?? 0;
  const rise = signals.river?.recentRiseMeters ?? 0;
  if (!signals.rain && !signals.river) return null;
  if (rain >= 20 || rise >= 0.3) {
    const drivers = [rain >= 20 ? `rainfall ${rain.toFixed(1)} mm/h` : "", rise >= 0.3 ? `gauge rise ${rise.toFixed(2)} m` : ""].filter(Boolean).join(" and ");
    const eta = estimatedMinutes === null ? "Arrival ETA unavailable." : `Illustrative downstream travel time: ${estimatedMinutes} minutes from an assumed upstream event.`;
    return { level: "elevated", message: `Elevated near-real-time upstream signal (${drivers}). ${eta} Verify official alerts; this is not an emergency warning.` };
  }
  if (rain >= 5 || rise >= 0.1) return { level: "watch", message: "Increased near-real-time rainfall or gauge level change. Review the scenario and official local flood advisories." };
  return null;
}
