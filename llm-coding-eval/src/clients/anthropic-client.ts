import Anthropic from "@anthropic-ai/sdk";
import {
  ModelClient,
  CompletionRequest,
  CompletionResponse,
  ChatMessage,
} from "./types";

/**
 * Claude (Anthropic) client — used to expose Claude Opus through the API server
 * alongside the local models. Uses the official @anthropic-ai/sdk.
 *
 * Anthropic's Messages API takes the system prompt as a separate `system`
 * parameter (not a message role), and Opus 4.x does not accept `temperature`,
 * so we split system messages out and omit sampling params.
 *
 * Env:
 *   ANTHROPIC_API_KEY  – required
 *   CLAUDE_MODEL       – default "claude-opus-4-8"
 */
export class AnthropicClient implements ModelClient {
  readonly name: string;
  readonly modelId: string;
  private client: Anthropic;

  constructor(apiKey: string, modelId = "claude-opus-4-8") {
    this.modelId = modelId;
    this.name = `Anthropic ${modelId}`;
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

    // Anthropic takes `system` separately; messages are user/assistant only.
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = req.messages
      .filter((m): m is ChatMessage => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const res = await this.client.messages.create({
      model: this.modelId,
      max_tokens: req.maxTokens ?? 4096,
      ...(system ? { system } : {}),
      messages,
    });

    const latencyMs = Date.now() - start;
    const text = res.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    return {
      content: text,
      model: res.model ?? this.modelId,
      promptTokens: res.usage?.input_tokens ?? 0,
      completionTokens: res.usage?.output_tokens ?? 0,
      totalTokens: (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0),
      latencyMs,
      costUsd: 0, // priced separately; not tracked per-call here
    };
  }
}
