import { UserCog, UserRound, Users } from "lucide-react";
import type { Teammate } from "../team.types";

export default function TeamStats({
  teammates,
  activeCount,
  filteredCount,
  page,
  pageSize,
}: {
  teammates: Teammate[];
  activeCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
}) {
  const stats = [
    {
      label: "Accounts on this page",
      value: teammates.length,
      caption: `Page ${page + 1} · Up to ${pageSize} accounts`,
      Icon: Users,
      iconClass: "ts-stat-icon-accent",
    },
    {
      label: "Active accounts",
      value: activeCount,
      caption: "Active accounts on the current page",
      Icon: UserRound,
      iconClass: "ts-stat-icon-success",
    },
    {
      label: "Filtered results",
      value: filteredCount,
      caption: "Matches on the current page",
      Icon: UserCog,
      iconClass: "ts-stat-icon-review",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map(({ label, value, caption, Icon, iconClass }) => (
        <article className="ts-stat-card" key={label}>
          <div className="flex items-center gap-3">
            <div className={`ts-stat-icon ${iconClass}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-sm ts-secondary">{label}</p>
              <p className="mt-1 text-2xl font-semibold ts-text">{value}</p>
            </div>
          </div>
          <p className="mt-3 text-xs ts-muted">{caption}</p>
        </article>
      ))}
    </div>
  );
}
