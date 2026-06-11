#!/usr/bin/env node
/**
 * Automated Ollama setup script.
 * Checks for Ollama, installs missing models, verifies the API.
 *
 * Usage: node scripts/setup-ollama.js
 * Requirements: Ollama installed (https://ollama.com)
 */
const { execSync, spawn } = require("child_process");
const https = require("https");
const http = require("http");

const MODELS = {
  "qwen7b": {
    tag: "qwen2.5-coder:7b-instruct-q4_K_M",
    vram: "~5GB",
    ramFallback: "~8GB RAM",
    description: "Qwen2.5-Coder 7B — Best value (Apache 2.0)",
  },
  "deepseek": {
    tag: "deepseek-coder:6.7b-instruct-q4_K_M",
    vram: "~4.5GB",
    ramFallback: "~8GB RAM",
    description: "DeepSeek-Coder 6.7B — Strong local coding (MIT/DeepSeek)",
  },
};

const OLLAMA_API = "http://localhost:11434";

function run(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch {
    return null;
  }
}

async function checkOllamaRunning() {
  return new Promise((resolve) => {
    http
      .get(`${OLLAMA_API}/api/tags`, (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => resolve(false));
  });
}

async function listInstalledModels() {
  return new Promise((resolve) => {
    http
      .get(`${OLLAMA_API}/api/tags`, (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.models?.map((m) => m.name) ?? []);
          } catch {
            resolve([]);
          }
        });
      })
      .on("error", () => resolve([]));
  });
}

async function main() {
  console.log("\n🔧  Ollama Setup for LLM Coding Eval\n");

  // 1. Check Ollama is installed
  const version = run("ollama --version");
  if (!version) {
    console.error("❌  Ollama not found. Install it from https://ollama.com/download");
    console.error("    Windows: winget install Ollama.Ollama");
    console.error("    macOS:   brew install ollama");
    console.error("    Linux:   curl -fsSL https://ollama.com/install.sh | sh");
    process.exit(1);
  }
  console.log(`✓  Ollama ${version} installed`);

  // 2. Check Ollama service is running
  const running = await checkOllamaRunning();
  if (!running) {
    console.log("▶  Starting Ollama service...");
    spawn("ollama", ["serve"], { detached: true, stdio: "ignore" }).unref();
    await new Promise((r) => setTimeout(r, 3000));
    const nowRunning = await checkOllamaRunning();
    if (!nowRunning) {
      console.error("❌  Could not start Ollama. Run: ollama serve");
      process.exit(1);
    }
  }
  console.log(`✓  Ollama API running at ${OLLAMA_API}`);

  // 3. Check GPU
  const gpu = run("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader") ||
              run("rocm-smi --showmeminfo vram") ||
              "No GPU detected — will use CPU (very slow for 32B)";
  console.log(`ℹ  GPU: ${gpu}`);

  // 4. List installed models
  const installed = await listInstalledModels();
  console.log(`\nInstalled models: ${installed.length ? installed.join(", ") : "none"}`);

  // 5. Pull missing models
  console.log("\n── Model Status ──────────────────────────────────────────────");
  for (const [key, info] of Object.entries(MODELS)) {
    const isInstalled = installed.some((m) => m.startsWith(info.tag.split(":")[0]));
    if (isInstalled) {
      console.log(`✓  ${info.tag} (already installed)`);
    } else {
      console.log(`⚡ ${info.description}`);
      console.log(`   VRAM needed: ${info.vram}`);
      console.log(`   To install:  ollama pull ${info.tag}`);
      if (info.ramFallback) {
        console.log(`   Fallback:    ${info.ramFallback}`);
      }
    }
  }

  console.log("\n── Quick Start ───────────────────────────────────────────────");
  console.log("  # Pull a model (run once):");
  console.log("  ollama pull qwen2.5-coder:7b-instruct-q4_K_M");
  console.log("  ollama pull deepseek-coder:6.7b-instruct-q4_K_M");
  console.log("");
  console.log("  # Run the test suite (PowerShell):");
  console.log("  $env:MODEL='qwen7b';  npx jest tests/leetcode.test.ts");
  console.log("  $env:MODEL='deepseek'; npx jest tests/scheduler.test.ts");
  console.log("");
  console.log("  # Run the combined eval across both local models:");
  console.log("  npx ts-node src/run-eval.ts");
  console.log("");
  console.log("  # Start the proxy API server:");
  console.log("  npx ts-node src/api-server.ts");
  console.log("");
  console.log("  # Test the API:");
  console.log(`  curl http://localhost:3456/v1/chat/completions \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"model":"qwen2.5-coder-7b","messages":[{"role":"user","content":"Write twoSum in TypeScript"}]}'`);
}

main().catch(console.error);
