"use client";

/**
 * LanguageSelector.tsx
 * Dropdown to pick the coding language.
 * Closes when clicking outside via a fixed overlay.
 */

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { LanguageOption, LanguageKey } from "../../types/ui";

interface LanguageSelectorProps {
  languages: LanguageOption[];
  selected: LanguageKey;
  onSelect: (lang: LanguageKey) => void;
}

export function LanguageSelector({ languages, selected, onSelect }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = languages.find((l) => l.value === selected)?.label ?? selected;

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
        <ChevronDown size={13} style={{ color: "#6c7086" }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Click-outside overlay */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
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
