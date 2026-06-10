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
 * Wraps extracted code in a sandboxed eval context and returns the exports.
 * Only use for LLM-generated code you trust (evaluation harness).
 */
export function evalCode(code: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  // eslint-disable-next-line no-new-func
  const fn = new Function("module", "exports", "require", code);
  fn(module, module.exports, () => ({}));
  return module.exports;
}

export function extractAndEval(response: string): Record<string, unknown> {
  const code = extractCode(response);
  return evalCode(code);
}
