import type { FeedbackOption, ItineraryDay, ItineraryStop, Place } from "../types";

const DAY_TIME_SLOTS = [
  { start: "9:00", end: "10:30" },
  { start: "10:50", end: "12:10" },
  { start: "13:00", end: "14:30" },
  { start: "15:30", end: "17:00" },
  { start: "17:20", end: "18:20" },
  { start: "18:40", end: "19:30" },
];

interface RegenerationResult {
  days: ItineraryDay[];
  changed: boolean;
}

function distanceBetweenPlaces(left: Place | undefined, right: Place | undefined) {
  if (!left || !right) {
    return Number.POSITIVE_INFINITY;
  }

  const latDelta = left.lat - right.lat;
  const lngDelta = left.lng - right.lng;
  return Math.sqrt(latDelta * latDelta + lngDelta * lngDelta);
}

function getGoalWeights(goals: FeedbackOption[]) {
  return {
    crowd: goals.includes("Less crowd") ? 2.4 : 1,
    weather: goals.includes("Better weather") ? 2.4 : 1,
    travel: goals.includes("Shorter travel time") ? 2.4 : 1,
  };
}

function getBaseWeightedScore(stop: ItineraryStop, goals: FeedbackOption[]) {
  const weights = getGoalWeights(goals);

  return (
    stop.scores.crowd * weights.crowd +
    stop.scores.weather * weights.weather +
    stop.scores.travel * weights.travel +
    stop.scores.preference * 0.8
  );
}

function assignSequentialTimeSlots(stops: ItineraryStop[]) {
  return stops.map((stop, index) => {
    const timeSlot = DAY_TIME_SLOTS[index] ?? {
      start: `${9 + index}:00`,
      end: `${10 + index}:00`,
    };

    return {
      ...stop,
      start: timeSlot.start,
      end: timeSlot.end,
      order: index + 1,
    };
  });
}

function reorderDayStops(
  day: ItineraryDay,
  goals: FeedbackOption[],
  placesById: Record<string, Place>,
) {
  const source = day.places.map((stop) => ({ ...stop }));
  if (source.length <= 1) {
    return assignSequentialTimeSlots(source);
  }

  const withMeta = source.map((stop, originalIndex) => ({
    stop,
    originalIndex,
    baseScore: getBaseWeightedScore(stop, goals),
  }));

  if (!goals.includes("Shorter travel time")) {
    return assignSequentialTimeSlots(
      [...withMeta]
        .sort((left, right) => {
          if (right.baseScore !== left.baseScore) {
            return right.baseScore - left.baseScore;
          }
          return left.originalIndex - right.originalIndex;
        })
        .map((item) => item.stop),
    );
  }

  const remaining = [...withMeta];
  remaining.sort((left, right) => {
    if (right.baseScore !== left.baseScore) {
      return right.baseScore - left.baseScore;
    }
    return left.originalIndex - right.originalIndex;
  });

  const ordered = [remaining.shift()!];

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    const currentPlace = placesById[current.stop.placeId];

    remaining.sort((left, right) => {
      const leftDistance = distanceBetweenPlaces(currentPlace, placesById[left.stop.placeId]);
      const rightDistance = distanceBetweenPlaces(currentPlace, placesById[right.stop.placeId]);
      const leftComposite = left.baseScore * 10 - leftDistance * 200;
      const rightComposite = right.baseScore * 10 - rightDistance * 200;

      if (rightComposite !== leftComposite) {
        return rightComposite - leftComposite;
      }

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.originalIndex - right.originalIndex;
    });

    ordered.push(remaining.shift()!);
  }

  return assignSequentialTimeSlots(ordered.map((item) => item.stop));
}

function debugRegeneration(
  goals: FeedbackOption[],
  before: ItineraryDay[],
  after: ItineraryDay[],
  placesById: Record<string, Place>,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.groupCollapsed("[itinerary-debug] regenerate route goals");
  console.log("selectedGoals", goals);
  console.table(
    before.flatMap((day) =>
      day.places.map((stop, index) => ({
        day: day.dayIndex,
        place: placesById[stop.placeId]?.name ?? stop.placeId,
        beforeOrder: index + 1,
        crowdScore: stop.scores.crowd,
        weatherScore: stop.scores.weather,
        travelScore: stop.scores.travel,
      })),
    ),
  );
  console.table(
    after.flatMap((day) =>
      day.places.map((stop, index) => ({
        day: day.dayIndex,
        place: placesById[stop.placeId]?.name ?? stop.placeId,
        afterOrder: index + 1,
        computedScore: getBaseWeightedScore(stop, goals),
      })),
    ),
  );
  console.groupEnd();
}

export function regenerateItineraryWithGoals(
  currentDays: ItineraryDay[],
  goals: FeedbackOption[],
  placesById: Record<string, Place>,
): RegenerationResult {
  if (goals.length === 0 || currentDays.length === 0) {
    return {
      days: currentDays.map((day) => ({
        ...day,
        places: day.places.map((stop) => ({ ...stop })),
      })),
      changed: false,
    };
  }

  const nextDays = currentDays.map((day) => ({
    ...day,
    places: reorderDayStops(day, goals, placesById).map((stop) => ({
      ...stop,
      dayIndex: day.dayIndex,
      date: day.date,
    })),
  }));

  debugRegeneration(goals, currentDays, nextDays, placesById);

  const beforeSignature = currentDays.map((day) => day.places.map((stop) => stop.placeId).join(">")).join("|");
  const afterSignature = nextDays.map((day) => day.places.map((stop) => stop.placeId).join(">")).join("|");

  return {
    days: nextDays,
    changed: beforeSignature !== afterSignature,
  };
}
