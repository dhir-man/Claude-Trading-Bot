/**
 * LiteLLM Driver
 *
 * LiteLLM runs an OpenAI-compatible proxy server (default port 4000).
 * Start it with:
 *   pip install litellm
 *   litellm --model ollama/qwen2.5-coder:7b-instruct-q4_K_M --port 4000
 *
 * Then set in .env:
 *   LITELLM_BASE_URL=http://localhost:4000
 *   LITELLM_MODEL=ollama/qwen2.5-coder:7b-instruct-q4_K_M
 */
import axios from "axios";
import { ModelClient, CompletionRequest, CompletionResponse } from "./types";

export class LiteLLMClient implements ModelClient {
  name: string;
  modelId: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(
    modelId = "ollama/qwen2.5-coder:7b-instruct-q4_K_M",
    baseUrl = "http://localhost:4000",
    apiKey = "no-key"
  ) {
    this.modelId = modelId;
    this.name = `LiteLLM/${modelId}`;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return res.status < 400;
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
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

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
