"use client";

/**
 * TestCasePanel.tsx
 * The bottom panel of the editor — tabs between "Testcase" and "Test Result".
 * Switches to the result tab automatically when a result arrives.
 */

import { useState, useEffect } from "react";
import { FlaskConical, SquareTerminal } from "lucide-react";
import { TabBar } from "../../ui/TabBar";
import { TestCaseTab } from "./TestCaseTab";
import { ResultTab } from "./ResultTab";
import type { TestCase } from "../../../types/ui";
import type { ExecuteResult } from "../../../types/execution";

type BottomTabKey = "testcase" | "result";

const BOTTOM_TABS = [
  { key: "testcase", label: "Testcase",    icon: <FlaskConical size={13} /> },
  { key: "result",   label: "Test Result", icon: <SquareTerminal size={13} /> },
];

interface TestCasePanelProps {
  testCases: TestCase[];
  /** Raw LeetCode data_input strings from the JSON (one per example) */
  exampleTestcaseList: string[];
  /** User-added custom test cases (raw data_input strings) */
  customTestCases: string[];
  onCustomTestCasesChange: (cases: string[]) => void;
  activeTestCaseIndex: number;
  onSelectTestCase: (index: number) => void;
  isRunning: boolean;
  isSubmitting: boolean;
  result: ExecuteResult | null;
}

export function TestCasePanel({
  testCases,
  exampleTestcaseList,
  customTestCases,
  onCustomTestCasesChange,
  activeTestCaseIndex,
  onSelectTestCase,
  isRunning,
  isSubmitting,
  result,
}: TestCasePanelProps) {
  const [activeTab, setActiveTab] = useState<BottomTabKey>("testcase");

  // Auto-switch to result tab when a result comes in
  useEffect(() => {
    if (result) setActiveTab("result");
  }, [result]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e2e",
        overflow: "hidden",
      }}
    >
      <TabBar
        tabs={BOTTOM_TABS}
        activeKey={activeTab}
        onTabChange={(key) => setActiveTab(key as BottomTabKey)}
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {activeTab === "testcase" ? (
          <TestCaseTab
            testCases={testCases}
            exampleTestcaseList={exampleTestcaseList}
            customTestCases={customTestCases}
            onCustomTestCasesChange={onCustomTestCasesChange}
            activeIndex={activeTestCaseIndex}
            onSelectCase={onSelectTestCase}
          />
        ) : (
          <ResultTab
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            result={result}
          />
        )}
      </div>
    </div>
  );
}
