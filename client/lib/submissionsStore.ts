/**
 * submissionsStore.ts
 *
 * Persists submission records per questionId in localStorage.
 * Key: "lv_submissions_<questionId>"
 * Value: JSON array of SubmissionRecord[]
 */

import type { ExecuteResult } from "../types/execution";

export interface SubmissionRecord {
  id: string;               // uuid-ish timestamp
  questionId: string;
  lang: string;
  timestamp: number;        // Date.now()
  status: string;           // e.g. "Accepted"
  statusId: number;
  runtime: string | null;   // e.g. "3 ms"
  memory: string | null;    // e.g. "18.1 MB"
  runtimePercentile: number | null;
  memoryPercentile: number | null;
  totalCorrect: number | null;
  totalTestcases: number | null;
  lastTestcase: string | null;
  expectedOutput: string | null;
  codeOutput: string | null;
  compileOutput: string | null;
  stderr: string | null;
  code: string;
}

const KEY = (qid: string) => `lv_submissions_${qid}`;

export function saveSubmission(
  questionId: string,
  lang: string,
  code: string,
  result: ExecuteResult,
): SubmissionRecord {
  const rec: SubmissionRecord = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    questionId,
    lang,
    timestamp: Date.now(),
    status: result.status.description,
    statusId: result.status.id,
    runtime: result.statusRuntime ?? null,
    memory: result.statusMemory ?? null,
    runtimePercentile: result.runtimePercentile ?? null,
    memoryPercentile: result.memoryPercentile ?? null,
    totalCorrect: result.totalCorrect ?? null,
    totalTestcases: result.totalTestcases ?? null,
    lastTestcase: result.lastTestcase ?? null,
    expectedOutput: result.expectedOutput ?? null,
    codeOutput: result.codeOutput ?? null,
    compileOutput: result.compileOutput ?? null,
    stderr: result.stderr ?? null,
    code,
  };

  try {
    const existing = getSubmissions(questionId);
    const updated = [rec, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem(KEY(questionId), JSON.stringify(updated));
  } catch {
    // localStorage might be full — ignore
  }
  return rec;
}

export function getSubmissions(questionId: string): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(KEY(questionId));
    if (!raw) return [];
    return JSON.parse(raw) as SubmissionRecord[];
  } catch {
    return [];
  }
}

export function clearSubmissions(questionId: string): void {
  localStorage.removeItem(KEY(questionId));
}
