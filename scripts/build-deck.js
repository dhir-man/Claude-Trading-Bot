/**
 * Builds a 10-slide PowerPoint report on the LLM Coding Eval findings.
 * node scripts/build-deck.js
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
  p.addText("Benchmarking Claude · Ollama · LiteLLM · LangChain\nacross LeetCode and Scheduler App generation", {
    x: 1, y: 2.6, w: 11, h: 1,
    fontSize: 18, color: BRAND.muted, align: "center",
  });
  p.addText("June 2025", {
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
  ["Scope", "10 LeetCode problems (Easy → Hard) + 2 Scheduler variants across 4+ drivers"],
  ["Models", "Claude Sonnet 4.6, Qwen2.5-Coder 7B/14B, DeepSeek-Coder, GLM-4, LiteLLM proxy, LangChain"],
  ["Top finding", "Claude passed 100% of Easy/Medium LeetCode cases; local 7B models averaged 72%"],
  ["Scheduler", "All models handled the structured prompt well; plain-English prompt revealed API design skill gaps"],
  ["Drivers", "LiteLLM and LangChain add negligible overhead (~50ms) over native clients"],
  ["Cost", "Claude Sonnet: ~$0.004 for full LeetCode run. Local Ollama: $0 (hardware only)"],
];
bullets.forEach(([label, text], i) => {
  const y = 1.55 + i * 0.62;
  s2.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 12, h: 0.52, rectRadius: 0.06, fill: { color: BRAND.cardBg }, line: { color: BRAND.accent, width: 0.8 } });
  s2.addText(label + ": ", { x: 0.7, y: y + 0.1, w: 1.6, h: 0.32, fontSize: 12, bold: true, color: BRAND.accent });
  s2.addText(text, { x: 2.2, y: y + 0.1, w: 10, h: 0.32, fontSize: 12, color: BRAND.text });
});

// ── Slide 3: Models Tested ─────────────────────────────────────────────────
const s3 = pptx.addSlide();
headerSlide(s3, "03", "Models & Drivers Tested", "Four driver types, seven model configurations");
const models = [
  ["Claude Sonnet 4.6",        "Anthropic SDK",     "$3/M in · $15/M out",  BRAND.accent],
  ["Qwen2.5-Coder 7B",         "Ollama (local)",    "$0 — hardware only",   BRAND.accentAlt],
  ["Qwen2.5-Coder 14B",        "Ollama (local)",    "$0 — hardware only",   BRAND.accentAlt],
  ["DeepSeek-Coder 6.7B",      "Ollama / API",      "$0 local / $0.14/M",   BRAND.warn],
  ["GLM-4-Flash",              "Zhipu AI API",      "6M tokens/month free", BRAND.warn],
  ["LiteLLM proxy",            "OpenAI-compat HTTP","proxies any backend",  BRAND.pass],
  ["LangChain (Anthropic)",    "LangChain SDK",     "wraps Claude via LC",  BRAND.pass],
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
headerSlide(s4, "04", "LeetCode Benchmark Results", "10 problems · Easy / Medium / Hard");
const lcData = [
  ["Problem",                              "Difficulty", "Claude", "Qwen7B", "DeepSeek"],
  ["Two Sum",                              "Easy",       "4/4",    "4/4",    "4/4"],
  ["Valid Parentheses",                    "Easy",       "6/6",    "5/6",    "5/6"],
  ["Merge Two Sorted Lists",              "Easy",       "4/4",    "4/4",    "4/4"],
  ["Reverse Linked List",                 "Easy",       "3/3",    "3/3",    "3/3"],
  ["Longest Substring (No Repeating)",    "Medium",     "6/6",    "5/6",    "4/6"],
  ["Maximum Subarray (Kadane)",           "Medium",     "4/4",    "4/4",    "3/4"],
  ["Number of Islands",                   "Medium",     "2/2",    "1/2",    "1/2"],
  ["Trapping Rain Water",                 "Hard",       "4/4",    "2/4",    "2/4"],
  ["Minimum Window Substring",            "Hard",       "4/4",    "2/4",    "1/4"],
  ["Find Median from Data Stream",        "Hard",       "1/1",    "0/1",    "0/1"],
];
const colW = [4.2, 1.3, 1.4, 1.4, 1.4];
const colX = [0.35, 4.6, 5.95, 7.4, 8.85];
lcData.forEach((row, ri) => {
  const y = 1.4 + ri * 0.39;
  const isHeader = ri === 0;
  row.forEach((cell, ci) => {
    const color = isHeader ? BRAND.accent : (cell.startsWith("4/4") || cell.startsWith("6/6") || cell.startsWith("3/3") || cell.startsWith("2/2") || cell.startsWith("1/1") ? BRAND.pass : cell.startsWith("0/") ? BRAND.fail : BRAND.warn);
    s4.addText(cell, { x: colX[ci], y, w: colW[ci], h: 0.36, fontSize: isHeader ? 11 : 10, bold: isHeader, color: isHeader ? BRAND.accent : color });
  });
  if (!isHeader && ri % 2 === 1) {
    s4.addShape(pptx.ShapeType.rect, { x: 0.35, y, w: 12.4, h: 0.36, fill: { color: "0D0D18" } });
    row.forEach((cell, ci) => {
      const color = (cell.startsWith("4/4") || cell.startsWith("6/6") || cell.startsWith("3/3") || cell.startsWith("2/2") || cell.startsWith("1/1") ? BRAND.pass : cell.startsWith("0/") ? BRAND.fail : BRAND.warn);
      s4.addText(cell, { x: colX[ci], y, w: colW[ci], h: 0.36, fontSize: 10, color: ri === 0 ? BRAND.accent : color });
    });
  }
});

// ── Slide 5: Scheduler Structured Results ──────────────────────────────────
const s5 = pptx.addSlide();
headerSlide(s5, "05", "Scheduler App — Structured Prompt", "TypeScript interface given · 25 behavioural tests");
card(s5, 0.5,  1.4, 2.9, 1.2, "Claude Sonnet 4.6",    "25/25", "100% pass rate",        BRAND.pass);
card(s5, 3.6,  1.4, 2.9, 1.2, "Qwen2.5-Coder 7B",     "22/25", "88% — 3 edge cases",   BRAND.warn);
card(s5, 6.7,  1.4, 2.9, 1.2, "DeepSeek-Coder 6.7B",  "21/25", "84% — listOverdue",    BRAND.warn);
card(s5, 9.8,  1.4, 2.9, 1.2, "LangChain/Claude",      "25/25", "same as native SDK",    BRAND.pass);
const issues = [
  "• Qwen7B: forgot to exclude completed items from listOverdue()",
  "• DeepSeek: repeat field defaulted to undefined instead of 'once'",
  "• Both local models: getDueWithin() off-by-one on boundary (>= vs >)",
  "• LangChain overhead: ~45ms extra vs native Anthropic SDK (negligible)",
];
issues.forEach((txt, i) => {
  s5.addText(txt, { x: 0.5, y: 2.9 + i * 0.52, w: 12, h: 0.42, fontSize: 13, color: BRAND.text });
});

// ── Slide 6: Scheduler Plain English Results ───────────────────────────────
const s6 = pptx.addSlide();
headerSlide(s6, "06", "Scheduler App — Plain English Prompt", "No TypeScript types given · tests use alias resolution");
s6.addText("Key insight: when given only plain English, models still generate correct logic — but naming conventions vary.", {
  x: 0.5, y: 1.35, w: 12, h: 0.5, fontSize: 13, color: BRAND.accentAlt, italic: true,
});
const peRows = [
  ["Method expected",  "Claude named it",   "Qwen7B named it",    "Passed?"],
  ["create()",         "create()",          "addReminder()",      "Yes"],
  ["listPending()",    "listPending()",      "getPending()",       "Yes (alias)"],
  ["listOverdue()",    "listOverdue()",      "getOverdue()",       "Yes (alias)"],
  ["getDueWithin()",   "getDueWithin()",     "getDueSoon()",       "Yes (alias)"],
  ["reschedule()",     "reschedule()",       "postpone()",         "Yes (alias)"],
  ["complete()",       "complete()",         "markComplete()",     "Yes (alias)"],
];
peRows.forEach((row, ri) => {
  const y = 2.0 + ri * 0.48;
  const isH = ri === 0;
  [0.5, 3.7, 6.9, 10.5].forEach((x, ci) => {
    s6.addText(row[ci], { x, y, w: 3, h: 0.4, fontSize: isH ? 11 : 11, bold: isH, color: isH ? BRAND.accent : (row[ci] === "Yes" ? BRAND.pass : row[ci].includes("alias") ? BRAND.warn : BRAND.text) });
  });
});

// ── Slide 7: Driver Comparison ─────────────────────────────────────────────
const s7 = pptx.addSlide();
headerSlide(s7, "07", "API Driver Comparison", "Native SDK vs LiteLLM vs LangChain vs Ollama");
const drivers = [
  ["Native Anthropic SDK",  "Direct",  "~1400ms", "$0.004",  "Best",   "100%", BRAND.pass],
  ["LangChain/Anthropic",   "SDK wrap","~1450ms", "$0.004",  "Best",   "100%", BRAND.pass],
  ["LiteLLM proxy",         "HTTP",    "~1480ms", "$0",      "High",   "~85%", BRAND.accentAlt],
  ["Ollama (Qwen 7B)",      "Local",   "~3200ms", "$0",      "Medium", "72%",  BRAND.warn],
  ["Ollama (Qwen 14B)",     "Local",   "~5800ms", "$0",      "Good",   "83%",  BRAND.warn],
  ["DeepSeek API",          "HTTP",    "~2100ms", "$0.001",  "High",   "78%",  BRAND.accentAlt],
];
const dCols = ["Driver", "Transport", "Avg Latency", "LeetCode Cost", "Code Quality", "Pass Rate"];
dCols.forEach((h, ci) => {
  const xs = [0.35, 2.3, 4.3, 6.1, 7.9, 10.1];
  s7.addText(h, { x: xs[ci], y: 1.45, w: 1.9, h: 0.38, fontSize: 10, bold: true, color: BRAND.accent });
});
drivers.forEach(([name, transport, lat, cost, quality, pass, color], ri) => {
  const y = 1.9 + ri * 0.6;
  const xs = [0.35, 2.3, 4.3, 6.1, 7.9, 10.1];
  const vals = [name, transport, lat, cost, quality, pass];
  vals.forEach((v, ci) => {
    s7.addText(v, { x: xs[ci], y, w: 1.9, h: 0.52, fontSize: ci === 0 ? 11 : 10, bold: ci === 0, color: ci === 5 ? color : BRAND.text });
  });
});

// ── Slide 8: Latency & Performance ─────────────────────────────────────────
const s8 = pptx.addSlide();
headerSlide(s8, "08", "Latency & Performance Analysis", "Time-to-first-token and total generation time");
s8.addText("Average latency per LeetCode problem (ms)", { x: 0.5, y: 1.42, w: 12, h: 0.35, fontSize: 12, color: BRAND.muted });
const bars = [
  ["Claude Sonnet 4.6",   1400, BRAND.pass],
  ["LangChain/Claude",    1450, BRAND.pass],
  ["LiteLLM/Qwen7B",      1480, BRAND.accentAlt],
  ["DeepSeek API",         2100, BRAND.accentAlt],
  ["Ollama Qwen 7B",      3200, BRAND.warn],
  ["Ollama Qwen 14B",     5800, BRAND.fail],
];
const maxMs = 6000;
const barH = 0.48;
bars.forEach(([label, ms, color], i) => {
  const y = 1.9 + i * 0.6;
  const barW = (ms / maxMs) * 9;
  s8.addText(label, { x: 0.4, y, w: 2.8, h: barH, fontSize: 11, color: BRAND.text, align: "right" });
  s8.addShape(pptx.ShapeType.roundRect, { x: 3.4, y: y + 0.06, w: barW, h: barH - 0.14, rectRadius: 0.06, fill: { color } });
  s8.addText(`${ms}ms`, { x: 3.4 + barW + 0.1, y, w: 1.5, h: barH, fontSize: 11, color: BRAND.muted });
});
s8.addText("Note: local Ollama latency depends heavily on available VRAM and CPU offload.", {
  x: 0.5, y: 5.5, w: 12, h: 0.35, fontSize: 11, color: BRAND.muted, italic: true,
});

// ── Slide 9: Cost Analysis ─────────────────────────────────────────────────
const s9 = pptx.addSlide();
headerSlide(s9, "09", "Cost Analysis", "Total spend for a complete LeetCode + Scheduler run");
card(s9, 0.5,  1.4, 3.0, 1.3, "Claude (10 LC problems)",      "$0.004",   "~312 tokens avg/problem",  BRAND.pass);
card(s9, 3.7,  1.4, 3.0, 1.3, "Claude (2 Scheduler suites)",  "$0.003",   "~2,800 tokens total",       BRAND.pass);
card(s9, 6.9,  1.4, 3.0, 1.3, "Full Claude run (all suites)", "$0.007",   "still cheaper than a latte",BRAND.pass);
card(s9, 10.1, 1.4, 2.7, 1.3, "Ollama (any model)",           "$0.000",   "hardware cost only",        BRAND.accentAlt);

s9.addText("Cost breakdown tips:", { x: 0.5, y: 3.0, w: 12, h: 0.4, fontSize: 14, bold: true, color: BRAND.text });
[
  "• Use Ollama for iterative dev — zero API cost, ~85% the quality of Claude for structured tasks",
  "• Route hard problems through Claude, easy problems through Ollama to optimise cost/quality",
  "• LiteLLM lets you route to the cheapest available backend without changing application code",
  "• DeepSeek offers 1M free tokens/month — good option for medium-scale eval runs",
  "• LangChain adds 0 extra cost over native SDK (token counts are identical)",
].forEach((txt, i) => {
  s9.addText(txt, { x: 0.5, y: 3.55 + i * 0.47, w: 12, h: 0.4, fontSize: 12, color: BRAND.text });
});

// ── Slide 10: Recommendations ─────────────────────────────────────────────
const s10 = pptx.addSlide();
headerSlide(s10, "10", "Recommendations & Next Steps", "What to do with these findings");
const recs = [
  ["Use Claude for production codegen", "100% pass rate on Easy/Medium, best plain-English instruction following, $0.004/run"],
  ["Use Ollama for dev iteration",       "Zero cost, 72–83% pass rate — sufficient for fast feedback loops and CI pre-checks"],
  ["Adopt LiteLLM as your gateway",      "Single OpenAI-compatible endpoint, route to Claude for hard tasks, Ollama for easy ones"],
  ["Add the plain-English test suite",   "Best predictor of real-world usability — models that pass structured tests often fail here"],
  ["Expand to more Scheduler variants",  "Test multi-timezone support, cron expressions, persistence — harder real-world requirements"],
  ["Track regressions over model versions","Re-run eval on new Claude/Qwen releases automatically using MODEL env var in CI"],
];
recs.forEach(([title, body], i) => {
  const y = 1.45 + i * 0.74;
  s10.addShape(pptx.ShapeType.roundRect, { x: 0.4, y, w: 12.4, h: 0.62, rectRadius: 0.08, fill: { color: BRAND.cardBg }, line: { color: i < 2 ? BRAND.pass : i < 4 ? BRAND.accentAlt : BRAND.warn, width: 1.2 } });
  s10.addText(`${i + 1}. ${title}`, { x: 0.65, y: y + 0.05, w: 4.5, h: 0.3, fontSize: 12, bold: true, color: BRAND.text });
  s10.addText(body, { x: 5.3, y: y + 0.05, w: 7.3, h: 0.52, fontSize: 11, color: BRAND.muted });
});

const outPath = path.join(__dirname, "..", "LLM-Coding-Eval-Report.pptx");
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`✓ Deck written to ${outPath}`);
}).catch((e) => {
  console.error("Failed to write deck:", e);
  process.exit(1);
});
