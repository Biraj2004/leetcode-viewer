/**
 * syntaxHighlight.ts
 *
 * Server-side syntax highlighting using Shiki.
 * Returns an HTML string with inline styles — no runtime JS needed.
 *
 * Uses the "catppuccin-mocha" theme to match the dark UI.
 */

import { createHighlighter, type BundledLanguage } from "shiki";

// Map our LanguageKey to Shiki's bundled language IDs
const SHIKI_LANG_MAP: Record<string, BundledLanguage> = {
  javascript: "javascript",
  typescript: "typescript",
  python3:    "python",
  java:       "java",
  cpp:        "cpp",
};

// Singleton highlighter — created once and reused
let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["catppuccin-mocha"],
      langs: ["javascript", "typescript", "python", "java", "cpp"],
    });
  }
  return highlighterPromise;
}

/**
 * Converts code to syntax-highlighted HTML.
 * Returns a <pre><code>...</code></pre> string with inline styles.
 */
export async function highlightCode(
  code: string,
  language: string,
): Promise<string> {
  const shikiLang = SHIKI_LANG_MAP[language] ?? "javascript";
  const highlighter = await getHighlighter();

  return highlighter.codeToHtml(code, {
    lang: shikiLang,
    theme: "catppuccin-mocha",
    // Strip the outer <pre> background so our editor background shows through
    transformers: [
      {
        pre(node) {
          // Remove background color — we control it via CSS
          delete node.properties["style"];
          node.properties["class"] = "shiki-pre";
        },
        code(node) {
          node.properties["class"] = "shiki-code";
        },
      },
    ],
  });
}
