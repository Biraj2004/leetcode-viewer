"use client";

/**
 * EditorPanel.tsx
 *
 * The right panel — orchestrates the code editor, language selection,
 * syntax highlighting, and test case execution.
 *
 * Syntax highlighting: on every code/language change we call a server action
 * that runs Shiki server-side and returns highlighted HTML. This keeps the
 * heavy Shiki bundle off the client entirely.
 */

import { useState, useEffect, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EditorToolbar } from "./EditorToolbar";
import { CodeEditor } from "./CodeEditor";
import { TestCasePanel } from "./testcase/TestCasePanel";
import { JUDGE0_LANG_IDS, buildStdin, buildSourceWithHarness } from "../../lib/codeHarness";
import type { ParsedProblem, LanguageKey } from "../../types/ui";
import type { ExecuteResult, EditorHandle, CaseResult } from "../../types/execution";

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

export function EditorPanel({
  problem,
  editorRef,
  isRunning,
  isSubmitting,
  result,
}: EditorPanelProps) {
  // Default to first supported language
  const defaultLang = (problem.languages[0]?.value ?? "javascript") as LanguageKey;

  const [language, setLanguage] = useState<LanguageKey>(defaultLang);
  const [code, setCode] = useState<string>(problem.codeTemplates[defaultLang] ?? "");
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);

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

    editorRef.current = {
      execute: async ({ mode = "run" } = {}): Promise<ExecuteResult> => {
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
          mode,
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
  }, [language, code, problem.testCases, activeTestCaseIndex, editorRef]);

  return (
    <div
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
      />

      <div style={{ flex: 1, overflow: "hidden" }}>
        <PanelGroup direction="vertical" autoSaveId="editor-vertical">
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
