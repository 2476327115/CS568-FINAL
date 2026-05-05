import { useEffect, useRef, useState } from "react";
import { AIPlanningPanel } from "./components/AIPlanningPanel";
import { ItineraryTimeline } from "./components/ItineraryTimeline";
import { LeftPanel } from "./components/LeftPanel";
import { MapView } from "./components/MapView";
import { RemovePlaceModal } from "./components/RemovePlaceModal";
import { ReviewSummary } from "./components/ReviewSummary";
import { SearchBox } from "./components/SearchBox";
import { SelectedPlaceChips } from "./components/SelectedPlaceChips";
import { TripDetailsForm } from "./components/TripDetailsForm";
import { ITINERARY_LIBRARY, PLACES, STYLE_ROUTE_ORDER } from "./constants/mockData";
import { fetchMapboxRoute } from "./lib/fetchMapboxRoute";
import {
  debugItineraryStage,
  debugSelectionStage,
  finalizeItinerarySchedule,
} from "./lib/itinerarySchedule";
import {
  buildMultiDayItinerary,
  calculateTripDays,
  formatDateLabel,
  getTripOverloadWarning,
} from "./lib/multiDayItinerary";
import { regenerateItineraryWithGoals } from "./lib/regenerateItineraryWithGoals";
import type {
  DayRoute,
  DurationOption,
  FeedbackOption,
  ItineraryDay,
  ItineraryStop,
  Place,
  Step,
  TripStyle,
} from "./types";

const placesById = Object.fromEntries(PLACES.map((place) => [place.id, place])) as Record<string, Place>;

interface PlanningResultPayload {
  itineraryDays: ItineraryDay[];
  itineraryStops: ItineraryStop[];
  unscheduledStops: ItineraryStop[];
  orderedPlaceIds: string[];
  generatedRoutePlaces: Place[];
  dayRoutes: DayRoute[];
  hasValidItinerary: boolean;
  routeError: string | null;
  scheduleWarning: string | null;
  toastMessage: string | null;
  resetFeedback: boolean;
}

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactSearchValue(value: string) {
  return normalizeSearchValue(value).replace(/\s+/g, "");
}

function buildItinerary(selectedPlaceIds: string[], tripStyle: TripStyle) {
  const orderedIds = STYLE_ROUTE_ORDER[tripStyle].filter((placeId) => selectedPlaceIds.includes(placeId));
  const extraIds = selectedPlaceIds.filter((placeId) => !orderedIds.includes(placeId));
  const routeIds = [...orderedIds, ...extraIds];

  return routeIds.map((placeId, index) => {
    const template = ITINERARY_LIBRARY[placeId];
    if (template) {
      return {
        ...template,
        order: index + 1,
      };
    }

    return {
      placeId,
      order: index + 1,
      start: `${9 + index}:00`,
      end: `${10 + index}:00`,
      whyNow: [
        "Included because you explicitly selected this stop.",
        "The prototype keeps it in the route while preserving nearby flow.",
        "You can still remove it or regenerate with new priorities.",
      ],
      summaryReasons: ["Selected by user", "Route continuity", "Editable afterward"],
      scores: {
        weather: 7,
        crowd: 6,
        travel: 7,
        preference: 8,
      },
    };
  });
}

function applyGlobalOrder(days: ItineraryDay[]) {
  let order = 1;

  return days.map((day) => ({
    ...day,
    places: day.places.map((stop) => ({
      ...stop,
      order: order++,
    })),
  }));
}

function combineWarnings(primary: string | null, secondary: string | null) {
  if (primary && secondary) {
    return `${primary} ${secondary}`;
  }

  return primary ?? secondary;
}

