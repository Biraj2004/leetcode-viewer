"use client";

/**
 * ProblemPageClient.tsx
 *
 * Interactive shell — owns navigation state (current problem index),
 * run/submit state, and wires TopBar ↔ EditorPanel via a ref.
 *
 * After a successful submit (LeetCode provider):
 *   - Saves the result to localStorage via submissionsStore
 *   - Navigates the ProblemPanel to the Submissions tab
 */

import { useCallback, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { TopBar }        from "../components/layout/TopBar";
import { ProblemPanel }  from "../components/problem/ProblemPanel";
import { EditorPanel }   from "../components/editor/EditorPanel";
import { saveSubmission } from "../lib/submissionsStore";
import type { ParsedProblem } from "../types/ui";
import type { EditorHandle, ExecuteResult } from "../types/execution";

interface ProblemPageClientProps {
  problems:     ParsedProblem[];
  initialIndex: number;
}

export function ProblemPageClient({ problems, initialIndex }: ProblemPageClientProps) {
  const [problemIndex,       setProblemIndex]       = useState(initialIndex);
  const [isRunning,          setIsRunning]          = useState(false);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [result,             setResult]             = useState<ExecuteResult | null>(null);
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  // Which tab the ProblemPanel should show ("description" | "editorial" | "submissions")
  const [forcedProblemTab,   setForcedProblemTab]   = useState<string | null>(null);

  const editorRef = useRef<EditorHandle | null>(null);

  // Current problem derived from index
  const problem = problems[problemIndex];

  // Navigate to prev/next — reset result on switch
  const goToPrev = useCallback(() => {
    setProblemIndex((i) => Math.max(0, i - 1));
    setResult(null);
    setForcedProblemTab(null);
  }, []);

  const goToNext = useCallback(() => {
    setProblemIndex((i) => Math.min(problems.length - 1, i + 1));
    setResult(null);
    setForcedProblemTab(null);
  }, [problems.length]);

  const goToProblem = useCallback((index: number) => {
    setProblemIndex(Math.max(0, Math.min(problems.length - 1, index)));
    setResult(null);
    setForcedProblemTab(null);
  }, [problems.length]);

  const handleRun = useCallback(async () => {
    if (!editorRef.current) return;
    setIsRunning(true);
    setResult(null);
    try {
      const res = await editorRef.current.execute({ mode: "run" });
      setResult(res);
    } catch (err) {
      setResult({
        mode:         "run",
        status:       { id: 11, description: "Runtime Error" },
        caseResults:  [],
        passedCount:  0,
        totalCases:   0,
        stdout:       null,
        stderr:       err instanceof Error ? err.message : String(err),
        compileOutput: null,
        time:         null,
        memory:       null,
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!editorRef.current) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await editorRef.current.execute({ mode: "submit" });
      setResult(res);

      // Persist to localStorage if LC provider
      if (res.provider === "leetcode") {
        const lang    = (editorRef.current as unknown as { _lang?: string })._lang ?? "unknown";
        const code    = (editorRef.current as unknown as { _code?: string })._code ?? "";
        saveSubmission(problem.questionId, lang, code, res);
        setSubmissionsRefreshKey((k) => k + 1);
        // Switch to Submissions tab automatically
        setForcedProblemTab("submissions");
      }
    } catch (err) {
      setResult({
        mode:         "submit",
        status:       { id: 11, description: "Runtime Error" },
        caseResults:  [],
        passedCount:  0,
        totalCases:   0,
        stdout:       null,
        stderr:       err instanceof Error ? err.message : String(err),
        compileOutput: null,
        time:         null,
        memory:       null,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [problem.questionId]);

  return (
    <div
      style={{
        height:          "100vh",
        width:           "100vw",
        display:         "flex",
        flexDirection:   "column",
        backgroundColor: "#11111b",
        overflow:        "hidden",
        fontFamily:      "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <TopBar
        problem={problem}
        problems={problems}
        problemIndex={problemIndex}
        totalProblems={problems.length}
        onPrev={goToPrev}
        onNext={goToNext}
        onSelectProblem={goToProblem}
        onRun={handleRun}
        onSubmit={handleSubmit}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
      />

      <div style={{ flex: 1, overflow: "hidden", padding: 6 }}>
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={42} minSize={25}>
            <div style={{ height: "100%", paddingRight: 3 }}>
              {/* key forces full remount when problem changes — resets all tab state */}
              <ProblemPanel
                key={problem.titleSlug}
                problem={problem}
                submissionsRefreshKey={submissionsRefreshKey}
                forcedTab={forcedProblemTab}
                onTabForceHandled={() => setForcedProblemTab(null)}
              />
            </div>
          </Panel>

          <PanelResizeHandle
            style={{
              width:          6,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              cursor:         "col-resize",
            }}
          >
            <div style={{ width: 3, height: 32, borderRadius: 3, backgroundColor: "#45475a" }} />
          </PanelResizeHandle>

          <Panel defaultSize={58} minSize={30}>
            <div style={{ height: "100%", paddingLeft: 3 }}>
              {/* key forces editor remount on problem change — resets code/language */}
              <EditorPanel
                key={problem.titleSlug}
                problem={problem}
                editorRef={editorRef}
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                result={result}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
