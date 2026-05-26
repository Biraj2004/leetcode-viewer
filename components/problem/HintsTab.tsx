"use client";

/**
 * HintsTab.tsx
 * Renders hints as individually expandable accordion items.
 * Each hint is hidden until the user clicks to reveal it.
 */

import { useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";

interface HintsTabProps {
  hints: string[];
}

export function HintsTab({ hints }: HintsTabProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function toggleHint(index: number) {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  if (hints.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#6c7086", fontSize: 14 }}>
        No hints available for this problem.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Lightbulb size={16} style={{ color: "#f9e2af" }} />
        <span style={{ color: "#cdd6f4", fontSize: 15, fontWeight: 600 }}>
          Hints
        </span>
        <span style={{ color: "#6c7086", fontSize: 12 }}>
          ({hints.length} available)
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hints.map((hint, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #313244",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggleHint(i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: "#a6adc8",
                backgroundColor: expanded[i] ? "#181825" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: "#313244",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#89b4fa",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span>Hint {i + 1}</span>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: "#6c7086",
                  flexShrink: 0,
                  transform: expanded[i] ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 200ms ease",
                }}
              />
            </button>

            <div
              style={{
                maxHeight: expanded[i] ? "9999px" : "0px",
                opacity: expanded[i] ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 240ms ease, opacity 180ms ease",
                borderTop: expanded[i] ? "1px solid #313244" : "1px solid transparent",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "#a6adc8",
                  lineHeight: 1.65,
                  backgroundColor: "#11111b",
                }}
                dangerouslySetInnerHTML={{ __html: hint }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
