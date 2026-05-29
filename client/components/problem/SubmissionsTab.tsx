"use client";

/**
 * SubmissionsTab.tsx
 *
 * Lists stored submission IDs for the current problem.
 * On click: fetches full details from LC GraphQL via /api/leetcode (mode: "submission_details").
 * The distribution charts are shown in the detail view — not during the submit flow.
 * localStorage only stores the ID + minimal metadata (no code, no percentiles).
 */

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Check, X, Loader2, AlertTriangle, Zap, MemoryStick,
} from "lucide-react";
import { getSubmissionRefs } from "../../lib/submissionsStore";
import type { StoredSubmissionRef } from "../../lib/submissionsStore";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface SubmissionDetail {
  code?: string;
  runtimeDisplay?: string;
  runtimePercentile?: number;
  memoryDisplay?: string;
  memoryPercentile?: number;
  statusCode?: number;
  lang?: { name: string; verboseName: string };
  totalCorrect?: number;
  totalTestcases?: number;
  lastTestcase?: string;
  codeOutput?: string;
  expectedOutput?: string;
  compileError?: string;
  runtimeError?: string;
  stdOutput?: string;
  runtime_distribution?: Array<[number, number]>;
  memory_distribution?: Array<[number, number]>;
  timestamp?: number;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */

const monoStyle: React.CSSProperties = { fontFamily: "'Fira Code', 'Cascadia Code', monospace" };

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function StatusDot({ statusId }: { statusId: number }) {
  const accepted = statusId === 10;
  return (
    <span
      style={{
        display: "inline-block",
        width: 7, height: 7,
        borderRadius: "50%",
        backgroundColor: accepted ? "#a6e3a1" : "#f38ba8",
        flexShrink: 0,
      }}
    />
  );
}

/* ─── Distribution bar chart (shown in detail) ────────────────────────────────── */

function DistributionChart({
  data, myValue, label, unit, color,
}: {
  data: Array<[number, number]>;
  myValue?: number;
  label: string;
  unit: string;
  color: string;
}) {
  if (!data || data.length === 0) return null;
  const maxPct = Math.max(...data.map(([, p]) => p));
  const chartH = 72;
  const myIdx = myValue != null
    ? data.reduce((best, _, i) =>
        Math.abs(data[i][0] - myValue) < Math.abs(data[best][0] - myValue) ? i : best, 0)
    : -1;

  const showEveryN = Math.max(1, Math.floor(data.length / 7));

  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ fontSize: 10, color: "#6c7086", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: chartH }}>
        {data.map(([val, pct], i) => {
          const h = maxPct > 0 ? (pct / maxPct) * chartH : 0;
          const isMe = i === myIdx;
          return (
            <div
              key={val}
              title={`${val}${unit}: ${pct.toFixed(2)}%`}
              style={{ flex: "0 0 4px", height: h, backgroundColor: isMe ? "#f9e2af" : color, borderRadius: "2px 2px 0 0", opacity: isMe ? 1 : 0.7 }}
            />
          );
        })}
      </div>
      {/* X-axis labels */}
      <div style={{ display: "flex", gap: 1, marginTop: 2 }}>
        {data.map(([val], i) => (
          i % showEveryN === 0 ? (
            <div key={val} style={{ flex: "0 0 4px", fontSize: 8.5, color: "#45475a", whiteSpace: "nowrap", overflow: "visible" }}>
              {val}{unit}
            </div>
          ) : <div key={val} style={{ flex: "0 0 4px" }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Code block ────────────────────────────────────────────────────────────── */

function CodeBox({ label, value, color = "#cdd6f4" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      {label && <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 4px" }}>{label}</p>}
      <pre style={{
        margin: 0, padding: "8px 12px", borderRadius: 6,
        backgroundColor: "#11111b", border: "1px solid #313244",
        color, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap",
        wordBreak: "break-all", maxHeight: 200, overflowY: "auto",
        ...monoStyle,
      }}>
        {value}
      </pre>
    </div>
  );
}

/* ─── Detail view ────────────────────────────────────────────────────────────── */

function SubmissionDetail({
  ref: subRef,
  detail,
  loading,
  error,
  onBack,
}: {
  ref: StoredSubmissionRef;
  detail: SubmissionDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const accepted = subRef.statusId === 10;
  const statusColor = accepted ? "#a6e3a1" : "#f38ba8";

  // Parse runtime ms from runtimeDisplay like "2 ms"
  const myRuntimeMs = detail?.runtimeDisplay
    ? parseInt(detail.runtimeDisplay.replace(/[^0-9]/g, ""), 10)
    : undefined;
  const myMemoryKB = detail?.memoryDisplay
    ? Math.round(parseFloat(detail.memoryDisplay.replace(/[^0-9.]/g, "")) * 1024)
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid #313244", flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#6c7086", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "2px 4px", borderRadius: 4 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#cdd6f4")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6c7086")}
        >
          <ChevronLeft size={14} />
          All Submissions
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {accepted ? <Check size={18} style={{ color: statusColor }} /> : <X size={18} style={{ color: statusColor }} />}
          <span style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>{subRef.status}</span>
          {detail?.totalTestcases && (
            <span style={{ fontSize: 12, color: "#6c7086" }}>({detail.totalCorrect}/{detail.totalTestcases} tests)</span>
          )}
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6c7086", fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
            Loading details…
          </div>
        )}

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f38ba8", fontSize: 13 }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {detail && !loading && (
          <>
            {/* Stats + charts for accepted */}
            {accepted && (
              <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #313244", backgroundColor: "#181825", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {detail.runtimeDisplay && (
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Zap size={13} style={{ color: "#89b4fa" }} />
                      <div>
                        <p style={{ fontSize: 10, color: "#6c7086", margin: "0 0 1px" }}>Runtime</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#cdd6f4", margin: 0 }}>
                          {detail.runtimeDisplay}
                          {detail.runtimePercentile != null && (
                            <span style={{ fontSize: 11, fontWeight: 400, color: "#89b4fa", marginLeft: 7 }}>
                              Beats {detail.runtimePercentile.toFixed(2)}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {detail.memoryDisplay && (
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <MemoryStick size={13} style={{ color: "#a6e3a1" }} />
                      <div>
                        <p style={{ fontSize: 10, color: "#6c7086", margin: "0 0 1px" }}>Memory</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#cdd6f4", margin: 0 }}>
                          {detail.memoryDisplay}
                          {detail.memoryPercentile != null && (
                            <span style={{ fontSize: 11, fontWeight: 400, color: "#a6e3a1", marginLeft: 7 }}>
                              Beats {detail.memoryPercentile.toFixed(2)}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {detail.runtime_distribution && detail.runtime_distribution.length > 0 && (
                  <DistributionChart data={detail.runtime_distribution} myValue={myRuntimeMs} label="Runtime Distribution" unit="ms" color="#89b4fa" />
                )}
                {detail.memory_distribution && detail.memory_distribution.length > 0 && (
                  <DistributionChart data={detail.memory_distribution} myValue={myMemoryKB} label="Memory Distribution" unit="KB" color="#a6e3a1" />
                )}
              </div>
            )}

            {/* Error details */}
            {detail.compileError && <CodeBox label="Compile Error" value={detail.compileError} color="#f9e2af" />}
            {detail.runtimeError && <CodeBox label="Runtime Error" value={detail.runtimeError} color="#f38ba8" />}
            {!accepted && detail.lastTestcase && <CodeBox label="Failed Input" value={detail.lastTestcase} />}
            {!accepted && detail.expectedOutput && <CodeBox label="Expected Output" value={detail.expectedOutput} color="#a6e3a1" />}
            {!accepted && detail.codeOutput && <CodeBox label="Your Output" value={detail.codeOutput} color="#f38ba8" />}
            {detail.stdOutput && detail.stdOutput.trim() && <CodeBox label="Stdout" value={detail.stdOutput} color="#89b4fa" />}

            {/* Metadata row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#45475a" }}>
              <span style={{ padding: "1px 6px", borderRadius: 4, backgroundColor: "#313244", color: "#89b4fa" }}>
                {detail.lang?.verboseName ?? subRef.lang}
              </span>
              <span>{formatDate(subRef.timestamp)} {formatTime(subRef.timestamp)}</span>
            </div>

            {/* Code */}
            {detail.code && (
              <div>
                <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 6px" }}>Code</p>
                <pre style={{
                  margin: 0, padding: "12px 14px", borderRadius: 8,
                  backgroundColor: "#11111b", border: "1px solid #313244",
                  color: "#cdd6f4", fontSize: 12, lineHeight: 1.65,
                  overflowX: "auto", overflowY: "auto",
                  maxHeight: 280,
                  whiteSpace: "pre", ...monoStyle,
                }}>
                  {detail.code}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── List item ──────────────────────────────────────────────────────────────── */

function SubmissionListItem({
  sub,
  isSelected,
  onClick,
}: {
  sub: StoredSubmissionRef;
  isSelected: boolean;
  onClick: () => void;
}) {
  const accepted = sub.statusId === 10;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        border: "none",
        backgroundColor: isSelected ? "rgba(137,180,250,0.07)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderBottom: "1px solid #1e1e2e",
        transition: "background-color 0.1s",
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <StatusDot statusId={sub.statusId} />
      <span style={{ fontSize: 13, fontWeight: 500, color: accepted ? "#a6e3a1" : "#f38ba8", flex: 1 }}>
        {sub.status}
      </span>
      <span style={{ fontSize: 11, color: "#45475a", padding: "1px 6px", borderRadius: 4, backgroundColor: "#1e1e2e" }}>
        {sub.lang}
      </span>
      <span style={{ fontSize: 11, color: "#45475a", whiteSpace: "nowrap" }}>
        {formatDate(sub.timestamp)}
      </span>
    </button>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────────── */

interface SubmissionsTabProps {
  questionId: string;
  titleSlug: string;
  refreshKey: number;
}

export function SubmissionsTab({ questionId, titleSlug, refreshKey }: SubmissionsTabProps) {
  const [submissions, setSubmissions] = useState<StoredSubmissionRef[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load submission refs from localStorage
  useEffect(() => {
    setSubmissions(getSubmissionRefs(questionId));
    setSelectedId(null);
    setDetail(null);
    setError(null);
  }, [questionId, refreshKey]);

  const fetchDetail = useCallback(async (submissionId: number) => {
    setSelectedId(submissionId);
    setDetail(null);
    setError(null);
    setLoading(true);

    try {
      const session = localStorage.getItem("lv_lc_session") ?? "";
      const csrf = localStorage.getItem("lv_lc_csrf") ?? "";

      const res = await fetch("/api/leetcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "submission_details",
          submissionId,
          titleSlug,
          questionId,
          lang: "",
          typedCode: "",
          leetcodeSession: session,
          csrfToken: csrf,
        }),
      });

      const data = await res.json() as SubmissionDetail & { error?: string; message?: string };

      if (!res.ok) {
        setError(data.message ?? `Error: HTTP ${res.status}`);
        return;
      }

      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [titleSlug, questionId]);

  // Show detail when a submission is selected
  const selectedSub = submissions.find((s) => s.submissionId === selectedId) ?? null;

  if (selectedSub) {
    return (
      <SubmissionDetail
        ref={selectedSub}
        detail={detail}
        loading={loading}
        error={error}
        onBack={() => { setSelectedId(null); setDetail(null); setError(null); }}
      />
    );
  }

  // List view
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #313244", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#cdd6f4" }}>
          Submissions
        </span>
        {submissions.length > 0 && (
          <span style={{ fontSize: 11, color: "#6c7086", marginLeft: 8 }}>
            ({submissions.length})
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {submissions.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#45475a", fontSize: 13 }}>
            No submissions yet for this problem.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: "block" }}>
              Submit using the LC Judge provider to see history here.
            </span>
          </div>
        ) : (
          submissions.map((sub) => (
            <SubmissionListItem
              key={sub.submissionId}
              sub={sub}
              isSelected={sub.submissionId === selectedId}
              onClick={() => fetchDetail(sub.submissionId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
