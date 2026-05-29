/**
 * ResultTab.tsx
 *
 * Shows execution results:
 * - LC run  → tab per case (Case 1 / Case 2 / …) + detail panel with Input/Expected/Output/Stdout
 * - LC submit → percentile bars + distribution chart (bar chart from runtimeDistribution)
 * - Judge0   → same tab-per-case layout
 */

"use client";

import { useState } from "react";
import { Check, X, AlertTriangle, Zap, MemoryStick, Clock, Cpu } from "lucide-react";
import type { ExecuteResult, CaseResult } from "../../../types/execution";

interface ResultTabProps {
  isRunning: boolean;
  isSubmitting: boolean;
  result: ExecuteResult | null;
}

const monoStyle: React.CSSProperties = {
  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ result }: { result: ExecuteResult }) {
  const isAccepted = result.status.id === 10 || result.status.id === 3;
  const color = isAccepted ? "#a6e3a1" : "#f38ba8";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      {isAccepted
        ? <Check size={18} style={{ color }} />
        : <X size={18} style={{ color }} />}
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{result.status.description}</span>
      {result.provider === "leetcode" && result.mode === "submit" && result.totalTestcases && (
        <span style={{ fontSize: 12, color: "#6c7086" }}>
          ({result.totalCorrect}/{result.totalTestcases} tests)
        </span>
      )}
    </div>
  );
}

function CodeBox({
  label,
  value,
  color = "#cdd6f4",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 5px", fontWeight: 500 }}>{label}</p>
      <pre
        style={{
          margin: 0,
          padding: "8px 12px",
          borderRadius: 6,
          backgroundColor: "#11111b",
          border: "1px solid #313244",
          color,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          lineHeight: 1.6,
          ...monoStyle,
        }}
      >
        {value}
      </pre>
    </div>
  );
}

// ── Distribution Bar Chart ─────────────────────────────────────────────────────
// runtimeDistribution from GraphQL is an array of [runtime_ms, percentage]

function DistributionChart({
  data,
  myValue,
  label,
  unit,
  color,
}: {
  data: Array<[number, number]>;
  myValue?: number;
  label: string;
  unit: string;
  color: string;
}) {
  if (!data || data.length === 0) return null;

  const maxPct = Math.max(...data.map(([, pct]) => pct));
  const chartHeight = 80;

  // Find closest bar to myValue
  const myIdx = myValue != null
    ? data.reduce((best, [val], i) => {
        const curr = data[i][0];
        const bestVal = data[best][0];
        return Math.abs(curr - myValue) < Math.abs(bestVal - myValue) ? i : best;
      }, 0)
    : -1;

  // Only show every Nth label to avoid overcrowding
  const showEveryN = Math.max(1, Math.floor(data.length / 8));

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label} Distribution
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: chartHeight, overflowX: "auto" }}>
        {data.map(([val, pct], i) => {
          const barH = maxPct > 0 ? (pct / maxPct) * chartHeight : 0;
          const isMe = i === myIdx;
          return (
            <div
              key={val}
              title={`${val}${unit}: ${pct.toFixed(2)}%`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 4,
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  width: 4,
                  height: barH,
                  backgroundColor: isMe ? "#f9e2af" : color,
                  borderRadius: "2px 2px 0 0",
                  opacity: isMe ? 1 : 0.75,
                  transition: "height 0.4s ease",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 1, overflowX: "hidden" }}>
        {data.map(([val], i) => (
          i % showEveryN === 0 ? (
            <div
              key={val}
              style={{
                minWidth: 4,
                flex: "0 0 auto",
                fontSize: 9,
                color: "#45475a",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "visible",
              }}
            >
              {val}{unit}
            </div>
          ) : (
            <div key={val} style={{ minWidth: 4, flex: "0 0 auto" }} />
          )
        ))}
      </div>
    </div>
  );
}

// ── Tab-style case selector ────────────────────────────────────────────────────

function CaseTabs({
  cases,
  activeIdx,
  onSelect,
}: {
  cases: CaseResult[];
  activeIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
      {cases.map((c, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={c.caseId}
            onClick={() => onSelect(i)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              backgroundColor: isActive ? "#313244" : "transparent",
              color: isActive
                ? (c.passed ? "#a6e3a1" : "#f38ba8")
                : (c.passed ? "rgba(166,227,161,0.6)" : "rgba(243,139,168,0.6)"),
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "background-color 0.1s",
            }}
          >
            {c.passed
              ? <Check size={10} />
              : <X size={10} />}
            Case {i + 1}
          </button>
        );
      })}
    </div>
  );
}

