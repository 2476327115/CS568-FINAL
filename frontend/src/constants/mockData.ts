import type {
  DurationOption,
  FeedbackOption,
  ItineraryTemplate,
  Place,
  PlanningStep,
  TripStyle,
} from "../types";

function localPlaceImage(filename: string) {
  return encodeURI(`/places/${filename}`);
}

export const TOKYO_CENTER = { lat: 35.6804, lng: 139.7690 };

export const TOKYO_BOUNDS = {
  north: 35.742,
  south: 35.618,
  east: 139.818,
  west: 139.684,
};

export const DURATION_OPTIONS: DurationOption[] = [
  "3 hours",
  "5 hours",
  "Full day",
  "Custom",
];

export const FEEDBACK_OPTIONS: FeedbackOption[] = [
  "Less crowd",
  "Better weather",
  "Shorter travel time",
];

export const STYLE_WEIGHTS: Record<TripStyle, string> = {
  relaxed: "crowd 45%, comfort 35%, travel time 20%",
  normal: "weather 35%, crowd 35%, travel time 30%",
  compact: "travel time 40%, crowd 30%, weather 30%",
};

export const STYLE_LABELS: Record<TripStyle, string> = {
  relaxed: "Relaxed · 1–2 places/day",
  normal: "Normal · 3–4 places/day",
  compact: "Compact · 5–6 places/day",
};

export const STYLE_SUMMARY: Record<TripStyle, string> = {
  relaxed: "Prioritizes lower crowd and a lighter daily pace.",
  normal: "Balances weather, crowd, and travel time across each day.",
  compact: "Fits more places into each day while keeping travel efficient.",
};

export const PLACES: Place[] = [
  {
    id: "shibuya-sky",
    name: "Shibuya Sky",
    type: "Observation deck",
    area: "Shibuya City",
    description: "Skyline deck with a dramatic sunset payoff.",
    availability: ["Weather ✓", "Crowd ✓"],
    recommendedTag: true,
    lat: 35.6587,
    lng: 139.7022,
    imageUrl: localPlaceImage("Shibuya Sky.jpg"),
    imageLabel: "Skyline",
    imageGradient: "linear-gradient(135deg, #1e3a8a 0%, #38bdf8 45%, #f59e0b 100%)",
  },
  {
    id: "sensoji-temple",
    name: "Senso-ji Temple",
    type: "Temple",
    area: "Asakusa",
    description: "Historic temple with strong morning energy and cultural value.",
    availability: ["Weather ✓", "Crowd ✓"],
    recommendedTag: true,
    lat: 35.7148,
    lng: 139.7967,
    imageUrl: localPlaceImage("Sensō-ji.jpg"),
    imageLabel: "Temple",
    imageGradient: "linear-gradient(135deg, #7c2d12 0%, #fb923c 45%, #fde68a 100%)",
  },
  {
    id: "tokyo-tower",
    name: "Tokyo Tower",
    type: "Landmark tower",
    area: "Minato",
    description: "Afternoon viewpoint with easier crowd conditions than Shibuya.",
    availability: ["Weather ✓", "Crowd ✓"],
    recommendedTag: true,
    lat: 35.6586,
    lng: 139.7454,
    imageUrl: localPlaceImage("Tokyo Tower.jpg"),
    imageLabel: "Tower",
    imageGradient: "linear-gradient(135deg, #f97316 0%, #facc15 40%, #fef2f2 100%)",
  },
  {
    id: "ueno-park",
    name: "Ueno Park",
    type: "Urban park",
    area: "Taito",
    description: "A green outdoor buffer between major cultural stops.",
    availability: ["Weather ✓", "Crowd ✓"],
    recommendedTag: true,
    lat: 35.7155,
    lng: 139.7734,
    imageUrl: localPlaceImage("ueno-park-cherry-blossom-tokyo-iStock-653287246-smalldaruma-1024x600.jpg"),
    imageLabel: "Park",
    imageGradient: "linear-gradient(135deg, #166534 0%, #4ade80 40%, #d9f99d 100%)",
  },
  {
    id: "meiji-shrine",
    name: "Meiji Shrine",
    type: "Shrine",
    area: "Shibuya",
    description: "A quieter forested stop for a more relaxed route.",
    availability: ["Weather ✓", "Crowd limited"],
    recommendedTag: true,
    lat: 35.6764,
    lng: 139.6993,
    imageUrl: localPlaceImage("Meiji Jingu.jpg"),
    imageLabel: "Shrine",
    imageGradient: "linear-gradient(135deg, #14532d 0%, #22c55e 45%, #f0fdf4 100%)",
  },
  {
    id: "shibuya-crossing",
    name: "Shibuya Scramble Crossing",
    type: "Landmark",
    area: "Near Shibuya Station",
    description: "A fast iconic photo stop that works well near evening.",
    availability: ["Weather ✓", "Crowd ✓"],
    lat: 35.6595,
    lng: 139.7005,
    imageUrl: localPlaceImage("Shibuya Crossing.jpeg"),
    imageLabel: "Crossing",
    imageGradient: "linear-gradient(135deg, #1d4ed8 0%, #818cf8 50%, #e0e7ff 100%)",
  },
  {
    id: "shibuya-station",
    name: "Shibuya Station",
    type: "Transit station",
    area: "Shibuya",
    description: "Useful transfer anchor with limited crowd explainability.",
    availability: ["Weather ✓", "Crowd limited"],
    lat: 35.6580,
    lng: 139.7016,
    imageLabel: "Station",
    imageGradient: "linear-gradient(135deg, #0f172a 0%, #475569 50%, #cbd5e1 100%)",
  },
  {
    id: "shibuya-parco",
    name: "Shibuya PARCO",
    type: "Shopping mall",
    area: "Shibuya",
    description: "Indoor fallback for rain or crowd avoidance.",
    availability: ["Indoor option ✓"],
    lat: 35.6618,
    lng: 139.6987,
    imageLabel: "Indoor",
    imageGradient: "linear-gradient(135deg, #6d28d9 0%, #ec4899 55%, #fae8ff 100%)",
  },
];

