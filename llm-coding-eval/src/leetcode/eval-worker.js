/**
 * Worker thread that transpiles + evaluates LLM-generated TypeScript and
 * runs the problem's test cases. Isolated so the main thread can terminate
 * it on timeout if the generated code contains an infinite loop.
 *
 * Plain CommonJS (no ts-node needed inside the worker).
 */
const { workerData, parentPort } = require("worker_threads");
const ts = require("typescript");

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => deepEqual(v, sb[i]));
  }
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-5;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function main() {
  const { code, functionName, testCases } = workerData;

  // Transpile TS -> JS
  let js;
  try {
    js = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;
  } catch (e) {
    parentPort.postMessage({ fatal: `Transpile error: ${e.message}` });
    return;
  }

  // Evaluate
  let exports = {};
  try {
    const module = { exports: {} };
    const fn = new Function("module", "exports", "require", js);
    // Real `require` so generated code can use Node stdlib (crypto, etc.)
    fn(module, module.exports, require);
    exports = module.exports;
  } catch (e) {
    parentPort.postMessage({ fatal: `Eval error: ${e.message}` });
    return;
  }

  let theFn = exports[functionName];
  if (typeof theFn !== "function") {
    const anyFn = Object.values(exports).find((v) => typeof v === "function");
    if (!anyFn) {
      parentPort.postMessage({ fatal: `Function '${functionName}' not exported` });
      return;
    }
    theFn = anyFn;
  }

  const results = [];
  for (const tc of testCases) {
    try {
      const actual = theFn(...tc.input);
      results.push({ passed: deepEqual(actual, tc.expected), input: tc.input, expected: tc.expected, actual });
    } catch (e) {
      results.push({ passed: false, input: tc.input, expected: tc.expected, actual: undefined, error: e.message });
    }
  }

  parentPort.postMessage({ results });
}

main();
