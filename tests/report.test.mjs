import test from "node:test";
import assert from "node:assert/strict";
import { buildScenarioPdf } from "../lib/report.ts";

test("PDF export has a valid header, xref and pages", () => {
  const lines = [{ text: "CascadeOS | Scenario Report", kind: "title" }, ...Array.from({ length: 120 }, (_, i) => ({ text: `Flood scenario test line ${i}: a flood risk analysis statement for testing.` }))];
  const bytes = buildScenarioPdf(lines);
  const pdf = new TextDecoder().decode(bytes);
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.ok(pdf.includes("/Count 3") || pdf.includes("/Count 2") || pdf.includes("/Count 4"));
  assert.ok(pdf.includes("startxref"));
  assert.ok(pdf.includes("/Type /Catalog"));
});
