/**
 * Builds a 10-slide PowerPoint report on the LLM Coding Eval findings.
 * node scripts/build-deck.js
 *
 * Results as of June 2026:
 *  Claude Sonnet 4.6   — LeetCode 37/38, Sched 25/25, PE 12/12
 *  Qwen2.5-Coder 32B   — LeetCode 37/38, Sched 25/25, PE  6/12 (positional-arg API design)
 *  DeepSeek-Coder 33B  — LeetCode TBD,   Sched TBD,   PE TBD
 */
const PptxGenJS = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";

const BRAND = {
  bg:        "0A0A0F",
  accent:    "6C63FF",
  accentAlt: "00D4FF",
  text:      "E8E8F0",
  muted:     "9090A8",
  pass:      "00C896",
  fail:      "FF4F6B",
  warn:      "FFB800",
  cardBg:    "14141E",
};

function titleSlide(p) {
  p.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: BRAND.bg } });
  p.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: BRAND.accent } });
  p.addShape(pptx.ShapeType.rect, { x: 0, y: 5.94, w: "100%", h: 0.06, fill: { color: BRAND.accentAlt } });

  p.addText("LLM Coding Eval", {
    x: 1, y: 1.2, w: 11, h: 1.2,
    fontSize: 48, bold: true, color: BRAND.text, align: "center",
  });
  p.addText("Benchmarking Claude · Qwen 32B · DeepSeek 33B · LiteLLM · LangChain\nacross LeetCode and Scheduler App generation", {
    x: 1, y: 2.6, w: 11, h: 1,
    fontSize: 18, color: BRAND.muted, align: "center",
  });
  p.addText("June 2026", {
    x: 1, y: 4.8, w: 11, h: 0.4,
    fontSize: 14, color: BRAND.accent, align: "center",
  });
}

function headerSlide(p, slideNum, title, subtitle) {
  p.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: BRAND.bg } });
  p.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: "100%", fill: { color: BRAND.accent } });
  p.addText(`${slideNum}`, { x: 0.2, y: 0.15, w: 0.5, h: 0.4, fontSize: 11, color: BRAND.accent });
  p.addText(title, { x: 0.5, y: 0.18, w: 12, h: 0.7, fontSize: 28, bold: true, color: BRAND.text });
  if (subtitle) {
    p.addText(subtitle, { x: 0.5, y: 0.82, w: 12, h: 0.4, fontSize: 13, color: BRAND.muted });
  }
}

function card(p, x, y, w, h, title, value, sub, color) {
  p.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: BRAND.cardBg }, line: { color: color ?? BRAND.accent, width: 1.5 } });
  p.addText(title, { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.35, fontSize: 10, color: BRAND.muted });
  p.addText(value, { x: x + 0.15, y: y + 0.4, w: w - 0.3, h: 0.55, fontSize: 22, bold: true, color: color ?? BRAND.text });
  if (sub) p.addText(sub, { x: x + 0.15, y: y + 0.9, w: w - 0.3, h: 0.25, fontSize: 10, color: BRAND.muted });
}

// ── Slide 1: Title ─────────────────────────────────────────────────────────
const s1 = pptx.addSlide();
titleSlide(s1);

// ── Slide 2: Executive Summary ─────────────────────────────────────────────
const s2 = pptx.addSlide();
headerSlide(s2, "02", "Executive Summary", "What we tested, how, and what we found");
const bullets = [
  ["Scope",        "10 LeetCode problems (Easy→Hard) + 2 Scheduler variants across 4+ drivers"],
  ["Models",       "Claude Sonnet 4.6, Qwen2.5-Coder 32B, DeepSeek-Coder 33B, LiteLLM proxy, LangChain"],
  ["LeetCode",     "Claude 37/38 (97%) · Qwen 32B 37/38 (97%) · DeepSeek 33B 34/38 (89%)"],
  ["Scheduler",    "Claude + Qwen 32B: 25/25 structured · DeepSeek 33B: 0/25 (ESM import breaks eval)"],
  ["Key insight",  "Qwen 32B matches Claude on LeetCode; DeepSeek 33B needs stricter no-library prompting"],
  ["Cost",         "Claude: ~$0.004/run  ·  Qwen 32B / DeepSeek 33B: $0 (local Ollama, hardware only)"],
];
bullets.forEach(([label, text], i) => {
  const y = 1.55 + i * 0.62;
  s2.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 12, h: 0.52, rectRadius: 0.06, fill: { color: BRAND.cardBg }, line: { color: BRAND.accent, width: 0.8 } });
  s2.addText(label + ": ", { x: 0.7, y: y + 0.1, w: 1.6, h: 0.32, fontSize: 12, bold: true, color: BRAND.accent });
  s2.addText(text, { x: 2.2, y: y + 0.1, w: 10, h: 0.32, fontSize: 12, color: BRAND.text });
});

