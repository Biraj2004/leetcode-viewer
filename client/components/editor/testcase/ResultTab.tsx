/**
 * ResultTab.tsx
 * Shows the execution result after Run or Submit.
 * Handles: loading spinner, accepted, wrong answer, compile/runtime errors.
 */

import { Check, X, Clock, Cpu, AlertTriangle } from "lucide-react";
import type { ExecuteResult } from "../../../types/execution";

interface ResultTabProps {
  isRunning: boolean;
  isSubmitting: boolean;
  result: ExecuteResult | null;
}

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

  const isAccepted = result.status.id === 3;
  const statusColor = isAccepted ? "#a6e3a1" : "#f38ba8";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Status header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isAccepted ? (
          <Check size={20} style={{ color: statusColor }} />
        ) : (
          <X size={20} style={{ color: statusColor }} />
        )}
        <span style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>
          {result.status.description}
        </span>
        {result.totalCases > 0 && (
          <span style={{ fontSize: 12, color: "#6c7086" }}>
            ({result.passedCount}/{result.totalCases} cases)
          </span>
        )}
      </div>

      {/* Case result pills */}
      {result.caseResults.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: "#6c7086", margin: "0 0 8px" }}>
            Test Cases
          </p>
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
                    fontFamily: "'Fira Code', monospace",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
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
              fontFamily: "'Fira Code', monospace",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {result.compileOutput || result.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}
