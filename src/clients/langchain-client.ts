import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
} from "./types";

type LangChainBackend = "anthropic" | "openai" | "ollama";

/**
 * LangChain driver — wraps LangChain JS ChatModel instances.
 *
 * Supported backends:
 *   "anthropic" → @langchain/anthropic  ChatAnthropic
 *   "openai"    → @langchain/openai     ChatOpenAI
 *   "ollama"    → @langchain/ollama     ChatOllama  (requires: npm i @langchain/ollama)
 *
 * Env (anthropic backend):
 *   ANTHROPIC_API_KEY, CLAUDE_MODEL (default "claude-sonnet-4-6")
 *
 * Env (openai backend):
 *   OPENAI_API_KEY, OPENAI_MODEL (default "gpt-4o"), OPENAI_API_BASE_URL
 *
 * Env (ollama backend):
 *   OLLAMA_BASE_URL, QWEN_MODEL / DEEPSEEK_MODEL
 */
export class LangChainClient implements ModelClient {
  readonly name: string;
  readonly modelId: string;
  private backend: LangChainBackend;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chatModel: any = null;

  constructor(backend: LangChainBackend = "anthropic", modelId?: string) {
    this.backend = backend;

    switch (backend) {
      case "anthropic":
        this.modelId = modelId ?? process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
        break;
      case "openai":
        this.modelId = modelId ?? process.env.OPENAI_MODEL ?? "gpt-4o";
        break;
      case "ollama":
        this.modelId = modelId ?? process.env.QWEN_MODEL ?? "qwen2.5-coder:7b-instruct-q4_K_M";
        break;
      default:
        this.modelId = modelId ?? "unknown";
    }

    this.name = `LangChain/${backend}/${this.modelId}`;
  }

  // Lazy-load the LangChain model to avoid top-level import errors when
  // a backend's package is not installed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getModel(): Promise<any> {
    if (this.chatModel) return this.chatModel;

    switch (this.backend) {
      case "anthropic": {
        const { ChatAnthropic } = await import("@langchain/anthropic");
        this.chatModel = new ChatAnthropic({
          model: this.modelId,
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxTokens: 4096,
          temperature: 0.1,
        });
        break;
      }
      case "openai": {
        const { ChatOpenAI } = await import("@langchain/openai");
        this.chatModel = new ChatOpenAI({
          model: this.modelId,
          apiKey: process.env.OPENAI_API_KEY,
          configuration: {
            baseURL: process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
          },
          maxTokens: 4096,
          temperature: 0.1,
        });
        break;
      }
      case "ollama": {
        // @langchain/ollama is an optional dep — install if needed:
        //   npm install @langchain/ollama
        try {
          const { ChatOllama } = await import("@langchain/ollama" as string);
          this.chatModel = new ChatOllama({
            model: this.modelId,
            baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
            temperature: 0.1,
          });
        } catch {
          throw new Error(
            "@langchain/ollama not installed. Run: npm install @langchain/ollama"
          );
        }
        break;
      }
    }

    return this.chatModel;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.getModel();
      return true;
    } catch {
      return false;
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = await this.getModel();
    const start = Date.now();

    // Build LangChain BaseMessage array
    const { HumanMessage, SystemMessage, AIMessage } = await import("@langchain/core/messages");
    const messages = req.messages.map((m) => {
      if (m.role === "system") return new SystemMessage(m.content);
      if (m.role === "assistant") return new AIMessage(m.content);
      return new HumanMessage(m.content);
    });

    const result = await model.invoke(messages);
    const latencyMs = Date.now() - start;

    // result is a BaseMessage; content can be string or content block array
    let content = "";
    if (typeof result.content === "string") {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      content = result.content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((b: any) => (typeof b === "string" ? b : b.text ?? ""))
        .join("");
    }

    // Token usage is available on some models via response_metadata
    const meta = result.response_metadata ?? {};
    const usage = meta.usage ?? meta.tokenUsage ?? {};
    const promptTokens =
      usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokens ?? 0;
    const completionTokens =
      usage.output_tokens ??
      usage.completion_tokens ??
      usage.completionTokens ??
      0;

    return {
      content,
      model: meta.model_name ?? this.modelId,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      costUsd: 0,
    };
  }
}
