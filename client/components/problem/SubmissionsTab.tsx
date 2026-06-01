"use client";

/**
 * SubmissionsTab.tsx
 *
 * Lists stored submission IDs for the current problem.
 * On click: fetches full details from LeetCode via extension bridge (mode: "submission_details").
 * The distribution charts are shown in the detail view — not during the submit flow.
 * localStorage only stores the ID + minimal metadata (no code, no percentiles).
 */

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Check, X, Loader2, AlertTriangle, Zap, MemoryStick, User, Clock, Cpu
} from "lucide-react";
import { getSubmissionRefs } from "../../lib/submissionsStore";
import type { StoredSubmissionRef } from "../../lib/submissionsStore";
import { detectExtension, requestLeetCodeViaExtension } from "../../lib/extensionApi";

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
  data, myValue, unit, color,
}: {
  data: Array<[number, number]>;
  myValue?: number;
  unit: string;
  color: string;
}) {
  if (!data || data.length === 0) return null;

  const maxPct = Math.max(...data.map(([, p]) => p));
  const chartH = 150;
  const barW = 10;
  const barGap = 4;

  const gridLines = [maxPct, maxPct * 0.75, maxPct * 0.5, maxPct * 0.25, 0];

  const myIdx = myValue != null
    ? data.reduce((best, _, i) =>
        Math.abs(data[i][0] - myValue) < Math.abs(data[best][0] - myValue) ? i : best, 0)
    : -1;

  // To prevent label overlapping, calculate how many labels we can reasonably fit.
  // Assuming a typical container width of ~600px, we can fit ~12 labels max.
  const showEveryN = Math.max(1, Math.ceil(data.length / 12));

  const formatLabel = (val: number, u: string) => {
    if (u === "KB" && val >= 1000) {
      return `${(val / 1000).toFixed(1)}MB`;
    }
    return `${val}${u.toLowerCase()}`; // e.g. 'mb' or 'ms' like LC
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* Chart Container */}
      <div style={{ display: "flex", gap: 12 }}>
        {/* Y-axis labels */}
        <div style={{ position: "relative", width: 32, height: chartH, marginTop: 28 }}>
          {gridLines.map((val, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                top: `${(i / 4) * 100}%`,
                right: 0,
                transform: "translateY(-50%)",
                fontSize: 10,
                color: "#585b70",
              }}
            >
              {Math.round(val)}%
            </span>
          ))}
        </div>

        {/* Chart + X-axis area */}
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          {/* Background grid lines */}
          <div style={{ position: "absolute", top: 28, left: 0, right: 0, height: chartH, zIndex: 0 }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: `${(i / 4) * 100}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: i === 4 ? "#45475a" : "#313244",
                }}
              />
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, paddingBottom: 8, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "flex-end", height: chartH + 28 }}>
              {data.map(([val, pct], i) => {
                const h = maxPct > 0 ? (pct / maxPct) * chartH : 0;
                const isMe = i === myIdx;
                return (
                  <div
                    key={val}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      height: "100%",
                      flex: 1,
                      minWidth: 0,
                      position: "relative"
                    }}
                  >
                    {/* "You" marker above the bar */}
                    {isMe && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: h,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          zIndex: 10,
                          transform: "translateY(-4px)"
                        }}
                      >
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#11111b",
                          border: "2px solid #89b4fa",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#cdd6f4",
                          overflow: "hidden",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.4)"
                        }}>
                          <User size={14} />
                        </div>
                        {/* Stem connecting marker to bar */}
                        <div style={{
                          width: 2,
                          height: 8,
                          backgroundColor: "#89b4fa"
                        }} />
                      </div>
                    )}
                    {/* Bar */}
                    <div
                      title={`${pct.toFixed(2)}% of solutions used ${formatLabel(val, unit)} of ${unit === "KB" ? "memory" : "runtime"}`}
                      style={{
                        width: "80%",
                        maxWidth: 24,
                        height: Math.max(h, 2), // Ensure tiny bars are still visible
                        backgroundColor: color,
                        borderRadius: "2px 2px 0 0",
                        opacity: isMe ? 1 : 0.5,
                        transition: "opacity 0.15s, height 0.3s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { if (!isMe) e.currentTarget.style.opacity = "0.5"; }}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* X-axis labels */}
            <div style={{ display: "flex", width: "100%", marginTop: 8, height: 16 }}>
              {data.map(([val], i) => (
                <div key={val} style={{ flex: 1, minWidth: 0, position: "relative" }}>
                  {i % showEveryN === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        color: "#6c7086",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatLabel(val, unit)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
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
  const [activeTab, setActiveTab] = useState<"runtime" | "memory">("runtime");

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
              <div style={{ padding: "20px 24px", borderRadius: 12, border: "1px solid #313244", backgroundColor: "#181825", display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Tabs / Stat Cards */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {/* Runtime Card */}
                  {detail.runtimeDisplay && (
                    <div
                      onClick={() => setActiveTab("runtime")}
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: "16px 20px",
                        borderRadius: 12,
                        backgroundColor: activeTab === "runtime" ? "#313244" : "#1e1e2e",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={16} style={{ color: "#a6adc8" }} />
                        <span style={{ fontSize: 14, color: "#a6adc8", fontWeight: 600 }}>Runtime</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: "#cdd6f4" }}>
                          {detail.runtimeDisplay}
                        </span>
                        {detail.runtimePercentile != null && (
                          <span style={{ fontSize: 14, color: "#6c7086" }}>
                            Beats <span style={{ fontWeight: 700, color: "#cdd6f4" }}>{detail.runtimePercentile.toFixed(2)}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Memory Card */}
                  {detail.memoryDisplay && (
                    <div
                      onClick={() => setActiveTab("memory")}
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: "16px 20px",
                        borderRadius: 12,
                        backgroundColor: activeTab === "memory" ? "#313244" : "#1e1e2e",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Cpu size={16} style={{ color: "#a6adc8" }} />
                        <span style={{ fontSize: 14, color: "#a6adc8", fontWeight: 600 }}>Memory</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: "#cdd6f4" }}>
                          {detail.memoryDisplay}
                        </span>
                        {detail.memoryPercentile != null && (
                          <span style={{ fontSize: 14, color: "#6c7086" }}>
                            Beats <span style={{ fontWeight: 700, color: "#cdd6f4" }}>{detail.memoryPercentile.toFixed(2)}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart Container with animation */}
                <div style={{ minHeight: 180, position: "relative", paddingBottom: 8 }}>
                  {activeTab === "runtime" && detail.runtime_distribution && detail.runtime_distribution.length > 0 && (
                    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                      <DistributionChart data={detail.runtime_distribution} myValue={myRuntimeMs} unit="ms" color="#89b4fa" />
                    </div>
                  )}
                  {activeTab === "memory" && detail.memory_distribution && detail.memory_distribution.length > 0 && (
                    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                      <DistributionChart data={detail.memory_distribution} myValue={myMemoryKB} unit="KB" color="#89b4fa" />
                    </div>
                  )}
                </div>
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
      const extAvailable = await detectExtension(2, 200, 450);
      if (!extAvailable) {
        setError("Extension not detected. Please install/enable the extension and login on leetcode.com.");
        return;
      }

      const data = await requestLeetCodeViaExtension({
        mode: "submission_details",
        submissionId,
        titleSlug,
        questionId,
        lang: "",
        typedCode: "",
      }, 90000) as SubmissionDetail;

      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extension request failed");
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
