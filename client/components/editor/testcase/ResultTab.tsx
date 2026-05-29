/**
 * ResultTab.tsx
 *
 * Shows the execution result after Run or Submit.
 * Handles both Judge0 and LeetCode provider results.
 *
 * LeetCode run  → expanded card per test case (input / expected / actual / pass-fail)
 * LeetCode submit → percentile bars (Accepted) or failing case details (WA)
 * Judge0        → original per-case diff view
 */

import { Check, X, Clock, Cpu, AlertTriangle, Zap, MemoryStick } from "lucide-react";
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

function StatusHeader({ result }: { result: ExecuteResult }) {
  const isAccepted = result.status.id === 10 || result.status.id === 3;
  const statusColor = isAccepted ? "#a6e3a1" : "#f38ba8";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {isAccepted ? (
        <Check size={22} style={{ color: statusColor }} />
      ) : (
        <X size={22} style={{ color: statusColor }} />
      )}
      <span style={{ fontSize: 20, fontWeight: 700, color: statusColor }}>
        {result.status.description}
      </span>
      {result.provider === "judge0" && result.totalCases > 0 && (
        <span style={{ fontSize: 13, color: "#6c7086" }}>
          ({result.passedCount}/{result.totalCases} cases)
        </span>
      )}
      {result.provider === "leetcode" && result.mode === "submit" && result.totalTestcases && (
        <span style={{ fontSize: 13, color: "#6c7086" }}>
          ({result.totalCorrect}/{result.totalTestcases} tests)
        </span>
      )}
    </div>
  );
}

function PercentileBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#6c7086" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{value.toFixed(1)}%</span>
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

