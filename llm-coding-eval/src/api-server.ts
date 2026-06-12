/**
 * Multi-Model LLM API Server (Node.js + TypeScript)
 *
 * Exposes every evaluated model behind one HTTP service — local Ollama models
 * and the frontier APIs (Claude, Codex) — via two surfaces:
 *
 *   1. OpenAI-compatible:   POST /v1/chat/completions   (route by `model` field)
 *   2. Per-model REST:      POST /models/:id/chat       ({ messages, max_tokens })
 *
 * Plus:  GET /health   ·   GET /v1/models
 *
 * Run:
 *   npm run build && npm run server:start      # node dist/api-server.js
 *   # or: npx ts-node src/api-server.ts
 *
 * See API.md for full request/response docs and curl + TypeScript examples.
 */
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();

import {
  OllamaClient,
  buildClient,
  ModelClient,
  ChatMessage,
} from "./clients";
import { log } from "./utils/logger";

const app = express();
app.use(express.json({ limit: "4mb" }));

const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

// ── Model registry — public id → how to build its client ────────────────────
// Each entry constructs a fresh client on demand. Local models are built with
// an explicit Ollama tag so every size is independently addressable; the
// frontier models route through buildClient (which reads the API keys).
interface ModelEntry {
  tier: "local" | "frontier";
  build: () => ModelClient;
}

const REGISTRY: Record<string, ModelEntry> = {
  "qwen2.5-coder-7b": { tier: "local", build: () => new OllamaClient("qwen2.5-coder:7b-instruct-q4_K_M", ollamaUrl) },
  "qwen2.5-coder-14b": { tier: "local", build: () => new OllamaClient("qwen2.5-coder:14b-instruct-q4_K_M", ollamaUrl) },
  "qwen2.5-coder-32b": { tier: "local", build: () => new OllamaClient("qwen2.5-coder:32b-instruct-q4_K_M", ollamaUrl) },
  "deepseek-coder-6.7b": { tier: "local", build: () => new OllamaClient("deepseek-coder:6.7b-instruct-q4_K_M", ollamaUrl) },
  "deepseek-coder-33b": { tier: "local", build: () => new OllamaClient("deepseek-coder:33b-instruct-q4_K_M", ollamaUrl) },
  "claude-opus": { tier: "frontier", build: () => buildClient("claude") },
  "codex": { tier: "frontier", build: () => buildClient("codex") },
};

function resolve(id: string): ModelEntry | undefined {
  return REGISTRY[id];
}

// ── Health & discovery ───────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", models: Object.keys(REGISTRY) });
});

app.get("/v1/models", (_req: Request, res: Response) => {
  res.json({
    object: "list",
    data: Object.entries(REGISTRY).map(([id, e]) => ({
      id,
      object: "model",
      owned_by: e.tier,
    })),
  });
});

// ── Shared completion handler ─────────────────────────────────────────────────
async function runCompletion(
  id: string,
  body: { messages: ChatMessage[]; temperature?: number; max_tokens?: number },
  res: Response,
  next: NextFunction
) {
  const entry = resolve(id);
  if (!entry) {
    res.status(404).json({
      error: `Unknown model '${id}'. Available: ${Object.keys(REGISTRY).join(", ")}`,
    });
    return;
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "`messages` must be a non-empty array." });
    return;
  }

  let client: ModelClient;
  try {
    client = entry.build();
  } catch (e: unknown) {
    res.status(503).json({ error: e instanceof Error ? e.message : String(e) });
    return;
  }

  log.info(`→ ${id} (${entry.tier}) | ${body.messages.length} messages`);
  try {
    const result = await client.complete({
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.max_tokens,
    });
    res.json({
      id: `chatcmpl-${id}`,
      object: "chat.completion",
      model: id,
      choices: [
        { index: 0, message: { role: "assistant", content: result.content }, finish_reason: "stop" },
      ],
      usage: {
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: result.totalTokens,
      },
      x_latency_ms: result.latencyMs,
      x_cost_usd: result.costUsd ?? 0,
    });
  } catch (e: unknown) {
    next(e);
  }
}

// ── OpenAI-compatible endpoint (route by `model`) ─────────────────────────────
app.post("/v1/chat/completions", async (req: Request, res: Response, next: NextFunction) => {
  const { model, stream } = req.body as { model: string; stream?: boolean };
  if (stream) {
    res.status(400).json({ error: "Streaming is not supported by this proxy." });
    return;
  }
  await runCompletion(model, req.body, res, next);
});

// ── Per-model REST endpoint ───────────────────────────────────────────────────
app.post("/models/:id/chat", async (req: Request, res: Response, next: NextFunction) => {
  await runCompletion(req.params.id, req.body, res, next);
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = parseInt(process.env.PORT ?? "3456", 10);
app.listen(PORT, () => {
  log.success(`Multi-model LLM API running at http://localhost:${PORT}`);
  log.info(`  GET  /health`);
  log.info(`  GET  /v1/models`);
  log.info(`  POST /v1/chat/completions   (OpenAI-compatible)`);
  log.info(`  POST /models/:id/chat       (per-model)`);
  log.info(`  Models: ${Object.keys(REGISTRY).join(", ")}`);
});

export default app;
