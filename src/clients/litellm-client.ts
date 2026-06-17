import axios, { AxiosInstance } from "axios";
import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
} from "./types";

/**
 * LiteLLM client — calls the LiteLLM proxy server, which presents an
 * OpenAI-compatible /chat/completions endpoint and routes the request to
 * whichever upstream model you specify.
 *
 * Run the proxy with:
 *   pip install litellm
 *   litellm --model claude-sonnet-4-6   # or any model string
 *   (defaults to http://localhost:4000)
 *
 * Env:
 *   LITELLM_BASE_URL  – default "http://localhost:4000/v1"
 *   LITELLM_API_KEY   – default "any" (can be a real key if proxy forwards it)
 *   LITELLM_MODEL     – model string passed to the proxy (e.g. "anthropic/claude-sonnet-4-6")
 */
export class LiteLLMClient implements ModelClient {
  readonly name: string;
  readonly modelId: string;
  private http: AxiosInstance;

  constructor(
    modelId = "anthropic/claude-sonnet-4-6",
    baseUrl = "http://localhost:4000/v1",
    apiKey = "sk-litellm-proxy"
  ) {
    this.modelId = modelId;
    this.name = `LiteLLM/${modelId}`;
    const timeout = parseInt(process.env.LITELLM_TIMEOUT_MS ?? "120000", 10);
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
      // LiteLLM proxy health endpoint
      await this.http.get("/health");
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
    const usage = response.data.usage ?? {};

    return {
      content: choice.message?.content ?? "",
      model: response.data.model ?? this.modelId,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
      latencyMs,
      costUsd: 0,
    };
  }
}
