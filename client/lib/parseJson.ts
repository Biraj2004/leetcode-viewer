/**
 * parseJson.ts
 *
 * Transforms the raw testjson/*.mock.json shape into the clean ParsedProblem
 * type used by the UI. All the messy JSON.parse-of-strings and field mapping
 * lives here so components stay clean.
 */

import type { RawProblemJson, RawSimilarQuestion } from "../types/problem";
import type {
  ParsedProblem,
  CompanyEntry,
  CompanyStats,
  TestCase,
  LanguageOption,
  SolutionBlock,
} from "../types/ui";

// Languages we support in the editor (subset of all LeetCode languages)
const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: "javascript", label: "JavaScript", monacoId: "javascript" },
  { value: "typescript", label: "TypeScript", monacoId: "typescript" },
  { value: "python3",    label: "Python 3",   monacoId: "python" },
  { value: "java",       label: "Java",       monacoId: "java" },
  { value: "cpp",        label: "C++",        monacoId: "cpp" },
];

// ─── Test case extraction ──────────────────────────────────────────────────────

/**
 * Extracts example test cases from the HTML description.
 * Looks for <pre> blocks that contain Input:/Output: lines.
 */
function extractTestCasesFromHtml(html: string): TestCase[] {
  const testCases: TestCase[] = [];
  const preBlocks = html.match(/<pre>([\s\S]*?)<\/pre>/g) ?? [];

  preBlocks.forEach((block, index) => {
    // Strip all HTML tags to get plain text
    const text = block.replace(/<[^>]+>/g, "").trim();

    // Match Input: ... (everything up to Output: or end)
    const inputMatch  = text.match(/Input:\s*([\s\S]+?)(?=\nOutput:)/);
    // Match Output: ... (everything up to Explanation: or end of string)
    const outputMatch = text.match(/Output:\s*([\s\S]+?)(?=\nExplanation:|$)/);

    if (!inputMatch || !outputMatch) return;

    // Input may span multiple lines for matrix inputs like [[1,2],[3,4]]
    // Collapse to a single line for parsing
    const inputLine = inputMatch[1].replace(/\s+/g, " ").trim();
    // Output: take first line only (some have trailing explanation text)
    const outputLine = outputMatch[1].split("\n")[0].trim();

    const inputs = parseInputLine(inputLine);
    if (inputs.length === 0) return;

    testCases.push({ id: index + 1, inputs, expected: outputLine });
  });

  return testCases;
}

/**
 * Parses "nums = [2,7,11,15], target = 9" into
 * [{ name: "nums", value: "[2,7,11,15]" }, { name: "target", value: "9" }]
 */
function parseInputLine(line: string): { name: string; value: string }[] {
  const inputs: { name: string; value: string }[] = [];
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of line) {
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;

    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    inputs.push({
      name:  part.slice(0, eqIdx).trim(),
      value: part.slice(eqIdx + 1).trim(),
    });
  }

  return inputs;
}

// ─── Hints extraction ──────────────────────────────────────────────────────────

/**
 * Extracts hints from the tabs array (the "hints" tab has markdownRaw with
 * numbered list items). Falls back to apiRaw.GetQuestion.hints if present.
 */
function extractHints(raw: RawProblemJson): string[] {
  // Prefer apiRaw hints array if it has content
  const apiHints = raw.apiRaw.GetQuestion.hints;
  if (Array.isArray(apiHints) && apiHints.length > 0) {
    return apiHints;
  }

  // Fall back to the hints tab markdownRaw
  const hintsTab = raw.tabs.find((t) => t.id === "hints");
  if (!hintsTab || hintsTab.markdownRaw === "No Hints") return [];

  // Split numbered list "1. hint\n2. hint" into individual strings
  return hintsTab.markdownRaw
    .split(/\n(?=\d+\.)/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

// ─── Company stats ─────────────────────────────────────────────────────────────

interface RawCompanyEntry { timesEncountered: number; slug: string; name: string }

function mapCompanies(entries: RawCompanyEntry[]): CompanyEntry[] {
  return entries.map((e) => ({
    name:             e.name,
    slug:             e.slug,
    timesEncountered: e.timesEncountered,
  }));
}

function parseCompanyStats(raw: RawProblemJson): CompanyStats {
  // question.companyTagStatsV2 is always an object
  const stats = raw.question.companyTagStatsV2;
  return {
    threeMonths:        mapCompanies(stats.three_months),
    sixMonths:          mapCompanies(stats.six_months),
    moreThanSixMonths:  mapCompanies(stats.more_than_six_months),
  };
}

// ─── Main parser ───────────────────────────────────────────────────────────────

export function parseJson(raw: RawProblemJson): ParsedProblem {
  const { question, apiRaw } = raw;
  const apiQuestion = apiRaw.GetQuestion;

  // Similar questions — stored as JSON string in apiRaw
  let similarQuestions: RawSimilarQuestion[] = [];
  try {
    similarQuestions = JSON.parse(apiQuestion.similarQuestions) as RawSimilarQuestion[];
  } catch {
    similarQuestions = question.similarQuestions;
  }

  // Code templates — keyed by language value (e.g. "javascript")
  const codeTemplates: Record<string, string> = {};
  for (const entry of question.defaultCodeByLang) {
    codeTemplates[entry.value] = entry.defaultCode;
  }

  // Only expose languages that have a template
  const languages: LanguageOption[] = SUPPORTED_LANGUAGES.filter(
    (lang) => codeTemplates[lang.value] !== undefined,
  );

  // Solution markdown — use markdownResolved from the solution tab (has [LC_BLOCK:...] placeholders)
  // Fall back to apiRaw solution content if tab not present
  const solutionTab = raw.tabs.find((t) => t.id === "solution");
  const solutionMarkdown: string | null =
    solutionTab?.markdownResolved ?? apiQuestion.solution?.content ?? null;

  // Collect all blocks from the solution tab for placeholder resolution
  const solutionBlocks: SolutionBlock[] = (solutionTab?.blocks ?? []).map((b) => ({
    id:          b.id,
    type:        b.type,
    placeholder: b.placeholder,
    codes:       b.codes?.map((c) => ({ langSlug: c.langSlug, code: c.code })),
    url:         b.url,
    alt:         b.alt,
    timeline:    b.timeline?.map((f) => ({ image: f.image, duration: f.duration })),
  }));

  return {
    titleSlug:    question.titleSlug,
    title:        question.title,
    questionId:   question.questionId ?? apiQuestion.questionId ?? "",
    difficulty:   question.difficulty,
    descriptionHtml: apiQuestion.content,
    hints:        extractHints(raw),
    solutionMarkdown,
    solutionBlocks,
    similarQuestions: similarQuestions.map((q) => ({
      title:      q.title,
      titleSlug:  q.titleSlug,
      difficulty: q.difficulty,
    })),
    companyStats:  parseCompanyStats(raw),
    codeTemplates,
    testCases:    extractTestCasesFromHtml(apiQuestion.content),
    exampleTestcaseList: apiQuestion.exampleTestcaseList ?? question.exampleTestcaseList ?? [],
    languages,
  };
}