export function App() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
  const [currentStep, setCurrentStep] = useState<Step>("start");
  const [query, setQuery] = useState("");
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("2026-05-12");
  const [endDate, setEndDate] = useState("2026-05-14");
  const [duration, setDuration] = useState<DurationOption>("5 hours");
  const [customDuration, setCustomDuration] = useState("6 hours");
  const [tripStyle, setTripStyle] = useState<TripStyle>("normal");
  const [tripFormError, setTripFormError] = useState<string | null>(null);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [itineraryStops, setItineraryStops] = useState<ItineraryStop[]>([]);
  const [unscheduledStops, setUnscheduledStops] = useState<ItineraryStop[]>([]);
  const [generatedRoutePlaces, setGeneratedRoutePlaces] = useState<Place[]>([]);
  const [dayRoutes, setDayRoutes] = useState<DayRoute[]>([]);
  const [isRouteStale, setIsRouteStale] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [hasValidItinerary, setHasValidItinerary] = useState(false);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [feedbackOptions, setFeedbackOptions] = useState<FeedbackOption[]>([]);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [planningMode, setPlanningMode] = useState<"initial" | "feedback" | null>(null);
  const [isVisualPlanningComplete, setIsVisualPlanningComplete] = useState(false);
  const [isGenerationReady, setIsGenerationReady] = useState(false);
  const timelineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingPlanningResultRef = useRef<PlanningResultPayload | null>(null);

  const recommendedPlaces = PLACES.filter((place) => place.recommendedTag);
  const selectedPlaces = selectedPlaceIds.map((placeId) => placesById[placeId]).filter(Boolean);
  const normalizedQuery = normalizeSearchValue(query);
  const compactQuery = compactSearchValue(query);
  const candidatePlaces = normalizedQuery
    ? [...PLACES]
        .map((place) => {
          const name = normalizeSearchValue(place.name);
          const compactName = compactSearchValue(place.name);
          const type = normalizeSearchValue(place.type);
          const area = normalizeSearchValue(place.area);
          const description = normalizeSearchValue(place.description);
          const id = normalizeSearchValue(place.id);
          const compactId = compactSearchValue(place.id);
          const haystack = [name, type, area, description, id].filter(Boolean).join(" ");
          const compactHaystack = [compactName, compactId, compactSearchValue(type), compactSearchValue(area)]
            .filter(Boolean)
            .join(" ");

          if (!haystack.includes(normalizedQuery) && !compactHaystack.includes(compactQuery)) {
            return null;
          }

          let score = 0;
          if (name === normalizedQuery) {
            score += 120;
          } else if (compactName === compactQuery || compactId === compactQuery) {
            score += 110;
          } else if (name.startsWith(normalizedQuery)) {
            score += 90;
          } else if (compactName.startsWith(compactQuery)) {
            score += 82;
          } else if (name.includes(normalizedQuery)) {
            score += 70;
          } else if (compactName.includes(compactQuery)) {
            score += 62;
          }

          if (type.startsWith(normalizedQuery) || area.startsWith(normalizedQuery)) {
            score += 25;
          } else if (type.includes(normalizedQuery) || area.includes(normalizedQuery)) {
            score += 15;
          }

          if (description.includes(normalizedQuery)) {
            score += 10;
          }

          if (place.recommendedTag) {
            score += 4;
          }

          return { place, score };
        })
        .filter((item): item is { place: Place; score: number } => Boolean(item))
        .sort((left, right) => right.score - left.score || left.place.name.localeCompare(right.place.name))
        .slice(0, 4)
        .map((item) => item.place)
    : [];
  const durationLabel = duration === "Custom" ? customDuration : duration;
  const removeTargetPlace = removeTargetId ? placesById[removeTargetId] : null;
  const tripDays = calculateTripDays(startDate, endDate);
  const tripLengthLabel = tripDays ? `${tripDays} day${tripDays > 1 ? "s" : ""}` : "Invalid dates";
  const overloadWarning = getTripOverloadWarning(selectedPlaces.length, tripDays);
  const hasEnoughPlacesForRoute = selectedPlaces.length >= 2;
  const canGenerateRoute = hasEnoughPlacesForRoute && Boolean(startDate) && Boolean(endDate) && Boolean(tripDays);
  const reviewButtonLabel = isRouteStale ? "Regenerate route" : "Generate route";
  const routeWarning =
    isRouteStale && generatedRoutePlaces.length > 0
      ? "Route changed. Click Generate again to refresh the route."
      : null;

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (currentStep !== "planning" || !planningMode) {
      return;
    }

    setIsGeneratingRoute(true);
    setIsVisualPlanningComplete(false);
    setIsGenerationReady(false);
    pendingPlanningResultRef.current = null;

    let cancelled = false;

    const runGeneration = async () => {
      const currentSelectedPlaces = selectedPlaceIds
        .map((placeId) => placesById[placeId])
        .filter((place): place is Place => Boolean(place));

      debugSelectionStage("1. Before route / itinerary generation", currentSelectedPlaces);

      const rawStops = buildItinerary(selectedPlaceIds, tripStyle);
      const multiDayDraft = buildMultiDayItinerary(rawStops, startDate, endDate, tripStyle);
      if (!multiDayDraft) {
        if (!cancelled) {
          pendingPlanningResultRef.current = {
            itineraryDays: [],
            itineraryStops: [],
            unscheduledStops: [],
            orderedPlaceIds: [],
            generatedRoutePlaces: [],
            dayRoutes: [],
            hasValidItinerary: false,
            routeError: "End date must be after or the same as start date.",
            scheduleWarning: null,
            toastMessage: null,
            resetFeedback: false,
          };
          setIsGenerationReady(true);
        }
        return;
      }

      const canUseCurrentItineraryForFeedback =
        planningMode === "feedback" && !isRouteStale && itineraryDays.length > 0 && feedbackOptions.length > 0;
      const regeneratedDraft =
        canUseCurrentItineraryForFeedback
          ? regenerateItineraryWithGoals(itineraryDays, feedbackOptions, placesById)
          : null;
      const sourceDays =
        regeneratedDraft ? regeneratedDraft.days : multiDayDraft.days;
      const sameRouteMessage =
        canUseCurrentItineraryForFeedback && regeneratedDraft && !regeneratedDraft.changed
          ? "The route stayed the same because these stops already best match your selected goals."
          : null;

      const nextDays = applyGlobalOrder(
        sourceDays.map((day) => {
          const finalizedSchedule = finalizeItinerarySchedule(day.places, placesById, duration, customDuration);
          return {
            ...day,
            places: finalizedSchedule.finalStops.map((stop) => ({
              ...stop,
              dayIndex: day.dayIndex,
              date: day.date,
            })),
          };
        }),
      );
      const nextStops = nextDays.flatMap((day) => day.places);

      debugItineraryStage("2. After route / itinerary generation response is received", nextStops, placesById, {
        warning: overloadWarning,
        tripDays: multiDayDraft.tripDays,
        unscheduledCount: multiDayDraft.unscheduledStops.length,
        selectedGoals: feedbackOptions,
      });

      const orderedPlaceIds = nextStops.map((stop) => stop.placeId);

      try {
        if (nextStops.length === 0) {
          if (cancelled) {
            return;
          }

          pendingPlanningResultRef.current = {
            itineraryDays: nextDays,
            itineraryStops: nextStops,
            unscheduledStops: multiDayDraft.unscheduledStops,
            orderedPlaceIds,
            generatedRoutePlaces: [],
            dayRoutes: [],
            hasValidItinerary: false,
            routeError: "No itinerary could be scheduled for the selected dates.",
            scheduleWarning: overloadWarning,
            toastMessage: null,
            resetFeedback: false,
          };
          setIsGenerationReady(true);
          return;
        }

        const nextDayRoutes = (
          await Promise.all(
            nextDays.map(async (day) => {
              const dayPlaces = day.places
                .map((stop) => placesById[stop.placeId])
                .filter((place): place is Place => Boolean(place));

              if (dayPlaces.length < 2) {
                return null;
              }

              return {
                dayIndex: day.dayIndex,
                routeGeoJson: await fetchMapboxRoute(dayPlaces, token, "walking"),
              };
            }),
          )
        ).filter((dayRoute): dayRoute is DayRoute => Boolean(dayRoute));

        if (cancelled) {
          return;
        }

        pendingPlanningResultRef.current = {
          itineraryDays: nextDays,
          itineraryStops: nextStops,
          unscheduledStops: multiDayDraft.unscheduledStops,
          orderedPlaceIds,
          generatedRoutePlaces: nextStops
            .map((stop) => placesById[stop.placeId])
            .filter((place): place is Place => Boolean(place)),
          dayRoutes: nextDayRoutes,
          hasValidItinerary: true,
          routeError: null,
          scheduleWarning: combineWarnings(
            overloadWarning ??
              (multiDayDraft.unscheduledStops.length > 0
                ? "Some places could not be scheduled within the selected dates and daily cap."
                : null),
            sameRouteMessage,
          ),
          toastMessage:
            planningMode === "feedback"
              ? "Route regenerated using your feedback."
              : "Route generated. You can review, edit, or regenerate it.",
          resetFeedback: planningMode === "feedback",
        };
        setIsGenerationReady(true);
      } catch {
        if (cancelled) {
          return;
        }

        pendingPlanningResultRef.current = {
          itineraryDays: nextDays,
          itineraryStops: nextStops,
          unscheduledStops: multiDayDraft.unscheduledStops,
          orderedPlaceIds,
          generatedRoutePlaces: [],
          dayRoutes: [],
          hasValidItinerary: false,
          routeError: "Could not generate route. Please try again.",
          scheduleWarning: overloadWarning,
          toastMessage: null,
          resetFeedback: false,
        };
        setIsGenerationReady(true);
      } finally {
        if (!cancelled) {
          setIsGeneratingRoute(false);
        }
      }
    };

    void runGeneration();

    return () => {
      cancelled = true;
    };
  }, [
    currentStep,
    customDuration,
    duration,
    endDate,
    feedbackOptions,
    isRouteStale,
    itineraryDays,
    overloadWarning,
    planningMode,
    selectedPlaceIds,
    startDate,
    token,
    tripStyle,
  ]);

  useEffect(() => {
    if (currentStep !== "planning" || !isGenerationReady || !isVisualPlanningComplete) {
      return;
    }

    const pendingResult = pendingPlanningResultRef.current;
    if (!pendingResult) {
      return;
    }

    setItineraryDays(pendingResult.itineraryDays);
    setItineraryStops(pendingResult.itineraryStops);
    setUnscheduledStops(pendingResult.unscheduledStops);
    setSelectedPlaceIds(pendingResult.orderedPlaceIds);
    setGeneratedRoutePlaces(pendingResult.generatedRoutePlaces);
    setDayRoutes(pendingResult.dayRoutes);
    setHasValidItinerary(pendingResult.hasValidItinerary);
    setRouteError(pendingResult.routeError);
    setScheduleWarning(pendingResult.scheduleWarning);
    setIsRouteStale(false);
    setCurrentStep("result");
    setFocusedPlaceId(null);
    setHoveredPlaceId(null);

    if (pendingResult.toastMessage) {
      setToastMessage(pendingResult.toastMessage);
    }
    if (pendingResult.resetFeedback) {
      setFeedbackOptions([]);
    }

    pendingPlanningResultRef.current = null;
    setIsGenerationReady(false);
    setIsVisualPlanningComplete(false);
  }, [currentStep, isGenerationReady, isVisualPlanningComplete]);

  function markRouteStale() {
    // A rendered route only stays valid for the exact ordered place list used to generate it.
    if (!generatedRoutePlaces.length && dayRoutes.length === 0) {
      setHasValidItinerary(false);
      setScheduleWarning(null);
      setRouteError(null);
      return;
    }

    setIsRouteStale(true);
    setDayRoutes([]);
    setHasValidItinerary(false);
    setScheduleWarning(null);
    setRouteError(null);
    setToastMessage("Route changed. Click Generate again to refresh the route.");
  }

  function showPlanning(mode: "initial" | "feedback") {
    if (!startDate) {
      setDayRoutes([]);
      setRouteError("Start date is required.");
      return;
    }

    if (!endDate) {
      setDayRoutes([]);
      setRouteError("End date is required.");
      return;
    }

    if (!tripDays) {
      setDayRoutes([]);
      setRouteError("End date must be after or the same as start date.");
      return;
    }

    if (selectedPlaces.length < 2) {
      setDayRoutes([]);
      setRouteError("Select at least 2 places to generate a route.");
      return;
    }

    if (selectedPlaces.some((place) => !Number.isFinite(place.lat) || !Number.isFinite(place.lng))) {
      setDayRoutes([]);
      setRouteError("Some selected places are missing coordinates.");
      return;
    }

    if (!token) {
      setDayRoutes([]);
      setRouteError("Missing Mapbox token. Add VITE_MAPBOX_TOKEN and try again.");
      return;
    }

    setRouteError(null);
    setScheduleWarning(null);
    setPlanningMode(mode);
    setCurrentStep("planning");
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setTripFormError(null);
    markRouteStale();
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    setTripFormError(null);
    markRouteStale();
  }

  function handleDurationChange(value: DurationOption) {
    setDuration(value);
    markRouteStale();
  }

  function handleCustomDurationChange(value: string) {
    setCustomDuration(value);
    markRouteStale();
  }

  function handleTripStyleChange(value: TripStyle) {
    setTripStyle(value);
    markRouteStale();
  }

  function handleContinueToReview() {
    if (!startDate) {
      setTripFormError("Start date is required.");
      return;
    }
    if (!endDate) {
      setTripFormError("End date is required.");
      return;
    }
    if (!tripDays) {
      setTripFormError("End date must be after or the same as start date.");
      return;
    }

    setTripFormError(null);
    setCurrentStep("review");
  }

  function addPlace(placeId: string) {
    if (selectedPlaceIds.includes(placeId)) {
      setQuery("");
      return;
    }

    setSelectedPlaceIds((current) => [...current, placeId]);
    markRouteStale();
    setQuery("");
  }

  function removeSelectedPlace(placeId: string) {
    setSelectedPlaceIds((current) => current.filter((id) => id !== placeId));
    markRouteStale();
  }

  function toggleFeedback(option: FeedbackOption) {
    setFeedbackOptions((current) =>
      current.includes(option) ? current.filter((value) => value !== option) : [...current, option],
    );
  }

  function openRemoveModal(placeId: string) {
    setRemoveTargetId(placeId);
  }

  function confirmRemovePlace() {
    if (!removeTargetId) {
      return;
    }

    const removedPlaceName = placesById[removeTargetId]?.name ?? "The stop";
    const nextIds = selectedPlaceIds.filter((id) => id !== removeTargetId);
    setSelectedPlaceIds(nextIds);
    setItineraryStops((current) =>
      current
        .filter((stop) => stop.placeId !== removeTargetId)
        .map((stop, index) => ({ ...stop, order: index + 1 })),
    );
    setRemoveTargetId(null);
    markRouteStale();
    setToastMessage(
      `Route updated. ${removedPlaceName} was removed and your route is now around 1 hour shorter.`,
    );
    setFocusedPlaceId(null);
    setHoveredPlaceId(null);
  }

  function focusTimelineCard(placeId: string) {
    setFocusedPlaceId(placeId);
    timelineRefs.current[placeId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function handleBackToEditPlaces() {
    setCurrentStep("start");
    setFocusedPlaceId(null);
    setHoveredPlaceId(null);
  }

  function renderStartContent() {
    return (
      <div className="space-y-5">
        <section className="glass-card space-y-4 p-5">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Plan a smarter Tokyo trip</h2>
            <div className="mt-3 space-y-1.5 text-sm leading-6 text-slate-600">
              <div>Choose places you want to visit.</div>
              <div>We will help rank them using:</div>
              <div>☀️ Weather forecast</div>
              <div>👥 Crowd level</div>
              <div>🚶 Travel time</div>
              <div>🕒 Your available time</div>
            </div>
          </div>
          <div className="rounded-3xl bg-amber/70 p-4 text-sm leading-6 text-slate-700">
            Crowd estimates may be incomplete. You can review and edit the route before finalizing.
          </div>
        </section>

        <SearchBox
          query={query}
          onQueryChange={setQuery}
          recommendedPlaces={recommendedPlaces}
          candidates={candidatePlaces}
          selectedPlaceIds={selectedPlaceIds}
          onTagClick={addPlace}
          onSelectCandidate={addPlace}
        />

        <SelectedPlaceChips
          places={selectedPlaces}
          onRemove={removeSelectedPlace}
          onConfirm={() => setCurrentStep("tripDetails")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-4 lg:h-screen lg:overflow-hidden lg:px-5 lg:py-5">
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-floating">
          {toastMessage}
        </div>
      ) : null}

      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4 lg:flex-row">
        <LeftPanel step={currentStep}>
          {currentStep === "start" ? renderStartContent() : null}

          {currentStep === "tripDetails" ? (
            <TripDetailsForm
              startDate={startDate}
              endDate={endDate}
              duration={duration}
              customDuration={customDuration}
              tripStyle={tripStyle}
              formError={tripFormError}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              onDurationChange={handleDurationChange}
              onCustomDurationChange={handleCustomDurationChange}
              onTripStyleChange={handleTripStyleChange}
              onContinue={handleContinueToReview}
            />
          ) : null}

          {currentStep === "review" ? (
            <ReviewSummary
              places={selectedPlaces}
              startDateLabel={formatDateLabel(startDate)}
              endDateLabel={formatDateLabel(endDate)}
              tripLengthLabel={tripLengthLabel}
              durationLabel={durationLabel}
              tripStyle={tripStyle}
              buttonLabel={reviewButtonLabel}
              isGeneratingRoute={isGeneratingRoute}
              isRouteDisabled={!canGenerateRoute}
              routeError={routeError}
              overloadWarning={overloadWarning}
              onEditPlaces={() => setCurrentStep("start")}
              onEditDetails={() => setCurrentStep("tripDetails")}
              onGenerate={() => showPlanning("initial")}
            />
          ) : null}

          {currentStep === "planning" ? (
            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold text-ink">AI planning in progress</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The full reasoning progress is shown in the centered modal while your multi-day route is being prepared.
              </p>
            </section>
          ) : null}

          {currentStep === "result" ? (
            <ItineraryTimeline
              tripStyle={tripStyle}
              stops={itineraryStops}
              itineraryDays={itineraryDays}
              unscheduledStops={unscheduledStops}
              placesById={placesById}
              hoveredPlaceId={hoveredPlaceId}
              focusedPlaceId={focusedPlaceId}
              selectedFeedback={feedbackOptions}
              routeError={routeError}
              routeWarning={routeWarning ?? scheduleWarning}
              buttonLabel={isRouteStale ? "Regenerate route" : "Generate route"}
              isGeneratingRoute={isGeneratingRoute}
              isRouteDisabled={!canGenerateRoute}
              isRouteStale={isRouteStale}
              onHover={setHoveredPlaceId}
              onRemove={openRemoveModal}
              onCardClick={focusTimelineCard}
              onToggleFeedback={toggleFeedback}
              onBackToEditPlaces={handleBackToEditPlaces}
              onRegenerate={() => showPlanning("feedback")}
              registerCardRef={(placeId, element) => {
                timelineRefs.current[placeId] = element;
              }}
            />
          ) : null}
        </LeftPanel>

        <main className="flex-1">
          <MapView
            step={currentStep}
            selectedPlaces={selectedPlaces}
            itineraryStops={itineraryStops}
            dayRoutes={dayRoutes}
            hasValidItinerary={hasValidItinerary}
            hoveredPlaceId={hoveredPlaceId}
            focusedPlaceId={focusedPlaceId}
            onMarkerHover={setHoveredPlaceId}
            onMarkerClick={focusTimelineCard}
          />
        </main>
      </div>

      <RemovePlaceModal
        open={Boolean(removeTargetId)}
        place={removeTargetPlace}
        onCancel={() => setRemoveTargetId(null)}
        onConfirm={confirmRemovePlace}
      />

      <AIPlanningPanel
        isOpen={currentStep === "planning"}
        tripStyle={tripStyle}
        isGenerationReady={isGenerationReady}
        onSequenceComplete={() => setIsVisualPlanningComplete(true)}
      />
    </div>
  );
}
