/**
 * submissionsStore.ts
 *
 * Lightweight localStorage store — only stores submission IDs and minimal
 * metadata per questionId. Full submission details (code, distribution,
 * percentiles) are fetched live from the LeetCode GraphQL API when needed.
 *
 * Key:   "lv_sub_ids_<questionId>"
 * Value: JSON array of StoredSubmissionRef[]  (max 50 per question)
 */

export interface StoredSubmissionRef {
  submissionId: number;    // LC submission_id (used to call GraphQL)
  questionId: string;
  timestamp: number;       // Date.now()
  status: string;          // e.g. "Accepted"
  statusId: number;
  lang: string;
}

const KEY = (qid: string) => `lv_sub_ids_${qid}`;

export function saveSubmissionRef(ref: StoredSubmissionRef): void {
  try {
    const existing = getSubmissionRefs(ref.questionId);
    // Deduplicate by submissionId
    const updated = [ref, ...existing.filter((r) => r.submissionId !== ref.submissionId)].slice(0, 50);
    localStorage.setItem(KEY(ref.questionId), JSON.stringify(updated));
  } catch {
    // localStorage might be full — ignore
  }
}

export function getSubmissionRefs(questionId: string): StoredSubmissionRef[] {
  try {
    const raw = localStorage.getItem(KEY(questionId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredSubmissionRef[];
  } catch {
    return [];
  }
}

export function clearSubmissionRefs(questionId: string): void {
  localStorage.removeItem(KEY(questionId));
}
