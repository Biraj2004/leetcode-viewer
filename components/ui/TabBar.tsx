"use client";

/**
 * TabBar.tsx
 * Reusable horizontal tab bar.
 * Renders a row of tab buttons with active underline indicator.
 */

import type { ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onTabChange: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onTabChange }: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #313244",
        backgroundColor: "#181825",
        flexShrink: 0,
        paddingLeft: 4,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#cdd6f4" : "#6c7086",
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid #89b4fa" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              whiteSpace: "nowrap",
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
