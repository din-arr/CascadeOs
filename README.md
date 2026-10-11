# CascadeOS — Flood-to-Safe Relocation Engine

CascadeOS is an interactive flood scenario simulation, upstream early-warning *what-if*, and relocation-planning prototype built for the WeMakeDevs AWS Environmental Hackathon (Heat and Water track).

The idea was inspired by our time at IIIT Lucknow: heavy rainfall and waterlogging can disrupt roads, access to essential services, and everyday life. We wanted to explore a practical question: if conditions worsen upstream, how might downstream communities assess potential impacts and plan safer departures earlier?

CascadeOS combines a schematic 3D flood scene, deterministic evacuation-planning comparisons, upstream-to-downstream scenario estimates, optional public environmental readings, and an AWS-backed scenario API. It is a decision-support demonstration, **not an official flood forecast or life-safety system**. The IIIT Lucknow-like campus and all example infrastructure are fictional/synthetic.

- Live application: https://cascadeos-nu.vercel.app/
- Simulation: https://cascadeos-nu.vercel.app/simulation
- GitHub repository: https://github.com/din-arr/CascadeOS

## Video demo

YouTube walkthrough : https://youtu.be/Rlv2szU_FiA?si=3LwXeRalfFKzNtsl

## The problem

Flood risks are difficult to communicate before water reaches a community. Planning teams need ways to explore questions such as:

- What happens to downstream conditions if upstream rainfall or river levels rise?
- How soon *might* a flood pulse arrive under assumed travel conditions?
- Which buildings, routes, and shelters could be affected?
- Does a gate closure change the feasible evacuation route or departure deadline?
- Are there enough shelter beds and transport seats to support a relocation plan?

CascadeOS makes these trade-offs visible through an interactive, explicitly illustrative model. It is intended for students, researchers, disaster-preparedness educators, planners, and teams exploring flood-response scenarios—not for operational evacuation decisions.

## Features

### Interactive flood simulation and 3D scene

- Explore a schematic campus with buildings, roads, trees, roofs, windows, labels, and animated water.
- Change the scenario peak water depth and scrub an illustrative flood-progression timeline.
- Orbit, pan, zoom, switch to Top View, and explicitly reset the camera.
- See infrastructure statuses and route highlights change with scenario inputs.

The scene is **not a GIS map**, and the water animation is not a physical hydrodynamic simulation.

### Relocation planning and scenario comparison

- Compare an original scenario with an **early gate failure** case, where the first configured gate closes two hours earlier.
- Review routes, departure deadlines, journey duration, shelter constraints, and feasibility.
- See evacuation demand, available transport seats, estimated trips, remaining shelter capacity, and suggested next actions.
- Identify scenarios where a safe departure cannot be verified because the model's constraints are not satisfied.

### Upstream-to-downstream what-if simulation

- Adjust upstream flood pulse, rainfall intensity and duration, river rise, local downstream depth, distance, assumed wave speed, response lag, retention, and channel attenuation.
- Estimate downstream depth, relative flood-wave arrival time (ETA), depth-based risk, and potential population exposure.
- Apply estimated depth and assumed arrival timing to the main dashboard to compare routes and relocation feasibility.

These are **synthetic, assumption-driven estimates**. ETA is based on distance, assumed wave speed, and optional response lag; it is **not** a measured flood arrival time or validated forecast.

### Optional near-real-time environmental monitoring

The **Live Data Connector** on `/simulation` can retrieve public environmental readings:

- **Open-Meteo:** Current precipitation for entered latitude/longitude, refreshed approximately every five minutes while the tab is open. The reading is a weather-model/observation blend, not a local physical rain gauge.
- **USGS:** Optional river-gauge stage and recent stage rise for a valid USGS station ID. These are US stations; **no Indian river-gauge provider is currently integrated**.
- **Use Available Readings in Simulation:** Copies available rainfall and river-rise inputs into the illustrative model while preserving manually configured distance, wave speed, retention, and other assumptions.

If an external data provider is unavailable, the application indicates the problem rather than substituting invented live readings.

### Risk watches and browser alerts

- In-page signal watches flag illustrative elevated rainfall or gauge rise.
- Optional browser notifications can alert users when qualifying readings arrive **while the page is open**, subject to browser permission.
- The demo uses screening thresholds of rainfall **5 mm/h** or gauge rise **0.1 m** for a watch, and rainfall **20 mm/h** or gauge rise **0.3 m** for an elevated watch.
- Readings older than 90 minutes are excluded from alert evaluation.

These are **not official flood-warning thresholds**. The app does not send SMS, background push notifications, or emergency dispatch instructions.

### Custom scenarios and PDF reports

