export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd?: number;
  modelId: string;
}

export interface ModelClient {
  name: string;
  modelId: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  isAvailable(): Promise<boolean>;
}

export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number; notes: string }> = {
  "qwen2.5-coder:7b-instruct-q4_K_M":  { inputPer1M: 0, outputPer1M: 0, notes: "Local Ollama — hardware cost only" },
  "qwen2.5-coder:14b-instruct-q4_K_M": { inputPer1M: 0, outputPer1M: 0, notes: "Local Ollama — hardware cost only" },
  "qwen2.5-coder:32b-instruct-q4_K_M": { inputPer1M: 0, outputPer1M: 0, notes: "Local Ollama — hardware cost only" },
  "deepseek-coder:6.7b-instruct-q4_K_M": { inputPer1M: 0, outputPer1M: 0, notes: "Local Ollama — hardware cost only" },
  "deepseek-coder": { inputPer1M: 0.14, outputPer1M: 0.28, notes: "DeepSeek API — 1M tokens/month free, 60 RPM" },
  "glm-4-flash":    { inputPer1M: 0.14, outputPer1M: 0.14, notes: "GLM-5 tier — 6M tokens/month free" },
  "gpt-4o":         { inputPer1M: 2.50, outputPer1M: 10.0, notes: "OpenAI API" },
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0, notes: "Anthropic API" },
  "claude-opus-4-8":   { inputPer1M: 15.0, outputPer1M: 75.0, notes: "Anthropic API" },
  "litellm-proxy":  { inputPer1M: 0, outputPer1M: 0, notes: "LiteLLM proxy — cost depends on backend" },
  "langchain":      { inputPer1M: 0, outputPer1M: 0, notes: "LangChain driver — cost depends on backend" },
};
