"use server";

/**
 * highlight.ts — Server Action
 *
 * Called from the client EditorPanel to syntax-highlight code.
 * Runs Shiki on the server so zero highlighting JS ships to the browser.
 */

import { highlightCode } from "../../lib/syntaxHighlight";

export async function highlightCodeAction(
  code: string,
  language: string,
): Promise<string> {
  return highlightCode(code, language);
}
