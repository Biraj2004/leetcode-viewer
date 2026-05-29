// Clean, parsed problem shape used throughout the UI
// Derived from raw JSON via lib/parseJson.ts

import type { Difficulty } from "./problem";

export type { Difficulty };

// Supported languages for the code editor
export type LanguageKey =
  | "cpp"
  | "java"
  | "python3"
  | "javascript"
  | "typescript";

export interface LanguageOption {
  value: LanguageKey;
  label: string;
  monacoId: string; // language id for syntax highlighting
}

// ─── Parsed problem data ───────────────────────────────────────────────────────

export interface SimilarQuestion {
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
}

export interface CompanyEntry {
  name: string;
  slug: string;
  timesEncountered: number;
}

export interface CompanyStats {
  threeMonths: CompanyEntry[];
  sixMonths: CompanyEntry[];
  moreThanSixMonths: CompanyEntry[];
}

export interface TestCaseInput {
  name: string;
  value: string;
}

export interface TestCase {
  id: number;
  inputs: TestCaseInput[];
  expected: string;
}

// ─── Solution blocks (playground / image / slides) ────────────────────────────

export interface PlaygroundCode {
  langSlug: string;
  code: string;
}

export interface SolutionBlock {
  id: string;
  type: "playground" | "image" | "slides";
  placeholder: string;
  // playground
  codes?: PlaygroundCode[];
  // image
  url?: string;
  alt?: string;
  // slides
  timeline?: SlideFrame[];
}

export interface SlideFrame {
  image: string;   // absolute URL
  duration: number; // ms
}

export interface ParsedProblem {
  titleSlug: string;
  title: string;
  questionId: string;           // numeric string e.g. "2"
  difficulty: Difficulty;
  // HTML string from apiRaw.GetQuestion.content
  descriptionHtml: string;
  // Plain text hints from apiRaw.GetQuestion.hints
  hints: string[];
  // Solution markdown (markdownResolved — has [LC_BLOCK:...] placeholders)
  solutionMarkdown: string | null;
  // Blocks keyed by id — used to resolve placeholders in solutionMarkdown
  solutionBlocks: SolutionBlock[];
  similarQuestions: SimilarQuestion[];
  companyStats: CompanyStats;
  // code templates keyed by language value (e.g. "javascript")
  codeTemplates: Record<string, string>;
  // derived from description examples
  testCases: TestCase[];
  // Raw LeetCode data_input strings (one per example) — used by LC judge
  exampleTestcaseList: string[];
  // all available languages from defaultCodeByLang
  languages: LanguageOption[];
}
