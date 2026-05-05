import type { ScoreSet } from "../types";

interface ScoreBreakdownProps {
  scores: ScoreSet;
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const rows = [
    { label: "Weather comfort", value: scores.weather },
    { label: "Crowd avoidance", value: scores.crowd },
    { label: "Travel efficiency", value: scores.travel },
    { label: "User preference", value: scores.preference },
  ];

  return (
    <div className="space-y-2 rounded-3xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Score breakdown
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
          <span className="text-slate-600">{row.label}</span>
          <span className="font-semibold text-ink">{row.value}/10</span>
        </div>
      ))}
    </div>
  );
}
