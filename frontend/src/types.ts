export type Step = "start" | "tripDetails" | "review" | "planning" | "result";

export type TripStyle = "relaxed" | "normal" | "compact";

export type DurationOption = "3 hours" | "5 hours" | "Full day" | "Custom";

export type FeedbackOption = "Less crowd" | "Better weather" | "Shorter travel time";

export interface Place {
  id: string;
  name: string;
  type: string;
  area: string;
  description: string;
  availability: string[];
  recommendedTag?: boolean;
  lat: number;
  lng: number;
  imageUrl?: string;
  imageLabel: string;
  imageGradient: string;
}

export interface ScoreSet {
  weather: number;
  crowd: number;
  travel: number;
  preference: number;
}

export interface ItineraryTemplate {
  placeId: string;
  start: string;
  end: string;
  whyNow: string[];
  summaryReasons: string[];
  scores: ScoreSet;
}

export interface ItineraryStop extends ItineraryTemplate {
  order: number;
  dayIndex?: number;
  date?: string;
}

export interface ItineraryDay {
  date: string;
  dayIndex: number;
  places: ItineraryStop[];
}

export interface DayRoute {
  dayIndex: number;
  routeGeoJson: RouteGeoJson;
}

export interface DayTheme {
  mainColor: string;
  lightColor: string;
  borderColor: string;
}

export interface PlanningStep {
  title: string;
  lines: string[];
}

export type RouteGeoJson = GeoJSON.Feature<GeoJSON.LineString>;