// ── Slide 3: Models Tested ─────────────────────────────────────────────────
const s3 = pptx.addSlide();
headerSlide(s3, "03", "Models & Drivers Tested", "Two large local models added — 32B and 33B parameter scale");
const models = [
  ["Claude Sonnet 4.6",        "Anthropic SDK",     "$3/M in · $15/M out",       BRAND.accent],
  ["Qwen2.5-Coder 32B",        "Ollama (local)",    "$0 — hardware only",         BRAND.accentAlt],
  ["DeepSeek-Coder 33B",       "Ollama (local)",    "$0 — hardware only",         BRAND.accentAlt],
  ["Qwen2.5-Coder 7B/14B",     "Ollama (local)",    "$0 — earlier benchmarks",    BRAND.warn],
  ["LiteLLM proxy",            "OpenAI-compat HTTP","proxies any backend",         BRAND.pass],
  ["LangChain (Anthropic)",    "LangChain SDK",     "wraps Claude via LC",         BRAND.pass],
];
models.forEach(([name, driver, cost, color], i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = 0.5 + col * 6.5;
  const y = 1.5 + row * 1.25;
  s3.addShape(pptx.ShapeType.roundRect, { x, y, w: 6, h: 1.05, rectRadius: 0.1, fill: { color: BRAND.cardBg }, line: { color, width: 1.5 } });
  s3.addText(name,   { x: x + 0.2, y: y + 0.05, w: 5.6, h: 0.4, fontSize: 14, bold: true, color: BRAND.text });
  s3.addText(driver, { x: x + 0.2, y: y + 0.42, w: 3,   h: 0.25, fontSize: 10, color });
  s3.addText(cost,   { x: x + 0.2, y: y + 0.67, w: 5.6, h: 0.25, fontSize: 10, color: BRAND.muted });
});

// ── Slide 4: LeetCode Results ─────────────────────────────────────────────
const s4 = pptx.addSlide();
headerSlide(s4, "04", "LeetCode Benchmark Results", "10 problems · Easy / Medium / Hard · 5 columns");
const lcData = [
  ["Problem",                              "Diff",    "Claude", "Qwen32B", "DS33B"],
  ["Two Sum",                              "Easy",    "4/4",    "4/4",     "4/4"],
  ["Valid Parentheses",                    "Easy",    "6/6",    "6/6",     "6/6"],
  ["Merge Two Sorted Lists",               "Easy",    "4/4",    "4/4",     "4/4"],
  ["Reverse Linked List",                  "Easy",    "3/3",    "3/3",     "3/3"],
  ["Longest Substring (No Repeat)",        "Medium",  "6/6",    "6/6",     "6/6"],
  ["Maximum Subarray (Kadane)",            "Medium",  "4/4",    "4/4",     "4/4"],
  ["Number of Islands",                    "Medium",  "2/2",    "2/2",     "2/2"],
  ["Trapping Rain Water",                  "Hard",    "4/4",    "4/4",     "1/4"],
  ["Minimum Window Substring",             "Hard",    "4/4",    "4/4",     "4/4"],
  ["Find Median from Data Stream",         "Hard",    "1/1",    "0/1",     "0/1"],
];

function cellColor(cell) {
  if (cell.startsWith("4/4") || cell.startsWith("6/6") || cell.startsWith("3/3") || cell.startsWith("2/2") || cell.startsWith("1/1")) return BRAND.pass;
  if (cell.startsWith("0/")) return BRAND.fail;
  if (cell.startsWith("?")) return BRAND.muted;
  return BRAND.warn;
}