/** Labelled code block — larger font for readability */
function CodeBlock({ label, value, color = "#cdd6f4" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#6c7086", margin: "0 0 6px", fontWeight: 500 }}>{label}</p>
      <pre
        style={{
          padding: "10px 14px",
          borderRadius: 6,
          backgroundColor: "#181825",
          border: "1px solid #313244",
          color,
          fontSize: 14,
          margin: 0,
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

// ── LC run: expanded card per test case ───────────────────────────────────────

function CaseCard({ c, index, input }: { c: CaseResult; index: number; input?: string }) {
  const passed = c.passed;
  const borderColor = passed ? "rgba(166,227,161,0.3)" : "rgba(243,139,168,0.3)";
  const headerBg    = passed ? "rgba(166,227,161,0.06)" : "rgba(243,139,168,0.06)";

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          backgroundColor: headerBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {passed
          ? <Check size={14} style={{ color: "#a6e3a1" }} />
          : <X size={14} style={{ color: "#f38ba8" }} />}
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: passed ? "#a6e3a1" : "#f38ba8",
          }}
        >
          Case {index + 1}
        </span>
        <span style={{ fontSize: 12, color: "#45475a", marginLeft: "auto" }}>
          {passed ? "Passed" : "Failed"}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, backgroundColor: "#181825" }}>
        {/* Input — shown only if we have the raw string */}
        {input && (
          <div>
            <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 5px", fontWeight: 500 }}>Input</p>
            <pre style={{
              margin: 0, padding: "8px 12px", borderRadius: 6,
              backgroundColor: "#11111b", border: "1px solid #313244",
              color: "#cdd6f4", fontSize: 14, whiteSpace: "pre-wrap",
              wordBreak: "break-all", lineHeight: 1.6, ...monoStyle,
            }}>
              {input}
            </pre>
          </div>
        )}

        {/* Expected output */}
        {c.expectedOutput && (
          <div>
            <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 5px", fontWeight: 500 }}>Expected Output</p>
            <pre style={{
              margin: 0, padding: "8px 12px", borderRadius: 6,
              backgroundColor: "#11111b", border: "1px solid #313244",
              color: "#a6e3a1", fontSize: 14, whiteSpace: "pre-wrap",
              wordBreak: "break-all", lineHeight: 1.6, ...monoStyle,
            }}>
              {c.expectedOutput}
            </pre>
          </div>
        )}

        {/* Actual output */}
        {c.actualOutput && (
          <div>
            <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 5px", fontWeight: 500 }}>Your Output</p>
            <pre style={{
              margin: 0, padding: "8px 12px", borderRadius: 6,
              backgroundColor: "#11111b", border: "1px solid #313244",
              color: passed ? "#a6e3a1" : "#f38ba8",
              fontSize: 14, whiteSpace: "pre-wrap",
              wordBreak: "break-all", lineHeight: 1.6, ...monoStyle,
            }}>
              {c.actualOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LeetCode run result ────────────────────────────────────────────────────────

function LCRunResult({ result }: { result: ExecuteResult }) {
  const isCompileError = result.status.id === 20;
  const cases = result.caseResults;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <StatusHeader result={result} />

      {/* Compile error */}
      {isCompileError && result.compileOutput && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f9e2af" }} />
            <p style={{ fontSize: 13, color: "#f9e2af", margin: 0 }}>Compile Error</p>
          </div>
          <CodeBlock label="" value={result.compileOutput} color="#f9e2af" />
        </div>
      )}

      {/* Runtime error */}
      {result.stderr && !isCompileError && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 13, color: "#f38ba8", margin: 0 }}>Runtime Error</p>
          </div>
          <CodeBlock label="" value={result.stderr} color="#f38ba8" />
        </div>
      )}

      {/* Expanded cards for each test case */}
      {!isCompileError && !result.stderr && cases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cases.map((c, i) => (
            <CaseCard
              key={c.caseId}
              c={c}
              index={i}
              input={result.allInputs?.[i]}
            />
          ))}
        </div>
      )}

      {/* No case data at all */}
      {!isCompileError && !result.stderr && cases.length === 0 && (
        <p style={{ fontSize: 14, color: "#6c7086", margin: 0 }}>
          No test case results returned.
        </p>
      )}

      {/* Runtime / Memory */}
      {(result.statusRuntime || result.statusMemory) && (
        <div style={{ display: "flex", gap: 24 }}>
          {result.statusRuntime && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={13} style={{ color: "#6c7086" }} />
              <div>
                <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Runtime</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
                  {result.statusRuntime}
                </p>
              </div>
            </div>
          )}
          {result.statusMemory && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MemoryStick size={13} style={{ color: "#6c7086" }} />
              <div>
                <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Memory</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
                  {result.statusMemory}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LeetCode submit result ─────────────────────────────────────────────────────

function LCSubmitResult({ result }: { result: ExecuteResult }) {
  const isAccepted = result.status.id === 10;
  const isCompileError = result.status.id === 20;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <StatusHeader result={result} />

      {/* Accepted: show percentile bars */}
      {isAccepted && (result.runtimePercentile !== undefined || result.memoryPercentile !== undefined) && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid #313244",
            backgroundColor: "#181825",
          }}
        >
          <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Performance
          </p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {result.runtimePercentile !== undefined && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Zap size={13} style={{ color: "#89b4fa" }} />
                  <span style={{ fontSize: 12, color: "#6c7086" }}>
                    Runtime: <strong style={{ color: "#cdd6f4" }}>{result.statusRuntime}</strong>
                  </span>
                </div>
                <PercentileBar label="Faster than" value={result.runtimePercentile} color="#89b4fa" />
              </div>
            )}
            {result.memoryPercentile !== undefined && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MemoryStick size={13} style={{ color: "#a6e3a1" }} />
                  <span style={{ fontSize: 12, color: "#6c7086" }}>
                    Memory: <strong style={{ color: "#cdd6f4" }}>{result.statusMemory}</strong>
                  </span>
                </div>
                <PercentileBar label="Less memory than" value={result.memoryPercentile} color="#a6e3a1" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compile error */}
      {isCompileError && result.compileOutput && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f9e2af" }} />
            <p style={{ fontSize: 13, color: "#f9e2af", margin: 0 }}>Compile Error</p>
          </div>
          <CodeBlock label="" value={result.compileOutput} color="#f9e2af" />
        </div>
      )}

      {/* Runtime error */}
      {result.stderr && !isCompileError && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 13, color: "#f38ba8", margin: 0 }}>Runtime Error</p>
          </div>
          <CodeBlock label="" value={result.stderr} color="#f38ba8" />
        </div>
      )}

      {/* Wrong Answer: failing test case details */}
      {!isAccepted && !isCompileError && !result.stderr && result.lastTestcase && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CodeBlock label="Input" value={result.lastTestcase} />
          {result.expectedOutput && (
            <CodeBlock label="Expected Output" value={result.expectedOutput} color="#a6e3a1" />
          )}
          {result.codeOutput && (
            <CodeBlock label="Your Output" value={result.codeOutput} color="#f38ba8" />
          )}
        </div>
      )}

      {/* TLE / MLE — no extra detail */}
      {!isAccepted && !isCompileError && !result.stderr && !result.lastTestcase && (
        <p style={{ fontSize: 14, color: "#6c7086", margin: 0 }}>
          No additional details available for this status.
        </p>
      )}
    </div>
  );
}

