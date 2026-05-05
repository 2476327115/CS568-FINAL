import type { DayTheme } from "../types";

const DAY_THEMES: DayTheme[] = [
  { mainColor: "#2e6cff", lightColor: "rgba(232, 240, 255, 0.96)", borderColor: "rgba(46, 108, 255, 0.18)" },
  { mainColor: "#d8a319", lightColor: "rgba(255, 246, 214, 0.98)", borderColor: "rgba(216, 163, 25, 0.18)" },
  { mainColor: "#2f9e66", lightColor: "rgba(232, 248, 239, 0.98)", borderColor: "rgba(47, 158, 102, 0.18)" },
  { mainColor: "#7b5cff", lightColor: "rgba(239, 234, 255, 0.98)", borderColor: "rgba(123, 92, 255, 0.18)" },
  { mainColor: "#ef6b3b", lightColor: "rgba(255, 240, 232, 0.98)", borderColor: "rgba(239, 107, 59, 0.18)" },
];

export function getDayTheme(dayIndex?: number) {
  if (!dayIndex || dayIndex < 1) {
    return DAY_THEMES[0];
  }

  return DAY_THEMES[(dayIndex - 1) % DAY_THEMES.length];
}
