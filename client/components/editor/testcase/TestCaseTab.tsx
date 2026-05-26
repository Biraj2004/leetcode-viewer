"use client";

/**
 * TestCaseTab.tsx
 * Shows the inputs for the currently selected test case.
 * Allows switching between cases with tab buttons.
 */

import { Plus } from "lucide-react";
import type { TestCase } from "../../../types/ui";

interface TestCaseTabProps {
  testCases: TestCase[];
  activeIndex: number;
  onSelectCase: (index: number) => void;
}

export function TestCaseTab({ testCases, activeIndex, onSelectCase }: TestCaseTabProps) {
  const activeCase = testCases[activeIndex];

  return (
    <div>
      {/* Case selector tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
        {testCases.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelectCase(i)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              backgroundColor: activeIndex === i ? "#313244" : "transparent",
              color: activeIndex === i ? "#cdd6f4" : "#6c7086",
              transition: "background-color 0.1s",
            }}
          >
            Case {i + 1}
          </button>
        ))}

        <button
          title="Add test case (coming soon)"
          style={{
            background: "none",
            border: "none",
            padding: 4,
            color: "#6c7086",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Input fields for the active case */}
      {activeCase && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeCase.inputs.map((input) => (
            <div key={input.name}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#6c7086",
                  marginBottom: 6,
                  fontFamily: "'Fira Code', monospace",
                }}
              >
                {input.name} =
              </label>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "'Fira Code', monospace",
                  border: "1px solid #313244",
                  backgroundColor: "#181825",
                  color: "#cdd6f4",
                }}
              >
                {input.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
