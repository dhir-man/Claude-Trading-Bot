import Anthropic from "@anthropic-ai/sdk";
import { ModelClient, CompletionRequest, CompletionResponse, MODEL_PRICING } from "./types";

export class AnthropicClient implements ModelClient {
  name: string;
  modelId: string;
  private client: Anthropic;

  constructor(apiKey: string, modelId = "claude-sonnet-4-6") {
    this.modelId = modelId;
    this.name = `Claude/${modelId}`;
    this.client = new Anthropic({ apiKey });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.retrieve(this.modelId);
      return true;
    } catch {
      return false;
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    const systemMsg = req.messages.find((m) => m.role === "system");
    const userMessages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const res = await this.client.messages.create({
      model: this.modelId,
      max_tokens: req.maxTokens ?? 4096,
      system: systemMsg?.content,
      messages: userMessages,
    });

    const latencyMs = Date.now() - start;
    const content = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const promptTokens = res.usage.input_tokens;
    const completionTokens = res.usage.output_tokens;
    const pricing = MODEL_PRICING[this.modelId] ?? { inputPer1M: 3.0, outputPer1M: 15.0 };
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
