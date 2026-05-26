/**
 * SimilarQuestionsSection.tsx
 * Table of similar problems with difficulty badges.
 */

"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DifficultyBadge } from "../../ui/Badge";
import type { SimilarQuestion } from "../../../types/ui";

interface SimilarQuestionsSectionProps {
  questions: SimilarQuestion[];
}

export function SimilarQuestionsSection({ questions }: SimilarQuestionsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (questions.length === 0) return null;

  const initialQuestions = useMemo(() => questions.slice(0, 3), [questions]);
  const extraQuestions = useMemo(() => questions.slice(3), [questions]);
  const hasExtra = extraQuestions.length > 0;

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <ExternalLink size={14} style={{ color: "#6c7086" }} />
        <span style={{ color: "#cdd6f4", fontSize: 14, fontWeight: 600 }}>
          Similar Questions
        </span>
      </div>

      <div
        style={{
          border: "1px solid #313244",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {initialQuestions.map((q, i) => (
          <a
            key={q.titleSlug}
            href={`https://leetcode.com/problems/${q.titleSlug}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom:
                i < initialQuestions.length - 1 || hasExtra ? "1px solid #313244" : "none",
              textDecoration: "none",
              backgroundColor: "transparent",
              transition: "background-color 0.1s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#181825")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <span style={{ fontSize: 13, color: "#a6adc8" }}>{q.title}</span>
            <DifficultyBadge difficulty={q.difficulty} />
          </a>
        ))}

        {hasExtra && (
          <>
            <div
              style={{
                maxHeight: expanded ? "9999px" : "0px",
                opacity: expanded ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 260ms ease, opacity 200ms ease",
              }}
            >
              {extraQuestions.map((q, i) => (
                <a
                  key={q.titleSlug}
                  href={`https://leetcode.com/problems/${q.titleSlug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderBottom:
                      i < extraQuestions.length - 1 ? "1px solid #313244" : "none",
                    textDecoration: "none",
                    backgroundColor: "transparent",
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#181825")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <span style={{ fontSize: 13, color: "#a6adc8" }}>{q.title}</span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </a>
              ))}
            </div>

            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                width: "100%",
                border: "none",
                borderTop: "1px solid #313244",
                backgroundColor: "#181825",
                color: "#89b4fa",
                fontSize: 12,
                fontWeight: 600,
                padding: "9px 12px",
                cursor: "pointer",
                transition: "background-color 120ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#11111b")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#181825")}
            >
              {expanded ? "See Less" : `See More (${extraQuestions.length})`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
