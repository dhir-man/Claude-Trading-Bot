import ts from "typescript";

/** Extract the first TypeScript/JavaScript code block from an LLM markdown response. */
export function extractCode(markdown: string): string {
  // Try ```typescript or ```ts first
  const tsMatch = markdown.match(/```(?:typescript|ts)\s*\n([\s\S]*?)```/);
  if (tsMatch) return tsMatch[1].trim();

  // Fall back to any fenced block
  const anyMatch = markdown.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (anyMatch) return anyMatch[1].trim();

  // Return raw content if no fences found
  return markdown.trim();
}

/** Transpile TypeScript source to CommonJS JavaScript. */
export function transpileTs(source: string): string {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  return result.outputText;
}

/** Evaluate transpiled code and return its exports. */
export function evalCode(code: string): Record<string, unknown> {
  const js = transpileTs(code);
  const mod = { exports: {} as Record<string, unknown> };
  const fn = new Function("module", "exports", "require", js);
  fn(mod, mod.exports, require);
  return mod.exports as Record<string, unknown>;
}

/** Extract code from markdown then evaluate it. */
export function extractAndEval(markdown: string): Record<string, unknown> {
  return evalCode(extractCode(markdown));
}
