import { DURATION_OPTIONS, STYLE_SUMMARY } from "../constants/mockData";
import type { DurationOption, TripStyle } from "../types";

interface TripDetailsFormProps {
  startDate: string;
  endDate: string;
  duration: DurationOption;
  customDuration: string;
  tripStyle: TripStyle;
  formError?: string | null;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDurationChange: (value: DurationOption) => void;
  onCustomDurationChange: (value: string) => void;
  onTripStyleChange: (value: TripStyle) => void;
  onContinue: () => void;
}

const styleOptions: { value: TripStyle; label: string }[] = [
  { value: "relaxed", label: "Relaxed · 1–2 places/day" },
  { value: "normal", label: "Normal · 3–4 places/day" },
  { value: "compact", label: "Compact · 5–6 places/day" },
];

export function TripDetailsForm(props: TripDetailsFormProps) {
  const {
    startDate,
    endDate,
    duration,
    customDuration,
    tripStyle,
    formError,
    onStartDateChange,
    onEndDateChange,
    onDurationChange,
    onCustomDurationChange,
    onTripStyleChange,
    onContinue,
  } = props;

  return (
    <div className="space-y-6">
      <section className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">When are you visiting?</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a start date and an end date for your Tokyo trip.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-harbor focus:bg-white focus:ring-4 focus:ring-harbor/10"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">End date</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-harbor focus:bg-white focus:ring-4 focus:ring-harbor/10"
            />
          </label>
        </div>
        {formError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}
      </section>

      <section className="glass-card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">How much time do you have?</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onDurationChange(option)}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15 ${
                duration === option
                  ? "border-harbor bg-harbor text-white shadow-floating"
                  : "border-slate-200 bg-white text-slate-700 hover:border-harbor hover:text-harbor"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {duration === "Custom" ? (
          <input
            value={customDuration}
            onChange={(event) => onCustomDurationChange(event.target.value)}
            placeholder="Enter your available time, e.g. 6 hours"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-harbor focus:bg-white focus:ring-4 focus:ring-harbor/10"
          />
        ) : null}
      </section>

      <section className="glass-card space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Trip style</h2>
            <p className="mt-1 text-sm text-slate-500">Default is Normal.</p>
          </div>
          <div className="group relative">
            <button
              type="button"
              aria-label="Trip style information"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15"
            >
              i
            </button>
            <div className="pointer-events-none absolute right-0 top-10 z-10 w-64 rounded-2xl bg-ink p-4 text-xs leading-5 text-white opacity-0 shadow-floating transition group-hover:opacity-100 group-focus-within:opacity-100">
              Relaxed: Prioritize low crowd and 1-2 places each day.
              <br />
              Normal: Balance crowd, weather, and 3-4 places each day.
              <br />
              Compact: Fit 5-6 places per day while keeping travel efficient.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {styleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onTripStyleChange(option.value)}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15 ${
                tripStyle === option.value
                  ? "border-harbor bg-harbor/8"
                  : "border-slate-200 bg-white hover:border-harbor/60"
              }`}
            >
              <div className="text-sm font-semibold text-ink">{option.label}</div>
              <div className="mt-1 text-sm text-slate-500">{STYLE_SUMMARY[option.value]}</div>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-2xl bg-harbor px-4 py-3 text-sm font-semibold text-white shadow-floating transition hover:bg-harborDark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/20"
      >
        Continue
      </button>
    </div>
  );
}