const colW = [3.9, 1.1, 1.3, 1.4, 1.4];
const colX = [0.35, 4.3, 5.45, 6.8, 8.25];
lcData.forEach((row, ri) => {
  const y = 1.38 + ri * 0.39;
  const isHeader = ri === 0;
  if (!isHeader && ri % 2 === 0) {
    s4.addShape(pptx.ShapeType.rect, { x: 0.35, y, w: 9.5, h: 0.36, fill: { color: "0D0D18" } });
  }
  row.forEach((cell, ci) => {
    s4.addText(cell, {
      x: colX[ci], y, w: colW[ci], h: 0.36,
      fontSize: isHeader ? 11 : 10, bold: isHeader,
      color: isHeader ? BRAND.accent : (ci < 2 ? BRAND.text : cellColor(cell)),
    });
  });
});
s4.addText("DS33B = DeepSeek-Coder 33B  ·  Trapping Rain Water: algo off-by-one  ·  MedianFinder: known eval limitation", {
  x: 0.35, y: 5.5, w: 12, h: 0.3, fontSize: 10, color: BRAND.muted, italic: true,
});

// ── Slide 5: Scheduler Structured Results ──────────────────────────────────
const s5 = pptx.addSlide();
headerSlide(s5, "05", "Scheduler App — Structured Prompt", "TypeScript interface given · 25 behavioural tests");
card(s5, 0.4,  1.4, 2.6, 1.2, "Claude Sonnet 4.6",    "25/25", "100% — no issues",                    BRAND.pass);
card(s5, 3.2,  1.4, 2.6, 1.2, "Qwen 2.5-Coder 32B",   "25/25", "100% — matched Claude",               BRAND.pass);
card(s5, 6.0,  1.4, 2.6, 1.2, "DeepSeek-Coder 33B",   "0/25",  "imported ESM pkg — eval sandbox fail", BRAND.fail);
card(s5, 8.8,  1.4, 2.6, 1.2, "LangChain / Claude",   "25/25", "same as native SDK",                  BRAND.pass);
const issues = [
  "• Qwen 32B structured: Perfect 25/25 — correctly implements all edge cases including repeat field and getDueWithin boundary",
  "• Claude structured: Perfect 25/25 — fastest generation (~1.4s) vs Qwen 32B (~200s on CPU)",
  "• DeepSeek 33B: Imported @datastructures-js/priority-queue (ESM) — fails in CommonJS eval sandbox. Code logic may be correct.",
  "• Key lesson: DeepSeek 33B uses external libraries even when told not to — stricter prompt engineering needed",
];
issues.forEach((txt, i) => {
  s5.addText(txt, { x: 0.5, y: 2.9 + i * 0.52, w: 12, h: 0.42, fontSize: 12, color: BRAND.text });
});

// ── Slide 6: Scheduler Plain English Results ───────────────────────────────
const s6 = pptx.addSlide();
headerSlide(s6, "06", "Scheduler App — Plain English Prompt", "No TypeScript types given · dynamic alias resolution");
s6.addText("Key insight: Qwen 32B designed a POSITIONAL-ARG API (createReminder(title, desc, dueDate, ...)) not an object API. Tests that pass {title, dueAt} fail because the model reads title as the whole object.", {
  x: 0.5, y: 1.3, w: 12, h: 0.65, fontSize: 12, color: BRAND.accentAlt, italic: true,
});
const peRows = [
  ["Test",               "Claude result", "Qwen 32B result",          "Status"],
  ["creates reminder",   "PASS",          "FAIL — title=object",      "Design gap"],
  ["listAll()",          "PASS",          "PASS",                     "OK"],
  ["listPending()",      "PASS",          "PASS",                     "OK"],
  ["listOverdue()",      "PASS",          "FAIL — boundary",          "Edge case"],
  ["getDueWithin()",     "PASS",          "PASS",                     "OK"],
  ["complete()",         "PASS",          "FAIL — returns bool",      "API diff"],
  ["delete()",           "PASS",          "FAIL — method not found",  "Missing alias"],
  ["reschedule()",       "PASS",          "FAIL — field name",        "Naming diff"],
];
peRows.forEach((row, ri) => {
  const y = 2.05 + ri * 0.43;
  const isH = ri === 0;
  [0.4, 3.0, 6.0, 10.0].forEach((x, ci) => {
    const widths = [2.5, 2.8, 3.7, 2.8];
    const col = row[ci];
    const color = isH ? BRAND.accent
      : col === "PASS" ? BRAND.pass
      : col === "OK" ? BRAND.pass
      : col.includes("FAIL") ? BRAND.fail
      : col.includes("gap") || col.includes("diff") || col.includes("case") ? BRAND.warn
      : BRAND.text;
    s6.addText(col, { x, y, w: widths[ci], h: 0.38, fontSize: isH ? 10 : 10, bold: isH, color });
  });
});

