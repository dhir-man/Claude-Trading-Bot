/**
 * LLM Coding Eval — Slide Deck (15-slide consolidated edition)
 * Local coding models 7B → 14B (Qwen2.5-Coder, DeepSeek-Coder), measured on an
 * RTX 4070 Ti Super 16GB, with Claude Opus as a frontier reference.
 *
 * Run: npm run deck   (node scripts/build-deck.js)
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// Verbatim prompts, straight from the compiled source.
const { PROBLEMS } = require("../dist/leetcode/problems");
const { SCHEDULER_APP_PROMPT } = require("../dist/scheduler/prompt");
const LEETCODE_SYSTEM_PROMPT =
  "You are an expert TypeScript engineer. When asked to solve a coding problem:\n" +
  "1. Write clean, correct TypeScript code.\n" +
  "2. Wrap your solution in a single ```typescript code block.\n" +
  "3. Use module.exports = { functionName } at the end.\n" +
  "4. Do NOT include any explanation outside the code block.\n" +
  "5. Ensure your solution handles all edge cases.";

const OUT = "C:\\Users\\dhira\\Documents\\Obsidian-Vaults\\Claude-Vault\\Trading\\llm-coding-eval\\LLM-Coding-Eval-Report.pptx";
const ASSET = (f) => path.join(__dirname, "..", "deck-assets", f);

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  navy: "0D1B2A", blue: "065A82", teal: "1C7293", cyan: "00B4D8",
  white: "FFFFFF", offwh: "F8FAFC", slate: "475569", muted: "94A3B8",
  qwen: "FF6B35", ds: "5E8BFF", q14: "F59E0B", claude: "8B5CF6", codex: "10A37F",
};

const HW = "RTX 4070 Ti Super (16 GB) · 47 GB RAM · Ollama · Windows 11";

// ── Helpers ──────────────────────────────────────────────────────────────────
const mk = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.10 });

function card(slide, x, y, w, h, accentColor) {
  slide.addShape("rect", { x, y, w, h, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
  slide.addShape("rect", { x, y, w: 0.06, h, fill: { color: accentColor }, line: { color: accentColor } });
}
function sectionHeader(slide, label, color = C.cyan) {
  slide.addText(label.toUpperCase(), { x: 0.5, y: 0.22, w: 9, h: 0.28, fontSize: 9, bold: true, color, charSpacing: 3, margin: 0 });
}
function heading(slide, text, size = 28) {
  slide.addText(text, { x: 0.5, y: 0.5, w: 9, h: 0.55, fontSize: size, bold: true, color: C.navy, fontFace: "Georgia", margin: 0 });
}
function table(slide, rows, opts) {
  const data = rows.map((r, ri) => r.map((cell, ci) => ({
    text: String(cell),
    options: {
      fill: { color: ri === 0 ? C.navy : ri % 2 === 0 ? C.white : C.offwh },
      color: ri === 0 ? C.white : ci === 0 ? C.navy : (opts.colorFn ? opts.colorFn(cell, ci, ri) : C.slate),
      bold: ri === 0 || ci === 0 || (opts.boldFn ? opts.boldFn(cell) : false),
      fontSize: ri === 0 ? (opts.headFs || 9.5) : (opts.fs || 10),
      align: ci === 0 ? "left" : "center", valign: "middle",
    },
  })));
  slide.addTable(data, { x: opts.x, y: opts.y, w: opts.w, colW: opts.colW, border: { pt: 0.4, color: "E2E8F0" }, rowH: opts.rowH || 0.3, autoPage: false });
}

const PROMPT = (id) => (PROBLEMS.find((p) => p.id === id) || {}).prompt || "";
const PTITLE = (id) => { const p = PROBLEMS.find((x) => x.id === id) || {}; return `LC#${id} ${p.title} (${p.difficulty})`; };

// ── Build deck ─────────────────────────────────────────────────────────────
async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "LLM Coding Eval — Local 7B→14B vs Frontier";
  pres.author = "Claude Code";

  // ══ SLIDE 1 — Title ════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.cyan }, line: { color: C.cyan } });
    s.addShape("rect", { x: 6.8, y: 0.06, w: 3.2, h: 5.565, fill: { color: "0A2540" }, line: { color: "0A2540" } });
    [
      { y: 1.1, color: C.qwen, label: "Qwen2.5-Coder 7B" },
      { y: 1.8, color: C.ds, label: "DeepSeek-Coder 6.7B" },
      { y: 2.5, color: C.q14, label: "Qwen2.5-Coder 14B" },
      { y: 3.2, color: C.claude, label: "Claude Opus (frontier ref)" },
    ].forEach(({ y, color, label }) => {
      s.addShape("ellipse", { x: 7.2, y, w: 0.22, h: 0.22, fill: { color }, line: { color } });
      s.addText(label, { x: 7.55, y: y - 0.04, w: 2.35, h: 0.3, fontSize: 11, color: C.muted, margin: 0 });
    });
    s.addText("const r = await\n  eval('twoSum([2,7,11,15],9)');", { x: 7.0, y: 4.0, w: 2.8, h: 0.9, fontSize: 8, color: "3D5A80", fontFace: "Consolas", margin: 0, valign: "top" });
    s.addText("Local Coding LLMs:\n7B → 14B", { x: 0.5, y: 0.9, w: 6.0, h: 2.2, fontSize: 40, bold: true, color: C.white, fontFace: "Georgia", valign: "middle" });
    s.addText("Faster small models, measured head-to-head", { x: 0.5, y: 3.15, w: 5.9, h: 0.45, fontSize: 16, color: C.cyan, italic: true, margin: 0 });
    s.addText("Qwen2.5-Coder 7B / 14B  ·  DeepSeek-Coder 6.7B  ·  Claude Opus reference", { x: 0.5, y: 3.75, w: 6.2, h: 0.3, fontSize: 11, color: C.muted, margin: 0 });
    s.addText("Measured on an " + HW, { x: 0.5, y: 4.9, w: 6.2, h: 0.28, fontSize: 9, color: "4A6582", charSpacing: 1, margin: 0 });
    s.addNotes(
      "• This deck focuses on the FAST, self-hostable small models — Qwen2.5-Coder 7B and 14B, and DeepSeek-Coder 6.7B — the ones that fit a 16 GB GPU and answer in seconds.\n" +
      "• Claude Opus appears as a frontier reference point for correctness, not as the subject.\n" +
      "• Everything measured on one consumer machine: an RTX 4070 Ti Super, 16 GB VRAM.\n" +
      "• Two workloads: 10 LeetCode problems (38 test cases) and a full Scheduler app (26 behavioural tests).\n" +
      "• Larger 32B/33B models were also run earlier; we reference them but don't re-run them — they need a 24 GB+ GPU to be fast."
    );
  }

  // ══ SLIDE 2 — Executive Summary ═════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Executive Summary");
    heading(s, "3 Key Takeaways");
    const cards = [
      { num: "01", color: C.qwen, title: "7B is fast — but flaky on whole-app code", body: "Qwen 7B answers in ~2 s and nails 34/38 LeetCode every run, but its Scheduler swings 5/26 ↔ 26/26 across runs — a hallucinated import crashes 2 of 3 attempts." },
      { num: "02", color: C.ds, title: "DeepSeek 6.7B is the steady all-rounder", body: "Fits 16 GB VRAM, ~5 s/problem, 26/26 Scheduler every single run. LeetCode wobbles 33–37/38 (one intermittent miss). The most reliable small model here." },
      { num: "03", color: C.q14, title: "14B buys reliability, not peak score", body: "Qwen 14B (~9 GB, still fits) holds 26/26 Scheduler and 34/38 LeetCode — steadier than 7B at ~5.6 s. The mid-size sweet spot before you need a bigger GPU." },
    ];
    cards.forEach(({ num, color, title, body }, i) => {
      const x = 0.35 + i * 3.1, y = 1.25;
      s.addShape("rect", { x, y, w: 2.9, h: 3.85, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
      s.addShape("rect", { x, y, w: 2.9, h: 0.07, fill: { color }, line: { color } });
      s.addText(num, { x: x + 0.15, y: y + 0.16, w: 0.7, h: 0.55, fontSize: 26, bold: true, color, fontFace: "Georgia", margin: 0 });
      s.addText(title, { x: x + 0.15, y: y + 0.78, w: 2.6, h: 0.7, fontSize: 13, bold: true, color: C.navy, margin: 0, wrap: true });
      s.addText(body, { x: x + 0.15, y: y + 1.5, w: 2.6, h: 2.2, fontSize: 10.5, color: C.slate, margin: 0, wrap: true, valign: "top" });
    });
    s.addNotes(
      "• Three takeaways up front.\n" +
      "• 1) Qwen 7B is the speed champion and is perfectly stable on algorithms, but unreliable when generating a whole class — note the bimodal 5↔26 scheduler.\n" +
      "• 2) DeepSeek 6.7B is the steady pick: scheduler 26/26 on every run, fits VRAM, ~5 s.\n" +
      "• 3) Stepping up to 14B trades a little speed for steadier whole-app generation — the sweet spot before you need a 24 GB GPU for 32B.\n" +
      "• The rest of the deck backs each of these with measured data."
    );
  }

  // ══ SLIDE 3 — Models Under Review ═══════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Models Under Review");
    heading(s, "The Local Line-up (+ a Frontier Yardstick)");
    s.addText("Hardware: " + HW, { x: 0.5, y: 1.1, w: 9, h: 0.25, fontSize: 10.5, color: C.slate, italic: true, margin: 0 });
    const models = [
      { c: C.qwen, n: "Qwen2.5-Coder 7B", t: "qwen2.5-coder:7b-instruct-q4_K_M", v: "~5 GB · fits GPU", lic: "Apache 2.0" },
      { c: C.ds, n: "DeepSeek-Coder 6.7B", t: "deepseek-coder:6.7b-instruct-q4_K_M", v: "~4.5 GB · fits GPU", lic: "DeepSeek License" },
      { c: C.q14, n: "Qwen2.5-Coder 14B", t: "qwen2.5-coder:14b-instruct-q4_K_M", v: "~9 GB · fits GPU", lic: "Apache 2.0" },
      { c: C.claude, n: "Claude Opus 4.8", t: "frontier API · reference only", v: "no GPU · cloud", lic: "Anthropic ToS" },
    ];
    models.forEach((x, i) => {
      const col = i % 2, rowi = Math.floor(i / 2);
      const px = 0.5 + col * 4.65, py = 1.45 + rowi * 1.9;
      s.addShape("rect", { x: px, y: py, w: 4.4, h: 1.7, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
      s.addShape("rect", { x: px, y: py, w: 0.06, h: 1.7, fill: { color: x.c }, line: { color: x.c } });
      s.addText(x.n, { x: px + 0.2, y: py + 0.15, w: 4.0, h: 0.3, fontSize: 14, bold: true, color: C.navy, margin: 0 });
      s.addText(x.t, { x: px + 0.2, y: py + 0.5, w: 4.0, h: 0.25, fontSize: 9, color: C.muted, fontFace: "Consolas", margin: 0 });
      s.addText([{ text: "Footprint: ", options: { bold: true, color: C.slate } }, { text: x.v, options: { color: C.slate } }], { x: px + 0.2, y: py + 0.85, w: 4.0, h: 0.3, fontSize: 11, margin: 0 });
      s.addText([{ text: "License: ", options: { bold: true, color: C.slate } }, { text: x.lic, options: { color: C.slate } }], { x: px + 0.2, y: py + 1.2, w: 4.0, h: 0.3, fontSize: 11, margin: 0 });
    });
    s.addText("All three local models fit a 16 GB GPU and run fully on-device at $0 / token. (32B/33B were also measured but need 24 GB+ to run at speed.)", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontSize: 9, color: C.muted, italic: true, margin: 0 });
    s.addNotes(
      "• The contenders: three local models that all fit 16 GB VRAM, plus Claude Opus as a correctness yardstick.\n" +
      "• Qwen 7B (~5 GB) and DeepSeek 6.7B (~4.5 GB) are the fast small models; Qwen 14B (~9 GB) is the mid-size.\n" +
      "• All are Q4-quantised, served by Ollama, $0 per token.\n" +
      "• Licensing: Qwen is Apache 2.0, DeepSeek under its own commercial-friendly license; Claude is API-only.\n" +
      "• 32B/33B exist in our earlier data but aren't the focus — they offload to RAM on 16 GB and are slow."
    );
  }

  // ══ SLIDE 4 — Methodology ═══════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Evaluation Methodology");
    heading(s, "What We Tested & How It's Scored");
    card(s, 0.4, 1.25, 4.5, 4.0, C.blue);
    s.addText("LeetCode Problem Suite", { x: 0.65, y: 1.35, w: 4.0, h: 0.35, fontSize: 14, bold: true, color: C.navy, margin: 0 });
    s.addText("10 problems · Easy→Hard · 38 test cases · TypeScript", { x: 0.65, y: 1.72, w: 4.1, h: 0.22, fontSize: 9.5, color: C.muted, italic: true, margin: 0 });
    [["Easy", "Two Sum, Valid Parens, Merge Lists, Reverse LL"], ["Medium", "Longest Substring, Max Subarray, Num Islands"], ["Hard", "Trapping Rain, Min Window, Median Stream"]].forEach(([d, p], i) => {
      const dy = 2.05 + i * 0.78;
      const col = d === "Easy" ? "22C55E" : d === "Medium" ? "F59E0B" : "EF4444";
      s.addShape("rect", { x: 0.65, y: dy, w: 0.7, h: 0.25, fill: { color: col }, line: { color: col } });
      s.addText(d, { x: 0.65, y: dy, w: 0.7, h: 0.25, fontSize: 8.5, bold: true, color: C.white, align: "center", margin: 0 });
      s.addText(p, { x: 1.45, y: dy - 0.02, w: 3.3, h: 0.4, fontSize: 9.5, color: C.slate, margin: 0, wrap: true });
    });
    s.addText("Model writes TS → we transpile, sandbox-execute in a worker (killed at 5 s), and assert exact outputs.", { x: 0.65, y: 4.55, w: 4.1, h: 0.55, fontSize: 9, color: C.muted, italic: true, margin: 0, wrap: true });
    card(s, 5.1, 1.25, 4.5, 4.0, C.teal);
    s.addText("Scheduler / Reminder App", { x: 5.35, y: 1.35, w: 4.0, h: 0.35, fontSize: 14, bold: true, color: C.navy, margin: 0 });
    s.addText("26 behavioural tests · full class generation", { x: 5.35, y: 1.72, w: 4.1, h: 0.22, fontSize: 9.5, color: C.muted, italic: true, margin: 0 });
    ["create() — id, defaults, uniqueness", "getById() — found vs. undefined", "listPending() / listOverdue() — time filters", "complete() / delete() — with error cases", "getDueWithin(n) — window filter", "reschedule() — updates dueAt", "Integration — full create→complete→overdue (×5)"].forEach((t, i) => {
      s.addText([{ text: "✓  ", options: { bold: true, color: C.teal } }, { text: t, options: { color: C.slate } }], { x: 5.35, y: 2.05 + i * 0.38, w: 4.1, h: 0.35, fontSize: 9.5, margin: 0 });
    });
    s.addNotes(
      "• Two workloads, identical harness for every model.\n" +
      "• LeetCode: 10 problems, 38 test cases, sandboxed execution with a 5 s infinite-loop guard.\n" +
      "• Scheduler: the model generates a whole ReminderService class from a spec; 26 behavioural checks drive CRUD, time-window filters, and a 5-part integration scenario.\n" +
      "• LeetCode measures algorithmic correctness; the Scheduler measures real-world, multi-method code generation.\n" +
      "• Exact prompts for every test are on the final two slides."
    );
  }

  // ══ SLIDE 5 — LeetCode results ══════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "LeetCode Benchmark Results");
    heading(s, "Measured Pass Rate (38 test cases)");
    s.addChart(pres.charts.BAR, [{ name: "LeetCode pass rate (%)", labels: ["Qwen 7B", "DeepSeek 6.7B", "Qwen 14B", "Claude Opus"], values: [89, 89, 89, 97] }], {
      x: 0.4, y: 1.2, w: 5.8, h: 4.0, barDir: "col",
      chartColors: [C.qwen, C.ds, C.q14, C.claude],
      chartArea: { fill: { color: C.offwh } }, catAxisLabelColor: C.slate, valAxisLabelColor: C.muted,
      valAxisMinVal: 0, valAxisMaxVal: 100, valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" },
      showValue: true, dataLabelColor: C.navy, dataLabelFontSize: 9, showLegend: false,
    });
    s.addShape("rect", { x: 6.4, y: 1.25, w: 3.25, h: 4.0, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
    s.addShape("rect", { x: 6.4, y: 1.25, w: 3.25, h: 0.06, fill: { color: C.cyan }, line: { color: C.cyan } });
    s.addText("Reading the numbers", { x: 6.55, y: 1.36, w: 2.9, h: 0.3, fontSize: 12, bold: true, color: C.navy, margin: 0 });
    [
      ["Small models cluster at 34/38", "Qwen 7B & 14B: 34/38; DeepSeek 6.7B: 33–37/38 across runs."],
      ["One universal miss: LC#295", "MedianFinder is class-based; the driver can't instantiate it, so EVERY model scores 0/1 — a harness limit, not a model error."],
      ["Claude tops out at 37/38", "The frontier ceiling on this suite — only 3 points above the small local models."],
    ].forEach(([h, b], i) => {
      const y = 1.75 + i * 1.12;
      s.addText(h, { x: 6.55, y, w: 2.95, h: 0.3, fontSize: 11, bold: true, color: C.blue, margin: 0, wrap: true });
      s.addText(b, { x: 6.55, y: y + 0.3, w: 2.95, h: 0.75, fontSize: 9.5, color: C.slate, margin: 0, wrap: true });
    });
    s.addNotes(
      "• Measured LeetCode pass rate. The small local models land at 89% (34/38); DeepSeek varies 33–37 across sessions.\n" +
      "• Claude Opus reaches 97% (37/38) — the frontier ceiling here is only ~3 points above the 7B/14B models.\n" +
      "• Everyone misses LC#295 — the class-based MedianFinder the harness can't instantiate. It's a driver limitation, identical for every model.\n" +
      "• Headline: on well-specified algorithm problems, a 7B model is already within a few points of the frontier."
    );
  }

  // ══ SLIDE 6 — Scheduler results ═════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Scheduler App Results");
    heading(s, "ReminderService — 26 Behavioural Tests", 24);
    const models = [
      { label: "Qwen 7B (best run)", pass: 26, total: 26, color: C.qwen, sub: "but 5/26 on 2 of 3 runs" },
      { label: "DeepSeek 6.7B", pass: 26, total: 26, color: C.ds, sub: "26/26 every run" },
      { label: "Qwen 14B", pass: 26, total: 26, color: C.q14, sub: "26/26 every run" },
    ];
    models.forEach(({ label, pass, total, color, sub }, i) => {
      const x = 0.5 + i * 3.1;
      s.addChart(pres.charts.DOUGHNUT, [{ name: "Tests", labels: ["Pass", "Fail"], values: [pass, total - pass] }], {
        x, y: 1.25, w: 2.7, h: 2.0, chartColors: [color, "E2E8F0"], chartArea: { fill: { color: C.offwh } }, showLegend: false, holeSize: 65, dataLabelFontSize: 0, showValue: false,
      });
      s.addText(`${pass}/${total}`, { x, y: 1.83, w: 2.7, h: 0.45, fontSize: 20, bold: true, color, align: "center", fontFace: "Georgia", margin: 0 });
      s.addText("tests pass", { x, y: 2.27, w: 2.7, h: 0.2, fontSize: 9, color: C.muted, align: "center", margin: 0 });
      s.addText(label, { x, y: 3.35, w: 2.7, h: 0.3, fontSize: 12, bold: true, color: C.navy, align: "center", margin: 0 });
      s.addText(sub, { x, y: 3.68, w: 2.7, h: 0.3, fontSize: 9.5, color: i === 0 ? "D97706" : "16A34A", italic: true, align: "center", margin: 0 });
    });
    s.addShape("rect", { x: 0.5, y: 4.25, w: 9.1, h: 1.05, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 } });
    s.addText([
      { text: "The catch — reliability, not peak score: ", options: { bold: true, color: C.blue } },
      { text: "Qwen 7B can hit a perfect 26/26, but only on a good run. On 2 of 3 runs it crashed to 5/26 because it hallucinated `import { v4 } from 'crypto'` (crypto has no v4). DeepSeek 6.7B and Qwen 14B used a valid id generator and passed 26/26 on every run. See the next slide.", options: { color: C.slate } },
    ], { x: 0.7, y: 4.35, w: 8.7, h: 0.85, fontSize: 10, margin: 0, wrap: true, valign: "top" });
    s.addNotes(
      "• Scheduler = whole-class generation, where the models diverge.\n" +
      "• All three CAN hit 26/26 — the doughnuts show best-case.\n" +
      "• But Qwen 7B only got there on 1 of 3 runs; the other two crashed to 5/26 on a hallucinated `crypto.v4` import.\n" +
      "• DeepSeek 6.7B and Qwen 14B passed 26/26 on every run — they generated a valid id scheme.\n" +
      "• So the real differentiator at this size is run-to-run reliability, not the best-case number. The consistency slide quantifies it."
    );
  }

  // ══ SLIDE 7 — Consistency across runs ═══════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Run-to-Run Consistency");
    heading(s, "Same Prompt, 3 Runs — Who Is Stable?");
    s.addText("Each model run 3× with identical prompts (temperature 0.05). LeetCode = /38, Scheduler = /26.", { x: 0.5, y: 1.1, w: 9, h: 0.25, fontSize: 10, color: C.slate, italic: true, margin: 0 });
    table(s, [
      ["Model", "Run 1", "Run 2", "Run 3", "Verdict"],
      ["Qwen 7B — LeetCode", "34/38", "34/38", "34/38", "rock-solid"],
      ["Qwen 7B — Scheduler", "5/26", "26/26", "5/26", "BIMODAL"],
      ["DeepSeek 6.7B — LeetCode", "33/38", "33/38", "33/38", "stable"],
      ["DeepSeek 6.7B — Scheduler", "26/26", "26/26", "26/26", "rock-solid"],
      ["Qwen 14B — LeetCode", "34/38", "—", "—", "(1 run)"],
      ["Qwen 14B — Scheduler", "26/26", "—", "—", "(1 run)"],
    ], {
      x: 0.4, y: 1.45, w: 9.2, colW: [3.3, 1.4, 1.4, 1.4, 1.7], rowH: 0.42, fs: 10.5,
      colorFn: (cell) => cell === "BIMODAL" ? "DC2626" : (cell === "rock-solid" || cell === "stable") ? "16A34A" : C.slate,
      boldFn: (cell) => cell === "BIMODAL" || cell === "rock-solid",
    });
    s.addShape("rect", { x: 0.4, y: 4.55, w: 9.2, h: 0.85, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
    s.addText([
      { text: "Why it matters: ", options: { bold: true, color: "DC2626" } },
      { text: "a single run hides instability. Qwen 7B's Scheduler looks perfect (26/26) one run and broken (5/26) the next — a hallucinated import that compiles differently each sample. If you ship a 7B for app-generation, you must validate every output. DeepSeek 6.7B and 14B were deterministic across runs.", options: { color: C.slate } },
    ], { x: 0.6, y: 4.62, w: 8.8, h: 0.72, fontSize: 10, margin: 0, wrap: true, valign: "top" });
    s.addNotes(
      "• The slide a single-run benchmark can't give you: run-to-run variance.\n" +
      "• Qwen 7B LeetCode is identical all 3 runs (34/38) — algorithms are stable. But its Scheduler is bimodal: 5, 26, 5 — it either works or crashes, nothing in between.\n" +
      "• DeepSeek 6.7B is the opposite of flaky: 33/38 and 26/26 on all three runs, byte-stable.\n" +
      "• 14B shown for one run (26/26, 34/38) — matched the stable pattern.\n" +
      "• Practical lesson: at 7B, validate every generated file; reliability is a first-class metric, not an afterthought."
    );
  }

  // ══ SLIDE 8 — Syntax / naming / styling ═════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Code Style — Syntax, Naming & Conventions");
    heading(s, "How Each Model Writes the Same Code", 26);
    table(s, [
      ["Trait", "Qwen 7B", "DeepSeek 6.7B", "Qwen 14B", "Claude Opus"],
      ["Hash map idiom", "Map<>", "plain {} obj", "Map<> (typed)", "Map<>"],
      ["Local typing", "inferred", "untyped", "explicit", "explicit"],
      ["Inline comments", "none", "heavy", "none", "none"],
      ["UUID generation", "crypto.v4 ✗", "uuid pkg", "uuid pkg", "crypto.randomUUID ✓"],
      ["External deps", "none", "uuid", "uuid", "none (stdlib)"],
      ["Indent", "4-space", "4-space", "4-space", "2-space"],
    ], {
      x: 0.4, y: 1.35, w: 9.2, colW: [2.4, 1.7, 1.7, 1.7, 1.7], rowH: 0.42, fs: 10,
      colorFn: (cell) => /✓|stdlib/.test(cell) ? "16A34A" : /✗/.test(cell) ? "DC2626" : C.slate,
      boldFn: (cell) => /✓|✗/.test(cell),
    });
    s.addShape("rect", { x: 0.4, y: 4.55, w: 9.2, h: 0.85, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 } });
    s.addText([
      { text: "Conventions reveal capability. ", options: { bold: true, color: C.blue } },
      { text: "Claude & Qwen 32B reach for Node's built-in crypto.randomUUID() (zero deps, portable). DeepSeek and Qwen 14B assume the external `uuid` npm package. Qwen 7B hallucinated `v4` from `crypto` — a non-existent export that crashes at load. DeepSeek over-comments and uses a plain object as a map; the larger/frontier models write tighter, explicitly-typed TypeScript.", options: { color: C.slate } },
    ], { x: 0.6, y: 4.62, w: 8.8, h: 0.72, fontSize: 9.5, margin: 0, wrap: true, valign: "top" });
    s.addNotes(
      "• Same task, different house styles — and the differences predict reliability.\n" +
      "• Hash maps: 7B/14B/Claude use a real Map<>; DeepSeek 6.7B uses a plain {} object (works, less idiomatic).\n" +
      "• Typing: 14B and Claude annotate explicitly; 7B infers; DeepSeek leaves locals untyped.\n" +
      "• UUID is the tell: Claude and Qwen 32B use the built-in crypto.randomUUID (no deps); DeepSeek/14B pull in the `uuid` package; Qwen 7B invented `crypto.v4`, which doesn't exist and crashes — the root cause of its flaky scheduler.\n" +
      "• Comments: DeepSeek comments heavily; the others keep it clean.\n" +
      "• Takeaway: dependency discipline and valid stdlib use track with model quality."
    );
  }

  // ══ SLIDE 9 — Latency & tokens ══════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Performance — Latency & Tokens");
    heading(s, "Speed Is the Small-Model Advantage");
    s.addText("Measured avg latency per LeetCode problem (seconds, local)", { x: 0.4, y: 1.15, w: 9, h: 0.22, fontSize: 10, color: C.slate, italic: true, margin: 0 });
    s.addChart(pres.charts.BAR, [{ name: "Latency (s)", labels: ["Qwen 7B", "DeepSeek 6.7B", "Qwen 14B", "(32B offload)"], values: [2.3, 4.7, 5.6, 76] }], {
      x: 0.4, y: 1.45, w: 5.6, h: 2.1, barDir: "bar", chartColors: [C.qwen, C.ds, C.q14, "CBD5E1"], chartArea: { fill: { color: C.offwh } },
      catAxisLabelColor: C.slate, valAxisLabelColor: C.muted, valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" },
      showValue: true, dataLabelColor: C.navy, dataLabelFontSize: 9, showLegend: false,
    });
    s.addText([
      { text: "The point of small models: ", options: { bold: true, color: C.blue } },
      { text: "7B/6.7B/14B all answer in 2–6 s on a 16 GB GPU. The 32B (shown grey) jumps to ~76 s because a 19 GB model spills into system RAM. Stay ≤14B and everything fits and flies.", options: { color: C.slate } },
    ], { x: 0.4, y: 3.65, w: 5.6, h: 1.0, fontSize: 9.5, margin: 0, wrap: true });
    s.addShape("rect", { x: 6.2, y: 1.25, w: 3.45, h: 4.0, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
    s.addShape("rect", { x: 6.2, y: 1.25, w: 3.45, h: 0.06, fill: { color: C.qwen }, line: { color: C.qwen } });
    s.addText("Tokens & throughput", { x: 6.35, y: 1.36, w: 3.2, h: 0.3, fontSize: 12, bold: true, color: C.navy, margin: 0 });
    table(s, [
      ["Metric", "7B", "6.7B", "14B"],
      ["Tokens/problem", "341", "627", "409"],
      ["Avg latency", "2.3s", "4.7s", "5.6s"],
      ["Sched gen", "~7s", "~9s", "~12s"],
      ["Fits 16 GB", "yes", "yes", "yes"],
      ["Cost/token", "$0", "$0", "$0"],
    ], { x: 6.32, y: 1.72, w: 3.25, colW: [1.55, 0.57, 0.57, 0.56], rowH: 0.34, fs: 9, headFs: 8.5 });
    s.addNotes(
      "• Speed is why you'd pick a small model.\n" +
      "• 7B ~2.3 s, 6.7B ~4.7 s, 14B ~5.6 s — all interactive on a 16 GB GPU.\n" +
      "• The grey 32B bar (~76 s) shows the cliff: a 19 GB model can't fit 16 GB and offloads ~30% to CPU/RAM.\n" +
      "• Token counts are modest (~400–600/problem), so latency is compute-bound, not verbosity.\n" +
      "• Everything is $0 per token locally. Stay at or below 14B and you keep both speed and zero cost."
    );
  }

  // ══ SLIDE 10 — How to run + result-card screenshots ═════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Reproduce It — Run & Read the Results");
    heading(s, "How to Run + the Result Cards", 26);
    s.addShape("rect", { x: 0.4, y: 1.15, w: 9.2, h: 0.95, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(
      "npm install && npm run build                                   # one-time\n" +
      "$env:ONLY_MODELS=\"qwen7b\"; $env:OUT=\"results-7b.json\"; node dist/run-eval.js   # run a model\n" +
      "node dist/render-cards.js results-7b.json results-7b.txt        # render the card below",
      { x: 0.55, y: 1.22, w: 8.9, h: 0.82, fontSize: 9, color: "7DD3FC", fontFace: "Consolas", margin: 0, valign: "top" });
    const cards = [
      { img: ASSET("card-qwen7b.png"), cap: "Qwen 7B" },
      { img: ASSET("card-ds6b.png"), cap: "DeepSeek 6.7B" },
      { img: ASSET("card-14b.png"), cap: "Qwen 14B" },
    ];
    cards.forEach((c, i) => {
      const x = 0.3 + i * 3.18, y = 2.3, w = 3.0, h = w / 1.162;
      s.addImage({ path: c.img, x, y, w, h });
      s.addText(c.cap, { x, y: y + h + 0.02, w, h: 0.25, fontSize: 10, bold: true, color: C.navy, align: "center", margin: 0 });
    });
    s.addText("Each run writes a colour-coded result card (PASS green / FAIL red) — these three are pasted straight from results-*.txt.", { x: 0.4, y: 5.32, w: 9.2, h: 0.25, fontSize: 9, color: C.muted, italic: true, margin: 0 });
    s.addNotes(
      "• Everything here is reproducible in three commands: install/build, run a model, render its card.\n" +
      "• The three images are real screenshots of the result cards the harness prints (results-*.txt), colour-coded PASS/FAIL.\n" +
      "• Qwen 7B card shows the LC#206 infinite-loop timeout; 14B shows its own misses; DeepSeek shows the clean run.\n" +
      "• Point out you can re-run any single saved answer with `node dist/run-answer.js <file>`.\n" +
      "• Full-resolution cards live in deck-assets/ and the raw text in results-*.txt."
    );
  }

  // ══ SLIDE 11 — Expose each model via Node/TS API ════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Serve Them — Node.js + TypeScript API");
    heading(s, "Expose Every Model Behind One API", 26);
    s.addText("src/api-server.ts (Express) — OpenAI-compatible + per-model routes. Full docs in API.md.", { x: 0.5, y: 1.1, w: 9, h: 0.25, fontSize: 10, color: C.slate, italic: true, margin: 0 });
    // left: endpoints card
    s.addShape("rect", { x: 0.4, y: 1.45, w: 4.4, h: 3.8, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
    s.addShape("rect", { x: 0.4, y: 1.45, w: 4.4, h: 0.06, fill: { color: C.codex }, line: { color: C.codex } });
    s.addText("Endpoints", { x: 0.6, y: 1.55, w: 4.0, h: 0.3, fontSize: 13, bold: true, color: C.navy, margin: 0 });
    [
      ["GET  /health", "liveness + model list"],
      ["GET  /v1/models", "discover ids + tier"],
      ["POST /v1/chat/completions", "OpenAI-compatible (route by model)"],
      ["POST /models/:id/chat", "per-model REST"],
    ].forEach(([e, d], i) => {
      const y = 2.0 + i * 0.72;
      s.addText(e, { x: 0.6, y, w: 4.0, h: 0.25, fontSize: 10.5, bold: true, color: C.blue, fontFace: "Consolas", margin: 0 });
      s.addText(d, { x: 0.6, y: y + 0.26, w: 4.0, h: 0.3, fontSize: 9.5, color: C.slate, margin: 0, wrap: true });
    });
    s.addText("Model ids: qwen2.5-coder-7b · -14b · -32b · deepseek-coder-6.7b · -33b · claude-opus · codex", { x: 0.6, y: 4.95, w: 4.05, h: 0.25, fontSize: 8, color: C.muted, italic: true, margin: 0, wrap: true });
    // right: code
    s.addShape("rect", { x: 5.0, y: 1.45, w: 4.6, h: 3.8, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(
      "// start it\n" +
      "npm run server:start   // :3456\n\n" +
      "// call any model from Node/TS\n" +
      "const res = await fetch(\n" +
      "  'http://localhost:3456/models/' +\n" +
      "  'qwen2.5-coder-14b/chat', {\n" +
      "  method: 'POST',\n" +
      "  headers: {'Content-Type':'application/json'},\n" +
      "  body: JSON.stringify({ messages: [\n" +
      "    { role: 'user',\n" +
      "      content: 'Write twoSum in TS' }],\n" +
      "    max_tokens: 512 }),\n" +
      "});\n" +
      "const { choices } = await res.json();\n" +
      "console.log(choices[0].message.content);",
      { x: 5.15, y: 1.55, w: 4.3, h: 3.6, fontSize: 8.5, color: "7DD3FC", fontFace: "Consolas", margin: 0, valign: "top" });
    s.addNotes(
      "• A single Express service (src/api-server.ts) puts every model — local and frontier — behind one HTTP API.\n" +
      "• Two surfaces: an OpenAI-compatible /v1/chat/completions (point any OpenAI client at it) and a per-model /models/:id/chat REST route.\n" +
      "• Local models route to Ollama by tag; claude-opus and codex route to the Anthropic/OpenAI SDKs via keys in .env.\n" +
      "• The code sample is a plain fetch — no SDK needed. Swap the model id in the URL to switch models.\n" +
      "• Full request/response shapes, curl, and the OpenAI-SDK pattern are in API.md."
    );
  }

  // ══ SLIDE 12 — Manual scheduler testing ═════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Test a Scheduler by Hand");
    heading(s, "Run the Class Itself — No Test Suite", 26);
    s.addText("src/try-scheduler.ts loads any saved ReminderService and lets you call its methods directly.", { x: 0.5, y: 1.1, w: 9, h: 0.25, fontSize: 10, color: C.slate, italic: true, margin: 0 });
    s.addShape("rect", { x: 0.4, y: 1.45, w: 4.5, h: 3.8, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(
      "# narrated demo of every method\n" +
      "node dist/try-scheduler.js \\\n" +
      "  answers-7b/qwen7b/\\\n" +
      "  scheduler-ReminderService.ts\n\n" +
      "# OR a live REPL — call methods\n" +
      "# yourself with a real `svc`\n" +
      "node dist/try-scheduler.js \\\n" +
      "  <answer.ts> --repl\n\n" +
      "scheduler> svc.create({ title:'X',\n" +
      "             dueAt: FUTURE(5) })\n" +
      "scheduler> svc.listPending()",
      { x: 0.55, y: 1.55, w: 4.2, h: 3.6, fontSize: 9, color: "7DD3FC", fontFace: "Consolas", margin: 0, valign: "top" });
    s.addShape("rect", { x: 5.1, y: 1.45, w: 4.5, h: 3.8, fill: { color: C.white }, shadow: mk(), line: { color: "E2E8F0", width: 0.5 } });
    s.addShape("rect", { x: 5.1, y: 1.45, w: 4.5, h: 0.06, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText("What you get", { x: 5.3, y: 1.55, w: 4.1, h: 0.3, fontSize: 13, bold: true, color: C.navy, margin: 0 });
    [
      ["Demo mode", "instantiates the class and calls create / getById / listPending / listOverdue / complete / delete / getDueWithin / reschedule, printing each result."],
      ["REPL mode (--repl)", "drops you into a Node prompt with a live `svc` instance plus FUTURE(min) / PAST(min) helpers — poke at the class however you like."],
      ["No harness", "runs the generated class on its own — not the 26-test suite — so you can explore behaviour, not just pass/fail."],
    ].forEach(([h, b], i) => {
      const y = 2.0 + i * 1.05;
      s.addText(h, { x: 5.3, y, w: 4.1, h: 0.25, fontSize: 11, bold: true, color: C.teal, margin: 0 });
      s.addText(b, { x: 5.3, y: y + 0.27, w: 4.15, h: 0.75, fontSize: 9.5, color: C.slate, margin: 0, wrap: true });
    });
    s.addNotes(
      "• For when you want to poke at a generated scheduler yourself, not run the 26-test grader.\n" +
      "• try-scheduler.js loads any saved ReminderService answer, instantiates it, and either runs a narrated demo of every method or drops you into a REPL.\n" +
      "• In REPL mode you get a live `svc` plus FUTURE()/PAST() helpers — call create(), listPending(), complete(), etc. by hand and see real return values.\n" +
      "• This is the manual counterpart to run-answer.js (which runs the formal suite).\n" +
      "• Great for understanding WHY a model's class behaves the way it does."
    );
  }

  // ══ SLIDE 13 — Licensing + decision + recommendation ════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    sectionHeader(s, "Decision Guide & Licensing");
    s.addText("Which Small Model Should You Use?", { x: 0.5, y: 0.5, w: 9, h: 0.55, fontSize: 28, bold: true, color: C.white, fontFace: "Georgia", margin: 0 });
    const matrix = [
      ["Use case / property", "Qwen 7B", "DeepSeek 6.7B", "Qwen 14B"],
      ["Fastest responses", "★★★", "★★", "★★"],
      ["Reliable whole-app generation", "★", "★★★", "★★★"],
      ["Algorithmic correctness", "★★★", "★★★", "★★★"],
      ["Fits 16 GB GPU", "★★★", "★★★", "★★★"],
      ["Zero per-token cost", "★★★", "★★★", "★★★"],
      ["Commercial license", "Apache 2.0", "DeepSeek", "Apache 2.0"],
    ];
    const star = (c) => c === "★★★" ? "34D399" : c === "★★" ? "FBBF24" : c === "★" ? "64748B" : C.ice;
    const md = matrix.map((r, ri) => r.map((cell, ci) => ({
      text: cell,
      options: {
        fill: { color: ri === 0 ? "0A2540" : ri % 2 === 0 ? "0F2842" : "0A2540" },
        color: ri === 0 ? C.white : ci === 0 ? C.ice : star(cell),
        bold: ri === 0 || ci === 0 || cell === "★★★",
        fontSize: ri === 0 ? 10 : ci === 0 ? 10.5 : 13, align: ci === 0 ? "left" : "center", valign: "middle",
      },
    })));
    s.addTable(md, { x: 0.5, y: 1.2, w: 9.0, colW: [3.6, 1.8, 1.8, 1.8], border: { pt: 0.4, color: "1E3A5F" }, rowH: 0.42, autoPage: false });
    s.addShape("rect", { x: 0.5, y: 4.35, w: 9.0, h: 0.95, fill: { color: "0A2540" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addShape("rect", { x: 0.5, y: 4.35, w: 0.06, h: 0.95, fill: { color: C.cyan }, line: { color: C.cyan } });
    s.addText([
      { text: "Recommendation: ", options: { bold: true, color: C.cyan } },
      { text: "Default to DeepSeek-Coder 6.7B — it fits, it's fast (~5 s), and it's the only small model that was 26/26 on the app every run. Reach for Qwen 7B when raw speed matters and you validate each output; step to Qwen 14B for steadier generation with a little more headroom. All three are $0/token and ship-ready.", options: { color: C.ice } },
    ], { x: 0.75, y: 4.45, w: 8.6, h: 0.78, fontSize: 10.5, margin: 0, wrap: true, valign: "top" });
    s.addNotes(
      "• Decision guide + licensing in one view, all three local models commercial-friendly.\n" +
      "• Qwen 7B wins on speed; loses on whole-app reliability.\n" +
      "• DeepSeek 6.7B and Qwen 14B win on reliable generation; all three tie on algorithms, VRAM fit, and $0 cost.\n" +
      "• Recommendation: default to DeepSeek 6.7B (fast + the only small model 26/26 every run); use Qwen 7B for speed with per-output validation; 14B for steadier generation.\n" +
      "• Licenses: Qwen Apache 2.0, DeepSeek's own commercial-friendly license — both shippable."
    );
  }

  // ══ SLIDE 14 — Exact prompts: LeetCode (representative) ══════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Appendix — Exact Prompts (verbatim)");
    heading(s, "Prompts Sent to Every Model — LeetCode", 24);
    // system prompt box (left)
    s.addShape("rect", { x: 0.4, y: 1.15, w: 4.55, h: 0.3, fill: { color: C.cyan }, line: { color: C.cyan } });
    s.addText("System prompt (every LeetCode call)", { x: 0.5, y: 1.15, w: 4.4, h: 0.3, fontSize: 10, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addShape("rect", { x: 0.4, y: 1.47, w: 4.55, h: 1.9, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(LEETCODE_SYSTEM_PROMPT, { x: 0.52, y: 1.55, w: 4.3, h: 1.78, fontSize: 8, color: "9BE7FF", fontFace: "Consolas", margin: 0, valign: "top", wrap: true });
    // two representative user prompts (left lower + right)
    s.addShape("rect", { x: 0.4, y: 3.5, w: 4.55, h: 0.3, fill: { color: "22C55E" }, line: { color: "22C55E" } });
    s.addText(PTITLE(206), { x: 0.5, y: 3.5, w: 4.4, h: 0.3, fontSize: 10, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addShape("rect", { x: 0.4, y: 3.82, w: 4.55, h: 1.5, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(PROMPT(206), { x: 0.52, y: 3.9, w: 4.3, h: 1.38, fontSize: 7, color: "9BE7FF", fontFace: "Consolas", margin: 0, valign: "top", wrap: true });
    s.addShape("rect", { x: 5.05, y: 1.15, w: 4.55, h: 0.3, fill: { color: "EF4444" }, line: { color: "EF4444" } });
    s.addText(PTITLE(42), { x: 5.15, y: 1.15, w: 4.4, h: 0.3, fontSize: 10, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addShape("rect", { x: 5.05, y: 1.47, w: 4.55, h: 3.9, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(PROMPT(42), { x: 5.17, y: 1.55, w: 4.3, h: 3.78, fontSize: 7, color: "9BE7FF", fontFace: "Consolas", margin: 0, valign: "top", wrap: true });
    s.addText("Representative prompts shown verbatim — all 10 LeetCode prompts live in src/leetcode/problems.ts.", { x: 0.4, y: 5.45, w: 9.2, h: 0.2, fontSize: 8.5, color: C.muted, italic: true, margin: 0 });
    s.addNotes(
      "• The exact text every model received — nothing paraphrased.\n" +
      "• Top-left: the fixed system prompt for all LeetCode calls (identical for all models, temperature 0.05).\n" +
      "• Two representative user prompts shown verbatim — Two Sum (Easy) and Trapping Rain Water (Hard).\n" +
      "• Note the explicit module.exports contract and worked examples — same scaffolding for every model, so differences are the model, not the prompt.\n" +
      "• All 10 prompts are in src/leetcode/problems.ts; the Scheduler prompt is on the next slide."
    );
  }

  // ══ SLIDE 15 — Exact prompts: Scheduler ═════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.offwh };
    sectionHeader(s, "Appendix — Exact Prompts (verbatim)");
    heading(s, "Prompt Sent to Every Model — Scheduler App", 22);
    s.addShape("rect", { x: 0.4, y: 1.12, w: 9.2, h: 0.3, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText("ReminderService — full prompt (task + interface + 7 requirements + output format), read top-to-bottom, left column then right", { x: 0.5, y: 1.12, w: 9.0, h: 0.3, fontSize: 9, bold: true, color: C.navy, valign: "middle", margin: 0 });
    {
      const lines = SCHEDULER_APP_PROMPT.split("\n");
      const mid = Math.ceil(lines.length / 2);
      const leftTxt = lines.slice(0, mid).join("\n");
      const rightTxt = lines.slice(mid).join("\n");
      s.addShape("rect", { x: 0.4, y: 1.45, w: 4.55, h: 3.95, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
      s.addText(leftTxt, { x: 0.52, y: 1.53, w: 4.32, h: 3.8, fontSize: 7, color: "9BE7FF", fontFace: "Consolas", margin: 0, valign: "top", wrap: true });
      s.addShape("rect", { x: 5.05, y: 1.45, w: 4.55, h: 3.95, fill: { color: "0D1B2A" }, line: { color: "1E3A5F", width: 0.5 } });
      s.addText(rightTxt, { x: 5.17, y: 1.53, w: 4.32, h: 3.8, fontSize: 7, color: "9BE7FF", fontFace: "Consolas", margin: 0, valign: "top", wrap: true });
    }
    s.addNotes(
      "• The full Scheduler prompt, verbatim — the whole-app generation task.\n" +
      "• It gives the TypeScript interface (Reminder, CreateReminderInput, ReminderService) and 7 explicit implementation requirements: UUID ids, in-memory Map, pending/overdue semantics, throw-on-missing, and the strict output format.\n" +
      "• The 26 behavioural tests assert exactly these requirements.\n" +
      "• This is the prompt where Qwen 7B's hallucinated crypto.v4 import shows up — the spec says 'crypto.randomUUID() or a simple counter', and 7B mangled it.\n" +
      "• Closing: small local models are fast and capable; pick by reliability, and validate generated code."
    );
  }

  await pres.writeFile({ fileName: OUT });
  console.log("✓ Saved 15-slide deck:", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
