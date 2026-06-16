import axios from "axios";
import { ModelClient, CompletionRequest, CompletionResponse, MODEL_PRICING } from "./types";

export class DeepSeekClient implements ModelClient {
  name: string;
  modelId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, modelId = "deepseek-coder", baseUrl?: string) {
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.name = `DeepSeek/${modelId}`;
    this.baseUrl = baseUrl ?? "https://api.deepseek.com/v1";
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const res = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.modelId,
        messages: req.messages,
        temperature: req.temperature ?? 0.1,
        max_tokens: req.maxTokens ?? 4096,
      },
      {
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        timeout: 120000,
      }
    );

    const latencyMs = Date.now() - start;
    const content: string = res.data.choices[0]?.message?.content ?? "";
    const promptTokens: number = res.data.usage?.prompt_tokens ?? 0;
    const completionTokens: number = res.data.usage?.completion_tokens ?? 0;
    const pricing = MODEL_PRICING[this.modelId] ?? { inputPer1M: 0.14, outputPer1M: 0.28 };
    const costUsd =
      (promptTokens / 1_000_000) * pricing.inputPer1M +
      (completionTokens / 1_000_000) * pricing.outputPer1M;

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      costUsd,
      modelId: this.modelId,
    };
  }
}