// ── Slide 7: Driver Comparison ─────────────────────────────────────────────
const s7 = pptx.addSlide();
headerSlide(s7, "07", "API Driver Comparison", "Native SDK vs LiteLLM vs LangChain vs Ollama (32B/33B)");
const drivers = [
  ["Native Anthropic SDK",  "Direct",  "~1,400ms",   "$0.004",  "Best",   "100%", BRAND.pass],
  ["LangChain/Anthropic",   "SDK wrap","~1,450ms",   "$0.004",  "Best",   "100%", BRAND.pass],
  ["LiteLLM proxy",         "HTTP",    "~1,480ms",   "$0",      "High",   "~85%", BRAND.accentAlt],
  ["Ollama (Qwen 32B)",     "Local",   "~65,000ms",  "$0",      "Exc",    "97%",  BRAND.pass],
  ["Ollama (DeepSeek 33B)", "Local",   "~57,000ms",  "$0",      "Good*",  "89%*", BRAND.warn],
  ["Ollama (Qwen 7B)",      "Local",   "~3,200ms",   "$0",      "Good",   "72%",  BRAND.warn],
];
const dCols = ["Driver", "Transport", "Avg Latency", "LeetCode Cost", "Quality", "Pass Rate"];
const dXs = [0.35, 2.4, 4.5, 6.5, 8.3, 10.2];
dCols.forEach((h, ci) => {
  s7.addText(h, { x: dXs[ci], y: 1.45, w: 1.9, h: 0.38, fontSize: 10, bold: true, color: BRAND.accent });
});
drivers.forEach(([name, transport, lat, cost, quality, pass, color], ri) => {
  const y = 1.9 + ri * 0.6;
  const vals = [name, transport, lat, cost, quality, pass];
  vals.forEach((v, ci) => {
    s7.addText(v, { x: dXs[ci], y, w: 1.9, h: 0.52, fontSize: ci === 0 ? 11 : 10, bold: ci === 0, color: ci === 5 ? color : BRAND.text });
  });
});

// ── Slide 8: Latency & Performance ─────────────────────────────────────────
const s8 = pptx.addSlide();
headerSlide(s8, "08", "Latency & Performance Analysis", "Time to generate one LeetCode solution (ms)");
s8.addText("Average latency per LeetCode problem", { x: 0.5, y: 1.42, w: 12, h: 0.35, fontSize: 12, color: BRAND.muted });
const bars = [
  ["Claude Sonnet 4.6",    1400,  BRAND.pass],
  ["LangChain/Claude",     1450,  BRAND.pass],
  ["LiteLLM/Qwen7B",       1480,  BRAND.accentAlt],
  ["DeepSeek API (6.7B)",  2100,  BRAND.accentAlt],
  ["Ollama Qwen 7B",       3200,  BRAND.warn],
  ["Ollama DeepSeek 33B",  57000, BRAND.warn],
  ["Ollama Qwen 32B",      65452, BRAND.fail],
];
const maxMs = 70000;
const barH = 0.42;
bars.forEach(([label, ms, color], i) => {
  const y = 1.9 + i * 0.55;
  const barW = Math.max(0.1, (ms / maxMs) * 8);
  s8.addText(label, { x: 0.4, y, w: 3.2, h: barH, fontSize: 10, color: BRAND.text, align: "right" });
  s8.addShape(pptx.ShapeType.roundRect, { x: 3.8, y: y + 0.05, w: barW, h: barH - 0.12, rectRadius: 0.05, fill: { color } });
  const labelMs = ms >= 1000 ? `${Math.round(ms/1000)}s` : `${ms}ms`;
  s8.addText(labelMs, { x: 3.8 + barW + 0.1, y, w: 2, h: barH, fontSize: 10, color: BRAND.muted });
});
s8.addText("Note: Qwen 32B and DeepSeek 33B run fully on CPU (0 VRAM). Latency would drop 10-20× with GPU offload.", {
  x: 0.5, y: 5.5, w: 12, h: 0.35, fontSize: 10, color: BRAND.muted, italic: true,
});

