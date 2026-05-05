import { PlaceCandidateList } from "./PlaceCandidateList";
import type { Place } from "../types";

interface SearchBoxProps {
  query: string;
  onQueryChange: (value: string) => void;
  recommendedPlaces: Place[];
  candidates: Place[];
  onTagClick: (placeId: string) => void;
  onSelectCandidate: (placeId: string) => void;
}

export function SearchBox({
  query,
  onQueryChange,
  recommendedPlaces,
  candidates,
  onTagClick,
  onSelectCandidate,
}: SearchBoxProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-slate-700" htmlFor="search-box">
        Where do you want to go in Tokyo?
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input
          id="search-box"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search places, e.g. Shibuya Sky, Senso-ji..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm text-ink outline-none transition focus:border-harbor focus:bg-white focus:ring-4 focus:ring-harbor/10"
        />
        <PlaceCandidateList candidates={candidates} onSelect={onSelectCandidate} floating />
      </div>
      {query.trim() ? null : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended places</p>
          <div className="flex flex-wrap gap-2">
            {recommendedPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => onTagClick(place.id)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-harbor hover:text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                {place.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
