/**
 * problems.ts
 *
 * Central registry of all available problems.
 * Import the raw JSONs here and export a sorted list of ParsedProblems.
 * Adding a new problem = drop the JSON in testjson/ and add one line here.
 */

import { parseJson } from "./parseJson";
import type { RawProblemJson } from "../types/problem";
import type { ParsedProblem } from "../types/ui";

import twoSumJson          from "../testjson/two-sum.mock.json";
import rotateImageJson     from "../testjson/rotate-image.mock.json";
import mergeKListsJson     from "../testjson/merge-k-sorted-lists.mock.json";

// Parse once at module load (server-side, build time)
export const ALL_PROBLEMS: ParsedProblem[] = [
  parseJson(twoSumJson          as unknown as RawProblemJson),
  parseJson(rotateImageJson     as unknown as RawProblemJson),
  parseJson(mergeKListsJson     as unknown as RawProblemJson),
];
