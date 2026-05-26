"use client";

/**
 * SolutionTab.tsx
 *
 * Renders the editorial markdown with:
 * - KaTeX math  $$...$$ (display) and $...$ (inline)
 * - Playground blocks → tabbed code viewer from JSON data
 * - Image blocks → <img> tags
 * - Slides blocks → removed (no data)
 * - Video containers → removed
 * - Raw <br/> tags → proper whitespace
 * - GFM tables, blockquotes, lists, strikethrough
 */

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { BookOpen, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import type { SolutionBlock, PlaygroundCode, SlideFrame } from "../../types/ui";

// KaTeX CSS — must be imported for math to render correctly
import "katex/dist/katex.min.css";

interface SolutionTabProps {
  markdown: string | null;
  blocks: SolutionBlock[];
}

// ─── Markdown pre-processing ───────────────────────────────────────────────────

function preprocessMarkdown(raw: string, blocks: SolutionBlock[]): string {
  let md = raw;

  // Build block lookup
  const blockMap = new Map<string, SolutionBlock>();
  for (const b of blocks) blockMap.set(b.id, b);

  // 1. Remove video-container divs entirely (two-level nesting)
  md = md.replace(/<div[^>]*class="video-container"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, "");
  md = md.replace(/<div[^>]*class="video-container"[^>]*>[\s\S]*?<\/div>/g, "");

  // 2. Remove empty wrapper divs like <div>&nbsp;\n</div>
  md = md.replace(/<div[^>]*>\s*(&nbsp;)?\s*<\/div>/g, "");

  // 3. Remove raw iframes left in markdownRaw (not in markdownResolved)
  md = md.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/g, "");

  // 4. Replace playground placeholders with a custom HTML span carrying the block id
  //    rehype-raw passes this through; our custom span renderer swaps it for PlaygroundBlock
  md = md.replace(/\[LC_BLOCK:PLAYGROUND:([^\]]+)\]/g, (_, id: string) => {
    const trimId = id.trim();
    const block = blockMap.get(trimId);
    if (!block || block.type !== "playground") return "";
    return `<span data-playground-id="${trimId}"></span>`;
  });

  // 5. Replace image placeholders with markdown image syntax
  md = md.replace(/\[LC_BLOCK:IMAGE:([^\]]+)\]/g, (_, id: string) => {
    const block = blockMap.get(id.trim());
    if (!block || block.type !== "image" || !block.url) return "";
    return `![${block.alt ?? ""}](${block.url})`;
  });

  // 6. Replace slides placeholders with a custom HTML span (same pattern as playground)
  md = md.replace(/\[LC_BLOCK:SLIDES:([^\]]+)\]/g, (_, id: string) => {
    const trimId = id.trim();
    const block = blockMap.get(trimId);
    if (!block || block.type !== "slides" || !block.timeline?.length) return "";
    return `<span data-slides-id="${trimId}"></span>`;
  });

  // 7. Remove [TOC]
  md = md.replace(/^\[TOC\]\s*/m, "");

  // 8. Fix literal <br/> lines that appear as raw text in paragraphs
  md = md.replace(/^<br\s*\/?>\s*$/gm, "\n");

  return md;
}

// ─── Playground block ──────────────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
  cpp: "C++", java: "Java", python3: "Python 3", javascript: "JavaScript",
  typescript: "TypeScript", golang: "Go", csharp: "C#", c: "C",
  ruby: "Ruby", swift: "Swift", kotlin: "Kotlin", rust: "Rust",
  scala: "Scala", php: "PHP",
};

const LANG_ORDER = ["cpp", "java", "python3", "javascript", "typescript", "golang"];

