import { FEEDBACK_OPTIONS } from "../constants/mockData";
import type { FeedbackOption } from "../types";

interface RegenerateControlsProps {
  selectedOptions: FeedbackOption[];
  buttonLabel: string;
  isGeneratingRoute: boolean;
  isDisabled: boolean;
  allowWithoutFeedback?: boolean;
  onToggle: (option: FeedbackOption) => void;
  onGenerate: () => void;
}

export function RegenerateControls({
  selectedOptions,
  buttonLabel,
  isGeneratingRoute,
  isDisabled,
  allowWithoutFeedback = false,
  onToggle,
  onGenerate,
}: RegenerateControlsProps) {
  const requiresFeedbackSelection = !allowWithoutFeedback;

  return (
    <section className="glass-card space-y-4 p-5">
      <div>
        <h3 className="text-lg font-semibold text-ink">Regenerate route with</h3>
        <p className="mt-1 text-sm text-slate-500">
          Pick one or more goals. This may reorder stops or remove optional places.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_OPTIONS.map((option) => {
          const selected = selectedOptions.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/15 ${
                selected
                  ? "border-harbor bg-harbor text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-harbor hover:text-harbor"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={
          (requiresFeedbackSelection && selectedOptions.length === 0) || isDisabled || isGeneratingRoute
        }
        className="w-full rounded-2xl bg-harbor px-4 py-3 text-sm font-semibold text-white shadow-floating transition hover:bg-harborDark disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/20"
      >
        {isGeneratingRoute ? "Generating route..." : buttonLabel}
      </button>
    </section>
  );
}
