# LLM Coding Eval

Evaluation harness that benchmarks language models on:

1. **LeetCode problems** — 10 problems across Easy / Medium / Hard
2. **Scheduler app (structured)** — given a TypeScript interface spec, implement a `ReminderService`
3. **Scheduler app (plain English)** — implement the same app from a plain-English description only

Supports multiple drivers: **Ollama (local)**, **Claude (Anthropic)**, **LiteLLM proxy**, **LangChain**, **DeepSeek**, **GLM**.

Every LLM response is saved to `outputs/<model>/<suite>/<slug>/` for offline inspection. See [outputs/README.md](outputs/README.md) for how to open and manually test them.

---

## Quick Start

### 1. Install Node.js dependencies

```bash
cd llm-coding-eval
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your API keys
```

At minimum set `ANTHROPIC_API_KEY` to run Claude tests. For local models, install and start Ollama first.

### 3. Run tests

```bash
# Run all tests against the default model (claude)
npm test

# Run tests for a specific model
MODEL=claude   npm test
MODEL=qwen7b   npm test      # requires Ollama + model pulled
MODEL=litellm  npm test      # requires LiteLLM proxy running
MODEL=langchain npm test     # uses LANGCHAIN_DRIVER from .env

# Run one suite at a time
MODEL=claude npm run test:leetcode
MODEL=claude npm run test:scheduler
MODEL=claude npm run test:scheduler-plain
```

---

## Available Drivers

| Key | Driver | Setup |
|-----|--------|-------|
| `claude` | Anthropic SDK → Claude | Set `ANTHROPIC_API_KEY` in `.env` |
| `qwen7b` | Ollama → Qwen2.5-Coder 7B | `ollama pull qwen2.5-coder:7b-instruct-q4_K_M` |
| `qwen14b` | Ollama → Qwen2.5-Coder 14B | `ollama pull qwen2.5-coder:14b-instruct-q4_K_M` |
| `deepseek` | DeepSeek API or Ollama | Set `DEEPSEEK_API_KEY` or use Ollama fallback |
| `glm` | Zhipu AI GLM-4 | Set `GLM_API_KEY` |
| `codex` | OpenAI API | Set `OPENAI_API_KEY` |
| `litellm` | LiteLLM proxy (OpenAI-compatible) | `pip install litellm && litellm --model ollama/qwen2.5-coder:7b-instruct-q4_K_M` |
| `langchain` | LangChain (Anthropic or OpenAI) | Set `LANGCHAIN_DRIVER=anthropic` or `openai` in `.env` |

---

## Test Suites

### LeetCode (`tests/leetcode.test.ts`)

10 problems run one at a time (Jest `--runInBand`):

| # | Problem | Difficulty |
|---|---------|-----------|
| LC#1 | Two Sum | Easy |
| LC#20 | Valid Parentheses | Easy |
| LC#21 | Merge Two Sorted Lists | Easy |
| LC#206 | Reverse Linked List | Easy |
| LC#3 | Longest Substring Without Repeating Characters | Medium |
| LC#53 | Maximum Subarray (Kadane) | Medium |
| LC#200 | Number of Islands | Medium |
| LC#42 | Trapping Rain Water | Hard |
| LC#76 | Minimum Window Substring | Hard |
| LC#295 | Find Median from Data Stream | Hard |

### Scheduler — Structured (`tests/scheduler.test.ts`)

25 tests against an LLM-generated `ReminderService` class, given a full TypeScript interface spec.

### Scheduler — Plain English (`tests/scheduler-plain-english.test.ts`)

Same behavioural coverage but the model only receives a plain-English description — no TypeScript types, no method names. Tests use alias resolution to handle different method naming conventions.

---

## Output Files

See [outputs/README.md](outputs/README.md) for full documentation.

Each test saves:
- `response.txt` — raw LLM markdown
- `code.ts` — extracted TypeScript
- `results.json` — metrics + pass/fail per test case

---

## LiteLLM Setup

```bash
pip install litellm

# Route to local Ollama:
litellm --model ollama/qwen2.5-coder:7b-instruct-q4_K_M --port 4000

# Then in .env:
LITELLM_BASE_URL=http://localhost:4000
LITELLM_MODEL=ollama/qwen2.5-coder:7b-instruct-q4_K_M
```

## LangChain Setup

```bash
# In .env:
LANGCHAIN_DRIVER=anthropic   # or "openai"
LANGCHAIN_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...
```
