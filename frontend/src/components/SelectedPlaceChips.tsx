import type { Place } from "../types";

interface SelectedPlaceChipsProps {
  places: Place[];
  onRemove: (placeId: string) => void;
  onConfirm: () => void;
}

export function SelectedPlaceChips({
  places,
  onRemove,
  onConfirm,
}: SelectedPlaceChipsProps) {
  return (
    <div className="mt-5 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Selected places</h3>
          <span className="text-xs font-medium text-slate-500">{places.length} selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {places.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Add at least one place to continue.
            </div>
          ) : (
            places.map((place) => (
              <span
                key={place.id}
                className="inline-flex items-center gap-2 rounded-full bg-harbor/10 px-3 py-2 text-sm font-medium text-harbor"
              >
                {place.name}
                <button
                  type="button"
                  onClick={() => onRemove(place.id)}
                  aria-label={`Remove ${place.name}`}
                  className="rounded-full p-0.5 text-harbor transition hover:bg-harbor/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={places.length === 0}
        className="w-full rounded-2xl bg-harbor px-4 py-3 text-sm font-semibold text-white shadow-floating transition hover:bg-harborDark disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/20"
      >
        Confirm places
      </button>
    </div>
  );
}
