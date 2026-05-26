"use client";

/**
 * LanguageSelector.tsx
 * Dropdown to pick the coding language.
 * Closes when clicking outside via a fixed overlay.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { LanguageOption, LanguageKey } from "../../types/ui";

interface LanguageSelectorProps {
  languages: LanguageOption[];
  selected: LanguageKey;
  onSelect: (lang: LanguageKey) => void;
}

export function LanguageSelector({ languages, selected, onSelect }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const ANIMATION_MS = 180;

  const selectedLabel = languages.find((l) => l.value === selected)?.label ?? selected;

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setIsMounted(false), ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function handleSelect(lang: LanguageKey) {
    onSelect(lang);
    setIsOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 6,
          border: "1px solid #45475a",
          backgroundColor: "#313244",
          color: "#cdd6f4",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          size={13}
          style={{
            color: "#6c7086",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        />
      </button>

      {/* Dropdown */}
      {isMounted && (
        <>
          {/* Click-outside overlay */}
          <button
            aria-label="Close language dropdown"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
              border: "none",
              background: "transparent",
              opacity: isOpen ? 1 : 0,
              transition: `opacity ${ANIMATION_MS}ms ease`,
            }}
            onClick={() => setIsOpen(false)}
          />

          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              width: 180,
              backgroundColor: "#1e1e2e",
              border: "1px solid #313244",
              borderRadius: 8,
              padding: "4px 0",
              zIndex: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateY(0px) scale(1)" : "translateY(-6px) scale(0.98)",
              transformOrigin: "top left",
              transition: `opacity ${ANIMATION_MS}ms ease, transform ${ANIMATION_MS}ms ease`,
            }}
          >
            {languages.map((lang) => {
              const isSelected = lang.value === selected;
              return (
                <button
                  key={lang.value}
                  onClick={() => handleSelect(lang.value)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "rgba(137,180,250,0.12)" : "transparent",
                    color: isSelected ? "#89b4fa" : "#a6adc8",
                    fontWeight: isSelected ? 600 : 400,
                    textAlign: "left",
                  }}
                >
                  <span>{lang.label}</span>
                  {isSelected && <Check size={12} style={{ color: "#89b4fa" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
