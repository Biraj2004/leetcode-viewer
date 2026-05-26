"use client";

/**
 * CollapsibleSection.tsx
 * A toggle-able section with a header button and collapsible body.
 * Used for Topics, Companies, Hints, etc.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
          transition: "margin-bottom 180ms ease",
        }}
      >
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        <ChevronDown
          size={14}
          style={{
            color: "#6c7086",
            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>

      <div
        style={{
          maxHeight: isOpen ? "9999px" : "0px",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 240ms ease, opacity 180ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
