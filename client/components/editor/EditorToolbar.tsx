"use client";

/**
 * EditorToolbar.tsx
 * The top bar of the code editor: language selector + action icons (reset, copy, fullscreen).
 */

import { useState, useCallback } from "react";
import { RotateCcw, Copy, Check, Maximize2 } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import type { LanguageOption, LanguageKey } from "../../types/ui";

interface EditorToolbarProps {
  languages: LanguageOption[];
  selectedLanguage: LanguageKey;
  code: string;
  onLanguageChange: (lang: LanguageKey) => void;
  onReset: () => void;
}

export function EditorToolbar({
  languages,
  selectedLanguage,
  code,
  onLanguageChange,
  onReset,
}: EditorToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const iconBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 6,
    borderRadius: 6,
    color: "#6c7086",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        borderBottom: "1px solid #313244",
        backgroundColor: "#181825",
        flexShrink: 0,
      }}
    >
      <LanguageSelector
        languages={languages}
        selected={selectedLanguage}
        onSelect={onLanguageChange}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button
          onClick={onReset}
          title="Reset to default"
          style={iconBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#cdd6f4")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6c7086")}
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy code"}
          style={iconBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#cdd6f4")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6c7086")}
        >
          {copied ? (
            <Check size={14} style={{ color: "#a6e3a1" }} />
          ) : (
            <Copy size={14} />
          )}
        </button>

        <button
          title="Fullscreen (coming soon)"
          style={iconBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#cdd6f4")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6c7086")}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
