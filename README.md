# CascadeOS — Flood-to-Safe Relocation Engine

An **illustrative**, local-first campus flood scenario and relocation planning demo. It is **not** a certified life-safety system, verified flood forecast, real GIS map, live sensor feed, or dispatch service. The IIIT Lucknow-like example is fictional/synthetic.

## Start

Use Node.js 20+ and npm. Open **this extracted folder**, not an older CascadeOS project:

```bash
npm install
npm run dev
```

Open the localhost URL printed by Next.js. To test a production build:

```bash
npm run lint
npm run build
npm run test:scenario
npm run check:scenario
```

## What changed in this edition

- **Home:** Added a compact four-stage “From flood signals to a relocation plan” explanation, keeping the existing cinematic dark styling.
- **Simulation:** Added side-by-side **original vs early gate failure** scenario comparison, with route, deadline, duration and shelter constraints; numbers come from the deterministic scenario model.
- **3D:** Added building roofs/windows, roads, trees, clearer lighting and labels. Orbit, pan and zoom remain user-controlled; camera only resets on the explicit Reset Camera button or a deliberate top/orbit switch. The water visualization now progresses from zero to the configured peak depth with the timeline slider. The 3D layout is **schematic**, not a map.
- **Custom scenarios:** Seven-step input builder, loadable valid sample, validation, multiple local drafts (up to 15), load/delete controls. Data is saved in the browser's localStorage, not a remote account.
- **Export:** A real, downloadable **PDF** report (not a screenshot), generated locally without adding a PDF dependency. Includes assumptions, infrastructure, shelter constraints, transport, comparison and limitations. The built-in Helvetica PDF font supports Latin characters; uncommon Unicode characters may appear as `?` in the exported PDF.
- **Planning summary:** Displays evacuation demand, available seats, estimated trips, remaining shelter capacity and next action.

## Verify the demo manually

1. Go to `/simulation` and click **Explore Demo**.
2. Orbit by dragging, zoom with scroll/trackpad, pan with right-drag, switch **Top View**, and click **Reset Camera**. Camera should stay where you leave it until you explicitly reset or switch modes.
3. Change **Scenario Peak Water Depth** and drag **Illustrative Flood Progression**: visualized depth, water surface and asset statuses should update. This is an animation of the supplied depth, not a physical hydrological model.
4. Toggle **Gate 1 closes 2 hours earlier**. Check the selected route, the model's route highlight and the new comparison cards.
5. Click **Create Custom Scenario** → **Load Example Inputs** → **Run Simulation**. This example is intentionally feasible, so a calculated last safe departure is visible.
6. Change shelter water or bed capacity below evacuation demand, run again, and confirm the departure becomes **UNVERIFIED** and the shortage/recommended action changes.
7. Click **Save Scenario**, reload the page, and choose the draft from **Load Saved**. The scenario should return. Delete it if desired.
8. Click **Download PDF Report**. Open the PDF and verify it includes your scenario name, risk, route and comparison details.
9. Repeat on mobile widths. The builder, comparison and planning cards should stack without horizontal clipping.

## Limitations

- The scenario engine is a simplified deterministic planning illustration. It is not calibrated to real geography, hydrology, evacuation traffic or official risk models.
- Gate what-if uses the first configured gate in a custom scenario and models an earlier closure by 120 minutes. Alternate route selection requires configured routes.
- The 3D scene uses schematic assets from your custom inputs, with a maximum of 12 visible assets, and does **not** derive GIS coordinates or route connectivity.
- Saving is browser-local. Clearing site data deletes drafts. Do not enter private or personally identifying student records.
- Real emergencies require official alerts, verified conditions, local authorities and trained emergency responders.

## Testing status

Scenario logic and PDF unit tests can run without a browser. Full Next.js build and interactive 3D browser tests require all npm dependencies and a browser/WebGL environment.

## Upstream → Downstream What-If (new)

On `/simulation`, the **Upstream → Downstream What-If** panel lets you adjust upstream flood-pulse depth, local downstream water depth, retention, channel attenuation and travel delay. It displays the pulse after losses, resulting downstream depth, an illustrative population-exposure screening proxy, and the resulting route/timing feasibility. Click **Apply to Flood Dashboard** to update the main 3D scene, infrastructure risks and relocation planner using the new depth. The original gate-failure what-if remains available.

