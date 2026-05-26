/**
 * TopicsSection.tsx
 * Collapsible list of topic tags (Array, Hash Table, etc.)
 */

import { Tag } from "lucide-react";
import { CollapsibleSection } from "../../ui/CollapsibleSection";
import { TagBadge } from "../../ui/Badge";

interface TopicsSectionProps {
  topics: string[];
}

export function TopicsSection({ topics }: TopicsSectionProps) {
  if (topics.length === 0) return null;

  return (
    <CollapsibleSection
      title="Topics"
      icon={<Tag size={14} style={{ color: "#6c7086" }} />}
      defaultOpen
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {topics.map((topic) => (
          <TagBadge key={topic} label={topic} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
