"use client";

/**
 * EditorPanel.tsx
 *
 * The right panel — orchestrates the code editor, language selection,
 * syntax highlighting, and test case execution.
 *
 * Supports two execution providers:
 *   - "judge0"   → wraps code in a harness, sends to /api/judge0
 *   - "leetcode" → sends raw code to /api/leetcode (LeetCode's own judge)
 *
 * The active provider is read from localStorage ("lv_provider").
 * LeetCode session credentials are also read from localStorage and passed
 * server-side — they are never stored server-side.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EditorToolbar } from "./EditorToolbar";
import { CodeEditor } from "./CodeEditor";
import { TestCasePanel } from "./testcase/TestCasePanel";
import { JUDGE0_LANG_IDS, buildStdin, buildSourceWithHarness } from "../../lib/codeHarness";
import { toast } from "../ui/Toast";
import type { ParsedProblem, LanguageKey } from "../../types/ui";
import type { ExecuteResult, EditorHandle, CaseResult } from "../../types/execution";

// LeetCode language keys (same as our LanguageKey for the 5 we support)
const LC_LANG_MAP: Record<LanguageKey, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python3:    "python3",
  java:       "java",
  cpp:        "cpp",
};

interface EditorPanelProps {
  problem: ParsedProblem;
  editorRef: React.RefObject<EditorHandle | null>;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  result: ExecuteResult | null;
}

function normalizeOutput(text: string | null | undefined): string {
  return String(text ?? "").replace(/\r\n/g, "\n").trim();
}

/**
 * Normalize a value for comparison by parsing it as JSON if possible,
 * then re-serializing with no spaces. This handles:
 * - "[0,1]" vs "[0, 1]"
 * - "[[1,2],[3,4]]" vs "[[1, 2], [3, 4]]"
 * - "true" vs "True" (Python)
 * Falls back to trimmed string comparison if JSON.parse fails.
 */