export const STYLE_ROUTE_ORDER: Record<TripStyle, string[]> = {
  relaxed: [
    "meiji-shrine",
    "ueno-park",
    "sensoji-temple",
    "tokyo-tower",
    "shibuya-sky",
    "shibuya-crossing",
    "shibuya-parco",
    "shibuya-station",
  ],
  normal: [
    "sensoji-temple",
    "ueno-park",
    "tokyo-tower",
    "shibuya-sky",
    "meiji-shrine",
    "shibuya-crossing",
    "shibuya-parco",
    "shibuya-station",
  ],
  compact: [
    "sensoji-temple",
    "ueno-park",
    "meiji-shrine",
    "tokyo-tower",
    "shibuya-sky",
    "shibuya-crossing",
    "shibuya-parco",
    "shibuya-station",
  ],
};

export const ITINERARY_LIBRARY: Record<string, ItineraryTemplate> = {
  "sensoji-temple": {
    placeId: "sensoji-temple",
    start: "9:00",
    end: "10:30",
    whyNow: [
      "👥 Crowd is lower before 10 AM.",
      "☀️ Comfortable outdoor weather in the morning.",
      "🚶 Efficient transfer toward Ueno.",
    ],
    summaryReasons: [
      "👥 Lower crowd before 10 AM",
      "☀️ Comfortable weather",
      "🚶 Next stop is nearby",
    ],
    scores: { weather: 8, crowd: 7, travel: 6, preference: 8 },
  },
  "ueno-park": {
    placeId: "ueno-park",
    start: "10:50",
    end: "12:10",
    whyNow: [
      "🚶 Close to Senso-ji, so travel stays efficient.",
      "👥 Medium crowd makes it a gentle transition stop.",
      "🌳 Good outdoor weather makes the park comfortable.",
    ],
    summaryReasons: ["🚶 Close to Senso-ji", "👥 Medium crowd", "🌳 Good outdoor weather"],
    scores: { weather: 8, crowd: 6, travel: 8, preference: 7 },
  },
  "tokyo-tower": {
    placeId: "tokyo-tower",
    start: "13:00",
    end: "14:30",
    whyNow: [
      "☀️ Afternoon visibility is stronger here.",
      "👥 Predicted crowd is lower than Shibuya this hour.",
      "🚶 It keeps the route moving south without backtracking.",
    ],
    summaryReasons: [
      "☀️ Good visibility in afternoon",
      "👥 Lower crowd than Shibuya",
      "🚶 Smooth geographic progression",
    ],
    scores: { weather: 9, crowd: 8, travel: 7, preference: 7 },
  },
  "shibuya-sky": {
    placeId: "shibuya-sky",
    start: "15:30",
    end: "17:00",
    whyNow: [
      "🌇 Best skyline payoff close to sunset.",
      "✨ This placement gives a stronger ending moment.",
      "🚉 The route ends in a major transit district.",
    ],
    summaryReasons: [
      "🌇 Best skyline view near sunset",
      "✨ Strong ending moment",
      "🚉 Transit-friendly finish",
    ],
    scores: { weather: 9, crowd: 7, travel: 6, preference: 9 },
  },
  "meiji-shrine": {
    placeId: "meiji-shrine",
    start: "11:10",
    end: "12:20",
    whyNow: [
      "🌿 Forest cover makes it comfortable during mid-morning.",
      "👥 It softens crowd intensity after busier stops.",
      "🧘 Works well for a relaxed route style.",
    ],
    summaryReasons: ["🌿 Comfortable pacing", "👥 Quieter environment", "🧘 Relaxed route fit"],
    scores: { weather: 8, crowd: 8, travel: 6, preference: 8 },
  },
  "shibuya-crossing": {
    placeId: "shibuya-crossing",
    start: "17:10",
    end: "17:40",
    whyNow: [
      "🌆 The district becomes more atmospheric in late afternoon.",
      "🚶 It is an efficient micro-stop after Shibuya Sky.",
      "📸 Strong photo value without adding much time.",
    ],
    summaryReasons: ["🌆 Late-day atmosphere", "🚶 Micro-stop efficiency", "📸 High photo payoff"],
    scores: { weather: 7, crowd: 5, travel: 9, preference: 7 },
  },
  "shibuya-parco": {
    placeId: "shibuya-parco",
    start: "14:50",
    end: "15:30",
    whyNow: [
      "🏬 Indoor option buffers weather uncertainty.",
      "🚶 Useful if you want a shorter walking segment.",
      "📍 Pairs naturally with other Shibuya stops.",
    ],
    summaryReasons: ["🏬 Indoor weather backup", "🚶 Shorter walking", "📍 Pairs with Shibuya"],
    scores: { weather: 9, crowd: 6, travel: 8, preference: 6 },
  },
  "shibuya-station": {
    placeId: "shibuya-station",
    start: "14:20",
    end: "14:45",
    whyNow: [
      "🚉 Acts as a flexible transfer anchor.",
      "⏱️ Short stop keeps schedule adaptable.",
      "🧭 Helpful when routing decisions are uncertain.",
    ],
    summaryReasons: ["🚉 Transfer anchor", "⏱️ Flexible timing", "🧭 Adaptable route"],
    scores: { weather: 6, crowd: 5, travel: 9, preference: 5 },
  },
};

export const PLANNING_STEPS: PlanningStep[] = [
  {
    title: "Step 1: Checking weather and crowd patterns",
    lines: [
      "Senso-ji: clear before noon",
      "Senso-ji: high after 11 AM",
      "Ueno Park: medium crowd through midday",
      "Tokyo Tower: good visibility after 3 PM",
      "Tokyo Tower: lower crowd later in the day",
    ],
  },
  {
    title: "Step 2: Ranking places",
    lines: ["Prioritizing selected travel style", "weather, crowd, and travel time"],
  },
  {
    title: "Step 3: Planning each travel day",
    lines: ["Splitting attractions across travel days", "Calculating daily route order"],
  },
  {
    title: "Step 4: Writing day-by-day explanations",
    lines: ["Generating daily itinerary cards and recommendation notes"],
  },
];