function PlaygroundBlock({ codes }: { codes: PlaygroundCode[] }) {
  const LINE_HEIGHT_PX = 20;
  const VERTICAL_PADDING_PX = 32;
  const MIN_CODE_BOX_HEIGHT = 120;
  const MAX_CODE_BOX_HEIGHT = 360;

  const sorted = useMemo(() => [...codes].sort((a, b) => {
    const ai = LANG_ORDER.indexOf(a.langSlug);
    const bi = LANG_ORDER.indexOf(b.langSlug);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.langSlug.localeCompare(b.langSlug);
  }), [codes]);

  const [activeIdx, setActiveIdx] = useState(0);
  const active = sorted[activeIdx];
  const lineCount = useMemo(
    () => (active?.code ? active.code.split(/\r?\n/).length : 0),
    [active?.code],
  );
  const neededHeight = Math.max(
    MIN_CODE_BOX_HEIGHT,
    lineCount * LINE_HEIGHT_PX + VERTICAL_PADDING_PX,
  );
  const boxHeight = Math.min(MAX_CODE_BOX_HEIGHT, neededHeight);
  const shouldScrollY = neededHeight > MAX_CODE_BOX_HEIGHT;

  return (
    <div style={{ border: "1px solid #313244", borderRadius: 8, overflow: "hidden", margin: "0 0 20px" }}>
      {/* Language tabs */}
      <div style={{ display: "flex", overflowX: "auto", backgroundColor: "#181825", borderBottom: "1px solid #313244" }}>
        {sorted.map((c, i) => (
          <button
            key={c.langSlug}
            onClick={() => setActiveIdx(i)}
            style={{
              padding: "7px 14px", fontSize: 12,
              fontWeight: i === activeIdx ? 600 : 400,
              color: i === activeIdx ? "#89b4fa" : "#6c7086",
              background: "none", border: "none",
              borderBottom: i === activeIdx ? "2px solid #89b4fa" : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {LANG_LABELS[c.langSlug] ?? c.langSlug}
          </button>
        ))}
      </div>
      {/* Code */}
      <pre style={{
        margin: 0, padding: "16px", backgroundColor: "#11111b",
        overflowX: "auto", overflowY: shouldScrollY ? "auto" : "hidden",
        height: boxHeight,
        fontSize: 12, lineHeight: 1.65,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        color: "#cdd6f4",
      }}>
        <code>{active?.code ?? ""}</code>
      </pre>
    </div>
  );
}

// ─── Slides block ──────────────────────────────────────────────────────────────

function SlidesBlock({ frames }: { frames: SlideFrame[] }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useMemo(() => ({ id: null as ReturnType<typeof setTimeout> | null }), []);

  // Auto-advance when playing
  useMemo(() => {
    if (!playing) {
      if (timerRef.id) clearTimeout(timerRef.id);
      return;
    }
    const advance = () => {
      setCurrent((c) => {
        const next = (c + 1) % frames.length;
        if (next === 0) setPlaying(false); // stop at end
        return next;
      });
    };
    timerRef.id = setTimeout(advance, frames[current]?.duration ?? 1000);
    return () => { if (timerRef.id) clearTimeout(timerRef.id); };
  }, [playing, current, frames, timerRef]);

  const total = frames.length;
  const frame = frames[current];

  return (
    <div
      style={{
        border:       "1px solid #313244",
        borderRadius: 8,
        overflow:     "hidden",
        margin:       "0 0 20px",
        backgroundColor: "#181825",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", backgroundColor: "#11111b", minHeight: 200 }}>
        {frame && (
          <img
            src={frame.image}
            alt={`Slide ${current + 1}`}
            style={{ width: "100%", display: "block", maxHeight: 400, objectFit: "contain" }}
          />
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "8px 14px",
          borderTop:       "1px solid #313244",
          backgroundColor: "#181825",
        }}
      >
        {/* Prev / counter / Next */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => { setPlaying(false); setCurrent((c) => Math.max(0, c - 1)); }}
            disabled={current === 0}
            style={{ background: "none", border: "none", cursor: current === 0 ? "not-allowed" : "pointer", color: current === 0 ? "#45475a" : "#a6adc8", display: "flex", alignItems: "center", padding: 4 }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: 12, color: "#6c7086", fontFamily: "monospace", minWidth: 48, textAlign: "center" }}>
            {current + 1} / {total}
          </span>

          <button
            onClick={() => { setPlaying(false); setCurrent((c) => Math.min(total - 1, c + 1)); }}
            disabled={current === total - 1}
            style={{ background: "none", border: "none", cursor: current === total - 1 ? "not-allowed" : "pointer", color: current === total - 1 ? "#45475a" : "#a6adc8", display: "flex", alignItems: "center", padding: 4 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", flex: 1, padding: "0 8px" }}>
          {frames.map((_, i) => (
            <button
              key={i}
              onClick={() => { setPlaying(false); setCurrent(i); }}
              style={{
                width:           i === current ? 16 : 6,
                height:          6,
                borderRadius:    3,
                backgroundColor: i === current ? "#89b4fa" : "#45475a",
                border:          "none",
                cursor:          "pointer",
                padding:         0,
                transition:      "width 0.2s, background-color 0.2s",
              }}
            />
          ))}
        </div>

        {/* Play / Pause */}
        <button
          onClick={() => setPlaying((p) => !p)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#a6adc8", display: "flex", alignItems: "center", padding: 4 }}
          title={playing ? "Pause" : "Play slideshow"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SolutionTab({ markdown, blocks }: SolutionTabProps) {
  if (!markdown) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", gap: 12 }}>
        <BookOpen size={32} style={{ color: "#45475a" }} />
        <p style={{ color: "#6c7086", fontSize: 14, margin: 0 }}>Editorial not available for this problem.</p>
      </div>
    );
  }

  const blockMap = useMemo(() => {
    const m = new Map<string, SolutionBlock>();
    for (const b of blocks) m.set(b.id, b);
    return m;
  }, [blocks]);

  const processed = useMemo(() => preprocessMarkdown(markdown, blocks), [markdown, blocks]);

  return (
    <div style={{ padding: "20px 22px" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          h1: ({ children }) => <h1 style={{ color: "#cdd6f4", fontSize: 20, fontWeight: 700, margin: "0 0 16px", borderBottom: "1px solid #313244", paddingBottom: 8 }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ color: "#cdd6f4", fontSize: 17, fontWeight: 600, margin: "24px 0 10px" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ color: "#cdd6f4", fontSize: 15, fontWeight: 600, margin: "18px 0 8px" }}>{children}</h3>,
          h4: ({ children }) => <h4 style={{ color: "#cdd6f4", fontSize: 14, fontWeight: 600, margin: "14px 0 6px" }}>{children}</h4>,

          p: ({ children, node }) => {
            const paragraphNode = node as {
              children?: Array<{
                type?: string;
                tagName?: string;
                properties?: Record<string, unknown>;
              }>;
            };

            const hasEmbeddedBlock =
              paragraphNode.children?.some((child) => {
                if (child.type !== "element") return false;
                if (child.tagName !== "span" && child.tagName !== "div") return false;
                const props = child.properties ?? {};
                return Boolean(props["data-playground-id"] || props["data-slides-id"]);
              }) ?? false;

            if (hasEmbeddedBlock) {
              return <div style={{ margin: "0 0 14px" }}>{children}</div>;
            }

            return (
              <p style={{ color: "#a6adc8", fontSize: 14, lineHeight: 1.75, margin: "0 0 14px" }}>
                {children}
              </p>
            );
          },

          // Intercept <span data-playground-id="..."> and <span data-slides-id="...">
          span: (props) => {
            const playgroundId = (props as Record<string, unknown>)["data-playground-id"] as string | undefined;
            if (playgroundId) {
              const block = blockMap.get(playgroundId);
              if (block?.codes?.length) return <PlaygroundBlock codes={block.codes} />;
              return null;
            }
            const slidesId = (props as Record<string, unknown>)["data-slides-id"] as string | undefined;
            if (slidesId) {
              const block = blockMap.get(slidesId);
              if (block?.timeline?.length) return <SlidesBlock frames={block.timeline} />;
              return null;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { node, ...rest } = props as Record<string, unknown>;
            return <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)} />;
          },

          pre: ({ children }) => (
            <pre style={{ backgroundColor: "#181825", border: "1px solid #313244", borderRadius: 8, padding: "14px 16px", overflowX: "auto", margin: "0 0 16px", fontSize: 12, lineHeight: 1.65, fontFamily: "'Fira Code', Consolas, monospace", color: "#cdd6f4" }}>
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            if (className?.startsWith("language-")) {
              return <code style={{ fontFamily: "'Fira Code', Consolas, monospace", fontSize: 12, color: "#cdd6f4" }}>{children}</code>;
            }
            return <code style={{ backgroundColor: "#313244", color: "#cdd6f4", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontFamily: "'Fira Code', Consolas, monospace" }}>{children}</code>;
          },

          img: ({ src, alt }) => src ? (
            <img src={src} alt={alt ?? ""} style={{ maxWidth: "100%", borderRadius: 6, margin: "8px 0 16px", display: "block" }} />
          ) : null,

          strong: ({ children }) => <strong style={{ color: "#cdd6f4", fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: "#bac2de" }}>{children}</em>,

          ul: ({ children }) => <ul style={{ color: "#a6adc8", fontSize: 14, lineHeight: 1.75, paddingLeft: 22, margin: "0 0 14px" }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ color: "#a6adc8", fontSize: 14, lineHeight: 1.75, paddingLeft: 22, margin: "0 0 14px" }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,

          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: "3px solid #89b4fa", paddingLeft: 16, margin: "0 0 14px", color: "#7f849c" }}>
              {children}
            </blockquote>
          ),

          hr: () => <hr style={{ border: "none", borderTop: "1px solid #313244", margin: "20px 0" }} />,

          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#89b4fa", textDecoration: "none" }}>
              {children}
            </a>
          ),

          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "0 0 16px" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>{children}</table>
            </div>
          ),
          th: ({ children }) => <th style={{ border: "1px solid #313244", padding: "8px 12px", backgroundColor: "#181825", color: "#cdd6f4", fontWeight: 600, textAlign: "left" }}>{children}</th>,
          td: ({ children }) => <td style={{ border: "1px solid #313244", padding: "8px 12px", color: "#a6adc8" }}>{children}</td>,
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
