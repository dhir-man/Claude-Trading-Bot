import axios, { AxiosInstance } from "axios";
import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
} from "./types";

/**
 * OpenAI client — used for the "codex" frontier comparison.
 *
 * Works with the OpenAI Chat Completions API (api.openai.com/v1) and any
 * OpenAI-compatible endpoint. The model id is configurable via OPENAI_MODEL
 * (e.g. "gpt-4o", "gpt-4.1", "gpt-5-codex", "o4-mini").
 *
 * Reasoning / Codex-class models (o-series, gpt-5*) reject `temperature` and
 * use `max_completion_tokens` instead of `max_tokens`; this client adapts the
 * request shape automatically so the same harness drives every model.
 *
 * Env:
 *   OPENAI_API_KEY        – required
 *   OPENAI_MODEL          – default "gpt-4o"
 *   OPENAI_API_BASE_URL   – default "https://api.openai.com/v1"
 */
export class OpenAIClient implements ModelClient {
  readonly name: string;
  readonly modelId: string;
  private http: AxiosInstance;
  private isReasoning: boolean;

  constructor(
    apiKey: string,
    modelId = "gpt-4o",
    baseUrl = "https://api.openai.com/v1"
  ) {
    this.modelId = modelId;
    this.name = `OpenAI ${modelId}`;
    // o1/o3/o4 and gpt-5* are reasoning models with a different request shape.
    this.isReasoning = /^(o\d|gpt-5)/i.test(modelId);
    const timeout = parseInt(process.env.OPENAI_TIMEOUT_MS ?? "300000", 10);
    this.http = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.http.get("/models");
      return true;
    } catch {
      return false;
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: req.messages,
    };
    if (this.isReasoning) {
      // Reasoning models: no temperature; output budget under a new key.
      body.max_completion_tokens = req.maxTokens ?? 4096;
    } else {
      body.temperature = req.temperature ?? 0.1;
      body.max_tokens = req.maxTokens ?? 4096;
    }

    const response = await this.http.post("/chat/completions", body);

    const latencyMs = Date.now() - start;
    const choice = response.data.choices[0];
    const usage = response.data.usage ?? {};

    return {
      content: choice.message.content ?? "",
      model: response.data.model ?? this.modelId,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
      latencyMs,
      costUsd: 0, // priced separately in the deck; not tracked per-call here
    };
  }
}