function normalizeForComparison(raw: string): string {
  const trimmed = raw.trim();
  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Read provider preference from localStorage (defaults to "judge0") */
function getProvider(): "judge0" | "leetcode" {
  if (typeof window === "undefined") return "judge0";
  return (localStorage.getItem("lv_provider") as "judge0" | "leetcode") ?? "judge0";
}

/** Read LeetCode credentials from localStorage */
function getLCCredentials(): { leetcodeSession: string; csrfToken: string } {
  if (typeof window === "undefined") return { leetcodeSession: "", csrfToken: "" };
  return {
    leetcodeSession: localStorage.getItem("lv_lc_session") ?? "",
    csrfToken:       localStorage.getItem("lv_lc_csrf")    ?? "",
  };
}

export function EditorPanel({
  problem,
  editorRef,
  isRunning,
  isSubmitting,
  result,
}: EditorPanelProps) {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Default to first supported language
  const defaultLang = (problem.languages[0]?.value ?? "javascript") as LanguageKey;

  const [language, setLanguage] = useState<LanguageKey>(defaultLang);
  const [code, setCode] = useState<string>(problem.codeTemplates[defaultLang] ?? "");
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);

  // Custom test cases added by the user (LeetCode data_input format)
  const [customTestCases, setCustomTestCases] = useState<string[]>([]);

  // Switch language — reset code to the template for that language
  const handleLanguageChange = useCallback(
    (lang: LanguageKey) => {
      setLanguage(lang);
      setCode(problem.codeTemplates[lang] ?? "");
    },
    [problem.codeTemplates],
  );

  // Reset code to the default template
  const handleReset = useCallback(() => {
    setCode(problem.codeTemplates[language] ?? "");
  }, [problem.codeTemplates, language]);

  // Expose execute() to the parent page via ref
  useEffect(() => {
    if (!editorRef) return;

    // Also expose _lang and _code so the parent can read them when saving submissions
    (editorRef as unknown as { current: { _lang?: string; _code?: string; execute: unknown } }).current = {
      _lang: language,
      _code: code,
      execute: async ({ mode = "run" } = {}): Promise<ExecuteResult> => {
        const provider = getProvider();

        // ── LeetCode provider ─────────────────────────────────────────────
        if (provider === "leetcode") {
          const { leetcodeSession, csrfToken } = getLCCredentials();
          const lcLang = LC_LANG_MAP[language];
          if (!lcLang) throw new Error(`Unsupported language for LeetCode: ${language}`);

          // For run: use the active test case data_input
          // Prefer exampleTestcaseList from the problem JSON (raw LC format),
          // with custom test cases appended.
          const allInputs = [...(problem.exampleTestcaseList ?? []), ...customTestCases];

          let dataInput: string | undefined;
          if (mode === "run") {
            // Send ALL test cases at once (joined by \n).
            // LC interprets_solution supports multiple cases in one call.
            dataInput = allInputs.join("\n");
          }
          // Submit: dataInput is undefined — LC uses its own full test suite

          const response = await fetch("/api/leetcode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode,
              titleSlug:      problem.titleSlug,
              questionId:     problem.questionId,
              lang:           lcLang,
              typedCode:      code,
              dataInput,
              leetcodeSession,
              csrfToken,
            }),
          });

          const payload = await response.json() as Record<string, unknown>;

          // Handle known error codes with toasts
          if (!response.ok) {
            const errCode = payload.error as string | undefined;
            const message = (payload.message as string | undefined) ?? "LeetCode request failed.";

            if (errCode === "SESSION_EXPIRED") {
              toast.error(message);
              throw new Error(message);
            }
            if (errCode === "RATE_LIMITED") {
              toast.warning(message);
              throw new Error(message);
            }
            if (errCode === "MISSING_SESSION") {
              toast.error(message);
              throw new Error(message);
            }
            if (errCode === "TIMEOUT") {
              toast.warning(message);
              throw new Error(message);
            }
            toast.error(message);
            throw new Error(message);
          }

          // ── Map LC response → ExecuteResult ───────────────────────────
          const statusId   = (payload.status as { id?: number } | undefined)?.id ?? 11;
          const statusDesc = (payload.status as { description?: string } | undefined)?.description ?? "Unknown";

          if (mode === "run") {
            const compareStr  = (payload.compare_result as string | undefined) ?? "";
            const compileErr  = (payload.full_compile_error as string | undefined)
              ?? (payload.compile_error as string | undefined) ?? null;
            const runtimeErr  = (payload.runtime_error as string | undefined) ?? null;
            const stdOutput   = (payload.std_output as string | undefined) ?? null;
            const lastTestcase = (payload.last_testcase as string | undefined) ?? null;

            // LC returns code_output and expected_output as either:
            // - a newline-delimited string (single case)
            // - an array of strings (multiple cases)
            const rawCodeOut = payload.code_output;
            const rawExpOut  = payload.expected_output;

            const allCodeOutputs: string[] = Array.isArray(rawCodeOut)
              ? (rawCodeOut as string[])
              : (typeof rawCodeOut === "string" && rawCodeOut ? rawCodeOut.split("\n") : []);
            const allExpectedOutputs: string[] = Array.isArray(rawExpOut)
              ? (rawExpOut as string[])
              : (typeof rawExpOut === "string" && rawExpOut ? rawExpOut.split("\n") : []);

            // Build per-case results using compare_result bits
            const runCaseResults: CaseResult[] = allInputs.map((_, i) => {
              const passed = compareStr[i] === "1";
              return {
                caseId:         i + 1,
                passed,
                expectedOutput: allExpectedOutputs[i] ?? "",
                actualOutput:   allCodeOutputs[i] ?? "",
                stdout:         stdOutput,
                stderr:         runtimeErr,
                compileOutput:  compileErr,
                status:         null,
                time:           null,
                memory:         null,
              };
            });

            const passed = runCaseResults.filter((c) => c.passed).length;
            return {
              provider: "leetcode",
              mode: "run",
              status: { id: statusId, description: statusDesc },
              caseResults: runCaseResults,
              passedCount: passed,
              totalCases:  runCaseResults.length,
              stdout:      stdOutput,
              stderr:      runtimeErr,
              compileOutput: compileErr,
              time: null,
              memory: null,
              lastTestcase:   lastTestcase ?? undefined,
              expectedOutput: allExpectedOutputs[0] ?? undefined,
              codeOutput:     allCodeOutputs[0] ?? undefined,
              allCodeOutputs,
              allExpectedOutputs,
              allInputs,
              totalCorrect:   (payload.total_correct as number | undefined),
              totalTestcases: (payload.total_testcases as number | undefined),
            };
          }

          // Submit mode
          return {
            provider: "leetcode",
            mode: "submit",
            status: { id: statusId, description: statusDesc },
            caseResults: [],
            passedCount:  (payload.total_correct as number | undefined) ?? 0,
            totalCases:   (payload.total_testcases as number | undefined) ?? 0,
            stdout:  (payload.std_output as string | undefined) ?? null,
            stderr:  (payload.runtime_error as string | undefined) ?? null,
            compileOutput: (payload.full_compile_error as string | undefined)
              ?? (payload.compile_error as string | undefined) ?? null,
            time:   null,
            memory: null,
            runtimePercentile: (payload.runtime_percentile as number | undefined),
            memoryPercentile:  (payload.memory_percentile as number | undefined),
            statusRuntime:     (payload.status_runtime as string | undefined),
            statusMemory:      (payload.status_memory as string | undefined),
            totalCorrect:      (payload.total_correct as number | undefined),
            totalTestcases:    (payload.total_testcases as number | undefined),
            lastTestcase:      (payload.last_testcase as string | undefined),
            expectedOutput:    (payload.expected_output as string | undefined),
            codeOutput:        (payload.code_output as string | undefined),
          };
        }

        // ── Judge0 provider (original logic) ─────────────────────────────
        const langId = JUDGE0_LANG_IDS[language];
        if (!langId) throw new Error(`Unsupported language: ${language}`);

        // Run mode: only the active test case. Submit: all cases.
        const casesToRun =
          mode === "submit"
            ? problem.testCases
            : [problem.testCases[activeTestCaseIndex]].filter(Boolean);

        if (casesToRun.length === 0) throw new Error("No test cases available.");

        const caseResults: CaseResult[] = [];

        for (const testCase of casesToRun) {
          const sourceCode = buildSourceWithHarness(language, code, testCase);
          const stdin = buildStdin(testCase);
          // Normalize expected output for consistent comparison
          const expectedOutput = normalizeForComparison(normalizeOutput(testCase.expected));

          const response = await fetch("/api/judge0", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceCode,
              languageId: langId,
              stdin,
              expectedOutput,
              cpuTimeLimit: 5,
              memoryLimit: 128000,
            }),
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload?.details ?? payload?.error ?? "Judge0 request failed.");
          }

          const actualOutput = normalizeOutput(payload.stdout);
          const normalizedActual   = normalizeForComparison(actualOutput);
          const normalizedExpected = normalizeForComparison(expectedOutput);

          // A case passes when:
          // 1. No compile/runtime error
          // 2. Actual output matches expected (JSON-normalized comparison)
          const hasError = Boolean(payload.stderr || payload.compile_output);
          const outputMatches = normalizedActual === normalizedExpected;
          const passed = !hasError && outputMatches && actualOutput !== "";

          caseResults.push({
            caseId: testCase.id,
            passed,
            expectedOutput,
            actualOutput,
            stdout: payload.stdout ?? null,
            stderr: payload.stderr ?? null,
            compileOutput: payload.compile_output ?? null,
            status: payload.status ?? null,
            time: payload.time ?? null,
            memory: payload.memory ?? null,
          });
        }

        const passedCount = caseResults.filter((c) => c.passed).length;
        const allPassed = passedCount === caseResults.length;
        const primary = caseResults.find((c) => !c.passed) ?? caseResults[0];

        return {
          provider: "judge0",
          mode: mode as "run" | "submit",
          status: allPassed
            ? { id: 3, description: "Accepted" }
            : { id: 4, description: "Wrong Answer" },
          caseResults,
          passedCount,
          totalCases: caseResults.length,
          stdout: primary.stdout,
          stderr: primary.stderr,
          compileOutput: primary.compileOutput,
          time: primary.time,
          memory: primary.memory,
        };
      },
    };
  }, [language, code, problem, activeTestCaseIndex, customTestCases, editorRef]);

  return (
    <div
      ref={editorContainerRef}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e2e",
        borderRadius: 10,
        border: "1px solid #313244",
        overflow: "hidden",
      }}
    >
      <EditorToolbar
        languages={problem.languages}
        selectedLanguage={language}
        code={code}
        onLanguageChange={handleLanguageChange}
        onReset={handleReset}
        editorContainerRef={editorContainerRef}
      />

      <div style={{ flex: 1, overflow: "hidden" }}>
        <PanelGroup direction="vertical">
          {/* Code editor */}
          <Panel defaultSize={62} minSize={25}>
            <CodeEditor
              code={code}
              language={language}
              onChange={setCode}
            />
          </Panel>

          {/* Drag handle */}
          <PanelResizeHandle
            style={{
              height: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#181825",
              borderTop: "1px solid #313244",
              borderBottom: "1px solid #313244",
              cursor: "row-resize",
            }}
          >
            <div
              style={{
                height: 2,
                width: 40,
                borderRadius: 2,
                backgroundColor: "#45475a",
              }}
            />
          </PanelResizeHandle>

          {/* Test case / result panel */}
          <Panel defaultSize={38} minSize={15}>
            <TestCasePanel
              testCases={problem.testCases}
              exampleTestcaseList={problem.exampleTestcaseList}
              customTestCases={customTestCases}
              onCustomTestCasesChange={setCustomTestCases}
              activeTestCaseIndex={activeTestCaseIndex}
              onSelectTestCase={setActiveTestCaseIndex}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              result={result}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
