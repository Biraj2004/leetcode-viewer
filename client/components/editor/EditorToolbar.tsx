"use client";

/**
 * EditorToolbar.tsx
 * The top bar of the code editor: language selector + action icons (reset, copy, fullscreen).
 */

import { useState, useCallback, useEffect } from "react";
import { RotateCcw, Copy, Check, Maximize2, Minimize2 } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import type { LanguageOption, LanguageKey } from "../../types/ui";

interface EditorToolbarProps {
  languages: LanguageOption[];
  selectedLanguage: LanguageKey;
  code: string;
  onLanguageChange: (lang: LanguageKey) => void;
  onReset: () => void;
  /** ref to the editor container we should expand to fullscreen */
  editorContainerRef?: React.RefObject<HTMLElement | null>;
}

export function EditorToolbar({
  languages,
  selectedLanguage,
  code,
  onLanguageChange,
  onReset,
  editorContainerRef,
}: EditorToolbarProps) {
  const [copied,     setCopied]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Copy code with fallback for HTTP / non-secure contexts
  const handleCopy = useCallback(() => {
    const text = code;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  function fallbackCopy(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    el.style.top = "0";
    el.style.left = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand("copy"); } catch { /* ignore */ }
    document.body.removeChild(el);
  }

  // Fullscreen: use the Fullscreen API on the editor container, fall back to fixed overlay
  const handleFullscreen = useCallback(() => {
    const target = editorContainerRef?.current ?? document.documentElement;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch(() => setIsFullscreen(true));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => setIsFullscreen(false));
      setIsFullscreen(false);
    }
  }, [editorContainerRef]);

  // Sync fullscreen state when user presses Escape
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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
          onClick={handleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen editor"}
          style={iconBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#cdd6f4")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6c7086")}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </div>
  );
}
