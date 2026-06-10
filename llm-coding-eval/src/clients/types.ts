export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd?: number;
}

export interface ModelClient {
  name: string;
  modelId: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  isAvailable(): Promise<boolean>;
}

// Pricing per 1K tokens (USD) — $0 = free/local
export interface ModelPricing {
  inputPer1K: number;
  outputPer1K: number;
  freeMonthlyTokens?: number;
  notes: string;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "qwen3-coder-32b": {
    inputPer1K: 0.0,
    outputPer1K: 0.0,
    notes: "Local via Ollama — hardware cost only. Apache 2.0 license.",
  },
  "deepseek-coder-v3": {
    inputPer1K: 0.00014, // $0.14/M input (cache miss)
    outputPer1K: 0.00028, // $0.28/M output
    freeMonthlyTokens: 1_000_000,
    notes: "DeepSeek API free tier: 1M tokens/month, 60 RPM. MIT license.",
  },
  "glm-5": {
    inputPer1K: 0.00014, // ~¥0.001/1K = ~$0.00014
    outputPer1K: 0.00014,
    freeMonthlyTokens: 6_000_000,
    notes: "Zhipu AI free tier: 6M tokens/month. GLM-4 also available free.",
  },
};
