// Types for code execution via Judge0

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
}

// Ref handle exposed by EditorPanel to the parent page
export interface EditorHandle {
  execute: (options?: { mode?: "run" | "submit" }) => Promise<ExecuteResult>;
}