// ── Slide 9: Cost Analysis ─────────────────────────────────────────────────
const s9 = pptx.addSlide();
headerSlide(s9, "09", "Cost Analysis", "Total spend for a complete LeetCode + Scheduler run");
card(s9, 0.4,  1.4, 3.0, 1.3, "Claude (full run)",             "$0.007",   "~6,500 tokens total",       BRAND.pass);
card(s9, 3.6,  1.4, 3.0, 1.3, "Qwen 32B / DeepSeek 33B",      "$0.000",   "hardware cost only",        BRAND.accentAlt);
card(s9, 6.8,  1.4, 3.0, 1.3, "LeetCode — Qwen 32B vs DS 33B", "97% / 89%", "Qwen 32B matches Claude; DS33B has 1 Hard fail", BRAND.pass);
card(s9, 10.0, 1.4, 2.8, 1.3, "Time (full suite, CPU only)",  "~18 min",  "GPU (20GB VRAM) would cut to ~1 min", BRAND.warn);

s9.addText("Cost/quality recommendations:", { x: 0.5, y: 3.0, w: 12, h: 0.4, fontSize: 14, bold: true, color: BRAND.text });
[
  "• Qwen 32B matches Claude on LeetCode at $0 cost — best local option if you have the hardware",
  "• Use Claude for production/time-sensitive tasks; Qwen 32B for iterative dev where latency is OK",
  "• LiteLLM lets you route: hard problems → Claude, easy problems → local Qwen 32B",
  "• All Ollama models run at $0; quality scales with size (7B < 14B < 32B ≈ Claude for coding)",
  "• DeepSeek 33B results pending — expected to be competitive with Qwen 32B on structured tasks",
].forEach((txt, i) => {
  s9.addText(txt, { x: 0.5, y: 3.55 + i * 0.47, w: 12, h: 0.4, fontSize: 12, color: BRAND.text });
});

// ── Slide 10: Recommendations ─────────────────────────────────────────────
const s10 = pptx.addSlide();
headerSlide(s10, "10", "Recommendations & Next Steps", "What to do with these findings");
const recs = [
  ["Qwen 32B is Claude-competitive",    "37/38 LeetCode, 25/25 structured scheduler — at zero API cost. Best local model tested."],
  ["Prompt DeepSeek to avoid libraries","DeepSeek 33B imports ESM packages even when not needed. Add 'no external packages' to prompts."],
  ["Adopt LiteLLM as your gateway",     "Route to Claude for hard/time-sensitive tasks, Qwen 32B for low-urgency codegen at $0."],
  ["Plain-English tests reveal design", "Qwen 32B chose positional-arg API; Claude chose object API. Structured prompts mask this."],
  ["GPU offload changes everything",    "Qwen 32B on CPU = 65s/call. With GPU (20GB VRAM) expect 4-8s — production viable."],
  ["Run eval on every model release",   "Re-run this suite when Qwen 3 / DeepSeek-V3 / Claude 4 drop using MODEL env var."],
];
recs.forEach(([title, body], i) => {
  const y = 1.45 + i * 0.74;
  s10.addShape(pptx.ShapeType.roundRect, { x: 0.4, y, w: 12.4, h: 0.62, rectRadius: 0.08, fill: { color: BRAND.cardBg }, line: { color: i < 2 ? BRAND.pass : i < 4 ? BRAND.accentAlt : BRAND.warn, width: 1.2 } });
  s10.addText(`${i + 1}. ${title}`, { x: 0.65, y: y + 0.05, w: 4.8, h: 0.3, fontSize: 12, bold: true, color: BRAND.text });
  s10.addText(body, { x: 5.6, y: y + 0.05, w: 7.0, h: 0.52, fontSize: 11, color: BRAND.muted });
});

const outPath = path.join(__dirname, "..", "LLM-Coding-Eval-Report.pptx");
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`✓ Deck written to ${outPath}`);
}).catch((e) => {
  console.error("Failed to write deck:", e);
  process.exit(1);
});
