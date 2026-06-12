# Model API — Run Each Model Through an HTTP API

A small Node.js + TypeScript service ([`src/api-server.ts`](src/api-server.ts)) exposes every
evaluated model — the local Ollama models **and** the frontier APIs — behind one
endpoint. Built on Express; no framework magic.

## 1. Prerequisites

```bash
npm install
npm run build            # compiles src → dist
```

- **Local models** need [Ollama](https://ollama.com) running and the model pulled:
  ```bash
  ollama pull qwen2.5-coder:7b-instruct-q4_K_M
  ollama pull qwen2.5-coder:14b-instruct-q4_K_M
  ollama pull qwen2.5-coder:32b-instruct-q4_K_M
  ollama pull deepseek-coder:6.7b-instruct-q4_K_M
  ollama pull deepseek-coder:33b-instruct-q4_K_M
  ```
- **Frontier models** need keys in `.env` (gitignored):
  ```
  ANTHROPIC_API_KEY=sk-ant-...      # for model id "claude-opus"
  OPENAI_API_KEY=sk-...             # for model id "codex"
  # optional overrides:
  CLAUDE_MODEL=claude-opus-4-8
  OPENAI_MODEL=gpt-4o
  ```

## 2. Start the server

```bash
npm run server:start          # → http://localhost:3456
# or: npx ts-node src/api-server.ts
# change the port: PORT=8080 npm run server:start
```

## 3. Available model ids

| Model id (`:id`)        | Tier     | Backend                                   |
|-------------------------|----------|-------------------------------------------|
| `qwen2.5-coder-7b`      | local    | Ollama · qwen2.5-coder:7b-instruct-q4_K_M  |
| `qwen2.5-coder-14b`     | local    | Ollama · qwen2.5-coder:14b-instruct-q4_K_M |
| `qwen2.5-coder-32b`     | local    | Ollama · qwen2.5-coder:32b-instruct-q4_K_M |
| `deepseek-coder-6.7b`   | local    | Ollama · deepseek-coder:6.7b-instruct-q4_K_M |
| `deepseek-coder-33b`    | local    | Ollama · deepseek-coder:33b-instruct-q4_K_M |
| `claude-opus`           | frontier | Anthropic API (`@anthropic-ai/sdk`)        |
| `codex`                 | frontier | OpenAI API                                 |

Discover them live:

```bash
curl http://localhost:3456/health
curl http://localhost:3456/v1/models
```

## 4. Endpoints

### A) OpenAI-compatible — `POST /v1/chat/completions`

Route to any model with the `model` field. Drop-in for the OpenAI SDK / any
OpenAI-compatible client.

```bash
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder-7b",
    "messages": [
      {"role": "system", "content": "You are an expert TypeScript engineer."},
      {"role": "user", "content": "Write a twoSum function. Reply with only a ```typescript block."}
    ],
    "max_tokens": 512
  }'
```

### B) Per-model REST — `POST /models/:id/chat`

The model is in the URL; the body is just `{ messages, max_tokens?, temperature? }`.

```bash
curl http://localhost:3456/models/deepseek-coder-6.7b/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reverse a linked list in TypeScript."}]}'
```

### Response shape (both endpoints)

```json
{
  "id": "chatcmpl-qwen2.5-coder-7b",
  "object": "chat.completion",
  "model": "qwen2.5-coder-7b",
  "choices": [
    { "index": 0, "message": { "role": "assistant", "content": "..." }, "finish_reason": "stop" }
  ],
  "usage": { "prompt_tokens": 42, "completion_tokens": 128, "total_tokens": 170 },
  "x_latency_ms": 2310,
  "x_cost_usd": 0
}
```

`x_latency_ms` and `x_cost_usd` are extra (non-OpenAI) fields. Local models report `x_cost_usd: 0`.

## 5. Call it from Node.js / TypeScript

Because `/v1/chat/completions` is OpenAI-compatible, the official `openai` SDK works
by just pointing `baseURL` at this server:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3456/v1",
  apiKey: "not-needed-for-local",   // any non-empty string
});

const res = await client.chat.completions.create({
  model: "qwen2.5-coder-14b",
  messages: [{ role: "user", content: "Write isValid(s) for balanced brackets in TS." }],
  max_tokens: 512,
});
console.log(res.choices[0].message.content);
```

Or with plain `fetch`, no SDK:

```ts
const res = await fetch("http://localhost:3456/models/claude-opus/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Explain Kadane's algorithm in two sentences." }],
    max_tokens: 256,
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content, `(${data.x_latency_ms} ms)`);
```

## 6. Notes & limits

- **One local model at a time.** The 32B/33B models are ~19 GB and exceed a 16 GB
  GPU, so they offload to system RAM and respond slowly. Don't drive two large
  local models concurrently on a single consumer GPU.
- **Streaming** is not implemented — requests are request/response.
- **Errors**: unknown model → `404`; missing key for a frontier model → `503` with a
  clear message; empty `messages` → `400`.
- **Claude** maps the OpenAI `system` role to Anthropic's separate `system`
  parameter and omits `temperature` (Opus 4.x rejects it) — handled automatically.
- **Codex** needs an OpenAI account with quota (a key with `insufficient_quota`
  returns `429`).
