/**
 * CompaniesSection.tsx
 * Collapsible company tags with encounter counts, grouped by recency.
 */

import { Building2 } from "lucide-react";
import { CollapsibleSection } from "../../ui/CollapsibleSection";
import { TagBadge } from "../../ui/Badge";
import type { CompanyStats } from "../../../types/ui";

interface CompaniesSectionProps {
  companyStats: CompanyStats;
}

export function CompaniesSection({ companyStats }: CompaniesSectionProps) {
  // Merge all periods, deduplicate by slug, keep highest count
  const allCompanies = [
    ...companyStats.threeMonths,
    ...companyStats.sixMonths,
    ...companyStats.moreThanSixMonths,
  ];

  const deduped = new Map<string, { name: string; count: number }>();
  for (const c of allCompanies) {
    const existing = deduped.get(c.slug);
    if (!existing || c.timesEncountered > existing.count) {
      deduped.set(c.slug, { name: c.name, count: c.timesEncountered });
    }
  }

  const companies = Array.from(deduped.values()).sort((a, b) => b.count - a.count);

  if (companies.length === 0) return null;

  return (
    <CollapsibleSection
      title="Companies"
      icon={<Building2 size={14} style={{ color: "#6c7086" }} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {companies.map((c) => (
          <TagBadge key={c.name} label={c.name} count={c.count} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
