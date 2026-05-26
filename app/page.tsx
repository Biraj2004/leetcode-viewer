/**
 * page.tsx — Root page (Server Component)
 *
 * Loads all problems and passes the full list to the client shell.
 * The client handles navigation between them without any page reload.
 */

import { ProblemPageClient } from "./ProblemPageClient";
import { ALL_PROBLEMS } from "../lib/problems";

export default function Page() {
  return (
    <ProblemPageClient
      problems={ALL_PROBLEMS}
      initialIndex={0}
    />
  );
}