// ── LC run result: tabs per case ───────────────────────────────────────────────

function LCRunResult({ result }: { result: ExecuteResult }) {
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const isCompileError = result.status.id === 20;
  const cases = result.caseResults;

  const activeCase = cases[activeCaseIdx];
  const activeInput = result.allInputs?.[activeCaseIdx];
  const hasStdout = activeCase?.stdout && activeCase.stdout.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <StatusBadge result={result} />

      {/* Compile error — no tabs */}
      {isCompileError && result.compileOutput && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f9e2af" }} />
            <span style={{ fontSize: 13, color: "#f9e2af" }}>Compile Error</span>
          </div>
          <CodeBox label="" value={result.compileOutput} color="#f9e2af" />
        </div>
      )}

      {/* Runtime error — show above tabs */}
      {result.stderr && !isCompileError && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <span style={{ fontSize: 13, color: "#f38ba8" }}>Runtime Error</span>
          </div>
          <CodeBox label="" value={result.stderr} color="#f38ba8" />
        </div>
      )}

      {/* Case tabs + detail — show always (even with runtime errors) */}
      {!isCompileError && cases.length > 0 && (
        <>
          <CaseTabs cases={cases} activeIdx={activeCaseIdx} onSelect={setActiveCaseIdx} />

          {activeCase && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Input */}
              {activeInput && <CodeBox label="Input" value={activeInput} />}

              {/* Expected output */}
              {activeCase.expectedOutput && (
                <CodeBox label="Expected Output" value={activeCase.expectedOutput} color="#a6e3a1" />
              )}

              {/* Your output */}
              {activeCase.actualOutput && (
                <CodeBox
                  label="Your Output"
                  value={activeCase.actualOutput}
                  color={activeCase.passed ? "#a6e3a1" : "#f38ba8"}
                />
              )}

              {/* Stdout (console.log / print) — always show when present */}
              {activeCase.stdout && activeCase.stdout.trim() && (
                <CodeBox label="Stdout" value={activeCase.stdout} color="#89b4fa" />
              )}
            </div>
          )}
        </>
      )}

      {/* Edge: no cases returned */}
      {!isCompileError && cases.length === 0 && (
        <p style={{ fontSize: 13, color: "#6c7086", margin: 0 }}>
          No test case results returned.
        </p>
      )}
    </div>
  );
}


// ── LC submit result ───────────────────────────────────────────────────────────

