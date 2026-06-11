/**
 * Extracts TypeScript/JavaScript code blocks from LLM markdown responses.
 * Handles: ```typescript, ```ts, ```javascript, ```js, bare ``` blocks.
 */
export function extractCode(response: string): string {
  // Prefer explicitly labelled TypeScript/JS blocks
  const tsMatch = response.match(/```(?:typescript|ts)\n([\s\S]*?)```/);
  if (tsMatch) return tsMatch[1].trim();

  const jsMatch = response.match(/```(?:javascript|js)\n([\s\S]*?)```/);
  if (jsMatch) return jsMatch[1].trim();

  // Fall back to any fenced block
  const genericMatch = response.match(/```\n?([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();

  // No fence — return the whole response (model gave raw code)
  return response.trim();
}

/**
 * Transpiles TypeScript source to runnable JavaScript.
 * LLMs emit TS with type annotations that `new Function` (a JS evaluator)
 * cannot parse — strip them first via the TypeScript compiler.
 */
export function transpileTs(code: string): string {
  // Lazy require so non-eval consumers don't pay the cost
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require("typescript");
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  return result.outputText;
}

/**
 * Wraps extracted code in a sandboxed eval context and returns the exports.
 * Only use for LLM-generated code you trust (evaluation harness).
 * Transpiles TypeScript → JavaScript before evaluation.
 */
export function evalCode(code: string): Record<string, unknown> {
  const js = transpileTs(code);
  const module = { exports: {} as Record<string, unknown> };
  // Provide the real `require` so generated code can use Node stdlib
  // (e.g. `import { randomUUID } from "crypto"`). A stub would make any
  // import resolve to undefined and throw at call time.
  // eslint-disable-next-line no-new-func
  const fn = new Function("module", "exports", "require", js);
  fn(module, module.exports, require);
  return module.exports;
}

export function extractAndEval(response: string): Record<string, unknown> {
  const code = extractCode(response);
  return evalCode(code);
}
