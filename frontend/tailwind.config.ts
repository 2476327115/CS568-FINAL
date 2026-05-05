import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 18px 50px rgba(15, 23, 42, 0.08)",
        floating: "0 12px 30px rgba(15, 23, 42, 0.14)",
      },
      colors: {
        ink: "#10233f",
        mist: "#f4f7fb",
        cloud: "#e9eff7",
        harbor: "#2e6cff",
        harborDark: "#1f57d8",
        sakura: "#ffe8e2",
        mint: "#dcf7ee",
        amber: "#fff3db",
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Fraunces", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
