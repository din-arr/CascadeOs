"use client";

import Image from "next/image";
import Link from "next/link";
import CinematicMotion from "@/components/CinematicMotion";
import RainOverlay from "@/components/RainOverlay";

function Arrow() { return <span className="arrow" aria-hidden="true">↗</span>; }

const failures = [
  ["ELECTRICAL SYSTEMS", "Safety deadline", "7h 15m"],
  ["GATE 1", "Access failure", "6h 42m"],
  ["WATER PUMPS", "Service deadline", "7h 15m"],
];

const upstreamFeatures = [
  ["01 / UPSTREAM", "Upstream flood simulation", "Explore how rainfall and rising upstream water could affect downstream communities using a simplified what-if model."],
  ["02 / ARRIVAL", "Flood arrival ETA", "Estimate downstream arrival time from assumed travel distance and wave speed. This is not a verified forecast."],
  ["03 / RAINFALL", "Near-real-time rainfall", "Fetch recent rainfall conditions for selected coordinates from the Open-Meteo public weather feed."],
  ["04 / RIVER", "River-gauge monitoring", "Inspect supported USGS river-gauge readings for US stations. Indian river gauges are not connected."],
  ["05 / ALERTS", "Flood risk alerts", "View in-app risk signals and enable optional browser notifications while the monitoring tab is open."],
];

const steps = [
  ["01", "SIGNAL", "Upstream flood pulse detected"],
  ["02", "CASCADE", "Campus risk and failure windows calculated"],
  ["03", "CLOCK", "Last safe evacuation window ranked"],
  ["04", "MOVE", "Routes, buses, and shelter capacity coordinated"],
];

