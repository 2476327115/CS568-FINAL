import type { DurationOption, ItineraryStop, Place } from "../types";

interface ItineraryDebugItem {
  placeId: string;
  name: string;
  timeRange: string;
  startMinutes: number | null;
  endMinutes: number | null;
  duration: number | null;
  originalIndex: number;
  finalRenderIndex: number;
  rankingScore: number | null;
  coordinates: [number, number] | null;
}

interface OverlapDetails {
  previousPlaceId: string;
  currentPlaceId: string;
  previousEndMinutes: number;
  currentStartMinutes: number;
}

export interface ScheduleValidationResult {
  finalStops: ItineraryStop[];
  isValid: boolean;
  warning: string | null;
  wasRepaired: boolean;
}

function normalizeTimeString(timeString: string) {
  return timeString.trim().replace(/\s+/g, " ");
}

export function parseTimeToMinutes(timeString: string) {
  const normalized = normalizeTimeString(timeString).toUpperCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3];

  if (minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    if (meridiem === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

export function parseTimeRange(timeRange: string) {
  const parts = timeRange.split(/\s*[–-]\s*/);
  if (parts.length !== 2) {
    return null;
  }

  const startMinutes = parseTimeToMinutes(parts[0]);
  const endMinutes = parseTimeToMinutes(parts[1]);
  if (startMinutes == null || endMinutes == null) {
    return null;
  }

  return { startMinutes, endMinutes };
}

function parseStopTimes(stop: ItineraryStop) {
  return parseTimeRange(`${stop.start} - ${stop.end}`);
}

function formatMinutesToTime(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function getDurationMinutes(duration: DurationOption, customDuration: string) {
  if (duration === "Full day") {
    return null;
  }

  const source = duration === "Custom" ? customDuration : duration;
  const match = source.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  if (/min/i.test(source)) {
    return Math.round(value);
  }

  return Math.round(value * 60);
}

export function sortItineraryByStartTime(items: ItineraryStop[]) {
  return [...items]
    .map((item, originalIndex) => ({ item, originalIndex, parsed: parseStopTimes(item) }))
    .sort((left, right) => {
      const leftStart = left.parsed?.startMinutes ?? Number.POSITIVE_INFINITY;
      const rightStart = right.parsed?.startMinutes ?? Number.POSITIVE_INFINITY;
      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ item }) => item);
}

export function validateNoOverlaps(items: ItineraryStop[]) {
  const overlaps: OverlapDetails[] = [];

  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    const previousRange = parseStopTimes(previous);
    const currentRange = parseStopTimes(current);

    if (!previousRange || !currentRange) {
      continue;
    }

    if (currentRange.startMinutes < previousRange.endMinutes) {
      overlaps.push({
        previousPlaceId: previous.placeId,
        currentPlaceId: current.placeId,
        previousEndMinutes: previousRange.endMinutes,
        currentStartMinutes: currentRange.startMinutes,
      });
    }
  }

  return {
    isValid: overlaps.length === 0,
    overlaps,
  };
}

export function repairOverlapsIfPossible(
  items: ItineraryStop[],
  tripEndMinutes: number | null,
) {
  let wasRepaired = false;
  const repairedItems = items.map((item) => ({ ...item }));

  for (let index = 1; index < repairedItems.length; index += 1) {
    const previous = repairedItems[index - 1];
    const current = repairedItems[index];
    const previousRange = parseStopTimes(previous);
    const currentRange = parseStopTimes(current);

    if (!previousRange || !currentRange) {
      return {
        finalStops: repairedItems,
        isValid: false,
        warning: "Some itinerary times overlap. Please regenerate the route.",
        wasRepaired,
      };
    }

    if (currentRange.startMinutes < previousRange.endMinutes) {
      const duration = Math.max(0, currentRange.endMinutes - currentRange.startMinutes);
      const shiftedStart = previousRange.endMinutes;
      const shiftedEnd = shiftedStart + duration;

      if (tripEndMinutes != null && shiftedEnd > tripEndMinutes) {
        return {
          finalStops: repairedItems,
          isValid: false,
          warning: "Some itinerary times overlap. Please regenerate the route.",
          wasRepaired,
        };
      }

      current.start = formatMinutesToTime(shiftedStart);
      current.end = formatMinutesToTime(shiftedEnd);
      wasRepaired = true;
    }
  }

  return {
    finalStops: repairedItems,
    isValid: true,
    warning: wasRepaired ? "Some itinerary times were adjusted to avoid overlaps." : null,
    wasRepaired,
  };
}

function buildDebugItems(items: ItineraryStop[], placesById: Record<string, Place>): ItineraryDebugItem[] {
  return items.map((item, index) => {
    const place = placesById[item.placeId];
    const parsed = parseStopTimes(item);
    const duration = parsed ? parsed.endMinutes - parsed.startMinutes : null;
    const rankingScore = item.scores
      ? Math.round((item.scores.weather + item.scores.crowd + item.scores.travel + item.scores.preference) / 4)
      : null;

    return {
      placeId: item.placeId,
      name: place?.name ?? item.placeId,
      timeRange: `${item.start}–${item.end}`,
      startMinutes: parsed?.startMinutes ?? null,
      endMinutes: parsed?.endMinutes ?? null,
      duration,
      originalIndex: item.order - 1,
      finalRenderIndex: index,
      rankingScore,
      coordinates: place ? [place.lat, place.lng] : null,
    };
  });
}

export function debugItineraryStage(
  stage: string,
  items: ItineraryStop[],
  placesById: Record<string, Place>,
  extra?: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.groupCollapsed(`[itinerary-debug] ${stage}`);
  if (extra) {
    console.log("meta", extra);
  }
  console.table(buildDebugItems(items, placesById));
  console.groupEnd();
}

export function debugSelectionStage(stage: string, places: Place[]) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.groupCollapsed(`[itinerary-debug] ${stage}`);
  console.table(
    places.map((place, index) => ({
      name: place.name,
      timeRange: "N/A",
      startMinutes: null,
      endMinutes: null,
      duration: null,
      originalIndex: index,
      finalRenderIndex: index,
      rankingScore: null,
      coordinates: [place.lat, place.lng],
    })),
  );
  console.groupEnd();
}

