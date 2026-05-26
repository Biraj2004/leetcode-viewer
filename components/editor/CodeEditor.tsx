"use client";

/**
 * CodeEditor.tsx
 *
 * Monaco Editor wrapper — the same engine that powers VS Code.
 * Handles language-aware syntax highlighting, autocomplete, and proper
 * keyboard shortcuts out of the box.
 *
 * The editor is loaded lazily (dynamic import inside @monaco-editor/react)
 * so it doesn't bloat the initial bundle.
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";

// Map our LanguageKey values to Monaco language IDs
const MONACO_LANG_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python3:    "python",
  java:       "java",
  cpp:        "cpp",
};

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
}

export function CodeEditor({ code, language, onChange }: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Catppuccin Mocha theme — matches the rest of the UI
    monaco.editor.defineTheme("catppuccin-mocha", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment",           foreground: "6c7086", fontStyle: "italic" },
        { token: "keyword",           foreground: "cba6f7" },
        { token: "string",            foreground: "a6e3a1" },
        { token: "number",            foreground: "fab387" },
        { token: "type",              foreground: "89dceb" },
        { token: "class",             foreground: "89dceb" },
        { token: "function",          foreground: "89b4fa" },
        { token: "variable",          foreground: "cdd6f4" },
        { token: "variable.predefined", foreground: "f38ba8" },
        { token: "constant",          foreground: "fab387" },
        { token: "operator",          foreground: "89dceb" },
        { token: "delimiter",         foreground: "cdd6f4" },
        { token: "tag",               foreground: "f38ba8" },
        { token: "attribute.name",    foreground: "89b4fa" },
        { token: "attribute.value",   foreground: "a6e3a1" },
      ],
      colors: {
        "editor.background":              "#11111b",
        "editor.foreground":              "#cdd6f4",
        "editor.lineHighlightBackground": "#1e1e2e",
        "editor.selectionBackground":     "#313244",
        "editor.inactiveSelectionBackground": "#2a2a3d",
        "editorLineNumber.foreground":    "#45475a",
        "editorLineNumber.activeForeground": "#7f849c",
        "editorCursor.foreground":        "#f5e0dc",
        "editorWhitespace.foreground":    "#313244",
        "editorIndentGuide.background1":  "#313244",
        "editorIndentGuide.activeBackground1": "#45475a",
        "editor.wordHighlightBackground": "#313244",
        "editorBracketMatch.background":  "#45475a",
        "editorBracketMatch.border":      "#89b4fa",
        "scrollbar.shadow":               "#11111b",
        "scrollbarSlider.background":     "#313244",
        "scrollbarSlider.hoverBackground":"#45475a",
        "scrollbarSlider.activeBackground":"#585b70",
      },
    });

    monaco.editor.setTheme("catppuccin-mocha");

    // Focus the editor on mount
    editor.focus();
  };

  const monacoLang = MONACO_LANG_MAP[language] ?? "javascript";

  return (
    <div style={{ height: "100%", backgroundColor: "#11111b" }}>
      <Editor
        height="100%"
        language={monacoLang}
        value={code}
        theme="catppuccin-mocha"
        onMount={handleMount}
        onChange={(val) => onChange(val ?? "")}
        options={{
          fontSize:              13,
          fontFamily:            "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures:         true,
          lineHeight:            20,
          minimap:               { enabled: false },
          scrollBeyondLastLine:  false,
          wordWrap:              "off",
          tabSize:               4,
          insertSpaces:          true,
          automaticLayout:       true,
          padding:               { top: 16, bottom: 16 },
          renderLineHighlight:   "line",
          cursorBlinking:        "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling:       true,
          contextmenu:           true,
          folding:               true,
          lineNumbers:           "on",
          glyphMargin:           false,
          overviewRulerLanes:    0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize:   8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
