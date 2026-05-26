/**
 * Badge.tsx
 * Reusable pill badge — used for difficulty, topics, companies, etc.
 */

import type { Difficulty } from "../../types/ui";

// ─── Difficulty badge ──────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<Difficulty, { color: string; bg: string }> = {
  Easy:   { color: "#a6e3a1", bg: "rgba(166,227,161,0.12)" },
  Medium: { color: "#f9e2af", bg: "rgba(249,226,175,0.12)" },
  Hard:   { color: "#f38ba8", bg: "rgba(243,139,168,0.12)" },
};

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { color, bg } = DIFFICULTY_STYLES[difficulty];
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color,
        backgroundColor: bg,
        display: "inline-block",
      }}
    >
      {difficulty}
    </span>
  );
}

// ─── Generic tag badge ─────────────────────────────────────────────────────────

interface TagBadgeProps {
  label: string;
  count?: number;
}

export function TagBadge({ label, count }: TagBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        color: "#a6adc8",
        backgroundColor: "#313244",
        cursor: "default",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            backgroundColor: "#45475a",
            borderRadius: 10,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600,
            color: "#6c7086",
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
