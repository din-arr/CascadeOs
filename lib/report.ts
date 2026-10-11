/** Dependency-free, client-side PDF summary of an illustrative scenario. */
import type { Scenario, SimulationResult } from "./scenario";

export type ReportLine = { text: string; kind?: "title" | "section" | "normal" };

const minutes = (n: number | null) => n === null ? "Unverified / insufficient data" : `${Math.floor(n / 60)}h ${Math.round(n % 60)}m`;

export function scenarioReportLines(s: Scenario, r: SimulationResult, alternate: SimulationResult): ReportLine[] {
  const lines: ReportLine[] = [
    { text: "CASCADEOS | SCENARIO REPORT", kind: "title" },
    { text: "ILLUSTRATIVE PLANNING MODEL - NOT A LIVE FORECAST OR CERTIFIED SAFETY SYSTEM" },
    { text: "Scenario details", kind: "section" },
    { text: `Name: ${s.name}` }, { text: `Campus / area: ${s.location || "Not supplied"}` },
    { text: `Scenario type: ${s.mode} | Last edited: ${s.updatedAt}` },
    { text: `Total population: ${s.population.total}; evacuation demand: ${s.population.evacuationDemand ?? s.population.total}` },
    { text: `Assumed peak depth: ${s.flood.floodDepth} m; rise rate: ${s.flood.waterRiseRate} m/hour` },
    { text: `Rainfall: ${s.flood.rainfallMmPerHour} mm/hour over ${s.flood.rainfallDurationHours} hours` },
    { text: `Source: ${s.flood.dataSource}` },
    { text: "Deadlines and feasibility", kind: "section" },
    { text: `Flood arrival assumption: ${minutes(r.floodArrivalMinutes)}` },
    { text: `Last safe departure: ${minutes(r.lastSafeDepartureMinutes)}` },
    { text: `Evacuation duration: ${minutes(r.evacuationMinutes)}` },
    { text: `Plan feasible: ${r.feasible ? "YES, under supplied assumptions" : "NO / UNVERIFIED"}` },
    { text: `Recommended action: ${r.nextAction}` },
    { text: "Infrastructure failure windows", kind: "section" },
    ...r.infrastructure.map(a => ({ text: `${a.name} (${a.type}): ${minutes(a.failureMinutes)} | ${a.status} | ${a.failureReason}` })),
    { text: "Shelters, transport and routes", kind: "section" },
    { text: `Effective shelter capacity: ${r.effectiveCapacity}; remaining: ${r.remainingCapacity}` },
    { text: `Shelter deficit: ${r.shelterDeficit}; accessible deficit: ${r.accessibleDeficit}; category-specific deficit: ${r.accommodationDeficit}` },
    ...s.shelters.map(sh => ({ text: `${sh.name}: beds ${sh.beds}, water ${sh.water}, food ${sh.food}, sanitation ${sh.sanitation}, occupied ${sh.currentOccupancy}` })),
    { text: `Available seats per wave: ${r.transportCapacity}; estimated trips: ${r.trips}` },
    { text: `Selected route: ${r.route?.name ?? "No feasible route"}` },
    ...s.routes.map(rt => ({ text: `Configured route ${rt.name}: ${rt.available ? "available" : "closed"}; closure ${minutes(rt.closureMinutes)}; gate ${rt.gate}` })),
    { text: `What-if: ${(s.infrastructure.find(a => a.type === "gate")?.name ?? "Gate 1")} fails 2 hours earlier`, kind: "section" },
    { text: `Original route: ${r.route?.name ?? "None"}; altered route: ${alternate.route?.name ?? "None"}` },
    { text: `Original departure: ${minutes(r.lastSafeDepartureMinutes)}; altered departure: ${minutes(alternate.lastSafeDepartureMinutes)}` },
    { text: `Original evacuation duration: ${minutes(r.evacuationMinutes)}; altered: ${minutes(alternate.evacuationMinutes)}` },
    { text: `What-if recommendation: ${alternate.nextAction}` },
    { text: "Tracking counts", kind: "section" },
    ...Object.entries(r.statusCounts).map(([key, value]) => ({ text: `${key}: ${value}` })),
    { text: "Model limitations", kind: "section" },
    { text: r.estimationNote },
    { text: "No GIS routing, verified flood forecast, verified shelter inventory, or emergency dispatch is provided." },
    { text: "For actual emergencies follow local authorities and official alerts." },
  ];
  return lines;
}

function latin(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^\x20-\x7e]/g, "?");
}
function escapePdf(text: string): string { return latin(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function wrap(text: string, max = 92): string[] {
  const words = latin(text).split(/\s+/);
  const result: string[] = []; let current = "";
  for (const word of words) {
    if (current && current.length + word.length + 1 > max) { result.push(current); current = ""; }
    if (word.length > max) {
      if (current) { result.push(current); current = ""; }
      for (let i = 0; i < word.length; i += max) result.push(word.slice(i, i + max));
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) result.push(current);
  return result.length ? result : [""];
}

/** Produces an actual downloadable PDF without network access or dependencies. */
export function buildScenarioPdf(lines: ReportLine[]): Uint8Array {
  const pages: string[][] = [[]];
  let y = 747;
  const push = (line: string, kind: ReportLine["kind"]) => {
    const size = kind === "title" ? 17 : kind === "section" ? 12 : 9;
    const step = kind === "title" ? 28 : kind === "section" ? 23 : 15;
    if (y - step < 55) { pages.push([]); y = 747; }
    const color = kind === "section" ? "0.05 0.43 0.35" : kind === "title" ? "0.05 0.24 0.3" : "0.12 0.18 0.22";
    pages[pages.length - 1].push(`${color} rg BT /F${kind === "normal" || !kind ? 1 : 2} ${size} Tf 45 ${y} Td (${escapePdf(line)}) Tj ET`);
    y -= step;
  };
  for (const entry of lines) for (const line of wrap(entry.text, entry.kind === "title" ? 55 : entry.kind === "section" ? 70 : 92)) push(line, entry.kind);
  const objects: string[] = [];
  const add = (content: string) => { objects.push(content); return objects.length; };
  const catalogId = add(""); const pagesId = add("");
  const regularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];
  pages.forEach((commands, index) => {
    const footer = `0.4 0.47 0.51 rg BT /F1 8 Tf 45 32 Td (CascadeOS - synthetic decision support | Page ${index + 1} of ${pages.length}) Tj ET`;
    const stream = [...commands, footer].join("\n") + "\n";
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`; });
  const start = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export function downloadScenarioPdf(s: Scenario, r: SimulationResult, alternate: SimulationResult): void {
  const pdf = buildScenarioPdf(scenarioReportLines(s, r, alternate));
  const blob = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cascadeos-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "scenario"}.pdf`;
  document.body.appendChild(link);
  link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
