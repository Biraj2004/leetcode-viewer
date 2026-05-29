"use client";

/**
 * TestCaseTab.tsx
 *
 * Shows test case inputs and allows adding custom test cases.
 * For the LeetCode provider, shows raw data_input; for Judge0 shows
 * structured inputs from parsed examples.
 *
 * The "+" button opens an inline editor to add custom data_input cases.
 */

import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import type { TestCase } from "../../../types/ui";

interface TestCaseTabProps {
  testCases: TestCase[];
  /** Raw data_input strings from LeetCode JSON (exampleTestcaseList) */
  exampleTestcaseList: string[];
  /** Custom user-added data_input strings */
  customTestCases: string[];
  onCustomTestCasesChange: (cases: string[]) => void;
  activeIndex: number;
  onSelectCase: (index: number) => void;
}

const monoStyle: React.CSSProperties = {
  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
};

export function TestCaseTab({
  testCases,
  exampleTestcaseList,
  customTestCases,
  onCustomTestCasesChange,
  activeIndex,
  onSelectCase,
}: TestCaseTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftInput, setDraftInput] = useState("");

  // Total case count: examples + custom
  const totalCases = exampleTestcaseList.length + customTestCases.length;
  const activeCase = testCases[activeIndex]; // parsed example (may be undefined for custom)
  const isCustomActive = activeIndex >= exampleTestcaseList.length;
  const customCaseInput = customTestCases[activeIndex - exampleTestcaseList.length];

  function handleAddCase() {
    if (!draftInput.trim()) { setIsAdding(false); return; }
    const newCases = [...customTestCases, draftInput.trim()];
    onCustomTestCasesChange(newCases);
    setDraftInput("");
    setIsAdding(false);
    // Select the newly added case
    onSelectCase(exampleTestcaseList.length + newCases.length - 1);
  }

  function handleDeleteCustom(customIdx: number) {
    const updated = customTestCases.filter((_, i) => i !== customIdx);
    onCustomTestCasesChange(updated);
    // If deleting the active custom case, fall back
    if (activeIndex >= exampleTestcaseList.length + customIdx) {
      onSelectCase(Math.max(0, activeIndex - 1));
    }
  }

  return (
    <div>
      {/* ── Case selector tabs ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {/* Example cases */}
        {Array.from({ length: exampleTestcaseList.length }).map((_, i) => (
          <button
            key={`ex-${i}`}
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

        {/* Custom cases */}
        {customTestCases.map((_, ci) => {
          const idx = exampleTestcaseList.length + ci;
          return (
            <div
              key={`custom-${ci}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRadius: 6,
                backgroundColor: activeIndex === idx ? "#313244" : "transparent",
                transition: "background-color 0.1s",
              }}
            >
              <button
                onClick={() => onSelectCase(idx)}
                style={{
                  padding: "4px 8px 4px 12px",
                  borderRadius: "6px 0 0 6px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: "transparent",
                  color: activeIndex === idx ? "#89b4fa" : "#6c7086",
                }}
              >
                Custom {ci + 1}
              </button>
              <button
                onClick={() => handleDeleteCustom(ci)}
                title="Remove custom case"
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px 6px 2px 0",
                  cursor: "pointer",
                  color: "#585b70",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "0 6px 6px 0",
                }}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        {/* Add button */}
        <button
          title="Add custom test case"
          onClick={() => { setIsAdding(true); setDraftInput(""); }}
          style={{
            background: "none",
            border: "1px dashed #45475a",
            padding: "3px 8px",
            color: "#6c7086",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            transition: "border-color 0.1s, color 0.1s",
          }}
        >
          <Plus size={11} />
          Add
        </button>
      </div>

      {/* ── Add custom case editor ── */}
      {isAdding && (
        <div
          style={{
            marginBottom: 14,
            border: "1px solid #89b4fa",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              backgroundColor: "rgba(137,180,250,0.08)",
              borderBottom: "1px solid #313244",
            }}
          >
            <span style={{ fontSize: 11, color: "#89b4fa", fontWeight: 600 }}>
              New custom test case — enter one value per line (same format as LeetCode)
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleAddCase}
                title="Save"
                style={{
                  background: "#a6e3a1",
                  border: "none",
                  padding: "3px 6px",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Check size={12} color="#1e1e2e" />
              </button>
              <button
                onClick={() => setIsAdding(false)}
                title="Cancel"
                style={{
                  background: "none",
                  border: "none",
                  padding: "3px 6px",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#6c7086",
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
          <textarea
            autoFocus
            value={draftInput}
            onChange={(e) => setDraftInput(e.target.value)}
            placeholder={"e.g.\n[2,7,11,15]\n9"}
            rows={4}
            style={{
              width: "100%",
              background: "#181825",
              border: "none",
              outline: "none",
              color: "#cdd6f4",
              fontSize: 13,
              padding: "10px 12px",
              resize: "vertical",
              boxSizing: "border-box",
              ...monoStyle,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddCase();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
        </div>
      )}

      {/* ── Active case inputs ── */}
      {isCustomActive ? (
        /* Custom case — show raw data_input */
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#6c7086",
              marginBottom: 6,
              ...monoStyle,
            }}
          >
            data_input =
          </label>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 13,
              border: "1px solid #313244",
              backgroundColor: "#181825",
              color: "#cdd6f4",
              whiteSpace: "pre-wrap",
              ...monoStyle,
            }}
          >
            {customCaseInput ?? ""}
          </div>
        </div>
      ) : activeCase ? (
        /* Example case — structured inputs from parsed HTML */
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
                  ...monoStyle,
                }}
              >
                {input.name} =
              </label>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  border: "1px solid #313244",
                  backgroundColor: "#181825",
                  color: "#cdd6f4",
                  ...monoStyle,
                }}
              >
                {input.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