This is a deliberately transparent, synthetic attenuation model, **not** a hydrological solver or live flood forecast. The travel delay is displayed as a separate wave-lag assumption; it does not silently modify the existing flood-arrival clock. Exposed-population estimates are coarse screening proxies based on supplied building elevations or a depth fraction for aggregate scenarios. Do not use these outputs for real evacuation decisions.

Test the new feature with `npm run test:scenario`. Try retention at 100% (the upstream pulse should add zero depth), and then reduce retention to 0% to see the projected downstream depth rise. Click Apply and verify that the main flood-depth slider and risk calculations update.

## Upstream rainfall and river-rise arrival estimator

The `/simulation` page now contains a synthetic upstream early-warning *what-if* model. Adjust upstream rainfall intensity/duration, river rise, pulse, downstream distance, assumed wave speed, response lag, retention and attenuation. It estimates relative flood-wave arrival time (distance/speed + optional rain-response lag), downstream depth, a depth-based risk category, potential population exposure, and relocation feasibility. Apply the depth and assumed arrival time to the existing dashboard for scenario comparison. No external weather API or river gauge is connected: it does not detect real events or provide a verified flood forecast. Model assumptions are explicitly shown in the UI. Never rely on these results for actual emergency planning.

## Optional near-real-time rainfall, river gauge and in-browser alerts

On `/simulation`, the **Live Data Connector** now supports:

1. Upstream latitude/longitude (default example: Lucknow), then **Start Live Monitoring**. The Next.js server route `/api/flood-signals` retrieves current precipitation from the public Open-Meteo service and refreshes it every five minutes while the tab is open. Open-Meteo current precipitation is a model/observation blend, not a local rain-gauge sensor.
2. An optional numeric USGS station ID for actual observed river-gauge stage and recent stage rise. USGS stations are in the United States; no live Indian river-gauge source is integrated. Leave the station ID blank for the Lucknow demonstration.
3. **Use Available Readings in Simulation** populates rainfall and (if available) river-rise inputs, preserving manual assumptions for wave speed, distance, retention, runoff response and local water depth.
4. A **live signal watch** (in-page) indicates elevated readings based on illustrative screening thresholds: rainfall >=5 mm/h or recent gauge rise >=0.1 m triggers a watch; rainfall >=20 mm/h or gauge rise >=0.3 m triggers an elevated watch. These thresholds are NOT official flood thresholds.
5. **Enable Browser Alerts** asks permission for local desktop notifications when an elevated live signal arrives. Notifications are available only while this tab is open and the browser permits them. No SMS, remote push, background worker or emergency dispatch is provided.

The downstream arrival ETA is still a **what-if estimate**, computed from user-entered distance, assumed wave speed and rainfall response lag. It is not a real-time forecast or measured flood-wave arrival time. If the data provider is unavailable, the UI displays a warning and does not substitute synthetic values for live readings. Data older than 90 minutes is excluded from alerts.

No API keys are required for the public rainfall and USGS endpoints. Existing AWS scenario saving code and credentials configuration are unchanged.

To verify: `npm run test:scenario` (includes alert and ETA logic), `npm run build`, then visit `/simulation`, start monitoring, refresh, and apply readings. Verify with your own browser/network because live upstream providers are external.

Never use CascadeOS outputs for real evacuation or flood emergency decisions; follow local authorities and official weather/flood alerts.

## Homepage: upstream flood intelligence

The homepage highlights upstream-to-downstream flood what-if simulation, an illustrative flood arrival ETA, near-real-time Open-Meteo rainfall inputs, optional USGS river-gauge readings for US stations, and in-page/browser alerts while monitoring is open. Use the **Try Upstream Intelligence** link on the homepage to jump directly to the corresponding simulation section.

Arrival-time estimates use assumed distance and wave speed, not a validated hydrological forecast. No Indian river-gauge provider, background notification service, or official flood-warning feed is connected.
