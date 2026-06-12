# Run-to-Run Consistency (fast local models)

Each small model was run **3×** with identical prompts (temperature 0.05) to
measure run-to-run stability — the thing a single benchmark run hides. Raw data
is in `results-qwen7b-r{1,2,3}.json` and `results-ds6b-r{1,2,3}.json`; the 14B
mid-size was run once (`results-14b.json`).

| Model | Workload | Run 1 | Run 2 | Run 3 | Verdict |
|-------|----------|-------|-------|-------|---------|
| Qwen2.5-Coder **7B** | LeetCode (/38) | 34 | 34 | 34 | rock-solid |
| Qwen2.5-Coder **7B** | Scheduler (/26) | **5** | **26** | **5** | **BIMODAL** |
| DeepSeek-Coder **6.7B** | LeetCode (/38) | 33 | 33 | 33 | stable |
| DeepSeek-Coder **6.7B** | Scheduler (/26) | 26 | 26 | 26 | rock-solid |
| Qwen2.5-Coder **14B** | LeetCode (/38) | 34 | — | — | (1 run) |
| Qwen2.5-Coder **14B** | Scheduler (/26) | 26 | — | — | (1 run) |

## Why Qwen 7B's scheduler is bimodal

Its generated `ReminderService` opens with:

```ts
import { v4 as uuidv4 } from 'crypto';   // ✗ crypto has no `v4` export
```

That import is a hallucination — Node's `crypto` module exposes `randomUUID`, not
`v4`. When the transpiled module loads, the bad import (or the resulting
undefined `uuidv4()`) breaks `create()` and everything downstream, collapsing the
score to 5/26. On the run where it happened to emit valid id code, it passed
26/26. Same prompt, same temperature — different sample, different outcome.

DeepSeek 6.7B and Qwen 14B used a valid id scheme (`uuid` package) and were
deterministic across runs.

**Takeaway:** at the 7B tier, validate every generated file — best-case accuracy
is not the same as reliable accuracy.
