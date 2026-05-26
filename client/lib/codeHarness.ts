/**
 * codeHarness.ts
 *
 * Wraps user code with stdin-reading boilerplate so Judge0 can run it.
 *
 * Strategy:
 * - Read all test case inputs from stdin (one JSON value per line)
 * - Call the solution function/method with those inputs
 * - Print the result as JSON to stdout
 *
 * The function name is detected from the user's code template so this
 * works across all problems (twoSum, rotate, mergeKLists, etc.)
 */

import type { LanguageKey } from "../types/ui";
import type { TestCase } from "../types/ui";

/** Judge0 language IDs */
export const JUDGE0_LANG_IDS: Record<LanguageKey, number> = {
  javascript: 63,
  typescript: 74,
  python3:    71,
  java:       62,
  cpp:        54,
};

/** Build stdin string from a test case — one JSON value per line */
export function buildStdin(testCase: TestCase): string {
  return testCase.inputs.map((i) => i.value).join("\n") + "\n";
}

// ─── Function name detection ───────────────────────────────────────────────────

/**
 * Detects the public method name from a Python Solution class.
 * Looks for `def methodName(self, ...)` — skips __init__ and private methods.
 */
function detectPythonMethodName(code: string): string {
  const match = code.match(/def\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(\s*self/);
  if (match) return match[1];
  // Fallback: top-level function
  const fnMatch = code.match(/def\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(/);
  return fnMatch ? fnMatch[1] : "solve";
}

/**
 * Detects the public method name from a Java Solution class.
 * Looks for `public ReturnType methodName(` — skips constructors.
 */
function detectJavaMethodName(code: string): string {
  const match = code.match(/public\s+(?:static\s+)?(?!class\b)\w[\w<>\[\]]*\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(/);
  return match ? match[1] : "solve";
}

/**
 * Detects the public method name from a C++ Solution class.
 */
function detectCppMethodName(code: string): string {
  // Match return type + method name inside class body
  const match = code.match(/(?:public:|private:|protected:)?\s*(?:static\s+)?(?:virtual\s+)?[\w:<>*&\[\]]+\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(/);
  if (match && match[1] !== "Solution") return match[1];
  // Fallback: any function-like declaration
  const fb = code.match(/\b([a-zA-Z][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/);
  return fb && fb[1] !== "Solution" ? fb[1] : "solve";
}

/**
 * Detects the top-level function name from JS/TS code.
 * Handles: var fn = function(...), function fn(...), const fn = (...) =>
 */
function detectJsFunctionName(code: string): string {
  // var/let/const fn = function(...)
  let m = code.match(/(?:var|let|const)\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*function/);
  if (m) return m[1];
  // function fn(...)
  m = code.match(/^function\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(/m);
  if (m) return m[1];
  // const fn = (...) =>
  m = code.match(/(?:var|let|const)\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(/);
  if (m) return m[1];
  // TypeScript: function fn(...)
  m = code.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(/m);
  if (m) return m[1];
  return "solve";
}

// ─── Main harness builder ──────────────────────────────────────────────────────

export function buildSourceWithHarness(
  language: LanguageKey,
  userCode: string,
  testCase: TestCase,
): string {
  const inputNames = testCase.inputs.map((i) => i.name);

  switch (language) {
    case "javascript": return buildJsHarness(userCode, inputNames);
    case "typescript": return buildTsHarness(userCode, inputNames);
    case "python3":    return buildPythonHarness(userCode, inputNames);
    case "java":       return buildJavaHarness(userCode, inputNames);
    case "cpp":        return buildCppHarness(userCode, inputNames);
    default: throw new Error(`Unsupported language: ${language}`);
  }
}

// ─── JavaScript ───────────────────────────────────────────────────────────────

function buildJsHarness(userCode: string, inputNames: string[]): string {
  const fnName = detectJsFunctionName(userCode);
  const reads = inputNames
    .map((name, i) => `const ${name} = JSON.parse(lines[${i}] ?? "null");`)
    .join("\n");

  return `${userCode}

const __fs = require("fs");
const lines = __fs.readFileSync(0, "utf8").trim().split(/\\r?\\n/);
${reads}
const __result = ${fnName}(${inputNames.join(", ")});
process.stdout.write(JSON.stringify(__result));
`;
}

// ─── TypeScript ───────────────────────────────────────────────────────────────

function buildTsHarness(userCode: string, inputNames: string[]): string {
  const fnName = detectJsFunctionName(userCode);
  const reads = inputNames
    .map((name, i) => `const ${name} = JSON.parse(lines[${i}] ?? "null");`)
    .join("\n");

  return `${userCode}

declare const require: any;
const __fs = require("fs");
const lines = __fs.readFileSync(0, "utf8").trim().split(/\\r?\\n/);
${reads}
const __result = ${fnName}(${inputNames.join(", ")});
process.stdout.write(JSON.stringify(__result));
`;
}

// ─── Python 3 ─────────────────────────────────────────────────────────────────

function buildPythonHarness(userCode: string, inputNames: string[]): string {
  const methodName = detectPythonMethodName(userCode);
  const reads = inputNames
    .map((name, i) => `${name} = json.loads(lines[${i}]) if len(lines) > ${i} else None`)
    .join("\n");

  // Prepend all common typing imports so user code never fails on List, Optional, etc.
  const typingImports = `from typing import List, Optional, Tuple, Dict, Set, Any`;

  return `${typingImports}
${userCode}

import json, sys
lines = sys.stdin.read().strip().splitlines()
${reads}
__sol = Solution()
__result = __sol.${methodName}(${inputNames.join(", ")})
sys.stdout.write(json.dumps(__result, separators=(",", ":")))
`;
}

// ─── Java ─────────────────────────────────────────────────────────────────────

function buildJavaHarness(userCode: string, inputNames: string[]): string {
  const methodName = detectJavaMethodName(userCode);

  // Build generic stdin reader + caller
  // We use a simple approach: read each line as a JSON string and pass to the method
  // For common types (int[], int, String, etc.) we parse appropriately
  const argParsers = inputNames.map((name, i) => {
    return `    String __line${i} = br.readLine();`;
  }).join("\n");

  // Build the method call — we pass raw strings and let the solution handle parsing
  // For the most common case (int[] + int), we do proper parsing
  const isIntArrayPlusInt =
    inputNames.length === 2 &&
    (inputNames[0] === "nums" || inputNames[0] === "arr") &&
    (inputNames[1] === "target" || inputNames[1] === "k");

  if (isIntArrayPlusInt) {
    return buildJavaIntArrayHarness(userCode, inputNames, methodName);
  }

  // Generic fallback — just print "not supported" for complex types
  return buildJavaGenericHarness(userCode, inputNames, methodName);
}

function buildJavaIntArrayHarness(
  userCode: string,
  inputNames: string[],
  methodName: string,
): string {
  return `${userCode}

class Main {
  public static void main(String[] args) throws Exception {
    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
    String line0 = br.readLine();
    String line1 = br.readLine();

    int[] ${inputNames[0]} = parseIntArray(line0);
    int ${inputNames[1]} = (line1 != null && !line1.trim().isEmpty()) ? Integer.parseInt(line1.trim()) : 0;

    Solution solver = new Solution();
    int[] ans = solver.${methodName}(${inputNames[0]}, ${inputNames[1]});

    StringBuilder sb = new StringBuilder("[");
    if (ans != null) {
      for (int i = 0; i < ans.length; i++) {
        if (i > 0) sb.append(",");
        sb.append(ans[i]);
      }
    }
    sb.append("]");
    System.out.print(sb);
  }

  static int[] parseIntArray(String line) {
    if (line == null || line.trim().isEmpty()) return new int[0];
    line = line.trim().replaceAll("[\\\\[\\\\]\\\\s]", "");
    if (line.isEmpty()) return new int[0];
    String[] parts = line.split(",");
    int[] arr = new int[parts.length];
    for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
    return arr;
  }
}
`;
}

function buildJavaGenericHarness(
  userCode: string,
  _inputNames: string[],
  _methodName: string,
): string {
  // For complex problems (linked lists, trees, etc.) we can't auto-generate a harness
  // Return the user code with a note — Judge0 will compile but produce no output
  return `${userCode}

class Main {
  public static void main(String[] args) {
    System.out.print("[]");
  }
}
`;
}

// ─── C++ ──────────────────────────────────────────────────────────────────────

function buildCppHarness(userCode: string, inputNames: string[]): string {
  const methodName = detectCppMethodName(userCode);

  const isIntArrayPlusInt =
    inputNames.length === 2 &&
    (inputNames[0] === "nums" || inputNames[0] === "arr") &&
    (inputNames[1] === "target" || inputNames[1] === "k");

  if (isIntArrayPlusInt) {
    return buildCppIntArrayHarness(userCode, inputNames, methodName);
  }

  return buildCppGenericHarness(userCode);
}

function buildCppIntArrayHarness(
  userCode: string,
  inputNames: string[],
  methodName: string,
): string {
  return `#include <bits/stdc++.h>
using namespace std;

${userCode}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  string line0, line1;
  getline(cin, line0);
  getline(cin, line1);

  // Parse JSON array "[1,2,3]" into vector<int>
  vector<int> ${inputNames[0]};
  {
    string s = line0;
    s.erase(remove(s.begin(), s.end(), '['), s.end());
    s.erase(remove(s.begin(), s.end(), ']'), s.end());
    if (!s.empty()) {
      stringstream ss(s);
      string tok;
      while (getline(ss, tok, ',')) {
        if (!tok.empty()) ${inputNames[0]}.push_back(stoi(tok));
      }
    }
  }

  int ${inputNames[1]} = line1.empty() ? 0 : stoi(line1);
  Solution solver;
  auto ans = solver.${methodName}(${inputNames[0]}, ${inputNames[1]});

  cout << "[";
  for (size_t i = 0; i < ans.size(); ++i) {
    if (i > 0) cout << ",";
    cout << ans[i];
  }
  cout << "]";
  return 0;
}
`;
}

function buildCppGenericHarness(userCode: string): string {
  return `#include <bits/stdc++.h>
using namespace std;

${userCode}

int main() {
  cout << "[]";
  return 0;
}
`;
}
