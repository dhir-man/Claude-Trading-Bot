# LLM Coding Eval — Presenter Script

Bullet-point speaker notes for each slide (mirrors the notes embedded in the .pptx). 15 slides.

## Slide 1: Qwen2.5-Coder 7B

- This deck focuses on the FAST, self-hostable small models — Qwen2.5-Coder 7B and 14B, and DeepSeek-Coder 6.7B — the ones that fit a 16 GB GPU and answer in seconds.
- Claude Opus appears as a frontier reference point for correctness, not as the subject.
- Everything measured on one consumer machine: an RTX 4070 Ti Super, 16 GB VRAM.
- Two workloads: 10 LeetCode problems (38 test cases) and a full Scheduler app (26 behavioural tests).
- Larger 32B/33B models were also run earlier; we reference them but don't re-run them — they need a 24 GB+ GPU to be fast.

## Slide 2: EXECUTIVE SUMMARY

- Three takeaways up front.
- 1) Qwen 7B is the speed champion and is perfectly stable on algorithms, but unreliable when generating a whole class — note the bimodal 5↔26 scheduler.
- 2) DeepSeek 6.7B is the steady pick: scheduler 26/26 on every run, fits VRAM, ~5 s.
- 3) Stepping up to 14B trades a little speed for steadier whole-app generation — the sweet spot before you need a 24 GB GPU for 32B.
- The rest of the deck backs each of these with measured data.

## Slide 3: MODELS UNDER REVIEW

- The contenders: three local models that all fit 16 GB VRAM, plus Claude Opus as a correctness yardstick.
- Qwen 7B (~5 GB) and DeepSeek 6.7B (~4.5 GB) are the fast small models; Qwen 14B (~9 GB) is the mid-size.
- All are Q4-quantised, served by Ollama, $0 per token.
- Licensing: Qwen is Apache 2.0, DeepSeek under its own commercial-friendly license; Claude is API-only.
- 32B/33B exist in our earlier data but aren't the focus — they offload to RAM on 16 GB and are slow.

## Slide 4: EVALUATION METHODOLOGY

- Two workloads, identical harness for every model.
- LeetCode: 10 problems, 38 test cases, sandboxed execution with a 5 s infinite-loop guard.
- Scheduler: the model generates a whole ReminderService class from a spec; 26 behavioural checks drive CRUD, time-window filters, and a 5-part integration scenario.
- LeetCode measures algorithmic correctness; the Scheduler measures real-world, multi-method code generation.
- Exact prompts for every test are on the final two slides.

## Slide 5: LEETCODE BENCHMARK RESULTS

- Measured LeetCode pass rate. The small local models land at 89% (34/38); DeepSeek varies 33–37 across sessions.
- Claude Opus reaches 97% (37/38) — the frontier ceiling here is only ~3 points above the 7B/14B models.
- Everyone misses LC#295 — the class-based MedianFinder the harness can't instantiate. It's a driver limitation, identical for every model.
- Headline: on well-specified algorithm problems, a 7B model is already within a few points of the frontier.

## Slide 6: SCHEDULER APP RESULTS

- Scheduler = whole-class generation, where the models diverge.
- All three CAN hit 26/26 — the doughnuts show best-case.
- But Qwen 7B only got there on 1 of 3 runs; the other two crashed to 5/26 on a hallucinated `crypto.v4` import.
- DeepSeek 6.7B and Qwen 14B passed 26/26 on every run — they generated a valid id scheme.
- So the real differentiator at this size is run-to-run reliability, not the best-case number. The consistency slide quantifies it.

## Slide 7: RUN-TO-RUN CONSISTENCY

- The slide a single-run benchmark can't give you: run-to-run variance.
- Qwen 7B LeetCode is identical all 3 runs (34/38) — algorithms are stable. But its Scheduler is bimodal: 5, 26, 5 — it either works or crashes, nothing in between.
- DeepSeek 6.7B is the opposite of flaky: 33/38 and 26/26 on all three runs, byte-stable.
- 14B shown for one run (26/26, 34/38) — matched the stable pattern.
- Practical lesson: at 7B, validate every generated file; reliability is a first-class metric, not an afterthought.

## Slide 8: CODE STYLE — SYNTAX, NAMING & CONVENTIONS

