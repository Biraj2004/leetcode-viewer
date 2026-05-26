"use client";

/**
 * ProblemPanel.tsx
 * The left panel — a tab shell that switches between Description, Hints, Solution.
 * Keeps tab state here; delegates all content to tab components.
 */

import { useState } from "react";
import { FileText, BookOpen, History, MessageSquare } from "lucide-react";
import { TabBar } from "../ui/TabBar";
import { DescriptionTab } from "./DescriptionTab";
import { SolutionTab } from "./SolutionTab";
import type { ParsedProblem } from "../../types/ui";

type ProblemTabKey = "description" | "solution" | "submissions" | "solutions";

const TABS = [
  { key: "description", label: "Description", icon: <FileText size={14} /> },
  { key: "solution",    label: "Editorial",   icon: <BookOpen size={14} /> },
  { key: "solutions",   label: "Solutions",   icon: <MessageSquare size={14} /> },
  { key: "submissions", label: "Submissions", icon: <History size={14} /> },
];

interface ProblemPanelProps {
  problem: ParsedProblem;
}

export function ProblemPanel({ problem }: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<ProblemTabKey>("description");

  function renderTabContent() {
    switch (activeTab) {
      case "description":
        return <DescriptionTab problem={problem} />;
      case "solution":
        return <SolutionTab markdown={problem.solutionMarkdown} blocks={problem.solutionBlocks} />;
      default:
        return <PlaceholderTab label={activeTab} />;
    }
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e2e",
        borderRadius: 10,
        border: "1px solid #313244",
        overflow: "hidden",
      }}
    >
      <TabBar
        tabs={TABS}
        activeKey={activeTab}
        onTabChange={(key) => setActiveTab(key as ProblemTabKey)}
      />

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  const messages: Record<string, string> = {
    solutions:   "Community solutions will appear here.",
    submissions: "Your past submissions will appear here.",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
        gap: 12,
      }}
    >
      <MessageSquare size={32} style={{ color: "#45475a" }} />
      <p style={{ color: "#6c7086", fontSize: 14, margin: 0 }}>
        {messages[label] ?? "Coming soon."}
      </p>
    </div>
  );
}
