/**
 * DescriptionTab.tsx
 * Composes all the description sub-components into one scrollable view.
 * This is the "Description" tab content inside ProblemPanel.
 */

import { ProblemHeader } from "./description/ProblemHeader";
import { DescriptionBody } from "./description/DescriptionBody";
import { TopicsSection } from "./description/TopicsSection";
import { CompaniesSection } from "./description/CompaniesSection";
import { SimilarQuestionsSection } from "./description/SimilarQuestionsSection";
import { HintsTab } from "./HintsTab";
import { Divider } from "../ui/Divider";
import type { ParsedProblem } from "../../types/ui";

interface DescriptionTabProps {
  problem: ParsedProblem;
}

export function DescriptionTab({ problem }: DescriptionTabProps) {
  // Extract topic tags from the description HTML (LeetCode embeds them as text)
  // For now we use a static list — a real implementation would parse the JSON tags field
  const topics: string[] = [];

  return (
    <div
      style={{
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <ProblemHeader title={problem.title} difficulty={problem.difficulty} />

      <Divider />

      <DescriptionBody html={problem.descriptionHtml} />

      <Divider />

      {topics.length > 0 && (
        <>
          <TopicsSection topics={topics} />
          <Divider />
        </>
      )}

      <CompaniesSection companyStats={problem.companyStats} />

      <Divider />

      <HintsTab hints={problem.hints} />

      <Divider />

      <SimilarQuestionsSection questions={problem.similarQuestions} />
    </div>
  );
}
