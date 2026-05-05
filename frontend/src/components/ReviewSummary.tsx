import { STYLE_LABELS } from "../constants/mockData";
import type { Place, TripStyle } from "../types";

interface ReviewSummaryProps {
  places: Place[];
  startDateLabel: string;
  endDateLabel: string;
  tripLengthLabel: string;
  durationLabel: string;
  tripStyle: TripStyle;
  buttonLabel: string;
  isGeneratingRoute: boolean;
  isRouteDisabled: boolean;
  routeError?: string | null;
  overloadWarning?: string | null;
  onEditPlaces: () => void;
  onEditDetails: () => void;
  onGenerate: () => void;
}

export function ReviewSummary({
  places,
  startDateLabel,
  endDateLabel,
  tripLengthLabel,
  durationLabel,
  tripStyle,
  buttonLabel,
  isGeneratingRoute,
  isRouteDisabled,
  routeError,
  overloadWarning,
  onEditPlaces,
  onEditDetails,
  onGenerate,
}: ReviewSummaryProps) {
  return (
    <div className="space-y-5">
      <section className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-xl font-semibold text-ink">Review your trip</h2>
          <p className="mt-1 text-sm text-slate-500">
            You can still go back and adjust the route inputs before the AI planner runs.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Places</div>
            <button
              type="button"
              onClick={onEditPlaces}
              className="text-sm font-semibold text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2">
            {places.map((place) => (
              <div key={place.id} className="text-sm text-slate-700">
                ✓ {place.name}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Start date</div>
              <button
                type="button"
                onClick={onEditDetails}
                className="text-sm font-semibold text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                Edit
              </button>
            </div>
            <div className="text-sm text-slate-600">{startDateLabel}</div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">End date</div>
              <button
                type="button"
                onClick={onEditDetails}
                className="text-sm font-semibold text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                Edit
              </button>
            </div>
            <div className="text-sm text-slate-600">{endDateLabel}</div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Trip length</div>
              <button
                type="button"
                onClick={onEditDetails}
                className="text-sm font-semibold text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                Edit
              </button>
            </div>
            <div className="text-sm text-slate-600">{tripLengthLabel}</div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Duration</div>
              <button
                type="button"
                onClick={onEditDetails}
                className="text-sm font-semibold text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                Edit
              </button>
            </div>
            <div className="text-sm text-slate-600">{durationLabel}</div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Style</div>
              <button
                type="button"
                onClick={onEditDetails}
                className="text-sm font-semibold text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
              >
                Edit
              </button>
            </div>
            <div className="text-sm text-slate-600">{STYLE_LABELS[tripStyle]}</div>
          </div>
        </div>
      </section>

      {overloadWarning ? (
        <div className="rounded-3xl border border-amber-200 bg-amber/60 px-4 py-3 text-sm text-slate-700">
          {overloadWarning}
        </div>
      ) : null}

      {routeError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {routeError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onGenerate}
        disabled={isRouteDisabled || isGeneratingRoute}
        className="w-full rounded-2xl bg-harbor px-4 py-3 text-sm font-semibold text-white shadow-floating transition hover:bg-harborDark disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/20"
      >
        {isGeneratingRoute ? "Generating route..." : buttonLabel}
      </button>
    </div>
  );
}
