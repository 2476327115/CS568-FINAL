import { useEffect } from "react";
import { STYLE_LABELS, STYLE_SUMMARY, STYLE_WEIGHTS } from "../constants/mockData";
import { getDayTheme } from "../lib/dayThemes";
import { debugItineraryStage } from "../lib/itinerarySchedule";
import { formatDateLabel } from "../lib/multiDayItinerary";
import type { FeedbackOption, ItineraryDay, ItineraryStop, Place, TripStyle } from "../types";
import { RegenerateControls } from "./RegenerateControls";
import { TimelineCard } from "./TimelineCard";

interface ItineraryTimelineProps {
  tripStyle: TripStyle;
  stops: ItineraryStop[];
  itineraryDays: ItineraryDay[];
  unscheduledStops?: ItineraryStop[];
  placesById: Record<string, Place>;
  hoveredPlaceId: string | null;
  focusedPlaceId: string | null;
  selectedFeedback: FeedbackOption[];
  routeError?: string | null;
  routeWarning?: string | null;
  buttonLabel: string;
  isGeneratingRoute: boolean;
  isRouteDisabled: boolean;
  isRouteStale: boolean;
  onHover: (placeId: string | null) => void;
  onRemove: (placeId: string) => void;
  onCardClick: (placeId: string) => void;
  onToggleFeedback: (option: FeedbackOption) => void;
  onBackToEditPlaces: () => void;
  onRegenerate: () => void;
  registerCardRef: (placeId: string, element: HTMLDivElement | null) => void;
}

export function ItineraryTimeline(props: ItineraryTimelineProps) {
  const {
    tripStyle,
    stops,
    itineraryDays,
    unscheduledStops = [],
    placesById,
    hoveredPlaceId,
    focusedPlaceId,
    selectedFeedback,
    routeError,
    routeWarning,
    buttonLabel,
    isGeneratingRoute,
    isRouteDisabled,
    isRouteStale,
    onHover,
    onRemove,
    onCardClick,
    onToggleFeedback,
    onBackToEditPlaces,
    onRegenerate,
    registerCardRef,
  } = props;

  useEffect(() => {
    debugItineraryStage("7. Before rendering timeline cards", stops, placesById);
  }, [placesById, stops]);

  return (
    <div className="space-y-5">
      <section className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Your {STYLE_LABELS[tripStyle]} Tokyo Route</h2>
          <p className="mt-1 text-sm text-slate-500">{STYLE_SUMMARY[tripStyle]}</p>
        </div>
        <div className="grid gap-3">
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">AI weighting:</span> {STYLE_WEIGHTS[tripStyle]}
          </div>
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            Hover a timeline card to highlight its marker on the map. Click a marker to jump back here.
          </div>
          {itineraryDays.length > 1 ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              Each day uses a matching color theme across the itinerary cards, numbered markers, and route lines.
            </div>
          ) : null}
        </div>
      </section>

      {routeWarning ? (
        <div className="rounded-3xl border border-amber-200 bg-amber/60 px-4 py-3 text-sm text-slate-700">
          {routeWarning}
        </div>
      ) : null}

      {routeError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {routeError}
        </div>
      ) : null}

      <div className="space-y-5">
        {itineraryDays.map((day) => {
          const dayTheme = getDayTheme(day.dayIndex);

          return (
            <section key={day.date} className="space-y-4">
              <div
                className="rounded-3xl border px-5 py-4"
                style={{ backgroundColor: dayTheme.lightColor, borderColor: dayTheme.borderColor }}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: dayTheme.mainColor }}>
                  Day {day.dayIndex}
                </div>
                <div className="mt-1 text-lg font-semibold text-ink">{formatDateLabel(day.date)}</div>
              </div>
              {day.places.map((stop) => (
                <TimelineCard
                  key={stop.placeId}
                  stop={stop}
                  place={placesById[stop.placeId]}
                  highlighted={hoveredPlaceId === stop.placeId}
                  focused={focusedPlaceId === stop.placeId}
                  onHover={onHover}
                  onRemove={onRemove}
                  onClick={onCardClick}
                  registerRef={(element) => registerCardRef(stop.placeId, element)}
                />
              ))}
            </section>
          );
        })}
      </div>

      {unscheduledStops.length > 0 ? (
        <section className="glass-card space-y-3 p-5">
          <div className="text-lg font-semibold text-ink">Unscheduled places</div>
          <div className="text-sm text-slate-500">
            These places were not added because the selected dates can only support up to 6 places per day.
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {unscheduledStops.map((stop) => (
              <div key={stop.placeId}>• {placesById[stop.placeId]?.name ?? stop.placeId}</div>
            ))}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onBackToEditPlaces}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-harbor hover:text-harbor focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
      >
        ← Back to edit places
      </button>

      <RegenerateControls
        selectedOptions={selectedFeedback}
        buttonLabel={buttonLabel}
        isGeneratingRoute={isGeneratingRoute}
        isDisabled={isRouteDisabled}
        allowWithoutFeedback={isRouteStale}
        onToggle={onToggleFeedback}
        onGenerate={onRegenerate}
      />
    </div>
  );
}
