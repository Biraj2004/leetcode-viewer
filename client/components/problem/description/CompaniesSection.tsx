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
  const groups: Array<{
    title: string;
    companies: CompanyStats["threeMonths"];
  }> = [
    { title: "0 - 3 Months", companies: companyStats.threeMonths },
    { title: "3 - 6 Months", companies: companyStats.sixMonths },
    { title: "6+ Months", companies: companyStats.moreThanSixMonths },
  ];

  const hasAnyCompanies = groups.some((group) => group.companies.length > 0);

  if (!hasAnyCompanies) return null;

  return (
    <CollapsibleSection
      title="Companies"
      icon={<Building2 size={14} style={{ color: "#6c7086" }} />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map((group) => {
          if (group.companies.length === 0) return null;
          return (
            <div key={group.title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ color: "#bac2de", fontSize: 12, fontWeight: 600 }}>
                {group.title}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {group.companies
                  .slice()
                  .sort((a, b) => b.timesEncountered - a.timesEncountered)
                  .map((company) => (
                    <TagBadge
                      key={`${group.title}-${company.slug}`}
                      label={company.name}
                      count={company.timesEncountered}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
