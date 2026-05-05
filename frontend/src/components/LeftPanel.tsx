import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Step } from "../types";

interface LeftPanelProps {
  step: Step;
  children: ReactNode;
}

const progressSteps: Array<{ number: number; steps: Step[] }> = [
  { number: 1, steps: ["start"] },
  { number: 2, steps: ["tripDetails"] },
  { number: 3, steps: ["review", "planning", "result"] },
];

export function LeftPanel({ step, children }: LeftPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentProgress = progressSteps.find((item) => item.steps.includes(step))?.number ?? 1;
  const shouldShowProgress = step !== "planning" && step !== "result";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  return (
    <aside className="w-full lg:w-[456px] lg:min-w-[456px] lg:max-w-[456px]">
      <div className="glass-card panel-scroll flex h-full min-h-[48vh] flex-col overflow-hidden">
        <div className="border-b border-slate-200/70 px-6 pb-5 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-harbor/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-harbor">
              Tokyo AI Planner
            </span>
            {shouldShowProgress ? (
              <span className="text-xs font-semibold text-slate-500">
                Step {currentProgress} of {progressSteps.length}
              </span>
            ) : null}
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-[1.7rem] leading-none text-ink">Transparent Tokyo planning</h1>
            <p className="max-w-sm text-sm leading-6 text-slate-600">
              Weather, crowds, travel time, and your preferences stay visible through every planning step.
            </p>
          </div>
          {shouldShowProgress ? (
            <div className="mt-5 flex items-center gap-0 px-1">
              {progressSteps.map((item, index) => {
                const isComplete = item.number < currentProgress;
                const isCurrent = item.number === currentProgress;

                return (
                  <div key={item.number} className="flex flex-1 items-center">
                    <div
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold transition ${
                        isComplete
                          ? "border-harbor bg-harbor text-white shadow-floating"
                          : isCurrent
                            ? "border-harbor bg-white text-harbor"
                            : "border-harbor bg-white text-harbor/75"
                      }`}
                    >
                      {isCurrent ? <div className="absolute inset-[3px] rounded-full border border-harbor/70" /> : null}
                      <span className="relative">{isComplete ? "✓" : item.number}</span>
                    </div>
                    {index < progressSteps.length - 1 ? (
                      <div className={`h-[2px] flex-1 ${item.number < currentProgress ? "bg-harbor" : "bg-harbor/35"}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div ref={scrollRef} className="panel-scroll flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </aside>
  );
}
