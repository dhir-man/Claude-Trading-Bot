import axios from "axios";
import { ModelClient, CompletionRequest, CompletionResponse } from "./types";

export class OllamaClient implements ModelClient {
  name: string;
  modelId: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(modelId: string, baseUrl = "http://localhost:11434") {
    this.modelId = modelId;
    this.name = `Ollama/${modelId}`;
    this.baseUrl = baseUrl;
    this.timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? "120000", 10);
  }

  private resourceOptions(): Record<string, unknown> {
    const opts: Record<string, unknown> = {};
    if (process.env.OLLAMA_NUM_GPU) opts.num_gpu = parseInt(process.env.OLLAMA_NUM_GPU, 10);
    if (process.env.OLLAMA_NUM_THREAD) opts.num_thread = parseInt(process.env.OLLAMA_NUM_THREAD, 10);
    if (process.env.OLLAMA_NUM_CTX) opts.num_ctx = parseInt(process.env.OLLAMA_NUM_CTX, 10);
    return opts;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      const models: { name: string }[] = res.data?.models ?? [];
      return models.some((m) => m.name === this.modelId || m.name.startsWith(this.modelId.split(":")[0]));
    } catch {
      return false;
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const res = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.modelId,
        messages: req.messages,
        stream: false,
        options: {
          temperature: req.temperature ?? 0.1,
          num_predict: req.maxTokens ?? 4096,
          keep_alive: "5m",
          ...this.resourceOptions(),
        },
      },
      { timeout: this.timeoutMs }
    );

    const latencyMs = Date.now() - start;
    const content: string = res.data?.message?.content ?? "";
    const promptTokens: number = res.data?.prompt_eval_count ?? 0;
    const completionTokens: number = res.data?.eval_count ?? 0;

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