export default function Home() {
  return (
    <main className="cinematic-home">
      <CinematicMotion />
      <header className="cinematic-header">
        <Link href="#top" className="dark-brand">CASCADE<span>OS</span></Link>
        <nav><Link href="#intelligence">INTELLIGENCE</Link><Link href="#clock">CLOCK</Link><Link href="#experience">EXPERIENCE</Link></nav>
        <Link href="/simulation" className="dark-cta amber-cta" data-cursor="LAUNCH" data-magnetic>EXPLORE SIMULATION <Arrow /></Link>
      </header>

      <section className="cinematic-hero" id="top">
        <Image className="hero-photo" src="/images/cascade-flood-hero.jpg" alt="Aerial view of flooded homes and fields" fill priority sizes="100vw" />
        <div className="hero-shade" />
        <RainOverlay intensity="medium" />
        <div className="hero-content cinematic-content">
          <p className="eyebrow hero-eyebrow">CASCADEOS / FLOOD-TO-SAFE ENGINE</p>
          <h1>PREDICT FLOOD RISKS.<br /><em className="heading-accent">BEFORE THEY REACH YOU.</em></h1>
          <p className="hero-lede">Simulate rising upstream water, estimate downstream flood arrival time, monitor public rainfall signals, and plan safer relocations with CascadeOS.</p>
          <div className="hero-actions"><Link href="/simulation" className="dark-cta amber-cta" data-cursor="LAUNCH" data-magnetic>EXPLORE SIMULATION <Arrow /></Link><Link href="#intelligence" className="text-link ivory-link" data-cursor="EXPLORE">DISCOVER CASCADEOS <Arrow /></Link></div>
        </div>
        <div className="hero-readout"><span>FLOOD ETA / ILLUSTRATIVE MODEL</span><b>RAINFALL MONITOR / PUBLIC DATA</b><i>EXPLORE THE UPSTREAM INTELLIGENCE ↓</i></div>
      </section>

      
      <section className="upstream-home" id="upstream-intelligence" aria-labelledby="upstream-home-title">
        <div className="upstream-home-heading">
          <p className="eyebrow">NEW / UPSTREAM FLOOD INTELLIGENCE</p>
          <h2 id="upstream-home-title">Know what&apos;s coming. <em>Plan what&apos;s next.</em></h2>
          <p>Go beyond the local flood level. Explore upstream rainfall and river-rise scenarios, estimate downstream arrival times, and review risk signals before planning a response.</p>
        </div>
        <div className="upstream-home-grid">
          {upstreamFeatures.map(([number, title, description]) => (
            <article className="upstream-home-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="upstream-home-bottom">
          <p>Planning prototype: arrival estimates are illustrative. Public rainfall data is not an official flood warning; river-gauge readings currently support USGS stations in the US.</p>
          <Link href="/simulation#upstream" className="dark-cta amber-cta" data-cursor="LAUNCH" data-magnetic>TRY UPSTREAM INTELLIGENCE <Arrow /></Link>
        </div>
      </section>

      <section className="cascade-how" aria-labelledby="how-title">
        <div className="how-heading">
          <p className="eyebrow">THE WORKFLOW / 00</p>
          <h2 id="how-title">
            From flood signals <em>to a relocation plan.</em>
          </h2>
          <p>
            See the decision process, then test it using your own campus
            assumptions. All calculations are illustrative.
          </p>
        </div>

        <div className="how-steps">
          <div>
            <span>01 / INPUT</span>
            <strong>Define the conditions.</strong>
            <p>Population, rainfall, flood depth, infrastructure, shelters and available transport.</p>
          </div>

          <div>
            <span>02 / PREDICT</span>
            <strong>Find the constraints.</strong>
            <p>Estimate infrastructure failure windows, capacity gaps and last safe departure.</p>
          </div>

          <div>
            <span>03 / COMPARE</span>
            <strong>Stress-test the plan.</strong>
            <p>Simulate an earlier gate closure and inspect alternative route assumptions.</p>
          </div>

          <div>
            <span>04 / EXPORT</span>
            <strong>Review the scenario.</strong>
            <p>Save your local scenario and download an illustrative PDF planning report.</p>
          </div>
        </div>

        <Link href="/simulation" className="how-link">
          BUILD A CUSTOM SCENARIO ↗
        </Link>
      </section>


      <section className="editorial-section editorial-light reveal story-section--right" id="intelligence">
        <div className="section-atmosphere" aria-hidden="true" />
        <div className="section-top"><p className="eyebrow dark-eyebrow">01 / THE PROBLEM</p><span>FROM SIGNAL TO CONSEQUENCE</span></div>
        <div className="editorial-grid"><h2 className="flood-beginning-heading"><span className="flood-heading-main">THE FLOOD<br />IS ONLY</span><br /><em className="flood-heading-accent">THE BEGINNING.</em></h2><div className="editorial-copy"><p>When water rises, the real emergency is the chain of failures that follows. CascadeOS turns fragmented warnings into one decision layer for campus-scale relocation.</p><div className="failure-chain">{failures.map(([name, label, time]) => <div key={name}><b>{name}</b><span>{label}</span><strong>{time}</strong></div>)}</div></div></div>
      </section>

      <section className="image-story flood-intelligence-story reveal story-section--left">
        <div className="story-photo"><Image src="/images/cascade-flooded-campus.jpg" alt="Aerial view of an urban area affected by extensive floodwater" fill sizes="100vw" /></div>
        <RainOverlay />
        <div className="story-overlay"><p className="eyebrow">02 / FLOOD INTELLIGENCE</p><h2>SEE THE<br /><em>CASCADE</em><br />BEFORE IT ARRIVES.</h2><p>Use an illustrative flood model to trace how rising water changes access, infrastructure status, and the safe route out.</p><Link href="/simulation" className="text-link ivory-link">OPEN THE MODEL <Arrow /></Link></div>
        <aside className="flood-signal-card" aria-label="Illustrative flood signal preview">
          <div className="signal-card-top"><span>UPSTREAM SIGNAL / 02</span><span className="signal-status"><i /> SYNTHETIC</span></div>
          <div className="signal-card-title">From rising water<br />to a safer decision.</div>
          <div className="signal-graph" aria-label="Illustrative rising flood signal, not live monitoring data">
            <div className="signal-graph-label"><span>SIMULATED WATER TREND</span><span>RISING ↗</span></div>
            <svg viewBox="0 0 320 112" preserveAspectRatio="none" role="img" aria-label="Illustrative upward-trending floodwater graph">
              <defs><linearGradient id="signal-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8dbcd6" stopOpacity=".30"/><stop offset="100%" stopColor="#8dbcd6" stopOpacity="0"/></linearGradient></defs>
              <path d="M0 27 H320 M0 57 H320 M0 87 H320" stroke="#a4b9c7" strokeOpacity=".16" strokeDasharray="3 6" fill="none"/>
              <path d="M0 98 L38 95 L72 91 L105 85 L136 86 L169 68 L198 65 L225 47 L252 53 L282 27 L320 14 L320 112 L0 112 Z" fill="url(#signal-area)"/>
              <path d="M0 98 L38 95 L72 91 L105 85 L136 86 L169 68 L198 65 L225 47 L252 53 L282 27 L320 14" fill="none" stroke="#9bcce4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="320" cy="14" r="4.5" fill="#c6e7f6"/>
            </svg>
          </div>
          <div className="signal-card-metrics"><div><small>01 / DETECT</small><b>Flood pulse</b></div><div><small>02 / PREDICT</small><b>Failure windows</b></div><div><small>03 / RESPOND</small><b>Safe route</b></div></div>
          <p className="signal-card-note">Synthetic graph · live rainfall and supported US river gauges available in the simulation</p>
        </aside>
        <span className="image-caption">ILLUSTRATIVE FLOOD IMAGERY / NOT ACTUAL IIIT LUCKNOW FOOTAGE</span>
      </section>

      <section className="risk-duo reveal" aria-label="Infrastructure and weather risk signals">
        <div className="risk-panel risk-panel--right">
          <RainOverlay intensity="soft" className="risk-rain" />
          <div><p className="eyebrow">02A / APPROACHING PULSE</p><h2>READ THE<br /><em>WEATHER.</em></h2><p>Rainfall and upstream signals become an actionable timeline before water reaches the campus edge.</p></div>
          <span className="risk-caption">UPSTREAM SIGNAL / SYNTHETIC SCENARIO</span>
        </div>
        <div className="risk-panel risk-panel--left">
          <RainOverlay intensity="soft" className="risk-rain" />
          <div><p className="eyebrow">02B / INFRASTRUCTURE RISK</p><h2>KNOW WHAT<br /><em>FAILS FIRST.</em></h2><p>Dependencies are ranked by failure window, so teams can move people before systems become unsafe.</p></div>
          <span className="risk-caption">DEPENDENCY MAP / SYNTHETIC SCENARIO</span>
        </div>
      </section>

      <section className="editorial-section clock-story reveal story-section--right" id="clock">
        <div className="section-background-image" aria-hidden="true" />
        <RainOverlay intensity="soft" className="clock-rain" />
        <div className="section-top"><p className="eyebrow">03 / CASCADE CLOCK</p><span>DECISION SUPPORT / CONCEPT</span></div>
        <div className="clock-editorial"><div><h2 className="cinematic-lines"><span>THE LAST</span><br /><em><span>SAFE</span> <span>WINDOW.</span></em></h2><p className="body-copy">The clock ranks infrastructure deadlines against the one that matters most: the last safe moment to move.</p></div><div className="clock-card warm-card"><div className="clock-ring"><span>SAFE EVACUATION<br /><b>05:20:00</b></span></div><div className="deadline-list"><div><span>FLOOD ARRIVAL</span><b>12h 40m</b></div><div><span>ELECTRICAL SAFETY</span><b>7h 15m</b></div><div><span>GATE 1 FAILURE</span><b>6h 42m</b></div><div className="critical"><span>SAFE EVACUATION DEADLINE</span><b>5h 20m</b></div></div><div className="next-action"><small>NEXT ACTION / SIMULATION</small><strong>Secure 130 additional female accommodation beds within 48 minutes.</strong></div></div></div>
      </section>

      <section className="shelter-story reveal story-section--left">
        <div className="shelter-copy"><p className="eyebrow dark-eyebrow">04 / SHELTER CAPACITY</p><h2>400 BEDS<br />DOESN&apos;T MEAN<br /><em>400 SAFE.</em></h2><p>Capacity is only safe when every essential resource clears the threshold. The smallest resource sets the true number of people who can be received.</p><div className="capacity-card">{[["BEDS",400],["WATER",310],["FOOD",370],["SANITATION",350]].map(([label, value]) => <div className="capacity-row" key={label as string}><span>{label}</span><i><u style={{ width: `${(value as number) / 4}%` }} /></i><b>{value}</b></div>)}<div className="capacity-total"><span>ACTUAL SAFE CAPACITY</span><strong>310</strong></div><p className="warning">FEMALE SHELTER SHORTAGE / 130 PEOPLE</p></div></div>
        <div className="shelter-photo"><Image src="/images/cascade-emergency-shelter.jpg" alt="Emergency storm shelter facility" fill sizes="(max-width: 800px) 100vw, 45vw" /><span>ILLUSTRATIVE ACCOMMODATION / NOT A LIVE SHELTER RECORD</span></div>
      </section>

      <section className="technical-story reveal story-section--right">
        <div className="section-background-image" aria-hidden="true" />
        <RainOverlay intensity="soft" className="technical-rain" />
        <div className="section-top"><p className="eyebrow">05 / THE EXPERIENCE</p><span>INTERACTIVE 3D FLOOD MODEL</span></div>
        <div className="technical-grid"><div><h2 className="cinematic-lines"><span>ONE MODEL.</span><br /><em><span>EVERY</span> <span>DECISION.</span></em></h2><p className="body-copy">Orbit a synthetic campus, raise the water level, inspect infrastructure, and watch the evacuation route change when Gate 1 fails early.</p><Link href="/simulation" className="dark-cta amber-cta" data-cursor="LAUNCH" data-magnetic>ENTER COMMAND CENTER <Arrow /></Link></div><div className="mini-model"><div className="mini-grid" /><div className="mini-water" /><span className="mini-building building-a" /><span className="mini-building building-b" /><span className="mini-gate">GATE 1 / RISK</span><span className="mini-route">GATE 2 → SHELTER</span></div></div>
      </section>

      <section className="image-story evacuation-story reveal story-section--left" id="experience">
        <div className="story-photo"><Image src="/images/cascade-evacuation-response.jpg" alt="Emergency flood response transport operation" fill sizes="100vw" /></div>
        <RainOverlay />
        <div className="story-overlay"><p className="eyebrow">06 / EVACUATION ORCHESTRATION</p><h2>EVERY PERSON.<br /><em>EVERY ROUTE.</em></h2><div className="story-steps">{steps.map(([number, title, description]) => <div key={number}><span>{number}</span><div><b>{title}</b><small>{description}</small></div></div>)}</div><Link href="/simulation" className="text-link ivory-link">TEST THE ROUTE <Arrow /></Link></div><span className="image-caption">ILLUSTRATIVE RESPONSE IMAGERY / SYNTHETIC SCENARIO</span>
      </section>

      <section className="final-story reveal"><Image src="/images/cascade-flooded-road.jpg" alt="Aerial view of a road broken by floodwater" fill sizes="100vw" /><div className="final-shade" /><RainOverlay /><div className="final-content"><p className="eyebrow">DECISION SUPPORT / PROOF OF CONCEPT</p><h2>MOVE BEFORE<br /><em className="heading-accent">THE WINDOW CLOSES.</em></h2><Link href="/simulation" className="dark-cta final-cta interactive-accent" data-cursor="LAUNCH" data-magnetic>EXPLORE SIMULATION <Arrow /></Link><p className="disclaimer">Scenario forecasts and flood arrival times are illustrative. Public rainfall and supported US river readings are separate monitoring inputs, not official emergency warnings or certified evacuation instructions.</p></div></section>
      <footer className="dark-footer"><span>© 2026 CASCADEOS</span><Link href="/simulation">SIMULATION</Link><span>FLOOD-TO-SAFE / CONCEPT</span></footer>
    </main>
  );
}
