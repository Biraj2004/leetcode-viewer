"use client";

/**
 * CollapsibleSection.tsx
 * A toggle-able section with a header button and collapsible body.
 * Used for Topics, Companies, Hints, etc.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          color: "#cdd6f4",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          marginBottom: isOpen ? 10 : 0,
          width: "100%",
          textAlign: "left",
        }}
      >
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        {isOpen ? (
          <ChevronDown size={14} style={{ color: "#6c7086" }} />
        ) : (
          <ChevronRight size={14} style={{ color: "#6c7086" }} />
        )}
      </button>

      {isOpen && children}
    </div>
  );
}