export function finalizeItinerarySchedule(
  rawStops: ItineraryStop[],
  placesById: Record<string, Place>,
  duration: DurationOption,
  customDuration: string,
): ScheduleValidationResult {
  debugItineraryStage("3. Before sorting", rawStops, placesById);

  const sortedStops = sortItineraryByStartTime(rawStops);
  debugItineraryStage("4. After sorting", sortedStops, placesById);
  debugItineraryStage("5. Before overlap validation", sortedStops, placesById);

  const initialValidation = validateNoOverlaps(sortedStops);
  const earliestStart = sortedStops.length > 0 ? parseStopTimes(sortedStops[0])?.startMinutes ?? null : null;
  const durationMinutes = getDurationMinutes(duration, customDuration);
  const tripEndMinutes =
    earliestStart != null && durationMinutes != null ? earliestStart + durationMinutes : null;

  const repairedResult = initialValidation.isValid
    ? {
        finalStops: sortedStops.map((stop, index) => ({ ...stop, order: index + 1 })),
        isValid: true,
        warning: null,
        wasRepaired: false,
      }
    : repairOverlapsIfPossible(sortedStops, tripEndMinutes);

  const finalValidation = validateNoOverlaps(repairedResult.finalStops);
  const finalStops = repairedResult.finalStops.map((stop, index) => ({
    ...stop,
    order: index + 1,
  }));

  debugItineraryStage("6. After overlap validation", finalStops, placesById, {
    initialOverlapCount: initialValidation.overlaps.length,
    repaired: repairedResult.wasRepaired,
    tripEndMinutes,
    finalIsValid: repairedResult.isValid && finalValidation.isValid,
  });

  return {
    finalStops,
    isValid: repairedResult.isValid && finalValidation.isValid,
    warning:
      repairedResult.warning ??
      (!finalValidation.isValid ? "Some itinerary times overlap. Please regenerate the route." : null),
    wasRepaired: repairedResult.wasRepaired,
  };
}
