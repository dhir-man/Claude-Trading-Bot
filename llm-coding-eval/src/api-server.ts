/**
 * Unified LLM Proxy API Server
 *
 * OpenAI-compatible /v1/chat/completions endpoint.
 * Route requests to the right backend model by setting the `model` field.
 *
 * Model routing:
 *   model: "qwen2.5-coder-7b"     → Ollama local
 *   model: "deepseek-coder-6.7b"  → Ollama local (or DeepSeek API)
 *   model: "glm-4-flash"          → Zhipu AI API
 *
 * Usage:
 *   npx ts-node src/api-server.ts
 *   curl http://localhost:3456/v1/chat/completions \
 *     -H "Content-Type: application/json" \
 *     -d '{"model":"qwen2.5-coder-7b","messages":[{"role":"user","content":"Write a hello world in TypeScript"}]}'
 */
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();

import { buildClient, ModelKey } from "./clients";
import { CompletionRequest, ChatMessage } from "./clients/types";
import { log } from "./utils/logger";

const app = express();
app.use(express.json({ limit: "4mb" }));

// ── Model routing map ────────────────────────────────────────────────────────
const MODEL_ROUTE: Record<string, ModelKey> = {
  "qwen2.5-coder-7b": "qwen7b",
  "qwen2.5-coder": "qwen7b",
  "deepseek-coder-6.7b": "deepseek",
  "deepseek-coder": "deepseek",
  "glm-4-flash": "glm",
  "glm-4-air": "glm",
};

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", models: Object.keys(MODEL_ROUTE) });
});

app.get("/v1/models", (_req: Request, res: Response) => {
  res.json({
    object: "list",
    data: Object.keys(MODEL_ROUTE).map((id) => ({
      id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "local",
    })),
  });
});

// ── Chat completions (OpenAI-compatible) ─────────────────────────────────────
app.post(
  "/v1/chat/completions",
  async (req: Request, res: Response, next: NextFunction) => {
    const { model, messages, temperature, max_tokens, stream } = req.body as {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    };

    if (stream) {
      res.status(400).json({ error: "Streaming not yet supported by this proxy." });
      return;
    }

    const routeKey = MODEL_ROUTE[model];
    if (!routeKey) {
      res.status(400).json({
        error: `Unknown model '${model}'. Available: ${Object.keys(MODEL_ROUTE).join(", ")}`,
      });
      return;
    }

    let client;
    try {
      client = buildClient(routeKey);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(503).json({ error: msg });
      return;
    }

    log.info(`→ ${model} | ${messages.length} messages`);

    try {
      const result = await client.complete({
        messages,
        temperature,
        maxTokens: max_tokens,
      } as CompletionRequest);

      // Return OpenAI-compatible response envelope
      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: result.content },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: result.promptTokens,
          completion_tokens: result.completionTokens,
          total_tokens: result.totalTokens,
        },
        // Extra metadata not in OpenAI spec
        x_latency_ms: result.latencyMs,
        x_cost_usd: result.costUsd ?? 0,
      });
    } catch (e: unknown) {
      next(e);
    }
  }
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = parseInt(process.env.PORT ?? "3456");
app.listen(PORT, () => {
  log.success(`LLM Proxy API running at http://localhost:${PORT}`);
  log.info(`  GET  /health`);
  log.info(`  GET  /v1/models`);
  log.info(`  POST /v1/chat/completions`);
  log.info(`  Models: ${Object.keys(MODEL_ROUTE).join(", ")}`);
});

export default app;