- Same task, different house styles — and the differences predict reliability.
- Hash maps: 7B/14B/Claude use a real Map<>; DeepSeek 6.7B uses a plain {} object (works, less idiomatic).
- Typing: 14B and Claude annotate explicitly; 7B infers; DeepSeek leaves locals untyped.
- UUID is the tell: Claude and Qwen 32B use the built-in crypto.randomUUID (no deps); DeepSeek/14B pull in the `uuid` package; Qwen 7B invented `crypto.v4`, which doesn't exist and crashes — the root cause of its flaky scheduler.
- Comments: DeepSeek comments heavily; the others keep it clean.
- Takeaway: dependency discipline and valid stdlib use track with model quality.

## Slide 9: PERFORMANCE — LATENCY & TOKENS

- Speed is why you'd pick a small model.
- 7B ~2.3 s, 6.7B ~4.7 s, 14B ~5.6 s — all interactive on a 16 GB GPU.
- The grey 32B bar (~76 s) shows the cliff: a 19 GB model can't fit 16 GB and offloads ~30% to CPU/RAM.
- Token counts are modest (~400–600/problem), so latency is compute-bound, not verbosity.
- Everything is $0 per token locally. Stay at or below 14B and you keep both speed and zero cost.

## Slide 10: REPRODUCE IT — RUN & READ THE RESULTS

- Everything here is reproducible in three commands: install/build, run a model, render its card.
- The three images are real screenshots of the result cards the harness prints (results-*.txt), colour-coded PASS/FAIL.
- Qwen 7B card shows the LC#206 infinite-loop timeout; 14B shows its own misses; DeepSeek shows the clean run.
- Point out you can re-run any single saved answer with `node dist/run-answer.js <file>`.
- Full-resolution cards live in deck-assets/ and the raw text in results-*.txt.

## Slide 11: SERVE THEM — NODE.JS + TYPESCRIPT API

- A single Express service (src/api-server.ts) puts every model — local and frontier — behind one HTTP API.
- Two surfaces: an OpenAI-compatible /v1/chat/completions (point any OpenAI client at it) and a per-model /models/:id/chat REST route.
- Local models route to Ollama by tag; claude-opus and codex route to the Anthropic/OpenAI SDKs via keys in .env.
- The code sample is a plain fetch — no SDK needed. Swap the model id in the URL to switch models.
- Full request/response shapes, curl, and the OpenAI-SDK pattern are in API.md.

## Slide 12: TEST A SCHEDULER BY HAND

- For when you want to poke at a generated scheduler yourself, not run the 26-test grader.
- try-scheduler.js loads any saved ReminderService answer, instantiates it, and either runs a narrated demo of every method or drops you into a REPL.
- In REPL mode you get a live `svc` plus FUTURE()/PAST() helpers — call create(), listPending(), complete(), etc. by hand and see real return values.
- This is the manual counterpart to run-answer.js (which runs the formal suite).
- Great for understanding WHY a model's class behaves the way it does.

## Slide 13: DECISION GUIDE & LICENSING

- Decision guide + licensing in one view, all three local models commercial-friendly.
- Qwen 7B wins on speed; loses on whole-app reliability.
- DeepSeek 6.7B and Qwen 14B win on reliable generation; all three tie on algorithms, VRAM fit, and $0 cost.
- Recommendation: default to DeepSeek 6.7B (fast + the only small model 26/26 every run); use Qwen 7B for speed with per-output validation; 14B for steadier generation.
- Licenses: Qwen Apache 2.0, DeepSeek's own commercial-friendly license — both shippable.

## Slide 14: APPENDIX — EXACT PROMPTS (VERBATIM)

- The exact text every model received — nothing paraphrased.
- Top-left: the fixed system prompt for all LeetCode calls (identical for all models, temperature 0.05).
- Two representative user prompts shown verbatim — Two Sum (Easy) and Trapping Rain Water (Hard).
- Note the explicit module.exports contract and worked examples — same scaffolding for every model, so differences are the model, not the prompt.
- All 10 prompts are in src/leetcode/problems.ts; the Scheduler prompt is on the next slide.

## Slide 15: APPENDIX — EXACT PROMPTS (VERBATIM)

- The full Scheduler prompt, verbatim — the whole-app generation task.
- It gives the TypeScript interface (Reminder, CreateReminderInput, ReminderService) and 7 explicit implementation requirements: UUID ids, in-memory Map, pending/overdue semantics, throw-on-missing, and the strict output format.
- The 26 behavioural tests assert exactly these requirements.
- This is the prompt where Qwen 7B's hallucinated crypto.v4 import shows up — the spec says 'crypto.randomUUID() or a simple counter', and 7B mangled it.
- Closing: small local models are fast and capable; pick by reliability, and validate generated code.

