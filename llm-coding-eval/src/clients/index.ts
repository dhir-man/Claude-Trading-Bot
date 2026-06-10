import dotenv from "dotenv";
dotenv.config();

import { OllamaClient } from "./ollama-client";
import { DeepSeekClient } from "./deepseek-client";
import { GLMClient } from "./glm-client";
import { ModelClient } from "./types";

export * from "./types";
export * from "./ollama-client";
export * from "./deepseek-client";
export * from "./glm-client";

export type ModelKey = "qwen32b" | "deepseek" | "glm";

export function buildClient(key: ModelKey): ModelClient {
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  switch (key) {
    case "qwen32b":
      return new OllamaClient(
        process.env.QWEN32B_MODEL ?? "qwen3-coder:32b-instruct-q4_K_M",
        ollamaUrl
      );

    case "deepseek":
      // Prefer local Ollama if no API key provided
      if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === "your_deepseek_api_key_here") {
        return new OllamaClient(
          process.env.DEEPSEEK_MODEL ?? "deepseek-coder-v3:latest",
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
        throw new Error(
          "GLM_API_KEY not set. Get a free key at https://open.bigmodel.cn"
        );
      }
      return new GLMClient(
        process.env.GLM_API_KEY,
        "glm-4-flash",
        process.env.GLM_API_BASE_URL
      );
  }
}

export function allClients(): Record<ModelKey, ModelClient> {
  const result: Partial<Record<ModelKey, ModelClient>> = {};
  const keys: ModelKey[] = ["qwen32b", "deepseek", "glm"];
  for (const k of keys) {
    try {
      result[k] = buildClient(k);
    } catch {
      // skip unavailable
    }
  }
  return result as Record<ModelKey, ModelClient>;
}
