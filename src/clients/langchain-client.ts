/**
 * LangChain Driver
 *
 * Wraps either @langchain/anthropic or @langchain/openai in the ModelClient
 * interface, allowing the same test harness to drive Claude or OpenAI-compatible
 * models through LangChain's abstractions (prompt templates, output parsers, etc.)
 *
 * Set in .env:
 *   LANGCHAIN_DRIVER=anthropic   # or "openai"
 *   LANGCHAIN_MODEL=claude-sonnet-4-6
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   OPENAI_API_KEY=sk-...
 */
import { ModelClient, CompletionRequest, CompletionResponse, MODEL_PRICING } from "./types";

type LangChainBackend = "anthropic" | "openai";

export class LangChainClient implements ModelClient {
  name: string;
  modelId: string;
  private backend: LangChainBackend;

  constructor(
    backend: LangChainBackend = "anthropic",
    modelId?: string
  ) {
    this.backend = backend;
    this.modelId = modelId ?? (backend === "anthropic" ? "claude-sonnet-4-6" : "gpt-4o");
    this.name = `LangChain/${backend}/${this.modelId}`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const llm = await this.buildLLM();
      // Minimal probe — LangChain models throw if API key is missing/invalid
      await llm.invoke([{ type: "human", content: "hi" }]);
      return true;
    } catch {
      return false;
    }
  }

  private async buildLLM(): Promise<{ invoke: (msgs: unknown[]) => Promise<{ content: string }> }> {
    if (this.backend === "anthropic") {
      const { ChatAnthropic } = await import("@langchain/anthropic");
      return new ChatAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: this.modelId,
        maxTokens: 4096,
      }) as unknown as { invoke: (msgs: unknown[]) => Promise<{ content: string }> };
    } else {
      const { ChatOpenAI } = await import("@langchain/openai");
      return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: this.modelId,
        maxTokens: 4096,
        configuration: { baseURL: process.env.OPENAI_API_BASE_URL },
      }) as unknown as { invoke: (msgs: unknown[]) => Promise<{ content: string }> };
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const llm = await this.buildLLM();

    const msgs = req.messages.map((m) => ({
      type: m.role === "system" ? "system" : m.role === "assistant" ? "ai" : "human",
      content: m.content,
    }));

    const response = await llm.invoke(msgs);
    const latencyMs = Date.now() - start;

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // LangChain doesn't always surface usage — estimate from content length
    const estimatedTokens = Math.ceil(content.length / 4);
    const pricing = MODEL_PRICING[this.modelId] ?? { inputPer1M: 0, outputPer1M: 0 };
    const costUsd = (estimatedTokens / 1_000_000) * pricing.outputPer1M;

    return {
      content,
      promptTokens: 0,
      completionTokens: estimatedTokens,
      totalTokens: estimatedTokens,
      latencyMs,
      costUsd,
      modelId: this.modelId,
    };
  }
}
