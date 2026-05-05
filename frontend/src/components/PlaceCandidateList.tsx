import type { Place } from "../types";

interface PlaceCandidateListProps {
  candidates: Place[];
  onSelect: (placeId: string) => void;
  floating?: boolean;
  selectedPlaceIds?: string[];
}

export function PlaceCandidateList({
  candidates,
  onSelect,
  floating = false,
  selectedPlaceIds = [],
}: PlaceCandidateListProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div
      className={`glass-card overflow-hidden rounded-3xl border-slate-200/80 bg-white ${
        floating ? "absolute inset-x-0 top-[calc(100%+12px)] z-30 mt-0 shadow-floating" : "mt-4"
      }`}
    >
      <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Candidate places
      </div>
      <div className="divide-y divide-slate-100">
        {candidates.map((place) => (
          (() => {
            const isSelected = selectedPlaceIds.includes(place.id);

            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onSelect(place.id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                {place.imageUrl ? (
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm"
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-end rounded-2xl p-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white shadow-sm"
                    style={{ backgroundImage: place.imageGradient }}
                  >
                    {place.imageLabel}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-ink">{place.name}</div>
                      {isSelected ? (
                        <span className="rounded-full bg-harbor/10 px-2 py-0.5 text-[11px] font-semibold text-harbor">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-500">
                      {place.type} · {place.area}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {place.availability.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })()
        ))}
      </div>
    </div>
  );
}
