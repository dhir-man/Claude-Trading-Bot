import axios from "axios";
import { ModelClient, CompletionRequest, CompletionResponse } from "./types";

export class OpenAIClient implements ModelClient {
  name: string;
  modelId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, modelId = "gpt-4o", baseUrl?: string) {
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.name = `OpenAI/${modelId}`;
    this.baseUrl = baseUrl ?? "https://api.openai.com/v1";
  }

  private isReasoningModel(): boolean {
    return this.modelId.startsWith("o") || this.modelId.includes("gpt-5");
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
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: req.messages,
    };

    if (this.isReasoningModel()) {
      body.max_completion_tokens = req.maxTokens ?? 4096;
    } else {
      body.temperature = req.temperature ?? 0.1;
      body.max_tokens = req.maxTokens ?? 4096;
    }

    const res = await axios.post(`${this.baseUrl}/chat/completions`, body, {
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      timeout: 300000,
    });

    const latencyMs = Date.now() - start;
    const content: string = res.data.choices[0]?.message?.content ?? "";
    const promptTokens: number = res.data.usage?.prompt_tokens ?? 0;
    const completionTokens: number = res.data.usage?.completion_tokens ?? 0;

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      costUsd: 0,
      modelId: this.modelId,
    };
  }
}