- Seven-step custom scenario builder with validation and a loadable example.
- Save, load, and delete up to 15 local drafts in the browser's `localStorage`.
- Download a locally generated PDF report with assumptions, infrastructure, shelter and transport constraints, comparisons, and limitations.

Local drafts are browser-specific and may disappear when site data is cleared. The PDF uses a basic built-in font, so some uncommon Unicode characters may appear as `?`.

## AWS integration

The application also includes a separate serverless API for saving scenarios to AWS. This is distinct from the browser-local custom-draft workflow described above.

```text
Browser / Next.js frontend
          |
          v
Next.js server-side API on Vercel
          |
          | IAM-authenticated SigV4 request
          v
Amazon API Gateway (HTTP API)
          |
          v
AWS Lambda
          |
          v
Amazon DynamoDB
```

| AWS technology | Role in CascadeOS |
| --- | --- |
| AWS Lambda | Processes serverless scenario API operations |
| Amazon API Gateway | Exposes the HTTP endpoint for the Lambda backend |
| Amazon DynamoDB | Persists scenarios handled by the AWS backend |
| AWS Identity and Access Management (IAM) | Controls API invocation and service permissions |
| AWS SDK for JavaScript / SigV4 libraries | Signs requests from the Next.js server-side API |

The Next.js frontend is hosted on Vercel; the scenario API backend uses AWS. AWS credentials must remain **server-side only** and must never be committed to GitHub or exposed through `NEXT_PUBLIC_` variables.

A production API scenario-save request has been tested successfully with an HTTP 200 response and a returned scenario ID. This does **not** imply that every browser-local draft is automatically synchronized to DynamoDB.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Visualization and scenario logic | Interactive 3D scene and deterministic planning model |
| Server-side integration | Next.js API routes |
| AWS backend | API Gateway, Lambda, DynamoDB, IAM, AWS SDK / SigV4 |
| Environmental data | Open-Meteo and optional USGS readings |
| Deployment | Vercel |
| Version control | Git and GitHub |

## Run locally

### Requirements

- Node.js 20+
- npm

Clone the repository:

```bash
git clone https://github.com/din-arr/CascadeOS.git
cd CascadeOS
npm install
npm run dev
```

Open the localhost address shown by Next.js. Visit `/simulation` to explore the demo.

### Optional AWS-backed scenario saving

To use the AWS scenario API locally, configure the server-side environment variables expected by the project. For the existing AWS deployment these include:

