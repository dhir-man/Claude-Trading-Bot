# LLM Coding Eval — Installation & Usage Guide

> Models evaluated: **Qwen3-Coder 32B**, **DeepSeek-Coder V3**, **GLM-4-Flash**

---

## 1. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20.x | `node --version` |
| npm | ≥ 10.x | `npm --version` |
| Ollama | latest | For local models |
| NVIDIA GPU (optional) | ≥ 24 GB VRAM | For 32B models |

---

## 2. Install dependencies

```bash
cd llm-coding-eval
npm install
```

---

## 3. Configure environment

```bash
cp .env.example .env
# Edit .env — only GLM_API_KEY is required for GLM tests
```

---

## 4. Install Ollama + Models

### 4a. Install Ollama

```bash
# Windows (PowerShell as admin)
winget install Ollama.Ollama

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 4b. Pull models

Run the automated setup checker:
```bash
node scripts/setup-ollama.js
```

Or pull manually:

```bash
# ── Model 1: Qwen3-Coder 32B (pick one based on your VRAM) ──────────────────
# Q4 quantised — 22 GB VRAM or 24 GB RAM
ollama pull qwen3-coder:32b-instruct-q4_K_M

# Q8 quantised — 36 GB VRAM (better quality)
ollama pull qwen3-coder:32b-instruct-q8_0

# Full FP16 — 64 GB VRAM (best quality, needs A100/H100)
ollama pull qwen3-coder:32b-instruct-fp16

# ── Model 2: DeepSeek-Coder V3 (local via Ollama) ───────────────────────────
# WARNING: Full model is 685B MoE — 40+ GB VRAM.
# Use the DeepSeek API (free tier) for consumer hardware:
#   https://platform.deepseek.com  →  free 1M tokens/month

# If you have the hardware:
ollama pull deepseek-coder-v3

# Budget alternative for local use:
ollama pull deepseek-coder:6.7b-instruct-q4_K_M
```

### 4c. Verify Ollama

```bash
# List installed models
ollama list

# Quick sanity test
ollama run qwen3-coder:32b-instruct-q4_K_M "Write a TypeScript twoSum function"
```

---

## 5. API Keys (cloud models)

### DeepSeek API (free tier — 1M tokens/month)

1. Sign up: https://platform.deepseek.com
2. Create API key
3. Add to `.env`:
   ```
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```

### Zhipu AI GLM-4-Flash (free tier — 6M tokens/month)

1. Sign up: https://open.bigmodel.cn
2. Create API key
3. Add to `.env`:
   ```
   GLM_API_KEY=xxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxx
   ```

---

## 6. Run LeetCode evaluations

```bash
# Run against a specific model
MODEL=qwen32b  npx jest tests/leetcode.test.ts --verbose
MODEL=deepseek npx jest tests/leetcode.test.ts --verbose
MODEL=glm      npx jest tests/leetcode.test.ts --verbose

# Run all models sequentially and compare
npm run test:all
```

### Problems tested

| # | Problem | Difficulty | Category |
|---|---------|------------|----------|
| LC#1 | Two Sum | Easy | Array / Hash Map |
| LC#20 | Valid Parentheses | Easy | Stack |
| LC#21 | Merge Two Sorted Lists | Easy | Linked List |
| LC#206 | Reverse Linked List | Easy | Linked List |
| LC#3 | Longest Substring Without Repeating Characters | Medium | Sliding Window |
| LC#53 | Maximum Subarray | Medium | Dynamic Programming |
| LC#200 | Number of Islands | Medium | Graph BFS/DFS |
| LC#42 | Trapping Rain Water | Hard | Two Pointers |
| LC#76 | Minimum Window Substring | Hard | Sliding Window |
| LC#295 | Find Median from Data Stream | Hard | Heap / Design |

---

## 7. Run Scheduler/Reminder App evaluation

The model generates a full `ReminderService` class. 25 behavioural tests verify:
- Create, getById, listAll
- listPending, listOverdue
- complete, delete
- getDueWithin, reschedule
- Full integration scenario

```bash
MODEL=qwen32b  npx jest tests/scheduler.test.ts --verbose
MODEL=deepseek npx jest tests/scheduler.test.ts --verbose
MODEL=glm      npx jest tests/scheduler.test.ts --verbose
```

---

## 8. Start the API proxy server

The server exposes a single OpenAI-compatible endpoint that routes to the right backend.

```bash
npx ts-node src/api-server.ts
# Listening on http://localhost:3456
```

### Endpoints

```
GET  /health                          → { status: "ok" }
GET  /v1/models                       → list of available models
POST /v1/chat/completions             → OpenAI-compatible chat
```

### Model routing

| `model` field value | Routes to |
|---------------------|-----------|
| `qwen3-coder-32b` | Ollama local |
| `qwen3-coder-14b` | Ollama local |
| `deepseek-coder-v3` | DeepSeek API or Ollama |
| `glm-4-flash` | Zhipu AI API |
| `glm-4-air` | Zhipu AI API |

### Example API call (Node.js)

```typescript
import axios from "axios";

const res = await axios.post("http://localhost:3456/v1/chat/completions", {
  model: "qwen3-coder-32b",
  messages: [
    { role: "system", content: "You are an expert TypeScript engineer." },
    { role: "user",   content: "Implement binary search in TypeScript." }
  ],
  temperature: 0.1,
  max_tokens: 1024
});

console.log(res.data.choices[0].message.content);
```

### OpenAI SDK drop-in (works with any listed model)

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3456/v1",
  apiKey: "not-needed",   // Ollama ignores this; GLM/DeepSeek use their own keys
});

const completion = await client.chat.completions.create({
  model: "qwen3-coder-32b",
  messages: [{ role: "user", content: "Solve two-sum in TypeScript" }],
});
```

---

## 9. Hardware recommendations

| Setup | Recommended model | Notes |
|-------|-------------------|-------|
| Consumer GPU (RTX 4090 24 GB) | Qwen3-Coder 32B Q4 | ~22 GB VRAM |
| Dual GPU (2× A6000 48 GB) | Qwen3-Coder 32B Q8 | Best local quality |
| No GPU / limited VRAM | Qwen3-Coder 14B Q4 | ~9 GB VRAM |
| No local hardware | DeepSeek API (free tier) | 1M tokens/month free |
| Cloud server (A100 80 GB) | DeepSeek-Coder V3 full | Best raw quality |

---

## 10. Cost comparison (per 1K tokens, as of June 2025)

| Model | Input | Output | Free Tier | License |
|-------|-------|--------|-----------|---------|
| Qwen3-Coder 32B (local) | $0 | $0 | Unlimited | Apache 2.0 |
| Qwen3-Coder 14B (local) | $0 | $0 | Unlimited | Apache 2.0 |
| DeepSeek-Coder V3 (API) | $0.00014 | $0.00028 | 1M tok/mo | MIT |
| GLM-4-Flash (API) | ~$0.00014 | ~$0.00014 | 6M tok/mo | Proprietary |

> Sources: DeepSeek platform.deepseek.com pricing page; Zhipu AI open.bigmodel.cn pricing page; Qwen3 Apache 2.0 license on HuggingFace qwen3-coder model card.
