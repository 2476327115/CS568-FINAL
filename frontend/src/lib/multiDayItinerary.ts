import type { ItineraryDay, ItineraryStop, TripStyle } from "../types";

const DAY_TIME_SLOTS = [
  { start: "9:00", end: "10:30" },
  { start: "10:50", end: "12:10" },
  { start: "13:00", end: "14:30" },
  { start: "15:30", end: "17:00" },
  { start: "17:20", end: "18:20" },
  { start: "18:40", end: "19:30" },
];

function addDays(dateString: string, daysToAdd: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateTripDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

function getPaceMaxPerDay(tripStyle: TripStyle) {
  if (tripStyle === "relaxed") {
    return 2;
  }
  if (tripStyle === "normal") {
    return 4;
  }
  return 6;
}

export function getTripOverloadWarning(placeCount: number, tripDays: number | null) {
  if (!tripDays || tripDays <= 0) {
    return null;
  }

  if (placeCount / tripDays > 6) {
    return "Too many places for the selected dates. Please consider reducing the itinerary, otherwise it may be very tiring. 😫";
  }

  return null;
}

export function buildMultiDayItinerary(
  orderedStops: ItineraryStop[],
  startDate: string,
  endDate: string,
  paceMode: TripStyle,
) {
  const tripDays = calculateTripDays(startDate, endDate);
  if (!tripDays || tripDays <= 0) {
    return null;
  }

  const maxPerDay = getPaceMaxPerDay(paceMode);
  const maxSchedulable = tripDays * 6;
  const schedulableStops = orderedStops.slice(0, maxSchedulable);
  const unscheduledStops = orderedStops.slice(maxSchedulable).map((stop) => ({ ...stop }));
  const days: ItineraryDay[] = [];
  let cursor = 0;
  let globalOrder = 1;

  for (let dayIndex = 0; dayIndex < tripDays; dayIndex += 1) {
    const remainingStops = schedulableStops.length - cursor;
    const remainingDays = tripDays - dayIndex;
    if (remainingStops <= 0) {
      break;
    }

    const idealCount = Math.ceil(remainingStops / remainingDays);
    const countForDay = clamp(idealCount, 1, Math.min(maxPerDay, 6, remainingStops));
    const date = addDays(startDate, dayIndex);
    const places = schedulableStops.slice(cursor, cursor + countForDay).map((stop, index) => {
      const timeSlot = DAY_TIME_SLOTS[index] ?? {
        start: `${9 + index}:00`,
        end: `${10 + index}:00`,
      };

      return {
        ...stop,
        start: timeSlot.start,
        end: timeSlot.end,
        order: globalOrder++,
        dayIndex: dayIndex + 1,
        date,
      };
    });

    days.push({
      date,
      dayIndex: dayIndex + 1,
      places,
    });

    cursor += countForDay;
  }

  return {
    tripDays,
    days,
    flatStops: days.flatMap((day) => day.places),
    unscheduledStops,
  };
}

export function formatDateLabel(dateString: string) {
  const parsed = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