// ── Judge0 result (original) ───────────────────────────────────────────────────

function Judge0Result({ result }: { result: ExecuteResult }) {
  const isAccepted = result.status.id === 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <StatusHeader result={result} />

      {/* Case result pills */}
      {result.caseResults.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: "#6c7086", margin: "0 0 8px" }}>Test Cases</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.caseResults.map((c) => (
              <span
                key={c.caseId}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  border: "1px solid #313244",
                  color: c.passed ? "#a6e3a1" : "#f38ba8",
                  backgroundColor: "#181825",
                }}
              >
                Case {c.caseId}: {c.passed ? "✓" : "✗"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* First failing case diff */}
      {result.caseResults.some((c) => !c.passed) && (
        <div>
          {result.caseResults
            .filter((c) => !c.passed)
            .slice(0, 1)
            .map((c) => (
              <div key={c.caseId} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 13, color: "#6c7086", margin: 0 }}>
                  Case {c.caseId} — Expected vs Actual
                </p>
                <pre
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    backgroundColor: "#181825",
                    border: "1px solid #313244",
                    color: "#cdd6f4",
                    fontSize: 14,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    lineHeight: 1.6,
                    ...monoStyle,
                  }}
                >
                  {`Expected: ${c.expectedOutput}\nActual:   ${c.actualOutput || "(empty)"}`}
                </pre>
              </div>
            ))}
        </div>
      )}

      {/* Runtime + memory stats */}
      {result.time && (
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} style={{ color: "#6c7086" }} />
            <div>
              <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Runtime</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
                {result.time} s
              </p>
            </div>
          </div>
          {result.memory && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={13} style={{ color: "#6c7086" }} />
              <div>
                <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Memory</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
                  {result.memory} KB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compile / runtime error output */}
      {(result.compileOutput || result.stderr) && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 13, color: "#f38ba8", margin: 0 }}>
              {result.compileOutput ? "Compile Error" : "Runtime Error"}
            </p>
          </div>
          <pre
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              backgroundColor: "#181825",
              border: "1px solid rgba(243,139,168,0.3)",
              color: "#f38ba8",
              fontSize: 14,
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              lineHeight: 1.6,
              ...monoStyle,
            }}
          >
            {result.compileOutput || result.stderr}
          </pre>
        </div>
      )}

      {/* Void to silence unused */}
      {isAccepted && null}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ResultTab({ isRunning, isSubmitting, result }: ResultTabProps) {
  // Loading state
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
            width: 28,
            height: 28,
            border: "3px solid #313244",
            borderTopColor: "#89b4fa",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#6c7086", fontSize: 14, margin: 0 }}>
          {isRunning ? "Running code…" : "Submitting…"}
        </p>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 0",
          color: "#45475a",
          fontSize: 14,
        }}
      >
        Run your code to see results here.
      </div>
    );
  }

  // Route to the correct result renderer
  if (result.provider === "leetcode") {
    if (result.mode === "submit") return <LCSubmitResult result={result} />;
    return <LCRunResult result={result} />;
  }

  // Default: Judge0
  return <Judge0Result result={result} />;
}
