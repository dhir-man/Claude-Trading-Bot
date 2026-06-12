import axios, { AxiosInstance } from "axios";
import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
  ChatMessage,
} from "./types";

export class OllamaClient implements ModelClient {
  readonly name: string;
  readonly modelId: string;
  private http: AxiosInstance;

  constructor(modelId: string, baseUrl = "http://localhost:11434") {
    this.modelId = modelId;
    this.name = modelId.split(":")[0];
    // Configurable — large models offloaded to CPU can exceed the default.
    const timeout = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? "120000", 10);
    this.http = axios.create({ baseURL: baseUrl, timeout });
  }

  /**
   * Merge caller options with resource-allocation knobs read from env.
   * Lets a 32B/33B run push as many layers onto the GPU as fit and use
   * every CPU core for the CPU-offloaded remainder, without code edits.
   *   OLLAMA_NUM_GPU     – layers to offload to GPU (e.g. 999 = as many as fit)
   *   OLLAMA_NUM_THREAD  – CPU threads for the offloaded layers
   *   OLLAMA_NUM_CTX     – context window
   */
  private resourceOptions(base: Record<string, unknown>): Record<string, unknown> {
    const opts: Record<string, unknown> = { ...base };
    const num = (v: string | undefined) =>
      v === undefined ? undefined : parseInt(v, 10);
    const gpu = num(process.env.OLLAMA_NUM_GPU);
    const thread = num(process.env.OLLAMA_NUM_THREAD);
    const ctx = num(process.env.OLLAMA_NUM_CTX);
    if (gpu !== undefined) opts.num_gpu = gpu;
    if (thread !== undefined) opts.num_thread = thread;
    if (ctx !== undefined) opts.num_ctx = ctx;
    return opts;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await this.http.get("/api/tags");
      const models: { name: string }[] = res.data?.models ?? [];
      return models.some((m) => m.name.startsWith(this.name));
    } catch {
      return false;
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    // Ollama /api/chat endpoint (OpenAI-compatible messages)
    const response = await this.http.post(
      "/api/chat",
      {
        model: this.modelId,
        messages: req.messages,
        stream: false,
        // Keep the model resident between problems so we pay the (large)
        // load cost once per model, not per request.
        keep_alive: process.env.OLLAMA_KEEP_ALIVE ?? "30m",
        options: this.resourceOptions({
          temperature: req.temperature ?? 0.1,
          num_predict: req.maxTokens ?? 2048,
        }),
      }
    );

    const latencyMs = Date.now() - start;
    const data = response.data;

    return {
      content: data.message?.content ?? "",
      model: this.modelId,
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
      totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      latencyMs,
      costUsd: 0, // local — no API cost
    };
  }

  // OpenAI-compatible endpoint Ollama exposes at /v1/chat/completions
  async completeOpenAI(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    const response = await this.http.post("/v1/chat/completions", {
      model: this.modelId,
      messages: req.messages,
      temperature: req.temperature ?? 0.1,
      max_tokens: req.maxTokens ?? 2048,
    });

    const latencyMs = Date.now() - start;
    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content,
      model: response.data.model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latencyMs,
      costUsd: 0,
    };
  }
}
