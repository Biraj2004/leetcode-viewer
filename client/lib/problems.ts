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

const TEST_JSON_DIR = path.join(process.cwd(), "testjson");

function loadProblemsFromDisk(): ParsedProblem[] {
  if (!fs.existsSync(TEST_JSON_DIR)) return [];

  const fileNames = fs
    .readdirSync(TEST_JSON_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mock.json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const loaded: ParsedProblem[] = [];

  for (const fileName of fileNames) {
    const fullPath = path.join(TEST_JSON_DIR, fileName);
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