function LCSubmitResult({ result }: { result: ExecuteResult }) {
  const isAccepted = result.status.id === 10;
  const isCompileError = result.status.id === 20;

  // Parse runtime from statusRuntime like "41 ms" → 41
  const myRuntimeMs = result.statusRuntime
    ? parseInt(result.statusRuntime.replace(/[^0-9]/g, ""), 10)
    : undefined;
  // Parse memory from statusMemory like "57.34 MB" → 57340 (KB)
  const myMemoryMB = result.statusMemory
    ? parseFloat(result.statusMemory.replace(/[^0-9.]/g, ""))
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <StatusBadge result={result} />

      {/* Accepted: runtime + memory stats + chart */}
      {isAccepted && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid #313244",
            backgroundColor: "#181825",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Stats row */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {result.statusRuntime && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={14} style={{ color: "#89b4fa" }} />
                <div>
                  <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Runtime</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#cdd6f4", margin: 0 }}>
                    {result.statusRuntime}
                    {result.runtimePercentile != null && (
                      <span style={{ fontSize: 12, fontWeight: 400, color: "#89b4fa", marginLeft: 8 }}>
                        Beats {result.runtimePercentile.toFixed(2)}%
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {result.statusMemory && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MemoryStick size={14} style={{ color: "#a6e3a1" }} />
                <div>
                  <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Memory</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#cdd6f4", margin: 0 }}>
                    {result.statusMemory}
                    {result.memoryPercentile != null && (
                      <span style={{ fontSize: 12, fontWeight: 400, color: "#a6e3a1", marginLeft: 8 }}>
                        Beats {result.memoryPercentile.toFixed(2)}%
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Distribution charts */}
          {result.runtimeDistribution && result.runtimeDistribution.length > 0 && (
            <DistributionChart
              data={result.runtimeDistribution}
              myValue={myRuntimeMs}
              label="Runtime"
              unit="ms"
              color="#89b4fa"
            />
          )}
          {result.memoryDistribution && result.memoryDistribution.length > 0 && (
            <DistributionChart
              data={result.memoryDistribution}
              myValue={myMemoryMB != null ? myMemoryMB * 1024 : undefined}
              label="Memory"
              unit="KB"
              color="#a6e3a1"
            />
          )}
        </div>
      )}

      {/* Compile error */}
      {isCompileError && result.compileOutput && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f9e2af" }} />
            <span style={{ fontSize: 13, color: "#f9e2af" }}>Compile Error</span>
          </div>
          <CodeBox label="" value={result.compileOutput} color="#f9e2af" />
        </div>
      )}

      {/* Runtime error */}
      {result.stderr && !isCompileError && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <span style={{ fontSize: 13, color: "#f38ba8" }}>Runtime Error</span>
          </div>
          <CodeBox label="" value={result.stderr} color="#f38ba8" />
        </div>
      )}

      {/* Wrong Answer details */}
      {!isAccepted && !isCompileError && !result.stderr && result.lastTestcase && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CodeBox label="Input" value={result.lastTestcase} />
          {result.expectedOutput && (
            <CodeBox label="Expected Output" value={result.expectedOutput} color="#a6e3a1" />
          )}
          {result.codeOutput && (
            <CodeBox label="Your Output" value={result.codeOutput} color="#f38ba8" />
          )}
        </div>
      )}

      {/* Stdout */}
      {result.stdout && result.stdout.trim().length > 0 && (
        <CodeBox label="Stdout" value={result.stdout} color="#89b4fa" />
      )}
    </div>
  );
}

// ── Judge0 result ─────────────────────────────────────────────────────────────

function Judge0Result({ result }: { result: ExecuteResult }) {
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const cases = result.caseResults;
  const activeCase = cases[activeCaseIdx];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <StatusBadge result={result} />

      {cases.length > 0 && (
        <>
          <CaseTabs cases={cases} activeIdx={activeCaseIdx} onSelect={setActiveCaseIdx} />

          {activeCase && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCase.expectedOutput && (
                <CodeBox label="Expected Output" value={activeCase.expectedOutput} color="#a6e3a1" />
              )}
              <CodeBox
                label="Your Output"
                value={activeCase.actualOutput || "(empty)"}
                color={activeCase.passed ? "#a6e3a1" : "#f38ba8"}
              />
              {activeCase.stdout && activeCase.stdout.trim() && (
                <CodeBox label="Stdout" value={activeCase.stdout} color="#89b4fa" />
              )}
              {(activeCase.compileOutput || activeCase.stderr) && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
                    <span style={{ fontSize: 13, color: "#f38ba8" }}>
                      {activeCase.compileOutput ? "Compile Error" : "Runtime Error"}
                    </span>
                  </div>
                  <CodeBox label="" value={activeCase.compileOutput ?? activeCase.stderr ?? ""} color="#f38ba8" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Runtime + memory */}
      {result.time && (
        <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} style={{ color: "#6c7086" }} />
            <span style={{ fontSize: 12, color: "#a6adc8" }}>{result.time} s</span>
          </div>
          {result.memory && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={12} style={{ color: "#6c7086" }} />
              <span style={{ fontSize: 12, color: "#a6adc8" }}>{result.memory} KB</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ResultTab({ isRunning, isSubmitting, result }: ResultTabProps) {
  if (isRunning || isSubmitting) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 0",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            border: "3px solid #313244",
            borderTopColor: "#89b4fa",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#6c7086", fontSize: 13, margin: 0 }}>
          {isRunning ? "Running code…" : "Submitting…"}
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 0",
          color: "#45475a",
          fontSize: 13,
        }}
      >
        Run your code to see results here.
      </div>
    );
  }

  if (result.provider === "leetcode") {
    if (result.mode === "submit") return <LCSubmitResult result={result} />;
    return <LCRunResult result={result} />;
  }

  return <Judge0Result result={result} />;
}
