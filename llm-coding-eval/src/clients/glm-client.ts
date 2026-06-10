import axios, { AxiosInstance } from "axios";
import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
  MODEL_PRICING,
} from "./types";

/**
 * GLM-4 / GLM-Z1 via Zhipu AI BigModel API.
 * Free tier: 6M tokens/month.
 *
 * Model IDs:
 *   glm-4-flash        — free, fast
 *   glm-4-air          — free, balanced
 *   glm-4              — paid, strongest
 *   glm-z1-flash       — free, reasoning-focused
 *
 * Docs: https://open.bigmodel.cn/dev/api
 * SDK:  npm install zhipuai  (optional)
 */
export class GLMClient implements ModelClient {
  readonly name = "GLM-4-Flash";
  readonly modelId: string;
  private http: AxiosInstance;

  constructor(
    apiKey: string,
    modelId = "glm-4-flash",
    baseUrl = "https://open.bigmodel.cn/api/paas/v4"
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
      // Zhipu doesn't expose /models — use a minimal probe instead
      await this.http.post("/chat/completions", {
        model: this.modelId,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      });
      return true;
    } catch (e: any) {
      // 400/422 = API is reachable but request invalid — still "available"
      return e?.response?.status !== undefined && e.response.status < 500;
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
    const pricing = MODEL_PRICING["glm-5"];

    const costUsd =
      (usage.prompt_tokens / 1000) * pricing.inputPer1K +
      (usage.completion_tokens / 1000) * pricing.outputPer1K;

    return {
      content: choice.message?.content ?? choice.text ?? "",
      model: response.data.model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latencyMs,
      costUsd,
    };
  }
}
