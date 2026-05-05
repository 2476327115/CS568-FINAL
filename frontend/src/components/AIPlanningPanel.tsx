import { useEffect, useRef, useState } from "react";
import { PLANNING_STEPS, STYLE_LABELS, STYLE_WEIGHTS } from "../constants/mockData";
import type { TripStyle } from "../types";

interface AIPlanningPanelProps {
  isOpen: boolean;
  tripStyle: TripStyle;
  isGenerationReady: boolean;
  onSequenceComplete: () => void;
}

function getRandomStepDelay() {
  return 1000 + Math.random() * 2000;
}

export function AIPlanningPanel({
  isOpen,
  tripStyle,
  isGenerationReady,
  onSequenceComplete,
}: AIPlanningPanelProps) {
  const [visibleStepCount, setVisibleStepCount] = useState(1);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);
  const [isListShifting, setIsListShifting] = useState(false);
  const [enteringStepIndex, setEnteringStepIndex] = useState<number | null>(0);
  const completeRef = useRef(onSequenceComplete);

  useEffect(() => {
    completeRef.current = onSequenceComplete;
  }, [onSequenceComplete]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setVisibleStepCount(1);
    setActiveStepIndex(0);
    setCompletedSteps([]);
    setIsSequenceComplete(false);
    setIsListShifting(false);
    setEnteringStepIndex(0);

    let cancelled = false;
    const timeoutIds: number[] = [];

    const wait = (delay: number) =>
      new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(resolve, delay);
        timeoutIds.push(timeoutId);
      });

    const markEnteringStep = (index: number) => {
      setEnteringStepIndex(index);
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setEnteringStepIndex((current) => (current === index ? null : current));
        }
      }, 420);
      timeoutIds.push(timeoutId);
    };

    const runSequence = async () => {
      for (let index = 0; index < PLANNING_STEPS.length; index += 1) {
        if (cancelled) {
          return;
        }

        if (index === 0) {
          setVisibleStepCount(1);
          setActiveStepIndex(0);
          markEnteringStep(0);
        }

        await wait(getRandomStepDelay());
        if (cancelled) {
          return;
        }

        setCompletedSteps((current) => [...current, index]);

        if (index < PLANNING_STEPS.length - 1) {
          setIsListShifting(true);
          await wait(180);
          if (cancelled) {
            return;
          }

          const nextIndex = index + 1;
          setVisibleStepCount(nextIndex + 1);
          setActiveStepIndex(nextIndex);
          markEnteringStep(nextIndex);

          await wait(220);
          if (cancelled) {
            return;
          }

          setIsListShifting(false);
        }
      }

      if (cancelled) {
        return;
      }

      setActiveStepIndex(-1);
      setIsSequenceComplete(true);
      completeRef.current();
    };

    void runSequence();

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [isOpen, tripStyle]);

  if (!isOpen) {
    return null;
  }

  const visibleSteps = PLANNING_STEPS.slice(0, visibleStepCount);
  const totalSteps = PLANNING_STEPS.length;
  const currentStepNumber = Math.min(activeStepIndex + 1, totalSteps);
  const progressValue = (completedSteps.length / totalSteps) * 100;

  return (
    <div className="planning-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <section className="planning-modal-card w-full max-w-3xl rounded-[36px] p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="rounded-full bg-harbor/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-harbor">
              AI Planning
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-ink">Planning your Tokyo route</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Checking weather, crowds, travel time, travel dates, and your preferences...
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
            <div className="font-semibold text-slate-800">
              {isSequenceComplete ? `Step ${totalSteps} of ${totalSteps}` : `Step ${currentStepNumber} of ${totalSteps}`}
            </div>
            <div className="mt-1">Style: {STYLE_LABELS[tripStyle]}</div>
          </div>
        </div>

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-harbor to-sky-400 transition-all duration-500"
            style={{ width: `${Math.max(progressValue, 8)}%` }}
          />
        </div>

        <div
          className={`planning-step-stack space-y-4 ${isListShifting ? "planning-step-stack-shift" : ""}`}
        >
          {visibleSteps.map((step, index) => {
            const state =
              completedSteps.includes(index) ? "done" : index === activeStepIndex ? "active" : "revealed";

            return (
              <div
                key={step.title}
                className={`transform rounded-[28px] border p-5 transition-all duration-500 ${
                  state === "active"
                    ? "translate-y-0 border-harbor/30 bg-harbor/5 shadow-floating"
                    : "translate-y-0 border-slate-200/80 bg-white shadow-card"
                } ${enteringStepIndex === index ? "planning-step-enter" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      state === "done"
                        ? "bg-mint text-emerald-700"
                        : "bg-harbor/12 text-harbor"
                    }`}
                  >
                    {state === "done" ? (
                      "✓"
                    ) : (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-harbor/25 border-t-harbor" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold text-ink">{step.title}</div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          state === "done" ? "bg-emerald-50 text-emerald-700" : "bg-harbor/10 text-harbor"
                        }`}
                      >
                        {state === "done" ? "Done" : "In progress"}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm leading-6 text-slate-500">
                      {index === 1 ? (
                        <>
                          <div>Prioritizing {STYLE_LABELS[tripStyle]} travel style</div>
                          <div>{STYLE_WEIGHTS[tripStyle]}</div>
                        </>
                      ) : (
                        step.lines.map((line) => <div key={line}>{line}</div>)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isSequenceComplete && !isGenerationReady ? (
          <div className="mt-5 flex items-center gap-3 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-harbor/25 border-t-harbor" />
            Finalizing your itinerary...
          </div>
        ) : null}
      </section>
    </div>
  );
}
