"use client";

/**
 * ProblemHeader.tsx
 * Shows the problem title, difficulty badge, and action buttons (like/dislike/star/share).
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Star, Share2 } from "lucide-react";
import { DifficultyBadge } from "../../ui/Badge";
import type { Difficulty } from "../../../types/ui";

interface ProblemHeaderProps {
  title: string;
  difficulty: Difficulty;
}

function formatCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
}

export function ProblemHeader({ title, difficulty }: ProblemHeaderProps) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [starred, setStarred] = useState(false);

  // Placeholder counts — in a real app these come from the API
  const likes = 54321;
  const dislikes = 1823;

  function handleLike() {
    setLiked(!liked);
    if (disliked) setDisliked(false);
  }

  function handleDislike() {
    setDisliked(!disliked);
    if (liked) setLiked(false);
  }

  const pillStyle = (active: boolean, activeColor: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 20,
    border: active ? `1px solid ${activeColor}` : "1px solid #45475a",
    backgroundColor: active ? `${activeColor}22` : "transparent",
    color: active ? activeColor : "#6c7086",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1
        style={{
          color: "#cdd6f4",
          fontSize: 20,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h1>

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <DifficultyBadge difficulty={difficulty} />

        <button onClick={handleLike} style={pillStyle(liked, "#89b4fa")}>
          <ThumbsUp size={12} />
          <span>{formatCount(likes + (liked ? 1 : 0))}</span>
        </button>

        <button onClick={handleDislike} style={pillStyle(disliked, "#f38ba8")}>
          <ThumbsDown size={12} />
          <span>{formatCount(dislikes + (disliked ? 1 : 0))}</span>
        </button>

        <button onClick={() => setStarred(!starred)} style={pillStyle(starred, "#f9e2af")}>
          <Star size={12} fill={starred ? "#f9e2af" : "none"} />
        </button>

        <button style={pillStyle(false, "")}>
          <Share2 size={12} />
        </button>
      </div>
    </div>
  );
}
