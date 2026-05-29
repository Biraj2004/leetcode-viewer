"use client";

/**
 * SubmissionsTab.tsx
 *
 * Lists past submissions for the current problem (from localStorage).
 * Matches the LeetCode submissions panel UI:
 *   - Left list: Status | Language | Runtime | Memory
 *   - Right detail: Accepted/WA stats, percentile bars, code, failing case
 */

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Clock,
  Cpu,
  ChevronLeft,
  Check,
  X,
  AlertTriangle,
  Zap,
  MemoryStick,
  Trash2,
} from "lucide-react";
import {
  getSubmissions,
  clearSubmissions,
  type SubmissionRecord,
} from "../../lib/submissionsStore";

interface SubmissionsTabProps {
  questionId: string;
  /** Used to refresh the list when a new submission arrives */
  refreshKey?: number;
}

const monoStyle: React.CSSProperties = {
  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isAccepted(r: SubmissionRecord): boolean {
  return r.statusId === 10 || r.statusId === 3;
}

function statusColor(r: SubmissionRecord): string {
  if (isAccepted(r)) return "#a6e3a1";
  if (r.statusId === 20) return "#f9e2af";   // Compile Error
  return "#f38ba8";                           // WA / TLE / RE
}

// ─── Percentile bar ────────────────────────────────────────────────────────────

function PercentileBar({
  value,
  label,
  color,
  absolute,
}: {
  value: number;
  label: string;
  color: string;
  absolute: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "14px 18px",
        borderRadius: 8,
        border: "1px solid #313244",
        backgroundColor: "#181825",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {color === "#89b4fa" ? (
          <Zap size={14} style={{ color }} />
        ) : (
          <MemoryStick size={14} style={{ color }} />
        )}
        <span style={{ fontSize: 12, color: "#6c7086" }}>{label}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#cdd6f4" }}>{absolute}</span>
        <span style={{ fontSize: 11, color: "#6c7086", marginLeft: 6 }}>
          Beats <strong style={{ color }}>{value.toFixed(1)}%</strong>
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, backgroundColor: "#313244", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, value)}%`,
            borderRadius: 2,
            backgroundColor: color,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Submission detail panel ───────────────────────────────────────────────────

function SubmissionDetail({
  record,
  onBack,
}: {
  record: SubmissionRecord;
  onBack: () => void;
}) {
  const accepted = isAccepted(record);
  const color = statusColor(record);
  const isCompileErr = record.statusId === 20;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #313244" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "#6c7086", fontSize: 12, padding: "3px 6px",
            borderRadius: 5,
          }}
        >
          <ChevronLeft size={14} />
          All Submissions
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Status row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {accepted
            ? <Check size={22} style={{ color }} />
            : <X size={22} style={{ color }} />}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{record.status}</div>
            {record.totalTestcases && (
              <div style={{ fontSize: 12, color: "#6c7086", marginTop: 2 }}>
                {record.totalCorrect}/{record.totalTestcases} testcases passed
              </div>
            )}
          </div>
        </div>

        {/* Percentile bars — Accepted only */}
        {accepted && (record.runtimePercentile != null || record.memoryPercentile != null) && (
          <div style={{ display: "flex", gap: 12 }}>
            {record.runtimePercentile != null && record.runtime && (
              <PercentileBar
                label="Runtime"
                value={record.runtimePercentile}
                color="#89b4fa"
                absolute={record.runtime}
              />
            )}
            {record.memoryPercentile != null && record.memory && (
              <PercentileBar
                label="Memory"
                value={record.memoryPercentile}
                color="#a6e3a1"
                absolute={record.memory}
              />
            )}
          </div>
        )}

        {/* Compile error */}
        {isCompileErr && record.compileOutput && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={13} style={{ color: "#f9e2af" }} />
              <span style={{ fontSize: 12, color: "#f9e2af" }}>Compile Error</span>
            </div>
            <pre style={{
              margin: 0, padding: "10px 14px", borderRadius: 6,
              backgroundColor: "#181825", border: "1px solid rgba(249,226,175,0.3)",
              color: "#f9e2af", fontSize: 12, whiteSpace: "pre-wrap",
              wordBreak: "break-all", ...monoStyle,
            }}>
              {record.compileOutput}
            </pre>
          </div>
        )}

        {/* Runtime error */}
        {!isCompileErr && record.stderr && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
              <span style={{ fontSize: 12, color: "#f38ba8" }}>Runtime Error</span>
            </div>
            <pre style={{
              margin: 0, padding: "10px 14px", borderRadius: 6,
              backgroundColor: "#181825", border: "1px solid rgba(243,139,168,0.3)",
              color: "#f38ba8", fontSize: 12, whiteSpace: "pre-wrap",
              wordBreak: "break-all", ...monoStyle,
            }}>
              {record.stderr}
            </pre>
          </div>
        )}

        {/* Wrong answer details */}
        {!accepted && !isCompileErr && !record.stderr && record.lastTestcase && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Input", value: record.lastTestcase, color: "#cdd6f4" },
              { label: "Expected Output", value: record.expectedOutput, color: "#a6e3a1" },
              { label: "Your Output", value: record.codeOutput, color: "#f38ba8" },
            ].map(({ label, value, color: c }) => value ? (
              <div key={label}>
                <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 5px" }}>{label}</p>
                <pre style={{
                  margin: 0, padding: "10px 14px", borderRadius: 6,
                  backgroundColor: "#181825", border: "1px solid #313244",
                  color: c, fontSize: 12, whiteSpace: "pre-wrap",
                  wordBreak: "break-all", ...monoStyle,
                }}>
                  {value}
                </pre>
              </div>
            ) : null)}
          </div>
        )}

        {/* Code */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#6c7086" }}>Code</span>
            <span style={{
              fontSize: 11, padding: "1px 6px", borderRadius: 4,
              backgroundColor: "#313244", color: "#89b4fa",
            }}>
              {record.lang}
            </span>
            <span style={{ fontSize: 11, color: "#45475a" }}>{formatDate(record.timestamp)} {formatTime(record.timestamp)}</span>
          </div>
          <pre style={{
            margin: 0, padding: "14px 16px", borderRadius: 8,
            backgroundColor: "#11111b", border: "1px solid #313244",
            color: "#cdd6f4", fontSize: 12, lineHeight: 1.65,
            overflowX: "auto", maxHeight: 320, overflowY: "auto",
            whiteSpace: "pre", ...monoStyle,
          }}>
            {record.code}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SubmissionsTab({ questionId, refreshKey }: SubmissionsTabProps) {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [selected, setSelected] = useState<SubmissionRecord | null>(null);

  // Load from localStorage whenever questionId changes or a new submission arrives
  useEffect(() => {
    setSubmissions(getSubmissions(questionId));
    setSelected(null); // reset detail view when question changes
  }, [questionId, refreshKey]);

  function handleClear() {
    if (!confirm("Clear all submission history for this problem?")) return;
    clearSubmissions(questionId);
    setSubmissions([]);
    setSelected(null);
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selected) {
    return <SubmissionDetail record={selected} onBack={() => setSelected(null)} />;
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (submissions.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
          gap: 12,
        }}
      >
        <MessageSquare size={32} style={{ color: "#45475a" }} />
        <p style={{ color: "#6c7086", fontSize: 14, margin: 0 }}>
          Your past submissions will appear here.
        </p>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 8,
          padding: "8px 16px",
          borderBottom: "1px solid #313244",
          fontSize: 11,
          fontWeight: 600,
          color: "#45475a",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <span>Status</span>
        <span>Language</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} /> Runtime
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Cpu size={10} /> Memory
        </span>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {submissions.map((rec, i) => (
          <button
            key={rec.id}
            onClick={() => setSelected(rec)}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 8,
              width: "100%",
              padding: "10px 16px",
              borderBottom: "1px solid #1e1e2e",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              alignItems: "center",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(137,180,250,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"; }}
          >
            {/* Status */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: statusColor(rec) }}>
                {rec.status}
              </div>
              <div style={{ fontSize: 11, color: "#45475a", marginTop: 2 }}>
                {formatDate(rec.timestamp)}
              </div>
            </div>

            {/* Language */}
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4,
              backgroundColor: "#313244", color: "#89b4fa",
              display: "inline-block", fontWeight: 500,
            }}>
              {rec.lang}
            </span>

            {/* Runtime */}
            <span style={{ fontSize: 13, color: "#a6adc8", ...monoStyle }}>
              {rec.runtime ?? "—"}
            </span>

            {/* Memory */}
            <span style={{ fontSize: 13, color: "#a6adc8", ...monoStyle }}>
              {rec.memory ?? "—"}
            </span>
          </button>
        ))}
      </div>

      {/* Footer actions */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid #313244", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleClear}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "none", border: "1px solid #45475a",
            borderRadius: 6, padding: "4px 10px", cursor: "pointer",
            color: "#6c7086", fontSize: 11, transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#f38ba8";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#f38ba8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#6c7086";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#45475a";
          }}
        >
          <Trash2 size={11} />
          Clear history
        </button>
      </div>
    </div>
  );
}
