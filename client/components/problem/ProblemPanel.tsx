"use client";

/**
 * ProblemPanel.tsx
 * The left panel — tabs: Description | Editorial | Submissions
 * (Solutions tab hidden)
 *
 * Accepts forcedTab from parent to programmatically switch tabs (e.g. after submit).
 */

import { useState, useEffect } from "react";
import { FileText, BookOpen, History } from "lucide-react";
import { TabBar } from "../ui/TabBar";
import { DescriptionTab } from "./DescriptionTab";
import { SolutionTab } from "./SolutionTab";
import { SubmissionsTab } from "./SubmissionsTab";
import type { ParsedProblem } from "../../types/ui";

type ProblemTabKey = "description" | "editorial" | "submissions";

const TABS = [
  { key: "description", label: "Description", icon: <FileText size={14} /> },
  { key: "editorial",   label: "Editorial",   icon: <BookOpen size={14} /> },
  { key: "submissions", label: "Submissions", icon: <History size={14} /> },
];

interface ProblemPanelProps {
  problem: ParsedProblem;
  submissionsRefreshKey?: number;
  /** When set, forces the panel to switch to this tab */
  forcedTab?: string | null;
  /** Called after forcedTab has been applied so parent can clear it */
  onTabForceHandled?: () => void;
}

export function ProblemPanel({
  problem,
  submissionsRefreshKey = 0,
  forcedTab,
  onTabForceHandled,
}: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<ProblemTabKey>("description");

  // Apply forced tab from parent (e.g. navigate to Submissions after submit)
  useEffect(() => {
    if (forcedTab && forcedTab !== activeTab) {
      setActiveTab(forcedTab as ProblemTabKey);
      onTabForceHandled?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedTab]);

  function renderTabContent() {
    switch (activeTab) {
      case "description":
        return <DescriptionTab problem={problem} />;
      case "editorial":
        return <SolutionTab markdown={problem.solutionMarkdown} blocks={problem.solutionBlocks} />;
      case "submissions":
        return (
          <SubmissionsTab
            questionId={problem.questionId}
            refreshKey={submissionsRefreshKey}
          />
        );
      default:
        return null;
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
