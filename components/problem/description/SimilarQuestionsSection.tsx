/**
 * SimilarQuestionsSection.tsx
 * Table of similar problems with difficulty badges.
 */

import { ExternalLink } from "lucide-react";
import { DifficultyBadge } from "../../ui/Badge";
import type { SimilarQuestion } from "../../../types/ui";

interface SimilarQuestionsSectionProps {
  questions: SimilarQuestion[];
}

export function SimilarQuestionsSection({ questions }: SimilarQuestionsSectionProps) {
  if (questions.length === 0) return null;

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
        {questions.map((q, i) => (
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
                i < questions.length - 1 ? "1px solid #313244" : "none",
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
    </div>
  );
}
