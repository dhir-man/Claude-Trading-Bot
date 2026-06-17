/**
 * Pulls all Ollama models required for the eval harness.
 * node scripts/setup-ollama.js
 */
const { execSync } = require("child_process");

const models = [
  process.env.QWEN_MODEL      || "qwen2.5-coder:7b-instruct-q4_K_M",
  process.env.DEEPSEEK_MODEL  || "deepseek-coder:6.7b-instruct-q4_K_M",
];

console.log("Setting up Ollama models...\n");

for (const model of models) {
  console.log(`Pulling ${model} ...`);
  try {
    execSync(`ollama pull ${model}`, { stdio: "inherit" });
    console.log(`✓ ${model} ready\n`);
  } catch (e) {
    console.error(`✗ Failed to pull ${model}: ${e.message}`);
  }
}

console.log("Done. Run `npm test` to start the evaluation.");
