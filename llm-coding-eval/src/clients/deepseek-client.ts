import axios, { AxiosInstance } from "axios";
import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
  MODEL_PRICING,
} from "./types";

/**
 * DeepSeek-Coder V3 via the official DeepSeek API.
 * OpenAI-compatible — drop-in replacement for openai SDK if preferred.
 *
 * Free tier: 1M tokens/month, 60 req/min
 * Docs: https://platform.deepseek.com/api-docs/
 *
 * For self-hosted (Ollama), use OllamaClient with model "deepseek-coder-v3"
 */
export class DeepSeekClient implements ModelClient {
  readonly name = "DeepSeek-Coder-V3";
  readonly modelId: string;
  private http: AxiosInstance;

  constructor(
    apiKey: string,
    modelId = "deepseek-coder",
    baseUrl = "https://api.deepseek.com/v1"
  ) {
    this.modelId = modelId;
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 120_000,
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

    const response = await this.http.post("/chat/completions", {
      model: this.modelId,
      messages: req.messages,
      temperature: req.temperature ?? 0.1,
      max_tokens: req.maxTokens ?? 4096,
    });

    const latencyMs = Date.now() - start;
    const choice = response.data.choices[0];
    const usage = response.data.usage;
    const pricing = MODEL_PRICING["deepseek-coder-v3"];

    const costUsd =
      (usage.prompt_tokens / 1000) * pricing.inputPer1K +
      (usage.completion_tokens / 1000) * pricing.outputPer1K;

    return {
      content: choice.message.content,
      model: response.data.model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latencyMs,
      costUsd,
    };
  }
}
