import dotenv from "dotenv";
dotenv.config();

import { OllamaClient } from "./ollama-client";
import { DeepSeekClient } from "./deepseek-client";
import { GLMClient } from "./glm-client";
import { OpenAIClient } from "./openai-client";
import { AnthropicClient } from "./anthropic-client";
import { LiteLLMClient } from "./litellm-client";
import { LangChainClient } from "./langchain-client";
import { ModelClient } from "./types";

export * from "./types";
export * from "./ollama-client";
export * from "./deepseek-client";
export * from "./glm-client";
export * from "./openai-client";
export * from "./anthropic-client";
export * from "./litellm-client";
export * from "./langchain-client";

export type ModelKey =
  | "qwen7b"
  | "qwen14b"
  | "qwen32b"
  | "deepseek"
  | "deepseek33b"
  | "glm"
  | "codex"
  | "claude"
  | "litellm"
  | "langchain";

export function buildClient(key: ModelKey): ModelClient {
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  switch (key) {
    case "qwen7b":
      return new OllamaClient(
        process.env.QWEN_MODEL ?? "qwen2.5-coder:7b-instruct-q4_K_M",
        ollamaUrl
      );

    case "qwen14b":
      return new OllamaClient(
        process.env.QWEN14B_MODEL ?? "qwen2.5-coder:14b-instruct-q4_K_M",
        ollamaUrl
      );

    case "qwen32b":
      return new OllamaClient(
        process.env.QWEN32B_MODEL ?? "qwen2.5-coder:32b",
        ollamaUrl
      );

    case "deepseek33b":
      return new OllamaClient(
        process.env.DEEPSEEK33B_MODEL ?? "deepseek-coder:33b",
        ollamaUrl
      );

    case "deepseek":
      if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === "your_deepseek_api_key_here") {
        return new OllamaClient(
          process.env.DEEPSEEK_MODEL ?? "deepseek-coder:6.7b-instruct-q4_K_M",
          ollamaUrl
        );
      }
      return new DeepSeekClient(
        process.env.DEEPSEEK_API_KEY,
        "deepseek-coder",
        process.env.DEEPSEEK_API_BASE_URL
      );

    case "glm":
      if (!process.env.GLM_API_KEY || process.env.GLM_API_KEY === "your_zhipu_api_key_here") {
        throw new Error("GLM_API_KEY not set. Get a free key at https://open.bigmodel.cn");
      }
      return new GLMClient(
        process.env.GLM_API_KEY,
        "glm-4-flash",
        process.env.GLM_API_BASE_URL
      );

    case "codex":
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
        throw new Error("OPENAI_API_KEY not set.");
      }
      return new OpenAIClient(
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL ?? "gpt-4o",
        process.env.OPENAI_API_BASE_URL
      );

    case "claude":
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
        throw new Error("ANTHROPIC_API_KEY not set.");
      }
      return new AnthropicClient(
        process.env.ANTHROPIC_API_KEY,
        process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6"
      );

    case "litellm":
      return new LiteLLMClient(
        process.env.LITELLM_MODEL ?? "ollama/qwen2.5-coder:7b-instruct-q4_K_M",
        process.env.LITELLM_BASE_URL ?? "http://localhost:4000",
        process.env.LITELLM_API_KEY ?? "no-key"
      );

    case "langchain": {
      const backend = (process.env.LANGCHAIN_DRIVER as "anthropic" | "openai") ?? "anthropic";
      return new LangChainClient(backend, process.env.LANGCHAIN_MODEL);
    }

    default:
      throw new Error(`Unknown model key: "${key as string}" — check MODEL env var and buildClient switch`);
  }
}
