/**
 * problems.ts
 *
 * Auto-loads all problem JSON files from testjson/.
 * Add a new problem by dropping a "*.mock.json" file in that folder.
 */

import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parseJson } from "./parseJson";
import type { RawProblemJson } from "../types/problem";
import type { ParsedProblem } from "../types/ui";

const TEST_JSON_DIR_CANDIDATES = [
  path.join(process.cwd(), "testjson"),
  path.join(process.cwd(), ".next", "testjson"),
];

function resolveTestJsonDir(): string | null {
  for (const candidate of TEST_JSON_DIR_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadProblemsFromDisk(): ParsedProblem[] {
  const testJsonDir = resolveTestJsonDir();
  if (!testJsonDir) return [];

  const fileNames = fs
    .readdirSync(testJsonDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mock.json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const loaded: ParsedProblem[] = [];

  for (const fileName of fileNames) {
    const fullPath = path.join(testJsonDir, fileName);
    try {
      const rawText = fs.readFileSync(fullPath, "utf8");
      const rawJson = JSON.parse(rawText) as RawProblemJson;
      loaded.push(parseJson(rawJson));
    } catch (error) {
      console.warn(`Skipping invalid problem JSON: ${fileName}`, error);
    }
  }

  return loaded;
}

export const ALL_PROBLEMS: ParsedProblem[] = loadProblemsFromDisk();
