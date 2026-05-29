// Types for code execution — shared between Judge0 and LeetCode providers

export interface Judge0Status {
  id: number;
  description: string;
}

// Result for a single test case run
export interface CaseResult {
  caseId: number;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  status: Judge0Status | null;
  time: string | null;
  memory: number | null;
}

// Aggregated result returned to the UI after run/submit
export interface ExecuteResult {
  mode: "run" | "submit";
  status: Judge0Status;
  caseResults: CaseResult[];
  passedCount: number;
  totalCases: number;
  // from the first failing case (or first case if all pass)
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;

  // ── LeetCode-specific ────────────────────────────────────────────────────
  provider?: "judge0" | "leetcode";
  // Submission stats (submit mode, Accepted)
  runtimePercentile?: number;
  memoryPercentile?: number;
  statusRuntime?: string;    // e.g. "3 ms"
  statusMemory?: string;     // e.g. "18.1 MB"
  totalCorrect?: number;
  totalTestcases?: number;
  // Wrong Answer details
  lastTestcase?: string;     // the failing input
  expectedOutput?: string;   // what LC expected
  codeOutput?: string;       // what our code produced
  // For LC run: the per-case outputs returned from the judge
  // code_output from LC is newline-delimited if multiple cases
  allCodeOutputs?: string[];   // one entry per test case
  allExpectedOutputs?: string[]; // one entry per test case
  allInputs?: string[];        // the raw data_input strings sent (one per case)
}

// Ref handle exposed by EditorPanel to the parent page
export interface EditorHandle {
  execute: (options?: { mode?: "run" | "submit" }) => Promise<ExecuteResult>;
}
