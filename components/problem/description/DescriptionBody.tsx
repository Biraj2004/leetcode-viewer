/**
 * DescriptionBody.tsx
 * Renders the raw HTML problem description with styled inline elements.
 * Uses dangerouslySetInnerHTML — content comes from LeetCode's own API.
 */

interface DescriptionBodyProps {
  html: string;
}

export function DescriptionBody({ html }: DescriptionBodyProps) {
  // Inject inline styles for common LeetCode HTML elements
  const styledHtml = html
    .replace(
      /<code>/g,
      '<code style="background:#313244;color:#cdd6f4;padding:2px 6px;border-radius:4px;font-size:12px;font-family:\'Fira Code\',monospace">',
    )
    .replace(/<strong>/g, '<strong style="color:#cdd6f4">')
    .replace(/<em>/g, '<em style="color:#bac2de">');

  return (
    <div
      style={{ color: "#a6adc8", fontSize: 14, lineHeight: 1.75 }}
      dangerouslySetInnerHTML={{ __html: styledHtml }}
    />
  );
}
