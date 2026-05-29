/**
 * ResultTab.tsx
 *
 * Shows the execution result after Run or Submit.
 * Handles both Judge0 and LeetCode provider results.
 *
 * LeetCode submit shows: pass count, percentile bars, or failing test case.
 * LeetCode run shows: pass/fail per visible test case with I/O details.
 * Judge0: original behavior (case diffs, compile/runtime errors).
 */

import { Check, X, Clock, Cpu, AlertTriangle, Zap, MemoryStick } from "lucide-react";
import type { ExecuteResult } from "../../../types/execution";

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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {isAccepted ? (
        <Check size={20} style={{ color: statusColor }} />
      ) : (
        <X size={20} style={{ color: statusColor }} />
      )}
      <span style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>
        {result.status.description}
      </span>
      {result.provider === "judge0" && result.totalCases > 0 && (
        <span style={{ fontSize: 12, color: "#6c7086" }}>
          ({result.passedCount}/{result.totalCases} cases)
        </span>
      )}
      {result.provider === "leetcode" && result.mode === "submit" && result.totalTestcases && (
        <span style={{ fontSize: 12, color: "#6c7086" }}>
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
        <span style={{ fontSize: 11, color: "#6c7086" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value.toFixed(1)}%</span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: "#313244",
          overflow: "hidden",
        }}
      >
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

function CodeBlock({ label, value, color = "#cdd6f4" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 6px" }}>{label}</p>
      <pre
        style={{
          padding: "10px 14px",
          borderRadius: 6,
          backgroundColor: "#181825",
          border: "1px solid #313244",
          color,
          fontSize: 12,
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          ...monoStyle,
        }}
      >
        {value}
      </pre>
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
                  <span style={{ fontSize: 11, color: "#6c7086" }}>
                    Runtime: <strong style={{ color: "#cdd6f4" }}>{result.statusRuntime}</strong>
                  </span>
                </div>
                <PercentileBar
                  label="Faster than"
                  value={result.runtimePercentile}
                  color="#89b4fa"
                />
              </div>
            )}
            {result.memoryPercentile !== undefined && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MemoryStick size={13} style={{ color: "#a6e3a1" }} />
                  <span style={{ fontSize: 11, color: "#6c7086" }}>
                    Memory: <strong style={{ color: "#cdd6f4" }}>{result.statusMemory}</strong>
                  </span>
                </div>
                <PercentileBar
                  label="Less memory than"
                  value={result.memoryPercentile}
                  color="#a6e3a1"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compile error */}
      {isCompileError && result.compileOutput && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 12, color: "#f38ba8", margin: 0 }}>Compile Error</p>
          </div>
          <CodeBlock label="" value={result.compileOutput} color="#f38ba8" />
        </div>
      )}

      {/* Runtime error */}
      {result.stderr && !isCompileError && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 12, color: "#f38ba8", margin: 0 }}>Runtime Error</p>
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

      {/* TLE / MLE — no extra detail, just the status message */}
      {!isAccepted && !isCompileError && !result.stderr && !result.lastTestcase && (
        <p style={{ fontSize: 13, color: "#6c7086", margin: 0 }}>
          No additional details available for this status.
        </p>
      )}
    </div>
  );
}

// ── LeetCode run result ────────────────────────────────────────────────────────

function LCRunResult({ result }: { result: ExecuteResult }) {
  const isCompileError = result.status.id === 20;
  const hasError = Boolean(result.compileOutput || result.stderr);

  // compare_result shows which cases passed ("1" = pass, "0" = fail)
  // We approximate from caseResults
  const cases = result.caseResults;
  const allPassed = cases.length > 0 && cases.every((c) => c.passed);
  const statusColor = allPassed && !hasError ? "#a6e3a1" : "#f38ba8";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <StatusHeader result={result} />

      {/* Case pills */}
      {cases.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 8px" }}>Visible Cases</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cases.map((c) => (
              <span
                key={c.caseId}
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
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

      {/* Compile error */}
      {isCompileError && result.compileOutput && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 12, color: "#f38ba8", margin: 0 }}>Compile Error</p>
          </div>
          <CodeBlock label="" value={result.compileOutput} color="#f38ba8" />
        </div>
      )}

      {/* Runtime error */}
      {result.stderr && !isCompileError && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: "#f38ba8" }} />
            <p style={{ fontSize: 12, color: "#f38ba8", margin: 0 }}>Runtime Error</p>
          </div>
          <CodeBlock label="" value={result.stderr} color="#f38ba8" />
        </div>
      )}

      {/* Wrong answer I/O */}
      {!hasError && result.lastTestcase && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CodeBlock label="Last Input" value={result.lastTestcase} />
          {result.expectedOutput && (
            <CodeBlock label="Expected" value={result.expectedOutput} color="#a6e3a1" />
          )}
          {result.codeOutput && (
            <CodeBlock label="Your Output" value={result.codeOutput} color="#f38ba8" />
          )}
        </div>
      )}

      {/* stdout */}
      {result.stdout && !hasError && (
        <CodeBlock label="Stdout" value={result.stdout} />
      )}

      {/* No failing details but still wrong */}
      {!allPassed && !hasError && !result.lastTestcase && !result.codeOutput && (
        <p style={{ fontSize: 13, color: "#6c7086", margin: 0 }}>
          Output did not match expected. No further details available.
        </p>
      )}

      {/* Performance */}
      {(result.statusRuntime || result.statusMemory) && (
        <div style={{ display: "flex", gap: 24 }}>
          {result.statusRuntime && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={13} style={{ color: "#6c7086" }} />
              <div>
                <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Runtime</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
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
                <p style={{ fontSize: 14, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
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

// ── Judge0 result (original) ───────────────────────────────────────────────────

function Judge0Result({ result }: { result: ExecuteResult }) {
  const isAccepted = result.status.id === 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <StatusHeader result={result} />

      {/* Case result pills */}
      {result.caseResults.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 8px" }}>Test Cases</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.caseResults.map((c) => (
              <span
                key={c.caseId}
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
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
                <p style={{ fontSize: 12, color: "#6c7086", margin: 0 }}>
                  Case {c.caseId} — Expected vs Actual
                </p>
                <pre
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    backgroundColor: "#181825",
                    border: "1px solid #313244",
                    color: "#cdd6f4",
                    fontSize: 12,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
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
              <p style={{ fontSize: 14, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
                {result.time} s
              </p>
            </div>
          </div>
          {result.memory && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={13} style={{ color: "#6c7086" }} />
              <div>
                <p style={{ fontSize: 11, color: "#6c7086", margin: "0 0 1px" }}>Memory</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
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
            <p style={{ fontSize: 12, color: "#f38ba8", margin: 0 }}>
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
              fontSize: 12,
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              ...monoStyle,
            }}
          >
            {result.compileOutput || result.stderr}
          </pre>
        </div>
      )}
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
        <p style={{ color: "#6c7086", fontSize: 13, margin: 0 }}>
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
          fontSize: 13,
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