```dotenv
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

The API endpoint configuration must also match your deployed API Gateway endpoint and the variables referenced by the route implementation. Do not commit `.env.local` or real credentials. The interactive local simulation and browser-local drafts do not require AWS credentials.

## Testing and verification

Run the project's available checks:

```bash
npm run lint
npm run build
npm run test:scenario
npm run check:scenario
```

### Manual demo checklist

1. Open `/simulation` and click **Explore Demo**.
2. Orbit, zoom, pan, switch to **Top View**, and use **Reset Camera**. Camera movement should remain under user control.
3. Change **Scenario Peak Water Depth** and scrub **Illustrative Flood Progression**. Observe water and infrastructure status updates.
4. Toggle **Gate 1 closes 2 hours earlier** and inspect route, deadline, and comparison changes.
5. Select **Create Custom Scenario → Load Example Inputs → Run Simulation** and review the relocation planning summary.
6. Change shelter capacity or flood conditions to create an infeasible scenario and inspect the **UNVERIFIED** departure result.
7. Save a local draft, reload, load it from **Load Saved**, and optionally delete it.
8. Download the PDF report and verify the scenario, route, assumptions, and comparison details.
9. Open **Upstream → Downstream What-If**. Compare full retention (100%) with zero retention (0%) and apply the resulting depth to the main dashboard.
10. Adjust rainfall, river rise, distance, and assumed wave speed. Observe the estimated ETA and risk indicators.
11. Start **Live Data Connector** monitoring. Try an available location and optionally a valid USGS station ID; use available readings in the simulation.
12. Test in-page watches and optional browser notifications where permitted, and verify the layout at mobile widths.
13. If AWS is configured, separately test the server-side scenario-save endpoint and confirm a successful response.

External data retrieval, browser notification permissions, and interactive 3D rendering require a suitable browser and network connection. Automated model tests do not replace end-to-end browser verification.

## Known limitations and responsible use

- The scenario model is a simplified deterministic planning illustration, **not** calibrated hydrology, flood forecasting, traffic simulation, or an emergency evacuation model.
- Arrival ETA depends on manually assumed distance, wave speed, and response lag; it is not a measured or official flood-wave arrival time.
- The 3D scene is schematic rather than a real geospatial map. Custom scenario visualization is limited to a subset of assets.
- Gate what-if uses the first configured gate and a fixed two-hour earlier closure; alternative routes require configured route options.
- Potential population exposure is a coarse screening proxy, not a validated census or casualty estimate.
- Open-Meteo data is not a physical on-site rain sensor. USGS monitoring supports US stations, not Indian river gauges.
- Notifications are browser-local and require the tab to remain open; there is no SMS, background warning service, or emergency dispatch.
- Custom drafts use `localStorage`; AWS-backed saving is a separate API workflow.
- The IIIT Lucknow-like example and scenario infrastructure are fictional/synthetic.

**Never use CascadeOS outputs for real evacuation or flood emergency decisions. Follow official flood/weather alerts and local emergency authorities.**

## Future improvements

- Indian river-gauge and official warning-feed integration
- Validated hydrological models and terrain-aware geospatial data
- Calibrated travel-time and evacuation-routing estimates
- Opt-in background/mobile alert delivery
- Multi-user cloud scenario synchronization and collaborative planning

## Project vision

CascadeOS explores how communities could move from reactive flood response toward earlier, more understandable, data-informed preparedness. By combining interactive scenario comparisons, upstream signals, relocation constraints, and a serverless AWS backend, it offers a practical prototype for climate-resilience education and planning research.

Developed for the WeMakeDevs AWS Environmental Hackathon by students of IIIT Lucknow.


## Quick judge walkthrough

Open `/simulation` and choose **RUN GUIDED EXAMPLE**. The app loads a validated, editable synthetic campus scenario and computes the evacuation planning results immediately. Follow the three on-page links to inspect the flood model and Cascade Clock, compare the baseline with an earlier gate closure (including route and departure-time differences), and review the relocation summary. Download the PDF report to inspect assumptions and constraints.

To try your own inputs, choose **CREATE CUSTOM SCENARIO**, then **LOAD EXAMPLE INPUTS** for a valid editable starting point or fill in all seven tabs. Changes are not official flood forecasts or emergency instructions. Local drafts are saved in browser storage; they are not equivalent to a cloud save.

### Final deployment checks

- `npm ci`, `npm run test:scenario`, `npm run check:scenario`, and `npm run build`
- Verify guided example, gate what-if, PDF export, custom input clearing, and mobile layout in a browser.
- Verify the deployed AWS API workflow separately using authorized credentials; the frontend's local save does not imply DynamoDB persistence.
- Never commit `.env*`, AWS credentials, or personal data.

### Refined simulation dashboard (October 2026)

- The **Explore Demo** control now opens an explicit choice: **Start Guided Example** or **Reset Campus Demo**. Opening the menu does not change the current scenario.
- The scenario name, navigation, and workflow share a single compact toolbar. Local draft management is under **Saved scenarios & draft tools**.
- The 3D model and key decision monitors appear first. Use **Show All Monitors** to reveal the secondary capacity-deficit and aggregate tracking cards.
- The upstream rainfall / river-gauge connector and synthetic flood-arrival what-if model remain available under the expandable **Optional · Advanced Model** section.
- The PDF export action is at the end of the decision workflow. For edited custom scenarios, it is disabled until **Run Simulation** recalculates results.
- The core simulation, cloud API route, model assumptions, and report-generation logic are unchanged by this presentation pass.

### Final judging clarity pass (October 2026)

- **Scenario decision brief:** shows the actual calculated arrival assumption, last safe departure (or **UNVERIFIED** when constraints fail), evacuation demand, shelter shortfall and next modeled planning action. If custom inputs change, the brief waits for a new simulation.
- **Calculated comparison verdict:** explains route changes, modeled departure-window changes, shelter deficit and feasibility for the early-gate-failure what-if. No departure delta is invented when either scenario is infeasible.
- **Methodology disclosure:** a collapsible explanation of arrival assumptions, infrastructure dependencies, shelter/transport constraints and non-operational limitations.
- **Explicit cloud save:** the *Saved scenarios & draft tools* panel now has a separate **SAVE SCENARIO TO AWS** action for validated, already-run custom scenarios. It POSTs `{ "action": "save", "scenario": ... }` to the existing `/api/scenarios` route. The UI reports success only after a successful API response; it displays a scenario ID only if one is actually returned. An error or unavailable AWS configuration is shown as a failure, never a fake success. The deployed Lambda must accept this request shape; adapt it to the deployed backend contract if different. Cloud save is not automatic and does not replace local drafts.

The simulation calculations, upstream what-if estimator, PDF report generation, existing server-side AWS credentials flow and 3D scene are not changed by this pass.
