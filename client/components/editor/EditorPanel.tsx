"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EditorToolbar } from "./EditorToolbar";
import { CodeEditor } from "./CodeEditor";
import { TestCasePanel } from "./testcase/TestCasePanel";
import { toast } from "../ui/Toast";
import type { ParsedProblem, LanguageKey } from "../../types/ui";
import type { ExecuteResult, EditorHandle, CaseResult } from "../../types/execution";
import { detectExtension, requestLeetCodeViaExtension } from "../../lib/extensionApi";

const LC_LANG_MAP: Record<LanguageKey, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python3: "python3",
  java: "java",
  cpp: "cpp",
};

interface EditorPanelProps {
  problem: ParsedProblem;
  editorRef: React.RefObject<EditorHandle | null>;
  isRunning: boolean;
  isSubmitting: boolean;
  result: ExecuteResult | null;
}

export function EditorPanel({
  problem,
  editorRef,
  isRunning,
  isSubmitting,
  result,
}: EditorPanelProps) {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  const defaultLang = (problem.languages[0]?.value ?? "javascript") as LanguageKey;
  const [language, setLanguage] = useState<LanguageKey>(defaultLang);
  const [code, setCode] = useState<string>(problem.codeTemplates[defaultLang] ?? "");
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);
  const [customTestCases, setCustomTestCases] = useState<string[]>([]);

  const handleLanguageChange = useCallback(
    (lang: LanguageKey) => {
      setLanguage(lang);
      setCode(problem.codeTemplates[lang] ?? "");
    },
    [problem.codeTemplates],
  );

  const handleReset = useCallback(() => {
    setCode(problem.codeTemplates[language] ?? "");
  }, [problem.codeTemplates, language]);

  useEffect(() => {
    if (!editorRef) return;

    (editorRef as unknown as { current: { _lang?: string; _code?: string; execute: unknown } }).current = {
      _lang: language,
      _code: code,
      execute: async ({ mode = "run" }: { mode?: "run" | "submit" } = {}): Promise<ExecuteResult> => {
        const lcLang = LC_LANG_MAP[language];
        if (!lcLang) throw new Error(`Unsupported language for LeetCode: ${language}`);

        const allInputs = [...(problem.exampleTestcaseList ?? []), ...customTestCases];
        let dataInput: string | undefined;
        if (mode === "run") {
          dataInput = allInputs.join("\n");
        }

        const extAvailable = await detectExtension(2, 200, 450);
        if (!extAvailable) {
          const message = "Extension not detected. Please install/enable the extension and login on leetcode.com.";
          toast.error(message);
          throw new Error(message);
        }

        let payload: Record<string, unknown>;
        try {
          const extPayload = await requestLeetCodeViaExtension({
            mode,
            titleSlug: problem.titleSlug,
            questionId: problem.questionId,
            lang: lcLang,
            typedCode: code,
            dataInput,
          }, 90000);
          payload = extPayload as Record<string, unknown>;
        } catch (error) {
          const errObj = error as Error & { code?: string };
          const errCode = errObj.code;
          const message = errObj.message || "Extension request failed.";
          if (errCode === "SESSION_EXPIRED" || errCode === "MISSING_SESSION") {
            toast.error(message);
            throw new Error(message);
          }
          if (errCode === "RATE_LIMITED" || errCode === "TIMEOUT") {
            toast.warning(message);
            throw new Error(message);
          }
          toast.error(message);
          throw new Error(message);
        }

        const statusId = (payload.status as { id?: number } | undefined)?.id ?? 11;
        const statusDesc = (payload.status as { description?: string } | undefined)?.description ?? "Unknown";

        if (mode === "run") {
          const compareStr = (payload.compare_result as string | undefined) ?? "";
          const compileErr = (payload.full_compile_error as string | undefined)
            ?? (payload.compile_error as string | undefined) ?? null;
          const runtimeErr = (payload.runtime_error as string | undefined) ?? null;
          const stdOutput = (payload.std_output as string | undefined) ?? null;
          const lastTestcase = (payload.last_testcase as string | undefined) ?? null;

          const rawCodeOut = payload.code_output;
          const rawExpOut = payload.expected_output;
          const rawStdOut = payload.std_output;

          const allCodeOutputs: string[] = Array.isArray(rawCodeOut)
            ? (rawCodeOut as string[])
            : (typeof rawCodeOut === "string" && rawCodeOut ? rawCodeOut.split("\n") : []);
          const allExpectedOutputs: string[] = Array.isArray(rawExpOut)
            ? (rawExpOut as string[])
            : (typeof rawExpOut === "string" && rawExpOut ? rawExpOut.split("\n") : []);
          const allStdOutputs: string[] = Array.isArray(rawStdOut)
            ? (rawStdOut as string[])
            : (typeof rawStdOut === "string" && rawStdOut ? rawStdOut.split("\n") : []);

          const runCaseResults: CaseResult[] = allInputs.map((_, i) => ({
            caseId: i + 1,
            passed: compareStr[i] === "1",
            expectedOutput: allExpectedOutputs[i] ?? "",
            actualOutput: allCodeOutputs[i] ?? "",
            stdout: allStdOutputs[i] ?? stdOutput,
            stderr: runtimeErr,
            compileOutput: compileErr,
            status: null,
            time: null,
            memory: null,
          }));

          const passed = runCaseResults.filter((item) => item.passed).length;
          return {
            provider: "leetcode",
            mode: "run",
            status: { id: statusId, description: statusDesc },
            caseResults: runCaseResults,
            passedCount: passed,
            totalCases: runCaseResults.length,
            stdout: stdOutput,
            stderr: runtimeErr,
            compileOutput: compileErr,
            time: null,
            memory: null,
            lastTestcase: lastTestcase ?? undefined,
            expectedOutput: allExpectedOutputs[0] ?? undefined,
            codeOutput: allCodeOutputs[0] ?? undefined,
            allCodeOutputs,
            allExpectedOutputs,
            allInputs,
            totalCorrect: payload.total_correct as number | undefined,
            totalTestcases: payload.total_testcases as number | undefined,
          };
        }

        return {
          provider: "leetcode",
          mode: "submit",
          status: { id: statusId, description: statusDesc },
          caseResults: [],
          passedCount: (payload.total_correct as number | undefined) ?? 0,
          totalCases: (payload.total_testcases as number | undefined) ?? 0,
          stdout: (payload.std_output as string | undefined) ?? null,
          stderr: (payload.runtime_error as string | undefined) ?? null,
          compileOutput: (payload.full_compile_error as string | undefined)
            ?? (payload.compile_error as string | undefined) ?? null,
          time: null,
          memory: null,
          runtimePercentile: payload.runtime_percentile as number | undefined,
          memoryPercentile: payload.memory_percentile as number | undefined,
          statusRuntime: payload.status_runtime as string | undefined,
          statusMemory: payload.status_memory as string | undefined,
          totalCorrect: payload.total_correct as number | undefined,
          totalTestcases: payload.total_testcases as number | undefined,
          lastTestcase: payload.last_testcase as string | undefined,
          expectedOutput: payload.expected_output as string | undefined,
          codeOutput: payload.code_output as string | undefined,
          submissionId: payload.submission_id as number | undefined,
        };
      },
    };
  }, [language, code, problem, customTestCases, editorRef]);

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
          <Panel defaultSize={62} minSize={25}>
            <CodeEditor code={code} language={language} onChange={setCode} />
          </Panel>

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
