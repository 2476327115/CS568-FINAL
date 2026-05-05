import { getDayTheme } from "../lib/dayThemes";
import type { Place, ItineraryStop } from "../types";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface TimelineCardProps {
  stop: ItineraryStop;
  place: Place;
  highlighted: boolean;
  focused: boolean;
  onHover: (placeId: string | null) => void;
  onRemove: (placeId: string) => void;
  onClick: (placeId: string) => void;
  registerRef: (element: HTMLDivElement | null) => void;
}

export function TimelineCard({
  stop,
  place,
  highlighted,
  focused,
  onHover,
  onRemove,
  onClick,
  registerRef,
}: TimelineCardProps) {
  const dayTheme = getDayTheme(stop.dayIndex);

  return (
    <article
      ref={registerRef}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(place.id)}
      className={`glass-card cursor-pointer p-5 transition ${
        highlighted || focused ? "shadow-floating" : ""
      }`}
      style={{
        backgroundColor: dayTheme.lightColor,
        borderColor: highlighted || focused ? dayTheme.mainColor : dayTheme.borderColor,
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: dayTheme.mainColor }}>
            {stop.start} – {stop.end}
          </div>
          <h3 className="mt-1 text-xl font-semibold text-ink">
            {stop.order}. {place.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(place.id);
          }}
          aria-label={`Remove ${place.name}`}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-500 transition hover:border-rose-200 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
        >
          ×
        </button>
      </div>

      {place.imageUrl ? (
        <img
          src={place.imageUrl}
          alt={place.name}
          loading="lazy"
          className="mb-4 h-40 w-full rounded-[24px] object-cover shadow-inner"
        />
      ) : (
        <div
          className="mb-4 flex h-40 items-end rounded-[24px] p-4 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-inner"
          style={{ backgroundImage: place.imageGradient }}
        >
          {place.imageLabel}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Why now</div>
          <div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
            {stop.whyNow.map((reason) => (
              <div key={reason}>• {reason}</div>
            ))}
          </div>
        </div>

        <ScoreBreakdown scores={stop.scores} />
      </div>
    </article>
  );
}
