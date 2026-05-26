// Types that mirror the raw JSON structure from testjson/*.mock.json
// These are used only in lib/parseJson.ts — the rest of the app uses ParsedProblem

export type Difficulty = "Easy" | "Medium" | "Hard";

// ─── Raw JSON shape ────────────────────────────────────────────────────────────

export interface RawCodeEntry {
  value: string;   // e.g. "javascript"
  text: string;    // e.g. "JavaScript"
  defaultCode: string;
}

export interface RawCompanyEntry {
  timesEncountered: number;
  slug: string;
  name: string;
}

export interface RawCompanyStats {
  three_months: RawCompanyEntry[];
  six_months: RawCompanyEntry[];
  more_than_six_months: RawCompanyEntry[];
}

export interface RawSimilarQuestion {
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
  translatedTitle: string | null;
}

export interface RawQuestion {
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
  submitUrl: string;
  similarQuestions: RawSimilarQuestion[];
  companyTagStatsV2: RawCompanyStats;
  defaultCodeByLang: RawCodeEntry[];
}

export interface RawSlideFrame {
  image: string;
  duration: number;
  image_original: string;
}

export interface RawPlaygroundCode {
  code: string;
  langSlug: string;
}

export interface RawBlock {
  id: string;
  type: "playground" | "image" | "slides";
  placeholder: string;
  iframe_src?: string;
  uuid?: string;
  codes?: RawPlaygroundCode[];
  url?: string;
  alt?: string;
  timeline?: RawSlideFrame[];
  source_marker?: string;
}

export interface RawTab {
  id: string;
  title: string;
  contentType: string;
  markdownRaw: string;
  markdownResolved: string;
  blocks: RawBlock[];
}

export interface RawApiQuestion {
  title: string;
  difficulty: Difficulty;
  content: string;          // HTML description
  hints?: string[];         // may be absent in some exports
  solution?: { content: string };
  companyTagStatsV2: string; // JSON string — needs JSON.parse
  similarQuestions: string;  // JSON string — needs JSON.parse
}

export interface RawProblemJson {
  schemaVersion: number;
  source: {
    questionUrl: string;
    titleSlug: string;
    exportedBy: string;
  };
  question: RawQuestion;
  tabs: RawTab[];
  apiRaw: {
    GetQuestion: RawApiQuestion;
  };
}
